// /api/cron/canales — reintenta los mensajes de WhatsApp e Instagram que Marcy
// no pudo contestar (se guardan antes de procesarse; puerta técnica punto 2).
import { retryPending } from '../../lib/channel-runtime.mjs';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (process.env.VERCEL_ENV === 'production' && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false });
  }
  try {
    const n = await retryPending({ limit: 8 });
    return res.status(200).json({ ok: true, procesados: n });
  } catch (err) {
    console.warn('[cron canales]', err && (err.code || err.message));
    return res.status(200).json({ ok: false });
  }
}
