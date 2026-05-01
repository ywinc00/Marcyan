// GET /api/admin/briefs/:id/events
// Devuelve el audit log de un brief (más reciente primero).
import { requireAdmin } from '../../../../lib/auth.mjs';
import { listEvents, getBriefByProjectId } from '../../../../lib/db.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const session = await requireAdmin(req, res);
  if (!session) return;

  const id = (req.query?.id || '').toString();
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });

  try {
    const brief = await getBriefByProjectId(id);
    if (!brief) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });

    const events = await listEvents(id, 100);
    return res.status(200).json({ ok: true, events });
  } catch (err) {
    console.error('[admin/briefs/:id/events] error:', err);
    return res.status(500).json({ ok: false, error: 'Error al obtener eventos' });
  }
}
