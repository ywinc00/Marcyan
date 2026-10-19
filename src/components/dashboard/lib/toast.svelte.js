// ─────────────────────────────────────────────────────────────
// Avisos breves (toasts) del panel. Una sola cola compartida; la pinta
// ui/Toast.svelte dentro de la carcasa. Sirve para:
//   · confirmar una acción hecha ("Guardado", "Pago registrado");
//   · que NINGÚN error quede mudo: lo que antes era un `catch {}` vacío
//     ahora termina aquí con un texto legible.
// ─────────────────────────────────────────────────────────────
import { untrack } from 'svelte';
import { errorMessage, isSessionError } from './api.js';

export const toasts = $state([]);

// Capas modales abiertas (<dialog> con showModal), de abajo arriba. Un
// diálogo modal deja inerte todo lo que no lleva dentro y queda por encima
// de cualquier z-index: un aviso pintado fuera quedaría tapado y sin poder
// cerrarse. Por eso cada diálogo lleva su propia región (<Toast layer=…>)
// y los avisos se pintan solo en la de la capa de más arriba.
export const layers = $state([]);
export function pushLayer(id) {
  untrack(() => { if (!layers.includes(id)) layers.push(id); });
}
export function popLayer(id) {
  untrack(() => { const i = layers.lastIndexOf(id); if (i >= 0) layers.splice(i, 1); });
}
let seq = 0;
const MAX = 3;

/** Muestra un aviso. tone: 'ok' | 'error' | 'info'. Devuelve su id. */
export function toast(message, { tone = 'ok', timeout = 4000 } = {}) {
  if (!message) return 0;
  const id = ++seq;
  toasts.push({ id, message, tone });
  while (toasts.length > MAX) toasts.shift();
  if (timeout) setTimeout(() => dismissToast(id), timeout);
  return id;
}

export function dismissToast(id) {
  const i = toasts.findIndex((t) => t.id === id);
  if (i >= 0) toasts.splice(i, 1);
}

/**
 * Aviso de error a partir de una excepción. La sesión caducada no se avisa
 * aquí: la carcasa ya vuelve al login con su propio mensaje.
 */
export function toastError(e, fallback) {
  if (isSessionError(e)) return 0;
  return toast(errorMessage(e, fallback), { tone: 'error', timeout: 6500 });
}
