// ════════════════════════════════════════════════════════════════
//  lib/diagnostic-measure.mjs — Capa de MEDICIÓN del diagnóstico nuevo (fase 1)
//  ────────────────────────────────────────────────────────────────
//  Por qué existe: el motor v2 (diagnostic-checks.mjs) solo lee el HTML crudo
//  de la portada y suma puntos fijos. Se equivoca con webs hechas con
//  JavaScript, no mide velocidad y no ve la ficha de Google.
//
//  Aquí solo se MIDE (sin IA). Dos fuentes de Google, con la clave del servidor
//  GOOGLE_PLACES_API_KEY (la misma tiene permitida PageSpeed Insights):
//   1. PageSpeed Insights (móvil): Google abre la web con un navegador real, así
//      que también ve las webs hechas con JavaScript. Da velocidad de laboratorio,
//      usuarios reales si hay datos, y las comprobaciones de SEO de Lighthouse.
//   2. Places API (New), búsqueda de texto: la ficha de Google del negocio
//      (nota, nº de reseñas, categoría, web, teléfono, horario, estado).
//
//  Regla: sin medición no hay hallazgo. Cada función devuelve { ok, ... } y,
//  si una fuente falla, { ok:false, motivo } para que el juicio diga
//  "no se pudo medir" en vez de inventar.
//
//  Puro salvo `fetch` (inyectable): se prueba en scripts/test-diagnostic-measure.mjs.
// ════════════════════════════════════════════════════════════════

const PSI_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';

// Campos de la ficha. Cada campo define el precio de la consulta en Google
// (rating/userRatingCount/horario = tarifa "Enterprise"): no añadir sin mirar el coste.
export const PLACES_FIELDS = [
  'places.id', 'places.displayName', 'places.rating', 'places.userRatingCount',
  'places.primaryTypeDisplayName', 'places.websiteUri', 'places.nationalPhoneNumber',
  'places.businessStatus', 'places.googleMapsUri', 'places.regularOpeningHours.weekdayDescriptions',
].join(',');

// Auditorías de Lighthouse que usamos (todas existen en la versión actual de PSI).
const SEO_AUDITS = ['document-title', 'meta-description', 'viewport', 'image-alt', 'is-crawlable', 'http-status-code', 'link-text', 'canonical', 'hreflang'];

async function fetchJson(fetchImpl, url, init, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { ...init, signal: ctrl.signal });
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  } catch (err) {
    return { status: 0, body: null, error: err && err.name === 'AbortError' ? 'tiempo' : 'red' };
  } finally {
    clearTimeout(t);
  }
}

const round = (v, d = 0) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
const score100 = (s) => (Number.isFinite(s) ? Math.round(s * 100) : null);

/** Normaliza una URL pública (añade https, sin credenciales, solo http/https). */
export function normalizeSiteUrl(raw) {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s || s.length > 300) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return null;
    if (!/\./.test(u.hostname) || /^(localhost|\d+\.\d+\.\d+\.\d+|\[)/i.test(u.hostname)) return null;
    u.hash = '';
    return u.toString();
  } catch { return null; }
}

/** Dominio base para comparar la web de la ficha con la web del cliente. */
export function baseDomain(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; }
}

/**
 * Convierte la respuesta de PageSpeed Insights en mediciones simples.
 * Separada del fetch para probarla con respuestas guardadas.
 */
export function parsePsi(body) {
  const lh = body && body.lighthouseResult;
  if (!lh || !lh.categories) return { ok: false, motivo: 'respuesta-incompleta' };
  const a = lh.audits || {};
  const num = (id) => (a[id] && Number.isFinite(a[id].numericValue) ? a[id].numericValue : null);
  const seo = {};
  for (const id of SEO_AUDITS) {
    if (a[id] && a[id].score !== null && a[id].score !== undefined) seo[id] = a[id].score >= 0.9;
  }
  // Usuarios reales (CrUX) de esa página; si no hay, de todo el dominio.
  const field = (body.loadingExperience && body.loadingExperience.metrics) ? body.loadingExperience
    : (body.originLoadingExperience && body.originLoadingExperience.metrics) ? body.originLoadingExperience : null;
  let usuariosReales = null;
  if (field) {
    const m = field.metrics;
    const p = (k) => (m[k] && Number.isFinite(m[k].percentile) ? m[k].percentile : null);
    usuariosReales = {
      ambito: field === body.loadingExperience ? 'pagina' : 'dominio',
      lcp_s: round(p('LARGEST_CONTENTFUL_PAINT_MS') / 1000, 1),
      inp_ms: p('INTERACTION_TO_NEXT_PAINT'),
      cls: p('CUMULATIVE_LAYOUT_SHIFT_SCORE') !== null ? round(p('CUMULATIVE_LAYOUT_SHIFT_SCORE') / 100, 2) : null,
      veredicto: field.overall_category || null, // FAST | AVERAGE | SLOW
    };
  }
  return {
    ok: true,
    url_final: lh.finalDisplayedUrl || lh.finalUrl || null,
    puntuacion: {
      rendimiento: score100(lh.categories.performance && lh.categories.performance.score),
      seo: score100(lh.categories.seo && lh.categories.seo.score),
      accesibilidad: score100(lh.categories.accessibility && lh.categories.accessibility.score),
      buenas_practicas: score100(lh.categories['best-practices'] && lh.categories['best-practices'].score),
    },
    laboratorio: {
      lcp_s: round(num('largest-contentful-paint') / 1000, 1),
      tbt_ms: round(num('total-blocking-time')),
      cls: round(num('cumulative-layout-shift'), 2),
      peso_kb: round(num('total-byte-weight') / 1024),
    },
    usuarios_reales: usuariosReales,
    seo_tecnico: seo,
  };
}

/** PageSpeed Insights en móvil. Tarda 15-60 s: llamarlo fuera del turno del chat. */
export async function measurePageSpeed(url, { key, fetch: fetchImpl = fetch, timeoutMs = 75000, lang = 'es' } = {}) {
  const site = normalizeSiteUrl(url);
  if (!site) return { ok: false, motivo: 'url-invalida' };
  const q = new URLSearchParams({ url: site, strategy: 'mobile', locale: lang === 'en' ? 'en' : 'es' });
  for (const c of ['performance', 'seo', 'accessibility', 'best-practices']) q.append('category', c);
  if (key) q.set('key', key);
  const r = await fetchJson(fetchImpl, `${PSI_URL}?${q}`, {}, timeoutMs);
  if (r.error) return { ok: false, motivo: r.error };
  if (r.status !== 200) {
    // 400 de PSI = Google no pudo abrir la web (caída, bloqueo, DNS). Es un hallazgo en sí.
    const msg = (r.body && r.body.error && r.body.error.message) || '';
    if (r.status === 400 && /FAILED_DOCUMENT_REQUEST|ERRORED_DOCUMENT_REQUEST|DNS|unreachable/i.test(msg)) return { ok: false, motivo: 'web-no-abre' };
    return { ok: false, motivo: r.status === 429 ? 'cupo' : 'error-' + r.status };
  }
  return parsePsi(r.body);
}

/** Elige la ficha correcta entre los resultados de Places. */
export function pickPlace(places, { siteUrl, name } = {}) {
  if (!Array.isArray(places) || places.length === 0) return null;
  const dom = siteUrl ? baseDomain(normalizeSiteUrl(siteUrl)) : null;
  if (dom) {
    const byWeb = places.find((p) => p.websiteUri && baseDomain(p.websiteUri) === dom);
    if (byWeb) return { place: byWeb, confianza: 'alta' }; // la ficha enlaza la web del cliente
  }
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const n = norm(name);
  const byName = n && places.find((p) => {
    const pn = norm(p.displayName && p.displayName.text);
    return pn && (pn.includes(n) || n.includes(pn));
  });
  if (byName) return { place: byName, confianza: dom ? 'media' : 'alta' };
  return { place: places[0], confianza: 'baja' }; // hay que confirmarlo con el cliente
}

export function parsePlace(p) {
  if (!p) return null;
  return {
    id: p.id || null,
    nombre: (p.displayName && p.displayName.text) || null,
    nota: Number.isFinite(p.rating) ? p.rating : null,
    resenas: Number.isFinite(p.userRatingCount) ? p.userRatingCount : 0,
    categoria: (p.primaryTypeDisplayName && p.primaryTypeDisplayName.text) || null,
    web: p.websiteUri || null,
    tiene_telefono: Boolean(p.nationalPhoneNumber),
    tiene_horario: Boolean(p.regularOpeningHours && p.regularOpeningHours.weekdayDescriptions && p.regularOpeningHours.weekdayDescriptions.length),
    estado: p.businessStatus || null, // OPERATIONAL | CLOSED_TEMPORARILY | CLOSED_PERMANENTLY
    mapa: p.googleMapsUri || null,
  };
}

/** Busca la ficha de Google por nombre y ciudad (coste por consulta: poner tope fuera). */
export async function measurePlace({ name, city, siteUrl, lang = 'es' }, { key, fetch: fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  if (!key) return { ok: false, motivo: 'sin-clave' };
  const textQuery = [name, city].filter((s) => typeof s === 'string' && s.trim()).join(' ').slice(0, 200);
  if (!name || !textQuery) return { ok: false, motivo: 'sin-nombre' };
  const r = await fetchJson(fetchImpl, PLACES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': PLACES_FIELDS },
    // Sin includePureServiceAreaBusinesses, Google omite los negocios sin dirección visible
    // (contratistas, servicios a domicilio, la propia Marcyan): justo nuestro cliente típico.
    body: JSON.stringify({ textQuery, languageCode: lang === 'en' ? 'en' : 'es', regionCode: 'US', pageSize: 5, includePureServiceAreaBusinesses: true }),
  }, timeoutMs);
  if (r.error) return { ok: false, motivo: r.error };
  if (r.status !== 200) return { ok: false, motivo: r.status === 429 ? 'cupo' : 'error-' + r.status };
  const places = (r.body && r.body.places) || [];
  if (places.length === 0) return { ok: true, encontrada: false };
  const pick = pickPlace(places, { siteUrl, name });
  return { ok: true, encontrada: true, confianza: pick.confianza, ficha: parsePlace(pick.place) };
}

/** Mide todo en paralelo. Una fuente caída no tumba a la otra. */
export async function measureBusiness({ url, name, city, lang = 'es' }, { key, fetch: fetchImpl = fetch } = {}) {
  const [web, ficha] = await Promise.all([
    url ? measurePageSpeed(url, { key, fetch: fetchImpl, lang }) : Promise.resolve({ ok: false, motivo: 'sin-web' }),
    measurePlace({ name, city, siteUrl: url, lang }, { key, fetch: fetchImpl }),
  ]);
  return { medido_en: new Date().toISOString(), web, ficha };
}
