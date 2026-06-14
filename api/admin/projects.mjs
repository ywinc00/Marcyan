// /api/admin/projects
//   GET  ?status=&search=&limit=50&offset=0  → lista con progreso (% por hitos)
//   POST { name, clientId?, briefProjectId?, serviceType?, agreedAmountCents?, status? }
//        → crea proyecto + siembra hitos por defecto
// Protegida con requireAdmin.
import { requireAdmin } from '../../lib/auth.mjs';
import { listProjects, createProject, PROJECT_STATUSES } from '../../lib/projects.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const q = req.query || {};
      const status = q.status && PROJECT_STATUSES.includes(q.status) ? q.status : null;
      const search = q.search ? String(q.search).slice(0, 200) : null;
      const limit  = q.limit  ? parseInt(q.limit, 10)  : 50;
      const offset = q.offset ? parseInt(q.offset, 10) : 0;

      const result = await listProjects({ status, search, limit, offset });
      return res.status(200).json({ ok: true, ...result });
    } catch (err) {
      console.error('[admin/projects GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al listar proyectos' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) return res.status(400).json({ ok: false, error: 'El nombre es requerido' });
      if (body.status && !PROJECT_STATUSES.includes(body.status)) {
        return res.status(400).json({
          ok: false,
          error: `Status debe ser uno de: ${PROJECT_STATUSES.join(', ')}`,
        });
      }
      const project = await createProject({
        name,
        clientId: body.clientId,
        briefProjectId: body.briefProjectId,
        serviceType: body.serviceType,
        agreedAmountCents: body.agreedAmountCents,
        status: body.status,
      });
      console.log(`[admin/projects POST] proyecto ${project?.id} creado por ${session.email}`);
      return res.status(201).json({ ok: true, project });
    } catch (err) {
      console.error('[admin/projects POST] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al crear proyecto' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
