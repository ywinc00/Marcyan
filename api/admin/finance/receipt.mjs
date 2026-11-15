// /api/admin/finance/receipt — recibos de los gastos (Vercel Blob PRIVADO)
//   POST { type:'blob.generate-client-token', payload:{ pathname, clientPayload } }
//        → permiso de subida de un solo uso para receipts/<gasto>/<uuid>.<ext>
//          (clientPayload: { expenseId, contentType, size })
//   POST { action:'confirm', expense_id, pathname } → comprueba el tipo real y lo enlaza
//   GET  ?expense=<id>[&download=1]                 → el recibo, en streaming
//   DELETE ?expense=<id>                            → quita el recibo (mes abierto)
// Solo con sesión de admin. Fotos JPEG/PNG/WebP se ven en línea; PDF y HEIC se descargan.
import { Readable } from 'node:stream';
import { handleUpload } from '@vercel/blob/client';
import { requireAdmin } from '../../../lib/auth.mjs';
import { isBusinessError } from '../../../lib/finance-rules.mjs';
import { dispositionFor } from '../../../lib/brief-upload-rules.mjs';
import { receiptTokenOptions, confirmReceipt, openReceipt, removeReceipt } from '../../../lib/finance-receipts.mjs';

const blobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  if (!blobConfigured()) return res.status(503).json({ ok: false, error: 'El almacén de archivos no está configurado.' });
  const expense = String(req.query?.expense || '');
  try {
    if (req.method === 'POST') {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      if (body.action === 'confirm') {
        return res.status(200).json({ ok: true, ...(await confirmReceipt(String(body.expense_id || ''), String(body.pathname || ''))) });
      }
      if (body.type !== 'blob.generate-client-token') return res.status(400).json({ ok: false, error: 'Acción desconocida.' });
      const result = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: (pathname, clientPayload) => receiptTokenOptions(pathname, clientPayload),
      });
      return res.status(200).json(result);
    }
    if (!/^\d{1,18}$/.test(expense)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    if (req.method === 'GET') {
      const file = await openReceipt(expense);
      if (!file) return res.status(404).json({ ok: false, error: 'Ese gasto no tiene recibo.' });
      const type = file.blob.blob.contentType || 'application/octet-stream';
      const name = `recibo-${expense}.${file.path.split('.').pop()}`;
      res.statusCode = 200;
      res.setHeader('Content-Type', type);
      if (file.blob.blob.size) res.setHeader('Content-Length', String(file.blob.blob.size));
      res.setHeader('Content-Disposition', dispositionFor(req.query?.download === '1' ? 'application/octet-stream' : type, name));
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return Readable.fromWeb(file.blob.stream).pipe(res);
    }
    if (req.method === 'DELETE') {
      const ok = await removeReceipt(expense);
      if (!ok) return res.status(404).json({ ok: false, error: 'Gasto no encontrado.' });
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    if (isBusinessError(err)) return res.status(err.status).json({ ok: false, error: err.message });
    console.error('[admin/finance/receipt] error:', err && err.message);
    return res.status(500).json({ ok: false, error: 'No se pudo con el recibo. Vuelve a intentarlo.' });
  }
}
