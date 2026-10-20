// ════════════════════════════════════════════════════════════════
//  lib/finance.mjs — Helpers de queries para FINANZAS
//  clients / projects / invoices / payments. Ver db/migrations/004_finance.sql.
//  TODO monto en CENTAVOS (BIGINT), USD. El formateo a dólares vive en la UI.
//  Las reglas puras (estados, montos, pagos) viven en lib/finance-rules.mjs,
//  que comparte el panel. Escrituras de dinero en TRANSACCIÓN (withTx) con la
//  factura bloqueada (FOR UPDATE): dos pagos a la vez no superan el saldo.
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';
import { financeExtras } from './expenses.mjs';
import { SQL_TODAY_HOUSTON, houstonDate } from './dates.mjs';
import {
  INVOICE_STATUSES, INVOICE_FILTERS, OPEN_INVOICE_STATUSES, PAYMENT_METHODS,
  baseInvoiceStatus, effectiveInvoiceStatus, manualStatusProblem, paymentProblem,
  formatUsd, toCents, dayOf, isValidDay,
} from './finance-rules.mjs';

export const CLIENT_STATUSES  = ['active', 'inactive', 'archived'];
// Estados y métodos viven en lib/finance-rules.mjs (los comparte el panel);
// se reexportan aquí para no romper a quien los importaba de este módulo.
export { INVOICE_STATUSES, INVOICE_FILTERS, PAYMENT_METHODS };
export const PROJECT_STATUSES = ['active', 'on_hold', 'completed', 'cancelled'];

// Error de negocio con su código HTTP y un mensaje en español llano para el
// dueño (el panel lo enseña tal cual). Los endpoints lo traducen a la respuesta.
export class FinanceError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'FinanceError';
    this.status = status;
  }
}

// Transacción en una conexión propia. fn recibe q(text, params).
async function withTx(fn) {
  const { db } = await import('@vercel/postgres');
  const client = await db.connect();
  const q = (text, params = []) => client.query(text, params);
  try {
    await q('BEGIN');
    const out = await fn(q);
    await q('COMMIT');
    return out;
  } catch (err) {
    try { await q('ROLLBACK'); }
    catch (rbErr) { console.error('[finance] ROLLBACK falló:', rbErr && rbErr.message); }
    throw err;
  } finally {
    client.release();
  }
}

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
// Un cliente archivado no se asigna a nada nuevo (factura, proyecto, brief,
// lead): el selector no lo ofrece y el servidor lo frena con este texto
// (revisión int1, F2). Para usarlo, se reactiva en su ficha.
export const ARCHIVED_CLIENT_MSG = 'Ese cliente está archivado. Reactívalo en su ficha para usarlo o elige otro.';

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
//
// opts.checkDuplicates (integración CRM): antes de crear, busca clientes con
// el mismo correo o teléfono del brief y, si los hay, lanza CrmError 409
// { reason: 'duplicate', matches } para que el panel ofrezca "usar el
// existente" (vincular) o "crear igualmente" (repetir sin comprobar). Por
// defecto no comprueba, para no cambiar a quien la llamaba antes.
//
// ÚNICO lugar que escribe 'converted_to_client' al CREAR un cliente desde un
// brief, con el actor (integración CRM, punto 3): el handler del brief ya no
// lo repite. Vincular a un cliente existente lo escribe linkBriefToClient.
export async function convertBriefToClient(projectId, actorEmail = null, { checkDuplicates = false } = {}) {
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

  if (checkDuplicates) {
    const matches = await findClientDuplicates({ email: brief.email, phone: brief.phone });
    if (matches.length) {
      throw new CrmError(409,
        `Ya existe un cliente con el correo o el teléfono de este brief: ${matches[0].client_code} ${clientDisplayName(matches[0])}.`,
        { reason: 'duplicate', matches });
    }
  }

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
                business_name: client.business_name || null, created: true, linked: false,
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

// Estado DERIVADO en SQL. ESPEJO de effectiveInvoiceStatus() en
// lib/finance-rules.mjs: si cambias uno, cambia el otro. "Vencida" se calcula
// al leer (FIN-05): nunca hace falta un job ni la columna miente.
export function sqlEffectiveStatus(i = 'i', paid = 'COALESCE(p.paid_cents, 0)') {
  return `CASE
      WHEN ${i}.status = 'void' THEN 'void'
      WHEN ${i}.amount_cents <= 0 THEN CASE WHEN ${i}.status = 'draft' THEN 'draft' ELSE 'paid' END
      WHEN ${paid} >= ${i}.amount_cents THEN 'paid'
      WHEN ${i}.status = 'draft' AND ${paid} = 0 THEN 'draft'
      WHEN ${i}.due_date IS NOT NULL AND ${i}.due_date < ${SQL_TODAY_HOUSTON} THEN 'overdue'
      WHEN ${paid} > 0 THEN 'partial'
      ELSE 'sent'
    END`;
}

// Fila de factura con cliente, proyecto, pagado, saldo y estado derivado.
// `status` = estado derivado (el que se enseña); `stored_status` = la columna.
const INVOICE_BASE_SQL = `
  SELECT i.id, i.invoice_number, i.client_id, i.project_id, i.amount_cents, i.currency,
         i.issued_at, i.due_date, i.description, i.created_at, i.updated_at,
         i.status AS stored_status,
         ${sqlEffectiveStatus()} AS status,
         c.business_name AS client_name, c.owner_name AS client_owner, c.client_code,
         pr.project_code, pr.name AS project_name,
         COALESCE(p.paid_cents, 0)::bigint AS paid_cents,
         (i.amount_cents - COALESCE(p.paid_cents, 0))::bigint AS balance_cents
    FROM invoices i
    JOIN clients c ON c.id = i.client_id
    LEFT JOIN projects pr ON pr.id = i.project_id
    LEFT JOIN (SELECT invoice_id, SUM(amount_cents) AS paid_cents FROM payments GROUP BY invoice_id) p
      ON p.invoice_id = i.id`;

function withOverdueFlag(row) {
  if (row) row.is_overdue = row.status === 'overdue';
  return row;
}

// WHERE parametrizado sobre la fila base (alias b). FIN-20: un solo WHERE
// compuesto, así la búsqueda también funciona con filtro de cliente.
//   status: estado derivado o 'open' (enviadas, parciales y vencidas)
//   clientId, projectId, search (número, cliente, código, descripción, proyecto)
export function buildInvoiceFilter(opts = {}, { withStatus = true } = {}) {
  const where = [];
  const params = [];
  const add = (frag, val) => { params.push(val); where.push(frag.replace('?', `$${params.length}`)); };

  const st = opts.status;
  if (withStatus && st && INVOICE_FILTERS.includes(st)) {
    if (st === 'open') where.push(`b.status IN (${OPEN_INVOICE_STATUSES.map((s) => `'${s}'`).join(', ')})`);
    else add('b.status = ?', st);
  }
  if (opts.clientId != null && /^\d+$/.test(String(opts.clientId))) add('b.client_id = ?', String(opts.clientId));
  if (opts.projectId != null && /^\d+$/.test(String(opts.projectId))) add('b.project_id = ?', String(opts.projectId));
  const q = (opts.search || '').toString().trim().slice(0, 200);
  if (q) {
    params.push(`%${q}%`);
    const n = `$${params.length}`;
    where.push(`(b.invoice_number ILIKE ${n} OR b.client_name ILIKE ${n} OR b.client_owner ILIKE ${n}
               OR b.client_code ILIKE ${n} OR b.description ILIKE ${n} OR b.project_code ILIKE ${n})`);
  }
  return { text: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

// Lista paginada con filtros. Incluye saldo, estado derivado y el recuento por
// estado de las facturas que cumplen los demás filtros (las pastillas lo enseñan).
// opts: { status, clientId, projectId, search, limit=50, offset=0 }
export async function listInvoices(opts = {}) {
  const { limit = 50, offset = 0 } = opts;
  const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const off = Math.max(parseInt(offset) || 0, 0);
  const f = buildInvoiceFilter(opts);
  const fc = buildInvoiceFilter(opts, { withStatus: false });
  const n = f.params.length;

  const [r, t, c] = await Promise.all([
    sql.query(`SELECT * FROM (${INVOICE_BASE_SQL}) b ${f.text}
                ORDER BY b.created_at DESC, b.id DESC LIMIT $${n + 1} OFFSET $${n + 2}`, [...f.params, lim, off]),
    sql.query(`SELECT COUNT(*)::int AS n FROM (${INVOICE_BASE_SQL}) b ${f.text}`, f.params),
    sql.query(`SELECT b.status, COUNT(*)::int AS n FROM (${INVOICE_BASE_SQL}) b ${fc.text} GROUP BY b.status`, fc.params),
  ]);

  const counts = { all: 0, open: 0 };
  for (const s of INVOICE_STATUSES) counts[s] = 0;
  for (const row of c.rows) {
    counts[row.status] = row.n;
    counts.all += row.n;
    if (OPEN_INVOICE_STATUSES.includes(row.status)) counts.open += row.n;
  }

  return { rows: r.rows.map(withOverdueFlag), total: t.rows[0].n, limit: lim, offset: off, counts };
}

// Detalle de una factura (por id numérico o por número INV-XXX) con saldo,
// estado derivado, pagos y el resumen del proyecto enlazado (FIN-07, FIN-08).
export async function getInvoice(idOrNumber) {
  const key = String(idOrNumber ?? '').trim();
  let r;
  if (/^\d+$/.test(key)) {
    r = await sql.query(`SELECT * FROM (${INVOICE_BASE_SQL}) b WHERE b.id = $1 LIMIT 1`, [key]);
  } else if (/^INV-\d+$/i.test(key)) {
    r = await sql.query(`SELECT * FROM (${INVOICE_BASE_SQL}) b WHERE b.invoice_number = $1 LIMIT 1`, [key.toUpperCase()]);
  } else {
    return null;
  }
  if (!r.rowCount) return null;
  const invoice = withOverdueFlag(r.rows[0]);
  const pays = await sql`
    SELECT * FROM payments WHERE invoice_id = ${invoice.id}
     ORDER BY paid_at DESC, created_at DESC`;
  invoice.payments = pays.rows;

  invoice.project = null;
  if (invoice.project_id) {
    const pr = await sql`
      SELECT pr.id, pr.project_code, pr.name, pr.status, pr.agreed_amount_cents,
             (SELECT COALESCE(SUM(iv.amount_cents), 0) FROM invoices iv
               WHERE iv.project_id = pr.id AND iv.status <> 'void')::bigint AS invoiced_cents,
             (SELECT COALESCE(SUM(pa.amount_cents), 0) FROM payments pa
                JOIN invoices iv ON iv.id = pa.invoice_id
               WHERE iv.project_id = pr.id)::bigint AS collected_cents
        FROM projects pr WHERE pr.id = ${invoice.project_id} LIMIT 1`;
    invoice.project = pr.rowCount ? pr.rows[0] : null;
  }
  return invoice;
}

function cleanText(v, max = 500) {
  const s = (v ?? '').toString().trim();
  return s ? s.slice(0, max) : null;
}

// Fecha DATE de un campo: '' / null → null; inválida → error con su nombre.
function dayField(v, label) {
  if (v === null || v === undefined || v === '') return null;
  const d = dayOf(v);
  if (!d || !isValidDay(d)) throw new FinanceError(`La fecha de ${label} no es válida.`);
  return d;
}

function idField(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  return /^\d+$/.test(s) ? s : undefined; // undefined = formato inválido
}

// Proyecto opcional de una factura: debe existir y ser del mismo cliente.
async function checkProject(q, projectId, clientId) {
  if (!projectId) return;
  const pr = await q('SELECT client_id FROM projects WHERE id = $1', [projectId]);
  if (!pr.rowCount) throw new FinanceError('Ese proyecto no existe.', 404);
  if (pr.rows[0].client_id != null && String(pr.rows[0].client_id) !== String(clientId)) {
    throw new FinanceError('Ese proyecto es de otro cliente.');
  }
}

// data: { client_id, project_id, amount_cents, status, issued_at, due_date, description }
// Reglas (FIN-04, FIN-08, FIN-19, FIN-20):
//   · monto > 0 (nunca una factura de $0 sin querer);
//   · estado inicial solo Borrador o Enviada (Pagada/Parcial salen de los pagos);
//   · moneda fija USD mientras no haya multimoneda;
//   · next_invoice_id() DENTRO del INSERT: el bloqueo cubre la inserción.
export async function createInvoice(data = {}) {
  const clientId = idField(data.client_id);
  if (!clientId) throw new FinanceError('Elige un cliente.');
  const amount = toCents(data.amount_cents);
  if (amount == null || amount <= 0) throw new FinanceError('El monto de la factura debe ser mayor que $0.');
  const status = data.status === 'draft' ? 'draft' : 'sent';
  const issuedAt = dayField(data.issued_at, 'emisión');
  const dueDate = dayField(data.due_date, 'vencimiento');
  if (issuedAt && dueDate && dueDate < issuedAt) {
    throw new FinanceError('La fecha de vencimiento no puede ser anterior a la de emisión.');
  }
  const projectId = idField(data.project_id);
  if (projectId === undefined) throw new FinanceError('Ese proyecto no existe.', 404);

  const q = (text, params) => sql.query(text, params);
  const c = await q('SELECT id, status FROM clients WHERE id = $1', [clientId]);
  if (!c.rowCount) throw new FinanceError('Ese cliente no existe.', 404);
  if (c.rows[0].status === 'archived') throw new FinanceError(ARCHIVED_CLIENT_MSG, 409);
  await checkProject(q, projectId, clientId);

  const r = await q(
    `INSERT INTO invoices (invoice_number, client_id, project_id, amount_cents, currency,
                           status, issued_at, due_date, description)
     VALUES (next_invoice_id(), $1, $2, $3, 'USD', $4, $5, $6, $7)
     RETURNING *`,
    [clientId, projectId, amount, status, issuedAt, dueDate, cleanText(data.description)],
  );
  return r.rows[0];
}

// Edita una factura (FIN-01). fields: amount_cents, description, issued_at,
// due_date, client_id, project_id, status (solo draft|sent|void). Todo en una
// transacción con la factura bloqueada; al final se recalcula el estado.
export async function updateInvoice(id, fields = {}) {
  const found = await withTx(async (q) => {
    const cur = await q('SELECT * FROM invoices WHERE id = $1 FOR UPDATE', [id]);
    if (!cur.rowCount) return false;
    const inv = cur.rows[0];
    const agg = await q('SELECT COALESCE(SUM(amount_cents), 0)::bigint AS paid FROM payments WHERE invoice_id = $1', [id]);
    const paid = Number(agg.rows[0].paid);

    const set = [];
    const vals = [];
    const put = (col, v) => { vals.push(v); set.push(`${col} = $${vals.length}`); };

    if ('amount_cents' in fields) {
      const a = toCents(fields.amount_cents);
      if (a == null || a <= 0) throw new FinanceError('El monto de la factura debe ser mayor que $0.');
      if (a < paid) throw new FinanceError(`El monto no puede ser menor que lo ya cobrado (${formatUsd(paid)}).`, 409);
      put('amount_cents', a);
    }
    if ('description' in fields) put('description', cleanText(fields.description));

    const issued = 'issued_at' in fields ? dayField(fields.issued_at, 'emisión') : dayOf(inv.issued_at);
    const due = 'due_date' in fields ? dayField(fields.due_date, 'vencimiento') : dayOf(inv.due_date);
    if (issued && due && due < issued) {
      throw new FinanceError('La fecha de vencimiento no puede ser anterior a la de emisión.');
    }
    if ('issued_at' in fields) put('issued_at', issued);
    if ('due_date' in fields) put('due_date', due);

    let clientId = String(inv.client_id);
    if ('client_id' in fields) {
      const cid = idField(fields.client_id);
      if (!cid) throw new FinanceError('Elige un cliente.');
      if (cid !== clientId) {
        if (paid > 0) throw new FinanceError('Esta factura ya tiene pagos: no se puede cambiar de cliente.', 409);
        const c = await q('SELECT id, status FROM clients WHERE id = $1', [cid]);
        if (!c.rowCount) throw new FinanceError('Ese cliente no existe.', 404);
        if (c.rows[0].status === 'archived') throw new FinanceError(ARCHIVED_CLIENT_MSG, 409);
        put('client_id', cid);
        clientId = cid;
        // El proyecto anterior era del otro cliente: se desvincula si no llega uno nuevo.
        if (!('project_id' in fields) && inv.project_id) put('project_id', null);
      }
    }
    if ('project_id' in fields) {
      const pid = idField(fields.project_id);
      if (pid === undefined) throw new FinanceError('Ese proyecto no existe.', 404);
      await checkProject(q, pid, clientId);
      put('project_id', pid);
    }
    if ('status' in fields) {
      const target = typeof fields.status === 'string' ? fields.status.trim() : '';
      const problem = manualStatusProblem(target, paid);
      if (problem) throw new FinanceError(problem, target === 'draft' ? 409 : 400);
      put('status', target);
    }

    if (set.length) {
      vals.push(id);
      await q(`UPDATE invoices SET ${set.join(', ')} WHERE id = $${vals.length}`, vals);
    }
    await recomputeWith(q, id);
    return true;
  });
  return found ? getInvoice(id) : null;
}

// Compatibilidad: el PATCH viejo solo mandaba { status }. Ahora pasa por las
// mismas reglas (solo Borrador, Enviada o Anulada a mano).
export async function updateInvoiceStatus(id, newStatus) {
  return updateInvoice(id, { status: newStatus });
}

// Borra una factura SOLO si no tiene pagos (antes arrastraba sus pagos en
// cascada y el historial de cobros desaparecía). Con pagos: se anula.
// Devuelve { invoice_number } si la borró, null si no existe.
export async function deleteInvoice(id) {
  const r = await sql`
    DELETE FROM invoices
     WHERE id = ${id}
       AND NOT EXISTS (SELECT 1 FROM payments WHERE invoice_id = ${id})
    RETURNING id, invoice_number`;
  if (r.rowCount) return { invoice_number: r.rows[0].invoice_number };
  const ex = await sql`SELECT id FROM invoices WHERE id = ${id} LIMIT 1`;
  if (!ex.rowCount) return null;
  throw new FinanceError('Esta factura tiene pagos registrados. Anúlala en lugar de borrarla: así el historial de cobros no se pierde.', 409);
}

// Recalcula el estado GUARDADO de una factura según sus pagos (sin 'overdue',
// que se calcula al leer). No toca las anuladas. q = consulta de la transacción.
async function recomputeWith(q, invoiceId) {
  const r = await q(
    `SELECT i.status, i.amount_cents,
            COALESCE((SELECT SUM(amount_cents) FROM payments WHERE invoice_id = i.id), 0)::bigint AS paid_cents
       FROM invoices i WHERE i.id = $1`, [invoiceId]);
  if (!r.rowCount) return null;
  const row = r.rows[0];
  const next = baseInvoiceStatus(row);
  if (next !== row.status) await q('UPDATE invoices SET status = $1 WHERE id = $2', [next, invoiceId]);
  return next;
}

// Recalcula y persiste el estado de una factura según sus pagos:
//   pagado ≥ monto → 'paid' · algún pago → 'partial' · sin pagos → 'sent'
//   (o 'draft' si era borrador). No toca 'void'. Devuelve la factura (con saldo).
export async function recomputeInvoiceStatus(invoiceId) {
  await recomputeWith((text, params) => sql.query(text, params), invoiceId);
  return getInvoice(invoiceId);
}

// ════════════════════════════════════════════════════════════════
//  PAYMENTS
// ════════════════════════════════════════════════════════════════

// Bloquea la factura y devuelve { invoice, paid } (paid sin el pago `exceptId`).
async function lockInvoice(q, invoiceId, exceptId = null) {
  const inv = await q('SELECT id, client_id, status, amount_cents FROM invoices WHERE id = $1 FOR UPDATE', [invoiceId]);
  if (!inv.rowCount) throw new FinanceError('Factura no encontrada', 404);
  const agg = exceptId
    ? await q('SELECT COALESCE(SUM(amount_cents), 0)::bigint AS paid FROM payments WHERE invoice_id = $1 AND id <> $2', [invoiceId, exceptId])
    : await q('SELECT COALESCE(SUM(amount_cents), 0)::bigint AS paid FROM payments WHERE invoice_id = $1', [invoiceId]);
  return { invoice: inv.rows[0], paid: Number(agg.rows[0].paid) };
}

// Registra un pago e inmediatamente recalcula el estado de la factura.
// data: { invoice_id, amount_cents, method, paid_at, reference, stripe_payment_id }
// client_id se deriva de la factura (consistencia). FIN-09: nunca en anuladas
// ni por encima del saldo. paid_at por defecto = HOY EN HOUSTON (FIN-03).
export async function recordPayment(data = {}) {
  const invId = idField(data.invoice_id);
  if (!invId) throw new FinanceError('Factura no encontrada', 404);
  const amount = toCents(data.amount_cents);
  const method = PAYMENT_METHODS.includes(data.method) ? data.method : 'other';
  const paidAt = dayField(data.paid_at, 'pago') || houstonDate();

  const payment = await withTx(async (q) => {
    const { invoice, paid } = await lockInvoice(q, invId);
    const problem = paymentProblem({ status: invoice.status, amount_cents: invoice.amount_cents, paid_cents: paid, add: amount });
    if (problem) throw new FinanceError(problem, amount > 0 ? 409 : 400);
    const r = await q(
      `INSERT INTO payments (invoice_id, client_id, amount_cents, method, paid_at, reference, stripe_payment_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [invId, invoice.client_id, amount, method, paidAt, cleanText(data.reference, 200), cleanText(data.stripe_payment_id, 200)],
    );
    await recomputeWith(q, invId);
    return r.rows[0];
  });
  return { payment, invoice: await getInvoice(invId) };
}

export async function getPayment(id) {
  const r = await sql`
    SELECT p.*, i.invoice_number FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
     WHERE p.id = ${id} LIMIT 1`;
  return r.rowCount ? r.rows[0] : null;
}

// Edita un pago (FIN-01): amount_cents, method, paid_at, reference. El monto
// nuevo no puede superar el saldo (sin contar este mismo pago). Recalcula la factura.
export async function updatePayment(id, fields = {}) {
  const out = await withTx(async (q) => {
    const cur = await q('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [id]);
    if (!cur.rowCount) return null;
    const pay = cur.rows[0];
    const set = [];
    const vals = [];
    const put = (col, v) => { vals.push(v); set.push(`${col} = $${vals.length}`); };

    if ('amount_cents' in fields) {
      const amount = toCents(fields.amount_cents);
      if (amount !== Number(pay.amount_cents)) {
        const { invoice, paid } = await lockInvoice(q, pay.invoice_id, id);
        const problem = paymentProblem({ status: invoice.status, amount_cents: invoice.amount_cents, paid_cents: paid, add: amount });
        if (problem) throw new FinanceError(problem, amount > 0 ? 409 : 400);
      }
      put('amount_cents', amount);
    }
    if ('method' in fields) put('method', PAYMENT_METHODS.includes(fields.method) ? fields.method : 'other');
    if ('paid_at' in fields) {
      const d = dayField(fields.paid_at, 'pago');
      if (!d) throw new FinanceError('Indica la fecha del pago.');
      put('paid_at', d);
    }
    if ('reference' in fields) put('reference', cleanText(fields.reference, 200));

    if (set.length) {
      vals.push(id);
      await q(`UPDATE payments SET ${set.join(', ')} WHERE id = $${vals.length}`, vals);
    }
    await recomputeWith(q, pay.invoice_id);
    return { invoiceId: pay.invoice_id };
  });
  if (!out) return null;
  return { payment: await getPayment(id), invoice: await getInvoice(out.invoiceId) };
}

// Borra un pago y recalcula el estado de su factura (FIN-01).
export async function deletePayment(id) {
  const out = await withTx(async (q) => {
    const r = await q('DELETE FROM payments WHERE id = $1 RETURNING invoice_id', [id]);
    if (!r.rowCount) return null;
    await recomputeWith(q, r.rows[0].invoice_id);
    return { invoiceId: r.rows[0].invoice_id };
  });
  if (!out) return null;
  return { deleted: String(id), invoice: await getInvoice(out.invoiceId) };
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
// FIN-19: next_project_code() dentro del INSERT (el bloqueo cubre la inserción).
export async function createProject(data = {}) {
  const amount = Number.isFinite(+data.agreed_amount_cents) ? Math.max(0, Math.round(+data.agreed_amount_cents)) : 0;
  const status = PROJECT_STATUSES.includes(data.status) ? data.status : 'active';

  const r = await sql`
    INSERT INTO projects (
      project_code, client_id, brief_project_id, name, service_type,
      agreed_amount_cents, status, started_at, completed_at
    ) VALUES (
      next_project_code(), ${data.client_id}, ${data.brief_project_id || null}, ${data.name || null},
      ${data.service_type || null}, ${amount}, ${status},
      ${data.started_at || null}, ${data.completed_at || null}
    )
    RETURNING *`;
  return r.rows[0];
}

// ════════════════════════════════════════════════════════════════
//  SUMMARY — métricas para KPIs + gráfico de ingresos
// ════════════════════════════════════════════════════════════════

// Criterios (FIN-11), los mismos que escribe cada tarjeta del panel:
//   collected_this_month_cents  — pagos con fecha de este mes (hora de Houston)
//   collected_prev_same_period_cents — pagos del mes anterior hasta el mismo día
//                                  (comparación justa con un mes a medias)
//   ar_total_cents              — por cobrar: saldo de las facturas ABIERTAS
//                                  (enviadas, parciales y vencidas). SIN borradores
//                                  ni anuladas.
//   overdue_cents / _count      — saldo de las vencidas (estado derivado)
//   draft_total_cents / _count  — borradores (fuera de Por cobrar, a la vista)
//   revenue_by_month            — [{ month:'YYYY-MM', total_cents }] últimos 6 meses (por paid_at)
//   counts                      — { clients, invoices, open_invoices, overdue_invoices, draft_invoices }
//   expenses_this_month_cents   — gastos puntuales del mes (company_expenses, por spent_at)
//   subscriptions_monthly_cents — estimado mensual de subs activas (anual → /12)
//   net_this_month_cents        — cobrado − gastos del mes − suscripciones (estimado mensual)
// "Hoy" y "este mes" en HORA DE HOUSTON (SQL_TODAY_HOUSTON). La home
// (dashboard/analytics) reutiliza este resumen, así ambas cifras coinciden.
export async function financeSummary() {
  const today = SQL_TODAY_HOUSTON;
  const collected = await sql.query(`
    SELECT
      COALESCE(SUM(amount_cents) FILTER (WHERE paid_at >= date_trunc('month', ${today})), 0)::bigint AS cents,
      COALESCE(SUM(amount_cents) FILTER (
        WHERE paid_at >= date_trunc('month', ${today}) - INTERVAL '1 month'
          AND paid_at <= (${today} - INTERVAL '1 month')::date), 0)::bigint AS prev_same
      FROM payments
     WHERE paid_at >= date_trunc('month', ${today}) - INTERVAL '1 month'`);

  // Por cobrar, vencido y borradores sobre el estado DERIVADO (una sola fuente).
  const inv = await sql.query(`
    SELECT
      COALESCE(SUM(b.balance_cents) FILTER (WHERE b.status IN ('sent','partial','overdue')), 0)::bigint AS ar,
      COUNT(*) FILTER (WHERE b.status IN ('sent','partial','overdue'))::int AS open_n,
      COALESCE(SUM(b.balance_cents) FILTER (WHERE b.status = 'overdue'), 0)::bigint AS overdue,
      COUNT(*) FILTER (WHERE b.status = 'overdue')::int AS overdue_n,
      COALESCE(SUM(b.balance_cents) FILTER (WHERE b.status = 'draft'), 0)::bigint AS draft,
      COUNT(*) FILTER (WHERE b.status = 'draft')::int AS draft_n,
      COUNT(*)::int AS total_n
      FROM (${INVOICE_BASE_SQL}) b`);

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

  const clients = await sql`SELECT COUNT(*)::int AS n FROM clients`;

  // Egresos: gastos del mes + estimado mensual de suscripciones activas.
  const extras = await financeExtras();
  const collectedCents = Number(collected.rows[0].cents);
  const netThisMonth = collectedCents
    - extras.expenses_this_month_cents
    - extras.subscriptions_monthly_cents;
  const iv = inv.rows[0];

  return {
    collected_this_month_cents: collectedCents,
    collected_prev_same_period_cents: Number(collected.rows[0].prev_same),
    ar_total_cents: Number(iv.ar),
    overdue_cents: Number(iv.overdue),
    overdue_count: Number(iv.overdue_n),
    draft_total_cents: Number(iv.draft),
    draft_count: Number(iv.draft_n),
    revenue_by_month: revenue.rows.map((r) => ({ month: r.month, total_cents: Number(r.total_cents) })),
    counts: {
      clients: clients.rows[0].n,
      invoices: Number(iv.total_n),
      open_invoices: Number(iv.open_n),
      overdue_invoices: Number(iv.overdue_n),
      draft_invoices: Number(iv.draft_n),
    },
    expenses_this_month_cents: extras.expenses_this_month_cents,
    subscriptions_monthly_cents: extras.subscriptions_monthly_cents,
    subscriptions_active: extras.subscriptions_active,
    net_this_month_cents: netThisMonth,
    meta: { today: houstonDate() },
  };
}

// Para pruebas y para quien necesite el estado derivado en JS (mismo criterio que el SQL).
export { effectiveInvoiceStatus };
