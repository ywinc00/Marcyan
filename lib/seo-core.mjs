// ════════════════════════════════════════════════════════════════
//  lib/seo-core.mjs — Lógica PURA de la sección SEO (sin red ni BD)
//  La usan el servidor (lib/seo.mjs, api/admin/seo/*, api/cron/seo-sync) y
//  el panel (SeoSection.svelte y src/components/dashboard/seo/*), así que no
//  importa nada de Node ni del navegador. Lo prueba `npm run test:seo`.
//
//    · Identificadores de Google: validación y normalización (SEO-16).
//    · Errores de Google → explicación en español con qué hacer (SEO-02).
//    · Estado de sincronización por fuente (SEO-03, SEO-07).
//    · Ventanas de fechas honestas y comparación con el período previo de
//      verdad, posición media ponderada por impresiones (SEO-10, 13, 19).
//    · Serie diaria con todos los días del rango y los días que Google aún
//      no publica marcados (SEO-10).
//    · Lectura del diagnóstico de acceso por proyecto (SEO-01).
// ════════════════════════════════════════════════════════════════

// Fuentes que guarda seo_metrics (la migración 014 las fija con un CHECK).
export const METRIC_SOURCES = ['gsc', 'ga4', 'indexation', 'gsc_queries'];
// Fuentes que tienen estado de sincronización propio.
export const SYNC_SOURCES = ['gsc', 'ga4', 'indexation'];
// Rangos que ofrece la interfaz (días).
export const RANGE_OPTIONS = [7, 28, 90];
export const DEFAULT_DAYS = 28;
// El cron trae lo necesario para el rango mayor y su período previo.
export const CRON_DAYS = 90;

// ── Fechas 'YYYY-MM-DD' (aritmética de calendario en UTC puro) ─────
const DAY_MS = 86400000;
const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** 'YYYY-MM-DD' de un valor DATE ('2026-10-19T00:00:00.000Z', Date o texto). '' si no vale. */
export function ymd(v) {
  if (!v) return '';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  const m = YMD_RE.exec(String(v));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}
function toUtc(d) { const m = YMD_RE.exec(d); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; }
function fromUtc(t) { return new Date(t).toISOString().slice(0, 10); }
export function addDays(d, n) { const t = toUtc(ymd(d)); return Number.isNaN(t) ? '' : fromUtc(t + n * DAY_MS); }
/** Días de a a b, ambos incluidos (b ≥ a). */
export function spanDays(a, b) { return Math.round((toUtc(ymd(b)) - toUtc(ymd(a))) / DAY_MS) + 1; }
/** Lista de días [a, b]. */
export function eachDay(a, b) {
  const out = [];
  const s = toUtc(ymd(a)), e = toUtc(ymd(b));
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return out;
  for (let t = s; t <= e; t += DAY_MS) out.push(fromUtc(t));
  return out;
}

export function clampDays(v, def = DEFAULT_DAYS) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, 1), 365);
}

/** Días que hay que pedir a Google para ver `days` y su período previo
 *  (más 4 de margen por el retraso de Search Console). */
export function lookbackDays(days) { return clampDays(days) * 2 + 4; }

// ── Identificadores de Google (SEO-16) ────────────────────────────
// Devuelven { ok, value, error }. value = '' (vacío permitido) o el valor
// normalizado que se guarda. error = texto en español para el campo.

/** ID de propiedad de GA4: solo dígitos. Acepta 'properties/123…'. */
export function normalizeGa4PropertyId(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: true, value: '' };
  if (/^G-[A-Z0-9]+$/i.test(raw)) {
    return { ok: false, value: raw, error: 'Ese es el ID de medición (empieza por G-). Hace falta el ID de propiedad, un número que está en Analytics, Administrar, Detalles de la propiedad.' };
  }
  if (/^UA-/i.test(raw)) {
    return { ok: false, value: raw, error: 'Ese ID es de Universal Analytics, que ya no existe. Usa el ID de propiedad de GA4 (solo números).' };
  }
  const v = raw.replace(/^properties\//i, '').replace(/\s+/g, '');
  if (!/^\d{5,15}$/.test(v)) {
    return { ok: false, value: raw, error: 'El ID de propiedad son solo números (por ejemplo 412345678).' };
  }
  return { ok: true, value: v };
}

const HOST_RE = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?:\.(?!-)[a-z0-9-]{1,63})+$/i;

/** Propiedad de Search Console: 'sc-domain:dominio.com' o 'https://…/' (con barra final). */
export function normalizeGscSiteUrl(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: true, value: '' };
  const dm = /^sc-domain:\s*(.+)$/i.exec(raw);
  if (dm) {
    const host = dm[1].trim().replace(/^https?:\/\//i, '').replace(/[/?#].*$/, '').toLowerCase();
    if (!HOST_RE.test(host)) return { ok: false, value: raw, error: 'Después de sc-domain: va solo el dominio, por ejemplo sc-domain:tudominio.com.' };
    return { ok: true, value: 'sc-domain:' + host };
  }
  if (/^https?:\/\//i.test(raw)) {
    let u;
    try { u = new URL(raw); } catch (_) { u = null; }
    if (!u || !HOST_RE.test(u.hostname)) {
      return { ok: false, value: raw, error: 'Esa dirección no es válida. Ejemplo: https://www.tudominio.com/' };
    }
    if (u.search || u.hash) return { ok: false, value: raw, error: 'La propiedad de prefijo no lleva parámetros (? o #). Ejemplo: https://www.tudominio.com/' };
    let path = u.pathname || '/';
    if (!path.endsWith('/')) path += '/';
    return { ok: true, value: `${u.protocol}//${u.hostname.toLowerCase()}${u.port ? ':' + u.port : ''}${path}` };
  }
  const bare = raw.replace(/\/+$/, '').toLowerCase();
  if (HOST_RE.test(bare)) {
    return { ok: false, value: raw, error: `Escríbela tal como aparece en Search Console: sc-domain:${bare} (propiedad de dominio) o https://${bare}/ (prefijo).` };
  }
  return { ok: false, value: raw, error: 'Escribe la propiedad tal como aparece en Search Console: sc-domain:tudominio.com o https://www.tudominio.com/' };
}

/** Dominio para mostrar: sin esquema, ruta ni barra final. */
export function normalizeDomain(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: true, value: '' };
  const host = raw.replace(/^sc-domain:/i, '').replace(/^https?:\/\//i, '').replace(/[/?#].*$/, '').toLowerCase();
  if (!HOST_RE.test(host)) return { ok: false, value: raw, error: 'Escribe solo el dominio, por ejemplo tudominio.com.' };
  return { ok: true, value: host };
}

/** Dominio "desnudo" para comparar propiedades equivalentes. */
export function bareDomain(s) {
  return String(s || '')
    .replace(/^sc-domain:/i, '')
    .replace(/^https?:\/\//i, '')
    .replace(/[/?#:].*$/, '')
    .replace(/^www\./i, '')
    .toLowerCase();
}

/**
 * Valida los campos de un proyecto (alta o edición parcial).
 * @returns {{ ok, values, errors }} values con lo normalizado SOLO de las claves presentes.
 */
export function validateProjectFields(body = {}, { partial = false } = {}) {
  const values = {};
  const errors = {};
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  if (!partial || has('name')) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) errors.name = 'El nombre del proyecto es obligatorio.';
    else if (name.length > 120) errors.name = 'El nombre es demasiado largo (máximo 120 caracteres).';
    else values.name = name;
  }
  if (has('client_name')) {
    const c = body.client_name == null ? '' : String(body.client_name).trim();
    if (c.length > 120) errors.client_name = 'El nombre del cliente es demasiado largo.';
    else values.client_name = c;
  }
  const checks = [
    ['ga4_property_id', normalizeGa4PropertyId],
    ['gsc_site_url', normalizeGscSiteUrl],
    ['domain', normalizeDomain],
  ];
  for (const [k, fn] of checks) {
    if (!has(k)) continue;
    const r = fn(body[k]);
    if (r.ok) values[k] = r.value; else errors[k] = r.error;
  }
  if (has('active')) values.active = Boolean(body.active);
  return { ok: Object.keys(errors).length === 0, values, errors };
}

// ── Errores de Google en español (SEO-02) ─────────────────────────
// Cada error se guarda como { code, title, action, detail }:
//   title  = qué pasa, en llano; action = qué hacer; detail = texto técnico
//   original (solo para "Detalles técnicos", nunca como mensaje principal).
const ERR = {
  not_configured: {
    title: 'El acceso a Google no está configurado en el servidor',
    action: 'Falta activar el acceso sin clave de Vercel a Google. Pídeselo a quien administra el proyecto en Vercel.',
  },
  auth_failed: {
    title: 'El servidor no pudo entrar en Google',
    action: 'Revisa en Google Cloud la federación de identidad de Vercel y que la cuenta de servicio pueda crear tokens.',
  },
  no_ids: {
    title: 'Este proyecto no tiene Analytics ni Search Console',
    action: 'Edita el proyecto y añade el ID de propiedad de Analytics o la propiedad de Search Console.',
  },
  gsc_forbidden: {
    title: 'La cuenta de servicio no tiene permiso en esta propiedad de Search Console',
    action: 'Añade el correo de la cuenta de servicio como usuario en Search Console, o usa la propiedad exacta a la que tiene acceso (dominio o prefijo). En Estado de Google ves cuáles puede leer.',
  },
  gsc_not_found: {
    title: 'Search Console no reconoce esa propiedad',
    action: 'Escríbela tal como aparece en Search Console: sc-domain:tudominio.com o https://www.tudominio.com/',
  },
  ga4_forbidden: {
    title: 'La cuenta de servicio no tiene acceso a esta propiedad de Analytics',
    action: 'En Analytics, Administrar, Acceso a la propiedad, añade el correo de la cuenta de servicio como Lector.',
  },
  ga4_bad_id: {
    title: 'Analytics no reconoce ese ID de propiedad',
    action: 'Usa el ID de propiedad (solo números), no el ID de medición que empieza por G-.',
  },
  quota: {
    title: 'Google limitó las consultas por ahora',
    action: 'Se volverá a intentar en la próxima sincronización. Si se repite, espera unas horas.',
  },
  unavailable: {
    title: 'Google no respondió a tiempo',
    action: 'Vuelve a intentarlo en unos minutos.',
  },
  no_sitemaps: {
    title: 'No hay sitemaps enviados en Search Console',
    action: 'Envía el sitemap del sitio en Search Console, Sitemaps. Mientras tanto solo se revisa la página de inicio.',
  },
  index_forbidden: {
    title: 'Search Console no deja leer los sitemaps de esta propiedad',
    action: 'Revisa que la cuenta de servicio tenga permiso en la propiedad (dominio o prefijo).',
  },
  index_empty: {
    title: 'Search Console no devolvió datos de indexación',
    action: 'Comprueba que la propiedad tiene sitemaps enviados y que la página de inicio responde.',
  },
  db_failed: {
    title: 'Los datos llegaron de Google pero no se pudieron guardar',
    action: 'Vuelve a intentarlo. Si se repite, revisa la base de datos.',
  },
  unknown: {
    title: 'Google devolvió un error',
    action: 'Abre Estado de Google para revisar el acceso de este proyecto.',
  },
};

/** Texto en español para un código (los que no existen caen en 'unknown'). */
export function explainCode(code, detail = '') {
  const e = ERR[code] || ERR.unknown;
  return { code: ERR[code] ? code : 'unknown', title: e.title, action: e.action, detail: detail ? String(detail).slice(0, 500) : '' };
}

/**
 * Clasifica un error de Google de una fuente ('gsc' | 'ga4' | 'indexation').
 * Usa err.code (not_configured, auth_failed), err.status (HTTP) y el texto.
 */
export function classifyGoogleError(source, err) {
  const msg = String((err && (err.message || err)) || '');
  const status = Number(err && err.status) || (Number((/\((\d{3})\)/.exec(msg) || [])[1]) || 0);
  let code = 'unknown';
  if (err && err.code === 'not_configured') code = 'not_configured';
  else if (err && err.code === 'auth_failed') code = 'auth_failed';
  else if (err && err.code === 'db_failed') code = 'db_failed';
  else if (status === 429 || /quota|rate limit/i.test(msg)) code = 'quota';
  else if (status >= 500 || /timeout|timed out|ECONNRESET|fetch failed|network/i.test(msg)) code = 'unavailable';
  else if (source === 'ga4') {
    if (status === 403 || /permission/i.test(msg)) code = 'ga4_forbidden';
    else if (status === 400 || status === 404) code = 'ga4_bad_id';
  } else if (source === 'gsc' || source === 'indexation') {
    if (status === 403 || /permission/i.test(msg)) code = source === 'indexation' ? 'index_forbidden' : 'gsc_forbidden';
    else if (status === 400 || status === 404) code = 'gsc_not_found';
  }
  return explainCode(code, msg);
}

// ── Estado de sincronización por fuente (SEO-03, SEO-07) ──────────
// sync_state (JSONB en seo_projects, migración 014):
//   { trigger, at, status, sources: { gsc|ga4|indexation: {
//       status: 'ok' | 'error' | 'empty' | 'off',   // off = sin identificador
//       at,        // último intento
//       ok_at,     // última vez que fue bien (se conserva si el intento falla)
//       synced,    // filas guardadas en el último intento
//       range,     // { startDate, endDate } pedido a Google
//       error,     // { code, title, action, detail } si status es error o empty
//   } } }

/** Estado global de un resultado: ok (todas las fuentes configuradas bien),
 *  partial (alguna bien), error (ninguna) o none (nada que sincronizar). */
export function overallStatus(sources) {
  const main = ['gsc', 'ga4'].map((k) => sources && sources[k]).filter((s) => s && s.status !== 'off');
  if (!main.length) return 'error';
  const ok = main.filter((s) => s.status === 'ok').length;
  if (ok === main.length) return 'ok';
  return ok > 0 ? 'partial' : 'error';
}

/** Mezcla el resultado de un intento con el estado anterior (conserva ok_at). */
export function mergeSyncState(prev, attempt) {
  const p = (prev && typeof prev === 'object') ? prev : {};
  const ps = p.sources || {};
  const sources = {};
  for (const k of SYNC_SOURCES) {
    const a = attempt.sources && attempt.sources[k];
    const before = ps[k] || {};
    if (!a) { if (ps[k]) sources[k] = ps[k]; continue; }
    sources[k] = {
      ...a,
      ok_at: a.status === 'ok' || a.status === 'empty' ? a.at : (before.ok_at || null),
    };
  }
  return { trigger: attempt.trigger || 'manual', at: attempt.at, status: attempt.status, sources };
}

/**
 * Lectura del estado de un proyecto para la interfaz (chip y textos).
 * tone: success | warning | error | neutral.
 */
export function projectHealth(project, { configured = true } = {}) {
  const hasGsc = Boolean(project && project.gsc_site_url);
  const hasGa4 = Boolean(project && project.ga4_property_id);
  if (!configured) return { key: 'not_configured', tone: 'warning', label: 'Sin configurar' };
  if (!hasGsc && !hasGa4) return { key: 'no_ids', tone: 'warning', label: 'Faltan identificadores' };
  const st = project && project.sync_state;
  if (st && st.status) {
    if (st.status === 'ok') return { key: 'ok', tone: 'success', label: 'Al día' };
    if (st.status === 'partial') return { key: 'partial', tone: 'warning', label: 'Con fallos' };
    return { key: 'error', tone: 'error', label: 'Falló' };
  }
  if (project && project.last_synced_at) return { key: 'ok_legacy', tone: 'success', label: 'Sincronizado' };
  return { key: 'never', tone: 'neutral', label: 'Sin sincronizar' };
}

/** Indicador global de la cabecera a partir de todos los proyectos activos. */
export function globalHealth(projects = [], { configured = true } = {}) {
  if (!configured) return { tone: 'warning', label: 'Google sin configurar' };
  const act = projects.filter((p) => p.active !== false);
  if (!act.length) return { tone: 'neutral', label: 'Google configurado' };
  const hs = act.map((p) => projectHealth(p, { configured }));
  const bad = hs.filter((h) => h.tone === 'error' || h.key === 'partial').length;
  if (bad) return { tone: 'error', label: `Google: ${bad} con fallos` };
  if (hs.every((h) => h.key === 'never' || h.key === 'no_ids')) return { tone: 'neutral', label: 'Google sin sincronizar' };
  if (hs.some((h) => h.key === 'never' || h.key === 'no_ids')) return { tone: 'warning', label: 'Google: hay pendientes' };
  return { tone: 'success', label: 'Google al día' };
}

// ── Resumen del período y período previo real (SEO-13, SEO-19) ────
function sumBy(rows, f) { let s = 0; for (const r of rows) s += Number(r[f]) || 0; return s; }
function inWin(rows, a, b) { return rows.filter((r) => { const d = ymd(r.date); return d >= a && d <= b; }); }

function gscTotals(rows) {
  const clicks = sumBy(rows, 'clicks');
  const impressions = sumBy(rows, 'impressions');
  let wsum = 0;
  for (const r of rows) wsum += (Number(r.position) || 0) * (Number(r.impressions) || 0);
  return {
    clicks, impressions,
    ctr: impressions > 0 ? clicks / impressions : null,
    // Posición media ponderada por impresiones (como la calcula Search Console).
    position: impressions > 0 ? wsum / impressions : null,
    days_with_data: rows.length,
  };
}
function ga4Totals(rows) {
  const kev = rows.some((r) => r.keyEvents != null || r.conversions != null);
  return {
    sessions: sumBy(rows, 'sessions'),
    users: sumBy(rows, 'totalUsers'),
    key_events: kev ? rows.reduce((s, r) => s + (Number(r.keyEvents ?? r.conversions) || 0), 0) : null,
    days_with_data: rows.length,
  };
}

/** ¿El rango pedido a Google en la última sync cubre [a, b]? (null = no se sabe). */
function coveredBy(range, a) {
  if (!range || !range.startDate) return null;
  return ymd(range.startDate) <= a;
}

/**
 * Ventanas y totales de Search Console.
 *   rows: filas diarias {date, clicks, impressions, ctr, position}
 *   days: tamaño del rango; synced: rango que se pidió a Google en la última sync
 * Search Console publica con 2 o 3 días de retraso: la ventana termina en el
 * último día con datos (through), no en hoy, para no comparar días vacíos.
 */
export function summarizeGsc(rows = [], { days = DEFAULT_DAYS, today, synced = null } = {}) {
  const daily = rows.filter((r) => r && r.date && r.clicks != null && r.kind !== 'top_queries');
  if (!daily.length) return null;
  const through = daily.map((r) => ymd(r.date)).sort().pop();
  const curStart = addDays(through, -(days - 1));
  const prevEnd = addDays(curStart, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  const earliest = daily.map((r) => ymd(r.date)).sort()[0];
  const current = { start: curStart, end: through, ...gscTotals(inWin(daily, curStart, through)) };
  // Hay período previo solo si se pidió a Google (o hay filas desde) su inicio.
  const cov = coveredBy(synced, prevStart);
  const prevOk = cov === null ? earliest <= addDays(prevStart, 3) : cov;
  const prevRows = inWin(daily, prevStart, prevEnd);
  const previous = prevOk && prevRows.length ? { start: prevStart, end: prevEnd, ...gscTotals(prevRows) } : null;
  const lag = today ? Math.max(0, spanDays(through, today) - 1) : null;
  return { through, lag_days: lag, current, previous };
}

/**
 * Ventanas y totales de GA4. Hoy está a medias: la ventana termina ayer
 * (hora de Houston, `today` la da el servidor).
 */
export function summarizeGa4(rows = [], { days = DEFAULT_DAYS, today, synced = null } = {}) {
  const daily = rows.filter((r) => r && r.date);
  if (!daily.length || !today) return null;
  const end = addDays(today, -1);
  const curStart = addDays(end, -(days - 1));
  const prevEnd = addDays(curStart, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  const earliest = daily.map((r) => ymd(r.date)).sort()[0];
  const current = { start: curStart, end, ...ga4Totals(inWin(daily, curStart, end)) };
  const cov = coveredBy(synced, prevStart);
  const prevOk = cov === null ? earliest <= addDays(prevStart, 3) : cov;
  const prevRows = inWin(daily, prevStart, prevEnd);
  const previous = prevOk && prevRows.length ? { start: prevStart, end: prevEnd, ...ga4Totals(prevRows) } : null;
  return { through: end, current, previous };
}

/**
 * Variación entre dos valores. lowerIsBetter para la posición media.
 * Devuelve null si no hay base (previo 0 o ausente).
 *   { pct: 12.5, dir: 'up' | 'down' | 'flat', better: boolean, txt: '+12,5 %' }
 */
export function delta(cur, prev, { lowerIsBetter = false } = {}) {
  if (cur == null || prev == null) return null;
  const c = Number(cur), p = Number(prev);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p <= 0) return null;
  const pct = Math.round(((c - p) / p) * 1000) / 10;
  if (Math.abs(pct) < 0.5) return { pct: 0, dir: 'flat', better: true, txt: 'sin cambios' };
  const dir = pct > 0 ? 'up' : 'down';
  const better = lowerIsBetter ? pct < 0 : pct > 0;
  const n = Math.abs(pct).toLocaleString('es-US', { maximumFractionDigits: 1 });
  return { pct, dir, better, txt: (pct > 0 ? '+' : '−') + n + ' %' };
}

// ── Serie diaria para los gráficos (SEO-10) ───────────────────────
/**
 * Todos los días de [start, end]. Los días hasta `through` sin fila valen 0
 * (Search Console no devuelve días sin impresiones); los posteriores son
 * `pending` (Google aún no los publica) con v = null: hueco visible.
 */
export function buildSeries(rows = [], field, start, end, through) {
  const map = new Map();
  for (const r of rows) { const d = ymd(r.date); if (d) map.set(d, Number(r[field]) || 0); }
  return eachDay(start, end).map((d) => {
    const pending = Boolean(through) && d > through;
    return { date: d, v: pending ? null : (map.has(d) ? map.get(d) : 0), pending, missing: !pending && !map.has(d) };
  });
}

/** Escala "bonita" del eje Y: máximo redondeado y 3 marcas (0, mitad, máximo). */
export function niceScale(maxValue) {
  const m = Math.max(0, Number(maxValue) || 0);
  if (m <= 0) return { max: 4, ticks: [0, 2, 4] };
  const raw = m / 2;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const steps = [1, 2, 2.5, 5, 10];
  let step = mag;
  for (const s of steps) { if (s * mag >= raw) { step = s * mag; break; } }
  if (step < 1) step = 1;
  step = Math.ceil(step);
  return { max: step * 2, ticks: [0, step, step * 2] };
}

// ── Diagnóstico de acceso por proyecto (SEO-01) ───────────────────
/**
 * Convierte la entrada del diagnóstico de un proyecto en hallazgos legibles.
 *   entry: { gsc_site_url, ga4_property_id, gsc_exact_match, gsc_same_domain_accessible,
 *            gsc_probe, ga4_exact_match, ga4_probe }
 *   ctx:   { gscListed: boolean, ga4Listed: boolean }  (si se pudo enumerar)
 * Devuelve [{ source, level: 'ok'|'warn'|'error'|'off', title, action, suggestion? }]
 */
export function explainDiagProject(entry = {}, ctx = {}) {
  const out = [];
  // Search Console
  if (!entry.gsc_site_url) {
    out.push({ source: 'gsc', level: 'off', title: 'Search Console sin configurar', action: 'Edita el proyecto y añade su propiedad de Search Console.' });
  } else {
    const probeOk = entry.gsc_probe && entry.gsc_probe.ok;
    const same = Array.isArray(entry.gsc_same_domain_accessible) ? entry.gsc_same_domain_accessible : [];
    const alt = same.find((s) => s && s.siteUrl && s.siteUrl !== entry.gsc_site_url);
    if (probeOk) {
      out.push({ source: 'gsc', level: 'ok', title: 'Search Console responde', action: '' });
    } else if (entry.gsc_exact_match === false && alt) {
      out.push({
        source: 'gsc', level: 'error',
        title: 'La propiedad guardada no es la que la cuenta de servicio puede leer',
        action: `La cuenta de servicio sí tiene acceso a ${alt.siteUrl}. Usa esa propiedad.`,
        suggestion: { gsc_site_url: alt.siteUrl },
      });
    } else if (entry.gsc_exact_match === false && ctx.gscListed) {
      out.push({ source: 'gsc', level: 'error', title: 'La cuenta de servicio no tiene acceso a esta propiedad', action: 'Añade su correo como usuario en Search Console (Configuración, Usuarios y permisos).' });
    } else {
      const ex = classifyGoogleError('gsc', { status: entry.gsc_probe && entry.gsc_probe.status, message: entry.gsc_probe && entry.gsc_probe.error });
      out.push({ source: 'gsc', level: 'error', title: ex.title, action: ex.action });
    }
  }
  // Analytics
  if (!entry.ga4_property_id) {
    out.push({ source: 'ga4', level: 'off', title: 'Analytics sin configurar', action: 'Edita el proyecto y añade el ID de propiedad de Analytics.' });
  } else if (entry.ga4_probe && entry.ga4_probe.ok) {
    out.push({ source: 'ga4', level: 'ok', title: 'Analytics responde', action: '' });
  } else if (entry.ga4_exact_match === false && ctx.ga4Listed) {
    out.push({ source: 'ga4', level: 'error', title: 'La cuenta de servicio no ve esta propiedad de Analytics', action: 'Comprueba que el número es el ID de propiedad y añade el correo de la cuenta de servicio como Lector en Acceso a la propiedad.' });
  } else {
    const ex = classifyGoogleError('ga4', { status: entry.ga4_probe && entry.ga4_probe.status, message: entry.ga4_probe && entry.ga4_probe.error });
    out.push({ source: 'ga4', level: 'error', title: ex.title, action: ex.action });
  }
  return out;
}
