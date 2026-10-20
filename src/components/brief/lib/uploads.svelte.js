// ════════════════════════════════════════════════════════════════
//  src/components/brief/lib/uploads.svelte.js — Subidas del brief y del kit
//
//  Contrato de la ola 1 (api/brief/draft.mjs, api/brief/upload.mjs,
//  lib/brief-upload-rules.mjs):
//    1) Al PRIMER archivo: POST /api/brief/draft → { draftId, secret, limits }.
//    2) Por archivo: POST /api/brief/upload con el evento
//       'blob.generate-client-token' (pathname exacto + clientPayload) → token
//       de un solo uso para esa ruta. Se pide a mano (no con upload()) para
//       poder enseñar el mensaje del servidor en el idioma del cliente.
//    3) put() de '@vercel/blob/client' con ese token: subida DIRECTA al
//       almacén privado, con progreso y cancelación.
//    4) Al enviar, el formulario manda draftId + secret + files (metadatos).
//
//  Antes de subir: tipo real por bytes mágicos (sniff.js), topes del servidor
//  (60 archivos / 300 MB por borrador, tope por clase) y fotos reducidas en el
//  navegador (images.js). Logos y documentos van ORIGINALES.
//  En desarrollo, public/dev/brief-mock.js sustituye la subida real
//  (window.__briefMock.put); en producción esa rama no existe.
// ════════════════════════════════════════════════════════════════
import { buildPathname } from '../../../../lib/brief-filename.mjs';
import { CLIENT_KINDS, DEFAULT_LIMITS, PHOTO_SOURCE_MAX, sniffFile, allowedFor, fmtBytes } from './sniff.js';
import { preparePhoto } from './images.js';

const L = (es, en) => ({ es, en });
const MSG = {
  type: {
    photo: L('Este archivo no es una foto JPG, PNG, WebP o HEIC.', 'This file is not a JPG, PNG, WebP or HEIC photo.'),
    logo: L('Este formato no sirve para el logo. Usa PNG, JPG, SVG, PDF, AI o EPS.', 'This format does not work for a logo. Use PNG, JPG, SVG, PDF, AI or EPS.'),
    doc: L('Usa un PDF o un documento de Word (.docx).', 'Use a PDF or a Word document (.docx).'),
    legal: L('Usa un PDF, JPG o PNG.', 'Use a PDF, JPG or PNG.'),
    video: L('Usa un video MP4, MOV o WebM.', 'Use an MP4, MOV or WebM video.'),
  },
  tooBig: (max, lang) => L(`El archivo pesa más de ${fmtBytes(max, 'es')}.`, `The file is larger than ${fmtBytes(max, 'en')}.`)[lang],
  empty: L('El archivo está vacío.', 'The file is empty.'),
  fieldMax: (n) => L(`Aquí caben hasta ${n} archivos.`, `This spot takes up to ${n} files.`),
  quotaFiles: (n) => L(`Llegaste al máximo de ${n} archivos.`, `You reached the limit of ${n} files.`),
  quotaBytes: L('Llegaste al máximo de 300 MB en total.', 'You reached the 300 MB total limit.'),
  network: L('Se cortó la conexión. Vuelve a intentarlo.', 'The connection dropped. Please try again.'),
  token: L('No pudimos preparar la subida. Vuelve a intentarlo.', 'We could not prepare the upload. Please try again.'),
  off: L('Las subidas no están disponibles ahora mismo. Puedes enviar el formulario sin archivos.', 'Uploads are not available right now. You can send the form without files.'),
  read: L('No pudimos leer este archivo.', 'We could not read this file.'),
};

const CONCURRENCY = 3;
const MULTIPART_FROM = 50 * 1024 * 1024;
let seq = 0;
const uid = () => `f${Date.now().toString(36)}${(++seq).toString(36)}`;

export class UploadError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}

// Lo que llega del servidor puede traer el mensaje en el idioma del cliente.
async function postJSON(url, body, lang) {
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new UploadError(MSG.network[lang], 0);
  }
  let json = null;
  try { json = await res.json(); } catch { /* cuerpo vacío o no JSON */ }
  if (!res.ok || !json || json.ok === false) {
    throw new UploadError((json && json.error) || MSG.token[lang], res.status);
  }
  return json;
}

export class Uploads {
  files = $state([]);
  draft = $state(null);
  unavailable = $state('');

  #lang; #purpose; #kitToken; #onDraft; #onChange;
  #running = 0;
  #queue = [];
  #ctrl = new Map();
  #sources = new Map();   // id → { file, blob } (no se guarda en storage)
  #draftP = null;
  // Turno de revisión por fila: cancelar, quitar o reintentar lo cambia, y
  // una revisión que vuelve de un await con un turno viejo no encola nada
  // (si no, cancelar mientras dice "Preparando" acababa subiendo el archivo).
  #turn = new Map();

  // opts: { lang, purpose: 'brief'|'kit', kitToken?, draft?, onDraft?(draft), onChange?() }
  constructor(opts = {}) {
    this.#lang = opts.lang === 'en' ? 'en' : 'es';
    this.#purpose = opts.purpose === 'kit' ? 'kit' : 'brief';
    this.#kitToken = opts.kitToken || null;
    this.#onDraft = opts.onDraft || (() => {});
    this.#onChange = opts.onChange || (() => {});
    if (opts.draft && opts.draft.draftId && opts.draft.secret) this.draft = opts.draft;
  }

  get limits() { return (this.draft && this.draft.limits) || DEFAULT_LIMITS; }
  get busy() { return this.files.some((f) => ['checking', 'preparing', 'uploading', 'queued'].includes(f.status)); }
  // Filas que cuentan para el cupo (lo reservado en el servidor también).
  get active() { return this.files.filter((f) => !f.removed && !['error', 'canceled'].includes(f.status)); }
  get usedBytes() { return this.active.reduce((n, f) => n + (Number(f.size) || 0), 0); }
  forField(field) { return this.files.filter((f) => f.field === field && !f.removed); }
  // Ya subidos y quitados por el cliente (de un campo o de todos): viajan
  // marcados al enviar, así que la interfaz lo dice y el éxito no los cuenta.
  removedCount(field) { return this.files.filter((f) => f.removed && !f.fromServer && (!field || f.field === field)).length; }

  // Filas restauradas (sesión) o ya recibidas por el servidor (kit).
  restore(rows = [], { fromServer = false } = {}) {
    for (const r of rows) {
      if (!r || this.files.some((f) => f.id === r.id || (r.pathname && f.pathname === r.pathname))) continue;
      this.files.push({
        id: r.id || uid(), field: r.field || (r.tags && r.tags.field) || null, kind: r.kind,
        name: r.name || r.originalName || 'archivo', originalName: r.originalName || r.name || 'archivo', size: r.size || 0, status: 'done', progress: 100,
        error: '', thumb: null, contentType: r.contentType || null, convertedFrom: r.convertedFrom || null,
        pathname: r.pathname || null, tags: { ...(r.tags || {}) }, removed: !!r.removed, fromServer, note: '',
      });
    }
  }

  async ensureDraft() {
    if (this.draft) return this.draft;
    if (!this.#draftP) {
      this.#draftP = postJSON('/api/brief/draft', {
        purpose: this.#purpose, kitToken: this.#kitToken || undefined, lang: this.#lang,
      }, this.#lang).then((j) => {
        this.draft = { draftId: j.draftId, secret: j.secret, expiresAt: j.expiresAt, limits: j.limits || DEFAULT_LIMITS };
        this.#onDraft(this.draft);
        return this.draft;
      }).catch((err) => {
        this.#draftP = null;
        if (err.status === 503) this.unavailable = MSG.off[this.#lang];
        throw err;
      });
    }
    return this.#draftP;
  }

  // add(FileList|File[], { field, kind, maxFiles, tags })
  add(list, { field, kind, maxFiles = 60, tags = {} }) {
    const arr = Array.from(list || []);
    const lang = this.#lang;
    for (const file of arr) {
      const row = {
        id: uid(), field, kind, name: file.name || 'archivo', originalName: file.name || 'archivo', size: file.size, status: 'checking', progress: 0,
        error: '', thumb: null, contentType: null, convertedFrom: null, pathname: null,
        tags: { field, ...tags }, removed: false, fromServer: false, note: '',
      };
      if (this.forField(field).filter((f) => f.status !== 'error').length >= maxFiles) {
        row.status = 'error'; row.error = MSG.fieldMax(maxFiles)[lang];
      }
      this.files.push(row);
      this.#sources.set(row.id, { file, blob: null });
      if (row.status !== 'error') this.#check(row.id);
    }
    this.#onChange();
  }

  #row(id) { return this.files.find((f) => f.id === id); }
  // retryable: solo los fallos de red o del servidor se pueden reintentar
  // (un tipo de archivo no válido o un tope lleno no cambian por reintentar).
  #fail(id, msg, retryable = false) {
    const r = this.#row(id);
    if (!r) return;
    r.status = 'error'; r.error = msg; r.progress = 0; r.retryable = retryable;
    this.#onChange();
  }

  #bump(id) { const n = (this.#turn.get(id) || 0) + 1; this.#turn.set(id, n); return n; }
  // ¿Sigue vigente esta revisión? (la fila existe, no se canceló ni se quitó
  // y nadie lanzó otra revisión después).
  #live(id, turn) {
    const r = this.#row(id);
    return !!r && this.#turn.get(id) === turn && !r.removed && r.status !== 'canceled' && this.#sources.has(id);
  }

  async #check(id) {
    const r = this.#row(id);
    const src = this.#sources.get(id);
    if (!r || !src) return;
    const turn = this.#bump(id);
    const lang = this.#lang;
    const rules = this.limits.kinds?.[r.kind] || DEFAULT_LIMITS.kinds[r.kind];
    try {
      if (!src.file.size) return this.#fail(id, MSG.empty[lang]);
      const real = await sniffFile(src.file);
      if (!this.#live(id, turn)) return;
      if (!allowedFor(r.kind, real)) return this.#fail(id, MSG.type[r.kind][lang]);
      let blob = src.file, name = src.file.name, contentType = real, convertedFrom = null, note = '';
      if (r.kind === 'photo') {
        if (src.file.size > PHOTO_SOURCE_MAX) return this.#fail(id, MSG.tooBig(PHOTO_SOURCE_MAX, lang));
        r.status = 'preparing';
        const p = await preparePhoto(src.file, real);
        if (!this.#live(id, turn)) return;
        blob = p.blob; name = p.name; contentType = p.contentType; convertedFrom = p.convertedFrom;
        if (p.original) note = p.note || '';
      }
      if (rules && blob.size > rules.maxBytes) return this.#fail(id, MSG.tooBig(rules.maxBytes, lang));
      // Topes del borrador (el servidor los vuelve a comprobar de forma atómica).
      const others = this.active.filter((f) => f.id !== id);
      if (others.length + 1 > this.limits.maxFiles) return this.#fail(id, MSG.quotaFiles(this.limits.maxFiles)[lang]);
      if (others.reduce((n, f) => n + (Number(f.size) || 0), 0) + blob.size > this.limits.maxBytes) return this.#fail(id, MSG.quotaBytes[lang]);
      src.blob = blob;
      Object.assign(r, { name, size: blob.size, contentType, convertedFrom, note, status: 'queued' });
      if (note) r.tags = { ...r.tags, note };
      if (contentType.startsWith('image/') && contentType !== 'image/svg+xml' && !contentType.includes('hei')) {
        try { r.thumb = URL.createObjectURL(blob); } catch { r.thumb = null; }
      }
      this.#enqueue(id);
    } catch (err) {
      if (!this.#live(id, turn)) return; // ya cancelada o quitada: no se pisa su estado
      console.warn('[brief] no se pudo leer el archivo', err && err.message);
      this.#fail(id, MSG.read[lang], true);
    }
  }

  #enqueue(id) { this.#queue.push(id); this.#pump(); }
  #pump() {
    while (this.#running < CONCURRENCY && this.#queue.length) {
      const id = this.#queue.shift();
      this.#running++;
      this.#upload(id).finally(() => { this.#running--; this.#pump(); });
    }
  }

  async #upload(id) {
    const r = this.#row(id);
    const src = this.#sources.get(id);
    if (!r || !src || !src.blob || r.removed || r.status === 'canceled') return;
    const lang = this.#lang;
    const ctrl = new AbortController();
    this.#ctrl.set(id, ctrl);
    r.status = 'uploading'; r.progress = 0; r.error = '';
    try {
      const draft = await this.ensureDraft();
      // Ruta nueva en cada intento: el servidor reserva cada ruta una sola vez.
      const pathname = buildPathname(draft.draftId, r.kind, r.name);
      const multipart = src.blob.size > MULTIPART_FROM;
      const clientPayload = JSON.stringify({
        draftId: draft.draftId, secret: draft.secret, kind: r.kind, size: src.blob.size,
        contentType: r.contentType, originalName: src.file.name, tags: r.tags,
        convertedFrom: r.convertedFrom || undefined, lang,
      });
      const tok = await postJSON('/api/brief/upload', {
        type: 'blob.generate-client-token', payload: { pathname, clientPayload, multipart },
      }, lang);
      if (!tok.clientToken) throw new UploadError(MSG.token[lang]);
      if (ctrl.signal.aborted) throw new DOMException('Abort', 'AbortError');
      const mock = import.meta.env.DEV && typeof window !== 'undefined' && window.__briefMock && window.__briefMock.put;
      const put = mock || (await import('@vercel/blob/client')).put;
      await put(pathname, src.blob, {
        access: 'private', token: tok.clientToken, contentType: r.contentType, multipart,
        abortSignal: ctrl.signal,
        onUploadProgress: (e) => { const x = this.#row(id); if (x) x.progress = Math.min(99, Math.round(e.percentage || 0)); },
      });
      r.pathname = pathname; r.status = 'done'; r.progress = 100;
      this.#onChange();
    } catch (err) {
      if (ctrl.signal.aborted) { r.status = 'canceled'; r.progress = 0; this.#onChange(); return; }
      console.warn('[brief] subida fallida', err && err.message);
      // 503: subidas apagadas; el aviso ya está en la zona, la fila no lo repite.
      if (err instanceof UploadError && err.status === 503) return this.#fail(id, '', false);
      const st = err instanceof UploadError ? err.status : 0;
      const msg = err instanceof UploadError ? err.message : MSG.network[lang];
      this.#fail(id, msg, !st || st >= 500 || st === 408 || st === 429);
    } finally {
      this.#ctrl.delete(id);
    }
  }

  cancel(id) {
    const r = this.#row(id);
    if (!r) return;
    this.#bump(id); // una revisión en curso ya no encola
    this.#queue = this.#queue.filter((q) => q !== id);
    const c = this.#ctrl.get(id);
    if (c) c.abort();
    else if (['queued', 'checking', 'preparing'].includes(r.status)) { r.status = 'canceled'; this.#onChange(); }
  }

  retry(id) {
    const r = this.#row(id);
    const src = this.#sources.get(id);
    // Solo lo fallado o cancelado: una fila en marcha no se lanza dos veces.
    if (!r || !src || !['error', 'canceled'].includes(r.status) || this.#ctrl.has(id)) return;
    r.error = ''; r.progress = 0;
    if (src.blob) { r.status = 'queued'; this.#enqueue(id); } else { r.status = 'checking'; this.#check(id); }
  }

  // Quitar: lo que no se subió desaparece; lo ya subido queda fuera de la
  // lista y viaja marcado al enviar (el servidor guarda todo lo reservado).
  remove(id) {
    const r = this.#row(id);
    if (!r || r.fromServer) return;
    this.cancel(id);
    if (r.thumb) { try { URL.revokeObjectURL(r.thumb); } catch { /* ya liberada */ } }
    if (r.status === 'done' && r.pathname) {
      r.removed = true;
      r.tags = { ...r.tags, note: 'Quitado por el cliente antes de enviar' };
    } else {
      this.files = this.files.filter((f) => f.id !== id);
      this.#sources.delete(id);
    }
    this.#onChange();
  }

  setTag(id, key, value) {
    const r = this.#row(id);
    if (!r) return;
    const tags = { ...r.tags };
    if (value === null || value === undefined || value === '') delete tags[key]; else tags[key] = value;
    r.tags = tags;
    this.#onChange();
  }

  // Metadatos para el envío (brief o kit): solo lo subido en ESTE borrador.
  meta() {
    return this.files.filter((f) => f.status === 'done' && f.pathname && !f.fromServer).map((f) => ({
      pathname: f.pathname, originalName: f.originalName || f.name, contentType: f.contentType,
      convertedFrom: f.convertedFrom || undefined, tags: f.tags || {},
    }));
  }
}

export const acceptFor = (kind) => (CLIENT_KINDS[kind] ? CLIENT_KINDS[kind].accept : '');
