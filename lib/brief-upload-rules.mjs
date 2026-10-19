// ════════════════════════════════════════════════════════════════
//  lib/brief-upload-rules.mjs — Reglas PURAS de las subidas del brief
//  (sin base de datos ni red: las prueba scripts/test-brief-v2.mjs)
//
//  Flujo (Vercel Blob privado, subida directa desde el navegador):
//    1) POST /api/brief/draft     → { draftId, secret } (secreto solo hasheado en Neon)
//    2) upload() de @vercel/blob/client contra /api/brief/upload con
//       clientPayload = JSON { draftId, secret, kind, size, contentType,
//       originalName, tags?, convertedFrom? } y pathname
//       briefs/<draftId>/<kind>/<nombre-seguro>
//    3) onBeforeGenerateToken → checkUploadRequest() (este archivo) + reserva
//       atómica de cupo en Neon → token de un solo uso, 10 min, tamaño exacto.
//    4) Al enviar el brief o el kit: conciliación con list() (el webhook
//       onUploadCompleted no llega en local) y verificación de tipo real
//       por bytes mágicos (isAllowedRealType).
// ════════════════════════════════════════════════════════════════
import crypto from 'node:crypto';

const MB = 1024 * 1024;

// Tipos declarados permitidos por clase de archivo. El navegador declara el
// Content-Type; el real se comprueba después por bytes mágicos.
// AI/EPS: el cliente debe declarar el tipo explícito (el navegador suele
// mandarlo vacío para .ai). Sin ZIP del cliente en la v1 (bombas de
// descompresión).
export const KIND_RULES = Object.freeze({
  logo: {
    maxBytes: 20 * MB,
    declared: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf',
      'application/postscript', 'application/illustrator', 'application/vnd.adobe.illustrator',
      'application/eps', 'application/x-eps', 'image/eps', 'image/x-eps'],
    real: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf',
      'application/postscript', 'application/eps'],
  },
  photo: {
    maxBytes: 15 * MB,
    declared: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    real: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  },
  doc: {
    maxBytes: 25 * MB,
    declared: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    real: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  legal: {
    maxBytes: 15 * MB,
    declared: ['application/pdf', 'image/jpeg', 'image/png'],
    real: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  // Video corto del negocio (opcional; la alternativa es pegar un enlace).
  // Cuenta dentro del cupo de 300 MB del borrador.
  video: {
    maxBytes: 200 * MB,
    declared: ['video/mp4', 'video/quicktime', 'video/webm'],
    real: ['video/mp4', 'video/quicktime', 'video/webm'],
  },
});
export const FILE_KINDS = Object.keys(KIND_RULES);

export const DRAFT_LIMITS = Object.freeze({
  maxFiles: 60,
  maxBytes: 300 * MB,
  // Borrador del brief: 48 h. Borrador del kit: 30 días (el cliente lo
  // completa por partes; el cron solo borra lo caducado y sin enviar).
  ttlMs: { brief: 48 * 60 * 60 * 1000, kit: 30 * 24 * 60 * 60 * 1000 },
});
export const UPLOAD_TOKEN_TTL_MS = 10 * 60 * 1000;
export const DRAFT_PURPOSES = ['brief', 'kit'];

// ── Secretos ──────────────────────────────────────────────────
export const randomSecret = () => crypto.randomBytes(32).toString('base64url');
export const hashSecret = (s) => crypto.createHash('sha256').update(String(s || '')).digest('hex');
export function secretMatches(secret, hash) {
  if (!secret || !hash || typeof secret !== 'string' || secret.length > 200) return false;
  const a = Buffer.from(hashSecret(secret), 'hex');
  const b = Buffer.from(String(hash), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (s) => typeof s === 'string' && UUID_RE.test(s);

// ── Nombres de archivo seguros ────────────────────────────────
// Viven en lib/brief-filename.mjs (sin Node) para que el navegador arme el
// mismo pathname; aquí se re-exportan.
import { safeFileName, cleanOriginalName, draftPrefix, buildPathname } from './brief-filename.mjs';
export { safeFileName, cleanOriginalName, draftPrefix, buildPathname };

// briefs/<uuid>/<kind>/<nombre> → { draftId, kind, name } o null
export function parseBlobPathname(pathname) {
  const m = /^briefs\/([0-9a-f-]{36})\/([a-z]+)\/([^/]+)$/i.exec(String(pathname || ''));
  if (!m || !isUuid(m[1]) || !KIND_RULES[m[2]]) return null;
  if (m[3] !== safeFileName(m[3])) return null; // sin ../, espacios ni rarezas
  return { draftId: m[1].toLowerCase(), kind: m[2], name: m[3] };
}

export function parseClientPayload(raw) {
  if (typeof raw !== 'string' || raw.length > 8000) return null;
  let p;
  try { p = JSON.parse(raw); } catch { return null; }
  if (!p || typeof p !== 'object') return null;
  const size = Number(p.size);
  return {
    draftId: typeof p.draftId === 'string' ? p.draftId.toLowerCase() : null,
    secret: typeof p.secret === 'string' ? p.secret : null,
    kind: typeof p.kind === 'string' ? p.kind : null,
    size: Number.isFinite(size) ? Math.floor(size) : null,
    contentType: typeof p.contentType === 'string' ? p.contentType.toLowerCase().split(';')[0].trim() : null,
    originalName: cleanOriginalName(p.originalName),
    convertedFrom: typeof p.convertedFrom === 'string' ? p.convertedFrom.slice(0, 80) : null,
    tags: (p.tags && typeof p.tags === 'object' && !Array.isArray(p.tags)) ? p.tags : {},
  };
}

// ── Reglas de onBeforeGenerateToken ───────────────────────────
// checkUploadRequest({ pathname, payload, draft, now })
//   payload: resultado de parseClientPayload
//   draft:   fila de brief_drafts { id, secret_hash, purpose, expires_at,
//            submitted_at, files_count, bytes_total } o null
// → { ok:false, status, code, message:{es,en} }
//   { ok:true, kind, size, tokenOptions, tokenPayload }
const fail = (status, code, es, en) => ({ ok: false, status, code, message: { es, en } });
export function checkUploadRequest({ pathname, payload, draft, now = Date.now() }) {
  if (!payload) return fail(400, 'bad_payload', 'No pudimos leer la subida. Vuelve a intentarlo.', 'We could not read the upload. Please try again.');
  if (!isUuid(payload.draftId) || !payload.secret) return fail(401, 'no_draft', 'La sesión de subida no es válida. Recarga la página.', 'The upload session is not valid. Reload the page.');
  const rule = KIND_RULES[payload.kind];
  if (!rule) return fail(400, 'bad_kind', 'Ese tipo de archivo no se puede subir aquí.', 'That kind of file cannot be uploaded here.');
  const parsed = parseBlobPathname(pathname);
  if (!parsed || parsed.draftId !== payload.draftId || parsed.kind !== payload.kind) {
    return fail(400, 'bad_path', 'El nombre del archivo no es válido.', 'The file name is not valid.');
  }
  if (!draft || draft.id !== payload.draftId || !secretMatches(payload.secret, draft.secret_hash)) {
    return fail(401, 'no_draft', 'La sesión de subida no es válida. Recarga la página.', 'The upload session is not valid. Reload the page.');
  }
  if (draft.submitted_at) return fail(409, 'submitted', 'Este formulario ya se envió.', 'This form was already sent.');
  if (new Date(draft.expires_at).getTime() <= now) return fail(410, 'expired', 'La sesión de subida caducó. Recarga la página.', 'The upload session expired. Reload the page.');
  if (!payload.contentType || !rule.declared.includes(payload.contentType)) {
    return fail(415, 'bad_type', 'Ese formato no se acepta para este archivo.', 'That format is not accepted for this file.');
  }
  if (!payload.size || payload.size < 1) return fail(400, 'bad_size', 'El archivo está vacío.', 'The file is empty.');
  if (payload.size > rule.maxBytes) {
    const mb = Math.round(rule.maxBytes / MB);
    return fail(413, 'too_big', `El archivo supera ${mb} MB.`, `The file is larger than ${mb} MB.`);
  }
  if (Number(draft.files_count || 0) + 1 > DRAFT_LIMITS.maxFiles) {
    return fail(429, 'quota_files', `Llegaste al máximo de ${DRAFT_LIMITS.maxFiles} archivos.`, `You reached the limit of ${DRAFT_LIMITS.maxFiles} files.`);
  }
  if (Number(draft.bytes_total || 0) + payload.size > DRAFT_LIMITS.maxBytes) {
    return fail(429, 'quota_bytes', 'Llegaste al máximo de 300 MB en total.', 'You reached the 300 MB total limit.');
  }
  return {
    ok: true,
    kind: payload.kind,
    size: payload.size,
    tokenOptions: {
      // El token admite SOLO el tipo declarado y SOLO el tamaño declarado:
      // la reserva de cupo en Neon es exacta.
      allowedContentTypes: [payload.contentType],
      maximumSizeInBytes: payload.size,
      validUntil: now + UPLOAD_TOKEN_TTL_MS,
      addRandomSuffix: true,
      allowOverwrite: false,
    },
    // Lo que vuelve en onUploadCompleted: SIN el secreto del borrador.
    tokenPayload: JSON.stringify({
      draftId: payload.draftId,
      kind: payload.kind,
      originalName: payload.originalName,
      convertedFrom: payload.convertedFrom,
      tags: payload.tags,
    }),
  };
}

// ── Tipo real por bytes mágicos ───────────────────────────────
const SVG_RE = /^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE\s+svg[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i;
export function looksLikeSvg(headText) {
  return SVG_RE.test(String(headText || '').replace(/^﻿/, ''));
}

const FAMILY = {
  'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'image/heic': 'image', 'image/heif': 'image',
  'image/svg+xml': 'svg',
  'application/pdf': 'print', 'application/postscript': 'print', 'application/illustrator': 'print',
  'application/vnd.adobe.illustrator': 'print', 'application/eps': 'print', 'application/x-eps': 'print',
  'image/eps': 'print', 'image/x-eps': 'print',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'video/mp4': 'video', 'video/quicktime': 'video', 'video/webm': 'video',
};
export const familyOf = (mime) => FAMILY[String(mime || '').toLowerCase()] || null;

// isAllowedRealType({ kind, declared, detected, headText })
//   detected: mime que devuelve file-type (undefined si no reconoce: SVG es texto)
// → { ok, realType }
export function isAllowedRealType({ kind, declared, detected, headText }) {
  const rule = KIND_RULES[kind];
  if (!rule) return { ok: false, realType: detected || null };
  let real = detected ? String(detected).toLowerCase() : null;
  // SVG es texto: file-type no lo detecta o lo ve como XML genérico.
  if ((!real || real === 'application/xml' || real === 'text/xml') && looksLikeSvg(headText)) real = 'image/svg+xml';
  if (real === 'image/heic-sequence') real = 'image/heic';
  if (real === 'image/heif-sequence') real = 'image/heif';
  if (!real || !rule.real.includes(real)) return { ok: false, realType: real };
  // La familia declarada y la real deben coincidir (un .jpg que es PDF no pasa;
  // un PNG declarado como JPEG sí, porque ambos son imagen).
  const fd = familyOf(declared), fr = familyOf(real);
  if (fd && fr && fd !== fr) return { ok: false, realType: real };
  return { ok: true, realType: real };
}

// ── Entrega al panel ──────────────────────────────────────────
// Solo JPEG/PNG/WebP se muestran en línea; SVG (puede llevar scripts),
// documentos y todo lo demás van siempre como descarga.
const INLINE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export function dispositionFor(contentType, name) {
  const type = String(contentType || '').toLowerCase().split(';')[0].trim();
  const mode = INLINE_TYPES.has(type) ? 'inline' : 'attachment';
  const safe = safeFileName(name || 'archivo');
  const utf = encodeURIComponent(cleanOriginalName(name) || safe).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return `${mode}; filename="${safe}"; filename*=UTF-8''${utf}`;
}
