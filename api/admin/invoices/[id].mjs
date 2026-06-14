// /api/admin/invoices/:id   (id = invoices.id numérico)
//   GET    → detalle de la factura (saldo + pagos)
//   PATCH  → { status } cambia el estado
//   DELETE → elimina la factura (CASCADE a payments)
import { requireAdmin } from '../../../lib/auth.mjs';
import {
  getInvoice, updateInvoiceStatus, deleteInvoice, INVOICE_STATUSES,
} from '../../../lib/finance.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const id = parseInt((req.query?.id || '').toString(), 10);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });

  if (req.method === 'GET') {
    try {
      const invoice = await getInvoice(id);
      if (!invoice) return res.status(404).json({ ok: false, error: 'Factura no encontrada' });
      return res.status(200).json({ ok: true, invoice });
    } catch (err) {
      console.error('[admin/invoices/:id GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al obtener factura' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const newStatus = typeof body.status === 'string' ? body.status.trim() : null;
      if (!newStatus || !INVOICE_STATUSES.includes(newStatus)) {
        return res.status(400).json({
          ok: false,
          error: `Status debe ser uno de: ${INVOICE_STATUSES.join(', ')}`,
        });
      }
      const updated = await updateInvoiceStatus(id, newStatus);
      if (!updated) return res.status(404).json({ ok: false, error: 'Factura no encontrada' });
      const invoice = await getInvoice(id);
      return res.status(200).json({ ok: true, invoice });
    } catch (err) {
      console.error('[admin/invoices/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al actualizar factura' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const before = await getInvoice(id);
      if (!before) return res.status(404).json({ ok: false, error: 'Factura no encontrada' });
      const ok = await deleteInvoice(id);
      if (!ok) return res.status(500).json({ ok: false, error: 'No se pudo eliminar' });
      console.log(`[admin/invoices/:id DELETE] ${before.invoice_number} eliminada por ${session.email}`);
      return res.status(200).json({ ok: true, deleted: id });
    } catch (err) {
      console.error('[admin/invoices/:id DELETE] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al eliminar factura' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
