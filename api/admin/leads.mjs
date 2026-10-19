// GET /api/admin/leads?status=...&source=...&search=...&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=30&offset=0
// Lista paginada de leads con filtros. Protegida con requireAdmin.
// La lista NO trae IP ni navegador (solo la ficha /api/admin/leads/:id).
// source/from/to son opcionales (from/to en hora de Houston, inclusivos).
import { requireAdmin } from '../../lib/auth.mjs';
import { listLeads, leadStats, LEAD_STATUSES, LEAD_SOURCES } from '../../lib/leads.mjs';

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
    const source = q.source && LEAD_SOURCES.includes(q.source) ? q.source : null;
    const search = q.search ? String(q.search).slice(0, 200) : null;
    const from   = q.from ? String(q.from).slice(0, 40) : null;
    const to     = q.to   ? String(q.to).slice(0, 40)   : null;
    const limit  = q.limit  ? parseInt(q.limit, 10)  : 30;
    const offset = q.offset ? parseInt(q.offset, 10) : 0;

    const [result, stats] = await Promise.all([
      listLeads({ status, source, search, from, to, limit, offset }),
      leadStats(),
    ]);
    return res.status(200).json({ ok: true, ...result, stats });
  } catch (err) {
    console.error('[admin/leads] error:', err);
    return res.status(500).json({ ok: false, error: 'Error al listar leads' });
  }
}
