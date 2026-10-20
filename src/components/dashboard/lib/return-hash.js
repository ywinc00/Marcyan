// ─────────────────────────────────────────────────────────────
// Vuelta a la ficha tras iniciar sesión (CT-02).
// Los correos y avisos enlazan a /dashboard#/briefs/MRC-017. Sin sesión se
// pinta el login y el enlace mágico vuelve a /dashboard sin hash (y casi
// siempre en otra pestaña), así que la ficha se perdía. Al pintar el login se
// guarda el hash en localStorage (lo comparten las pestañas del mismo sitio) y,
// al entrar con sesión sin un destino propio, se restaura una sola vez.
// Solo rutas internas #/<seccion>…, con caducidad corta (el enlace mágico dura
// 15 minutos). Sin almacenamiento disponible no hace nada.
// ─────────────────────────────────────────────────────────────

export const RETURN_KEY = 'orbit:volver';
export const RETURN_TTL_MS = 30 * 60 * 1000;
const INTERNAL = /^#\/[a-z][a-z0-9/_.\-%?=&+]*$/i;

// ¿Merece la pena recordar este hash? Solo si lleva a algo más que Inicio.
export function worthRemembering(hash) {
  const h = String(hash || '');
  return INTERNAL.test(h) && h.length <= 300 && !/^#\/(inicio)?\/?$/i.test(h);
}

// Decide a dónde volver. saved = { h, t } guardado; currentHash = el de la
// pestaña que acaba de entrar. Si ya trae su propio destino, manda ese.
export function pickReturn(saved, currentHash, now = Date.now()) {
  if (!saved || typeof saved !== 'object') return null;
  const h = String(saved.h || '');
  const t = Number(saved.t);
  if (!worthRemembering(h) || !Number.isFinite(t) || now - t > RETURN_TTL_MS || t > now + 60000) return null;
  if (worthRemembering(currentHash)) return null;
  return h;
}

export function rememberReturn(hash, storage = globalThis.localStorage) {
  try {
    if (worthRemembering(hash)) storage.setItem(RETURN_KEY, JSON.stringify({ h: String(hash), t: Date.now() }));
  } catch { /* sin almacenamiento: no pasa nada */ }
}

// Lee y borra lo guardado (una sola vez) y devuelve el hash al que volver o null.
export function takeReturn(currentHash, storage = globalThis.localStorage) {
  let saved = null;
  try {
    const raw = storage.getItem(RETURN_KEY);
    storage.removeItem(RETURN_KEY);
    saved = raw ? JSON.parse(raw) : null;
  } catch { return null; }
  return pickReturn(saved, currentHash);
}
