// ════════════════════════════════════════════════════════════════
//  lib/brief-filename.mjs — Nombres de archivo seguros (sin dependencias de
//  Node: lo puede importar también el formulario en el navegador para armar
//  el pathname briefs/<draftId>/<kind>/<uid>-<nombre> EXACTO que el servidor acepta).
// ════════════════════════════════════════════════════════════════

// Sin rutas, sin acentos, solo [A-Za-z0-9._-], extensión corta conservada.
export function safeFileName(name) {
  const base = String(name || '').split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, '');
  const ascii = base.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  const dot = ascii.lastIndexOf('.');
  let stem = dot > 0 ? ascii.slice(0, dot) : ascii;
  let ext = dot > 0 ? ascii.slice(dot + 1) : '';
  stem = stem.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^[-_.]+|[-_.]+$/g, '').slice(0, 80);
  ext = ext.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toLowerCase();
  if (!stem) stem = 'archivo';
  return ext ? `${stem}.${ext}` : stem;
}

// Nombre original tal como lo vio el cliente (para el manifiesto), sin
// caracteres de control y acotado.
export function cleanOriginalName(name) {
  const s = String(name || '').split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return s ? s.slice(0, 200) : null;
}

export const draftPrefix = (draftId) => `briefs/${draftId}/`;

// Identificador corto y aleatorio que va delante del nombre: cada subida
// tiene una ruta propia (dos fotos que se llaman igual no chocan) y el
// servidor la reserva una sola vez (un token sirve para UN archivo).
export function uploadUid() {
  const b = new Uint8Array(6);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

// briefs/<draftId>/<kind>/<uid>-<nombre-seguro>. Se pasa por safeFileName al
// final para que el servidor reciba exactamente lo que acepta.
export const buildPathname = (draftId, kind, name, uid = uploadUid()) =>
  `${draftPrefix(draftId)}${kind}/${safeFileName(`${uid}-${safeFileName(name)}`)}`;
