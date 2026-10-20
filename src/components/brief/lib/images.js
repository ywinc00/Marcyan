// ════════════════════════════════════════════════════════════════
//  src/components/brief/lib/images.js — Fotos a calidad web EN EL NAVEGADOR
//  (decisión 2 del dueño, 2026-10-19)
//
//   · Lado largo ~3000 px, JPEG calidad 0,85.
//   · Orientación correcta: createImageBitmap con imageOrientation
//     'from-image' (la foto de iPhone de lado sale derecha).
//   · Sin EXIF ni GPS: al redibujar en un canvas y recodificar, los metadatos
//     no viajan.
//   · HEIC: primero se intenta con el decodificador del navegador (Safari lo
//     abre); si no puede, se carga 'heic-to' BAJO DEMANDA (decodifica en su
//     propio worker) y solo en ese momento. Si también falla, se sube el
//     original y queda marcado (content-type image/heic + nota).
//   · Logos y documentos NUNCA pasan por aquí: se suben tal cual.
// ════════════════════════════════════════════════════════════════
import { isHeicType, withExt } from './sniff.js';

export const PHOTO_MAX_SIDE = 3000;
export const PHOTO_QUALITY = 0.85;

// Tamaño de salida conservando proporción (puro; lo prueba test:brief-form).
export function fitWithin(w, h, max = PHOTO_MAX_SIDE) {
  const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
  const k = Math.min(1, max / Math.max(W, H));
  return { width: Math.max(1, Math.round(W * k)), height: Math.max(1, Math.round(H * k)) };
}

async function bitmapFrom(blob) {
  // imageOrientation 'from-image' es el valor por defecto en los navegadores
  // actuales; se pide explícito para los que no lo traen por defecto.
  try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); }
  catch { return await createImageBitmap(blob); }
}

let heicLib = null;
async function heicBitmap(blob) {
  if (!heicLib) heicLib = import('heic-to'); // ~1 MB comprimido: solo si llega un HEIC
  const { heicTo } = await heicLib;
  return heicTo({ blob, type: 'bitmap' });
}

async function encodeJpeg(bitmap) {
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(width, height);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    return { blob: await c.convertToBlob({ type: 'image/jpeg', quality: PHOTO_QUALITY }), width, height };
  }
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', PHOTO_QUALITY));
  return { blob, width, height };
}

// preparePhoto(file, realType) →
//   { blob, name, contentType, convertedFrom, original:boolean, note? }
// Nunca lanza: si no se puede convertir, devuelve el original.
export async function preparePhoto(file, realType) {
  const heic = isHeicType(realType);
  let bitmap = null;
  try {
    try {
      bitmap = await bitmapFrom(file);
    } catch (err) {
      if (!heic) throw err;
      bitmap = await heicBitmap(file);
    }
    const out = await encodeJpeg(bitmap);
    return {
      blob: out.blob,
      name: withExt(file.name, 'jpg'),
      contentType: 'image/jpeg',
      convertedFrom: heic ? realType : (realType !== 'image/jpeg' ? realType : null),
      original: false,
    };
  } catch (err) {
    console.warn('[brief] no se pudo preparar la foto; se sube el original', err && err.message);
    return {
      blob: file, name: file.name, contentType: realType, convertedFrom: null, original: true,
      note: heic ? 'HEIC original sin convertir' : 'Original sin reducir',
    };
  } finally {
    try { bitmap && bitmap.close && bitmap.close(); } catch { /* ya liberado */ }
  }
}
