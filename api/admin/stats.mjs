// GET /api/admin/stats
// Métricas agregadas de briefs.
import { requireAdmin } from '../../lib/auth.mjs';
import { briefStats } from '../../lib/db.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const session = await requireAdmin(req, res);
  if (!session) return;
  try {
    const stats = await briefStats();
    return res.status(200).json({ ok: true, stats });
  } catch (err) {
    console.error('[admin/stats] error:', err);
    return res.status(500).json({ ok: false, error: 'Error al obtener stats' });
  }
}
