// ════════════════════════════════════════════════════════════════
//  lib/expenses.mjs — Helpers de queries para EGRESOS
//  company_expenses (gastos puntuales) + subscriptions (SaaS recurrentes).
//  Ver db/migrations/008_finance_expenses.sql.
//  TODO monto en CENTAVOS (BIGINT), USD. El formateo a dólares vive en la UI.
//  Patrón gemelo de lib/finance.mjs (template tags parametrizados).
//  ids de Postgres son BIGINT → strings; nunca parseInt en paths SQL.
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';

export const SUBSCRIPTION_CYCLES = ['monthly', 'yearly'];

const MAX_CENTS = 9999999999; // tope 99,999,999.99 USD (evita overflow BIGINT)

// Normaliza/clampa centavos a entero en [0, MAX_CENTS].
function clampCents(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_CENTS);
}

// ids son BIGINT (strings). Validamos formato y bindeamos directo.
function isValidId(id) {
  return typeof id === 'string' ? /^\d+$/.test(id) : (Number.isInteger(id) && id > 0);
}

// ════════════════════════════════════════════════════════════════
//  COMPANY EXPENSES — gastos puntuales del negocio
// ════════════════════════════════════════════════════════════════

// Lista paginada. opts: { limit=100, offset=0 }
export async function listExpenses(opts = {}) {
  const { limit = 100, offset = 0 } = opts;
  const lim = Math.min(Math.max(parseInt(limit) || 100, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);

  const r = await sql`
    SELECT id, label, category, amount_cents, spent_at, vendor, notes, created_at
      FROM company_expenses
     ORDER BY spent_at DESC, created_at DESC
     LIMIT ${lim} OFFSET ${off}`;
  const t = await sql`SELECT COUNT(*)::int AS n FROM company_expenses`;
  return { rows: r.rows, total: t.rows[0].n, limit: lim, offset: off };
}

// data: { label, category, amount_cents, spent_at, vendor, notes }
export async function createExpense(data = {}) {
  const label = (data.label || '').toString().trim();
  if (!label) throw new Error('label requerido');
  const amount = clampCents(data.amount_cents);
  const spentAt = data.spent_at || null; // si null, la columna usa DEFAULT CURRENT_DATE

  // Ramificamos para que un spent_at nulo caiga en el DEFAULT de la tabla
  // (no se puede embeber CURRENT_DATE como valor parametrizado).
  let r;
  if (spentAt) {
    r = await sql`
      INSERT INTO company_expenses (label, category, amount_cents, spent_at, vendor, notes)
      VALUES (${label}, ${data.category || null}, ${amount}, ${spentAt}, ${data.vendor || null}, ${data.notes || null})
      RETURNING id, label, category, amount_cents, spent_at, vendor, notes, created_at`;
  } else {
    r = await sql`
      INSERT INTO company_expenses (label, category, amount_cents, vendor, notes)
      VALUES (${label}, ${data.category || null}, ${amount}, ${data.vendor || null}, ${data.notes || null})
      RETURNING id, label, category, amount_cents, spent_at, vendor, notes, created_at`;
  }
  return r.rows[0];
}

export async function deleteExpense(id) {
  if (!isValidId(id)) return false;
  const r = await sql`DELETE FROM company_expenses WHERE id = ${id} RETURNING id`;
  return r.rowCount > 0;
}

// ════════════════════════════════════════════════════════════════
//  SUBSCRIPTIONS — SaaS recurrentes
// ════════════════════════════════════════════════════════════════

// Lista todas (activas e inactivas), activas primero.
export async function listSubscriptions() {
  const r = await sql`
    SELECT id, name, category, amount_cents, cycle, next_charge_at, active, notes, created_at
      FROM subscriptions
     ORDER BY active DESC, created_at DESC`;
  return r.rows;
}

// data: { name, category, amount_cents, cycle, next_charge_at, active, notes }
export async function createSubscription(data = {}) {
  const name = (data.name || '').toString().trim();
  if (!name) throw new Error('name requerido');
  const amount = clampCents(data.amount_cents);
  const cycle = SUBSCRIPTION_CYCLES.includes(data.cycle) ? data.cycle : 'monthly';
  const active = data.active === undefined ? true : !!data.active;

  const r = await sql`
    INSERT INTO subscriptions (name, category, amount_cents, cycle, next_charge_at, active, notes)
    VALUES (
      ${name},
      ${data.category || null},
      ${amount},
      ${cycle},
      ${data.next_charge_at || null},
      ${active},
      ${data.notes || null}
    )
    RETURNING id, name, category, amount_cents, cycle, next_charge_at, active, notes, created_at`;
  return r.rows[0];
}

const SUB_EDITABLE_FIELDS = [
  'name', 'category', 'amount_cents', 'cycle', 'next_charge_at', 'active', 'notes',
];

// Update parcial (toggle active / editar campos). Patrón de updateClient en lib/finance.mjs:
// SET dinámico parametrizado vía db.connect().
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
    if (col === 'amount_cents') val = clampCents(val);
    if (col === 'active') val = !!val;
    if (col === 'name') {
      const s = (val ?? '').toString().trim();
      if (!s) continue; // no permitir nombre vacío
      val = s;
    }
    if (val === '' || val === undefined) val = null;
    setParts.push(`${col} = $${values.length + 1}`);
    values.push(val);
  }
  if (!setParts.length) return getSubscription(id);
  values.push(id);
  const text = `UPDATE subscriptions SET ${setParts.join(', ')} WHERE id = $${values.length}
                RETURNING id, name, category, amount_cents, cycle, next_charge_at, active, notes, created_at`;

  const { db } = await import('@vercel/postgres');
  const client = await db.connect();
  try {
    const r = await client.query(text, values);
    return r.rowCount ? r.rows[0] : null;
  } finally {
    client.release();
  }
}

export async function getSubscription(id) {
  if (!isValidId(id)) return null;
  const r = await sql`
    SELECT id, name, category, amount_cents, cycle, next_charge_at, active, notes, created_at
      FROM subscriptions WHERE id = ${id} LIMIT 1`;
  return r.rowCount ? r.rows[0] : null;
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
//   expenses_this_month_cents   — SUM(amount_cents) de gastos del mes actual (por spent_at)
//   subscriptions_monthly_cents — run-rate mensual de subs ACTIVAS
//                                  (monthly→amount, yearly→round(amount/12))
export async function financeExtras() {
  const exp = await sql`
    SELECT COALESCE(SUM(amount_cents), 0)::bigint AS cents
      FROM company_expenses
     WHERE spent_at >= date_trunc('month', CURRENT_DATE)`;

  const subs = await sql`
    SELECT COALESCE(SUM(
      CASE WHEN cycle = 'yearly' THEN ROUND(amount_cents / 12.0)
           ELSE amount_cents END
    ), 0)::bigint AS cents
      FROM subscriptions
     WHERE active = true`;

  return {
    expenses_this_month_cents: Number(exp.rows[0].cents),
    subscriptions_monthly_cents: Number(subs.rows[0].cents),
  };
}
