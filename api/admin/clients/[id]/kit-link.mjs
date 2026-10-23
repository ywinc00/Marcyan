// POST /api/admin/clients/:id/kit-link   (id = clients.id numérico)
//   Enlace del "Kit de arranque" para un cliente que NO tiene brief: crea un
//   brief mínimo con los datos de su ficha (origen 'panel'), vinculado a él,
//   y emite el enlace con la misma lógica que /api/admin/briefs/:id/kit-link
//   (token de un solo uso, en la base solo su huella; correo opcional).
//   Body: { sendEmail?: boolean, lang?: 'es'|'en' }
//   Respuesta: { ok, url, projectId, kitStatus, lang, emailSent, emailError? }
//   409 { reason: 'has_brief', projectId } si el cliente ya tiene brief: el
//   kit se envía desde ese brief. 409 { reason: 'archived' } si está archivado.
import { requireAdmin } from '../../../../lib/auth.mjs';
import { logEvent } from '../../../../lib/db.mjs';
import { kitUrl } from '../../../../lib/brief-kit.mjs';
import { createKitBriefForClient } from '../../../../lib/client-kit.mjs';
import { CrmError } from '../../../../lib/finance.mjs';
import { emailClientKitLink, resend } from '../../../../lib/email.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const id = parseInt((req.query?.id || '').toString(), 10);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ ok: false, error: 'ID inválido' });
  const body = (typeof req.body === 'object' && req.body) ? req.body : {};
  const lang = body.lang === 'en' ? 'en' : 'es';

  try {
    let made;
    try {
      made = await createKitBriefForClient(id, { lang }, { actorEmail: session.email });
    } catch (err) {
      if (err instanceof CrmError) return res.status(err.status).json({ ok: false, error: err.message, ...err.extra });
      throw err;
    }
    const { brief, client, token } = made;
    const projectId = brief.project_id;
    const url = kitUrl(token, lang);

    let emailSent = false;
    let emailError = null;
    if (body.sendEmail === true) {
      if (!brief.email) emailError = 'Este cliente no tiene correo en su ficha.';
      else if (!resend) emailError = 'El envío de correos no está configurado.';
      else {
        try {
          await emailClientKitLink({
            to: brief.email, url, projectId, lang,
            ownerName: brief.owner_name, businessName: brief.business_name,
            replyTo: session.email,
          });
          emailSent = true;
        } catch (err) {
          console.error(`[admin/clients/:id/kit-link] ${projectId} correo falló:`, err && err.message);
          emailError = 'No se pudo enviar el correo. Copia el enlace y envíalo por otro medio.';
        }
      }
    }

    // Sin el token en el registro (es una credencial).
    await logEvent({
      projectId,
      type: 'kit_link_created',
      actorEmail: session.email,
      data: { lang, status: brief.kit_status, emailSent, fromClient: client.client_code },
    });

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      ok: true, url, projectId, kitStatus: brief.kit_status, lang, emailSent,
      ...(emailError ? { emailError } : {}),
    });
  } catch (err) {
    console.error('[admin/clients/:id/kit-link] error:', err && err.message);
    return res.status(500).json({ ok: false, error: 'No se pudo generar el enlace del kit' });
  }
}
