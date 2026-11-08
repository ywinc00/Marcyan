// ════════════════════════════════════════════════════════════════
//  lib/channel-runtime.mjs — lo común de los avisos de WhatsApp e Instagram
//  ────────────────────────────────────────────────────────────────
//  1. GET: verificación al conectar (hub.challenge).
//  2. POST: firma de Meta (sin secreto configurado = 503, nunca se procesa
//     algo sin firmar), guardado de cada mensaje ANTES de contestar y 200
//     inmediato; Marcy contesta en segundo plano (waitUntil). Si algo falla
//     el mensaje queda 'pendiente' y lo reintenta /api/cron/canales.
//  3. Ecos (el dueño escribió desde la app del teléfono): "Tomo yo" automático.
// ════════════════════════════════════════════════════════════════
import { readRawBody, validMetaSignature, verifyChallenge, parseWhatsApp, parseInstagram, sendWhatsApp, sendInstagram, whatsappTyping, whatsappConfigured, instagramConfigured } from './meta.mjs';
import { sidFor, e164, saveInbound, processInbound, markInbox, SLOTS_TOOL, BOOK_TOOL } from './channels.mjs';

const STALE_MS = 23 * 60 * 60 * 1000;   // WhatsApp solo deja contestar libre dentro de 24 h

export const ADAPTERS = {
  whatsapp: {
    secret: () => process.env.META_APP_SECRET,
    configured: whatsappConfigured,
    parse: parseWhatsApp,
    contact: (from) => e164(from),
    send: (contact, text) => sendWhatsApp(contact, text),
    typing: (id) => whatsappTyping(id),
    echoBy: 'app-whatsapp',
  },
  instagram: {
    secret: () => process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET,
    configured: instagramConfigured,
    parse: parseInstagram,
    contact: (from) => String(from),
    send: (contact, text) => sendInstagram(contact, text),
    typing: null,
    echoBy: 'app-instagram',
  },
};

// Herramientas de los canales de texto: las de la web + agendar por texto.
export async function textTools() {
  const { CHAT_TOOLS } = await import('./chat-kb.mjs');
  return [...CHAT_TOOLS, SLOTS_TOOL, BOOK_TOOL];
}

/** Frenos de los canales (por conversación y de todos los canales al día). */
export async function channelLimits(sid) {
  const { rateLimit, LIMITS, GLOBAL_KEY } = await import('./ratelimit.mjs');
  const env = process.env.VERCEL_ENV || 'development';
  const b = (x) => (env === 'production' ? x : `${x}@${env}`);
  const one = await rateLimit({ bucket: b('canal'), key: sid, limits: LIMITS.canal });
  if (!one.ok) return false;
  const all = await rateLimit({ bucket: b('canalGlobal'), key: GLOBAL_KEY, limits: LIMITS.canalGlobal });
  return all.ok;
}

/** Dependencias reales de processInbound para un canal. */
export async function realDeps(channel, contact) {
  const { marcyTurn } = await import('../api/chat.mjs');
  const a = ADAPTERS[channel];
  return { marcyTurn, tools: await textTools(), limits: channelLimits, send: (text) => a.send(contact, text) };
}

// ¿El eco es una respuesta que mandó Marcy por la API? (Instagram avisa de todo lo
// que sale de la cuenta.) Se compara con su última respuesta guardada.
async function isMarcyEcho(sid, text, sql) {
  try {
    const r = await sql`SELECT reply FROM chat_turns WHERE sid = ${sid} AND created_at > NOW() - INTERVAL '10 minutes' ORDER BY id DESC LIMIT 3`;
    const t = String(text || '').trim();
    return r.rows.some((x) => x.reply && (x.reply.includes(t) || t.includes(x.reply.slice(0, 200))));
  } catch { return false; }
}

async function handleEcho(channel, eco) {
  const sid = sidFor(channel, eco.to);
  if (!sid || !eco.text) return;
  const { sql } = await import('@vercel/postgres');
  if (await isMarcyEcho(sid, eco.text, sql)) return;
  const tk = await import('./takeover.mjs');
  try { await tk.recordOwnerEcho({ sid, text: eco.text, by: ADAPTERS[channel].echoBy }); }
  catch (err) { console.warn(`[${channel}] eco sin guardar`, err && err.message); }
}

async function handleIncoming(channel, m) {
  const a = ADAPTERS[channel];
  const contact = a.contact(m.from);
  const sid = sidFor(channel, m.from);
  if (!sid) return;
  if (m.ts && Date.now() - m.ts * (m.ts < 1e12 ? 1000 : 1) > STALE_MS) return; // viejo: fuera de la ventana de 24 h
  let saved;
  try {
    saved = await saveInbound({ channel, providerId: m.id, sid, contact, contactName: m.name, text: m.text, kind: m.kind });
    if (!saved.nuevo) return;                       // reintento de Meta: ya estaba
  } catch (err) {
    // Sin la migración 023 se contesta igual (sin cola ni deduplicación) y se avisa una vez.
    console.warn(`[${channel}] sin bandeja de canales:`, err && (err.code || err.message));
    saved = { id: null };
  }
  if (a.typing && m.kind === 'text') await a.typing(m.id);
  try {
    const deps = await realDeps(channel, contact);
    await processInbound({ channel, sid, contact, contactName: m.name, text: m.text, kind: m.kind, inboxId: saved.id, attempts: 0 }, deps);
  } catch (err) {
    console.error(`[${channel}] proceso fallido`, err && err.message);
    await markInbox(saved.id, 'pendiente', err && err.message);
  }
}

/** Manejador de Vercel para un canal de Meta. */
export function metaWebhook(channel) {
  return async function handler(req, res) {
    const a = ADAPTERS[channel];
    if (req.method === 'GET') {
      const ch = verifyChallenge(req.query, process.env.META_VERIFY_TOKEN);
      if (ch === null) return res.status(403).send('forbidden');
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(ch);
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).end(); }
    const secret = a.secret();
    if (!secret || !a.configured()) { console.warn(`[${channel}] sin configurar en Vercel`); return res.status(503).json({ ok: false }); }
    const raw = await readRawBody(req);
    if (!validMetaSignature(raw, req.headers['x-hub-signature-256'], secret)) {
      console.warn(`[${channel}] firma inválida`);
      return res.status(401).json({ ok: false });
    }
    let body;
    try { body = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).json({ ok: false }); }
    const { entrantes, ecos } = a.parse(body);
    const work = (async () => {
      for (const e of ecos) await handleEcho(channel, e);
      for (const m of entrantes) await handleIncoming(channel, m);
    })().catch((err) => console.error(`[${channel}]`, err && err.message));
    try {
      const { waitUntil } = await import('@vercel/functions');
      waitUntil(work);
    } catch { await work; }
    return res.status(200).json({ ok: true });
  };
}

/** Reintento de los pendientes (tarea programada). Devuelve cuántos procesó. */
export async function retryPending({ limit = 10 } = {}) {
  const { sql } = await import('@vercel/postgres');
  const { rows } = await sql`
    SELECT i.id, i.channel, i.sid, i.contact, i.text, i.kind, i.attempts, c.contact_name
    FROM channel_inbox i LEFT JOIN chat_conversations c ON c.sid = i.sid
    WHERE i.status = 'pendiente' AND i.received_at > NOW() - INTERVAL '23 hours'
      AND i.received_at < NOW() - INTERVAL '2 minutes' AND i.channel IN ('whatsapp', 'instagram')
    ORDER BY i.received_at ASC LIMIT ${limit}`;
  let n = 0;
  for (const r of rows) {
    if (!ADAPTERS[r.channel].configured()) continue;
    try {
      const deps = await realDeps(r.channel, r.contact);
      await processInbound({ channel: r.channel, sid: r.sid, contact: r.contact, contactName: r.contact_name, text: r.text, kind: r.kind, inboxId: r.id, attempts: r.attempts }, deps);
      n++;
    } catch (err) { await markInbox(r.id, 'pendiente', err && err.message); }
  }
  // Lo que se quedó fuera de la ventana de 24 h ya no se puede contestar libre: se marca y se avisa.
  const old = await sql`UPDATE channel_inbox SET status = 'error', last_error = 'fuera de 24 h'
    WHERE status = 'pendiente' AND received_at <= NOW() - INTERVAL '23 hours' RETURNING sid`;
  if (old.rows.length) {
    try {
      const { notifySystem } = await import('./notifications.mjs');
      await notifySystem({ key: 'canales-sin-contestar', title: 'Mensajes sin contestar en WhatsApp o Instagram', body: `${old.rows.length} mensaje(s) se quedaron sin respuesta de Marcy. Contesta tú desde la app.`, url: '/dashboard#/marcy' });
    } catch {}
  }
  return n;
}
