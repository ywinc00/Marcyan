// /api/admin/seo/projects/:id
//   GET ?days=7|28|90 (1..365)
//     → { ok, project, metrics, range, summary, today, connected, configured }
//       metrics: { gsc:[diario + resumen de búsquedas al final (compatibilidad)],
//                  ga4:[diario], indexation:{…}|null, top_queries:{…}|null }
//       range:   días que pinta el gráfico { startDate, endDate, days }
//       summary: { gsc:{ through, lag_days, current, previous|null }|null,
//                  ga4:{ through, current, previous|null }|null }
//                current/previous = totales de la ventana y de la anterior del
//                mismo tamaño (comparación real, SEO-13); posición media
//                ponderada por impresiones (SEO-19).
//   PATCH → actualiza campos (name, client_name, ga4_property_id, gsc_site_url,
//           domain, active) validados (SEO-16). Si cambia la propiedad de Search
//           Console o el ID de Analytics, borra las métricas guardadas de esa
//           fuente (SEO-06). → { ok, project, cleared:[fuentes] }
//   DELETE → elimina el proyecto (CASCADE borra sus métricas)
import { requireAdmin } from '../../../../lib/auth.mjs';
import {
  getSeoProject, updateSeoProject, deleteSeoProject, getMetrics, isConfigured,
  sourcesInvalidatedBy, clearProjectSources,
} from '../../../../lib/seo.mjs';
import {
  clampDays, lookbackDays, addDays, ymd, summarizeGsc, summarizeGa4, validateProjectFields, DEFAULT_DAYS,
} from '../../../../lib/seo-core.mjs';
import { houstonDate } from '../../../../lib/dates.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  // El id es BIGINT → @vercel/postgres lo devuelve como STRING. NO usar
  // parseInt: corrompe ids grandes (>2^53) → el WHERE no matchea → 404 →
  // el front borra el detalle y colapsa al placeholder. Validamos formato
  // y pasamos el string tal cual (la query parametrizada lo liga al BIGINT).
  const id = (req.query?.id ?? '').toString().trim();
  if (!id || !/^\d+$/.test(id)) {
    return res.status(400).json({ ok: false, error: 'ID inválido' });
  }

  if (req.method === 'GET') {
    try {
      const project = await getSeoProject(id);
      if (!project) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });

      const q = req.query || {};
      const days = q.days ? clampDays(q.days) : DEFAULT_DAYS;
      const today = houstonDate();
      // Se lee el rango y su período previo (más el retraso de Search Console).
      const wide = { startDate: addDays(today, -(lookbackDays(days) - 1)), endDate: today };
      const metrics = await getMetrics(id, wide);

      const srcs = (project.sync_state && project.sync_state.sources) || {};
      const daily = metrics.gsc.filter((r) => r.kind !== 'top_queries');
      const gsc = summarizeGsc(daily, { days, today, synced: srcs.gsc && srcs.gsc.range });
      const ga4 = summarizeGa4(metrics.ga4, { days, today, synced: srcs.ga4 && srcs.ga4.range });

      // El gráfico pinta la ventana actual y, detrás, los días que Google
      // todavía no publica (hasta ayer). Sin datos: los últimos `days`.
      const start = gsc ? gsc.current.start : addDays(today, -(days - 1));
      const end = addDays(today, -1);
      const inChart = (r) => { const d = ymd(r.date); return d >= start && d <= today; };
      const out = {
        ...metrics,
        gsc: metrics.gsc.filter((r) => r.kind === 'top_queries' || inChart(r)),
        ga4: ga4 ? metrics.ga4.filter((r) => { const d = ymd(r.date); return d >= ga4.current.start && d <= ga4.current.end; }) : [],
      };
      const configured = isConfigured();
      return res.status(200).json({
        ok: true, project, metrics: out,
        range: { startDate: start, endDate: end < start ? start : end, days },
        summary: { gsc, ga4 },
        today, connected: configured, configured,
      });
    } catch (err) {
      console.error('[admin/seo/projects/:id GET] error:', err);
      return res.status(500).json({ ok: false, error: 'No se pudieron cargar los datos del proyecto.' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const before = await getSeoProject(id);
      if (!before) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const v = validateProjectFields(body, { partial: true });
      if (!v.ok) {
        return res.status(400).json({ ok: false, error: v.errors.name || 'Revisa los campos marcados.', fields: v.errors });
      }
      let project = await updateSeoProject(id, v.values);
      const cleared = sourcesInvalidatedBy(before, project);
      if (cleared.length) {
        await clearProjectSources(id, cleared);
        project = await getSeoProject(id);
        console.log(`[admin/seo/projects/:id PATCH] ${id}: identificadores cambiados, datos borrados de ${cleared.join(', ')}`);
      }
      return res.status(200).json({ ok: true, project, cleared });
    } catch (err) {
      console.error('[admin/seo/projects/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'No se pudo guardar el proyecto.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const before = await getSeoProject(id);
      if (!before) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
      const ok = await deleteSeoProject(id);
      if (!ok) return res.status(500).json({ ok: false, error: 'No se pudo eliminar el proyecto.' });
      console.log(`[admin/seo/projects/:id DELETE] ${id} eliminado por ${session.email}`);
      return res.status(200).json({ ok: true, deleted: id });
    } catch (err) {
      console.error('[admin/seo/projects/:id DELETE] error:', err);
      return res.status(500).json({ ok: false, error: 'No se pudo eliminar el proyecto.' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
