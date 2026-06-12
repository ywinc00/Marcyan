// ════════════════════════════════════════════════════════════════
//  POST /api/chat — Chatbot v0 (asistente informativo, blindado)
//  ────────────────────────────────────────────────────────────────
//  Recibe { messages, sessionId, lang } del widget. Valida TODO en el
//  servidor, aplica rate-limit + caps, y llama a la API de Anthropic
//  (Claude) server-side con un system prompt endurecido + la KB pública.
//  Devuelve { reply }.
//
//  SEGURIDAD (el servidor enforce; el modelo NO decide seguridad):
//   · El input del usuario vive SOLO en `messages` (data), nunca en system.
//   · Sin tools → sin mutación de estado ni canal de exfiltración.
//   · La API key vive en process.env.ANTHROPIC_API_KEY (solo servidor).
//   · CERO acceso a Postgres / briefs / admin / Resend. NO importamos
//     lib/auth.mjs (arrastra @vercel/postgres) → clientIp propio abajo.
//   · El tope de costo REAL es el límite de gasto mensual en la consola
//     de Anthropic. El rate-limit en memoria es solo la primera línea.
// ════════════════════════════════════════════════════════════════
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, LIMITS, MESSAGES, brandPostFilter, pricePostFilter, CONTACT_TOOL } from '../lib/chat-kb.mjs';

// Da hasta 30s a la función (Haiku responde en 1-3s; headroom para reintentos).
export const config = { maxDuration: 30 };

const DEFAULT_MODEL = 'claude-sonnet-4-6';
// Allowlist de modelos: evita que un env mal puesto dispare un modelo caro por error.
const ALLOWED_MODELS = new Set(['claude-haiku-4-5', 'claude-sonnet-4-6']);

// Quita control chars C0 del input. Conserva TAB (9) y LF (10); descarta el
// resto (< 32) y DEL (127). Hecho con codePointAt para no meter bytes de
// control en este archivo fuente.
function stripControl(s) {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code === 9 || code === 10 || (code >= 32 && code !== 127)) out += ch;
  }
  return out;
}

// ── clientIp propio (NO importar lib/auth.mjs → evita acoplar Postgres) ──
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || null;
}

// ── Rate limit en memoria (mismo patrón que api/admin/login.mjs) ──
// Caveat conocido: per-instancia y se reinicia en cold start. Es la
// primera línea contra abuso casual; el costo lo acota el límite de
// gasto de Anthropic + los caps por petición de abajo.
const IP_HITS = new Map();      // ip  → { count, resetAt }
const SESSION_HITS = new Map(); // sid → { count }

function rateLimit(ip, sid) {
  const now = Date.now();
  // Por IP: ventana deslizante simple.
  if (ip) {
    const slot = IP_HITS.get(ip);
    if (!slot || slot.resetAt < now) {
      IP_HITS.set(ip, { count: 1, resetAt: now + LIMITS.WINDOW_MS });
    } else if (slot.count >= LIMITS.IP_PER_MIN) {
      return false;
    } else {
      slot.count++;
    }
  }
  // Por sesión: tope total (no se confía como auth; solo throttling).
  const s = SESSION_HITS.get(sid);
  if (!s) {
    SESSION_HITS.set(sid, { count: 1 });
  } else if (s.count >= LIMITS.SESSION_MAX) {
    return false;
  } else {
    s.count++;
  }
  return true;
}

// Limpieza perezosa para que los Map no crezcan sin límite en una instancia caliente.
function sweep() {
  const now = Date.now();
  if (IP_HITS.size > 5000) {
    for (const [k, v] of IP_HITS) if (v.resetAt < now) IP_HITS.delete(k);
  }
  if (SESSION_HITS.size > 5000) SESSION_HITS.clear();
}

// ── Origin allowlist (fail-closed) ────────────────────────────────
// El fetch del navegador SIEMPRE manda Origin en un POST → exigirlo.
// Frena embeds de otros sitios y abuso scripteado trivial. NO es una
// defensa fuerte (un curl puede falsificar el header), pero sube el listón.
function allowedOrigins() {
  const env = (process.env.CHAT_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (env.length) return env;
  // Defaults sensatos si no hay env: prod + dev local (vercel dev / astro preview).
  return [
    'https://marcyanstudio.com',
    'https://www.marcyanstudio.com',
    'http://localhost:3000',
    'http://localhost:4321',
  ];
}
function originOk(req) {
  const o = req.headers.origin;
  if (!o) return false; // fail-closed
  return allowedOrigins().includes(o);
}

// ── Idioma para los mensajes canónicos del servidor ───────────────
function pickLang(body) {
  return body && body.lang === 'en' ? 'en' : 'es';
}

// ── Validación de messages (la red más fiable: pura, por petición) ──
// Devuelve un array saneado o null si es inválido.
export function validateMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > LIMITS.MAX_MESSAGES) return null;
  const out = [];
  let total = 0;
  for (let i = 0; i < raw.length; i++) {
    const it = raw[i];
    if (!it || typeof it !== 'object') return null;
    // Rechazar cualquier rol que no sea user/assistant (¡un 'system' del cliente
    // sería un vector de inyección directo!).
    if (it.role !== 'user' && it.role !== 'assistant') return null;
    // Debe empezar en user y alternar user/assistant/user/...
    const expected = i % 2 === 0 ? 'user' : 'assistant';
    if (it.role !== expected) return null;
    if (typeof it.content !== 'string') return null;
    // Normaliza (colapsa bombas de marcas combinantes), quita control chars
    // (salvo tab y newline) y aplica el cap por mensaje.
    const c = stripControl(it.content.normalize('NFC')).slice(0, LIMITS.MAX_MSG_CHARS);
    if (!c.trim()) return null;
    total += c.length;
    out.push({ role: it.role, content: c });
  }
  if (out[out.length - 1].role !== 'user') return null; // el último turno es del usuario
  if (total > LIMITS.MAX_TOTAL_CHARS) return null;
  return out;
}

export function validSessionId(sid) {
  return typeof sid === 'string' && /^[\w-]{1,64}$/.test(sid);
}

// Extrae { text, action } de la respuesta de Anthropic (con o sin tool_use).
// Pura y testeable. text=null si no hubo texto ni tool (el caller usa fallback).
// Un solo turno: NO se envía tool_result ni hay 2ª llamada.
export function parseToolResponse(content, lang = 'es') {
  const blocks = Array.isArray(content) ? content : [];
  let text = blocks.filter((b) => b && b.type === 'text').map((b) => b.text).join('').trim();
  const toolUse = blocks.find((b) => b && b.type === 'tool_use' && b.name === CONTACT_TOOL.name);
  let action = null;
  if (toolUse) {
    const motivo = toolUse.input && toolUse.input.motivo;
    const variant = motivo === 'muestra_gratis' ? 'muestra_gratis' : 'contacto'; // allowlist, default seguro
    action = { type: 'capture', variant };
  }
  if (!text && action) {
    text = lang === 'en'
      ? 'Happy to set this up — just leave your name and the best email or phone, and the team will send it over.'
      : 'Con gusto lo preparamos — déjame tu nombre y el mejor email o teléfono, y el equipo te lo envía.';
  }
  return { text: text || null, action };
}

const withTimeout = (p, ms, label) =>
  Promise.race([
    p,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)),
  ]);

export default async function handler(req, res) {
  const lang = pickLang(typeof req.body === 'object' ? req.body : {});
  const M = MESSAGES[lang];

  // Nunca CORS abierto: este endpoint es solo same-origin.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Kill switch manual + key ausente → "no disponible" amable (sin llamar a Anthropic).
  if (process.env.CHAT_ENABLED === 'false' || !process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ reply: M.disabled });
  }

  if (!originOk(req)) {
    console.warn('[chat] blocked=origin ip=' + clientIp(req));
    return res.status(403).json({ error: M.forbidden });
  }

  const body = (typeof req.body === 'object' && req.body) ? req.body : {};
  const ip = clientIp(req);
  const sid = body.sessionId;

  if (!validSessionId(sid)) {
    return res.status(400).json({ error: M.badRequest });
  }

  sweep();
  if (!rateLimit(ip, sid)) {
    console.warn('[chat] blocked=rate ip=' + ip);
    return res.status(429).json({ error: M.rateLimited });
  }

  const messages = validateMessages(body.messages);
  if (!messages) {
    console.warn('[chat] blocked=shape ip=' + ip);
    return res.status(400).json({ error: M.badRequest });
  }

  const model = ALLOWED_MODELS.has(process.env.CHAT_MODEL) ? process.env.CHAT_MODEL : DEFAULT_MODEL;

  try {
    const client = new Anthropic({ maxRetries: 1, timeout: 20000 }); // lee ANTHROPIC_API_KEY del env

    const r = await withTimeout(
      client.messages.create({
        model,
        max_tokens: LIMITS.MAX_TOKENS,
        // Bloque estable (instrucciones + KB) → cache de prompt + a prueba de inyección.
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        // Herramienta de SOLO-UI para disparar la captura de contacto.
        // tool_choice = auto (omitido) → el modelo decide cuándo; NO enviamos
        // tool_result ni hacemos 2ª llamada: leemos el tool_use de esta respuesta.
        tools: [CONTACT_TOOL],
        // El ÚNICO lugar donde vive el input del usuario.
        messages,
        // SIN temperature/top_p/top_k/thinking → seguro en sonnet-4-6 / haiku-4-5.
      }),
      22000,
      'anthropic'
    );

    // Un solo turno: leemos texto + tool_use de ESTA respuesta (sin tool_result).
    const { text, action } = parseToolResponse(r.content, lang);
    let reply = brandPostFilter(text || M.fallback, lang); // honestidad de marca
    reply = pricePostFilter(reply, lang);                   // cifras fuera del allowlist
    return res.status(200).json(action ? { reply, action } : { reply });
  } catch (err) {
    // Nunca filtrar el error del SDK al cliente; detalle solo en logs del servidor.
    console.error('[chat] anthropic error:', err && err.message);
    return res.status(200).json({ reply: M.fallback });
  }
}
