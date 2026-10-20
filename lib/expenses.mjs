// ════════════════════════════════════════════════════════════════
//  lib/expenses.mjs — Helpers de queries para EGRESOS
//  company_expenses (gastos puntuales) + subscriptions (SaaS recurrentes).
//  Ver db/migrations/008_finance_expenses.sql.
//  TODO monto en CENTAVOS (BIGINT), USD. El formateo a dólares vive en la UI.
//  Patrón gemelo de lib/finance.mjs (template tags parametrizados).
//  ids de Postgres son BIGINT → strings; nunca parseInt en paths SQL.
//  Reglas puras (categorías fijas, próximo cargo) en lib/finance-rules.mjs.
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';
import { houstonDate } from './dates.mjs';
import {
  SUBSCRIPTION_CYCLES, EXPENSE_CATEGORIES, normalizeCategory,
  advanceChargeDate, dayOf, isValidDay, monthBounds, toCents,
} from './finance-rules.mjs';

export { SUBSCRIPTION_CYCLES, EXPENSE_CATEGORIES };

// Error de validación con mensaje en español llano (los endpoints lo devuelven tal cual).
export class ExpenseError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ExpenseError';
    this.status = status;
  }
}

// Monto obligatorio y mayor que 0 (un gasto o una suscripción de $0 es un error de tecleo).
function positiveCents(v) {
  const n = toCents(v);
  if (n == null || n <= 0) throw new ExpenseError('El monto debe ser mayor que $0.');
  return n;
}

// Fecha DATE opcional: '' / null → null; inválida → error.
function dayField(v, label) {
  if (v === null || v === undefined || v === '') return null;
  const d = dayOf(v);
  if (!d || !isValidDay(d)) throw new ExpenseError(`La fecha de ${label} no es válida.`);
  return d;
}

function cleanText(v, max = 300) {
  const s = (v ?? '').toString().trim();
  return s ? s.slice(0, max) : null;
}

// ids son BIGINT (strings). Validamos formato y bindeamos directo.
function isValidId(id) {
  return typeof id === 'string' ? /^\d+$/.test(id) : (Number.isInteger(id) && id > 0);
}

// ════════════════════════════════════════════════════════════════
//  COMPANY EXPENSES — gastos puntuales del negocio
// ════════════════════════════════════════════════════════════════

const EXPENSE_COLS = 'id, label, category, amount_cents, spent_at, vendor, notes, created_at';

// WHERE parametrizado: month 'YYYY-MM' (por spent_at) y category (lista cerrada).
export function buildExpenseFilter(opts = {}) {
  const where = [];
  const params = [];
  const add = (frag, val) => { params.push(val); where.push(frag.replace('?', `$${params.length}`)); };
  const mb = monthBounds(opts.month);
  if (mb) { add('spent_at >= ?', mb.start); add('spent_at < ?', mb.end); }
  const cat = opts.category ? String(opts.category).toLowerCase() : '';
  if (cat && EXPENSE_CATEGORIES.some((c) => c.id === cat)) add('category = ?', cat);
  return { text: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

// Lista paginada con filtros (FIN-21). opts: { month, category, limit=100, offset=0 }
// Devuelve también la suma de TODO lo filtrado (no solo de la página).
export async function listExpenses(opts = {}) {
  const { limit = 100, offset = 0 } = opts;
  const lim = Math.min(Math.max(parseInt(limit) || 100, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);
  const f = buildExpenseFilter(opts);
  const n = f.params.length;

  const [r, t] = await Promise.all([
    sql.query(`SELECT ${EXPENSE_COLS} FROM company_expenses ${f.text}
                ORDER BY spent_at DESC, created_at DESC LIMIT $${n + 1} OFFSET $${n + 2}`, [...f.params, lim, off]),
    sql.query(`SELECT COUNT(*)::int AS n, COALESCE(SUM(amount_cents), 0)::bigint AS cents
                 FROM company_expenses ${f.text}`, f.params),
  ]);
  return { rows: r.rows, total: t.rows[0].n, total_cents: Number(t.rows[0].cents), limit: lim, offset: off };
}

export async function getExpense(id) {
  if (!isValidId(id)) return null;
  const r = await sql.query(`SELECT ${EXPENSE_COLS} FROM company_expenses WHERE id = $1 LIMIT 1`, [id]);
  return r.rowCount ? r.rows[0] : null;
}

// data: { label, category, amount_cents, spent_at, vendor, notes }
// Sin fecha = hoy EN HOUSTON (el DEFAULT CURRENT_DATE de la tabla es UTC: FIN-03).
export async function createExpense(data = {}) {
  const label = cleanText(data.label, 200);
  if (!label) throw new ExpenseError('Escribe el concepto del gasto.');
  const amount = positiveCents(data.amount_cents);
  const spentAt = dayField(data.spent_at, 'gasto') || houstonDate();

  const r = await sql`
    INSERT INTO company_expenses (label, category, amount_cents, spent_at, vendor, notes)
    VALUES (${label}, ${normalizeCategory(data.category)}, ${amount}, ${spentAt},
            ${cleanText(data.vendor, 200)}, ${cleanText(data.notes, 1000)})
    RETURNING id, label, category, amount_cents, spent_at, vendor, notes, created_at`;
  return r.rows[0];
}

const EXPENSE_EDITABLE_FIELDS = ['label', 'category', 'amount_cents', 'spent_at', 'vendor', 'notes'];

// Edición parcial de un gasto (FIN-10). SET dinámico parametrizado.
export async function updateExpense(id, fields) {
  if (!isValidId(id)) return null;
  if (!fields || typeof fields !== 'object') return getExpense(id);
  const set = [];
  const vals = [];
  const put = (col, v) => { vals.push(v); set.push(`${col} = $${vals.length}`); };
  for (const k of EXPENSE_EDITABLE_FIELDS) {
    if (!(k in fields)) continue;
    const v = fields[k];
    if (k === 'label') {
      const s = cleanText(v, 200);
      if (!s) throw new ExpenseError('Escribe el concepto del gasto.');
      put(k, s);
    } else if (k === 'amount_cents') put(k, positiveCents(v));
    else if (k === 'category') put(k, normalizeCategory(v));
    else if (k === 'spent_at') {
      const d = dayField(v, 'gasto');
      if (!d) throw new ExpenseError('Indica la fecha del gasto.');
      put(k, d);
    } else put(k, cleanText(v, k === 'notes' ? 1000 : 200));
  }
  if (!set.length) return getExpense(id);
  vals.push(id);
  const r = await sql.query(
    `UPDATE company_expenses SET ${set.join(', ')} WHERE id = $${vals.length} RETURNING ${EXPENSE_COLS}`, vals);
  return r.rowCount ? r.rows[0] : null;
}

export async function deleteExpense(id) {
  if (!isValidId(id)) return false;
  const r = await sql`DELETE FROM company_expenses WHERE id = ${id} RETURNING id`;
  return r.rowCount > 0;
}

// ════════════════════════════════════════════════════════════════
//  SUBSCRIPTIONS — SaaS recurrentes
// ════════════════════════════════════════════════════════════════

const SUB_COLS = 'id, name, category, amount_cents, cycle, next_charge_at, active, notes, created_at';

// "Próximo cargo" que avanza solo (FIN-10): la fecha guardada es el ancla; al
// leer se suma la periodicidad hasta hoy o después (hora de Houston). La
// guardada viaja en next_charge_anchor por si alguien la necesita.
export function withNextCharge(row, today = houstonDate()) {
  if (!row) return row;
  const anchor = dayOf(row.next_charge_at);
  return { ...row, next_charge_anchor: anchor, next_charge_at: advanceChargeDate(anchor, row.cycle, today) };
}

// Lista todas (activas e inactivas), activas primero.
export async function listSubscriptions() {
  const r = await sql`
    SELECT id, name, category, amount_cents, cycle, next_charge_at, active, notes, created_at
      FROM subscriptions
     ORDER BY active DESC, created_at DESC`;
  const today = houstonDate();
  return r.rows.map((row) => withNextCharge(row, today));
}

// data: { name, category, amount_cents, cycle, next_charge_at, active, notes }
export async function createSubscription(data = {}) {
  const name = cleanText(data.name, 120);
  if (!name) throw new ExpenseError('Escribe el nombre del servicio.');
  const amount = positiveCents(data.amount_cents);
  const cycle = SUBSCRIPTION_CYCLES.includes(data.cycle) ? data.cycle : 'monthly';
  const active = data.active === undefined ? true : !!data.active;

  const r = await sql`
    INSERT INTO subscriptions (name, category, amount_cents, cycle, next_charge_at, active, notes)
    VALUES (
      ${name},
      ${normalizeCategory(data.category)},
      ${amount},
      ${cycle},
      ${dayField(data.next_charge_at, 'próximo cargo')},
      ${active},
      ${cleanText(data.notes, 1000)}
    )
    RETURNING id, name, category, amount_cents, cycle, next_charge_at, active, notes, created_at`;
  return withNextCharge(r.rows[0]);
}

const SUB_EDITABLE_FIELDS = [
  'name', 'category', 'amount_cents', 'cycle', 'next_charge_at', 'active', 'notes',
];

// Update parcial (toggle active / editar campos). SET dinámico parametrizado.
export async function updateSubscription(id, fields) {
  if (!isValidId(id)) return null;
  if (!fields || typeof fields !== 'object') return getSubscription(id);
  const entries = Object.entries(fields).filter(([k]) => SUB_EDITABLE_FIELDS.includes(k));
  if (!entries.length) return getSubscription(id);

  const setParts = [];
  const values = [];
  for (const [col, raw] of entries) {
    let val = raw;
    if (col === 'cycle' && !SUBSCRIPTION_CYCLES.includes(val)) continue;
    if (col === 'amount_cents') val = positiveCents(val);
    if (col === 'active') val = !!val;
    if (col === 'category') val = normalizeCategory(val);
    if (col === 'next_charge_at') val = dayField(val, 'próximo cargo');
    if (col === 'notes') val = cleanText(val, 1000);
    if (col === 'name') {
      const s = cleanText(val, 120);
      if (!s) continue; // no permitir nombre vacío
      val = s;
    }
    if (val === '' || val === undefined) val = null;
    setParts.push(`${col} = $${values.length + 1}`);
    values.push(val);
  }
  if (!setParts.length) return getSubscription(id);
  values.push(id);
  const r = await sql.query(
    `UPDATE subscriptions SET ${setParts.join(', ')} WHERE id = $${values.length} RETURNING ${SUB_COLS}`, values);
  return r.rowCount ? withNextCharge(r.rows[0]) : null;
}

export async function getSubscription(id) {
  if (!isValidId(id)) return null;
  const r = await sql`
    SELECT id, name, category, amount_cents, cycle, next_charge_at, active, notes, created_at
      FROM subscriptions WHERE id = ${id} LIMIT 1`;
  return r.rowCount ? withNextCharge(r.rows[0]) : null;
}

export async function deleteSubscription(id) {
  if (!isValidId(id)) return false;
  const r = await sql`DELETE FROM subscriptions WHERE id = ${id} RETURNING id`;
  return r.rowCount > 0;
}

// ════════════════════════════════════════════════════════════════
//  EXTRAS — métricas para plegar en el summary de finanzas
// ════════════════════════════════════════════════════════════════

// Devuelve:
//   expenses_this_month_cents   — SUM(amount_cents) de gastos del mes actual (por spent_at, Houston)
//   subscriptions_monthly_cents — estimado mensual de subs ACTIVAS
//                                  (monthly→amount, yearly→round(amount/12))
//   subscriptions_active        — cuántas suscripciones activas hay
export async function financeExtras() {
  const exp = await sql`
    SELECT COALESCE(SUM(amount_cents), 0)::bigint AS cents
      FROM company_expenses
     WHERE spent_at >= date_trunc('month', (now() AT TIME ZONE 'America/Chicago')::date)`;

  const subs = await sql`
    SELECT COALESCE(SUM(
      CASE WHEN cycle = 'yearly' THEN ROUND(amount_cents / 12.0)
           ELSE amount_cents END
    ), 0)::bigint AS cents,
    COUNT(*)::int AS n
      FROM subscriptions
     WHERE active = true`;

  return {
    expenses_this_month_cents: Number(exp.rows[0].cents),
    subscriptions_monthly_cents: Number(subs.rows[0].cents),
    subscriptions_active: Number(subs.rows[0].n),
  };
}
