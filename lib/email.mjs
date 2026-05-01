// ════════════════════════════════════════════════════════════════
//  lib/email.mjs — Wrapper de Resend con templates
// ════════════════════════════════════════════════════════════════
import { Resend } from 'resend';

const RESEND_KEY     = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.BRIEF_FROM_EMAIL || 'Marcyan <briefs@marcyanstudio.com>';
const NOTIFY_EMAIL   = process.env.BRIEF_NOTIFY_EMAIL || 'hello@marcyanstudio.com';
const BASE_URL       = process.env.ADMIN_BASE_URL || 'https://marcyanstudio.com';
const BRAND_COLOR    = '#c8a96e';
const BRAND_TEAL     = '#4fc3a1';
const BG_BLACK       = '#080808';
const TEXT_WARM      = '#f0ede8';
const TEXT_MUTED     = '#6b6b6b';

export const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

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
export async function emailAdminNewBrief({ projectId, data, pages, features }) {
  const subject = `Nuevo brief ${projectId} — ${data.business_name || 'sin nombre de negocio'}`;
  const sectionsHtml = [
    section('01 · Negocio', [
      ['Nombre del negocio', data.business_name],
      ['Propietario', data.owner_name],
      ['Industria', data.industry],
      ['Años en el mercado', data.years_in_market],
      ['Descripción', data.business_description],
      ['Productos / Servicios', data.products_services],
    ]),
    section('02 · Contacto', [
      ['Teléfono', data.phone],
      ['Email', data.email],
      ['Ciudad / Estado', data.city_state],
      ['Web actual', data.current_website],
      ['Instagram', data.instagram],
      ['Facebook', data.facebook],
      ['Otras redes', data.other_socials],
      ['Google Business', data.google_business],
    ]),
    section('03 · Tipo de sitio', [
      ['Tipo', data.website_type],
      ['¿Dominio propio?', data.has_domain],
      ['¿Hosting?', data.has_hosting],
      ['Páginas / secciones', pages?.join(' · ') || null],
      ['Funcionalidades', features?.join(' · ') || null],
    ]),
    section('04 · Audiencia & Objetivos', [
      ['Audiencia', data.target_audience],
      ['Objetivo principal', data.main_objective],
      ['Acción del visitante', data.visitor_action],
      ['Competidores', data.competitors],
    ]),
    section('05 · Identidad de marca', [
      ['¿Logo?', data.has_logo],
      ['Colores', data.brand_colors],
      ['Tipografías', data.brand_fonts],
      ['Personalidad', data.brand_personality],
      ['Inspiración', data.inspiration_sites],
      ['No le gusta', data.design_dislikes],
    ]),
    section('06 · Contenido', [
      ['Fotos', data.has_photos], ['Textos', data.has_copy],
      ['Video', data.has_video], ['Idioma', data.language],
    ]),
    section('07 · Presupuesto & Tiempos', [
      ['Inversión estimada', data.budget_range],
      ['Tiempo de entrega', data.timeline],
      ['Fecha límite', data.deadline],
    ]),
    section('08 · Notas', [
      ['Notas adicionales', data.additional_notes],
      ['¿Cómo se enteró?', data.referred_by],
      ['Agencia previa', data.previous_agency],
    ]),
  ].join('');

  const adminLink = `${BASE_URL}/admin/briefs/detail?id=${encodeURIComponent(projectId)}`;
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
        Abrir en panel admin →
      </a>
    </div>
    ${sectionsHtml}
    <div style="margin-top:18px;color:${TEXT_MUTED};font-size:11px;">
      Recibido el ${new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}
    </div>
  `);

  const text = `Nuevo brief ${projectId}\n\n` +
    `Negocio: ${data.business_name || '-'}\n` +
    `Propietario: ${data.owner_name || '-'}\n` +
    `Email: ${data.email || '-'}\n` +
    `Teléfono: ${data.phone || '-'}\n` +
    `Ciudad: ${data.city_state || '-'}\n\n` +
    `Abrir en panel admin: ${adminLink}`;

  return send({
    to: NOTIFY_EMAIL, subject, html, text,
    replyTo: data.email || undefined,
  });
}

// ════════════════════════════════════════════════════════════════
//  Template 2: auto-respuesta al cliente (confirmación de brief)
// ════════════════════════════════════════════════════════════════
export async function emailClientConfirmation({ projectId, clientEmail, ownerName, businessName }) {
  if (!clientEmail) return null;
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
      Un asesor de Marcyan revisará tu información y te contactará en
      <strong style="color:${BRAND_TEAL};">menos de 24 horas</strong>
      con una propuesta personalizada y los siguientes pasos.
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
    `Hemos recibido tu brief con el ID ${projectId}. Un asesor de Marcyan te contactará\n` +
    `en menos de 24 horas con una propuesta personalizada.\n\n` +
    `Si necesitas agregar o corregir algo, responde a este correo.\n\n` +
    `— Marcyan\n${BASE_URL}`;

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
export async function emailManualToClient({ to, subject, body, replyTo, fromAdminEmail }) {
  // body es plain text que convertimos en HTML preservando saltos de línea.
  const html = wrapper(`
    <div style="font-size:14px;line-height:1.7;color:${TEXT_WARM};white-space:pre-wrap;">
${escapeHtml(body)}
    </div>
  `);
  return send({
    to,
    subject,
    html,
    text: body,
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
