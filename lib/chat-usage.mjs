// ════════════════════════════════════════════════════════════════
//  lib/chat-usage.mjs — Coste y caché del chat de Marcy (encargo P2, 2026-10-31)
//
//  Por qué existe: hasta hoy no se sabía cuánto cuesta una conversación ni si
//  la caché del prompt acierta. Cada turno suma el `usage` de sus 1 o 2
//  llamadas, deja UNA línea en el registro y suma sus números a una fila por
//  día, entorno y modelo (tabla chat_usage_daily, migración 017).
//
//  Doctrina del chat: aquí solo entran NÚMEROS (tokens, llamadas, coste).
//  Nada del visitante ni del modelo, ni IP, ni id de conversación. Import
//  dinámico de @vercel/postgres: el chat no carga la base hasta que escribe.
//  Si la tabla no existe o la base falla: solo la línea del registro, sin
//  romper el turno, con un tiempo máximo para no hacer esperar al visitante.
// ════════════════════════════════════════════════════════════════

// Precios en USD por millón de tokens, de la documentación oficial de Anthropic
// (platform.claude.com/docs/en/about-claude/pricing), leídos el 2026-10-31.
// Caché de 5 minutos (la que usa el chat). La salida incluye el razonamiento.
// Si cambian, se actualiza aquí: el coste ya guardado queda con el precio de su día.
export const PRICES_USD_PER_MTOK = Object.freeze({
  'claude-sonnet-5':   { input: 2, cacheWrite: 2.5,  cacheRead: 0.2, output: 10 },
  'claude-sonnet-4-6': { input: 3, cacheWrite: 3.75, cacheRead: 0.3, output: 15 },
  'claude-haiku-4-5':  { input: 1, cacheWrite: 1.25, cacheRead: 0.1, output: 5 },
});
export const PRICES_READ_ON = '2026-10-31';

const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v)) : 0);

// Suma el usage de las respuestas de un turno (la 2.ª solo si hubo herramienta).
export function sumUsage(responses = []) {
  const u = { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  for (const r of responses) {
    if (!r || typeof r !== 'object') continue;
    u.calls += 1;
    const x = r.usage || {};
    u.input += n(x.input_tokens);
    u.output += n(x.output_tokens);
    u.cacheRead += n(x.cache_read_input_tokens);
    u.cacheWrite += n(x.cache_creation_input_tokens);
  }
  return u;
}

// Coste en micro-dólares (enteros: sin errores de coma flotante al sumar en la base).
// Modelo desconocido → 0 y se nota en el registro, nunca un precio inventado.
export function turnCostMicroUsd(model, u) {
  const p = PRICES_USD_PER_MTOK[model];
  if (!p || !u) return 0;
  // tokens × USD/MTok = micro-USD (1e6 tokens × 1 USD / 1e6 = 1 USD = 1e6 micro-USD).
  return Math.round(u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite);
}

// Proporción de la entrada que se leyó de caché (0 a 1). La meta de la referencia
// de Anthropic para conversaciones repetidas es 0,9 o más.
export function cacheHitRate(u) {
  const total = (u.input || 0) + (u.cacheRead || 0) + (u.cacheWrite || 0);
  return total ? u.cacheRead / total : 0;
}

export function usageLogLine({ model, env, firstTurn, u, costMicro }) {
  return `[chat] uso modelo=${model} entorno=${env} conversacion_nueva=${firstTurn ? 'si' : 'no'} llamadas=${u.calls}`
    + ` entrada=${u.input} salida=${u.output} cache_lee=${u.cacheRead} cache_escribe=${u.cacheWrite}`
    + ` cache=${Math.round(cacheHitRate(u) * 100)}% coste_usd=${(costMicro / 1e6).toFixed(5)}`;
}

const TIMEOUT_MS = 2500;
let missingWarned = false;
function withTimeout(p, ms) {
  let t;
  return Promise.race([
    p,
    new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`chat-usage timeout (${ms}ms)`)), ms); }),
  ]).finally(() => clearTimeout(t));
}

// Día en UTC (los topes del freno también cortan a medianoche UTC).
export function usageDay(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

// Suma el turno a su fila del día. Nunca lanza. `sqlImpl` solo lo pasan las pruebas.
export async function recordUsage({ model, env, firstTurn, u, costMicro, now = Date.now(), sqlImpl } = {}) {
  if (!u || !u.calls) return false;
  try {
    const sql = sqlImpl || (await import('@vercel/postgres')).sql;
    await withTimeout(sql`
      INSERT INTO chat_usage_daily (day, env, model, turns, conversations, calls,
        input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_micro_usd)
      VALUES (${usageDay(now)}, ${env}, ${model}, 1, ${firstTurn ? 1 : 0}, ${u.calls},
        ${u.input}, ${u.output}, ${u.cacheRead}, ${u.cacheWrite}, ${costMicro})
      ON CONFLICT (day, env, model) DO UPDATE SET
        turns              = chat_usage_daily.turns + 1,
        conversations      = chat_usage_daily.conversations + EXCLUDED.conversations,
        calls              = chat_usage_daily.calls + EXCLUDED.calls,
        input_tokens       = chat_usage_daily.input_tokens + EXCLUDED.input_tokens,
        output_tokens      = chat_usage_daily.output_tokens + EXCLUDED.output_tokens,
        cache_read_tokens  = chat_usage_daily.cache_read_tokens + EXCLUDED.cache_read_tokens,
        cache_write_tokens = chat_usage_daily.cache_write_tokens + EXCLUDED.cache_write_tokens,
        cost_micro_usd     = chat_usage_daily.cost_micro_usd + EXCLUDED.cost_micro_usd
    `, TIMEOUT_MS);
    return true;
  } catch (err) {
    if (!missingWarned) {
      console.warn(`[chat-usage] no pude guardar el uso del día (${err && (err.code || err.message)}); queda solo en el registro`);
      missingWarned = true;
    }
    return false;
  }
}

// ── Resumen (lo usa scripts/chat-costes.mjs y sus pruebas) ─────────
// rows: filas de chat_usage_daily. Devuelve totales y medias por conversación.
export function summarize(rows = []) {
  const t = { days: 0, turns: 0, conversations: 0, calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costMicro: 0, byModel: {} };
  const days = new Set();
  for (const r of rows) {
    days.add(String(r.day).slice(0, 10));
    const add = {
      turns: n(r.turns), conversations: n(r.conversations), calls: n(r.calls),
      input: n(r.input_tokens), output: n(r.output_tokens),
      cacheRead: n(r.cache_read_tokens), cacheWrite: n(r.cache_write_tokens), costMicro: n(r.cost_micro_usd),
    };
    for (const k of Object.keys(add)) t[k] += add[k];
    const m = (t.byModel[r.model] ||= { turns: 0, costMicro: 0 });
    m.turns += add.turns; m.costMicro += add.costMicro;
  }
  t.days = days.size;
  t.costUsd = t.costMicro / 1e6;
  t.costPerConversationUsd = t.conversations ? t.costUsd / t.conversations : 0;
  t.costPerTurnUsd = t.turns ? t.costUsd / t.turns : 0;
  t.turnsPerConversation = t.conversations ? t.turns / t.conversations : 0;
  t.cacheHitRate = cacheHitRate(t);
  return t;
}
