// ════════════════════════════════════════════════════════════════
//  POST /api/brief
//  Recibe el formulario, genera project_id MRC-XXX,
//  inserta en Postgres, registra event y notifica:
//    1) Email al admin (notificación de nuevo brief)
//    2) Email al cliente (auto-respuesta de confirmación)
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';
import { logEvent } from '../lib/db.mjs';
import {
  emailAdminNewBrief, emailClientConfirmation, resend,
} from '../lib/email.mjs';
import { clientIp } from '../lib/auth.mjs';

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
  'additional_notes','referred_by','previous_agency',
];

function sanitize(v, max = 5000) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

function sanitizeArray(v, maxItems = 50, maxLen = 120) {
  if (!Array.isArray(v)) return [];
  return v
    .filter(x => x !== null && x !== undefined && x !== '')
    .slice(0, maxItems)
    .map(x => String(x).slice(0, maxLen));
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
      return res.status(200).json({ ok: true, projectId: 'MRC-000' });
    }

    // Validación mínima
    const email = sanitize(body.email, 200);
    const phone = sanitize(body.phone, 50);
    if (!email && !phone) {
      return res.status(400).json({
        ok: false,
        error: 'Necesitamos al menos un email o un teléfono para contactarte.',
      });
    }

    // Sanitizar
    const data = {};
    for (const f of TEXT_FIELDS) data[f] = sanitize(body[f]);
    data.email = email;
    data.phone = phone;

    const pages    = sanitizeArray(body.pages_required);
    const features = sanitizeArray(body.features_required);

    // Generar project_id atómico
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

    // Audit log: brief recibido
    await logEvent({
      projectId,
      type: 'brief_received',
      actorEmail: null,
      data: {
        business_name: data.business_name || null,
        email: data.email || null,
        ip: clientIp(req),
      },
    });

    // Notificaciones email — paralelo, awaitadas, no bloquean al brief si fallan
    let emailAdminOk = false;
    let emailClientOk = false;

    if (resend) {
      const adminP = withTimeout(
        emailAdminNewBrief({ projectId, data, pages, features }),
        8000, 'Resend admin'
      ).then(() => { emailAdminOk = true; })
       .catch(err => console.error(`[brief] ${projectId} admin email falló:`, err && err.message));

      const clientP = data.email
        ? withTimeout(
            emailClientConfirmation({
              projectId,
              clientEmail: data.email,
              ownerName: data.owner_name,
              businessName: data.business_name,
            }),
            8000, 'Resend client'
          ).then(() => { emailClientOk = true; })
           .catch(err => console.error(`[brief] ${projectId} client email falló:`, err && err.message))
        : Promise.resolve();

      await Promise.all([adminP, clientP]);

      console.log(`[brief] ${projectId} insertado · adminEmail=${emailAdminOk} · clientEmail=${emailClientOk}`);
    } else {
      console.warn(`[brief] ${projectId} insertado · RESEND_API_KEY no configurada, sin emails`);
    }

    return res.status(200).json({
      ok: true,
      projectId,
      emailAdmin: emailAdminOk,
      emailClient: emailClientOk,
    });

  } catch (err) {
    console.error('[brief] submission error:', err);
    return res.status(500).json({
      ok: false,
      error: 'Error al procesar el formulario. Por favor intenta de nuevo en un momento.',
    });
  }
}
