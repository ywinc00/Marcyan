// ════════════════════════════════════════════════════════════════
//  src/components/brief/lib/persist.js — Guardado automático en el navegador
//
//  Reglas (B-04 + "sin datos sensibles de más"):
//   · Las respuestas del brief van a localStorage para poder retomarlo otro
//     día, SALVO los datos de contacto (nombre, correo, teléfono), que solo
//     viven en sessionStorage: se recuperan al recargar la pestaña, pero no
//     se quedan en un equipo compartido.
//   · El borrador de subidas (draftId + secreto) y la lista de archivos ya
//     subidos van a sessionStorage, como pide api/brief/draft.mjs.
//   · Lo guardado caduca a los 7 días y se borra entero al enviar.
//   · Todo acceso a storage va en try/catch: en modo privado o con el
//     almacenamiento bloqueado el formulario funciona igual, sin guardar.
// ════════════════════════════════════════════════════════════════

export const BRIEF_KEY = 'mrc_brief_v2';
export const SESSION_KEY = 'mrc_brief_v2_session';
export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const CONTACT_KEYS = ['owner_name', 'email', 'phone'];

function store(kind) {
  try {
    const s = kind === 'session' ? window.sessionStorage : window.localStorage;
    const probe = '__mrc_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
function read(kind, key) {
  const s = store(kind);
  if (!s) return null;
  try { return JSON.parse(s.getItem(key) || 'null'); } catch { return null; }
}
function write(kind, key, value) {
  const s = store(kind);
  if (!s) return false;
  try { s.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
function remove(kind, key) {
  const s = store(kind);
  if (!s) return;
  try { s.removeItem(key); } catch { /* sin acceso: nada que borrar */ }
}

export const storageAvailable = () => !!store('local');

// Separa los datos: lo de contacto a la sesión, el resto al local.
export function splitForStorage(data) {
  const local = {}, session = {};
  for (const [k, v] of Object.entries(data || {})) {
    (CONTACT_KEYS.includes(k) ? session : local)[k] = v;
  }
  return { local, session };
}

// saveBrief({ data, step, lang, visited, files, draft, carriedFiles })
//   carriedFiles: archivos de otra visita que ya no se pueden enlazar (para
//   seguir avisando "vuelve a subirlos" aunque se guarde de nuevo).
export function saveBrief({ data, step, lang, visited, files = [], draft = null, carriedFiles = 0 }) {
  const { local, session } = splitForStorage(data);
  const doneFiles = files.filter((f) => f.status === 'done');
  const okLocal = write('local', BRIEF_KEY, {
    v: 2, savedAt: Date.now(), lang, step, visited, data: local, filesCount: doneFiles.length + (Number(carriedFiles) || 0),
  });
  write('session', SESSION_KEY, {
    v: 2, data: session, draft,
    files: doneFiles.map((f) => ({
      id: f.id, field: f.field, kind: f.kind, name: f.name, originalName: f.originalName || f.name, size: f.size, pathname: f.pathname,
      contentType: f.contentType, convertedFrom: f.convertedFrom || null, tags: f.tags || {}, removed: !!f.removed,
    })),
  });
  return okLocal;
}

// loadBrief(now?) → { data, step, visited, savedAt, files, draft, filesCount } o null
export function loadBrief(now = Date.now()) {
  const local = read('local', BRIEF_KEY);
  const session = read('session', SESSION_KEY);
  if (local && (local.v !== 2 || !local.savedAt || now - local.savedAt > MAX_AGE_MS)) {
    clearBrief();
    return null;
  }
  if (!local && !session) return null;
  return {
    data: { ...((local && local.data) || {}), ...((session && session.data) || {}) },
    step: local && Number.isInteger(local.step) ? local.step : 0,
    visited: local && Number.isInteger(local.visited) ? local.visited : 0,
    savedAt: local ? local.savedAt : null,
    filesCount: local ? Number(local.filesCount) || 0 : 0,
    files: (session && Array.isArray(session.files)) ? session.files : [],
    draft: (session && session.draft) || null,
  };
}

export function clearBrief() {
  remove('local', BRIEF_KEY);
  remove('session', SESSION_KEY);
}

// ── Kit de arranque: borrador de subidas por enlace (dura días: localStorage).
// La clave usa un resumen del token, nunca el token en claro.
async function tokenKey(token) {
  try {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(token)));
    return 'mrc_kit_' + Array.from(new Uint8Array(d)).slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'mrc_kit_' + String(token).length;
  }
}
export async function loadKitLocal(token) {
  const v = read('local', await tokenKey(token));
  if (!v || !v.draft || (v.draft.expiresAt && Date.parse(v.draft.expiresAt) <= Date.now())) return null;
  return v;
}
export async function saveKitLocal(token, value) {
  return write('local', await tokenKey(token), value);
}
export async function clearKitLocal(token) {
  remove('local', await tokenKey(token));
}
