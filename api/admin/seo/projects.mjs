// /api/admin/seo/projects
//   GET  → lista de proyectos SEO (+ estado de conexión a Google)
//   POST → crea un proyecto SEO { name, client_name, ga4_property_id, gsc_site_url, domain, active }
import { requireAdmin } from '../../../lib/auth.mjs';
import { listSeoProjects, createSeoProject, isConfigured } from '../../../lib/seo.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const projects = await listSeoProjects();
      return res.status(200).json({ ok: true, projects, connected: isConfigured() });
    } catch (err) {
      console.error('[admin/seo/projects GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al listar proyectos SEO' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) return res.status(400).json({ ok: false, error: 'El nombre del proyecto es obligatorio' });

      const project = await createSeoProject({
        name,
        client_name: body.client_name,
        ga4_property_id: body.ga4_property_id,
        gsc_site_url: body.gsc_site_url,
        domain: body.domain,
        active: body.active,
      });
      console.log(`[admin/seo/projects POST] ${project.id} creado por ${session.email}`);
      return res.status(201).json({ ok: true, project });
    } catch (err) {
      console.error('[admin/seo/projects POST] error:', err);
      return res.status(500).json({ ok: false, error: err.message || 'Error al crear proyecto SEO' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
