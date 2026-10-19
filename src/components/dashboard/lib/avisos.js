// ─────────────────────────────────────────────────────────────
// Avisos: piezas puras (sin runes ni red) para la sección y la carcasa.
// Las prueba scripts/test-avisos.mjs con node, sin compilar Svelte.
// ─────────────────────────────────────────────────────────────

export const POLL_MS = 60000;

/**
 * Arranca el refresco (lo llama la carcasa al entrar con sesión). Devuelve
 * la función que lo para. `doc`/`win` se inyectan en las pruebas.
 */
export function startUnreadPolling({ doc = document, win = window, refresh, every = POLL_MS } = {}) {
  let timer = null;
  const visible = () => doc.visibilityState === 'visible';
  function schedule() {
    clearTimer();
    if (visible()) timer = win.setTimeout(tick, every);
  }
  function clearTimer() { if (timer) { win.clearTimeout(timer); timer = null; } }
  async function tick() {
    timer = null;
    if (!visible()) return;
    try { await refresh(); }
    catch (e) { console.warn('[avisos] refresco del contador falló:', e && e.message); }
    finally { schedule(); }
  }
  function onVisibility() {
    if (visible()) tick();   // al volver: dato fresco ya y se reanuda el ciclo
    else clearTimer();        // oculta: ninguna consulta en segundo plano
  }
  doc.addEventListener('visibilitychange', onVisibility);
  if (visible()) tick();
  return () => { clearTimer(); doc.removeEventListener('visibilitychange', onVisibility); };
}


/** Texto del contador: 1 a 99, y "99+" por encima. */
export function badgeText(n) {
  const v = Number(n) || 0;
  if (v <= 0) return '';
  return v > 99 ? '99+' : String(v);
}

/** Títulos sin guion largo de conector (los avisos viejos lo traían). */
export function cleanTitle(s) {
  return String(s == null ? '' : s)
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s+-\s+/g, ', ')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ');
}

// ── Filtros de la sección (en la URL: #/avisos?tipo=lead&estado=sin-leer) ──
// Valores legibles en la URL; el servidor recibe sus códigos.
export const TYPE_FILTERS = [
  { id: '',        label: 'Todos',         type: null },
  { id: 'lead',    label: 'Leads',         type: 'new_lead' },
  { id: 'brief',   label: 'Briefs',        type: 'new_brief' },
  { id: 'persona', label: 'Quieren hablar', type: 'chat_handoff' },
  { id: 'sistema', label: 'Sistema',       type: 'system' },
];
export const STATE_FILTERS = [
  { id: '',           label: 'Bandeja' },
  { id: 'sin-leer',   label: 'Sin leer' },
  { id: 'archivados', label: 'Archivados' },
];

/** Lee los filtros de la query del hash (valores desconocidos → por defecto). */
export function readFilters(query = {}) {
  const tipo = TYPE_FILTERS.some((f) => f.id && f.id === query.tipo) ? query.tipo : '';
  const estado = STATE_FILTERS.some((f) => f.id && f.id === query.estado) ? query.estado : '';
  return { tipo, estado };
}

/** Parámetros del GET de la lista para unos filtros (y un cursor opcional). */
export function listParams({ tipo = '', estado = '' } = {}, { limit = 30, before = null } = {}) {
  const p = new URLSearchParams();
  p.set('limit', String(limit));
  const t = TYPE_FILTERS.find((f) => f.id === tipo);
  if (t && t.type) p.set('type', t.type);
  if (estado === 'sin-leer') p.set('unreadOnly', 'true');
  if (estado === 'archivados') p.set('archived', '1');
  if (before != null) p.set('before', String(before));
  return p.toString();
}

/**
 * Destino de "Abrir" a partir del enlace del aviso ('/dashboard#/leads/LEAD-012').
 * Devuelve el hash ('#/leads/LEAD-012') o null si no lleva a ningún registro
 * (sin enlace, la portada a secas o la propia bandeja de avisos).
 */
export function openTarget(link) {
  const s = String(link || '');
  const i = s.indexOf('#');
  if (i < 0) return null;
  const hash = s.slice(i);
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const section = path.split('/')[0].toLowerCase();
  if (!section || section === 'avisos' || section === 'notificaciones') return null;
  return hash.startsWith('#/') ? hash : '#/' + hash.slice(1);
}

/** Referencia legible para enseñar junto al tipo (las claves internas no). */
export function visibleRef(ref) {
  const r = String(ref || '').trim();
  return /^(LEAD|MRC|PRJ|INV)-[A-Za-z0-9-]+$/i.test(r) ? r : '';
}
