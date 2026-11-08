// ════════════════════════════════════════════════════════════════
//  GET /api/cron/mail — Marcy revisa el buzón (cron de Vercel cada 10 min)
//  Producción: header Authorization: Bearer <CRON_SECRET> (lo manda Vercel).
//  Vista previa: SOLO prueba en seco (no toca Gmail ni la base) con el header
//  x-mail-test igual a MAIL_TEST_TOKEN, una variable que solo existe en la
//  vista previa de esta rama mientras se prueba.
// ════════════════════════════════════════════════════════════════
import { runMailPass } from '../../lib/mail-pass.mjs';
import { setOidcToken } from '../../lib/gmail.mjs';
import { safeEqual } from '../../lib/auth.mjs';

function bearerOk(req) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const m = /^Bearer\s+(.+)$/i.exec(String(req.headers['authorization'] || '').trim());
  return Boolean(m && safeEqual(m[1].trim(), secret));
}

function previewTestOk(req) {
  if (process.env.VERCEL_ENV !== 'preview') return false;
  const t = (process.env.MAIL_TEST_TOKEN || '').trim();
  const h = String(req.headers['x-mail-test'] || '').trim();
  return t.length >= 32 && safeEqual(h, t);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  const prod = bearerOk(req);
  const test = !prod && previewTestOk(req);
  if (!prod && !test) return res.status(401).json({ ok: false, error: 'No autorizado' });
  if (prod && process.env.VERCEL_ENV !== 'production') return res.status(200).json({ ok: true, skipped: 'solo en producción' });

  setOidcToken(req.headers['x-vercel-oidc-token']);
  const started = Date.now();
  try {
    const items = await runMailPass({ dryRun: test, deadline: started + 240000 });
    const resumen = items.map((r) => ({
      categoria: r.category, hoy: r.urgent, automatico: r.automated, borrador: r.wantDraft, acuse: r.wantAck,
      dominio: (r.from_email || '').split('@')[1] || '', resumen: r.summary,
    }));
    console.log(`[cron/mail] ${items.length} correos ${test ? '(prueba en seco)' : ''} ${Date.now() - started} ms`);
    return res.status(200).json({ ok: true, prueba: test, correos: test ? resumen : items.length, ms: Date.now() - started });
  } catch (e) {
    console.error('[cron/mail] falló', e && (e.step || e.status || e.message));
    return res.status(500).json({ ok: false, error: (e && (e.step || e.message)) || 'error' });
  }
}
