// /api/admin/briefs/:id
//   GET   → detalle completo del brief
//   PATCH → { status?, summary? } actualiza estado y/o resumen
import { requireAdmin } from '../../../lib/auth.mjs';
import {
  getBriefByProjectId, updateBriefStatus, updateBriefSummary,
  logEvent, BRIEF_STATUSES,
} from '../../../lib/db.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const id = (req.query?.id || '').toString();
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });

  if (req.method === 'GET') {
    try {
      const brief = await getBriefByProjectId(id);
      if (!brief) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });
      return res.status(200).json({ ok: true, brief });
    } catch (err) {
      console.error('[admin/briefs/:id GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al obtener brief' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const newStatus  = typeof body.status  === 'string' ? body.status.trim()  : null;
      const newSummary = typeof body.summary === 'string' ? body.summary        : null;

      if (newStatus !== null && !BRIEF_STATUSES.includes(newStatus)) {
        return res.status(400).json({
          ok: false,
          error: `Status debe ser uno de: ${BRIEF_STATUSES.join(', ')}`,
        });
      }

      const before = await getBriefByProjectId(id);
      if (!before) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });

      const changes = {};
      if (newStatus !== null && newStatus !== before.status) {
        await updateBriefStatus(id, newStatus, session.email);
        changes.status = { from: before.status, to: newStatus };
        await logEvent({
          projectId: id,
          type: 'status_changed',
          actorEmail: session.email,
          data: { from: before.status, to: newStatus },
        });
      }

      if (newSummary !== null && newSummary !== (before.summary || '')) {
        await updateBriefSummary(id, newSummary);
        changes.summary = { len: newSummary.length };
        await logEvent({
          projectId: id,
          type: 'summary_updated',
          actorEmail: session.email,
          data: { length: newSummary.length },
        });
      }

      const after = await getBriefByProjectId(id);
      return res.status(200).json({ ok: true, brief: after, changes });
    } catch (err) {
      console.error('[admin/briefs/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al actualizar brief' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
