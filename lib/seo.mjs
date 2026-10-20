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
//  Esquema: db/migrations/006_seo.sql (seo_projects + seo_metrics) y
//  014_seo.sql (estado de la sincronización por fuente, fuente 'gsc_queries').
//  Todo funciona aunque la 014 no esté aplicada (degrada sin romper).
//  La lógica pura (validación, errores en español, ventanas de fechas) vive
//  en lib/seo-core.mjs, que también usa el panel.
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';
import { houstonDate } from './dates.mjs';
import {
  METRIC_SOURCES, SYNC_SOURCES, DEFAULT_DAYS, CRON_DAYS, addDays, ymd, clampDays, lookbackDays,
  classifyGoogleError, explainCode, overallStatus, mergeSyncState, invalidateSyncState, sameField,
} from './seo-core.mjs';

// A6-R4: ninguna llamada a Google puede colgar la función. Con 15 s por
// petición, una respuesta lenta cuenta como "Google no responde" (unavailable)
// y el estado se guarda antes de que Vercel corte por maxDuration.
// Peor caso de un proyecto: 4 peticiones seguidas (STS, impersonación y las
// dos de GA4) = GOOGLE_PROJECT_WORST_MS. Entre el presupuesto de una sync por
// lotes y su maxDuration debe caber al menos eso.
export const GOOGLE_TIMEOUT_MS = 15000;
export const GOOGLE_PROJECT_WORST_MS = GOOGLE_TIMEOUT_MS * 4;
function gfetch(url, opts = {}) {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS) });
}

// Fuentes de seo_metrics (antes ['gsc','ga4'] y sin usar; SEO-25).
export const SEO_SOURCES = METRIC_SOURCES;

const GA4_BASE       = 'https://analyticsdata.googleapis.com/v1beta';
const GSC_BASE       = 'https://www.googleapis.com/webmasters/v3';
const GSC_INSPECT    = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
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

  // (SEO-20) Aquí había un log temporal con el audience y los claims del token
  // OIDC (iss/aud/sub). Se quitó: no se registran identificadores de la
  // federación en los logs de runtime. Para depurar, usar /api/admin/seo/diag.

  // 1) STS: token-exchange del OIDC de Vercel → token federado de Google.
  const stsRes = await gfetch('https://sts.googleapis.com/v1/token', {
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
  const impRes = await gfetch(
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

// Error de una API de Google con su código HTTP y su fuente, para que
// lib/seo-core.mjs (classifyGoogleError) lo explique en español.
function googleError(source, label, status, json) {
  const e = new Error(`${label} falló (${status}): ${(json && json.error && json.error.message) || 'error'}`);
  e.status = status;
  e.source = source;
  return e;
}

// Los fallos del intercambio WIF (STS o impersonación) llegan como Error sin
// código; se etiquetan aquí, FUERA de la autenticación, para explicarlos.
function tagAuthError(err) {
  if (err && !err.code && /STS token-exchange|Impersonación del SA/i.test(String(err.message || ''))) {
    err.code = 'auth_failed';
  }
  return err;
}

// ── GA4: runReport ────────────────────────────────────────────
// dateRange: { startDate, endDate } en formato 'YYYY-MM-DD'.
// Devuelve filas [{ date, sessions, totalUsers, engagementRate, conversions, keyEvents }].
// Google renombró "conversions" a "keyEvents" (eventos clave). Se pide
// keyEvents y, si la API no la reconoce (400 que la nombra), se repite con
// conversions. Las dos se guardan en el mismo número (compatibilidad).
const GA4_BASE_METRICS = [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagementRate' }];

async function ga4Report(propertyId, dateRange, token, keyMetric) {
  const url = `${GA4_BASE}/properties/${encodeURIComponent(propertyId)}:runReport`;
  const requestBody = {
    dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [...GA4_BASE_METRICS, { name: keyMetric }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
    limit: 100000,
  };
  const res = await gfetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

export async function ga4RunReport(propertyId, dateRange) {
  if (!propertyId) return { rows: [], notConfigured: false };
  const token = await getAccessToken();
  let keyMetric = 'keyEvents';
  let { res, json } = await ga4Report(propertyId, dateRange, token, keyMetric);
  if (!res.ok && res.status === 400 && /keyEvents/i.test((json.error && json.error.message) || '')) {
    keyMetric = 'conversions';
    ({ res, json } = await ga4Report(propertyId, dateRange, token, keyMetric));
  }
  if (!res.ok) throw googleError('ga4', 'GA4 runReport', res.status, json);
  const rows = (json.rows || []).map((r) => {
    const d = (r.dimensionValues && r.dimensionValues[0] && r.dimensionValues[0].value) || '';
    const m = r.metricValues || [];
    const key = num(m[3]);
    return {
      // GA4 entrega 'date' como YYYYMMDD → normalizamos a YYYY-MM-DD
      date: d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d,
      sessions:       num(m[0]),
      totalUsers:     num(m[1]),
      engagementRate: num(m[2]),
      conversions:    key,
      keyEvents:      key,
    };
  });
  return { rows, keyMetric };
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
  const res = await gfetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw googleError('gsc', 'GSC query', res.status, json);
  const rows = (json.rows || []).map((r) => ({
    keys: r.keys || [],
    clicks:      num0(r.clicks),
    impressions: num0(r.impressions),
    ctr:         num0(r.ctr),
    position:    num0(r.position),
  }));
  return { rows };
}

// ── GSC: indexación ───────────────────────────────────────────
// Señal principal: la Sitemaps API agrega las URLs enviadas e indexadas por
// sitemap. La URL Inspection API sobre la home añade su estado y su último
// rastreo. Las dos van en paralelo.
//   Devuelve { data, reason }:
//     data   = { indexed, not_indexed, total, no_sitemaps, checked_at, issues, pages } | null
//     reason = { code, detail } | null  → POR QUÉ no hay datos o están a medias
//              (sin permiso, sin sitemaps enviados, inspección fallida…). SEO-08.
//   Nunca lanza.
function homeUrlOf(project, siteUrl) {
  if (project.domain && /^https?:/i.test(project.domain)) return project.domain;
  if (project.domain) return `https://${project.domain}`;
  return /^https?:/i.test(siteUrl) ? siteUrl : null;
}

export async function fetchIndexationDetailed(project) {
  const siteUrl = project && project.gsc_site_url;
  if (!siteUrl) return { data: null, reason: null };

  let token;
  try {
    token = await getAccessToken();
  } catch (err) {
    tagAuthError(err);
    return { data: null, reason: { code: err.code === 'not_configured' ? 'not_configured' : (err.code || 'unknown'), detail: err.message || '' } };
  }

  const sitemapsTask = (async () => {
    const res = await gfetch(`${GSC_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps`, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw googleError('indexation', 'GSC sitemaps', res.status, json);
    return Array.isArray(json.sitemap) ? json.sitemap : [];
  })();

  const home = homeUrlOf(project, siteUrl);
  const inspectTask = home ? (async () => {
    const res = await gfetch(GSC_INSPECT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspectionUrl: home, siteUrl }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw googleError('indexation', 'GSC URL Inspection', res.status, json);
    return (json.inspectionResult && json.inspectionResult.indexStatusResult) || {};
  })() : Promise.resolve(null);

  const [sm, ins] = await Promise.allSettled([sitemapsTask, inspectTask]);

  let total = 0, indexed = 0;
  const issues = [];
  const sitemaps = sm.status === 'fulfilled' ? sm.value : null;
  for (const s of (sitemaps || [])) {
    for (const c of (Array.isArray(s.contents) ? s.contents : [])) {
      total   += num0(c.submitted);
      indexed += num0(c.indexed);
    }
    const errs = num0(s.errors);
    const warns = num0(s.warnings);
    if (errs > 0) issues.push({ reason: `Errores en ${s.path || 'el sitemap'}`, count: errs });
    if (warns > 0) issues.push({ reason: `Avisos en ${s.path || 'el sitemap'}`, count: warns });
  }

  const pages = [];
  if (ins.status === 'fulfilled' && ins.value) {
    const idx = ins.value;
    const verdict = idx.coverageState || idx.verdict || 'Desconocido';
    pages.push({ url: home, state: verdict, verdict: idx.verdict || null, last_crawl: idx.lastCrawlTime || null });
    if (idx.verdict && idx.verdict !== 'PASS') issues.push({ reason: `Página de inicio: ${verdict}`, count: 1 });
  }

  // Por qué faltan datos (si faltan).
  let reason = null;
  if (sm.status === 'rejected') {
    const ex = classifyGoogleError('indexation', tagAuthError(sm.reason));
    reason = { code: ex.code, detail: ex.detail };
  } else if (!sitemaps.length) {
    reason = { code: 'no_sitemaps', detail: '' };
  } else if (ins.status === 'rejected' && !pages.length) {
    // Sitemaps bien, la inspección de la home falló: dato útil, aviso menor.
    reason = null;
  }

  if (!sitemaps && !pages.length) return { data: null, reason: reason || { code: 'index_empty', detail: '' } };
  if (sitemaps && !sitemaps.length && !pages.length) return { data: null, reason };

  if (indexed > total) total = indexed; // defensa: nunca indexed > total
  return {
    data: {
      indexed,
      not_indexed: Math.max(0, total - indexed),
      total,
      // SEO-09: sin sitemaps no hay total del que sacar un porcentaje.
      no_sitemaps: !sitemaps || sitemaps.length === 0 || total === 0,
      checked_at: new Date().toISOString(),
      issues,
      pages,
    },
    reason,
  };
}

// Compatibilidad: la firma de antes (objeto o null, nunca lanza).
export async function fetchIndexation(project) {
  const r = await fetchIndexationDetailed(project);
  return r.data;
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

// ── Rango de fechas por defecto (últimos N días hasta hoy, en Houston) ───
// Antes usaba el día UTC: de 7 pm a medianoche de Houston "hoy" era mañana.
export function defaultRange(days = DEFAULT_DAYS, now) {
  const end = houstonDate(now);
  return { startDate: addDays(end, -(Math.max(1, days) - 1)), endDate: end };
}

// ════════════════════════════════════════════════════════════
//  Diagnóstico de acceso — ¿qué VE realmente la service account?
//  Si getAccessToken() funciona (token WIF OK) pero la API responde 403,
//  el problema NO es de infraestructura sino de PERMISOS/identidad de
//  propiedad. Estas funciones enumeran las propiedades a las que la SA SÍ
//  tiene acceso para detectar el desajuste típico:
//    · GSC: propiedad de DOMINIO ('sc-domain:x.com') vs PREFIJO de URL
//           ('https://www.x.com/') — son ACLs distintas; hay que consultar
//           exactamente la propiedad sobre la que la SA está autorizada.
//    · GA4: el número guardado no es el Property ID, o la SA no está añadida
//           a NIVEL DE PROPIEDAD.
//  Todo solo-lectura; no muta nada.
// ════════════════════════════════════════════════════════════
const GA4_ADMIN_BASE = 'https://analyticsadmin.googleapis.com/v1beta';

// GSC sites.list → [{ siteUrl, permissionLevel }]. siteUrl puede ser un
// prefijo ('https://www.x.com/') o un dominio ('sc-domain:x.com').
export async function gscListSites() {
  const token = await getAccessToken();
  const res = await gfetch(`${GSC_BASE}/sites`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw googleError('gsc', 'GSC sites.list', res.status, json);
  return (json.siteEntry || []).map((s) => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel }));
}

// GA4 Admin accountSummaries → [{ account, accountName, property, propertyId, propertyName }].
// 'property' viene como 'properties/123456789'; extraemos el id numérico.
// Requiere la Analytics Admin API habilitada; si no, lanza (capturado arriba).
export async function ga4ListAccountSummaries() {
  const token = await getAccessToken();
  const res = await gfetch(`${GA4_ADMIN_BASE}/accountSummaries?pageSize=200`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw googleError('ga4', 'GA4 accountSummaries', res.status, json);
  const out = [];
  for (const a of (json.accountSummaries || [])) {
    for (const p of (a.propertySummaries || [])) {
      out.push({
        account: a.account,
        accountName: a.displayName,
        property: p.property,
        propertyId: String(p.property || '').replace(/^properties\//, ''),
        propertyName: p.displayName,
      });
    }
  }
  return out;
}

// Prueba puntual de acceso a UNA propiedad GA4 vía Data API metadata (ya
// habilitada). Devuelve { ok, status, error } sin lanzar.
export async function ga4ProbeProperty(propertyId) {
  if (!propertyId) return { ok: false, status: 0, error: 'sin property id' };
  const token = await getAccessToken();
  const res = await gfetch(`${GA4_BASE}/properties/${encodeURIComponent(propertyId)}/metadata`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, error: res.ok ? null : ((json.error && json.error.message) || 'error') };
}

// Prueba puntual de acceso a UNA propiedad GSC (searchAnalytics mínimo, 1 fila).
// Devuelve { ok, status, error } sin lanzar.
export async function gscProbeSite(siteUrl) {
  if (!siteUrl) return { ok: false, status: 0, error: 'sin site url' };
  const token = await getAccessToken();
  const range = defaultRange(7);
  const res = await gfetch(`${GSC_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate: range.startDate, endDate: range.endDate, dimensions: ['date'], rowLimit: 1 }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, error: res.ok ? null : ((json.error && json.error.message) || 'error') };
}

// ════════════════════════════════════════════════════════════
//  Helpers de DB
// ════════════════════════════════════════════════════════════
// SELECT * para tolerar la base sin la migración 014 (sin sync_state,
// last_attempt_at ni last_sync_status); shapeProject fija la forma.
export const SEO_PROJECT_KEYS = [
  'id', 'name', 'client_name', 'ga4_property_id', 'gsc_site_url', 'domain',
  'active', 'last_synced_at', 'last_attempt_at', 'last_sync_status', 'sync_state',
  'created_at', 'updated_at',
];
export function shapeProject(row) {
  if (!row) return null;
  const out = {};
  for (const k of SEO_PROJECT_KEYS) out[k] = row[k] === undefined ? null : row[k];
  if (out.id != null) out.id = String(out.id);
  // Un sync_state vacío ('{}' por defecto) equivale a "sin intentos". Tras un
  // cambio de propiedad queda sin estado global pero con las fuentes que
  // siguen valiendo (A6-R3): esas se conservan para enseñarlas.
  const st = out.sync_state;
  if (st && typeof st === 'object' && !st.status && !(st.sources && Object.keys(st.sources).length)) out.sync_state = null;
  return out;
}

// ¿Falta una columna o tabla? (base sin la migración 014)
function isMissingColumn(err) {
  return Boolean(err && (err.code === '42703' || err.code === '42P01'));
}

export async function listSeoProjects() {
  const r = await sql`
    SELECT * FROM seo_projects
     ORDER BY active DESC, created_at DESC
  `;
  return r.rows.map(shapeProject);
}

export async function getSeoProject(id) {
  const r = await sql`SELECT * FROM seo_projects WHERE id = ${id} LIMIT 1`;
  return r.rowCount ? shapeProject(r.rows[0]) : null;
}

// data: { name, client_name, ga4_property_id, gsc_site_url, domain, active }
// (los endpoints validan y normalizan antes con validateProjectFields).
export async function createSeoProject(data = {}) {
  const name = (data.name || '').trim();
  if (!name) throw new Error('El nombre del proyecto es obligatorio');
  const active = data.active === undefined ? true : Boolean(data.active);
  const r = await sql`
    INSERT INTO seo_projects (name, client_name, ga4_property_id, gsc_site_url, domain, active)
    VALUES (
      ${name},
      ${data.client_name ? String(data.client_name).trim() : null},
      ${data.ga4_property_id ? String(data.ga4_property_id).trim() : null},
      ${data.gsc_site_url ? String(data.gsc_site_url).trim() : null},
      ${data.domain ? String(data.domain).trim() : null},
      ${active}
    )
    RETURNING *
  `;
  return shapeProject(r.rows[0]);
}

// Update parcial de columnas permitidas. Devuelve el proyecto actualizado.
const SEO_EDITABLE = ['name', 'client_name', 'ga4_property_id', 'gsc_site_url', 'domain', 'active'];

// UPDATE parametrizado: los nombres de columna salen de SEO_EDITABLE (lista
// fija), los valores van como parámetros. null si no hay nada que cambiar.
function buildProjectUpdate(id, fields = {}) {
  const entries = Object.entries(fields).filter(([k]) => SEO_EDITABLE.includes(k));
  if (!entries.length) return null;
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
  return { text: `UPDATE seo_projects SET ${setParts.join(', ')} WHERE id = $${values.length} RETURNING *`, values };
}

export async function updateSeoProject(id, fields = {}) {
  const q = buildProjectUpdate(id, fields);
  if (!q) return await getSeoProject(id);
  const { db } = await import('@vercel/postgres');
  const client = await db.connect();
  try {
    const r = await client.query(q.text, q.values);
    return r.rowCount ? shapeProject(r.rows[0]) : null;
  } finally {
    client.release();
  }
}

// Ejecuta fn(client) dentro de BEGIN/COMMIT con un cliente propio.
async function inTransaction(fn) {
  const { db } = await import('@vercel/postgres');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { console.error('[seo] ROLLBACK falló:', e && e.message); }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Edición de un proyecto en UNA transacción (A6-R3): bloquea la fila, aplica
 * el cambio y, si cambió la propiedad de Search Console o el ID de Analytics,
 * borra los datos de esas fuentes y pone su estado al día. O todo o nada: si
 * el borrado falla, el proyecto se queda con la propiedad anterior.
 * Devuelve { project, cleared } (project null si no existe).
 */
export async function updateSeoProjectAndSources(id, fields = {}) {
  return inTransaction(async (client) => {
    const cur = await client.query('SELECT * FROM seo_projects WHERE id = $1 FOR UPDATE', [id]);
    if (!cur.rowCount) return { project: null, cleared: [] };
    let row = cur.rows[0];
    const q = buildProjectUpdate(id, fields);
    if (q) row = (await client.query(q.text, q.values)).rows[0];
    const cleared = sourcesInvalidatedBy(shapeProject(cur.rows[0]), shapeProject(row));
    if (cleared.length) row = await clearSourcesTx(client, id, cleared, row);
    return { project: shapeProject(row), cleared };
  });
}

/**
 * Qué fuentes de datos dejan de valer al cambiar los identificadores (SEO-06):
 * otra propiedad de Search Console invalida el diario, el resumen de
 * búsquedas y la indexación; otro ID de Analytics invalida el diario de GA4.
 */
export function sourcesInvalidatedBy(before, after) {
  // Se comparan los valores normalizados (A6-R7): pasar de 'https://www.x.com'
  // (guardado antes de la validación) a 'https://www.x.com/' no es otra
  // propiedad y no borra nada.
  const out = [];
  if (before && after && !sameField('gsc_site_url', before.gsc_site_url, after.gsc_site_url)) out.push('gsc', 'gsc_queries', 'indexation');
  if (before && after && !sameField('ga4_property_id', before.ga4_property_id, after.ga4_property_id)) out.push('ga4');
  return out;
}

/**
 * Borra las métricas guardadas de esas fuentes y quita su estado de
 * sincronización (dentro de la transacción del cliente dado). El estado
 * global se recalcula con invalidateSyncState (lib/seo-core.mjs):
 *   · si alguna fuente borrada tiene ya un identificador nuevo, todavía no hay
 *     datos suyos → estado global y last_synced_at vuelven a NULL ("Sin
 *     sincronizar") hasta la próxima sincronización;
 *   · si se quitó el identificador, el estado sale de las fuentes que quedan
 *     y last_synced_at se conserva.
 * `row` es la fila ya actualizada del proyecto; devuelve la fila final.
 */
async function clearSourcesTx(client, id, sources, row) {
  const list = sources.filter((s) => METRIC_SOURCES.includes(s));
  if (!list.length) return row;
  await client.query('DELETE FROM seo_metrics WHERE project_id = $1 AND source = ANY($2::text[])', [id, list]);
  // Sin la migración 014 no hay sync_state: solo se reinicia last_synced_at.
  if (!row || !('sync_state' in row)) {
    const r = await client.query('UPDATE seo_projects SET last_synced_at = NULL WHERE id = $1 RETURNING *', [id]);
    return r.rows[0] || row;
  }
  const inv = invalidateSyncState(row.sync_state, list, shapeProject(row));
  const r = await client.query(
    `UPDATE seo_projects
        SET sync_state = $2::jsonb,
            last_sync_status = $3,
            last_synced_at = CASE WHEN $4::boolean THEN NULL ELSE last_synced_at END
      WHERE id = $1
      RETURNING *`,
    [id, JSON.stringify(inv.sync_state), inv.status, inv.clearSynced],
  );
  return r.rows[0] || row;
}

/** Borra los datos de esas fuentes y su estado, en su propia transacción
 *  (compatibilidad; la edición usa updateSeoProjectAndSources). */
export async function clearProjectSources(id, sources = []) {
  const list = sources.filter((s) => METRIC_SOURCES.includes(s));
  if (!list.length) return { deleted: 0 };
  return inTransaction(async (client) => {
    const cur = await client.query('SELECT * FROM seo_projects WHERE id = $1 FOR UPDATE', [id]);
    const n = await client.query('SELECT COUNT(*)::int AS n FROM seo_metrics WHERE project_id = $1 AND source = ANY($2::text[])', [id, list]);
    if (cur.rowCount) await clearSourcesTx(client, id, list, cur.rows[0]);
    else await client.query('DELETE FROM seo_metrics WHERE project_id = $1 AND source = ANY($2::text[])', [id, list]);
    return { deleted: (n.rows[0] && n.rows[0].n) || 0 };
  });
}

export async function deleteSeoProject(id) {
  const r = await sql`DELETE FROM seo_projects WHERE id = ${id} RETURNING id`;
  return r.rowCount > 0;
}

export async function touchSynced(id) {
  await sql`UPDATE seo_projects SET last_synced_at = NOW() WHERE id = ${id}`;
}

/**
 * Guarda el resultado de un intento (SEO-07). last_synced_at solo avanza si
 * todas las fuentes configuradas fueron bien. Sin la migración 014 cae al
 * comportamiento anterior y devuelve { persisted: false }.
 */
export async function saveSyncState(id, state) {
  const ok = state && state.status === 'ok';
  try {
    await sql`
      UPDATE seo_projects
         SET sync_state = ${JSON.stringify(state)}::jsonb,
             last_sync_status = ${state.status},
             last_attempt_at = NOW(),
             last_synced_at = CASE WHEN ${ok}::boolean THEN NOW() ELSE last_synced_at END
       WHERE id = ${id}
    `;
    return { persisted: true };
  } catch (err) {
    if (!isMissingColumn(err)) throw err;
    if (ok) await touchSynced(id);
    return { persisted: false };
  }
}

// ── Guarda de identificador (A6-R2) ──
// Una sincronización pide a Google con la propiedad que tenía el proyecto al
// empezar. Si mientras tanto se edita (PATCH, que borra los datos viejos en
// una transacción con la fila bloqueada), lo traído ya no vale. Cada
// escritura lleva { kind: 'gsc' | 'ga4', value } y solo se hace si el
// proyecto SIGUE con ese identificador: la comprobación va en la misma
// sentencia y bloquea la fila (FOR SHARE), así que espera a que termine una
// edición en curso y luego la ve. Sin guarda (null) se escribe como antes.
export function idsGuard(project, source) {
  if (!project) return null;
  return source === 'ga4'
    ? { kind: 'ga4', value: project.ga4_property_id || null }
    : { kind: 'gsc', value: project.gsc_site_url || null };
}
function idsChangedError() {
  const e = new Error('La propiedad del proyecto cambió durante la sincronización; no se guardan los datos de la anterior.');
  e.code = 'ids_changed';
  return e;
}
/** ¿El proyecto sigue con ese identificador? (para fuentes sin filas que escribir). */
export async function idsStillMatch(projectId, guard) {
  if (!guard) return true;
  const r = await sql`SELECT gsc_site_url, ga4_property_id FROM seo_projects WHERE id = ${projectId} LIMIT 1`;
  if (!r.rowCount) return false;
  const cur = guard.kind === 'ga4' ? r.rows[0].ga4_property_id : r.rows[0].gsc_site_url;
  return (cur || null) === (guard.value || null);
}

// Upsert de una métrica (project_id, source, metric_date) → payload JSONB.
// Con guarda, lanza un error ids_changed si el proyecto cambió de propiedad.
export async function upsertMetric(projectId, source, metricDate, payload, guard = null) {
  const gk = guard ? guard.kind : null;
  const gv = guard ? guard.value : null;
  const r = await sql`
    INSERT INTO seo_metrics (project_id, source, metric_date, payload, fetched_at)
    SELECT ${projectId}::bigint, ${source}::text, ${metricDate}::date, ${JSON.stringify(payload)}::jsonb, NOW()
     WHERE ${gk}::text IS NULL OR EXISTS (
       SELECT 1 FROM seo_projects p
        WHERE p.id = ${projectId}::bigint
          AND (CASE WHEN ${gk}::text = 'ga4' THEN p.ga4_property_id ELSE p.gsc_site_url END) IS NOT DISTINCT FROM ${gv}::text
        FOR SHARE)
    ON CONFLICT (project_id, source, metric_date)
    DO UPDATE SET payload = EXCLUDED.payload, fetched_at = NOW()
  `;
  if (guard && !r.rowCount) throw idsChangedError();
}

// Upsert EN LOTE de filas por fecha (SEO-15): una sola sentencia por cada 500
// filas en vez de un INSERT por fila. `rows` = [{ date, ...payload }].
// Las fechas repetidas se quedan con la última (ON CONFLICT no admite tocar
// la misma fila dos veces en una sentencia).
export function dedupeByDate(rows = []) {
  const map = new Map();
  for (const row of rows) {
    const date = ymd(row && (row.date || row.metric_date));
    if (!date) continue;
    const { date: _d, metric_date: _m, ...rest } = row;
    map.set(date, rest);
  }
  return [...map.entries()].map(([date, payload]) => ({ date, payload }));
}

export async function upsertMetrics(projectId, source, rows, guard = null) {
  const items = dedupeByDate(rows);
  const gk = guard ? guard.kind : null;
  const gv = guard ? guard.value : null;
  // Sin filas no hay sentencia que lleve la guarda: se comprueba aparte.
  if (guard && !items.length && !(await idsStillMatch(projectId, guard))) throw idsChangedError();
  for (let i = 0; i < items.length; i += 500) {
    const chunk = JSON.stringify(items.slice(i, i + 500));
    const r = await sql`
      INSERT INTO seo_metrics (project_id, source, metric_date, payload, fetched_at)
      -- Casts explícitos: en INSERT … SELECT los parámetros llegan sin tipo y
      -- Postgres los tomaría como texto (project_id es BIGINT).
      SELECT ${projectId}::bigint, ${source}::text, (e->>'date')::date, COALESCE(e->'payload', '{}'::jsonb), NOW()
        FROM jsonb_array_elements(${chunk}::jsonb) AS e
       WHERE ${gk}::text IS NULL OR EXISTS (
         SELECT 1 FROM seo_projects p
          WHERE p.id = ${projectId}::bigint
            AND (CASE WHEN ${gk}::text = 'ga4' THEN p.ga4_property_id ELSE p.gsc_site_url END) IS NOT DISTINCT FROM ${gv}::text
          FOR SHARE)
      ON CONFLICT (project_id, source, metric_date)
      DO UPDATE SET payload = EXCLUDED.payload, fetched_at = NOW()
    `;
    if (guard && !r.rowCount) throw idsChangedError();
  }
  return items.length;
}

// Resumen de búsquedas: UNA fila por proyecto (la última). SEO-05: ya no
// comparte clave con el diario de Search Console. Borra los resúmenes viejos
// (los de la fuente nueva y los antiguos guardados como 'gsc'). Con guarda,
// si la propiedad cambió no se escribe ni se borra nada.
export async function saveTopQueries(projectId, endDate, payload, guard = null) {
  await upsertMetric(projectId, 'gsc_queries', endDate, payload, guard);
  await sql`
    DELETE FROM seo_metrics
     WHERE project_id = ${projectId}
       AND ((source = 'gsc_queries' AND metric_date <> ${endDate})
         OR (source = 'gsc' AND payload->>'kind' = 'top_queries'))
  `;
}

// Lee métricas cacheadas de un proyecto en un rango [startDate, endDate].
// Devuelve:
//   gsc        → filas diarias de Search Console (sin resúmenes), por fecha
//                ascendente. Por compatibilidad, al final va también el
//                resumen de búsquedas con { kind: 'top_queries' } (como antes).
//   ga4        → filas diarias de Analytics.
//   indexation → la foto MÁS RECIENTE, aunque sea anterior al rango (lleva su
//                fecha; antes desaparecía a los 28 días sin sincronizar).
//   top_queries→ el resumen MÁS RECIENTE { date, range, queries, fetched_at }.
export async function getMetrics(projectId, range) {
  const startDate = range?.startDate || defaultRange().startDate;
  const endDate   = range?.endDate   || defaultRange().endDate;
  const [daily, idx, tq] = await Promise.all([
    sql`
      SELECT source, metric_date, payload, fetched_at
        FROM seo_metrics
       WHERE project_id = ${projectId}
         AND source IN ('gsc', 'ga4')
         AND metric_date >= ${startDate}
         AND metric_date <= ${endDate}
       ORDER BY metric_date ASC
    `,
    sql`
      SELECT metric_date, payload, fetched_at FROM seo_metrics
       WHERE project_id = ${projectId} AND source = 'indexation'
       ORDER BY metric_date DESC, fetched_at DESC LIMIT 1
    `,
    sql`
      SELECT metric_date, payload, fetched_at FROM seo_metrics
       WHERE project_id = ${projectId}
         AND (source = 'gsc_queries' OR (source = 'gsc' AND payload->>'kind' = 'top_queries'))
       ORDER BY (source = 'gsc_queries') DESC, fetched_at DESC, metric_date DESC LIMIT 1
    `,
  ]);
  const out = { gsc: [], ga4: [], indexation: null, top_queries: null };
  for (const m of daily.rows) {
    const p = m.payload || {};
    if (m.source === 'gsc' && p.kind === 'top_queries') continue;
    out[m.source].push({ date: m.metric_date, ...p, fetched_at: m.fetched_at });
  }
  if (idx.rows[0]) {
    const m = idx.rows[0];
    out.indexation = { ...(m.payload || {}), fetched_at: m.fetched_at, metric_date: m.metric_date };
  }
  if (tq.rows[0]) {
    const m = tq.rows[0];
    const p = m.payload || {};
    out.top_queries = { date: m.metric_date, range: p.range || null, queries: Array.isArray(p.queries) ? p.queries : [], fetched_at: m.fetched_at };
    out.gsc.push({ date: m.metric_date, kind: 'top_queries', range: out.top_queries.range, queries: out.top_queries.queries, fetched_at: m.fetched_at });
  }
  return out;
}

// ════════════════════════════════════════════════════════════
//  Sincronización (tolerante a fallos por fuente; NUNCA lanza)
// ════════════════════════════════════════════════════════════
function sourceError(source, err) {
  return classifyGoogleError(source, tagAuthError(err));
}
// Un fallo al guardar es de la base, salvo que la guarda lo haya parado
// porque la propiedad cambió (A6-R2): ese conserva su propio código.
function asDbError(err) {
  if (!err || err.code !== 'ids_changed') { if (err) err.code = 'db_failed'; }
  return err;
}

/**
 * Sincroniza un proyecto: Search Console (diario + resumen de búsquedas),
 * Analytics (diario) e indexación, EN PARALELO, y guarda en seo_metrics.
 * Pide a Google el rango y su período previo (lookbackDays) para que la
 * comparación sea real (SEO-13).
 *   opts.trigger: 'manual' | 'cron'
 * Devuelve (compatible con la forma anterior):
 *   { project_id, name, ok, status, error,
 *     gsc|ga4|indexation: { synced, error },   ← error = texto en español
 *     sources: { gsc|ga4|indexation: { status, at, synced, range, error{code,title,action,detail} } },
 *     sync_state, persisted }
 */
export async function syncProject(project, days = DEFAULT_DAYS, opts = {}) {
  const trigger = opts.trigger === 'cron' ? 'cron' : 'manual';
  // A6-R1: el diario se pide siempre al menos para el rango mayor y su previo
  // (las mismas llamadas, solo más filas). Así una sync manual de 7 días no
  // deja sin comparación las vistas de 28 o 90. `days` solo fija el resumen
  // de búsquedas.
  const lb = lookbackDays(Math.max(clampDays(days), CRON_DAYS));
  const today = houstonDate();
  const range = { startDate: addDays(today, -(lb - 1)), endDate: today };
  const at = new Date().toISOString();
  const hasGsc = Boolean(project.gsc_site_url);
  const hasGa4 = Boolean(project.ga4_property_id);

  const off = () => ({ status: 'off', at, synced: 0, range: null, error: null });
  const fail = (e) => ({ status: 'error', at, synced: 0, range, error: e });
  const sources = { gsc: off(), ga4: off(), indexation: off() };

  if (!hasGsc && !hasGa4) {
    const e = explainCode('no_ids');
    return finish(project, { trigger, at, status: 'error', sources, topError: e });
  }

  if (!isConfigured()) {
    const e = explainCode('not_configured');
    if (hasGsc) { sources.gsc = fail(e); sources.indexation = fail(e); }
    if (hasGa4) sources.ga4 = fail(e);
    return finish(project, { trigger, at, status: 'error', sources, topError: e });
  }

  const gscTask = hasGsc ? (async () => {
    const [byDate, byQuery] = await Promise.all([
      gscQuery(project.gsc_site_url, range, ['date'], 1000),
      // El resumen de búsquedas cubre el rango VISIBLE, no el período previo.
      gscQuery(project.gsc_site_url, { startDate: addDays(today, -(clampDays(days) - 1) - 3), endDate: today }, ['query'], 25),
    ]);
    const dateRows = byDate.rows.map((r) => ({
      date: (r.keys && r.keys[0]) || range.endDate,
      clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
    }));
    let n;
    const guard = idsGuard(project, 'gsc');
    try {
      n = await upsertMetrics(project.id, 'gsc', dateRows, guard);
      await saveTopQueries(project.id, range.endDate, {
        kind: 'top_queries',
        range: { startDate: addDays(today, -(clampDays(days) - 1) - 3), endDate: today, days: clampDays(days) },
        queries: byQuery.rows.map((r) => ({
          query: (r.keys && r.keys[0]) || '',
          clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
        })),
      }, guard);
    } catch (err) { throw asDbError(err); }
    return n;
  })() : null;

  const ga4Task = hasGa4 ? (async () => {
    const ga = await ga4RunReport(project.ga4_property_id, range);
    try { return await upsertMetrics(project.id, 'ga4', ga.rows, idsGuard(project, 'ga4')); }
    catch (err) { throw asDbError(err); }
  })() : null;

  const idxTask = hasGsc ? (async () => {
    const r = await fetchIndexationDetailed(project);
    if (r.data) {
      try { await upsertMetric(project.id, 'indexation', today, r.data, idsGuard(project, 'gsc')); }
      catch (err) { throw asDbError(err); }
    }
    return r;
  })() : null;

  const [g, a, x] = await Promise.allSettled([gscTask, ga4Task, idxTask]);

  if (hasGsc) {
    sources.gsc = g.status === 'fulfilled'
      ? { status: 'ok', at, synced: g.value, range, error: null }
      : fail(sourceError('gsc', g.reason));
  }
  if (hasGa4) {
    sources.ga4 = a.status === 'fulfilled'
      ? { status: 'ok', at, synced: a.value, range, error: null }
      : fail(sourceError('ga4', a.reason));
  }
  if (hasGsc) {
    if (x.status === 'rejected') {
      sources.indexation = fail(sourceError('indexation', x.reason));
    } else {
      const { data, reason } = x.value;
      const e = reason ? explainCode(reason.code, reason.detail) : null;
      if (data) sources.indexation = { status: reason ? 'empty' : 'ok', at, synced: 1, range: null, error: e };
      else sources.indexation = { status: reason && reason.code === 'no_sitemaps' ? 'empty' : 'error', at, synced: 0, range: null, error: e || explainCode('index_empty') };
    }
  }

  const status = overallStatus(sources);
  return finish(project, { trigger, at, status, sources, topError: null });
}

async function finish(project, { trigger, at, status, sources, topError }) {
  const state = mergeSyncState(project.sync_state, { trigger, at, status, sources });
  // Error general (sin identificadores, Google sin configurar): se guarda
  // aparte porque no es de una fuente concreta.
  state.error = topError || null;
  let persisted = false;
  try { persisted = (await saveSyncState(project.id, state)).persisted; }
  catch (err) { console.error('[seo] no se pudo guardar el estado de la sincronización:', err && err.message); }
  const flat = (k) => ({ synced: sources[k].synced || 0, error: sources[k].error && sources[k].status === 'error' ? sources[k].error.title : null });
  const firstErr = topError || ['gsc', 'ga4'].map((k) => sources[k].error).find(Boolean) || null;
  return {
    project_id: String(project.id),
    name: project.name,
    ok: status === 'ok',
    status,
    error: status === 'ok' ? null : (firstErr ? firstErr.title : null),
    error_detail: status === 'ok' ? null : firstErr,
    gsc: flat('gsc'),
    ga4: flat('ga4'),
    indexation: flat('indexation'),
    sources,
    sync_state: state,
    persisted,
  };
}

/**
 * Sincroniza los proyectos activos por lotes (SEO-04, SEO-15): `concurrency`
 * a la vez, primero los que llevan más tiempo sin intentarse, y no empieza
 * uno nuevo pasado `budgetMs` (para no cortar a medias por maxDuration).
 * Devuelve { results, skipped: [{ project_id, name }] }.
 */
// Instante del último intento en ms (los nunca intentados, primero).
function attemptMs(p) {
  const t = p && p.last_attempt_at ? new Date(p.last_attempt_at).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

export async function syncActiveProjects({ days = DEFAULT_DAYS, trigger = 'manual', concurrency = 3, budgetMs = 240000 } = {}) {
  const started = Date.now();
  const all = await listSeoProjects();
  const queue = all
    .filter((p) => p.active)
    .sort((x, y) => attemptMs(x) - attemptMs(y));
  const results = [];
  const skipped = [];
  let i = 0;
  async function worker() {
    while (i < queue.length) {
      const p = queue[i++];
      if (Date.now() - started > budgetMs) { skipped.push({ project_id: String(p.id), name: p.name }); continue; }
      results.push(await syncProject(p, days, { trigger }));
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, queue.length || 1)) }, worker));
  return { results, skipped };
}

// Compatibilidad: todos los activos, devuelve solo los resultados.
export async function syncAll(days = DEFAULT_DAYS, opts = {}) {
  const { results } = await syncActiveProjects({ days, ...opts });
  return results;
}
