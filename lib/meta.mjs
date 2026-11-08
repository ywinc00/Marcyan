// ════════════════════════════════════════════════════════════════
//  lib/meta.mjs — WhatsApp (Cloud API) e Instagram (mensajes) de Meta
//  ────────────────────────────────────────────────────────────────
//  Variables (las pega el dueño en Vercel, nunca en el código):
//    META_APP_SECRET         firma de los avisos (X-Hub-Signature-256)
//    META_VERIFY_TOKEN       frase que Meta repite al conectar el aviso
//    WHATSAPP_TOKEN          token permanente del usuario del sistema
//    WHATSAPP_PHONE_ID       id del número (Phone number ID)
//    INSTAGRAM_TOKEN         token de la cuenta profesional de Instagram
//    INSTAGRAM_APP_SECRET    (opcional) si la app de Instagram firma con otro secreto
//    META_GRAPH_VERSION      (opcional) versión de la API, por defecto v23.0
//  Número de WhatsApp Business existente (coexistencia): los mensajes que el
//  dueño manda desde la app llegan como "smb_message_echoes"; se tratan como
//  "Tomo yo" para que Marcy no le pise la conversación.
//  Lo puro se prueba en scripts/test-channels.mjs.
// ════════════════════════════════════════════════════════════════
import crypto from 'node:crypto';

export const graphVersion = () => process.env.META_GRAPH_VERSION || 'v23.0';

/** Lee el cuerpo crudo (la firma se calcula sobre los bytes exactos). */
export async function readRawBody(req) {
  // Primero el flujo sin tocar req.body: en Vercel ese getter parsea el JSON y
  // los bytes exactos (los de la firma) se perderían.
  if (req.readable !== false && !req.readableEnded && typeof req[Symbol.asyncIterator] === 'function') {
    const chunks = [];
    for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
    if (chunks.length) return Buffer.concat(chunks);
  }
  const b = req.body;
  if (Buffer.isBuffer(b)) return b;
  if (typeof b === 'string') return Buffer.from(b);
  return Buffer.from(b ? JSON.stringify(b) : '');
}

/** Firma de Meta: "sha256=" + HMAC-SHA256(cuerpo, secreto). Comparación en tiempo constante. */
export function validMetaSignature(raw, header, secret) {
  if (!secret || typeof header !== 'string' || !header.startsWith('sha256=')) return false;
  const expected = Buffer.from('sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex'));
  const got = Buffer.from(header);
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

/** Verificación al conectar el aviso (GET con hub.challenge). */
export function verifyChallenge(query, token) {
  const q = query || {};
  if (token && q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === token) return String(q['hub.challenge'] || '');
  return null;
}

const KIND = (t) => (t === 'text' ? 'text' : t === 'audio' || t === 'voice' ? 'audio' : t === 'image' || t === 'sticker' ? 'image' : 'otro');

/**
 * Mensajes de WhatsApp de un aviso (puro).
 * Devuelve { entrantes: [{ id, from, name, text, kind, ts }], ecos: [{ id, to, text, ts }] }
 */
export function parseWhatsApp(body) {
  const entrantes = [];
  const ecos = [];
  for (const e of (body && body.entry) || []) {
    for (const ch of e.changes || []) {
      const v = ch.value || {};
      if (ch.field === 'messages') {
        const names = {};
        for (const c of v.contacts || []) if (c && c.wa_id) names[c.wa_id] = c.profile && c.profile.name;
        for (const m of v.messages || []) {
          if (!m || !m.id || !m.from) continue;
          const text = m.type === 'text' ? (m.text && m.text.body) || ''
            : m.type === 'button' ? (m.button && m.button.text) || ''
            : m.type === 'interactive' ? ((m.interactive && (m.interactive.button_reply || m.interactive.list_reply)) || {}).title || '' : '';
          entrantes.push({ id: m.id, from: String(m.from), name: names[m.from] || null, text, kind: text ? 'text' : KIND(m.type), ts: Number(m.timestamp) || null });
        }
      } else if (ch.field === 'smb_message_echoes') {
        for (const m of v.message_echoes || []) {
          if (!m || !m.id || !m.to) continue;
          ecos.push({ id: m.id, to: String(m.to), text: m.type === 'text' ? (m.text && m.text.body) || '' : `[${m.type || 'mensaje'}]`, ts: Number(m.timestamp) || null });
        }
      }
    }
  }
  return { entrantes, ecos };
}

/**
 * Mensajes de Instagram de un aviso (puro). Ignora los que manda la propia
 * cuenta (is_echo: los trata como "Tomo yo" quien llama) y los leídos.
 */
export function parseInstagram(body) {
  const entrantes = [];
  const ecos = [];
  for (const e of (body && body.entry) || []) {
    const own = String(e.id || '');
    for (const m of e.messaging || []) {
      const msg = m && m.message;
      if (!msg || !msg.mid) continue;
      const text = msg.text || '';
      const kind = text ? 'text' : (msg.attachments && msg.attachments[0] && KIND(msg.attachments[0].type)) || 'otro';
      if (msg.is_echo) { ecos.push({ id: msg.mid, to: String(m.recipient && m.recipient.id), text: text || `[${kind}]`, ts: Number(m.timestamp) || null }); continue; }
      const from = String(m.sender && m.sender.id || '');
      if (!from || from === own) continue;
      entrantes.push({ id: msg.mid, from, name: null, text, kind, ts: Number(m.timestamp) || null });
    }
  }
  return { entrantes, ecos };
}

// Trozos para no pasar el máximo de los proveedores (WhatsApp 4096, Instagram 1000).
export function chunkText(text, max) {
  const out = [];
  let rest = String(text || '').trim();
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf('. ', max) + 1;
    if (cut < max * 0.5) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

async function graphPost(url, token, payload, fetchImpl = fetch) {
  const r = await fetchImpl(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) });
  if (!r.ok) {
    let detail = '';
    try { const j = await r.json(); detail = (j && j.error && (j.error.message || j.error.code)) || ''; } catch {}
    const err = new Error(`meta ${r.status} ${detail}`.trim());
    err.status = r.status;
    throw err;
  }
  return r.json().catch(() => ({}));
}

export const whatsappConfigured = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
export const instagramConfigured = () => !!process.env.INSTAGRAM_TOKEN;

/** Manda texto por WhatsApp (dentro de las 24 h desde el último mensaje del cliente). */
export async function sendWhatsApp(to, text, { fetch: fetchImpl } = {}) {
  const url = `https://graph.facebook.com/${graphVersion()}/${process.env.WHATSAPP_PHONE_ID}/messages`;
  for (const part of chunkText(text, 4000)) {
    await graphPost(url, process.env.WHATSAPP_TOKEN, { messaging_product: 'whatsapp', recipient_type: 'individual', to: String(to).replace(/\D/g, ''), type: 'text', text: { preview_url: true, body: part } }, fetchImpl);
  }
}

/** Marca como leído y enseña "escribiendo…" mientras Marcy piensa. Nunca lanza. */
export async function whatsappTyping(messageId, { fetch: fetchImpl } = {}) {
  try {
    const url = `https://graph.facebook.com/${graphVersion()}/${process.env.WHATSAPP_PHONE_ID}/messages`;
    await graphPost(url, process.env.WHATSAPP_TOKEN, { messaging_product: 'whatsapp', status: 'read', message_id: messageId, typing_indicator: { type: 'text' } }, fetchImpl);
  } catch (err) { console.warn('[whatsapp] sin indicador de escritura', err && err.message); }
}

/** "Escribiendo…" en Instagram (dura unos segundos). Nunca lanza. */
export async function instagramTyping(to, { fetch: fetchImpl } = {}) {
  try {
    const url = `https://graph.instagram.com/${graphVersion()}/me/messages`;
    await graphPost(url, process.env.INSTAGRAM_TOKEN, { recipient: { id: String(to) }, sender_action: 'typing_on' }, fetchImpl);
  } catch (err) { console.warn('[instagram] sin indicador de escritura', err && err.message); }
}

/** Manda texto por Instagram. */
export async function sendInstagram(to, text, { fetch: fetchImpl } = {}) {
  const url = `https://graph.instagram.com/${graphVersion()}/me/messages`;
  for (const part of chunkText(text, 950)) {
    await graphPost(url, process.env.INSTAGRAM_TOKEN, { recipient: { id: String(to) }, message: { text: part } }, fetchImpl);
  }
}
