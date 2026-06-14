// /api/admin/invoices
//   GET  ?status=&clientId=&search=&limit=&offset=   → lista de facturas (con saldo)
//   POST { client_id, amount_cents, ... }            → crear factura
// Protegido con requireAdmin. Montos en CENTAVOS USD.
import { requireAdmin } from '../../lib/auth.mjs';
import { listInvoices, createInvoice, INVOICE_STATUSES } from '../../lib/finance.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const q = req.query || {};
      const status   = q.status && INVOICE_STATUSES.includes(q.status) ? q.status : null;
      const clientId = q.clientId ? parseInt(q.clientId, 10) : null;
      const search   = q.search ? String(q.search).slice(0, 200) : null;
      const limit    = q.limit  ? parseInt(q.limit, 10)  : 50;
      const offset   = q.offset ? parseInt(q.offset, 10) : 0;
      const result = await listInvoices({ status, clientId, search, limit, offset });
      return res.status(200).json({ ok: true, ...result });
    } catch (err) {
      console.error('[admin/invoices GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al listar facturas' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const clientId = parseInt(body.client_id, 10);
      if (!Number.isFinite(clientId)) {
        return res.status(400).json({ ok: false, error: 'client_id requerido' });
      }
      const amount = Math.round(+body.amount_cents);
      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ ok: false, error: 'amount_cents inválido' });
      }
      const invoice = await createInvoice({
        client_id: clientId,
        project_id: body.project_id ? parseInt(body.project_id, 10) : null,
        amount_cents: amount,
        currency: body.currency,
        status: body.status,
        issued_at: body.issued_at,
        due_date: body.due_date,
        description: body.description,
      });
      return res.status(201).json({ ok: true, invoice });
    } catch (err) {
      console.error('[admin/invoices POST] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al crear factura' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
