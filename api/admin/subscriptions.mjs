// /api/admin/subscriptions
//   GET                                    → lista de suscripciones {ok, rows, total}
//   POST { name, amount_cents, cycle, ... } → crear suscripción {ok, subscription}
// Protegido con requireAdmin. Montos en CENTAVOS USD.
import { requireAdmin } from '../../lib/auth.mjs';
import { listSubscriptions, createSubscription, SUBSCRIPTION_CYCLES } from '../../lib/expenses.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const rows = await listSubscriptions();
      return res.status(200).json({ ok: true, rows, total: rows.length });
    } catch (err) {
      console.error('[admin/subscriptions GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al listar suscripciones' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const name = (body.name || '').toString().trim();
      if (!name) return res.status(400).json({ ok: false, error: 'name requerido' });
      const amount = Math.round(+body.amount_cents);
      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ ok: false, error: 'amount_cents inválido' });
      }
      const cycle = SUBSCRIPTION_CYCLES.includes(body.cycle) ? body.cycle : 'monthly';
      const subscription = await createSubscription({
        name,
        category: body.category,
        amount_cents: amount,
        cycle,
        next_charge_at: body.next_charge_at,
        active: body.active === undefined ? true : !!body.active,
        notes: body.notes,
      });
      return res.status(201).json({ ok: true, subscription });
    } catch (err) {
      console.error('[admin/subscriptions POST] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al crear suscripción' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
