// ════════════════════════════════════════════════════════════════
//  lib/finance-books.mjs — Libros de Finanzas listos para impuestos (fase 1)
//  Plan: _cerebro/marcyan-web/encargos/2026-11-14-plan-panel-finanzas.md
//  Necesita la migración 025_finance_books.sql.
//
//  · Historial mes a mes y año a año (ingresos, gastos por categoría, neto).
//  · Cargos reales de las suscripciones (el cron los genera; el pasado no cambia).
//  · Cierre de mes con checklist y bloqueo (visto bueno del dueño).
//  · Resumen por línea del Schedule C, lista de 1099 y datos del trimestral.
//  Montos en CENTAVOS; fechas 'YYYY-MM-DD' en hora de Houston.
//  Todo lo fiscal es material para el contador, no consejo fiscal (lib/finance-tax.mjs).
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';
import { houstonDate } from './dates.mjs';
import { dayOf, subscriptionChargeDates, subscriptionChargeAmount } from './finance-rules.mjs';
import {
  TAX_CATEGORIES, INCOME_CATEGORIES, taxLineOf, deductibleCents, nec1099Threshold,
  findDuplicates, findSubscriptionOverlaps, missingReceipts, quarterlyEstimate, taxCalendar, TAX_DISCLAIMER,
  mileageDeductionCents,
} from './finance-tax.mjs';

let db = sql;
export function __setDbForTests(fake) { db = fake || sql; }

export class BooksError extends Error {
  constructor(message, status = 400) { super(message); this.name = 'BooksError'; this.status = status; }
}

const monthKey = (d) => String(d).slice(0, 7);
const monthStart = (d) => `${monthKey(d)}-01`;

// ── Ajustes de Finanzas (tabla app_settings, claves 'finance.*') ─
export const FINANCE_SETTING_DEFAULTS = {
  'finance.entity': { periods: [{ from: '2026-01-01', type: 'undecided', partners: [] }] },
  'finance.filing': 'single',
  'finance.method': 'cash',
  'finance.sales_tax_tx': { registered: false, local_rate: null },
  // Agente contable (fase 2): encendido y tope de gasto de IA al mes, en USD.
  'finance.agent': { enabled: true, monthly_cap_usd: 10 },
};

export async function getFinanceSettings() {
  const r = await db.query(`SELECT key, value FROM app_settings WHERE key LIKE 'finance.%'`);
  const out = { ...FINANCE_SETTING_DEFAULTS };
  for (const row of r.rows) out[row.key] = row.value;
  return out;
}

export async function setFinanceSetting(key, value, by = null) {
  if (!Object.prototype.hasOwnProperty.call(FINANCE_SETTING_DEFAULTS, key)) throw new BooksError('Ajuste desconocido.');
  await db.query(
    `INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES ($1, $2::jsonb, NOW(), $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [key, JSON.stringify(value), by]);
  return getFinanceSettings();
}

// ── Meses cerrados: nada se escribe en ellos sin reabrirlos ──────
export async function isMonthClosed(date) {
  const d = dayOf(date);
  if (!d) return false;
  const r = await db.query(`SELECT status FROM finance_months WHERE month = $1`, [monthStart(d)]);
  return r.rows[0]?.status === 'closed';
}

/** Lanza si la fecha cae en un mes ya cerrado. */
export async function assertMonthOpen(date, what = 'ese movimiento') {
  if (await isMonthClosed(date)) {
    throw new BooksError(`El mes de ${what} ya está cerrado. Reábrelo en Finanzas para cambiarlo.`, 409);
  }
}

// ¿La fecha cae en un periodo posterior al del último cargo? Mensual: un mes de
// calendario posterior. Anual: al menos 300 días después (tolera cambios de día).
export function afterPeriod(date, last, cycle) {
  if (!last) return true;
  if (cycle === 'yearly') return (Date.parse(date) - Date.parse(last)) / 864e5 >= 300;
  return monthKey(date) > monthKey(last);
}

// ── Cargos reales de las suscripciones ──────────────────────────
// Idempotente: la clave sub:<id>:<fecha> impide duplicar. No escribe en meses cerrados.
export async function generateSubscriptionCharges({ today = houstonDate() } = {}) {
  const subs = await db.query(
    `SELECT id, name, category, amount_cents, cycle, next_charge_at, started_at, ended_at, created_at, account_id,
            billing, intro_amount_cents, intro_until
       FROM subscriptions
      WHERE active = true OR ended_at IS NOT NULL`);
  const closed = new Set((await db.query(`SELECT to_char(month, 'YYYY-MM') AS m FROM finance_months WHERE status = 'closed'`)).rows.map((r) => r.m));
  // Último cargo ya registrado de cada suscripción (automático o importado y asignado):
  // nunca se genera otro en ese mismo periodo, aunque cambie el día de cobro o el ciclo.
  const lastRows = (await db.query(
    `SELECT subscription_id AS id, to_char(MAX(spent_at), 'YYYY-MM-DD') AS last
       FROM company_expenses WHERE subscription_id IS NOT NULL GROUP BY 1`)).rows;
  const lastBySub = new Map(lastRows.map((r) => [String(r.id), r.last]));
  // Último monto REAL (revisado) de cada suscripción: estimado de las que varían.
  const realRows = (await db.query(
    `SELECT DISTINCT ON (subscription_id) subscription_id AS id, amount_cents AS cents
       FROM company_expenses
      WHERE subscription_id IS NOT NULL AND review_status = 'ok'
      ORDER BY subscription_id, spent_at DESC, id DESC`)).rows;
  const realBySub = new Map(realRows.map((r) => [String(r.id), r.cents]));
  let created = 0;
  let skippedClosed = 0;
  for (const s of subs.rows) {
    const last = lastBySub.get(String(s.id)) || null;
    for (const date of subscriptionChargeDates(s, today)) {
      if (last && !afterPeriod(date, last, s.cycle)) continue;
      if (closed.has(monthKey(date))) { skippedClosed++; continue; }
      const amt = subscriptionChargeAmount(s, date, realBySub.get(String(s.id)));
      if (amt.cents <= 0) continue;   // mes gratis (precio de entrada 0): no hay cargo
      // Las que varían: cargo «por confirmar» (pendiente de revisar, no cuenta hasta que
      // llegue la factura real, que lo sustituye).
      const r = await db.query(
        `INSERT INTO company_expenses
           (label, category, amount_cents, spent_at, vendor, source, source_ref, subscription_id, account_id, review_status)
         SELECT $1::text, $2::text, $3::bigint, $4::date, $5::text, 'subscription', $6::text, $7::bigint, $8::bigint, $9::text
          WHERE NOT EXISTS (SELECT 1 FROM finance_suppressed_refs WHERE source_ref = $6::text)
         ON CONFLICT (source_ref) WHERE source_ref IS NOT NULL DO NOTHING
         RETURNING id`,
        [amt.estimate ? `${s.name} · monto por confirmar` : s.name, s.category || 'software', amt.cents, date, s.name,
         `sub:${s.id}:${date}`, s.id, s.account_id || null, amt.estimate ? 'pending' : 'ok']);
      created += r.rowCount;
    }
  }
  return { created, skippedClosed };
}

// ── Historial ───────────────────────────────────────────────────
// Ingresos = cobros (por fecha de cobro) − devoluciones + ingresos sin factura revisados.
// Gastos = gastos revisados (los pendientes de revisar se cuentan aparte).
export async function booksYear(year) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new BooksError('Año no válido.');
  const from = `${y}-01-01`;
  const to = `${y + 1}-01-01`;
  const [pay, ref, inc, exp, pend, st, subs, pendM] = await Promise.all([
    db.query(`SELECT to_char(paid_at, 'YYYY-MM') AS m, SUM(amount_cents)::bigint AS cents, SUM(fee_cents)::bigint AS fees
                FROM payments WHERE paid_at >= $1 AND paid_at < $2 GROUP BY 1`, [from, to]),
    db.query(`SELECT to_char(refunded_at, 'YYYY-MM') AS m, SUM(amount_cents)::bigint AS cents
                FROM refunds WHERE refunded_at >= $1 AND refunded_at < $2 GROUP BY 1`, [from, to]),
    db.query(`SELECT to_char(received_at, 'YYYY-MM') AS m, category, SUM(amount_cents)::bigint AS cents, SUM(fee_cents)::bigint AS fees
                FROM income_entries WHERE received_at >= $1 AND received_at < $2 AND review_status = 'ok' GROUP BY 1, 2`, [from, to]),
    db.query(`SELECT to_char(spent_at, 'YYYY-MM') AS m, COALESCE(category, 'otro') AS category, SUM(amount_cents)::bigint AS cents
                FROM company_expenses WHERE spent_at >= $1 AND spent_at < $2 AND review_status = 'ok' GROUP BY 1, 2`, [from, to]),
    db.query(`SELECT (SELECT COUNT(*) FROM company_expenses WHERE review_status = 'pending' AND spent_at >= $1 AND spent_at < $2)::int AS expenses,
                     (SELECT COUNT(*) FROM income_entries  WHERE review_status = 'pending' AND received_at >= $1 AND received_at < $2)::int AS income`, [from, to]),
    db.query(`SELECT to_char(month, 'YYYY-MM') AS m, status, closed_at FROM finance_months WHERE month >= $1 AND month < $2`, [from, to]),
    // Cuánto del gasto de cada mes son cargos de suscripciones (para verlas como gasto).
    db.query(`SELECT to_char(spent_at, 'YYYY-MM') AS m, SUM(amount_cents)::bigint AS cents, COUNT(DISTINCT subscription_id)::int AS n
                FROM company_expenses WHERE subscription_id IS NOT NULL AND spent_at >= $1 AND spent_at < $2 AND review_status = 'ok' GROUP BY 1`, [from, to]),
    db.query(`SELECT m, SUM(n)::int AS n FROM (
                SELECT to_char(spent_at, 'YYYY-MM') AS m, COUNT(*) AS n FROM company_expenses WHERE review_status = 'pending' AND spent_at >= $1 AND spent_at < $2 GROUP BY 1
                UNION ALL
                SELECT to_char(received_at, 'YYYY-MM'), COUNT(*) FROM income_entries WHERE review_status = 'pending' AND received_at >= $1 AND received_at < $2 GROUP BY 1
              ) t GROUP BY m`, [from, to]),
  ]);
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: `${y}-${String(i + 1).padStart(2, '0')}`, income: 0, refunds: 0, fees: 0, expenses: 0, net: 0,
    subscriptions: 0, status: 'open', closed_at: null, pending: 0,
  }));
  const at = (m) => months[Number(String(m).slice(5, 7)) - 1];
  const byCategory = {};
  for (const r of pay.rows) { const mo = at(r.m); mo.income += Number(r.cents); mo.fees += Number(r.fees); }
  for (const r of ref.rows) at(r.m).refunds += Number(r.cents);
  for (const r of inc.rows) { const mo = at(r.m); mo.income += Number(r.cents); mo.fees += Number(r.fees); }
  for (const r of exp.rows) {
    at(r.m).expenses += Number(r.cents);
    (byCategory[r.category] ||= Array(12).fill(0))[Number(String(r.m).slice(5, 7)) - 1] += Number(r.cents);
  }
  for (const r of st.rows) { const mo = at(r.m); mo.status = r.status; mo.closed_at = r.closed_at || null; }
  for (const r of subs.rows) at(r.m).subscriptions = Number(r.cents);
  for (const r of pendM.rows) at(r.m).pending = Number(r.n);
  for (const mo of months) mo.net = mo.income - mo.refunds - mo.fees - mo.expenses;
  const subsRow = subs.rows.reduce((a, r) => ({ cents: a.cents + Number(r.cents), n: Math.max(a.n, Number(r.n)) }), { cents: 0, n: 0 });
  const sum = (k) => months.reduce((a, mo) => a + mo[k], 0);
  return {
    year: y,
    months,
    byCategory,
    totals: { income: sum('income'), refunds: sum('refunds'), fees: sum('fees'), expenses: sum('expenses'), net: sum('net') },
    pending: pend.rows[0],
    subscriptions: subsRow,
  };
}

// ── Un mes por dentro (página del mes en Finanzas, 2026-11-18) ──────
const MONTH_RE = /^(\d{4})-(\d{2})$/;
export function shiftMonth(m, delta) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Totales de varios meses a la vez, con las mismas reglas que el libro del año. */
async function monthsTotals(keys) {
  const [pay, inc, ref, exp, subs] = await Promise.all([
    db.query(`SELECT to_char(paid_at, 'YYYY-MM') AS m, SUM(amount_cents)::bigint AS cents, SUM(fee_cents)::bigint AS fees
                FROM payments WHERE to_char(paid_at, 'YYYY-MM') = ANY($1) GROUP BY 1`, [keys]),
    db.query(`SELECT to_char(received_at, 'YYYY-MM') AS m, SUM(amount_cents)::bigint AS cents, SUM(fee_cents)::bigint AS fees
                FROM income_entries WHERE to_char(received_at, 'YYYY-MM') = ANY($1) AND review_status = 'ok' GROUP BY 1`, [keys]),
    db.query(`SELECT to_char(refunded_at, 'YYYY-MM') AS m, SUM(amount_cents)::bigint AS cents
                FROM refunds WHERE to_char(refunded_at, 'YYYY-MM') = ANY($1) GROUP BY 1`, [keys]),
    db.query(`SELECT to_char(spent_at, 'YYYY-MM') AS m, SUM(amount_cents)::bigint AS cents
                FROM company_expenses WHERE to_char(spent_at, 'YYYY-MM') = ANY($1) AND review_status = 'ok' GROUP BY 1`, [keys]),
    db.query(`SELECT to_char(spent_at, 'YYYY-MM') AS m, SUM(amount_cents)::bigint AS cents
                FROM company_expenses WHERE to_char(spent_at, 'YYYY-MM') = ANY($1) AND review_status = 'ok'
                 AND subscription_id IS NOT NULL GROUP BY 1`, [keys]),
  ]);
  const out = Object.fromEntries(keys.map((k) => [k, {
    month: k, invoice_income: 0, other_income: 0, income: 0, fees: 0, refunds: 0, expenses: 0, subscriptions: 0, out: 0, net: 0,
  }]));
  for (const r of pay.rows) { const t = out[r.m]; if (t) { t.invoice_income += Number(r.cents); t.fees += Number(r.fees || 0); } }
  for (const r of inc.rows) { const t = out[r.m]; if (t) { t.other_income += Number(r.cents); t.fees += Number(r.fees || 0); } }
  for (const r of ref.rows) { const t = out[r.m]; if (t) t.refunds += Number(r.cents); }
  for (const r of exp.rows) { const t = out[r.m]; if (t) t.expenses += Number(r.cents); }
  for (const r of subs.rows) { const t = out[r.m]; if (t) t.subscriptions += Number(r.cents); }
  for (const t of Object.values(out)) {
    t.income = t.invoice_income + t.other_income;
    t.out = t.expenses + t.fees + t.refunds;
    t.net = t.income - t.out;
  }
  return out;
}

const idOf = (v) => (v == null ? null : String(v));

/**
 * Un mes por dentro: totales (con el mes anterior y el mismo mes del año pasado),
 * cada cobro, ingreso sin factura, devolución y gasto, el desglose por cliente y por
 * categoría, lo facturado en el mes y lo que de eso sigue sin cobrar, y el millaje.
 * Las comprobaciones del cierre siguen en monthChecklist.
 */
export async function booksMonth(month) {
  const m = String(month || '');
  const mm = MONTH_RE.exec(m);
  if (!mm || Number(mm[2]) < 1 || Number(mm[2]) > 12 || Number(mm[1]) < 2000 || Number(mm[1]) > 2100) throw new BooksError('Mes no válido.');
  const prevKey = shiftMonth(m, -1);
  const lastYearKey = shiftMonth(m, -12);
  const start = `${m}-01`;
  const inMonth = (col) => `${col} >= $1::date AND ${col} < ($1::date + INTERVAL '1 month')`;
  const [totals, pay, inc, ref, exp, inv, pend, miles, state] = await Promise.all([
    monthsTotals([m, prevKey, lastYearKey]),
    db.query(`SELECT p.id, p.paid_at, p.amount_cents, p.fee_cents, p.method, p.client_id, p.invoice_id,
                     i.invoice_number, COALESCE(c.business_name, c.owner_name) AS client_name, a.name AS account_name
                FROM payments p LEFT JOIN invoices i ON i.id = p.invoice_id LEFT JOIN clients c ON c.id = p.client_id
                LEFT JOIN finance_accounts a ON a.id = p.account_id
               WHERE ${inMonth('p.paid_at')} ORDER BY p.paid_at, p.id`, [start]),
    db.query(`SELECT n.id, n.received_at, n.label, n.category, n.amount_cents, n.fee_cents, n.client_id,
                     COALESCE(c.business_name, c.owner_name) AS client_name, a.name AS account_name
                FROM income_entries n LEFT JOIN clients c ON c.id = n.client_id LEFT JOIN finance_accounts a ON a.id = n.account_id
               WHERE ${inMonth('n.received_at')} AND n.review_status = 'ok' ORDER BY n.received_at, n.id`, [start]),
    db.query(`SELECT r.id, r.refunded_at, r.amount_cents, r.reason, r.client_id, i.invoice_number,
                     COALESCE(c.business_name, c.owner_name) AS client_name, a.name AS account_name
                FROM refunds r LEFT JOIN invoices i ON i.id = r.invoice_id LEFT JOIN clients c ON c.id = r.client_id
                LEFT JOIN finance_accounts a ON a.id = r.account_id
               WHERE ${inMonth('r.refunded_at')} ORDER BY r.refunded_at, r.id`, [start]),
    db.query(`SELECT e.id, e.spent_at, e.label, e.vendor, e.category, e.tax_line, e.amount_cents, e.business_pct,
                     e.receipt_status, e.subscription_id, s.name AS subscription_name, a.name AS account_name
                FROM company_expenses e LEFT JOIN subscriptions s ON s.id = e.subscription_id
                LEFT JOIN finance_accounts a ON a.id = e.account_id
               WHERE ${inMonth('e.spent_at')} AND e.review_status = 'ok' ORDER BY e.spent_at, e.id`, [start]),
    db.query(`SELECT i.id, i.invoice_number, i.amount_cents, i.due_date, i.status, i.client_id,
                     COALESCE(c.business_name, c.owner_name) AS client_name,
                     COALESCE((SELECT SUM(amount_cents) FROM payments WHERE invoice_id = i.id), 0)::bigint AS paid_cents
                FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
               WHERE ${inMonth('i.issued_at')} AND i.status NOT IN ('draft', 'void') ORDER BY i.issued_at, i.id`, [start]),
    db.query(`SELECT (SELECT COUNT(*) FROM company_expenses WHERE ${inMonth('spent_at')} AND review_status = 'pending')::int AS expenses,
                     (SELECT COUNT(*) FROM income_entries  WHERE ${inMonth('received_at')} AND review_status = 'pending')::int AS income`, [start]),
    db.query(`SELECT trip_date, miles FROM mileage_trips WHERE ${inMonth('trip_date')}`, [start]),
    db.query(`SELECT status, closed_at FROM finance_months WHERE month = $1`, [start]),
  ]);

  const payments = pay.rows.map((r) => ({
    id: String(r.id), date: dayOf(r.paid_at), client_id: idOf(r.client_id), client_name: r.client_name || null,
    invoice_id: idOf(r.invoice_id), invoice_number: r.invoice_number || null,
    account: r.account_name || null, method: r.method || null, amount_cents: Number(r.amount_cents), fee_cents: Number(r.fee_cents || 0),
  }));
  const otherIncome = inc.rows.map((r) => ({
    id: String(r.id), date: dayOf(r.received_at), label: r.label, category: r.category,
    client_id: idOf(r.client_id), client_name: r.client_name || null,
    account: r.account_name || null, amount_cents: Number(r.amount_cents), fee_cents: Number(r.fee_cents || 0),
  }));
  const refunds = ref.rows.map((r) => ({
    id: String(r.id), date: dayOf(r.refunded_at), reason: r.reason || null, invoice_number: r.invoice_number || null,
    client_id: idOf(r.client_id), client_name: r.client_name || null,
    account: r.account_name || null, amount_cents: Number(r.amount_cents),
  }));
  const expenses = exp.rows.map((e) => ({
    id: String(e.id), date: dayOf(e.spent_at), label: e.label, vendor: e.vendor || null, category: e.category || 'otro',
    tax_line: taxLineOf(e), amount_cents: Number(e.amount_cents), deductible_cents: deductibleCents(e),
    business_pct: e.business_pct == null ? 100 : Number(e.business_pct), receipt_status: e.receipt_status || 'none',
    subscription_id: idOf(e.subscription_id), subscription_name: e.subscription_name || null,
    account: e.account_name || null,
  }));

  // De dónde entró: por cliente (un ingreso sin cliente va solo, con su concepto).
  const byClient = new Map();
  const addIn = (key, name, clientId, cents) => {
    const row = byClient.get(key) || { key, name, client_id: clientId, cents: 0, count: 0 };
    row.cents += cents; row.count += 1; byClient.set(key, row);
  };
  for (const p of payments) addIn(p.client_id ? `c${p.client_id}` : 'sin-cliente', p.client_name || 'Sin cliente', p.client_id, p.amount_cents);
  for (const n of otherIncome) addIn(n.client_id ? `c${n.client_id}` : `i${n.id}`, n.client_name || n.label, n.client_id, n.amount_cents);
  // En qué se fue: por categoría, con lo deducible y las suscripciones que entran.
  const byCat = new Map();
  for (const e of expenses) {
    const row = byCat.get(e.category) || { category: e.category, tax_line: e.tax_line, cents: 0, deductible_cents: 0, count: 0, subscriptions: [] };
    row.cents += e.amount_cents; row.deductible_cents += e.deductible_cents; row.count += 1;
    if (e.subscription_name && !row.subscriptions.includes(e.subscription_name)) row.subscriptions.push(e.subscription_name);
    byCat.set(e.category, row);
  }
  const invoices = inv.rows.map((r) => {
    const amount = Number(r.amount_cents);
    const paid = Number(r.paid_cents || 0);
    return {
      id: String(r.id), number: r.invoice_number, client_id: idOf(r.client_id), client_name: r.client_name || null,
      amount_cents: amount, paid_cents: paid, balance_cents: Math.max(0, amount - paid), due_date: dayOf(r.due_date), status: r.status,
    };
  });
  const st = state.rows[0] || { status: 'open', closed_at: null };
  return {
    month: m,
    status: st.status,
    closed_at: st.closed_at || null,
    totals: totals[m],
    prev: totals[prevKey],
    last_year: totals[lastYearKey],
    payments,
    other_income: otherIncome,
    refunds,
    expenses,
    by_client: [...byClient.values()].sort((a, b) => b.cents - a.cents),
    by_category: [...byCat.values()].sort((a, b) => b.cents - a.cents),
    invoiced: {
      count: invoices.length,
      cents: invoices.reduce((a, i) => a + i.amount_cents, 0),
      unpaid: invoices.filter((i) => i.balance_cents > 0),
    },
    pending_review: Number(pend.rows[0].expenses) + Number(pend.rows[0].income),
    missing_receipts: missingReceipts(expenses).length,
    mileage: {
      trips: miles.rows.length,
      miles: miles.rows.reduce((a, t) => a + Number(t.miles || 0), 0),
      deduction_cents: mileageDeductionCents(miles.rows, Number(mm[1])),
    },
  };
}

/** Movimientos de una línea del Schedule C en el año (para abrir la línea en Impuestos). */
export async function scheduleCLine(year, line) {
  const y = Number(year);
  const l = String(line || '');
  if (!/^d{1,2}[a-c]?$/.test(l)) throw new BooksError('Línea no válida.');
  const r = await db.query(
    `SELECT e.id, to_char(e.spent_at, 'YYYY-MM-DD') AS spent_at, e.label, e.vendor, e.category, e.tax_line, e.amount_cents,
            e.business_pct, e.receipt_status, e.subscription_id, a.name AS account_name
       FROM company_expenses e LEFT JOIN finance_accounts a ON a.id = e.account_id
      WHERE e.spent_at >= $1 AND e.spent_at < $2 AND e.review_status = 'ok'
      ORDER BY e.spent_at DESC, e.id DESC`, [`${y}-01-01`, `${y + 1}-01-01`]);
  const rows = r.rows.filter((e) => taxLineOf(e) === l).map((e) => ({ ...e, deductible_cents: deductibleCents(e) }));
  return { line: l, rows: rows.slice(0, 300), total: rows.length };
}

/** Año a año: totales por año con datos. */
export async function booksYears() {
  const r = await db.query(`
    WITH inc AS (
      SELECT EXTRACT(YEAR FROM paid_at)::int AS y, SUM(amount_cents - fee_cents)::bigint AS c FROM payments GROUP BY 1
      UNION ALL SELECT EXTRACT(YEAR FROM received_at)::int, SUM(amount_cents - fee_cents)::bigint FROM income_entries WHERE review_status = 'ok' GROUP BY 1
      UNION ALL SELECT EXTRACT(YEAR FROM refunded_at)::int, -SUM(amount_cents)::bigint FROM refunds GROUP BY 1
    ), exp AS (
      SELECT EXTRACT(YEAR FROM spent_at)::int AS y, SUM(amount_cents)::bigint AS c FROM company_expenses WHERE review_status = 'ok' GROUP BY 1
    ), years AS (SELECT y FROM inc UNION SELECT y FROM exp)
    SELECT years.y AS year,
           COALESCE((SELECT SUM(c) FROM inc WHERE inc.y = years.y), 0)::bigint AS income_net,
           COALESCE((SELECT SUM(c) FROM exp WHERE exp.y = years.y), 0)::bigint AS expenses
      FROM years ORDER BY years.y DESC`);
  return r.rows.map((row) => ({
    year: row.year,
    income_net: Number(row.income_net),
    expenses: Number(row.expenses),
    net: Number(row.income_net) - Number(row.expenses),
  }));
}

// ── Resumen por línea del Schedule C ─────────────────────────────
export async function scheduleCSummary(year, { from, to } = {}) {
  const y = Number(year);
  const start = from || `${y}-01-01`;
  const end = to || `${y + 1}-01-01`;
  const [pay, ref, inc, exp, miles] = await Promise.all([
    db.query(`SELECT COALESCE(SUM(amount_cents), 0)::bigint AS gross, COALESCE(SUM(fee_cents), 0)::bigint AS fees
                FROM payments WHERE paid_at >= $1 AND paid_at < $2`, [start, end]),
    db.query(`SELECT COALESCE(SUM(amount_cents), 0)::bigint AS c FROM refunds WHERE refunded_at >= $1 AND refunded_at < $2`, [start, end]),
    db.query(`SELECT category, COALESCE(SUM(amount_cents), 0)::bigint AS c, COALESCE(SUM(fee_cents), 0)::bigint AS fees
                FROM income_entries WHERE received_at >= $1 AND received_at < $2 AND review_status = 'ok' GROUP BY 1`, [start, end]),
    db.query(`SELECT id, category, tax_line, amount_cents, business_pct, label, vendor
                FROM company_expenses WHERE spent_at >= $1 AND spent_at < $2 AND review_status = 'ok'`, [start, end]),
    db.query(`SELECT to_char(trip_date, 'YYYY-MM-DD') AS trip_date, miles FROM mileage_trips
               WHERE trip_date >= $1 AND trip_date < $2`, [start, end]),
  ]);
  const incByCat = Object.fromEntries(inc.rows.map((r) => [r.category, Number(r.c)]));
  const incFees = inc.rows.reduce((a, r) => a + Number(r.fees), 0);
  const gross = Number(pay.rows[0].gross) + (incByCat.servicios || 0);
  const lines = {};
  const partV = {};
  const add = (line, cents) => { lines[line] = (lines[line] || 0) + cents; };
  for (const e of exp.rows) {
    const line = taxLineOf(e);
    const cents = deductibleCents(e);
    add(line, cents);
    if (line === '27b') {
      const label = (TAX_CATEGORIES.find((c) => c.id === (e.category || 'otro')) || { label: 'Otro' }).label;
      partV[label] = (partV[label] || 0) + cents;
    }
  }
  const fees = Number(pay.rows[0].fees) + incFees;
  if (fees) add('10', fees);
  // Millaje por tarifa estándar (línea 9, parte IV). No se suma a gastos reales del mismo coche.
  const totalMiles = miles.rows.reduce((a, r) => a + Number(r.miles), 0);
  const mileageCents = totalMiles ? (mileageDeductionCents(miles.rows, y) || 0) : 0;
  if (mileageCents) add('9', mileageCents);
  const totalExpenses = Object.values(lines).reduce((a, c) => a + c, 0);
  // Línea 6: otros ingresos del negocio. Los intereses del banco NO van en el Schedule C
  // (van al Schedule B y no pagan cuota de autónomo): se informan aparte.
  const otherIncome = incByCat.otros || 0;
  const interest = incByCat.intereses || 0;
  const refunds = Number(ref.rows[0].c);
  const notes = [
    'Ingresos en bruto (antes de comisiones); las comisiones de cobro van en la línea 10.',
    'Comidas al 50 % y cada gasto por su porcentaje de uso de negocio.',
    'Sin oficina en casa ni depreciación: se añaden cuando haya datos.',
  ];
  if (interest) notes.push('Los intereses del banco van al Schedule B, no a este formulario.');
  if (mileageCents && exp.rows.some((e) => e.category === 'vehiculo')) {
    notes.push('Hay millaje y gastos reales del coche: con el mismo coche se usa un método u otro, no los dos. Decídelo con tu contador.');
  }
  return {
    disclaimer: TAX_DISCLAIMER,
    period: { from: start, to: end },
    line1_gross: gross,
    line2_returns: refunds,
    line6_other: otherIncome,
    interest_schedule_b: interest,
    miles: totalMiles,
    expenses_by_line: lines,
    part_v: partV,
    total_expenses: totalExpenses,
    net_profit: gross - refunds + otherIncome - totalExpenses,
    notes,
  };
}

// ── Cierre de mes ───────────────────────────────────────────────
export async function monthChecklist(month) {
  const m = /^\d{4}-\d{2}$/.test(String(month)) ? String(month) : null;
  if (!m) throw new BooksError('Mes no válido.');
  const start = `${m}-01`;
  const [exp, pendExp, pendInc, voidPaid, noAccount, state] = await Promise.all([
    db.query(`SELECT id, label, vendor, category, amount_cents, spent_at, receipt_status, subscription_id
                FROM company_expenses
               WHERE spent_at >= $1::date AND spent_at < ($1::date + INTERVAL '1 month') AND review_status = 'ok'`, [start]),
    db.query(`SELECT COUNT(*)::int AS n FROM company_expenses
               WHERE spent_at >= $1::date AND spent_at < ($1::date + INTERVAL '1 month') AND review_status = 'pending'`, [start]),
    db.query(`SELECT COUNT(*)::int AS n FROM income_entries
               WHERE received_at >= $1::date AND received_at < ($1::date + INTERVAL '1 month') AND review_status = 'pending'`, [start]),
    db.query(`SELECT i.id, i.invoice_number AS number FROM invoices i
               WHERE i.status = 'void' AND EXISTS (
                 SELECT 1 FROM payments p WHERE p.invoice_id = i.id
                    AND p.paid_at >= $1::date AND p.paid_at < ($1::date + INTERVAL '1 month'))
                 -- Solo si lo cobrado no se devolvió entero (devuelta y anulada está bien).
                 AND COALESCE((SELECT SUM(amount_cents) FROM payments WHERE invoice_id = i.id), 0)
                   - COALESCE((SELECT SUM(amount_cents) FROM refunds WHERE invoice_id = i.id), 0) > 0`, [start]),
    db.query(`SELECT COUNT(*)::int AS n FROM payments
               WHERE account_id IS NULL AND paid_at >= $1::date AND paid_at < ($1::date + INTERVAL '1 month')`, [start]),
    db.query(`SELECT status, closed_at, closed_by FROM finance_months WHERE month = $1`, [start]),
  ]);
  const rows = exp.rows;
  const uncategorized = rows.filter((e) => !e.category).map((e) => String(e.id));
  const duplicates = findDuplicates(rows);
  const overlaps = findSubscriptionOverlaps(rows);
  const receipts = missingReceipts(rows).map((e) => String(e.id));
  const items = [
    { key: 'pending', label: 'Movimientos importados sin revisar', count: pendExp.rows[0].n + pendInc.rows[0].n, blocking: true },
    { key: 'uncategorized', label: 'Gastos sin categoría', count: uncategorized.length, ids: uncategorized, blocking: true },
    { key: 'duplicates', label: 'Posibles duplicados (mismo importe y proveedor en 5 días)', count: duplicates.length, pairs: duplicates, blocking: false },
    { key: 'sub_overlap', label: 'Gastos puestos a mano que ya registra una suscripción (contarían doble)', count: overlaps.length, pairs: overlaps, blocking: false },
    { key: 'receipts', label: 'Gastos de 75 USD o más sin recibo', count: receipts.length, ids: receipts, blocking: false },
    { key: 'void_paid', label: 'Facturas anuladas con cobros (hay que devolverlos o reabrirlas)', count: voidPaid.rows.length, ids: voidPaid.rows.map((r) => r.number || String(r.id)), blocking: true },
    { key: 'no_account', label: 'Cobros sin cuenta (banco, Stripe, PayPal…)', count: noAccount.rows[0].n, blocking: false },
  ];
  const st = state.rows[0] || { status: 'open' };
  return {
    month: m,
    status: st.status,
    closed_at: st.closed_at || null,
    closed_by: st.closed_by || null,
    items,
    can_close: items.every((it) => !it.blocking || it.count === 0),
  };
}

export async function closeMonth(month, by) {
  const cl = await monthChecklist(month);
  if (cl.status === 'closed') return cl;
  if (!cl.can_close) throw new BooksError('Antes de cerrar el mes hay que resolver lo marcado como pendiente.', 409);
  await db.query(
    `INSERT INTO finance_months (month, status, closed_at, closed_by, checklist)
     VALUES ($1, 'closed', NOW(), $2, $3::jsonb)
     ON CONFLICT (month) DO UPDATE SET status = 'closed', closed_at = NOW(), closed_by = EXCLUDED.closed_by, checklist = EXCLUDED.checklist`,
    [`${cl.month}-01`, by || null, JSON.stringify(cl.items)]);
  return monthChecklist(month);
}

export async function reopenMonth(month, by) {
  const m = /^\d{4}-\d{2}$/.test(String(month)) ? String(month) : null;
  if (!m) throw new BooksError('Mes no válido.');
  await db.query(
    `UPDATE finance_months SET status = 'open', notes = COALESCE(notes, '') || $2 WHERE month = $1`,
    [`${m}-01`, `Reabierto por ${by || 'el dueño'} el ${houstonDate()}. `]);
  return monthChecklist(m);
}

// ── Contratistas y 1099 ─────────────────────────────────────────
// Solo cuentan los pagos por banco, transferencia o efectivo: lo pagado con tarjeta,
// PayPal o Stripe lo informa el procesador (1099-K) y no va en el 1099-NEC.
export async function contractors1099(year) {
  const y = Number(year);
  const threshold = nec1099Threshold(y);
  const r = await db.query(`
    SELECT v.id, v.name, v.entity_type, v.w9_status,
           COALESCE(SUM(e.amount_cents) FILTER (WHERE a.kind IS NULL OR a.kind IN ('bank', 'revolut', 'cash', 'other')), 0)::bigint AS reportable,
           COALESCE(SUM(e.amount_cents) FILTER (WHERE a.kind IN ('card', 'paypal', 'stripe')), 0)::bigint AS processor
      FROM finance_vendors v
      LEFT JOIN company_expenses e ON e.vendor_id = v.id
           AND e.spent_at >= $1 AND e.spent_at < $2 AND e.review_status = 'ok'
      LEFT JOIN finance_accounts a ON a.id = e.account_id
     WHERE v.is_contractor = true
     GROUP BY v.id ORDER BY reportable DESC`, [`${y}-01-01`, `${y + 1}-01-01`]);
  const tc = threshold == null ? null : threshold * 100;
  return {
    disclaimer: TAX_DISCLAIMER,
    year: y,
    threshold_usd: threshold,
    rows: r.rows.map((row) => {
      const reportable = Number(row.reportable);
      return {
        id: String(row.id),
        name: row.name,
        entity_type: row.entity_type,
        w9_status: row.w9_status,
        reportable_cents: reportable,
        processor_cents: Number(row.processor),
        needs_1099: tc != null && reportable >= tc,
        near_threshold: tc != null && reportable < tc && reportable >= tc * 0.75,
        corporation_note: row.entity_type === 'corporation',
      };
    }),
  };
}

// ── Trimestral ──────────────────────────────────────────────────
// Neto del año hasta el último mes CERRADO (si no hay ninguno, hasta el último mes
// completo, y se avisa: el plugin pide libros cerrados antes de calcular).
export async function estimatedTax(year, today = houstonDate()) {
  const y = Number(year);
  const settings = await getFinanceSettings();
  const closed = await db.query(
    `SELECT to_char(MAX(month), 'YYYY-MM') AS m FROM finance_months
      WHERE status = 'closed' AND month >= $1 AND month < $2`, [`${y}-01-01`, `${y + 1}-01-01`]);
  const lastClosed = closed.rows[0]?.m || null;
  const curMonth = Number(String(today).slice(5, 7));
  const fallback = String(today).slice(0, 4) === String(y) ? Math.max(curMonth - 1, 1) : 12;
  const months = lastClosed ? Number(lastClosed.slice(5, 7)) : fallback;
  // El neto es el del Schedule C (comidas al 50 %, uso de negocio, millaje), no el de caja.
  const to = months >= 12 ? `${y + 1}-01-01` : `${y}-${String(months + 1).padStart(2, '0')}-01`;
  const sc = await scheduleCSummary(y, { from: `${y}-01-01`, to });
  const paid = await db.query(
    `SELECT partner, COALESCE(SUM(amount_cents), 0)::bigint AS c FROM tax_estimated_payments
      WHERE tax_year = $1 AND jurisdiction = 'federal' GROUP BY 1`, [y]);
  const paidBy = new Map(paid.rows.map((r) => [r.partner || '', Number(r.c) / 100]));
  const paidTotal = [...paidBy.values()].reduce((a, c) => a + c, 0);
  const filing = settings['finance.filing'] === 'mfj' ? 'mfj' : 'single';
  const periods = settings['finance.entity']?.periods || [];
  const entity = periods[periods.length - 1] || { type: 'undecided', partners: [] };
  const base = {
    year: y, ytdNet: sc.net_profit / 100, ytdOtherIncome: sc.interest_schedule_b / 100,
    monthsElapsed: months, filing, today,
  };
  // En sociedad (Form 1065) cada socio paga por su parte: una hoja por socio.
  const partners = entity.type === 'partnership' && Array.isArray(entity.partners)
    ? entity.partners.filter((p) => p && p.name && Number(p.share) > 0) : [];
  const est = partners.length
    ? null
    : quarterlyEstimate({ ...base, paid: paidTotal });
  const byPartner = partners.map((p) => ({
    partner: p.name,
    estimate: quarterlyEstimate({ ...base, share: Number(p.share) / 100, paid: paidBy.get(p.name) || 0 }),
  }));
  return {
    disclaimer: TAX_DISCLAIMER,
    books_closed_through: lastClosed,
    warning: lastClosed ? null : 'Ningún mes está cerrado: el cálculo usa los libros sin cerrar y puede cambiar.',
    entity: settings['finance.entity'],
    entity_note: entity.type === 'undecided' ? 'La forma legal aún no está decidida: se calcula como negocio de una persona.' : null,
    schedule_c_net: sc.net_profit,
    estimate: est,
    partners: byPartner,
    calendar: taxCalendar(y),
  };
}

// ── Exportación para el contador (CSV) ──────────────────────────
export async function ledgerRows(year) {
  const y = Number(year);
  const r = await db.query(`
    SELECT 'cobro' AS tipo, p.paid_at AS fecha, COALESCE(c.business_name, c.owner_name, '') AS contraparte,
           COALESCE(i.invoice_number, '') AS referencia, p.amount_cents AS importe, p.fee_cents AS comision,
           '' AS categoria, '1' AS linea, COALESCE(a.name, '') AS cuenta, '' AS recibo
      FROM payments p LEFT JOIN invoices i ON i.id = p.invoice_id LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN finance_accounts a ON a.id = p.account_id
     WHERE p.paid_at >= $1 AND p.paid_at < $2
    UNION ALL
    SELECT 'devolucion', r.refunded_at, '', COALESCE(r.reason, ''), -r.amount_cents, 0, '', '2', COALESCE(a.name, ''), ''
      FROM refunds r LEFT JOIN finance_accounts a ON a.id = r.account_id
     WHERE r.refunded_at >= $1 AND r.refunded_at < $2
    UNION ALL
    SELECT 'ingreso', n.received_at, '', n.label, n.amount_cents, n.fee_cents, n.category,
           CASE n.category WHEN 'servicios' THEN '1' WHEN 'otros' THEN '6' ELSE 'Schedule B' END, COALESCE(a.name, ''), ''
      FROM income_entries n LEFT JOIN finance_accounts a ON a.id = n.account_id
     WHERE n.received_at >= $1 AND n.received_at < $2 AND n.review_status = 'ok'
    UNION ALL
    SELECT 'gasto', e.spent_at, COALESCE(e.vendor, ''), e.label, -e.amount_cents, 0, COALESCE(e.category, 'otro'),
           COALESCE(e.tax_line, ''), COALESCE(a.name, ''), e.receipt_status
      FROM company_expenses e LEFT JOIN finance_accounts a ON a.id = e.account_id
     WHERE e.spent_at >= $1 AND e.spent_at < $2 AND e.review_status = 'ok'
     ORDER BY 2, 1`, [`${y}-01-01`, `${y + 1}-01-01`]);
  return r.rows.map((row) => ({
    ...row,
    fecha: dayOf(row.fecha),
    linea: row.tipo === 'gasto' ? (row.linea || taxLineOf({ category: row.categoria })) : row.linea,
  }));
}

export { INCOME_CATEGORIES, TAX_CATEGORIES };
