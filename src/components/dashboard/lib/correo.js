// Bandeja de correo de Marcy en Orbit: categorías, agrupación por día y enlaces.
export const MAILBOX = 'yan99@marcyanstudio.com';

// tone = StatusChip. Naranja (accent) solo para lo que pide acción: oportunidad.
export const CATS = Object.freeze({
  oportunidad: { label: 'Oportunidad', tone: 'accent' },
  cliente: { label: 'Cliente', tone: 'data' },
  importante: { label: 'Importante', tone: 'warning' },
  facturas: { label: 'Facturas', tone: 'info' },
  boletines: { label: 'Boletines', tone: 'neutral' },
  spam: { label: 'Spam', tone: 'error' },
});

// Orden de las pastillas de filtro: lo que pide acción primero.
export const FILTERS = Object.freeze(['hoy', 'oportunidad', 'cliente', 'importante', 'facturas', 'boletines', 'spam', 'todos']);

export const STATUS_LABEL = Object.freeze({ nuevo: 'Nuevo', visto: 'Visto', respondido: 'Respondido', archivado: 'Archivado' });

export function matches(c, f) {
  if (c.status === 'archivado' && f !== 'todos') return false;
  if (f === 'todos') return true;
  if (f === 'hoy') return c.urgent && c.status !== 'respondido';
  return c.category === f;
}

export function counts(list) {
  const out = Object.fromEntries(FILTERS.map((f) => [f, 0]));
  for (const c of list) for (const f of FILTERS) if (matches(c, f)) out[f]++;
  return out;
}

const dayFmt = new Intl.DateTimeFormat('es-US', { timeZone: 'America/Chicago', weekday: 'long', day: 'numeric', month: 'short' });
const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('es-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' });

export function dayKey(iso) { return keyFmt.format(new Date(iso)); }
export function timeOf(iso) { return iso ? timeFmt.format(new Date(iso)).replace(/\s?a\.\s?m\./, ' a.m.').replace(/\s?p\.\s?m\./, ' p.m.') : ''; }

export function groupByDay(list, now = new Date()) {
  const today = dayKey(now.toISOString());
  const yest = dayKey(new Date(now.getTime() - 864e5).toISOString());
  const groups = [];
  for (const c of list) {
    const k = c.received_at ? dayKey(c.received_at) : 'sin-fecha';
    let g = groups[groups.length - 1];
    if (!g || g.key !== k) {
      const label = k === today ? 'Hoy' : k === yest ? 'Ayer' : k === 'sin-fecha' ? 'Sin fecha' : dayFmt.format(new Date(c.received_at));
      g = { key: k, label: label.charAt(0).toUpperCase() + label.slice(1), items: [] };
      groups.push(g);
    }
    g.items.push(c);
  }
  return groups;
}

export function gmailHref(threadId) {
  return `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(MAILBOX)}#all/${encodeURIComponent(threadId || '')}`;
}
