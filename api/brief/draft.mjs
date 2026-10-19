// ════════════════════════════════════════════════════════════════
//  POST /api/brief/draft
//  Crea un BORRADOR de subida: lo pide el navegador la primera vez que el
//  cliente elige un archivo. Devuelve { draftId, secret }; el secreto solo
//  lo guarda el navegador (sessionStorage) y en Neon queda su hash.
//
//  Body: { purpose?: 'brief' | 'kit', kitToken?: string, lang?: 'es'|'en' }
//    · 'brief' (por defecto): brief público. Caduca a las 48 h si no se envía.
//    · 'kit': kit de arranque; exige kitToken válido y queda ligado al brief
//      (caduca a los 30 días si no se guarda ni se envía).
//  Cupos por IP en Neon (lib/ratelimit.mjs): 5 por hora y 15 por día.
// ════════════════════════════════════════════════════════════════
import { clientIp } from '../../lib/auth.mjs';
import { rateLimit, LIMITS } from '../../lib/ratelimit.mjs';
import { createDraft, blobConfigured, isMissingSchema } from '../../lib/brief-files.mjs';
import { KIND_RULES, DRAFT_LIMITS } from '../../lib/brief-upload-rules.mjs';
import { findBriefByKitToken } from '../../lib/brief-kit.mjs';

const T = {
  rate: { es: 'Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.', en: 'Too many attempts in a row. Please wait a few minutes and try again.' },
  off: { es: 'Las subidas no están disponibles ahora mismo. Puedes enviar el formulario sin archivos.', en: 'Uploads are not available right now. You can send the form without files.' },
  kit: { es: 'Este enlace no es válido o ya caducó. Pide uno nuevo a Marcyan.', en: 'This link is not valid or has expired. Ask Marcyan for a new one.' },
  done: { es: 'Este kit ya se envió. Si necesitas cambiar algo, responde a nuestro correo.', en: 'This kit was already sent. If you need to change something, reply to our email.' },
  error: { es: 'No pudimos preparar la subida. Vuelve a intentarlo.', en: 'We could not prepare the upload. Please try again.' },
};

// Reglas que el navegador necesita para validar ANTES de subir (UX).
const publicLimits = () => ({
  maxFiles: DRAFT_LIMITS.maxFiles,
  maxBytes: DRAFT_LIMITS.maxBytes,
  kinds: Object.fromEntries(Object.entries(KIND_RULES).map(([k, r]) => [k, { maxBytes: r.maxBytes, types: r.declared }])),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const body = (typeof req.body === 'object' && req.body) ? req.body : {};
  const lang = body.lang === 'en' ? 'en' : 'es';
  const purpose = body.purpose === 'kit' ? 'kit' : 'brief';
  const ip = clientIp(req);

  try {
    const rl = await rateLimit({ bucket: purpose === 'kit' ? 'kit' : 'draft', key: ip, limits: purpose === 'kit' ? LIMITS.kit : LIMITS.draft });
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfter));
      return res.status(429).json({ ok: false, error: T.rate[lang] });
    }
    if (!blobConfigured()) return res.status(503).json({ ok: false, error: T.off[lang] });

    let briefId = null;
    if (purpose === 'kit') {
      const brief = await findBriefByKitToken(String(body.kitToken || ''));
      if (!brief) return res.status(404).json({ ok: false, error: T.kit[lang] });
      if (brief.kit_status === 'submitted') return res.status(409).json({ ok: false, error: T.done[lang] });
      briefId = brief.id;
    }

    const { draftId, secret, expiresAt } = await createDraft({ purpose, briefId, ip });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true, draftId, secret, purpose, expiresAt: expiresAt.toISOString(), limits: publicLimits(),
    });
  } catch (err) {
    if (isMissingSchema(err)) {
      console.warn('[brief/draft] migración 010 sin aplicar: subidas desactivadas');
      return res.status(503).json({ ok: false, error: T.off[lang] });
    }
    console.error('[brief/draft] error:', err && err.message);
    return res.status(500).json({ ok: false, error: T.error[lang] });
  }
}
