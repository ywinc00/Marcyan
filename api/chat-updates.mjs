// POST /api/chat-updates { sessionId, after } — "Tomo yo".
// El widget pregunta cada pocos segundos si el dueño escribió algo en su
// conversación desde Orbit. Devuelve { takeover, mensajes:[{id,text}] }.
// Mismo origen que el chat (POST para que el navegador mande Origin) y freno
// por conexión. Sin la migración 022, responde vacío: el chat sigue con Marcy.
import { originOk, clientIp, validSessionId } from './chat.mjs';
import { ownerUpdates } from '../lib/takeover.mjs';
import { rateLimit, LIMITS } from '../lib/ratelimit.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  if (!originOk(req)) return res.status(403).json({ ok: false });
  const b = typeof req.body === 'object' && req.body ? req.body : {};
  if (!validSessionId(b.sessionId)) return res.status(400).json({ ok: false });
  const rl = await rateLimit({ bucket: 'chatPoll', key: clientIp(req), limits: LIMITS.chatPoll });
  if (!rl.ok) return res.status(429).json({ ok: false });
  res.setHeader('Cache-Control', 'no-store');
  try {
    return res.status(200).json({ ok: true, ...(await ownerUpdates({ sid: b.sessionId, after: b.after })) });
  } catch {
    return res.status(200).json({ ok: true, takeover: false, mensajes: [] });
  }
}
