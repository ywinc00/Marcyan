// /api/admin/expenses
//   GET  ?month=YYYY-MM&category=&limit=&offset=
//        → lista de gastos {ok, rows, total, total_cents, limit, offset}
//        (total_cents = suma de TODO lo filtrado, no solo de la página)
//   POST { label, category, amount_cents (> 0), spent_at?, vendor?, notes? }
//        → crear gasto {ok, expense}. Categoría de la lista cerrada
//        (software, hosting, marketing, legal, otro); sin fecha = hoy en Houston.
// Protegido con requireAdmin. Montos en CENTAVOS USD.
import { requireAdmin } from '../../lib/auth.mjs';
import { listExpenses, createExpense } from '../../lib/expenses.mjs';
import { isBusinessError } from '../../lib/finance-rules.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const q = req.query || {};
      const limit  = q.limit  ? parseInt(q.limit, 10)  : 100;
      const offset = q.offset ? parseInt(q.offset, 10) : 0;
      const month = q.month ? String(q.month).slice(0, 7) : null;
      const category = q.category ? String(q.category).slice(0, 40) : null;
      const result = await listExpenses({ month, category, limit, offset });
      return res.status(200).json({ ok: true, ...result });
    } catch (err) {
      console.error('[admin/expenses GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al listar gastos' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const expense = await createExpense({
        label: body.label,
        category: body.category,
        amount_cents: body.amount_cents,
        spent_at: body.spent_at,
        vendor: body.vendor,
        notes: body.notes,
      });
      return res.status(201).json({ ok: true, expense });
    } catch (err) {
      if (isBusinessError(err)) return res.status(err.status).json({ ok: false, error: err.message });
      console.error('[admin/expenses POST] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al crear gasto' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
