// ════════════════════════════════════════════════════════════════
//  POST /api/brief/upload — handleUpload de @vercel/blob (subida directa)
//
//  El navegador sube el archivo DIRECTO a Vercel Blob (privado) con
//  upload() de '@vercel/blob/client'; esta función solo:
//    1) 'blob.generate-client-token': valida borrador + secreto, que no esté
//       caducado ni enviado, la ruta briefs/<draftId>/<kind>/<nombre>, el tipo
//       y el tamaño por clase, y reserva el cupo (60 archivos / 300 MB por
//       borrador) de forma atómica. Emite un token de un solo uso, 10 min,
//       con addRandomSuffix y sin sobrescribir.
//    2) 'blob.upload-completed' (webhook firmado de Vercel Blob): inserta la
//       fila en brief_files. No llega en local: al enviar se concilia.
//
//  clientPayload (JSON en texto) que manda el navegador:
//    { draftId, secret, kind, size, contentType, originalName, tags?, convertedFrom?, lang? }
//  Las reglas puras están en lib/brief-upload-rules.mjs.
// ════════════════════════════════════════════════════════════════
import { handleUpload } from '@vercel/blob/client';
import { clientIp } from '../../lib/auth.mjs';
import { rateLimit, LIMITS } from '../../lib/ratelimit.mjs';
import {
  getDraft, reserveUpload, recordUploadedBlob, blobConfigured, isMissingSchema,
} from '../../lib/brief-files.mjs';
import { parseClientPayload, checkUploadRequest, isUuid } from '../../lib/brief-upload-rules.mjs';

class UploadRefused extends Error {
  constructor(status, message) { super(message.es); this.status = status; this.messages = message; }
}

const T = {
  rate: { es: 'Demasiadas subidas seguidas. Espera unos minutos.', en: 'Too many uploads in a row. Please wait a few minutes.' },
  off: { es: 'Las subidas no están disponibles ahora mismo.', en: 'Uploads are not available right now.' },
  quota: { es: 'Llegaste al máximo de archivos o de espacio para este formulario.', en: 'You reached the file or space limit for this form.' },
  error: { es: 'No pudimos subir el archivo. Vuelve a intentarlo.', en: 'We could not upload the file. Please try again.' },
};

function langOf(clientPayload) {
  try { return JSON.parse(clientPayload || '{}').lang === 'en' ? 'en' : 'es'; } catch { return 'es'; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const body = (typeof req.body === 'object' && req.body) ? req.body : {};
  const lang = langOf(body.payload && body.payload.clientPayload);
  if (!blobConfigured()) return res.status(503).json({ ok: false, error: T.off[lang] });

  const ip = clientIp(req);
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const rl = await rateLimit({ bucket: 'upload', key: ip, limits: LIMITS.upload });
        if (!rl.ok) throw new UploadRefused(429, T.rate);

        const payload = parseClientPayload(clientPayload);
        const draft = payload && isUuid(payload.draftId) ? await getDraft(payload.draftId) : null;
        const check = checkUploadRequest({ pathname, payload, draft });
        if (!check.ok) throw new UploadRefused(check.status, check.message);

        // Reserva atómica del cupo (la comprobación de arriba es orientativa;
        // esta es la que manda si llegan muchas peticiones a la vez).
        if (!(await reserveUpload(draft.id, check.size))) throw new UploadRefused(429, T.quota);

        return { ...check.tokenOptions, tokenPayload: check.tokenPayload };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          await recordUploadedBlob({ blob, tokenPayload });
        } catch (err) {
          // La conciliación al enviar lo recupera; aquí solo se registra.
          console.error('[brief/upload] no se pudo registrar la subida completada:', err && err.message);
        }
      },
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof UploadRefused) {
      return res.status(err.status).json({ ok: false, error: err.messages[lang] });
    }
    if (isMissingSchema(err)) {
      console.warn('[brief/upload] migración 010 sin aplicar: subidas desactivadas');
      return res.status(503).json({ ok: false, error: T.off[lang] });
    }
    // Firma del webhook inválida o evento desconocido: 400 sin detalles.
    console.error('[brief/upload] error:', err && err.message);
    return res.status(400).json({ ok: false, error: T.error[lang] });
  }
}
