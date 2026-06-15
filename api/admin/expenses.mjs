// /api/admin/expenses
//   GET  ?limit=&offset=                          → lista de gastos {ok, rows, total}
//   POST { label, category, amount_cents, ... }   → crear gasto {ok, expense}
// Protegido con requireAdmin. Montos en CENTAVOS USD.
import { requireAdmin } from '../../lib/auth.mjs';
import { listExpenses, createExpense } from '../../lib/expenses.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const q = req.query || {};
      const limit  = q.limit  ? parseInt(q.limit, 10)  : 100;
      const offset = q.offset ? parseInt(q.offset, 10) : 0;
      const result = await listExpenses({ limit, offset });
      return res.status(200).json({ ok: true, ...result });
    } catch (err) {
      console.error('[admin/expenses GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al listar gastos' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const label = (body.label || '').toString().trim();
      if (!label) return res.status(400).json({ ok: false, error: 'label requerido' });
      const amount = Math.round(+body.amount_cents);
      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ ok: false, error: 'amount_cents inválido' });
      }
      const expense = await createExpense({
        label,
        category: body.category,
        amount_cents: amount,
        spent_at: body.spent_at,
        vendor: body.vendor,
        notes: body.notes,
      });
      return res.status(201).json({ ok: true, expense });
    } catch (err) {
      console.error('[admin/expenses POST] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al crear gasto' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
