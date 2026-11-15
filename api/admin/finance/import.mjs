// /api/admin/finance/import — extractos de banco, tarjeta, Stripe, PayPal y Revolut
//   GET                                  → { ok, pending: { expenses, income } } con sugerencias
//   POST { action:'import', account_id, filename, rows }      → { ok, result } (filas ya normalizadas
//        en el panel; aquí se vuelven a validar). Lo importado queda PENDIENTE de revisar.
//   POST { action:'expense', id, decision, ...datos }         → accept | subscription | ignore
//   POST { action:'income',  id, decision, ...datos }         → accept | payment | ignore
// Protegido con requireAdmin. Montos en CENTAVOS USD con signo (+ entra, − sale).
import { requireAdmin } from '../../../lib/auth.mjs';
import { isBusinessError } from '../../../lib/finance-rules.mjs';
import { importRows, listPending, resolveExpense, resolveIncome } from '../../../lib/finance-import.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  const by = session.email || null;
  try {
    if (req.method === 'GET') return res.status(200).json({ ok: true, pending: await listPending() });
    if (req.method === 'POST') {
      const b = (typeof req.body === 'object' && req.body) ? req.body : {};
      if (b.action === 'import') {
        const result = await importRows({ accountId: b.account_id, filename: b.filename, rows: b.rows, by });
        console.log(`[admin/finance/import] ${result.total} filas, ${result.created_expenses + result.created_income} nuevas, por ${by}`);
        return res.status(200).json({ ok: true, result });
      }
      if (b.action === 'expense') return res.status(200).json({ ok: true, ...(await resolveExpense(String(b.id || ''), b.decision, b, by)) });
      if (b.action === 'income') return res.status(200).json({ ok: true, ...(await resolveIncome(String(b.id || ''), b.decision, b, by)) });
      return res.status(400).json({ ok: false, error: 'Acción desconocida.' });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    if (isBusinessError(err)) return res.status(err.status).json({ ok: false, error: err.message });
    console.error('[admin/finance/import] error:', err);
    return res.status(500).json({ ok: false, error: 'No se pudo importar. Vuelve a intentarlo.' });
  }
}
