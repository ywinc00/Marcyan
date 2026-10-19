// ════════════════════════════════════════════════════════════════
//  lib/leads.mjs — Helpers de queries sobre `leads`
//  Gemelo adelgazado de lib/db.mjs (briefs). Los leads son mensajes
//  de contacto (form simple + chatbot), distintos de los briefs de
//  proyecto. Ver db/migrations/003_leads.sql.
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';
import { monthRange, houstonMidnightUtc } from './dates.mjs';

export const LEAD_STATUSES = ['new', 'contacted', 'converted', 'archived'];
export const LEAD_SOURCES  = ['contact', 'chat', 'diagnostic'];

// ── Crear lead ────────────────────────────────────────────────
// data: { name, email, phone, business_name, city, interest, message,
//         source, ipAddress, userAgent }
export async function createLead(data = {}) {
  const source = LEAD_SOURCES.includes(data.source) ? data.source : 'contact';

  // ── Dedup app-level idempotente ──────────────────────────────
  // Antes de gastar un folio: si en los últimos 10 min ya entró un lead
  // del MISMO source con el mismo email O el mismo teléfono, devolvemos
  // ese ref_id en vez de crear un duplicado. Maneja nulls: solo compara
  // el campo que de verdad llegó.
  const email = data.email || null;
  const phone = data.phone || null;
  if (email || phone) {
    const dup = await sql`
      SELECT ref_id FROM leads
       WHERE source = ${source}
         AND created_at >= NOW() - INTERVAL '10 minutes'
         AND (
              (${email}::text IS NOT NULL AND email = ${email})
           OR (${phone}::text IS NOT NULL AND phone = ${phone})
         )
       ORDER BY created_at DESC
       LIMIT 1`;
    if (dup.rowCount) return dup.rows[0].ref_id;
  }

  const idResult = await sql`SELECT next_lead_id() AS id`;
  const refId = idResult.rows[0].id;

  await sql`
    INSERT INTO leads (
      ref_id, source, name, email, phone, business_name, city, interest, message,
      ip_address, user_agent
    ) VALUES (
      ${refId}, ${source}, ${data.name || null}, ${data.email || null},
      ${data.phone || null}, ${data.business_name || null}, ${data.city || null},
      ${data.interest || null}, ${data.message || null},
      ${data.ipAddress || null}, ${data.userAgent || null}
    )
  `;
  return refId;
}

// ── Lectura ───────────────────────────────────────────────────
export async function getLeadByRefId(refId) {
  const r = await sql`SELECT * FROM leads WHERE ref_id = ${refId} LIMIT 1`;
  return r.rowCount ? r.rows[0] : null;
}

// Columnas que viajan al panel en la LISTA (CRM-23): todo lo útil para
// trabajar el lead, sin IP ni navegador. Esos dos solo salen en la ficha
// (getLeadByRefId → GET /api/admin/leads/:id), que es donde hacen falta.
const LIST_COLUMNS = `id, ref_id, status, source, name, email, phone, business_name,
  city, interest, message, converted_brief_id, created_at, updated_at`;

// Columnas del CSV de leads (OP-18): todo lo que sirve como copia de
// seguridad y para trabajar en una hoja. Sin IP ni navegador.
export const LEAD_EXPORT_COLUMNS = [
  'ref_id', 'status', 'source', 'created_at', 'updated_at',
  'name', 'email', 'phone', 'business_name', 'city',
  'interest', 'message', 'converted_brief_id',
];

// 'YYYY-MM-DD' (día local de Houston) → instante UTC de su medianoche.
// Acepta también un ISO completo. Devuelve null si no es una fecha válida.
function dayStartIso(v) {
  const s = String(v || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return houstonMidnightUtc(Number(m[1]), Number(m[2]), Number(m[3])).toISOString();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function nextDayStartIso(v) {
  const s = String(v || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return dayStartIso(s);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1));
  return houstonMidnightUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()).toISOString();
}

// WHERE parametrizado común a la lista y al CSV. Filtros (todos opcionales):
//   status (lista blanca) · source (lista blanca) · search (nombre, email,
//   teléfono, negocio, ref, ciudad, mensaje) · from / to ('YYYY-MM-DD' en hora
//   de Houston, ambos INCLUSIVE).
export function buildLeadFilter(opts = {}) {
  const where = [];
  const params = [];
  const add = (frag, val) => { params.push(val); where.push(frag.replace('?', `$${params.length}`)); };

  if (opts.status && LEAD_STATUSES.includes(opts.status)) add('status = ?', opts.status);
  if (opts.source && LEAD_SOURCES.includes(opts.source)) add('source = ?', opts.source);

  const q = (opts.search || '').toString().trim().slice(0, 200);
  if (q) {
    params.push(`%${q}%`);
    const n = `$${params.length}`;
    where.push(`(name ILIKE ${n} OR email ILIKE ${n} OR phone ILIKE ${n}
               OR business_name ILIKE ${n} OR ref_id ILIKE ${n}
               OR city ILIKE ${n} OR message ILIKE ${n})`);
  }

  const from = opts.from ? dayStartIso(opts.from) : null;
  const to   = opts.to   ? nextDayStartIso(opts.to) : null;
  if (from) add('created_at >= ?', from);
  if (to)   add('created_at < ?', to);

  return { text: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

// Lista paginada con filtros opcionales.
// opts: { status, source, search, from, to, limit=30, offset=0 }
// (source/from/to son nuevos y opcionales: las llamadas viejas siguen igual.)
export async function listLeads(opts = {}) {
  const { limit = 30, offset = 0 } = opts;
  const lim = Math.min(Math.max(parseInt(limit) || 30, 1), 200);
  const off = Math.max(parseInt(offset) || 0, 0);
  const f = buildLeadFilter(opts);

  const n = f.params.length;
  const [r, t] = await Promise.all([
    sql.query(
      `SELECT ${LIST_COLUMNS} FROM leads ${f.text}
        ORDER BY created_at DESC, id DESC LIMIT $${n + 1} OFFSET $${n + 2}`,
      [...f.params, lim, off]),
    sql.query(`SELECT COUNT(*)::int AS n FROM leads ${f.text}`, f.params),
  ]);

  return { rows: r.rows, total: t.rows[0].n, limit: lim, offset: off };
}

// Todas las filas que cumplen el filtro, para el CSV (tope de seguridad 10.000).
export async function listLeadsForExport(opts = {}) {
  const f = buildLeadFilter(opts);
  const r = await sql.query(
    `SELECT ${LEAD_EXPORT_COLUMNS.join(', ')} FROM leads ${f.text}
      ORDER BY created_at DESC, id DESC LIMIT 10000`,
    f.params);
  return r.rows;
}

// Stats agregadas (para KPIs / embudo del dashboard)
//   · this_month: leads creados en el mes en curso en HORA DE HOUSTON.
//   · prev_month: los del mes anterior (mismo criterio), para el delta.
//   · pipeline:   new + contacted (los vivos; sin convertidos ni archivados).
//   · from_diagnostic: el diagnóstico gratis es un origen válido (CRM-23, MOCK-20).
export async function leadStats() {
  const m = monthRange(0);
  const p = monthRange(-1);
  const r = await sql`
    SELECT
      COUNT(*)::int                                       AS total,
      COUNT(*) FILTER (WHERE status = 'new')::int          AS new,
      COUNT(*) FILTER (WHERE status = 'contacted')::int    AS contacted,
      COUNT(*) FILTER (WHERE status = 'converted')::int    AS converted,
      COUNT(*) FILTER (WHERE status = 'archived')::int     AS archived,
      COUNT(*) FILTER (WHERE status IN ('new', 'contacted'))::int AS pipeline,
      COUNT(*) FILTER (WHERE source = 'chat')::int         AS from_chat,
      COUNT(*) FILTER (WHERE source = 'contact')::int      AS from_contact,
      COUNT(*) FILTER (WHERE source = 'diagnostic')::int   AS from_diagnostic,
      COUNT(*) FILTER (WHERE created_at >= ${m.startISO} AND created_at < ${m.endISO})::int AS this_month,
      COUNT(*) FILTER (WHERE created_at >= ${p.startISO} AND created_at < ${p.endISO})::int AS prev_month
      FROM leads
  `;
  return r.rows[0];
}

// ── Mutaciones ────────────────────────────────────────────────
export async function updateLeadStatus(refId, newStatus) {
  if (!LEAD_STATUSES.includes(newStatus)) {
    throw new Error(`Status inválido: ${newStatus}`);
  }
  const r = await sql`
    UPDATE leads SET status = ${newStatus}
     WHERE ref_id = ${refId}
    RETURNING ref_id, status`;
  return r.rowCount ? r.rows[0] : null;
}

export async function deleteLead(refId) {
  const r = await sql`DELETE FROM leads WHERE ref_id = ${refId} RETURNING ref_id`;
  return r.rowCount > 0;
}
