// /api/admin/invoices
//   GET  ?status=&clientId=&projectId=&search=&limit=&offset=
//        → { ok, rows, total, limit, offset, counts }
//        status admite los estados y 'open' (enviadas, parciales y vencidas).
//        Cada fila trae el estado DERIVADO en `status` (vencida al leer) y la
//        columna tal cual en `stored_status`. counts = recuento por estado.
//   POST { client_id, amount_cents (> 0), project_id?, status? (draft|sent),
//          issued_at?, due_date?, description? } → crear factura
//        (la moneda es siempre USD; el número INV-XXX es atómico).
// Protegido con requireAdmin. Montos en CENTAVOS USD.
import { requireAdmin } from '../../lib/auth.mjs';
import { listInvoices, createInvoice, INVOICE_FILTERS } from '../../lib/finance.mjs';
import { isBusinessError } from '../../lib/finance-rules.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const q = req.query || {};
      const status    = q.status && INVOICE_FILTERS.includes(q.status) ? q.status : null;
      const clientId  = q.clientId && /^\d+$/.test(String(q.clientId)) ? String(q.clientId) : null;
      const projectId = q.projectId && /^\d+$/.test(String(q.projectId)) ? String(q.projectId) : null;
      const search    = q.search ? String(q.search).slice(0, 200) : null;
      const limit     = q.limit  ? parseInt(q.limit, 10)  : 50;
      const offset    = q.offset ? parseInt(q.offset, 10) : 0;
      const result = await listInvoices({ status, clientId, projectId, search, limit, offset });
      return res.status(200).json({ ok: true, ...result });
    } catch (err) {
      console.error('[admin/invoices GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al listar facturas' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const invoice = await createInvoice({
        client_id: body.client_id,
        project_id: body.project_id,
        amount_cents: body.amount_cents,
        status: body.status,
        issued_at: body.issued_at,
        due_date: body.due_date,
        description: body.description,
      });
      console.log(`[admin/invoices POST] ${invoice.invoice_number} creada por ${session.email}`);
      return res.status(201).json({ ok: true, invoice });
    } catch (err) {
      if (isBusinessError(err)) return res.status(err.status).json({ ok: false, error: err.message });
      console.error('[admin/invoices POST] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al crear factura' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
