// ════════════════════════════════════════════════════════════════
//  GET /api/cron/brief-cleanup — limpieza diaria (cron de Vercel, vercel.json)
//  Autorización: header Authorization: Bearer <CRON_SECRET> (Vercel lo
//  manda solo en sus crons). Sin el secreto configurado no hace nada.
//    1) Borradores sin enviar y caducados (brief: 48 h · kit: 30 días) y sus
//       blobs; conserva lo ya enlazado a un brief.
//    2) Verificación de tipo real de archivos pendientes (si la del envío no
//       terminó a tiempo).
//    3) Ventanas viejas del límite de envíos (más de 2 días).
//  Cada paso es independiente: si uno falla, los demás siguen.
// ════════════════════════════════════════════════════════════════
import { cleanupExpiredDrafts, verifyPendingFiles, blobConfigured, isMissingSchema } from '../../lib/brief-files.mjs';
import { purgeOldHits } from '../../lib/ratelimit.mjs';

function bearerOk(req) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(h).trim());
  return Boolean(m && m[1].trim() === secret);
}

async function step(name, fn) {
  try {
    return { ok: true, ...(await fn()) };
  } catch (err) {
    const why = isMissingSchema(err) ? 'migración 010 sin aplicar' : (err && err.message);
    console.error(`[cron/brief-cleanup] ${name} falló:`, why);
    return { ok: false, error: why };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!bearerOk(req)) return res.status(401).json({ ok: false, error: 'No autorizado' });

  const blob = blobConfigured();
  const drafts = blob ? await step('borradores', () => cleanupExpiredDrafts({ limit: 50 })) : { ok: false, error: 'almacén no configurado' };
  const verify = blob ? await step('verificación', () => verifyPendingFiles({ limit: 40 })) : { ok: false, error: 'almacén no configurado' };
  const hits = await step('límite de envíos', async () => ({ deleted: await purgeOldHits() }));

  console.log(`[cron/brief-cleanup] borradores=${drafts.drafts ?? '-'} blobs=${drafts.blobs ?? '-'} verificados=${verify.verified ?? '-'} rechazados=${verify.rejected ?? '-'} ventanas=${hits.deleted ?? '-'}`);
  return res.status(200).json({ ok: drafts.ok && verify.ok && hits.ok, drafts, verify, hits });
}
