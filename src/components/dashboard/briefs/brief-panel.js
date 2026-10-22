// ─────────────────────────────────────────────────────────────
// Lógica pura de la sección Briefs del panel (sin DOM ni red), para que
// la prueben los scripts de Node (npm run test:briefs-panel).
// Todo lo del brief (secciones, etiquetas, tipos y opciones) sale del
// esquema ÚNICO lib/brief-schema.mjs (CRM-20/B-09): el panel ya no tiene su
// propia copia de las 8 secciones.
// ─────────────────────────────────────────────────────────────
import {
  SECTIONS, FIELDS, FILE_TAG_DEFS, BRIEF_SERVICES,
  labelFor, shortLabel, isActive, isMissing, isLegacyBrief,
} from '../../../../lib/brief-schema.mjs';
import { filesSummary, NOTICE_DAYS } from '../../../../lib/brief-retention.mjs';

export { FIELDS, BRIEF_SERVICES, labelFor, isLegacyBrief };

// ── Estados del brief ────────────────────────────────────────
// slug = cómo se escribe en la URL (#/briefs?estado=en-curso).
// tone = color del chip (nunca solo color: siempre con su texto).
export const STATUSES = [
  { id: 'pending',     slug: 'pendiente',  label: 'Pendiente',  tone: 'warning' },
  { id: 'contacted',   slug: 'contactado', label: 'Contactado', tone: 'info' },
  { id: 'in_progress', slug: 'en-curso',   label: 'En curso',   tone: 'data' },
  { id: 'completed',   slug: 'completado', label: 'Completado', tone: 'success' },
  { id: 'archived',    slug: 'archivado',  label: 'Archivado',  tone: 'neutral' },
];
export const statusById = (id) => STATUSES.find((s) => s.id === id) || null;
export const statusLabel = (id) => (statusById(id) || {}).label || 'Sin estado';
export const statusTone = (id) => (statusById(id) || {}).tone || 'neutral';
/** Slug de la URL → id del estado ('' si no es válido). Acepta también el id. */
export function statusFromSlug(slug) {
  const s = String(slug || '').toLowerCase();
  const hit = STATUSES.find((x) => x.slug === s || x.id === s);
  return hit ? hit.id : '';
}
export const slugFromStatus = (id) => (statusById(id) || {}).slug || '';

export const SOURCE_LABEL = { web: 'Formulario', chat: 'Chat del sitio', panel: 'Creado desde el panel' };
export const LANG_LABEL = { es: 'Español', en: 'Inglés' };

// ── Kit de arranque ──────────────────────────────────────────
export const KIT_STATUS = {
  none:        { label: 'Sin enviar',            tone: 'neutral', text: 'Aún no se le ha enviado al cliente.' },
  sent:        { label: 'Enviado',               tone: 'info',    text: 'El cliente tiene el enlace y todavía no ha empezado.' },
  in_progress: { label: 'En curso',              tone: 'warning', text: 'El cliente lo está rellenando por partes.' },
  submitted:   { label: 'Recibido',              tone: 'success', text: 'El cliente lo envió completo.' },
};
/** Estado del kit del brief. available=false si la base aún no tiene las columnas (migración 010). */
export function kitState(brief) {
  const available = !!brief && Object.prototype.hasOwnProperty.call(brief, 'kit_status');
  const id = available && KIT_STATUS[brief.kit_status] ? brief.kit_status : 'none';
  return { available, id, ...KIT_STATUS[id], sentAt: brief?.kit_sent_at || null, submittedAt: brief?.kit_submitted_at || null };
}

// ── Campos ───────────────────────────────────────────────────
// Lo que el panel edita (igual que BRIEF_EDITABLE_TYPES del servidor). Las
// listas (repeater), el horario y las zonas los rellena el cliente en el kit.
export const EDITABLE_TYPES = new Set([
  'text', 'textarea', 'email', 'tel', 'url', 'radio', 'select', 'checkbox',
  'number', 'date-month', 'services',
]);
const LONG_TYPES = new Set(['textarea', 'repeater', 'hours', 'zones']);
const PILL_TYPES = new Set(['checkbox', 'services']);

export const isEmptyValue = (v) => v === null || v === undefined || v === '' || v === false
  || (Array.isArray(v) && v.length === 0)
  || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);

/** Opciones de un campo para editarlo como opción (B-22). */
export function fieldOptions(fd) {
  if (!fd) return [];
  if (fd.type === 'services') return BRIEF_SERVICES.map((s) => ({ value: s.id, label: s.name.es }));
  return (fd.options || []).map((o) => ({ value: o.value, label: o.label.es }));
}

/** Etiqueta corta para el lado interno ("Propietario", no "Tu nombre"). */
export const fieldLabel = (fd) => shortLabel(fd, 'es') || (fd && fd.label && fd.label.es) || '';

/**
 * Texto legible de un valor (B-08): "Bilingüe", "En 2 a 4 semanas"…
 * Un valor fuera de la lista (texto libre del chat o del formulario v1)
 * sale tal cual: no se inventa una etiqueta.
 */
export function valueText(fd, v) {
  if (isEmptyValue(v)) return '';
  return labelFor(fd, v, 'es') || '';
}

/** Lista de etiquetas de un campo de varias opciones (para pintar pastillas). */
export function valuePills(fd, v) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => labelFor(fd, [x], 'es') || String(x));
}

/**
 * Secciones del brief para la ficha. Reglas (las mismas que el documento):
 *  · Momento inicial: todos sus campos activos (vacíos como "Sin dato").
 *  · Kit de arranque: solo lo que tiene dato.
 *  · En edición: además todas las columnas históricas (se podían editar antes)
 *    y nunca lo que el panel no edita si está vacío.
 *  · Los campos de archivo van aparte (tarjeta Archivos).
 *  · Origen honesto (revisión A3-01): las columnas históricas del momento
 *    'arranque' las rellenó el cliente en el formulario anterior o en el chat,
 *    no en el kit. Salen como moment 'anterior' si el kit no se ha recibido
 *    (kitReceived=false) y siempre si el kit no las pregunta (hidden).
 * → [{ key, title, moment, rows: [{ fd, key, label, value, span, pills, editable }] }]
 *   moment: 'inicial' | 'anterior' | 'arranque'
 */
export function viewSections(data = {}, { edit = false, kitReceived = false, legacy = false } = {}) {
  const services = Array.isArray(data.services) ? data.services : [];
  const out = [];
  for (const s of SECTIONS) {
    if (!edit && s.key === 'servicios') continue; // en lectura los servicios van en la cabecera
    const rows = [];
    for (const fd of s.fields) {
      if (fd.type === 'file') continue;
      const value = data[fd.key];
      const empty = isEmptyValue(value);
      const editable = EDITABLE_TYPES.has(fd.type);
      const inicialActive = fd.moment === 'inicial' && isActive(fd, services);
      const show = !empty
        // En lectura, "Sin dato" solo si de verdad falta (isMissing, la misma
        // regla que el documento y BRIEF.md): un sí/no sin marcar, lo que otra
        // respuesta descarta, lo de servicios en un brief sin servicios y las
        // preguntas nuevas en un brief histórico no faltan.
        || (edit ? editable && (fd.storage === 'column' || inicialActive)
          : fd.moment === 'inicial' && isMissing(fd, data, { services, legacy }));
      if (!show) continue;
      rows.push({
        fd, key: fd.key, label: fieldLabel(fd), value: empty ? null : value,
        span: LONG_TYPES.has(fd.type) || (edit && fd.type === 'checkbox' && !!fd.options) || fd.type === 'services',
        pills: PILL_TYPES.has(fd.type) && Array.isArray(value) && (!!fd.options || fd.type === 'services'),
        editable,
      });
    }
    if (!rows.length) continue;
    if (s.moment === 'inicial') { out.push({ key: s.key, title: s.short.es, moment: s.moment, rows }); continue; }
    const fromForm = (r) => r.fd.storage === 'column' && (r.fd.hidden || !kitReceived);
    const anterior = rows.filter(fromForm);
    const kit = rows.filter((r) => !fromForm(r));
    if (anterior.length) out.push({ key: s.key, title: s.short.es, moment: 'anterior', rows: anterior });
    if (kit.length) out.push({ key: s.key, title: s.short.es, moment: 'arranque', rows: kit });
  }
  return out;
}

/** ¿El cliente ya está rellenando o envió el kit? (decide el origen de los datos). */
export const kitReceived = (brief) => ['in_progress', 'submitted'].includes(kitState(brief).id);

// ── Edición: solo lo que cambia (CRM-09) ────────────────────
const canon = (v) => (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0) ? null : v);
export const sameValue = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

/** Borrador editable a partir de los datos (copia; los arrays se clonan). */
export function editDraft(data = {}, sections = viewSections(data, { edit: true })) {
  const d = {};
  for (const s of sections) for (const r of s.rows) {
    if (!r.editable) continue;
    const v = data[r.key];
    if (r.fd.type === 'checkbox' && !r.fd.options) d[r.key] = v === true;
    else if (PILL_TYPES.has(r.fd.type)) d[r.key] = Array.isArray(v) ? [...v] : [];
    else d[r.key] = v === null || v === undefined ? '' : v;
  }
  return d;
}

/** { clave: valor } solo de lo que difiere del original. */
export function changedFields(original = {}, draft = {}) {
  const out = {};
  for (const [k, v] of Object.entries(draft)) {
    const before = original[k];
    // Un booleano falso equivale a "sin dato" (checkbox sin opciones).
    const a = before === false ? null : before;
    const b = v === false ? null : v;
    if (!sameValue(a, b)) out[k] = typeof v === 'string' ? v.trim() : v;
  }
  return out;
}

// ── Contactos clicables (CRM-21) ─────────────────────────────
const digits = (s) => String(s || '').replace(/\D+/g, '');
/** Teléfono de EE. UU. en E.164 (+1XXXXXXXXXX) o null si no se puede marcar. */
export function phoneE164(raw) {
  const d = digits(raw);
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d.startsWith('1')) return '+' + d;
  if (d.length >= 11 && d.length <= 15 && String(raw).trim().startsWith('+')) return '+' + d;
  return null;
}
function webHref(raw) {
  const s = String(raw || '').trim();
  if (!s || /\s/.test(s)) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(s)) return 'https://' + s;
  return null;
}
function instagramHref(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const url = webHref(s);
  if (url && /instagram\.com/i.test(url)) return url;
  const h = s.replace(/^@/, '');
  return /^[A-Za-z0-9._]{1,30}$/.test(h) ? 'https://instagram.com/' + h : null;
}
/** Enlaces de contacto del brief: llamar, WhatsApp, correo, web e Instagram. */
export function contactLinks(data = {}) {
  const out = [];
  const tel = phoneE164(data.phone);
  if (tel) {
    out.push({ kind: 'tel', icon: 'phone', label: 'Llamar', detail: data.phone, href: 'tel:' + tel });
    out.push({ kind: 'whatsapp', icon: 'whatsapp', label: 'WhatsApp', detail: data.phone, href: 'https://wa.me/' + tel.slice(1), external: true });
  }
  const email = String(data.email || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) out.push({ kind: 'email', icon: 'mail', label: 'Correo', detail: email, href: 'mailto:' + email });
  const web = webHref(data.current_website);
  if (web) out.push({ kind: 'web', icon: 'globe', label: 'Sitio actual', detail: web.replace(/^https?:\/\//, ''), href: web, external: true });
  const ig = instagramHref(data.instagram);
  if (ig) out.push({ kind: 'instagram', icon: 'link', label: 'Instagram', detail: String(data.instagram).trim(), href: ig, external: true });
  return out;
}

// ── Archivos ─────────────────────────────────────────────────
export const FILE_GROUPS = [
  { kind: 'logo',  title: 'Logo' },
  { kind: 'photo', title: 'Fotos' },
  { kind: 'doc',   title: 'Documentos' },
  { kind: 'video', title: 'Video' },
  { kind: 'legal', title: 'Documentos legales' },
];
/** Agrupa por tipo en el orden de FILE_GROUPS (los grupos vacíos no salen). */
export function groupFiles(files = []) {
  return FILE_GROUPS
    .map((g) => ({ ...g, files: files.filter((f) => f.kind === g.kind) }))
    .filter((g) => g.files.length);
}
const TYPE_LABEL = {
  'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP', 'image/svg+xml': 'SVG',
  'image/heic': 'HEIC', 'image/gif': 'GIF', 'application/pdf': 'PDF', 'video/mp4': 'MP4',
  'video/quicktime': 'MOV', 'application/postscript': 'AI/EPS',
};
/** Tipo corto y legible del archivo (PDF, SVG, JPG…). */
export function fileTypeLabel(f = {}) {
  if (TYPE_LABEL[f.contentType]) return TYPE_LABEL[f.contentType];
  const ext = String(f.originalName || '').split('.').pop();
  return ext && ext.length <= 5 && ext !== f.originalName ? ext.toUpperCase() : 'Archivo';
}
export function fmtSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0).replace('.', ',') + ' MB';
}
// Para qué se subió el archivo, dicho para el equipo (las etiquetas del
// esquema le hablan al cliente: "Sube tu logo"). Logo, fotos y video no lo
// necesitan: ya lo dice su grupo.
const FILE_FIELD_LABEL = {
  price_list: 'Lista de precios', catalog_files: 'Catálogo de productos', brandbook: 'Manual de marca',
  copy_files: 'Textos del cliente', bot_knowledge: 'Para el asistente con IA',
  legal_docs: 'Registro del negocio', insurance_docs: 'Seguros y licencias',
};
/** Etiquetas legibles de un archivo (toma, barrio, mes, variante…). */
export function fileTags(f = {}) {
  const tags = f.tags || {};
  const defs = [...(FILE_TAG_DEFS[f.kind] || []), ...FILE_TAG_DEFS.common];
  const out = [];
  for (const fd of defs) {
    const v = tags[fd.key];
    if (isEmptyValue(v)) continue;
    if (fd.key === 'field') {
      if (FILE_FIELD_LABEL[v]) out.push(FILE_FIELD_LABEL[v]);
      continue;
    }
    if (fd.type === 'checkbox' && !fd.options) { if (v === true) out.push(fd.label.es); continue; }
    const text = labelFor(fd, v, 'es');
    if (text) out.push(fd.key === 'pair' ? `Par: ${text}` : text);
  }
  if (f.convertedFrom === 'image/heic') out.push('Convertida desde el iPhone');
  return out;
}
/** Estado de verificación: el panel nunca pinta en línea lo no verificado. */
export function fileCheck(f = {}) {
  if (f.verified === false) return { id: 'rejected', label: 'Rechazado', tone: 'error' };
  if (f.verified === true) return { id: 'ok', label: '', tone: '' };
  return { id: 'pending', label: 'Sin verificar', tone: 'warning' };
}

// ── Plazo de conservación de los archivos ────────────────────
// El servidor manda retention { purgeOn, daysLeft, cause, lastPurge } (ver
// lib/brief-retention.mjs). Devuelve qué pintar en la sección Archivos:
//   { kind: 'scheduled', day, soon, overdue, legal, cause } con archivos y fecha,
//   { kind: 'purged', at, files, reason, cause } sin archivos tras un borrado,
//   o null (sin fecha ni borrado: no se dice nada).
// cause (scheduled): 'completed' (se terminó el proyecto, por defecto),
// 'archived' (se archivó sin llegar a ser proyecto) o 'archived_after_work'
// (se archivó sin completarse, pero se trabajó). cause (purged): la causa
// con la que SE BORRÓ (lastPurge.cause, RET-A4), no la de hoy; null si el
// borrado es anterior a guardarla (el texto sale neutro).
export function retentionView(retention, files = []) {
  const r = retention || {};
  const n = Array.isArray(files) ? files.length : 0;
  if (n && r.purgeOn) {
    const left = Number.isFinite(r.daysLeft) ? r.daysLeft : null;
    return {
      kind: 'scheduled', day: r.purgeOn,
      soon: left !== null && left <= NOTICE_DAYS, overdue: left !== null && left <= 0,
      legal: files.some((f) => f.kind === 'legal'),
      cause: retentionCauseOf(r),
    };
  }
  if (!n && r.lastPurge && r.lastPurge.at) {
    const reason = r.lastPurge.reason === 'retention' ? 'retention' : 'request';
    const cause = reason === 'retention' && ARCHIVED_CAUSES.concat('completed').includes(r.lastPurge.cause) ? r.lastPurge.cause : null;
    return { kind: 'purged', at: r.lastPurge.at, files: Number(r.lastPurge.files) || 0, reason, cause };
  }
  return null;
}
const ARCHIVED_CAUSES = ['archived', 'archived_after_work'];
const retentionCauseOf = (r) => (r && ARCHIVED_CAUSES.includes(r.cause) ? r.cause : 'completed');
/** Frases del plazo según la causa: "12 meses después de …" y "12 meses desde que …". */
export function retentionPhrases(cause = 'completed') {
  return ARCHIVED_CAUSES.includes(cause)
    ? { after: '12 meses después de archivarlo', since: '12 meses desde que se archivó el brief' }
    : { after: '12 meses después de terminar el proyecto', since: '12 meses desde que se terminó el proyecto' };
}
const filesCount = (n) => (n === 1 ? '1 archivo' : `${n} archivos`);
/** Texto del estado vacío tras un borrado. Por plazo, con la causa con la
 *  que se borró; sin causa guardada (borrados anteriores), texto neutro. */
export function purgedText(v = {}) {
  const n = Number(v.files) || 0;
  const what = n ? (n === 1 ? 'Se borró 1 archivo' : `Se borraron ${n} archivos`) : 'Se borraron los archivos';
  const why = v.reason !== 'retention' ? ' desde el panel'
    : v.cause ? ` al cumplirse ${retentionPhrases(v.cause).since}` : ' al cumplirse el plazo de 12 meses';
  return `${what}${why}. El brief y su historial se conservan.`;
}
/** Mensaje de la confirmación de "Borrar archivos": cuántos y qué. */
export function purgeConfirmMessage(files = []) {
  const by = {};
  for (const f of files) by[f.kind] = (by[f.kind] || 0) + 1;
  const n = files.length;
  const what = filesSummary(by);
  return `${n === 1 ? 'Se borra el único archivo' : `Se borran los ${n} archivos`} de este brief${what ? `: ${what}` : ''}. `
    + 'El brief y su historial se quedan. No se puede deshacer.';
}

// ── Historial ────────────────────────────────────────────────
const EVENT_TITLE = {
  brief_received: 'Brief recibido',
  status_changed: 'Estado cambiado',
  summary_updated: 'Resumen actualizado',
  brief_edited: 'Brief editado',
  email_sent_to_client: 'Correo enviado al cliente',
  note: 'Nota interna',
  kit_link_created: 'Enlace del kit de arranque creado',
  kit_downloaded: 'Kit descargado',
  kit_submitted: 'El cliente envió el kit de arranque',
  converted_to_client: 'Convertido en cliente',
  client_edited: 'El cliente corrigió su brief',
  files_purged: 'Archivos borrados',
};
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * Título y detalle legibles de un evento. kind: 'note' | 'email' | 'edit' | ''.
 * Para 'brief_edited' devuelve también `changes` [{ label, from, to }].
 */
export function describeEvent(ev = {}) {
  const d = ev.data || {};
  const title = EVENT_TITLE[ev.event_type] || 'Actividad';
  switch (ev.event_type) {
    case 'brief_received':
      return { title, detail: d.source === 'chat' ? 'Desde el chat del sitio' : (d.source === 'web' ? 'Desde el formulario'
        : (d.source === 'panel' ? `Creado desde la ficha del cliente${d.client_code ? ' ' + d.client_code : ''}` : '')) };
    case 'status_changed':
      return { title, detail: d.from || d.to ? `${statusLabel(d.from)} → ${statusLabel(d.to)}` : '' };
    case 'summary_updated':
      return { title, detail: '' };
    case 'brief_edited': {
      const keys = Array.isArray(d.fields) ? d.fields : [];
      const changes = keys.map((k) => {
        const fd = FIELDS.get(k);
        const c = (d.changes && d.changes[k]) || null;
        return {
          label: fd ? fieldLabel(fd) : k,
          from: c ? (valueText(fd, c.from) || 'Sin dato') : null,
          to: c ? (valueText(fd, c.to) || 'Sin dato') : null,
        };
      });
      const names = changes.map((c) => c.label);
      const detail = !keys.length ? '' : names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} y ${names.length - 3} más`;
      return { title, detail, kind: 'edit', changes: changes.filter((c) => c.from !== null) };
    }
    case 'email_sent_to_client':
      return { title, detail: d.subject ? `Asunto: ${d.subject}` : '', kind: 'email', body: d.body || '' };
    case 'note':
      return { title, detail: '', kind: 'note', body: d.text || '' };
    case 'kit_link_created': {
      const parts = [d.emailSent ? 'Enviado por correo' : 'Solo enlace, sin correo'];
      if (d.lang) parts.push(LANG_LABEL[d.lang] || d.lang);
      if (d.reopen) parts.push('Reabierto para correcciones');
      return { title, detail: parts.join(' · ') };
    }
    case 'kit_downloaded': {
      const n = Number(d.files) || 0;
      const parts = [n ? plural(n, 'archivo', 'archivos') : 'Sin archivos'];
      if (Number(d.failed)) parts.push(plural(Number(d.failed), 'no se pudo incluir', 'no se pudieron incluir'));
      if (d.legal) parts.push('con documentos legales');
      return { title, detail: parts.join(' · ') };
    }
    case 'kit_submitted':
      return { title, detail: Number(d.files) ? plural(Number(d.files), 'archivo', 'archivos') : '' };
    case 'files_purged': {
      const n = Number(d.files) || 0;
      const why = d.reason === 'retention' ? 'Plazo de 12 meses cumplido' : 'Desde el panel';
      return { title, detail: n ? `${filesCount(n)} · ${why}` : why };
    }
    case 'converted_to_client': {
      const who = [d.client_code, d.business_name].filter(Boolean).join(' · ');
      return { title, detail: `${d.created ? 'Cliente nuevo' : 'Vinculado a un cliente existente'}${who ? ': ' + who : ''}` };
    }
    default:
      return { title, detail: '' };
  }
}
