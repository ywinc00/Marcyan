// ════════════════════════════════════════════════════════════════
//  src/components/brief/lib/kit.js — Lógica pura del Kit de arranque
//  (bloques = secciones del momento 'arranque' de lib/brief-schema.mjs).
//  Lo prueba scripts/test-brief-form.mjs.
// ════════════════════════════════════════════════════════════════
import { sectionsFor, validate, PHOTO_SHOTS } from '../../../../lib/brief-schema.mjs';

// Bloques que se pueden dejar en blanco sin que el kit quede "a medias".
export const OPTIONAL_BLOCKS = new Set(['prueba_social']);
const TOKEN_RE = /^[A-Za-z0-9_-]{16,200}$/;

// Token del enlace: /es/kit/<token> o /en/kit/<token>; en local también ?t=.
export function kitTokenFrom(pathname, search = '') {
  const m = /\/(?:es|en)\/kit\/([^/?#]+)\/?$/.exec(String(pathname || ''));
  let t = m ? decodeURIComponent(m[1]) : '';
  if (!t) {
    try { t = new URLSearchParams(search).get('t') || ''; } catch { t = ''; }
  }
  return TOKEN_RE.test(t) ? t : '';
}

// Bloques visibles para estos servicios (y que el servidor anunció).
export function kitBlocks(services, allowedKeys) {
  const list = sectionsFor('arranque', Array.isArray(services) && services.length ? services : null);
  const allow = Array.isArray(allowedKeys) && allowedKeys.length ? new Set(allowedKeys) : null;
  return list.filter((s) => !allow || allow.has(s.key));
}

export function isFilled(fd, v) {
  if (v === null || v === undefined) return false;
  switch (fd.type) {
    case 'checkbox': return fd.options ? Array.isArray(v) && v.length > 0 : v === true;
    case 'repeater': case 'zones': case 'services':
      return Array.isArray(v) && v.some((row) => row && (typeof row !== 'object' || Object.values(row).some((x) => x !== null && x !== '' && x !== false && !(Array.isArray(x) && !x.length))));
    case 'hours':
      return typeof v === 'object' && ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].some((d) => v[d] && (v[d].closed || v[d].open || v[d].close));
    default:
      return String(v).trim() !== '';
  }
}

// Tomas con al menos una foto (subida guiada).
export function shotsDone(files, field = 'kit_photo_files') {
  const have = new Set(files.filter((f) => !f.removed && f.status === 'done' && (f.field === field || (f.tags && f.tags.field === field))).map((f) => (f.tags && f.tags.shot) || 'other'));
  return PHOTO_SHOTS.filter((s) => s.value !== 'other' && have.has(s.value)).length;
}
export const SHOTS_TOTAL = PHOTO_SHOTS.filter((s) => s.value !== 'other').length;

// blockStatus(sección, datos, archivos, guardados:Set) →
//   { status: 'done'|'partial'|'pending'|'optional', filled, total }
export function blockStatus(section, data, files = [], saved = new Set()) {
  const fields = section.fields;
  let filled = 0, missingRequired = false;
  for (const fd of fields) {
    const has = fd.type === 'file'
      ? files.some((f) => !f.removed && f.status === 'done' && (f.field === fd.key || (f.tags && f.tags.field === fd.key)))
      : isFilled(fd, data[fd.key]);
    if (has) filled++;
    else if (fd.required) missingRequired = true;
  }
  const total = fields.length;
  if (!filled) return { status: OPTIONAL_BLOCKS.has(section.key) ? 'optional' : 'pending', filled, total };
  if (missingRequired) return { status: 'partial', filled, total };
  const done = filled === total || saved.has(section.key) || filled / total >= 0.6;
  return { status: done ? 'done' : 'partial', filled, total };
}

// Errores del kit que caen en un bloque.
export function errorsForBlock(section, errors) {
  const keys = new Set(section.fields.map((f) => f.key));
  const out = {};
  for (const [p, m] of Object.entries(errors || {})) if (keys.has(p.split('.')[0])) out[p] = m;
  return out;
}

// Validación del kit como la del servidor (parcial al guardar, completa al enviar).
export const validateKit = (data, services, partial) =>
  validate('arranque', data, { services: services && services.length ? services : null, optionMode: 'keep', partial });

// Quita lo que la interfaz crea vacío (filas en blanco, días sin hora) para
// no guardar "Lun ? a ?" en el kit.
export function cleanForSend(fd, v) {
  if (fd.type === 'hours') {
    if (!v || typeof v !== 'object') return null;
    const out = {};
    for (const d of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
      const x = v[d];
      if (x && (x.closed || x.open || x.close)) out[d] = { closed: !!x.closed, open: x.closed ? null : (x.open || null), close: x.closed ? null : (x.close || null) };
    }
    if (v.note && String(v.note).trim()) out.note = String(v.note).trim();
    return Object.keys(out).length ? out : null;
  }
  if (fd.type === 'repeater' || fd.type === 'zones') {
    return Array.isArray(v) ? v.filter((row) => isFilled(fd, [row])) : [];
  }
  return v;
}

// Solo los campos de un bloque (lo que se manda al guardar ese bloque).
export function blockData(section, data) {
  const out = {};
  for (const fd of section.fields) if (fd.type !== 'file' && fd.key in data) out[fd.key] = cleanForSend(fd, data[fd.key]);
  return out;
}
