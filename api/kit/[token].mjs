// ════════════════════════════════════════════════════════════════
//  /api/kit/:token — "Kit de arranque" del cliente (segundo momento)
//  Público pero protegido por el token del enlace (32 bytes aleatorios;
//  en la base solo su hash). Sin cuenta. La PÁGINA /es|en/kit/<token> es de
//  la ola 3; aquí solo el backend.
//
//  GET  → datos mínimos para precargar (sin correo, teléfono, IP, navegador,
//         presupuesto ni notas internas) + archivos ya enviados + secciones.
//  POST → { action: 'save' | 'submit', data: {campos del momento 'arranque'},
//           draftId?, secret?, files?: [{ pathname, tags?, originalName?, convertedFrom?, contentType? }],
//           lang? }
//         'save' guarda por partes (sin exigir obligatorios); 'submit' valida
//         todo el kit (lo guardado antes + lo que llega), lo cierra y avisa
//         en el panel. Los archivos usan el mismo
//         sistema de borradores (POST /api/brief/draft con purpose 'kit').
//         data puede traer también las preguntas del brief corto que el
//         brief no tenía (GET → catchup); se validan como del brief y se
//         guardan en briefs.kit (revisión R1).
// ════════════════════════════════════════════════════════════════
import { clientIp } from '../../lib/auth.mjs';
import { logEvent } from '../../lib/db.mjs';
import { createNotification } from '../../lib/notifications.mjs';
import { rateLimit, LIMITS } from '../../lib/ratelimit.mjs';
import { validate, splitByStorage, sectionsFor } from '../../lib/brief-schema.mjs';
import { findBriefByKitToken, kitPrefill, kitForSubmit, saveKit, kitCatchup, catchupData } from '../../lib/brief-kit.mjs';
import {
  getDraft, markDraftSubmitted, reconcileDraft, verifyFiles, listFilesForBrief, blobConfigured, isMissingSchema,
  closeKitDrafts, queueDraftSweep,
} from '../../lib/brief-files.mjs';
import { secretMatches } from '../../lib/brief-upload-rules.mjs';

const T = {
  rate: { es: 'Demasiados intentos seguidos. Espera unos minutos.', en: 'Too many attempts in a row. Please wait a few minutes.' },
  notFound: { es: 'Este enlace no es válido o ya caducó. Pide uno nuevo a Marcyan.', en: 'This link is not valid or has expired. Ask Marcyan for a new one.' },
  done: { es: 'Este kit ya se envió. Si necesitas cambiar algo, responde a nuestro correo.', en: 'This kit was already sent. If you need to change something, reply to our email.' },
  fields: { es: 'Revisa los campos marcados, por favor.', en: 'Please check the highlighted fields.' },
  error: { es: 'No pudimos guardar tu kit. Vuelve a intentarlo en un momento.', en: 'We could not save your kit. Please try again in a moment.' },
};

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms))]);

function publicFiles(rows) {
  return rows.filter((r) => r.verified !== false).map((r) => ({
    id: String(r.id), kind: r.kind, originalName: r.original_name, size: r.size === null ? null : Number(r.size),
    tags: r.tags || {}, moment: r.purpose === 'kit' ? 'arranque' : 'inicial', verified: r.verified,
  }));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const token = (req.query?.token || '').toString();
  const body = (typeof req.body === 'object' && req.body) ? req.body : {};
  let lang = body.lang === 'en' ? 'en' : 'es';

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const rl = await rateLimit({ bucket: 'kit', key: clientIp(req), limits: LIMITS.kit });
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfter));
      return res.status(429).json({ ok: false, error: T.rate[lang] });
    }

    let brief;
    try {
      brief = await findBriefByKitToken(token);
    } catch (err) {
      if (isMissingSchema(err)) return res.status(404).json({ ok: false, error: T.notFound[lang] });
      throw err;
    }
    if (!brief || brief.kit_status === 'none') return res.status(404).json({ ok: false, error: T.notFound[lang] });
    if (req.method === 'GET' && brief.lang) lang = brief.lang;
    const services = Array.isArray(brief.services) ? brief.services : [];

    // ── GET: precarga ─────────────────────────────────────────
    if (req.method === 'GET') {
      let files = [];
      try { files = publicFiles(await listFilesForBrief(brief.id)); } catch (err) { if (!isMissingSchema(err)) throw err; }
      return res.status(200).json({
        ok: true,
        projectId: brief.project_id,
        lang: brief.lang || (brief.language === 'en' ? 'en' : 'es'),
        kitStatus: brief.kit_status,
        services,
        firstName: brief.owner_name ? String(brief.owner_name).trim().split(/\s+/)[0].slice(0, 40) : null,
        prefill: { ...kitPrefill(brief), ...(brief.kit || {}) },
        sections: sectionsFor('arranque', services.length ? services : null).map((s) => s.key),
        // Preguntas del brief corto que este brief no trae (chat, formulario
        // anterior o v2 de antes): el kit las enseña en su propio bloque.
        catchup: kitCatchup(brief),
        files,
        uploads: blobConfigured(),
      });
    }

    // ── POST: guardar o enviar ────────────────────────────────
    if (brief.kit_status === 'submitted') return res.status(409).json({ ok: false, error: T.done[lang] });
    if (JSON.stringify(body).length > 500000) return res.status(413).json({ ok: false, error: 'Payload demasiado grande' });
    const submit = body.action === 'submit';

    // Se guarda lo que llega (por partes, sin exigir obligatorios). Al enviar,
    // los obligatorios se comprueban sobre TODO el kit: lo ya guardado antes
    // (columnas + briefs.kit) más lo que llega ahora; el navegador no tiene
    // que reenviar lo que guardó en otra sesión.
    const valOpts = { services: services.length ? services : null, optionMode: 'keep' };
    const v = validate('arranque', body.data || {}, { ...valOpts, partial: true });
    // Lo que faltaba del brief (bloque propio del kit): solo esas claves, con
    // las reglas del brief corto; nada de eso es obligatorio.
    const pend = catchupData(brief, body.data);
    const vp = validate('inicial', pend, { ...valOpts, partial: true });
    if (!v.ok || !vp.ok) return res.status(400).json({ ok: false, error: T.fields[lang], fields: { ...v.errors, ...vp.errors } });
    if (submit) {
      const whole = validate('arranque', kitForSubmit(brief, body.data), { ...valOpts, partial: false });
      if (!whole.ok) return res.status(400).json({ ok: false, error: T.fields[lang], fields: whole.errors });
    }
    const split = splitByStorage(v.data);
    // Se guardan junto al kit (briefs.kit): el bloque sigue estable al
    // recargar y briefData los lee como respaldo del brief inicial.
    Object.assign(split.kit, vp.data);

    // Archivos del kit: borrador purpose 'kit' ligado a ESTE brief.
    let fileRows = [];
    let draft = null;
    if (body.draftId && body.secret) {
      const d = await getDraft(String(body.draftId));
      if (d && d.purpose === 'kit' && String(d.brief_id) === String(brief.id) && !d.submitted_at
          && new Date(d.expires_at).getTime() > Date.now()
          && secretMatches(String(body.secret), d.secret_hash)) draft = d;
      else console.warn('[kit] borrador de archivos no válido; se ignoran los archivos');
    }
    if (draft && blobConfigured()) {
      const claimed = submit ? await markDraftSubmitted(draft.id, brief.id) : false;
      try {
        fileRows = await reconcileDraft({ draftId: draft.id, briefId: brief.id, filesMeta: body.files, final: submit });
      } catch (err) {
        // Borrador ya cerrado y sin conciliar: el cron lo termina (enlaza lo
        // que el cliente dejó y borra lo que quitó) en vez de dejarlo así.
        if (claimed) await queueDraftSweep(draft.id, body.files);
        throw err;
      }
    }

    const saved = await saveKit(brief.id, { columns: split.columns, kit: split.kit }, { submit });
    if (!saved) return res.status(409).json({ ok: false, error: T.done[lang] });
    // Kit enviado: ningún otro borrador de este kit sigue aceptando subidas.
    if (submit) await closeKitDrafts(brief.id).catch((err) => console.warn('[kit] no se pudieron cerrar los borradores:', err && err.message));

    let check = null;
    if (submit) {
      if (fileRows.length) {
        try { check = await withTimeout(verifyFiles(fileRows), 20000); } catch (err) {
          console.warn(`[kit] ${brief.project_id} verificación pendiente (la termina el cron):`, err && err.message);
        }
      }
      await logEvent({ projectId: brief.project_id, type: 'kit_submitted', actorEmail: null, data: { files: fileRows.length } });
      await createNotification({
        type: 'system',
        title: `Kit de arranque recibido — ${brief.business_name || brief.project_id}`,
        body: fileRows.length ? `${fileRows.length} archivos nuevos` : null,
        ref: brief.project_id,
        url: '/dashboard',
      });
    }

    return res.status(200).json({
      ok: true,
      kitStatus: saved.kit_status,
      files: {
        linked: fileRows.length,
        verified: check ? check.verified : 0,
        rejected: check ? check.rejected : 0,
      },
    });
  } catch (err) {
    console.error('[kit] error:', err && err.message);
    return res.status(500).json({ ok: false, error: T.error[lang] });
  }
}
