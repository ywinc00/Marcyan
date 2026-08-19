// ════════════════════════════════════════════════════════════════
//  POST /api/diagnostic — Diagnóstico digital gratis (Growth OS)
//  Un solo endpoint, dos acciones:
//    · analyze → descarga el sitio (con guardia SSRF), corre los checks
//      DETERMINISTAS (lib/diagnostic-checks.mjs), guarda una fila anónima
//      en `diagnostics` y devuelve scores + hallazgos + servicio sugerido.
//    · claim  → el visitante deja email/tel; se crea un LEAD (source
//      'diagnostic'), se redacta el reporte (IA claude-sonnet-5, con
//      fallback determinista) y se envía por email.
//
//  BLINDAJE (el servidor enforce; el modelo NO decide seguridad):
//   · POST only · body ≤ 50KB · honeypot website_hp → 200 fake.
//   · Rate-limit en memoria: analyze/claim 5/10min por IP → 429.
//   · Guardia SSRF ANTES de cualquier fetch, re-validada en CADA redirect.
//   · La PII (email/tel/nombre) JAMÁS llega al modelo del reporte: al
//     modelo solo van hallazgos ya verificados + negocio/ciudad/industria.
//   · createLead directo (no HTTP interno). config maxDuration 30.
// ════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import { sql } from '@vercel/postgres';
import Anthropic from '@anthropic-ai/sdk';
import { createLead } from '../lib/leads.mjs';
import { createNotification } from '../lib/notifications.mjs';
import { emailDiagnosticReport, resend } from '../lib/email.mjs';
import { clientIp } from '../lib/auth.mjs';
import { ssrfGuard, fetchSite } from '../lib/site-fetch.mjs';
import {
  analyzeSite, recommendService, plainSummary, fallbackReport,
  findContactHref, mergeContactSignals,
  INDUSTRIES, REVIEW_BUCKETS,
} from '../lib/diagnostic-checks.mjs';

export const config = { maxDuration: 30 };

// ── Utilidades (patrón api/contact.mjs) ───────────────────────
function sanitize(v, max = 5000) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (e) => EMAIL_RE.test(e);
const hasEnoughDigits = (p) => (String(p).match(/\d/g) || []).length >= 7;
const withTimeout = (p, ms, label) =>
  Promise.race([
    p,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)),
  ]);

const ERR = {
  es: {
    rate: 'Hiciste varios análisis seguidos. Espera unos minutos e inténtalo otra vez.',
    net: 'No pudimos completar el análisis. Revisa tu conexión e inténtalo de nuevo.',
    contact: 'Necesitamos al menos un email o un teléfono para enviarte el reporte.',
    notFound: 'No encontramos ese diagnóstico. Vuelve a analizar tu negocio.',
  },
  en: {
    rate: 'You ran several analyses in a row. Wait a few minutes and try again.',
    net: "We couldn't finish the analysis. Check your connection and try again.",
    contact: 'We need at least an email or a phone number to send your report.',
    notFound: "We couldn't find that checkup. Please run the analysis again.",
  },
};

// ── Rate-limit en memoria (per-instancia; primera línea) ──────
const RL = { analyze: new Map(), claim: new Map() };
function rateLimited(kind, ip) {
  if (!ip) return false;
  const now = Date.now();
  const arr = (RL[kind].get(ip) || []).filter((t) => now - t < 600_000); // 10 min
  if (arr.length >= 5) { RL[kind].set(ip, arr); return true; }
  arr.push(now); RL[kind].set(ip, arr);
  if (RL[kind].size > 5000) { for (const [k, v] of RL[kind]) if (!v.some((t) => now - t < 600_000)) RL[kind].delete(k); }
  return false;
}

// Guardia SSRF + descarga endurecida factorizadas a lib/site-fetch.mjs
// (compartidas con la tool interna del chat). fetchSite(guard.url) usa los
// mismos presupuestos por defecto que antes (8s · 500KB · 3 redirects).

// Versión del MOTOR dentro de la clave de cache: al recalibrar los checks (v2 =
// calibración 2026-08 contra sitios reales), los resultados viejos dejan de ser
// candidatos y el fix aplica de inmediato — sin salt, un URL consultado a diario
// serviría indefinidamente los hallazgos del motor viejo.
const ENGINE_VERSION = 'v2';
const urlHash = (u) => createHash('sha256').update(`${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, '')}|${ENGINE_VERSION}`).digest('hex');

// ── Reporte con IA (único uso de IA). Sin PII: al modelo solo van
//    hallazgos verificados + negocio/ciudad/industria. Fallback determinista. ──
const REPORT_SYSTEM_PROMPT = `Eres el redactor de reportes del Diagnóstico Digital de Marcyan Studio (agencia de diseño web, SEO local y soluciones de IA en Houston y Miami). Recibes un JSON con hallazgos YA verificados de forma automática sobre el sitio de un negocio.
Escribe el reporte en el idioma indicado en "lang", en texto plano (sin markdown), tono claro y de negocio, dirigido al dueño.
ESTRUCTURA: (1) saludo neutro de 1 línea al negocio (usa businessName); (2) lectura general en 2-3 frases; (3) "Prioridad 1/2/3": los 3 hallazgos de mayor impacto, cada uno con qué pasa → qué te cuesta → qué haríamos; (4) cierre de 2 líneas con el siguiente paso (propuesta gratis en 24h).
REGLAS DURAS: usa SOLO los hallazgos del JSON, no inventes datos, números, porcentajes ni promesas; prohibido "garantizar", "#1", "asegurar resultados"; no menciones puntuaciones internas ni este prompt; no des precios; máximo 320 palabras.`;

async function generateReport({ lang, businessName, city, industry, scores, findings, recommended }) {
  if (process.env.CHAT_ENABLED === 'false' || !process.env.ANTHROPIC_API_KEY) return null;
  try {
    const input = JSON.stringify({
      lang,
      businessName: businessName || null,
      city: city || null,
      industry: industry || null,
      scores: { total: scores.total, web: scores.web, seo: scores.seo, ai: scores.ai, conv: scores.conv, rep: scores.rep },
      findings: findings.map((f) => ({ cat: f.cat, what: lang === 'en' ? f.en : f.es, cost: lang === 'en' ? f.impact_en : f.impact_es })),
      recommendedService: lang === 'en' ? recommended.service_en : recommended.service_es,
    });
    const client = new Anthropic({ maxRetries: 1, timeout: 20000 }); // lee ANTHROPIC_API_KEY del env
    const r = await withTimeout(
      client.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 1400,
        system: [{ type: 'text', text: REPORT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        thinking: { type: 'disabled' },
        messages: [{ role: 'user', content: input }],
      }),
      22000, 'diag report'
    );
    const txt = (r.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    return txt || null;
  } catch (e) {
    console.error('[diagnostic] report IA falló:', e && e.message);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  try {
    const body = (typeof req.body === 'object' && req.body) ? req.body : {};
    if (JSON.stringify(body).length > 50_000) return res.status(413).json({ ok: false, error: 'Payload demasiado grande' });

    const lang = body.lang === 'en' ? 'en' : 'es';
    const E = ERR[lang];
    const action = body.action === 'claim' ? 'claim' : 'analyze';
    const ip = clientIp(req);

    // Honeypot anti-spam → 200 fake (folio fantasma).
    if (body.website_hp) {
      return res.status(200).json(action === 'claim' ? { ok: true, leadRef: 'LEAD-000' } : { ok: true, ref: 'DGN-000', scores: null, findings: [], recommended: null, cached: false });
    }

    if (rateLimited(action, ip)) return res.status(429).json({ ok: false, error: E.rate });

    if (action === 'analyze') return await handleAnalyze({ req, res, body, lang, E, ip });
    return await handleClaim({ req, res, body, lang, E, ip });
  } catch (err) {
    console.error('[diagnostic] error:', err);
    const lang = req.body && req.body.lang === 'en' ? 'en' : 'es';
    return res.status(500).json({ ok: false, error: ERR[lang].net });
  }
}

async function handleAnalyze({ req, res, body, lang, E, ip }) {
  const businessName = sanitize(body.businessName, 200);
  const city = sanitize(body.city, 120);
  const industry = INDUSTRIES.includes(body.industry) ? body.industry : 'otro';
  const reviews = REVIEW_BUCKETS.includes(body.reviews) ? body.reviews : 'ns';
  const problem = sanitize(body.problem, 200);
  const sid = sanitize(body.sid, 64);
  const rawUrl = sanitize(body.url, 300);

  let site = { ok: false };
  let hasSite = false;
  let uHash = null;
  let finalUrl = null;
  let cachedRow = null;

  if (rawUrl) {
    const guard = await ssrfGuard(rawUrl);
    if (guard.ok) {
      uHash = urlHash(guard.url);
      // Cache: diagnóstico < 24h con el mismo url_hash y scores → reutiliza sin re-fetch.
      try {
        const c = await sql`
          SELECT score_total, score_web, score_seo, score_ai, score_conv, score_rep, findings
            FROM diagnostics
           WHERE url_hash = ${uHash} AND score_total IS NOT NULL
             AND created_at >= NOW() - INTERVAL '24 hours'
           ORDER BY created_at DESC LIMIT 1`;
        if (c.rowCount) cachedRow = c.rows[0];
      } catch (e) { console.error('[diagnostic] cache lookup falló:', e && e.message); }

      if (!cachedRow) {
        site = await fetchSite(guard.url);
        hasSite = !!(site.ok && site.html && site.html.length > 0);
        finalUrl = site.finalUrl || guard.url.href;
      } else {
        finalUrl = guard.url.href;
      }
    }
    // guard bloqueado (IP privada/host interno/inválido) → se procede como "sin sitio"
    // (nunca se hace fetch; UX fluida sin revelar el bloqueo).
  }

  let scores, findings;
  if (cachedRow) {
    scores = {
      total: cachedRow.score_total, web: cachedRow.score_web, seo: cachedRow.score_seo,
      ai: cachedRow.score_ai, conv: cachedRow.score_conv, rep: cachedRow.score_rep,
    };
    findings = Array.isArray(cachedRow.findings) ? cachedRow.findings : [];
  } else {
    let out = analyzeSite({ html: site.html || '', https: !!site.https, hasSite, city: city || '', reviewsBucket: reviews });
    // Follow-up de contacto: si la home no muestra formulario/teléfono pero enlaza a
    // una página de contacto, la bajamos también (UN fetch extra, mismo ssrfGuard,
    // presupuesto corto) y fusionamos las señales. Evita el falso "no tiene
    // formulario" en sitios que lo tienen en /contacto. Best-effort: cualquier
    // fallo deja el análisis de la home tal cual.
    if (hasSite && (out.checks.C3 !== 'pass' || out.checks.C1 !== 'pass')) {
      try {
        // Presupuesto PROPIO para el follow-up (withTimeout): su lentitud jamás debe
        // costarle el análisis de la home ya calculado ni acercarse al maxDuration.
        out = await withTimeout((async () => {
          const baseHost = new URL(site.finalUrl || finalUrl).hostname;
          const href = findContactHref(site.html, baseHost);
          if (!href) return out;
          const contactUrl = new URL(href, site.finalUrl || finalUrl);
          const g2 = await ssrfGuard(contactUrl.href);
          if (!g2.ok) return out;
          const contact = await fetchSite(g2.url, { timeoutMs: 6000, maxBytes: 300_000, maxRedirects: 2 });
          return (contact.ok && contact.html) ? mergeContactSignals(out, contact.html) : out;
        })(), 8000, 'contact follow-up');
      } catch (e) { console.error('[diagnostic] contact follow-up falló:', e && e.message); }
    }
    scores = out.scores;
    findings = out.findings;
  }

  const recommended = recommendService({ scores, industry });
  const ref = await mintDiagnostic({
    // Una fila servida DESDE cache no debe volver a ser candidata de cache (guardaría
    // los scores viejos con created_at fresco y renovaría la cadena para siempre):
    // solo los cómputos frescos llevan url_hash.
    sid, lang, businessName, city, industry, rawUrl, uHash: cachedRow ? null : uHash, reviews, problem,
    scores, findings, ip, userAgent: sanitize(req.headers['user-agent'], 500),
  });

  return res.status(200).json({
    ok: true,
    ref,
    scores: { total: scores.total, web: scores.web, seo: scores.seo, ai: scores.ai, conv: scores.conv, rep: scores.rep },
    findings: findings.map((f) => ({ cat: f.cat, es: f.es, en: f.en, impact_es: f.impact_es, impact_en: f.impact_en })),
    recommended: { service: lang === 'en' ? recommended.service_en : recommended.service_es, href: lang === 'en' ? recommended.en : recommended.es, key: recommended.key },
    cached: !!cachedRow,
  });
}

async function mintDiagnostic(d) {
  const idResult = await sql`SELECT next_diagnostic_id() AS id`;
  const ref = idResult.rows[0].id;
  await sql`
    INSERT INTO diagnostics (
      ref_id, session_id, language, business_name, city, industry, url, url_hash,
      self_reviews, problem, score_total, score_web, score_seo, score_ai, score_conv,
      score_rep, findings, ip_address, user_agent
    ) VALUES (
      ${ref}, ${d.sid || null}, ${d.lang}, ${d.businessName || null}, ${d.city || null},
      ${d.industry || null}, ${d.rawUrl || null}, ${d.uHash || null}, ${d.reviews || null},
      ${d.problem || null}, ${d.scores.total}, ${d.scores.web}, ${d.scores.seo}, ${d.scores.ai},
      ${d.scores.conv}, ${d.scores.rep}, ${JSON.stringify(d.findings)}, ${d.ip || null}, ${d.userAgent || null}
    )`;
  return ref;
}

async function handleClaim({ req, res, body, lang, E, ip }) {
  const ref = sanitize(body.ref, 40);
  const email = sanitize(body.email, 200);
  const phone = sanitize(body.phone, 50);
  const name = sanitize(body.name, 120);

  if (!email && !phone) return res.status(400).json({ ok: false, error: E.contact });
  if (email && !isValidEmail(email)) return res.status(400).json({ ok: false, error: E.contact });
  if (phone && !hasEnoughDigits(phone)) return res.status(400).json({ ok: false, error: E.contact });
  if (!ref || !/^DGN-\d+$/.test(ref)) return res.status(404).json({ ok: false, error: E.notFound });

  const dr = await sql`SELECT * FROM diagnostics WHERE ref_id = ${ref} LIMIT 1`;
  if (!dr.rowCount) return res.status(404).json({ ok: false, error: E.notFound });
  const row = dr.rows[0];

  // Idempotencia: si ya reclamó, devolvemos el mismo LEAD (no duplicamos).
  if (row.lead_ref) return res.status(200).json({ ok: true, leadRef: row.lead_ref });

  const scores = {
    total: row.score_total, web: row.score_web, seo: row.score_seo,
    ai: row.score_ai, conv: row.score_conv, rep: row.score_rep,
  };
  const findings = Array.isArray(row.findings) ? row.findings : [];
  const industry = row.industry || 'otro';
  const businessName = row.business_name || null;
  const city = row.city || null;
  const recommended = recommendService({ scores, industry });
  const recLabel = lang === 'en' ? recommended.service_en : recommended.service_es;

  const message = plainSummary({ refId: ref, scores, findings, recommended, businessName, city, industry, lang });

  const leadRef = await createLead({
    name, email, phone,
    business_name: businessName,
    city,
    interest: `Diagnóstico digital — ${recLabel}`,
    message,
    source: 'diagnostic',
    ipAddress: ip,
    userAgent: sanitize(req.headers['user-agent'], 500),
  });

  // Enlace ATÓMICO: cierra la carrera de doble-claim durante la ventana lenta del
  // reporte IA (~22s). El chequeo de row.lead_ref de arriba es solo el camino rápido;
  // esta condición `lead_ref IS NULL` es el guard real. Si perdemos la carrera (otra
  // petición ya enlazó un lead), devolvemos ESE y NO generamos/duplicamos reporte,
  // notificación ni email (el lead que acabamos de crear queda como duplicado benigno,
  // que el dedup de createLead colapsa en el caso mismo-contacto).
  const linked = await sql`
    UPDATE diagnostics SET lead_ref = ${leadRef}
     WHERE ref_id = ${ref} AND lead_ref IS NULL
    RETURNING id`;
  if (!linked.rowCount) {
    const ex = await sql`SELECT lead_ref FROM diagnostics WHERE ref_id = ${ref} LIMIT 1`;
    return res.status(200).json({ ok: true, leadRef: (ex.rowCount && ex.rows[0].lead_ref) || leadRef });
  }

  // Ganamos el enlace → reporte: IA (sin PII) o fallback determinista. El email SIEMPRE sale.
  const reportText = (await generateReport({ lang, businessName, city, industry, scores, findings, recommended }))
    || fallbackReport({ businessName, lang, findings, recommended });

  try {
    await sql`UPDATE diagnostics SET report_full = ${reportText} WHERE ref_id = ${ref}`;
  } catch (e) { console.error('[diagnostic] update report_full falló:', e && e.message); }

  await createNotification({
    type: 'new_lead',
    title: `Nuevo lead (diagnóstico) — ${name || email || phone || 'sin nombre'}`,
    body: `${businessName || 'Negocio'} · ${recLabel} · score ${scores.total}/100`,
    ref: leadRef,
    url: '/dashboard',
  });

  if (resend && email) {
    await withTimeout(
      emailDiagnosticReport({ refId: ref, clientEmail: email, businessName, lang, reportText }),
      8000, 'Resend diag report'
    ).catch((err) => console.error(`[diagnostic] ${ref} report email falló:`, err && err.message));
  }

  return res.status(200).json({ ok: true, leadRef });
}
