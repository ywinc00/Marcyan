// ════════════════════════════════════════════════════════════════
//  lib/brief-schema.mjs — FUENTE ÚNICA del brief del cliente (v2)
//
//  Antes la definición del brief vivía copiada en 6 sitios (B-09/CRM-20):
//  api/brief.mjs, lib/email.mjs, el documento, el panel, el CSV y
//  lib/db.mjs. Desde aquí se derivan la validación del servidor, las
//  etiquetas legibles (B-08), el formulario por pasos (ola 3), el kit de
//  arranque y el .zip para Claude Code.
//
//  Modelo de DOS MOMENTOS (decisión del dueño 2026-10-19):
//    · 'inicial'  → brief corto público (unos 10 minutos): lo mínimo para
//                   proponer. Logo y fotos opcionales.
//    · 'arranque' → "Kit de arranque" privado que el panel envía al cliente
//                   cuando contrata (enlace único sin cuenta): todo lo pesado.
//
//  Dónde se guarda cada campo (field.storage, lo calcula finalize()):
//    · 'column' → las 39 columnas históricas de `briefs` (MISMAS claves: el
//                 chat, el panel y la tabla no se rompen).
//    · 'extra'  → campos nuevos del momento inicial  → briefs.extra (jsonb)
//    · 'kit'    → campos nuevos del momento arranque → briefs.kit   (jsonb)
//    · 'files'  → campos de archivo: viven en brief_files (tags.field = key)
//
//  Forma de un campo:
//    { key, type, label:{es,en}, help?:{es,en}, options?:[{value,label:{es,en}}],
//      required?, moment, section, storage, when?:{services:[ids]},
//      validation?:{max,min,maxItems,minDigits,pattern,integer},
//      hidden? (legado: el panel lo muestra, los formularios nuevos no),
//      item?:{fields:[...]} (repeater), kind?/tags?/shots?/variants? (file) }
//
//  Tipos: text, textarea, email, tel, url, radio, checkbox, select,
//         date-month, number, repeater, file, hours, zones, services.
//
//  Helpers exportados: validate(moment, data, opts) · normalize(data, opts)
//  · labelFor(field, value, lang) · sectionsFor(moment, services, opts)
//  · splitByStorage(data) · normalizeFileTags(kind, tags).
// ════════════════════════════════════════════════════════════════
import { BRIEF_SERVICES } from './brief-services.generated.mjs';

export const SCHEMA_VERSION = 2;
export const MOMENTS = ['inicial', 'arranque'];
export const LANGS = ['es', 'en'];
export const FIELD_TYPES = [
  'text', 'textarea', 'email', 'tel', 'url', 'radio', 'checkbox', 'select',
  'date-month', 'number', 'repeater', 'file', 'hours', 'zones', 'services',
];

// ── Constructores compactos ───────────────────────────────────
const L = (es, en) => ({ es, en });
const o = (value, es, en) => ({ value, label: L(es, en) });
const f = (key, type, es, en, more = {}) => ({ key, type, label: L(es, en), ...more });
const yesNo = [o('si', 'Sí', 'Yes'), o('no', 'No', 'No')];
const yesNoUnsure = [o('si', 'Sí', 'Yes'), o('no', 'No', 'No'), o('noSe', 'No sé', 'Not sure')];

// ── Servicios del catálogo (derivados de src/i18n/pricing.ts) ──
export { BRIEF_SERVICES };
export const SERVICE_IDS = BRIEF_SERVICES.map((s) => s.id);
const SERVICE_OPTIONS = BRIEF_SERVICES.map((s) => {
  const low = s.tiers[0];
  const from = (lang) => (low ? (low.value === null ? low.display[lang] : (lang === 'en' ? `from ${low.display.en}` : `desde ${low.display.es}`)) : '');
  return { value: s.id, label: L(s.name.es, s.name.en), hint: L(from('es'), from('en')) };
});

// Grupos de servicios para las condiciones (ids de pricing.ts → catalog[].id).
const S_WEB   = ['diseno-web', 'ecommerce', 'mantenimiento'];
const S_STORE = ['ecommerce'];
const S_BOT   = ['ia-conversacional'];
const S_SEO   = ['seo-local', 'seo-ia'];
const S_SITE  = ['diseno-web'];
const S_LOCAL = ['seo-local'];
const S_AEO   = ['seo-ia'];
const S_BRAND = ['branding'];

// ── Las 39 claves históricas (columnas de `briefs`, db/init.sql) ──
export const LEGACY_COLUMNS = [
  'business_name', 'owner_name', 'industry', 'years_in_market',
  'business_description', 'products_services',
  'phone', 'email', 'city_state', 'current_website',
  'instagram', 'facebook', 'other_socials', 'google_business',
  'website_type', 'has_domain', 'has_hosting',
  'pages_required', 'features_required',
  'target_audience', 'main_objective', 'visitor_action', 'competitors',
  'has_logo', 'brand_colors', 'brand_fonts', 'brand_personality',
  'inspiration_sites', 'design_dislikes',
  'has_photos', 'has_copy', 'has_video', 'language',
  'budget_range', 'timeline', 'deadline',
  'additional_notes', 'referred_by', 'previous_agency',
];
export const LEGACY_JSONB = ['pages_required', 'features_required'];

// ── Etiquetas de archivo (tags) por tipo ──────────────────────
// Tomas guiadas de fotos (lo que los proyectos reales necesitaron y llegó
// tarde por WhatsApp): el formulario muestra la lista con su casilla.
export const PHOTO_SHOTS = [
  o('owner',        'Retrato tuyo (dueño o dueña)',       'Portrait of you (the owner)'),
  o('team',         'Tu equipo trabajando',                'Your team at work'),
  o('vehicle',      'Vehículo o camión rotulado',          'Branded vehicle or truck'),
  o('storefront',   'Tu local por fuera o el letrero',     'Storefront or sign'),
  o('inside',       'Tu local por dentro',                 'Inside your place'),
  o('service',      'Un trabajo de cada servicio principal', 'One job for each main service'),
  o('before_after', 'Un par antes y después',              'A before and after pair'),
  o('other',        'Otra foto',                           'Other photo'),
];
export const LOGO_VARIANTS = [
  o('full',     'Logo completo',              'Full logo'),
  o('icon',     'Solo el ícono o símbolo',    'Icon or symbol only'),
  o('light_bg', 'Versión para fondo claro',   'Version for light backgrounds'),
  o('dark_bg',  'Versión para fondo oscuro',  'Version for dark backgrounds'),
  o('mono',     'Una sola tinta (monocromo)', 'Single color (monochrome)'),
];
export const FILE_TAG_DEFS = {
  // Comunes a todos: field (clave del campo), note (texto corto).
  common: [
    f('field', 'text', 'Campo', 'Field', { validation: { max: 60 } }),
    f('note', 'text', 'Nota', 'Note', { validation: { max: 200 } }),
  ],
  photo: [
    f('shot', 'select', 'Toma', 'Shot', { options: PHOTO_SHOTS }),
    f('service', 'text', 'Servicio', 'Service', { validation: { max: 120 } }),
    f('neighborhood', 'text', 'Barrio o ciudad', 'Neighborhood or city', { validation: { max: 120 } }),
    f('month', 'date-month', 'Mes en que se tomó', 'Month taken'),
    f('origin', 'radio', 'Origen', 'Source', { options: [
      o('own', 'Trabajo mío', 'My own work'), o('inspiration', 'Inspiración', 'Inspiration'), o('unknown', 'No sé', 'Not sure'),
    ] }),
    f('stage', 'radio', 'Momento', 'Stage', { options: [
      o('before', 'Antes', 'Before'), o('after', 'Después', 'After'), o('none', 'Ninguno', 'Neither'),
    ] }),
    f('pair', 'text', 'Par antes y después', 'Before and after pair', { validation: { max: 40 } }),
    f('google_ok', 'checkbox', 'Se puede usar en Google y directorios', 'Can be used on Google and directories'),
  ],
  logo: [
    f('variant', 'select', 'Variante', 'Variant', { options: LOGO_VARIANTS }),
  ],
  doc: [
    f('topic', 'text', 'De qué es', 'What it is', { validation: { max: 120 } }),
  ],
  video: [
    f('topic', 'text', 'Qué muestra', 'What it shows', { validation: { max: 200 } }),
  ],
  legal: [
    f('doc_type', 'select', 'Tipo de documento', 'Document type', { options: [
      o('registration', 'Registro del negocio', 'Business registration'),
      o('license', 'Licencia', 'License'),
      o('insurance', 'Seguro o certificado de seguro', 'Insurance or certificate of insurance'),
      o('utility', 'Factura de servicios a nombre del negocio', 'Utility bill in the business name'),
      o('other', 'Otro', 'Other'),
    ] }),
  ],
};

// ════════════════════════════════════════════════════════════════
//  SECCIONES
// ════════════════════════════════════════════════════════════════
const RAW_SECTIONS = [
  // ── MOMENTO INICIAL (corto, público) ─────────────────────────
  {
    key: 'servicios', moment: 'inicial',
    label: L('Qué necesitas', 'What you need'),
    help: L('Elige uno o varios. Las preguntas siguientes se ajustan a lo que elijas.', 'Pick one or more. The next questions adapt to your choice.'),
    fields: [
      f('services', 'services', 'Servicios que te interesan', 'Services you are interested in', {
        required: true, options: SERVICE_OPTIONS, validation: { maxItems: SERVICE_OPTIONS.length },
      }),
    ],
  },
  {
    key: 'negocio', moment: 'inicial',
    label: L('Tu negocio', 'Your business'),
    fields: [
      f('business_name', 'text', 'Nombre del negocio, tal como lo ven tus clientes', 'Business name, exactly as customers see it', {
        required: true, help: L('Como aparece en tu letrero o tus facturas.', 'As it appears on your sign or invoices.'), validation: { max: 120 },
      }),
      f('owner_name', 'text', 'Tu nombre', 'Your name', { required: true, validation: { max: 120 } }),
      f('industry', 'text', 'Rubro o tipo de negocio', 'Industry or type of business', {
        help: L('Por ejemplo: limpieza, restaurante, construcción.', 'For example: cleaning, restaurant, construction.'), validation: { max: 120 },
      }),
      f('city_state', 'text', 'Ciudad y estado', 'City and state', { validation: { max: 120 } }),
      f('business_description', 'textarea', 'Cuéntanos qué hace tu negocio', 'Tell us what your business does', { validation: { max: 3000 } }),
      f('current_website', 'url', 'Sitio web actual, si tienes', 'Current website, if any', { validation: { max: 500 } }),
    ],
  },
  {
    key: 'contacto', moment: 'inicial',
    label: L('Cómo te contactamos', 'How we reach you'),
    help: L('Necesitamos al menos un correo o un teléfono.', 'We need at least an email or a phone number.'),
    fields: [
      f('email', 'email', 'Correo electrónico', 'Email', { validation: { max: 200 } }),
      f('phone', 'tel', 'Teléfono', 'Phone', { validation: { max: 50, minDigits: 7 } }),
      f('preferred_contact', 'radio', 'Cómo prefieres que te contactemos', 'How do you prefer we contact you', { options: [
        o('call', 'Llamada', 'Phone call'), o('whatsapp', 'WhatsApp', 'WhatsApp'),
        o('sms', 'Mensaje de texto', 'Text message'), o('email', 'Correo', 'Email'),
      ] }),
      f('contact_language', 'radio', 'En qué idioma prefieres que te hablemos', 'Which language do you prefer we use with you', { options: [
        o('es', 'Español', 'Spanish'), o('en', 'Inglés', 'English'), o('any', 'Cualquiera de los dos', 'Either one'),
      ] }),
    ],
  },
  {
    key: 'proyecto', moment: 'inicial',
    label: L('Tu proyecto', 'Your project'),
    fields: [
      f('main_objective', 'textarea', 'Qué quieres lograr', 'What do you want to achieve', {
        required: true, help: L('Por ejemplo: más llamadas, vender en línea, que te encuentren en Google.', 'For example: more calls, sell online, get found on Google.'),
        validation: { max: 3000 },
      }),
      f('website_type', 'radio', 'Qué tipo de sitio necesitas', 'What kind of website do you need', {
        when: { services: S_WEB }, options: [
          o('landing', 'Una sola página (landing)', 'Single page (landing)'),
          o('corporativo', 'Sitio de varias páginas', 'Multi page business site'),
          o('ecommerce', 'Tienda en línea', 'Online store'),
          o('portfolio', 'Portafolio', 'Portfolio'),
          o('reservas', 'Sistema de reservas', 'Booking system'),
          o('blog', 'Blog o contenido', 'Blog or content'),
          o('otro', 'Otro', 'Other'),
        ],
      }),
      f('language', 'radio', 'En qué idioma lo necesitas', 'Which language do you need it in', { options: [
        o('es', 'Solo español', 'Spanish only'), o('en', 'Solo inglés', 'English only'), o('biling', 'Bilingüe', 'Bilingual'),
      ] }),
      f('budget_range', 'radio', 'Inversión que tienes en mente', 'Budget you have in mind', {
        help: L('Nuestros precios publicados empiezan en $150 (logo) y $400 (landing).', 'Our published prices start at $150 (logo) and $400 (landing).'),
        options: [
          o('menos-500', 'Menos de $500', 'Under $500'),
          o('500-1000', 'De $500 a $1,000', '$500 to $1,000'),
          o('1000-2500', 'De $1,000 a $2,500', '$1,000 to $2,500'),
          o('2500-5000', 'De $2,500 a $5,000', '$2,500 to $5,000'),
          o('5000+', 'Más de $5,000', 'Over $5,000'),
          o('noSe', 'Todavía no lo sé', 'Not sure yet'),
        ],
      }),
      f('timeline', 'radio', 'Para cuándo lo necesitas', 'When do you need it', { options: [
        o('urgente', 'Lo antes posible', 'As soon as possible'),
        o('2-4sem', 'En 2 a 4 semanas', 'In 2 to 4 weeks'),
        o('1-2mes', 'En 1 a 2 meses', 'In 1 to 2 months'),
        o('flexible', 'Soy flexible', 'I am flexible'),
      ] }),
    ],
  },
  {
    // Bloques condicionales por servicio (gate design/brief.md §3): de 1 a 3
    // preguntas por servicio, solo las que cambian la propuesta. Lo demás va
    // al kit de arranque. El formulario las agrupa bajo el nombre del servicio.
    key: 'por_servicio', moment: 'inicial',
    label: L('Según los servicios que elegiste', 'Based on the services you picked'),
    fields: [
      f('web_extras', 'checkbox', '¿Tu sitio debe hacer algo de esto?', 'Should your site do any of this?', {
        when: { services: S_SITE }, help: L('Marca solo lo que aplique.', 'Check only what applies.'), options: [
          o('book', 'Agendar citas', 'Book appointments'), o('pay', 'Cobrar en línea', 'Take payments online'),
          o('portal', 'Área privada para tus clientes', 'Private area for your customers'),
        ],
      }),
      f('seo_scope', 'radio', 'Qué buscas en Google y Maps', 'What you are looking for on Google and Maps', {
        when: { services: S_LOCAL }, options: [
          o('setup', 'Dejar mi ficha y mi sitio bien hechos una vez', 'Get my profile and site set up right once'),
          o('monthly', 'Trabajo continuo cada mes', 'Ongoing work every month'),
          o('unsure', 'No sé todavía', 'Not sure yet'),
        ],
      }),
      f('seo_areas', 'radio', 'En cuántas ciudades o zonas quieres aparecer', 'How many cities or areas you want to show up in', {
        when: { services: S_LOCAL }, options: [
          o('one', 'Una', 'One'), o('few', 'De 2 a 3', '2 to 3'), o('many', '4 o más', '4 or more'),
        ],
      }),
      f('aeo_scope', 'radio', 'Qué buscas con la IA', 'What you are looking for with AI', {
        when: { services: S_AEO }, options: [
          o('checkup', 'Saber cómo apareces hoy', 'Know how you show up today'),
          o('setup', 'Dejarlo listo una vez', 'Get it set up once'),
          o('monthly', 'Seguimiento cada mes', 'Monthly follow up'),
          o('unsure', 'No sé todavía', 'Not sure yet'),
        ],
      }),
      f('aeo_tested', 'radio', '¿Ya le preguntaste a ChatGPT o Gemini por tu negocio?', 'Have you asked ChatGPT or Gemini about your business?', {
        when: { services: S_AEO }, options: [
          o('shows', 'Sí, y aparezco', 'Yes, and I show up'), o('missing', 'Sí, y no aparezco', 'Yes, and I do not show up'),
          o('no', 'No lo he probado', 'I have not tried'),
        ],
      }),
      // Del kit (sección 'asistente'): definen el asistente básico o completo.
      f('bot_channels', 'checkbox', 'Dónde debe atender tu asistente', 'Where your assistant should answer', { when: { services: S_BOT }, options: [
        o('web', 'Tu sitio web', 'Your website'), o('whatsapp', 'WhatsApp', 'WhatsApp'),
        o('instagram', 'Instagram', 'Instagram'), o('facebook', 'Messenger', 'Messenger'),
      ] }),
      f('bot_tasks', 'checkbox', 'Qué debe hacer', 'What it should do', { when: { services: S_BOT }, options: [
        o('answer', 'Contestar preguntas', 'Answer questions'), o('book', 'Agendar citas', 'Book appointments'),
        o('quote', 'Dar precios desde', 'Give starting prices'), o('capture', 'Tomar datos de contacto', 'Collect contact details'),
      ] }),
      // Del kit (sección 'tienda'): definen la tienda esencial o a medida.
      f('product_count', 'number', 'Cuántos productos vas a vender', 'How many products you will sell', {
        when: { services: S_STORE }, help: L('Un aproximado basta.', 'A rough number is fine.'), validation: { min: 0, max: 1000000, integer: true },
      }),
      f('shipping', 'radio', 'Cómo entregas', 'How you deliver', { when: { services: S_STORE }, options: [
        o('ship', 'Envío', 'Shipping'), o('pickup', 'Recogida en el local', 'Pickup'), o('both', 'Las dos', 'Both'), o('digital', 'Producto digital', 'Digital product'),
      ] }),
      f('brand_scope', 'radio', 'Qué necesitas para tu marca', 'What you need for your brand', {
        when: { services: S_BRAND }, options: [
          o('logo', 'Solo el logo', 'Just the logo'),
          o('full', 'Identidad completa: logo, colores, tipografías y guía', 'Full identity: logo, colors, fonts and guide'),
          o('unsure', 'No sé todavía', 'Not sure yet'),
        ],
      }),
      f('brand_uses', 'checkbox', 'Dónde vas a usar tu marca', 'Where you will use your brand', {
        when: { services: S_BRAND }, options: [
          o('web', 'Sitio web y redes', 'Website and social media'), o('print', 'Tarjetas, volantes y papelería', 'Cards, flyers and stationery'),
          o('vehicle', 'Vehículo o letrero', 'Vehicle or sign'), o('apparel', 'Uniformes', 'Uniforms'),
        ],
      }),
    ],
  },
  {
    key: 'material', moment: 'inicial',
    label: L('Tu marca, logo y fotos', 'Your brand, logo and photos'),
    help: L('Si ya los tienes a mano, súbelos. Si no, los pedimos después.', 'If you have them handy, upload them. If not, we will ask later.'),
    fields: [
      f('has_logo', 'radio', '¿Tienes logo?', 'Do you have a logo?', { options: [
        o('si', 'Sí, tengo logo', 'Yes, I have a logo'), o('no', 'No, necesito uno', 'No, I need one'), o('update', 'Quiero renovarlo', 'I want to refresh it'),
      ] }),
      f('logo_files', 'file', 'Sube tu logo', 'Upload your logo', {
        kind: 'logo', multiple: true, maxFiles: 10, variants: LOGO_VARIANTS,
        help: L('Mejor en vector (SVG, AI, EPS o PDF) o PNG con fondo transparente.', 'Vector is best (SVG, AI, EPS or PDF) or PNG with a transparent background.'),
      }),
      // Estado y colores de la marca: en el brief corto (gate design/brief.md §3).
      // El kit los lee de aquí; el modo de diseño (DESIGN.md, LEEME) sale de brand_status.
      f('brand_status', 'radio', '¿Tu marca está cerrada o abierta a cambios?', 'Is your brand final or open to changes?', { options: [
        o('closed', 'Cerrada: se respeta tal cual', 'Final: keep it as is'),
        o('adjustable', 'Se puede ajustar', 'It can be adjusted'),
        o('redo', 'Quiero una nueva', 'I want a new one'),
      ] }),
      f('brand_color_list', 'repeater', 'Colores de tu marca', 'Your brand colors', {
        help: L('Si no sabes el código, basta con el nombre del color.', 'If you do not know the code, the color name is enough.'),
        validation: { maxItems: 12 },
        item: { fields: [
          f('name', 'text', 'Color (por ejemplo, rojo)', 'Color (for example, red)', { short: L('Color', 'Color'), validation: { max: 60 } }),
          f('hex', 'text', 'Código (por ejemplo #E11D2E)', 'Code (for example #E11D2E)', { short: L('Código', 'Code'), validation: { max: 7, pattern: '^#?[0-9a-fA-F]{6}$' } }),
        ] },
      }),
      f('brand_colors_none', 'checkbox', 'No tengo colores definidos', 'I do not have set brand colors'),
      f('has_photos', 'radio', '¿Tienes fotos de tu negocio o tus trabajos?', 'Do you have photos of your business or your work?', { options: [
        o('si', 'Sí, tengo fotos', 'Yes, I have photos'), o('pocas', 'Tengo pocas', 'I have a few'), o('no', 'No tengo', 'I have none'),
      ] }),
      f('photo_files', 'file', 'Sube algunas fotos', 'Upload a few photos', {
        kind: 'photo', multiple: true, maxFiles: 20, shots: PHOTO_SHOTS,
        help: L('Desde la galería del teléfono, no reenviadas por WhatsApp (pierden calidad).', 'From your phone gallery, not forwarded through WhatsApp (they lose quality).'),
      }),
    ],
  },
  {
    key: 'cierre', moment: 'inicial',
    label: L('Para terminar', 'To finish'),
    fields: [
      f('referred_by', 'radio', 'Cómo nos conociste', 'How did you find us', { options: [
        o('google', 'Google', 'Google'), o('instagram', 'Instagram', 'Instagram'), o('facebook', 'Facebook', 'Facebook'),
        o('referido', 'Recomendación', 'Referral'), o('chatbot', 'Asistente del sitio', 'Site assistant'), o('otro', 'Otro', 'Other'),
      ] }),
      f('additional_notes', 'textarea', 'Algo más que debamos saber', 'Anything else we should know', { validation: { max: 3000 } }),
    ],
  },

  // ── MOMENTO ARRANQUE (kit privado al contratar) ──────────────
  {
    key: 'identidad_legal', moment: 'arranque',
    label: L('Datos legales del negocio', 'Business legal details'),
    fields: [
      f('legal_name', 'text', 'Nombre legal exacto', 'Exact legal name', {
        help: L('Como está registrado, por ejemplo "Garcia Services LLC".', 'As registered, for example "Garcia Services LLC".'), validation: { max: 160 },
      }),
      f('legal_form', 'select', 'Forma legal', 'Legal structure', { options: [
        o('sole', 'Persona física (sole proprietor)', 'Sole proprietor'), o('dba', 'Nombre comercial registrado (DBA)', 'Registered trade name (DBA)'),
        o('llc', 'LLC', 'LLC'), o('corp', 'Corporación', 'Corporation'), o('other', 'Otra', 'Other'), o('unknown', 'No sé', 'Not sure'),
      ] }),
      f('state_registration', 'text', 'Número de registro estatal', 'State registration number', { validation: { max: 60 } }),
      f('legal_docs', 'file', 'Documento de registro', 'Registration document', {
        kind: 'legal', multiple: true, maxFiles: 5,
        help: L('Es confidencial: no va al paquete de diseño.', 'Confidential: it does not go into the design package.'),
      }),
      f('start_month', 'date-month', 'Mes y año en que empezó el negocio', 'Month and year the business started', {
        help: L('Lo usamos para decir "desde 2019" sin inventar.', 'We use it to say "since 2019" without guessing.'),
      }),
      f('years_in_market', 'text', 'Años en el mercado', 'Years in business', { hidden: true, validation: { max: 60 } }),
      f('employees', 'number', 'Número de personas en el equipo', 'Number of people on the team', { validation: { min: 0, max: 100000, integer: true } }),
      f('attributes', 'checkbox', 'Lo que describe a tu negocio', 'What describes your business', { options: [
        o('latino_owned', 'Dueño latino', 'Latino owned'), o('women_owned', 'Dueña mujer', 'Women owned'),
        o('veteran_owned', 'Dueño veterano', 'Veteran owned'), o('lgbtq_owned', 'Dueño LGBTQ+', 'LGBTQ+ owned'),
        o('bilingual_team', 'Equipo bilingüe', 'Bilingual team'), o('family', 'Negocio familiar', 'Family business'),
      ] }),
      f('payment_methods', 'checkbox', 'Formas de pago que aceptas', 'Payment methods you accept', { options: [
        o('cash', 'Efectivo', 'Cash'), o('card', 'Tarjeta', 'Card'), o('zelle', 'Zelle', 'Zelle'),
        o('venmo', 'Venmo', 'Venmo'), o('cashapp', 'Cash App', 'Cash App'), o('check', 'Cheque', 'Check'),
        o('financing', 'Financiamiento', 'Financing'), o('other', 'Otra', 'Other'),
      ] }),
    ],
  },
  {
    key: 'ubicacion', moment: 'arranque',
    label: L('Dónde y cuándo atiendes', 'Where and when you serve'),
    fields: [
      f('service_mode', 'radio', 'Cómo atiendes', 'How you serve customers', { options: [
        o('local', 'En mi local', 'At my place'), o('onsite', 'Voy a casa del cliente', 'I go to the customer'), o('both', 'Las dos', 'Both'),
      ] }),
      f('address', 'text', 'Dirección del negocio', 'Business address', { validation: { max: 240 } }),
      f('address_public', 'radio', '¿Se puede mostrar la dirección en público?', 'Can the address be shown publicly?', { options: yesNo }),
      f('zones', 'zones', 'Zonas donde trabajas', 'Areas you serve', {
        help: L('Ciudades, barrios o códigos postales. Marca dónde trabajas más.', 'Cities, neighborhoods or ZIP codes. Mark where you work the most.'),
        validation: { maxItems: 60 },
      }),
      f('service_radius', 'number', 'Radio de servicio en millas', 'Service radius in miles', { validation: { min: 0, max: 500 } }),
      f('hours', 'hours', 'Horario por día', 'Hours by day'),
      f('same_day', 'radio', '¿Atiendes el mismo día o urgencias?', 'Do you offer same day or emergency service?', { options: yesNo }),
      f('holidays', 'textarea', 'Festivos o temporadas en que cierras', 'Holidays or seasons when you close', { validation: { max: 1000 } }),
    ],
  },
  {
    key: 'canales', moment: 'arranque',
    label: L('Canales y quién contesta', 'Channels and who answers'),
    fields: [
      f('leads_email', 'email', 'Correo donde quieres recibir los pedidos', 'Email where you want to receive requests', {
        required: true, help: L('Aquí llegarán los formularios de tu sitio.', 'Your website forms will arrive here.'), validation: { max: 200 },
      }),
      f('public_email', 'email', 'Correo que verá el público', 'Email the public will see', { validation: { max: 200 } }),
      f('public_phone', 'tel', 'Teléfono que verá el público', 'Phone the public will see', { validation: { max: 50, minDigits: 7 } }),
      f('channels', 'checkbox', 'Canales en los que atiendes', 'Channels you answer on', { options: [
        o('call', 'Llamadas', 'Calls'), o('sms', 'Mensajes de texto', 'Text messages'), o('whatsapp', 'WhatsApp', 'WhatsApp'),
        o('email', 'Correo', 'Email'), o('instagram', 'Mensajes de Instagram', 'Instagram messages'), o('facebook', 'Messenger', 'Messenger'),
      ] }),
      f('responders', 'repeater', 'Quién contesta cada canal y en qué idioma', 'Who answers each channel and in which language', {
        validation: { maxItems: 10 },
        item: { fields: [
          f('channel', 'text', 'Canal', 'Channel', { validation: { max: 60 } }),
          f('person', 'text', 'Persona', 'Person', { validation: { max: 120 } }),
          f('languages', 'checkbox', 'Idiomas', 'Languages', { options: [o('es', 'Español', 'Spanish'), o('en', 'Inglés', 'English')] }),
        ] },
      }),
      f('response_time', 'select', 'En cuánto tiempo puedes responder un contacto', 'How fast can you answer a new contact', { options: [
        o('15m', 'En 15 minutos', 'Within 15 minutes'), o('1h', 'En 1 hora', 'Within 1 hour'),
        o('same_day', 'El mismo día', 'Same day'), o('next_day', 'Al día siguiente', 'Next day'),
      ] }),
      f('spanish_share', 'number', 'Porcentaje de tus clientes que te hablan en español', 'Share of your customers who speak Spanish with you (%)', {
        validation: { min: 0, max: 100, integer: true },
      }),
    ],
  },
  {
    key: 'servicios_cliente', moment: 'arranque',
    label: L('Tus servicios y precios', 'Your services and prices'),
    help: L('Precios "desde": sin promesas que no puedas cumplir.', 'Starting prices: no promises you cannot keep.'),
    fields: [
      f('client_services', 'repeater', 'Servicios que ofreces', 'Services you offer', {
        validation: { maxItems: 30 },
        item: { fields: [
          f('name', 'text', 'Servicio', 'Service', { required: true, validation: { max: 120 } }),
          f('name_en', 'text', 'Nombre en inglés', 'Name in English', { validation: { max: 120 } }),
          f('unit', 'select', 'Unidad de precio', 'Price unit', { options: [
            o('project', 'Por proyecto', 'Per project'), o('visit', 'Por visita', 'Per visit'), o('hour', 'Por hora', 'Per hour'),
            o('item', 'Por artículo', 'Per item'), o('load', 'Por carga', 'Per load'), o('sqft', 'Por pie cuadrado', 'Per square foot'),
            o('month', 'Por mes', 'Per month'), o('other', 'Otra', 'Other'),
          ] }),
          f('price_from', 'number', 'Precio desde (USD)', 'Starting price (USD)', { validation: { min: 0, max: 10000000 } }),
          f('price_to', 'number', 'Precio hasta (USD)', 'Price up to (USD)', { validation: { min: 0, max: 10000000 } }),
          f('includes', 'textarea', 'Qué incluye', 'What it includes', { validation: { max: 1000 } }),
          f('excludes', 'textarea', 'Qué no incluye', 'What it does not include', { validation: { max: 1000 } }),
          f('priority', 'checkbox', 'Es de los que más quieres vender', 'One you most want to sell'),
        ] },
      }),
      f('products_services', 'textarea', 'Productos o servicios', 'Products or services', { hidden: true, validation: { max: 3000 } }),
      f('not_offered', 'textarea', 'Lo que NO haces', 'What you do NOT do', {
        help: L('Así no aparece en tu sitio por error.', 'So it never shows up on your site by mistake.'), validation: { max: 2000 },
      }),
      f('surcharges', 'textarea', 'Recargos y mínimos', 'Surcharges and minimums', {
        help: L('Urgencia, distancia, permisos, mínimo de servicio.', 'Urgency, distance, permits, service minimum.'), validation: { max: 2000 },
      }),
      f('price_list', 'file', 'Tu lista de precios, si la tienes', 'Your price list, if you have one', { kind: 'doc', multiple: true, maxFiles: 5 }),
      f('customer_words', 'textarea', 'Cómo te piden el servicio tus clientes (palabras exactas, en español y en inglés)', 'How customers ask for your service (exact words, in Spanish and English)', { validation: { max: 2000 } }),
      f('faq_top', 'textarea', 'Las preguntas que más te hacen', 'The questions you get asked the most', { validation: { max: 3000 } }),
      f('objections', 'textarea', 'Por qué un cliente a veces no te contrata', 'Why a customer sometimes does not hire you', { validation: { max: 2000 } }),
    ],
  },
  {
    key: 'marca', moment: 'arranque',
    label: L('Tu marca', 'Your brand'),
    fields: [
      f('brand_logo_files', 'file', 'Logo y sus variantes', 'Logo and its variants', {
        kind: 'logo', multiple: true, maxFiles: 15, variants: LOGO_VARIANTS,
        help: L('Sube cada versión que tengas y márcala.', 'Upload every version you have and label it.'),
      }),
      f('brand_colors', 'text', 'Colores de marca', 'Brand colors', { hidden: true, validation: { max: 500 } }),
      f('colors_avoid', 'text', 'Colores que NO quieres', 'Colors you do NOT want', { validation: { max: 300 } }),
      f('brand_fonts', 'text', 'Tipografías', 'Fonts', { validation: { max: 300 } }),
      f('fonts_by_marcyan', 'checkbox', 'No sé, que las elija Marcyan', 'Not sure, let Marcyan choose'),
      f('brand_personality', 'radio', 'Personalidad de tu marca', 'Your brand personality', { options: [
        o('luxury', 'Lujo o premium', 'Luxury or premium'), o('moderno', 'Moderna o tecnológica', 'Modern or tech'),
        o('amigable', 'Amigable y cálida', 'Friendly and warm'), o('profesional', 'Profesional', 'Professional'),
        o('minimalista', 'Minimalista', 'Minimalist'), o('creativo', 'Creativa y atrevida', 'Creative and bold'),
      ] }),
      f('slogan', 'text', 'Eslogan', 'Slogan', { validation: { max: 200 } }),
      f('slogan_translate', 'radio', '¿El eslogan se traduce al otro idioma?', 'Should the slogan be translated?', { options: yesNo }),
      f('name_no_translate', 'text', 'Nombres o palabras que nunca se traducen', 'Names or words that are never translated', { validation: { max: 300 } }),
      f('brandbook', 'file', 'Manual de marca, si tienes', 'Brand guide, if you have one', { kind: 'doc', multiple: true, maxFiles: 3 }),
    ],
  },
  {
    key: 'fotos', moment: 'arranque',
    label: L('Fotos y video', 'Photos and video'),
    help: L('Fotos reales de tu negocio: valen más que cualquier foto de catálogo.', 'Real photos of your business are worth more than any stock photo.'),
    fields: [
      f('kit_photo_files', 'file', 'Fotos por tomas', 'Photos by shot', {
        kind: 'photo', multiple: true, maxFiles: 50, shots: PHOTO_SHOTS,
        help: L('Para cada foto dinos el servicio, el barrio y el mes. Si es antes o después, márcalo.', 'For each photo tell us the service, neighborhood and month. Mark before or after.'),
      }),
      f('has_video', 'radio', '¿Tienes video del negocio o de tus trabajos?', 'Do you have video of your business or your work?', { options: yesNo }),
      f('video_files', 'file', 'Sube tu video', 'Upload your video', { kind: 'video', multiple: true, maxFiles: 3 }),
      f('video_links', 'textarea', 'O pega enlaces de video (YouTube, Drive, Instagram)', 'Or paste video links (YouTube, Drive, Instagram)', { validation: { max: 2000 } }),
      f('stock_ok', 'radio', '¿Aceptas fotos de catálogo con crédito para explicar procesos? Nunca como trabajo tuyo.', 'Do you accept credited stock photos to explain processes? Never as your own work.', { options: yesNo }),
      f('has_copy', 'radio', '¿Tienes textos para el sitio?', 'Do you have text for the site?', { options: [
        o('si', 'Sí, tengo textos', 'Yes, I have text'), o('parcial', 'Algunos', 'Some'), o('no', 'No, necesito apoyo', 'No, I need help'),
      ] }),
      f('copy_files', 'file', 'Textos que ya tienes', 'Text you already have', { kind: 'doc', multiple: true, maxFiles: 10 }),
    ],
  },
  {
    key: 'prueba_social', moment: 'arranque',
    label: L('Reseñas, seguros y garantías', 'Reviews, insurance and guarantees'),
    help: L('Solo lo que se puede comprobar. Nunca inventamos reseñas ni cifras.', 'Only what can be verified. We never make up reviews or numbers.'),
    fields: [
      f('review_links', 'repeater', 'Dónde tienes reseñas', 'Where you have reviews', {
        validation: { maxItems: 10 },
        item: { fields: [
          f('platform', 'select', 'Plataforma', 'Platform', { options: [
            o('google', 'Google', 'Google'), o('yelp', 'Yelp', 'Yelp'), o('facebook', 'Facebook', 'Facebook'),
            o('nextdoor', 'Nextdoor', 'Nextdoor'), o('thumbtack', 'Thumbtack', 'Thumbtack'), o('angi', 'Angi', 'Angi'),
            o('bbb', 'BBB', 'BBB'), o('other', 'Otra', 'Other'),
          ] }),
          f('url', 'url', 'Enlace', 'Link', { validation: { max: 500 } }),
        ] },
      }),
      f('review_clients', 'repeater', 'Clientes contentos a quienes podemos pedir una reseña', 'Happy customers we can ask for a review', {
        help: L('Solo con su permiso.', 'Only with their permission.'), validation: { maxItems: 30 },
        item: { fields: [
          f('name', 'text', 'Nombre', 'Name', { validation: { max: 120 } }),
          f('area', 'text', 'Barrio o ciudad', 'Neighborhood or city', { validation: { max: 120 } }),
          f('contact', 'text', 'Teléfono o correo', 'Phone or email', { validation: { max: 200 } }),
          f('permission', 'checkbox', 'Dio permiso', 'Gave permission'),
        ] },
      }),
      f('insurance', 'repeater', 'Seguros y licencias', 'Insurance and licenses', {
        validation: { maxItems: 10 },
        item: { fields: [
          f('type', 'select', 'Tipo', 'Type', { options: [
            o('general_liability', 'Responsabilidad civil', 'General liability'), o('workers_comp', 'Compensación laboral', "Workers' compensation"),
            o('commercial_auto', 'Auto comercial', 'Commercial auto'), o('trade_license', 'Licencia del oficio', 'Trade license'),
            o('certification', 'Certificación', 'Certification'), o('other', 'Otro', 'Other'),
          ] }),
          f('provider', 'text', 'Aseguradora o entidad', 'Carrier or issuer', { validation: { max: 120 } }),
          f('number', 'text', 'Número de póliza o licencia', 'Policy or license number', { validation: { max: 80 } }),
        ] },
      }),
      f('insurance_docs', 'file', 'Documentos de seguros y licencias', 'Insurance and license documents', { kind: 'legal', multiple: true, maxFiles: 10 }),
      f('guarantees', 'textarea', 'Qué garantías das y por cuánto tiempo', 'What guarantees you give and for how long', { validation: { max: 2000 } }),
      f('no_written_guarantee', 'checkbox', 'No doy garantía por escrito', 'I do not give a written guarantee'),
    ],
  },
  {
    key: 'accesos', moment: 'arranque',
    label: L('Cuentas y accesos', 'Accounts and access'),
    help: L('Nunca te pediremos contraseñas. Solo qué existe y a nombre de quién; los accesos se dan por invitación.', 'We will never ask for passwords. Only what exists and in whose name; access is granted by invitation.'),
    fields: [
      f('has_domain', 'radio', '¿Tienes dominio propio?', 'Do you own a domain?', { options: yesNo }),
      f('domain_name', 'text', 'Tu dominio', 'Your domain', { validation: { max: 200 } }),
      f('domain_wishes', 'text', 'Si no tienes, 3 nombres que te gustarían', 'If not, 3 names you would like', { validation: { max: 300 } }),
      f('registrar', 'select', 'Dónde está registrado', 'Where it is registered', { options: [
        o('godaddy', 'GoDaddy', 'GoDaddy'), o('namecheap', 'Namecheap', 'Namecheap'), o('squarespace', 'Squarespace (antes Google Domains)', 'Squarespace (formerly Google Domains)'),
        o('cloudflare', 'Cloudflare', 'Cloudflare'), o('bluehost', 'Bluehost', 'Bluehost'), o('wix', 'Wix', 'Wix'),
        o('other', 'Otro', 'Other'), o('unknown', 'No sé', 'Not sure'),
      ] }),
      f('domain_owner', 'text', 'A nombre de quién está', 'Whose name it is under', { validation: { max: 160 } }),
      f('domain_access', 'radio', '¿Tienes acceso a esa cuenta?', 'Do you have access to that account?', { options: yesNoUnsure }),
      f('has_hosting', 'radio', '¿Pagas hosting hoy?', 'Do you pay for hosting today?', { options: yesNoUnsure }),
      f('hosting_where', 'text', 'Dónde está tu sitio o tu hosting', 'Where your site or hosting is', { validation: { max: 200 } }),
      f('domain_email', 'radio', '¿Tienes correo con tu dominio?', 'Do you have email on your domain?', { options: yesNoUnsure }),
      f('google_business', 'radio', '¿Tienes ficha de Google (Perfil de Negocio)?', 'Do you have a Google Business Profile?', { options: [
        o('si', 'Sí, tengo', 'Yes'), o('no', 'No tengo', 'No'), o('noSe', 'No sé', 'Not sure'),
      ] }),
      f('gbp_status', 'radio', 'Estado de tu ficha de Google', 'Your Google profile status', { options: [
        o('verified', 'Verificada', 'Verified'), o('unverified', 'Sin verificar', 'Not verified'), o('unknown', 'No sé', 'Not sure'),
      ] }),
      f('gbp_url', 'url', 'Enlace de tu ficha en Google Maps', 'Link to your profile on Google Maps', {
        help: L('En Google Maps abre tu ficha y toca Compartir.', 'In Google Maps open your profile and tap Share.'), validation: { max: 500 },
      }),
      f('gbp_invited', 'checkbox', 'Ya invité a Marcyan como administrador', 'I already invited Marcyan as a manager'),
      f('google_account_email', 'email', 'Correo de la cuenta de Google del negocio', 'Email of the business Google account', { validation: { max: 200 } }),
      f('search_console', 'radio', '¿Tienes Google Search Console?', 'Do you have Google Search Console?', { options: yesNoUnsure }),
      f('analytics', 'radio', '¿Tienes Google Analytics?', 'Do you have Google Analytics?', { options: yesNoUnsure }),
      f('socials', 'repeater', 'Tus redes sociales', 'Your social media', {
        validation: { maxItems: 12 },
        item: { fields: [
          f('platform', 'select', 'Red', 'Network', { options: [
            o('instagram', 'Instagram', 'Instagram'), o('facebook', 'Facebook', 'Facebook'), o('tiktok', 'TikTok', 'TikTok'),
            o('youtube', 'YouTube', 'YouTube'), o('linkedin', 'LinkedIn', 'LinkedIn'), o('nextdoor', 'Nextdoor', 'Nextdoor'),
            o('x', 'X (Twitter)', 'X (Twitter)'), o('other', 'Otra', 'Other'),
          ] }),
          f('url', 'url', 'Enlace', 'Link', { validation: { max: 500 } }),
          f('managed_by', 'text', 'Quién la administra', 'Who manages it', { validation: { max: 120 } }),
        ] },
      }),
      f('instagram', 'text', 'Instagram', 'Instagram', { hidden: true, validation: { max: 300 } }),
      f('facebook', 'text', 'Facebook', 'Facebook', { hidden: true, validation: { max: 300 } }),
      f('other_socials', 'text', 'Otras redes', 'Other social media', { hidden: true, validation: { max: 500 } }),
      f('directories', 'repeater', 'Directorios donde ya apareces', 'Directories where you already appear', {
        validation: { maxItems: 15 },
        item: { fields: [
          f('name', 'select', 'Directorio', 'Directory', { options: [
            o('yelp', 'Yelp', 'Yelp'), o('bbb', 'BBB', 'BBB'), o('nextdoor', 'Nextdoor', 'Nextdoor'), o('thumbtack', 'Thumbtack', 'Thumbtack'),
            o('angi', 'Angi', 'Angi'), o('bing', 'Bing Places', 'Bing Places'), o('apple', 'Apple Business Connect', 'Apple Business Connect'),
            o('other', 'Otro', 'Other'),
          ] }),
          f('url', 'url', 'Enlace', 'Link', { validation: { max: 500 } }),
        ] },
      }),
    ],
  },
  {
    key: 'mercado', moment: 'arranque',
    label: L('Clientes, competencia y referencias', 'Customers, competitors and references'),
    fields: [
      f('target_audience', 'textarea', 'Quiénes son tus clientes', 'Who your customers are', { validation: { max: 2000 } }),
      f('segments', 'checkbox', 'A quién quieres venderle', 'Who you want to sell to', { options: [
        o('homeowners', 'Particulares', 'Homeowners and individuals'), o('businesses', 'Negocios', 'Businesses'),
        o('contractors', 'Constructores', 'Contractors'), o('realtors', 'Agentes inmobiliarios', 'Realtors'),
        o('property_managers', 'Administradores de propiedades', 'Property managers'), o('other', 'Otros', 'Others'),
      ] }),
      f('map_competitors', 'repeater', 'Competidores que ves en Google Maps', 'Competitors you see on Google Maps', {
        validation: { maxItems: 5 },
        item: { fields: [
          f('name', 'text', 'Nombre del negocio', 'Business name', { validation: { max: 160 } }),
          f('website', 'url', 'Sitio web', 'Website', { validation: { max: 500 } }),
          f('why', 'textarea', 'Por qué te gana o le ganas', 'Why they beat you or you beat them', { validation: { max: 1000 } }),
        ] },
      }),
      f('competitors', 'textarea', 'Competidores', 'Competitors', { hidden: true, validation: { max: 3000 } }),
      f('references', 'repeater', 'Sitios que te gustan como referencia', 'Websites you like as a reference', {
        validation: { maxItems: 8 },
        item: { fields: [
          f('url', 'url', 'Enlace', 'Link', { validation: { max: 500 } }),
          f('likes', 'textarea', 'Qué te gusta', 'What you like', { validation: { max: 1000 } }),
          f('dislikes', 'textarea', 'Qué no te gusta', 'What you do not like', { validation: { max: 1000 } }),
        ] },
      }),
      f('inspiration_sites', 'textarea', 'Sitios de inspiración', 'Inspiration sites', { hidden: true, validation: { max: 3000 } }),
      f('design_dislikes', 'textarea', 'Lo que no te gusta en un sitio web', 'What you dislike in a website', { validation: { max: 2000 } }),
    ],
  },
  {
    key: 'objetivos', moment: 'arranque',
    label: L('Objetivos y publicidad', 'Goals and advertising'),
    fields: [
      f('goal_type', 'radio', 'Qué cuenta como éxito', 'What counts as success', { options: [
        o('calls', 'Llamadas', 'Calls'), o('quotes', 'Pedidos de cotización', 'Quote requests'),
        o('bookings', 'Reservas', 'Bookings'), o('sales', 'Ventas en línea', 'Online sales'), o('visits', 'Visitas al local', 'Store visits'),
      ] }),
      f('visitor_action', 'textarea', 'Qué quieres que haga quien entra a tu sitio', 'What you want visitors to do', { validation: { max: 1000 } }),
      f('goal_monthly', 'number', 'Contactos al mes que serían un éxito', 'Contacts per month that would be a success', { validation: { min: 0, max: 100000, integer: true } }),
      f('avg_ticket', 'number', 'Valor promedio de un trabajo (USD)', 'Average job value (USD)', { validation: { min: 0, max: 10000000 } }),
      f('results_by', 'text', 'Para cuándo necesitas ver resultados', 'When you need to see results', { validation: { max: 200 } }),
      f('seo_timing_ack', 'checkbox', 'Entiendo que Google tarda meses en mostrar resultados', 'I understand Google takes months to show results', { when: { services: S_SEO } }),
      f('ads_active', 'radio', '¿Inviertes hoy en anuncios?', 'Do you run ads today?', { options: yesNo }),
      f('ads_platforms', 'checkbox', 'Dónde', 'Where', { options: [
        o('google_ads', 'Google Ads', 'Google Ads'), o('lsa', 'Servicios Locales de Google', 'Google Local Services'),
        o('meta', 'Facebook o Instagram', 'Facebook or Instagram'), o('other', 'Otro', 'Other'),
      ] }),
      f('ads_budget', 'number', 'Presupuesto mensual aproximado en anuncios (USD)', 'Approximate monthly ad budget (USD)', { validation: { min: 0, max: 10000000 } }),
      f('ads_manager', 'text', 'Quién lleva los anuncios', 'Who runs the ads', { validation: { max: 160 } }),
      f('other_agencies', 'textarea', 'Otra agencia o persona que toque tu marketing o tu sitio, y qué necesita', 'Other agency or person working on your marketing or site, and what they need', { validation: { max: 2000 } }),
      f('previous_agency', 'radio', '¿Trabajaste antes con otra agencia?', 'Did you work with another agency before?', { options: [
        o('si', 'Sí', 'Yes'), o('no', 'No, es la primera vez', 'No, this is the first time'),
      ] }),
    ],
  },
  {
    key: 'sitio', moment: 'arranque', when: { services: S_WEB },
    label: L('Tu sitio web', 'Your website'),
    fields: [
      f('pages_required', 'checkbox', 'Páginas que necesitas', 'Pages you need', { options: [
        o('Inicio (Home)', 'Inicio', 'Home'), o('Sobre Nosotros', 'Sobre nosotros', 'About us'),
        o('Servicios / Productos', 'Servicios o productos', 'Services or products'), o('Galería / Portafolio', 'Galería o portafolio', 'Gallery or portfolio'),
        o('Testimonios / Reseñas', 'Reseñas', 'Reviews'), o('Blog / Noticias', 'Blog o noticias', 'Blog or news'),
        o('Precios / Paquetes', 'Precios o paquetes', 'Pricing or packages'), o('Formulario de Contacto', 'Formulario de contacto', 'Contact form'),
        o('Reservas / Citas', 'Reservas o citas', 'Bookings or appointments'), o('Tienda Online', 'Tienda en línea', 'Online store'),
        o('FAQ', 'Preguntas frecuentes', 'FAQ'), o('Mapa / Ubicación', 'Mapa o ubicación', 'Map or location'),
      ] }),
      f('features_required', 'checkbox', 'Funciones que necesitas', 'Features you need', { options: [
        o('Chatbot / IA', 'Asistente con IA', 'AI assistant'), o('Chat en vivo', 'Chat en vivo', 'Live chat'),
        o('Carrito de compras', 'Carrito de compras', 'Shopping cart'), o('Pasarela de pago', 'Pagos en línea', 'Online payments'),
        o('Formularios personalizados', 'Formularios personalizados', 'Custom forms'), o('Portal de clientes', 'Portal de clientes', 'Customer portal'),
        o('Integración WhatsApp', 'Botón de WhatsApp', 'WhatsApp button'), o('SEO optimizado', 'SEO optimizado', 'SEO optimized'),
        o('Multilenguaje', 'Español e inglés', 'Spanish and English'), o('Integración redes sociales', 'Enlace con redes sociales', 'Social media links'),
        o('CRM / Email Marketing', 'CRM o email marketing', 'CRM or email marketing'), o('Google Analytics', 'Google Analytics', 'Google Analytics'),
      ] }),
      f('booking_software', 'select', 'Programa de agenda o facturación que usas', 'Scheduling or invoicing software you use', { options: [
        o('jobber', 'Jobber', 'Jobber'), o('housecall', 'Housecall Pro', 'Housecall Pro'), o('square', 'Square', 'Square'),
        o('calendly', 'Calendly', 'Calendly'), o('acuity', 'Acuity', 'Acuity'), o('none', 'Ninguno', 'None'), o('other', 'Otro', 'Other'),
      ] }),
      f('privacy_policy', 'radio', '¿Tienes política de privacidad y términos?', 'Do you have a privacy policy and terms?', { options: [
        o('have', 'Sí, los tengo', 'Yes, I have them'), o('none', 'No tengo', 'I do not have them'), o('marcyan', 'Que los redacte Marcyan', 'Let Marcyan draft them'),
      ] }),
      f('deadline', 'text', 'Fecha límite, si hay una', 'Deadline, if there is one', { validation: { max: 120 } }),
    ],
  },
  {
    key: 'tienda', moment: 'arranque', when: { services: S_STORE },
    label: L('Tu tienda en línea', 'Your online store'),
    fields: [
      f('payment_provider', 'select', 'Con qué cobras', 'How you get paid', { options: [
        o('stripe', 'Stripe', 'Stripe'), o('square', 'Square', 'Square'), o('paypal', 'PayPal', 'PayPal'),
        o('shopify', 'Shopify Payments', 'Shopify Payments'), o('unknown', 'No sé', 'Not sure'),
      ] }),
      f('catalog_files', 'file', 'Tu catálogo o lista de productos', 'Your catalog or product list', { kind: 'doc', multiple: true, maxFiles: 5 }),
    ],
  },
  {
    key: 'asistente', moment: 'arranque', when: { services: S_BOT },
    label: L('Tu asistente con IA', 'Your AI assistant'),
    fields: [
      f('bot_handoff', 'text', 'A quién pasa la conversación cuando hace falta una persona', 'Who takes over when a person is needed', { validation: { max: 200 } }),
      f('bot_knowledge', 'file', 'Documentos con lo que debe saber', 'Documents with what it should know', { kind: 'doc', multiple: true, maxFiles: 10 }),
    ],
  },
  {
    key: 'seo', moment: 'arranque', when: { services: S_SEO },
    label: L('Cómo te buscan', 'How people search for you'),
    fields: [
      f('search_terms', 'textarea', 'Cómo te buscan tus clientes en Google', 'How customers search for you on Google', { validation: { max: 2000 } }),
      f('similar_names', 'textarea', 'Negocios con nombre parecido en tu zona', 'Businesses with a similar name in your area', { validation: { max: 1000 } }),
      f('high_season', 'text', 'Meses de más trabajo', 'Busiest months', { validation: { max: 200 } }),
      f('communities', 'textarea', 'Barrios, comunidades o HOA donde trabajas y lo que te piden', 'Neighborhoods, communities or HOAs you work in and what they require', { validation: { max: 2000 } }),
    ],
  },
  {
    key: 'operacion', moment: 'arranque',
    label: L('Cómo trabajamos juntos', 'How we work together'),
    fields: [
      f('approver_name', 'text', 'Quién aprueba los avances', 'Who approves the work', { validation: { max: 120 } }),
      f('approver_channel', 'select', 'Por dónde prefieres revisar y aprobar', 'Where you prefer to review and approve', { options: [
        o('whatsapp', 'WhatsApp', 'WhatsApp'), o('email', 'Correo', 'Email'), o('call', 'Llamada', 'Phone call'),
      ] }),
      f('approver_language', 'radio', 'En qué idioma', 'In which language', { options: [o('es', 'Español', 'Spanish'), o('en', 'Inglés', 'English')] }),
      f('approval_time', 'select', 'En cuánto tiempo sueles responder', 'How fast you usually reply', { options: [
        o('same_day', 'El mismo día', 'Same day'), o('2_days', 'En 1 o 2 días', 'In 1 or 2 days'), o('week', 'En la semana', 'Within the week'),
      ] }),
      f('hours_per_week', 'select', 'Horas por semana que puedes dedicar al proyecto', 'Hours per week you can give the project', { options: [
        o('lt1', 'Menos de 1', 'Less than 1'), o('1_3', 'De 1 a 3', '1 to 3'), o('gt3', 'Más de 3', 'More than 3'),
      ] }),
      f('post_launch', 'repeater', 'Quién se encarga de cada tarea después del lanzamiento', 'Who handles each task after launch', {
        validation: { maxItems: 10 },
        item: { fields: [
          f('task', 'select', 'Tarea', 'Task', { options: [
            o('reviews', 'Pedir reseñas', 'Ask for reviews'), o('photos', 'Mandar fotos nuevas', 'Send new photos'),
            o('hours', 'Avisar cambios de horario', 'Report hour changes'), o('services', 'Avisar cambios de servicios o precios', 'Report service or price changes'),
            o('reports', 'Leer los reportes', 'Read the reports'), o('other', 'Otra', 'Other'),
          ] }),
          f('person', 'text', 'Persona', 'Person', { validation: { max: 120 } }),
        ] },
      }),
      f('reports_channel', 'select', 'Dónde quieres recibir los reportes', 'Where you want to receive reports', { options: [
        o('email', 'Correo', 'Email'), o('whatsapp', 'WhatsApp', 'WhatsApp'),
      ] }),
      f('kit_notes', 'textarea', 'Algo más que debamos saber para arrancar', 'Anything else we should know to get started', { validation: { max: 3000 } }),
    ],
  },
];

// ── Etiquetas cortas para el lado interno (correo al dueño, panel, documento) ──
// Las etiquetas del formulario le hablan al cliente ("Tu nombre"); dentro de
// Marcyan se lee mejor "Propietario". shortLabel() cae a la etiqueta normal.
const SHORT = {
  services: L('Servicios', 'Services'), business_name: L('Negocio', 'Business'), owner_name: L('Propietario', 'Owner'),
  industry: L('Rubro', 'Industry'), city_state: L('Ciudad y estado', 'City and state'),
  business_description: L('Descripción', 'Description'), current_website: L('Web actual', 'Current website'),
  email: L('Correo', 'Email'), phone: L('Teléfono', 'Phone'), preferred_contact: L('Contacto preferido', 'Preferred contact'),
  main_objective: L('Objetivo', 'Goal'), website_type: L('Tipo de sitio', 'Site type'), language: L('Idioma', 'Language'),
  budget_range: L('Inversión', 'Budget'), timeline: L('Plazo', 'Timeline'), has_logo: L('¿Logo?', 'Logo?'),
  has_photos: L('¿Fotos?', 'Photos?'), referred_by: L('Cómo nos conoció', 'Referral source'),
  additional_notes: L('Notas', 'Notes'), target_audience: L('Audiencia', 'Audience'),
  visitor_action: L('Acción del visitante', 'Visitor action'), brand_personality: L('Personalidad', 'Personality'),
  brand_fonts: L('Tipografías', 'Fonts'), design_dislikes: L('No le gusta', 'Dislikes'), has_copy: L('¿Textos?', 'Copy?'),
  has_video: L('¿Video?', 'Video?'), google_business: L('Ficha de Google', 'Google profile'), has_domain: L('¿Dominio?', 'Domain?'),
  has_hosting: L('¿Hosting?', 'Hosting?'), previous_agency: L('Agencia previa', 'Previous agency'), deadline: L('Fecha límite', 'Deadline'),
  pages_required: L('Páginas', 'Pages'), features_required: L('Funciones', 'Features'),
  products_services: L('Productos o servicios', 'Products or services'), years_in_market: L('Años en el mercado', 'Years in business'),
  competitors: L('Competidores', 'Competitors'), inspiration_sites: L('Inspiración', 'Inspiration'), brand_colors: L('Colores', 'Colors'),
  leads_email: L('Correo para pedidos', 'Requests email'),
  contact_language: L('Idioma de contacto', 'Contact language'), brand_status: L('Estado de la marca', 'Brand status'),
  brand_color_list: L('Colores de marca', 'Brand colors'), brand_colors_none: L('Sin colores definidos', 'No set colors'),
  web_extras: L('Funciones del sitio', 'Site features'), seo_scope: L('SEO local buscado', 'Local SEO scope'),
  seo_areas: L('Zonas a cubrir', 'Areas to cover'), aeo_scope: L('SEO para IA buscado', 'AI SEO scope'),
  aeo_tested: L('¿Probó la IA?', 'Tested AI?'), bot_channels: L('Canales del asistente', 'Assistant channels'),
  bot_tasks: L('Tareas del asistente', 'Assistant tasks'), product_count: L('Productos', 'Products'),
  shipping: L('Entrega', 'Delivery'), brand_scope: L('Alcance de marca', 'Brand scope'), brand_uses: L('Usos de la marca', 'Brand uses'), legal_name: L('Nombre legal', 'Legal name'),
};
const SECTION_SHORT = {
  servicios: L('Servicios', 'Services'), negocio: L('Negocio', 'Business'), contacto: L('Contacto', 'Contact'),
  proyecto: L('Proyecto', 'Project'), por_servicio: L('Por servicio', 'By service'), material: L('Marca, logo y fotos', 'Brand, logo and photos'), cierre: L('Notas', 'Notes'),
  identidad_legal: L('Datos legales', 'Legal details'), ubicacion: L('Ubicación y horario', 'Location and hours'),
  canales: L('Canales', 'Channels'), servicios_cliente: L('Servicios del cliente', 'Client services'),
  marca: L('Marca', 'Brand'), fotos: L('Fotos y video', 'Photos and video'), prueba_social: L('Reseñas y seguros', 'Reviews and insurance'),
  accesos: L('Cuentas y accesos', 'Accounts and access'), mercado: L('Mercado y referencias', 'Market and references'),
  objetivos: L('Objetivos', 'Goals'), sitio: L('Sitio web', 'Website'), tienda: L('Tienda', 'Store'),
  asistente: L('Asistente con IA', 'AI assistant'), seo: L('Búsqueda', 'Search'), operacion: L('Operación', 'Operations'),
};
export const shortLabel = (fd, lang = 'es') => ((fd && (fd.short || fd.label)) || {})[lang === 'en' ? 'en' : 'es'] || '';

// ── Finalización: hereda momento/sección/condición y calcula storage ──
const LEGACY_SET = new Set(LEGACY_COLUMNS);
function finalize(sections) {
  return sections.map((s) => Object.freeze({
    ...s,
    short: SECTION_SHORT[s.key] || s.label,
    fields: s.fields.map((fd) => Object.freeze({
      ...fd,
      short: SHORT[fd.key] || fd.label,
      moment: fd.moment || s.moment,
      section: s.key,
      when: fd.when || s.when || null,
      required: Boolean(fd.required),
      hidden: Boolean(fd.hidden),
      storage: fd.type === 'file' ? 'files'
        : LEGACY_SET.has(fd.key) ? 'column'
        : (fd.moment || s.moment) === 'inicial' ? 'extra' : 'kit',
    })),
  }));
}
export const SECTIONS = Object.freeze(finalize(RAW_SECTIONS));
export const FIELDS = new Map(SECTIONS.flatMap((s) => s.fields.map((fd) => [fd.key, fd])));
export const fieldByKey = (key) => FIELDS.get(key) || null;

// Comprobación de integridad al cargar: las 39 claves históricas existen.
for (const k of LEGACY_COLUMNS) {
  if (!FIELDS.has(k)) throw new Error(`[brief-schema] falta la clave histórica '${k}'`);
}

// ════════════════════════════════════════════════════════════════
//  Mensajes de validación (ES/EN, sin jerga)
// ════════════════════════════════════════════════════════════════
export const MSG = {
  required:  () => L('Este campo es obligatorio.', 'This field is required.'),
  contact:   () => L('Necesitamos un correo o un teléfono para contactarte.', 'We need an email or a phone number to reach you.'),
  email:     () => L('Escribe un correo válido, por ejemplo nombre@dominio.com.', 'Enter a valid email, like name@domain.com.'),
  tel:       (n) => L(`El teléfono debe tener al menos ${n} dígitos.`, `The phone number needs at least ${n} digits.`),
  url:       () => L('Escribe una dirección web válida, por ejemplo tusitio.com.', 'Enter a valid web address, like yoursite.com.'),
  option:    () => L('Elige una de las opciones.', 'Choose one of the options.'),
  services:  () => L('Elige al menos un servicio.', 'Choose at least one service.'),
  max:       (n) => L(`Máximo ${n} caracteres.`, `Up to ${n} characters.`),
  maxItems:  (n) => L(`Máximo ${n} elementos.`, `Up to ${n} items.`),
  number:    () => L('Escribe un número.', 'Enter a number.'),
  integer:   () => L('Escribe un número entero.', 'Enter a whole number.'),
  range:     (a, b) => L(`Escribe un número entre ${a} y ${b}.`, `Enter a number between ${a} and ${b}.`),
  month:     () => L('Elige mes y año.', 'Choose month and year.'),
  hours:     () => L('Revisa el horario: usa horas como 08:00.', 'Check the hours: use times like 08:00.'),
  pattern:   () => L('Revisa el formato.', 'Check the format.'),
  zones:     () => L('Cada zona necesita un nombre o un código postal.', 'Each area needs a name or a ZIP code.'),
};

// ════════════════════════════════════════════════════════════════
//  Normalización
// ════════════════════════════════════════════════════════════════
const STRING_TYPES = new Set(['text', 'textarea', 'email', 'tel', 'url', 'radio', 'select', 'date-month']);
const DEFAULT_MAX = { text: 300, textarea: 3000, email: 200, tel: 50, url: 500, radio: 120, select: 120, 'date-month': 7 };
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABEL = {
  es: { mon: 'Lun', tue: 'Mar', wed: 'Mié', thu: 'Jue', fri: 'Vie', sat: 'Sáb', sun: 'Dom' },
  en: { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' },
};
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?([/?#][^\s]*)?$/i;

const isBlank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
const optionValues = (fd) => (fd.options || []).map((x) => x.value);
const maxOf = (fd) => (fd.validation && fd.validation.max) || DEFAULT_MAX[fd.type] || 300;

function toStr(v, cap) {
  if (isBlank(v)) return null;
  const s = (typeof v === 'string' ? v : String(v)).replace(/\u0000/g, '').trim();
  if (!s) return null;
  return cap ? s.slice(0, cap) : s;
}
function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (v === 1 || v === '1') return true;
  if (typeof v === 'string') return ['true', 'on', 'si', 'sí', 'yes'].includes(v.trim().toLowerCase());
  return false;
}
function toNum(v) {
  if (isBlank(v)) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : String(v);
  // "1,500" y "1500.50": se quitan comas de miles y el signo de dólar.
  const s = String(v).trim().replace(/[$\s]/g, '').replace(/,(?=\d{3}(\D|$))/g, '');
  const n = Number(s);
  return Number.isFinite(n) && s !== '' ? n : String(v).trim().slice(0, 40); // texto → lo marca validate
}

// opts:
//   optionMode: 'keep' (por defecto; validate marca lo que no está en la lista)
//             | 'drop' (lo que no está en la lista pasa a null: formulario v1)
//             | 'free' (se guarda como texto libre: briefs del chat v1)
//   truncate: número → recorta todo texto a ese máximo (modo legado)
//   only: Set|Array de claves a conservar
function normalizeField(fd, raw, opts = {}) {
  const mode = opts.optionMode || 'keep';
  const cap = opts.truncate || 0;
  switch (fd.type) {
    case 'text': case 'textarea': case 'email': case 'tel': case 'url': case 'date-month':
      return toStr(raw, cap);
    case 'radio': case 'select': {
      const s = toStr(raw, cap || (mode === 'free' ? 160 : 0));
      if (s === null) return null;
      if (optionValues(fd).includes(s)) return s;
      return mode === 'drop' ? null : s;
    }
    case 'checkbox': {
      if (!fd.options) return isBlank(raw) ? null : toBool(raw);
      let arr = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(',') : []);
      arr = [...new Set(arr.map((x) => toStr(x, 120)).filter(Boolean))].slice(0, 50);
      if (mode === 'drop') arr = arr.filter((x) => optionValues(fd).includes(x));
      return arr;
    }
    case 'services': {
      const arr = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(',') : []);
      return [...new Set(arr.map((x) => toStr(x, 60)).filter((x) => x && SERVICE_IDS.includes(x)))];
    }
    case 'number':
      return toNum(raw);
    case 'repeater': {
      if (!Array.isArray(raw)) return [];
      const rows = [];
      for (const r of raw.slice(0, 100)) {
        if (!r || typeof r !== 'object') continue;
        const row = {};
        let any = false;
        for (const sub of fd.item.fields) {
          const v = normalizeField(sub, r[sub.key], opts);
          row[sub.key] = v;
          if (!(v === null || v === false || (Array.isArray(v) && !v.length))) any = true;
        }
        if (any) rows.push(row);
      }
      return rows;
    }
    case 'hours': {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      const out = {};
      for (const d of DAYS) {
        const x = raw[d];
        if (!x || typeof x !== 'object') continue;
        out[d] = { closed: toBool(x.closed), open: toStr(x.open, 5), close: toStr(x.close, 5) };
      }
      const note = toStr(raw.note, 300);
      if (note) out.note = note;
      return Object.keys(out).length ? out : null;
    }
    case 'zones': {
      if (!Array.isArray(raw)) return [];
      const rows = [];
      for (const z of raw.slice(0, 200)) {
        if (typeof z === 'string') { const p = toStr(z, 120); if (p) rows.push({ place: p, zip: null, frequency: null }); continue; }
        if (!z || typeof z !== 'object') continue;
        const place = toStr(z.place, 120);
        const zip = toStr(z.zip, 60);
        const freq = ['often', 'sometimes'].includes(z.frequency) ? z.frequency : null;
        if (place || zip) rows.push({ place, zip, frequency: freq });
      }
      return rows;
    }
    case 'file':
      return undefined; // los archivos viven en brief_files, no en los datos
    default:
      return toStr(raw, cap);
  }
}

// Devuelve un objeto SOLO con claves del esquema (las desconocidas se ignoran).
export function normalize(data, opts = {}) {
  const src = (data && typeof data === 'object') ? data : {};
  const only = opts.only ? new Set(opts.only) : null;
  const out = {};
  for (const [key, fd] of FIELDS) {
    if (fd.type === 'file') continue;
    if (only && !only.has(key)) continue;
    if (opts.moment && fd.moment !== opts.moment) continue;
    if (!(key in src)) continue;
    const v = normalizeField(fd, src[key], opts);
    if (v !== undefined) out[key] = v;
  }
  return out;
}

// ════════════════════════════════════════════════════════════════
//  Validación
// ════════════════════════════════════════════════════════════════
const isEmptyVal = (v) => v === null || v === undefined || v === '' || v === false
  || (Array.isArray(v) && v.length === 0);

// ¿El campo aplica con estos servicios? Sin servicios conocidos (briefs
// legados) todo aplica, pero solo se exige lo que no es condicional.
export function isActive(fd, services) {
  if (!fd.when || !fd.when.services) return true;
  if (!Array.isArray(services) || !services.length) return true;
  return fd.when.services.some((s) => services.includes(s));
}

function checkValue(fd, v, path, errors, opts) {
  if (isEmptyVal(v)) return;
  const val = fd.validation || {};
  const put = (m) => { errors[path] = m; };
  switch (fd.type) {
    case 'text': case 'textarea': {
      if (v.length > maxOf(fd)) return put(MSG.max(maxOf(fd)));
      if (val.pattern && !(new RegExp(val.pattern)).test(v)) return put(MSG.pattern());
      return;
    }
    case 'email':
      if (v.length > maxOf(fd)) return put(MSG.max(maxOf(fd)));
      if (!EMAIL_RE.test(v)) return put(MSG.email());
      return;
    case 'tel': {
      if (v.length > maxOf(fd)) return put(MSG.max(maxOf(fd)));
      const n = val.minDigits || 7;
      if ((v.match(/\d/g) || []).length < n) return put(MSG.tel(n));
      return;
    }
    case 'url':
      if (v.length > maxOf(fd)) return put(MSG.max(maxOf(fd)));
      if (!URL_RE.test(v)) return put(MSG.url());
      return;
    case 'radio': case 'select':
      if (opts.optionMode === 'free') return;
      if (!optionValues(fd).includes(v)) return put(MSG.option());
      return;
    case 'checkbox':
      if (!fd.options) return;
      if (v.some((x) => !optionValues(fd).includes(x))) return put(MSG.option());
      return;
    case 'services':
      if (val.maxItems && v.length > val.maxItems) return put(MSG.maxItems(val.maxItems));
      return;
    case 'number': {
      if (typeof v !== 'number') return put(MSG.number());
      if (val.integer && !Number.isInteger(v)) return put(MSG.integer());
      const min = val.min ?? -Infinity, max = val.max ?? Infinity;
      if (v < min || v > max) return put(MSG.range(min, max));
      return;
    }
    case 'date-month': {
      const m = MONTH_RE.exec(v);
      const year = m ? Number(m[1]) : 0;
      if (!m || year < 1900 || year > new Date().getUTCFullYear() + 1) return put(MSG.month());
      return;
    }
    case 'repeater': {
      if (val.maxItems && v.length > val.maxItems) return put(MSG.maxItems(val.maxItems));
      v.forEach((row, i) => {
        for (const sub of fd.item.fields) {
          const p = `${path}.${i}.${sub.key}`;
          if (sub.required && isEmptyVal(row[sub.key])) { errors[p] = MSG.required(); continue; }
          checkValue(sub, row[sub.key], p, errors, opts);
        }
      });
      return;
    }
    case 'hours':
      for (const d of DAYS) {
        const x = v[d];
        if (!x || x.closed) continue;
        if ((x.open && !TIME_RE.test(x.open)) || (x.close && !TIME_RE.test(x.close))) return put(MSG.hours());
      }
      return;
    case 'zones':
      if (val.maxItems && v.length > val.maxItems) return put(MSG.maxItems(val.maxItems));
      if (v.some((z) => !z.place && !z.zip)) return put(MSG.zones());
      return;
    default:
  }
}

// validate(moment, data, opts) → { ok, errors, data }
//   moment: 'inicial' | 'arranque' (null = todos los campos)
//   data:   valores crudos (se normalizan aquí con opts.optionMode)
//   opts.services: servicios elegidos (si no, se leen de data.services)
//   opts.partial:  true = guardado parcial (no exige obligatorios)
//   errors: { clave | 'clave.índice.subclave': { es, en } }
export function validate(moment, data, opts = {}) {
  const clean = normalize(data, { optionMode: opts.optionMode, moment: moment || undefined });
  const services = Array.isArray(opts.services) ? opts.services : (clean.services || []);
  const errors = {};
  for (const [key, fd] of FIELDS) {
    if (fd.type === 'file') continue;
    if (moment && fd.moment !== moment) continue;
    if (!isActive(fd, services)) continue;
    const v = clean[key];
    if (fd.required && !opts.partial && isEmptyVal(v)) {
      errors[key] = fd.type === 'services' ? MSG.services() : MSG.required();
      continue;
    }
    checkValue(fd, v, key, errors, opts);
  }
  // Regla cruzada del momento inicial: correo O teléfono.
  if ((moment === 'inicial' || !moment) && !opts.partial && isEmptyVal(clean.email) && isEmptyVal(clean.phone)) {
    if (!errors.email) errors.email = MSG.contact();
  }
  return { ok: Object.keys(errors).length === 0, errors, data: clean };
}

// Separa datos normalizados según dónde se guardan.
export function splitByStorage(data) {
  const out = { columns: {}, extra: {}, kit: {} };
  for (const [key, v] of Object.entries(data || {})) {
    const fd = FIELDS.get(key);
    if (!fd) continue;
    if (fd.storage === 'column') out.columns[key] = v;
    else if (fd.storage === 'extra') out.extra[key] = v;
    else if (fd.storage === 'kit') out.kit[key] = v;
  }
  return out;
}

// ════════════════════════════════════════════════════════════════
//  Etiquetas legibles (B-08)
// ════════════════════════════════════════════════════════════════
const MONTHS = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const lg = (lang) => (lang === 'en' ? 'en' : 'es');
const optLabel = (fd, v, lang) => {
  const opt = (fd.options || []).find((x) => x.value === v);
  return opt ? opt.label[lang] : String(v); // valor desconocido (texto libre del chat): tal cual
};

// labelFor(campo | clave, valor, lang) → texto legible (null si vacío).
export function labelFor(field, value, lang = 'es') {
  const fd = typeof field === 'string' ? FIELDS.get(field) : field;
  const L2 = lg(lang);
  if (value === null || value === undefined || value === '') return null;
  if (!fd) return typeof value === 'object' ? JSON.stringify(value) : String(value);
  const yes = L2 === 'en' ? 'Yes' : 'Sí';
  const no = 'No';
  switch (fd.type) {
    case 'radio': case 'select':
      return optLabel(fd, value, L2);
    case 'checkbox':
      if (!fd.options) return toBool(value) ? yes : no;
      return (Array.isArray(value) ? value : String(value).split(',')).map((v) => optLabel(fd, String(v).trim(), L2)).join(' · ') || null;
    case 'services':
      return (Array.isArray(value) ? value : [value]).map((id) => {
        const s = BRIEF_SERVICES.find((x) => x.id === id);
        return s ? s.name[L2] : String(id);
      }).join(' · ') || null;
    case 'date-month': {
      const m = MONTH_RE.exec(String(value));
      if (!m) return String(value);
      const name = MONTHS[L2][Number(m[2]) - 1];
      return L2 === 'en' ? `${name} ${m[1]}` : `${name} de ${m[1]}`;
    }
    case 'number':
      return typeof value === 'number' ? value.toLocaleString('en-US') : String(value);
    case 'hours': {
      if (typeof value !== 'object') return String(value);
      const closed = L2 === 'en' ? 'closed' : 'cerrado';
      const to = L2 === 'en' ? 'to' : 'a';
      const parts = DAYS.filter((d) => value[d]).map((d) => {
        const x = value[d];
        return `${DAY_LABEL[L2][d]} ${x.closed ? closed : `${x.open || '?'} ${to} ${x.close || '?'}`}`;
      });
      if (value.note) parts.push(value.note);
      return parts.join(' · ') || null;
    }
    case 'zones':
      if (!Array.isArray(value)) return String(value);
      return value.map((z) => [z.place, z.zip && `(${z.zip})`].filter(Boolean).join(' ')).join(' · ') || null;
    case 'repeater':
      if (!Array.isArray(value)) return String(value);
      return value.map((row) => fd.item.fields
        .map((sub) => {
          const t = labelFor(sub, row[sub.key], L2);
          return t === null ? null : `${(sub.short || sub.label)[L2]}: ${t}`; // short: etiqueta interna
        })
        .filter(Boolean).join(', ')).filter(Boolean).join('\n') || null;
    default:
      return Array.isArray(value) ? value.join(' · ') : String(value);
  }
}

// ════════════════════════════════════════════════════════════════
//  Secciones por momento y servicios
// ════════════════════════════════════════════════════════════════
// sectionsFor(moment, services, opts)
//   moment:   'inicial' | 'arranque' | null (todas)
//   services: array de ids → filtra lo condicional; null/undefined = sin filtrar
//   opts.includeHidden: incluye los campos legados ocultos (panel, documento)
export function sectionsFor(moment, services, opts = {}) {
  const filterServices = Array.isArray(services);
  const out = [];
  for (const s of SECTIONS) {
    if (moment && s.moment !== moment) continue;
    const fields = s.fields.filter((fd) =>
      (opts.includeHidden || !fd.hidden)
      && (!filterServices || isActive(fd, services)));
    if (!fields.length) continue;
    out.push({ ...s, fields });
  }
  return out;
}

// ════════════════════════════════════════════════════════════════
//  Etiquetas de archivos (tags) — saneadas con FILE_TAG_DEFS
// ════════════════════════════════════════════════════════════════
export function normalizeFileTags(kind, tags) {
  if (!tags || typeof tags !== 'object' || Array.isArray(tags)) return {};
  const defs = [...FILE_TAG_DEFS.common, ...(FILE_TAG_DEFS[kind] || [])];
  const out = {};
  for (const fd of defs) {
    if (!(fd.key in tags)) continue;
    const v = normalizeField(fd, tags[fd.key], { optionMode: 'drop' });
    if (v === null || v === undefined) continue;
    if (fd.type === 'text' && v.length > maxOf(fd)) { out[fd.key] = v.slice(0, maxOf(fd)); continue; }
    if (fd.type === 'date-month' && !MONTH_RE.test(v)) continue;
    out[fd.key] = v;
  }
  // field debe ser una clave de archivo del esquema (si no, se descarta)
  if (out.field) {
    const fd = FIELDS.get(out.field);
    if (!fd || fd.type !== 'file') delete out.field;
  }
  return out;
}
