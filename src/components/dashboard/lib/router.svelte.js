// ─────────────────────────────────────────────────────────────
// Enrutado por hash del panel. El panel es una sola página estática
// (/dashboard) con una isla Svelte, así que la vista vive en el hash:
//   #/inicio · #/leads · #/leads/<ref> · #/clientes · #/clientes/<id>
//   #/briefs · #/briefs/<MRC> · #/finanzas · #/finanzas/facturas/<INV>
//   #/progreso · #/progreso/<PRJ> · #/seo · #/seo/<id> · #/avisos
// y los filtros en la query del hash: #/leads?estado=nuevo
// Recargar conserva la vista, Atrás funciona y la navegación son enlaces
// reales (<a href="#/leads">).
//
// Uso desde una sección:
//   import { route, setSub, setQuery } from './lib/router.svelte.js';
//   route.sub      → ['MRC-017']          (segmentos tras la sección)
//   route.query    → { estado: 'nuevo' }   (filtros)
//   setSub(['MRC-017'])                    (abre un detalle; crea historial)
//   setSub([])                             (vuelve a la lista)
//   setQuery({ estado: 'nuevo' })          (cambia filtros; reemplaza historial)
// ─────────────────────────────────────────────────────────────

export const SECTION_IDS = ['inicio', 'leads', 'clientes', 'briefs', 'finanzas', 'progreso', 'seo', 'avisos'];
const DEFAULT_SECTION = 'inicio';
// Nombres de la versión anterior del panel (enlaces guardados).
const ALIASES = { dashboard: 'inicio', notificaciones: 'avisos' };

export const route = $state({ section: DEFAULT_SECTION, sub: [], query: {} });

function safeDecode(s) { try { return decodeURIComponent(s); } catch (_) { return s; } }

export function parseHash(hash) {
  const raw = String(hash || '').replace(/^#\/?/, '');
  const qi = raw.indexOf('?');
  const pathPart = qi >= 0 ? raw.slice(0, qi) : raw;
  const qs = qi >= 0 ? raw.slice(qi + 1) : '';
  const segs = pathPart.split('/').filter(Boolean).map(safeDecode);
  let section = (segs[0] || DEFAULT_SECTION).toLowerCase();
  section = ALIASES[section] || section;
  const known = SECTION_IDS.includes(section);
  const query = {};
  for (const [k, v] of new URLSearchParams(qs)) query[k] = v;
  return {
    section: known ? section : DEFAULT_SECTION,
    sub: known ? segs.slice(1) : [],
    query: known ? query : {},
  };
}

/** Construye el href de una vista: href('briefs', ['MRC-017'], { estado: 'pendiente' }). */
export function href(section = DEFAULT_SECTION, sub = [], query = {}) {
  const path = [section, ...(sub || [])].filter((s) => s !== '' && s != null).map((s) => encodeURIComponent(String(s))).join('/');
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== '' && v != null && v !== false) p.set(k, String(v));
  }
  const qs = p.toString();
  return '#/' + path + (qs ? '?' + qs : '');
}

function sync() {
  const r = parseHash(window.location.hash);
  route.section = r.section;
  route.sub = r.sub;
  route.query = r.query;
}

/** Navega a una vista. replace=true no crea entrada en el historial. */
export function navigate(section, sub = [], query = {}, { replace = false } = {}) {
  const h = href(section, sub, query);
  if (h === window.location.hash) return;
  if (replace) {
    history.replaceState(history.state, '', window.location.pathname + window.location.search + h);
    sync();
  } else {
    window.location.hash = h;   // dispara hashchange → sync()
  }
}

/** Cambia la sub-ruta de la sección actual (abrir/cerrar un detalle). */
export function setSub(sub = [], { replace = false, keepQuery = true } = {}) {
  navigate(route.section, Array.isArray(sub) ? sub : [sub], keepQuery ? route.query : {}, { replace });
}

/** Mezcla filtros en la query de la sección actual (vacío = se quita). */
export function setQuery(patch = {}, { replace = true } = {}) {
  const q = { ...route.query, ...patch };
  for (const k of Object.keys(q)) if (q[k] === '' || q[k] == null) delete q[k];
  navigate(route.section, route.sub, q, { replace });
}

/** Arranca el enrutado (lo llama la carcasa una vez). Devuelve la limpieza. */
export function startRouter() {
  const r = parseHash(window.location.hash);
  // Hash vacío o desconocido → se normaliza sin ensuciar el historial.
  const canonical = href(r.section, r.sub, r.query);
  if (window.location.hash !== canonical) {
    history.replaceState(history.state, '', window.location.pathname + window.location.search + canonical);
  }
  sync();
  window.addEventListener('hashchange', sync);
  return () => window.removeEventListener('hashchange', sync);
}
