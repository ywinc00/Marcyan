// /api/admin/projects/:id/milestones   (id = projects.id, o el código PRJ-003)
//   GET    → lista de hitos del proyecto + progreso
//   POST   { label, stage?, status?, dueDate? }          → crea un hito al final
//   PATCH  { milestoneId, label?, dueDate?, status? }    → edita un hito (renombrar,
//          fecha: '' o null la quita, estado). Solo cambia lo que viene.
//          { order: [milestoneId, …] }                   → reordena TODOS los hitos
//          (la lista tiene que ser exactamente la del proyecto; si cambió, 409).
//          { stage, status }                             → compatibilidad: upsert por etapa.
//   DELETE ?milestoneId=  (o { milestoneId } en el cuerpo) → borra un hito.
// PATCH y DELETE comprueban que el hito sea DEL proyecto de la URL (OP-26,
// MOCK-07): un id de otro proyecto responde 404 sin tocar nada.
// Todas las escrituras devuelven { milestones, progress } actualizados.
// Protegida con requireAdmin.
import { requireAdmin } from '../../../../lib/auth.mjs';
import {
  getProject, listMilestones, projectProgress, parseProjectRef,
  createMilestone, upsertMilestone, updateMilestone, deleteMilestoneOf, reorderMilestones,
  normalizeMilestonePatch, ProjectInputError, MILESTONE_STATUSES, MAX_LABEL,
} from '../../../../lib/projects.mjs';

const ID_RE = /^\d{1,19}$/;

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const ref = (req.query?.id ?? '').toString().trim();
  if (!parseProjectRef(ref)) return res.status(400).json({ ok: false, error: 'Proyecto inválido' });

  let project;
  try {
    // Aseguramos que el proyecto existe antes de tocar sus hitos.
    project = await getProject(ref);
  } catch (err) {
    console.error('[admin/projects/:id/milestones] error:', err);
    return res.status(500).json({ ok: false, error: 'Error al leer el proyecto' });
  }
  if (!project) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
  const id = String(project.id);
  const body = (typeof req.body === 'object' && req.body) ? req.body : {};

  const withList = async (status, extra = {}) => {
    const milestones = await listMilestones(id);
    const progress = await projectProgress(id);
    return res.status(status).json({ ok: true, ...extra, milestones, progress });
  };
  const fail = (err, where, msg) => {
    if (err instanceof ProjectInputError) return res.status(err.status).json({ ok: false, error: err.message });
    console.error(`[admin/projects/:id/milestones ${where}] error:`, err);
    return res.status(500).json({ ok: false, error: msg });
  };

  if (req.method === 'GET') {
    try {
      return await withList(200);
    } catch (err) { return fail(err, 'GET', 'Error al listar hitos'); }
  }

  if (req.method === 'POST') {
    try {
      const label = typeof body.label === 'string' ? body.label.trim() : '';
      if (!label) return res.status(400).json({ ok: false, error: 'El hito necesita un nombre.' });
      if (label.length > MAX_LABEL) {
        return res.status(400).json({ ok: false, error: `El nombre del hito admite hasta ${MAX_LABEL} caracteres.` });
      }
      if (body.status && !MILESTONE_STATUSES.includes(body.status)) {
        return res.status(400).json({ ok: false, error: 'Elige un estado válido para el hito.' });
      }
      // Si trae `stage`, hacemos upsert (idempotente por etapa); si no, append.
      const milestone = body.stage
        ? await upsertMilestone(id, { stage: body.stage, label, status: body.status, dueDate: body.dueDate })
        : await createMilestone(id, { label, status: body.status, dueDate: body.dueDate });
      return await withList(201, { milestone });
    } catch (err) { return fail(err, 'POST', 'Error al crear hito'); }
  }

  if (req.method === 'PATCH') {
    try {
      // Reordenar
      if (body.order !== undefined) {
        await reorderMilestones(id, body.order);
        return await withList(200);
      }

      const milestoneId = (body.milestoneId ?? '').toString().trim();

      // Compatibilidad: { stage, status } sin milestoneId → upsert por etapa.
      if (!milestoneId && body.stage) {
        if (!MILESTONE_STATUSES.includes(body.status)) {
          return res.status(400).json({ ok: false, error: 'Elige un estado válido para el hito.' });
        }
        const milestone = await upsertMilestone(id, { stage: body.stage, label: body.label, status: body.status });
        return await withList(200, { milestone });
      }

      if (!ID_RE.test(milestoneId)) return res.status(400).json({ ok: false, error: 'Falta el hito a cambiar.' });
      const { fields, error } = normalizeMilestonePatch(body);
      if (error) return res.status(400).json({ ok: false, error });
      if (!Object.keys(fields).length) return res.status(400).json({ ok: false, error: 'No hay cambios que guardar.' });

      const milestone = await updateMilestone(id, milestoneId, fields);
      if (!milestone) return res.status(404).json({ ok: false, error: 'Ese hito no es de este proyecto o ya se borró.' });
      return await withList(200, { milestone });
    } catch (err) { return fail(err, 'PATCH', 'Error al actualizar hito'); }
  }

  if (req.method === 'DELETE') {
    try {
      const milestoneId = (req.query?.milestoneId ?? body.milestoneId ?? '').toString().trim();
      if (!ID_RE.test(milestoneId)) return res.status(400).json({ ok: false, error: 'Falta el hito a borrar.' });
      const ok = await deleteMilestoneOf(id, milestoneId);
      if (!ok) return res.status(404).json({ ok: false, error: 'Ese hito no es de este proyecto o ya se borró.' });
      console.log(`[admin/projects/:id/milestones DELETE] hito ${milestoneId} de ${id} borrado por ${session.email}`);
      return await withList(200, { deleted: milestoneId });
    } catch (err) { return fail(err, 'DELETE', 'Error al borrar hito'); }
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
