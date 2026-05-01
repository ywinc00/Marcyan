// GET /api/admin/me
// Devuelve { email } si la sesión es válida, o 401.
import { requireAdmin } from '../../lib/auth.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const session = await requireAdmin(req, res);
  if (!session) return; // requireAdmin ya respondió 401
  return res.status(200).json({ ok: true, email: session.email });
}
