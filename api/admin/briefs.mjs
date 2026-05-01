// GET /api/admin/briefs?status=...&search=...&limit=30&offset=0
// Lista paginada con filtros.
import { requireAdmin } from '../../lib/auth.mjs';
import { listBriefs, BRIEF_STATUSES } from '../../lib/db.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const q = req.query || {};
    const status = q.status && BRIEF_STATUSES.includes(q.status) ? q.status : null;
    const search = q.search ? String(q.search).slice(0, 200) : null;
    const limit  = q.limit  ? parseInt(q.limit, 10)  : 30;
    const offset = q.offset ? parseInt(q.offset, 10) : 0;

    const result = await listBriefs({ status, search, limit, offset });
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('[admin/briefs] error:', err);
    return res.status(500).json({ ok: false, error: 'Error al listar briefs' });
  }
}
