// ════════════════════════════════════════════════════════════════
//  /api/voz?paso=… — Marcy contesta el teléfono de Houston (Twilio)
//  ────────────────────────────────────────────────────────────────
//  entrada  llamada nueva: saludo y primera escucha (o recado si hay tope)
//  turno    lo que dijo el cliente → turno de Marcy → voz (o "un momento")
//  espera   vuelve aquí cada segundo hasta que la respuesta esté lista
//  dial     resultado de pasar la llamada al equipo (si no contesta, recado)
//  recado   grabación terminada: lead + aviso al dueño
//  fin      la llamada colgó: coste de minutos y lead si no lo dejó
//  Toda petición va firmada por Twilio (TWILIO_AUTH_TOKEN); sin firma, 403.
//  Lógica pura en lib/voice.mjs; el turno es el de todos los canales.
// ════════════════════════════════════════════════════════════════
import { validTwilio, publicUrl, greetTwiml, replyTwiml, repeatTwiml, waitTwiml, recordTwiml, dialTwiml, byeTwiml, twiml, inTransferHours, wantsEnglish, callCostMicro, voiceCapUsd, V_MSG } from '../lib/voice.mjs';
import { sidFor, processInbound, saveInbound, SLOTS_TOOL, BOOK_TOOL } from '../lib/channels.mjs';

export const config = { maxDuration: 60 };

const RACE_MS = 7000;
const MAX_WAITS = 22;
const ENV = () => process.env.VERCEL_ENV || 'development';
const OUT_OF_HOURS = {
  es: 'Ahora el equipo no está disponible para pasarte la llamada. Si me dices tu nombre y el motivo, les dejo el recado y te llaman.',
  en: 'The team is not available to take the call right now. If you tell me your name and the reason, I will leave them the message and they will call you.',
};

async function db() { return (await import('@vercel/postgres')).sql; }

function send(res, xml) {
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  return res.status(200).send(xml);
}

async function notify(type, title, body, ref = null, url = null) {
  try { const n = await import('../lib/notifications.mjs'); await n.createNotification({ type, title, body: String(body || '').slice(0, 300), ref, url, dedupeMinutes: 1 }); } catch {}
}

/** Gasto del teléfono en el mes (minutos estimados + IA), en USD. */
export async function voiceSpendUsd() {
  try {
    const sql = await db();
    const r = await sql`SELECT COALESCE(SUM(cost_micro_usd), 0)::bigint AS micro FROM chat_conversations
      WHERE channel = 'telefono' AND env = ${ENV()} AND started_at >= date_trunc('month', NOW())`;
    return Number(r.rows[0].micro) / 1e6;
  } catch { return 0; }
}

async function voiceTools() {
  const { CHAT_TOOLS, SITE_TOOL } = await import('../lib/chat-kb.mjs');
  // Sin revisar_sitio: tarda demasiado para una llamada.
  return [...CHAT_TOOLS.filter((t) => t.name !== SITE_TOOL.name), SLOTS_TOOL, BOOK_TOOL];
}

// Respuesta de voz a partir de la respuesta y la acción de Marcy.
function voiceAnswer(reply, actionType, lang) {
  if (actionType === 'channels') {
    const to = process.env.VOICE_TRANSFER_TO;
    if (to && inTransferHours()) return dialTwiml(to, reply ? `${reply} ${V_MSG[lang].paso}` : V_MSG[lang].paso, lang);
    return replyTwiml(`${reply || ''} ${OUT_OF_HOURS[lang]}`.trim(), lang);
  }
  return replyTwiml(reply || V_MSG[lang].repite, lang);
}

async function runTurn({ sid, contact, text, lang, key }) {
  let inboxId = null;
  try { inboxId = (await saveInbound({ channel: 'telefono', providerId: key, sid, contact, text, lang })).id; }
  catch (err) { console.warn('[voz] sin bandeja de canales', err && (err.code || err.message)); }
  const out = { reply: null, action: null };
  const { marcyTurn } = await import('./chat.mjs');
  await processInbound({ channel: 'telefono', sid, contact, text, kind: 'text', inboxId, attempts: 0 }, {
    marcyTurn, tools: await voiceTools(), final: true,
    send: async (t) => { out.reply = t; },
    onAction: async (action, reply) => { out.action = action; return reply; },
  });
  return out;
}

export default async function handler(req, res) {
  const q = req.query || {};
  const p = (typeof req.body === 'object' && req.body) || {};
  const lang = q.lang === 'en' ? 'en' : 'es';
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) { console.warn('[voz] sin TWILIO_AUTH_TOKEN'); return res.status(503).end(); }
  if (!validTwilio(token, publicUrl(req), p, req.headers['x-twilio-signature'])) { console.warn('[voz] firma inválida'); return res.status(403).end(); }

  const from = String(p.From || '').slice(0, 30);
  const callSid = String(p.CallSid || '').replace(/[^\w]/g, '').slice(0, 40);
  const sid = sidFor('telefono', callSid);
  const paso = String(q.paso || 'entrada');

  try {
    if (paso === 'entrada') {
      if (process.env.VOICE_ENABLED === 'false' || (await voiceSpendUsd()) >= voiceCapUsd()) {
        await notify('system', 'Teléfono en recado', 'Marcy no atiende llamadas (tope del mes o apagada): pasan a recado grabado.', 'voz-tope');
        return send(res, recordTwiml(lang, 'recado'));
      }
      try {
        const { rateLimit, LIMITS } = await import('../lib/ratelimit.mjs');
        const rl = await rateLimit({ bucket: ENV() === 'production' ? 'vozLlamada' : `vozLlamada@${ENV()}`, key: from || 'anon', limits: LIMITS.vozLlamada });
        if (!rl.ok) return send(res, recordTwiml(lang, 'recado'));
      } catch {}
      try {
        const sql = await db();
        await sql`INSERT INTO chat_conversations (sid, env, channel, lang, contact) VALUES (${sid}, ${ENV()}, 'telefono', ${lang}, ${from || null}) ON CONFLICT (sid) DO NOTHING`;
      } catch (err) { console.warn('[voz] sin conversación', err && (err.code || err.message)); }
      await notify('chat_handoff', 'Marcy está atendiendo una llamada', `Llamada de ${from || 'número oculto'}`, `chat:${sid}`.slice(0, 100), `/dashboard#/marcy/${sid}`);
      return send(res, greetTwiml(lang));
    }

    if (paso === 'turno') {
      const text = String(p.SpeechResult || '').trim().slice(0, 1000);
      if (!text) return send(res, Number(q.s) >= 1 ? byeTwiml(lang, V_MSG[lang].adios) : twiml(`<Redirect method="POST">/api/voz?paso=silencio&amp;lang=${lang}</Redirect>`));
      if (lang === 'es' && wantsEnglish(text) && text.split(/\s+/).length <= 4) return send(res, replyTwiml(V_MSG.en.hola, 'en'));
      const key = `${callSid}:${Date.now()}`;
      const work = runTurn({ sid, contact: from, text, lang, key });
      const done = await Promise.race([work.then((r) => r), new Promise((r) => setTimeout(() => r(null), RACE_MS))]);
      if (done) return send(res, voiceAnswer(done.reply, done.action && done.action.type, lang));
      try { const { waitUntil } = await import('@vercel/functions'); waitUntil(work.catch(() => {})); } catch {}
      return send(res, waitTwiml(key, lang, 0));
    }

    if (paso === 'silencio') return send(res, replyTwiml(V_MSG[lang].sigues, lang).replace('paso=turno&amp;lang=' + lang, `paso=turno&amp;lang=${lang}&amp;s=1`));

    if (paso === 'espera') {
      const key = String(q.k || '').slice(0, 80);
      const n = Number(q.n) || 0;
      const sql = await db();
      const st = await sql`SELECT status FROM channel_inbox WHERE channel = 'telefono' AND provider_id = ${key}`;
      const status = st.rows[0] && st.rows[0].status;
      if (status === 'hecho' || status === 'error') {
        const t = await sql`SELECT reply, action_type FROM chat_turns WHERE sid = ${sid} ORDER BY id DESC LIMIT 1`;
        const row = t.rows[0] || {};
        return send(res, voiceAnswer(row.reply, row.action_type, lang));
      }
      if (n >= MAX_WAITS) return send(res, recordTwiml(lang, 'fallo'));
      return send(res, waitTwiml(key, lang, n));
    }

    if (paso === 'dial') {
      if (String(p.DialCallStatus) === 'completed') return send(res, twiml('<Hangup/>'));
      return send(res, recordTwiml(lang, 'noContesta'));
    }

    if (paso === 'recado') {
      const url = String(p.RecordingUrl || '').slice(0, 300);
      const secs = Number(p.RecordingDuration) || 0;
      if (url && secs >= 2) {
        let ref = null;
        try {
          const { createLead } = await import('../lib/leads.mjs');
          ref = await createLead({ source: 'chat', phone: from || null, message: `Recado de voz (${secs} s) en el teléfono de Houston.\nGrabación: ${url}` });
          const { linkLead } = await import('../lib/chat-log.mjs');
          await linkLead({ sid, ref, kind: 'lead' });
        } catch (err) { console.error('[voz] recado sin lead', err && err.message); }
        await notify('new_lead', 'Recado de voz', `${from || 'Número oculto'} dejó un recado de ${secs} s. Escúchalo: ${url}`, ref);
      }
      return send(res, byeTwiml(lang));
    }

    if (paso === 'fin') {
      if (String(p.CallStatus) === 'completed' && sid) {
        const secs = Number(p.CallDuration) || 0;
        try {
          const sql = await db();
          const r = await sql`UPDATE chat_conversations SET cost_micro_usd = cost_micro_usd + ${callCostMicro(secs)}, last_at = NOW()
            WHERE sid = ${sid} RETURNING lead_ref, turns, contact`;
          const c = r.rows[0];
          if (c && !c.lead_ref && c.turns > 0 && c.contact) {
            const t = await sql`SELECT user_text FROM chat_turns WHERE sid = ${sid} AND user_text <> '' ORDER BY id ASC LIMIT 6`;
            const said = t.rows.map((x) => x.user_text).join(' / ').slice(0, 800);
            const { createLead } = await import('../lib/leads.mjs');
            const ref = await createLead({ source: 'chat', phone: c.contact, message: `Llamada con Marcy (${Math.round(secs / 60)} min) en el teléfono de Houston.\nDijo: ${said}\nConversación en Orbit: /dashboard#/marcy/${sid}` });
            const { linkLead } = await import('../lib/chat-log.mjs');
            await linkLead({ sid, ref, kind: 'lead' });
            await notify('new_lead', 'Llamada atendida por Marcy', `${c.contact} · ${Math.round(secs / 60)} min. ${said.slice(0, 160)}`, ref);
          }
        } catch (err) { console.warn('[voz] fin sin guardar', err && (err.code || err.message)); }
      }
      return res.status(204).end();
    }

    return res.status(400).end();
  } catch (err) {
    console.error('[voz]', paso, err && err.message);
    return send(res, recordTwiml(lang, 'fallo'));
  }
}
