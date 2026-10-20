// /api/admin/seo/projects
//   GET  → lista de proyectos SEO con su estado de sincronización
//          { ok, projects, connected, configured, today }
//          connected = configured = el servidor tiene el acceso a Google
//          configurado (NO que funcione: eso lo dice el estado de cada
//          proyecto, sync_state / last_sync_status, y /api/admin/seo/diag).
//   POST → crea un proyecto SEO { name, client_name, ga4_property_id, gsc_site_url, domain, active }
//          Valida y normaliza los identificadores de Google (SEO-16):
//          400 { ok:false, error, fields:{ campo: 'mensaje' } } si algo no vale.
import { requireAdmin } from '../../../lib/auth.mjs';
import { listSeoProjects, createSeoProject, isConfigured } from '../../../lib/seo.mjs';
import { validateProjectFields } from '../../../lib/seo-core.mjs';
import { houstonDate } from '../../../lib/dates.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const projects = await listSeoProjects();
      const configured = isConfigured();
      return res.status(200).json({ ok: true, projects, connected: configured, configured, today: houstonDate() });
    } catch (err) {
      console.error('[admin/seo/projects GET] error:', err);
      return res.status(500).json({ ok: false, error: 'No se pudieron cargar los proyectos de SEO.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const v = validateProjectFields(body, { partial: false });
      if (!v.ok) {
        return res.status(400).json({ ok: false, error: v.errors.name || 'Revisa los campos marcados.', fields: v.errors });
      }
      const project = await createSeoProject({
        ...v.values,
        active: body.active,
      });
      console.log(`[admin/seo/projects POST] ${project.id} creado por ${session.email}`);
      return res.status(201).json({ ok: true, project });
    } catch (err) {
      console.error('[admin/seo/projects POST] error:', err);
      return res.status(500).json({ ok: false, error: 'No se pudo crear el proyecto.' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
