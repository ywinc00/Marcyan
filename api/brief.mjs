// ════════════════════════════════════════════════════════════════
//  POST /api/brief
//  Recibe el formulario, genera project_id MRC-XXX,
//  inserta en Postgres y notifica por email vía Resend.
// ════════════════════════════════════════════════════════════════

import { sql } from '@vercel/postgres';
import { Resend } from 'resend';

const RESEND_KEY     = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL   = process.env.BRIEF_NOTIFY_EMAIL || 'hello@marcyanstudio.com';
const FROM_EMAIL     = process.env.BRIEF_FROM_EMAIL  || 'Marcyan Briefs <noreply@marcyanstudio.com>';

const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

// Mapeo nombre del campo (cliente) → columna DB
const TEXT_FIELDS = [
  'business_name','owner_name','industry','years_in_market',
  'business_description','products_services',
  'phone','email','city_state','current_website',
  'instagram','facebook','other_socials','google_business',
  'website_type','has_domain','has_hosting',
  'target_audience','main_objective','visitor_action','competitors',
  'has_logo','brand_colors','brand_fonts','brand_personality',
  'inspiration_sites','design_dislikes',
  'has_photos','has_copy','has_video','language',
  'budget_range','timeline','deadline',
  'additional_notes','referred_by','previous_agency'
];

// ── Helpers ────────────────────────────────────────────────────
function sanitize(v, max = 5000) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function sanitizeArray(v, maxItems = 50, maxLen = 120) {
  if (!Array.isArray(v)) return [];
  return v
    .filter(x => x !== null && x !== undefined && x !== '')
    .slice(0, maxItems)
    .map(x => String(x).slice(0, maxLen));
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || null;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

// ── Handler ────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = (typeof req.body === 'object' && req.body) ? req.body : {};

    // Honeypot: si el bot llenó el campo oculto, fingimos éxito.
    if (body.website_hp) {
      return res.status(200).json({ ok: true, projectId: 'MRC-000' });
    }

    // Validación mínima: requerimos email o teléfono
    const email = sanitize(body.email, 200);
    const phone = sanitize(body.phone, 50);
    if (!email && !phone) {
      return res.status(400).json({
        ok: false,
        error: 'Necesitamos al menos un email o un teléfono para contactarte.'
      });
    }

    // Sanitizar todos los campos de texto
    const data = {};
    for (const f of TEXT_FIELDS) data[f] = sanitize(body[f]);
    data.email = email;
    data.phone = phone;

    // Arrays (checkbox groups)
    const pages    = sanitizeArray(body.pages_required);
    const features = sanitizeArray(body.features_required);

    // Generar project_id atómicamente
    const idResult = await sql`SELECT next_project_id() AS id`;
    const projectId = idResult.rows[0].id;

    // INSERT
    await sql`
      INSERT INTO briefs (
        project_id,
        business_name, owner_name, industry, years_in_market,
        business_description, products_services,
        phone, email, city_state, current_website,
        instagram, facebook, other_socials, google_business,
        website_type, has_domain, has_hosting,
        pages_required, features_required,
        target_audience, main_objective, visitor_action, competitors,
        has_logo, brand_colors, brand_fonts, brand_personality,
        inspiration_sites, design_dislikes,
        has_photos, has_copy, has_video, language,
        budget_range, timeline, deadline,
        additional_notes, referred_by, previous_agency,
        ip_address, user_agent, source
      ) VALUES (
        ${projectId},
        ${data.business_name}, ${data.owner_name}, ${data.industry}, ${data.years_in_market},
        ${data.business_description}, ${data.products_services},
        ${data.phone}, ${data.email}, ${data.city_state}, ${data.current_website},
        ${data.instagram}, ${data.facebook}, ${data.other_socials}, ${data.google_business},
        ${data.website_type}, ${data.has_domain}, ${data.has_hosting},
        ${JSON.stringify(pages)}::jsonb, ${JSON.stringify(features)}::jsonb,
        ${data.target_audience}, ${data.main_objective}, ${data.visitor_action}, ${data.competitors},
        ${data.has_logo}, ${data.brand_colors}, ${data.brand_fonts}, ${data.brand_personality},
        ${data.inspiration_sites}, ${data.design_dislikes},
        ${data.has_photos}, ${data.has_copy}, ${data.has_video}, ${data.language},
        ${data.budget_range}, ${data.timeline}, ${data.deadline},
        ${data.additional_notes}, ${data.referred_by}, ${data.previous_agency},
        ${clientIp(req)}, ${sanitize(req.headers['user-agent'], 500)}, 'web'
      )
    `;

    // Notificación email — la AWAITAMOS antes de responder.
    // En serverless, una promesa "fire-and-forget" se descarta cuando la
    // función responde y se congela. Si Resend falla, NO bloqueamos el
    // brief: ya está guardado en Postgres y respondemos OK igualmente.
    let emailDelivered = true;
    if (resend) {
      try {
        await Promise.race([
          sendNotification(projectId, data, pages, features),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Resend timeout (8s)')), 8000)
          )
        ]);
        console.log(`[brief] ${projectId} insertado y email enviado`);
      } catch (err) {
        emailDelivered = false;
        console.error(`[brief] ${projectId} insertado, pero email falló:`, err && err.message ? err.message : err);
      }
    } else {
      console.warn('[brief] RESEND_API_KEY no configurada — email omitido');
      emailDelivered = false;
    }

    return res.status(200).json({ ok: true, projectId, emailDelivered });

  } catch (err) {
    console.error('[brief] submission error:', err);
    return res.status(500).json({
      ok: false,
      error: 'Error al procesar el formulario. Por favor intenta de nuevo en un momento.'
    });
  }
}

// ── Email de notificación ─────────────────────────────────────
async function sendNotification(projectId, d, pages, features) {
  const subject = `Nuevo brief ${projectId} — ${d.business_name || 'sin nombre de negocio'}`;

  const sectionsHtml = [
    section('01 · Negocio', [
      ['Nombre del negocio', d.business_name],
      ['Propietario', d.owner_name],
      ['Industria', d.industry],
      ['Años en el mercado', d.years_in_market],
      ['Descripción', d.business_description],
      ['Productos / Servicios', d.products_services],
    ]),
    section('02 · Contacto', [
      ['Teléfono', d.phone],
      ['Email', d.email],
      ['Ciudad / Estado', d.city_state],
      ['Web actual', d.current_website],
      ['Instagram', d.instagram],
      ['Facebook', d.facebook],
      ['Otras redes', d.other_socials],
      ['Google Business', d.google_business],
    ]),
    section('03 · Tipo de sitio', [
      ['Tipo', d.website_type],
      ['¿Dominio propio?', d.has_domain],
      ['¿Hosting?', d.has_hosting],
      ['Páginas / secciones', pages.join(' · ') || null],
      ['Funcionalidades', features.join(' · ') || null],
    ]),
    section('04 · Audiencia & Objetivos', [
      ['Audiencia', d.target_audience],
      ['Objetivo principal', d.main_objective],
      ['Acción del visitante', d.visitor_action],
      ['Competidores', d.competitors],
    ]),
    section('05 · Identidad de marca', [
      ['¿Logo?', d.has_logo],
      ['Colores', d.brand_colors],
      ['Tipografías', d.brand_fonts],
      ['Personalidad', d.brand_personality],
      ['Inspiración', d.inspiration_sites],
      ['No le gusta', d.design_dislikes],
    ]),
    section('06 · Contenido', [
      ['Fotos', d.has_photos],
      ['Textos', d.has_copy],
      ['Video', d.has_video],
      ['Idioma', d.language],
    ]),
    section('07 · Presupuesto & Tiempos', [
      ['Inversión estimada', d.budget_range],
      ['Tiempo de entrega', d.timeline],
      ['Fecha límite', d.deadline],
    ]),
    section('08 · Notas', [
      ['Notas adicionales', d.additional_notes],
      ['¿Cómo se enteró?', d.referred_by],
      ['Agencia previa', d.previous_agency],
    ]),
  ].join('');

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#080808;">
  <div style="max-width:720px;margin:0 auto;background:#080808;color:#f0ede8;font-family:'DM Sans',Arial,sans-serif;font-weight:300;padding:40px 32px;">
    <div style="border-bottom:1px solid rgba(200,169,110,0.4);padding-bottom:18px;margin-bottom:28px;">
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:600;letter-spacing:0.18em;color:#c8a96e;text-transform:uppercase;">
        Nuevo Brief · ${escapeHtml(projectId)}
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.2em;color:#6b6b6b;text-transform:uppercase;margin-top:6px;">
        Marcyan · Brief de Cliente
      </div>
    </div>
    ${sectionsHtml}
    <div style="border-top:1px solid rgba(200,169,110,0.18);margin-top:32px;padding-top:14px;color:#6b6b6b;font-size:11px;">
      Recibido el ${new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}
    </div>
  </div>
</body>
</html>`.trim();

  const text =
    `Nuevo brief ${projectId}\n\n` +
    `Negocio:    ${d.business_name || '-'}\n` +
    `Propietario: ${d.owner_name || '-'}\n` +
    `Email:      ${d.email || '-'}\n` +
    `Teléfono:   ${d.phone || '-'}\n` +
    `Ciudad:     ${d.city_state || '-'}\n\n` +
    `(Detalle completo en el HTML del email.)`;

  // Resend SDK v4+ devuelve { data, error } en lugar de lanzar.
  // Lo convertimos en throw para que el caller lo capture.
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: NOTIFY_EMAIL,
    subject,
    html,
    text,
    replyTo: d.email || undefined
  });
  if (result && result.error) {
    const e = result.error;
    throw new Error(
      `Resend ${e.name || 'error'}: ${e.message || JSON.stringify(e)}`
    );
  }
  return result && result.data;
}

function section(title, rows) {
  const filled = rows.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!filled.length) return '';
  const tr = filled.map(([k, v]) => `
    <tr>
      <td style="padding:6px 16px 6px 0;color:#c8a96e;font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;vertical-align:top;width:38%;">${escapeHtml(k)}</td>
      <td style="padding:6px 0;color:#f0ede8;font-size:13px;line-height:1.5;vertical-align:top;">${escapeHtml(v)}</td>
    </tr>
  `).join('');
  return `
    <div style="margin-bottom:24px;">
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:15px;font-weight:600;letter-spacing:0.06em;color:#f0ede8;text-transform:uppercase;border-bottom:1px solid rgba(200,169,110,0.18);padding-bottom:6px;margin-bottom:8px;">
        ${escapeHtml(title)}
      </div>
      <table style="width:100%;border-collapse:collapse;">${tr}</table>
    </div>
  `;
}
