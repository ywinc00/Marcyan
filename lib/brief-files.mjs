// ════════════════════════════════════════════════════════════════
//  lib/brief-files.mjs — Borradores y archivos del brief (Neon + Vercel Blob)
//
//  Tablas: brief_drafts y brief_files (db/migrations/010_brief_v2.sql).
//  Almacén: Vercel Blob PRIVADO (BLOB_READ_WRITE_TOKEN; nunca se registra).
//  Las reglas puras (tipos, tamaños, cupos, nombres) viven en
//  lib/brief-upload-rules.mjs para poder probarlas sin red.
//
//  Defensiva con la migración: si las tablas aún no existen, las funciones
//  que se llaman desde /api/brief devuelven vacío y registran un log breve
//  en lugar de romper el envío del brief.
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';
import { list, head, get, del } from '@vercel/blob';
import { fileTypeFromBuffer, fileTypeFromStream } from 'file-type';
import {
  DRAFT_LIMITS, randomSecret, hashSecret, draftPrefix, parseBlobPathname,
  isAllowedRealType, cleanOriginalName, isUuid, splitReconcile, removedFromMeta, declaredFromMeta, sweepMeta,
} from './brief-upload-rules.mjs';
import { normalizeFileTags } from './brief-schema.mjs';

export const blobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// Tabla o columna inexistente (migración 010 sin aplicar).
export const isMissingSchema = (err) => Boolean(err && (err.code === '42P01' || err.code === '42703'));

// ── Borradores ────────────────────────────────────────────────
// createDraft({ purpose:'brief'|'kit', briefId?, ip }) → { draftId, secret, expiresAt }
export async function createDraft({ purpose = 'brief', briefId = null, ip = null }) {
  const secret = randomSecret();
  const expiresAt = new Date(Date.now() + (DRAFT_LIMITS.ttlMs[purpose] || DRAFT_LIMITS.ttlMs.brief));
  const r = await sql`
    INSERT INTO brief_drafts (secret_hash, purpose, brief_id, ip, expires_at)
    VALUES (${hashSecret(secret)}, ${purpose}, ${briefId}, ${ip}, ${expiresAt.toISOString()})
    RETURNING id
  `;
  return { draftId: r.rows[0].id, secret, expiresAt };
}

export async function getDraft(draftId) {
  if (!isUuid(draftId)) return null;
  const r = await sql`
    SELECT id, secret_hash, purpose, brief_id, expires_at, submitted_at, files_count, bytes_total
      FROM brief_drafts WHERE id = ${draftId} LIMIT 1
  `;
  return r.rowCount ? r.rows[0] : null;
}

// Reserva ATÓMICA al emitir un token de subida, en una sola sentencia:
//   · suma el cupo solo si el borrador sigue abierto y no se pasa de
//     60 archivos / 300 MB (cien peticiones simultáneas no saltan el tope);
//   · reserva la ruta en brief_files (fila sin brief, verified NULL). Una ruta
//     ya reservada no se vuelve a reservar: un token = un archivo.
// La conciliación al enviar solo acepta rutas reservadas.
export async function reserveUpload({
  draftId, size, pathname, kind, contentType = null, originalName = null, convertedFrom = null, tags = {},
}) {
  const cleanTags = normalizeFileTags(kind, tags);
  const r = await sql`
    WITH upd AS (
      UPDATE brief_drafts
         SET files_count = files_count + 1,
             bytes_total = bytes_total + ${size}
       WHERE id = ${draftId}
         AND submitted_at IS NULL
         AND expires_at > NOW()
         AND files_count + 1 <= ${DRAFT_LIMITS.maxFiles}
         AND bytes_total + ${size} <= ${DRAFT_LIMITS.maxBytes}
         AND NOT EXISTS (SELECT 1 FROM brief_files WHERE pathname = ${pathname})
      RETURNING id
    )
    INSERT INTO brief_files (draft_id, kind, pathname, content_type, size, original_name, converted_from, tags)
    SELECT upd.id, ${kind}::text, ${pathname}::text, ${contentType}::text, ${size}::bigint,
           ${cleanOriginalName(originalName)}::text, ${convertedFrom}::text, ${JSON.stringify(cleanTags)}::jsonb
      FROM upd
    ON CONFLICT (pathname) DO NOTHING
    RETURNING id
  `;
  return r.rowCount > 0;
}

// ¿La ruta ya está reservada? Solo para elegir el mensaje cuando la reserva
// falla (ruta repetida o cupo lleno).
export async function pathnameTaken(pathname) {
  const r = await sql`SELECT 1 FROM brief_files WHERE pathname = ${pathname} LIMIT 1`;
  return r.rowCount > 0;
}

// Marca el borrador como enviado (el secreto deja de valer para subir).
export async function markDraftSubmitted(draftId, briefId) {
  const r = await sql`
    UPDATE brief_drafts
       SET submitted_at = NOW(), brief_id = COALESCE(brief_id, ${briefId})
     WHERE id = ${draftId} AND submitted_at IS NULL
    RETURNING id
  `;
  return r.rowCount > 0;
}

// Cierra los borradores de kit abiertos de un brief: caducan YA, así su
// secreto deja de emitir tokens de subida (checkUploadRequest y la reserva
// exigen expires_at futuro) y el cron los limpia conservando lo que ya
// quedó enlazado al brief. Se llama al regenerar el enlace del kit (un
// enlace filtrado deja de servir también para subir) y al enviar el kit.
export async function closeKitDrafts(briefId) {
  const r = await sql`
    UPDATE brief_drafts SET expires_at = NOW()
     WHERE brief_id = ${briefId} AND purpose = 'kit'
       AND submitted_at IS NULL AND expires_at > NOW()
    RETURNING id
  `;
  return r.rowCount;
}

// ── Cola de reintento (revisión R4, migración 016) ────────────
// Un borrador cerrado cuya conciliación falló (o cuyo borrado en Blob
// falló) entra aquí con lo que mandó el navegador; el cron lo repite. Nunca
// lanza: sin la migración 016 solo queda el aviso en el log.
export async function queueDraftSweep(draftId, filesMeta = null) {
  const meta = sweepMeta(filesMeta);
  try {
    await sql`
      UPDATE brief_drafts
         SET sweep_at = NOW(), sweep_meta = COALESCE(${meta === null ? null : JSON.stringify(meta)}::jsonb, sweep_meta)
       WHERE id = ${draftId}
    `;
    return true;
  } catch (err) {
    console.error('[brief-files] no se pudo dejar el borrador en la cola de reintento:',
      isMissingSchema(err) ? 'falta la migración 016' : (err && err.message));
    return false;
  }
}

// Cron: repite la conciliación de los borradores en cola. Si el brief ya
// no existe (brief_id NULL), borra todo lo del borrador. Lo que vuelve a
// fallar sigue en la cola para el día siguiente.
export async function sweepQueuedDrafts({ limit = 25 } = {}) {
  const r = await sql`
    SELECT id, brief_id, sweep_meta FROM brief_drafts
     WHERE sweep_at IS NOT NULL
     ORDER BY sweep_at
     LIMIT ${limit}
  `;
  let swept = 0, failed = 0;
  for (const d of r.rows) {
    // Se saca de la cola ANTES: si el borrado vuelve a fallar dentro de
    // reconcileDraft, él mismo lo vuelve a encolar.
    await sql`UPDATE brief_drafts SET sweep_at = NULL WHERE id = ${d.id}`;
    try {
      if (d.brief_id === null || d.brief_id === undefined) {
        await delInChunks((await listAll(draftPrefix(d.id))).map((b) => b.pathname));
        await sql`DELETE FROM brief_files WHERE draft_id = ${d.id}`;
        await sql`DELETE FROM brief_drafts WHERE id = ${d.id}`;
      } else {
        await reconcileDraft({ draftId: d.id, briefId: d.brief_id, filesMeta: Array.isArray(d.sweep_meta) ? d.sweep_meta : null });
        await sql`UPDATE brief_drafts SET sweep_meta = NULL WHERE id = ${d.id} AND sweep_at IS NULL`;
      }
      swept++;
    } catch (err) {
      failed++;
      console.error(`[brief-files] reintento del borrador ${d.id} falló:`, err && err.message);
      await sql`UPDATE brief_drafts SET sweep_at = NOW() WHERE id = ${d.id}`.catch(() => {});
    }
  }
  return { swept, failed };
}

// ── Filas de archivo ──────────────────────────────────────────
// Upsert por pathname (único). Lo usan el webhook onUploadCompleted y la
// conciliación al enviar; el que llegue segundo completa lo que falte sin
// pisar el tipo real ya verificado.
export async function upsertFileRow({
  draftId, briefId = null, kind, pathname, contentType = null, size = null,
  originalName = null, convertedFrom = null, tags = {},
}) {
  const cleanTags = normalizeFileTags(kind, tags);
  const r = await sql`
    INSERT INTO brief_files (draft_id, brief_id, kind, pathname, content_type, size, original_name, converted_from, tags)
    VALUES (${draftId}, ${briefId}, ${kind}, ${pathname}, ${contentType}, ${size},
            ${cleanOriginalName(originalName)}, ${convertedFrom}, ${JSON.stringify(cleanTags)}::jsonb)
    ON CONFLICT (pathname) DO UPDATE SET
      brief_id       = COALESCE(EXCLUDED.brief_id, brief_files.brief_id),
      size           = COALESCE(EXCLUDED.size, brief_files.size),
      original_name  = COALESCE(EXCLUDED.original_name, brief_files.original_name),
      converted_from = COALESCE(EXCLUDED.converted_from, brief_files.converted_from),
      tags           = CASE WHEN EXCLUDED.tags <> '{}'::jsonb THEN EXCLUDED.tags ELSE brief_files.tags END,
      content_type   = CASE WHEN brief_files.verified IS TRUE THEN brief_files.content_type
                            ELSE COALESCE(EXCLUDED.content_type, brief_files.content_type) END
    RETURNING id
  `;
  return r.rows[0].id;
}

// Webhook de Vercel Blob (onUploadCompleted): no funciona en local ni es
// garantizado; la conciliación al enviar es la fuente de verdad.
export async function recordUploadedBlob({ blob, tokenPayload }) {
  let p = {};
  try { p = JSON.parse(tokenPayload || '{}') || {}; } catch { p = {}; }
  const parsed = parseBlobPathname(blob && blob.pathname);
  if (!parsed || parsed.draftId !== p.draftId) {
    console.warn('[brief-files] subida completada con ruta inesperada; se ignora');
    return null;
  }
  // Solo rutas reservadas al emitir el token (con addRandomSuffix false, la
  // ruta del blob es exactamente la reservada).
  const reserved = await sql`
    SELECT 1 FROM brief_files WHERE pathname = ${blob.pathname} AND draft_id = ${parsed.draftId} LIMIT 1
  `;
  if (!reserved.rowCount) {
    console.warn('[brief-files] subida completada sin reserva; se ignora');
    return null;
  }
  const draft = await getDraft(parsed.draftId);
  // Solo se enlaza al brief si el borrador del kit sigue abierto: tras
  // regenerar el enlace o enviar el kit, una subida tardía no entra en la ficha.
  const open = draft && !draft.submitted_at && new Date(draft.expires_at).getTime() > Date.now();
  return upsertFileRow({
    draftId: parsed.draftId,
    briefId: draft && draft.purpose === 'kit' && open ? draft.brief_id : null,
    kind: parsed.kind,
    pathname: blob.pathname,
    contentType: blob.contentType || null,
    originalName: p.originalName || null,
    convertedFrom: p.convertedFrom || null,
    tags: p.tags || {},
  });
}

// Todos los blobs bajo un prefijo (paginado).
async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

// Conciliación al enviar: lo que hay en Blob manda, pero SOLO en las rutas
// reservadas al emitir cada token y dentro del cupo del borrador; lo demás
// se borra del almacén. filesMeta (opcional, lo manda el navegador al
// enviar) aporta etiquetas y nombre original:
//   [{ pathname, tags?, originalName?, convertedFrom?, contentType?, removed? }]
// Lo marcado removed:true (el cliente lo quitó, o un intento cortado) se
// BORRA del almacén y de brief_files, también si ya estaba enlazado (kit).
// Si el navegador manda la lista, solo se enlaza lo que declara (o lo ya
// enlazado antes): una subida que el cliente nunca vio terminar (recarga a
// mitad, pestaña descartada) se borra en vez de entrar en silencio (R6).
// Si el almacén falla al borrar, el borrador entra en la cola de reintento
// del cron (R4). Devuelve las filas del borrador ya enlazadas a briefId.
export async function reconcileDraft({ draftId, briefId, filesMeta = null }) {
  const meta = new Map();
  for (const m of Array.isArray(filesMeta) ? filesMeta.slice(0, 200) : []) {
    if (m && typeof m.pathname === 'string') meta.set(m.pathname, m);
  }
  const existing = await sql`SELECT pathname, content_type, brief_id FROM brief_files WHERE draft_id = ${draftId}`;
  const known = new Map(existing.rows.map((r) => [r.pathname, r]));
  const linked = new Set(existing.rows.filter((r) => r.brief_id !== null && r.brief_id !== undefined).map((r) => r.pathname));
  const removed = removedFromMeta(filesMeta, draftId);
  const declared = declaredFromMeta(filesMeta, draftId);
  const { keep: blobs, drop } = splitReconcile({
    blobs: await listAll(draftPrefix(draftId)), reserved: new Set(known.keys()), removed, declared, linked,
  });
  if (drop.length) {
    try {
      await delInChunks(drop.map((b) => b.pathname));
    } catch (err) {
      // Blob falló: el borrador entra en la cola del cron, que repite esta
      // conciliación con lo mismo que mandó el navegador (R4).
      console.error('[brief-files] no se pudieron borrar archivos descartados:', err && err.message);
      await queueDraftSweep(draftId, filesMeta);
    }
    const quitados = drop.filter((b) => removed.has(b.pathname)).length;
    if (drop.length > quitados) console.warn(`[brief-files] ${drop.length - quitados} archivo(s) sin reserva, sin declarar o fuera del cupo descartados`);
  }
  // Lo que el cliente quitó sale de brief_files (con o sin blob detrás), y
  // también la reserva de lo descartado que no estaba enlazado.
  const dropped = drop.map((b) => b.pathname).filter((p) => known.has(p) && !linked.has(p) && !removed.has(p));
  if (removed.size || dropped.length) {
    await sql`
      DELETE FROM brief_files
       WHERE draft_id = ${draftId}
         AND (pathname = ANY(${[...removed]}) OR (brief_id IS NULL AND pathname = ANY(${dropped})))
    `;
  }
  for (const b of blobs) {
    const parsed = parseBlobPathname(b.pathname);
    if (!parsed || parsed.draftId !== draftId) continue;
    const m = meta.get(b.pathname) || {};
    let contentType = (known.get(b.pathname) || {}).content_type || (typeof m.contentType === 'string' ? m.contentType : null);
    if (!contentType) {
      try { contentType = (await head(b.pathname)).contentType || null; } catch { contentType = null; }
    }
    await upsertFileRow({
      draftId, briefId, kind: parsed.kind, pathname: b.pathname, contentType, size: b.size,
      originalName: m.originalName || null, convertedFrom: m.convertedFrom || null, tags: m.tags || {},
    });
  }
  // Filas del webhook sin blob detrás (subida a medias): se quedan sin
  // brief y el cron las limpia con el borrador.
  if (briefId) {
    await sql`
      UPDATE brief_files SET brief_id = ${briefId}
       WHERE draft_id = ${draftId} AND pathname = ANY(${blobs.map((b) => b.pathname)})
    `;
  }
  const r = await sql`
    SELECT id, kind, pathname, content_type, size, original_name, converted_from, tags, verified
      FROM brief_files WHERE draft_id = ${draftId} AND brief_id IS NOT DISTINCT FROM ${briefId}
     ORDER BY id
  `;
  return r.rows;
}

// ── Verificación del tipo real (bytes mágicos) ────────────────
async function readHead(pathname, max = 4100) {
  const res = await get(pathname, { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return null;
  const reader = res.stream.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (total < max) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).subarray(0, max);
}

async function detectFromFullStream(pathname) {
  const res = await get(pathname, { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return undefined;
  try {
    return await fileTypeFromStream(res.stream);
  } finally {
    res.stream.cancel().catch(() => {});
  }
}

// verifyFile(row) → { id, ok, realType } ; si no coincide: del() + verified=false
export async function verifyFile(row) {
  const buf = await readHead(row.pathname);
  if (!buf) {
    await sql`UPDATE brief_files SET verified = false WHERE id = ${row.id}`;
    return { id: row.id, ok: false, realType: null, missing: true };
  }
  let detected = await fileTypeFromBuffer(buf);
  // DOCX es un ZIP: con la cabecera sola a veces solo se ve "zip".
  if (row.kind === 'doc' && (!detected || detected.ext === 'zip')) {
    detected = await detectFromFullStream(row.pathname);
  }
  const check = isAllowedRealType({
    kind: row.kind,
    declared: row.content_type,
    detected: detected && detected.mime,
    headText: buf.subarray(0, 1024).toString('utf8'),
    head: buf,
  });
  if (check.ok) {
    await sql`UPDATE brief_files SET verified = true, content_type = ${check.realType} WHERE id = ${row.id}`;
  } else {
    try { await del(row.pathname); } catch (err) { console.error('[brief-files] no se pudo borrar un archivo rechazado:', err && err.message); }
    await sql`UPDATE brief_files SET verified = false, content_type = ${check.realType} WHERE id = ${row.id}`;
    console.warn(`[brief-files] archivo ${row.id} rechazado: declarado ${row.content_type}, real ${check.realType || 'desconocido'}${check.gps ? ' (foto con GPS)' : ''}`);
  }
  return { id: row.id, ok: check.ok, realType: check.realType };
}

// Verifica en paralelo (4 a la vez) las filas pendientes. Nunca lanza.
export async function verifyFiles(rows, { concurrency = 4 } = {}) {
  const pending = (rows || []).filter((r) => r.verified === null || r.verified === undefined);
  const out = { verified: 0, rejected: 0, errors: 0 };
  let i = 0;
  async function worker() {
    while (i < pending.length) {
      const row = pending[i++];
      try {
        const r = await verifyFile(row);
        if (r.ok) out.verified++; else out.rejected++;
      } catch (err) {
        out.errors++;
        console.error(`[brief-files] verificación del archivo ${row.id} falló:`, err && err.message);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker));
  return out;
}

// ── Lectura para el panel ─────────────────────────────────────
export async function listFilesForBrief(briefId) {
  const r = await sql`
    SELECT f.id, f.kind, f.pathname, f.content_type, f.size, f.original_name, f.converted_from,
           f.tags, f.verified, f.created_at, d.purpose
      FROM brief_files f
      LEFT JOIN brief_drafts d ON d.id = f.draft_id
     WHERE f.brief_id = ${briefId}
     ORDER BY f.kind, f.id
  `;
  return r.rows;
}

export async function getFileById(id) {
  const r = await sql`
    SELECT id, brief_id, kind, pathname, content_type, size, original_name, verified
      FROM brief_files WHERE id = ${id} LIMIT 1
  `;
  return r.rowCount ? r.rows[0] : null;
}

// ── Borrado ───────────────────────────────────────────────────
async function delInChunks(pathnames) {
  const uniq = [...new Set(pathnames)];
  for (let i = 0; i < uniq.length; i += 100) await del(uniq.slice(i, i + 100));
  return uniq.length;
}

// Borra TODOS los blobs de un brief (sus filas + todo lo que haya bajo los
// prefijos de sus borradores) y luego sus filas. Si Blob falla, lanza: el
// llamador NO debe borrar el brief (quedarían archivos huérfanos).
export async function deleteBriefBlobs(briefId) {
  let rows, drafts;
  try {
    rows = (await sql`SELECT pathname FROM brief_files WHERE brief_id = ${briefId}`).rows;
    drafts = (await sql`SELECT id FROM brief_drafts WHERE brief_id = ${briefId}`).rows;
  } catch (err) {
    if (isMissingSchema(err)) return 0; // migración 010 sin aplicar: no hay archivos
    throw err;
  }
  if (!rows.length && !drafts.length) return 0;
  if (!blobConfigured()) throw new Error('Almacén de archivos no configurado');
  const paths = rows.map((r) => r.pathname);
  for (const d of drafts) paths.push(...(await listAll(draftPrefix(d.id))).map((b) => b.pathname));
  const n = await delInChunks(paths);
  await sql`DELETE FROM brief_files WHERE brief_id = ${briefId}`;
  await sql`DELETE FROM brief_drafts WHERE brief_id = ${briefId}`;
  return n;
}

// Cron: borradores caducados y sin enviar (brief: 48 h · kit: 30 días).
// Conserva los archivos ya enlazados a un brief (kit guardado por partes).
// Trabaja por tandas de `limit` hasta vaciar la cola o agotar `budgetMs`
// (la función del cron tiene 300 s): si un día caducan cientos, no se
// acumulan blobs. Cada borrador tratado sale de la cola (se borra o se cierra).
export async function cleanupExpiredDrafts({ limit = 50, budgetMs = 180000 } = {}) {
  const until = Date.now() + budgetMs;
  let drafts = 0, blobs = 0, batches = 0;
  while (Date.now() < until) {
    const r = await sql`
      SELECT id FROM brief_drafts
       WHERE submitted_at IS NULL AND expires_at < NOW()
       ORDER BY expires_at
       LIMIT ${limit}
    `;
    if (!r.rowCount) break;
    batches++;
    const out = await cleanupDrafts(r.rows, until);
    drafts += out.drafts; blobs += out.blobs;
    if (r.rowCount < limit) break;
  }
  const pending = Date.now() >= until;
  return { drafts, blobs, batches, pending };
}

// Una tanda: borra los blobs sin enlazar y la fila del borrador (o lo cierra
// si conserva archivos de un kit ya enlazados al brief).
async function cleanupDrafts(rows, until) {
  let drafts = 0, blobs = 0;
  for (const { id } of rows) {
    if (Date.now() >= until) break;
    const linked = new Set((await sql`
      SELECT pathname FROM brief_files WHERE draft_id = ${id} AND brief_id IS NOT NULL
    `).rows.map((x) => x.pathname));
    const toDelete = (await listAll(draftPrefix(id))).map((b) => b.pathname).filter((p) => !linked.has(p));
    blobs += await delInChunks(toDelete);
    await sql`DELETE FROM brief_files WHERE draft_id = ${id} AND brief_id IS NULL`;
    if (linked.size) {
      // Quedan archivos de un kit enlazados al brief: el borrador se cierra
      // (sin secreto válido) pero sus filas se conservan.
      await sql`UPDATE brief_drafts SET submitted_at = NOW(), ip = NULL WHERE id = ${id}`;
    } else {
      await sql`DELETE FROM brief_drafts WHERE id = ${id}`;
    }
    drafts++;
  }
  return { drafts, blobs };
}

// Cron: verifica archivos pendientes de briefs ya enviados (si la
// verificación en línea no terminó a tiempo).
export async function verifyPendingFiles({ limit = 40 } = {}) {
  const r = await sql`
    SELECT id, kind, pathname, content_type, verified
      FROM brief_files
     WHERE verified IS NULL AND brief_id IS NOT NULL
     ORDER BY created_at
     LIMIT ${limit}
  `;
  return verifyFiles(r.rows);
}
