// /api/admin/finance/summary
//   GET → métricas para KPIs (cobrado mes, por cobrar, vencido) + ingresos por mes
// Protegido con requireAdmin. Montos en CENTAVOS USD.
import { requireAdmin } from '../../../lib/auth.mjs';
import { financeSummary } from '../../../lib/finance.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const summary = await financeSummary();
    return res.status(200).json({ ok: true, summary });
  } catch (err) {
    console.error('[admin/finance/summary] error:', err);
    return res.status(500).json({ ok: false, error: 'Error al calcular finanzas' });
  }
}
