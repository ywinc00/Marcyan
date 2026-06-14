// /api/admin/projects/:id   (id = projects.id numérico)
//   GET   → { project, milestones, progress }
//   PATCH → { status?, name?, serviceType?, agreedAmountCents? } actualiza el proyecto
// Protegida con requireAdmin.
import { requireAdmin } from '../../../lib/auth.mjs';
import { sql } from '@vercel/postgres';
import {
  getProject, listMilestones, projectProgress, PROJECT_STATUSES,
} from '../../../lib/projects.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const id = parseInt((req.query?.id || '').toString(), 10);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });

  if (req.method === 'GET') {
    try {
      const project = await getProject(id);
      if (!project) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
      const milestones = await listMilestones(id);
      const progress = await projectProgress(id);
      return res.status(200).json({ ok: true, project, milestones, progress });
    } catch (err) {
      console.error('[admin/projects/:id GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al obtener proyecto' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const before = await getProject(id);
      if (!before) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });

      const body = (typeof req.body === 'object' && req.body) ? req.body : {};

      // Validación de status (si viene)
      const newStatus = typeof body.status === 'string' ? body.status.trim() : null;
      if (newStatus && !PROJECT_STATUSES.includes(newStatus)) {
        return res.status(400).json({
          ok: false,
          error: `Status debe ser uno de: ${PROJECT_STATUSES.join(', ')}`,
        });
      }

      // Resolvemos cada columna editable: si la clave no vino, conservamos el valor previo.
      const name = typeof body.name === 'string' && body.name.trim()
        ? body.name.trim() : before.name;
      const serviceType = body.serviceType !== undefined
        ? (body.serviceType ? String(body.serviceType).trim() : null)
        : before.service_type;
      const status = newStatus || before.status;
      let cents = before.agreed_amount_cents;
      if (body.agreedAmountCents !== undefined) {
        cents = body.agreedAmountCents == null || body.agreedAmountCents === ''
          ? null
          : Math.max(0, Math.round(Number(body.agreedAmountCents)) || 0);
      }

      // completed_at: lo seteamos al pasar a 'completed', lo limpiamos si sale de ahí.
      const r = await sql`
        UPDATE projects
           SET name = ${name},
               service_type = ${serviceType},
               agreed_amount_cents = ${cents},
               status = ${status},
               completed_at = CASE
                 WHEN ${status} = 'completed' THEN COALESCE(completed_at, CURRENT_DATE)
                 ELSE NULL
               END
         WHERE id = ${id}
        RETURNING id`;
      if (!r.rowCount) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });

      const project = await getProject(id);
      const milestones = await listMilestones(id);
      const progress = await projectProgress(id);
      return res.status(200).json({ ok: true, project, milestones, progress });
    } catch (err) {
      console.error('[admin/projects/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al actualizar proyecto' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
