// GET /api/admin/leads?status=...&search=...&limit=30&offset=0
// Lista paginada de leads con filtros. Protegida con requireAdmin.
import { requireAdmin } from '../../lib/auth.mjs';
import { listLeads, leadStats, LEAD_STATUSES } from '../../lib/leads.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const q = req.query || {};
    const status = q.status && LEAD_STATUSES.includes(q.status) ? q.status : null;
    const search = q.search ? String(q.search).slice(0, 200) : null;
    const limit  = q.limit  ? parseInt(q.limit, 10)  : 30;
    const offset = q.offset ? parseInt(q.offset, 10) : 0;

    const result = await listLeads({ status, search, limit, offset });
    const stats  = await leadStats();
    return res.status(200).json({ ok: true, ...result, stats });
  } catch (err) {
    console.error('[admin/leads] error:', err);
    return res.status(500).json({ ok: false, error: 'Error al listar leads' });
  }
}
