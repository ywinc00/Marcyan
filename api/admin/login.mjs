// POST /api/admin/login  { email }
// Si el email está en ADMIN_ALLOWED_EMAILS, genera magic token y lo envía.
// Siempre responde 200 (no revela si el email está autorizado).
import { isAllowed, createMagicToken, clientIp } from '../../lib/auth.mjs';
import { emailAdminMagicLink } from '../../lib/email.mjs';
import { rateLimit, LIMITS } from '../../lib/ratelimit.mjs';

// Límite de intentos: 5 por 15 min por IP, ahora PERSISTENTE en Neon
// (lib/ratelimit.mjs, B-03). Antes era un Map en memoria por instancia; si la
// migración 010 aún no está aplicada, la librería vuelve a ese mismo contador.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const ip = clientIp(req);
  const rl = await rateLimit({ bucket: 'login', key: ip, limits: LIMITS.login });
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter));
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
