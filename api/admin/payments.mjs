// /api/admin/payments
//   GET  ?invoiceId=&clientId=&limit=   → pagos por factura/cliente
//   POST { invoice_id, amount_cents, method, paid_at, reference } → registrar pago
//        (recalcula automáticamente el estado de la factura). 409 si la factura
//        está anulada o el pago supera el saldo pendiente (FIN-09).
//   Editar o borrar un pago: /api/admin/payments/:id
// Protegido con requireAdmin. Montos en CENTAVOS USD.
import { requireAdmin } from '../../lib/auth.mjs';
import { listPayments, recordPayment } from '../../lib/finance.mjs';
import { isBusinessError } from '../../lib/finance-rules.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const q = req.query || {};
      const invoiceId = q.invoiceId && /^\d+$/.test(String(q.invoiceId)) ? String(q.invoiceId) : null;
      const clientId  = q.clientId  && /^\d+$/.test(String(q.clientId))  ? String(q.clientId)  : null;
      const limit     = q.limit     ? parseInt(q.limit, 10)     : 100;
      const payments = await listPayments({ invoiceId, clientId, limit });
      return res.status(200).json({ ok: true, payments });
    } catch (err) {
      console.error('[admin/payments GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al listar pagos' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const result = await recordPayment({
        invoice_id: body.invoice_id,
        amount_cents: body.amount_cents,
        method: body.method,
        paid_at: body.paid_at,
        reference: body.reference,
        stripe_payment_id: body.stripe_payment_id,
      });
      return res.status(201).json({ ok: true, ...result });
    } catch (err) {
      if (isBusinessError(err)) return res.status(err.status).json({ ok: false, error: err.message });
      console.error('[admin/payments POST] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al registrar pago' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
