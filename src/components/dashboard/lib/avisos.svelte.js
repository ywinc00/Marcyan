// ─────────────────────────────────────────────────────────────
// Contador de avisos sin leer (OP-13): lo pinta la carcasa junto a
// "Avisos" en la barra lateral y en el menú móvil, y lo actualiza la
// sección de Avisos con cada cambio (el servidor devuelve `unread`).
//   · Consulta barata: /api/admin/notifications?countOnly=1
//   · Refresco cada 60 s SOLO con la pestaña visible, y al volver a ella
//     (nada de consultas en segundo plano).
// Las piezas puras (filtros, destino de "Abrir", limpieza de títulos y el
// ciclo de refresco) viven en avisos.js y se reexportan desde aquí.
// ─────────────────────────────────────────────────────────────
import { api, isSessionError } from './api.js';
import { startUnreadPolling as startPolling } from './avisos.js';
export * from './avisos.js';

export const avisos = $state({ unread: null, loadedAt: 0 });

/** Fija el contador con el valor que trae una respuesta del servidor. */
export function setUnread(n) {
  const v = Number(n);
  if (Number.isFinite(v) && v >= 0) { avisos.unread = Math.floor(v); avisos.loadedAt = Date.now(); }
}

let inflight = null;
/** Pide el contador al servidor. Un fallo no borra el último valor bueno. */
export function refreshUnread() {
  if (inflight) return inflight;
  inflight = api('/api/admin/notifications?countOnly=1', { timeout: 10000 })
    .then((j) => { setUnread(j && j.unread); })
    .catch((e) => { if (!isSessionError(e)) console.warn('[avisos] no se pudo actualizar el contador:', e && e.message); })
    .finally(() => { inflight = null; });
  return inflight;
}

/** Arranca el refresco del contador con la pestaña visible (carcasa). */
export function startUnreadPolling(opts = {}) {
  return startPolling({ refresh: refreshUnread, ...opts });
}
