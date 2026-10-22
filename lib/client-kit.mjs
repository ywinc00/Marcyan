// ════════════════════════════════════════════════════════════════
//  lib/client-kit.mjs — Kit de arranque para un cliente SIN brief
//
//  El dueño saca el enlace del kit desde la ficha del cliente (Clientes), sin
//  que el cliente pase antes por el formulario corto. Se crea un brief mínimo
//  con los datos de la ficha (origen 'panel', estado "En curso"), vinculado al
//  cliente, y el enlace del kit, en UNA transacción: o queda todo o nada.
//  Lo obligatorio del formulario corto que la ficha no trae lo pregunta el kit
//  en su bloque de pendientes, sin exigirlo (kitCatchup en lib/brief-kit.mjs).
//
//  Un cliente con brief no pasa por aquí: su kit se envía desde ese brief
//  (409 { reason: 'has_brief', projectId }).
// ════════════════════════════════════════════════════════════════
import { CrmError, ARCHIVED_CLIENT_MSG, MIGRATION_011_MSG } from './finance.mjs';
import { newKitToken, hashKitToken, PANEL_SOURCE } from './brief-kit.mjs';
import { SCHEMA_VERSION } from './brief-schema.mjs';

const isMissingSchema = (err) => Boolean(err && (err.code === '42P01' || err.code === '42703'));

// ¿Este cliente ya tiene brief? Las mismas vías que la ficha (getClientRelated
// en lib/finance.mjs): brief de origen, brief de uno de sus proyectos, brief
// vinculado a él (último 'converted_to_client') o brief de su lead de origen.
//   $1 id del cliente · $2 source_brief_id · $3 id en texto · $4 source_lead_id
export const CLIENT_BRIEF_SQL = `
  SELECT b.project_id FROM briefs b
   WHERE b.project_id = $2
      OR b.project_id IN (SELECT brief_project_id FROM projects
                           WHERE client_id = $1 AND brief_project_id IS NOT NULL)
      OR b.project_id IN (SELECT e.project_id FROM (
                            SELECT DISTINCT ON (project_id) project_id, data FROM brief_events
                             WHERE event_type = 'converted_to_client'
                             ORDER BY project_id, created_at DESC, id DESC) e
                           WHERE e.data->>'client_id' = $3)
      OR b.project_id IN (SELECT converted_brief_id FROM leads
                           WHERE converted_brief_id IS NOT NULL
                             AND (converted_client_id = $1 OR ref_id = $4))
   ORDER BY b.created_at DESC
   LIMIT 1`;

const clean = (v) => {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s || null;
};

// Columnas del brief mínimo a partir de la ficha del cliente.
export function clientToBriefColumns(client = {}, lang = 'es') {
  const email = clean(client.email);
  return [
    ['business_name', clean(client.business_name)],
    ['owner_name', clean(client.owner_name)],
    ['email', email ? email.toLowerCase() : null],
    ['phone', clean(client.phone)],
    ['city_state', clean(client.city_state)],
    ['lang', lang === 'en' ? 'en' : 'es'],
    ['source', PANEL_SOURCE],
    ['status', 'in_progress'],
    ['schema_version', SCHEMA_VERSION],
  ];
}

/**
 * Crea el brief mínimo del cliente y su enlace del kit.
 *   opts.lang: idioma del brief y del kit ('es' | 'en').
 *   deps: { actorEmail, connect } (connect inyectable para las pruebas).
 * Devuelve { brief, client, token }. El token solo sale de aquí una vez: en
 * la base queda su huella (kit_token_hash), como en issueKitLink.
 * Errores (CrmError): 400 id, 404 sin cliente, 409 archivado, 409 con brief,
 * 503 sin las migraciones 010/011.
 */
export async function createKitBriefForClient(clientId, opts = {}, deps = {}) {
  const id = parseInt(String(clientId ?? ''), 10);
  if (!Number.isFinite(id) || id <= 0) throw new CrmError(400, 'Cliente no válido.');
  const lang = opts.lang === 'en' ? 'en' : 'es';

  const connect = deps.connect || (async () => (await import('@vercel/postgres')).db.connect());
  const actor = deps.actorEmail || null;
  const db = await connect();
  const q = (text, params) => db.query(text, params);
  let began = false;
  try {
    await q('BEGIN');
    began = true;
    // Bloqueado: dos clics seguidos no crean dos briefs (el segundo espera y
    // ya ve el brief del primero).
    const cr = await q('SELECT * FROM clients WHERE id = $1 FOR UPDATE', [id]);
    if (!cr.rowCount) throw new CrmError(404, 'Este cliente no existe o ya se borró.');
    const client = cr.rows[0];
    if (client.status === 'archived') throw new CrmError(409, ARCHIVED_CLIENT_MSG, { reason: 'archived' });

    const has = await q(CLIENT_BRIEF_SQL, [id, client.source_brief_id || null, String(id), client.source_lead_id || null]);
    if (has.rowCount) {
      const pid = has.rows[0].project_id;
      throw new CrmError(409, `Este cliente ya tiene el brief ${pid}. El kit de arranque se envía desde ese brief.`,
        { reason: 'has_brief', projectId: pid });
    }

    const token = newKitToken();
    const cols = [
      ...clientToBriefColumns(client, lang),
      ['kit_token_hash', hashKitToken(token)],
      ['kit_status', 'sent'],
    ];
    const br = await q(
      `INSERT INTO briefs (project_id, ${cols.map(([k]) => k).join(', ')}, kit_sent_at)
       VALUES (next_project_id(), ${cols.map((_, i) => `$${i + 1}`).join(', ')}, NOW())
       RETURNING id, project_id, status, source, lang, business_name, owner_name, email, kit_status, kit_sent_at`,
      cols.map(([, v]) => v));
    const brief = br.rows[0];

    await q('UPDATE clients SET source_brief_id = $1 WHERE id = $2 AND source_brief_id IS NULL', [brief.project_id, id]);
    const ev = (type, data) => q(
      'INSERT INTO brief_events (project_id, event_type, actor_email, data) VALUES ($1, $2, $3, $4::jsonb)',
      [brief.project_id, type, actor, JSON.stringify(data)]);
    await ev('brief_received', { source: PANEL_SOURCE, client_id: id, client_code: client.client_code });
    await ev('converted_to_client', {
      client_id: id, client_code: client.client_code, business_name: client.business_name || null,
      created: false, linked: true, from_panel: true,
    });

    await q('COMMIT');
    began = false;
    return {
      brief,
      client: {
        id, client_code: client.client_code, business_name: client.business_name,
        owner_name: client.owner_name, email: client.email, status: client.status,
      },
      token,
    };
  } catch (err) {
    if (began) {
      try { await q('ROLLBACK'); } catch (rb) { console.error('[client-kit] ROLLBACK falló:', rb && rb.message); }
    }
    if (isMissingSchema(err)) throw new CrmError(503, MIGRATION_011_MSG);
    throw err;
  } finally {
    try { db.release(); } catch (_) { /* conexión ya cerrada */ }
  }
}
