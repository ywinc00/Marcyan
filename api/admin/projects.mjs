// /api/admin/projects
//   GET  ?status=&search=&limit=50&offset=0  → lista con progreso (% por hitos)
//        + summary GLOBAL (conteo por estado y cartera de activos), que no
//        depende del filtro ni de la página (OP-11).
//   POST { name, clientId?, briefProjectId?, serviceType?, agreedAmountCents?, status? }
//        → crea proyecto + siembra hitos por defecto.
//        clientId o brief inexistentes → 400 con mensaje claro (CRM-05, OP-09).
//        Cliente archivado → 409 en texto llano (revisión int1, F2).
//        Sin clientId y con brief: el cliente de ese brief (su ficha) o uno
//        nuevo con sus datos; si ya hay un cliente con su correo o teléfono →
//        409 { reason: 'duplicate', matches } y se repite con
//        allow_duplicate: true para crearlo igualmente (revisión int1, F1).
// Protegida con requireAdmin.
import { requireAdmin } from '../../lib/auth.mjs';
import { listProjects, createProject, PROJECT_STATUSES, ProjectInputError } from '../../lib/projects.mjs';
import { CrmError } from '../../lib/finance.mjs';

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
        return res.status(400).json({ ok: false, error: 'Elige un estado válido para el proyecto.' });
      }
      const project = await createProject({
        name,
        clientId: body.clientId,
        briefProjectId: body.briefProjectId,
        serviceType: body.serviceType,
        agreedAmountCents: body.agreedAmountCents,
        status: body.status,
        actorEmail: session.email,
        allowDuplicate: body.allow_duplicate === true,
      });
      console.log(`[admin/projects POST] proyecto ${project?.id} creado por ${session.email}`);
      return res.status(201).json({ ok: true, project });
    } catch (err) {
      if (err instanceof ProjectInputError) {
        return res.status(err.status).json({ ok: false, error: err.message });
      }
      if (err instanceof CrmError) return res.status(err.status).json({ ok: false, error: err.message, ...err.extra });
      console.error('[admin/projects POST] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al crear proyecto' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
