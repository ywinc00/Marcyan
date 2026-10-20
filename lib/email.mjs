// ════════════════════════════════════════════════════════════════
//  lib/email.mjs — Wrapper de Resend con templates
// ════════════════════════════════════════════════════════════════
import { Resend } from 'resend';
import { formatHoustonDateTime } from './dates.mjs';
import { sectionsFor, labelFor, shortLabel } from './brief-schema.mjs';

const RESEND_KEY     = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.BRIEF_FROM_EMAIL || 'Marcyan <briefs@marcyanstudio.com>';
const NOTIFY_EMAIL   = process.env.BRIEF_NOTIFY_EMAIL || 'hello@marcyanstudio.com';
// En una vista previa de Vercel los enlaces (acceso al panel, avisos, kit) apuntan a la
// propia vista previa: con ADMIN_BASE_URL de producción, el enlace mágico abría el panel
// de producción en vez del que se está probando. En producción no cambia nada.
const PREVIEW_HOST   = process.env.VERCEL_ENV === 'preview' ? (process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL) : '';
const BASE_URL       = PREVIEW_HOST ? `https://${PREVIEW_HOST}` : (process.env.ADMIN_BASE_URL || 'https://marcyanstudio.com');
const BRAND_COLOR    = '#c8a96e';
const BRAND_TEAL     = '#4fc3a1';
const BG_BLACK       = '#080808';
const TEXT_WARM      = '#f0ede8';
const TEXT_MUTED     = '#6b6b6b';

export const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

// ── Enlaces profundos a Orbit (/dashboard) ────────────────────
// Los correos al dueño abren el registro concreto en el panel nuevo, no el
// panel viejo /admin (CRM-11, B-12). Rutas por hash: el panel las lee al cargar.
//   brief → /dashboard#/briefs/MRC-017 · lead → /dashboard#/leads/LEAD-012
//   avisos → /dashboard#/avisos
export function orbitLink(kind, ref) {
  const base = `${BASE_URL}/dashboard`;
  if (kind === 'brief' && ref) return `${base}#/briefs/${encodeURIComponent(ref)}`;
  if (kind === 'lead'  && ref) return `${base}#/leads/${encodeURIComponent(ref)}`;
  if (kind === 'avisos')       return `${base}#/avisos`;
  return base;
}

// Fecha de recepción en hora de Houston (B-17): Vercel corre en UTC.
const receivedAt = () => `${formatHoustonDateTime(new Date())} (hora de Houston)`;

// ── Helpers ───────────────────────────────────────────────────
export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

async function send({ to, subject, html, text, replyTo }) {
  if (!resend) throw new Error('RESEND_API_KEY no configurada');
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to, subject, html, text,
    replyTo: replyTo || undefined,
  });
  if (result && result.error) {
    const e = result.error;
    throw new Error(`Resend ${e.name || 'error'}: ${e.message || JSON.stringify(e)}`);
  }
  return result && result.data;
}

const wrapper = (innerHtml) => `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:${BG_BLACK};">
  <div style="max-width:680px;margin:0 auto;background:${BG_BLACK};color:${TEXT_WARM};
              font-family:'DM Sans',Arial,sans-serif;font-weight:300;padding:40px 32px;">
    ${innerHtml}
    <div style="border-top:1px solid rgba(200,169,110,0.18);margin-top:32px;padding-top:14px;
                color:${TEXT_MUTED};font-size:11px;">
      Marcyan · Diseño Web · IA · Houston · Miami
    </div>
  </div>
</body></html>`.trim();

// ════════════════════════════════════════════════════════════════
//  Template 1: notificación al admin (nuevo brief recibido)
// ════════════════════════════════════════════════════════════════
export async function emailAdminNewBrief({ projectId, data, pages, features, extra = null, services = null, filesCount = 0 }) {
  const subject = `Nuevo brief ${projectId} — ${data.business_name || 'sin nombre de negocio'}`;
  // Secciones y etiquetas legibles desde el esquema único (B-08/B-09): el
  // dueño lee "Bilingüe" o "2 a 4 semanas", no "biling" o "2-4sem". Los
  // valores desconocidos (texto libre del chat) se muestran tal cual.
  const all = {
    ...(extra || {}), ...data,
    pages_required: pages || [], features_required: features || [],
    ...(Array.isArray(services) && services.length ? { services } : {}),
  };
  const sectionsHtml = sectionsFor(null, null, { includeHidden: true })
    .map((s) => section(s.short.es, s.fields
      .filter((fd) => fd.type !== 'file')
      .map((fd) => [shortLabel(fd, 'es'), labelFor(fd, all[fd.key], 'es')])))
    .join('') + (filesCount ? section('Archivos', [['Subidos', `${filesCount} (se ven en el panel)`]]) : '');

  const adminLink = orbitLink('brief', projectId);
  const html = wrapper(`
    <div style="border-bottom:1px solid rgba(200,169,110,0.4);padding-bottom:18px;margin-bottom:28px;">
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:600;
                  letter-spacing:0.18em;color:${BRAND_COLOR};text-transform:uppercase;">
        Nuevo Brief · ${escapeHtml(projectId)}
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.2em;
                  color:${TEXT_MUTED};text-transform:uppercase;margin-top:6px;">
        Marcyan · Brief de Cliente
      </div>
      <a href="${adminLink}" style="display:inline-block;margin-top:14px;padding:8px 16px;
         background:${BRAND_COLOR};color:${BG_BLACK};text-decoration:none;border-radius:4px;
         font-family:'Space Mono',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">
        Abrir en el panel →
      </a>
    </div>
    ${sectionsHtml}
    <div style="margin-top:18px;color:${TEXT_MUTED};font-size:11px;">
      Recibido el ${receivedAt()}
    </div>
  `);

  const text = `Nuevo brief ${projectId}\n\n` +
    `Negocio: ${data.business_name || '-'}\n` +
    `Propietario: ${data.owner_name || '-'}\n` +
    `Email: ${data.email || '-'}\n` +
    `Teléfono: ${data.phone || '-'}\n` +
    `Ciudad: ${data.city_state || '-'}\n\n` +
    `Abrir en el panel: ${adminLink}`;

  return send({
    to: NOTIFY_EMAIL, subject, html, text,
    replyTo: data.email || undefined,
  });
}

// ════════════════════════════════════════════════════════════════
//  Template 2: auto-respuesta al cliente (confirmación de brief)
// ════════════════════════════════════════════════════════════════
// B-03: el nombre y el negocio los escribe quien envía el formulario y este
// correo sale desde el dominio de Marcyan. Se recortan y se les quitan los
// enlaces para que nadie use el formulario como cartero de phishing.
function safeReflected(s, max) {
  if (!s) return null;
  const clean = String(s)
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '')
    .replace(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|us|info|biz|xyz|app|site|online|link|ru|cn)\b\S*/gi, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean ? clean.slice(0, max) : null;
}

export async function emailClientConfirmation({ projectId, clientEmail, ownerName, businessName, lang = 'es' }) {
  if (!clientEmail) return null;
  ownerName = safeReflected(ownerName, 40);
  businessName = safeReflected(businessName, 60);
  if (lang === 'en') return emailClientConfirmationEn({ projectId, clientEmail, ownerName, businessName });
  const greeting = ownerName ? `Hola ${escapeHtml(ownerName.split(' ')[0])}` : 'Hola';
  const businessRef = businessName
    ? ` para <strong style="color:${BRAND_COLOR};">${escapeHtml(businessName)}</strong>`
    : '';

  const subject = `Recibimos tu brief — Marcyan · ${projectId}`;
  const html = wrapper(`
    <div style="border-bottom:1px solid rgba(200,169,110,0.4);padding-bottom:18px;margin-bottom:28px;">
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;font-weight:600;
                  letter-spacing:0.12em;color:${BRAND_COLOR};text-transform:uppercase;">
        Brief Recibido
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.2em;
                  color:${BRAND_TEAL};text-transform:uppercase;margin-top:6px;">
        ${escapeHtml(projectId)}
      </div>
    </div>

    <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-style:italic;
              color:${TEXT_WARM};line-height:1.55;margin:0 0 18px 0;">
      ${greeting}, gracias por compartir los detalles de tu proyecto${businessRef}.
    </p>

    <p style="font-size:14px;line-height:1.7;color:${TEXT_WARM};margin:0 0 18px 0;">
      Hemos recibido tu brief con el ID
      <strong style="font-family:'Space Mono',monospace;letter-spacing:0.1em;color:${BRAND_COLOR};">${escapeHtml(projectId)}</strong>.
      Un asesor de Marcyan revisará tu información y te responderá en
      <strong style="color:${BRAND_TEAL};">menos de 1 hora hábil</strong>,
      y recibirás tu propuesta personalizada, con los siguientes pasos, en
      <strong style="color:${BRAND_TEAL};">menos de 24 horas</strong>.
    </p>

    <p style="font-size:14px;line-height:1.7;color:${TEXT_WARM};margin:0 0 24px 0;">
      Si necesitas agregar o corregir algo, simplemente responde a este correo.
    </p>

    <div style="background:#141414;border:1px solid rgba(200,169,110,0.18);border-left:3px solid ${BRAND_COLOR};
                border-radius:6px;padding:16px 20px;margin:24px 0;">
      <div style="font-family:'Space Mono',monospace;font-size:9px;letter-spacing:0.18em;
                  color:${BRAND_COLOR};text-transform:uppercase;margin-bottom:6px;">
        ¿Qué sigue?
      </div>
      <ul style="margin:0;padding:0;list-style:none;font-size:13px;line-height:1.8;color:${TEXT_WARM};">
        <li>· Revisamos tu brief en detalle.</li>
        <li>· Preparamos una propuesta de diseño y alcance.</li>
        <li>· Agendamos una llamada para validar y arrancar.</li>
      </ul>
    </div>

    <p style="font-size:13px;font-style:italic;color:${TEXT_MUTED};margin:24px 0 0 0;line-height:1.6;">
      Mientras tanto, puedes seguirnos en redes o explorar nuestros proyectos en
      <a href="${BASE_URL}" style="color:${BRAND_COLOR};text-decoration:none;">marcyanstudio.com</a>.
    </p>
  `);

  const text =
    `${greeting},\n\n` +
    `Gracias por compartir los detalles de tu proyecto${businessName ? ` para ${businessName}` : ''}.\n\n` +
    `Hemos recibido tu brief con el ID ${projectId}. Un asesor de Marcyan te responderá\n` +
    `en menos de 1 hora hábil, y recibirás tu propuesta personalizada en menos de 24 horas.\n\n` +
    `Si necesitas agregar o corregir algo, responde a este correo.\n\n` +
    `— Marcyan\n${BASE_URL}`;

  return send({
    to: clientEmail,
    subject, html, text,
    replyTo: NOTIFY_EMAIL,
  });
}

// Versión en inglés de la confirmación (brief v2 con lang 'en').
// Mismos plazos que la política: contacto en 1 hora hábil, propuesta en 24 horas.
async function emailClientConfirmationEn({ projectId, clientEmail, ownerName, businessName }) {
  const greeting = ownerName ? `Hi ${escapeHtml(ownerName.split(' ')[0])}` : 'Hi';
  const businessRef = businessName
    ? ` for <strong style="color:${BRAND_COLOR};">${escapeHtml(businessName)}</strong>`
    : '';
  const subject = `We received your brief · Marcyan · ${projectId}`;
  const html = wrapper(`
    <div style="border-bottom:1px solid rgba(200,169,110,0.4);padding-bottom:18px;margin-bottom:28px;">
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;font-weight:600;
                  letter-spacing:0.12em;color:${BRAND_COLOR};text-transform:uppercase;">
        Brief received
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.2em;
                  color:${BRAND_TEAL};text-transform:uppercase;margin-top:6px;">
        ${escapeHtml(projectId)}
      </div>
    </div>
    <p style="font-size:16px;line-height:1.6;color:${TEXT_WARM};margin:0 0 18px 0;">
      ${greeting}, thank you for sharing the details of your project${businessRef}.
    </p>
    <p style="font-size:14px;line-height:1.7;color:${TEXT_WARM};margin:0 0 18px 0;">
      We received your brief with ID
      <strong style="font-family:'Space Mono',monospace;letter-spacing:0.1em;color:${BRAND_COLOR};">${escapeHtml(projectId)}</strong>.
      Someone from Marcyan will get back to you within
      <strong style="color:${BRAND_TEAL};">1 business hour</strong>,
      and you will receive your custom proposal, with next steps, within
      <strong style="color:${BRAND_TEAL};">24 hours</strong>.
    </p>
    <p style="font-size:14px;line-height:1.7;color:${TEXT_WARM};margin:0 0 24px 0;">
      If you need to add or correct anything, just reply to this email.
    </p>
  `);
  const text =
    `${greeting},\n\n` +
    `Thank you for sharing the details of your project${businessName ? ` for ${businessName}` : ''}.\n\n` +
    `We received your brief with ID ${projectId}. Someone from Marcyan will get back to you\n` +
    `within 1 business hour, and you will receive your custom proposal within 24 hours.\n\n` +
    `If you need to add or correct anything, reply to this email.\n\n` +
    `Marcyan\n${BASE_URL}`;
  return send({ to: clientEmail, subject, html, text, replyTo: NOTIFY_EMAIL });
}

// ════════════════════════════════════════════════════════════════
//  Template 2c: enlace del "Kit de arranque" al cliente (segundo momento)
//  Lo envía el panel cuando el cliente contrata (POST
//  /api/admin/briefs/:id/kit-link con sendEmail:true). El enlace es único,
//  sin cuenta; el token nunca se registra en logs.
// ════════════════════════════════════════════════════════════════
export async function emailClientKitLink({ to, url, projectId, ownerName, businessName, lang = 'es', replyTo }) {
  if (!to || !url) return null;
  const { subject, html, text } = kitLinkEmail({ url, projectId, ownerName, businessName, lang });
  return send({ to, subject, html, text, replyTo: replyTo || NOTIFY_EMAIL });
}

// Contenido del correo del kit (puro: lo prueba scripts/test-brief-v2.mjs).
export function kitLinkEmail({ url, projectId, ownerName, businessName, lang = 'es' }) {
  const en = lang === 'en';
  // Valores en texto plano (asunto y versión de texto); escapeHtml solo al
  // ponerlos en el HTML. Sin saltos de línea: van en el asunto.
  const plain = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
  const first = plain(String(ownerName || '').trim().split(/\s+/)[0], 40);
  const biz = plain(businessName, 80);
  const T = en ? {
    subject: `Your kickoff kit${biz ? ` for ${biz}` : ''} · Marcyan · ${projectId}`,
    title: 'Kickoff kit',
    hi: first ? `Hi ${first},` : 'Hi,',
    p1: 'Thank you for choosing Marcyan. To start your project we need a few more details: your logo and photos, hours, service areas, prices and the accounts you already have.',
    p2: 'You can fill it in parts: what you save stays saved. We will never ask for passwords.',
    cta: 'Open my kickoff kit',
    p3: 'This link is personal. Do not share it outside your team.',
    help: 'Questions? Just reply to this email.',
  } : {
    subject: `Tu kit de arranque${biz ? ` para ${biz}` : ''} · Marcyan · ${projectId}`,
    title: 'Kit de arranque',
    hi: first ? `Hola ${first}:` : 'Hola:',
    p1: 'Gracias por elegir Marcyan. Para arrancar tu proyecto necesitamos algunos datos más: tu logo y tus fotos, horario, zonas, precios y las cuentas que ya tienes.',
    p2: 'Puedes llenarlo por partes: lo que guardes queda guardado. Nunca te pediremos contraseñas.',
    cta: 'Abrir mi kit de arranque',
    p3: 'Este enlace es personal. No lo compartas fuera de tu equipo.',
    help: '¿Dudas? Responde a este correo.',
  };
  const html = wrapper(`
    <div style="border-bottom:1px solid rgba(200,169,110,0.4);padding-bottom:18px;margin-bottom:28px;">
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:600;
                  letter-spacing:0.12em;color:${BRAND_COLOR};text-transform:uppercase;">
        ${escapeHtml(T.title)}
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.2em;
                  color:${BRAND_TEAL};text-transform:uppercase;margin-top:6px;">
        ${escapeHtml(projectId)}
      </div>
    </div>
    <p style="font-size:15px;line-height:1.7;color:${TEXT_WARM};margin:0 0 14px 0;">${escapeHtml(T.hi)}</p>
    <p style="font-size:14px;line-height:1.7;color:${TEXT_WARM};margin:0 0 14px 0;">${escapeHtml(T.p1)}</p>
    <p style="font-size:14px;line-height:1.7;color:${TEXT_WARM};margin:0 0 22px 0;">${escapeHtml(T.p2)}</p>
    <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 22px;background:${BRAND_COLOR};color:${BG_BLACK};
       text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
      ${escapeHtml(T.cta)}
    </a>
    <p style="font-size:12px;line-height:1.6;color:${TEXT_MUTED};margin:22px 0 6px 0;">${escapeHtml(T.p3)}</p>
    <p style="font-size:12px;line-height:1.6;color:${TEXT_MUTED};margin:0;">${escapeHtml(T.help)}</p>
  `);
  const text = `${T.hi}\n\n${T.p1}\n\n${T.p2}\n\n${T.cta}: ${url}\n\n${T.p3}\n${T.help}\n\nMarcyan\n${BASE_URL}`;
  return { subject: T.subject, html, text };
}

// ════════════════════════════════════════════════════════════════
//  Template 2b: notificación al admin (nuevo LEAD / mensaje de contacto)
// ════════════════════════════════════════════════════════════════
export async function emailAdminNewLead({ refId, data }) {
  const origin = data.source === 'chat' ? 'Asistente del sitio (chatbot)' : 'Formulario de contacto';
  const subject = `Nuevo lead ${refId} — ${data.name || data.business_name || data.email || 'sin nombre'}`;

  const sectionsHtml = [
    section('Contacto', [
      ['Nombre', data.name],
      ['Email', data.email],
      ['Teléfono', data.phone],
      ['Negocio', data.business_name],
      ['Ciudad', data.city],
    ]),
    section('Mensaje', [
      ['Interés', data.interest],
      ['Mensaje', data.message],
      ['Origen', origin],
    ]),
  ].join('');

  const dashLink = orbitLink('lead', refId);
  const html = wrapper(`
    <div style="border-bottom:1px solid rgba(79,195,161,0.4);padding-bottom:18px;margin-bottom:28px;">
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:600;
                  letter-spacing:0.18em;color:${BRAND_TEAL};text-transform:uppercase;">
        Nuevo Lead · ${escapeHtml(refId)}
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.2em;
                  color:${TEXT_MUTED};text-transform:uppercase;margin-top:6px;">
        Marcyan · ${escapeHtml(origin)}
      </div>
      <a href="${dashLink}" style="display:inline-block;margin-top:14px;padding:8px 16px;
         background:${BRAND_TEAL};color:${BG_BLACK};text-decoration:none;border-radius:4px;
         font-family:'Space Mono',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">
        Abrir el panel →
      </a>
    </div>
    ${sectionsHtml}
    <div style="margin-top:18px;color:${TEXT_MUTED};font-size:11px;">
      Recibido el ${receivedAt()}
    </div>
  `);

  const text = `Nuevo lead ${refId} (${origin})\n\n` +
    `Nombre: ${data.name || '-'}\n` +
    `Email: ${data.email || '-'}\n` +
    `Teléfono: ${data.phone || '-'}\n` +
    `Negocio: ${data.business_name || '-'}\n` +
    `Ciudad: ${data.city || '-'}\n` +
    `Interés: ${data.interest || '-'}\n` +
    `Mensaje: ${data.message || '-'}\n\n` +
    `Panel: ${dashLink}`;

  return send({
    to: NOTIFY_EMAIL, subject, html, text,
    replyTo: data.email || undefined,
  });
}

// ════════════════════════════════════════════════════════════════
//  Template 2d: HANDOFF de chat — un visitante pidió hablar con humano
//  El asistente NO hace chat en vivo; el fundador responde por
//  WhatsApp/email. La PII viaja del widget al endpoint, nunca al modelo.
// ════════════════════════════════════════════════════════════════
export async function emailAdminHandoff({ ref, data = {} }) {
  const who = data.name || data.contact || 'un visitante';
  const subject = `🔔 Handoff de chat — ${who} quiere hablar con un humano`;

  const langLabel = data.lang === 'en' ? 'Inglés' : (data.lang === 'es' ? 'Español' : data.lang);
  const sectionsHtml = [
    section('Solicitud de contacto humano', [
      ['Nombre', data.name],
      ['Contacto (WhatsApp / email)', data.contact],
      ['Idioma', langLabel],
    ]),
    section('Mensaje del visitante', [
      ['Mensaje', data.message],
    ]),
  ].join('');

  // Un handoff no tiene registro propio: abre la bandeja de avisos.
  const dashLink = orbitLink('avisos');
  const html = wrapper(`
    <div style="border-bottom:1px solid rgba(79,195,161,0.4);padding-bottom:18px;margin-bottom:28px;">
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:600;
                  letter-spacing:0.18em;color:${BRAND_TEAL};text-transform:uppercase;">
        Handoff de Chat${ref ? ` · ${escapeHtml(ref)}` : ''}
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.2em;
                  color:${TEXT_MUTED};text-transform:uppercase;margin-top:6px;">
        Marcyan · Un visitante pidió hablar con una persona
      </div>
      <a href="${dashLink}" style="display:inline-block;margin-top:14px;padding:8px 16px;
         background:${BRAND_TEAL};color:${BG_BLACK};text-decoration:none;border-radius:4px;
         font-family:'Space Mono',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">
        Abrir el panel →
      </a>
    </div>
    ${sectionsHtml}
    <div style="margin-top:18px;color:${TEXT_MUTED};font-size:11px;">
      Recibido el ${receivedAt()}.
      Respóndele por WhatsApp o email cuanto antes.
    </div>
  `);

  const text = `Handoff de chat${ref ? ` (${ref})` : ''}\n\n` +
    `${who} quiere hablar con un humano.\n\n` +
    `Nombre: ${data.name || '-'}\n` +
    `Contacto: ${data.contact || '-'}\n` +
    `Idioma: ${langLabel || '-'}\n` +
    `Mensaje: ${data.message || '-'}\n\n` +
    `Panel: ${dashLink}`;

  return send({
    to: NOTIFY_EMAIL, subject, html, text,
  });
}

// ════════════════════════════════════════════════════════════════
//  Template 2c: auto-respuesta al cliente (confirmación de mensaje)
// ════════════════════════════════════════════════════════════════
export async function emailClientLeadConfirmation({ refId, clientEmail, name }) {
  if (!clientEmail) return null;
  const greeting = name ? `Hola ${escapeHtml(String(name).split(' ')[0])}` : 'Hola';
  const subject = `Recibimos tu mensaje — Marcyan`;

  const html = wrapper(`
    <div style="border-bottom:1px solid rgba(200,169,110,0.4);padding-bottom:18px;margin-bottom:28px;">
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;font-weight:600;
                  letter-spacing:0.12em;color:${BRAND_COLOR};text-transform:uppercase;">
        Mensaje Recibido
      </div>
    </div>

    <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-style:italic;
              color:${TEXT_WARM};line-height:1.55;margin:0 0 18px 0;">
      ${greeting}, gracias por escribirnos.
    </p>

    <p style="font-size:14px;line-height:1.7;color:${TEXT_WARM};margin:0 0 18px 0;">
      Hemos recibido tu mensaje. Un asesor de Marcyan lo revisará y te contactará en
      <strong style="color:${BRAND_TEAL};">menos de 1 hora hábil</strong>.
    </p>

    <p style="font-size:14px;line-height:1.7;color:${TEXT_WARM};margin:0 0 24px 0;">
      Si necesitas agregar algo, simplemente responde a este correo.
    </p>

    <p style="font-size:13px;font-style:italic;color:${TEXT_MUTED};margin:24px 0 0 0;line-height:1.6;">
      Mientras tanto, puedes explorar nuestros proyectos en
      <a href="${BASE_URL}" style="color:${BRAND_COLOR};text-decoration:none;">marcyanstudio.com</a>.
    </p>
  `);

  const text =
    `${greeting},\n\n` +
    `Gracias por escribirnos. Hemos recibido tu mensaje y un asesor de Marcyan te\n` +
    `contactará en menos de 1 hora hábil.\n\n` +
    `Si necesitas agregar algo, responde a este correo.\n\n` +
    `— Marcyan\n${BASE_URL}`;

  return send({
    to: clientEmail,
    subject, html, text,
    replyTo: NOTIFY_EMAIL,
  });
}

// ════════════════════════════════════════════════════════════════
//  Template 2e: reporte del Diagnóstico digital (Growth OS)
//  reportText = texto plano YA redactado (IA claude-sonnet-5 o fallback
//  determinista). Aquí solo se maqueta y se envía. Sin PII del modelo:
//  clientEmail/businessName vienen del endpoint, no del reporte.
// ════════════════════════════════════════════════════════════════
export async function emailDiagnosticReport({ refId, clientEmail, businessName, lang = 'es', reportText = '' }) {
  if (!clientEmail) return null;
  const L = lang === 'en';
  const heading = L ? 'Your Digital Checkup' : 'Tu Diagnóstico Digital';
  const kicker = L ? 'Marcyan · Free digital checkup' : 'Marcyan · Diagnóstico digital gratis';
  const subject = L
    ? `Your digital checkup${businessName ? ` — ${businessName}` : ''} · ${refId}`
    : `Tu diagnóstico digital${businessName ? ` — ${businessName}` : ''} · ${refId}`;
  const ctaLabel = L ? 'Talk to us →' : 'Hablemos →';

  const html = wrapper(`
    <div style="border-bottom:1px solid rgba(200,169,110,0.4);padding-bottom:18px;margin-bottom:28px;">
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:600;
                  letter-spacing:0.12em;color:${BRAND_COLOR};text-transform:uppercase;">
        ${escapeHtml(heading)}
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.2em;
                  color:${TEXT_MUTED};text-transform:uppercase;margin-top:6px;">
        ${escapeHtml(kicker)} · ${escapeHtml(refId)}
      </div>
    </div>

    <div style="font-size:14px;line-height:1.7;color:${TEXT_WARM};white-space:pre-wrap;">${escapeHtml(reportText)}</div>

    <div style="text-align:center;margin:32px 0 8px 0;">
      <a href="${BASE_URL}${L ? '/en/pricing' : '/es/precios'}" style="display:inline-block;padding:12px 28px;
         background:${BRAND_COLOR};color:${BG_BLACK};text-decoration:none;border-radius:6px;
         font-family:'Space Mono',monospace;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">
        ${escapeHtml(ctaLabel)}
      </a>
    </div>
  `);

  const text = `${heading} · ${refId}\n\n${reportText}\n\n— Marcyan\n${BASE_URL}`;

  return send({
    to: clientEmail,
    subject, html, text,
    replyTo: NOTIFY_EMAIL,
  });
}

// ════════════════════════════════════════════════════════════════
//  Template 3: magic link al admin (login)
// ════════════════════════════════════════════════════════════════
export async function emailAdminMagicLink({ email, token, ipAddress }) {
  const link = `${BASE_URL}/api/admin/verify?token=${encodeURIComponent(token)}`;
  const subject = `Tu acceso a Marcyan Admin`;
  const html = wrapper(`
    <div style="border-bottom:1px solid rgba(200,169,110,0.4);padding-bottom:18px;margin-bottom:28px;">
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:600;
                  letter-spacing:0.18em;color:${BRAND_COLOR};text-transform:uppercase;">
        Acceso · Admin
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.2em;
                  color:${TEXT_MUTED};text-transform:uppercase;margin-top:6px;">
        Marcyan · Magic Link
      </div>
    </div>

    <p style="font-size:14px;line-height:1.7;color:${TEXT_WARM};margin:0 0 24px 0;">
      Click en el botón para entrar al panel admin. Este enlace es de
      <strong>un solo uso</strong> y expira en <strong>15 minutos</strong>.
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${link}" style="display:inline-block;padding:14px 32px;background:${BRAND_COLOR};
         color:${BG_BLACK};text-decoration:none;border-radius:6px;font-family:'Space Mono',monospace;
         font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;">
        Acceder al panel →
      </a>
    </div>

    <p style="font-size:12px;color:${TEXT_MUTED};line-height:1.6;margin:24px 0 0 0;">
      Si el botón no funciona, copia esta URL en tu navegador:<br>
      <span style="word-break:break-all;color:${BRAND_TEAL};font-family:'Space Mono',monospace;font-size:11px;">${escapeHtml(link)}</span>
    </p>

    <p style="font-size:12px;color:${TEXT_MUTED};line-height:1.6;margin:18px 0 0 0;">
      ${ipAddress ? `Solicitud desde IP <strong>${escapeHtml(ipAddress)}</strong>. ` : ''}
      Si no solicitaste este acceso, ignora este correo.
    </p>
  `);

  const text =
    `Marcyan · Acceso al panel admin\n\n` +
    `Click en el siguiente enlace para entrar (un solo uso, expira en 15 min):\n\n` +
    `${link}\n\n` +
    `Si no solicitaste este acceso, ignora este correo.`;

  return send({
    to: email,
    subject, html, text,
  });
}

// ════════════════════════════════════════════════════════════════
//  Template 4: email manual desde admin al cliente
// ════════════════════════════════════════════════════════════════
// Cuerpo del correo manual en HTML (B-21, revisado en la integración A3-11).
// body es texto plano: los saltos se convierten en <br> (escapeHtml) y el div
// NO lleva white-space:pre-wrap. Con los dos, cada salto llegaba doble al
// cliente. Los saltos de Windows (\r\n) o sueltos (\r) se normalizan antes en
// emailManualToClient, porque escapeHtml solo convierte \n.
export function manualBodyHtml(text) {
  return wrapper(`
    <div style="font-size:14px;line-height:1.7;color:${TEXT_WARM};">${escapeHtml(text)}</div>
  `);
}

export async function emailManualToClient({ to, subject, body, replyTo, fromAdminEmail }) {
  const text = String(body ?? '').replace(/\r\n?/g, '\n');
  return send({
    to,
    subject,
    html: manualBodyHtml(text),
    text,
    replyTo: replyTo || fromAdminEmail || NOTIFY_EMAIL,
  });
}

// ── Sección reutilizable ──────────────────────────────────────
function section(title, rows) {
  const filled = rows.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!filled.length) return '';
  const tr = filled.map(([k, v]) => `
    <tr>
      <td style="padding:6px 16px 6px 0;color:${BRAND_COLOR};font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;vertical-align:top;width:38%;">${escapeHtml(k)}</td>
      <td style="padding:6px 0;color:${TEXT_WARM};font-size:13px;line-height:1.5;vertical-align:top;">${escapeHtml(v)}</td>
    </tr>
  `).join('');
  return `
    <div style="margin-bottom:24px;">
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:15px;font-weight:600;letter-spacing:0.06em;color:${TEXT_WARM};text-transform:uppercase;border-bottom:1px solid rgba(200,169,110,0.18);padding-bottom:6px;margin-bottom:8px;">
        ${escapeHtml(title)}
      </div>
      <table style="width:100%;border-collapse:collapse;">${tr}</table>
    </div>
  `;
}
