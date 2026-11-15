// /api/cron/finanzas-agente — el agente contable despierta una vez al día (vercel.json),
// después del cron de Finanzas (que ya generó los cargos de las suscripciones).
// Solo llama a la IA si hay algo nuevo en su bandeja. Solo propone.
// Autorización: Authorization: Bearer <CRON_SECRET> (Vercel lo manda solo). Solo en producción.
import { safeEqual } from '../../lib/auth.mjs';
import { setOidcToken } from '../../lib/gmail.mjs';
import { runAgent } from '../../lib/finance-agent.mjs';

function bearerOk(req) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const m = /^Bearer\s+(.+)$/i.exec(String(req.headers['authorization'] || '').trim());
  return Boolean(m && safeEqual(m[1].trim(), secret));
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!bearerOk(req)) return res.status(401).json({ ok: false, error: 'No autorizado' });
  if (process.env.VERCEL_ENV !== 'production') return res.status(200).json({ ok: true, skipped: 'solo en producción' });
  setOidcToken(req.headers['x-vercel-oidc-token']);
  const out = await runAgent({ trigger: 'cron' });
  console.log(`[cron/finanzas-agente] estado=${out.status} propuestas=${out.proposals} coste_usd=${out.cost_usd.toFixed(4)}`);
  return res.status(out.status === 'failed' ? 500 : 200).json({ ok: out.status !== 'failed', ...out });
}
