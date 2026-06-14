// ════════════════════════════════════════════════════════════════
//  lib/projects.mjs — Helpers de queries sobre `projects` + `project_milestones`
//  - `projects` la define la migración 004 (Finanzas):
//      id, project_code, client_id, brief_project_id, name, service_type,
//      agreed_amount_cents, status, started_at, completed_at, created_at…
//  - `project_milestones` la define la migración 005 (este slice):
//      id, project_id, stage, label, status, position, due_date, done_at…
//  Montos SIEMPRE en CENTAVOS (BIGINT). Ver db/migrations/004_*.sql y 005_milestones.sql.
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';

// Estados válidos de un proyecto — DEBEN coincidir con la migración 004 (Finanzas):
//   active | on_hold | completed | cancelled
export const PROJECT_STATUSES   = ['active', 'on_hold', 'completed', 'cancelled'];
export const MILESTONE_STATUSES = ['pending', 'in_progress', 'done'];

// NB: el tagged-template `sql` de @vercel/postgres NO interpola identificadores
// (sólo valores parametrizados), así que la lista de columnas se escribe LITERAL
// en cada rama — mismo patrón que listBriefs en lib/db.mjs.

// ── Lectura: lista de proyectos ───────────────────────────────
// Join a clients para el nombre del cliente. opts: { status, search, limit=50, offset=0 }
// Cada fila trae además milestones_total / milestones_done para calcular el % en UI.
export async function listProjects(opts = {}) {
  const { status, search, limit = 50, offset = 0 } = opts;
  const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const off = Math.max(parseInt(offset) || 0, 0);
  const q = (search || '').trim();
  const hasSearch = q.length > 0;
  const pat = hasSearch ? `%${q}%` : null;
  const hasStatus = status && PROJECT_STATUSES.includes(status);

  let rows, total;
  if (hasStatus && hasSearch) {
    const r = await sql`
      SELECT p.id, p.project_code, p.client_id, p.brief_project_id, p.name,
             p.service_type, p.agreed_amount_cents, p.status,
             p.started_at, p.completed_at, p.created_at, p.updated_at,
             c.business_name AS client_name
        FROM projects p LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.status = ${status}
         AND (p.name ILIKE ${pat} OR p.project_code ILIKE ${pat}
              OR p.brief_project_id ILIKE ${pat} OR c.business_name ILIKE ${pat})
       ORDER BY p.created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`
      SELECT COUNT(*)::int AS n
        FROM projects p LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.status = ${status}
         AND (p.name ILIKE ${pat} OR p.project_code ILIKE ${pat}
              OR p.brief_project_id ILIKE ${pat} OR c.business_name ILIKE ${pat})`;
    total = t.rows[0].n;
  } else if (hasStatus) {
    const r = await sql`
      SELECT p.id, p.project_code, p.client_id, p.brief_project_id, p.name,
             p.service_type, p.agreed_amount_cents, p.status,
             p.started_at, p.completed_at, p.created_at, p.updated_at,
             c.business_name AS client_name
        FROM projects p LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.status = ${status}
       ORDER BY p.created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`SELECT COUNT(*)::int AS n FROM projects WHERE status = ${status}`;
    total = t.rows[0].n;
  } else if (hasSearch) {
    const r = await sql`
      SELECT p.id, p.project_code, p.client_id, p.brief_project_id, p.name,
             p.service_type, p.agreed_amount_cents, p.status,
             p.started_at, p.completed_at, p.created_at, p.updated_at,
             c.business_name AS client_name
        FROM projects p LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.name ILIKE ${pat} OR p.project_code ILIKE ${pat}
          OR p.brief_project_id ILIKE ${pat} OR c.business_name ILIKE ${pat}
       ORDER BY p.created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`
      SELECT COUNT(*)::int AS n
        FROM projects p LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.name ILIKE ${pat} OR p.project_code ILIKE ${pat}
          OR p.brief_project_id ILIKE ${pat} OR c.business_name ILIKE ${pat}`;
    total = t.rows[0].n;
  } else {
    const r = await sql`
      SELECT p.id, p.project_code, p.client_id, p.brief_project_id, p.name,
             p.service_type, p.agreed_amount_cents, p.status,
             p.started_at, p.completed_at, p.created_at, p.updated_at,
             c.business_name AS client_name
        FROM projects p LEFT JOIN clients c ON c.id = p.client_id
       ORDER BY p.created_at DESC LIMIT ${lim} OFFSET ${off}`;
    rows = r.rows;
    const t = await sql`SELECT COUNT(*)::int AS n FROM projects`;
    total = t.rows[0].n;
  }

  // Agregamos progreso (total/done) por proyecto en una sola query.
  if (rows.length) {
    const ids = rows.map((x) => x.id);
    const agg = await sql`
      SELECT project_id,
             COUNT(*)::int                              AS total,
             COUNT(*) FILTER (WHERE status = 'done')::int AS done
        FROM project_milestones
       WHERE project_id = ANY(${ids})
       GROUP BY project_id`;
    const byId = new Map(agg.rows.map((a) => [String(a.project_id), a]));
    for (const row of rows) {
      const a = byId.get(String(row.id));
      row.milestones_total = a ? a.total : 0;
      row.milestones_done  = a ? a.done  : 0;
      row.progress = a && a.total ? Math.round((a.done / a.total) * 100) : 0;
    }
  }

  return { rows, total, limit: lim, offset: off };
}

// ── Lectura: un proyecto por id (con nombre de cliente) ───────
export async function getProject(id) {
  const pid = parseInt(id, 10);
  if (!Number.isFinite(pid)) return null;
  const r = await sql`
    SELECT p.id, p.project_code, p.client_id, p.brief_project_id, p.name,
           p.service_type, p.agreed_amount_cents, p.status,
           p.started_at, p.completed_at, p.created_at, p.updated_at,
           c.business_name AS client_name
      FROM projects p LEFT JOIN clients c ON c.id = p.client_id
     WHERE p.id = ${pid} LIMIT 1`;
  return r.rowCount ? r.rows[0] : null;
}

// Resuelve un proyecto por su brief vinculado (MRC-XXX). Útil al crear.
export async function getProjectByBriefId(briefProjectId) {
  if (!briefProjectId) return null;
  const r = await sql`
    SELECT p.id, p.project_code, p.client_id, p.brief_project_id, p.name,
           p.service_type, p.agreed_amount_cents, p.status,
           p.started_at, p.completed_at, p.created_at, p.updated_at,
           c.business_name AS client_name
      FROM projects p LEFT JOIN clients c ON c.id = p.client_id
     WHERE p.brief_project_id = ${briefProjectId} LIMIT 1`;
  return r.rowCount ? r.rows[0] : null;
}

// Resuelve un client_id válido (la columna projects.client_id es NOT NULL en 004).
// Estrategia, en orden:
//   1) si viene clientId explícito y existe → usarlo.
//   2) si viene briefProjectId y un cliente ya tiene ese source_brief_id → reusarlo;
//      si no, crear un cliente nuevo a partir de los datos del brief.
//   3) crear/reusar un cliente genérico "Directo" para proyectos sin cliente formal.
// Usa next_client_id() (definido en 004) para el client_code obligatorio.
async function resolveClientId({ clientId, briefProjectId }) {
  if (clientId != null && clientId !== '') {
    const pid = parseInt(clientId, 10);
    if (Number.isFinite(pid)) {
      const ex = await sql`SELECT id FROM clients WHERE id = ${pid} LIMIT 1`;
      if (ex.rowCount) return ex.rows[0].id;
    }
  }

  const briefId = briefProjectId ? String(briefProjectId).trim() : null;
  if (briefId) {
    const reuse = await sql`SELECT id FROM clients WHERE source_brief_id = ${briefId} LIMIT 1`;
    if (reuse.rowCount) return reuse.rows[0].id;

    const brief = await sql`
      SELECT business_name, owner_name, email, phone, city_state
        FROM briefs WHERE project_id = ${briefId} LIMIT 1`;
    const b = brief.rowCount ? brief.rows[0] : {};
    const created = await sql`
      INSERT INTO clients
        (client_code, business_name, owner_name, email, phone, city_state, source_brief_id, status)
      VALUES
        (next_client_id(), ${b.business_name || 'Cliente sin nombre'}, ${b.owner_name || null},
         ${b.email || null}, ${b.phone || null}, ${b.city_state || null}, ${briefId}, 'active')
      RETURNING id`;
    return created.rows[0].id;
  }

  // Cliente genérico "Directo" (find-or-create por business_name).
  const generic = await sql`SELECT id FROM clients WHERE business_name = 'Directo' LIMIT 1`;
  if (generic.rowCount) return generic.rows[0].id;
  const made = await sql`
    INSERT INTO clients (client_code, business_name, status)
    VALUES (next_client_id(), 'Directo', 'active')
    RETURNING id`;
  return made.rows[0].id;
}

// ── Crear proyecto ────────────────────────────────────────────
// data: { name, clientId, briefProjectId, serviceType, agreedAmountCents, status }
// Respeta los NOT NULL de la migración 004: project_code (vía next_project_code()),
// client_id (vía resolveClientId), agreed_amount_cents (default 0). started_at es DATE.
export async function createProject(data = {}) {
  const name = (data.name || '').trim() || 'Proyecto sin nombre';
  const status = PROJECT_STATUSES.includes(data.status) ? data.status : 'active';
  const briefId = data.briefProjectId ? String(data.briefProjectId).trim() : null;
  const serviceType = data.serviceType ? String(data.serviceType).trim() : null;
  let cents = data.agreedAmountCents;
  cents = cents == null || cents === '' ? 0 : Math.max(0, Math.round(Number(cents)) || 0);

  const clientId = await resolveClientId({ clientId: data.clientId, briefProjectId: briefId });

  const r = await sql`
    INSERT INTO projects
      (project_code, name, client_id, brief_project_id, service_type, agreed_amount_cents, status, started_at)
    VALUES
      (next_project_code(), ${name}, ${clientId}, ${briefId}, ${serviceType}, ${cents}, ${status},
       ${status === 'active' ? new Date().toISOString().slice(0, 10) : null})
    RETURNING id`;
  const id = r.rows[0].id;

  // Sembramos los hitos por defecto (idempotente vía la función SQL).
  await sql`SELECT seed_default_milestones(${id})`;
  return getProject(id);
}

// ── Hitos ─────────────────────────────────────────────────────
export async function listMilestones(projectId) {
  const pid = parseInt(projectId, 10);
  if (!Number.isFinite(pid)) return [];
  const r = await sql`
    SELECT id, project_id, stage, label, status, position, due_date, done_at,
           created_at, updated_at
      FROM project_milestones
     WHERE project_id = ${pid}
     ORDER BY position ASC, id ASC`;
  return r.rows;
}

// Crea un hito al final del proyecto (position = max+1).
// data: { stage, label, status, dueDate }
export async function createMilestone(projectId, data = {}) {
  const pid = parseInt(projectId, 10);
  if (!Number.isFinite(pid)) throw new Error('projectId inválido');
  const label = (data.label || '').trim();
  if (!label) throw new Error('label requerido');
  const status = MILESTONE_STATUSES.includes(data.status) ? data.status : 'pending';
  const stage = data.stage ? String(data.stage).trim() : null;
  const dueDate = data.dueDate ? String(data.dueDate).trim() : null;

  const r = await sql`
    INSERT INTO project_milestones (project_id, stage, label, status, position, due_date, done_at)
    VALUES (
      ${pid}, ${stage}, ${label}, ${status},
      COALESCE((SELECT MAX(position) + 1 FROM project_milestones WHERE project_id = ${pid}), 0),
      ${dueDate},
      ${status === 'done' ? new Date().toISOString() : null}
    )
    RETURNING id, project_id, stage, label, status, position, due_date, done_at,
              created_at, updated_at`;
  return r.rows[0];
}

// Upsert por (project_id, stage): si existe el stage, actualiza label/status; si no, lo crea.
export async function upsertMilestone(projectId, data = {}) {
  const pid = parseInt(projectId, 10);
  if (!Number.isFinite(pid)) throw new Error('projectId inválido');
  const stage = data.stage ? String(data.stage).trim() : null;
  if (!stage) return createMilestone(projectId, data);

  const existing = await sql`
    SELECT id FROM project_milestones WHERE project_id = ${pid} AND stage = ${stage} LIMIT 1`;
  if (existing.rowCount) {
    const id = existing.rows[0].id;
    const label = data.label != null ? String(data.label).trim() : null;
    const status = MILESTONE_STATUSES.includes(data.status) ? data.status : null;
    if (status) await updateMilestoneStatus(id, status);
    if (label) {
      await sql`UPDATE project_milestones SET label = ${label} WHERE id = ${id}`;
    }
    const r = await sql`
      SELECT id, project_id, stage, label, status, position, due_date, done_at,
             created_at, updated_at
        FROM project_milestones WHERE id = ${id}`;
    return r.rows[0];
  }
  return createMilestone(projectId, data);
}

// Cambia el estado de un hito; setea/limpia done_at según corresponda.
export async function updateMilestoneStatus(milestoneId, newStatus) {
  const mid = parseInt(milestoneId, 10);
  if (!Number.isFinite(mid)) throw new Error('milestoneId inválido');
  if (!MILESTONE_STATUSES.includes(newStatus)) {
    throw new Error(`Status inválido: ${newStatus}`);
  }
  let r;
  if (newStatus === 'done') {
    r = await sql`
      UPDATE project_milestones
         SET status = ${newStatus}, done_at = COALESCE(done_at, NOW())
       WHERE id = ${mid}
      RETURNING id, project_id, stage, label, status, position, due_date, done_at`;
  } else {
    r = await sql`
      UPDATE project_milestones
         SET status = ${newStatus}, done_at = NULL
       WHERE id = ${mid}
      RETURNING id, project_id, stage, label, status, position, due_date, done_at`;
  }
  return r.rowCount ? r.rows[0] : null;
}

export async function deleteMilestone(milestoneId) {
  const mid = parseInt(milestoneId, 10);
  if (!Number.isFinite(mid)) return false;
  const r = await sql`DELETE FROM project_milestones WHERE id = ${mid} RETURNING id`;
  return r.rowCount > 0;
}

// ── Progreso (% = done / total) ───────────────────────────────
export async function projectProgress(projectId) {
  const pid = parseInt(projectId, 10);
  if (!Number.isFinite(pid)) return { total: 0, done: 0, in_progress: 0, pending: 0, percent: 0 };
  const r = await sql`
    SELECT
      COUNT(*)::int                                     AS total,
      COUNT(*) FILTER (WHERE status = 'done')::int        AS done,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE status = 'pending')::int     AS pending
      FROM project_milestones
     WHERE project_id = ${pid}`;
  const row = r.rows[0];
  const percent = row.total ? Math.round((row.done / row.total) * 100) : 0;
  return { ...row, percent };
}
