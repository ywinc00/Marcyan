// POST /api/admin/login  { email }
// Si el email está en ADMIN_ALLOWED_EMAILS, genera magic token y lo envía.
// Siempre responde 200 (no revela si el email está autorizado).
import { isAllowed, createMagicToken, clientIp } from '../../lib/auth.mjs';
import { emailAdminMagicLink } from '../../lib/email.mjs';

const SIMPLE_RATE_LIMIT = new Map(); // ip → { count, resetAt }
const MAX_PER_15MIN = 5;

function rateLimit(ip) {
  if (!ip) return true;
  const now = Date.now();
  const slot = SIMPLE_RATE_LIMIT.get(ip);
  if (!slot || slot.resetAt < now) {
    SIMPLE_RATE_LIMIT.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (slot.count >= MAX_PER_15MIN) return false;
  slot.count++;
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const ip = clientIp(req);
  if (!rateLimit(ip)) {
    return res.status(429).json({ ok: false, error: 'Demasiados intentos. Espera 15 min.' });
  }

  try {
    const body = (typeof req.body === 'object' && req.body) ? req.body : {};
    const rawEmail = (body.email || '').trim().toLowerCase();
    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return res.status(400).json({ ok: false, error: 'Email inválido' });
    }

    // Solo enviamos si está en allowlist. Pero respondemos 200 igual
    // para no revelar la lista (anti-enumeration).
    if (isAllowed(rawEmail)) {
      const { token } = await createMagicToken(rawEmail, ip);
      try {
        await emailAdminMagicLink({ email: rawEmail, token, ipAddress: ip });
        console.log(`[admin/login] magic link enviado a ${rawEmail}`);
      } catch (err) {
        console.error('[admin/login] envío magic link falló:', err && err.message);
        return res.status(500).json({ ok: false, error: 'No se pudo enviar el email. Intenta de nuevo.' });
      }
    } else {
      console.warn(`[admin/login] intento con email NO autorizado: ${rawEmail} (ip ${ip})`);
    }

    return res.status(200).json({
      ok: true,
      message: 'Si el email está autorizado, recibirás un enlace de acceso en breve.'
    });
  } catch (err) {
    console.error('[admin/login] error:', err);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
}
