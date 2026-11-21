// /api/admin/proposals/:ref   (ref = PROP-XXX)
//   PATCH { action: 'send' }                                   borrador → enviada
//   PATCH { action: 'decide', status: 'accepted'|'rejected', chosen_option?, note? }
//   PATCH { action: 'follow_up' }                              seguimiento hecho
//   → { proposal, lead_status? }. 409 si el estado no lo permite; 400 con { field }.
// Aceptar no convierte al contacto en cliente: eso es POST /api/admin/leads/:id/convert.
import { requireAdmin } from '../../../lib/auth.mjs';
import { CrmError } from '../../../lib/finance.mjs';
import { sendProposal, decideProposal, markFollowUpDone } from '../../../lib/proposals.mjs';

const normRef = (v) => String(v || '').trim().toUpperCase().slice(0, 40);

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  res.setHeader('Cache-Control', 'no-store');

  const ref = normRef(req.query?.ref);
  if (!ref) return res.status(400).json({ ok: false, error: 'Propuesta requerida' });
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  const body = (typeof req.body === 'object' && req.body) ? req.body : {};
  const deps = { actorEmail: session.email };
  try {
    let out;
    if (body.action === 'send') out = await sendProposal(ref, deps);
    else if (body.action === 'decide') {
      out = await decideProposal(ref, { status: body.status, chosen_option: body.chosen_option, note: body.note }, deps);
    } else if (body.action === 'follow_up') out = await markFollowUpDone(ref, deps);
    else return res.status(400).json({ ok: false, error: 'Acción no válida.', field: 'action' });
    return res.status(200).json({ ok: true, ...out });
  } catch (err) {
    if (err instanceof CrmError) return res.status(err.status).json({ ok: false, error: err.message, ...err.extra });
    console.error('[admin/proposals/:ref PATCH] error:', err);
    return res.status(500).json({ ok: false, error: 'Error con la propuesta' });
  }
}
