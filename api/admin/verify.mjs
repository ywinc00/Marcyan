// GET /api/admin/verify?token=...
// Consume el magic token, crea sesión, set cookie y redirige al panel.
import {
  consumeMagicToken, isAllowed, createSession,
  buildCookie, clientIp,
} from '../../lib/auth.mjs';

// Tras autenticar, el destino por defecto es el dashboard nuevo.
// El panel viejo sigue accesible directo en /admin/briefs.
const REDIRECT_OK    = '/dashboard';
const REDIRECT_FAIL  = '/dashboard?error=invalid';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const token = (req.query?.token || '').toString();
    if (!token) {
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
