// ════════════════════════════════════════════════════════════════
//  lib/finance.mjs — Helpers de queries para FINANZAS
//  clients / projects / invoices / payments. Ver db/migrations/004_finance.sql.
//  TODO monto en CENTAVOS (BIGINT), USD. El formateo a dólares vive en la UI.
//  Patrón gemelo de lib/leads.mjs + lib/db.mjs (template tags parametrizados,
//  ramificación por combinación de filtros).
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';

export const CLIENT_STATUSES  = ['active', 'inactive', 'archived'];
export const INVOICE_STATUSES = ['draft', 'sent', 'partial', 'paid', 'overdue', 'void'];
export const PAYMENT_METHODS  = ['zelle', 'cash', 'transfer', 'paypal', 'card', 'other'];
export const PROJECT_STATUSES = ['active', 'on_hold', 'completed', 'cancelled'];

// ════════════════════════════════════════════════════════════════
//  CLIENTS
// ════════════════════════════════════════════════════════════════

// Lista paginada con filtros opcionales.
// opts: { status, search, limit=50, offset=0 }
export async function listClients(opts = {}) {
  const { status, search, limit = 50, offset = 0 } = opts;
  const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const off = Math.max(parseInt(offset) || 0, 0);
  const q = (search || '').trim();
  const hasSearch = q.length > 0;
  const pat = hasSearch ? `%${q}%` : null;
  const hasStatus = status && CLIENT_STATUSES.includes(status);

  let rows, total;
  if (hasStatus && hasSearch) {
    const r = await sql`
      SELECT * FROM clients
       WHERE status = ${status}
         AND (business_name ILIKE ${pat} OR owner_name ILIKE ${pat}
              OR email ILIKE ${pat} OR phone ILIKE ${pat} OR client_code ILIKE ${pat})
       ORDER BY created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`
      SELECT COUNT(*)::int AS n FROM clients
       WHERE status = ${status}
         AND (business_name ILIKE ${pat} OR owner_name ILIKE ${pat}
              OR email ILIKE ${pat} OR phone ILIKE ${pat} OR client_code ILIKE ${pat})`;
    total = t.rows[0].n;
  } else if (hasStatus) {
    const r = await sql`
      SELECT * FROM clients WHERE status = ${status}
       ORDER BY created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`SELECT COUNT(*)::int AS n FROM clients WHERE status = ${status}`;
    total = t.rows[0].n;
  } else if (hasSearch) {
    const r = await sql`
      SELECT * FROM clients
       WHERE business_name ILIKE ${pat} OR owner_name ILIKE ${pat}
          OR email ILIKE ${pat} OR phone ILIKE ${pat} OR client_code ILIKE ${pat}
       ORDER BY created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`
      SELECT COUNT(*)::int AS n FROM clients
       WHERE business_name ILIKE ${pat} OR owner_name ILIKE ${pat}
          OR email ILIKE ${pat} OR phone ILIKE ${pat} OR client_code ILIKE ${pat}`;
    total = t.rows[0].n;
  } else {
    const r = await sql`
      SELECT * FROM clients ORDER BY created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`SELECT COUNT(*)::int AS n FROM clients`;
    total = t.rows[0].n;
  }

  return { rows, total, limit: lim, offset: off };
}

export async function getClient(id) {
  const r = await sql`SELECT * FROM clients WHERE id = ${id} LIMIT 1`;
  return r.rowCount ? r.rows[0] : null;
}

export async function getClientByCode(code) {
  const r = await sql`SELECT * FROM clients WHERE client_code = ${code} LIMIT 1`;
  return r.rowCount ? r.rows[0] : null;
}

// data: { business_name, owner_name, email, phone, city_state, source_brief_id, notes, status }
export async function createClient(data = {}) {
  const codeResult = await sql`SELECT next_client_id() AS code`;
  const code = codeResult.rows[0].code;
  const status = CLIENT_STATUSES.includes(data.status) ? data.status : 'active';

  const r = await sql`
    INSERT INTO clients (
      client_code, business_name, owner_name, email, phone, city_state,
      source_brief_id, notes, status
    ) VALUES (
      ${code}, ${data.business_name || null}, ${data.owner_name || null},
      ${data.email || null}, ${data.phone || null}, ${data.city_state || null},
      ${data.source_brief_id || null}, ${data.notes || null}, ${status}
    )
    RETURNING *`;
  return r.rows[0];
}

// Crea un cliente copiando datos de un brief (MRC-XXX). Si ya existe un
// cliente para ese brief, lo devuelve sin duplicar.
export async function createClientFromBrief(projectId) {
  const b = await sql`SELECT * FROM briefs WHERE project_id = ${projectId} LIMIT 1`;
  if (!b.rowCount) return null;
  const brief = b.rows[0];

  const existing = await sql`SELECT * FROM clients WHERE source_brief_id = ${projectId} LIMIT 1`;
  if (existing.rowCount) return existing.rows[0];

  return createClient({
    business_name: brief.business_name,
    owner_name: brief.owner_name,
    email: brief.email,
    phone: brief.phone,
    city_state: brief.city_state,
    source_brief_id: projectId,
    notes: brief.summary || null,
    status: 'active',
  });
}

const CLIENT_EDITABLE_FIELDS = [
  'business_name', 'owner_name', 'email', 'phone', 'city_state', 'notes', 'status',
];

// Update parcial de campos arbitrarios del cliente.
// Patrón de updateBriefFields en lib/db.mjs (SET dinámico parametrizado vía db.connect()).
export async function updateClient(id, fields) {
  if (!fields || typeof fields !== 'object') return null;
  const entries = Object.entries(fields).filter(([k]) => CLIENT_EDITABLE_FIELDS.includes(k));
  if (!entries.length) return getClient(id);

  const setParts = [];
  const values = [];
  for (const [col, raw] of entries) {
    let val = raw;
    if (col === 'status' && !CLIENT_STATUSES.includes(val)) continue;
    if (val === '' || val === undefined) val = null;
    setParts.push(`${col} = $${values.length + 1}`);
    values.push(val);
  }
  if (!setParts.length) return getClient(id);
  values.push(id);
  const text = `UPDATE clients SET ${setParts.join(', ')} WHERE id = $${values.length} RETURNING *`;

  const { db } = await import('@vercel/postgres');
  const client = await db.connect();
  try {
    const r = await client.query(text, values);
    return r.rowCount ? r.rows[0] : null;
  } finally {
    client.release();
  }
}

export async function deleteClient(id) {
  const r = await sql`DELETE FROM clients WHERE id = ${id} RETURNING id`;
  return r.rowCount > 0;
}

// ════════════════════════════════════════════════════════════════
//  INVOICES
// ════════════════════════════════════════════════════════════════

// Lista paginada con filtros. Incluye el saldo (amount - SUM(payments)) y datos
// del cliente para mostrar en la tabla sin un segundo round-trip.
// opts: { status, clientId, search, limit=50, offset=0 }
export async function listInvoices(opts = {}) {
  const { status, clientId, search, limit = 50, offset = 0 } = opts;
  const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const off = Math.max(parseInt(offset) || 0, 0);
  const q = (search || '').trim();
  const hasSearch = q.length > 0;
  const pat = hasSearch ? `%${q}%` : null;
  const hasStatus = status && INVOICE_STATUSES.includes(status);
  const hasClient = clientId != null && clientId !== '';

  // Subquery de pagos para calcular saldo en una sola pasada.
  let rows, total;
  if (hasClient && hasStatus) {
    const r = await sql`
      SELECT i.*, c.business_name AS client_name, c.client_code,
             COALESCE(p.paid_cents, 0)::bigint AS paid_cents,
             (i.amount_cents - COALESCE(p.paid_cents, 0))::bigint AS balance_cents
        FROM invoices i
        JOIN clients c ON c.id = i.client_id
        LEFT JOIN (SELECT invoice_id, SUM(amount_cents) AS paid_cents FROM payments GROUP BY invoice_id) p
          ON p.invoice_id = i.id
       WHERE i.client_id = ${clientId} AND i.status = ${status}
       ORDER BY i.created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`SELECT COUNT(*)::int AS n FROM invoices WHERE client_id = ${clientId} AND status = ${status}`;
    total = t.rows[0].n;
  } else if (hasClient) {
    const r = await sql`
      SELECT i.*, c.business_name AS client_name, c.client_code,
             COALESCE(p.paid_cents, 0)::bigint AS paid_cents,
             (i.amount_cents - COALESCE(p.paid_cents, 0))::bigint AS balance_cents
        FROM invoices i
        JOIN clients c ON c.id = i.client_id
        LEFT JOIN (SELECT invoice_id, SUM(amount_cents) AS paid_cents FROM payments GROUP BY invoice_id) p
          ON p.invoice_id = i.id
       WHERE i.client_id = ${clientId}
       ORDER BY i.created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`SELECT COUNT(*)::int AS n FROM invoices WHERE client_id = ${clientId}`;
    total = t.rows[0].n;
  } else if (hasStatus && hasSearch) {
    const r = await sql`
      SELECT i.*, c.business_name AS client_name, c.client_code,
             COALESCE(p.paid_cents, 0)::bigint AS paid_cents,
             (i.amount_cents - COALESCE(p.paid_cents, 0))::bigint AS balance_cents
        FROM invoices i
        JOIN clients c ON c.id = i.client_id
        LEFT JOIN (SELECT invoice_id, SUM(amount_cents) AS paid_cents FROM payments GROUP BY invoice_id) p
          ON p.invoice_id = i.id
       WHERE i.status = ${status}
         AND (i.invoice_number ILIKE ${pat} OR c.business_name ILIKE ${pat} OR c.client_code ILIKE ${pat})
       ORDER BY i.created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`
      SELECT COUNT(*)::int AS n FROM invoices i JOIN clients c ON c.id = i.client_id
       WHERE i.status = ${status}
         AND (i.invoice_number ILIKE ${pat} OR c.business_name ILIKE ${pat} OR c.client_code ILIKE ${pat})`;
    total = t.rows[0].n;
  } else if (hasStatus) {
    const r = await sql`
      SELECT i.*, c.business_name AS client_name, c.client_code,
             COALESCE(p.paid_cents, 0)::bigint AS paid_cents,
             (i.amount_cents - COALESCE(p.paid_cents, 0))::bigint AS balance_cents
        FROM invoices i
        JOIN clients c ON c.id = i.client_id
        LEFT JOIN (SELECT invoice_id, SUM(amount_cents) AS paid_cents FROM payments GROUP BY invoice_id) p
          ON p.invoice_id = i.id
       WHERE i.status = ${status}
       ORDER BY i.created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`SELECT COUNT(*)::int AS n FROM invoices WHERE status = ${status}`;
    total = t.rows[0].n;
  } else if (hasSearch) {
    const r = await sql`
      SELECT i.*, c.business_name AS client_name, c.client_code,
             COALESCE(p.paid_cents, 0)::bigint AS paid_cents,
             (i.amount_cents - COALESCE(p.paid_cents, 0))::bigint AS balance_cents
        FROM invoices i
        JOIN clients c ON c.id = i.client_id
        LEFT JOIN (SELECT invoice_id, SUM(amount_cents) AS paid_cents FROM payments GROUP BY invoice_id) p
          ON p.invoice_id = i.id
       WHERE i.invoice_number ILIKE ${pat} OR c.business_name ILIKE ${pat} OR c.client_code ILIKE ${pat}
       ORDER BY i.created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`
      SELECT COUNT(*)::int AS n FROM invoices i JOIN clients c ON c.id = i.client_id
       WHERE i.invoice_number ILIKE ${pat} OR c.business_name ILIKE ${pat} OR c.client_code ILIKE ${pat}`;
    total = t.rows[0].n;
  } else {
    const r = await sql`
      SELECT i.*, c.business_name AS client_name, c.client_code,
             COALESCE(p.paid_cents, 0)::bigint AS paid_cents,
             (i.amount_cents - COALESCE(p.paid_cents, 0))::bigint AS balance_cents
        FROM invoices i
        JOIN clients c ON c.id = i.client_id
        LEFT JOIN (SELECT invoice_id, SUM(amount_cents) AS paid_cents FROM payments GROUP BY invoice_id) p
          ON p.invoice_id = i.id
       ORDER BY i.created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`SELECT COUNT(*)::int AS n FROM invoices`;
    total = t.rows[0].n;
  }

  return { rows, total, limit: lim, offset: off };
}

// Detalle de una factura con saldo + pagos asociados.
export async function getInvoice(id) {
  const r = await sql`
    SELECT i.*, c.business_name AS client_name, c.client_code,
           COALESCE(p.paid_cents, 0)::bigint AS paid_cents,
           (i.amount_cents - COALESCE(p.paid_cents, 0))::bigint AS balance_cents
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      LEFT JOIN (SELECT invoice_id, SUM(amount_cents) AS paid_cents FROM payments GROUP BY invoice_id) p
        ON p.invoice_id = i.id
     WHERE i.id = ${id} LIMIT 1`;
  if (!r.rowCount) return null;
  const invoice = r.rows[0];
  const pays = await sql`SELECT * FROM payments WHERE invoice_id = ${id} ORDER BY paid_at DESC, created_at DESC`;
  invoice.payments = pays.rows;
  return invoice;
}

// data: { client_id, project_id, amount_cents, currency, status, issued_at, due_date, description }
export async function createInvoice(data = {}) {
  const numResult = await sql`SELECT next_invoice_id() AS num`;
  const num = numResult.rows[0].num;
  const amount = Number.isFinite(+data.amount_cents) ? Math.max(0, Math.round(+data.amount_cents)) : 0;
  const status = INVOICE_STATUSES.includes(data.status) ? data.status : 'draft';
  const currency = (data.currency || 'USD').toUpperCase().slice(0, 3);

  const r = await sql`
    INSERT INTO invoices (
      invoice_number, client_id, project_id, amount_cents, currency,
      status, issued_at, due_date, description
    ) VALUES (
      ${num}, ${data.client_id}, ${data.project_id || null}, ${amount}, ${currency},
      ${status}, ${data.issued_at || null}, ${data.due_date || null}, ${data.description || null}
    )
    RETURNING *`;
  return r.rows[0];
}

// Cambia el estado de la factura (transición manual). Valida contra INVOICE_STATUSES.
export async function updateInvoiceStatus(id, newStatus) {
  if (!INVOICE_STATUSES.includes(newStatus)) {
    throw new Error(`Status de factura inválido: ${newStatus}`);
  }
  const r = await sql`
    UPDATE invoices SET status = ${newStatus} WHERE id = ${id}
    RETURNING *`;
  return r.rowCount ? r.rows[0] : null;
}

export async function deleteInvoice(id) {
  const r = await sql`DELETE FROM invoices WHERE id = ${id} RETURNING id`;
  return r.rowCount > 0;
}

// Recalcula y persiste el estado de una factura según sus pagos:
//   SUM(payments) >= amount → 'paid'
//   SUM(payments) > 0        → 'partial'
//   else conserva el estado no terminal actual (no degrada draft/sent/overdue/void).
// No toca facturas 'void'. Devuelve la factura actualizada (con saldo).
export async function recomputeInvoiceStatus(invoiceId) {
  const inv = await sql`SELECT * FROM invoices WHERE id = ${invoiceId} LIMIT 1`;
  if (!inv.rowCount) return null;
  const invoice = inv.rows[0];
  if (invoice.status === 'void') return getInvoice(invoiceId);

  const agg = await sql`SELECT COALESCE(SUM(amount_cents), 0)::bigint AS paid FROM payments WHERE invoice_id = ${invoiceId}`;
  const paid = Number(agg.rows[0].paid);
  const amount = Number(invoice.amount_cents);

  let next;
  if (paid >= amount && amount > 0) next = 'paid';
  else if (paid > 0) next = 'partial';
  else next = invoice.status === 'paid' || invoice.status === 'partial' ? 'sent' : invoice.status;

  if (next !== invoice.status) {
    await sql`UPDATE invoices SET status = ${next} WHERE id = ${invoiceId}`;
  }
  return getInvoice(invoiceId);
}

// ════════════════════════════════════════════════════════════════
//  PAYMENTS
// ════════════════════════════════════════════════════════════════

// Registra un pago e inmediatamente recalcula el estado de la factura.
// data: { invoice_id, amount_cents, method, paid_at, reference, stripe_payment_id }
// client_id se deriva de la factura (consistencia).
export async function recordPayment(data = {}) {
  const invId = data.invoice_id;
  const inv = await sql`SELECT id, client_id, status FROM invoices WHERE id = ${invId} LIMIT 1`;
  if (!inv.rowCount) throw new Error('Factura no encontrada');
  const invoice = inv.rows[0];

  const amount = Math.round(+data.amount_cents);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Monto de pago inválido');

  const method = PAYMENT_METHODS.includes(data.method) ? data.method : 'other';
  const paidAt = data.paid_at || new Date().toISOString().slice(0, 10);

  const r = await sql`
    INSERT INTO payments (
      invoice_id, client_id, amount_cents, method, paid_at, reference, stripe_payment_id
    ) VALUES (
      ${invId}, ${invoice.client_id}, ${amount}, ${method}, ${paidAt},
      ${data.reference || null}, ${data.stripe_payment_id || null}
    )
    RETURNING *`;
  const payment = r.rows[0];

  const updatedInvoice = await recomputeInvoiceStatus(invId);
  return { payment, invoice: updatedInvoice };
}

// Pagos filtrados por factura o cliente (para la vista de pagos).
// opts: { invoiceId, clientId, limit=100 }
export async function listPayments(opts = {}) {
  const { invoiceId, clientId, limit = 100 } = opts;
  const lim = Math.min(Math.max(parseInt(limit) || 100, 1), 500);
  const hasInvoice = invoiceId != null && invoiceId !== '';
  const hasClient = clientId != null && clientId !== '';

  let r;
  if (hasInvoice) {
    r = await sql`
      SELECT p.*, i.invoice_number FROM payments p
        JOIN invoices i ON i.id = p.invoice_id
       WHERE p.invoice_id = ${invoiceId}
       ORDER BY p.paid_at DESC, p.created_at DESC LIMIT ${lim}`;
  } else if (hasClient) {
    r = await sql`
      SELECT p.*, i.invoice_number FROM payments p
        JOIN invoices i ON i.id = p.invoice_id
       WHERE p.client_id = ${clientId}
       ORDER BY p.paid_at DESC, p.created_at DESC LIMIT ${lim}`;
  } else {
    r = await sql`
      SELECT p.*, i.invoice_number FROM payments p
        JOIN invoices i ON i.id = p.invoice_id
       ORDER BY p.paid_at DESC, p.created_at DESC LIMIT ${lim}`;
  }
  return r.rows;
}

// ════════════════════════════════════════════════════════════════
//  PROJECTS (definidos aquí; la sección Progreso los reusa)
// ════════════════════════════════════════════════════════════════

export async function listProjects(opts = {}) {
  const { clientId, status, limit = 100 } = opts;
  const lim = Math.min(Math.max(parseInt(limit) || 100, 1), 500);
  const hasClient = clientId != null && clientId !== '';
  const hasStatus = status && PROJECT_STATUSES.includes(status);

  let r;
  if (hasClient && hasStatus) {
    r = await sql`
      SELECT pr.*, c.business_name AS client_name, c.client_code FROM projects pr
        JOIN clients c ON c.id = pr.client_id
       WHERE pr.client_id = ${clientId} AND pr.status = ${status}
       ORDER BY pr.created_at DESC LIMIT ${lim}`;
  } else if (hasClient) {
    r = await sql`
      SELECT pr.*, c.business_name AS client_name, c.client_code FROM projects pr
        JOIN clients c ON c.id = pr.client_id
       WHERE pr.client_id = ${clientId}
       ORDER BY pr.created_at DESC LIMIT ${lim}`;
  } else if (hasStatus) {
    r = await sql`
      SELECT pr.*, c.business_name AS client_name, c.client_code FROM projects pr
        JOIN clients c ON c.id = pr.client_id
       WHERE pr.status = ${status}
       ORDER BY pr.created_at DESC LIMIT ${lim}`;
  } else {
    r = await sql`
      SELECT pr.*, c.business_name AS client_name, c.client_code FROM projects pr
        JOIN clients c ON c.id = pr.client_id
       ORDER BY pr.created_at DESC LIMIT ${lim}`;
  }
  return r.rows;
}

// data: { client_id, brief_project_id, name, service_type, agreed_amount_cents, status, started_at, completed_at }
export async function createProject(data = {}) {
  const codeResult = await sql`SELECT next_project_code() AS code`;
  const code = codeResult.rows[0].code;
  const amount = Number.isFinite(+data.agreed_amount_cents) ? Math.max(0, Math.round(+data.agreed_amount_cents)) : 0;
  const status = PROJECT_STATUSES.includes(data.status) ? data.status : 'active';

  const r = await sql`
    INSERT INTO projects (
      project_code, client_id, brief_project_id, name, service_type,
      agreed_amount_cents, status, started_at, completed_at
    ) VALUES (
      ${code}, ${data.client_id}, ${data.brief_project_id || null}, ${data.name || null},
      ${data.service_type || null}, ${amount}, ${status},
      ${data.started_at || null}, ${data.completed_at || null}
    )
    RETURNING *`;
  return r.rows[0];
}

// ════════════════════════════════════════════════════════════════
//  SUMMARY — métricas para KPIs + gráfico de ingresos
// ════════════════════════════════════════════════════════════════

// Devuelve:
//   collected_this_month_cents — SUM(payments) del mes actual
//   ar_total_cents             — por cobrar = SUM(amount - pagos) de facturas no void con saldo > 0
//   overdue_cents              — saldo de facturas con due_date < hoy y saldo > 0 (no void)
//   revenue_by_month           — [{ month:'YYYY-MM', total_cents }] últimos 6 meses (por paid_at)
//   counts                     — { clients, invoices, open_invoices, overdue_invoices }
export async function financeSummary() {
  const collected = await sql`
    SELECT COALESCE(SUM(amount_cents), 0)::bigint AS cents
      FROM payments
     WHERE paid_at >= date_trunc('month', CURRENT_DATE)`;

  // Por cobrar (AR): saldo positivo de facturas no anuladas.
  const ar = await sql`
    SELECT COALESCE(SUM(i.amount_cents - COALESCE(p.paid_cents, 0)), 0)::bigint AS cents
      FROM invoices i
      LEFT JOIN (SELECT invoice_id, SUM(amount_cents) AS paid_cents FROM payments GROUP BY invoice_id) p
        ON p.invoice_id = i.id
     WHERE i.status <> 'void'
       AND (i.amount_cents - COALESCE(p.paid_cents, 0)) > 0`;

  // Vencido: igual que AR pero con due_date pasado.
  const overdue = await sql`
    SELECT COALESCE(SUM(i.amount_cents - COALESCE(p.paid_cents, 0)), 0)::bigint AS cents,
           COUNT(*)::int AS n
      FROM invoices i
      LEFT JOIN (SELECT invoice_id, SUM(amount_cents) AS paid_cents FROM payments GROUP BY invoice_id) p
        ON p.invoice_id = i.id
     WHERE i.status <> 'void'
       AND i.due_date IS NOT NULL
       AND i.due_date < CURRENT_DATE
       AND (i.amount_cents - COALESCE(p.paid_cents, 0)) > 0`;

  // Ingresos por mes (últimos 6, incluyendo meses sin pagos en cero) por fecha de pago.
  const revenue = await sql`
    WITH months AS (
      SELECT to_char(generate_series(
        date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
        date_trunc('month', CURRENT_DATE),
        INTERVAL '1 month'), 'YYYY-MM') AS month
    ), paid AS (
      SELECT to_char(date_trunc('month', paid_at), 'YYYY-MM') AS month,
             SUM(amount_cents)::bigint AS total_cents
        FROM payments
       WHERE paid_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
       GROUP BY 1
    )
    SELECT m.month, COALESCE(pd.total_cents, 0)::bigint AS total_cents
      FROM months m
      LEFT JOIN paid pd ON pd.month = m.month
     ORDER BY m.month ASC`;

  const counts = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM clients)                                         AS clients,
      (SELECT COUNT(*)::int FROM invoices)                                        AS invoices,
      (SELECT COUNT(*)::int FROM invoices WHERE status IN ('draft','sent','partial','overdue')) AS open_invoices`;

  return {
    collected_this_month_cents: Number(collected.rows[0].cents),
    ar_total_cents: Number(ar.rows[0].cents),
    overdue_cents: Number(overdue.rows[0].cents),
    overdue_count: Number(overdue.rows[0].n),
    revenue_by_month: revenue.rows.map((r) => ({ month: r.month, total_cents: Number(r.total_cents) })),
    counts: {
      clients: counts.rows[0].clients,
      invoices: counts.rows[0].invoices,
      open_invoices: counts.rows[0].open_invoices,
      overdue_invoices: Number(overdue.rows[0].n),
    },
  };
}
