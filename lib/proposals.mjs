// ════════════════════════════════════════════════════════════════
//  lib/proposals.mjs — Embudo de ventas y propuestas (Ventas §1, fase 1).
//  Plan: docs/orbit/plan-ventas-orbit.md · Migración: db/migrations/029_ventas_embudo.sql
//
//  Para Marcy y el Diagnóstico (se llaman desde su código, sin pasar por la red):
//    saveProposal(input, deps)            guarda una propuesta y, si va enviada, mueve el
//                                         contacto a «propuesta enviada».
//    advanceLeadStage(ref, stage, deps)   mueve el contacto hacia delante en el embudo
//                                         (nunca hacia atrás ni fuera de los abiertos).
//  Para Orbit: sendProposal, editProposal y discardProposal (borradores), decideProposal, markFollowUpDone, listProposals,
//  funnelSummary y expireDueProposals.
//
//  Precios: salen del catálogo PRIVADO guardado en la base (tabla sales_catalog). Este
//  repo es público: aquí no hay ni una cifra del catálogo, solo los nombres de sus campos.
//  Reglas que se hacen cumplir (catálogo, bloques `reglas` y `usoDePrecios`):
//    · lo mensual (plan, añadidos, cuotas) va tal cual el catálogo: nunca se descuenta;
//    · un proyecto parte de su precio interno y nunca baja del público ni del mínimo
//      (pisoSobreBase × su precio interno); por encima puede ir, si crece el alcance;
//    · Marcy y el Diagnóstico solo ofrecen planes con enPropuestas.
//  Todo el dinero en centavos (enteros).
// ════════════════════════════════════════════════════════════════
import { CrmError } from './finance.mjs';
import { houstonDate } from './dates.mjs';
import { logLeadEvent, LOST_REASONS, MIGRATION_029_MSG } from './leads.mjs';

export { LOST_REASONS, MIGRATION_029_MSG };
export const NO_CATALOG_MSG = 'Falta cargar el catálogo de precios en la base (npm run sync:catalogo-orbit).';

// Etapas abiertas del embudo, en orden. «converted» es «ganado» (pasó a cliente).
export const OPEN_STAGES = ['new', 'contacted', 'diagnosed', 'proposal'];
export const AUTO_STAGES = ['contacted', 'diagnosed', 'proposal'];
export const PROPOSAL_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
export const PROPOSAL_AUTHORS = ['orbit', 'marcy', 'diagnostic'];
export const MAX_OPTIONS = 3;
const MAX_PROJECTS = 6;
// Proyectos cuya cuota mensual va incluida en los planes con incluyeCuotaAsistente.
const ASSISTANT_PROJECTS = ['iaBasic', 'ia'];
// Si el catálogo no trae la regla (no debería), lo acordado el 2026-11-18.
const DEFAULT_VALID_DAYS = 14;
const DEFAULT_FOLLOW_UP_DAYS = [2, 5, 10];

const isMissingSchema = (err) => Boolean(err && (err.code === '42P01' || err.code === '42703' || err.code === '42883'));
const bad = (message, extra = {}) => new CrmError(400, message, extra);

/** "$1,234" o "$1,234.50" a partir de centavos (pura). */
export function money(cents) {
  const n = Number(cents) / 100;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}

function cleanText(v, max) {
  if (v == null) return null;
  const s = String(v).trim().slice(0, max);
  return s || null;
}

/** 'AAAA-MM-DD' + n días (pura; días de calendario, sin husos). */
export function addDays(day, n) {
  const [y, m, d] = String(day).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

// ── Reglas del catálogo ───────────────────────────────────────
export function catalogRules(catalog) {
  const r = (catalog && catalog.reglas) || {};
  const piso = Number(r.pisoSobreBase);
  return {
    floorRatio: piso > 0 && piso <= 1 ? piso : 1,
    validDays: Number.isInteger(r.propuestaValidaDias) && r.propuestaValidaDias > 0 ? r.propuestaValidaDias : DEFAULT_VALID_DAYS,
    followUpDays: Array.isArray(r.seguimientoDias) && r.seguimientoDias.length
      ? r.seguimientoDias.map(Number).filter((n) => Number.isInteger(n) && n > 0).sort((a, b) => a - b)
      : DEFAULT_FOLLOW_UP_DAYS,
  };
}

/**
 * Precio de un proyecto del catálogo (pura): su precio interno (o su «desde» interno si
 * no tiene uno fijo), su cuota mensual si la tiene, y el mínimo al que se puede proponer:
 * el mayor entre el precio público y pisoSobreBase × el interno. Un proyecto con solo «desde»
 * nunca baja de ese «desde» (reglas.proyectoSoloDesde del catálogo).
 */
export function projectPricing(catalog, id) {
  const p = catalog?.proyectos?.[id];
  if (!p) return null;
  const base = Number.isFinite(p.precio) ? p.precio : Number.isFinite(p.desde) ? p.desde : null;
  if (base == null) return null;
  const listCents = Math.round(base * 100);
  const pub = catalog?.preciosPublicos || {};
  const isMonthlyAnchor = Array.isArray(pub.mensuales) && pub.mensuales.includes(id);
  const publicCents = !isMonthlyAnchor && Number.isFinite(pub.anclas?.[id]) ? Math.round(pub.anclas[id] * 100) : 0;
  const { floorRatio } = catalogRules(catalog);
  const fromPrice = !Number.isFinite(p.precio);
  // El mínimo, en dólares enteros hacia arriba (nunca $1,657.50).
  const floor = Math.max(publicCents, Math.ceil((listCents * floorRatio) / 100) * 100);
  return {
    id,
    name: p.nombre || id,
    list_cents: listCents,
    floor_cents: fromPrice ? Math.max(floor, listCents) : floor,
    monthly_cents: Number.isFinite(p.mensual) ? Math.round(p.mensual * 100) : 0,
    from_price: fromPrice,
  };
}

/**
 * Valida una opción y le pone sus precios del catálogo (pura). Entrada:
 *   { label?, plan: 'base'|'presencia'|'crecimiento'|'dominio'|null,
 *     projects?: [{ id, price_cents? }], addons?: ['aeoMonitoring', …], monthly_cents? }
 * Sale con los precios congelados tal cual se proponen. Lanza CrmError 400 con
 * { field } si algo no cuadra.
 */
export function priceOption(catalog, input, { author = 'orbit', index = 0 } = {}) {
  const field = (k) => `options.${index}.${k}`;
  if (!input || typeof input !== 'object') throw bad('Opción vacía.', { field: `options.${index}` });
  const label = cleanText(input.label, 80);

  let plan = null;
  if (input.plan != null && input.plan !== '') {
    const p = catalog?.planes?.[input.plan];
    if (!p || !Number.isFinite(p.mensual)) throw bad(`Plan desconocido: ${input.plan}.`, { field: field('plan') });
    if (author !== 'orbit' && p.enPropuestas === false) {
      throw bad(`El plan ${p.nombre || input.plan} no se ofrece en propuestas.`, { field: field('plan') });
    }
    plan = { id: input.plan, name: p.nombre || input.plan, monthly_cents: Math.round(p.mensual * 100) };
  }

  const rawProjects = Array.isArray(input.projects) ? input.projects : [];
  if (rawProjects.length > MAX_PROJECTS) throw bad(`Como mucho ${MAX_PROJECTS} servicios por opción.`, { field: field('projects') });
  const seen = new Set();
  const includesAssistant = Boolean(plan && catalog.planes[plan.id].incluyeCuotaAsistente);
  const projects = rawProjects.map((raw, i) => {
    const id = typeof raw === 'string' ? raw : raw?.id;
    const pr = projectPricing(catalog, id);
    if (!pr) throw bad(`Servicio desconocido: ${id}.`, { field: field(`projects.${i}`) });
    if (seen.has(id)) throw bad(`«${pr.name}» está dos veces en la misma opción.`, { field: field(`projects.${i}`) });
    seen.add(id);
    let cents = pr.list_cents;
    // Un proyecto que en el catálogo solo tiene «desde» no tiene precio hasta que alguien lo pone:
    // sin price_cents queda «por confirmar» y la propuesta no se puede enviar (usoDePrecios: un
    // «desde» nunca es una cotización).
    const pendingPrice = pr.from_price && !(raw && typeof raw === 'object' && raw.price_cents != null);
    if (raw && typeof raw === 'object' && raw.price_cents != null) {
      const v = Number(raw.price_cents);
      if (!Number.isInteger(v) || v < 0) throw bad(`Precio no válido para «${pr.name}».`, { field: field(`projects.${i}`) });
      cents = v;
    }
    if (cents < pr.floor_cents) {
      throw bad(`El precio de «${pr.name}» no puede bajar de ${money(pr.floor_cents)}.`,
        { field: field(`projects.${i}`), floor_cents: pr.floor_cents });
    }
    const included = includesAssistant && ASSISTANT_PROJECTS.includes(id) && pr.monthly_cents > 0;
    return {
      id, name: pr.name, cents, list_cents: pr.list_cents,
      monthly_cents: included ? 0 : pr.monthly_cents,
      ...(included ? { monthly_included: true } : {}),
      ...(pendingPrice ? { pending_price: true } : {}),
    };
  });

  const rawAddons = Array.isArray(input.addons) ? input.addons : [];
  const addons = [...new Set(rawAddons)].map((id) => {
    const a = catalog?.anadidosMensuales?.[id];
    if (!a || !Number.isFinite(a.mensual)) throw bad(`Añadido desconocido: ${id}.`, { field: field('addons') });
    if (!plan || (Array.isArray(a.para) && !a.para.includes(plan.id))) {
      throw bad(`«${a.nombre || id}» no se puede añadir a esta opción.`, { field: field('addons') });
    }
    return { id, name: a.nombre || id, monthly_cents: Math.round(a.mensual * 100) };
  });

  if (!plan && !projects.length) throw bad('Cada opción lleva un plan, un servicio o los dos.', { field: `options.${index}` });

  const project_cents = projects.reduce((s, p) => s + p.cents, 0);
  const monthly_cents = (plan ? plan.monthly_cents : 0)
    + addons.reduce((s, a) => s + a.monthly_cents, 0)
    + projects.reduce((s, p) => s + p.monthly_cents, 0);
  if (input.monthly_cents != null && Number(input.monthly_cents) !== monthly_cents) {
    throw bad(`Lo mensual no se descuenta: esta opción es ${money(monthly_cents)} al mes.`,
      { field: field('monthly_cents'), monthly_cents });
  }
  const pending = projects.some((p) => p.pending_price);
  return { label, plan, addons, projects, project_cents, monthly_cents, ...(pending ? { pending: true } : {}) };
}

/** El primer servicio de una propuesta que aún no tiene precio real (o null). Pura. */
export function pendingPriceOf(options) {
  for (const [i, o] of (Array.isArray(options) ? options : []).entries()) {
    for (const [j, p] of (o.projects || []).entries()) if (p.pending_price) return { option: i, project: j, name: p.name };
  }
  return null;
}

/** Con cuántos trabajos al mes se paga lo mensual (pura). null si no hay datos. */
export function paysBackWith(monthlyCents, clientValueCents) {
  const m = Number(monthlyCents);
  const v = Number(clientValueCents);
  if (!(m > 0) || !(v > 0)) return null;
  return Math.ceil(m / v);
}

// ── Fechas: caducidad y seguimientos ──────────────────────────
export function expiryDate(sentDay, validDays = DEFAULT_VALID_DAYS) {
  return addDays(sentDay, validDays);
}
/** Próximo seguimiento tras `done` hechos; null si ya no queda ninguno (pura). */
export function nextFollowUp(sentDay, done, days = DEFAULT_FOLLOW_UP_DAYS) {
  return done < days.length ? addDays(sentDay, days[done]) : null;
}
/** Estado real: una enviada cuya fecha de caducidad ya pasó cuenta como caducada (pura). */
export function effectiveStatus(p, today) {
  if (p && p.status === 'sent' && p.expires_on && p.expires_on < today) return 'expired';
  return p ? p.status : null;
}

// ── Etapas ────────────────────────────────────────────────────
/**
 * Lo automático (Marcy, Diagnóstico, enviar una propuesta) solo mueve hacia delante y solo
 * entre etapas abiertas: nunca saca a un contacto de ganado, perdido, archivado, prueba o
 * spam, ni lo devuelve atrás (pura).
 */
export function canAutoAdvance(current, target) {
  const from = OPEN_STAGES.indexOf(current);
  const to = OPEN_STAGES.indexOf(target);
  return from >= 0 && to >= 0 && to > from;
}

// ── Conexión ──────────────────────────────────────────────────
async function connectDb(deps) {
  const connect = deps.connect || (async () => (await import('@vercel/postgres')).db.connect());
  return connect();
}

async function withTx(deps, fn) {
  const db = await connectDb(deps);
  const q = (text, params) => db.query(text, params);
  let began = false;
  try {
    await q('BEGIN');
    began = true;
    const out = await fn(q);
    await q('COMMIT');
    began = false;
    return out;
  } catch (err) {
    if (began) { try { await q('ROLLBACK'); } catch (e) { console.error('[proposals] rollback:', e.message); } }
    if (isMissingSchema(err)) throw new CrmError(503, MIGRATION_029_MSG);
    throw err;
  } finally {
    try { db.release(); } catch (e) { console.error('[proposals] release:', e.message); }
  }
}

async function withConn(deps, fn) {
  const db = await connectDb(deps);
  try {
    return await fn((text, params) => db.query(text, params));
  } catch (err) {
    if (isMissingSchema(err)) throw new CrmError(503, MIGRATION_029_MSG);
    throw err;
  } finally {
    try { db.release(); } catch (e) { console.error('[proposals] release:', e.message); }
  }
}

/** Catálogo privado más reciente. 503 si nadie lo ha cargado todavía. */
export async function loadCatalog(q) {
  const r = await q('SELECT version, body FROM sales_catalog ORDER BY loaded_at DESC, version DESC LIMIT 1', []);
  if (!r.rowCount) throw new CrmError(503, NO_CATALOG_MSG);
  return { version: r.rows[0].version, body: r.rows[0].body };
}
async function loadRules(q) {
  try { return catalogRules((await loadCatalog(q)).body); }
  catch (err) { if (err instanceof CrmError) return catalogRules(null); throw err; }
}

const COLS = `id, ref_id, lead_ref, client_id, status, created_by, source_ref, actor_email, catalog_version,
  options, recommended_option, chosen_option, client_value_cents, sent_at,
  to_char(expires_on, 'YYYY-MM-DD') AS expires_on, follow_ups_done,
  to_char(next_follow_up_on, 'YYYY-MM-DD') AS next_follow_up_on,
  to_char(sent_at AT TIME ZONE 'America/Chicago', 'YYYY-MM-DD') AS sent_on,
  decided_at, decision_note, notes, created_at, updated_at`;

/** Fila de la base → propuesta para la API (pura). */
export function rowToProposal(row, today) {
  if (!row) return null;
  const options = Array.isArray(row.options) ? row.options : [];
  const value = row.client_value_cents == null ? null : Number(row.client_value_cents);
  return {
    ...row,
    id: Number(row.id),
    client_id: row.client_id == null ? null : Number(row.client_id),
    client_value_cents: value,
    options: options.map((o) => ({ ...o, pays_back_jobs: paysBackWith(o.monthly_cents, value) })),
    effective_status: effectiveStatus(row, today),
  };
}

async function moveLead(q, lead, target, { by, actorEmail }) {
  if (!lead || !canAutoAdvance(lead.status, target)) return false;
  await q('UPDATE leads SET status = $1, stage_changed_at = NOW() WHERE ref_id = $2', [target, lead.ref_id]);
  await logLeadEvent({ ref: lead.ref_id, type: 'status_changed', actorEmail, data: { from: lead.status, to: target, by } }, q);
  lead.status = target;
  return true;
}

// ── Guardar una propuesta (Orbit, Marcy, Diagnóstico) ─────────
/**
 * input: { lead_ref?, client_id?, brief_ref?, created_by: 'orbit'|'marcy'|'diagnostic', source_ref?,
 *          options: [opción, …] (1 a 3, ver priceOption), recommended_option?: 0|1|2,
 *          client_value_cents?, send?: boolean, notes? }
 *   · lead_ref, client_id o brief_ref (al menos uno). brief_ref (MRC-…, migración 032) es el
 *     brief de quien se decidió en el chat sin pasar por contacto; si ese brief ya es cliente,
 *     la propuesta queda unida también a su cliente.
 *   · Marcy y el Diagnóstico mandan source_ref (su conversación o su diagnóstico): si
 *     reintentan, devuelve la misma propuesta (created: false) y no crea otra.
 *   · send: true = sale enviada (caduca a los 14 días y le tocan los seguimientos) y el
 *     contacto pasa a «propuesta enviada» si estaba antes en el embudo.
 * deps: { connect?, actorEmail?, now? }
 * Devuelve { proposal, created, lead_status }.
 */
export async function saveProposal(input = {}, deps = {}) {
  const author = input.created_by ?? 'orbit';
  if (!PROPOSAL_AUTHORS.includes(author)) throw bad('Origen de la propuesta no válido.', { field: 'created_by' });
  const sourceRef = cleanText(input.source_ref, 200);
  if (author !== 'orbit' && !sourceRef) throw bad('Falta source_ref (la conversación o el diagnóstico de origen).', { field: 'source_ref' });
  const leadRef = cleanText(input.lead_ref, 40);
  const clientId = input.client_id == null || input.client_id === '' ? null : Number(input.client_id);
  if (clientId != null && !(Number.isInteger(clientId) && clientId > 0)) throw bad('Cliente no válido.', { field: 'client_id' });
  const briefRef = cleanText(input.brief_ref, 40)?.toUpperCase() || null;
  if (!leadRef && clientId == null && !briefRef) throw bad('La propuesta va unida a un contacto, a un cliente o a un brief.', { field: 'lead_ref' });
  // replaces_prefix: el principio común de las cotizaciones de una misma conversación
  // (p. ej. «chat:<sid>:»). La nueva sustituye a los borradores sin enviar de ese principio.
  const replacesPrefix = input.replaces_prefix == null || input.replaces_prefix === '' ? null : cleanText(input.replaces_prefix, 200);
  if (replacesPrefix != null && !(sourceRef && replacesPrefix.length >= 3 && sourceRef.startsWith(replacesPrefix) && sourceRef !== replacesPrefix)) {
    throw bad('replaces_prefix tiene que ser el principio del source_ref de esta cotización.', { field: 'replaces_prefix' });
  }
  const options = Array.isArray(input.options) ? input.options : [];
  if (!options.length || options.length > MAX_OPTIONS) throw bad(`Una propuesta lleva de 1 a ${MAX_OPTIONS} opciones.`, { field: 'options' });
  const rec = input.recommended_option == null ? null : Number(input.recommended_option);
  if (rec != null && !(Number.isInteger(rec) && rec >= 0 && rec < options.length)) throw bad('La opción recomendada no existe.', { field: 'recommended_option' });
  const value = input.client_value_cents == null || input.client_value_cents === '' ? null : Number(input.client_value_cents);
  if (value != null && !(Number.isInteger(value) && value > 0)) throw bad('Lo que le vale un cliente va en centavos, mayor que cero.', { field: 'client_value_cents' });
  const send = input.send === true;
  // skip_if_open: no crear si ya hay otra abierta (abajo, dentro de la transacción).
  const skipIfOpen = input.skip_if_open === true;
  const notes = cleanText(input.notes, 5000);
  const actorEmail = deps.actorEmail || null;
  const today = houstonDate(deps.now);
  let business = null;
  let notice = null;

  const out = await withTx(deps, async (q) => {
    if (sourceRef) {
      const ex = await q(`SELECT ${COLS} FROM proposals WHERE created_by = $1 AND source_ref = $2 LIMIT 1`, [author, sourceRef]);
      if (ex.rowCount) {
        const p = rowToProposal(ex.rows[0], today);
        let leadStatus = null;
        if (p.lead_ref) {
          const lr = await q('SELECT status FROM leads WHERE ref_id = $1', [p.lead_ref]);
          leadStatus = lr.rows[0]?.status ?? null;
        }
        return { proposal: p, created: false, lead_status: leadStatus };
      }
    }

    const catalog = await loadCatalog(q);
    const priced = options.map((o, i) => priceOption(catalog.body, o, { author, index: i }));
    const falta = send ? pendingPriceOf(priced) : null;
    if (falta) throw bad(`Pon el precio real de «${falta.name}» antes de enviarla: en el catálogo solo tiene «desde».`, { field: `options.${falta.option}.projects.${falta.project}` });

    let lead = null;
    if (leadRef) {
      const lr = await q('SELECT ref_id, status, converted_client_id FROM leads WHERE ref_id = $1 FOR UPDATE', [leadRef]);
      if (!lr.rowCount) throw new CrmError(404, 'Contacto no encontrado.');
      lead = lr.rows[0];
    }
    let briefClient = null;
    if (briefRef) {
      const br = await q(`SELECT project_id, business_name FROM briefs WHERE project_id = $1${skipIfOpen && !lead ? ' FOR UPDATE' : ''}`, [briefRef]);
      if (!br.rowCount) throw new CrmError(404, 'Brief no encontrado.');
      business = br.rows[0].business_name || null;
      const bc = await q('SELECT id FROM clients WHERE source_brief_id = $1 ORDER BY id LIMIT 1', [briefRef]);
      briefClient = bc.rowCount ? Number(bc.rows[0].id) : null;
    }
    const client = clientId ?? (lead?.converted_client_id != null ? Number(lead.converted_client_id) : briefClient);
    if (clientId != null) {
      const cr = await q(`SELECT id, business_name FROM clients WHERE id = $1${skipIfOpen && !lead && !briefRef ? ' FOR UPDATE' : ''}`, [clientId]);
      if (!cr.rowCount) throw new CrmError(404, 'Cliente no encontrado.');
      if (!briefRef) business = cr.rows[0].business_name || null;
    }
    // De quién cuelga: el contacto; si no, el brief; si no, el cliente.
    const [anchorCol, anchorVal] = lead ? ['lead_ref', lead.ref_id] : briefRef ? ['brief_ref', briefRef] : ['client_id', client];
    if (skipIfOpen) {
      // Con el contacto (o el brief o el cliente) ya bloqueado, se bloquean también sus propuestas
      // abiertas: corregir o enviar bloquea la propuesta y no el contacto, así que hasta guardar
      // nadie puede cambiarlas. Si alguna no es un borrador que esta sustituye, no se crea otra.
      const open = await q(
        `SELECT ${COLS} FROM proposals WHERE ${anchorCol} = $1 AND status IN ('draft', 'sent') ORDER BY created_at FOR UPDATE`,
        [anchorVal]);
      const blocking = open.rows.find((row) => !replaceableBy(row, { author, sourceRef, replacesPrefix }));
      if (blocking) return { proposal: rowToProposal(blocking, today), created: false, lead_status: lead?.status ?? null, open: true };
    }

    const rules = catalogRules(catalog.body);
    const idr = await q('SELECT next_proposal_id() AS id', []);
    const ref = idr.rows[0].id;
    // La columna brief_ref (migración 032) solo se nombra cuando hace falta: sin la 032,
    // las propuestas de contactos y clientes se siguen guardando.
    const ins = await q(
      `INSERT INTO proposals (
         ref_id, lead_ref, client_id, status, created_by, source_ref, actor_email, catalog_version,
         options, recommended_option, client_value_cents, sent_at, expires_on, next_follow_up_on, notes${briefRef ? ', brief_ref' : ''}
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11,
                 ${send ? 'NOW()' : 'NULL'}, $12::date, $13::date, $14${briefRef ? ', $15' : ''})
       ON CONFLICT (created_by, source_ref) WHERE source_ref IS NOT NULL DO NOTHING
       RETURNING ${COLS}`,
      [ref, lead?.ref_id ?? null, client, send ? 'sent' : 'draft', author, sourceRef, actorEmail, catalog.version,
        JSON.stringify(priced), rec, value,
        send ? expiryDate(today, rules.validDays) : null,
        send ? nextFollowUp(today, 0, rules.followUpDays) : null, notes, ...(briefRef ? [briefRef] : [])]);

    if (!ins.rowCount) {
      // Otra llamada con el mismo source_ref ganó la carrera: se devuelve la suya.
      const ex = await q(`SELECT ${COLS} FROM proposals WHERE created_by = $1 AND source_ref = $2 LIMIT 1`, [author, sourceRef]);
      return { proposal: rowToProposal(ex.rows[0], today), created: false, lead_status: lead?.status ?? null };
    }
    const proposal = rowToProposal(ins.rows[0], today);
    // Sustituir: solo borradores del mismo autor, de la misma conversación y del mismo contacto,
    // brief o cliente, que nadie ha tocado desde que se crearon (uno que el dueño corrigió es suyo).
    const replaced = [];
    if (replacesPrefix) {
      const like = replacesPrefix.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
      const del = await q(
        `DELETE FROM proposals
          WHERE status = 'draft' AND created_by = $1 AND source_ref LIKE $2 AND source_ref <> $3
            AND updated_at = created_at AND ${anchorCol} = $4
          RETURNING ref_id`,
        [author, like, sourceRef, anchorVal]);
      for (const row of del.rows) replaced.push(row.ref_id);
    }
    if (lead) {
      await logLeadEvent({ ref: lead.ref_id, type: 'proposal_created', actorEmail,
        data: { proposal: ref, by: author, sent: send } }, q);
      for (const old of replaced) {
        await logLeadEvent({ ref: lead.ref_id, type: 'proposal_replaced', actorEmail, data: { proposal: old, by: author, new_proposal: ref } }, q);
      }
      if (send) await moveLead(q, lead, 'proposal', { by: author, actorEmail });
    }
    // Armar el aviso nunca tumba el guardado: si algo falla, la propuesta queda igual.
    try { notice = draftNotice({ proposal, author, briefRef, clientId: client, business, now: deps.now }); }
    catch (e) { console.warn('[proposals] aviso del borrador:', e && e.message); }
    return { proposal, created: true, lead_status: lead?.status ?? null, ...(replacesPrefix ? { replaced } : {}) };
  });
  // Después de guardar (nunca dentro de la transacción): el aviso no puede tumbar el guardado.
  if (notice) await sendDraftNotice(notice, deps);
  return out;
}

// ── Aviso del mismo día de un borrador automático sin contacto ──
// «Para hoy» solo enseña contactos: un borrador que Marcy o el Diagnóstico dejan en un brief o
// en un cliente no saldría en ninguna parte hasta abrir esa ficha, y el dueño se comprometió a
// enviarlo en 24 horas. Marcy no avisa por su cuenta: el aviso va aquí, en un solo sitio, en la
// bandeja de Orbit y en el móvil. Uno por brief o cliente cada 24 horas: si Marcy vuelve a
// cotizar en la misma conversación, el enlace ya lleva al borrador nuevo.
const AUTOR_AVISO = { marcy: 'Marcy', diagnostic: 'El Diagnóstico' };
const fmtHora = new Intl.DateTimeFormat('es-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' });
const fmtDia = new Intl.DateTimeFormat('es-US', { timeZone: 'America/Chicago', weekday: 'long', day: 'numeric', month: 'long' });

/** El aviso de un borrador recién creado, o null si no toca (pura). */
export function draftNotice({ proposal, author, briefRef = null, clientId = null, business = null, now = new Date() } = {}) {
  if (!proposal || !AUTOR_AVISO[author] || proposal.status !== 'draft' || proposal.lead_ref) return null;
  const where = briefRef ? { key: briefRef, url: `/dashboard#/briefs/${encodeURIComponent(briefRef)}`, label: `el brief ${briefRef}` }
    : clientId != null ? { key: `CLI-${clientId}`, url: `/dashboard#/clientes/${encodeURIComponent(clientId)}`, label: 'la ficha del cliente' }
    : null;
  if (!where) return null;
  const c = new Date(proposal.created_at);
  const created = Number.isFinite(c.getTime()) ? c : new Date(now ?? Date.now());
  const due = new Date(created.getTime() + DAY_MS);
  const falta = pendingPriceOf(proposal.options);
  return {
    key: `borrador:${where.key}`,
    title: `${AUTOR_AVISO[author]} dejó una cotización sin enviar${business ? `: ${business}` : ''}`,
    body: `${proposal.ref_id} está en ${where.label} y no sale en «Para hoy».`
      + (falta ? ` Falta el precio real de «${falta.name}».` : '')
      + ` Envíala antes de las ${fmtHora.format(due)} del ${fmtDia.format(due)}.`,
    url: where.url,
    windowHours: 24,
  };
}

async function sendDraftNotice(notice, deps = {}) {
  try {
    const fn = deps.notify !== undefined ? deps.notify : (await import('./notifications.mjs')).notifySystem;
    if (fn) await fn(notice);
  } catch (e) { console.warn('[proposals] aviso del borrador falló:', e && e.message); }
}

/** ¿Este borrador lo sustituye la cotización nueva? Lo mismo que el DELETE de saveProposal (pura). */
function replaceableBy(row, { author, sourceRef, replacesPrefix }) {
  if (!replacesPrefix || row.status !== 'draft' || row.created_by !== author) return false;
  const src = String(row.source_ref || '');
  if (!src.startsWith(replacesPrefix) || src === sourceRef) return false;
  const t = (v) => (v instanceof Date ? v.getTime() : String(v));
  return t(row.updated_at) === t(row.created_at);
}

// ── Mover un contacto en el embudo (Marcy, Diagnóstico) ───────
/**
 * Mueve el contacto a `stage` ('contacted', 'diagnosed' o 'proposal') solo si eso es ir
 * hacia delante dentro del embudo abierto; si no, no hace nada (moved: false).
 * deps: { connect?, actorEmail?, by?: 'marcy'|'diagnostic'|'orbit' }
 * Devuelve { lead_ref, status, moved }.
 */
export async function advanceLeadStage(leadRef, stage, deps = {}) {
  if (!AUTO_STAGES.includes(stage)) throw bad('Etapa no válida.', { field: 'stage' });
  const by = PROPOSAL_AUTHORS.includes(deps.by) ? deps.by : 'orbit';
  return withTx(deps, async (q) => {
    const lr = await q('SELECT ref_id, status FROM leads WHERE ref_id = $1 FOR UPDATE', [String(leadRef || '')]);
    if (!lr.rowCount) throw new CrmError(404, 'Contacto no encontrado.');
    const lead = lr.rows[0];
    const moved = await moveLead(q, lead, stage, { by, actorEmail: deps.actorEmail || null });
    return { lead_ref: lead.ref_id, status: lead.status, moved };
  });
}

// ── Orbit: enviar, decidir, seguimientos ──────────────────────
async function lockProposal(q, ref) {
  const r = await q(`SELECT ${COLS} FROM proposals WHERE ref_id = $1 FOR UPDATE`, [String(ref || '')]);
  if (!r.rowCount) throw new CrmError(404, 'Propuesta no encontrada.');
  return r.rows[0];
}

/**
 * Bloqueos siempre en el mismo orden: primero el contacto y después la propuesta, como en
 * saveProposal. Al revés, enviar y guardar a la vez podrían esperarse la una a la otra y la
 * base abortaría una. Apuntar en el historial también toca al contacto, así que todo lo que
 * cambia una propuesta pasa por aquí. Devuelve { p, lead } (lead null si no cuelga de uno).
 */
async function lockLeadThenProposal(q, ref) {
  const pre = await q('SELECT lead_ref FROM proposals WHERE ref_id = $1', [String(ref || '')]);
  if (!pre.rowCount) throw new CrmError(404, 'Propuesta no encontrada.');
  const leadRef = pre.rows[0].lead_ref || null;
  const lead = leadRef ? (await q('SELECT ref_id, status FROM leads WHERE ref_id = $1 FOR UPDATE', [leadRef])).rows[0] || null : null;
  const p = await lockProposal(q, ref);
  if ((p.lead_ref || null) !== leadRef) throw new CrmError(409, 'La propuesta cambió de contacto mientras se guardaba. Inténtalo de nuevo.');
  return { p, lead };
}

/** Borrador → enviada (desde hoy: caducidad y seguimientos). deps: { connect?, actorEmail?, now? } */
export async function sendProposal(ref, deps = {}) {
  const today = houstonDate(deps.now);
  return withTx(deps, async (q) => {
    const { p, lead } = await lockLeadThenProposal(q, ref);
    if (p.status !== 'draft') throw new CrmError(409, 'Solo se envía una propuesta en borrador.');
    const falta = pendingPriceOf(p.options);
    if (falta) throw new CrmError(409, `Pon el precio real de «${falta.name}» antes de enviarla: edita la propuesta.`, { reason: 'pending_price' });
    const rules = await loadRules(q);
    const r = await q(
      `UPDATE proposals SET status = 'sent', sent_at = NOW(), expires_on = $2::date,
              next_follow_up_on = $3::date, follow_ups_done = 0
        WHERE ref_id = $1 RETURNING ${COLS}`,
      [p.ref_id, expiryDate(today, rules.validDays), nextFollowUp(today, 0, rules.followUpDays)]);
    let leadStatus = null;
    if (lead) {
      await logLeadEvent({ ref: lead.ref_id, type: 'proposal_sent', actorEmail: deps.actorEmail || null, data: { proposal: p.ref_id } }, q);
      await moveLead(q, lead, 'proposal', { by: 'orbit', actorEmail: deps.actorEmail || null });
      leadStatus = lead.status;
    }
    return { proposal: rowToProposal(r.rows[0], today), lead_status: leadStatus };
  });
}

/**
 * Corregir un borrador (el de Marcy, el del Diagnóstico o uno tuyo) antes de enviarlo: nuevas
 * opciones, recomendada y lo que le vale un cliente. Se vuelve a preciar con el catálogo de hoy,
 * con las reglas de Orbit (el dueño puede ofrecer cualquier plan). Solo borradores (409 si no).
 * input: { options, recommended_option?, client_value_cents? } · deps: { connect?, actorEmail?, now? }
 */
export async function editProposal(ref, input = {}, deps = {}) {
  const options = Array.isArray(input.options) ? input.options : [];
  if (!options.length || options.length > MAX_OPTIONS) throw bad(`Una propuesta lleva de 1 a ${MAX_OPTIONS} opciones.`, { field: 'options' });
  const rec = input.recommended_option == null ? null : Number(input.recommended_option);
  if (rec != null && !(Number.isInteger(rec) && rec >= 0 && rec < options.length)) throw bad('La opción recomendada no existe.', { field: 'recommended_option' });
  const value = input.client_value_cents == null || input.client_value_cents === '' ? null : Number(input.client_value_cents);
  if (value != null && !(Number.isInteger(value) && value > 0)) throw bad('Lo que le vale un cliente va en centavos, mayor que cero.', { field: 'client_value_cents' });
  const today = houstonDate(deps.now);
  return withTx(deps, async (q) => {
    const { p } = await lockLeadThenProposal(q, ref);
    if (p.status !== 'draft') throw new CrmError(409, 'Solo se corrige una propuesta en borrador. Si ya se envió, haz otra.');
    const catalog = await loadCatalog(q);
    const priced = options.map((o, i) => priceOption(catalog.body, o, { author: 'orbit', index: i }));
    const r = await q(
      `UPDATE proposals SET options = $2::jsonb, recommended_option = $3, client_value_cents = $4, catalog_version = $5
        WHERE ref_id = $1 RETURNING ${COLS}`,
      [p.ref_id, JSON.stringify(priced), rec, value, catalog.version]);
    if (p.lead_ref) {
      await logLeadEvent({ ref: p.lead_ref, type: 'proposal_edited', actorEmail: deps.actorEmail || null, data: { proposal: p.ref_id } }, q);
    }
    return { proposal: rowToProposal(r.rows[0], today) };
  });
}

/**
 * Descartar un borrador que vino mal (nunca se envió, así que se borra; queda en el historial
 * del contacto). Solo borradores (409 si no). deps: { connect?, actorEmail? }
 */
export async function discardProposal(ref, deps = {}) {
  return withTx(deps, async (q) => {
    const { p } = await lockLeadThenProposal(q, ref);
    if (p.status !== 'draft') throw new CrmError(409, 'Solo se descarta un borrador. Una enviada se marca como rechazada.');
    await q('DELETE FROM proposals WHERE ref_id = $1 AND status = $2', [p.ref_id, 'draft']);
    if (p.lead_ref) {
      await logLeadEvent({ ref: p.lead_ref, type: 'proposal_discarded', actorEmail: deps.actorEmail || null, data: { proposal: p.ref_id, by: p.created_by } }, q);
    }
    return { discarded: p.ref_id };
  });
}

/**
 * Aceptada o rechazada (también una caducada: el cliente puede contestar tarde).
 * decision: { status: 'accepted'|'rejected', chosen_option?, note? }. Aceptar NO convierte
 * al contacto en cliente: eso lo confirma el dueño con «Ganado: pasar a cliente».
 */
export async function decideProposal(ref, decision = {}, deps = {}) {
  const status = decision.status;
  if (status !== 'accepted' && status !== 'rejected') throw bad('Elige aceptada o rechazada.', { field: 'status' });
  const note = cleanText(decision.note, 2000);
  const today = houstonDate(deps.now);
  return withTx(deps, async (q) => {
    const { p } = await lockLeadThenProposal(q, ref);
    if (p.status !== 'sent' && p.status !== 'expired') throw new CrmError(409, 'Solo se decide una propuesta enviada.');
    const n = Array.isArray(p.options) ? p.options.length : 0;
    let chosen = null;
    if (status === 'accepted') {
      chosen = decision.chosen_option == null ? (n === 1 ? 0 : null) : Number(decision.chosen_option);
      if (!(Number.isInteger(chosen) && chosen >= 0 && chosen < n)) throw bad('Marca qué opción eligió.', { field: 'chosen_option' });
    }
    const r = await q(
      `UPDATE proposals SET status = $2, chosen_option = $3, decided_at = NOW(), decision_note = $4,
              next_follow_up_on = NULL
        WHERE ref_id = $1 RETURNING ${COLS}`,
      [p.ref_id, status, chosen, note]);
    if (p.lead_ref) {
      await logLeadEvent({ ref: p.lead_ref, type: status === 'accepted' ? 'proposal_accepted' : 'proposal_rejected',
        actorEmail: deps.actorEmail || null, data: { proposal: p.ref_id, ...(chosen != null ? { option: chosen } : {}) } }, q);
    }
    return { proposal: rowToProposal(r.rows[0], today) };
  });
}

/** Seguimiento hecho: cuenta uno y pone la fecha del siguiente (o ninguna si era el último). */
export async function markFollowUpDone(ref, deps = {}) {
  const today = houstonDate(deps.now);
  return withTx(deps, async (q) => {
    const { p } = await lockLeadThenProposal(q, ref);
    if (p.status !== 'sent') throw new CrmError(409, 'Solo una propuesta enviada lleva seguimientos.');
    const rules = await loadRules(q);
    const done = Number(p.follow_ups_done) + 1;
    const next = p.sent_on ? nextFollowUp(p.sent_on, done, rules.followUpDays) : null;
    const r = await q(
      'UPDATE proposals SET follow_ups_done = $2, next_follow_up_on = $3::date WHERE ref_id = $1 RETURNING ' + COLS,
      [p.ref_id, done, next]);
    if (p.lead_ref) {
      await logLeadEvent({ ref: p.lead_ref, type: 'follow_up_done', actorEmail: deps.actorEmail || null,
        data: { proposal: p.ref_id, step: done } }, q);
    }
    return { proposal: rowToProposal(r.rows[0], today) };
  });
}

// ── Lecturas ──────────────────────────────────────────────────
/** Propuestas de un contacto, de un cliente o de un brief (032), la más reciente primero. */
export async function listProposals({ lead_ref = null, client_id = null, brief_ref = null } = {}, deps = {}) {
  if (!lead_ref && client_id == null && !brief_ref) throw bad('Falta el contacto, el cliente o el brief.');
  const today = houstonDate(deps.now);
  return withConn(deps, async (q) => {
    const r = brief_ref
      ? await q(
        `SELECT ${COLS} FROM proposals WHERE brief_ref = $1 ORDER BY created_at DESC, id DESC LIMIT 50`,
        [String(brief_ref).toUpperCase()])
      : await q(
        `SELECT ${COLS} FROM proposals
          WHERE ($1::text IS NOT NULL AND lead_ref = $1) OR ($2::bigint IS NOT NULL AND client_id = $2)
          ORDER BY created_at DESC, id DESC LIMIT 50`,
        [lead_ref, client_id == null ? null : Number(client_id)]);
    return r.rows.map((row) => rowToProposal(row, today));
  });
}

/**
 * El embudo: cuántos contactos hay en cada etapa (sin prueba ni spam), cuánto suma lo
 * propuesto en las enviadas vigentes (la opción recomendada, o la primera), cuántos
 * seguimientos tocan hoy o antes y cuántas enviadas ya caducaron sin respuesta.
 */
export async function funnelSummary(deps = {}) {
  const today = houstonDate(deps.now);
  return withConn(deps, async (q) => {
    const s = await q(
      `SELECT status, COUNT(*)::int AS n FROM leads WHERE status NOT IN ('test', 'spam') GROUP BY status`, []);
    const stages = Object.fromEntries(s.rows.map((r) => [r.status, r.n]));
    const p = await q(
      `SELECT COUNT(*) FILTER (WHERE expires_on >= $1::date)::int AS open,
              COALESCE(SUM((options -> COALESCE(recommended_option, 0) ->> 'project_cents')::bigint)
                       FILTER (WHERE expires_on >= $1::date), 0)::bigint AS project_cents,
              COALESCE(SUM((options -> COALESCE(recommended_option, 0) ->> 'monthly_cents')::bigint)
                       FILTER (WHERE expires_on >= $1::date), 0)::bigint AS monthly_cents,
              COUNT(*) FILTER (WHERE next_follow_up_on <= $1::date AND expires_on >= $1::date)::int AS follow_ups_due,
              COUNT(*) FILTER (WHERE expires_on < $1::date)::int AS expired
         FROM proposals WHERE status = 'sent'`,
      [today]);
    const row = p.rows[0] || {};
    return {
      stages,
      proposed: { open: row.open || 0, project_cents: Number(row.project_cents || 0), monthly_cents: Number(row.monthly_cents || 0) },
      follow_ups_due: row.follow_ups_due || 0,
      expired_pending: row.expired || 0,
    };
  });
}

/**
 * Para la tarea diaria: las enviadas cuya caducidad pasó quedan caducadas y se apunta en
 * la ficha del contacto. El contacto NO pasa a perdido: el aviso lo decide el dueño.
 */
export async function expireDueProposals(deps = {}) {
  const today = houstonDate(deps.now);
  return withTx(deps, async (q) => {
    // Primero los contactos de las que vencen, en orden fijo (como en el resto: contacto y luego propuesta).
    const due = await q(
      `SELECT DISTINCT lead_ref FROM proposals WHERE status = 'sent' AND expires_on < $1::date AND lead_ref IS NOT NULL`, [today]);
    if (due.rowCount) {
      await q('SELECT ref_id FROM leads WHERE ref_id = ANY($1::text[]) ORDER BY ref_id FOR UPDATE', [due.rows.map((x) => x.lead_ref)]);
    }
    const r = await q(
      `UPDATE proposals SET status = 'expired', next_follow_up_on = NULL
        WHERE status = 'sent' AND expires_on < $1::date
        RETURNING ref_id, lead_ref, to_jsonb(proposals.*) ->> 'brief_ref' AS brief_ref`,
      [today]);
    // (brief_ref por to_jsonb: así funciona con o sin la migración 032.)
    for (const row of r.rows) {
      if (row.lead_ref) await logLeadEvent({ ref: row.lead_ref, type: 'proposal_expired', data: { proposal: row.ref_id } }, q);
    }
    return { expired: r.rows.map((row) => row.ref_id), items: r.rows.map((row) => ({ ref_id: row.ref_id, lead_ref: row.lead_ref, brief_ref: row.brief_ref || null })) };
  });
}

// ── Lo que toca con cada contacto (vistas «Por etapas» y «Para hoy») ──
const DAY_MS = 24 * 60 * 60 * 1000;
const asDate = (v) => (v instanceof Date ? v : v ? new Date(v) : null);

/**
 * Siguiente paso de un contacto en curso (pura). lead: { status, created_at, stage_changed_at?,
 * updated_at? }; proposal: la suya viva (resumen de pipelineLeads) o null.
 * Devuelve { kind, due?, step?, days?, bucket } con bucket 'late' (atrasado), 'today' o 'week'.
 *   · con una propuesta en borrador sin enviar (la de Marcy o del Diagnóstico, o una tuya):
 *     enviarla en 24 horas desde que se creó el borrador. Manda sobre lo demás.
 *   · new: contestar en 24 horas desde que llegó (lo que promete la web).
 *   · diagnosed: la propuesta en 24 horas desde el diagnóstico.
 *   · proposal: el seguimiento que toque (2, 5 y 10 días); si ya no quedan, esperar a que
 *     venza; si venció sin respuesta, atrasado.
 *   · contacted (o sin propuesta enviada): sin siguiente paso, con los días que lleva.
 */
export function nextStep(lead, proposal, { now = new Date(), followUpDays = DEFAULT_FOLLOW_UP_DAYS } = {}) {
  const today = houstonDate(now);
  const since = asDate(lead.stage_changed_at) || asDate(lead.updated_at) || asDate(lead.created_at);
  const daysIn = since ? Math.max(0, Math.floor((now - since) / DAY_MS)) : null;
  const within24 = (from, kind) => {
    const due = from ? new Date(from.getTime() + DAY_MS) : null;
    return { kind, due: due ? due.toISOString() : null, bucket: due && now > due ? 'late' : 'today' };
  };
  if (proposal && proposal.status === 'draft' && OPEN_STAGES.includes(lead.status)) {
    const step = within24(asDate(proposal.created_at) || since, 'send_proposal');
    const pending = proposal.pending_price ?? Boolean(pendingPriceOf(proposal.options));
    return pending ? { ...step, pending_price: true } : step;
  }
  if (lead.status === 'new') return within24(asDate(lead.created_at), 'reply');
  if (lead.status === 'diagnosed') return within24(since, 'send_proposal');
  if (lead.status === 'proposal' && proposal && proposal.sent_on) {
    if (effectiveStatus(proposal, today) === 'expired') return { kind: 'expired', due: proposal.expires_on, bucket: 'late' };
    const next = proposal.next_follow_up_on;
    if (next) {
      const step = followUpDays[Number(proposal.follow_ups_done) || 0] ?? null;
      const bucket = next < today ? 'late' : next === today ? 'today' : 'week';
      return { kind: 'follow_up', due: next, step, bucket };
    }
    return { kind: 'waiting', due: proposal.expires_on, bucket: 'week' };
  }
  return { kind: 'none', days: daysIn, bucket: 'week' };
}

/**
 * Todos los contactos en curso (nuevo, contactado, diagnóstico hecho, propuesta enviada) con su
 * propuesta viva (la enviada más reciente; si no, la caducada; si no, el borrador) y su siguiente
 * paso. Son decenas: se traen todos, sin páginas. deps: { connect?, now? }
 */
export async function pipelineLeads(deps = {}) {
  const now = deps.now || new Date();
  const today = houstonDate(now);
  return withConn(deps, async (q) => {
    const rules = await loadRules(q);
    const r = await q(
      `SELECT l.ref_id, l.status, l.source, l.name, l.email, l.phone, l.business_name, l.interest, l.message,
              l.created_at, l.updated_at, l.stage_changed_at,
              p.ref_id AS p_ref, p.status AS p_status, p.options AS p_options, p.recommended_option AS p_rec,
              to_char(p.expires_on, 'YYYY-MM-DD') AS p_expires_on,
              to_char(p.next_follow_up_on, 'YYYY-MM-DD') AS p_next, p.follow_ups_done AS p_done,
              to_char(p.sent_at AT TIME ZONE 'America/Chicago', 'YYYY-MM-DD') AS p_sent_on, p.created_at AS p_created_at
         FROM leads l
         LEFT JOIN LATERAL (
           SELECT * FROM proposals pr
            WHERE pr.lead_ref = l.ref_id AND pr.status IN ('sent', 'expired', 'draft')
            ORDER BY CASE pr.status WHEN 'sent' THEN 0 WHEN 'expired' THEN 1 ELSE 2 END, pr.created_at DESC
            LIMIT 1) p ON TRUE
        WHERE l.status IN ('new', 'contacted', 'diagnosed', 'proposal')
        ORDER BY l.created_at DESC
        LIMIT 500`,
      []);
    return r.rows.map((row) => {
      let proposal = null;
      if (row.p_ref) {
        const opts = Array.isArray(row.p_options) ? row.p_options : [];
        const pick = opts[row.p_rec ?? 0] || opts[0] || {};
        proposal = {
          ref_id: row.p_ref, status: row.p_status, options: opts.length,
          project_cents: Number(pick.project_cents || 0), monthly_cents: Number(pick.monthly_cents || 0),
          ...(pick.pending ? { from_price: true } : {}),
          ...(pendingPriceOf(opts) ? { pending_price: true } : {}),
          expires_on: row.p_expires_on, next_follow_up_on: row.p_next, follow_ups_done: Number(row.p_done || 0),
          sent_on: row.p_sent_on, created_at: row.p_created_at,
        };
        proposal.effective_status = effectiveStatus(proposal, today);
      }
      const lead = {
        ref_id: row.ref_id, status: row.status, source: row.source, name: row.name, email: row.email,
        phone: row.phone, business_name: row.business_name, interest: row.interest, message: row.message,
        created_at: row.created_at, updated_at: row.updated_at, stage_changed_at: row.stage_changed_at,
      };
      return { ...lead, proposal, next: nextStep(lead, proposal, { now, followUpDays: rules.followUpDays }) };
    });
  });
}

/**
 * El catálogo como lo necesita el diálogo «Nueva propuesta» de Orbit (pura): planes con su
 * mensual y proyectos con su precio interno y su mínimo, en centavos. Solo para el panel,
 * detrás de la sesión del dueño; nunca sale a la web pública.
 */
export function catalogForOrbit(catalog) {
  const planes = Object.entries(catalog?.planes || {})
    .filter(([, p]) => Number.isFinite(p.mensual))
    .sort(([, a], [, b]) => (a.nivel || 0) - (b.nivel || 0))
    .map(([id, p]) => ({ id, name: p.nombre || id, monthly_cents: Math.round(p.mensual * 100), en_propuestas: p.enPropuestas !== false, recomendado: !!p.recomendado }));
  const proyectos = Object.keys(catalog?.proyectos || {})
    .map((id) => projectPricing(catalog, id))
    .filter(Boolean)
    .map((p) => ({ id: p.id, name: p.name, cents: p.list_cents, floor_cents: p.floor_cents, monthly_cents: p.monthly_cents, from_price: p.from_price }));
  return { version: catalog?.version || null, planes, proyectos };
}

/** Lee el catálogo privado y lo prepara para Orbit. 503 si no está cargado. */
export async function orbitCatalog(deps = {}) {
  return withConn(deps, async (q) => catalogForOrbit((await loadCatalog(q)).body));
}
