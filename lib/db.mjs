// ════════════════════════════════════════════════════════════════
//  lib/db.mjs — Helpers de queries sobre briefs + events
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';
import { monthRange } from './dates.mjs';
import { LEGACY_COLUMNS, LEGACY_JSONB, FIELDS, SERVICE_IDS, validate } from './brief-schema.mjs';

export const BRIEF_STATUSES = ['pending', 'contacted', 'in_progress', 'completed', 'archived'];

export const BRIEF_LIST_COLUMNS = `
  id, project_id, status, business_name, owner_name, email, phone,
  city_state, website_type, budget_range, timeline, referred_by,
  created_at, updated_at, contacted_at, completed_at, source
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
             created_at, updated_at, contacted_at, completed_at, source
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
             created_at, updated_at, contacted_at, completed_at, source
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
             created_at, updated_at, contacted_at, completed_at, source
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
             created_at, updated_at, contacted_at, completed_at, source
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
//   · this_month / completed_this_month: mes en curso en HORA DE HOUSTON
//     (mismo corte que leadStats y que el gráfico de actividad).
export async function briefStats() {
  const m = monthRange(0);
  const r = await sql`
    SELECT
      COUNT(*)::int                                      AS total,
      COUNT(*) FILTER (WHERE status = 'pending')::int     AS pending,
      COUNT(*) FILTER (WHERE status = 'contacted')::int   AS contacted,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE status = 'completed')::int   AS completed,
      COUNT(*) FILTER (WHERE status = 'archived')::int    AS archived,
      COUNT(*) FILTER (WHERE created_at >= ${m.startISO} AND created_at < ${m.endISO})::int AS this_month,
      COUNT(*) FILTER (WHERE status = 'completed'
                         AND completed_at >= ${m.startISO}
                         AND completed_at <  ${m.endISO})::int AS completed_this_month
      FROM briefs
  `;
  return r.rows[0];
}

// Update status: actualiza también contacted_at / completed_at si aplica y
// deja el evento 'status_changed' { from, to } con el actor EN LA MISMA
// TRANSACCIÓN (RET-01): el plazo de conservación de archivos
// (lib/brief-retention.mjs) se calcula con ese historial, así que un cambio
// de estado nunca puede quedar sin su evento. Si algo falla, no cambia nada.
// Devuelve { status, contacted_at, completed_at, from } o null si no existe.
export async function updateBriefStatus(projectId, newStatus, actorEmail) {
  if (!BRIEF_STATUSES.includes(newStatus)) {
    throw new Error(`Status inválido: ${newStatus}`);
  }
  // Timestamps específicos (texto fijo, sin datos del usuario).
  const stamp = newStatus === 'contacted' ? ', contacted_at = COALESCE(contacted_at, NOW())'
    : newStatus === 'completed' ? ', completed_at = COALESCE(completed_at, NOW())'
    : '';
  const { db } = await import('@vercel/postgres');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query('SELECT status FROM briefs WHERE project_id = $1 FOR UPDATE', [projectId]);
    if (!cur.rowCount) { await client.query('ROLLBACK'); return null; }
    const from = cur.rows[0].status;
    const r = await client.query(
      `UPDATE briefs SET status = $1${stamp} WHERE project_id = $2 RETURNING status, contacted_at, completed_at`,
      [newStatus, projectId],
    );
    if (from !== newStatus) {
      await client.query(
        `INSERT INTO brief_events (project_id, event_type, actor_email, data) VALUES ($1, 'status_changed', $2, $3::jsonb)`,
        [projectId, actorEmail || null, JSON.stringify({ from, to: newStatus })],
      );
    }
    await client.query('COMMIT');
    return { ...r.rows[0], from };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* conexión ya rota */ }
    throw err;
  } finally {
    client.release();
  }
}

export async function updateBriefSummary(projectId, summary) {
  const r = await sql`
    UPDATE briefs SET summary = ${summary || null}
     WHERE project_id = ${projectId}
    RETURNING summary
  `;
  return r.rowCount ? r.rows[0].summary : null;
}

// Campos editables del brief en columna (las 39 claves históricas). Se
// derivan del esquema único (CRM-20/B-09): antes era una copia a mano.
// Se conserva el nombre: lo usan updateBriefFields y el mock del panel.
export const BRIEF_EDITABLE_FIELDS = [...LEGACY_COLUMNS];

const JSONB_FIELDS = new Set(LEGACY_JSONB);

// Update parcial de campos arbitrarios del brief.
// `fields` es un objeto { columna: valor }. Sólo se aplican columnas presentes en BRIEF_EDITABLE_FIELDS.
// Devuelve la lista de claves realmente actualizadas.
export async function updateBriefFields(projectId, fields) {
  if (!fields || typeof fields !== 'object') return [];
  const entries = Object.entries(fields).filter(([k]) => BRIEF_EDITABLE_FIELDS.includes(k));
  if (!entries.length) return [];

  // Construimos SET dinámicamente con placeholders parametrizados.
  const setParts = [];
  const values = [];
  for (const [col, raw] of entries) {
    let val = raw;
    if (JSONB_FIELDS.has(col)) {
      // Aceptamos array o string CSV; lo normalizamos a JSON array
      if (Array.isArray(val)) {
        val = JSON.stringify(val);
      } else if (typeof val === 'string') {
        const arr = val.split(',').map(s => s.trim()).filter(Boolean);
        val = JSON.stringify(arr);
      } else {
        val = '[]';
      }
      setParts.push(`${col} = $${values.length + 1}::jsonb`);
    } else {
      if (val === '' || val === undefined) val = null;
      setParts.push(`${col} = $${values.length + 1}`);
    }
    values.push(val);
  }
  values.push(projectId);
  const text = `UPDATE briefs SET ${setParts.join(', ')} WHERE project_id = $${values.length} RETURNING project_id`;

  // El client de @vercel/postgres expone .query() para SQL parametrizada manual
  const { db } = await import('@vercel/postgres');
  const client = await db.connect();
  try {
    const r = await client.query(text, values);
    return r.rowCount ? entries.map(([k]) => k) : [];
  } finally {
    client.release();
  }
}

// Hard delete — el FK con ON DELETE CASCADE en brief_events limpia el audit log.
// Antes se desvincula el lead que se convirtió en este brief (DM-01): el folio
// MRC se reutiliza (next_project_id es MAX+1) y un lead no puede quedar pegado
// a un brief ajeno ni bloqueado con "ya tiene el brief". La 011 añade además la
// clave con ON DELETE SET NULL; esto cubre la base que aún no la tiene. Todo en
// una transacción: si el DELETE falla, el lead conserva su enlace.
export async function deleteBrief(projectId) {
  const { db } = await import('@vercel/postgres');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE leads SET converted_brief_id = NULL WHERE converted_brief_id = $1', [projectId]);
    const r = await client.query('DELETE FROM briefs WHERE project_id = $1 RETURNING project_id', [projectId]);
    await client.query('COMMIT');
    return r.rowCount > 0;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* conexión ya rota */ }
    throw err;
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════════════════════
//  Edición desde el panel (Orbit v2, A3): solo lo que cambia (CRM-09)
//  y con el tipo del esquema (B-22): las opciones se validan contra su
//  lista, salvo el valor que ya tenía el brief (texto libre del chat o del
//  formulario v1), que se respeta para no perder datos.
// ════════════════════════════════════════════════════════════════

// Tipos que el panel edita. repeater/hours/zones los rellena el cliente en
// el kit y el panel los muestra, sin editarlos; los archivos van aparte.
export const BRIEF_EDITABLE_TYPES = new Set([
  'text', 'textarea', 'email', 'tel', 'url', 'radio', 'select', 'checkbox',
  'number', 'date-month', 'services',
]);
export const BRIEF_EDITABLE_KEYS = [...FIELDS.values()]
  .filter((fd) => BRIEF_EDITABLE_TYPES.has(fd.type))
  .map((fd) => fd.key);

const OPTION_TYPES = new Set(['radio', 'select', 'checkbox']);
const isBlankValue = (v) => v === null || v === undefined || v === ''
  || (Array.isArray(v) && v.length === 0);
const canon = (v) => (isBlankValue(v) ? null : v);
export const sameBriefValue = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

// Recorta un valor para el historial (el registro no debe crecer sin límite).
function eventValue(v) {
  if (isBlankValue(v)) return null;
  if (typeof v === 'string') return v.length > 300 ? v.slice(0, 300) + '…' : v;
  if (Array.isArray(v)) return v.slice(0, 40).map((x) => (typeof x === 'string' ? x.slice(0, 120) : x));
  return v;
}

// ¿El valor fuera de la lista ya estaba guardado? Entonces no es un error:
// es un dato histórico que el panel conserva.
function legacyOptionAllowed(fd, value, before) {
  if (!OPTION_TYPES.has(fd.type) || !fd.options) return false;
  const opts = fd.options.map((o) => o.value);
  if (fd.type === 'checkbox') {
    const prev = Array.isArray(before) ? before : [];
    return Array.isArray(value) && value.every((x) => opts.includes(x) || prev.includes(x));
  }
  return value === before;
}

// prepareBriefEdits({ data, extra, kit, fields, services })
//   data:     valores actuales del brief ya combinados (briefData de lib/kit/build.mjs)
//   extra/kit: los JSONB guardados (para limpiar la misma clave si se vacía)
//   fields:   lo que manda el panel { clave: valor }
//   services: servicios del brief. Ya NO decide la validación: cada valor
//             entrante se comprueba con su tipo y sus opciones aunque el
//             servicio que activa el campo no esté elegido (revisión A3-02).
// → { errors, ignored, changes: { clave: { from, to } }, writes: { columns, extra, kit, services } }
// Función pura: sin base de datos (la prueba scripts/test-briefs-panel.mjs).
export function prepareBriefEdits({ data = {}, extra = {}, kit = {}, fields = {}, services = [] } = {}) {
  void services; // se conserva en la firma por compatibilidad con quien la llama
  const out = { errors: {}, ignored: [], changes: {}, writes: { columns: {}, extra: {}, kit: {}, services: undefined } };
  const incoming = {};
  for (const [key, raw] of Object.entries(fields || {})) {
    if (!BRIEF_EDITABLE_KEYS.includes(key)) { out.ignored.push(key); continue; }
    incoming[key] = raw;
  }
  if (!Object.keys(incoming).length) return out;

  // Con TODOS los servicios, ningún campo condicionado se salta la validación.
  const v = validate(null, incoming, { partial: true, services: SERVICE_IDS });

  // Servicios: un id que no está en el catálogo es un error (antes se
  // descartaba sin avisar). Un id antiguo que el brief ya tenía se conserva.
  let servicesTo = null;
  if ('services' in incoming) {
    const raw = incoming.services;
    const arr = Array.isArray(raw) ? raw : (typeof raw === 'string' && raw ? raw.split(',') : []);
    const prev = Array.isArray(data.services) ? data.services : [];
    const ids = arr.map((x) => String(x ?? '').trim()).filter(Boolean);
    if ((raw != null && raw !== '' && !Array.isArray(raw) && typeof raw !== 'string')
      || ids.some((x) => !SERVICE_IDS.includes(x) && !prev.includes(x))) {
      out.errors.services = 'Hay un servicio que no está en la lista. Elige solo servicios de la lista.';
    }
    // Mismo orden que mandó el panel, sin repetidos (si no, un orden distinto
    // contaría como cambio).
    servicesTo = [...new Set(ids.filter((x) => SERVICE_IDS.includes(x) || prev.includes(x)))];
  }

  // Regla del brief: siempre queda al menos un correo o un teléfono.
  if ('email' in incoming || 'phone' in incoming) {
    const finalOf = (k) => (k in incoming ? v.data[k] : data[k]);
    const hadContact = !isBlankValue(data.email) || !isBlankValue(data.phone);
    if (hadContact && isBlankValue(finalOf('email')) && isBlankValue(finalOf('phone'))) {
      const key = 'email' in incoming ? 'email' : 'phone';
      out.errors[key] = 'Deja al menos un correo o un teléfono para poder contactar al cliente.';
    }
  }

  for (const key of Object.keys(incoming)) {
    if (out.errors[key]) continue;
    const fd = FIELDS.get(key);
    let to = key in v.data ? v.data[key] : null;
    if (key === 'services' && servicesTo) to = servicesTo;
    const from = data[key] === undefined ? null : data[key];
    const err = v.errors[key];
    if (err && !legacyOptionAllowed(fd, to, from)) { out.errors[key] = err.es; continue; }
    if (sameBriefValue(from, to)) continue;
    out.changes[key] = { from: eventValue(from), to: eventValue(to) };
    if (key === 'services') { out.writes.services = Array.isArray(to) ? to : []; continue; }
    const target = fd.storage === 'column' ? 'columns' : fd.storage === 'extra' ? 'extra' : 'kit';
    out.writes[target][key] = canon(to);
    // Vaciar un campo: la misma clave guardada en el otro almacén no debe
    // "reaparecer" como valor de respaldo al combinar los datos.
    if (isBlankValue(to)) {
      if (target !== 'extra' && extra && key in extra) out.writes.extra[key] = null;
      if (target !== 'kit' && kit && key in kit) out.writes.kit[key] = null;
    }
  }
  return out;
}

// Aplica las escrituras de prepareBriefEdits en UNA sentencia. Devuelve true
// si el brief existía. Lanza el error de Postgres tal cual (el handler
// distingue "falta la migración 010" con isMissingSchema).
export async function applyBriefEdits(projectId, writes = {}) {
  const sets = [];
  const values = [];
  for (const [col, val] of Object.entries(writes.columns || {})) {
    if (!LEGACY_COLUMNS.includes(col)) continue;
    if (JSONB_FIELDS.has(col)) {
      values.push(JSON.stringify(Array.isArray(val) ? val : []));
      sets.push(`${col} = $${values.length}::jsonb`);
    } else {
      values.push(isBlankValue(val) ? null : (typeof val === 'string' ? val : String(val)));
      sets.push(`${col} = $${values.length}`);
    }
  }
  for (const store of ['extra', 'kit']) {
    const obj = writes[store] || {};
    if (!Object.keys(obj).length) continue;
    values.push(JSON.stringify(obj));
    sets.push(`${store} = COALESCE(${store}, '{}'::jsonb) || $${values.length}::jsonb`);
  }
  if (Array.isArray(writes.services)) {
    values.push(writes.services);
    sets.push(`services = $${values.length}::text[]`);
  }
  if (!sets.length) return true;
  values.push(projectId);
  const text = `UPDATE briefs SET ${sets.join(', ')} WHERE project_id = $${values.length} RETURNING project_id`;
  const r = await sql.query(text, values);
  return r.rowCount > 0;
}

// ── Brief ↔ cliente (CRM-04) ──────────────────────────────────
// El cliente de un brief: el que nació de él (clients.source_brief_id) o,
// si se vinculó a uno que ya existía, el último evento 'converted_to_client'.
export async function getBriefClient(projectId) {
  const r = await sql`
    SELECT id, client_code, business_name, status
      FROM clients WHERE source_brief_id = ${projectId}
     ORDER BY created_at ASC LIMIT 1`;
  if (r.rowCount) return r.rows[0];
  const e = await sql`
    SELECT data FROM brief_events
     WHERE project_id = ${projectId} AND event_type = 'converted_to_client'
     ORDER BY created_at DESC LIMIT 1`;
  const cid = e.rowCount && e.rows[0].data ? Number(e.rows[0].data.client_id) : NaN;
  if (!Number.isFinite(cid)) return null;
  const c = await sql`SELECT id, client_code, business_name, status FROM clients WHERE id = ${cid} LIMIT 1`;
  return c.rowCount ? c.rows[0] : null;
}

// Vincula un brief a un cliente que ya existe. Si el cliente no tenía brief
// de origen, este pasa a serlo; si ya tenía otro, no se pisa (el vínculo
// queda en el historial del brief). El vínculo y su evento
// 'converted_to_client' se escriben en UNA sola sentencia (CTE): o quedan
// los dos o ninguno (revisión A3-04). Un cliente ARCHIVADO no se vincula
// (revisión int1, F2): no se escribe nada y vuelve archived: true para que
// el handler responda 409. → { client, sourceSet, archived } | null
export async function linkBriefToClient(projectId, clientId, actorEmail = null) {
  const r = await sql`
    WITH c AS (
      SELECT id, client_code, business_name, status, source_brief_id
        FROM clients WHERE id = ${clientId} LIMIT 1
    ), ok AS (
      SELECT * FROM c WHERE status IS DISTINCT FROM 'archived'
    ), u AS (
      UPDATE clients SET source_brief_id = ${projectId}
       WHERE id = (SELECT id FROM ok) AND source_brief_id IS NULL
      RETURNING id
    ), e AS (
      INSERT INTO brief_events (project_id, event_type, actor_email, data)
      SELECT ${projectId}::text, 'converted_to_client', ${actorEmail}::text,
             jsonb_build_object('client_id', ok.id, 'client_code', ok.client_code,
                                'business_name', ok.business_name, 'created', false, 'linked', true)
        FROM ok
      RETURNING id
    )
    SELECT c.id, c.client_code, c.business_name, c.status,
           (SELECT count(*) FROM u)::int AS source_set
      FROM c`;
  if (!r.rowCount) return null;
  const { source_set: sourceSet, ...client } = r.rows[0];
  return { client, sourceSet: sourceSet > 0, archived: client.status === 'archived' };
}
