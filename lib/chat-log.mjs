// ════════════════════════════════════════════════════════════════
//  lib/chat-log.mjs — Conversaciones de Marcy para Orbit (migración 018)
//  ────────────────────────────────────────────────────────────────
//  Escritura (desde el chat y los formularios, nunca bloquea al visitante):
//    recordTurn   guarda un turno y suma a su conversación.
//    linkLead     anota en la conversación el lead que dejó (LEAD/MRC) o el
//                 paso a una persona (handoff).
//  Lectura (Orbit):
//    listConversations · getConversation · monthlySpend
//  Criterio (puro, se prueba sin base): deriveOutcome · failurePoint.
//  Limpieza: purgeOldConversations (12 meses sin actividad).
//
//  Si las tablas no existen todavía, la escritura deja UN aviso en el
//  registro y sigue: el chat nunca falla por esto.
// ════════════════════════════════════════════════════════════════

const TIMEOUT_MS = 2500;
export const LIVE_MS = 2 * 60 * 1000;      // escribió hace menos de 2 min → "en vivo"
export const IDLE_MS = 30 * 60 * 1000;     // 30 min sin escribir → la conversación terminó
export const RETENTION_MONTHS = 12;
const MAX_TEXT = 4000;

let missingWarned = false;

function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms); })]).finally(() => clearTimeout(t));
}
async function getSql(sqlImpl) { return sqlImpl || (await import('@vercel/postgres')).sql; }
const clip = (s, n = MAX_TEXT) => String(s == null ? '' : s).slice(0, n);
const validSid = (sid) => typeof sid === 'string' && /^[\w-]{1,64}$/.test(sid); // mismo criterio que validSessionId del chat

function warnOnce(where, err) {
  if (missingWarned) return;
  missingWarned = true;
  console.warn(`[chat-log] no pude guardar (${where}: ${err && (err.code || err.message)}); el chat sigue`);
}

/** Guarda un turno. Nunca lanza. */
export async function recordTurn({ sid, env, lang = 'es', channel = 'web', userText, reply, action = null, tool = null, cortadas = [], fallback = false, costMicro = 0, sqlImpl } = {}) {
  if (!validSid(sid) || !reply) return false;
  try {
    const sql = await getSql(sqlImpl);
    const cost = Math.max(0, Math.round(Number(costMicro) || 0));
    await withTimeout(sql`
      INSERT INTO chat_conversations (sid, env, channel, lang, turns, cost_micro_usd)
      VALUES (${sid}, ${env}, ${channel}, ${lang}, 1, ${cost})
      ON CONFLICT (sid) DO UPDATE SET
        last_at = NOW(),
        turns = chat_conversations.turns + 1,
        cost_micro_usd = chat_conversations.cost_micro_usd + EXCLUDED.cost_micro_usd
    `, TIMEOUT_MS);
    await withTimeout(sql`
      INSERT INTO chat_turns (sid, user_text, reply, action_type, action_destino, tool, cortadas, fallback, cost_micro_usd)
      VALUES (${sid}, ${clip(userText)}, ${clip(reply)}, ${action && action.type ? clip(action.type, 20) : null},
        ${action && action.destino ? clip(action.destino, 20) : null}, ${tool ? clip(tool, 40) : null},
        ${cortadas && cortadas.length ? clip(cortadas.join(','), 200) : null}, ${!!fallback}, ${cost})
    `, TIMEOUT_MS);
    return true;
  } catch (err) { warnOnce('turno', err); return false; }
}

/** Anota el lead (o el paso a persona) en su conversación. Nunca lanza. */
export async function linkLead({ sid, ref, kind, sqlImpl } = {}) {
  if (!validSid(sid) || !['lead', 'brief', 'handoff'].includes(kind)) return false;
  try {
    const sql = await getSql(sqlImpl);
    // Un paso a persona no pisa un lead ya dejado; un lead sí sustituye a un handoff previo.
    await withTimeout(sql`
      UPDATE chat_conversations SET lead_ref = ${ref ? clip(ref, 40) : null}, lead_kind = ${kind}
      WHERE sid = ${sid} AND (${kind} <> 'handoff' OR lead_kind IS NULL)
    `, TIMEOUT_MS);
    return true;
  } catch (err) { warnOnce('lead', err); return false; }
}

// ── Criterio (puro) ──

/**
 * Resultado de una conversación.
 * en_vivo · abierta · cerrada · transferida · no_cerrada · abandonada
 */
export function deriveOutcome(conv, now = Date.now()) {
  if (!conv) return null;
  if (conv.lead_kind === 'lead' || conv.lead_kind === 'brief') return 'cerrada';
  if (conv.lead_kind === 'handoff') return 'transferida';
  const idle = now - new Date(conv.last_at).getTime();
  if (idle < LIVE_MS) return 'en_vivo';
  if (idle < IDLE_MS) return 'abierta';
  return conv.turns <= 2 ? 'abandonada' : 'no_cerrada';
}

const MONEY_RX = /\$\s?\d/;

/**
 * Dónde falló una conversación que no cerró: el turno y el motivo.
 * Primero un fallo nuestro (error o cifra cortada); si no hubo, el último
 * paso antes de irse. null si cerró, sigue abierta o no hay turnos.
 */
export function failurePoint(outcome, turns = []) {
  if (!['no_cerrada', 'abandonada'].includes(outcome) || !turns.length) return null;
  const fallo = turns.findIndex((t) => t.fallback || t.cortadas);
  if (fallo >= 0) return { turno: fallo + 1, motivo: turns[fallo].cortadas ? 'cifra_cortada' : 'error_de_marcy' };
  const i = turns.length - 1;
  const t = turns[i];
  let motivo = 'se_fue_tras_respuesta';
  if (t.action_type === 'capture') motivo = 'no_dejo_contacto';
  else if (t.tool === 'revisar_sitio') motivo = 'se_fue_tras_revisar_web';
  else if (t.tool === 'cotizar' || MONEY_RX.test(t.reply || '')) motivo = 'se_fue_tras_precio';
  else if (i === 0) motivo = 'se_fue_tras_saludo';
  return { turno: i + 1, motivo };
}

// ── Lectura (Orbit) ──

const ENV = () => (process.env.VERCEL_ENV || 'development');

// Resumen por conversación para la lista y el embudo (una fila por conversación).
// Los textos de los turnos no viajan aquí salvo el primero (título) y el último.
function listQuery(sql, { env, since, lim }) {
  return sql`
    SELECT c.sid, c.channel, c.lang, c.started_at, c.last_at, c.turns, c.cost_micro_usd, c.lead_ref, c.lead_kind,
      bool_or(t.tool = 'cotizar' OR t.reply ~ '[$][[:space:]]?[0-9]') AS precio,
      bool_or(t.tool = 'revisar_sitio') AS revision,
      bool_or(t.action_type = 'capture') AS pidio_contacto,
      (array_agg(CASE WHEN t.cortadas IS NOT NULL THEN 'cifra' WHEN t.fallback THEN 'error' END ORDER BY t.id)
        FILTER (WHERE t.fallback OR t.cortadas IS NOT NULL))[1] AS primer_fallo,
      (array_agg(t.id ORDER BY t.id) FILTER (WHERE t.fallback OR t.cortadas IS NOT NULL))[1] AS primer_fallo_id,
      (array_agg(t.id ORDER BY t.id))[1] AS primer_id,
      (array_agg(t.action_type ORDER BY t.id DESC))[1] AS last_action,
      (array_agg(t.tool ORDER BY t.id DESC))[1] AS last_tool,
      (array_agg(left(t.reply, 300) ORDER BY t.id DESC))[1] AS last_reply,
      (array_agg(left(t.user_text, 200) ORDER BY t.id))[1] AS first_user
    FROM chat_conversations c JOIN chat_turns t ON t.sid = c.sid
    WHERE c.env = ${env} AND c.last_at >= ${since}
    GROUP BY c.sid
    ORDER BY c.last_at DESC
    LIMIT ${lim}
  `;
}

/** Fila de la consulta → resultado, motivo de fallo y pasos del embudo (puro). */
export function summarize(r, now = Date.now()) {
  const outcome = deriveOutcome(r, now);
  let fallo = null;
  if (['no_cerrada', 'abandonada'].includes(outcome)) {
    if (r.primer_fallo) {
      fallo = { turno: Number(r.primer_fallo_id) - Number(r.primer_id) + 1, motivo: r.primer_fallo === 'cifra' ? 'cifra_cortada' : 'error_de_marcy' };
    } else {
      const fake = Array.from({ length: Math.max(1, r.turns) }, () => ({ reply: '' }));
      fake[fake.length - 1] = { action_type: r.last_action, tool: r.last_tool, reply: r.last_reply || '' };
      fallo = failurePoint(outcome, fake);
    }
  }
  return {
    sid: r.sid, channel: r.channel, lang: r.lang, started_at: r.started_at, last_at: r.last_at,
    turns: r.turns, cost_micro_usd: Number(r.cost_micro_usd) || 0, lead_ref: r.lead_ref, lead_kind: r.lead_kind,
    first_user: r.first_user, last_reply: r.last_reply,
    pasos: { precio: !!r.precio, revision: !!r.revision, pidio_contacto: !!r.pidio_contacto },
    outcome, fallo,
  };
}

/** Embudo del periodo a partir de las conversaciones resumidas (puro). */
export function funnel(items) {
  const f = { conversaciones: items.length, precio: 0, pidio_contacto: 0, dejaron_contacto: 0, pasadas: 0, motivos: {} };
  for (const c of items) {
    if (c.pasos.precio) f.precio++;
    if (c.pasos.pidio_contacto) f.pidio_contacto++;
    if (c.outcome === 'cerrada') f.dejaron_contacto++;
    if (c.outcome === 'transferida') f.pasadas++;
    if (c.fallo) f.motivos[c.fallo.motivo] = (f.motivos[c.fallo.motivo] || 0) + 1;
  }
  return f;
}

/** Lista de conversaciones recientes con su resultado y dónde falló. */
export async function listConversations({ limit = 50, env = ENV(), days = 30, sqlImpl, now = Date.now() } = {}) {
  const sql = await getSql(sqlImpl);
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const d = Math.min(Math.max(parseInt(days, 10) || 30, 1), 400);
  const since = new Date(now - d * 86400000).toISOString();
  const { rows } = await listQuery(sql, { env, since, lim });
  return rows.map((r) => summarize(r, now));
}

/** Embudo del mes en curso (hora UTC). */
export async function monthFunnel({ env = ENV(), sqlImpl, now = Date.now() } = {}) {
  const sql = await getSql(sqlImpl);
  const d = new Date(now);
  const since = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
  const { rows } = await listQuery(sql, { env, since, lim: 5000 });
  return { mes: since.slice(0, 7), ...funnel(rows.map((r) => summarize(r, now))) };
}

/** Una conversación completa con sus turnos, resultado y dónde falló. */
export async function getConversation(sid, { sqlImpl, now = Date.now() } = {}) {
  if (!validSid(sid)) return null;
  const sql = await getSql(sqlImpl);
  const c = await sql`SELECT * FROM chat_conversations WHERE sid = ${sid}`;
  if (!c.rows.length) return null;
  const t = await sql`
    SELECT id, created_at, user_text, reply, action_type, action_destino, tool, cortadas, fallback, cost_micro_usd
    FROM chat_turns WHERE sid = ${sid} ORDER BY id ASC
  `;
  const conv = c.rows[0];
  const outcome = deriveOutcome(conv, now);
  return { ...conv, outcome, fallo: failurePoint(outcome, t.rows), turnos: t.rows };
}

/** Gasto del mes (hora UTC, como chat_usage_daily) frente al tope, si hay. */
export async function monthlySpend({ env = ENV(), sqlImpl, now = Date.now() } = {}) {
  const sql = await getSql(sqlImpl);
  const month = new Date(now).toISOString().slice(0, 7);
  const { rows } = await sql`
    SELECT COALESCE(SUM(cost_micro_usd), 0)::bigint AS micro, COALESCE(SUM(turns), 0)::int AS turns,
      COALESCE(SUM(conversations), 0)::int AS conversations
    FROM chat_usage_daily WHERE env = ${env} AND to_char(day, 'YYYY-MM') = ${month}
  `;
  const days = await sql`
    SELECT to_char(day, 'YYYY-MM-DD') AS dia, SUM(cost_micro_usd)::bigint AS micro
    FROM chat_usage_daily WHERE env = ${env} AND to_char(day, 'YYYY-MM') = ${month}
    GROUP BY day ORDER BY day
  `;
  // Por canal (WhatsApp, Instagram, teléfono): coste guardado en cada conversación del mes,
  // que en el teléfono incluye los minutos estimados de Twilio.
  let porCanal = [];
  try {
    const c = await sql`SELECT channel, COUNT(*)::int AS n, COALESCE(SUM(cost_micro_usd), 0)::bigint AS micro FROM chat_conversations
      WHERE env = ${env} AND to_char(started_at, 'YYYY-MM') = ${month} GROUP BY channel ORDER BY micro DESC`;
    porCanal = c.rows.map((r) => ({ canal: r.channel, conversaciones: r.n, usd: Math.round(Number(r.micro) / 1e4) / 100 }));
  } catch { porCanal = []; }
  const capTel = Number(process.env.VOICE_MONTHLY_CAP_USD);
  const cap = Number(process.env.MARCY_MONTHLY_CAP_USD);
  const usd = Number(rows[0].micro) / 1e6;
  return {
    mes: month,
    usd: Math.round(usd * 100) / 100,
    turnos: rows[0].turns,
    conversaciones: rows[0].conversations,
    tope_usd: Number.isFinite(cap) && cap > 0 ? cap : null,
    por_dia: days.rows.map((d) => ({ dia: d.dia, usd: Math.round(Number(d.micro) / 1e4) / 100 })),
    por_canal: porCanal,
    tope_telefono_usd: Number.isFinite(capTel) && capTel > 0 ? capTel : 50,
    fuente: 'registro propio del chat (precios oficiales por token)',
  };
}

/** Borra las conversaciones sin actividad en 12 meses (sus turnos caen en cascada). */
export async function purgeOldConversations({ sqlImpl } = {}) {
  const sql = await getSql(sqlImpl);
  const r = await sql`DELETE FROM chat_conversations WHERE last_at < NOW() - make_interval(months => ${RETENTION_MONTHS})`;
  return r.rowCount || 0;
}
