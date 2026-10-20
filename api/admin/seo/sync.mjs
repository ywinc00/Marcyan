// POST /api/admin/seo/sync
//   Sincroniza métricas de Google (Search Console, Analytics e indexación)
//   hacia seo_metrics y guarda el estado por fuente (SEO-07).
//   Body opcional: { id?: string, days?: number }
//     · id presente  → sincroniza solo ese proyecto ("Actualizar ahora")
//     · sin id        → todos los proyectos activos, por lotes y con tope de
//                       tiempo (los que no caben vuelven en `skipped`)
//     · days          → rango que se quiere ver (7, 28, 90…); se pide a Google
//                       ese rango y su período previo para la comparación.
//   Autorización (cualquiera de las dos):
//     · sesión de admin (cookie): uso desde el panel
//     · Authorization: Bearer <CRON_SECRET> (compatibilidad; el cron diario
//       usa GET /api/cron/seo-sync)
//   Respuesta: { ok, configured, error, results:[…], skipped:[…] }
//     results[i] = { project_id, name, ok, status: ok|partial|error, error,
//                    gsc|ga4|indexation:{ synced, error }, sources:{…}, sync_state, persisted }
//   Los errores de Google llegan explicados en español (lib/seo-core.mjs).
import { requireAdmin, safeEqual } from '../../../lib/auth.mjs';
import { getSeoProject, syncProject, syncActiveProjects, isConfigured, setOidcToken, GOOGLE_PROJECT_WORST_MS } from '../../../lib/seo.mjs';
import { clampDays, DEFAULT_DAYS } from '../../../lib/seo-core.mjs';

// Una sincronización de un proyecto encadena 4 o 5 llamadas a Google en
// paralelo y 3 escrituras. Cada llamada tiene 15 s de tope (A6-R4), así que
// un proyecto tarda como mucho GOOGLE_PROJECT_WORST_MS (60 s). La de todos va
// por lotes y no empieza un proyecto nuevo pasado BULK_BUDGET_MS: entre ese
// tope y maxDuration cabe un proyecto entero en el peor caso, más margen
// para guardar.
export const config = { maxDuration: 120 };
const BULK_BUDGET_MS = 120000 - GOOGLE_PROJECT_WORST_MS - 10000;

function bearerOk(req) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const h = req.headers['authorization'] || req.headers['Authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(h).trim());
  // Comparación en tiempo constante (no revela cuántos caracteres coinciden).
  return Boolean(m && safeEqual(m[1].trim(), secret));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Cron (Bearer): corta antes de requireAdmin para no exigir cookie.
  const isCron = bearerOk(req);
  let actor = 'cron';
  if (!isCron) {
    // Camino de admin: requireAdmin gestiona el 401 y renueva la cookie.
    const session = await requireAdmin(req, res);
    if (!session) return;
    actor = session.email;
  }

  // En runtime, Vercel entrega el token OIDC como header (no como env var);
  // se lo pasamos a lib/seo para el intercambio WIF de esta invocación.
  setOidcToken(req.headers['x-vercel-oidc-token']);

  try {
    const body = (typeof req.body === 'object' && req.body) ? req.body : {};
    const days = body.days ? clampDays(body.days) : DEFAULT_DAYS;
    const trigger = isCron ? 'cron' : 'manual';

    let results;
    let skipped = [];
    if (body.id != null && body.id !== '') {
      // id BIGINT → string (ver nota en projects/[id].mjs); parseInt corrompía ids grandes.
      const id = String(body.id).trim();
      if (!/^\d+$/.test(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
      const project = await getSeoProject(id);
      if (!project) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
      results = [await syncProject(project, days, { trigger })];
    } else {
      ({ results, skipped } = await syncActiveProjects({ days, trigger, concurrency: 3, budgetMs: BULK_BUDGET_MS }));
    }

    const configured = isConfigured();
    const ok = configured && results.every((r) => r.ok) && skipped.length === 0;
    // Los errores por proyecto viajan en el cuerpo y quedan guardados en
    // sync_state; aquí solo el código, para los logs de Vercel.
    for (const r of results) {
      if (r && !r.ok) {
        const code = (k) => (r.sources && r.sources[k] && r.sources[k].error && r.sources[k].error.code) || r.sources?.[k]?.status || '-';
        console.error(`[admin/seo/sync] proyecto ${r.project_id} (${r.name || '?'}) ${r.status}: gsc=${code('gsc')} ga4=${code('ga4')} indexación=${code('indexation')}`);
      }
    }
    console.log(`[admin/seo/sync] ${results.length} proyecto(s) por ${actor}; configurado=${configured} ok=${ok} pendientes=${skipped.length}`);
    return res.status(200).json({
      ok,
      configured,
      error: configured ? null : 'El acceso a Google no está configurado en el servidor.',
      results,
      skipped,
    });
  } catch (err) {
    console.error('[admin/seo/sync] error:', err);
    return res.status(500).json({ ok: false, error: 'No se pudo sincronizar. Inténtalo de nuevo en un momento.' });
  }
}
