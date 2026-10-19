// POST /api/admin/briefs/:id/kit-link
//   Genera (o regenera) el enlace único del "Kit de arranque" para que el
//   cliente complete lo pesado al contratar (segundo momento del brief).
//   Body: { sendEmail?: boolean, lang?: 'es'|'en', reopen?: boolean }
//     · sendEmail: true → además envía el enlace al correo del brief (Resend).
//     · lang: idioma del enlace y del correo (por defecto el del brief).
//     · reopen: true → permite reabrir un kit ya enviado por el cliente.
//   Respuesta: { ok, url, kitStatus, lang, emailSent, emailError? }
//   El token solo se devuelve aquí, una vez; en la base queda su hash.
//   Regenerar invalida el enlace anterior.
import { requireAdmin } from '../../../../lib/auth.mjs';
import { getBriefByProjectId, logEvent } from '../../../../lib/db.mjs';
import { issueKitLink, kitUrl } from '../../../../lib/brief-kit.mjs';
import { isMissingSchema } from '../../../../lib/brief-files.mjs';
import { emailClientKitLink, resend } from '../../../../lib/email.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const id = (req.query?.id || '').toString();
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });
  const body = (typeof req.body === 'object' && req.body) ? req.body : {};

  try {
    const brief = await getBriefByProjectId(id);
    if (!brief) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });
    const lang = body.lang === 'en' || body.lang === 'es'
      ? body.lang
      : (brief.lang || (brief.language === 'en' ? 'en' : 'es'));

    let issued;
    try {
      issued = await issueKitLink(id, { reopen: body.reopen === true });
    } catch (err) {
      if (isMissingSchema(err)) {
        return res.status(503).json({ ok: false, error: 'Falta aplicar la migración 010 en la base de datos para usar el kit de arranque.' });
      }
      throw err;
    }
    if (!issued) {
      return res.status(409).json({ ok: false, error: 'El cliente ya envió el kit. Para reabrirlo, confirma la reapertura.' });
    }
    const url = kitUrl(issued.token, lang);

    let emailSent = false;
    let emailError = null;
    if (body.sendEmail === true) {
      if (!brief.email) emailError = 'Este brief no tiene correo del cliente.';
      else if (!resend) emailError = 'El envío de correos no está configurado.';
      else {
        try {
          await emailClientKitLink({
            to: brief.email, url, projectId: id, lang,
            ownerName: brief.owner_name, businessName: brief.business_name,
            replyTo: session.email,
          });
          emailSent = true;
        } catch (err) {
          console.error(`[admin/briefs/:id/kit-link] ${id} correo falló:`, err && err.message);
          emailError = 'No se pudo enviar el correo. Copia el enlace y envíalo por otro medio.';
        }
      }
    }

    // Sin el token en el registro (es una credencial).
    await logEvent({
      projectId: id,
      type: 'kit_link_created',
      actorEmail: session.email,
      data: { lang, status: issued.status, emailSent, reopen: body.reopen === true },
    });

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({ ok: true, url, kitStatus: issued.status, lang, emailSent, ...(emailError ? { emailError } : {}) });
  } catch (err) {
    console.error('[admin/briefs/:id/kit-link] error:', err && err.message);
    return res.status(500).json({ ok: false, error: 'No se pudo generar el enlace del kit' });
  }
}
