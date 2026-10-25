// GET /api/admin/files/:id[?download=1]
//   Sirve un archivo del brief desde Vercel Blob PRIVADO, en streaming y solo
//   con sesión de admin. Cache-Control private, no-store y nosniff.
//   En línea SOLO JPEG/PNG/WebP verificados; SVG (puede llevar scripts),
//   documentos y lo demás siempre como descarga (Content-Disposition attachment).
import { Readable } from 'node:stream';
import { get } from '@vercel/blob';
import { requireAdmin } from '../../../lib/auth.mjs';
import { getFileById, blobConfigured, isMissingSchema } from '../../../lib/brief-files.mjs';
import { dispositionFor } from '../../../lib/brief-upload-rules.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const id = (req.query?.id || '').toString();
  if (!/^\d{1,18}$/.test(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
  if (!blobConfigured()) return res.status(503).json({ ok: false, error: 'El almacén de archivos no está configurado' });

  try {
    const file = await getFileById(id);
    if (!file) return res.status(404).json({ ok: false, error: 'Archivo no encontrado' });
    if (file.verified === false) {
      return res.status(410).json({ ok: false, error: 'Este archivo se rechazó: su contenido no coincidía con su tipo y se borró.' });
    }
    const blob = await get(file.pathname, { access: 'private' });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return res.status(404).json({ ok: false, error: 'El archivo ya no está en el almacén' });
    }
    // Sin verificar todavía: nunca en línea, aunque diga ser imagen.
    const type = file.content_type || blob.blob.contentType || 'application/octet-stream';
    const forceDownload = req.query?.download === '1' || file.verified !== true;
    const disposition = dispositionFor(forceDownload ? 'application/octet-stream' : type, file.original_name || file.pathname.split('/').pop());

    res.statusCode = 200;
    res.setHeader('Content-Type', type);
    if (blob.blob.size) res.setHeader('Content-Length', String(blob.blob.size));
    res.setHeader('Content-Disposition', disposition);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');

    const nodeStream = Readable.fromWeb(blob.stream);
    nodeStream.on('error', (err) => {
      console.error('[admin/files/:id] stream falló:', err && err.message);
      res.destroy(err);
    });
    nodeStream.pipe(res);
  } catch (err) {
    if (isMissingSchema(err)) return res.status(404).json({ ok: false, error: 'Archivo no encontrado' });
    console.error('[admin/files/:id] error:', err && err.message);
    if (!res.headersSent) return res.status(500).json({ ok: false, error: 'Error al leer el archivo' });
    res.destroy(err);
  }
}
