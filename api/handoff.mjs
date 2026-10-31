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
//
//  Puerta técnica (2026-10-31):
//   · Freno guardado por conexión (3 cada 10 min, 10 al día) → 429.
//   · Si deja email o teléfono, se GUARDA como lead (source 'chat') ANTES
//     del aviso y del correo: si el correo falla, el contacto no se pierde.
//   · Solo se responde error si no quedó NINGUNA copia (ni lead ni correo):
//     así el visitante sabe que debe escribir por WhatsApp.
//   · Correo al dueño fallido con lead guardado → aviso al panel.
// ════════════════════════════════════════════════════════════════
import { createNotification, notifyLeadEmailFailure } from '../lib/notifications.mjs';
import { emailAdminHandoff, resend } from '../lib/email.mjs';
import { clientIp } from '../lib/auth.mjs';
import { createLead } from '../lib/leads.mjs';
import { rateLimit, LIMITS } from '../lib/ratelimit.mjs';

function sanitize(v, max = 2000) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

// Validación de formato server-side (red de seguridad). El campo `contact`
// es libre: puede ser email o teléfono. Si parece email (lleva @) lo
// validamos como email; si no, y trae dígitos, exigimos >=7 dígitos.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (e) => EMAIL_RE.test(e);
const hasEnoughDigits = (p) => (String(p).match(/\d/g) || []).length >= 7;

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
      return res.status(200).json({ ok: true });
    }

    const rl = await rateLimit({ bucket: 'handoff', key: clientIp(req), limits: LIMITS.handoff });
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfter));
      return res.status(429).json({
        ok: false,
        error: body.lang === 'en'
          ? 'We received several requests in a row from your connection. Please message us on WhatsApp.'
          : 'Recibimos varias solicitudes seguidas desde tu conexión. Escríbenos por WhatsApp, por favor.',
      });
    }

    const lang = body.lang === 'en' ? 'en' : (body.lang === 'es' ? 'es' : null);
    const data = {
      name:    sanitize(body.name, 200),
      contact: sanitize(body.contact, 200),
      message: sanitize(body.message, 2000),
      lang,
    };

    // Validación de formato: no exigimos contacto, pero si lo dan, debe
    // tener pinta de email o de teléfono (red de seguridad anti-basura).
    if (data.contact) {
      if (data.contact.includes('@')) {
        if (!isValidEmail(data.contact)) {
          return res.status(400).json({
            ok: false,
            error: 'El email no tiene un formato válido. Revísalo, por favor.',
          });
        }
      } else if (!hasEnoughDigits(data.contact)) {
        return res.status(400).json({
          ok: false,
          error: 'El contacto no parece válido. Deja un email o un teléfono con al menos 7 dígitos.',
        });
      }
    }

    // No exigimos PII (el visitante puede pedir humano sin dar datos),
    // pero registramos IP/UA para contexto del fundador.
    data.ipAddress = clientIp(req);
    data.userAgent = sanitize(req.headers['user-agent'], 500);

    const who = data.name || data.contact || 'un visitante';

    // 1) Copia guardada del contacto ANTES de avisar o mandar correo. Sin email
    //    ni teléfono no hay lead que guardar (pidió una persona sin dejar datos):
    //    queda el aviso del panel. createLead deduplica 10 min por source+contacto,
    //    así que si ya lo dejó en la captura del chat no se duplica.
    let refId = null;
    let leadFailed = false;
    if (data.contact) {
      const isEmail = data.contact.includes('@');
      try {
        refId = await createLead({
          name: data.name,
          email: isEmail ? data.contact : null,
          phone: isEmail ? null : data.contact,
          interest: 'Quiere hablar con una persona (desde el chat)',
          message: data.message,
          source: 'chat',
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        });
      } catch (err) {
        leadFailed = true;
        console.error('[handoff] no se pudo guardar el lead:', err && err.message);
      }
    }

    // 2) Notificación in-dashboard — defensiva, no rompe el flujo si falla.
    await createNotification({
      type: 'chat_handoff',
      title: `${who} quiere hablar con un humano`,
      body: data.message || (data.contact ? `Contacto: ${data.contact}` : 'Sin mensaje.'),
      ref: refId,
      url: '/dashboard',
    });

    // 3) Email al fundador — awaitado, no bloquea la respuesta si falla.
    let emailAdminOk = false;
    if (resend) {
      await withTimeout(emailAdminHandoff({ ref: refId, data }), 8000, 'Resend handoff')
        .then(() => { emailAdminOk = true; })
        .catch(err => console.error('[handoff] admin email falló:', err && err.message));
      console.log(`[handoff] ${refId || 'sin lead'} (${who}) · adminEmail=${emailAdminOk}`);
      if (!emailAdminOk && refId) await notifyLeadEmailFailure({ refId, who: 'admin', name: data.name || '' });
    } else {
      console.warn('[handoff] registrado · RESEND_API_KEY no configurada, sin email');
    }

    // Sin ninguna copia (el lead no se guardó y el correo no salió): error, para
    // que el visitante use WhatsApp en vez de creer que alguien le escribirá.
    if (leadFailed && !emailAdminOk) {
      return res.status(500).json({
        ok: false,
        error: 'No pudimos pasar tu solicitud. Por favor escríbenos directo por WhatsApp o email.',
      });
    }

    return res.status(200).json({ ok: true, refId, emailAdmin: emailAdminOk });

  } catch (err) {
    console.error('[handoff] error:', err);
    return res.status(500).json({
      ok: false,
      error: 'No pudimos pasar tu solicitud. Por favor escríbenos directo por WhatsApp o email.',
    });
  }
}
