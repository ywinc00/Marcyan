// ════════════════════════════════════════════════════════════════
//  src/components/brief/lib/kit.js — Lógica pura del Kit de arranque
//  (bloques = secciones del momento 'arranque' de lib/brief-schema.mjs).
//  Lo prueba scripts/test-brief-form.mjs.
// ════════════════════════════════════════════════════════════════
import { sectionsFor, validate, PHOTO_SHOTS, catchupSection, isSkipped } from '../../../../lib/brief-schema.mjs';

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

// Bloques visibles para estos servicios (y que el servidor anunció). Si el
// brief no traía preguntas del brief corto (chat, formulario anterior), el
// servidor las anuncia en `catchup` y van primero, en su propio bloque.
// fromPanel: brief creado desde el panel (el cliente no rellenó el corto).
export function kitBlocks(services, allowedKeys, catchup, fromPanel = false) {
  const list = sectionsFor('arranque', Array.isArray(services) && services.length ? services : null);
  const allow = Array.isArray(allowedKeys) && allowedKeys.length ? new Set(allowedKeys) : null;
  const pend = catchupSection(catchup, { panel: fromPanel === true });
  return [...(pend ? [pend] : []), ...list.filter((s) => !allow || allow.has(s.key))];
}

// Campos que se ven de un bloque: en el bloque de lo que faltaba del brief,
// lo que otra respuesta descarta se oculta (como en el formulario).
export const visibleFields = (section, data) => (section.catchup
  ? section.fields.filter((fd) => !isSkipped(fd.key, data))
  : section.fields);
const catchupKeysOf = (blocks) => (blocks || []).filter((b) => b.catchup).flatMap((b) => b.fields.map((f) => f.key));

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
  const fields = visibleFields(section, data);
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

// Validación del kit como la del servidor (parcial al guardar, completa al
// enviar). blocks: los de kitBlocks; si traen el bloque de lo que faltaba del
// brief, esas claves se validan con las reglas del brief corto (nada obligatorio).
export function validateKit(data, services, partial, blocks = []) {
  const opts = { services: services && services.length ? services : null, optionMode: 'keep' };
  const v = validate('arranque', data, { ...opts, partial });
  const d = data || {};
  const pend = {};
  for (const k of catchupKeysOf(blocks)) if (k in d && !isSkipped(k, d)) pend[k] = d[k];
  if (!Object.keys(pend).length) return v;
  const vp = validate('inicial', pend, { ...opts, partial: true });
  const errors = { ...v.errors, ...vp.errors };
  return { ok: Object.keys(errors).length === 0, errors, data: { ...v.data, ...vp.data } };
}

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
  for (const fd of visibleFields(section, data)) if (fd.type !== 'file' && fd.key in data) out[fd.key] = cleanForSend(fd, data[fd.key]);
  return out;
}
