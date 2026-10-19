// GET /api/admin/verify?token=...
// Consume el magic token (un solo uso, 15 min), crea sesión, set cookie y
// redirige al panel. El token se guarda en BD como hash (lib/auth.mjs).
import {
  consumeMagicToken, isAllowed, createSession,
  buildCookie, clientIp, isWellFormedToken,
} from '../../lib/auth.mjs';

// Tras autenticar, el destino es Orbit (/dashboard). El panel viejo /admin
// ya redirige aquí (vercel.json); sus archivos se conservan sin publicarse.
const REDIRECT_OK    = '/dashboard';
const REDIRECT_FAIL  = '/dashboard?error=invalid';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // La URL lleva el token: que ni se cachee ni viaje como Referer.
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');

  try {
    const token = (req.query?.token || '').toString();
    if (!token || !isWellFormedToken(token)) {
      return res.redirect(302, REDIRECT_FAIL);
    }

    const consumed = await consumeMagicToken(token);
    if (!consumed) {
      console.warn('[admin/verify] token inválido o expirado');
      return res.redirect(302, REDIRECT_FAIL);
    }

    // Re-verificar allowlist (por si el email fue removido entre login y verify)
    if (!isAllowed(consumed.email)) {
      console.warn(`[admin/verify] token válido pero email ya no autorizado: ${consumed.email}`);
      return res.redirect(302, REDIRECT_FAIL);
    }

    const ip = clientIp(req);
    const ua = (req.headers['user-agent'] || '').slice(0, 500);
    const { sessionId, expiresAt } = await createSession(consumed.email, ip, ua);

    res.setHeader('Set-Cookie', buildCookie(sessionId, expiresAt));
    console.log(`[admin/verify] sesión creada para ${consumed.email}`);
    return res.redirect(302, REDIRECT_OK);
  } catch (err) {
    console.error('[admin/verify] error:', err);
    return res.redirect(302, REDIRECT_FAIL);
  }
}
