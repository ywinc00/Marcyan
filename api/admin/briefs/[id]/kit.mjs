// GET /api/admin/briefs/:id/kit[?legal=1]
//   Descarga el KIT .zip del brief para arrancar el proyecto en Claude Code
//   (B2 del plan Orbit v2): LEEME, CLAUDE.md, DESIGN.md, BRIEF.md, brief.json,
//   data/site.json, docs/handoff/, docs/seo/ y assets/ (logo, fotos, documentos
//   y video). Lo arma lib/kit/build.mjs y lo empaqueta lib/kit/zip.mjs EN
//   STREAMING: cada archivo se lee del Blob privado y sale al vuelo.
//   - Los documentos legales (registro, seguros) solo van con ?legal=1, en
//     LEGAL-CONFIDENCIAL/.
//   - Si un archivo falla, el zip sigue y PLACEHOLDERS.md lo anota.
//   - Registra el evento 'kit_downloaded' en brief_events.
//   La ficha HTML (document.mjs) se conserva como "Ver ficha".
import { Readable } from 'node:stream';
import { get } from '@vercel/blob';
import { requireAdmin } from '../../../../lib/auth.mjs';
import { getBriefByProjectId, logEvent } from '../../../../lib/db.mjs';
import { listFilesForBrief, blobConfigured, isMissingSchema } from '../../../../lib/brief-files.mjs';
import { buildKit } from '../../../../lib/kit/build.mjs';
import { writeKitZip } from '../../../../lib/kit/zip.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const id = (req.query?.id || '').toString();
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });
  const legal = String(req.query?.legal || '') === '1';

  let kit;
  try {
    const brief = await getBriefByProjectId(id);
    if (!brief) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });
    let files = [];
    try {
      files = await listFilesForBrief(brief.id);
    } catch (err) {
      if (!isMissingSchema(err)) throw err; // sin migración 010: kit sin archivos
    }
    kit = buildKit({ brief, files, legal, now: new Date() });
  } catch (err) {
    console.error('[admin/briefs/:id/kit] error al preparar:', err && err.message);
    return res.status(500).json({ ok: false, error: 'Error al preparar el kit' });
  }

  // Desde aquí la respuesta ya es el zip: los errores de un archivo no la cortan.
  let aborted = false;
  const onClose = () => { if (!res.writableEnded) aborted = true; };
  res.on('close', onClose);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${kit.filename}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const write = (chunk) => new Promise((resolve) => {
    if (aborted || res.destroyed) return resolve();
    const buf = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    if (res.write(buf)) return resolve();
    // Contrapresión: se espera a que el cliente consuma (o a que se vaya).
    const done = () => { res.off('drain', done); res.off('close', done); resolve(); };
    res.once('drain', done);
    res.once('close', done);
  });
  const readAsset = async (asset) => {
    if (!blobConfigured()) throw new Error('el almacén de archivos no está configurado');
    const blob = await get(asset.file.pathname, { access: 'private' });
    if (!blob || blob.statusCode !== 200 || !blob.stream) throw new Error('ya no está en el almacén');
    return Readable.fromWeb(blob.stream);
  };

  try {
    const { results } = await writeKitZip(kit, { readAsset, write, isAborted: () => aborted });
    const failed = [...results.values()].filter((r) => !r.ok).length;
    try {
      await logEvent({
        projectId: kit.mrc, type: 'kit_downloaded', actorEmail: session.email,
        data: { legal, files: kit.assets.length, failed, mode: kit.mode },
      });
    } catch (err) {
      console.error('[admin/briefs/:id/kit] no se pudo registrar el evento:', err && err.message);
    }
    res.end();
  } catch (err) {
    if (aborted) return; // el admin canceló la descarga
    console.error('[admin/briefs/:id/kit] error al empaquetar:', err && err.message);
    res.destroy(err);
  } finally {
    res.off('close', onClose);
  }
}
