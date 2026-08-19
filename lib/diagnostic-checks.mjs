// ════════════════════════════════════════════════════════════════
//  lib/diagnostic-checks.mjs — Motor del Diagnóstico digital (Growth OS)
//  Scoring 100% DETERMINISTA, sin IA. Cada check corre por regex/includes
//  sobre el HTML descargado (cero dependencias, sin parser). 5 categorías
//  con pesos 25/25/20/20/10. Los hallazgos son labels PRECOCINADOS
//  bilingües (nada se redacta en runtime). El único uso de IA es el
//  REPORTE final (api/diagnostic.mjs), que recibe estos hallazgos ya
//  verificados — nunca redacta datos nuevos.
//
//  Doctrina: la IA trabaja PARA el negocio del cliente; sin garantías,
//  sin "#1", estimaciones "orientativas". El score es una señal, no una nota.
// ════════════════════════════════════════════════════════════════

// Pesos por categoría (suman 1).
export const WEIGHTS = { web: 0.25, seo: 0.25, ai: 0.20, conv: 0.20, rep: 0.10 };

// Allowlists (se re-validan en el endpoint).
export const INDUSTRIES = [
  'restaurantes', 'contratistas', 'talleres', 'salon', 'clinica',
  'legal', 'inmobiliaria', 'ecommerce', 'otro',
];
export const REVIEW_BUCKETS = ['0', '1-9', '10-29', '30+', 'ns'];

// Landings de industria (ES/EN). Solo las que EXISTEN como página real.
const INDUSTRY_LANDING = {
  restaurantes: { es: '/es/houston/restaurantes',      en: '/en/houston/restaurants' },
  contratistas: { es: '/es/houston/contratistas',      en: '/en/houston/contractors' },
  talleres:     { es: '/es/houston/talleres-mecanicos', en: '/en/houston/auto-repair' },
  salon:        { es: '/es/houston/salon-belleza',      en: '/en/houston/beauty-salons' },
  clinica:      { es: '/es/houston/clinicas-dentales',  en: '/en/houston/dental-clinics' },
  legal:        { es: '/es/houston/abogados-inmigracion', en: '/en/houston/immigration-lawyers' },
  inmobiliaria: { es: '/es/houston/bienes-raices',      en: '/en/houston/real-estate' },
  ecommerce:    { es: '/es/houston/ecommerce',          en: '/en/houston/ecommerce' },
};

// Ruta por categoría más débil (ES/EN) + etiqueta de servicio bilingüe.
const CATEGORY_SERVICE = {
  web:  { es: '/es/houston/diseno-web',        en: '/en/houston/web-design',      service_es: 'Rediseño / Diseño web',       service_en: 'Website redesign' },
  seo:  { es: '/es/houston/seo-local',         en: '/en/houston/local-seo',       service_es: 'SEO local',                   service_en: 'Local SEO' },
  ai:   { es: '/es/houston/seo-para-ia',       en: '/en/houston/ai-seo',          service_es: 'SEO para IA',                 service_en: 'AI visibility (AEO)' },
  conv: { es: '/es/houston/ia-conversacional', en: '/en/houston/conversational-ai', service_es: 'IA conversacional + landing', service_en: 'Conversational AI + landing' },
  rep:  { es: '/es/houston/seo-local',         en: '/en/houston/local-seo',       service_es: 'SEO local (reseñas)',         service_en: 'Local SEO (reviews)' },
};

// Definición de hallazgos (labels precocinados bilingües + impacto de 1 frase).
// es = texto de la tabla §3 del plan (verbatim); en = espejo localizado.
const FINDINGS = {
  W1: { cat: 'web',
    es: 'No encontramos un sitio activo — hoy tu negocio depende de que te encuentren por otros canales.',
    en: "We couldn't find an active website — your business depends on being found through other channels.",
    impact_es: 'Quien te busca en Google no confirma que existes y llama al competidor que sí aparece.',
    impact_en: "Anyone searching for you on Google can't confirm you exist and calls the competitor who shows up." },
  W2: { cat: 'web',
    es: 'El sitio no está preparado para móvil, donde busca la mayoría.',
    en: 'The site is not ready for mobile, where most people search.',
    impact_es: 'La mayoría entra desde el teléfono; si se ve mal, se van en segundos.',
    impact_en: 'Most visitors arrive on a phone; if it looks broken, they leave in seconds.' },
  W3: { cat: 'web',
    es: 'El título principal no dice claramente qué haces ni dónde.',
    en: "The main title doesn't clearly say what you do or where.",
    impact_es: 'Google y el visitante deciden en 3 segundos; un título vago cuesta clics.',
    impact_en: 'Google and the visitor decide in 3 seconds; a vague title costs clicks.' },
  W4: { cat: 'web',
    es: 'El sitio no usa conexión segura (candado): resta confianza y Google lo penaliza.',
    en: "The site doesn't use a secure connection (padlock): it hurts trust and Google penalizes it.",
    impact_es: 'El navegador marca "no seguro" y el cliente duda antes de dejar sus datos.',
    impact_en: 'The browser flags it "not secure" and the customer hesitates before sharing details.' },
  W5: { cat: 'web',
    es: 'Las imágenes no tienen descripción: pierdes accesibilidad y señal SEO.',
    en: 'Images have no description: you lose accessibility and SEO signal.',
    impact_es: 'Google no entiende tus fotos y quien usa lector de pantalla queda fuera.',
    impact_en: "Google can't read your photos and screen-reader users are left out." },
  S1: { cat: 'seo',
    es: 'No hay un teléfono visible de un vistazo.',
    en: 'There is no phone number visible at a glance.',
    impact_es: 'El cliente listo para llamar no encuentra cómo, y se enfría.',
    impact_en: "A customer ready to call can't find how, and goes cold." },
  S2: { cat: 'seo',
    es: 'El sitio no menciona tu ciudad donde importa: Google no sabe dónde compites.',
    en: "The site doesn't mention your city where it matters: Google doesn't know where you compete.",
    impact_es: 'Sin señal local claras, no apareces en las búsquedas "cerca de mí".',
    impact_en: 'Without clear local signals, you miss the "near me" searches.' },
  S3: { cat: 'seo',
    es: 'Falta la ficha estructurada del negocio (schema): Google y los mapas leen a ciegas.',
    en: 'The structured business data (schema) is missing: Google and maps read blind.',
    impact_es: 'Pierdes la ficha enriquecida y las señales que suben tu posición local.',
    impact_en: 'You lose the rich result and the signals that lift your local ranking.' },
  S4: { cat: 'seo',
    es: 'Todo vive en una sola página: sin páginas por servicio es difícil posicionar.',
    en: 'Everything lives on a single page: without service pages it is hard to rank.',
    impact_es: 'Cada servicio que no tiene su página es una búsqueda que le regalas a otro.',
    impact_en: "Each service without its own page is a search you're handing to someone else." },
  S5: { cat: 'seo',
    es: 'Falta la descripción que Google muestra bajo tu nombre.',
    en: 'The description Google shows under your name is missing.',
    impact_es: 'Google inventa un resumen genérico y bajas el porcentaje de clics.',
    impact_en: 'Google makes up a generic snippet and your click-through rate drops.' },
  A1: { cat: 'ai',
    es: 'Tu información no está estructurada: ChatGPT y Gemini no pueden citarte con confianza.',
    en: "Your information isn't structured: ChatGPT and Gemini can't cite you with confidence.",
    impact_es: 'Cuando alguien pregunta por tu servicio a una IA, recomienda a otro.',
    impact_en: 'When someone asks an AI about your service, it recommends someone else.' },
  A2: { cat: 'ai',
    es: 'No hay respuestas directas a preguntas: la IA prefiere sitios que responden claro.',
    en: 'There are no direct answers to questions: AI prefers sites that answer clearly.',
    impact_es: 'Sin respuestas citables, la IA salta tu sitio y usa al competidor.',
    impact_en: 'Without citable answers, AI skips your site and uses the competitor.' },
  A3: { cat: 'ai',
    es: 'El contenido depende de JavaScript: varios asistentes de IA no lo leen.',
    en: 'The content depends on JavaScript: several AI assistants cannot read it.',
    impact_es: 'Si el texto no está en el HTML, para esos asistentes tu sitio está vacío.',
    impact_en: "If the text isn't in the HTML, to those assistants your site is empty." },
  A4: { cat: 'ai',
    es: 'Falta un resumen directo de qué haces al inicio: es lo primero que citaría una IA.',
    en: 'A direct summary of what you do is missing up top: it is the first thing an AI would cite.',
    impact_es: 'La IA cita el primer párrafo claro; si no lo hay, no te cita.',
    impact_en: "AI cites the first clear paragraph; if there isn't one, it doesn't cite you." },
  C1: { cat: 'conv',
    es: 'No se puede llamar con un toque desde el móvil.',
    en: 'You cannot call with one tap from mobile.',
    impact_es: 'Marcar a mano un número pierde a la mitad de quienes querían llamar.',
    impact_en: 'Dialing a number by hand loses half of the people who wanted to call.' },
  C2: { cat: 'conv',
    es: 'No hay WhatsApp visible — el canal preferido del cliente hispano.',
    en: 'There is no visible WhatsApp — the preferred channel for Hispanic customers.',
    impact_es: 'Muchos prefieren escribir por WhatsApp antes que llamar; sin él, no lo hacen.',
    impact_en: 'Many would rather message on WhatsApp than call; without it, they do neither.' },
  C3: { cat: 'conv',
    es: 'No hay formulario: quien no quiere llamar no tiene cómo escribirte.',
    en: "There is no form: someone who doesn't want to call has no way to write you.",
    impact_es: 'Pierdes al cliente tímido o fuera de horario que sí dejaría su dato.',
    impact_en: "You lose the shy or after-hours customer who would've left their info." },
  C4: { cat: 'conv',
    es: 'El botón de contacto no aparece pronto: en móvil nadie lo encuentra.',
    en: "The contact button doesn't appear early: on mobile nobody finds it.",
    impact_es: 'Si hay que hacer scroll para contactarte, la mayoría no llega.',
    impact_en: 'If contacting you takes scrolling, most people never get there.' },
  R1: { cat: 'rep',
    es: 'Pocas reseñas visibles en Google: la primera impresión la deciden otros.',
    en: 'Few visible Google reviews: others decide your first impression.',
    impact_es: 'Ante dos negocios iguales, el cliente elige al de más reseñas.',
    impact_en: 'Between two equal businesses, the customer picks the one with more reviews.' },
};

// ── Helpers de extracción sobre el string HTML (sin parser) ──────
const stripTags = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Quita el "ruido" no visible (scripts, estilos, SVG inline, noscript) pero CONSERVA
// el markup. Para checks posicionales tipo "CTA temprano": medir sobre bytes crudos
// castigaba a cualquier sitio con CSS/JS/SVG inline grande (falso negativo verificado
// contra marcyanstudio.com, cuyo header con tel: caía fuera del primer 30% del HTML).
const stripNoise = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
  .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

const getTitle = (html) => {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
};
const getMetaDesc = (html) => {
  const m = html.match(/<meta[^>]+name=["']?description["']?[^>]*content=["']([^"']*)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']?description/i);
  return m ? m[1].trim() : '';
};
const firstParagraph = (html) => {
  const m = html.match(/<p[\s>][\s\S]*?<\/p>/i);
  return m ? stripTags(m[0]) : '';
};

// Señales de FORMULARIO más allá de la etiqueta <form>: muchos builders modernos
// renderizan el form con JS o con un widget embebido. Solo la etiqueta <form>
// producía el falso "no tiene formulario" (verificado contra movejunkaway.com).
// Los dominios de vendors se exigen DENTRO de un atributo de CARGA (src/action/
// data-url = el widget está embebido de verdad): la mera mención en texto o en un
// enlace legal (p.ej. legal.hubspot.com en el aviso de privacidad) NO es un
// formulario. Por href solo cuentan enlaces DIRECTOS a un form/agenda alojado
// (forms.gle, form.jotform, typeform /to/, tally /r/, calendly…): ahí el enlace
// mismo es el canal escrito del visitante.
const FORM_EMBED_SRC_RE = /(?:src|action|data-url)\s*=\s*["'][^"']*(typeform\.com|jotform|hsforms|hubspot|formspree|tally\.so|getform\.io|usebasin|forms\.gle|docs\.google\.com\/forms|calendly\.com|acuityscheduling|leadconnectorhq|gohighlevel|wufoo|cognitoforms)/i;
const FORM_LINK_RE = /href\s*=\s*["'][^"']*(forms\.gle|docs\.google\.com\/forms|form\.jotform|typeform\.com\/to\/|tally\.so\/r\/|calendly\.com\/|acuityscheduling\.com)/i;
const hasFormSignal = (html) =>
  /<form[\s>]/i.test(html) ||
  /<input[^>]+type=["']?(email|tel)\b/i.test(html) ||
  /data-netlify\b/i.test(html) ||
  FORM_EMBED_SRC_RE.test(html) ||
  FORM_LINK_RE.test(html);

// status: 'pass' | 'partial' | 'fail'. points: pass=1, partial=.5, fail=0.
const PTS = { pass: 1, partial: 0.5, fail: 0 };

/**
 * Corre los checks deterministas sobre el sitio.
 * @param {{ html:string, https:boolean, hasSite:boolean, city?:string, reviewsBucket?:string }} ctx
 * @returns {{ scores:{web:number,seo:number,ai:number,conv:number,rep:number,total:number}, findings:Array, checks:Object }}
 */
export function analyzeSite({ html = '', https = false, hasSite = false, city = '', reviewsBucket = 'ns' } = {}) {
  const checks = {}; // id -> 'pass'|'partial'|'fail'

  if (!hasSite) {
    // Sin sitio activo: Web se marca "sin sitio" (score 0, hallazgo propio W1).
    // Las demás categorías se evalúan con lo que el usuario declaró (reseñas)
    // o se dejan neutrales; no inventamos señales de un sitio inexistente.
    checks.W1 = 'fail';
    const rep = repFromBucket(reviewsBucket, checks);
    const scores = { web: 0, seo: 0, ai: 0, conv: 0, rep };
    scores.total = weightedTotal(scores);
    return { scores, findings: collectFindings(checks, scores), checks };
  }

  const text = stripTags(html);
  const textLen = text.length;
  const htmlLen = Math.max(html.length, 1);

  // ── WEB / UX ──────────────────────────────────────────────────
  checks.W1 = 'pass'; // hay sitio
  checks.W2 = /<meta[^>]+name=["']?viewport/i.test(html) ? 'pass' : 'fail';
  const title = getTitle(html);
  const hasH1 = /<h1[\s>]/i.test(html);
  const titleOk = title.length >= 10 && title.length <= 70;
  checks.W3 = (titleOk && hasH1) ? 'pass' : (titleOk || hasH1) ? 'partial' : 'fail';
  checks.W4 = https ? 'pass' : 'fail';
  const imgs = (html.match(/<img\b[^>]*>/gi) || []);
  if (imgs.length === 0) checks.W5 = 'pass'; // no hay imágenes que penalizar
  else {
    const withAlt = imgs.filter(t => /\balt\s*=\s*["'][^"']*["']/i.test(t)).length;
    const ratio = withAlt / imgs.length;
    checks.W5 = ratio >= 0.7 ? 'pass' : ratio >= 0.4 ? 'partial' : 'fail';
  }

  // ── SEO LOCAL ─────────────────────────────────────────────────
  const phoneRe = /tel:|(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/;
  checks.S1 = phoneRe.test(html) ? 'pass' : 'fail';
  const cityL = String(city || '').trim().toLowerCase();
  const haystack = (title + ' ' + text.slice(0, 2000)).toLowerCase();
  checks.S2 = cityL && cityL.length >= 3
    ? (haystack.includes(cityL) ? 'pass' : 'fail')
    : 'partial'; // sin ciudad declarada, no penalizamos de más
  const hasJsonLd = /application\/ld\+json/i.test(html);
  // @type de negocio: lista ampliada (schema.org tiene decenas de subtipos de
  // LocalBusiness: MovingCompany, AutoRepair, RoofingContractor…) + heurística
  // semántica: un JSON-LD con "telephone" y "address" ES una ficha de negocio
  // aunque el subtipo no esté en la lista. (Falso "partial" verificado contra
  // movejunkaway.com y texasrushremove.com, que sí tienen ficha completa.)
  // Ambos tests corren SOLO sobre el contenido de los bloques ld+json: un config
  // de JS inline con esas claves (p.ej. wp_localize_script) no es schema.
  const ldBlocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n');
  const hasLocalBiz = hasJsonLd && (
    /"@type"\s*:\s*["']?\w*(LocalBusiness|Organization|ProfessionalService|Restaurant|Store|Dentist|Attorney|Business|Company|Service|Contractor|Salon|Agent|Plumber|Electrician|Locksmith|RoofingContractor|AutoRepair|Physician|Clinic)/i.test(ldBlocks) ||
    (/"telephone"\s*:/i.test(ldBlocks) && /"address"\s*:/i.test(ldBlocks))
  );
  checks.S3 = hasLocalBiz ? 'pass' : hasJsonLd ? 'partial' : 'fail';
  const internal = countInternalLinks(html);
  checks.S4 = internal >= 3 ? 'pass' : internal >= 1 ? 'partial' : 'fail';
  const desc = getMetaDesc(html);
  checks.S5 = (desc.length >= 50 && desc.length <= 170) ? 'pass' : desc.length > 0 ? 'partial' : 'fail';

  // ── IA-READY ──────────────────────────────────────────────────
  checks.A1 = hasJsonLd ? 'pass' : 'fail';
  const headings = (html.match(/<h[23][\s>][\s\S]*?<\/h[23]>/gi) || []).map(stripTags).join(' ');
  const hasFaq = /faqpage/i.test(html) || /\?/.test(headings);
  checks.A2 = hasFaq ? 'pass' : 'fail';
  const ratioTxt = textLen / htmlLen;
  checks.A3 = (ratioTxt > 0.10 && textLen > 1500) ? 'pass'
    : (ratioTxt > 0.10 || textLen > 1500) ? 'partial' : 'fail';
  // Resumen inicial: los builders modernos maquetan con <div>, no siempre con <p>,
  // y el PRIMER <p> puede ser un banner de cookies. Miramos los primeros 3 párrafos;
  // si no hay <p> útiles pero el sitio tiene meta description y texto real, es
  // 'partial' (sin hallazgo): no afirmamos "falta un resumen" sin estar seguros.
  const paragraphs = (html.match(/<p[\s>][\s\S]*?<\/p>/gi) || []).slice(0, 3).map(stripTags);
  checks.A4 = paragraphs.some((p) => p.length > 120) ? 'pass'
    : (desc.length >= 50 && textLen > 1500) ? 'partial' : 'fail';

  // ── CONVERSIÓN ────────────────────────────────────────────────
  checks.C1 = /href=["']tel:/i.test(html) ? 'pass' : 'fail';
  checks.C2 = /(wa\.me|api\.whatsapp\.com)/i.test(html) ? 'pass' : 'fail';
  // Formulario: etiqueta <form>, inputs de contacto o widget embebido conocido.
  // Con mailto: visible es 'partial' (SÍ hay cómo escribirle, aunque sin form):
  // el hallazgo "no tiene formulario" solo se afirma cuando no hay NINGÚN canal
  // escrito en la página. El formulario en /contacto lo cubre el follow-up del
  // endpoint (mergeContactSignals) — esta función solo ve UNA página.
  checks.C3 = hasFormSignal(html) ? 'pass' : /mailto:/i.test(html) ? 'partial' : 'fail';
  // Un enlace temprano a la sección/página de contacto o cotización TAMBIÉN es un
  // CTA (header con "Contacto"/"Pedir propuesta" → #contacto): el regex anterior
  // solo aceptaba tel:/wa/form y fallaba contra sitios con CTA real en el nav.
  const early = stripNoise(html);
  const earlySlice = early.slice(0, Math.max(2000, Math.floor(early.length * 0.4)));
  const ctaEarly = /(href=["']tel:|wa\.me|api\.whatsapp\.com|<form[\s>]|mailto:|calendly|acuityscheduling|book(ing)?|href=["'][^"']*(#conta|contact|contacto|cotiza|quote|estimate|presupuesto))/i.test(earlySlice);
  checks.C4 = ctaEarly ? 'pass' : 'fail';

  // ── REPUTACIÓN ────────────────────────────────────────────────
  const rep = repFromBucket(reviewsBucket, checks);

  const scores = {
    web:  catScore(['W1', 'W2', 'W3', 'W4', 'W5'], checks),
    seo:  catScore(['S1', 'S2', 'S3', 'S4', 'S5'], checks),
    ai:   catScore(['A1', 'A2', 'A3', 'A4'], checks),
    conv: catScore(['C1', 'C2', 'C3', 'C4'], checks),
    rep,
  };
  scores.total = weightedTotal(scores);
  return { scores, findings: collectFindings(checks, scores), checks };
}

function repFromBucket(bucket, checks) {
  // 'ns' (no lo sé / no declarado) es 'partial': NO sabemos cuántas reseñas tiene,
  // así que no afirmamos "pocas reseñas visibles" (sería un hallazgo inventado) ni
  // dejamos que un 0 sin evidencia arrastre la recomendación hacia reseñas. El
  // chat de Marcy nunca pregunta reseñas → siempre pasa 'ns' → este caso importa.
  checks.R1 = bucket === '30+' ? 'pass'
    : (bucket === '10-29' || bucket === 'ns') ? 'partial'
    : 'fail'; // '0' y '1-9': lo declaró el dueño → hallazgo honesto
  return PTS[checks.R1] * 100;
}

// ── Follow-up de la página de CONTACTO (anti falso negativo) ─────
// Muchos sitios tienen el formulario en /contacto, no en la home. Analizar solo
// la home producía "no tiene formulario" contra sitios que SÍ lo tienen
// (verificado contra movejunkaway.com). El endpoint hace UN fetch extra a la
// página de contacto (mismo ssrfGuard) y fusiona las señales de conversión.

// Devuelve el href de la página de contacto/cotización del MISMO sitio, o null.
// Endurecido tras revisión adversarial: (1) solo mira ANCHORS <a href> — un regex
// sobre todos los href devolvía primero assets del <head> tipo /_astro/contacto.css
// y quemaba el único fetch de follow-up; (2) excluye paths con extensión de asset;
// (3) acepta absolutos del MISMO host (WordPress emite menús con URLs absolutas;
// pásale baseHost, p.ej. el hostname de finalUrl) normalizando el prefijo www.;
// (4) prioriza el match exacto /contact(o) sobre substrings, y "book" va anclado
// a segmento para que /ebook-gratis no gane.
const ASSET_EXT_RE = /\.(css|js|mjs|json|woff2?|ttf|png|jpe?g|webp|avif|gif|svg|ico|pdf|xml|txt|map)$/i;
const CONTACT_EXACT_RE = /(^|\/)(contact|contacto|contact-us|contactanos|contactenos)\/?$/i;
const CONTACT_LOOSE_RE = /(contact|contacto|cotiza|cotizacion|quote|estimate|presupuesto|get-in-touch|agenda|schedule)/i;
const CONTACT_BOOK_RE = /(^|\/)book(ing)?s?(-online|-now)?\/?$/i;
export function findContactHref(html, baseHost = '') {
  const anchors = [...html.matchAll(/<a\b[^>]*?href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1].trim());
  const norm = (h) => String(h || '').toLowerCase().replace(/^www\./, '');
  const base = norm(baseHost);
  let loose = null;
  for (const h of anchors) {
    if (!h || h.startsWith('#') || /^(mailto:|tel:|javascript:|data:)/i.test(h)) continue;
    let path = h;
    if (/^https?:\/\//i.test(h) || h.startsWith('//')) {
      // Absoluto: solo si es del MISMO host (si no conocemos baseHost, se descarta).
      try {
        const u = new URL(h.startsWith('//') ? 'https:' + h : h);
        if (!base || norm(u.hostname) !== base) continue;
        path = u.pathname;
      } catch { continue; }
    }
    path = path.split(/[?#]/)[0];
    if (ASSET_EXT_RE.test(path)) continue;
    if (CONTACT_EXACT_RE.test(path)) return h;                      // mejor candidato: gana ya
    if (!loose && (CONTACT_LOOSE_RE.test(path) || CONTACT_BOOK_RE.test(path))) loose = h;
  }
  return loose;
}

// Fusiona las señales de la página de contacto sobre un resultado de analyzeSite:
// solo puede MEJORAR (fail/partial → pass) los checks de canales de contacto
// (C1 tel, C2 WhatsApp, C3 formulario, S1 teléfono). Recalcula scores y hallazgos.
// Pura y testeable; el fetch lo hace el caller con su propio presupuesto.
export function mergeContactSignals(result, contactHtml) {
  if (!result || !result.checks || typeof contactHtml !== 'string' || !contactHtml) return result;
  const checks = { ...result.checks };
  const upgrade = (id, ok) => {
    if (ok && checks[id] !== 'pass') checks[id] = 'pass';
  };
  upgrade('C1', /href=["']tel:/i.test(contactHtml));
  upgrade('C2', /(wa\.me|api\.whatsapp\.com)/i.test(contactHtml));
  upgrade('C3', hasFormSignal(contactHtml));
  upgrade('S1', /tel:|(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/.test(contactHtml));
  const scores = {
    web:  catScore(['W1', 'W2', 'W3', 'W4', 'W5'], checks),
    seo:  catScore(['S1', 'S2', 'S3', 'S4', 'S5'], checks),
    ai:   catScore(['A1', 'A2', 'A3', 'A4'], checks),
    conv: catScore(['C1', 'C2', 'C3', 'C4'], checks),
    rep:  PTS[checks.R1] * 100,
  };
  scores.total = weightedTotal(scores);
  return { scores, findings: collectFindings(checks, scores), checks };
}

function catScore(ids, checks) {
  const got = ids.reduce((s, id) => s + (PTS[checks[id]] ?? 0), 0);
  return Math.round((got / ids.length) * 100);
}

function weightedTotal(s) {
  return Math.round(
    s.web * WEIGHTS.web + s.seo * WEIGHTS.seo + s.ai * WEIGHTS.ai +
    s.conv * WEIGHTS.conv + s.rep * WEIGHTS.rep
  );
}

function countInternalLinks(html) {
  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
  const set = new Set();
  for (const h of hrefs) {
    const v = h.trim();
    if (!v || v.startsWith('#') || /^(mailto:|tel:|javascript:|data:)/i.test(v)) continue;
    if (/^https?:\/\//i.test(v) || v.startsWith('//')) continue; // externo (heurística conservadora)
    const path = v.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
    if (path !== '/') set.add(path);
  }
  return set.size;
}

// Orden de hallazgos: primero las categorías con score MÁS BAJO (mayor impacto),
// luego por orden de check dentro de la categoría.
function collectFindings(checks, scores) {
  const catOrder = ['web', 'seo', 'ai', 'conv', 'rep']
    .sort((a, b) => scores[a] - scores[b]);
  const out = [];
  for (const cat of catOrder) {
    for (const id of Object.keys(FINDINGS)) {
      if (FINDINGS[id].cat !== cat) continue;
      if (checks[id] === 'fail') {
        const f = FINDINGS[id];
        out.push({ id, cat, es: f.es, en: f.en, impact_es: f.impact_es, impact_en: f.impact_en });
      }
    }
  }
  return out;
}

/**
 * Servicio recomendado (determinista, NO lo decide un modelo).
 * Categoría más baja → ruta; empate resuelto por prioridad conv>web>seo>ai>rep.
 * Override de industria: si la debilidad es Web y la industria tiene landing
 * dedicada, se recomienda esa landing vertical.
 */
export function recommendService({ scores, industry } = {}) {
  const order = ['conv', 'web', 'seo', 'ai', 'rep']; // prioridad de desempate
  let key = order[0];
  let min = Infinity;
  for (const k of order) {
    const v = scores?.[k] ?? 0;
    if (v < min) { min = v; key = k; }
  }
  const base = CATEGORY_SERVICE[key];
  const landing = INDUSTRY_LANDING[industry];
  if (key === 'web' && landing) {
    return { key, es: landing.es, en: landing.en, service_es: base.service_es, service_en: base.service_en };
  }
  return { key, es: base.es, en: base.en, service_es: base.service_es, service_en: base.service_en };
}

// Resumen en texto plano para el `message` del lead (lo ve el fundador en el panel).
export function plainSummary({ refId, scores, findings, recommended, businessName, city, industry, lang = 'es' }) {
  const L = lang === 'en';
  const head = L
    ? `Free digital checkup ${refId}`
    : `Diagnóstico digital ${refId}`;
  const meta = [businessName, city, industry].filter(Boolean).join(' · ');
  const scoreLine = L
    ? `Score ${scores.total}/100 — web ${scores.web} · SEO ${scores.seo} · AI ${scores.ai} · conv ${scores.conv} · reviews ${scores.rep}`
    : `Puntaje ${scores.total}/100 — web ${scores.web} · SEO ${scores.seo} · IA ${scores.ai} · conv ${scores.conv} · reseñas ${scores.rep}`;
  const recLine = L
    ? `Suggested path: ${recommended.service_en} (${recommended.en})`
    : `Ruta sugerida: ${recommended.service_es} (${recommended.es})`;
  const findTitle = L ? 'Signals detected:' : 'Señales detectadas:';
  const top = findings.slice(0, 6).map(f => `- ${L ? f.en : f.es}`).join('\n');
  return [head, meta, scoreLine, recLine, '', findTitle, top].filter(v => v !== undefined).join('\n');
}

// Reporte determinista (fallback sin IA). El email SIEMPRE sale.
export function fallbackReport({ businessName, lang = 'es', findings, recommended }) {
  const L = lang === 'en';
  const name = businessName || (L ? 'your business' : 'tu negocio');
  const intro = L
    ? `Hi ${name}, here is your free digital checkup. These are verifiable signals about your online presence — a map to prioritize, not a grade.`
    : `Hola ${name}, aquí está tu diagnóstico digital gratis. Son señales verificables sobre tu presencia online, un mapa para priorizar, no una calificación.`;
  const priTitle = L ? 'Priorities' : 'Prioridades';
  const items = findings.slice(0, 3).map((f, i) => {
    const what = L ? f.en : f.es;
    const cost = L ? f.impact_en : f.impact_es;
    return `${i + 1}. ${what}\n   ${cost}`;
  }).join('\n\n');
  const next = L
    ? `Next step: we can turn this into a free proposal within 24h, focused on ${recommended.service_en}. No obligation.`
    : `Siguiente paso: podemos convertir esto en una propuesta gratis en 24h, centrada en ${recommended.service_es}. Sin compromiso.`;
  const closing = L
    ? 'This checkup is directional: it helps you prioritize — it does not guarantee rankings or specific results.'
    : 'Este diagnóstico es orientativo: sirve para priorizar, no garantiza posiciones ni resultados específicos.';
  return [intro, '', `${priTitle}:`, items, '', next, '', closing].join('\n');
}
