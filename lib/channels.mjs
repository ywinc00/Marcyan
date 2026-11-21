// ════════════════════════════════════════════════════════════════
//  lib/channels.mjs — Marcy en WhatsApp, Instagram y teléfono (migración 023)
//  ────────────────────────────────────────────────────────────────
//  Un solo cerebro (marcyTurn de api/chat.mjs), varios canales. Cada canal
//  (api/canales/*.mjs) solo traduce: recibe el aviso del proveedor, guarda el
//  mensaje ANTES de procesarlo (channel_inbox, clave única por id del
//  proveedor: los reintentos no duplican) y llama a processInbound.
//
//  Diferencias con la web:
//   · No hay cajitas ni botones: lo que en la web es una tarjeta aquí es texto
//     (renderAction) y "dejar contacto" se resuelve con el número del propio
//     canal (WhatsApp) o pidiéndolo en texto (Instagram).
//   · Agendar va por texto con dos herramientas internas (huecos_libres y
//     reservar_llamada): el servidor da las horas, Marcy nunca las inventa.
//   · El visitante escribe datos personales en el propio mensaje: el modelo
//     los ve (decisión del dueño al aprobar omnicanal). Siguen sin entrar en
//     las herramientas: el teléfono de la cita lo pone el servidor.
//  Lo puro se prueba en scripts/test-channels.mjs.
// ════════════════════════════════════════════════════════════════
import { freeSlots, groupByDay, isBookable, slotLabel } from './appointments.mjs';

export const CHANNELS = ['whatsapp', 'instagram', 'telefono'];
export const HOUSTON_PHONE = '+1 713-823-9144';
export const SITE = 'https://marcyanstudio.com';
const HISTORY_DAYS = 7;
const MAX_TURNS_CONTEXT = 12;
const MAX_TEXT = 2000;
export const MAX_ATTEMPTS = 3;
export const PASS_NOTE = '[Pidió hablar con una persona]';

async function getSql(sqlImpl) { return sqlImpl || (await import('@vercel/postgres')).sql; }
const ENV = () => process.env.VERCEL_ENV || 'development';
const clip = (s, n = MAX_TEXT) => String(s == null ? '' : s).replace(/\r/g, '').trim().slice(0, n);

/** Id de conversación por canal y contacto (mismo formato que el widget). */
export function sidFor(channel, contact) {
  const c = String(contact || '').replace(/[^\w]/g, '').slice(0, 50);
  const p = channel === 'whatsapp' ? 'wa' : channel === 'instagram' ? 'ig' : 'tel';
  return c ? `${p}-${c}` : null;
}

/** Número de WhatsApp (solo dígitos) a formato E.164. */
export const e164 = (digits) => { const d = String(digits || '').replace(/\D/g, ''); return d ? `+${d}` : null; };

// Idioma: el de la conversación salvo que el mensaje sea claramente del otro.
const EN_WORDS = /\b(the|hi|hello|hey|how|much|what|website|need|want|price|can|you|my|is|are|thanks|please)\b/gi;
const ES_WORDS = /\b(hola|cu[aá]nto|precio|quiero|necesito|p[aá]gina|gracias|buenas|qu[eé]|c[oó]mo|mi|es|una|para|por|favor|negocio)\b/gi;
export function detectLang(text, prev = null) {
  const t = String(text || '');
  const en = (t.match(EN_WORDS) || []).length;
  const es = (t.match(ES_WORDS) || []).length + (/[ñáéíóú¿¡]/i.test(t) ? 2 : 0);
  if (en > es + 1) return 'en';
  if (es > en) return 'es';
  return prev === 'en' ? 'en' : 'es';
}

// ── Herramientas internas solo de canales de texto (agendar por texto) ──
export const SLOTS_TOOL = {
  name: 'huecos_libres',
  description: '(INTERNA: el cliente no la ve.) Devuelve las horas libres para una llamada de 30 minutos con el equipo (hora de Houston). Úsala cuando el cliente quiera hablarlo por teléfono o videollamada. Ofrece 3 o 4 horas de la lista, tal cual, y pregúntale cuál le va. Nunca digas una hora que no salió de aquí.',
  input_schema: {
    type: 'object',
    properties: {
      fecha: { type: 'string', description: 'Opcional. Día que pidió el cliente, AAAA-MM-DD en hora de Houston (mira la fecha de hoy en el contexto). Devuelve todas las horas libres de ese día.' },
    },
    additionalProperties: false,
  },
};
export const BOOK_TOOL = {
  name: 'reservar_llamada',
  description: '(INTERNA.) Reserva la llamada en la hora que el cliente ELIGIÓ de las que te dio huecos_libres. Pasa el código "at" exacto de esa hora. El contacto lo pone el sistema (no lo pidas si ya escribe por WhatsApp). Si responde ok:false, la hora ya no está libre: vuelve a ofrecer de la nueva lista.',
  input_schema: {
    type: 'object',
    properties: {
      at: { type: 'string', description: 'Código exacto de la hora elegida (el campo "at" de huecos_libres).' },
      nombre: { type: 'string', description: 'Nombre de pila del cliente, si lo dio.' },
      tema: { type: 'string', description: 'De qué quiere hablar, en pocas palabras.' },
    },
    required: ['at'],
    additionalProperties: false,
  },
};
export const TEXT_INTERNAL = new Set([SLOTS_TOOL.name, BOOK_TOOL.name]);

/** Resultado de huecos_libres (puro): las primeras horas de cada día, con su código. */
export function slotsToolResult({ now = Date.now(), taken = [], lang = 'es', max = 8, fecha = null } = {}) {
  const all = freeSlots({ now, taken });
  const want = typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null;
  const horas = [];
  if (want) {
    for (const d of groupByDay(all.filter((s) => houstonDate(s) === want), lang)) {
      for (const h of d.huecos) { if (horas.length < 24) horas.push({ at: h.at, texto: `${d.dia}, ${h.hora}` }); }
    }
  }
  if (!horas.length) {
    for (const d of groupByDay(all, lang)) {
      for (const h of d.huecos.slice(0, 3)) { if (horas.length < max) horas.push({ at: h.at, texto: `${d.dia}, ${h.hora}` }); }
    }
  }
  const out = { ok: horas.length > 0, hoy: houstonDate(now), zona: 'hora de Houston (Central)', horas };
  if (want && !horas.some((h) => houstonDate(h.at) === want)) out.nota = 'Ese día no tiene horas libres: estas son las más próximas.';
  return { content: JSON.stringify(out), extraAllow: [] };
}

/** Día en Houston, AAAA-MM-DD (puro). */
export function houstonDate(t) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
}

/** "Hoy es…" para que Marcy entienda "mañana" o "el jueves" (va detrás de la caché). */
export function dateContext(lang = 'es', now = Date.now()) {
  const d = new Date(now);
  const long = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-US', { timeZone: 'America/Chicago', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  return `Fecha de hoy en Houston: ${long} (${houstonDate(d)}).`;
}

// Contexto del canal (va detrás de la marca de caché, no rompe el prefijo).
export function channelContext(channel, lang, opts = {}) {
  return channelContextBase(channel, lang, opts) + ' ' + dateContext(lang);
}
function channelContextBase(channel, lang, { contactName = null, hasPhone = false, first = false } = {}) {
  const who = contactName ? ` Su nombre de perfil es "${clip(contactName, 60).replace(/["\n]/g, '')}" (úsalo solo si encaja, puede no ser su nombre real).` : '';
  if (channel === 'telefono') {
    return 'Canal: LLAMADA DE TELÉFONO. Lo que digas se lee en voz alta. Frases cortas (1 a 3), sin listas, sin enlaces, sin símbolos ni emojis, cifras dichas con naturalidad. Si el cliente pide hablar con una persona, usa mostrar_canales_directos: el sistema le pasa la llamada al equipo si están en horario, o te dirá que tomes el recado (nombre y motivo). Para agendar usa huecos_libres y reservar_llamada. Ya tienes su número de teléfono: no se lo pidas.' + who;
  }
  const base = channel === 'whatsapp'
    ? 'Canal: WHATSAPP. El cliente te escribe desde su WhatsApp, así que ya tienes su número: no se lo pidas.'
    : 'Canal: INSTAGRAM (mensajes directos). No tienes su teléfono ni su correo: si va a dejar su caso, pídele en texto un teléfono o correo.';
  const intro = first ? ' Es la primera vez que le escribes: el sistema ya le dice al empezar que eres Marcy, la asistente con IA de Marcyan, así que no vuelvas a presentarte; contesta directo a lo que pide.' : '';
  return base + intro + ' No hay cajitas ni botones: si llamas a solicitar_datos_contacto el sistema guarda su caso con lo que ya sabes y avisa al equipo, y tu "mensaje" es lo único que verá. Para una llamada usa huecos_libres y luego reservar_llamada (nunca el destino "cita"). Mensajes cortos, como en un chat de móvil, sin markdown (nada de asteriscos ni almohadillas).' + who + (hasPhone ? '' : '');
}

/** Historial para el modelo desde chat_turns (puro). Alterna usuario/asistente. */
export function historyFromTurns(rows, { now = Date.now(), maxTurns = MAX_TURNS_CONTEXT } = {}) {
  const since = now - HISTORY_DAYS * 86400000;
  const recent = (rows || []).filter((r) => !r.created_at || new Date(r.created_at).getTime() >= since).slice(-maxTurns);
  const out = [];
  const push = (role, content) => {
    const c = clip(content);
    if (!c) return;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content = `${last.content}\n${c}`;
    else out.push({ role, content: c });
  };
  for (const r of recent) {
    push('user', r.user_text);
    push('assistant', r.reply);
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

/** Junta el historial y el mensaje nuevo, terminando siempre en el usuario. */
export function buildMessages(history, text) {
  const msgs = history.map((m) => ({ ...m }));
  const t = clip(text);
  const last = msgs[msgs.length - 1];
  if (last && last.role === 'user') last.content = `${last.content}\n${t}`;
  else msgs.push({ role: 'user', content: t });
  return msgs;
}

const PAGES = {
  precios: ['/es/precios', '/en/pricing'], servicios: ['/es/servicios', '/en/services'], houston: ['/es/houston', '/en/houston'],
  miami: ['/es/miami', '/en/miami'], formulario: ['/formulario', '/en/project-brief'], diagnostico: ['/es/diagnostico', '/en/checkup'],
  herramientas: ['/es/herramientas', '/en/tools'], 'calculadora-llamadas': ['/es/herramientas#llamadas', '/en/tools#calls'],
  'calculadora-citas': ['/es/herramientas#citas', '/en/tools#appointments'],
};
export function pageUrl(page, lang = 'es') {
  const p = PAGES[page];
  return p ? SITE + p[lang === 'en' ? 1 : 0] : null;
}

/** Texto que sustituye a la tarjeta de la web (puro). */
export function renderAction(action, channel, lang = 'es') {
  if (!action) return '';
  const en = lang === 'en';
  if (action.type === 'link') {
    const u = pageUrl(action.page || action.pagina, lang);
    return u && channel !== 'telefono' ? u : '';
  }
  if (action.type === 'channels') {
    if (channel === 'telefono') return '';
    return en ? `You can also call us at ${HOUSTON_PHONE} and talk to the team.` : `También puedes llamarnos al ${HOUSTON_PHONE} y hablar con el equipo.`;
  }
  return '';
}

/** Une la respuesta y el texto de la acción sin repetir. */
export function joinReply(reply, extra) {
  const r = clip(reply, 4000);
  const e = clip(extra, 400);
  if (!e || r.includes(e)) return r;
  return r ? `${r}\n\n${e}` : e;
}

// Mensajes fijos de los canales.
export const CH_MSG = {
  es: {
    fallback: 'Perdona, tuve un problema para contestarte. Ya avisé al equipo y te escriben en breve.',
    noText: 'Por ahora leo solo mensajes de texto. ¿Me lo escribes y te ayudo enseguida?',
    limit: 'Recibimos tu mensaje. El equipo te contesta en persona en cuanto pueda.',
    saved: 'Listo, ya tiene tu caso el equipo y te contacta en menos de 1 hora hábil.',
    // Aviso legal (encargo 2026-11-15 §3b): la primera vez que Marcy escribe a alguien.
    intro: 'Hola, soy Marcy, la asistente con IA de Marcyan.',
    alta: 'Listo, volvemos a estar en contacto. ¿En qué te ayudo?',
  },
  en: {
    fallback: 'Sorry, I had a problem answering. I already let the team know and they will write to you shortly.',
    noText: 'For now I can only read text messages. Could you type it and I will help right away?',
    limit: 'We got your message. The team will reply in person as soon as they can.',
    saved: 'Done, the team has your case and will contact you within 1 business hour.',
    intro: 'Hi, I\'m Marcy, Marcyan\'s AI assistant.',
    alta: 'Done, we are back in touch. How can I help?',
  },
};

// ── Base (todo con try y sin romper el canal) ──

/** Guarda el mensaje entrante. Devuelve { id, nuevo } o lanza si falta la base. */
export async function saveInbound({ channel, providerId, sid, contact, contactName = null, text = '', kind = 'text', lang = 'es', sqlImpl }) {
  const sql = await getSql(sqlImpl);
  const r = await sql`
    INSERT INTO channel_inbox (channel, provider_id, sid, contact, text, kind)
    VALUES (${channel}, ${clip(providerId, 200)}, ${sid}, ${clip(contact, 80)}, ${clip(text)}, ${kind})
    ON CONFLICT (channel, provider_id) DO NOTHING RETURNING id`;
  if (!r.rows.length) return { id: null, nuevo: false };
  await sql`
    INSERT INTO chat_conversations (sid, env, channel, lang, contact, contact_name)
    VALUES (${sid}, ${ENV()}, ${channel}, ${lang}, ${clip(contact, 80)}, ${contactName ? clip(contactName, 80) : null})
    ON CONFLICT (sid) DO UPDATE SET contact = EXCLUDED.contact,
      contact_name = COALESCE(EXCLUDED.contact_name, chat_conversations.contact_name)`;
  return { id: r.rows[0].id, nuevo: true };
}

export async function markInbox(id, status, err = null, { sqlImpl } = {}) {
  if (!id) return;
  try {
    const sql = await getSql(sqlImpl);
    await sql`UPDATE channel_inbox SET status = ${status}, attempts = attempts + 1,
      last_error = ${err ? clip(err, 300) : null}, processed_at = CASE WHEN ${status} = 'pendiente' THEN NULL ELSE NOW() END
      WHERE id = ${id}`;
  } catch (e) { console.warn('[canales] no pude marcar', e && e.message); }
}

async function loadTurns(sid, sql) {
  const r = await sql`SELECT created_at, user_text, reply, action_type, fallback FROM chat_turns WHERE sid = ${sid} ORDER BY id DESC LIMIT 40`;
  return r.rows.reverse();
}
async function convLang(sid, sql) {
  try { const r = await sql`SELECT lang FROM chat_conversations WHERE sid = ${sid}`; return r.rows[0] ? r.rows[0].lang : null; } catch { return null; }
}

// ── Aviso de IA y bajas (encargo legal 2026-11-15 §3b y §3d) ──
export const OPT_CHANNELS = new Set(['whatsapp', 'instagram']);
const OWNER_TURNS = new Set(['dueno', 'espera']);
// Solo cuenta si se presenta a Marcy como IA; "asistente con IA" a secas es un servicio que vendemos.
const AI_SAID = /\b(soy|i'?m|i am)\s+marcy\b[^\n]{0,60}?(\bia\b|inteligencia artificial|\bai\b|artificial intelligence)/i;

/** Antepone «soy Marcy, la asistente con IA de Marcyan» si el texto no lo dice ya (puro). */
export function withIntro(text, lang = 'es') {
  const t = String(text || '');
  if (AI_SAID.test(t)) return t;
  const intro = (CH_MSG[lang] || CH_MSG.es).intro;
  return t ? `${intro}\n\n${t}` : intro;
}

// Solo palabras inequívocas: "cancelar", "alto", "para" o "end" son respuestas normales en
// una venta o una cita y darían de baja a alguien que no lo pidió (revisión 2026-11-15).
const STOP_WORDS = new Set(['stop', 'stopall', 'unsubscribe', 'quit', 'optout', 'revoke', 'revocar', 'baja', 'darmedebaja', 'parar', 'nomasmensajes']);
const START_WORDS = new Set(['start', 'unstop', 'subscribe', 'alta', 'darmedealta', 'reanudar']);
const COURTESY = new Set(['por', 'favor', 'porfa', 'porfavor', 'gracias', 'please', 'pls', 'thanks', 'thank', 'you', 'ya', 'ok', 'okay']);
const STOP_PHRASE = /\b(no me (escriban|escribas|manden|mandes|envien|envies) (mas|nada)|dej(en|a) de (escribirme|mandarme|enviarme)|darme de baja|quiero (la|mi) baja|stop (texting|messaging|writing to) me|do ?n'?t (text|message|write to) me( anymore)?|opt me out|unsubscribe me)\b/;
/** ¿Pide la baja o el alta? 'stop' | 'start' | null (puro). Palabra sola (con cortesías) o frase clara. */
export function optKeyword(text) {
  const norm = String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!norm || norm.length > 80) return null;
  const words = norm.replace(/'/g, '').split(' ').filter((x) => x && !COURTESY.has(x));
  if (words.length && words.length <= 2) {
    const w = words.join('');
    if (STOP_WORDS.has(w)) return 'stop';
    if (START_WORDS.has(w)) return 'start';
  }
  if (STOP_PHRASE.test(norm)) return 'stop';
  return null;
}

/**
 * ¿Pidió STOP y no ha vuelto a pedir ALTA? Se mira la última de las dos en la bandeja.
 * Devuelve null si no se pudo consultar: quien escribe en persona (Orbit) no envía.
 */
export async function isOptedOut({ channel, contact }, { sqlImpl } = {}) {
  if (!OPT_CHANNELS.has(channel) || !contact) return false;
  try {
    const sql = await getSql(sqlImpl);
    const r = await sql`SELECT status FROM channel_inbox WHERE channel = ${channel} AND contact = ${String(contact)}
      AND status IN ('baja', 'alta') ORDER BY received_at DESC, id DESC LIMIT 1`;
    return !!(r.rows[0] && r.rows[0].status === 'baja');
  } catch { return null; }
}

// Deja la baja anotada en el lead de esa conversación (y en WhatsApp, en los leads con ese teléfono).
async function markLeadOptOut({ channel, contact, sid }, deps) {
  const day = new Intl.DateTimeFormat('es-US', { timeZone: 'America/Chicago', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
  const note = `[${day}] Pidió STOP por ${channel === 'whatsapp' ? 'WhatsApp' : 'Instagram'}: no escribirle por SMS, WhatsApp ni Instagram salvo que escriba ALTA o START.`;
  try {
    const sql = await getSql(deps.sqlImpl);
    const full = channel === 'whatsapp' ? String(contact || '').replace(/\D/g, '') : '';
    // Número completo; el de 10 cifras solo para leads de EE.UU. guardados sin el 1 delante.
    const local = full.length === 11 && full.startsWith('1') ? full.slice(1) : full;
    await sql`UPDATE leads SET notes = CASE WHEN COALESCE(notes, '') = '' THEN ${note} ELSE notes || chr(10) || ${note} END
      WHERE ref_id IN (SELECT lead_ref FROM chat_conversations WHERE sid = ${sid} AND lead_ref LIKE 'LEAD-%')
         OR (${full} <> '' AND length(${full}) >= 10 AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') IN (${full}, ${local}))`;
  } catch (err) { console.warn('[canales] baja sin anotar en el lead', err && (err.code || err.message)); }
}

// Deja el caso del cliente como lead con el contacto que da el canal.
async function saveChannelLead({ channel, contact, contactName, action, sid, lang }, deps) {
  const { createLead } = deps.leads || (await import('./leads.mjs'));
  const { linkLead } = deps.chatLog || (await import('./chat-log.mjs'));
  const a = action || {};
  const lines = [
    `Por ${channel === 'whatsapp' ? 'WhatsApp' : channel === 'instagram' ? 'Instagram' : 'teléfono'} con Marcy (${a.destino || 'contacto'}).`,
    a.negocio && `Negocio: ${a.negocio}`, a.descripcion && `Qué necesita: ${a.descripcion}`, a.nota && `Nota: ${a.nota}`,
    channel === 'instagram' && `Instagram: id ${contact}`,
    `Conversación en Orbit: /dashboard#/marcy/${sid}`,
  ].filter(Boolean);
  const ref = await createLead({
    source: 'chat',
    name: clip(a.nombre || contactName || '', 120) || null,
    phone: channel === 'instagram' ? null : contact,
    business_name: a.negocio ? clip(a.negocio, 160) : null,
    city: a.ciudad ? clip(a.ciudad, 80) : null,
    interest: a.servicio ? clip(a.servicio, 120) : null,
    message: lines.join('\n'),
  });
  await linkLead({ sid, ref, kind: 'lead' });
  try {
    const { createNotification } = deps.notifications || (await import('./notifications.mjs'));
    await createNotification({ type: 'new_lead', title: `Lead por ${channel === 'whatsapp' ? 'WhatsApp' : channel === 'instagram' ? 'Instagram' : 'teléfono'}`, body: lines.slice(0, 3).join(' · ').slice(0, 300), ref });
  } catch {}
  return ref;
}

/** Herramientas de agendar por texto, con el contacto que pone el servidor. */
export function textBooking({ channel, contact, contactName, sid, lang }, deps = {}) {
  const appts = () => deps.appointments || import('./appointments.mjs');
  return {
    names: TEXT_INTERNAL,
    async run(toolUse) {
      const A = await appts();
      let taken = [];
      try { taken = await A.takenSlots(); } catch { taken = []; }
      if (toolUse.name === SLOTS_TOOL.name) return slotsToolResult({ taken, lang, fecha: toolUse.input && toolUse.input.fecha });
      const inp = toolUse.input || {};
      const at = typeof inp.at === 'string' ? inp.at.slice(0, 40) : '';
      if (!at || !isBookable(at, { taken })) return { content: JSON.stringify({ ok: false, motivo: 'hora_no_libre' }), extraAllow: [] };
      // Lead primero (si la cita falla, el contacto no se pierde), luego la cita.
      const ref = await saveChannelLead({ channel, contact, contactName, sid, lang, action: { destino: 'cita', nombre: inp.nombre, nota: inp.tema ? `Cita: ${inp.tema}` : 'Cita' } }, deps);
      const r = await A.createAppointment({ starts_at: at, name: clip(inp.nombre || contactName || '', 120) || null, email: null, phone: channel === 'instagram' ? null : contact, topic: inp.tema ? clip(inp.tema, 300) : null, lang, lead_ref: ref, chat_sid: sid, source: channel });
      if (!r || !r.ok) return { content: JSON.stringify({ ok: false, motivo: 'hora_no_libre' }), extraAllow: [] };
      try {
        const { createNotification } = deps.notifications || (await import('./notifications.mjs'));
        await createNotification({ type: 'new_lead', title: 'Cita agendada por Marcy', body: `${slotLabel(at, 'es')} · ${channel}`, ref, url: '/dashboard#/marcy' });
      } catch {}
      return { content: JSON.stringify({ ok: true, cuando: slotLabel(at, lang) }), extraAllow: [] };
    },
  };
}

/**
 * Procesa un mensaje guardado: Marcy contesta por el canal.
 * deps: { send(text), marcyTurn, sqlImpl, takeover, limits, leads, chatLog, notifications, appointments }
 * Devuelve el estado final ('hecho' | 'pendiente' | 'error' | 'omitido').
 */
export async function processInbound(row, deps) {
  const { channel, sid, contact, contactName = null, text, kind = 'text', inboxId } = row;
  const sql = await getSql(deps.sqlImpl);
  const tk = deps.takeover || (await import('./takeover.mjs'));
  const log = deps.chatLog || (await import('./chat-log.mjs'));
  const prevLang = await convLang(sid, sql);
  const lang = detectLang(text, prevLang);
  const M = CH_MSG[lang];
  const notify = async (title, body) => {
    try { const n = deps.notifications || (await import('./notifications.mjs')); await n.createNotification({ type: 'chat_handoff', title, body: clip(body, 300), ref: `chat:${sid}`.slice(0, 100), url: `/dashboard#/marcy/${sid}`, dedupeMinutes: 1 }); } catch {}
  };
  const chName = channel === 'whatsapp' ? 'WhatsApp' : channel === 'instagram' ? 'Instagram' : channel;

  // Primer mensaje de Marcy a esta persona (los del dueño no cuentan): va con el aviso
  // de que es una asistente con IA (encargo legal 2026-11-15 §3b).
  const turns = await loadTurns(sid, sql);
  const first = OPT_CHANNELS.has(channel) && !turns.some((x) => x.reply && !OWNER_TURNS.has(x.action_type));
  const send = (msg) => deps.send(first ? withIntro(msg, lang) : msg);

  // STOP / BAJA (encargo legal 2026-11-15 §3d): deja de escribirle (Marcy y el equipo),
  // queda anotado en la bandeja y en su lead, y solo se reanuda si escribe ALTA o START.
  if (OPT_CHANNELS.has(channel)) {
    const kw = optKeyword(text);
    const out = kw === 'stop' ? true : await isOptedOut({ channel, contact }, deps);
    if (kw === 'stop') {
      await markInbox(inboxId, 'baja', null, deps);
      if (!inboxId) await notify(`${chName}: la baja no quedó guardada`, `Escribió «${clip(text, 40)}» pero no hay fila en la bandeja. No le escribas por ${chName}.`);
      await markLeadOptOut({ channel, contact, sid }, deps);
      await notify(`${chName}: pidió no recibir más mensajes`, `Escribió «${clip(text, 40)}». Marcy y el equipo dejan de escribirle por ${chName}; solo se reanuda si escribe ALTA o START.`);
      return 'baja';
    }
    // ALTA solo cuenta si estaba de baja; si no, "Start" o "Alta" sigue el camino normal.
    if (kw === 'start' && out) {
      await markInbox(inboxId, 'alta', null, deps);
      await send(M.alta);
      await log.recordTurn({ sid, env: ENV(), lang, channel, userText: text, reply: M.alta, sqlImpl: deps.sqlImpl });
      return 'alta';
    }
    if (out) {
      try { await tk.recordVisitorWaiting({ sid, text: text || `[${kind}]`, sqlImpl: deps.sqlImpl }); } catch {}
      await notify(`${chName}: te escribió alguien que pidió STOP`, `${clip(text || `[${kind}]`, 200)} · Marcy no contesta. Si quieres retomar, que escriba ALTA o START.`);
      await markInbox(inboxId, 'hecho', 'baja', deps);
      return 'hecho';
    }
  }

  // "Tomo yo": el dueño la lleva (desde Orbit o contestando en la app de WhatsApp).
  if (await tk.isTakenOver(sid, { sqlImpl: deps.sqlImpl })) {
    try { await tk.recordVisitorWaiting({ sid, text: text || `[${kind}]`, sqlImpl: deps.sqlImpl }); } catch {}
    await notify(`Te escribió por ${channel === 'whatsapp' ? 'WhatsApp' : channel}`, text || `[${kind}]`);
    await markInbox(inboxId, 'hecho', null, deps);
    return 'hecho';
  }

  if (kind !== 'text' || !clip(text)) {
    await send(M.noText);
    await log.recordTurn({ sid, env: ENV(), lang, channel, userText: `[${kind}]`, reply: M.noText, fallback: true, sqlImpl: deps.sqlImpl });
    await notify(`Mensaje sin texto por ${channel}`, `El cliente mandó ${kind}. Marcy le pidió que lo escriba.`);
    await markInbox(inboxId, 'hecho', null, deps);
    return 'hecho';
  }

  // Frenos: por contacto y de todos los canales al día.
  if (deps.limits && !(await deps.limits(sid))) {
    await send(M.limit);
    await notify(`Marcy en su tope (${channel})`, text);
    await markInbox(inboxId, 'omitido', 'tope', deps);
    return 'omitido';
  }

  let messages = buildMessages(historyFromTurns(turns), text);
  let ownerCtx = null;
  if (messages.length > 1) {
    const texts = await tk.ownerTexts(sid, { sqlImpl: deps.sqlImpl });
    const t = tk.tagOwnerTurns(messages, texts);
    if (t.tagged) { messages = t.messages; ownerCtx = tk.OWNER_CONTEXT; }
  }
  const ctx = channelContext(channel, lang, { contactName, first }) + (ownerCtx ? `\n\n${ownerCtx}` : '');

  let t;
  try {
    // De entrada Marcy no cotiza: sus textos fijos (nota de voz, ALTA, fallo) no cuentan como respuesta.
    const quoteFirst = !turns.some((x) => x.reply && !x.fallback && x.reply !== M.alta && !OWNER_TURNS.has(x.action_type));
    t = await deps.marcyTurn({ messages, lang, sid, first: quoteFirst, extraContext: ctx, tools: deps.tools, extraInternal: textBooking({ channel, contact, contactName, sid, lang }, deps) });
  } catch (err) {
    const attempts = (row.attempts || 0) + 1;
    if (attempts >= MAX_ATTEMPTS || deps.final) {
      await send(M.fallback);
      await notify(`Marcy no pudo contestar (${channel})`, text);
      await log.recordTurn({ sid, env: ENV(), lang, channel, userText: text, reply: M.fallback, fallback: true, sqlImpl: deps.sqlImpl });
      await markInbox(inboxId, 'error', err && err.message, deps);
      return 'error';
    }
    await markInbox(inboxId, 'pendiente', err && err.message, deps);
    return 'pendiente';
  }

  // Sin texto de Marcy, el respaldo de la web manda al formulario: en un canal de
  // mensajes se dice otra cosa y se avisa al dueño para que conteste él.
  let reply = t.empty && !(t.action && t.action.type === 'capture') ? M.fallback : t.reply;
  if (t.empty && reply === M.fallback) await notify(`Marcy se quedó sin respuesta (${channel})`, text);
  const action = t.action;
  // Texto pensado para la tarjeta de la web ("aquí abajo", "👇"): en un canal sin tarjetas no vale.
  if (t.toolOnly) reply = channel === 'telefono' ? '' : (action && action.type === 'link' ? (lang === 'en' ? 'Here it is:' : 'Aquí lo tienes:') : '');
  if (action && action.type === 'capture') {
    try { await saveChannelLead({ channel, contact, contactName, action, sid, lang }, deps); }
    catch (err) { console.error('[canales] lead sin guardar', err && err.message); await notify(`Lead sin guardar (${channel})`, `Revisa la conversación ${sid}`); }
    if (!clip(reply)) reply = M.saved;
  }
  if (deps.onAction) reply = (await deps.onAction(action, reply, lang)) ?? reply;
  else reply = joinReply(reply, renderAction(action, channel, lang));

  // Pudo llegar un STOP mientras Marcy pensaba: se vuelve a mirar justo antes de enviar.
  if (OPT_CHANNELS.has(channel) && (await isOptedOut({ channel, contact }, deps))) {
    await log.recordTurn({ sid, env: ENV(), lang, channel, userText: text, reply: '[No enviado: pidió STOP]', action, tool: t.tool, cortadas: t.cortadas, fallback: true, costMicro: t.costMicro, sqlImpl: deps.sqlImpl });
    await markInbox(inboxId, 'hecho', 'baja', deps);
    return 'hecho';
  }
  if (first && reply) reply = withIntro(reply, lang);
  await deps.send(reply);
  // El registro necesita texto: si Marcy solo pasó a persona (teléfono), se anota así.
  const logged = reply || (action && action.type === 'channels' ? PASS_NOTE : M.fallback);
  await log.recordTurn({ sid, env: ENV(), lang, channel, userText: text, reply: logged, action, tool: t.tool, cortadas: t.cortadas, fallback: t.fallback, costMicro: t.costMicro, quote: t.quote || null, diagPlan: typeof t.diagPlan === 'string' ? t.diagPlan : null, sqlImpl: deps.sqlImpl });
  await markInbox(inboxId, 'hecho', null, deps);
  return 'hecho';
}

/** Borra los mensajes de canales de más de 12 meses (como las conversaciones). */
export async function purgeOldInbox({ sqlImpl } = {}) {
  const sql = await getSql(sqlImpl);
  // Bajas y altas se conservan: la última de las dos decide si se le puede escribir.
  const r = await sql`DELETE FROM channel_inbox WHERE received_at < NOW() - INTERVAL '12 months' AND status NOT IN ('baja', 'alta')`;
  return r.rowCount || 0;
}
