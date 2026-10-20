// /api/admin/briefs/:id/files  (solo con sesión de admin)
//   GET    → { files, available, retention }
//            Lista los archivos de un brief (logo, fotos, documentos, video,
//            legales) del brief inicial y del kit de arranque. Cada archivo
//            trae `url` (GET /api/admin/files/:id) para miniatura o descarga
//            e `inline` (true solo si el panel puede mostrarlo en <img>).
//            retention: { purgeOn, daysLeft, lastPurge } (lib/brief-retention.mjs)
//              purgeOn   'YYYY-MM-DD' en que se borran solos (12 meses después
//                        de terminar el proyecto y nunca antes de 7 días desde
//                        el aviso del panel) o null si no está terminado o su
//                        proyecto de Progreso sigue en marcha.
//              lastPurge { at, files, reason, actor } del último borrado o null.
//   DELETE → borra TODOS los archivos enlazados al brief a petición del
//            cliente (blobs y filas); el brief y su historial se quedan. Deja
//            el evento 'files_purged' con el actor. { files } (0 si no
//            quedaba ninguno). 502 si el almacén falla (no se borró nada) o
//            si los archivos ya salieron del almacén pero la ficha no se
//            actualizó (repetir el borrado lo termina); el texto dice cuál.
import { requireAdmin } from '../../../../lib/auth.mjs';
import { getBriefByProjectId } from '../../../../lib/db.mjs';
import {
  listFilesForBrief, retentionEvents, retentionProjects, effectiveRetention, purgeBriefFiles, blobConfigured, isMissingSchema,
} from '../../../../lib/brief-files.mjs';
import { purgeDate, daysUntil, lastPurge } from '../../../../lib/brief-retention.mjs';

const INLINE = new Set(['image/jpeg', 'image/png', 'image/webp']);

// El plazo nunca debe romper la lista: si el historial no se puede leer,
// la sección sale sin fecha.
async function retentionFor(brief) {
  try {
    const [events, projects] = await Promise.all([retentionEvents(brief.project_id), retentionProjects(brief.project_id)]);
    const { purgeOn } = await effectiveRetention({ projectId: brief.project_id, policyDay: purgeDate(brief, events, projects) });
    return { purgeOn, daysLeft: purgeOn ? daysUntil(purgeOn) : null, lastPurge: lastPurge(events) };
  } catch (err) {
    console.error('[admin/briefs/:id/files] plazo no disponible:', err && err.message);
    return { purgeOn: null, daysLeft: null, lastPurge: null };
  }
}

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'GET, DELETE');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const id = (req.query?.id || '').toString();
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });

  if (req.method === 'DELETE') {
    try {
      const brief = await getBriefByProjectId(id);
      if (!brief) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });
      if (!blobConfigured()) {
        return res.status(503).json({ ok: false, error: 'El almacén de archivos no está configurado. No se borró nada.' });
      }
      let out;
      try {
        out = await purgeBriefFiles(brief.id, { projectId: brief.project_id, actorEmail: session.email, reason: 'request' });
      } catch (err) {
        if (isMissingSchema(err)) return res.status(200).json({ ok: true, files: 0 });
        console.error(`[admin/briefs/:id/files DELETE] ${id} archivos no borrados:`, err && err.message);
        const error = err && err.phase === 'records'
          ? 'Los archivos ya se borraron, pero la ficha no se pudo actualizar. Vuelve a pulsar Borrar archivos en un momento para terminar.'
          : 'No se pudieron borrar los archivos. No se borró nada; inténtalo de nuevo en un momento.';
        return res.status(502).json({ ok: false, error });
      }
      console.log(`[admin/briefs/:id/files DELETE] ${id} archivos borrados por ${session.email} · archivos=${out ? out.files : 0}`);
      return res.status(200).json({ ok: true, files: out ? out.files : 0 });
    } catch (err) {
      console.error('[admin/briefs/:id/files DELETE] error:', err && err.message);
      return res.status(500).json({ ok: false, error: 'No se pudieron borrar los archivos' });
    }
  }

  try {
    const brief = await getBriefByProjectId(id);
    if (!brief) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });
    let rows = [];
    try {
      rows = await listFilesForBrief(brief.id);
    } catch (err) {
      if (!isMissingSchema(err)) throw err;
      return res.status(200).json({ ok: true, files: [], available: false, retention: null });
    }
    const retention = await retentionFor(brief);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      ok: true,
      available: true,
      retention,
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
