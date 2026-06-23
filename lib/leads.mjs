// ════════════════════════════════════════════════════════════════
//  lib/leads.mjs — Helpers de queries sobre `leads`
//  Gemelo adelgazado de lib/db.mjs (briefs). Los leads son mensajes
//  de contacto (form simple + chatbot), distintos de los briefs de
//  proyecto. Ver db/migrations/003_leads.sql.
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';

export const LEAD_STATUSES = ['new', 'contacted', 'converted', 'archived'];
export const LEAD_SOURCES  = ['contact', 'chat'];

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

// Lista paginada con filtros opcionales.
// opts: { status, search, limit=30, offset=0 }
export async function listLeads(opts = {}) {
  const { status, search, limit = 30, offset = 0 } = opts;
  const lim = Math.min(Math.max(parseInt(limit) || 30, 1), 200);
  const off = Math.max(parseInt(offset) || 0, 0);
  const q = (search || '').trim();
  const hasSearch = q.length > 0;
  const pat = hasSearch ? `%${q}%` : null;
  const hasStatus = status && LEAD_STATUSES.includes(status);

  let rows, total;
  if (hasStatus && hasSearch) {
    const r = await sql`
      SELECT * FROM leads
       WHERE status = ${status}
         AND (name ILIKE ${pat} OR email ILIKE ${pat} OR phone ILIKE ${pat}
              OR business_name ILIKE ${pat} OR ref_id ILIKE ${pat})
       ORDER BY created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`
      SELECT COUNT(*)::int AS n FROM leads
       WHERE status = ${status}
         AND (name ILIKE ${pat} OR email ILIKE ${pat} OR phone ILIKE ${pat}
              OR business_name ILIKE ${pat} OR ref_id ILIKE ${pat})`;
    total = t.rows[0].n;
  } else if (hasStatus) {
    const r = await sql`
      SELECT * FROM leads WHERE status = ${status}
       ORDER BY created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`SELECT COUNT(*)::int AS n FROM leads WHERE status = ${status}`;
    total = t.rows[0].n;
  } else if (hasSearch) {
    const r = await sql`
      SELECT * FROM leads
       WHERE name ILIKE ${pat} OR email ILIKE ${pat} OR phone ILIKE ${pat}
          OR business_name ILIKE ${pat} OR ref_id ILIKE ${pat}
       ORDER BY created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`
      SELECT COUNT(*)::int AS n FROM leads
       WHERE name ILIKE ${pat} OR email ILIKE ${pat} OR phone ILIKE ${pat}
          OR business_name ILIKE ${pat} OR ref_id ILIKE ${pat}`;
    total = t.rows[0].n;
  } else {
    const r = await sql`
      SELECT * FROM leads ORDER BY created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`SELECT COUNT(*)::int AS n FROM leads`;
    total = t.rows[0].n;
  }

  return { rows, total, limit: lim, offset: off };
}

// Stats agregadas (para KPIs / embudo del dashboard)
export async function leadStats() {
  const r = await sql`
    SELECT
      COUNT(*)::int                                       AS total,
      COUNT(*) FILTER (WHERE status = 'new')::int          AS new,
      COUNT(*) FILTER (WHERE status = 'contacted')::int    AS contacted,
      COUNT(*) FILTER (WHERE status = 'converted')::int    AS converted,
      COUNT(*) FILTER (WHERE status = 'archived')::int     AS archived,
      COUNT(*) FILTER (WHERE source = 'chat')::int         AS from_chat,
      COUNT(*) FILTER (WHERE source = 'contact')::int      AS from_contact,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS this_month
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
