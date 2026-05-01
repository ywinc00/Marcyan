// ════════════════════════════════════════════════════════════════
//  lib/db.mjs — Helpers de queries sobre briefs + events
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';

export const BRIEF_STATUSES = ['pending', 'contacted', 'in_progress', 'completed', 'archived'];

export const BRIEF_LIST_COLUMNS = `
  id, project_id, status, business_name, owner_name, email, phone,
  city_state, website_type, budget_range, timeline, referred_by,
  created_at, updated_at, contacted_at, completed_at
`;

export const BRIEF_FULL_COLUMNS = `*`;

// ── Audit helpers ─────────────────────────────────────────────
export async function logEvent({ projectId, type, actorEmail = null, data = null }) {
  await sql`
    INSERT INTO brief_events (project_id, event_type, actor_email, data)
    VALUES (${projectId}, ${type}, ${actorEmail}, ${data ? JSON.stringify(data) : null}::jsonb)
  `;
}

export async function listEvents(projectId, limit = 50) {
  const r = await sql`
    SELECT id, event_type, actor_email, data, created_at
      FROM brief_events
     WHERE project_id = ${projectId}
     ORDER BY created_at DESC
     LIMIT ${limit}
  `;
  return r.rows;
}

// ── Brief CRUD ────────────────────────────────────────────────
export async function getBriefByProjectId(projectId) {
  const r = await sql`SELECT * FROM briefs WHERE project_id = ${projectId} LIMIT 1`;
  return r.rowCount ? r.rows[0] : null;
}

// Lista paginada con filtros opcionales.
// opts: { status, search, limit=30, offset=0, orderBy='created_at DESC' }
export async function listBriefs(opts = {}) {
  const { status, search, limit = 30, offset = 0 } = opts;
  const lim = Math.min(Math.max(parseInt(limit) || 30, 1), 200);
  const off = Math.max(parseInt(offset) || 0, 0);
  const q = (search || '').trim();
  const hasSearch = q.length > 0;
  const pat = hasSearch ? `%${q}%` : null;

  // Vercel Postgres `sql` template no admite IN/dinámicos fácilmente,
  // así que ramificamos por combinación.
  let rows, total;
  if (status && hasSearch) {
    const r = await sql`
      SELECT id, project_id, status, business_name, owner_name, email, phone,
             city_state, website_type, budget_range, timeline, referred_by,
             created_at, updated_at, contacted_at, completed_at
        FROM briefs
       WHERE status = ${status}
         AND (business_name ILIKE ${pat} OR owner_name ILIKE ${pat}
              OR email ILIKE ${pat} OR phone ILIKE ${pat}
              OR project_id ILIKE ${pat})
       ORDER BY created_at DESC
       LIMIT ${lim} OFFSET ${off}
    `;
    rows = r.rows;
    const t = await sql`
      SELECT COUNT(*)::int AS n FROM briefs
       WHERE status = ${status}
         AND (business_name ILIKE ${pat} OR owner_name ILIKE ${pat}
              OR email ILIKE ${pat} OR phone ILIKE ${pat}
              OR project_id ILIKE ${pat})
    `;
    total = t.rows[0].n;
  } else if (status) {
    const r = await sql`
      SELECT id, project_id, status, business_name, owner_name, email, phone,
             city_state, website_type, budget_range, timeline, referred_by,
             created_at, updated_at, contacted_at, completed_at
        FROM briefs
       WHERE status = ${status}
       ORDER BY created_at DESC
       LIMIT ${lim} OFFSET ${off}
    `;
    rows = r.rows;
    const t = await sql`SELECT COUNT(*)::int AS n FROM briefs WHERE status = ${status}`;
    total = t.rows[0].n;
  } else if (hasSearch) {
    const r = await sql`
      SELECT id, project_id, status, business_name, owner_name, email, phone,
             city_state, website_type, budget_range, timeline, referred_by,
             created_at, updated_at, contacted_at, completed_at
        FROM briefs
       WHERE business_name ILIKE ${pat} OR owner_name ILIKE ${pat}
          OR email ILIKE ${pat} OR phone ILIKE ${pat}
          OR project_id ILIKE ${pat}
       ORDER BY created_at DESC
       LIMIT ${lim} OFFSET ${off}
    `;
    rows = r.rows;
    const t = await sql`
      SELECT COUNT(*)::int AS n FROM briefs
       WHERE business_name ILIKE ${pat} OR owner_name ILIKE ${pat}
          OR email ILIKE ${pat} OR phone ILIKE ${pat}
          OR project_id ILIKE ${pat}
    `;
    total = t.rows[0].n;
  } else {
    const r = await sql`
      SELECT id, project_id, status, business_name, owner_name, email, phone,
             city_state, website_type, budget_range, timeline, referred_by,
             created_at, updated_at, contacted_at, completed_at
        FROM briefs
       ORDER BY created_at DESC
       LIMIT ${lim} OFFSET ${off}
    `;
    rows = r.rows;
    const t = await sql`SELECT COUNT(*)::int AS n FROM briefs`;
    total = t.rows[0].n;
  }

  return { rows, total, limit: lim, offset: off };
}

// Stats agregadas
export async function briefStats() {
  const r = await sql`
    SELECT
      COUNT(*)::int                                      AS total,
      COUNT(*) FILTER (WHERE status = 'pending')::int     AS pending,
      COUNT(*) FILTER (WHERE status = 'contacted')::int   AS contacted,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE status = 'completed')::int   AS completed,
      COUNT(*) FILTER (WHERE status = 'archived')::int    AS archived,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS this_month,
      COUNT(*) FILTER (WHERE status = 'completed'
                         AND completed_at >= date_trunc('month', NOW()))::int AS completed_this_month
      FROM briefs
  `;
  return r.rows[0];
}

// Update status — actualiza también contacted_at / completed_at si aplica
export async function updateBriefStatus(projectId, newStatus, actorEmail) {
  if (!BRIEF_STATUSES.includes(newStatus)) {
    throw new Error(`Status inválido: ${newStatus}`);
  }
  // Ramificamos para setear timestamps específicos
  let result;
  switch (newStatus) {
    case 'contacted':
      result = await sql`
        UPDATE briefs
           SET status = ${newStatus},
               contacted_at = COALESCE(contacted_at, NOW())
         WHERE project_id = ${projectId}
        RETURNING status, contacted_at, completed_at
      `;
      break;
    case 'completed':
      result = await sql`
        UPDATE briefs
           SET status = ${newStatus},
               completed_at = COALESCE(completed_at, NOW())
         WHERE project_id = ${projectId}
        RETURNING status, contacted_at, completed_at
      `;
      break;
    default:
      result = await sql`
        UPDATE briefs
           SET status = ${newStatus}
         WHERE project_id = ${projectId}
        RETURNING status, contacted_at, completed_at
      `;
  }
  return result.rowCount ? result.rows[0] : null;
}

export async function updateBriefSummary(projectId, summary) {
  const r = await sql`
    UPDATE briefs SET summary = ${summary || null}
     WHERE project_id = ${projectId}
    RETURNING summary
  `;
  return r.rowCount ? r.rows[0].summary : null;
}
