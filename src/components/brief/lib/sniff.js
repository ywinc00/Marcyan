// ════════════════════════════════════════════════════════════════
//  src/components/brief/lib/sniff.js — Tipo REAL de un archivo por sus
//  primeros bytes (bytes mágicos), en el navegador y ANTES de subir.
//
//  El servidor vuelve a comprobarlo al enviar (lib/brief-upload-rules.mjs,
//  isAllowedRealType con file-type); aquí solo sirve para avisar al cliente
//  en el momento ("ese archivo no es una imagen") y para declarar el
//  Content-Type correcto (el navegador lo manda vacío para .ai, .eps o .heic).
//  Puro: lo prueba scripts/test-brief-form.mjs.
// ════════════════════════════════════════════════════════════════

// Lo que acepta cada clase de archivo en el NAVEGADOR. Debe ser un
// subconjunto de KIND_RULES[kind].declared (lo vigila test:brief-form).
// El orden del `accept` importa: image/jpeg primero hace que Safari de iOS
// entregue las fotos HEIC ya convertidas a JPEG.
export const CLIENT_KINDS = Object.freeze({
  photo: {
    accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif',
    types: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  },
  logo: {
    accept: 'image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,application/postscript,.png,.jpg,.jpeg,.webp,.svg,.pdf,.ai,.eps',
    types: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf', 'application/postscript', 'application/eps'],
  },
  doc: {
    accept: 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx',
    types: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  legal: {
    accept: 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png',
    types: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  video: {
    accept: 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm',
    types: ['video/mp4', 'video/quicktime', 'video/webm'],
  },
});

// Topes del servidor (DRAFT_LIMITS y KIND_RULES.maxBytes). El borrador los
// devuelve al crearse; estos son los valores por defecto antes de tenerlo.
const MB = 1024 * 1024;
export const DEFAULT_LIMITS = Object.freeze({
  maxFiles: 60,
  maxBytes: 300 * MB,
  kinds: {
    logo: { maxBytes: 20 * MB }, photo: { maxBytes: 15 * MB }, doc: { maxBytes: 25 * MB },
    legal: { maxBytes: 15 * MB }, video: { maxBytes: 200 * MB },
  },
});
// Foto ORIGINAL que aceptamos para reducirla en el navegador (luego sale de
// ~3000 px y muy por debajo de los 15 MB del servidor).
export const PHOTO_SOURCE_MAX = 60 * MB;

const ascii = (bytes, from, to) => {
  let s = '';
  for (let i = from; i < Math.min(to, bytes.length); i++) s += String.fromCharCode(bytes[i]);
  return s;
};
const starts = (bytes, sig, at = 0) => sig.every((b, i) => bytes[at + i] === b);

// sniffBytes(Uint8Array de los primeros ~512 bytes) → mime real o null.
export function sniffBytes(bytes) {
  if (!bytes || !bytes.length) return null;
  if (starts(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'image/webp';
  if (ascii(bytes, 0, 5) === '%PDF-') return 'application/pdf';
  if (ascii(bytes, 0, 4) === '%!PS') return 'application/postscript';
  if (starts(bytes, [0xc5, 0xd0, 0xd3, 0xc6])) return 'application/eps'; // EPS binario
  if (starts(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'video/webm';
  if (starts(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    // ZIP: solo vale si es un .docx (lleva "word/" en el directorio). Sin
    // ZIP genéricos del cliente en la v1.
    return ascii(bytes, 0, bytes.length).includes('word/') || ascii(bytes, 0, bytes.length).includes('[Content_Types].xml')
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/zip';
  }
  if (ascii(bytes, 4, 8) === 'ftyp') {
    const brand = ascii(bytes, 8, 12).replace(/\0/g, ' ').trim();
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis'].includes(brand)) return 'image/heic';
    if (['mif1', 'msf1'].includes(brand)) return 'image/heif';
    if (brand === 'qt') return 'video/quicktime';
    if (/^(isom|iso\d|mp4\d|mp41|mp42|avc1|M4V|M4VP|dash|f4v|MSNV|3gp\d)$/i.test(brand)) return 'video/mp4';
    if (['avif', 'avis'].includes(brand)) return 'image/avif';
    return null;
  }
  // SVG es texto: <svg> tras una cabecera XML, comentarios o DOCTYPE opcionales.
  const head = ascii(bytes, 0, Math.min(bytes.length, 1024)).replace(/^﻿|^ï»¿/, '');
  if (/^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE\s+svg[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head)) return 'image/svg+xml';
  return null;
}

// Lee la cabecera de un File/Blob (navegador) y devuelve el mime real.
export async function sniffFile(file) {
  const buf = await file.slice(0, 1024).arrayBuffer();
  return sniffBytes(new Uint8Array(buf));
}

// ¿Este tipo real se puede subir en esta clase de archivo?
export const allowedFor = (kind, mime) => !!(CLIENT_KINDS[kind] && mime && CLIENT_KINDS[kind].types.includes(mime));
export const isHeicType = (mime) => mime === 'image/heic' || mime === 'image/heif';

// Tamaño legible (KB/MB) en el idioma de la página.
export function fmtBytes(n, lang = 'es') {
  const v = Number(n) || 0;
  const loc = lang === 'en' ? 'en-US' : 'es-US';
  if (v < MB) return `${Math.max(1, Math.round(v / 1024)).toLocaleString(loc)} KB`;
  return `${(v / MB).toLocaleString(loc, { maximumFractionDigits: v < 10 * MB ? 1 : 0 })} MB`;
}

// Nombre con la extensión cambiada (foto.HEIC → foto.jpg).
export function withExt(name, ext) {
  const s = String(name || 'foto');
  const dot = s.lastIndexOf('.');
  return `${dot > 0 ? s.slice(0, dot) : s}.${ext}`;
}
