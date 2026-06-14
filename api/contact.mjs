// ════════════════════════════════════════════════════════════════
//  POST /api/contact
//  Mensaje de contacto (lead). Distinto de /api/brief (proyecto):
//  el contacto simple del sitio y el chatbot caen aquí, en la tabla
//  `leads` (LEAD-XXX propio), sin consumir un MRC-XXX de proyecto.
//    1) Email al admin (notificación de nuevo lead)
//    2) Email al cliente (auto-respuesta de confirmación)
// ════════════════════════════════════════════════════════════════
import { createLead } from '../lib/leads.mjs';
import { createNotification } from '../lib/notifications.mjs';
import { emailAdminNewLead, emailClientLeadConfirmation, resend } from '../lib/email.mjs';
import { clientIp } from '../lib/auth.mjs';

function sanitize(v, max = 5000) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

const withTimeout = (p, ms, label) =>
  Promise.race([
    p,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)
    ),
  ]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = (typeof req.body === 'object' && req.body) ? req.body : {};
    if (JSON.stringify(body).length > 500000) return res.status(413).json({ ok: false, error: 'Payload demasiado grande' });

    // Honeypot anti-spam
    if (body.website_hp) {
      return res.status(200).json({ ok: true, refId: 'LEAD-000' });
    }

    // Acepta tanto los nombres "de leads" como los del form de contacto
    // (owner_name/city_state/main_objective/additional_notes) para no
    // romper si el cliente envía el mapeo viejo.
    const email = sanitize(body.email, 200);
    const phone = sanitize(body.phone, 50);
    if (!email && !phone) {
      return res.status(400).json({
        ok: false,
        error: 'Necesitamos al menos un email o un teléfono para contactarte.',
      });
    }

    const source = body.source === 'chat' ? 'chat' : 'contact';
    const data = {
      name:          sanitize(body.name ?? body.owner_name, 200),
      email,
      phone,
      business_name: sanitize(body.business_name, 200),
      city:          sanitize(body.city ?? body.city_state, 200),
      interest:      sanitize(body.interest ?? body.main_objective, 500),
      message:       sanitize(body.message ?? body.additional_notes, 5000),
      source,
      ipAddress:     clientIp(req),
      userAgent:     sanitize(req.headers['user-agent'], 500),
    };

    const refId = await createLead(data);

    // Aviso in-dashboard (createNotification nunca lanza; es defensiva)
    await createNotification({
      type: 'new_lead',
      title: `Nuevo lead — ${data.name || data.email || data.phone || 'sin nombre'}`,
      body: data.interest || data.message || null,
      ref: refId,
      url: '/dashboard',
    });

    // Notificaciones email — awaitadas, no bloquean al lead si fallan
    let emailAdminOk = false;
    let emailClientOk = false;

    if (resend) {
      const adminP = withTimeout(
        emailAdminNewLead({ refId, data }), 8000, 'Resend admin'
      ).then(() => { emailAdminOk = true; })
       .catch(err => console.error(`[contact] ${refId} admin email falló:`, err && err.message));

      const clientP = data.email
        ? withTimeout(
            emailClientLeadConfirmation({ refId, clientEmail: data.email, name: data.name }),
            8000, 'Resend client'
          ).then(() => { emailClientOk = true; })
           .catch(err => console.error(`[contact] ${refId} client email falló:`, err && err.message))
        : Promise.resolve();

      await Promise.all([adminP, clientP]);
      console.log(`[contact] ${refId} (${source}) · adminEmail=${emailAdminOk} · clientEmail=${emailClientOk}`);
    } else {
      console.warn(`[contact] ${refId} insertado · RESEND_API_KEY no configurada, sin emails`);
    }

    return res.status(200).json({
      ok: true,
      refId,
      emailAdmin: emailAdminOk,
      emailClient: emailClientOk,
    });

  } catch (err) {
    console.error('[contact] submission error:', err);
    return res.status(500).json({
      ok: false,
      error: 'Error al enviar tu mensaje. Por favor intenta de nuevo en un momento.',
    });
  }
}
