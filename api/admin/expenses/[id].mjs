// /api/admin/expenses/:id   (id = company_expenses.id BIGINT → string)
//   GET    → { ok, expense }
//   PATCH  → { label?, category?, amount_cents?, spent_at?, vendor?, notes? }
//            edita el gasto {ok, expense} (FIN-10)
//   DELETE → elimina el gasto {ok, deleted}
// Protegido con requireAdmin.
import { requireAdmin } from '../../../lib/auth.mjs';
import { getExpense, updateExpense, deleteExpense } from '../../../lib/expenses.mjs';
import { isBusinessError } from '../../../lib/finance-rules.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  // id es BIGINT (string); validamos formato sin parseInt (puede exceder Number).
  const id = (req.query?.id || '').toString();
  if (!/^\d+$/.test(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });

  if (req.method === 'GET') {
    try {
      const expense = await getExpense(id);
      if (!expense) return res.status(404).json({ ok: false, error: 'Gasto no encontrado' });
      return res.status(200).json({ ok: true, expense });
    } catch (err) {
      console.error('[admin/expenses/:id GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al obtener el gasto' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const expense = await updateExpense(id, body);
      if (!expense) return res.status(404).json({ ok: false, error: 'Gasto no encontrado' });
      return res.status(200).json({ ok: true, expense });
    } catch (err) {
      if (isBusinessError(err)) return res.status(err.status).json({ ok: false, error: err.message });
      console.error('[admin/expenses/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al actualizar el gasto' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const ok = await deleteExpense(id);
      if (!ok) return res.status(404).json({ ok: false, error: 'Gasto no encontrado' });
      console.log(`[admin/expenses/:id DELETE] gasto ${id} eliminado por ${session.email}`);
      return res.status(200).json({ ok: true, deleted: id });
    } catch (err) {
      console.error('[admin/expenses/:id DELETE] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al eliminar gasto' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
