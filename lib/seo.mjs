// ════════════════════════════════════════════════════════════════
//  lib/seo.mjs — SEO + GA4/GSC
//  Modelo: UNA service account (SA) de la agencia con acceso de solo
//  lectura a las propiedades de cada cliente. Auth SIN CLAVE vía Workload
//  Identity Federation: el token OIDC de Vercel (VERCEL_OIDC_TOKEN) se canjea
//  en el STS de Google y se impersona el SA — no hay clave JSON que guardar
//  ni rotar (respeta iam.disableServiceAccountKeyCreation). Si falta config,
//  todo degrada con gracia:
//    · getAccessToken() lanza un Error con .code = 'not_configured'
//    · syncProject() captura ese error por proyecto y devuelve un
//      resultado { ok:false, error:'not_configured' } sin romper.
//  Envs: GOOGLE_WIF_AUDIENCE + GOOGLE_SA_EMAIL (+ OIDC habilitado en Vercel).
//  Sin dependencias externas: todo con fetch nativo.
//
//  Esquema: db/migrations/006_seo.sql (seo_projects + seo_metrics).
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';

export const SEO_SOURCES = ['gsc', 'ga4'];

const GA4_BASE       = 'https://analyticsdata.googleapis.com/v1beta';
const GSC_BASE       = 'https://www.googleapis.com/webmasters/v3';
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
].join(' ');

// ── Errores tipados ───────────────────────────────────────────
export class NotConfiguredError extends Error {
  constructor(msg = 'SEO no configurado (Workload Identity Federation)') {
    super(msg);
    this.name = 'NotConfiguredError';
    this.code = 'not_configured';
  }
}

export function isConfigured() {
  // Workload Identity Federation (SIN clave): basta tener configurados la
  // audiencia del proveedor WIF y el email del SA a impersonar. El token OIDC
  // de Vercel (VERCEL_OIDC_TOKEN) se inyecta en runtime cuando "OIDC Federation"
  // está habilitado en el proyecto de Vercel.
  return Boolean((process.env.GOOGLE_WIF_AUDIENCE || '').trim()
              && (process.env.GOOGLE_SA_EMAIL || '').trim());
}

// Cache de token en memoria del lambda + promesa en vuelo para evitar
// carreras de refresco concurrente (varias syncProject en paralelo comparten
// el mismo fetch en lugar de pedir N tokens).
let _tokenCache = null;   // { token, exp }
let _tokenPromise = null; // fetch en vuelo

// Token OIDC de Vercel para ESTA invocación. En runtime Vercel lo entrega como
// header (x-vercel-oidc-token), NO como env var — el endpoint lo inyecta con
// setOidcToken() antes de sincronizar. Fallback a process.env (build/dev/local).
let _runtimeOidcToken = null;
export function setOidcToken(token) {
  const t = (token == null ? '' : String(token)).trim();
  if (t) _runtimeOidcToken = t;
}

// ── Auth SIN CLAVE: Workload Identity Federation ──────────────
// Flujo (cero secretos): el token OIDC de Vercel (header x-vercel-oidc-token en
// runtime) → STS de Google lo canjea por un token federado → se impersona el SA
// para obtener un access_token con los scopes de GA4/GSC. No hay clave JSON que
// guardar ni rotar; respeta la política iam.disableServiceAccountKeyCreation.
async function fetchAccessToken() {
  const oidc = _runtimeOidcToken || (process.env.VERCEL_OIDC_TOKEN || '').trim();
  if (!oidc) throw new NotConfiguredError('Token OIDC de Vercel ausente (¿OIDC Federation habilitado?)');
  const audience = (process.env.GOOGLE_WIF_AUDIENCE || '').trim();
  const saEmail  = (process.env.GOOGLE_SA_EMAIL || '').trim();
  if (!audience || !saEmail) throw new NotConfiguredError('Falta GOOGLE_WIF_AUDIENCE o GOOGLE_SA_EMAIL');

  // Diagnóstico temporal: imprime el audience EXACTO (JSON.stringify revela
  // espacios/caracteres ocultos) y los claims del token OIDC (iss/aud/sub son
  // identificadores, no secretos; el token completo NUNCA se loguea). Útil para
  // depurar el invalid_target del STS; quitar luego.
  let _oc = {};
  try { _oc = JSON.parse(Buffer.from((oidc.split('.')[1] || ''), 'base64url').toString('utf8')); } catch {}
  console.log(`[seo/wif] STS audience=${JSON.stringify(audience)} · oidc=${oidc.length}c · iss=${_oc.iss} · aud=${JSON.stringify(_oc.aud)} · sub=${_oc.sub}`);

  // 1) STS: token-exchange del OIDC de Vercel → token federado de Google.
  const stsRes = await fetch('https://sts.googleapis.com/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      audience,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      subject_token: oidc,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    }).toString(),
  });
  const sts = await stsRes.json().catch(() => ({}));
  if (!stsRes.ok || !sts.access_token) {
    throw new Error(`STS token-exchange falló (${stsRes.status}): ${sts.error || ''} ${sts.error_description || ''}`.trim());
  }

  // 2) Impersonar el SA → access_token con los scopes de GA4/GSC.
  const impRes = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(saEmail)}:generateAccessToken`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${sts.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: SCOPES.split(' '), lifetime: '3600s' }),
    }
  );
  const imp = await impRes.json().catch(() => ({}));
  if (!impRes.ok || !imp.accessToken) {
    throw new Error(`Impersonación del SA falló (${impRes.status}): ${(imp.error && imp.error.message) || imp.error || ''}`.trim());
  }
  return imp.accessToken;
}

async function getAccessToken() {
  if (!isConfigured()) throw new NotConfiguredError();
  const now = Math.floor(Date.now() / 1000);
  if (_tokenCache && _tokenCache.exp - 60 > now) return _tokenCache.token;
  if (_tokenPromise) return _tokenPromise;

  _tokenPromise = (async () => {
    try {
      const token = await fetchAccessToken();
      _tokenCache = { token, exp: Math.floor(Date.now() / 1000) + 3300 };
      return token;
    } finally {
      _tokenPromise = null;
    }
  })();
  return _tokenPromise;
}

// ── GA4: runReport ────────────────────────────────────────────
// dateRange: { startDate, endDate } en formato 'YYYY-MM-DD'.
// Devuelve filas [{ date, sessions, totalUsers, engagementRate, conversions }].
export async function ga4RunReport(propertyId, dateRange) {
  if (!propertyId) return { rows: [], notConfigured: false };
  const token = await getAccessToken();
  const url = `${GA4_BASE}/properties/${encodeURIComponent(propertyId)}:runReport`;
  const requestBody = {
    dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'engagementRate' },
      { name: 'conversions' },
    ],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
    limit: 100000,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`GA4 runReport falló (${res.status}): ${(json.error && json.error.message) || 'error'}`);
  }
  const rows = (json.rows || []).map((r) => {
    const d = (r.dimensionValues && r.dimensionValues[0] && r.dimensionValues[0].value) || '';
    const m = r.metricValues || [];
    return {
      // GA4 entrega 'date' como YYYYMMDD → normalizamos a YYYY-MM-DD
      date: d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d,
      sessions:       num(m[0]),
      totalUsers:     num(m[1]),
      engagementRate: num(m[2]),
      conversions:    num(m[3]),
    };
  });
  return { rows };
}

// ── GSC: searchAnalytics.query ────────────────────────────────
// dimensions: array de strings ['date'] | ['query'] | ['page'] …
export async function gscQuery(siteUrl, dateRange, dimensions = ['date'], rowLimit = 1000) {
  if (!siteUrl) return { rows: [] };
  const token = await getAccessToken();
  const url = `${GSC_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const requestBody = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    dimensions,
    rowLimit,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`GSC query falló (${res.status}): ${(json.error && json.error.message) || 'error'}`);
  }
  const rows = (json.rows || []).map((r) => ({
    keys: r.keys || [],
    clicks:      num0(r.clicks),
    impressions: num0(r.impressions),
    ctr:         num0(r.ctr),
    position:    num0(r.position),
  }));
  return { rows };
}

function num(v) {
  if (v == null) return 0;
  const n = parseFloat(v.value != null ? v.value : v);
  return Number.isFinite(n) ? n : 0;
}
function num0(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// ── Rango de fechas por defecto (últimos N días, hasta hoy) ───
export function defaultRange(days = 28) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (Math.max(1, days) - 1));
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

// ════════════════════════════════════════════════════════════
//  Helpers de DB
// ════════════════════════════════════════════════════════════
export async function listSeoProjects() {
  const r = await sql`
    SELECT id, name, client_name, ga4_property_id, gsc_site_url, domain,
           active, last_synced_at, created_at, updated_at
      FROM seo_projects
     ORDER BY active DESC, created_at DESC
  `;
  return r.rows;
}

export async function getSeoProject(id) {
  const r = await sql`
    SELECT id, name, client_name, ga4_property_id, gsc_site_url, domain,
           active, last_synced_at, created_at, updated_at
      FROM seo_projects
     WHERE id = ${id}
     LIMIT 1
  `;
  return r.rowCount ? r.rows[0] : null;
}

// data: { name, client_name, ga4_property_id, gsc_site_url, domain, active }
export async function createSeoProject(data = {}) {
  const name = (data.name || '').trim();
  if (!name) throw new Error('El nombre del proyecto es obligatorio');
  const active = data.active === undefined ? true : Boolean(data.active);
  const r = await sql`
    INSERT INTO seo_projects (name, client_name, ga4_property_id, gsc_site_url, domain, active)
    VALUES (
      ${name},
      ${data.client_name || null},
      ${data.ga4_property_id ? String(data.ga4_property_id).trim() : null},
      ${data.gsc_site_url ? String(data.gsc_site_url).trim() : null},
      ${data.domain ? String(data.domain).trim() : null},
      ${active}
    )
    RETURNING id, name, client_name, ga4_property_id, gsc_site_url, domain,
              active, last_synced_at, created_at, updated_at
  `;
  return r.rows[0];
}

// Update parcial de columnas permitidas. Devuelve el proyecto actualizado.
const SEO_EDITABLE = ['name', 'client_name', 'ga4_property_id', 'gsc_site_url', 'domain', 'active'];

export async function updateSeoProject(id, fields = {}) {
  const entries = Object.entries(fields).filter(([k]) => SEO_EDITABLE.includes(k));
  if (!entries.length) return await getSeoProject(id);

  const setParts = [];
  const values = [];
  for (const [col, raw] of entries) {
    let val = raw;
    if (col === 'active') {
      val = Boolean(val);
    } else if (val === '' || val === undefined) {
      val = null;
    } else if (typeof val === 'string') {
      val = val.trim();
    }
    setParts.push(`${col} = $${values.length + 1}`);
    values.push(val);
  }
  values.push(id);
  const text = `UPDATE seo_projects SET ${setParts.join(', ')} WHERE id = $${values.length}
                RETURNING id, name, client_name, ga4_property_id, gsc_site_url, domain,
                          active, last_synced_at, created_at, updated_at`;
  const { db } = await import('@vercel/postgres');
  const client = await db.connect();
  try {
    const r = await client.query(text, values);
    return r.rowCount ? r.rows[0] : null;
  } finally {
    client.release();
  }
}

export async function deleteSeoProject(id) {
  const r = await sql`DELETE FROM seo_projects WHERE id = ${id} RETURNING id`;
  return r.rowCount > 0;
}

export async function touchSynced(id) {
  await sql`UPDATE seo_projects SET last_synced_at = NOW() WHERE id = ${id}`;
}

// Upsert de una métrica (project_id, source, metric_date) → payload JSONB.
export async function upsertMetric(projectId, source, metricDate, payload) {
  await sql`
    INSERT INTO seo_metrics (project_id, source, metric_date, payload, fetched_at)
    VALUES (${projectId}, ${source}, ${metricDate}, ${JSON.stringify(payload)}::jsonb, NOW())
    ON CONFLICT (project_id, source, metric_date)
    DO UPDATE SET payload = EXCLUDED.payload, fetched_at = NOW()
  `;
}

// Upsert en lote de filas por-fecha. `rows` = [{ date, ...payload }].
export async function upsertMetrics(projectId, source, rows) {
  let n = 0;
  for (const row of rows) {
    const date = row.date || row.metric_date;
    if (!date) continue;
    const { date: _d, ...rest } = row;
    await upsertMetric(projectId, source, date, rest);
    n++;
  }
  return n;
}

// Lee métricas cacheadas de un proyecto en un rango [startDate, endDate].
// Devuelve { gsc: [...], ga4: [...] } ordenadas por fecha ascendente.
export async function getMetrics(projectId, range) {
  const startDate = range?.startDate || defaultRange().startDate;
  const endDate   = range?.endDate   || defaultRange().endDate;
  const r = await sql`
    SELECT source, metric_date, payload, fetched_at
      FROM seo_metrics
     WHERE project_id = ${projectId}
       AND metric_date >= ${startDate}
       AND metric_date <= ${endDate}
     ORDER BY metric_date ASC
  `;
  const out = { gsc: [], ga4: [] };
  for (const m of r.rows) {
    const bucket = out[m.source] || (out[m.source] = []);
    bucket.push({ date: m.metric_date, ...(m.payload || {}), fetched_at: m.fetched_at });
  }
  return out;
}

// ════════════════════════════════════════════════════════════
//  Sincronización (tolerante a fallos por proyecto)
// ════════════════════════════════════════════════════════════
// Sincroniza un proyecto: trae GSC (por fecha + top-queries) y GA4 (por
// fecha) y cachea en seo_metrics. NUNCA lanza: devuelve un resumen.
export async function syncProject(project, days = 28) {
  const range = defaultRange(days);
  const result = {
    project_id: project.id,
    name: project.name,
    ok: true,
    gsc: { synced: 0, error: null },
    ga4: { synced: 0, error: null },
  };

  if (!isConfigured()) {
    return { ...result, ok: false, error: 'not_configured', gsc: { synced: 0, error: 'not_configured' }, ga4: { synced: 0, error: 'not_configured' } };
  }

  // — GSC por fecha + top queries (las queries se guardan bajo una
  //   "fecha-marcador" = endDate del rango para tener el snapshot) —
  if (project.gsc_site_url) {
    try {
      const byDate = await gscQuery(project.gsc_site_url, range, ['date'], 1000);
      const dateRows = byDate.rows.map((r) => ({
        date: (r.keys && r.keys[0]) || range.endDate,
        clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
      }));
      result.gsc.synced += await upsertMetrics(project.id, 'gsc', dateRows);

      const byQuery = await gscQuery(project.gsc_site_url, range, ['query'], 25);
      const topQueries = byQuery.rows.map((r) => ({
        query: (r.keys && r.keys[0]) || '',
        clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
      }));
      // Snapshot agregado de queries bajo metric_date = endDate, source 'gsc'
      // diferenciado por una clave especial; lo guardamos como un payload con
      // { kind:'top_queries', range, queries:[...] } en metric_date endDate.
      await upsertMetric(project.id, 'gsc', range.endDate, {
        kind: 'top_queries',
        range,
        queries: topQueries,
        // preservamos también el total de la última fecha si existe
      });
    } catch (err) {
      result.gsc.error = err.code === 'not_configured' ? 'not_configured' : (err.message || 'error');
      result.ok = false;
    }
  }

  // — GA4 por fecha —
  if (project.ga4_property_id) {
    try {
      const ga = await ga4RunReport(project.ga4_property_id, range);
      result.ga4.synced += await upsertMetrics(project.id, 'ga4', ga.rows);
    } catch (err) {
      result.ga4.error = err.code === 'not_configured' ? 'not_configured' : (err.message || 'error');
      result.ok = false;
    }
  }

  if (result.ok || result.gsc.synced || result.ga4.synced) {
    try { await touchSynced(project.id); } catch (_) {}
  }
  return result;
}

// Sincroniza todos los proyectos activos (o uno concreto si se pasa id).
export async function syncAll(days = 28) {
  const all = await listSeoProjects();
  const targets = all.filter((p) => p.active);
  const results = [];
  for (const p of targets) {
    results.push(await syncProject(p, days));
  }
  return results;
}
