// ════════════════════════════════════════════════════════════════
//  lib/leads.mjs — Helpers de queries sobre `leads`
//  Gemelo adelgazado de lib/db.mjs (briefs). Los leads son mensajes
//  de contacto (form simple + chatbot), distintos de los briefs de
//  proyecto. Ver db/migrations/003_leads.sql.
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';
import { monthRange, houstonMidnightUtc } from './dates.mjs';
import {
  CrmError, MIGRATION_011_MSG, validateClientInput, createClient, DUPLICATE_SQL,
  normalizeEmail, phoneKey, clientDisplayName,
} from './finance.mjs';

const isMissingSchema = (err) => Boolean(err && (err.code === '42P01' || err.code === '42703'));

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

  // page_url (migración 011) solo si llega: hoy ningún formulario la manda,
  // y sin la migración el alta pública nunca puede fallar por ella.
  const pageUrl = data.page_url ? String(data.page_url).trim().slice(0, 500) : null;
  if (pageUrl) {
    try {
      await sql`
        INSERT INTO leads (
          ref_id, source, name, email, phone, business_name, city, interest, message,
          ip_address, user_agent, page_url
        ) VALUES (
          ${refId}, ${source}, ${data.name || null}, ${data.email || null},
          ${data.phone || null}, ${data.business_name || null}, ${data.city || null},
          ${data.interest || null}, ${data.message || null},
          ${data.ipAddress || null}, ${data.userAgent || null}, ${pageUrl}
        )
      `;
      return refId;
    } catch (err) {
      if (!isMissingSchema(err)) throw err;
    }
  }
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
const LEGACY_LIST_COLUMNS = `id, ref_id, status, source, name, email, phone, business_name,
  city, interest, message, converted_brief_id, created_at, updated_at`;
// Con la migración 011: también a qué cliente se convirtió y cuándo.
const LIST_COLUMNS = `${LEGACY_LIST_COLUMNS}, converted_client_id, converted_at`;

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
  const page = (cols) => sql.query(
    `SELECT ${cols} FROM leads ${f.text}
      ORDER BY created_at DESC, id DESC LIMIT $${n + 1} OFFSET $${n + 2}`,
    [...f.params, lim, off]);
  const [r, t] = await Promise.all([
    // Sin la migración 011 la lista sigue saliendo con las columnas de siempre.
    page(LIST_COLUMNS).catch((err) => { if (isMissingSchema(err)) return page(LEGACY_LIST_COLUMNS); throw err; }),
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

// ════════════════════════════════════════════════════════════════
//  Orbit v2 · A2 — recuentos por filtro, ficha, notas, historial y
//  CONVERSIÓN lead → cliente y/o → brief (CRM-02, CRM-07).
//  Lo que depende de la migración 011 (historial, notas, rastro del
//  cliente) degrada sin ella: la ficha sale igual, sin historial.
// ════════════════════════════════════════════════════════════════

/**
 * Recuentos para las pastillas (E-06): por estado con los demás filtros
 * (origen, búsqueda, fechas) y por origen con los demás (estado, búsqueda,
 * fechas). Así cada pastilla dice cuántos verías al pulsarla.
 * Devuelve { status: { all, new, contacted, … }, source: { all, contact, … } }.
 */
export async function leadFacets(opts = {}) {
  const byStatus = buildLeadFilter({ ...opts, status: null });
  const bySource = buildLeadFilter({ ...opts, source: null });
  const [a, b] = await Promise.all([
    sql.query(`SELECT status AS k, COUNT(*)::int AS n FROM leads ${byStatus.text} GROUP BY status`, byStatus.params),
    sql.query(`SELECT source AS k, COUNT(*)::int AS n FROM leads ${bySource.text} GROUP BY source`, bySource.params),
  ]);
  return { status: packFacet(a.rows, LEAD_STATUSES), source: packFacet(b.rows, LEAD_SOURCES) };
}

/** Filas { k, n } → { all, clave: n } con todas las claves presentes (pura). */
export function packFacet(rows, keys) {
  const o = { all: 0 };
  for (const k of keys) o[k] = 0;
  for (const r of rows) { o[r.k] = r.n; o.all += r.n; }
  return o;
}

// ── Historial ─────────────────────────────────────────────────
export async function logLeadEvent({ ref, type, actorEmail = null, data = null }, query) {
  const run = query || ((text, params) => sql.query(text, params));
  await run(
    `INSERT INTO lead_events (lead_ref, event_type, actor_email, data) VALUES ($1, $2, $3, $4::jsonb)`,
    [ref, type, actorEmail, data ? JSON.stringify(data) : null]);
}

// Sin la migración 011 no hay historial: la acción principal ya se hizo y
// se sigue sin él.
async function tryLogLeadEvent(ev) {
  try { await logLeadEvent(ev); }
  catch (err) { if (!isMissingSchema(err)) console.error('[leads] historial:', err.message); }
}

/**
 * Ficha completa del lead: el registro (con IP y navegador), su historial,
 * el cliente y el brief a los que se convirtió, y los clientes que ya
 * existen con su mismo correo o teléfono (para ofrecerlos al convertir).
 */
export async function getLeadDetail(refId) {
  const lead = await getLeadByRefId(refId);
  if (!lead) return null;

  let events = [];
  try {
    const r = await sql`
      SELECT id, event_type, actor_email, data, created_at FROM lead_events
       WHERE lead_ref = ${lead.ref_id} ORDER BY created_at DESC, id DESC LIMIT 50`;
    events = r.rows;
  } catch (err) { if (!isMissingSchema(err)) throw err; }

  let client = null;
  if (lead.converted_client_id) {
    const r = await sql`
      SELECT id, client_code, business_name, owner_name, status FROM clients
       WHERE id = ${lead.converted_client_id} LIMIT 1`;
    client = r.rows[0] || null;
  }
  let brief = null;
  if (lead.converted_brief_id) {
    const r = await sql`
      SELECT project_id, status, business_name, owner_name FROM briefs
       WHERE project_id = ${lead.converted_brief_id} LIMIT 1`;
    brief = r.rows[0] || null;
  }

  let client_matches = [];
  if (!client) {
    const r = await sql.query(DUPLICATE_SQL, [normalizeEmail(lead.email), phoneKey(lead.phone), null]);
    client_matches = r.rows;
  }

  return { lead, events, client, brief, client_matches, crm_ready: 'converted_client_id' in lead };
}

// ── Edición (estado y/o notas) ────────────────────────────────
// fields: { status?, notes? }. Devuelve el lead actualizado o null si no existe.
// Las notas necesitan la migración 011 (CrmError 503 si falta).
export async function updateLead(refId, fields = {}, actorEmail = null) {
  const before = await getLeadByRefId(refId);
  if (!before) return null;

  const sets = [];
  const params = [];
  if (fields.status !== undefined) {
    if (!LEAD_STATUSES.includes(fields.status)) throw new CrmError(400, 'Estado no válido.');
    if (fields.status !== before.status) { params.push(fields.status); sets.push(`status = $${params.length}`); }
  }
  let notesChanged = false;
  if (fields.notes !== undefined) {
    const notes = fields.notes == null ? null : (String(fields.notes).trim().slice(0, 10000) || null);
    if (notes !== (before.notes ?? null)) { params.push(notes); sets.push(`notes = $${params.length}`); notesChanged = true; }
  }
  if (!sets.length) return before;

  params.push(before.ref_id);
  try {
    await sql.query(`UPDATE leads SET ${sets.join(', ')} WHERE ref_id = $${params.length}`, params);
  } catch (err) {
    if (isMissingSchema(err)) throw new CrmError(503, MIGRATION_011_MSG);
    throw err;
  }

  if (fields.status !== undefined && fields.status !== before.status) {
    await tryLogLeadEvent({ ref: before.ref_id, type: 'status_changed', actorEmail, data: { from: before.status, to: fields.status } });
  }
  if (notesChanged) {
    await tryLogLeadEvent({ ref: before.ref_id, type: 'note_updated', actorEmail, data: null });
  }
  return getLeadByRefId(before.ref_id);
}

// ── Conversión: datos que viajan del lead ─────────────────────
/** Cliente nuevo a partir de un lead (los datos corregidos en el diálogo mandan). */
export function leadToClientData(lead, overrides = {}) {
  const pick = (k, v) => (overrides && overrides[k] !== undefined ? overrides[k] : v);
  return {
    business_name: pick('business_name', lead.business_name || lead.name || null),
    owner_name:    pick('owner_name', lead.name || null),
    email:         pick('email', lead.email || null),
    phone:         pick('phone', lead.phone || null),
    city_state:    pick('city_state', lead.city || null),
    notes:         pick('notes', lead.interest ? `Interés al llegar: ${lead.interest}` : null),
    status: 'active',
  };
}

/** Columnas del brief borrador creado desde un lead (origen 'lead', estado pendiente). */
export function leadToBriefColumns(lead) {
  const notes = [lead.message, `Creado desde el lead ${lead.ref_id}.`].filter(Boolean).join('\n\n');
  return [
    ['business_name', lead.business_name || null],
    ['owner_name', lead.name || null],
    ['email', lead.email || null],
    ['phone', lead.phone || null],
    ['city_state', lead.city || null],
    ['main_objective', lead.interest || null],
    ['additional_notes', notes],
    ['source', 'lead'],
    ['status', 'pending'],
  ];
}

/**
 * Convierte un lead en cliente (nuevo o existente) y/o en brief borrador,
 * en UNA transacción: o queda todo hecho o nada.
 *   opts.client: null | { mode: 'new', data?: {…corregidos}, allowDuplicate?: bool }
 *                     | { mode: 'existing', id }
 *   opts.brief:  true = crea un brief borrador (MRC nuevo, origen 'lead')
 * Reglas:
 *   · un lead se convierte a UN cliente y a UN brief como mucho (409 si ya lo está);
 *   · cliente nuevo validado como el alta manual (400 con { fields });
 *   · sin duplicar clientes: si ya hay uno con el mismo correo o teléfono,
 *     409 con { matches } (salvo allowDuplicate, que el dueño confirma);
 *   · si se crean cliente y brief juntos, el cliente queda con ese brief de origen;
 *   · el lead pasa a 'converted' con converted_client_id / converted_brief_id /
 *     converted_at, y el historial del lead y del brief lo registran.
 * deps: { actorEmail, connect } (connect inyectable para las pruebas).
 * Devuelve { lead, client, brief, created: { client, brief } }.
 */
export async function convertLead(refId, opts = {}, deps = {}) {
  const wantClient = opts.client && (opts.client.mode === 'new' || opts.client.mode === 'existing') ? opts.client : null;
  const wantBrief = opts.brief === true;
  if (!wantClient && !wantBrief) throw new CrmError(400, 'Elige convertir en cliente, en brief o en ambos.');

  const connect = deps.connect || (async () => (await import('@vercel/postgres')).db.connect());
  const actor = deps.actorEmail || null;
  const db = await connect();
  const q = (text, params) => db.query(text, params);
  let began = false;
  try {
    await q('BEGIN');
    began = true;
    const lr = await q('SELECT * FROM leads WHERE ref_id = $1 FOR UPDATE', [refId]);
    if (!lr.rowCount) throw new CrmError(404, 'Lead no encontrado.');
    const lead = lr.rows[0];
    if (!('converted_client_id' in lead)) throw new CrmError(503, MIGRATION_011_MSG);

    let client = null;
    let createdClient = false;
    if (wantClient) {
      if (lead.converted_client_id) {
        const c = await q('SELECT client_code FROM clients WHERE id = $1', [lead.converted_client_id]);
        const code = c.rows[0] ? ` ${c.rows[0].client_code}` : '';
        throw new CrmError(409, `Este lead ya se convirtió en el cliente${code}.`, { reason: 'already_client' });
      }
      if (wantClient.mode === 'existing') {
        const id = parseInt(wantClient.id, 10);
        if (!Number.isFinite(id)) throw new CrmError(400, 'Elige un cliente.');
        const c = await q('SELECT * FROM clients WHERE id = $1', [id]);
        if (!c.rowCount) throw new CrmError(404, 'Ese cliente ya no existe.');
        client = c.rows[0];
      } else {
        const v = validateClientInput(leadToClientData(lead, wantClient.data || {}));
        if (!v.ok) throw new CrmError(400, 'Revisa los datos del cliente.', { fields: v.fields });
        if (!wantClient.allowDuplicate) {
          const d = await q(DUPLICATE_SQL, [normalizeEmail(v.clean.email), phoneKey(v.clean.phone), null]);
          if (d.rowCount) {
            const first = d.rows[0];
            throw new CrmError(409,
              `Ya existe un cliente con ese correo o teléfono: ${first.client_code} ${clientDisplayName(first)}.`,
              { reason: 'duplicate', matches: d.rows });
          }
        }
        client = await createClient({ ...v.clean, source_lead_id: lead.ref_id }, q);
        createdClient = true;
      }
    }

    let brief = null;
    if (wantBrief) {
      if (lead.converted_brief_id) {
        throw new CrmError(409, `Este lead ya tiene el brief ${lead.converted_brief_id}.`, { reason: 'already_brief' });
      }
      const cols = leadToBriefColumns(lead);
      const br = await q(
        `INSERT INTO briefs (project_id, ${cols.map(([k]) => k).join(', ')})
         VALUES (next_project_id(), ${cols.map((_, i) => `$${i + 1}`).join(', ')})
         RETURNING project_id, status, business_name, owner_name`,
        cols.map(([, v]) => v));
      brief = br.rows[0];
      await q(
        `INSERT INTO brief_events (project_id, event_type, actor_email, data) VALUES ($1, 'brief_received', $2, $3::jsonb)`,
        [brief.project_id, actor, JSON.stringify({ source: 'lead', lead: lead.ref_id })]);
      if (client) {
        if (!client.source_brief_id) {
          await q('UPDATE clients SET source_brief_id = $1 WHERE id = $2 AND source_brief_id IS NULL', [brief.project_id, client.id]);
          client.source_brief_id = brief.project_id;
        }
        await q(
          `INSERT INTO brief_events (project_id, event_type, actor_email, data) VALUES ($1, 'converted_to_client', $2, $3::jsonb)`,
          [brief.project_id, actor, JSON.stringify({ client_id: Number(client.id), client_code: client.client_code })]);
      }
    }

    const ur = await q(
      `UPDATE leads
          SET status = 'converted',
              converted_client_id = COALESCE($2, converted_client_id),
              converted_brief_id  = COALESCE($3, converted_brief_id),
              converted_at        = COALESCE(converted_at, NOW())
        WHERE ref_id = $1
        RETURNING *`,
      [lead.ref_id, client ? client.id : null, brief ? brief.project_id : null]);

    const log = (type, data) => q(
      `INSERT INTO lead_events (lead_ref, event_type, actor_email, data) VALUES ($1, $2, $3, $4::jsonb)`,
      [lead.ref_id, type, actor, JSON.stringify(data)]);
    if (client) await log('converted_to_client', { client_id: Number(client.id), client_code: client.client_code, created: createdClient });
    if (brief) await log('converted_to_brief', { project_id: brief.project_id });
    if (lead.status !== 'converted') await log('status_changed', { from: lead.status, to: 'converted' });

    await q('COMMIT');
    began = false;
    return {
      lead: ur.rows[0],
      client: client ? {
        id: client.id, client_code: client.client_code, business_name: client.business_name,
        owner_name: client.owner_name, status: client.status,
      } : null,
      brief,
      created: { client: createdClient, brief: !!brief },
    };
  } catch (err) {
    if (began) { try { await q('ROLLBACK'); } catch (e) { console.error('[leads] ROLLBACK:', e.message); /* conexión caída: Postgres revierte solo */ } }
    if (isMissingSchema(err)) throw new CrmError(503, MIGRATION_011_MSG);
    throw err;
  } finally {
    try { db.release(); } catch (e) { console.error('[leads] release:', e.message); }
  }
}
