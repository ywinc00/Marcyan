// ════════════════════════════════════════════════════════════════
//  GET /api/cron/seo-sync — sincronización diaria de SEO (cron de Vercel)
//  Horario en vercel.json: 09:00 UTC = 3:00 a. m. en Houston con horario de
//  invierno y 4:00 a. m. con el de verano (de madrugada, antes de las rutinas
//  de indexación de las 9:05 de Houston).
//  Autorización: Authorization: Bearer <CRON_SECRET> (Vercel lo manda solo en
//  sus crons), comparado en tiempo constante. Sin el secreto no hace nada.
//  Qué hace: sincroniza TODOS los proyectos SEO activos (SEO-04), por lotes
//  de 3 en paralelo, primero los que llevan más tiempo sin intentarse, y no
//  empieza ninguno nuevo pasados 230 s (maxDuration 300 de api/cron/* en
//  vercel.json, menos el peor caso de un proyecto). Trae 90 días y su período previo para que cualquier rango de
//  la interfaz (7, 28, 90) tenga datos y comparación. El resultado de cada
//  proyecto, con su error en español si lo hubo, queda guardado en
//  seo_projects.sync_state y se ve en el panel (SEO-07).
// ════════════════════════════════════════════════════════════════
import { safeEqual } from '../../lib/auth.mjs';
import { syncActiveProjects, isConfigured, setOidcToken, GOOGLE_PROJECT_WORST_MS } from '../../lib/seo.mjs';
import { CRON_DAYS } from '../../lib/seo-core.mjs';
import { notifySeoSyncFailures, notifySeoSyncCrash } from '../../lib/notifications.mjs';

// No se empieza un proyecto nuevo cuando ya no cabe entero en el peor caso
// (cada llamada a Google tiene 15 s de tope, A6-R4) antes de los 300 s.
const CRON_BUDGET_MS = 300000 - GOOGLE_PROJECT_WORST_MS - 10000;

function bearerOk(req) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(h).trim());
  return Boolean(m && safeEqual(m[1].trim(), secret));
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!bearerOk(req)) return res.status(401).json({ ok: false, error: 'No autorizado' });

  // Token OIDC de Vercel de esta invocación (para el acceso sin clave a Google).
  setOidcToken(req.headers['x-vercel-oidc-token']);

  try {
    const started = Date.now();
    const { results, skipped } = await syncActiveProjects({ days: CRON_DAYS, trigger: 'cron', concurrency: 3, budgetMs: CRON_BUDGET_MS });
    const count = (s) => results.filter((r) => r.status === s).length;
    const summary = {
      ok: count('ok'), partial: count('partial'), error: count('error'), skipped: skipped.length,
      ms: Date.now() - started, configured: isConfigured(),
    };
    for (const r of results) {
      if (!r.ok) console.error(`[cron/seo-sync] ${r.project_id} (${r.name || '?'}) ${r.status}: ${(r.error_detail && r.error_detail.code) || '-'}`);
    }
    console.log(`[cron/seo-sync] bien=${summary.ok} parcial=${summary.partial} fallo=${summary.error} pendientes=${summary.skipped} ${summary.ms} ms`);
    // Un aviso en el panel por proyecto que falló (deduplicado; nunca rompe la respuesta).
    await notifySeoSyncFailures(results);
    return res.status(200).json({
      ok: summary.error === 0 && summary.partial === 0 && skipped.length === 0,
      summary,
      results: results.map((r) => ({ project_id: r.project_id, name: r.name, status: r.status, error: r.error })),
      skipped,
    });
  } catch (err) {
    console.error('[cron/seo-sync] error:', err && err.message);
    try { await notifySeoSyncCrash(); } catch (e) { console.error('[cron/seo-sync] aviso no creado:', e && e.message); }
    return res.status(500).json({ ok: false, error: 'La sincronización diaria falló.' });
  }
}
