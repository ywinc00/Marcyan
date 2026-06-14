// /api/admin/leads/:id   (id = ref_id LEAD-XXX)
//   GET    → detalle del lead
//   PATCH  → { status } actualiza el estado
//   DELETE → elimina el lead
import { requireAdmin } from '../../../lib/auth.mjs';
import {
  getLeadByRefId, updateLeadStatus, deleteLead, LEAD_STATUSES,
} from '../../../lib/leads.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const id = (req.query?.id || '').toString();
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });

  if (req.method === 'GET') {
    try {
      const lead = await getLeadByRefId(id);
      if (!lead) return res.status(404).json({ ok: false, error: 'Lead no encontrado' });
      return res.status(200).json({ ok: true, lead });
    } catch (err) {
      console.error('[admin/leads/:id GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al obtener lead' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const newStatus = typeof body.status === 'string' ? body.status.trim() : null;
      if (!newStatus || !LEAD_STATUSES.includes(newStatus)) {
        return res.status(400).json({
          ok: false,
          error: `Status debe ser uno de: ${LEAD_STATUSES.join(', ')}`,
        });
      }
      const updated = await updateLeadStatus(id, newStatus);
      if (!updated) return res.status(404).json({ ok: false, error: 'Lead no encontrado' });
      const lead = await getLeadByRefId(id);
      return res.status(200).json({ ok: true, lead });
    } catch (err) {
      console.error('[admin/leads/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al actualizar lead' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const before = await getLeadByRefId(id);
      if (!before) return res.status(404).json({ ok: false, error: 'Lead no encontrado' });
      const ok = await deleteLead(id);
      if (!ok) return res.status(500).json({ ok: false, error: 'No se pudo eliminar' });
      console.log(`[admin/leads/:id DELETE] ${id} eliminado por ${session.email}`);
      return res.status(200).json({ ok: true, deleted: id });
    } catch (err) {
      console.error('[admin/leads/:id DELETE] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al eliminar lead' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
