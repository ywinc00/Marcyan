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
//   · La PII (nombre/email/teléfono) NUNCA llega aquí: se captura en el cliente
//     y se postea a /api/contact. Al modelo solo puede llegar una línea de
//     banderas booleanas (contacto_ya_dado: si/no), jamás los valores.
//   · Única tool = SOLO-UI (solicitar_datos_contacto): sin tool_result ni 2ª
//     llamada → no muta estado ni abre canal de exfiltración de PII.
//   · La API key vive en process.env.ANTHROPIC_API_KEY (solo servidor).
//   · CERO acceso a Postgres / briefs / admin / Resend. NO importamos
//     lib/auth.mjs (arrastra @vercel/postgres) → clientIp propio abajo.
//   · El tope de costo REAL es el límite de gasto mensual en la consola
//     de Anthropic. El rate-limit en memoria es solo la primera línea.
// ════════════════════════════════════════════════════════════════
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, LIMITS, MESSAGES, brandPostFilter, pricePostFilter, CONTACT_TOOL, CHANNELS_TOOL, LINK_TOOL, CHAT_TOOLS, LINK_PAGES, INTERNAL_TOOLS, CALC_TOOL, SITE_TOOL } from '../lib/chat-kb.mjs';
import { computeMissedCalls, computeNoShows } from '../lib/tools-formulas.mjs';
// SSRF + descarga endurecida (SIN Postgres) y motor determinista del diagnóstico.
// ⚠️ NUNCA importar api/diagnostic.mjs desde aquí (arrastra @vercel/postgres y rompe
// la doctrina cero-Postgres del chat). Solo estos dos módulos puros.
import { ssrfGuard, fetchSite } from '../lib/site-fetch.mjs';
import { analyzeSite, recommendService } from '../lib/diagnostic-checks.mjs';

// maxDuration 60: un turno con herramienta interna hace 2 llamadas al modelo con
// una revisión de sitio en medio (llamada1 ≤10s · fetch ≤6s · llamada2 ≤14s).
export const config = { maxDuration: 60 };

// Modelo por defecto: Sonnet 5 (más capaz y mejor cerrando, precio de intro).
// Exportados para que el guard test bloquee el id y la allowlist (control de costo).
export const DEFAULT_MODEL = 'claude-sonnet-5';
// Allowlist de modelos: evita que un env mal puesto dispare un modelo caro por error.
// Se conservan los anteriores para poder revertir vía CHAT_MODEL sin desplegar.
export const ALLOWED_MODELS = new Set(['claude-haiku-4-5', 'claude-sonnet-4-6', 'claude-sonnet-5']);

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

// ── Límites de revisar_sitio (tool interna con efecto de red) ──────
// 1 revisión por SESIÓN + 5 / 10min por IP. Se CONSUME el cupo aunque la URL
// resulte bloqueada por SSRF (limita el sondeo de IPs internas en una sesión).
const SITE_SESSION = new Map(); // sid → ts (ya revisó)
const SITE_IP = new Map();      // ip  → [ts]
export function siteReviewAllowed(sid, ip) {
  const now = Date.now();
  if (sid && SITE_SESSION.has(sid)) return false;      // 1 por sesión
  if (ip) {
    const arr = (SITE_IP.get(ip) || []).filter((t) => now - t < 600_000); // 10 min
    if (arr.length >= 5) { SITE_IP.set(ip, arr); return false; }
    arr.push(now); SITE_IP.set(ip, arr);
  }
  if (sid) SITE_SESSION.set(sid, now);
  return true;
}

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
  if (SITE_SESSION.size > 5000) SITE_SESSION.clear();
  if (SITE_IP.size > 5000) { for (const [k, v] of SITE_IP) if (!v.some((t) => now - t < 600_000)) SITE_IP.delete(k); }
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

// Herramientas de SOLO-UI que reconocemos (una acción por turno; default seguro).
const OUR_TOOLS = new Set([CONTACT_TOOL.name, CHANNELS_TOOL.name, LINK_TOOL.name]);

// Sanea el nombre de pila que el modelo pasa para PRE-RELLENAR el formulario. El
// nombre ya está en la conversación que el modelo ve (lo escribió el visitante), así
// que no expone PII nueva; el email/teléfono NUNCA vienen por aquí. Deja solo letras/
// espacios/.'- (sin dígitos, sin <>@, sin control chars) y lo limita a 40 chars. El
// widget lo pinta con .value/textContent (no innerHTML) → sin riesgo de XSS.
function sanitizeName(v) {
  if (typeof v !== 'string') return '';
  return v.replace(/[^\p{L}\p{M} .'’-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

// Sanea los campos de TEXTO que el modelo pasa (nota/negocio/ciudad/objetivo/…). NO son
// PII sensible (info del negocio, disponibilidad), pero como DEFENSA quitamos cualquier
// email o secuencia telefónica: la PII de contacto SOLO entra por la cajita del cliente,
// jamás por el modelo. Quita control chars y limita la longitud. El widget los pinta con
// .value/.textContent (sin innerHTML) → sin XSS.
function sanitizeField(v, max = 400) {
  if (typeof v !== 'string') return '';
  return stripControl(v)
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, ' ')       // fuera emails
    .replace(/\+?\d[\d\s().\-]{6,}\d/g, ' ')          // fuera secuencias telefónicas
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// Texto de respaldo cuando el modelo solo llama una herramienta sin texto.
function toolOnlyFallback(action, lang) {
  const en = lang === 'en';
  if (action.type === 'capture') {
    // Neutro a propósito: la cajita ya viene PRE-RELLENADA con lo que el visitante
    // dio, así que no listamos campos. Mensaje según el destino.
    if (action.destino === 'proyecto') {
      return en
        ? 'Perfect — confirm your contact below and we’ll put your custom proposal together. 🚀'
        : 'Perfecto. Confírmame tu contacto aquí abajo y te armamos la propuesta a la medida. 🚀';
    }
    return en
      ? 'Perfect — just fill in whatever’s missing below and we’ll get it going. 🚀'
      : 'Perfecto. Completa aquí abajo lo que falte y lo dejamos en marcha. 🚀';
  }
  if (action.type === 'channels') {
    return en ? 'Here are the ways to reach us directly. 👇' : 'Aquí tienes las formas de escribirnos directo. 👇';
  }
  return en ? 'Here’s the link. 👇' : 'Aquí te dejo el enlace. 👇';
}

// Extrae { text, action } de la respuesta de Anthropic (con o sin tool_use).
// Pura y testeable. text=null si no hubo texto ni tool (el caller usa fallback).
// Un solo turno: NO se envía tool_result ni hay 2ª llamada. Toma el PRIMER tool_use
// de una de NUESTRAS herramientas (Marcy usa como máximo una por mensaje).
export function parseToolResponse(content, lang = 'es') {
  const blocks = Array.isArray(content) ? content : [];
  let text = blocks.filter((b) => b && b.type === 'text').map((b) => b.text).join('').trim();
  // El prompt pide una herramienta por turno, pero si el modelo emitiera varias, la
  // CAPTURA (cierre) manda; si no, la primera reconocida. Así nunca se pierde el form.
  const toolUses = blocks.filter((b) => b && b.type === 'tool_use' && OUR_TOOLS.has(b.name));
  const tool = toolUses.find((b) => b.name === CONTACT_TOOL.name) || toolUses[0] || null;
  let action = null;
  if (tool) {
    if (tool.name === CONTACT_TOOL.name) {
      const inp = tool.input || {};
      const destino = inp.destino === 'proyecto' ? 'proyecto' : 'contacto'; // allowlist, default seguro
      const name = sanitizeName(inp.nombre); // prellenado robusto (nombre de pila)
      // El modelo RAZONA sobre la conversación y rellena el brief de proyecto; aquí
      // saneamos cada campo (sanitizeField quita emails/teléfonos → PII solo por la cajita).
      const extras = {
        nota: sanitizeField(inp.nota),
        negocio: sanitizeField(inp.negocio, 200),
        rubro: sanitizeField(inp.rubro, 120),
        descripcion: sanitizeField(inp.descripcion, 500),
        ciudad: sanitizeField(inp.ciudad, 120),
        web_actual: sanitizeField(inp.web_actual, 200),
        tipo_sitio: sanitizeField(inp.tipo_sitio, 160),
        audiencia: sanitizeField(inp.audiencia, 300),
        objetivo: sanitizeField(inp.objetivo, 400),
        presupuesto: sanitizeField(inp.presupuesto, 120),
        plazo: sanitizeField(inp.plazo, 120),
        idioma: sanitizeField(inp.idioma, 60),
        detalles: sanitizeField(inp.detalles, 800),
      };
      action = { type: 'capture', destino, extras };
      if (name) action.name = name;
    } else if (tool.name === CHANNELS_TOOL.name) {
      action = { type: 'channels' };
    } else if (tool.name === LINK_TOOL.name) {
      const pagina = tool.input && tool.input.pagina;
      if (LINK_PAGES.has(pagina)) action = { type: 'link', page: pagina }; // fuera del allowlist → sin acción
    }
  }
  if (!text && action) text = toolOnlyFallback(action, lang);
  return { text: text || null, action };
}

const withTimeout = (p, ms, label) =>
  Promise.race([
    p,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)),
  ]);

// ── Herramientas INTERNAS (tool_result computado por el SERVIDOR) ──────────
// tool_result estándar: siempre string. FAIL = degradación silenciosa (no revela
// el motivo del bloqueo). `extraAllow` son las cifras que el servidor computó en
// ESTE request, normalizadas (solo dígitos) para el allowlist dinámico del filtro.
const FAIL_RESULT = { content: JSON.stringify({ ok: false }), extraAllow: [] };

// calcular_perdida — puro y testeable. Los números van a las fórmulas de la fuente
// única (clamp interno defensivo). NUNCA pasan por sanitizeField (borraría dígitos).
// Gate: si falta modo, o los 2 números ESENCIALES del modo (volumen + valor) no son
// positivos y finitos, NO computa (ok:false) — evita citar "$0" o computar basura.
const isPos = (v) => Number.isFinite(Number(v)) && Number(v) > 0;
export function computeLossToolResult(input) {
  const inp = input || {};
  if (inp.modo === 'llamadas' && isPos(inp.llamadas_semana) && isPos(inp.ticket)) {
    const { monthly, yearly } = computeMissedCalls(inp);
    return { content: JSON.stringify({ ok: true, modo: 'llamadas', perdida_mensual: monthly, perdida_anual: yearly }), extraAllow: [String(monthly), String(yearly)] };
  }
  if (inp.modo === 'citas' && isPos(inp.citas_semana) && isPos(inp.valor_cita)) {
    const { monthly, yearly } = computeNoShows(inp);
    return { content: JSON.stringify({ ok: true, modo: 'citas', perdida_mensual: monthly, perdida_anual: yearly }), extraAllow: [String(monthly), String(yearly)] };
  }
  return FAIL_RESULT; // modo ausente/inválido o faltan los números esenciales → no computa
}

// revisar_sitio — tool_result SOLO con enteros + labels de NUESTRO catálogo
// (lib/diagnostic-checks.mjs). REGLA DE ORO: JAMÁS title/meta/texto del sitio ajeno.
// Puro y testeable (recibe el output ya calculado de analyzeSite).
export function buildSiteToolResult({ scores, findings }, lang = 'es') {
  const en = lang === 'en';
  const rec = recommendService({ scores });
  return JSON.stringify({
    ok: true,
    scores: { total: scores.total, web: scores.web, seo: scores.seo, ai: scores.ai, conv: scores.conv, rep: scores.rep },
    hallazgos: (findings || []).slice(0, 5).map((f) => ({ id: f.id, texto: en ? f.en : f.es, impacto: en ? f.impact_en : f.impact_es })),
    recomendado: en ? rec.service_en : rec.service_es,
  });
}

// Descarga + analiza el sitio (SSRF-safe). El network se acota con withTimeout.
async function reviewSite(url, lang) {
  const g = await ssrfGuard(url);
  if (!g.ok) return FAIL_RESULT; // bloqueada (IP privada/host interno/esquema) → sin revelar motivo
  const site = await fetchSite(g.url, { timeoutMs: 6000, maxBytes: 300_000, maxRedirects: 2 });
  const hasSite = !!(site && site.ok && site.html && site.html.length > 0);
  if (!hasSite) return FAIL_RESULT;
  const { scores, findings } = analyzeSite({ html: site.html, https: !!site.https, hasSite: true });
  return { content: buildSiteToolResult({ scores, findings }, lang), extraAllow: [] };
}

// Ejecuta la tool interna pedida y devuelve { content, extraAllow }. Solo UNA por
// request (cap 1 iteración): la llama el handler con el primer tool_use interno.
async function runInternalTool(toolUse, { lang, ip, sid }) {
  if (toolUse.name === CALC_TOOL.name) return computeLossToolResult(toolUse.input || {});
  if (toolUse.name === SITE_TOOL.name) {
    if (!siteReviewAllowed(sid, ip)) return FAIL_RESULT;            // límites primero
    const url = toolUse.input && typeof toolUse.input.url === 'string' ? toolUse.input.url : '';
    if (!url) return FAIL_RESULT;
    try { return await withTimeout(reviewSite(url, lang), 7000, 'site review'); }
    catch { return FAIL_RESULT; }                                   // timeout/error → silencioso
  }
  return FAIL_RESULT;
}

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

    // Parámetros comunes a las 2 llamadas (mismo prefijo system+tools → cache-friendly).
    const baseParams = {
      model,
      max_tokens: LIMITS.MAX_TOKENS,
      // Bloque estable (instrucciones + KB) → cache de prompt + a prueba de inyección.
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      // SOLO-UI (captura, canales, enlazar) + INTERNAS (calcular_perdida, revisar_sitio).
      // tool_choice = auto (omitido) → el modelo decide cuándo.
      tools: CHAT_TOOLS,
      // Sonnet 5 activa "thinking" adaptativo por defecto; lo DESACTIVAMOS para latencia
      // baja y costo/comportamiento predecibles. SIN temperature/top_p → Sonnet 5 los rechaza.
      thinking: { type: 'disabled' },
    };

    // 1ª llamada (≤10s). El input del usuario vive SOLO en `messages`.
    const r1 = await withTimeout(
      client.messages.create({ ...baseParams, messages }),
      10000,
      'anthropic'
    );

    let finalResp = r1;
    let extraAllow = [];

    // ¿Pidió una herramienta INTERNA (cómputo/revisión)? Ejecútala server-side y haz UNA
    // 2ª llamada (cap 1 iteración). El visitante no ve estas tools ni sus resultados.
    const toolUses = (Array.isArray(r1.content) ? r1.content : []).filter((b) => b && b.type === 'tool_use');
    const internal = toolUses.find((b) => INTERNAL_TOOLS.has(b.name));
    if (internal) {
      const out = await runInternalTool(internal, { lang, ip, sid });
      extraAllow = out.extraAllow || [];
      // La API exige un tool_result por CADA tool_use del turno 1. Solo el interno
      // ejecutado lleva resultado real; cualquier otra tool del mismo turno (raro, contra
      // el prompt) lleva un stub ok:false — no se ejecuta (cap 1 iteración).
      const toolResults = toolUses.map((b) => ({
        type: 'tool_result',
        tool_use_id: b.id,
        content: b.id === internal.id ? out.content : JSON.stringify({ ok: false }),
      }));
      // 2ª llamada (≤14s): mismo prefijo system+tools; el modelo redacta con el resultado.
      finalResp = await withTimeout(
        client.messages.create({
          ...baseParams,
          messages: [
            ...messages,
            { role: 'assistant', content: r1.content },
            { role: 'user', content: toolResults },
          ],
        }),
        14000,
        'anthropic2'
      );
    }

    // Texto + tool_use de SOLO-UI de la respuesta final. Una tool de CÓMPUTO en la 2ª
    // respuesta se IGNORA (parseToolResponse solo reconoce las SOLO-UI) → cap 1 iteración.
    const { text, action } = parseToolResponse(finalResp.content, lang);
    let reply = brandPostFilter(text || M.fallback, lang);   // honestidad de marca
    reply = pricePostFilter(reply, lang, extraAllow);          // cifras fuera del allowlist (+ las computadas)
    return res.status(200).json(action ? { reply, action } : { reply });
  } catch (err) {
    // Nunca filtrar el error del SDK al cliente; detalle solo en logs del servidor.
    console.error('[chat] anthropic error:', err && err.message);
    return res.status(200).json({ reply: M.fallback });
  }
}
