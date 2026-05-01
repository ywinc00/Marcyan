// POST /api/admin/logout
// Revoca la sesión actual y limpia cookie.
import { readCookie, revokeSession, clearCookie } from '../../lib/auth.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  try {
    const sid = readCookie(req);
    if (sid) await revokeSession(sid);
    res.setHeader('Set-Cookie', clearCookie());
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[admin/logout] error:', err);
    res.setHeader('Set-Cookie', clearCookie()); // limpiar igual
    return res.status(200).json({ ok: true });
  }
}
