// POST /api/admin/logout
// Revoca la sesión actual EN SERVIDOR (revoked_at) y limpia la cookie.
// Si la revocación falla, la cookie se limpia igual pero responde 500
// { ok:false } para que el panel avise: la sesión podría seguir viva en
// el servidor (antes respondía ok:true y el fallo pasaba inadvertido).
import { readCookie, revokeSession, clearCookie } from '../../lib/auth.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const sid = readCookie(req);
    if (sid) await revokeSession(sid);
    res.setHeader('Set-Cookie', clearCookie());
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[admin/logout] error:', err);
    res.setHeader('Set-Cookie', clearCookie()); // limpiar igual
    return res.status(500).json({ ok: false, error: 'No se pudo cerrar la sesión. Intenta de nuevo.' });
  }
}
