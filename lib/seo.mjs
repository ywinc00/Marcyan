// ════════════════════════════════════════════════════════════════
//  lib/seo.mjs — SEO + GA4/GSC
//  Modelo: UNA service account (SA) de la agencia con acceso de solo
//  lectura a las propiedades de cada cliente. La clave JSON del SA va
//  en la env GOOGLE_SA_KEY. Si falta, todo degrada con gracia:
//    · getAccessToken() lanza un Error con .code = 'not_configured'
//    · syncProject() captura ese error por proyecto y devuelve un
//      resultado { ok:false, error:'not_configured' } sin romper.
//  Sin dependencias externas: el JWT RS256 se firma con node:crypto.
//
//  Esquema: db/migrations/006_seo.sql (seo_projects + seo_metrics).
// ════════════════════════════════════════════════════════════════
import crypto from 'node:crypto';
import { sql } from '@vercel/postgres';

export const SEO_SOURCES = ['gsc', 'ga4'];

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GA4_BASE       = 'https://analyticsdata.googleapis.com/v1beta';
const GSC_BASE       = 'https://www.googleapis.com/webmasters/v3';
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
].join(' ');

// ── Errores tipados ───────────────────────────────────────────
export class NotConfiguredError extends Error {
  constructor(msg = 'GOOGLE_SA_KEY no configurada') {
    super(msg);
    this.name = 'NotConfiguredError';
    this.code = 'not_configured';
  }
}

export function isConfigured() {
  return Boolean((process.env.GOOGLE_SA_KEY || '').trim());
}

// ── Carga + parseo de la clave del SA ─────────────────────────
// GOOGLE_SA_KEY puede venir como JSON crudo o como JSON en base64
// (cómodo para variables de entorno de una sola línea).
function loadServiceAccount() {
  const raw = (process.env.GOOGLE_SA_KEY || '').trim();
  if (!raw) throw new NotConfiguredError();
  let text = raw;
  if (!raw.startsWith('{')) {
    // Probablemente base64
    try { text = Buffer.from(raw, 'base64').toString('utf8'); }
    catch { /* se intenta parsear tal cual abajo */ }
  }
  let sa;
  try { sa = JSON.parse(text); }
  catch { throw new Error('GOOGLE_SA_KEY no es JSON válido'); }
  if (!sa.client_email || !sa.private_key) {
    throw new Error('GOOGLE_SA_KEY incompleta (faltan client_email / private_key)');
  }
  // Las private_key suelen traer \n escapados al pasar por env.
  sa.private_key = String(sa.private_key).replace(/\\n/g, '\n');
  return sa;
}

// ── JWT RS256 firmado con node:crypto ─────────────────────────
function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function buildSignedJwt(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss:   sa.client_email,
    scope: SCOPES,
    aud:   TOKEN_ENDPOINT,
    iat:   now,
    exp:   now + 3600,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto
    .sign('RSA-SHA256', Buffer.from(signingInput), sa.private_key)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${signingInput}.${signature}`;
}

// Cache de token en memoria del lambda (se reutiliza entre proyectos
// dentro de la misma invocación; expira solo).
let _tokenCache = null; // { token, exp }

async function getAccessToken() {
  if (!isConfigured()) throw new NotConfiguredError();
  const now = Math.floor(Date.now() / 1000);
  if (_tokenCache && _tokenCache.exp - 60 > now) return _tokenCache.token;

  const sa = loadServiceAccount();
  const assertion = buildSignedJwt(sa);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(`Fallo al obtener access_token de Google: ${json.error || res.status} ${json.error_description || ''}`.trim());
  }
  _tokenCache = { token: json.access_token, exp: now + (json.expires_in || 3600) };
  return _tokenCache.token;
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
