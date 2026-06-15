// /api/admin/subscriptions/:id   (id = subscriptions.id BIGINT → string)
//   PATCH  → { active, name, amount_cents, cycle, ... } toggle/editar {ok, subscription}
//   DELETE → elimina la suscripción {ok, deleted}
// Protegido con requireAdmin. Montos en CENTAVOS USD.
import { requireAdmin } from '../../../lib/auth.mjs';
import { getSubscription, updateSubscription, deleteSubscription } from '../../../lib/expenses.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  // id es BIGINT (string); validamos formato sin parseInt (puede exceder Number).
  const id = (req.query?.id || '').toString();
  if (!/^\d+$/.test(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });

  if (req.method === 'PATCH') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const before = await getSubscription(id);
      if (!before) return res.status(404).json({ ok: false, error: 'Suscripción no encontrada' });
      const subscription = await updateSubscription(id, body);
      if (!subscription) return res.status(404).json({ ok: false, error: 'Suscripción no encontrada' });
      return res.status(200).json({ ok: true, subscription });
    } catch (err) {
      console.error('[admin/subscriptions/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al actualizar suscripción' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const ok = await deleteSubscription(id);
      if (!ok) return res.status(404).json({ ok: false, error: 'Suscripción no encontrada' });
      console.log(`[admin/subscriptions/:id DELETE] suscripción ${id} eliminada por ${session.email}`);
      return res.status(200).json({ ok: true, deleted: id });
    } catch (err) {
      console.error('[admin/subscriptions/:id DELETE] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al eliminar suscripción' });
    }
  }

  res.setHeader('Allow', 'PATCH, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
