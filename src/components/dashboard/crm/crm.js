// ─────────────────────────────────────────────────────────────
// Leads y Clientes (A2): etiquetas legibles, tonos de chip y el paso
// entre los filtros de la URL (en español: #/leads?estado=nuevo&origen=chat)
// y los valores de la API (status=new&source=chat). Puro: lo prueba
// scripts/test-crm.mjs.
// ─────────────────────────────────────────────────────────────

// ── Leads ────────────────────────────────────────────────────
// Tonos distintos por estado (CRM-14): Contactado y Convertido ya no comparten color.
export const LEAD_STATUSES = [
  // Fase 3 · mapa de estados (chip neutro con punto): nuevo = naranja (por atender),
  // contactado = gris (esperando al cliente), convertido = verde.
  // Embudo (Ventas §1, migración 029): diagnóstico hecho y propuesta enviada van entre
  // contactado y ganado; «ganado» es el convertido de siempre (pasa a cliente).
  // Nuevo en gris como las demás etapas abiertas (boceto aprobado el 20-nov): el rojo y el
  // ámbar son para los plazos, y el naranja solo para la acción principal.
  { id: 'new',       slug: 'nuevo',      label: 'Nuevo',      plural: 'Nuevos',      tone: 'neutral' },
  { id: 'contacted', slug: 'contactado', label: 'Contactado', plural: 'Contactados', tone: 'neutral' },
  { id: 'diagnosed', slug: 'diagnostico', label: 'Diagnóstico hecho', plural: 'Diagnóstico hecho', tone: 'neutral' },
  { id: 'proposal',  slug: 'propuesta',  label: 'Propuesta enviada', plural: 'Propuesta enviada', tone: 'neutral' },
  { id: 'converted', slug: 'ganado',     label: 'Ganado',     plural: 'Ganados',     tone: 'success' },
  { id: 'lost',      slug: 'perdido',    label: 'Perdido',    plural: 'Perdidos',    tone: 'neutral' },
  { id: 'archived',  slug: 'archivado',  label: 'Archivado',  plural: 'Archivados',  tone: 'neutral' },
  // Prueba y spam no cuentan en las estadísticas ni salen en "Todos".
  { id: 'test',      slug: 'prueba',     label: 'Prueba',     plural: 'Pruebas',     tone: 'neutral' },
  { id: 'spam',      slug: 'spam',       label: 'Spam',       plural: 'Spam',        tone: 'error'   },
];
// Las etapas abiertas, en orden: forman «En curso» (la vista por etapas y «Para hoy»).
export const OPEN_STATUSES = ['new', 'contacted', 'diagnosed', 'proposal'];
// Motivo obligatorio al marcar un contacto como perdido (la misma lista que la base).
export const LOST_REASONS = [
  { id: 'price', label: 'Precio' },
  { id: 'competitor', label: 'Eligió a otro' },
  { id: 'timing', label: 'No era el momento' },
  { id: 'no_reply', label: 'No contestó' },
  { id: 'not_fit', label: 'No encaja con lo que hacemos' },
];
export function lostReason(id) { return LOST_REASONS.find((r) => r.id === id) || null; }
// Origen en etiqueta neutra (fase 3, H-07): el color es para el estado, no para el canal.
export const LEAD_SOURCES = [
  { id: 'contact',    slug: 'contacto',    label: 'Formulario',  tone: 'neutral' },
  { id: 'chat',       slug: 'chat',        label: 'Chatbot',     tone: 'neutral' },
  { id: 'diagnostic', slug: 'diagnostico', label: 'Diagnóstico', tone: 'neutral' },
  { id: 'whatsapp',   slug: 'whatsapp',    label: 'WhatsApp',    tone: 'neutral' },
  { id: 'instagram',  slug: 'instagram',   label: 'Instagram',   tone: 'neutral' },
  { id: 'call',       slug: 'llamada',     label: 'Llamada',     tone: 'neutral' },
  { id: 'referral',   slug: 'referido',    label: 'Referido',    tone: 'neutral' },
  { id: 'other',      slug: 'otro',        label: 'Otro',        tone: 'neutral' },
];

const byId = (list, id) => list.find((x) => x.id === id) || null;
const bySlug = (list, slug) => list.find((x) => x.slug === slug || x.id === slug) || null;
// Enlaces viejos: «convertido» era la palabra de «ganado».
const STATUS_ALIASES = { convertido: 'converted' };

export function leadStatus(id) { return byId(LEAD_STATUSES, id) || { id, slug: id, label: 'Sin estado', plural: '', tone: 'neutral' }; }
export function leadSource(id) { return byId(LEAD_SOURCES, id) || byId(LEAD_SOURCES, 'contact'); }

export const LEAD_PAGE = 30;

/** Query del hash → filtros de la API. Valores desconocidos se ignoran. */
export function leadFiltersFromQuery(query = {}) {
  const st = bySlug(LEAD_STATUSES, STATUS_ALIASES[query.estado] || query.estado);
  const so = bySlug(LEAD_SOURCES, query.origen);
  const page = Math.max(1, parseInt(query.pagina, 10) || 1);
  return {
    status: st ? st.id : '',
    // Sin estado en la URL, Leads abre «En curso» (por etapas o «Para hoy»); «todos» es la lista entera.
    all: query.estado === 'todos',
    view: query.vista === 'hoy' ? 'today' : 'stages',
    source: so ? so.id : '',
    search: String(query.q || '').trim().slice(0, 200),
    page,
  };
}

/** ¿La vista es «En curso» (tabla agrupada) o la lista de siempre, paginada? */
export function isPipelineView(f) { return !f.status && !f.all; }

/** Filtros → patch de la query del hash ('' quita la clave). */
export function leadQueryPatch({ status, source, search, page, view } = {}) {
  const patch = {};
  // status: '' = En curso; 'all' = Todos; o un estado.
  if (status !== undefined) patch.estado = status === 'all' ? 'todos' : status ? (byId(LEAD_STATUSES, status)?.slug || '') : '';
  if (view !== undefined) patch.vista = view === 'today' ? 'hoy' : '';
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
  pending: { label: 'Pendiente', tone: 'info' }, contacted: { label: 'Contactado', tone: 'info' },
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

/** ¿Tiene facturas emitidas o cobros? Entonces no se borra: los libros se guardan 7 años. */
export function keepsBooks(impact) {
  return !!impact && (Number(impact.payments) > 0 || Number(impact.issued_invoices) > 0);
}

/** Frase de lo que arrastra un borrado definitivo de cliente (CRM-13). */
export function deleteImpactText(impact) {
  if (!impact) return '';
  const parts = [];
  if (impact.projects) parts.push(plural(impact.projects, 'proyecto', 'proyectos') + (impact.milestones ? ` (con ${plural(impact.milestones, 'hito', 'hitos')})` : ''));
  if (impact.invoices) parts.push(plural(impact.invoices, 'borrador de factura', 'borradores de factura'));
  if (impact.payments) parts.push(plural(impact.payments, 'pago', 'pagos') + ` (${money(impact.payments_cents)} cobrados)`);
  if (!parts.length) return 'No tiene proyectos, facturas ni pagos: solo se borra su ficha.';
  const last = parts.pop();
  return 'También se borrarán para siempre ' + (parts.length ? parts.join(', ') + ' y ' + last : last) + '.';
}

// ── Monograma (mismo criterio que Briefs) ────────────────────
export { initials } from '../lib/colors.js';
export { entityColor as monoColor } from '../lib/colors.js';

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
    + 'Dejará de contar en Ganados. Para volver a contarlo, márcalo otra vez como Ganado.';
}

const BY = { marcy: 'Marcy', diagnostic: 'el diagnóstico', orbit: '' };
export function leadEventText(ev) {
  const d = ev?.data || {};
  switch (ev?.event_type) {
    case 'status_changed': {
      const who = d.by && BY[d.by] ? ` (lo movió ${BY[d.by]})` : '';
      const why = d.lost_reason && lostReason(d.lost_reason) ? `, motivo: ${lostReason(d.lost_reason).label.toLowerCase()}` : '';
      return `Etapa: ${leadStatus(d.from).label} → ${leadStatus(d.to).label}${why}${d.kept ? keptText(d.kept) : ''}${who}`;
    }
    case 'converted_to_client': return d.created ? `Pasó a cliente nuevo ${d.client_code || ''}`.trim() : `Unido al cliente ${d.client_code || ''}`.trim();
    case 'converted_to_brief': return `Brief creado ${d.project_id || ''}`.trim();
    case 'note_updated': return 'Notas actualizadas';
    case 'proposal_created': return `Propuesta ${d.proposal || ''} ${d.sent ? 'enviada' : 'en borrador'}${d.by && BY[d.by] ? `, la preparó ${BY[d.by]}` : ''}`.replace(/\s+/g, ' ');
    case 'proposal_sent': return `Propuesta ${d.proposal || ''} enviada`;
    case 'proposal_accepted': return `Propuesta ${d.proposal || ''} aceptada${d.option != null ? `: opción ${Number(d.option) + 1}` : ''}`;
    case 'proposal_rejected': return `Propuesta ${d.proposal || ''} rechazada`;
    case 'proposal_expired': return `Propuesta ${d.proposal || ''} vencida sin respuesta`;
    case 'follow_up_done': return `Seguimiento ${d.step || ''} hecho`.replace(/\s+/g, ' ');
    default: return 'Cambio registrado';
  }
}

// ── Embudo: siguiente paso, grupos y propuestas ──────────────
const DAY = 24 * 60 * 60 * 1000;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** 'AAAA-MM-DD' → '27 nov' (sin husos: es una fecha de calendario). */
export function dayLabel(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day || ''));
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : '';
}
/** Días entre dos fechas 'AAAA-MM-DD' (b − a). */
export function daysBetween(a, b) {
  const t = (s) => Date.UTC(...String(s).split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
  return Math.round((t(b) - t(a)) / DAY);
}
/** Hoy en Houston, 'AAAA-MM-DD'. */
export function houstonToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/**
 * Texto y tono del siguiente paso (lo calcula el servidor en `next`). long = la tabla;
 * short = el teléfono. tone: 'error' (atrasado), 'warning' (hoy) o '' (sin pastilla).
 */
export function nextStepText(next, { now = new Date() } = {}) {
  if (!next) return { long: '', short: '', tone: '' };
  const today = houstonToday(now);
  const lateBy = (iso) => Math.max(1, Math.floor((now - new Date(iso)) / DAY));
  switch (next.kind) {
    case 'reply':
      return next.bucket === 'late'
        ? { long: 'pasó de 24 h', short: '+24 h', tone: 'error', what: 'Contestar' }
        : { long: 'contestar hoy', short: 'hoy', tone: 'warning', what: 'Contestar' };
    case 'send_proposal': {
      if (next.bucket !== 'late') return { long: 'propuesta hoy', short: 'hoy', tone: 'warning', what: 'Enviar la propuesta' };
      const d = next.due ? lateBy(next.due) : 1;
      return { long: `propuesta, ${d} ${d === 1 ? 'día' : 'días'} tarde`, short: `${d} d tarde`, tone: 'error', what: 'Enviar la propuesta' };
    }
    case 'follow_up': {
      const what = next.step ? `Seguimiento del día ${next.step}` : 'Seguimiento';
      if (next.bucket === 'late') {
        const d = Math.max(1, daysBetween(next.due, today));
        return { long: `seguimiento, ${d} ${d === 1 ? 'día' : 'días'} tarde`, short: `${d} d tarde`, tone: 'error', what };
      }
      if (next.bucket === 'today') return { long: next.step ? `seguimiento del día ${next.step}` : 'seguimiento hoy', short: 'hoy', tone: 'warning', what };
      const d = daysBetween(today, next.due);
      return { long: d === 1 ? 'seguimiento mañana' : `seguimiento el ${dayLabel(next.due)}`, short: d === 1 ? 'mañana' : dayLabel(next.due), tone: '', what };
    }
    case 'waiting': return { long: `esperando respuesta · vence el ${dayLabel(next.due)}`, short: `vence ${dayLabel(next.due)}`, tone: '', what: 'Esperar respuesta' };
    case 'expired': return { long: 'venció sin respuesta', short: 'vencida', tone: 'error', what: 'Decidir la propuesta' };
    default: {
      const n = Number(next.days) || 0;
      return { long: `sin siguiente paso, ${n} ${n === 1 ? 'día' : 'días'}`, short: `${n} d`, tone: '', what: 'Sin siguiente paso' };
    }
  }
}

const URGENCY = { late: 0, today: 1, week: 2 };
const byUrgency = (a, b) => (URGENCY[a.next?.bucket] ?? 3) - (URGENCY[b.next?.bucket] ?? 3)
  || String(a.next?.due || '').localeCompare(String(b.next?.due || ''))
  || String(b.created_at).localeCompare(String(a.created_at));

/** Grupos de la vista «Por etapas»: una sección por etapa abierta, en orden, sin las vacías. */
export function stageGroups(rows) {
  return OPEN_STATUSES.map((st) => {
    const items = rows.filter((r) => r.status === st).sort(byUrgency);
    const g = { key: st, label: leadStatus(st).label, items, note: '' };
    if (st === 'new') g.note = 'responder en 24 horas';
    if (st === 'diagnosed') g.note = 'propuesta en 24 horas';
    if (st === 'proposal') {
      const live = items.filter((r) => r.proposal && r.proposal.effective_status === 'sent');
      const p = live.reduce((s, r) => s + r.proposal.project_cents, 0);
      const m = live.reduce((s, r) => s + r.proposal.monthly_cents, 0);
      if (live.length) g.note = `${money(p)} con la opción recomendada${m ? ` y ${money(m)}/mes` : ''}`;
    }
    return g;
  }).filter((g) => g.items.length);
}

/** Grupos de «Para hoy»: atrasado y hoy abiertos; esta semana y sin siguiente paso, plegados. */
export function todayGroups(rows) {
  const pick = (f) => rows.filter(f).sort(byUrgency);
  return [
    { key: 'late', label: 'Atrasado', tone: 'error', items: pick((r) => r.next?.bucket === 'late') },
    { key: 'today', label: 'Hoy', items: pick((r) => r.next?.bucket === 'today') },
    { key: 'week', label: 'Esta semana', folded: true, items: pick((r) => r.next?.bucket === 'week' && r.next?.kind !== 'none') },
    { key: 'none', label: 'Sin siguiente paso', folded: true, items: pick((r) => r.next?.kind === 'none') },
  ].filter((g) => g.items.length);
}

/** Recuento del interruptor: lo de hoy (atrasado + hoy) y cuántos van atrasados. */
export function todayCounts(rows) {
  const late = rows.filter((r) => r.next?.bucket === 'late').length;
  const today = rows.filter((r) => r.next?.bucket === 'today').length;
  return { due: late + today, late };
}

/** Filtro de búsqueda y origen sobre la lista de «En curso» (se trae entera). */
export function filterPipeline(rows, f) {
  const q = String(f.search || '').trim().toLowerCase();
  return rows.filter((r) => (!f.source || r.source === f.source) && (!q || [r.name, r.email, r.phone, r.business_name, r.ref_id, r.interest, r.message]
    .some((v) => String(v || '').toLowerCase().includes(q))));
}

/** Una opción de propuesta en una línea: «$1,234 + $456/mes». */
export function optionPrice(o) {
  if (!o) return '';
  const p = Number(o.project_cents) || 0;
  const m = Number(o.monthly_cents) || 0;
  return [p ? money(p) : '', m ? `${money(m)}/mes` : ''].filter(Boolean).join(' + ') || '$0';
}

export const PROPOSAL_STATUS = {
  draft: { label: 'Borrador', tone: 'neutral' }, sent: { label: 'Enviada', tone: 'neutral' },
  accepted: { label: 'Aceptada', tone: 'success' }, rejected: { label: 'Rechazada', tone: 'neutral' },
  expired: { label: 'Vencida', tone: 'error' },
};
export const PROPOSAL_AUTHOR = { orbit: 'tú en Orbit', marcy: 'Marcy', diagnostic: 'el diagnóstico' };
