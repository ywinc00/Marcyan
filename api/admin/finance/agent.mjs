// /api/admin/finance/agent — el agente contable en Orbit (fase 2 del plan del panel)
//   GET                          → { ok, settings, month_spend_usd, proposals, runs }
//   POST { action: 'apply',  id } → aplica una propuesta (solo el dueño)
//   POST { action: 'reject', id } → la descarta (no vuelve en 60 días)
//   POST { action: 'run' }        → «Revisar ahora» (máx. 4 al día, dentro del tope del mes)
// Protegido con requireAdmin. El agente solo propone: nada cambia sin este «apply».
import { requireAdmin } from '../../../lib/auth.mjs';
import { isBusinessError } from '../../../lib/finance-rules.mjs';
import { setOidcToken } from '../../../lib/gmail.mjs';
import { AgentError, agentState, applyProposal, rejectProposal, runAgent } from '../../../lib/finance-agent.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  const by = session.email || null;
  try {
    if (req.method === 'GET') return res.status(200).json({ ok: true, ...(await agentState()) });
    if (req.method === 'POST') {
      const b = (typeof req.body === 'object' && req.body) ? req.body : {};
      if (b.action === 'apply') return res.status(200).json({ ...(await applyProposal(b.id, by)), state: await agentState() });
      if (b.action === 'reject') { await rejectProposal(b.id, by); return res.status(200).json({ ok: true, state: await agentState() }); }
      if (b.action === 'run') {
        setOidcToken(req.headers['x-vercel-oidc-token']);
        const run = await runAgent({ trigger: 'manual' });
        return res.status(200).json({ ok: true, run, state: await agentState() });
      }
      return res.status(400).json({ ok: false, error: 'Acción desconocida.' });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof AgentError || isBusinessError(err)) return res.status(err.status || 400).json({ ok: false, error: err.message });
    console.error('[admin/finance/agent] error:', err && err.name);
    return res.status(500).json({ ok: false, error: 'No se pudo completar. Prueba de nuevo.' });
  }
}
