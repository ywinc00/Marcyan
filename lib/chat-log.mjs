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

/** Lista de conversaciones recientes con su resultado. */
export async function listConversations({ limit = 50, env = ENV(), days = 30, sqlImpl, now = Date.now() } = {}) {
  const sql = await getSql(sqlImpl);
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const d = Math.min(Math.max(parseInt(days, 10) || 30, 1), 400);
  const { rows } = await sql`
    SELECT c.sid, c.channel, c.lang, c.started_at, c.last_at, c.turns, c.cost_micro_usd, c.lead_ref, c.lead_kind,
      (SELECT reply FROM chat_turns t WHERE t.sid = c.sid ORDER BY t.id DESC LIMIT 1) AS last_reply,
      (SELECT user_text FROM chat_turns t WHERE t.sid = c.sid ORDER BY t.id ASC LIMIT 1) AS first_user
    FROM chat_conversations c
    WHERE c.env = ${env} AND c.last_at > NOW() - make_interval(days => ${d})
    ORDER BY c.last_at DESC
    LIMIT ${lim}
  `;
  return rows.map((r) => ({ ...r, outcome: deriveOutcome(r, now) }));
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
  const cap = Number(process.env.MARCY_MONTHLY_CAP_USD);
  const usd = Number(rows[0].micro) / 1e6;
  return {
    mes: month,
    usd: Math.round(usd * 100) / 100,
    turnos: rows[0].turns,
    conversaciones: rows[0].conversations,
    tope_usd: Number.isFinite(cap) && cap > 0 ? cap : null,
    fuente: 'registro propio del chat (precios oficiales por token)',
  };
}

/** Borra las conversaciones sin actividad en 12 meses (sus turnos caen en cascada). */
export async function purgeOldConversations({ sqlImpl } = {}) {
  const sql = await getSql(sqlImpl);
  const r = await sql`DELETE FROM chat_conversations WHERE last_at < NOW() - make_interval(months => ${RETENTION_MONTHS})`;
  return r.rowCount || 0;
}
