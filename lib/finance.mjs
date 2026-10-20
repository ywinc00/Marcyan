// ════════════════════════════════════════════════════════════════
//  lib/finance.mjs — Helpers de queries para FINANZAS
//  clients / projects / invoices / payments. Ver db/migrations/004_finance.sql.
//  TODO monto en CENTAVOS (BIGINT), USD. El formateo a dólares vive en la UI.
//  Patrón gemelo de lib/leads.mjs + lib/db.mjs (template tags parametrizados,
//  ramificación por combinación de filtros).
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';
import { financeExtras } from './expenses.mjs';

export const CLIENT_STATUSES  = ['active', 'inactive', 'archived'];
export const INVOICE_STATUSES = ['draft', 'sent', 'partial', 'paid', 'overdue', 'void'];
export const PAYMENT_METHODS  = ['zelle', 'cash', 'transfer', 'paypal', 'card', 'other'];
export const PROJECT_STATUSES = ['active', 'on_hold', 'completed', 'cancelled'];

// ════════════════════════════════════════════════════════════════
//  CLIENTS
//  Orbit v2 · A2: lista con saldo y proyectos, ficha con todo lo
//  relacionado, alta y edición validadas en el servidor (CRM-16),
//  duplicados por correo o teléfono (409 con los existentes), archivar
//  en vez de borrar en cascada (CRM-13) y conversión brief → cliente que
//  deja rastro (CRM-04). Las columnas de la migración 011 (source_lead_id)
//  son opcionales: sin ella todo sigue funcionando.
// ════════════════════════════════════════════════════════════════

const isMissingSchema = (err) => Boolean(err && (err.code === '42P01' || err.code === '42703'));

/** Error con código HTTP y datos extra para la respuesta ({ fields }, { matches }…). */
export class CrmError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.name = 'CrmError';
    this.status = status;
    this.extra = extra;
  }
}

// Mensaje único (sin jerga) para cuando falta aplicar db/migrations/011_crm.sql.
export const MIGRATION_011_MSG = 'Esta función necesita una actualización de la base de datos que aún no se ha aplicado.';

// ── Normalización y validación (puras: las prueba scripts/test-crm.mjs) ──
export const CLIENT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Correo comparable: sin espacios y en minúsculas. null si vacío. */
export function normalizeEmail(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return s || null;
}

/** Teléfono comparable: los 10 últimos dígitos ("+1 (713) 555-0118" → "7135550118"). null si < 7 dígitos. */
export function phoneKey(v) {
  const d = String(v ?? '').replace(/\D/g, '');
  if (d.length < 7) return null;
  return d.length > 10 ? d.slice(-10) : d;
}

/** Nombre visible de un cliente: negocio, responsable o código. */
export function clientDisplayName(c) {
  if (!c) return '';
  return (c.business_name || '').trim() || (c.owner_name || '').trim() || c.client_code || '';
}

const CLIENT_TEXT_LIMITS = {
  business_name: 200, owner_name: 200, email: 200, phone: 50, city_state: 200, notes: 5000,
};

/**
 * Limpia y valida los datos de un cliente.
 * partial=true (PATCH): solo valida lo que llega; el "al menos un nombre" lo
 * comprueba la API mezclando con el registro actual.
 * Devuelve { ok, clean, fields } — fields = { campo: 'mensaje en español' }.
 */
export function validateClientInput(data = {}, { partial = false } = {}) {
  const clean = {};
  const fields = {};
  for (const [k, max] of Object.entries(CLIENT_TEXT_LIMITS)) {
    if (partial && !(k in data)) continue;
    const raw = data[k];
    const s = raw == null ? '' : String(raw).trim();
    clean[k] = s ? s.slice(0, max) : null;
  }
  if ('status' in data || !partial) {
    clean.status = CLIENT_STATUSES.includes(data.status) ? data.status : (partial ? undefined : 'active');
    if (clean.status === undefined) {
      delete clean.status;
      if ('status' in data) fields.status = 'Estado no válido.';
    }
  }
  if (clean.email) {
    clean.email = clean.email.toLowerCase();
    if (!CLIENT_EMAIL_RE.test(clean.email)) fields.email = 'El correo no tiene un formato válido.';
  }
  if (clean.phone && !phoneKey(clean.phone)) fields.phone = 'El teléfono debe tener al menos 7 dígitos.';
  if (!partial && !clean.business_name && !clean.owner_name) {
    fields.business_name = 'Escribe el nombre del negocio o de la persona.';
  }
  return { ok: Object.keys(fields).length === 0, clean, fields };
}

// ── Lista ─────────────────────────────────────────────────────
// Saldo por cobrar del cliente: facturas emitidas (ni borrador ni anulada)
// menos lo pagado en cada una, solo lo positivo. Mismo criterio que
// "por cobrar sin borradores" del plan (A4).
const CLIENT_AGG_SQL = `
  (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id)::int AS projects_total,
  (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id AND p.status = 'active')::int AS projects_active,
  COALESCE((SELECT SUM(GREATEST(i.amount_cents - COALESCE((SELECT SUM(pp.amount_cents) FROM payments pp WHERE pp.invoice_id = i.id), 0), 0))
              FROM invoices i WHERE i.client_id = c.id AND i.status NOT IN ('void', 'draft')), 0)::bigint AS balance_cents`;

/**
 * WHERE parametrizado de la lista de clientes (puro: lo prueba test-crm).
 * opts: { status, active (true = sin archivados), search }.
 */
export function buildClientFilter(opts = {}) {
  const where = [];
  const params = [];
  if (opts.status && CLIENT_STATUSES.includes(opts.status)) {
    params.push(opts.status); where.push(`c.status = $${params.length}`);
  } else if (opts.active) {
    where.push(`c.status <> 'archived'`);
  }
  const q = String(opts.search || '').trim().slice(0, 200);
  if (q) {
    params.push(`%${q}%`);
    const n = `$${params.length}`;
    const digits = q.replace(/\D/g, '');
    let phoneOr = '';
    if (digits.length >= 4) {
      params.push(`%${digits}%`);
      phoneOr = ` OR REGEXP_REPLACE(COALESCE(c.phone, ''), '\\D', '', 'g') LIKE $${params.length}`;
    }
    where.push(`(c.business_name ILIKE ${n} OR c.owner_name ILIKE ${n} OR c.email ILIKE ${n}
               OR c.phone ILIKE ${n} OR c.client_code ILIKE ${n} OR c.city_state ILIKE ${n}${phoneOr})`);
  }
  return { text: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

// Lista paginada con filtros opcionales.
// opts: { status, active, search, limit=50, offset=0 }
// Cada fila trae todas las columnas de siempre (Finanzas las usa en sus
// desplegables) + projects_total, projects_active y balance_cents.
// Devuelve además `summary`: recuento por estado (con la búsqueda aplicada)
// y el saldo por cobrar de todos los clientes no archivados.
export async function listClients(opts = {}) {
  const { limit = 50, offset = 0 } = opts;
  const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const off = Math.max(parseInt(offset) || 0, 0);
  const f = buildClientFilter(opts);
  const facet = buildClientFilter({ search: opts.search });
  const n = f.params.length;

  const [r, t, s, b] = await Promise.all([
    sql.query(
      `SELECT c.*, ${CLIENT_AGG_SQL} FROM clients c ${f.text}
        ORDER BY c.created_at DESC, c.id DESC LIMIT $${n + 1} OFFSET $${n + 2}`,
      [...f.params, lim, off]),
    sql.query(`SELECT COUNT(*)::int AS n FROM clients c ${f.text}`, f.params),
    sql.query(`SELECT c.status, COUNT(*)::int AS n FROM clients c ${facet.text} GROUP BY c.status`, facet.params),
    sql.query(`SELECT COALESCE(SUM(x.balance_cents), 0)::bigint AS balance_cents,
                      COUNT(*) FILTER (WHERE x.projects_active > 0)::int AS with_active_projects
                 FROM (SELECT ${CLIENT_AGG_SQL} FROM clients c WHERE c.status <> 'archived') x`, []),
  ]);

  const summary = { active: 0, inactive: 0, archived: 0, total: 0 };
  for (const row of s.rows) {
    if (row.status in summary) summary[row.status] = row.n;
    summary.total += row.n;
  }
  summary.current = summary.active + summary.inactive;   // "Todos" = sin archivados
  summary.balance_cents = b.rows[0]?.balance_cents ?? '0';
  summary.with_active_projects = b.rows[0]?.with_active_projects ?? 0;

  return { rows: r.rows, total: t.rows[0].n, limit: lim, offset: off, summary };
}

export async function getClient(id) {
  const r = await sql`SELECT * FROM clients WHERE id = ${id} LIMIT 1`;
  return r.rowCount ? r.rows[0] : null;
}

export async function getClientByCode(code) {
  const r = await sql`SELECT * FROM clients WHERE client_code = ${code} LIMIT 1`;
  return r.rowCount ? r.rows[0] : null;
}

// ── Duplicados ────────────────────────────────────────────────
// Clientes con el mismo correo (sin mayúsculas) o el mismo teléfono (10
// últimos dígitos). `query(text, params)` permite usarlo dentro de una
// transacción (client.query) o fuera (sql.query). Archivados al final.
export const DUPLICATE_SQL = `
  SELECT id, client_code, business_name, owner_name, email, phone, status
    FROM clients
   WHERE (($1::text IS NOT NULL AND LOWER(email) = $1)
       OR ($2::text IS NOT NULL AND RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '\\D', '', 'g'), 10) = $2))
     AND ($3::bigint IS NULL OR id <> $3)
   ORDER BY (status = 'archived'), created_at DESC
   LIMIT 5`;

export async function findClientDuplicates({ email, phone, excludeId = null } = {}, query) {
  const e = normalizeEmail(email);
  const p = phoneKey(phone);
  if (!e && !p) return [];
  const run = query || ((text, params) => sql.query(text, params));
  const r = await run(DUPLICATE_SQL, [e, p, excludeId == null ? null : Number(excludeId)]);
  return r.rows;
}

// ── Alta ──────────────────────────────────────────────────────
// data: { business_name, owner_name, email, phone, city_state, source_brief_id,
//         source_lead_id, notes, status }
// El código CLI-XXX se genera DENTRO del INSERT (como el MRC de los briefs,
// B-11): el advisory lock de next_client_id() dura la transacción de la
// sentencia y dos altas simultáneas ya no reciben el mismo código.
// No valida (lo hace la API con validateClientInput) para no romper a
// quien la llamaba antes. `query` permite usarla dentro de una transacción.
export async function createClient(data = {}, query) {
  const run = query || ((text, params) => sql.query(text, params));
  const status = CLIENT_STATUSES.includes(data.status) ? data.status : 'active';
  const cols = [
    ['business_name', data.business_name || null], ['owner_name', data.owner_name || null],
    ['email', data.email || null], ['phone', data.phone || null], ['city_state', data.city_state || null],
    ['source_brief_id', data.source_brief_id || null], ['notes', data.notes || null], ['status', status],
  ];
  // source_lead_id (migración 011) solo si llega: sin la migración, el alta normal sigue igual.
  if (data.source_lead_id) cols.push(['source_lead_id', data.source_lead_id]);
  const text = `INSERT INTO clients (client_code, ${cols.map(([k]) => k).join(', ')})
                VALUES (next_client_id(), ${cols.map((_, i) => `$${i + 1}`).join(', ')})
                RETURNING *`;
  const r = await run(text, cols.map(([, v]) => v));
  return r.rows[0];
}

// ── Brief → cliente (CRM-04) ──────────────────────────────────
// Devuelve { client, created }: created=false si ya existía un cliente con
// ese brief de origen (la interfaz lo dice en vez de anunciar un alta).
// El código del brief se acepta sin distinguir mayúsculas ("mrc-017").
// Al crear, deja el evento 'converted_to_client' en el historial del brief.
// Devuelve null si el brief no existe.
// "Ya es cliente" = un cliente nació de este brief (source_brief_id) o el
// brief se vinculó a un cliente que ya existía (último evento
// 'converted_to_client', que es lo que escribe la ficha del brief de A3 y la
// conversión de un lead). Mismo criterio que getBriefClient: así el atajo de
// Finanzas no duplica un cliente ya vinculado.
export async function convertBriefToClient(projectId, actorEmail = null) {
  const pid = String(projectId || '').trim().toUpperCase();
  if (!pid) return null;
  const b = await sql`SELECT * FROM briefs WHERE project_id = ${pid} LIMIT 1`;
  if (!b.rowCount) return null;
  const brief = b.rows[0];

  const existing = await sql`SELECT * FROM clients WHERE source_brief_id = ${pid} ORDER BY id LIMIT 1`;
  if (existing.rowCount) return { client: existing.rows[0], created: false };
  const linked = await sql`
    SELECT c.* FROM clients c
      JOIN (SELECT data FROM brief_events
             WHERE project_id = ${pid} AND event_type = 'converted_to_client'
             ORDER BY created_at DESC, id DESC LIMIT 1) e
        ON e.data->>'client_id' = c.id::text
     LIMIT 1`;
  if (linked.rowCount) return { client: linked.rows[0], created: false };

  const client = await createClient({
    business_name: brief.business_name || brief.owner_name || null,
    owner_name: brief.owner_name,
    email: brief.email ? String(brief.email).trim().toLowerCase() : null,
    phone: brief.phone,
    city_state: brief.city_state,
    source_brief_id: pid,
    notes: brief.summary || null,
    status: 'active',
  });
  try {
    await sql`
      INSERT INTO brief_events (project_id, event_type, actor_email, data)
      VALUES (${pid}, 'converted_to_client', ${actorEmail},
              ${JSON.stringify({
                client_id: Number(client.id), client_code: client.client_code,
                business_name: client.business_name || null, created: true,
              })}::jsonb)`;
  } catch (err) {
    // El historial es secundario: el cliente ya existe y no se deshace.
    console.error('[finance] evento converted_to_client:', err.message);
  }
  return { client, created: true };
}

// Compatibilidad: devuelve solo el cliente (creado o el que ya existía).
export async function createClientFromBrief(projectId, actorEmail = null) {
  const r = await convertBriefToClient(projectId, actorEmail);
  return r ? r.client : null;
}

// ── Edición ───────────────────────────────────────────────────
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

// ── Ficha ─────────────────────────────────────────────────────
// Lo que arrastra un borrado definitivo (004/005: CASCADE desde clients a
// projects, invoices y payments, y desde projects a los hitos).
export async function clientDeleteImpact(id) {
  const r = await sql`
    SELECT
      (SELECT COUNT(*) FROM projects WHERE client_id = ${id})::int AS projects,
      (SELECT COUNT(*) FROM project_milestones m JOIN projects p ON p.id = m.project_id WHERE p.client_id = ${id})::int AS milestones,
      (SELECT COUNT(*) FROM invoices WHERE client_id = ${id})::int AS invoices,
      (SELECT COUNT(*) FROM payments WHERE client_id = ${id})::int AS payments,
      COALESCE((SELECT SUM(amount_cents) FROM payments WHERE client_id = ${id}), 0)::bigint AS payments_cents`;
  return r.rows[0];
}

/**
 * Todo lo de un cliente para su ficha: proyectos, facturas con su saldo,
 * briefs y leads de origen, totales y el impacto de un borrado.
 * Los leads se encuentran por la conversión (011) o, sin ella, por el brief
 * al que se convirtieron (converted_brief_id existe desde la 003).
 */
export async function getClientRelated(client) {
  const id = client.id;
  const [projects, invoices, impact] = await Promise.all([
    sql`SELECT id, project_code, name, service_type, status, agreed_amount_cents,
               started_at, completed_at, brief_project_id, created_at
          FROM projects WHERE client_id = ${id}
         ORDER BY created_at DESC LIMIT 100`,
    sql`SELECT i.id, i.invoice_number, i.status, i.amount_cents, i.issued_at, i.due_date,
               i.project_id, i.description, i.created_at,
               COALESCE(pp.paid, 0)::bigint AS paid_cents,
               (i.amount_cents - COALESCE(pp.paid, 0))::bigint AS balance_cents
          FROM invoices i
          LEFT JOIN (SELECT invoice_id, SUM(amount_cents) AS paid FROM payments GROUP BY invoice_id) pp
                 ON pp.invoice_id = i.id
         WHERE i.client_id = ${id}
         ORDER BY COALESCE(i.issued_at, i.created_at::date) DESC, i.id DESC LIMIT 100`,
    clientDeleteImpact(id),
  ]);

  const briefIds = new Set();
  if (client.source_brief_id) briefIds.add(client.source_brief_id);
  for (const p of projects.rows) if (p.brief_project_id) briefIds.add(p.brief_project_id);
  // Briefs vinculados a este cliente cuando ya existía (su último evento
  // 'converted_to_client' apunta aquí): un cliente solo tiene UN brief de
  // origen, pero puede traer más de un brief.
  const linked = await sql.query(
    `SELECT e.project_id FROM (
        SELECT DISTINCT ON (project_id) project_id, data FROM brief_events
         WHERE event_type = 'converted_to_client'
         ORDER BY project_id, created_at DESC, id DESC) e
      WHERE e.data->>'client_id' = $1
      LIMIT 50`, [String(id)]);
  for (const r of linked.rows) briefIds.add(r.project_id);

  // Leads: por la conversión (011) o por el brief al que se convirtieron.
  let leads = [];
  const briefList = [...briefIds];
  try {
    const r = await sql.query(
      `SELECT ref_id, status, source, name, business_name, converted_brief_id, created_at
         FROM leads
        WHERE converted_client_id = $1
           OR ($2::text IS NOT NULL AND ref_id = $2)
           OR (converted_brief_id IS NOT NULL AND converted_brief_id = ANY($3::text[]))
        ORDER BY created_at DESC LIMIT 50`,
      [id, client.source_lead_id || null, briefList]);
    leads = r.rows;
  } catch (err) {
    if (!isMissingSchema(err)) throw err;
    const r = await sql.query(
      `SELECT ref_id, status, source, name, business_name, converted_brief_id, created_at
         FROM leads
        WHERE converted_brief_id IS NOT NULL AND converted_brief_id = ANY($1::text[])
        ORDER BY created_at DESC LIMIT 50`, [briefList]);
    leads = r.rows;
  }
  for (const l of leads) if (l.converted_brief_id) briefIds.add(l.converted_brief_id);

  let briefs = [];
  if (briefIds.size) {
    const r = await sql.query(
      `SELECT project_id, status, business_name, owner_name, source, created_at
         FROM briefs WHERE project_id = ANY($1::text[]) ORDER BY created_at DESC`, [[...briefIds]]);
    briefs = r.rows;
  }

  // Totales: emitido (sin borradores ni anuladas), cobrado y saldo.
  let invoiced = 0, paid = 0, balance = 0, drafts = 0;
  for (const i of invoices.rows) {
    if (i.status === 'void') continue;
    if (i.status === 'draft') { drafts += Number(i.amount_cents) || 0; continue; }
    invoiced += Number(i.amount_cents) || 0;
    paid += Number(i.paid_cents) || 0;
    balance += Math.max(0, Number(i.balance_cents) || 0);
  }

  return {
    projects: projects.rows,
    invoices: invoices.rows,
    briefs,
    leads,
    totals: { invoiced_cents: invoiced, paid_cents: paid, balance_cents: balance, draft_cents: drafts },
    impact,
  };
}

// ── Borrado definitivo ────────────────────────────────────────
// Solo con confirmación: el texto escrito debe coincidir con el nombre
// visible del cliente o con su código (sin distinguir mayúsculas ni
// espacios de sobra). La API devuelve 400 si no coincide.
export function deleteConfirmationMatches(client, typed) {
  const norm = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  const t = norm(typed);
  if (!t) return false;
  return t === norm(clientDisplayName(client)) || t === norm(client.client_code);
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
//   collected_this_month_cents  — SUM(payments) del mes actual
//   ar_total_cents              — por cobrar = SUM(amount - pagos) de facturas no void con saldo > 0
//   overdue_cents               — saldo de facturas con due_date < hoy y saldo > 0 (no void)
//   revenue_by_month            — [{ month:'YYYY-MM', total_cents }] últimos 6 meses (por paid_at)
//   counts                      — { clients, invoices, open_invoices, overdue_invoices }
//   expenses_this_month_cents   — gastos puntuales del mes (company_expenses, por spent_at)
//   subscriptions_monthly_cents — run-rate mensual de subs activas (yearly→/12)
//   net_this_month_cents        — cobrado − gastos − run-rate de subs (puede ser negativo)
// "Hoy" y "este mes" en HORA DE HOUSTON: (now() AT TIME ZONE 'America/Chicago')::date
// (= SQL_TODAY_HOUSTON de lib/dates.mjs). Con CURRENT_DATE (UTC en Neon) el mes
// cambiaba a las 7 pm de Houston del último día. La home (dashboard/analytics)
// reutiliza este resumen para "Cobrado (mes)", así ambas cifras coinciden.
export async function financeSummary() {
  const collected = await sql`
    SELECT COALESCE(SUM(amount_cents), 0)::bigint AS cents
      FROM payments
     WHERE paid_at >= date_trunc('month', (now() AT TIME ZONE 'America/Chicago')::date)`;

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
       AND i.due_date < (now() AT TIME ZONE 'America/Chicago')::date
       AND (i.amount_cents - COALESCE(p.paid_cents, 0)) > 0`;

  // Ingresos por mes (últimos 6, incluyendo meses sin pagos en cero) por fecha de pago.
  const revenue = await sql`
    WITH months AS (
      SELECT to_char(generate_series(
        date_trunc('month', (now() AT TIME ZONE 'America/Chicago')::date) - INTERVAL '5 months',
        date_trunc('month', (now() AT TIME ZONE 'America/Chicago')::date),
        INTERVAL '1 month'), 'YYYY-MM') AS month
    ), paid AS (
      SELECT to_char(date_trunc('month', paid_at), 'YYYY-MM') AS month,
             SUM(amount_cents)::bigint AS total_cents
        FROM payments
       WHERE paid_at >= date_trunc('month', (now() AT TIME ZONE 'America/Chicago')::date) - INTERVAL '5 months'
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

  // Egresos: gastos del mes + run-rate mensual de suscripciones activas.
  const extras = await financeExtras();
  const collectedCents = Number(collected.rows[0].cents);
  const netThisMonth = collectedCents
    - extras.expenses_this_month_cents
    - extras.subscriptions_monthly_cents;

  return {
    collected_this_month_cents: collectedCents,
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
    expenses_this_month_cents: extras.expenses_this_month_cents,
    subscriptions_monthly_cents: extras.subscriptions_monthly_cents,
    net_this_month_cents: netThisMonth,
  };
}
