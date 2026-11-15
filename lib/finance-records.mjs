// ════════════════════════════════════════════════════════════════
//  lib/finance-records.mjs — Registros pequeños de los libros (fase 1, migración 025)
//    cuentas · proveedores y contratistas · devoluciones · ingresos sin factura ·
//    pagos estimados de impuestos · millaje
//  Montos en CENTAVOS (BIGINT) USD; fechas 'YYYY-MM-DD' (Houston). ids BIGINT → string.
//  Lo que cae en un mes cerrado no se crea, edita ni borra (assertMonthOpen).
//  Nunca se guarda el número fiscal (SSN/EIN) ni números de cuenta: solo nombres y estados.
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';
import { houstonDate } from './dates.mjs';
import { dayOf, formatUsd, isValidDay, toCents } from './finance-rules.mjs';
import { INCOME_CATEGORIES } from './finance-tax.mjs';
import { BooksError, assertMonthOpen } from './finance-books.mjs';

export const ACCOUNT_KINDS = ['bank', 'stripe', 'paypal', 'revolut', 'card', 'cash', 'other'];
export const ENTITY_TYPES = ['individual', 'llc', 'partnership', 'corporation', 'unknown'];
export const W9_STATUSES = ['missing', 'on_file', 'not_required'];
const INCOME_IDS = INCOME_CATEGORIES.map((c) => c.id);

// ── Validadores (mensajes en español llano: el panel los muestra tal cual) ──
const text = (v, max = 200) => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  return s || null;
};
const isId = (v) => /^\d{1,18}$/.test(String(v ?? ''));
function optId(v, what) {
  if (v === null || v === undefined || v === '') return null;
  if (!isId(v)) throw new BooksError(`Ese ${what} no existe.`);
  return String(v);
}
function money(v, what = 'El monto') {
  const n = toCents(v);
  if (n == null || n <= 0) throw new BooksError(`${what} debe ser mayor que $0.`);
  return n;
}
function day(v, what, { required = false } = {}) {
  if (v === null || v === undefined || v === '') {
    if (required) throw new BooksError(`Indica la fecha de ${what}.`);
    return houstonDate();
  }
  const d = dayOf(v);
  if (!d || !isValidDay(d)) throw new BooksError(`La fecha de ${what} no es válida.`);
  return d;
}
function yearRange(year) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new BooksError('Año no válido.');
  return [`${y}-01-01`, `${y + 1}-01-01`];
}
const pick = (v, list, fallback) => (list.includes(v) ? v : fallback);
// Edición parcial: aplica solo los campos permitidos que vienen en `fields`.
async function patchRow(table, id, fields, map) {
  const set = [];
  const vals = [];
  for (const [k, fn] of Object.entries(map)) {
    if (!(k in fields)) continue;
    vals.push(await fn(fields[k]));
    set.push(`${k} = $${vals.length}`);
  }
  if (!set.length) return null;
  vals.push(id);
  const r = await sql.query(`UPDATE ${table} SET ${set.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
  return r.rows[0] || null;
}

// ════════════════════════════════════════════════════════════════
//  Cuentas (banco, Stripe, PayPal, Revolut, tarjeta, efectivo)
// ════════════════════════════════════════════════════════════════
export async function listAccounts() {
  const r = await sql.query(`SELECT id, name, kind, active, notes FROM finance_accounts ORDER BY active DESC, id`);
  return r.rows;
}
export async function createAccount(data = {}) {
  const name = text(data.name, 80);
  if (!name) throw new BooksError('Escribe el nombre de la cuenta.');
  if (/\d{6,}/.test(name)) throw new BooksError('No pongas números de cuenta: basta con un nombre, como «Banco» o «Tarjeta».');
  try {
    const notes = text(data.notes, 300);
    if (notes && /\d{6,}/.test(notes.replace(/[\s-]/g, ''))) throw new BooksError('No pongas números de cuenta ni de tarjeta en las notas.');
    const r = await sql.query(
      `INSERT INTO finance_accounts (name, kind, notes) VALUES ($1, $2, $3) RETURNING id, name, kind, active, notes`,
      [name, pick(data.kind, ACCOUNT_KINDS, 'other'), notes]);
    return r.rows[0];
  } catch (err) {
    if (err && err.code === '23505') throw new BooksError('Ya hay una cuenta con ese nombre.', 409);
    throw err;
  }
}
export async function updateAccount(id, fields = {}) {
  if (!isId(id)) return null;
  return patchRow('finance_accounts', id, fields, {
    name: (v) => {
      const s = text(v, 80);
      if (!s) throw new BooksError('Escribe el nombre de la cuenta.');
      if (/\d{6,}/.test(s)) throw new BooksError('No pongas números de cuenta: basta con un nombre.');
      return s;
    },
    kind: (v) => pick(v, ACCOUNT_KINDS, 'other'),
    active: (v) => !!v,
    notes: (v) => {
      const s = text(v, 300);
      if (s && /\d{6,}/.test(s.replace(/[\s-]/g, ''))) throw new BooksError('No pongas números de cuenta ni de tarjeta en las notas.');
      return s;
    },
  });
}

// ════════════════════════════════════════════════════════════════
//  Proveedores y contratistas (lista de 1099)
// ════════════════════════════════════════════════════════════════
export async function listVendors(year = Number(houstonDate().slice(0, 4))) {
  const [from, to] = yearRange(year);
  const r = await sql.query(
    `SELECT v.id, v.name, v.is_contractor, v.entity_type, v.w9_status, v.email, v.notes,
            COALESCE(SUM(e.amount_cents) FILTER (WHERE e.spent_at >= $1 AND e.spent_at < $2), 0)::bigint AS year_cents,
            COUNT(e.id)::int AS expenses_total
       FROM finance_vendors v LEFT JOIN company_expenses e ON e.vendor_id = v.id
      GROUP BY v.id ORDER BY v.is_contractor DESC, lower(v.name)`, [from, to]);
  return r.rows.map((row) => ({ ...row, year_cents: Number(row.year_cents) }));
}
function looksLikeTaxId(s) {
  return /\b\d{3}-?\d{2}-?\d{4}\b/.test(s) || /\b\d{2}-?\d{7}\b/.test(s);
}
export async function createVendor(data = {}) {
  const name = text(data.name, 120);
  if (!name) throw new BooksError('Escribe el nombre del proveedor.');
  const notes = text(data.notes, 500);
  if (looksLikeTaxId(`${name} ${notes || ''}`)) {
    throw new BooksError('No guardes aquí números fiscales (SSN o EIN): basta con marcar si tienes su W-9.');
  }
  try {
    const r = await sql.query(
      `INSERT INTO finance_vendors (name, is_contractor, entity_type, w9_status, email, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, is_contractor, entity_type, w9_status, email, notes`,
      [name, !!data.is_contractor, pick(data.entity_type, ENTITY_TYPES, 'unknown'),
       pick(data.w9_status, W9_STATUSES, data.is_contractor ? 'missing' : 'not_required'), text(data.email, 200), notes]);
    return r.rows[0];
  } catch (err) {
    if (err && err.code === '23505') throw new BooksError('Ya hay un proveedor con ese nombre.', 409);
    throw err;
  }
}
export async function updateVendor(id, fields = {}) {
  if (!isId(id)) return null;
  return patchRow('finance_vendors', id, fields, {
    name: (v) => { const s = text(v, 120); if (!s) throw new BooksError('Escribe el nombre del proveedor.'); return s; },
    is_contractor: (v) => !!v,
    entity_type: (v) => pick(v, ENTITY_TYPES, 'unknown'),
    w9_status: (v) => pick(v, W9_STATUSES, 'missing'),
    email: (v) => text(v, 200),
    notes: (v) => {
      const s = text(v, 500);
      if (s && looksLikeTaxId(s)) throw new BooksError('No guardes aquí números fiscales (SSN o EIN).');
      return s;
    },
  });
}
export async function deleteVendor(id) {
  if (!isId(id)) return false;
  const used = await sql.query(`SELECT COUNT(*)::int AS n FROM company_expenses WHERE vendor_id = $1`, [id]);
  if (used.rows[0].n > 0) throw new BooksError('Este proveedor tiene gastos: quítaselos antes o déjalo como está.', 409);
  const r = await sql.query(`DELETE FROM finance_vendors WHERE id = $1 RETURNING id`, [id]);
  return r.rowCount > 0;
}

// ════════════════════════════════════════════════════════════════
//  Devoluciones a clientes (Schedule C línea 2)
// ════════════════════════════════════════════════════════════════
export async function listRefunds(year) {
  const [from, to] = yearRange(year);
  const r = await sql.query(
    `SELECT r.id, r.payment_id, r.invoice_id, i.invoice_number, r.client_id, r.amount_cents, r.refunded_at, r.account_id, r.reason
       FROM refunds r LEFT JOIN invoices i ON i.id = r.invoice_id
      WHERE r.refunded_at >= $1 AND r.refunded_at < $2 ORDER BY r.refunded_at DESC, r.id DESC`, [from, to]);
  return r.rows;
}
// Nunca se devuelve más de lo cobrado (en ese cobro, o en esa factura si no se elige cobro).
export async function createRefund(data = {}) {
  const amount = money(data.amount_cents, 'La devolución');
  const refundedAt = day(data.refunded_at, 'la devolución');
  await assertMonthOpen(refundedAt, 'esa devolución');
  let paymentId = optId(data.payment_id, 'cobro');
  let invoiceId = optId(data.invoice_id, 'factura');
  let clientId = optId(data.client_id, 'cliente');
  if (paymentId) {
    const p = await sql.query(
      `SELECT p.amount_cents, p.invoice_id, p.client_id,
              COALESCE((SELECT SUM(amount_cents) FROM refunds WHERE payment_id = p.id), 0)::bigint AS refunded
         FROM payments p WHERE p.id = $1`, [paymentId]);
    if (!p.rowCount) throw new BooksError('Ese cobro no existe.', 404);
    const left = Number(p.rows[0].amount_cents) - Number(p.rows[0].refunded);
    if (amount > left) throw new BooksError(`La devolución supera lo que queda de ese cobro (${formatUsd(left)}).`, 409);
    invoiceId = p.rows[0].invoice_id ? String(p.rows[0].invoice_id) : invoiceId;
    clientId = p.rows[0].client_id ? String(p.rows[0].client_id) : clientId;
  } else if (invoiceId) {
    const i = await sql.query(
      `SELECT i.client_id,
              COALESCE((SELECT SUM(amount_cents) FROM payments WHERE invoice_id = i.id), 0)::bigint AS paid,
              COALESCE((SELECT SUM(amount_cents) FROM refunds WHERE invoice_id = i.id), 0)::bigint AS refunded
         FROM invoices i WHERE i.id = $1`, [invoiceId]);
    if (!i.rowCount) throw new BooksError('Esa factura no existe.', 404);
    const left = Number(i.rows[0].paid) - Number(i.rows[0].refunded);
    if (amount > left) throw new BooksError(`La devolución supera lo cobrado en esa factura (${formatUsd(left)}).`, 409);
    clientId = i.rows[0].client_id ? String(i.rows[0].client_id) : clientId;
  } else if (!text(data.reason, 300)) {
    throw new BooksError('Elige el cobro o la factura, o escribe el motivo de la devolución.');
  }
  const r = await sql.query(
    `INSERT INTO refunds (payment_id, invoice_id, client_id, amount_cents, refunded_at, account_id, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [paymentId, invoiceId, clientId, amount, refundedAt, optId(data.account_id, 'cuenta'), text(data.reason, 300)]);
  return r.rows[0];
}
export async function deleteRefund(id) {
  if (!isId(id)) return false;
  const cur = await sql.query(`SELECT refunded_at FROM refunds WHERE id = $1`, [id]);
  if (!cur.rowCount) return false;
  await assertMonthOpen(cur.rows[0].refunded_at, 'esa devolución');
  // Si la factura quedó anulada gracias a esta devolución, no se puede quitar sin reabrirla.
  const v = await sql.query(
    `SELECT 1 FROM refunds r JOIN invoices i ON i.id = r.invoice_id WHERE r.id = $1 AND i.status = 'void'`, [id]);
  if (v.rowCount) throw new BooksError('Esa factura está anulada: cámbiala de estado antes de quitar la devolución.', 409);
  const r = await sql.query(`DELETE FROM refunds WHERE id = $1 RETURNING id`, [id]);
  return r.rowCount > 0;
}

// ════════════════════════════════════════════════════════════════
//  Ingresos sin factura (intereses, ventas sueltas, importados por revisar)
// ════════════════════════════════════════════════════════════════
export async function listIncome(year, { pendingOnly = false } = {}) {
  const [from, to] = yearRange(year);
  const r = await sql.query(
    `SELECT id, label, category, amount_cents, fee_cents, received_at, client_id, account_id, source, review_status, notes
       FROM income_entries
      WHERE received_at >= $1 AND received_at < $2 ${pendingOnly ? "AND review_status = 'pending'" : ''}
      ORDER BY received_at DESC, id DESC`, [from, to]);
  return r.rows;
}
export async function createIncome(data = {}) {
  const label = text(data.label, 200);
  if (!label) throw new BooksError('Escribe de dónde viene el ingreso.');
  const amount = money(data.amount_cents);
  const fee = data.fee_cents ? toCents(data.fee_cents) : 0;
  if (fee == null || fee > amount) throw new BooksError('La comisión no es válida.');
  const receivedAt = day(data.received_at, 'el ingreso');
  await assertMonthOpen(receivedAt, 'ese ingreso');
  const r = await sql.query(
    `INSERT INTO income_entries (label, category, amount_cents, fee_cents, received_at, client_id, account_id, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [label, pick(data.category, INCOME_IDS, 'servicios'), amount, fee, receivedAt,
     optId(data.client_id, 'cliente'), optId(data.account_id, 'cuenta'), text(data.notes, 500)]);
  return r.rows[0];
}
export async function updateIncome(id, fields = {}) {
  if (!isId(id)) return null;
  const cur = await sql.query(`SELECT received_at, amount_cents FROM income_entries WHERE id = $1`, [id]);
  if (!cur.rowCount) return null;
  await assertMonthOpen(cur.rows[0].received_at, 'ese ingreso');
  return patchRow('income_entries', id, fields, {
    label: (v) => { const s = text(v, 200); if (!s) throw new BooksError('Escribe de dónde viene el ingreso.'); return s; },
    category: (v) => pick(v, INCOME_IDS, 'servicios'),
    amount_cents: (v) => money(v),
    fee_cents: (v) => {
      const n = v ? toCents(v) : 0;
      const amount = 'amount_cents' in fields ? toCents(fields.amount_cents) : Number(cur.rows[0].amount_cents);
      if (n == null || n > amount) throw new BooksError('La comisión no es válida.');
      return n;
    },
    received_at: async (v) => { const d = day(v, 'el ingreso', { required: true }); await assertMonthOpen(d, 'la nueva fecha'); return d; },
    client_id: (v) => optId(v, 'cliente'),
    account_id: (v) => optId(v, 'cuenta'),
    review_status: (v) => (v === 'pending' ? 'pending' : 'ok'),
    notes: (v) => text(v, 500),
  });
}
export async function deleteIncome(id, by = null) {
  if (!isId(id)) return false;
  const cur = await sql.query(`SELECT received_at, source_ref FROM income_entries WHERE id = $1`, [id]);
  if (!cur.rowCount) return false;
  await assertMonthOpen(cur.rows[0].received_at, 'ese ingreso');
  if (cur.rows[0].source_ref) {
    await sql.query(`INSERT INTO finance_suppressed_refs (source_ref, created_by) VALUES ($1, $2) ON CONFLICT (source_ref) DO NOTHING`,
      [cur.rows[0].source_ref, by]);
  }
  const r = await sql.query(`DELETE FROM income_entries WHERE id = $1 RETURNING id`, [id]);
  return r.rowCount > 0;
}

// ════════════════════════════════════════════════════════════════
//  Pagos estimados de impuestos ya hechos (no son gasto del negocio)
// ════════════════════════════════════════════════════════════════
export async function listTaxPayments(year) {
  const y = Number(year);
  const r = await sql.query(
    `SELECT id, tax_year, quarter, jurisdiction, amount_cents, paid_at, partner, notes
       FROM tax_estimated_payments WHERE tax_year = $1 ORDER BY paid_at, id`, [y]);
  return r.rows;
}
export async function createTaxPayment(data = {}) {
  const y = Number(data.tax_year);
  if (!Number.isInteger(y) || y < 2020 || y > 2100) throw new BooksError('Elige el año fiscal del pago.');
  const q = data.quarter === '' || data.quarter == null ? null : Number(data.quarter);
  if (q !== null && ![1, 2, 3, 4].includes(q)) throw new BooksError('El trimestre va del 1 al 4.');
  const r = await sql.query(
    `INSERT INTO tax_estimated_payments (tax_year, quarter, jurisdiction, amount_cents, paid_at, partner, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [y, q, data.jurisdiction === 'state' ? 'state' : 'federal', money(data.amount_cents, 'El pago'),
     day(data.paid_at, 'el pago'), text(data.partner, 120), text(data.notes, 300)]);
  return r.rows[0];
}
export async function deleteTaxPayment(id) {
  if (!isId(id)) return false;
  const r = await sql.query(`DELETE FROM tax_estimated_payments WHERE id = $1 RETURNING id`, [id]);
  return r.rowCount > 0;
}

// ════════════════════════════════════════════════════════════════
//  Millaje (Schedule C parte IV): fecha, destino, motivo y millas
// ════════════════════════════════════════════════════════════════
export async function listMileage(year) {
  const [from, to] = yearRange(year);
  const r = await sql.query(
    `SELECT id, trip_date, origin, destination, purpose, miles FROM mileage_trips
      WHERE trip_date >= $1 AND trip_date < $2 ORDER BY trip_date DESC, id DESC`, [from, to]);
  return r.rows.map((row) => ({ ...row, miles: Number(row.miles) }));
}
export async function createMileage(data = {}) {
  const purpose = text(data.purpose, 200);
  if (!purpose) throw new BooksError('Escribe el motivo de negocio del viaje: sin él no se puede deducir.');
  const miles = Math.round(Number(String(data.miles ?? '').replace(',', '.')) * 10) / 10;
  if (!Number.isFinite(miles) || miles <= 0 || miles > 5000) throw new BooksError('Las millas no son válidas.');
  const tripDate = day(data.trip_date, 'el viaje');
  await assertMonthOpen(tripDate, 'ese viaje');
  const r = await sql.query(
    `INSERT INTO mileage_trips (trip_date, origin, destination, purpose, miles) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [tripDate, text(data.origin, 120), text(data.destination, 120), purpose, miles]);
  return { ...r.rows[0], miles: Number(r.rows[0].miles) };
}
export async function deleteMileage(id) {
  if (!isId(id)) return false;
  const cur = await sql.query(`SELECT trip_date FROM mileage_trips WHERE id = $1`, [id]);
  if (!cur.rowCount) return false;
  await assertMonthOpen(cur.rows[0].trip_date, 'ese viaje');
  const r = await sql.query(`DELETE FROM mileage_trips WHERE id = $1 RETURNING id`, [id]);
  return r.rowCount > 0;
}
