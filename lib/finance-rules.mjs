// ════════════════════════════════════════════════════════════════
//  lib/finance-rules.mjs — Reglas PURAS de Finanzas (sin BD ni red)
//  Una sola fuente para el servidor (lib/finance.mjs, lib/expenses.mjs,
//  api/admin/*) y para el panel (FinanzasSection y finanzas/*.svelte):
//    · parseMoney: "1500", "1,500", "1.500", "1.500,00" y "$1,500.00" → centavos.
//    · Estado de una factura: derivado de pagos y vencimiento, nunca a mano
//      salvo Borrador / Enviada / Anulada (FIN-02, FIN-05).
//    · Pagos: nunca en anuladas ni por encima del saldo (FIN-09).
//    · Próximo cargo de una suscripción que avanza solo (FIN-10).
//    · Categorías fijas de gastos (FIN-21).
//  Montos SIEMPRE en centavos enteros (USD). Fechas DATE como 'YYYY-MM-DD'.
// ════════════════════════════════════════════════════════════════

export const MAX_CENTS = 9999999999; // tope 99,999,999.99 USD (evita overflow BIGINT)

// ── Estados de factura ───────────────────────────────────────────
// Guardados en la columna: draft | sent | partial | paid | void (y 'overdue'
// heredado de filas viejas). Mostrados: el estado DERIVADO, que añade
// 'overdue' cuando la fecha de vencimiento pasó con saldo pendiente.
export const INVOICE_STATUSES = ['draft', 'sent', 'partial', 'paid', 'overdue', 'void'];
// Los únicos que se pueden poner a mano: el resto los calculan los pagos y la fecha.
export const MANUAL_INVOICE_STATUSES = ['draft', 'sent', 'void'];
// Estados "abiertos" = lo que se debe de verdad (sin borradores ni anuladas).
export const OPEN_INVOICE_STATUSES = ['sent', 'partial', 'overdue'];
// Filtros aceptados por la lista: los estados + 'open' (abiertas).
export const INVOICE_FILTERS = [...INVOICE_STATUSES, 'open'];

export const INVOICE_STATUS_LABELS = {
  draft: 'Borrador', sent: 'Enviada', partial: 'Parcial', paid: 'Pagada', overdue: 'Vencida', void: 'Anulada',
};

export const PAYMENT_METHODS = ['zelle', 'cash', 'transfer', 'paypal', 'card', 'other'];
export const PAYMENT_METHOD_LABELS = {
  zelle: 'Zelle', cash: 'Efectivo', transfer: 'Transferencia', paypal: 'PayPal', card: 'Tarjeta', other: 'Otro',
};

// ── Gastos: categorías fijas (FIN-21) ────────────────────────────
export const EXPENSE_CATEGORIES = [
  { id: 'software', label: 'Software' },
  { id: 'hosting', label: 'Hosting y dominios' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'legal', label: 'Legal y contable' },
  { id: 'otro', label: 'Otro' },
];
const CATEGORY_IDS = EXPENSE_CATEGORIES.map((c) => c.id);
// Sinónimos frecuentes de las categorías que ya había en texto libre.
const CATEGORY_ALIASES = {
  hospedaje: 'hosting', dominio: 'hosting', dominios: 'hosting', host: 'hosting',
  contable: 'legal', contabilidad: 'legal', abogado: 'legal', impuestos: 'legal',
  publicidad: 'marketing', anuncios: 'marketing', ads: 'marketing',
  other: 'otro', otros: 'otro', saas: 'software', apps: 'software',
};

/** Categoría de la lista cerrada; vacío → null; desconocida → 'otro'. */
export function normalizeCategory(v) {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return null;
  if (CATEGORY_IDS.includes(s)) return s;
  return CATEGORY_ALIASES[s] || 'otro';
}

/** Etiqueta legible de una categoría (las viejas en texto libre se muestran tal cual). */
export function categoryLabel(v) {
  if (!v) return '';
  const hit = EXPENSE_CATEGORIES.find((c) => c.id === String(v).toLowerCase());
  if (hit) return hit.label;
  const s = String(v);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const SUBSCRIPTION_CYCLES = ['monthly', 'yearly'];
export const CYCLE_LABELS = { monthly: 'Mensual', yearly: 'Anual' };

// ── Dinero ───────────────────────────────────────────────────────

/** Centavos → "$1,500.00". */
export function formatUsd(cents) {
  const n = Number(cents || 0) / 100;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

const FORMAT_HINT = 'No entendemos ese número. Escríbelo así: 1,500.00';

// ¿"1,500,000" (o con puntos) agrupado de 3 en 3?
function groupedOk(str, sep) {
  const parts = str.split(sep);
  return /^\d{1,3}$/.test(parts[0]) && parts.slice(1).every((p) => /^\d{3}$/.test(p));
}

/**
 * Texto de un campo de monto → { ok, cents } o { ok:false, error, empty? }.
 * Acepta "1500", "1500.5", "1,500", "1.500", "1.500,00", "1,500.00", "$1,500.00",
 * "USD 1500". Regla de la ambigüedad: un único separador seguido de EXACTAMENTE
 * tres cifras (y de 1 a 3 cifras delante, sin cero inicial) es separador de
 * miles; con una o dos cifras detrás es el decimal. Nunca devuelve un monto
 * mil veces menor en silencio: si no está claro, error.
 */
export function parseMoney(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: false, empty: true, error: 'Escribe un monto.' };
  let s = raw.replace(/\s+/g, '').replace(/^(US\$|USD\$?|\$)/i, '').replace(/(USD|\$)$/i, '');
  if (s.startsWith('-')) return { ok: false, error: 'El monto no puede ser negativo.' };
  if (!/^[0-9.,]+$/.test(s) || !/\d/.test(s)) return { ok: false, error: FORMAT_HINT };

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let intPart = '';
  let decPart = '';

  if (lastDot >= 0 && lastComma >= 0) {
    // Los dos: el último es el decimal y el otro, el de miles.
    const decSep = lastDot > lastComma ? '.' : ',';
    const thouSep = decSep === '.' ? ',' : '.';
    const i = s.lastIndexOf(decSep);
    intPart = s.slice(0, i);
    decPart = s.slice(i + 1);
    if (intPart.includes(decSep) || !groupedOk(intPart, thouSep)) return { ok: false, error: FORMAT_HINT };
    intPart = intPart.split(thouSep).join('');
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ',';
    const parts = s.split(sep);
    if (parts.length > 2) {
      if (!groupedOk(s, sep)) return { ok: false, error: FORMAT_HINT };
      intPart = parts.join('');
    } else {
      const [a, b] = parts;
      if (b.length === 3 && /^[1-9]\d{0,2}$/.test(a)) intPart = a + b; // separador de miles
      else { intPart = a; decPart = b; }                                // decimal
    }
  } else {
    intPart = s;
  }

  if (decPart.length > 2) return { ok: false, error: 'Usa como mucho dos decimales.' };
  if (intPart === '') intPart = '0';
  if (!/^\d+$/.test(intPart) || (decPart && !/^\d+$/.test(decPart))) return { ok: false, error: FORMAT_HINT };
  const cents = Number(intPart) * 100 + Number((decPart + '00').slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) return { ok: false, error: 'El monto es demasiado grande.' };
  return { ok: true, cents };
}

/** Centavos de un valor numérico del cuerpo de la petición; null si no vale. */
export function toCents(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 0 || n > MAX_CENTS) return null;
  return n;
}

// ── Fechas DATE ('YYYY-MM-DD') ───────────────────────────────────

/** 'YYYY-MM-DD' de una columna DATE (Date a medianoche UTC o texto). null si no vale. */
export function dayOf(v) {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** ¿Es un día real 'YYYY-MM-DD'? (rechaza 2026-02-30). */
export function isValidDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Mes 'YYYY-MM' → { start:'YYYY-MM-01', end:'YYYY-MM-01 del mes siguiente' } o null. */
export function monthBounds(key) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
  if (!m || +m[2] < 1 || +m[2] > 12) return null;
  const y = +m[1], mo = +m[2];
  const ny = mo === 12 ? y + 1 : y, nm = mo === 12 ? 1 : mo + 1;
  return { start: `${m[1]}-${m[2]}-01`, end: `${ny}-${String(nm).padStart(2, '0')}-01` };
}

function addMonthsClamped(y, m, d, k) {
  const total = (m - 1) + k;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12 + 1;
  const dim = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, dim)).padStart(2, '0')}`;
}

/**
 * Próximo cargo de una suscripción a partir de la fecha guardada: si ya pasó,
 * suma meses (o años) desde esa fecha de anclaje hasta llegar a hoy o después.
 * Se cuenta desde el ancla para no derivar (31 ene → 28 feb → 31 mar).
 */
export function advanceChargeDate(anchor, cycle, today) {
  const a = dayOf(anchor);
  if (!a || !today || a >= today) return a;
  const [y, m, d] = a.split('-').map(Number);
  const step = cycle === 'yearly' ? 12 : 1;
  let k = 0;
  let cur = a;
  while (cur < today && k < 12 * 200) { k += step; cur = addMonthsClamped(y, m, d, k); }
  return cur;
}

// ── Estado derivado de una factura ───────────────────────────────
// ESPEJO de sqlEffectiveStatus() en lib/finance.mjs: si cambias uno, cambia el otro.
//   anulada                         → void
//   monto 0 (filas viejas)          → borrador si lo era; si no, nada que cobrar = paid
//   pagado ≥ monto                  → paid
//   borrador sin pagos              → draft (un borrador no se debe ni vence)
//   vence antes de hoy con saldo    → overdue
//   con algún pago                  → partial
//   resto                           → sent
export function effectiveInvoiceStatus(inv, today) {
  const base = baseInvoiceStatus(inv);
  if (base === 'sent' || base === 'partial') {
    const due = dayOf(inv.due_date);
    if (due && today && due < today) return 'overdue';
  }
  return base;
}

/** El estado que se GUARDA en la columna (sin 'overdue', que se calcula al leer). */
export function baseInvoiceStatus(inv) {
  const st = inv.status;
  const amount = Number(inv.amount_cents) || 0;
  const paid = Number(inv.paid_cents) || 0;
  if (st === 'void') return 'void';
  if (amount <= 0) return st === 'draft' ? 'draft' : 'paid';
  if (paid >= amount) return 'paid';
  if (st === 'draft' && paid === 0) return 'draft';
  return paid > 0 ? 'partial' : 'sent';
}

/**
 * ¿Es un error de negocio (FinanceError / ExpenseError) con mensaje para el
 * dueño? Los endpoints lo devuelven con su código; el resto es un 500 genérico.
 */
export function isBusinessError(err) {
  return !!err && (err.name === 'FinanceError' || err.name === 'ExpenseError')
    && Number.isInteger(err.status) && err.status >= 400 && err.status < 500;
}

/** ¿Se puede poner este estado a mano? Devuelve el motivo si no. */
export function manualStatusProblem(target, paidCents) {
  if (!MANUAL_INVOICE_STATUSES.includes(target)) {
    return 'Ese estado se calcula solo: Pagada y Parcial salen de los pagos, y Vencida de la fecha de vencimiento.';
  }
  if (target === 'draft' && Number(paidCents) > 0) return 'Esta factura ya tiene pagos: no puede volver a borrador.';
  return null;
}

/**
 * ¿Se puede registrar (o dejar) un pago de `add` centavos? Devuelve el motivo
 * si no. `paid` = lo ya pagado SIN contar el pago que se edita.
 */
export function paymentProblem({ status, amount_cents, paid_cents, add }) {
  if (status === 'void') return 'No se pueden registrar pagos en una factura anulada.';
  const n = Number(add);
  if (!Number.isFinite(n) || n <= 0) return 'El monto del pago debe ser mayor que $0.';
  const balance = (Number(amount_cents) || 0) - (Number(paid_cents) || 0);
  if (balance <= 0) return 'Esta factura ya está pagada por completo.';
  if (n > balance) return `El pago supera el saldo pendiente (${formatUsd(balance)}).`;
  return null;
}
