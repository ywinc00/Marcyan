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
import { assertMonthOpen } from './finance-books.mjs';

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

const EXPENSE_COLS = 'id, label, category, amount_cents, spent_at, vendor, notes, created_at, updated_at, '
  + 'account_id, vendor_id, tax_line, business_pct, receipt_status, source, subscription_id, review_status';

// Campos de libro (migración 025). account_id / vendor_id: id o vacío.
function refId(v, what) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  if (!/^\d+$/.test(s)) throw new ExpenseError(`Ese ${what} no existe.`);
  return s;
}
function businessPct(v) {
  if (v === null || v === undefined || v === '') return 100;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 100) throw new ExpenseError('El uso de negocio va de 0 a 100 %.');
  return n;
}
// 'attached' solo lo pone la subida del recibo; a mano: sin recibo o «no hace falta».
function receiptStatus(v) {
  return v === 'not_required' ? 'not_required' : 'none';
}

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
    sql.query(`SELECT COUNT(*)::int AS n,
                      COALESCE(SUM(amount_cents) FILTER (WHERE review_status = 'ok'), 0)::bigint AS cents,
                      COUNT(*) FILTER (WHERE review_status = 'pending')::int AS pending
                 FROM company_expenses ${f.text}`, f.params),
  ]);
  // La suma solo cuenta lo revisado; lo importado pendiente se cuenta aparte.
  return {
    rows: r.rows, total: t.rows[0].n, total_cents: Number(t.rows[0].cents),
    pending: Number(t.rows[0].pending || 0), limit: lim, offset: off,
  };
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
  await assertMonthOpen(spentAt, 'ese gasto');

  const subId = refId(data.subscription_id, 'suscripción');
  const r = await sql.query(
    `INSERT INTO company_expenses (label, category, amount_cents, spent_at, vendor, notes,
                                   account_id, vendor_id, business_pct, receipt_status, subscription_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING ${EXPENSE_COLS}`,
    [label, normalizeCategory(data.category), amount, spentAt, cleanText(data.vendor, 200), cleanText(data.notes, 1000),
     refId(data.account_id, 'cuenta'), refId(data.vendor_id, 'proveedor'), businessPct(data.business_pct), receiptStatus(data.receipt_status), subId]);
  if (subId) await replaceSubscriptionEstimate(subId, spentAt, r.rows[0].id);
  return r.rows[0];
}

// El cargo real de una suscripción (factura, recibo, movimiento del banco) SUSTITUYE al
// estimado «por confirmar» que el cron apuntó en ese mismo periodo (±20 días). El
// estimado se borra y su clave queda suprimida para que el cron no lo vuelva a crear.
// Los meses cerrados no se tocan.
export async function replaceSubscriptionEstimate(subId, date, keepId = null) {
  if (!subId || !date) return 0;
  const r = await sql.query(
    `WITH gone AS (
       DELETE FROM company_expenses e
        WHERE e.subscription_id = $1 AND e.source = 'subscription' AND e.review_status = 'pending'
          AND ($3::bigint IS NULL OR e.id <> $3::bigint)
          AND e.spent_at BETWEEN $2::date - 20 AND $2::date + 20
          AND NOT EXISTS (SELECT 1 FROM finance_months m
                           WHERE m.month = date_trunc('month', e.spent_at)::date AND m.status = 'closed')
        RETURNING e.source_ref)
     INSERT INTO finance_suppressed_refs (source_ref)
     SELECT source_ref FROM gone WHERE source_ref IS NOT NULL
     ON CONFLICT DO NOTHING
     RETURNING source_ref`,
    [subId, date, keepId]);
  return r.rowCount;
}

const EXPENSE_EDITABLE_FIELDS = [
  'label', 'category', 'amount_cents', 'spent_at', 'vendor', 'notes',
  'account_id', 'vendor_id', 'business_pct', 'receipt_status', 'review_status',
];

// Edición parcial de un gasto (FIN-10). SET dinámico parametrizado.
export async function updateExpense(id, fields) {
  if (!isValidId(id)) return null;
  if (!fields || typeof fields !== 'object') return getExpense(id);
  const cur = await getExpense(id);
  if (!cur) return null;
  await assertMonthOpen(cur.spent_at, 'ese gasto');
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
      await assertMonthOpen(d, 'la nueva fecha');
      put(k, d);
    } else if (k === 'account_id') put(k, refId(v, 'cuenta'));
    else if (k === 'vendor_id') put(k, refId(v, 'proveedor'));
    else if (k === 'business_pct') put(k, businessPct(v));
    else if (k === 'receipt_status') {
      // Con recibo subido no se puede pasar a «sin recibo» a mano (se borra el recibo).
      if (cur.receipt_status !== 'attached') put(k, receiptStatus(v));
    } else if (k === 'review_status') put(k, v === 'pending' ? 'pending' : 'ok');
    else put(k, cleanText(v, k === 'notes' ? 1000 : 200));
  }
  if (!set.length) return getExpense(id);
  set.push('updated_at = NOW()');
  vals.push(id);
  const r = await sql.query(
    `UPDATE company_expenses SET ${set.join(', ')} WHERE id = $${vals.length} RETURNING ${EXPENSE_COLS}`, vals);
  return r.rowCount ? r.rows[0] : null;
}

// Un movimiento automático borrado (cargo de suscripción, fila importada) deja su
// clave en finance_suppressed_refs para que el cron o la importación no lo recreen.
export async function deleteExpense(id, by = null) {
  if (!isValidId(id)) return false;
  const cur = await sql`SELECT spent_at, source_ref FROM company_expenses WHERE id = ${id} LIMIT 1`;
  if (!cur.rowCount) return false;
  await assertMonthOpen(cur.rows[0].spent_at, 'ese gasto');
  if (cur.rows[0].source_ref) {
    await sql`INSERT INTO finance_suppressed_refs (source_ref, created_by)
              VALUES (${cur.rows[0].source_ref}, ${by}) ON CONFLICT (source_ref) DO NOTHING`;
  }
  const r = await sql`DELETE FROM company_expenses WHERE id = ${id} RETURNING id`;
  return r.rowCount > 0;
}

// ════════════════════════════════════════════════════════════════
//  SUBSCRIPTIONS — SaaS recurrentes
// ════════════════════════════════════════════════════════════════

const SUB_COLS = 'id, name, category, amount_cents, cycle, next_charge_at, active, notes, created_at, started_at, ended_at, account_id, '
  + 'billing, intro_amount_cents, intro_until';
export const SUBSCRIPTION_BILLING = ['fixed', 'variable'];

// Precio de entrada: monto (0 = gratis) y hasta cuándo. Los dos o ninguno.
function introFields(data, started) {
  const has = (k) => k in data && data[k] !== '' && data[k] !== null && data[k] !== undefined;
  if (!has('intro_until') && !has('intro_amount_cents')) return null;
  if (has('intro_until') !== has('intro_amount_cents')) throw new ExpenseError('El precio de entrada lleva monto y fecha de fin.');
  const until = dayField(data.intro_until, 'fin del precio de entrada');
  const cents = Number(data.intro_amount_cents);
  if (!Number.isInteger(cents) || cents < 0) throw new ExpenseError('El precio de entrada no es válido.');
  if (started && until <= started) throw new ExpenseError('El precio de entrada tiene que acabar después del alta.');
  return { intro_until: until, intro_amount_cents: cents };
}

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
  const r = await sql.query(`SELECT ${SUB_COLS} FROM subscriptions ORDER BY active DESC, created_at DESC`);
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
  // Alta: desde cuándo se paga (puede ser anterior a hoy: los cargos pasados se
  // registran solos en los meses abiertos). Pausada al crearla: baja = alta.
  const startedAt = dayField(data.started_at, 'alta') || houstonDate();
  const billing = SUBSCRIPTION_BILLING.includes(data.billing) ? data.billing : 'fixed';
  const intro = introFields(data, startedAt);

  const r = await sql.query(
    `INSERT INTO subscriptions (name, category, amount_cents, cycle, next_charge_at, active, notes, started_at, ended_at, account_id,
                                billing, intro_amount_cents, intro_until)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING ${SUB_COLS}`,
    [name, normalizeCategory(data.category), amount, cycle, dayField(data.next_charge_at, 'próximo cargo'), active,
     cleanText(data.notes, 1000), startedAt, active ? null : startedAt, refId(data.account_id, 'cuenta'),
     billing, intro ? intro.intro_amount_cents : null, intro ? intro.intro_until : null]);
  return withNextCharge(r.rows[0]);
}

const SUB_EDITABLE_FIELDS = [
  'name', 'category', 'amount_cents', 'cycle', 'next_charge_at', 'active', 'notes',
  'started_at', 'ended_at', 'account_id', 'billing', 'intro_amount_cents', 'intro_until',
];

// Update parcial (toggle active / editar campos). SET dinámico parametrizado.
export async function updateSubscription(id, fields) {
  if (!isValidId(id)) return null;
  if (!fields || typeof fields !== 'object') return getSubscription(id);
  const entries = Object.entries(fields).filter(([k]) => SUB_EDITABLE_FIELDS.includes(k));
  if (!entries.length) return getSubscription(id);
  const cur = await getSubscription(id);
  if (!cur) return null;
  const today = houstonDate();
  // Pausar pone la baja (hoy) y reactivar abre un alta nueva: los cargos pasados
  // quedan como estaban y el hueco entre medias no genera cargos.
  // Reactivar abre siempre un alta nueva, también si se pausó antes de la migración 025
  // (sin baja guardada): si no, el cron inventaría los cargos del tiempo en pausa.
  if ('active' in fields && !!fields.active !== !!cur.active) {
    if (!fields.active && !('ended_at' in fields)) entries.push(['ended_at', today]);
    if (fields.active && !('started_at' in fields)) entries.push(['started_at', today]);
    if (fields.active && !('ended_at' in fields)) entries.push(['ended_at', null]);
  }
  // Cambiar el día de cobro o el ciclo vale desde hoy: los cargos ya registrados no se
  // recalculan hacia atrás (si no, cada cambio duplicaría el historial).
  const changed = (k, v) => k in fields && v !== null && v !== undefined && String(v) !== String(cur[k] ?? '');
  const newAnchor = 'next_charge_at' in fields ? dayField(fields.next_charge_at, 'próximo cargo') : null;
  if ((changed('next_charge_at', newAnchor) || (SUBSCRIPTION_CYCLES.includes(fields.cycle) && changed('cycle', fields.cycle)))
      && !('started_at' in fields) && !entries.some(([k]) => k === 'started_at')
      && (!dayOf(cur.started_at) || dayOf(cur.started_at) < today)) {
    entries.push(['started_at', today]);
  }
  // La baja nunca antes del alta: se comprueba ANTES de escribir.
  const pick = (k) => { const e = entries.filter(([c]) => c === k).pop(); return e ? dayOf(e[1]) : dayOf(cur[k]); };
  const effStart = pick('started_at');
  const effEnd = pick('ended_at');
  if (effStart && effEnd && effEnd < effStart) throw new ExpenseError('La baja no puede ser anterior al alta.');
  // Precio de entrada: se valida junto (monto y fecha); vacío en los dos = quitarlo.
  if ('intro_until' in fields || 'intro_amount_cents' in fields) {
    const both = { intro_until: fields.intro_until ?? cur.intro_until, intro_amount_cents: fields.intro_amount_cents ?? cur.intro_amount_cents };
    const cleared = (fields.intro_until === '' || fields.intro_until === null) && (fields.intro_amount_cents === '' || fields.intro_amount_cents === null);
    const intro = cleared ? null : introFields(both, effStart);
    for (let i = entries.length - 1; i >= 0; i--) if (entries[i][0] === 'intro_until' || entries[i][0] === 'intro_amount_cents') entries.splice(i, 1);
    entries.push(['intro_until', intro ? intro.intro_until : null], ['intro_amount_cents', intro ? intro.intro_amount_cents : null]);
  }

  const setParts = [];
  const values = [];
  for (const [col, raw] of entries) {
    let val = raw;
    if (col === 'cycle' && !SUBSCRIPTION_CYCLES.includes(val)) continue;
    if (col === 'amount_cents') val = positiveCents(val);
    if (col === 'active') val = !!val;
    if (col === 'category') val = normalizeCategory(val);
    if (col === 'next_charge_at') val = dayField(val, 'próximo cargo');
    if (col === 'started_at') { val = dayField(val, 'alta'); if (!val) continue; }
    if (col === 'ended_at') val = dayField(val, 'baja');
    if (col === 'account_id') val = refId(val, 'cuenta');
    if (col === 'notes') val = cleanText(val, 1000);
    if (col === 'billing') { if (!SUBSCRIPTION_BILLING.includes(val)) continue; }
    if (col === 'intro_until' || col === 'intro_amount_cents') { setParts.push(`${col} = $${values.length + 1}`); values.push(val); continue; }
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
  if (!r.rowCount) return null;
  const row = r.rows[0];
  // Solo si el dueño movió el alta o la baja a mano: los cargos que quedan fuera no se cobraron.
  const oldStart = dayOf(cur.started_at);
  const newStart = dayOf(row.started_at);
  if ('started_at' in fields && oldStart && newStart > oldStart) await pruneSubscriptionCharges(row.id, oldStart, newStart);
  if ('ended_at' in fields && row.ended_at) await pruneSubscriptionCharges(row.id, dayOf(row.ended_at), null, true);
  return withNextCharge(row);
}

// Quita cargos generados que ya no tocan, en meses abiertos (los cerrados no se tocan):
//   [from, to)  al retrasar el alta  ·  (from, ∞) al adelantar la baja (afterOnly).
async function pruneSubscriptionCharges(subId, from, to, afterOnly = false) {
  await sql.query(
    `DELETE FROM company_expenses e
      WHERE e.subscription_id = $1 AND e.source = 'subscription'
        AND (CASE WHEN $4::boolean THEN e.spent_at > $2::date ELSE e.spent_at >= $2::date AND e.spent_at < $3::date END)
        AND NOT EXISTS (SELECT 1 FROM finance_months m
                         WHERE m.month = date_trunc('month', e.spent_at)::date AND m.status = 'closed')`,
    [subId, from, to, afterOnly]);
}

export async function getSubscription(id) {
  if (!isValidId(id)) return null;
  const r = await sql.query(`SELECT ${SUB_COLS} FROM subscriptions WHERE id = $1 LIMIT 1`, [id]);
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
    SELECT COALESCE(SUM(amount_cents) FILTER (WHERE review_status = 'ok'), 0)::bigint AS cents,
           COUNT(*) FILTER (WHERE review_status = 'ok' AND subscription_id IS NOT NULL)::int AS sub_charges,
           COUNT(*) FILTER (WHERE review_status = 'pending')::int AS pending
      FROM company_expenses
     WHERE spent_at >= date_trunc('month', (now() AT TIME ZONE 'America/Chicago')::date)
       AND spent_at <  date_trunc('month', (now() AT TIME ZONE 'America/Chicago')::date) + INTERVAL '1 month'`;

  const subs = await sql`
    SELECT COALESCE(SUM(
      CASE WHEN cycle = 'yearly' THEN ROUND(amount_cents / 12.0)
           ELSE amount_cents END
    ), 0)::bigint AS cents,
    COUNT(*)::int AS n
      FROM subscriptions
     WHERE active = true`;

  return {
    expenses_this_month_cents: Number(exp.rows[0].cents),   // lo importado sin revisar no cuenta hasta aceptarlo
    subscription_charges_this_month: Number(exp.rows[0].sub_charges || 0),
    expenses_pending_this_month: Number(exp.rows[0].pending || 0),
    subscriptions_monthly_cents: Number(subs.rows[0].cents),
    subscriptions_active: Number(subs.rows[0].n),
  };
}
