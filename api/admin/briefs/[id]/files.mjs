// GET /api/admin/briefs/:id/files
//   Lista los archivos de un brief (logo, fotos, documentos, video, legales)
//   del brief inicial y del kit de arranque. Solo con sesión de admin.
//   Cada archivo trae `url` (GET /api/admin/files/:id) para miniatura o
//   descarga e `inline` (true solo si el panel puede mostrarlo en <img>).
import { requireAdmin } from '../../../../lib/auth.mjs';
import { getBriefByProjectId } from '../../../../lib/db.mjs';
import { listFilesForBrief, isMissingSchema } from '../../../../lib/brief-files.mjs';

const INLINE = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const id = (req.query?.id || '').toString();
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });

  try {
    const brief = await getBriefByProjectId(id);
    if (!brief) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });
    let rows = [];
    try {
      rows = await listFilesForBrief(brief.id);
    } catch (err) {
      if (!isMissingSchema(err)) throw err;
      return res.status(200).json({ ok: true, files: [], available: false });
    }
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      ok: true,
      available: true,
      files: rows.map((r) => ({
        id: String(r.id),
        kind: r.kind,
        moment: r.purpose === 'kit' ? 'arranque' : 'inicial',
        contentType: r.content_type,
        size: r.size === null ? null : Number(r.size),
        originalName: r.original_name,
        convertedFrom: r.converted_from,
        tags: r.tags || {},
        verified: r.verified,             // null = pendiente · true = OK · false = rechazado (ya no existe)
        createdAt: r.created_at,
        url: `/api/admin/files/${r.id}`,
        inline: r.verified === true && INLINE.has(r.content_type),
      })),
    });
  } catch (err) {
    console.error('[admin/briefs/:id/files] error:', err && err.message);
    return res.status(500).json({ ok: false, error: 'Error al obtener los archivos' });
  }
}
