// ════════════════════════════════════════════════════════════════
//  lib/finance-import.mjs — Importar extractos y revisar lo importado (fase 1)
//
//  Lo importado entra como PENDIENTE de revisar: no cuenta en los libros hasta que
//  el dueño lo acepta, y el mes no se puede cerrar con pendientes. Sale (−) → gasto;
//  entra (+) → ingreso por revisar (puede ser el cobro de una factura ya apuntada,
//  un traspaso entre cuentas o un ingreso sin factura).
//  Idempotente: cada fila lleva una clave estable; reimportar el mismo archivo no
//  duplica, y lo que el dueño descartó no vuelve (finance_suppressed_refs).
//  Reglas puras (CSV, fechas, montos, claves) en lib/finance-import-rules.mjs.
// ════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import { sql } from '@vercel/postgres';
import { dayOf, isValidDay, normalizeCategory } from './finance-rules.mjs';
import { INCOME_CATEGORIES } from './finance-tax.mjs';
import { BooksError, assertMonthOpen } from './finance-books.mjs';
import { IMPORT_MAX_ROWS, guessCategory, guessVendor, importKeys } from './finance-import-rules.mjs';

const sha = (s) => createHash('sha256').update(s).digest('hex');
const isId = (v) => /^\d{1,18}$/.test(String(v ?? ''));
const MAX_CENTS = 100_000_000_00; // 100 millones USD: más es un error de columna

/** Vuelve a validar en el servidor las filas que manda el panel. */
export function validateImportRows(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new BooksError('El archivo no tiene movimientos que importar.');
  if (rows.length > IMPORT_MAX_ROWS) throw new BooksError(`Como mucho ${IMPORT_MAX_ROWS} movimientos por archivo: pártelo en meses.`);
  return rows.map((r, i) => {
    const date = dayOf(r?.date);
    const amount = Number(r?.amount_cents);
    const fee = Number(r?.fee_cents || 0);
    const description = String(r?.description || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200);
    if (!date || !isValidDay(date) || !Number.isInteger(amount) || amount === 0 || Math.abs(amount) > MAX_CENTS
        || !Number.isInteger(fee) || fee < 0 || fee > Math.abs(amount) || !description) {
      throw new BooksError(`La fila ${i + 1} no es válida. Revisa las columnas elegidas.`);
    }
    return { date, amount_cents: amount, fee_cents: amount > 0 ? fee : 0, description, ref: String(r?.ref || '').slice(0, 120) };
  });
}

/**
 * Importa filas ya normalizadas a una cuenta. Devuelve el recuento:
 * { total, created_expenses, created_income, existing, suppressed, closed }.
 */
export async function importRows({ accountId, filename = null, rows, by = null }) {
  if (!isId(accountId)) throw new BooksError('Elige a qué cuenta pertenece el extracto.');
  const acc = await sql.query(`SELECT id, kind FROM finance_accounts WHERE id = $1`, [accountId]);
  if (!acc.rowCount) throw new BooksError('Esa cuenta no existe.', 404);
  const clean = validateImportRows(rows);
  const keys = importKeys(String(accountId), clean, sha);

  const closed = new Set((await sql.query(
    `SELECT to_char(month, 'YYYY-MM') AS m FROM finance_months WHERE status = 'closed'`)).rows.map((r) => r.m));
  const suppressed = new Set((await sql.query(
    `SELECT source_ref FROM finance_suppressed_refs WHERE source_ref = ANY($1::text[])`, [keys])).rows.map((r) => r.source_ref));

  const exp = [];
  const inc = [];
  let closedCount = 0;
  clean.forEach((r, i) => {
    if (suppressed.has(keys[i])) return;
    if (closed.has(r.date.slice(0, 7))) { closedCount++; return; }
    (r.amount_cents < 0 ? exp : inc).push({ ...r, key: keys[i] });
  });

  // Categoría aprendida: la última que el dueño dio a ese proveedor.
  const vendors = [...new Set(exp.map((r) => (guessVendor(r.description) || '').toLowerCase()).filter(Boolean))];
  const learned = new Map();
  if (vendors.length) {
    const lr = await sql.query(
      `SELECT DISTINCT ON (lower(vendor)) lower(vendor) AS v, category FROM company_expenses
        WHERE lower(vendor) = ANY($1::text[]) AND review_status = 'ok' AND category IS NOT NULL
        ORDER BY lower(vendor), spent_at DESC`, [vendors]);
    for (const row of lr.rows) learned.set(row.v, row.category);
  }

  let createdExp = 0;
  let createdInc = 0;
  if (exp.length) {
    const vendorOf = exp.map((r) => guessVendor(r.description));
    const r = await sql.query(
      `INSERT INTO company_expenses (label, vendor, category, amount_cents, spent_at, account_id, source, source_ref, review_status)
       SELECT t.label, t.vendor, t.category, t.cents, t.day, $7::bigint, 'import', t.ref, 'pending'
         FROM unnest($1::text[], $2::text[], $3::text[], $4::bigint[], $5::date[], $6::text[])
              AS t(label, vendor, category, cents, day, ref)
       ON CONFLICT (source_ref) WHERE source_ref IS NOT NULL DO NOTHING
       RETURNING id`,
      [exp.map((x) => x.description), vendorOf,
       exp.map((x, i) => learned.get((vendorOf[i] || '').toLowerCase()) || guessCategory(x.description)),
       exp.map((x) => -x.amount_cents), exp.map((x) => x.date), exp.map((x) => x.key), accountId]);
    createdExp = r.rowCount;
  }
  if (inc.length) {
    const r = await sql.query(
      `INSERT INTO income_entries (label, category, amount_cents, fee_cents, received_at, account_id, source, source_ref, review_status)
       SELECT t.label, 'servicios', t.cents, t.fee, t.day, $6::bigint, 'import', t.ref, 'pending'
         FROM unnest($1::text[], $2::bigint[], $3::bigint[], $4::date[], $5::text[]) AS t(label, cents, fee, day, ref)
       ON CONFLICT (source_ref) WHERE source_ref IS NOT NULL DO NOTHING
       RETURNING id`,
      [inc.map((x) => x.description), inc.map((x) => x.amount_cents), inc.map((x) => x.fee_cents),
       inc.map((x) => x.date), inc.map((x) => x.key), accountId]);
    createdInc = r.rowCount;
  }
  const out = {
    total: clean.length,
    created_expenses: createdExp,
    created_income: createdInc,
    existing: exp.length + inc.length - createdExp - createdInc,
    suppressed: suppressed.size,
    closed: closedCount,
  };
  await sql.query(
    `INSERT INTO finance_imports (account_id, filename, rows_total, rows_new, imported_by) VALUES ($1, $2, $3, $4, $5)`,
    [accountId, filename ? String(filename).slice(0, 200) : null, out.total, createdExp + createdInc, by]);
  return out;
}

// ════════════════════════════════════════════════════════════════
//  Revisión de lo importado
// ════════════════════════════════════════════════════════════════
/** Pendientes con sugerencias: cobro de factura con el mismo importe (±7 días) o cargo de suscripción (±5 días). */
export async function listPending() {
  const [exp, inc] = await Promise.all([
    sql.query(`SELECT e.id, e.label, e.vendor, e.category, e.amount_cents, e.spent_at, e.account_id, a.name AS account_name,
                      (SELECT json_agg(json_build_object('id', c.id, 'subscription_id', c.subscription_id, 'name', s.name, 'date', c.spent_at))
                         FROM company_expenses c JOIN subscriptions s ON s.id = c.subscription_id
                        WHERE c.source = 'subscription' AND c.amount_cents = e.amount_cents
                          AND c.spent_at BETWEEN e.spent_at - 5 AND e.spent_at + 5) AS subscription_matches
                 FROM company_expenses e LEFT JOIN finance_accounts a ON a.id = e.account_id
                WHERE e.review_status = 'pending' ORDER BY e.spent_at, e.id LIMIT 500`),
    sql.query(`SELECT n.id, n.label, n.amount_cents, n.fee_cents, n.received_at, n.account_id, a.name AS account_name,
                      (SELECT json_agg(json_build_object('id', p.id, 'invoice_number', i.invoice_number, 'date', p.paid_at,
                                                         'client', COALESCE(c.business_name, c.owner_name)))
                         FROM payments p JOIN invoices i ON i.id = p.invoice_id LEFT JOIN clients c ON c.id = p.client_id
                        WHERE p.paid_at BETWEEN n.received_at - 7 AND n.received_at + 7
                          AND (p.amount_cents = n.amount_cents OR p.amount_cents - p.fee_cents = n.amount_cents)) AS payment_matches
                 FROM income_entries n LEFT JOIN finance_accounts a ON a.id = n.account_id
                WHERE n.review_status = 'pending' ORDER BY n.received_at, n.id LIMIT 500`),
  ]);
  return { expenses: exp.rows, income: inc.rows };
}

async function suppress(ref, by) {
  if (!ref) return;
  await sql.query(`INSERT INTO finance_suppressed_refs (source_ref, created_by) VALUES ($1, $2) ON CONFLICT (source_ref) DO NOTHING`, [ref, by]);
}

/**
 * Resuelve un gasto importado:
 *   accept        → { category, vendor_id?, business_pct?, label? } cuenta en los libros
 *   subscription  → { subscription_id } es el cargo real de esa suscripción: sustituye al
 *                   cargo automático de esas fechas (que se descarta) y queda aceptado
 *   ignore        → no es un gasto (traspaso entre cuentas, pago de la tarjeta…): se descarta
 */
export async function resolveExpense(id, action, data = {}, by = null) {
  if (!isId(id)) throw new BooksError('Ese movimiento no existe.', 404);
  const cur = await sql.query(`SELECT id, spent_at, amount_cents, source_ref, review_status FROM company_expenses WHERE id = $1`, [id]);
  if (!cur.rowCount) throw new BooksError('Ese movimiento no existe.', 404);
  const row = cur.rows[0];
  await assertMonthOpen(row.spent_at, 'ese movimiento');
  if (action === 'ignore') {
    await suppress(row.source_ref, by);
    await sql.query(`DELETE FROM company_expenses WHERE id = $1`, [id]);
    return { ignored: String(id) };
  }
  if (action === 'subscription') {
    if (!isId(data.subscription_id)) throw new BooksError('Elige la suscripción.');
    const gen = await sql.query(
      `SELECT id, source_ref FROM company_expenses
        WHERE source = 'subscription' AND subscription_id = $1 AND spent_at BETWEEN $2::date - 5 AND $2::date + 5
        ORDER BY abs(spent_at - $2::date) LIMIT 1`, [data.subscription_id, dayOf(row.spent_at)]);
    if (gen.rowCount) {
      await suppress(gen.rows[0].source_ref, by);
      await sql.query(`DELETE FROM company_expenses WHERE id = $1`, [gen.rows[0].id]);
    }
    const s = await sql.query(`SELECT name, category FROM subscriptions WHERE id = $1`, [data.subscription_id]);
    if (!s.rowCount) throw new BooksError('Esa suscripción no existe.', 404);
    const r = await sql.query(
      `UPDATE company_expenses SET subscription_id = $1, category = COALESCE(category, $2), vendor = COALESCE(vendor, $3),
              review_status = 'ok', receipt_status = CASE WHEN receipt_status = 'none' THEN 'not_required' ELSE receipt_status END,
              updated_at = NOW()
        WHERE id = $4 RETURNING *`, [data.subscription_id, s.rows[0].category || 'software', s.rows[0].name, id]);
    return { expense: r.rows[0], replaced: gen.rows[0] ? String(gen.rows[0].id) : null };
  }
  if (action === 'accept') {
    const category = normalizeCategory(data.category);
    if (!category) throw new BooksError('Elige la categoría del gasto.');
    const pct = data.business_pct === undefined || data.business_pct === '' ? 100 : Number(data.business_pct);
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) throw new BooksError('El uso de negocio va de 0 a 100 %.');
    const label = data.label ? String(data.label).trim().slice(0, 200) : null;
    const r = await sql.query(
      `UPDATE company_expenses SET category = $1, business_pct = $2, vendor_id = $3, label = COALESCE($4, label),
              review_status = 'ok', updated_at = NOW()
        WHERE id = $5 RETURNING *`, [category, pct, isId(data.vendor_id) ? String(data.vendor_id) : null, label, id]);
    return { expense: r.rows[0] };
  }
  throw new BooksError('Acción desconocida.');
}

/**
 * Resuelve un ingreso importado:
 *   accept   → { category, client_id? } ingreso sin factura (intereses, venta suelta…)
 *   payment  → { payment_id } es el cobro de una factura ya apuntada: se descarta la
 *              línea del extracto y el cobro toma la cuenta y la comisión si no las tenía
 *   ignore   → no es ingreso (traspaso entre cuentas, aporte del dueño, préstamo): se descarta
 */
export async function resolveIncome(id, action, data = {}, by = null) {
  if (!isId(id)) throw new BooksError('Ese movimiento no existe.', 404);
  const cur = await sql.query(`SELECT id, received_at, amount_cents, fee_cents, account_id, source_ref FROM income_entries WHERE id = $1`, [id]);
  if (!cur.rowCount) throw new BooksError('Ese movimiento no existe.', 404);
  const row = cur.rows[0];
  await assertMonthOpen(row.received_at, 'ese movimiento');
  if (action === 'ignore' || action === 'payment') {
    if (action === 'payment') {
      if (!isId(data.payment_id)) throw new BooksError('Elige el cobro de la factura.');
      const p = await sql.query(
        `UPDATE payments SET account_id = COALESCE(account_id, $1),
                fee_cents = CASE WHEN fee_cents = 0 THEN $2 ELSE fee_cents END
          WHERE id = $3 RETURNING id`, [row.account_id, Number(row.fee_cents) || 0, data.payment_id]);
      if (!p.rowCount) throw new BooksError('Ese cobro no existe.', 404);
    }
    await suppress(row.source_ref, by);
    await sql.query(`DELETE FROM income_entries WHERE id = $1`, [id]);
    return { removed: String(id) };
  }
  if (action === 'accept') {
    const ids = INCOME_CATEGORIES.map((c) => c.id);
    const category = ids.includes(data.category) ? data.category : 'servicios';
    const r = await sql.query(
      `UPDATE income_entries SET category = $1, client_id = $2, review_status = 'ok' WHERE id = $3 RETURNING *`,
      [category, isId(data.client_id) ? String(data.client_id) : null, id]);
    return { income: r.rows[0] };
  }
  throw new BooksError('Acción desconocida.');
}
