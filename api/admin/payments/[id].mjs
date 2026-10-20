// /api/admin/payments/:id   (id = payments.id BIGINT → string)
//   GET    → { ok, payment }
//   PATCH  → { amount_cents?, method?, paid_at?, reference? } edita el pago y
//            recalcula el estado de su factura → { ok, payment, invoice }.
//            409 si el monto nuevo supera el saldo o la factura está anulada.
//   DELETE → borra el pago y recalcula su factura → { ok, deleted, invoice }
// Protegido con requireAdmin. Montos en CENTAVOS USD (FIN-01).
import { requireAdmin } from '../../../lib/auth.mjs';
import { getPayment, updatePayment, deletePayment } from '../../../lib/finance.mjs';
import { isBusinessError } from '../../../lib/finance-rules.mjs';

const EDITABLE = ['amount_cents', 'method', 'paid_at', 'reference'];

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  // id es BIGINT (string); validamos formato sin parseInt (puede exceder Number).
  const id = (req.query?.id || '').toString();
  if (!/^\d+$/.test(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });

  if (req.method === 'GET') {
    try {
      const payment = await getPayment(id);
      if (!payment) return res.status(404).json({ ok: false, error: 'Pago no encontrado' });
      return res.status(200).json({ ok: true, payment });
    } catch (err) {
      console.error('[admin/payments/:id GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al obtener el pago' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const fields = {};
      for (const k of EDITABLE) if (k in body) fields[k] = body[k];
      if (!Object.keys(fields).length) return res.status(400).json({ ok: false, error: 'No hay cambios que guardar.' });
      const out = await updatePayment(id, fields);
      if (!out) return res.status(404).json({ ok: false, error: 'Pago no encontrado' });
      return res.status(200).json({ ok: true, ...out });
    } catch (err) {
      if (isBusinessError(err)) return res.status(err.status).json({ ok: false, error: err.message });
      console.error('[admin/payments/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al actualizar el pago' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const out = await deletePayment(id);
      if (!out) return res.status(404).json({ ok: false, error: 'Pago no encontrado' });
      console.log(`[admin/payments/:id DELETE] pago ${id} eliminado por ${session.email}`);
      return res.status(200).json({ ok: true, ...out });
    } catch (err) {
      console.error('[admin/payments/:id DELETE] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al borrar el pago' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
