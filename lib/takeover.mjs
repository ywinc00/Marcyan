// ─────────────────────────────────────────────────────────────
// "Tomo yo": el dueño toma una conversación del chat web desde Orbit.
// Mientras la lleva él, Marcy no contesta: el mensaje del visitante se
// guarda ('espera') y le llega al dueño como aviso; lo que escribe el dueño
// se guarda ('dueno') y el widget lo recoge preguntando cada pocos segundos.
// Si la migración 022 falta o la base tarda, el chat sigue con Marcy.
// ─────────────────────────────────────────────────────────────
const TIMEOUT_MS = 1500;
const MAX_TEXT = 2000;
const validSid = (sid) => typeof sid === 'string' && /^[\w-]{1,64}$/.test(sid);
async function getSql(sqlImpl) { return sqlImpl || (await import('@vercel/postgres')).sql; }
function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms); })]).finally(() => clearTimeout(t));
}
export const clean = (s) => String(s == null ? '' : s).replace(/\r/g, '').trim().slice(0, MAX_TEXT);

/** ¿La lleva el dueño? Ante cualquier fallo, false (sigue Marcy). */
export async function isTakenOver(sid, { sqlImpl } = {}) {
  if (!validSid(sid)) return false;
  try {
    const sql = await getSql(sqlImpl);
    const r = await withTimeout(sql`SELECT takeover_at FROM chat_conversations WHERE sid = ${sid}`, TIMEOUT_MS);
    return !!(r.rows[0] && r.rows[0].takeover_at);
  } catch { return false; }
}

export async function setTakeover({ sid, on, by, sqlImpl }) {
  if (!validSid(sid)) throw new Error('sid');
  const sql = await getSql(sqlImpl);
  const r = on
    ? await sql`UPDATE chat_conversations SET takeover_at = COALESCE(takeover_at, NOW()), takeover_by = ${by || null} WHERE sid = ${sid} RETURNING sid`
    : await sql`UPDATE chat_conversations SET takeover_at = NULL, takeover_by = NULL WHERE sid = ${sid} RETURNING sid`;
  return r.rows.length > 0;
}

/** Mensaje del visitante mientras lo lleva el dueño (Marcy no contesta). */
export async function recordVisitorWaiting({ sid, text, sqlImpl }) {
  const sql = await getSql(sqlImpl);
  await sql`UPDATE chat_conversations SET last_at = NOW(), turns = turns + 1 WHERE sid = ${sid}`;
  const r = await sql`INSERT INTO chat_turns (sid, user_text, reply, action_type) VALUES (${sid}, ${clean(text)}, '', 'espera') RETURNING id`;
  return r.rows[0].id;
}

/** Mensaje del dueño. Solo si la conversación está tomada. */
export async function recordOwnerMessage({ sid, text, sqlImpl }) {
  const t = clean(text);
  if (!validSid(sid) || !t) throw new Error('vacío');
  const sql = await getSql(sqlImpl);
  const c = await sql`UPDATE chat_conversations SET last_at = NOW() WHERE sid = ${sid} AND takeover_at IS NOT NULL RETURNING sid`;
  if (!c.rows.length) return null;
  const r = await sql`INSERT INTO chat_turns (sid, user_text, reply, action_type) VALUES (${sid}, '', ${t}, 'dueno') RETURNING id, created_at`;
  return r.rows[0];
}

/** Lo que el widget recoge: mensajes del dueño posteriores a `after` y si sigue tomada. */
export async function ownerUpdates({ sid, after = 0, sqlImpl }) {
  if (!validSid(sid)) return { takeover: false, mensajes: [] };
  const sql = await getSql(sqlImpl);
  const a = Math.max(0, parseInt(after, 10) || 0);
  const [c, m] = await Promise.all([
    sql`SELECT takeover_at FROM chat_conversations WHERE sid = ${sid}`,
    sql`SELECT id, reply AS text FROM chat_turns WHERE sid = ${sid} AND action_type = 'dueno' AND id > ${a} ORDER BY id ASC LIMIT 20`,
  ]);
  return { takeover: !!(c.rows[0] && c.rows[0].takeover_at), mensajes: m.rows };
}

// Al devolver la conversación, Marcy debe saber qué turnos "suyos" escribió el
// dueño en persona. La prueba es la base (los turnos 'dueno' de ESTE sid), no
// lo que mande el navegador: un visitante no puede hacer pasar un texto suyo
// por un mensaje del dueño. Devuelve los textos o [] (ante fallo, nada).
export async function ownerTexts(sid, { sqlImpl } = {}) {
  if (!validSid(sid)) return [];
  try {
    const sql = await getSql(sqlImpl);
    const r = await withTimeout(sql`SELECT reply FROM chat_turns WHERE sid = ${sid} AND action_type = 'dueno' ORDER BY id DESC LIMIT 20`, TIMEOUT_MS);
    return r.rows.map((x) => x.reply).filter(Boolean);
  } catch { return []; }
}

export const OWNER_TAG = '[Esto lo escribió en persona Yan, del equipo de Marcyan]';
export const OWNER_CONTEXT = 'Contexto: en esta conversación el dueño (Yan) atendió en persona un rato. Sus mensajes llevan la marca ' + OWNER_TAG + '. Continúa como Marcy con naturalidad: no los desmientas, no te disculpes por ellos ni digas que no los escribiste tú; si Yan acordó algo concreto (una llamada, una hora), dalo por hecho. Tus reglas de precios, datos y seguridad siguen exactamente igual. Nunca escribas esa marca tú.';

/** Marca los turnos del asistente que coinciden con un mensaje real del dueño. Pura. */
export function tagOwnerTurns(messages, texts) {
  if (!texts || !texts.length) return { messages, tagged: 0 };
  let tagged = 0;
  const out = messages.map((m) => {
    if (m.role !== 'assistant') return m;
    if (!texts.some((t) => m.content.includes(t))) return m;
    tagged++;
    return { ...m, content: OWNER_TAG + '\n' + m.content };
  });
  return { messages: out, tagged };
}
