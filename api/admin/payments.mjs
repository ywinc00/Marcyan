// /api/admin/payments
//   GET  ?invoiceId=&clientId=&limit=   → pagos por factura/cliente
//   POST { invoice_id, amount_cents, method, paid_at, reference } → registrar pago
//        (recalcula automáticamente el estado de la factura)
// Protegido con requireAdmin. Montos en CENTAVOS USD.
import { requireAdmin } from '../../lib/auth.mjs';
import { listPayments, recordPayment } from '../../lib/finance.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const q = req.query || {};
      const invoiceId = q.invoiceId ? parseInt(q.invoiceId, 10) : null;
      const clientId  = q.clientId  ? parseInt(q.clientId, 10)  : null;
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
      const invoiceId = parseInt(body.invoice_id, 10);
      if (!Number.isFinite(invoiceId)) {
        return res.status(400).json({ ok: false, error: 'invoice_id requerido' });
      }
      const amount = Math.round(+body.amount_cents);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ ok: false, error: 'amount_cents debe ser > 0' });
      }
      const result = await recordPayment({
        invoice_id: invoiceId,
        amount_cents: amount,
        method: body.method,
        paid_at: body.paid_at,
        reference: body.reference,
        stripe_payment_id: body.stripe_payment_id,
      });
      return res.status(201).json({ ok: true, ...result });
    } catch (err) {
      console.error('[admin/payments POST] error:', err);
      const msg = err && err.message ? err.message : 'Error al registrar pago';
      const code = msg === 'Factura no encontrada' ? 404 : 400;
      return res.status(code).json({ ok: false, error: msg });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
