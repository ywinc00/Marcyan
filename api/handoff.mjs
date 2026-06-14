// ════════════════════════════════════════════════════════════════
//  POST /api/handoff
//  El visitante del chat pidió hablar con un HUMANO. El widget del
//  chat postea aquí { name?, contact?, message?, lang? }. NO hay chat
//  en vivo: creamos una notificación in-dashboard (type 'chat_handoff')
//  y avisamos al fundador por email; él responde por WhatsApp/email.
//
//  La PII (nombre/contacto) viaja del WIDGET a este endpoint, NUNCA al
//  modelo del chatbot — igual que el CONTACT_TOOL de captura de lead.
//  Mismo molde que /api/contact: honeypot, validación, clientIp.
// ════════════════════════════════════════════════════════════════
import { createNotification } from '../lib/notifications.mjs';
import { emailAdminHandoff, resend } from '../lib/email.mjs';
import { clientIp } from '../lib/auth.mjs';

function sanitize(v, max = 2000) {
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

    // Honeypot anti-spam
    if (body.website_hp) {
      return res.status(200).json({ ok: true });
    }

    const lang = body.lang === 'en' ? 'en' : (body.lang === 'es' ? 'es' : null);
    const data = {
      name:    sanitize(body.name, 200),
      contact: sanitize(body.contact, 200),
      message: sanitize(body.message, 2000),
      lang,
    };

    // No exigimos PII (el visitante puede pedir humano sin dar datos),
    // pero registramos IP/UA para contexto del fundador.
    data.ipAddress = clientIp(req);
    data.userAgent = sanitize(req.headers['user-agent'], 500);

    const who = data.name || data.contact || 'un visitante';

    // 1) Notificación in-dashboard — defensiva, no rompe el flujo si falla.
    await createNotification({
      type: 'chat_handoff',
      title: `${who} quiere hablar con un humano`,
      body: data.message || (data.contact ? `Contacto: ${data.contact}` : 'Sin mensaje.'),
      ref: null,
      url: '/dashboard',
    });

    // 2) Email al fundador — awaitado, no bloquea la respuesta si falla.
    let emailAdminOk = false;
    if (resend) {
      await withTimeout(emailAdminHandoff({ ref: null, data }), 8000, 'Resend handoff')
        .then(() => { emailAdminOk = true; })
        .catch(err => console.error('[handoff] admin email falló:', err && err.message));
      console.log(`[handoff] (${who}) · adminEmail=${emailAdminOk}`);
    } else {
      console.warn('[handoff] registrado · RESEND_API_KEY no configurada, sin email');
    }

    return res.status(200).json({ ok: true, emailAdmin: emailAdminOk });

  } catch (err) {
    console.error('[handoff] error:', err);
    return res.status(500).json({
      ok: false,
      error: 'No pudimos pasar tu solicitud. Por favor escríbenos directo por WhatsApp o email.',
    });
  }
}
