// /api/admin/invoices/:id   (id = invoices.id numérico, o el número INV-XXX en GET)
//   GET    → detalle de la factura (estado derivado, saldo, pagos y proyecto)
//   PATCH  → { status?, amount_cents?, due_date?, issued_at?, description?,
//              client_id?, project_id? } edita la factura. A mano solo se puede
//              poner Borrador, Enviada o Anulada; Pagada/Parcial/Vencida se
//              calculan solas. El monto no baja de lo ya cobrado.
//   DELETE → elimina la factura SOLO si no tiene pagos (409 si los tiene:
//            hay que anularla para no perder el historial de cobros).
import { requireAdmin } from '../../../lib/auth.mjs';
import { getInvoice, updateInvoice, deleteInvoice } from '../../../lib/finance.mjs';
import { isBusinessError } from '../../../lib/finance-rules.mjs';

const EDITABLE = ['status', 'amount_cents', 'due_date', 'issued_at', 'description', 'client_id', 'project_id'];

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const raw = (req.query?.id || '').toString().trim();
  const isNumber = /^INV-\d+$/i.test(raw);
  if (!/^\d+$/.test(raw) && !(isNumber && req.method === 'GET')) {
    return res.status(400).json({ ok: false, error: 'ID inválido' });
  }

  if (req.method === 'GET') {
    try {
      const invoice = await getInvoice(raw);
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
      const fields = {};
      for (const k of EDITABLE) if (k in body) fields[k] = body[k];
      if (!Object.keys(fields).length) {
        return res.status(400).json({ ok: false, error: 'No hay cambios que guardar.' });
      }
      const invoice = await updateInvoice(raw, fields);
      if (!invoice) return res.status(404).json({ ok: false, error: 'Factura no encontrada' });
      return res.status(200).json({ ok: true, invoice });
    } catch (err) {
      if (isBusinessError(err)) return res.status(err.status).json({ ok: false, error: err.message });
      console.error('[admin/invoices/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al actualizar factura' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const out = await deleteInvoice(raw);
      if (!out) return res.status(404).json({ ok: false, error: 'Factura no encontrada' });
      console.log(`[admin/invoices/:id DELETE] ${out.invoice_number} eliminada por ${session.email}`);
      return res.status(200).json({ ok: true, deleted: Number(raw), invoice_number: out.invoice_number });
    } catch (err) {
      if (isBusinessError(err)) return res.status(err.status).json({ ok: false, error: err.message });
      console.error('[admin/invoices/:id DELETE] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al eliminar factura' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
