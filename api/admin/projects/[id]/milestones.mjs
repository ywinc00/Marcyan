// /api/admin/projects/:id/milestones   (id = projects.id numérico)
//   GET   → lista de hitos del proyecto + progreso
//   POST  { label, stage?, status?, dueDate? }            → crea un hito al final
//   PATCH { milestoneId, status }                          → cambia el estado de un hito
//         (también acepta { milestoneId, label } / { stage, status } vía upsert)
// Protegida con requireAdmin.
import { requireAdmin } from '../../../../lib/auth.mjs';
import {
  getProject, listMilestones, projectProgress,
  createMilestone, upsertMilestone, updateMilestoneStatus,
  MILESTONE_STATUSES,
} from '../../../../lib/projects.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const id = parseInt((req.query?.id || '').toString(), 10);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'ID de proyecto inválido' });

  // Aseguramos que el proyecto existe antes de tocar sus hitos.
  const project = await getProject(id);
  if (!project) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });

  if (req.method === 'GET') {
    try {
      const milestones = await listMilestones(id);
      const progress = await projectProgress(id);
      return res.status(200).json({ ok: true, milestones, progress });
    } catch (err) {
      console.error('[admin/projects/:id/milestones GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al listar hitos' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const label = typeof body.label === 'string' ? body.label.trim() : '';
      if (!label) return res.status(400).json({ ok: false, error: 'La etiqueta es requerida' });
      if (body.status && !MILESTONE_STATUSES.includes(body.status)) {
        return res.status(400).json({
          ok: false,
          error: `Status debe ser uno de: ${MILESTONE_STATUSES.join(', ')}`,
        });
      }
      // Si trae `stage`, hacemos upsert (idempotente por etapa); si no, append.
      const milestone = body.stage
        ? await upsertMilestone(id, { stage: body.stage, label, status: body.status, dueDate: body.dueDate })
        : await createMilestone(id, { label, status: body.status, dueDate: body.dueDate });
      const progress = await projectProgress(id);
      return res.status(201).json({ ok: true, milestone, progress });
    } catch (err) {
      console.error('[admin/projects/:id/milestones POST] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al crear hito' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const milestoneId = parseInt(body.milestoneId, 10);
      if (!Number.isFinite(milestoneId)) {
        return res.status(400).json({ ok: false, error: 'milestoneId requerido' });
      }
      const newStatus = typeof body.status === 'string' ? body.status.trim() : null;
      if (!newStatus || !MILESTONE_STATUSES.includes(newStatus)) {
        return res.status(400).json({
          ok: false,
          error: `Status debe ser uno de: ${MILESTONE_STATUSES.join(', ')}`,
        });
      }
      const updated = await updateMilestoneStatus(milestoneId, newStatus);
      if (!updated) return res.status(404).json({ ok: false, error: 'Hito no encontrado' });
      const milestones = await listMilestones(id);
      const progress = await projectProgress(id);
      return res.status(200).json({ ok: true, milestone: updated, milestones, progress });
    } catch (err) {
      console.error('[admin/projects/:id/milestones PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al actualizar hito' });
    }
  }

  res.setHeader('Allow', 'GET, POST, PATCH');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
