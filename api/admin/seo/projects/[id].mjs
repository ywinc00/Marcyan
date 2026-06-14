// /api/admin/seo/projects/:id
//   GET    → proyecto + métricas cacheadas (GSC + GA4) en el rango pedido
//   PATCH  → actualiza campos del proyecto (name, ga4_property_id, gsc_site_url, …)
//   DELETE → elimina el proyecto (CASCADE borra sus métricas)
import { requireAdmin } from '../../../../lib/auth.mjs';
import {
  getSeoProject, updateSeoProject, deleteSeoProject, getMetrics,
  defaultRange, isConfigured,
} from '../../../../lib/seo.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const idRaw = (req.query?.id || '').toString();
  const id = parseInt(idRaw, 10);
  if (!idRaw || !Number.isFinite(id)) {
    return res.status(400).json({ ok: false, error: 'ID inválido' });
  }

  if (req.method === 'GET') {
    try {
      const project = await getSeoProject(id);
      if (!project) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });

      const q = req.query || {};
      const days = q.days ? Math.min(Math.max(parseInt(q.days, 10) || 28, 1), 365) : 28;
      const range = defaultRange(days);
      const metrics = await getMetrics(id, range);
      return res.status(200).json({ ok: true, project, metrics, range, connected: isConfigured() });
    } catch (err) {
      console.error('[admin/seo/projects/:id GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al obtener proyecto SEO' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const before = await getSeoProject(id);
      if (!before) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const project = await updateSeoProject(id, body);
      return res.status(200).json({ ok: true, project });
    } catch (err) {
      console.error('[admin/seo/projects/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: err.message || 'Error al actualizar proyecto SEO' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const before = await getSeoProject(id);
      if (!before) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
      const ok = await deleteSeoProject(id);
      if (!ok) return res.status(500).json({ ok: false, error: 'No se pudo eliminar' });
      console.log(`[admin/seo/projects/:id DELETE] ${id} eliminado por ${session.email}`);
      return res.status(200).json({ ok: true, deleted: id });
    } catch (err) {
      console.error('[admin/seo/projects/:id DELETE] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al eliminar proyecto SEO' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
