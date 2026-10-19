// ─────────────────────────────────────────────────────────────
// Ayudas de la sección Finanzas (solo panel). Las REGLAS (montos,
// estados, pagos, categorías) vienen de lib/finance-rules.mjs, la misma
// fuente que usa el servidor: lo que el panel valida es lo que el servidor
// acepta. Aquí solo hay formato y vocabulario de la interfaz.
// ─────────────────────────────────────────────────────────────
export {
  parseMoney, formatUsd, INVOICE_STATUS_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS,
  EXPENSE_CATEGORIES, categoryLabel, SUBSCRIPTION_CYCLES, CYCLE_LABELS, paymentProblem,
  OPEN_INVOICE_STATUSES,
} from '../../../../lib/finance-rules.mjs';

/** Centavos → "$1,500" (sin centavos, para las cifras grandes de los KPI). */
export function fmtUsd0(cents) {
  return (Number(cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

/** Centavos → "$4.1K" (ejes del gráfico). */
export function fmtUsdShort(cents) {
  const n = Number(cents || 0) / 100;
  if (n >= 1000) return '$' + (n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'K';
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Centavos → texto para un campo de monto ("1500.00"). */
export function centsToInput(cents) {
  const n = Number(cents || 0);
  return n > 0 ? (n / 100).toFixed(2) : '';
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** 'YYYY-MM' → "oct". */
export function monthShort(key) { return MONTHS[parseInt(String(key).slice(5, 7), 10) - 1] || key; }
/** 'YYYY-MM' → "octubre 2026". */
export function monthLong(key) {
  const m = parseInt(String(key).slice(5, 7), 10);
  return MONTHS_LONG[m - 1] ? `${MONTHS_LONG[m - 1]} ${String(key).slice(0, 4)}` : key;
}
/** Los últimos n meses 'YYYY-MM' desde `fromKey` (incluido), del más reciente al más viejo. */
export function lastMonthKeys(fromKey, n = 12) {
  let y = parseInt(fromKey.slice(0, 4), 10);
  let m = parseInt(fromKey.slice(5, 7), 10);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m -= 1; if (m === 0) { m = 12; y -= 1; }
  }
  return out;
}

// Estado → tono del chip (H-07: el naranja NO se gasta en chips; el
// color dice el significado y el texto lo nombra).
export const STATUS_TONE = {
  draft: 'neutral', sent: 'info', partial: 'warning', paid: 'data', overdue: 'error', void: 'neutral',
};

// Qué significa cada estado, en una línea (ficha de la factura).
export const STATUS_HELP = {
  draft: 'Aún no se ha enviado. No cuenta en Por cobrar.',
  sent: 'Pendiente de pago.',
  partial: 'Tiene pagos y todavía queda saldo.',
  paid: 'El saldo es $0.',
  overdue: 'Pasó la fecha de vencimiento y queda saldo.',
  void: 'No cuenta en Por cobrar. Los pagos registrados se conservan.',
};

// Filtros de la URL en español (#/finanzas?estado=vencida) ↔ valor del servidor.
export const STATUS_FILTERS = [
  { id: '', api: '', label: 'Todas', count: 'all' },
  { id: 'abiertas', api: 'open', label: 'Abiertas', count: 'open' },
  { id: 'borrador', api: 'draft', label: 'Borrador', count: 'draft' },
  { id: 'enviada', api: 'sent', label: 'Enviada', count: 'sent' },
  { id: 'parcial', api: 'partial', label: 'Parcial', count: 'partial' },
  { id: 'vencida', api: 'overdue', label: 'Vencida', count: 'overdue' },
  { id: 'pagada', api: 'paid', label: 'Pagada', count: 'paid' },
  { id: 'anulada', api: 'void', label: 'Anulada', count: 'void' },
];

/** ¿Se le puede registrar un pago? (saldo > 0 y no anulada). */
export function isPayable(inv) {
  return !!inv && inv.status !== 'void' && Number(inv.balance_cents) > 0;
}

/** Iniciales para el monograma ("Café Habana 305" → "CH"). */
export function initials(s) {
  const t = (s || '').trim();
  if (!t) return '·';
  const parts = t.split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p));
  if (!parts.length) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Días entre dos fechas 'YYYY-MM-DD' (b − a). */
export function daysBetween(a, b) {
  if (!a || !b) return 0;
  const t = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((t(b) - t(a)) / 86400000);
}
