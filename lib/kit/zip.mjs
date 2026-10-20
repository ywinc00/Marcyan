// ════════════════════════════════════════════════════════════════
//  lib/kit/zip.mjs — Empaqueta el kit (lib/kit/build.mjs) en un .zip EN
//  STREAMING con fflate: nunca se arma el zip entero en memoria (un brief
//  puede llegar a 300 MB de archivos por momento).
//
//  writeKitZip(kit, { readAsset, write, isAborted, mtime })
//    · readAsset(asset) → async iterable de Uint8Array (o lanza): el endpoint
//      lee el blob privado; las pruebas, archivos falsos en memoria.
//    · write(chunk, final) → promesa que se resuelve cuando el destino puede
//      recibir más (contrapresión: así no se acumula en memoria).
//  Orden: textos → archivos del cliente → PLACEHOLDERS.md y MANIFEST.md (que
//  anotan qué archivo falló y su sha256). Si un archivo falla, el zip sigue.
//  Devuelve { results: Map(path → {ok, bytes, sha256?, error?, partial?}), bytes }.
// ════════════════════════════════════════════════════════════════
import crypto from 'node:crypto';
import { Zip, ZipPassThrough, ZipDeflate, strToU8 } from 'fflate';

const EMPTY = new Uint8Array(0);

export async function writeKitZip(kit, { readAsset, write, isAborted = () => false, mtime = new Date() } = {}) {
  if (typeof write !== 'function') throw new Error('writeKitZip: falta write');
  let pending = Promise.resolve();
  let zipError = null;
  let total = 0;
  const zip = new Zip((err, chunk, final) => {
    if (err) { zipError = err; return; }
    total += chunk.length;
    // Las escrituras se encadenan en orden; quien empuja datos espera `pending`.
    pending = pending.then(() => write(chunk, final));
  });
  const flush = async () => {
    await pending;
    if (zipError) throw zipError;
    if (isAborted()) throw new Error('descarga cancelada');
  };
  const entry = (path, Kind) => {
    const f = Kind === ZipDeflate ? new ZipDeflate(`${kit.root}/${path}`, { level: 6 }) : new ZipPassThrough(`${kit.root}/${path}`);
    f.mtime = mtime;
    return f;
  };
  const addText = async (path, content) => {
    const f = entry(path, ZipDeflate);
    zip.add(f);
    f.push(strToU8(content), true);
    await flush();
  };

  for (const d of kit.docs) await addText(d.path, d.content);

  const results = new Map();
  for (const a of kit.assets) {
    if (isAborted()) throw new Error('descarga cancelada');
    let source;
    try {
      source = readAsset ? await readAsset(a) : null;
      if (!source) throw new Error('sin contenido');
    } catch (err) {
      // Aún no se abrió la entrada: el archivo simplemente no va en el zip.
      results.set(a.path, { ok: false, error: (err && err.message) || 'error', partial: false });
      continue;
    }
    const f = entry(a.path, a.store ? ZipPassThrough : ZipDeflate);
    zip.add(f);
    const hash = crypto.createHash('sha256');
    let bytes = 0;
    try {
      for await (const chunk of source) {
        const u8 = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
        if (!u8.length) continue;
        hash.update(u8);
        bytes += u8.length;
        f.push(u8, false);
        await flush();
      }
      f.push(EMPTY, true);
      await flush();
      results.set(a.path, { ok: true, bytes, sha256: hash.digest('hex') });
    } catch (err) {
      if (isAborted()) throw err;
      // La entrada ya está abierta: se cierra con lo leído (queda incompleta
      // pero el zip sigue siendo válido) y PLACEHOLDERS lo anota.
      try { f.push(EMPTY, true); await flush(); } catch (e2) { throw e2; }
      results.set(a.path, { ok: false, bytes, error: (err && err.message) || 'error', partial: true });
    }
  }

  for (const d of kit.late(results)) await addText(d.path, d.content);
  zip.end();
  await flush();
  return { results, bytes: total };
}

// Atajo para pruebas y para el mock: el zip completo en memoria.
export async function kitZipToBuffer(kit, opts = {}) {
  const parts = [];
  const { results } = await writeKitZip(kit, { ...opts, write: async (c) => { parts.push(c); } });
  const size = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(size);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return { zip: out, results };
}
