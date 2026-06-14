// POST /api/admin/seo/sync
//   Sincroniza métricas de Google (GSC + GA4) hacia seo_metrics.
//   Body opcional: { id?: number, days?: number }
//     · id presente  → sincroniza solo ese proyecto
//     · sin id        → sincroniza todos los proyectos activos
//   Autorización (cualquiera de las dos):
//     · sesión de admin (cookie) — uso desde el dashboard ("Actualizar ahora")
//     · header Authorization: Bearer <CRON_SECRET> — uso desde el cron de Vercel
//   Degrada con gracia: si falta la config WIF, responde ok:false con
//   error 'not_configured' por proyecto, sin romper.
import { requireAdmin, readCookie, getSession } from '../../../lib/auth.mjs';
import { getSeoProject, syncProject, syncAll, isConfigured, setOidcToken } from '../../../lib/seo.mjs';

function bearerOk(req) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const h = req.headers['authorization'] || req.headers['Authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(h).trim());
  return Boolean(m && m[1].trim() === secret);
}

async function sessionOk(req) {
  const sid = readCookie(req);
  if (!sid) return false;
  const s = await getSession(sid);
  return Boolean(s);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Cron (Bearer) — corta antes de requireAdmin para no exigir cookie.
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
    const days = body.days ? Math.min(Math.max(parseInt(body.days, 10) || 28, 1), 365) : 28;

    let results;
    if (body.id != null && body.id !== '') {
      const id = parseInt(body.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
      const project = await getSeoProject(id);
      if (!project) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
      results = [await syncProject(project, days)];
    } else {
      results = await syncAll(days);
    }

    const configured = isConfigured();
    const ok = configured && results.every((r) => r.ok);
    console.log(`[admin/seo/sync] ${results.length} proyecto(s) por ${actor} — configured=${configured}`);
    return res.status(200).json({
      ok,
      configured,
      error: configured ? null : 'Google no conectado (Workload Identity Federation)',
      results,
    });
  } catch (err) {
    console.error('[admin/seo/sync] error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Error al sincronizar' });
  }
}
