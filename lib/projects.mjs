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
import { houstonDate } from './dates.mjs';

// Estados válidos de un proyecto — DEBEN coincidir con la migración 004 (Finanzas):
//   active | on_hold | completed | cancelled
export const PROJECT_STATUSES   = ['active', 'on_hold', 'completed', 'cancelled'];
export const MILESTONE_STATUSES = ['pending', 'in_progress', 'done'];

// Tope de montos (centavos): el mismo que usa Finanzas. Evita que una errata
// ("15000000000") meta una cifra absurda en la cartera.
export const MAX_CENTS = 9999999999;
export const MAX_LABEL = 120;
export const MAX_NAME  = 160;

// Error de datos de entrada: el handler lo traduce a 400 con este mensaje,
// que está escrito para el dueño (sin jerga), p. ej. "El brief MRC-099 no existe".
export class ProjectInputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ProjectInputError';
    this.status = status;
  }
}

// ── Validadores puros (sin BD; los cubre scripts/test-projects.mjs) ──────

/** ¿'YYYY-MM-DD' es un día real del calendario? */
export function isValidDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? ''));
  if (!m) return false;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1) return false;
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return d <= last;
}

/**
 * Monto en centavos desde lo que manda el panel.
 *   undefined → { skip: true } (la clave no vino: no se toca)
 *   null / '' → 0 (vaciar el monto lo deja en $0, MOCK-06; la columna es NOT NULL)
 *   entero ≥ 0 y ≤ MAX_CENTS → ese valor
 *   lo demás → { error }
 */
export function parseCentsInput(v) {
  if (v === undefined) return { skip: true };
  if (v === null || v === '') return { cents: 0 };
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  if (!Number.isFinite(n) || n < 0) return { error: 'El monto debe ser una cifra positiva.' };
  const cents = Math.round(n);
  if (cents > MAX_CENTS) return { error: 'El monto es demasiado alto. Revisa la cifra.' };
  return { cents };
}

/** Brief vinculado: '' / null → null (desvincular); 'mrc-12' → 'MRC-12'; otro formato → error. */
export function normalizeBriefId(v) {
  if (v === undefined) return { skip: true };
  if (v === null || String(v).trim() === '') return { value: null };
  const s = String(v).trim().toUpperCase();
  if (!/^MRC-\d{1,6}$/.test(s)) return { error: 'El brief debe tener la forma MRC-012.' };
  return { value: s };
}

/** Cliente: id numérico (BIGINT como texto). '' / null → null (sin cambio de cliente). */
export function normalizeClientId(v) {
  if (v === undefined || v === null || String(v).trim() === '') return { value: null };
  const s = String(v).trim();
  if (!/^\d{1,19}$/.test(s)) return { error: 'Elige un cliente de la lista.' };
  return { value: s };
}

/**
 * Cambios de un proyecto (PATCH). Devuelve { fields, error }; fields solo
 * lleva las claves que vinieron. Claves: name, serviceType, agreedAmountCents,
 * status, clientId, briefProjectId.
 */
export function normalizeProjectPatch(body = {}) {
  const fields = {};
  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return { error: 'El nombre no puede quedar vacío.' };
    if (name.length > MAX_NAME) return { error: `El nombre admite hasta ${MAX_NAME} caracteres.` };
    fields.name = name;
  }
  if (body.serviceType !== undefined) {
    const st = body.serviceType == null ? '' : String(body.serviceType).trim();
    fields.serviceType = st ? st.slice(0, 60) : null;
  }
  const c = parseCentsInput(body.agreedAmountCents);
  if (c.error) return { error: c.error };
  if (!c.skip) fields.agreedAmountCents = c.cents;
  if (body.status !== undefined) {
    const st = typeof body.status === 'string' ? body.status.trim() : '';
    if (!PROJECT_STATUSES.includes(st)) return { error: 'Elige un estado válido para el proyecto.' };
    fields.status = st;
  }
  if (body.clientId !== undefined) {
    const cl = normalizeClientId(body.clientId);
    if (cl.error) return { error: cl.error };
    if (cl.value == null) return { error: 'El proyecto necesita un cliente.' };
    fields.clientId = cl.value;
  }
  const b = normalizeBriefId(body.briefProjectId);
  if (b.error) return { error: b.error };
  if (!b.skip) fields.briefProjectId = b.value;
  return { fields };
}

/**
 * Cambios de un hito (PATCH). Claves: label, dueDate ('' / null = quitar
 * la fecha), status. Devuelve { fields, error }.
 */
export function normalizeMilestonePatch(body = {}) {
  const fields = {};
  if (body.label !== undefined) {
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    if (!label) return { error: 'El hito necesita un nombre.' };
    if (label.length > MAX_LABEL) return { error: `El nombre del hito admite hasta ${MAX_LABEL} caracteres.` };
    fields.label = label;
  }
  if (body.dueDate !== undefined) {
    if (body.dueDate === null || body.dueDate === '') fields.dueDate = null;
    else if (isValidDay(String(body.dueDate).trim())) fields.dueDate = String(body.dueDate).trim();
    else return { error: 'La fecha no es válida.' };
  }
  if (body.status !== undefined) {
    const st = typeof body.status === 'string' ? body.status.trim() : '';
    if (!MILESTONE_STATUSES.includes(st)) return { error: 'Elige un estado válido para el hito.' };
    fields.status = st;
  }
  return { fields };
}

/**
 * Nuevo orden de hitos: debe ser EXACTAMENTE la lista de hitos del proyecto
 * (sin repetidos, sin ajenos, sin faltantes). Devuelve { ids } o { error }.
 */
export function validateOrder(order, existingIds) {
  if (!Array.isArray(order) || !order.length) return { error: 'Falta el nuevo orden de los hitos.' };
  const ids = order.map((x) => String(x ?? '').trim());
  if (ids.some((x) => !/^\d{1,19}$/.test(x))) return { error: 'El orden de los hitos no es válido.' };
  const want = new Set((existingIds || []).map(String));
  const got = new Set(ids);
  if (got.size !== ids.length || got.size !== want.size || ids.some((x) => !want.has(x))) {
    return { error: 'La lista de hitos cambió. Recarga e inténtalo de nuevo.', status: 409 };
  }
  return { ids };
}

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

  // Resumen GLOBAL (OP-11, MOCK-13): no depende del filtro ni de la página,
  // así los KPIs de arriba no cambian al filtrar o buscar.
  const summary = await projectsSummary();
  return { rows, total, limit: lim, offset: off, summary };
}

// ── Resumen global de proyectos (KPIs de Progreso) ────────────
// { total, by_status: { active, on_hold, completed, cancelled },
//   active_cents, on_hold_cents }  · *_cents como texto (BIGINT), igual que
// agreed_amount_cents. "Valor en cartera" = active_cents (solo activos).
export async function projectsSummary() {
  const r = await sql`
    SELECT status,
           COUNT(*)::int AS n,
           COALESCE(SUM(agreed_amount_cents), 0)::bigint AS cents
      FROM projects
     GROUP BY status`;
  return summarizeStatusRows(r.rows);
}

/** Pura: filas { status, n, cents } → resumen. La usan el endpoint y las pruebas. */
export function summarizeStatusRows(rows = []) {
  const by_status = { active: 0, on_hold: 0, completed: 0, cancelled: 0 };
  const cents = { active: 0n, on_hold: 0n };
  let total = 0;
  for (const row of rows) {
    const n = Number(row.n) || 0;
    total += n;
    if (by_status[row.status] != null) by_status[row.status] += n;
    if (cents[row.status] != null) {
      try { cents[row.status] += BigInt(String(row.cents ?? 0)); } catch (_) { /* valor no numérico: no suma */ }
    }
  }
  return {
    total, by_status,
    active_cents: cents.active.toString(),
    on_hold_cents: cents.on_hold.toString(),
  };
}

// ── Lectura: un proyecto por id (con nombre de cliente) ───────
// id = BIGINT → llega como STRING. Validamos formato y lo ligamos tal cual; NO
// parseInt (corromperia ids >2^53 → 404). Mismo patrón en el resto de helpers.
// También acepta el código visible (PRJ-003): es lo que lleva el enlace
// profundo #/progreso/PRJ-003. Trae además el código del cliente y cuántas
// facturas tiene vinculadas (para avisar antes de borrar, OP-29).
export function parseProjectRef(id) {
  const ref = (id ?? '').toString().trim();
  if (/^\d{1,19}$/.test(ref)) return { id: ref };
  if (/^PRJ-\d{1,6}$/i.test(ref)) return { code: ref.toUpperCase() };
  return null;
}

export async function getProject(id) {
  const ref = parseProjectRef(id);
  if (!ref) return null;
  const r = ref.id
    ? await sql`
      SELECT p.id, p.project_code, p.client_id, p.brief_project_id, p.name,
             p.service_type, p.agreed_amount_cents, p.status,
             p.started_at, p.completed_at, p.created_at, p.updated_at,
             c.business_name AS client_name, c.client_code,
             (SELECT COUNT(*)::int FROM invoices i WHERE i.project_id = p.id) AS invoices_count
        FROM projects p LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.id = ${ref.id} LIMIT 1`
    : await sql`
      SELECT p.id, p.project_code, p.client_id, p.brief_project_id, p.name,
             p.service_type, p.agreed_amount_cents, p.status,
             p.started_at, p.completed_at, p.created_at, p.updated_at,
             c.business_name AS client_name, c.client_code,
             (SELECT COUNT(*)::int FROM invoices i WHERE i.project_id = p.id) AS invoices_count
        FROM projects p LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.project_code = ${ref.code} LIMIT 1`;
  return r.rowCount ? r.rows[0] : null;
}

// ── Existencia de cliente y brief (validación antes de escribir) ──
export async function clientExists(clientId) {
  const cl = normalizeClientId(clientId);
  if (cl.error || cl.value == null) return false;
  const r = await sql`SELECT 1 FROM clients WHERE id = ${cl.value} LIMIT 1`;
  return r.rowCount > 0;
}
export async function briefExists(briefId) {
  if (!briefId) return false;
  const r = await sql`SELECT 1 FROM briefs WHERE project_id = ${briefId} LIMIT 1`;
  return r.rowCount > 0;
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
// Cambio (CRM-05, OP-09): un clientId que no existe ya NO cae en silencio al
// cliente "Directo"; responde 400 con un mensaje claro.
async function resolveClientId({ clientId, briefProjectId }) {
  if (clientId != null && clientId !== '') {
    const cl = normalizeClientId(clientId);
    if (cl.error) throw new ProjectInputError(cl.error);
    const ex = await sql`SELECT id FROM clients WHERE id = ${cl.value} LIMIT 1`;
    if (ex.rowCount) return ex.rows[0].id;
    throw new ProjectInputError('Ese cliente ya no existe. Elige otro de la lista.');
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
// Validación ANTES de escribir (OP-09): el brief tiene que existir; si no,
// 400 "El brief MRC-099 no existe" en vez del 500 genérico por la clave
// foránea (y sin dejar un cliente creado a medias).
// started_at = hoy en Houston (OP-07), no en UTC.
export async function createProject(data = {}) {
  const name = (data.name || '').trim().slice(0, MAX_NAME) || 'Proyecto sin nombre';
  const status = PROJECT_STATUSES.includes(data.status) ? data.status : 'active';
  const b = normalizeBriefId(data.briefProjectId);
  if (b.error) throw new ProjectInputError(b.error);
  const briefId = b.skip ? null : b.value;
  const serviceType = data.serviceType ? String(data.serviceType).trim().slice(0, 60) : null;
  const c = parseCentsInput(data.agreedAmountCents);
  if (c.error) throw new ProjectInputError(c.error);
  const cents = c.skip ? 0 : c.cents;

  if (briefId && !(await briefExists(briefId))) {
    throw new ProjectInputError(`El brief ${briefId} no existe. Revisa el código.`);
  }
  const clientId = await resolveClientId({ clientId: data.clientId, briefProjectId: briefId });

  const r = await sql`
    INSERT INTO projects
      (project_code, name, client_id, brief_project_id, service_type, agreed_amount_cents, status, started_at)
    VALUES
      (next_project_code(), ${name}, ${clientId}, ${briefId}, ${serviceType}, ${cents}, ${status},
       ${status === 'active' ? houstonDate() : null})
    RETURNING id`;
  const id = r.rows[0].id;

  // Sembramos los hitos por defecto (idempotente vía la función SQL).
  await sql`SELECT seed_default_milestones(${id})`;
  return getProject(id);
}

// ── Editar proyecto ───────────────────────────────────────────
// fields = salida de normalizeProjectPatch (solo las claves que cambian).
// Reglas de fechas (en hora de Houston, OP-07):
//   · started_at se fija al pasar a 'active' si aún no tenía (OP-08: un
//     proyecto creado en pausa también acaba teniendo fecha de inicio).
//   · completed_at se fija al pasar a 'completed' y se limpia si sale.
// Cliente y brief se validan antes (400 con mensaje claro).
// Devuelve el proyecto actualizado o null si no existe.
export async function updateProject(id, fields = {}) {
  const before = await getProject(id);
  if (!before) return null;
  const pid = String(before.id);

  if (fields.clientId !== undefined && String(fields.clientId) !== String(before.client_id)) {
    if (!(await clientExists(fields.clientId))) {
      throw new ProjectInputError('Ese cliente ya no existe. Elige otro de la lista.');
    }
  }
  if (fields.briefProjectId && fields.briefProjectId !== before.brief_project_id) {
    if (!(await briefExists(fields.briefProjectId))) {
      throw new ProjectInputError(`El brief ${fields.briefProjectId} no existe. Revisa el código.`);
    }
  }

  const name = fields.name !== undefined ? fields.name : before.name;
  const serviceType = fields.serviceType !== undefined ? fields.serviceType : before.service_type;
  const cents = fields.agreedAmountCents !== undefined ? fields.agreedAmountCents : before.agreed_amount_cents;
  const status = fields.status !== undefined ? fields.status : before.status;
  const clientId = fields.clientId !== undefined ? fields.clientId : before.client_id;
  const briefId = fields.briefProjectId !== undefined ? fields.briefProjectId : before.brief_project_id;
  const today = houstonDate();

  const r = await sql`
    UPDATE projects
       SET name = ${name},
           service_type = ${serviceType},
           agreed_amount_cents = ${cents},
           status = ${status},
           client_id = ${clientId},
           brief_project_id = ${briefId},
           started_at = CASE
             WHEN ${status}::text = 'active' THEN COALESCE(started_at, ${today}::date)
             ELSE started_at
           END,
           completed_at = CASE
             WHEN ${status}::text = 'completed' THEN COALESCE(completed_at, ${today}::date)
             ELSE NULL
           END
     WHERE id = ${pid}
    RETURNING id`;
  if (!r.rowCount) return null;
  return getProject(pid);
}

// ── Hitos ─────────────────────────────────────────────────────
export async function listMilestones(projectId) {
  const pid = (projectId ?? '').toString().trim();
  if (!/^\d+$/.test(pid)) return [];
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
  if (label.length > MAX_LABEL) throw new ProjectInputError(`El nombre del hito admite hasta ${MAX_LABEL} caracteres.`);
  const status = MILESTONE_STATUSES.includes(data.status) ? data.status : 'pending';
  const stage = data.stage ? String(data.stage).trim() : null;
  const dueDate = data.dueDate ? String(data.dueDate).trim() : null;
  if (dueDate && !isValidDay(dueDate)) throw new ProjectInputError('La fecha no es válida.');

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

// ── Editar un hito DEL proyecto (OP-05, OP-26, MOCK-07) ───────
// El WHERE exige project_id: un id de otro proyecto no toca nada y devuelve
// null (el handler responde 404). fields = salida de normalizeMilestonePatch.
// Solo cambia lo que viene; done_at sigue al estado.
export async function updateMilestone(projectId, milestoneId, fields = {}) {
  const pid = (projectId ?? '').toString().trim();
  const mid = (milestoneId ?? '').toString().trim();
  if (!/^\d{1,19}$/.test(pid) || !/^\d{1,19}$/.test(mid)) return null;
  const hasLabel = fields.label !== undefined;
  const hasDue = fields.dueDate !== undefined;
  const hasStatus = fields.status !== undefined;
  const label = hasLabel ? fields.label : null;
  const due = hasDue ? fields.dueDate : null;
  const status = hasStatus ? fields.status : null;
  const r = await sql`
    UPDATE project_milestones
       SET label    = CASE WHEN ${hasLabel}::boolean THEN ${label}::text ELSE label END,
           due_date = CASE WHEN ${hasDue}::boolean THEN ${due}::date ELSE due_date END,
           status   = CASE WHEN ${hasStatus}::boolean THEN ${status}::text ELSE status END,
           done_at  = CASE
             WHEN NOT ${hasStatus}::boolean THEN done_at
             WHEN ${status}::text = 'done' THEN COALESCE(done_at, NOW())
             ELSE NULL
           END
     WHERE id = ${mid} AND project_id = ${pid}
    RETURNING id, project_id, stage, label, status, position, due_date, done_at,
              created_at, updated_at`;
  return r.rowCount ? r.rows[0] : null;
}

// Borra un hito SOLO si es del proyecto indicado. Devuelve boolean.
export async function deleteMilestoneOf(projectId, milestoneId) {
  const pid = (projectId ?? '').toString().trim();
  const mid = (milestoneId ?? '').toString().trim();
  if (!/^\d{1,19}$/.test(pid) || !/^\d{1,19}$/.test(mid)) return false;
  const r = await sql`
    DELETE FROM project_milestones WHERE id = ${mid} AND project_id = ${pid} RETURNING id`;
  return r.rowCount > 0;
}

// Reordena TODOS los hitos del proyecto según `order` (lista de ids, de
// arriba abajo). position = índice 0..n-1, en una sola sentencia.
// Lanza ProjectInputError si la lista no coincide con los hitos actuales.
export async function reorderMilestones(projectId, order) {
  const pid = (projectId ?? '').toString().trim();
  if (!/^\d{1,19}$/.test(pid)) throw new ProjectInputError('Proyecto inválido.');
  const cur = await sql`SELECT id FROM project_milestones WHERE project_id = ${pid}`;
  const v = validateOrder(order, cur.rows.map((x) => String(x.id)));
  if (v.error) throw new ProjectInputError(v.error, v.status || 400);
  await sql`
    UPDATE project_milestones AS m
       SET position = o.ord - 1
      FROM unnest(${v.ids}::bigint[]) WITH ORDINALITY AS o(id, ord)
     WHERE m.id = o.id AND m.project_id = ${pid}`;
  return listMilestones(pid);
}

export async function deleteMilestone(milestoneId) {
  const mid = parseInt(milestoneId, 10);
  if (!Number.isFinite(mid)) return false;
  const r = await sql`DELETE FROM project_milestones WHERE id = ${mid} RETURNING id`;
  return r.rowCount > 0;
}

// ── Eliminar proyecto (con sus hitos) ─────────────────────────
// El id es BIGINT → @vercel/postgres lo devuelve como STRING. NO usar parseInt:
// corrompe ids grandes (>2^53) → el WHERE no matchea → 404. Validamos formato y
// ligamos el string tal cual (la query parametrizada lo ata al BIGINT).
// Borramos los hitos primero por si el FK no tiene ON DELETE CASCADE; si lo tiene,
// el DELETE de hitos no hace daño (ya no quedan filas). Devuelve boolean.
export async function deleteProject(id) {
  const pid = (id ?? '').toString().trim();
  if (!/^\d+$/.test(pid)) return false;
  await sql`DELETE FROM project_milestones WHERE project_id = ${pid}`;
  const r = await sql`DELETE FROM projects WHERE id = ${pid} RETURNING id`;
  return r.rowCount > 0;
}

// ── Progreso (% = done / total) ───────────────────────────────
export async function projectProgress(projectId) {
  const pid = (projectId ?? '').toString().trim();
  if (!/^\d+$/.test(pid)) return { total: 0, done: 0, in_progress: 0, pending: 0, percent: 0 };
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
