// /api/canales/prueba — SOLO vista previa (en producción, 404). Simula un mensaje
// de WhatsApp, Instagram o teléfono y devuelve lo que Marcy contestaría, sin
// mandar nada a Meta ni a Twilio. Sirve para probar a Marcy en cada canal antes
// de conectar los números. La vista previa ya está protegida por Vercel.
import { processInbound, sidFor, e164 } from '../../lib/channels.mjs';
import { textTools, channelLimits } from '../../lib/channel-runtime.mjs';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (process.env.VERCEL_ENV === 'production') return res.status(404).end();
  if (req.method !== 'POST') return res.status(405).end();
  const b = (typeof req.body === 'object' && req.body) || {};
  const channel = ['whatsapp', 'instagram', 'telefono'].includes(b.channel) ? b.channel : 'whatsapp';
  const from = String(b.from || '10000000000').replace(/\D/g, '').slice(0, 15);
  const contact = channel === 'instagram' ? from : e164(from);
  const sid = sidFor(channel, `prueba${from}`);
  const sent = [];
  let action = null;
  const { marcyTurn } = await import('../chat.mjs');
  const estado = await processInbound({ channel, sid, contact, contactName: b.name || null, text: String(b.text || '').slice(0, 1000), kind: b.kind || 'text', inboxId: null, attempts: 0 }, {
    marcyTurn, tools: await textTools(), limits: channelLimits, final: true,
    send: async (t) => { sent.push(t); },
    onAction: channel === 'telefono' ? async (a, r) => { action = a; return r; } : undefined,
  });
  return res.status(200).json({ ok: true, sid, estado, enviado: sent, accion: action });
}
