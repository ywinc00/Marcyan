// ─────────────────────────────────────────────────────────────
// Leads y Clientes (A2): etiquetas legibles, tonos de chip y el paso
// entre los filtros de la URL (en español: #/leads?estado=nuevo&origen=chat)
// y los valores de la API (status=new&source=chat). Puro: lo prueba
// scripts/test-crm.mjs.
// ─────────────────────────────────────────────────────────────

// ── Leads ────────────────────────────────────────────────────
// Tonos distintos por estado (CRM-14): Contactado y Convertido ya no comparten color.
export const LEAD_STATUSES = [
  { id: 'new',       slug: 'nuevo',      label: 'Nuevo',      plural: 'Nuevos',      tone: 'accent'  },
  { id: 'contacted', slug: 'contactado', label: 'Contactado', plural: 'Contactados', tone: 'info'    },
  { id: 'converted', slug: 'convertido', label: 'Convertido', plural: 'Convertidos', tone: 'success' },
  { id: 'archived',  slug: 'archivado',  label: 'Archivado',  plural: 'Archivados',  tone: 'neutral' },
];
// Origen: Contacto y Diagnóstico ya no comparten color (CRM-14).
export const LEAD_SOURCES = [
  { id: 'contact',    slug: 'contacto',    label: 'Contacto',    tone: 'neutral' },
  { id: 'chat',       slug: 'chat',        label: 'Chatbot',     tone: 'data'    },
  { id: 'diagnostic', slug: 'diagnostico', label: 'Diagnóstico', tone: 'warning' },
];

const byId = (list, id) => list.find((x) => x.id === id) || null;
const bySlug = (list, slug) => list.find((x) => x.slug === slug || x.id === slug) || null;

export function leadStatus(id) { return byId(LEAD_STATUSES, id) || { id, slug: id, label: 'Sin estado', plural: '', tone: 'neutral' }; }
export function leadSource(id) { return byId(LEAD_SOURCES, id) || byId(LEAD_SOURCES, 'contact'); }

export const LEAD_PAGE = 30;

/** Query del hash → filtros de la API. Valores desconocidos se ignoran. */
export function leadFiltersFromQuery(query = {}) {
  const st = bySlug(LEAD_STATUSES, query.estado);
  const so = bySlug(LEAD_SOURCES, query.origen);
  const page = Math.max(1, parseInt(query.pagina, 10) || 1);
  return {
    status: st ? st.id : '',
    source: so ? so.id : '',
    search: String(query.q || '').trim().slice(0, 200),
    page,
  };
}

/** Filtros → patch de la query del hash ('' quita la clave). */
export function leadQueryPatch({ status, source, search, page } = {}) {
  const patch = {};
  if (status !== undefined) patch.estado = status ? (byId(LEAD_STATUSES, status)?.slug || '') : '';
  if (source !== undefined) patch.origen = source ? (byId(LEAD_SOURCES, source)?.slug || '') : '';
  if (search !== undefined) patch.q = search || '';
  if (page !== undefined) patch.pagina = page > 1 ? String(page) : '';
  return patch;
}

/** Parámetros de la API (lista y exportación) a partir de los filtros. */
export function leadApiParams(f, { paged = true } = {}) {
  const p = new URLSearchParams();
  if (f.status) p.set('status', f.status);
  if (f.source) p.set('source', f.source);
  if (f.search) p.set('search', f.search);
  if (paged) {
    p.set('limit', String(LEAD_PAGE));
    p.set('offset', String((Math.max(1, f.page || 1) - 1) * LEAD_PAGE));
  }
  return p;
}

/** Frase del vacío que repite el filtro (E-08): "nuevos de Chatbot que coincidan con «ana»". */
export function leadFilterPhrase(f) {
  const parts = [];
  const st = f.status ? leadStatus(f.status).plural.toLowerCase() : '';
  parts.push(st ? `leads ${st}` : 'leads');
  if (f.source) parts.push(`por ${leadSource(f.source).label}`);
  if (f.search) parts.push(`que coincidan con «${f.search}»`);
  return parts.join(' ');
}

// ── Clientes ─────────────────────────────────────────────────
export const CLIENT_STATUSES = [
  { id: 'active',   slug: 'activo',    label: 'Activo',    plural: 'Activos',    tone: 'success' },
  { id: 'inactive', slug: 'inactivo',  label: 'Inactivo',  plural: 'Inactivos',  tone: 'neutral' },
  { id: 'archived', slug: 'archivado', label: 'Archivado', plural: 'Archivados', tone: 'neutral' },
];
export function clientStatus(id) { return byId(CLIENT_STATUSES, id) || { id, label: 'Sin estado', plural: '', tone: 'neutral' }; }
export const CLIENT_PAGE = 30;

export function clientFiltersFromQuery(query = {}) {
  const st = bySlug(CLIENT_STATUSES, query.estado);
  return {
    status: st ? st.id : '',
    search: String(query.q || '').trim().slice(0, 200),
    page: Math.max(1, parseInt(query.pagina, 10) || 1),
  };
}
export function clientQueryPatch({ status, search, page } = {}) {
  const patch = {};
  if (status !== undefined) patch.estado = status ? (byId(CLIENT_STATUSES, status)?.slug || '') : '';
  if (search !== undefined) patch.q = search || '';
  if (page !== undefined) patch.pagina = page > 1 ? String(page) : '';
  return patch;
}
/** Sin estado elegido = "Todos" sin archivados (active=1). */
export function clientApiParams(f) {
  const p = new URLSearchParams();
  if (f.status) p.set('status', f.status); else p.set('active', '1');
  if (f.search) p.set('search', f.search);
  p.set('limit', String(CLIENT_PAGE));
  p.set('offset', String((Math.max(1, f.page || 1) - 1) * CLIENT_PAGE));
  return p;
}

export function clientName(c) {
  if (!c) return '';
  return (c.business_name || '').trim() || (c.owner_name || '').trim() || c.client_code || 'Cliente sin nombre';
}

// Estados de proyectos y facturas, solo para pintarlos en la ficha del cliente.
export const PROJECT_STATUS = {
  active: { label: 'Activo', tone: 'data' }, on_hold: { label: 'En pausa', tone: 'warning' },
  completed: { label: 'Completado', tone: 'success' }, cancelled: { label: 'Cancelado', tone: 'neutral' },
};
export const INVOICE_STATUS = {
  draft: { label: 'Borrador', tone: 'neutral' }, sent: { label: 'Enviada', tone: 'info' },
  partial: { label: 'Pago parcial', tone: 'warning' }, paid: { label: 'Pagada', tone: 'success' },
  overdue: { label: 'Vencida', tone: 'error' }, void: { label: 'Anulada', tone: 'neutral' },
};
export const BRIEF_STATUS = {
  pending: { label: 'Pendiente', tone: 'accent' }, contacted: { label: 'Contactado', tone: 'info' },
  in_progress: { label: 'En curso', tone: 'data' }, completed: { label: 'Completado', tone: 'success' },
  archived: { label: 'Archivado', tone: 'neutral' },
};

// ── Formato ──────────────────────────────────────────────────
/** Centavos (número o string BIGINT) → "$1,500" o "$1,500.50". */
export function money(cents) {
  const n = Number(cents) || 0;
  const whole = n % 100 === 0;
  return (n / 100).toLocaleString('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2,
  });
}

/** Dígitos para tel: y WhatsApp (EE. UU. por defecto si son 10). '' si no vale. */
export function phoneHref(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length < 7) return '';
  return d.length === 10 ? '+1' + d : '+' + d;
}
export function whatsappHref(phone) {
  const t = phoneHref(phone);
  return t ? 'https://wa.me/' + t.slice(1) : '';
}

/** Plural sencillo: plural(2, 'proyecto', 'proyectos') → "2 proyectos". */
export function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }

/** Frase de lo que arrastra un borrado definitivo de cliente (CRM-13). */
export function deleteImpactText(impact) {
  if (!impact) return '';
  const parts = [];
  if (impact.projects) parts.push(plural(impact.projects, 'proyecto', 'proyectos') + (impact.milestones ? ` (con ${plural(impact.milestones, 'hito', 'hitos')})` : ''));
  if (impact.invoices) parts.push(plural(impact.invoices, 'factura', 'facturas'));
  if (impact.payments) parts.push(plural(impact.payments, 'pago', 'pagos') + ` (${money(impact.payments_cents)} cobrados)`);
  if (!parts.length) return 'No tiene proyectos, facturas ni pagos: solo se borra su ficha.';
  const last = parts.pop();
  return 'También se borrarán para siempre ' + (parts.length ? parts.join(', ') + ' y ' + last : last) + '.';
}

// ── Monograma (mismo criterio que Briefs) ────────────────────
const MONO_PALETTE = ['#6366f1', '#0ea5e9', '#14b8a6', '#f97316', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];
export function initials(s) {
  const parts = String(s || '?').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
export function monoColor(s) {
  let h = 0; const t = String(s || '?');
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return MONO_PALETTE[Math.abs(h) % MONO_PALETTE.length];
}

// ── Historial del lead ───────────────────────────────────────
/** Coletilla del historial cuando un lead deja "Convertido" y conserva sus vínculos. */
function keptText(k) {
  const parts = [k.client_id ? 'su cliente' : '', k.brief_id ? `el brief ${k.brief_id}` : ''].filter(Boolean);
  return parts.length ? ` (conserva ${parts.join(' y ')})` : '';
}

/**
 * Texto del aviso al sacar de "Convertido" un lead que tiene cliente o brief
 * (integración CRM, A2-R6). null si no hace falta avisar.
 */
export function leavingConvertedMessage(lead, nextStatus) {
  if (!lead || lead.status !== 'converted' || nextStatus === 'converted') return null;
  const hasClient = !!lead.converted_client_id;
  const brief = lead.converted_brief_id || '';
  if (!hasClient && !brief) return null;
  const what = hasClient && brief ? `su cliente y el brief ${brief}`
    : hasClient ? 'su cliente' : `el brief ${brief}`;
  return `${lead.ref_id} pasará a ${leadStatus(nextStatus).label} y conservará ${what}: no se borra nada. `
    + 'Dejará de contar en Convertidos. Para volver a contarlo, márcalo otra vez como Convertido.';
}

export function leadEventText(ev) {
  const d = ev?.data || {};
  switch (ev?.event_type) {
    case 'status_changed': return `Estado: ${leadStatus(d.from).label} → ${leadStatus(d.to).label}${d.kept ? keptText(d.kept) : ''}`;
    case 'converted_to_client': return d.created ? `Convertido en cliente nuevo ${d.client_code || ''}`.trim() : `Vinculado al cliente ${d.client_code || ''}`.trim();
    case 'converted_to_brief': return `Brief creado ${d.project_id || ''}`.trim();
    case 'note_updated': return 'Notas actualizadas';
    default: return 'Cambio registrado';
  }
}
