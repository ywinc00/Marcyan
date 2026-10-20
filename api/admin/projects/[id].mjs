// /api/admin/projects/:id   (id = projects.id BIGINT, o el código visible PRJ-003)
//   GET    → { project, milestones, progress }
//            project trae además client_code e invoices_count (facturas vinculadas).
//   PATCH  → { status?, name?, serviceType?, agreedAmountCents?, clientId?, briefProjectId? }
//            · agreedAmountCents '' o null = $0 (antes reventaba con 500, MOCK-06).
//            · clientId tiene que existir; briefProjectId '' o null desvincula,
//              y si viene tiene que existir (400 con mensaje claro, OP-09).
//            · started_at se fija al pasar a activo (OP-08); fechas en hora de Houston.
//   DELETE → elimina el proyecto y sus hitos (sus facturas quedan sin proyecto:
//            invoices.project_id es ON DELETE SET NULL). Responde unlinked_invoices.
// Protegida con requireAdmin.
import { requireAdmin } from '../../../lib/auth.mjs';
import {
  getProject, listMilestones, projectProgress, deleteProject, updateProject,
  normalizeProjectPatch, parseProjectRef, ProjectInputError,
} from '../../../lib/projects.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  // El id es BIGINT → @vercel/postgres lo devuelve como STRING. NO usar parseInt:
  // corrompe ids grandes (>2^53) → el WHERE no matchea → 404. Validamos formato y
  // pasamos el string tal cual (la query parametrizada lo liga al BIGINT).
  const id = (req.query?.id ?? '').toString().trim();
  if (!parseProjectRef(id)) {
    return res.status(400).json({ ok: false, error: 'Proyecto inválido' });
  }

  if (req.method === 'GET') {
    try {
      const project = await getProject(id);
      if (!project) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
      const milestones = await listMilestones(project.id);
      const progress = await projectProgress(project.id);
      return res.status(200).json({ ok: true, project, milestones, progress });
    } catch (err) {
      console.error('[admin/projects/:id GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al obtener proyecto' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const { fields, error } = normalizeProjectPatch(body);
      if (error) return res.status(400).json({ ok: false, error });

      const project = await updateProject(id, fields);
      if (!project) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
      const milestones = await listMilestones(project.id);
      const progress = await projectProgress(project.id);
      return res.status(200).json({ ok: true, project, milestones, progress });
    } catch (err) {
      if (err instanceof ProjectInputError) {
        return res.status(err.status).json({ ok: false, error: err.message });
      }
      console.error('[admin/projects/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al actualizar proyecto' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const before = await getProject(id);
      if (!before) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
      const ok = await deleteProject(before.id);
      if (!ok) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
      console.log(`[admin/projects/:id DELETE] ${before.id} eliminado por ${session.email}`);
      return res.status(200).json({
        ok: true, deleted: String(before.id), unlinked_invoices: before.invoices_count || 0,
      });
    } catch (err) {
      console.error('[admin/projects/:id DELETE] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al eliminar proyecto' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
