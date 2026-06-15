// /api/admin/expenses/:id   (id = company_expenses.id BIGINT → string)
//   DELETE → elimina el gasto {ok, deleted}
// Protegido con requireAdmin.
import { requireAdmin } from '../../../lib/auth.mjs';
import { deleteExpense } from '../../../lib/expenses.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  // id es BIGINT (string); validamos formato sin parseInt (puede exceder Number).
  const id = (req.query?.id || '').toString();
  if (!/^\d+$/.test(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });

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

  res.setHeader('Allow', 'DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
