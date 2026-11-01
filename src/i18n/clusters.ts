// ─────────────────────────────────────────────────────────────
// CONTENIDO · Ola 1 SEO — 4 landings de cluster (servicio + ciudad / wedge).
// Español neutral hispano US, formal-cálido. Solo ES (EN = Ola 3).
//
// Reglas de honestidad (duras): Miami SIN claims de clientes en Miami; SEO SIN
// promesa de #1; precios reales "desde $"; un dato citable real por página.
// Datos citables verificados (jun 2026): 46% búsquedas con intención local y
// 76% "cerca de mí" visitan en <24h (Google/BrightLocal); 75% juzga la
// credibilidad por el sitio (Stanford); 53% abandona móvil >3s (Google);
// respuesta en 5 min = hasta 100x más probable contactar (HBR); ChatGPT
// recomienda solo 1.2% de negocios locales (SOCi 2026).
// ─────────────────────────────────────────────────────────────

import { content, nap } from './content';
import { HOUSTON_ID, MIAMI_ID, ORG_ID, type FaqItem, type CrumbItem, type ServiceInput } from '../lib/schema';

// ── Tipos de una landing ──────────────────────────────────────
export interface HeroData {
  badge?: string;
  badgeIcon?: string;
  kicker?: string;
  h1: string;
  sub: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  chips?: string[];
  tone?: 'gold' | 'teal';
}
export interface FeatureItem { icon: string; title: string; desc: string }
export interface SectionFeatures { tag: string; title: string; intro?: string; items: FeatureItem[]; tone?: 'gold' | 'teal' }
export interface SectionProse { tag?: string; title: string; paragraphs: string[]; tone?: 'gold' | 'teal' }
export interface SectionPricing {
  tag: string; title: string; price: string; unit?: string; lead?: string;
  features: string[]; cta: { label: string; href: string }; note?: string; tone?: 'gold' | 'teal';
}
export interface ProjectItem { name: string; cat: string; url: string; display: string; result: string; accent: string }
export interface SectionProof { tag: string; title: string; cta: { label: string; href: string }; items: ProjectItem[] }
export interface SectionFaq { tag: string; title: string; items: FaqItem[] }
export interface SectionCta { title: string; sub?: string; primary: { label: string; href: string }; secondary?: { label: string; href: string }; tone?: 'gold' | 'teal' }
/** `price` (opcional, aditivo): precio display "desde $X" para vistas que muestran
    el precio en su propio slot (hub de ciudad); las landings finas lo ignoran. */
export interface RelatedLink { label: string; href: string; desc: string; icon?: string; price?: string }
export interface SectionRelated { tag: string; title: string; links: RelatedLink[] }

export interface ClusterPage {
  /** CTA opcional hacia una calculadora de herramientas (Growth OS, etapa de implicación). */
  tool?: { text: string; linkLabel: string; href: string };
  meta: { title: string; description: string };
  path: string;
  breadcrumb: CrumbItem[];
  hero: HeroData;
  answer: { q: string; a: string; source?: string };
  includes: SectionFeatures;
  local: SectionProse;
  pricing: SectionPricing;
  proof: SectionProof;
  faq: SectionFaq;
  cta: SectionCta;
  related: SectionRelated;
  service: ServiceInput;
}

// ── Navegación para landings (links a secciones de la home + landings hermanas).
// Difiere de la nav de la home (anclas on-page) porque desde una landing las
// anclas deben apuntar a /es/. El toggle de idioma cae a la home EN (no hay
// espejo /en/ de las landings hasta la Ola 3).
export const clusterNav = {
  // Nav plana unificada — misma que la home (content.es.nav), páginas REALES.
  links: [
    { label: 'Servicios', href: '/es/servicios' },
    { label: 'Portafolio', href: '/es/portafolio' },
    { label: 'Precios', href: '/es/precios' },
    { label: 'Ciudades', href: '/es/ciudades' },
    { label: 'Nosotros', href: '/es/sobre-nosotros' },
    { label: 'Blog', href: '/es/blog' },
  ],
  cta: { label: 'Propuesta gratis', href: '#contacto' },
  langLabel: 'EN',
  langHref: '/en',
  openMenu: 'Abrir menú',
  closeMenu: 'Cerrar menú',
};

// Nav EN — espejo de clusterNav con rutas EN (ver routes.ts). Toggle a /es/.
export const clusterNavEn = {
  links: [
    { label: 'Services', href: '/en/services' },
    { label: 'Portfolio', href: '/en/portfolio' },
    { label: 'Pricing', href: '/en/pricing' },
    { label: 'Cities', href: '/en/cities' },
    { label: 'About', href: '/en/about' },
    { label: 'Blog', href: '/en/blog' },
  ],
  cta: { label: 'Get my free proposal', href: '#contacto' },
  langLabel: 'ES',
  langHref: '/es',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
};

// ── Reutilización de proof: elige proyectos REALES de la home por nombre ──
const homeProjects = content.es.projects.items as unknown as ProjectItem[];
const proj = (...names: string[]): ProjectItem[] =>
  names
    .map((n) => homeProjects.find((p) => p.name === n))
    .filter((p): p is ProjectItem => Boolean(p));

// Caso #0 — este mismo sitio (honesto, ya referenciado en el hero de la home).
const caso0: ProjectItem = {
  name: 'Este sitio · Caso #0',
  cat: 'Marcyan · Nuestro propio sitio',
  url: '/es',
  display: 'marcyanstudio.com',
  result: 'Construido en HTML estático para que ChatGPT y Gemini puedan leerlo y citarlo.',
  accent: 'teal',
};

// ── Contenido compartido entre las dos landings de diseño web ──
const webIncludesItems: FeatureItem[] = [
  { icon: 'lucide:pen-tool', title: 'Diseño a medida', desc: 'Cada sitio se diseña desde cero alrededor de tu marca y tus objetivos. Sin plantillas recicladas.' },
  { icon: 'lucide:gauge', title: 'Rápido y hecho para el celular', desc: 'HTML ligero que carga en un par de segundos, impecable en celular y en computadora.' },
  { icon: 'lucide:languages', title: 'Bilingüe español e inglés', desc: 'Tu sitio en los dos idiomas, escrito para cómo busca de verdad tu cliente.' },
  { icon: 'lucide:search', title: 'SEO y listo para IA', desc: 'Estructura optimizada para Google y para que ChatGPT y Gemini puedan leerte.' },
  { icon: 'lucide:inbox', title: 'Formularios y captación', desc: 'Formularios que llegan a tu correo y a tu base de datos, para que no se escape ningún prospecto.' },
  { icon: 'lucide:server', title: 'Hospedaje y dominio', desc: 'Te orientamos con hospedaje, dominio y lo técnico para que salgas en vivo sin dolores de cabeza.' },
];
const webFeatures = [
  'Diseño 100% a medida',
  'Varias páginas según el plan',
  'Versión en español e inglés',
  'Optimización SEO base',
  'Formulario de contacto integrado',
  'Listo para móvil y para la IA',
];
const webPriceNote =
  '$1,500 es el punto de partida para un sitio profesional. Las tiendas en línea (e-commerce) y los proyectos con funciones especiales tienen su propio alcance: te lo detallamos sin compromiso.';

// ═══════════════════════════════════════════════════════════════
// 1 · HOUSTON — SEO LOCAL
// ═══════════════════════════════════════════════════════════════
const houstonSeo: ClusterPage = {
  meta: {
    title: 'SEO local en Houston: posiciona tu negocio en Google | Marcyan',
    description:
      'Agencia de SEO local en Houston para PYMEs hispanas. Optimizamos tu Perfil de Google, tu sitio y tus reseñas para que te encuentren. Propuesta gratis en 24h.',
  },
  path: '/es/houston/seo-local',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'SEO local', path: '/es/houston/seo-local' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'SEO local',
    h1: 'SEO local en <em>Houston</em>',
    sub: 'Aparece cuando te buscan en Google Maps y en la IA, de Katy a Pasadena. Trabajamos tu negocio zona por zona, en español y en inglés, para que la llamada te llegue a ti.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver cómo trabajamos', href: '#proceso' },
    chips: ['Toda el área de Houston', 'Sin contratos eternos', 'Reportes claros'],
    tone: 'gold',
  },
  // Texto propio de Houston (1-nov-2026, encargo de páginas de ciudad casi iguales): área extensa, negocios a
  // domicilio, búsquedas en dos idiomas. Las fuentes: Google (relevancia, distancia y prominencia, ayuda del Perfil
  // de Negocio) y el dato de «cerca de mí» que ya usaba la página. Prueba real: TRR y Julio's, ambos de Houston.
  answer: {
    q: '¿Qué es el SEO local y cómo ayuda a un negocio en Houston?',
    a: 'El SEO local es el trabajo que hace que tu negocio salga cuando alguien busca tu servicio cerca, en Google Maps o en la IA. En Houston pesa todavía más porque el área es enorme: Google ordena los resultados locales por relevancia, distancia y prominencia, así que salir en Katy no te hace salir en Pearland. Y quien busca está listo para comprar: el 76% de quienes buscan «cerca de mí» visita un negocio en menos de 24 horas.',
    source: 'Google · BrightLocal, 2025',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'SEO local que <em>sí</em> mueve la aguja',
    items: [
      { icon: 'lucide:map-pin', title: 'Tu Perfil de Google, con tus zonas', desc: 'Ficha completa y bien categorizada, con las zonas que de verdad atiendes marcadas: Katy, Sugar Land, The Woodlands, Pearland o las tuyas.' },
      { icon: 'lucide:file-text', title: 'Una página por zona fuerte', desc: 'Como las de Katy y Sugar Land de este sitio: cada zona importante para tu negocio con su propia página, escrita para ese mercado y no copiada.' },
      { icon: 'lucide:list-checks', title: 'Tus datos iguales en todas partes', desc: 'Nombre, dirección y teléfono idénticos en Google, Bing, Apple Maps y los directorios de tu sector. Es lo primero que cruza la IA antes de recomendarte.' },
      { icon: 'lucide:star', title: 'Reseñas de cada zona', desc: 'Te ayudamos a pedir reseñas a cada cliente y a contestarlas en su idioma, para que Google vea trabajo real en cada parte de Houston.' },
      { icon: 'lucide:languages', title: 'Búsquedas en inglés también', desc: 'En Houston muchos servicios se buscan en inglés aunque el cliente hable español, como «kitchen remodeling contractor». Trabajamos las dos versiones.' },
      { icon: 'marcyan-ai', title: 'Listo para la IA', desc: 'Tu información ordenada en Bing y en tu web para que ChatGPT y Gemini puedan citarte, como ya pasa con Texas Rush Remove en la IA de Google.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué local',
    title: 'En Houston, el mapa se gana <em>zona por zona</em>',
    paragraphs: [
      'Houston es la cuarta ciudad más grande de Estados Unidos y una de las de mayor población hispana, y su área metropolitana va de The Woodlands a Pearland y de Katy a Pasadena. Google enseña primero los negocios relevantes y cercanos a quien busca, así que estar bien en una zona no te pone en todas. Por eso trabajamos tu presencia zona por zona, empezando por la que más te deja.',
      'Muchos negocios de Houston trabajan a domicilio, como Texas Rush Remove o Julio\'s Landscape, y no tienen local abierto al público. <strong>Para ellos Google permite ocultar la dirección y marcar las zonas que cubren</strong>, y ahí lo que cuenta es el contenido de cada zona, las reseñas y que tus datos coincidan en todas partes.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'SEO local, <em>desde $600 al mes</em>',
    price: '$600',
    unit: '/mes',
    lead: 'Sin contratos eternos. Empezamos por tu zona más rentable y sumamos zonas según los resultados.',
    features: [
      'Optimización del Perfil de Google de Negocio',
      'NAP en directorios clave',
      '1 página local optimizada al mes',
      'Gestión de reseñas',
      'Reporte mensual claro',
      'Soporte bilingüe',
    ],
    cta: { label: 'Propuesta gratis', href: '#contacto' },
    note: 'El precio final depende de cuántas zonas y servicios trabajemos y de lo competido que esté tu sector en Houston. Te damos el alcance por escrito en la propuesta, sin sorpresas.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Negocios de Houston que <em>ya posicionan</em>',
    cta: { label: 'Propuesta gratis', href: '#contacto' },
    items: proj('Texas Rush Remove', "Julio's Landscape TX"),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'SEO local en Houston, sin <em>letra chica</em>',
    items: [
      { q: '¿Cuánto cuesta el SEO local en Houston?', a: 'Desde $600 al mes, sin contratos a largo plazo. Lo que mueve el precio en Houston es cuántas zonas del área quieres cubrir (no es lo mismo solo Katy que Katy, Sugar Land y Pearland) y cuánta competencia hay en tu sector. Te damos el alcance y el precio por escrito en la propuesta gratuita, antes de que decidas.' },
      { q: '¿Puedo salir en Katy o en Sugar Land si mi negocio está en otra parte de Houston?', a: 'Sí, si de verdad das servicio allí. Marcamos esas zonas en tu Perfil de Google, creamos una página propia para cada una y conseguimos reseñas de clientes de esas zonas. Lo que no hacemos son direcciones falsas ni oficinas virtuales: Google las detecta y puede suspender tu ficha.' },
      { q: '¿Sirve el SEO local si trabajo a domicilio y no tengo local?', a: 'Sí. Texas Rush Remove trabaja en las casas de sus clientes y ya posiciona en su zona de Houston. En estos negocios tu dirección no se publica: Google se fija en las zonas que cubres, en tus reseñas y en lo que tu web dice de cada zona.' },
      { q: '¿En cuánto tiempo se ven resultados?', a: 'Las primeras señales llegan entre 2 y 8 semanas: más vistas y más llamadas desde tu ficha de Google. Subir en las búsquedas más peleadas de Houston toma de 3 a 6 meses de trabajo constante, y cada zona que ganas se queda sumando.' },
      { q: '¿Garantizan el primer lugar en Google?', a: 'No, y desconfía de quien lo haga: nadie controla a Google. Lo que sí te garantizamos es el trabajo hecho y medido, con un reporte claro cada mes de qué cambiamos, en qué zonas y qué pasó con tus llamadas.' },
      { q: '¿Trabajan en español e inglés?', a: 'Sí. En Houston conviven las dos búsquedas: «taller mecánico que hable español» y «kitchen remodeling contractor» las hace el mismo público. Escribimos tu ficha y tus páginas en los dos idiomas, cada una pensada para cómo se busca de verdad.' },
    ],
  },
  cta: {
    title: '¿Listo para que Houston te <em>encuentre</em>?',
    sub: 'Cuéntanos en qué zonas de Houston trabajas y qué servicio te deja más, y en menos de 24 horas te mandamos una propuesta de SEO local por zona, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'Un sitio rápido y a medida es la base de todo buen SEO.', icon: 'lucide:layout-template' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Atiende y capta clientes 24/7 con un asistente en español.', icon: 'lucide:messages-square' },
      { label: '¿Cuánto cuesta el SEO local en Houston?', href: '/es/precios', desc: 'La tarifa mensual publicada y qué incluye.', icon: 'lucide:tag' },
    ],
  },
  service: {
    name: 'SEO local en Houston',
    serviceType: 'SEO local',
    description:
      'Optimización de SEO local para PYMEs en Houston: Perfil de Google de Negocio, consistencia NAP, contenido local bilingüe, gestión de reseñas y preparación para asistentes de IA.',
    path: '/es/houston/seo-local',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '600',
    monthly: true,
    providerId: HOUSTON_ID,
  },
};

// ═══════════════════════════════════════════════════════════════
// 2 · HOUSTON — DISEÑO WEB
// ═══════════════════════════════════════════════════════════════
const houstonWeb: ClusterPage = {
  meta: {
    title: 'Diseño web en Houston | Páginas a medida y bilingües | Marcyan',
    description:
      'Diseño web profesional en Houston para PYMEs hispanas. Sitios rápidos, a medida y bilingües, listos para Google y la IA. Propuesta gratis en menos de 24 horas.',
  },
  path: '/es/houston/diseno-web',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'Diseño web', path: '/es/houston/diseno-web' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Diseño web',
    h1: 'Diseño web en <em>Houston</em>',
    sub: 'Sitios web a medida, rápidos y bilingües para negocios de Houston. Diseñados para verse increíbles, cargar al instante y convertir visitas en clientes, listos para Google y para la IA.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver trabajo real', href: '#proyectos' },
    chips: ['A medida, sin plantillas', 'Bilingüe ES/EN', 'Listo para IA y SEO'],
    tone: 'gold',
  },
  answer: {
    q: '¿Cuánto cuesta una página web profesional en Houston?',
    a: 'Un sitio web profesional a medida en Houston empieza alrededor de $1,500 y varía según el número de páginas, las funciones y el contenido. Invertir en buen diseño importa: el 75% de las personas juzga la credibilidad de un negocio por su sitio web, según un estudio de la Universidad de Stanford.',
    source: 'Universidad de Stanford',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Todo lo que un buen sitio <em>necesita</em>',
    items: webIncludesItems,
    tone: 'gold',
  },
  local: {
    tag: 'Por qué local',
    title: 'Un sitio pensado para el <em>mercado de Houston</em>',
    paragraphs: [
      'En Houston, la mayoría de tus clientes te encuentran primero en el celular. Si tu sitio tarda en cargar o se ve mal, los pierdes: el 53% de los visitantes abandona una página móvil que demora más de 3 segundos en cargar. Por eso construimos en HTML rápido y ligero.',
      'Además, Houston es un mercado profundamente bilingüe. Un sitio solo en inglés deja fuera a una parte enorme de tus clientes. Diseñamos en <strong>español e inglés</strong> desde el inicio, con el contexto cultural correcto.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Diseño web, <em>desde $1,500</em>',
    price: '$1,500',
    unit: 'proyecto único',
    lead: 'Pago por proyecto, sin mensualidades obligatorias. El precio depende del alcance.',
    features: webFeatures,
    cta: { label: 'Propuesta gratis', href: '#contacto' },
    note: webPriceNote,
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Negocios de Houston con <em>sitio nuevo</em>',
    cta: { label: 'Propuesta gratis', href: '#contacto' },
    items: proj('Texas Rush Remove', "Julio's Landscape TX", 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Diseño web en Houston, <em>claro</em>',
    items: [
      { q: '¿Cuánto cuesta un sitio web en Houston?', a: 'Un sitio profesional a medida empieza en $1,500. El precio final depende de cuántas páginas necesites, qué funciones quieras (reservas, pagos, blog) y si requieres tienda en línea. Te entregamos un presupuesto claro y por escrito en la propuesta gratuita, sin costos ocultos.' },
      { q: '¿En cuánto tiempo está listo mi sitio?', a: 'Un sitio típico de varias páginas toma entre 2 y 4 semanas, según la rapidez con que recibamos tu contenido (textos, fotos, logo) y el número de revisiones. Los proyectos más grandes, como las tiendas en línea, toman más tiempo. Te damos un calendario realista desde el inicio.' },
      { q: '¿Usan plantillas o lo hacen a medida?', a: 'Todo a medida. Diseñamos y programamos cada sitio desde cero alrededor de tu marca, sin plantillas genéricas recicladas. Eso hace que tu sitio sea más rápido, más seguro y verdaderamente tuyo.' },
      { q: '¿El sitio incluye SEO?', a: 'Sí, incluimos SEO técnico base: estructura correcta, velocidad, etiquetas y un formato que Google y los asistentes de IA pueden leer. El posicionamiento local continuo (Google de Negocio, reseñas, contenido mensual) es un servicio aparte de SEO local, si lo necesitas.' },
      { q: '¿El sitio es bilingüe?', a: 'Puede serlo. Construimos en español e inglés desde el diseño, porque en Houston tus clientes buscan en ambos idiomas. Si prefieres un solo idioma, también es posible: lo definimos según tu mercado.' },
      { q: '¿Quién mantiene el sitio después?', a: 'Tú decides. Puedes manejarlo por tu cuenta o tomar nuestro plan de mantenimiento (desde $120 al mes) con respaldos, actualizaciones de seguridad y soporte bilingüe. Nunca te dejamos amarrado: el sitio es tuyo.' },
    ],
  },
  cta: {
    title: 'Tu próximo sitio web <em>empieza aquí</em>',
    sub: 'Cuéntanos tu proyecto y recibe una propuesta de diseño web personalizada en menos de 24 horas, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que tu sitio nuevo aparezca en Google y en Maps.', icon: 'lucide:search' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Suma un asistente que contesta y agenda 24/7.', icon: 'lucide:messages-square' },
      { label: 'Tienda en línea en Houston', href: '/es/houston/ecommerce', desc: 'Cuando quieras vender en línea, te montamos la tienda.', icon: 'lucide:shopping-bag' },
      { label: 'Sitios para bienes raíces', href: '/es/houston/bienes-raices', desc: '¿Eres agente? Sitio con tus propiedades y SEO por zona.', icon: 'lucide:home' },
    ],
  },
  service: {
    name: 'Diseño web en Houston',
    serviceType: 'Diseño web',
    description:
      'Diseño y desarrollo de sitios web a medida para PYMEs en Houston: rápidos, bilingües (español e inglés), optimizados para SEO y legibles por asistentes de IA.',
    path: '/es/houston/diseno-web',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

// ═══════════════════════════════════════════════════════════════
// 3 · MIAMI — DISEÑO WEB   ⚠️ HONESTIDAD: aún SIN clientes en Miami.
//   Frame: "diseñamos para Miami y su área metro" + trabajo verificable
//   etiquetado por su ciudad real (Houston/Orlando) + Clientes Fundadores.
//   PROHIBIDO insinuar casos de Miami.
// ═══════════════════════════════════════════════════════════════
const miamiWeb: ClusterPage = {
  meta: {
    title: 'Diseño web en Miami | Páginas a medida y bilingües | Marcyan',
    description:
      'Diseño web profesional para negocios de Miami y su área metropolitana. Sitios a medida, rápidos y bilingües, listos para Google y la IA. Propuesta gratis en 24h.',
  },
  path: '/es/miami/diseno-web',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Miami', path: '/es/miami' },
    { name: 'Diseño web', path: '/es/miami/diseno-web' },
  ],
  hero: {
    badge: 'Miami, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Diseño web',
    h1: 'Diseño web en <em>Miami</em>',
    sub: 'Sitios web a medida, rápidos y bilingües para negocios de Miami y su área metropolitana. Diseño de élite que carga al instante, convierte visitas en clientes y te prepara para Google y la IA.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver trabajo real', href: '#proyectos' },
    chips: ['A medida, sin plantillas', 'Bilingüe ES/EN', 'Cupos de Cliente Fundador'],
    tone: 'gold',
  },
  answer: {
    q: '¿Cuánto cuesta una página web profesional en Miami?',
    a: 'Un sitio web profesional a medida para un negocio de Miami empieza alrededor de $1,500 y varía según las páginas, las funciones y el contenido. El diseño no es un lujo: el 75% de las personas juzga la credibilidad de un negocio por su sitio web, según un estudio de la Universidad de Stanford.',
    source: 'Universidad de Stanford',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Todo lo que un buen sitio <em>necesita</em>',
    items: webIncludesItems,
    tone: 'gold',
  },
  local: {
    tag: 'Por qué Miami',
    title: 'Miami es <em>bilingüe por naturaleza</em>',
    paragraphs: [
      'Miami es uno de los mercados más hispanos de Estados Unidos, con cerca del 69% de la población de Miami-Dade, de Hialeah a Doral y de Brickell a Kendall, y el español no es un «extra»: es el idioma de tus clientes. Un sitio que no habla su idioma, y que no carga rápido en el celular, pierde ventas todos los días.',
      '<strong>Seamos transparentes:</strong> apenas estamos abriendo nuestra operación de diseño en Miami, así que todavía no mostramos casos locales aquí. Lo que sí mostramos es trabajo real y verificable que ya hicimos para otros negocios (en Houston y Orlando), y buscamos a nuestros primeros Clientes Fundadores de Miami para sumar casos de esta ciudad.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Diseño web, <em>desde $1,500</em>',
    price: '$1,500',
    unit: 'proyecto único',
    lead: 'Pago por proyecto, sin mensualidades obligatorias. El precio depende del alcance.',
    features: webFeatures,
    cta: { label: 'Propuesta gratis', href: '#contacto' },
    note: webPriceNote,
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Trabajo reciente <em>verificable</em>',
    cta: { label: 'Sé nuestro primer caso en Miami', href: '#contacto' },
    // Etiquetados con su ciudad real (Houston/Orlando). No son de Miami y no lo insinuamos.
    items: proj('Texas Rush Remove', 'Move Junk Away', "Julio's Landscape TX", 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Diseño web en Miami, <em>sin rodeos</em>',
    items: [
      { q: '¿Cuánto cuesta un sitio web en Miami?', a: 'Un sitio profesional a medida empieza en $1,500. El precio final depende de cuántas páginas necesites, qué funciones quieras (reservas, pagos, blog) y si requieres tienda en línea. Te entregamos un presupuesto claro y por escrito en la propuesta gratuita, sin costos ocultos.' },
      { q: '¿Tienen clientes en Miami?', a: 'Seremos honestos: estamos comenzando nuestra operación en Miami, así que todavía no tenemos casos publicados de esta ciudad. Sí tenemos trabajo real y verificable hecho para negocios en Houston y Orlando, con enlaces que puedes visitar. Por eso ofrecemos cupos de Cliente Fundador en Miami, con condiciones especiales.' },
      { q: '¿Qué es un Cliente Fundador?', a: 'Es uno de nuestros primeros clientes en Miami. A cambio de confiar en una agencia joven en esta ciudad, recibes atención prioritaria, condiciones preferentes y te conviertes en uno de nuestros casos de estudio locales. Los cupos son limitados, porque les damos dedicación real.' },
      { q: '¿Usan plantillas o lo hacen a medida?', a: 'Todo a medida. Diseñamos y programamos cada sitio desde cero alrededor de tu marca, sin plantillas genéricas recicladas. Eso hace que tu sitio sea más rápido, más seguro y verdaderamente tuyo.' },
      { q: '¿El sitio es bilingüe?', a: 'Sí, y en Miami es casi indispensable. Diseñamos en español e inglés desde el inicio, con el español del Caribe y de Latinoamérica que hablan tus clientes. Tu sitio le habla a Miami en su idioma.' },
      { q: '¿Atienden toda el área de Miami?', a: 'Sí. Trabajamos Miami y su área metropolitana como negocio de área de servicio, de forma remota y eficiente. No necesitas ir a una oficina: todo el proceso, de la propuesta a la entrega, lo hacemos en línea y en tu idioma.' },
    ],
  },
  cta: {
    title: 'Sé uno de nuestros primeros <em>casos en Miami</em>',
    sub: 'Buscamos Clientes Fundadores en Miami. Cuéntanos tu proyecto y recibe una propuesta personalizada en menos de 24 horas, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'SEO local en Miami', href: '/es/miami/seo-local', desc: 'Que tu sitio nuevo aparezca en Google y en Maps.', icon: 'lucide:search' },
      { label: 'IA conversacional en Miami', href: '/es/miami/ia-conversacional', desc: 'Atiende y capta clientes 24/7 con un asistente en español.', icon: 'lucide:messages-square' },
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El mismo servicio, en nuestra base de operaciones.', icon: 'lucide:layout-template' },
    ],
  },
  service: {
    name: 'Diseño web en Miami',
    serviceType: 'Diseño web',
    description:
      'Diseño y desarrollo de sitios web a medida para negocios de Miami y su área metropolitana: rápidos, bilingües (español e inglés), optimizados para SEO y legibles por asistentes de IA.',
    path: '/es/miami/diseno-web',
    areaCity: 'Miami',
    areaRegion: 'Florida',
    priceValue: '1500',
    providerId: MIAMI_ID,
  },
};

// ═══════════════════════════════════════════════════════════════
// 4 · IA PARA PYMES  (wedge — lenguaje de DOLOR, no técnico)
// ═══════════════════════════════════════════════════════════════
const iaPymes: ClusterPage = {
  meta: {
    title: 'Inteligencia Artificial para tu Negocio (PYMEs) | Marcyan',
    description:
      'IA práctica para pequeños negocios: asistentes que contestan 24/7, WhatsApp automático, agenda de citas y rescate de llamadas perdidas. En español. Propuesta gratis.',
  },
  path: '/es/ia-para-pymes',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Servicios', path: '/es/servicios' },
    { name: 'IA para tu Negocio', path: '/es/ia-para-pymes' },
  ],
  hero: {
    badge: 'IA para tu negocio',
    badgeIcon: 'marcyan-ai',
    kicker: 'IA para PYMEs',
    h1: 'IA para tu <em>Negocio</em>',
    sub: '¿Tu negocio pierde clientes por no contestar a tiempo? Ponemos la inteligencia artificial a trabajar para ti: asistentes que responden, agendan citas y captan prospectos a toda hora, en español, sin que tengas que saber de tecnología.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver cómo funciona', href: '#faq' },
    chips: ['En español', 'Sin saber de tecnología', 'Se integra con lo que ya usas'],
    tone: 'teal',
  },
  answer: {
    q: '¿Cómo puede la inteligencia artificial ayudar a un negocio pequeño?',
    a: 'La IA ayuda a tu negocio a responder al instante y a no perder ventas: atiende mensajes, agenda citas y contesta preguntas las 24 horas. La velocidad importa: responder a un prospecto en los primeros 5 minutos multiplica hasta por 100 las probabilidades de contactarlo, según Harvard Business Review.',
    source: 'Harvard Business Review',
  },
  includes: {
    tag: 'Qué podemos hacer',
    title: 'IA que <em>trabaja</em> mientras tú trabajas',
    items: [
      { icon: 'lucide:bot-message-square', title: 'Asistente que contesta 24/7', desc: 'Un asistente de chat en tu sitio que responde preguntas y capta prospectos a cualquier hora, en español.' },
      { icon: 'lucide:message-circle', title: 'WhatsApp automático', desc: 'Respuestas y seguimiento automáticos por WhatsApp y mensajes, para que ningún cliente se quede esperando.' },
      { icon: 'lucide:calendar-check', title: 'Agenda de citas con IA', desc: 'Tus clientes reservan citas solos, de día y de noche, sin llamadas ni idas y vueltas.' },
      { icon: 'lucide:phone-missed', title: 'Rescata llamadas perdidas', desc: 'Cuando no puedes contestar, la IA responde por mensaje al instante para que no pierdas al cliente.' },
      { icon: 'marcyan-ai', title: 'Aparece en ChatGPT y Gemini', desc: 'Preparamos tu información para que los asistentes de IA puedan encontrarte y recomendarte.' },
      { icon: 'lucide:workflow', title: 'Automatiza el seguimiento', desc: 'Conectamos la IA con las herramientas que ya usas para que avisos y seguimientos ocurran solos.' },
    ],
    tone: 'teal',
  },
  local: {
    tag: 'El dato que importa',
    title: 'La mayoría de los negocios son <em>invisibles</em> para la IA',
    paragraphs: [
      'Cada vez más personas le preguntan a ChatGPT, a Gemini o a la IA de su WhatsApp por un servicio en lugar de buscar en Google. El problema: según el índice de visibilidad local de SOCi de 2026, ChatGPT recomienda apenas el <strong>1.2% de los negocios locales</strong>. El resto, sencillamente, no aparece.',
      'Eso es a la vez un riesgo y una oportunidad enorme. Es un terreno nuevo donde un negocio pequeño puede adelantarse a competidores más grandes, sobre todo en español, donde casi nadie está trabajando esto todavía. Te ayudamos a estar entre los que sí aparecen.',
    ],
    tone: 'teal',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Automatización con IA, <em>desde $900</em>',
    price: '$900',
    unit: 'proyecto inicial',
    lead: 'Empezamos con una solución concreta a tu mayor dolor, no con un proyecto enorme.',
    features: [
      'Asistente o automatización a medida',
      'Configurado en español',
      'Integración con tus herramientas',
      'Mensajes y respuestas listos',
      'Capacitación para tu equipo',
      'Soporte después del lanzamiento',
    ],
    cta: { label: 'Quiero automatizar mi negocio', href: '#contacto' },
    note: '$900 es el punto de partida para una automatización inicial (por ejemplo, un asistente o una agenda de citas). Los proyectos más completos se cotizan según el alcance, siempre con un precio claro por adelantado.',
    tone: 'teal',
  },
  proof: {
    tag: 'Automatización real',
    title: 'Automatización que <em>ya está en vivo</em>',
    cta: { label: 'Quiero algo así', href: '#contacto' },
    // Rosy Nails = web app de reservas (automatiza el agendado, es honesto). + Caso #0.
    items: [...proj('Rosy Nails & Care'), caso0],
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'IA para tu negocio, en <em>palabras simples</em>',
    items: [
      { q: '¿Qué tan caro es esto para un negocio pequeño?', a: 'Más accesible de lo que crees. Una automatización inicial empieza en $900 y se paga sola rápido cuando dejas de perder clientes por no contestar a tiempo. Empezamos con una sola solución a tu mayor dolor, no con un proyecto gigante, y crecemos desde ahí.' },
      { q: '¿Necesito saber de tecnología?', a: 'No, y esa es justamente la idea. Nosotros configuramos todo y te lo dejamos funcionando, con una capacitación sencilla para tu equipo. Tú te dedicas a tu negocio; de la parte técnica nos encargamos la IA y nosotros.' },
      { q: '¿Funciona en español?', a: 'Sí, y es nuestra especialidad. Configuramos los asistentes y las automatizaciones en el español de tus clientes, con el tono correcto. También en inglés si lo necesitas. Trabajamos enfocados en el mercado hispano de Estados Unidos.' },
      { q: '¿Se integra con las herramientas que ya uso?', a: 'En la mayoría de los casos, sí. Conectamos la IA con tu sitio, tu WhatsApp, tu calendario y muchas de las herramientas que ya usas. En la propuesta te decimos con honestidad qué se puede integrar y qué no, sin promesas vacías.' },
      { q: '¿Qué es eso de aparecer en ChatGPT?', a: 'Cada vez más gente le pide recomendaciones a ChatGPT o a Gemini en lugar de buscar a la antigua. Hoy esos asistentes recomiendan a muy pocos negocios locales. Preparamos tu información para que tengas más posibilidades de aparecer cuando alguien pregunte por tu tipo de servicio.' },
      { q: '¿La IA va a sonar como un robot frío?', a: 'No, si se hace bien. Escribimos los mensajes con tu tono y tu personalidad, en español natural. El objetivo es que tus clientes se sientan bien atendidos, y que sepan con claridad cuándo hablan con una persona y cuándo con un asistente.' },
    ],
  },
  cta: {
    title: 'Deja de perder clientes por <em>no contestar</em>',
    sub: 'Cuéntanos cuál es tu mayor dolor y te propondremos una solución con IA en menos de 24 horas, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'teal',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'Un sitio rápido es la base donde vive tu IA.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Aparece en Google además de en la IA.', icon: 'lucide:search' },
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: '¿Operas en Miami? También diseñamos allí.', icon: 'lucide:layout-template' },
    ],
  },
  service: {
    name: 'Inteligencia Artificial para Negocios',
    serviceType: 'Automatización con IA y asistentes conversacionales',
    description:
      'Soluciones de inteligencia artificial para PYMEs: asistentes conversacionales 24/7, automatización de WhatsApp y mensajes, agenda de citas, rescate de llamadas perdidas y visibilidad en asistentes de IA. En español, para Houston y Miami.',
    path: '/es/ia-para-pymes',
    priceValue: '900',
    providerId: ORG_ID,
  },
};

// ═══════════════════════════════════════════════════════════════
// 6 · HOUSTON — IA CONVERSACIONAL  ⭐ PÁGINA ESTRELLA (cruce DESOCUPADO)
//   Keywords validadas (jun 2026): "recepcionista virtual con IA español Houston",
//   "chatbot en español para negocios Houston". El SERP solo lo ocupan SaaS
//   globales/LATAM DIY; CERO agencia hispana local en Houston que lo INSTALE y
//   MANTENGA. Foso = ciudad × hispano-local × done-for-you. Lenguaje de DOLOR,
//   no técnico. Honestidad: sin "únicos en Houston" (superlativo no verificado);
//   stats de blogs de vendors NO se citan como datos (solo el de HBR/MIT, real).
// ═══════════════════════════════════════════════════════════════
const houstonIa: ClusterPage = {
  tool: { text: 'Tu asistente contesta lo que hoy se te escapa. Mira cuánto vale eso al mes.', linkLabel: 'Calculadora de llamadas perdidas', href: '/es/herramientas#llamadas' },
  meta: {
    title: 'IA conversacional en Houston | Asistente que contesta 24/7 | Marcyan',
    description:
      'Asistente con IA para negocios en Houston: contesta llamadas y WhatsApp perdidos, agenda citas y atiende en español 24/7. Te lo instalamos y mantenemos. Desde $900.',
  },
  path: '/es/houston/ia-conversacional',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'IA conversacional', path: '/es/houston/ia-conversacional' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'IA conversacional',
    h1: 'Asistente de IA para tu <em>negocio</em> en Houston',
    sub: '¿Se te van clientes mientras estás en una obra o manejando de Katy a Pasadena? Ponemos un asistente con IA a contestar por ti: responde por mensaje las llamadas que no tomas, agenda citas y atiende en español o en inglés a cualquier hora. Te lo instalamos y lo mantenemos.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver cómo funciona', href: '#faq' },
    chips: ['Español e inglés', 'Te lo instalamos y mantenemos', 'Siempre te pasa con una persona'],
    tone: 'teal',
  },
  // Texto propio de Houston (1-nov-2026, encargo de páginas de ciudad casi iguales): negocios que trabajan en la
  // calle y un área enorme que se maneja. Prueba real de Houston: la web app de Rosy Nails y Marcy (Caso #0).
  answer: {
    q: '¿Cómo puede un asistente de IA ayudar a un negocio en Houston?',
    a: 'Contestando en el momento en que tú no puedes. En Houston muchos negocios trabajan en la calle, en obras, mudanzas o jardines, y cada llamada sin respuesta es un cliente que marca al siguiente. Responder a un prospecto en los primeros 5 minutos multiplica hasta por 21 las probabilidades de calificarlo, frente a esperar 30, según el Lead Response Management Study del MIT.',
    source: 'Lead Response Management Study (MIT)',
  },
  includes: {
    tag: 'Qué hace por ti',
    title: 'IA que <em>no deja escapar</em> ni un cliente',
    items: [
      { icon: 'lucide:phone-missed', title: 'Contesta las llamadas que no tomas', desc: 'Si estás con un cliente, el asistente le escribe al instante por mensaje, le resuelve la duda o le agenda. No se va con la competencia.' },
      { icon: 'lucide:calendar-check', title: 'Agenda sin que sueltes la herramienta', desc: 'Tus clientes reservan solos su cita o su visita para el presupuesto, a la hora que les queda, y tú la ves en tu calendario.' },
      { icon: 'lucide:languages', title: 'Español o inglés, según quién escriba', desc: 'En Houston te llegan clientes en los dos idiomas. El asistente contesta en el que le hablen, con tu tono.' },
      { icon: 'lucide:list-filter', title: 'Filtra antes de que manejes', desc: 'Pregunta la zona, el tipo de trabajo y la fecha antes de pasarte al cliente, para que no cruces Houston por un trabajo que no te conviene.' },
      { icon: 'lucide:user-round', title: 'Siempre te pasa con una persona', desc: 'Cuando el cliente quiere hablar contigo, el asistente te pasa la conversación. Nadie queda atrapado con un robot.' },
      { icon: 'lucide:wrench', title: 'Instalado y cuidado por nosotros', desc: 'No te dejamos un programa para configurar: lo instalamos, lo entrenamos con tus servicios y precios, y lo mantenemos.' },
    ],
    tone: 'teal',
  },
  local: {
    tag: 'Por qué con nosotros',
    title: 'Una agencia de Houston que <em>te lo instala</em>, no un software que peleas solo',
    paragraphs: [
      'Hay decenas de apps de IA que te venden una suscripción y te dejan solo para configurarla. Un contratista de Pearland o un salón de Katy no tiene tiempo para eso, y la herramienta termina olvidada. Nosotros te la dejamos funcionando, entrenada con tu negocio, y la mantenemos.',
      'Ya lo hacemos para negocios de Houston: la web app de Rosy Nails & Care deja que sus clientas agenden su cita solas, y Marcy, la asistente de este sitio, contesta en español y en inglés a cualquier hora. <strong>Dominamos la IA para que tú te dediques a tu negocio.</strong>',
    ],
    tone: 'teal',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Asistente con IA, <em>desde $900</em>',
    price: '$900',
    unit: 'proyecto inicial',
    lead: 'Empezamos con una solución concreta a tu mayor dolor, no con un proyecto enorme.',
    features: [
      'Asistente configurado a medida',
      'En español y en inglés, con tu tono',
      'Integración con WhatsApp y tu calendario',
      'Mensajes y respuestas listos',
      'Capacitación para tu equipo',
      'Instalación y mantenimiento',
    ],
    cta: { label: 'Quiero automatizar mi negocio', href: '#contacto' },
    note: '$900 es el punto de partida para una primera automatización, por ejemplo el asistente que contesta las llamadas que pierdes mientras trabajas, o tu agenda de citas en línea. Incluye la instalación, el entrenamiento con tu negocio y el mantenimiento. Los proyectos más completos se cotizan según el alcance.',
    tone: 'teal',
  },
  proof: {
    tag: 'Automatización real',
    title: 'Automatización que <em>ya está en vivo</em>',
    cta: { label: 'Quiero algo así', href: '#contacto' },
    // Rosy Nails = web-app real de reservas (automatiza el agendado) + Caso #0.
    items: [...proj('Rosy Nails & Care'), caso0],
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'IA para tu negocio en Houston, en <em>simple</em>',
    items: [
      { q: '¿Cuánto cuesta poner un asistente con IA en mi negocio en Houston?', a: 'Desde $900 por la primera automatización, con la instalación, el entrenamiento y el mantenimiento incluidos. Empezamos por lo que más te cuesta hoy, por ejemplo las llamadas que pierdes en el trabajo, y crecemos desde ahí. El precio exacto va por escrito en la propuesta gratuita.' },
      { q: '¿Sirve si trabajo en la calle y no puedo contestar el teléfono?', a: 'Es justo para eso. Mientras estás en una obra, una mudanza o con un cliente, el asistente contesta por mensaje, pregunta lo necesario y agenda. Tú revisas al terminar y solo devuelves las llamadas que valen la pena.' },
      { q: '¿Contesta en inglés a los clientes que no hablan español?', a: 'Sí. Detecta el idioma en que le escriben y contesta en ese, con el mismo tono. En Houston te llegan clientes en los dos idiomas, y ninguno debería esperar a que alguien le traduzca.' },
      { q: '¿La IA puede contestar mi WhatsApp y agendar citas sola?', a: 'Sí. La conectamos con tu WhatsApp y tu calendario para que conteste y agende a cualquier hora, también los fines de semana. Antes de empezar te decimos con honestidad qué herramientas tuyas se pueden conectar y cuáles no.' },
      { q: '¿Qué pasa si el cliente quiere hablar con una persona?', a: 'Siempre puede. El asistente te pasa la conversación a ti o a tu equipo con lo que el cliente ya contó, para que no tenga que repetirlo todo.' },
      { q: '¿En cuánto tiempo queda funcionando?', a: 'Una primera automatización suele quedar lista en una a tres semanas, según qué herramientas conectemos y qué tan listas tengas tus respuestas, horarios y precios. Te damos un calendario realista desde el inicio.' },
    ],
  },
  cta: {
    title: 'Deja de perder clientes por <em>no contestar</em>',
    sub: 'Cuéntanos qué se te escapa hoy, sean llamadas en el trabajo, mensajes de noche o citas que no se agendan, y en menos de 24 horas te proponemos una solución con IA, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'teal',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'Un sitio rápido es la base donde vive tu asistente de IA.', icon: 'lucide:layout-template' },
      { label: '¿Cuánto cuesta un chatbot?', href: '/es/precios', desc: 'El precio de un asistente con IA y qué incluye.', icon: 'lucide:tag' },
    ],
  },
  service: {
    name: 'IA conversacional en Houston',
    serviceType: 'Automatización con IA y asistentes conversacionales',
    description:
      'Asistentes conversacionales con IA para negocios en Houston: rescate de llamadas y mensajes perdidos, atención por WhatsApp, agenda de citas y soporte 24/7 en español. Instalación y mantenimiento incluidos.',
    path: '/es/houston/ia-conversacional',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '900',
    providerId: HOUSTON_ID,
  },
};

// ═══════════════════════════════════════════════════════════════
// 7 · HOUSTON — E-COMMERCE / TIENDA EN LÍNEA   ($2,900)
//   Keyword validada: "diseño de tienda en línea en Houston". Nicho ocupado
//   pero fragmentado/barato; el cruce "tienda bilingüe ES/EN" está DESOCUPADO.
//   Honestidad DURA: NO hay cliente e-commerce real → sin portafolio de tiendas;
//   framing "Cliente Fundador" + proof adyacente real (web-app Rosy Nails, sitios
//   en vivo). Pagos/EIN/merchant = requisitos del cliente (decirlo claro).
// ═══════════════════════════════════════════════════════════════
const houstonEcommerce: ClusterPage = {
  meta: {
    title: 'Diseño de Tienda en línea en Houston | E-commerce bilingüe | Marcyan',
    description:
      'Diseño de tienda en línea en Houston para negocios hispanos: catálogo, pagos seguros y bilingüe (Shopify, WooCommerce o a medida). Desde $2,900. Propuesta gratis en 24h.',
  },
  path: '/es/houston/ecommerce',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'Tienda en línea', path: '/es/houston/ecommerce' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Tienda en línea',
    h1: 'Diseño de tienda en línea en <em>Houston</em>',
    sub: 'Vende las 24 horas con una tienda a medida, rápida y bilingüe: catálogo, pagos seguros y entrega local o recogida en tu negocio, para que todo Houston te compre desde el celular.',
    primary: { label: 'Cotizar mi tienda', href: '#contacto' },
    secondary: { label: 'Ver todos los precios', href: '/es/precios' },
    chips: ['Pagos seguros', 'Entrega local o recogida', 'Shopify, WooCommerce o a medida'],
    tone: 'gold',
  },
  // Texto propio de Houston (1-nov-2026, encargo de páginas de ciudad casi iguales): impuesto de ventas de Texas
  // (6.25% estatal; 8.25% en total en la ciudad de Houston; permiso de ventas gratuito, Texas Comptroller) y
  // entrega local en un área extensa. Sin tiendas publicadas todavía: prueba adyacente real de Houston.
  answer: {
    q: '¿Cuánto cuesta una tienda en línea en Houston?',
    a: 'Una tienda en línea profesional en Houston empieza en $2,900 e incluye catálogo, carrito, pagos seguros y versión bilingüe. Lo que más mueve el precio es el número de productos, las funciones que necesites y si hay que mudar una tienda que ya tienes. Y vender en línea ya no es un extra: el comercio electrónico supera el 16% de las ventas minoristas en Estados Unidos, según el U.S. Census Bureau.',
    source: 'U.S. Census Bureau',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Una tienda lista para <em>vender en Houston</em>',
    items: [
      { icon: 'lucide:shopping-bag', title: 'Catálogo y carrito', desc: 'Productos con fotos, tallas, colores y precios claros, y un carrito que no se pierde en el celular.' },
      { icon: 'lucide:credit-card', title: 'Pagos con tarjeta y PayPal', desc: 'Pasarelas confiables como Stripe y PayPal. Te guiamos con la cuenta y con lo que pide cada una.' },
      { icon: 'lucide:truck', title: 'Entrega local o recogida', desc: 'Zonas de entrega con su costo, o recogida en tu negocio, para venderle a Houston sin pagar paquetería en cada pedido.' },
      { icon: 'lucide:receipt', title: 'Impuesto de Texas configurado', desc: 'La tienda cobra el impuesto de ventas que corresponde: en Texas es 6.25% estatal más la parte local, 8.25% en total en Houston.' },
      { icon: 'lucide:languages', title: 'Bilingüe español e inglés', desc: 'La misma tienda en los dos idiomas, para venderle a tu comunidad en español y a todo Houston en inglés.' },
      { icon: 'lucide:settings', title: 'La plataforma correcta para ti', desc: 'Shopify, WooCommerce o a medida, según tu producto y tu presupuesto. Te explicamos por qué antes de elegir.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Cómo lo hacemos',
    title: 'Una tienda pensada para <em>vender en Texas</em>',
    paragraphs: [
      'Elegimos la plataforma contigo, sin casarnos con ninguna: Shopify si quieres lanzar rápido y vender simple, WooCommerce si ya usas WordPress o necesitas más control, y a medida si tu caso no cabe en ninguna. Te decimos con números cuánto pagas cada mes en cada opción.',
      'Para vender en Texas hay trámites que son tuyos: una cuenta para recibir pagos, tu EIN del IRS según el caso y el permiso de ventas del estado (Texas Sales and Use Tax Permit), que es gratuito. <strong>Te guiamos paso a paso</strong> y dejamos la tienda lista en español y en inglés, para que le vendas a todo Houston.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Tienda en línea, <em>desde $2,900</em>',
    price: '$2,900',
    unit: 'proyecto único',
    lead: 'Pago por proyecto. El precio depende del número de productos y de las funciones que necesites.',
    features: [
      'Diseño a medida de tu tienda',
      'Catálogo y carrito de compras',
      'Pagos seguros (tarjeta y PayPal)',
      'Versión en español e inglés',
      'Optimización SEO base',
      'Lista para móvil y para la IA',
    ],
    cta: { label: 'Cotizar mi tienda', href: '#contacto' },
    note: '$2,900 es el punto de partida para una tienda profesional. El precio final depende del número de productos, las funciones (suscripciones, envíos, integraciones) y la migración si ya tienes una tienda. El mantenimiento y la actualización de productos se cotizan aparte, siempre con un precio claro.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Construimos a medida, y <em>buscamos tu tienda</em>',
    cta: { label: 'Sé nuestro primer caso de e-commerce', href: '#contacto' },
    // Honestidad: NO hay cliente e-commerce. Mostramos capacidad real (web-app a
    // medida de Rosy Nails + sitios en vivo), etiquetada por lo que es. Sin
    // insinuar que son tiendas. El FAQ aclara el framing "Cliente Fundador".
    items: proj('Rosy Nails & Care', 'Texas Rush Remove', "Julio's Landscape TX"),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Tu tienda en línea en Houston, <em>claro</em>',
    items: [
      { q: '¿Cuánto cuesta hacer una tienda en línea en Houston?', a: 'Una tienda profesional a medida empieza en $2,900. El precio final depende del número de productos, las funciones (suscripciones, envíos, integraciones) y si hay que migrar una tienda existente. Te entregamos un presupuesto claro y por escrito en la propuesta gratuita, sin costos ocultos.' },
      { q: '¿Qué es mejor para mi tienda: Shopify o WooCommerce?', a: 'Depende de tu caso. Shopify es ideal para lanzar rápido y vender simple, sin preocuparte por lo técnico; WooCommerce te da más control y encaja si ya usas WordPress. Para necesidades especiales construimos a medida. Lo elegimos contigo con honestidad, según tu producto y tu presupuesto.' },
      { q: '¿Mi tienda cobra el impuesto de ventas de Texas?', a: 'Sí, la dejamos configurada para cobrarlo. En Texas el impuesto estatal es 6.25% y cada ciudad suma su parte; en Houston el total es 8.25%. Para cobrarlo necesitas el permiso de ventas del Contralor de Texas, que es gratuito, y tu contador confirma qué aplica a tus productos.' },
      { q: '¿Puedo ofrecer entrega local o que recojan en mi negocio?', a: 'Sí. Configuramos zonas de entrega con su precio, o recogida en tu local. En un área tan extensa como Houston sirve para no pagar paquetería en cada pedido y para que el cliente de tu zona reciba antes.' },
      { q: '¿La tienda es bilingüe en español e inglés?', a: 'Sí, y es una de nuestras ventajas. Diseñamos tu tienda en español e inglés desde el inicio, para que vendas en español a tu comunidad y amplíes tu alcance en inglés: un cruce que pocos competidores en Houston aprovechan.' },
      { q: '¿Tienen tiendas en línea ya hechas que pueda ver?', a: 'Seremos honestos: estamos comenzando con e-commerce, así que todavía no publicamos un caso de tienda propio. Sí construimos web-apps y sitios a medida que ya están en vivo (como la app de reservas de Rosy Nails). Por eso ofrecemos cupos de Cliente Fundador para tu tienda, con condiciones especiales.' },
    ],
  },
  cta: {
    title: 'Empieza a vender en línea en <em>Houston</em>',
    sub: 'Cuéntanos qué vendes y cuántos productos tienes, y recibe una propuesta de tienda en línea en menos de 24 horas, sin compromiso.',
    primary: { label: 'Cotizar mi tienda gratis', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'Si aún no necesitas vender en línea, empieza por tu sitio.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que tu tienda aparezca en Google y en Maps.', icon: 'lucide:search' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Un asistente que contesta y agenda 24/7.', icon: 'lucide:messages-square' },
    ],
  },
  service: {
    name: 'Diseño de Tienda en línea en Houston',
    serviceType: 'Diseño de tienda en línea (e-commerce)',
    description:
      'Diseño y desarrollo de tiendas en línea a medida para negocios en Houston: catálogo, carrito, pagos seguros, bilingüe (español e inglés), en Shopify, WooCommerce o a medida.',
    path: '/es/houston/ecommerce',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '2900',
    providerId: HOUSTON_ID,
  },
};

// ═══════════════════════════════════════════════════════════════
// 10 · HOUSTON — BRANDING E IDENTIDAD ($750)  [Ola 2 · B2]
//   Keyword "diseño de logo / branding houston". SERVICIO profesional (NO DIY).
//   PROOF REAL: Julio's Landscape TX (marca+identidad+sitio desde cero). Ángulo
//   honesto sobre el rol de la IA: exploración amplia, decisiones de diseñador. Stat
//   académico real (Lindgaard et al. 2006, primera impresión visual = 50 ms).
// ═══════════════════════════════════════════════════════════════
const houstonBranding: ClusterPage = {
  meta: {
    title: 'Diseño de Logo y Marca en Houston | Branding bilingüe | Marcyan',
    description:
      'Diseño de logo e identidad de marca en Houston para negocios hispanos: logo, paleta, tipografías y guía de uso. A medida, en español, desde $750. Propuesta gratis en 24h.',
  },
  path: '/es/houston/branding',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'Branding e identidad', path: '/es/houston/branding' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Branding e identidad',
    h1: 'Diseño de logo y marca en <em>Houston</em>',
    sub: 'Una identidad que se ve profesional y se siente tuya: logo, colores, tipografía y un sistema visual coherente. Diseñada a medida, en español, para que tu negocio en Houston cause una excelente primera impresión.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver todos los precios', href: '/es/precios' },
    chips: ['Desde $750', 'A medida, no plantillas', 'Archivos listos para usar'],
    tone: 'gold',
  },
  answer: {
    q: '¿Cuánto cuesta el diseño de logo y marca en Houston?',
    a: 'El diseño de logo y marca en Houston con Marcyan empieza en $750 e incluye logo, paleta de color, tipografías y una guía de uso. La inversión importa: un estudio académico (Lindgaard et al., 2006) halló que la primera impresión visual se forma en apenas 50 milisegundos. Te entregamos una identidad coherente y lista para usar.',
    source: 'Lindgaard et al., 2006 · Behaviour & Information Technology',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Una marca <em>completa</em>, no solo un logo',
    items: [
      { icon: 'lucide:pen-tool', title: 'Logo a medida', desc: 'Diseñado desde cero alrededor de tu negocio, con las variantes que necesitas para cada uso.' },
      { icon: 'lucide:palette', title: 'Paleta de color', desc: 'Colores que transmiten la personalidad de tu marca y funcionan en pantalla e impresión.' },
      { icon: 'lucide:type', title: 'Tipografías', desc: 'La selección de fuentes que le da voz y coherencia a todo lo que comunicas.' },
      { icon: 'lucide:book-open', title: 'Guía de uso', desc: 'Un documento claro de cómo usar tu marca, para que se vea consistente en todos lados.' },
      { icon: 'lucide:folder', title: 'Archivos listos', desc: 'Tu logo en todos los formatos que necesitas (vectorial, PNG, PDF), listos para usar.' },
      { icon: 'lucide:sparkles', title: 'Marca pensada, no plantilla', desc: 'Exploramos muchas direcciones para tu marca y un diseñador define y refina la final. Estrategia y criterio en cada decisión.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Cómo lo hacemos',
    title: 'Exploración amplia, decisiones de <em>diseñador</em>',
    paragraphs: [
      'Las herramientas de hoy nos permiten explorar muchas más direcciones creativas en menos tiempo. Lo que no cambia es quién decide: un diseñador define la dirección, refina cada detalle y se asegura de que tu marca diga lo correcto. Recibes una marca con estrategia, no una plantilla generada al azar.',
      'Y si lo que necesitas es marca <strong>y</strong> sitio web, lo hacemos junto: tu identidad y tu página nacen coherentes desde el primer día. Diseñamos para el mercado hispano de Houston, en español, con el tono que conecta con tu cliente.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Branding e identidad, <em>desde $750</em>',
    price: '$750',
    unit: 'proyecto único',
    lead: 'Pago por proyecto. El precio depende del alcance: solo logo o un sistema de marca completo.',
    features: [
      'Logo a medida y sus variantes',
      'Paleta de color y tipografías',
      'Guía de uso de la marca',
      'Archivos listos para usar',
      'Conceptos explorados con IA',
      'Opción de sumar tu sitio web',
    ],
    cta: { label: 'Quiero mi marca', href: '#contacto' },
    note: '$750 es el punto de partida para una identidad de marca. El precio final depende del alcance: desde un logo con lo esencial hasta un sistema visual completo. Si lo combinas con tu página web, te damos un alcance y un precio claros para todo el proyecto.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Marcas y sitios <em>creados desde cero</em>',
    cta: { label: 'Inicia tu marca', href: '#contacto' },
    // Julio's = marca+identidad+sitio desde cero (proof de branding real). El resto, a medida.
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Diseño de marca en Houston, <em>claro</em>',
    items: [
      { q: '¿Cuánto cuesta el diseño de un logo profesional en Houston?', a: 'Empieza en $750 e incluye el logo a medida con sus variantes, paleta de color, tipografías y una guía de uso. El precio final depende del alcance: desde lo esencial de un logo hasta un sistema de marca completo. Te damos un presupuesto claro en la propuesta gratuita.' },
      { q: '¿Qué incluye un paquete de identidad de marca?', a: 'Logo y sus variantes, paleta de color, selección de tipografías, una guía de uso para que tu marca se vea consistente, y los archivos finales en todos los formatos que necesitas. Si quieres, sumamos tu página web para que todo nazca coherente.' },
      { q: '¿Cuál es la diferencia entre un logo y la identidad de marca?', a: 'El logo es el símbolo de tu negocio; la identidad de marca es todo el sistema visual a su alrededor: colores, tipografías, estilo y las reglas para usarlos. Un logo solo te identifica; una identidad completa hace que tu negocio se vea profesional y coherente en todos lados.' },
      { q: '¿Cómo se aseguran de que mi marca no parezca una plantilla?', a: 'Exploramos una gama amplia de direcciones y un diseñador toma todas las decisiones de estrategia y refinamiento, con tu negocio y tu cliente en mente. Recibes una marca pensada, con guía de uso, no un logo genérico.' },
      { q: '¿El diseño de marca incluye la página web?', a: 'Puede incluirla. El branding y el sitio web son servicios distintos, pero los combinamos a menudo porque juntos quedan coherentes desde el inicio. Si quieres marca y sitio, te damos un alcance y un precio claros para todo el proyecto.' },
      { q: '¿Atienden a negocios hispanos y en español?', a: 'Sí, es nuestra especialidad. Trabajamos enfocados en el mercado hispano de Houston: diseñamos y te acompañamos en español, con el contexto cultural correcto para que tu marca conecte con tu cliente.' },
    ],
  },
  cta: {
    title: 'Dale a tu negocio una <em>marca a su altura</em>',
    sub: 'Cuéntanos sobre tu negocio y recibe una propuesta de branding personalizada en menos de 24 horas, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'Suma tu sitio para que marca y web nazcan coherentes.', icon: 'lucide:layout-template' },
      { label: 'Agencia en Houston', href: '/es/houston', desc: 'Todos nuestros servicios para negocios de Houston.', icon: 'lucide:map-pin' },
      { label: 'Todos los precios', href: '/es/precios', desc: 'El precio de arranque de cada servicio y qué incluye.', icon: 'lucide:tag' },
    ],
  },
  service: {
    name: 'Branding e identidad en Houston',
    serviceType: 'Diseño de marca (branding)',
    description:
      'Diseño de logo e identidad de marca a medida para negocios en Houston: logo y variantes, paleta de color, tipografías, guía de uso y archivos finales. En español, con opción de sumar el sitio web.',
    path: '/es/houston/branding',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '750',
    providerId: HOUSTON_ID,
  },
};

// ── Registro de las landings (clave = slug de ruta) ──
// ═══════════════════════════════════════════════════════════════
// SILO MIAMI (Ola 2 · Bloque 3). Contexto GENUINO de Miami (NO clon de Houston):
//   Miami-Dade ~69% hispano (Census) — mayoría absoluta, español = lengua del
//   comercio. Liderado por cubanos (~51%) pero pan-latino: venezolanos (Doral),
//   colombianos (Kendall/Brickell), nicaragüenses (Sweetwater). Español CARIBEÑO
//   (NO modismos mexicanos). Mercado SATURADO en web/SEO → diferenciar por
//   honestidad/AEO, NO precio. Honestidad DURA: SIN clientes en Miami → Cliente
//   Fundador + proof etiquetado por su ciudad real (Houston/Orlando), nunca Miami.
// ═══════════════════════════════════════════════════════════════
const miamiIa: ClusterPage = {
  tool: { text: 'Tu asistente contesta lo que hoy se te escapa. Mira cuánto vale eso al mes.', linkLabel: 'Calculadora de llamadas perdidas', href: '/es/herramientas#llamadas' },
  meta: {
    title: 'IA conversacional en Miami | Asistente que contesta 24/7 | Marcyan',
    description:
      'Asistente con IA para negocios de Miami: contesta WhatsApp y llamadas perdidas, agenda citas y atiende en español 24/7. Te lo instalamos y mantenemos. Desde $900.',
  },
  path: '/es/miami/ia-conversacional',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Miami', path: '/es/miami' },
    { name: 'IA conversacional', path: '/es/miami/ia-conversacional' },
  ],
  hero: {
    badge: 'Miami, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'IA conversacional',
    h1: 'Asistente de IA para tu <em>negocio</em> en Miami',
    sub: 'En Miami el cliente escribe por WhatsApp y espera respuesta ya, a veces a medianoche. Ponemos un asistente con IA a contestar por ti: responde, toma reservas y citas, y habla el español de tus clientes, o inglés si lo prefieren. Te lo instalamos y lo mantenemos.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver cómo funciona', href: '#faq' },
    chips: ['El español de Miami', 'WhatsApp y reservas', 'Siempre te pasa con una persona'],
    tone: 'teal',
  },
  // Texto propio de Miami (1-nov-2026, encargo de páginas de ciudad casi iguales): WhatsApp, reservas fuera de
  // horario y el español de cada cliente. El dato del MIT se queda en la página de Houston.
  answer: {
    q: '¿Cómo puede un asistente de IA ayudar a un negocio en Miami?',
    a: 'Contestando al momento, en el canal donde te escriben. En Miami muchos clientes escriben primero por WhatsApp, y muchas veces fuera de horario. Un asistente de IA les responde en segundos, en su español o en inglés, agenda la cita o la reserva y te pasa la conversación cuando hace falta una persona. El que contesta primero suele quedarse con la venta.',
  },
  includes: {
    tag: 'Qué hace por ti',
    title: 'IA que <em>no deja escapar</em> ni un cliente',
    items: [
      { icon: 'lucide:message-circle', title: 'Contesta WhatsApp y mensajes', desc: 'WhatsApp es el canal donde el cliente cubano, venezolano o colombiano de Miami te escribe. La IA responde y da seguimiento a cualquier hora, hasta de madrugada.' },
      { icon: 'lucide:calendar-check', title: 'Agenda citas y reservas solo', desc: 'Tu restaurante, tu clínica estética o tu taller llenan la agenda sin que pares de trabajar: el cliente reserva por su cuenta, de día o de noche.' },
      { icon: 'lucide:phone-missed', title: 'Rescata llamadas perdidas', desc: 'Cuando no puedes contestar, la IA responde por mensaje al instante para que el cliente no se vaya con el de al lado.' },
      { icon: 'lucide:languages', title: 'Habla como se habla en Miami', desc: 'Lo configuramos en el español que de verdad usan tus clientes, con su acento y su tono. No suena a traducción ni a robot, y detecta si prefieren inglés.' },
      { icon: 'lucide:user-round', title: 'Sabe cuándo llamarte', desc: 'Si el cliente pide una persona o el caso es delicado, te pasa la conversación con lo que ya contó. Nadie queda dando vueltas con un robot.' },
      { icon: 'lucide:wrench', title: 'Nosotros lo mantenemos', desc: 'Cambias el menú, los precios o el horario y nos avisas: lo actualizamos nosotros. Tú no tocas nada.' },
    ],
    tone: 'teal',
  },
  local: {
    tag: 'Por qué con nosotros',
    title: 'Te lo dejamos <em>contestando</em>, no una app más que configurar',
    paragraphs: [
      'Las apps de IA que se venden por suscripción te dejan solo con la configuración, y entre el servicio de la noche y el cierre de caja nadie tiene tiempo para eso. Nosotros te lo dejamos funcionando, entrenado con tu negocio, y lo mantenemos al día.',
      'En Miami eso pesa todavía más: aquí el primer contacto pasa por WhatsApp, desde la cafetería de Hialeah hasta la clínica de Brickell, y casi siempre en español. Configuramos el asistente para que hable como tus clientes (cubano, venezolano, colombiano) y conteste al instante. <strong>Dominamos la IA para que tú atiendas a tu gente.</strong>',
    ],
    tone: 'teal',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Asistente con IA, <em>desde $900</em>',
    price: '$900',
    unit: 'proyecto inicial',
    lead: 'Empezamos por el canal que más clientes te trae, muchas veces WhatsApp, y crecemos desde ahí.',
    features: [
      'Asistente configurado a medida',
      'En el español de tus clientes',
      'WhatsApp, reservas y calendario conectados',
      'Respuestas con tu menú, precios y horario',
      'Capacitación para tu equipo',
      'Instalación y mantenimiento',
    ],
    cta: { label: 'Quiero automatizar mi negocio', href: '#contacto' },
    note: '$900 es el punto de partida para una primera automatización, por ejemplo el asistente que contesta tu WhatsApp y toma reservas fuera de horario. Va con la instalación, el entrenamiento con tu negocio y el mantenimiento. Si quieres más canales o integraciones, lo cotizamos según el alcance.',
    tone: 'teal',
  },
  proof: {
    tag: 'Automatización real',
    title: 'IA que ya atiende, <em>hecha por nosotros</em>',
    cta: { label: 'Quiero algo así', href: '#contacto' },
    // Caso #0 (Marcy, este sitio) + Rosy Nails = web-app real de reservas, de Houston (su tarjeta lo dice). NO son de Miami.
    items: [caso0, ...proj('Rosy Nails & Care')],
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'IA para tu negocio en Miami, en <em>simple</em>',
    items: [
      { q: '¿Cuánto cuesta un asistente con IA para mi negocio en Miami?', a: 'Desde $900 por la primera automatización, por ejemplo contestar tu WhatsApp y tomar reservas. Incluye instalarlo, entrenarlo con tu negocio y mantenerlo. Te damos el precio exacto por escrito en la propuesta gratuita.' },
      { q: '¿El asistente habla en el español de Miami o suena como robot?', a: 'Habla como tus clientes: el español que de verdad se usa en Miami (cubano, venezolano, colombiano), con el tono de tu negocio. No es una traducción robótica, y detecta si el cliente prefiere inglés.' },
      { q: '¿Puede tomar las reservas de mi restaurante por WhatsApp?', a: 'Sí. Contesta, ofrece los horarios libres y deja la reserva anotada, también de madrugada. Lo mismo vale para las citas de una clínica, un salón o un taller. En la propuesta te decimos qué sistema de reservas tuyo se puede conectar y cuál no.' },
      { q: '¿Funciona con turistas y clientes que escriben en inglés?', a: 'Sí. Detecta el idioma y contesta en inglés a quien escribe en inglés, algo que en Miami pasa a diario con visitantes y con clientes que no hablan español.' },
      { q: '¿Necesito saber de tecnología para usarlo?', a: 'No. Lo instalamos, lo conectamos a tu WhatsApp y te enseñamos en una sesión corta a revisar las conversaciones. Si algo cambia en tu negocio, nos escribes y lo ajustamos.' },
      { q: '¿En cuánto tiempo queda listo?', a: 'En una a tres semanas, según los canales que conectemos y qué tan listos estén tu menú, tus precios y tus horarios.' },
    ],
  },
  cta: {
    title: 'Que ningún WhatsApp se quede <em>sin respuesta</em>',
    sub: 'En Miami, el cliente que te escribe por WhatsApp y no recibe respuesta se va con otro. Cuéntanos tu mayor dolor y te propondremos una solución con IA en menos de 24 horas, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'teal',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: 'Un sitio rápido es la base donde vive tu asistente de IA.', icon: 'lucide:layout-template' },
      { label: '¿Cuánto cuesta un chatbot?', href: '/es/precios', desc: 'El precio de un asistente con IA y qué incluye.', icon: 'lucide:tag' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'El mismo servicio, en nuestra base de operaciones.', icon: 'lucide:messages-square' },
    ],
  },
  service: {
    name: 'IA conversacional en Miami',
    serviceType: 'Automatización con IA y asistentes conversacionales',
    description:
      'Asistentes conversacionales con IA para negocios en Miami: rescate de WhatsApp y llamadas perdidas, agenda de citas y soporte 24/7 en el español de los clientes de Miami. Instalación y mantenimiento incluidos.',
    path: '/es/miami/ia-conversacional',
    areaCity: 'Miami',
    areaRegion: 'Florida',
    priceValue: '900',
    providerId: MIAMI_ID,
  },
};

const miamiSeo: ClusterPage = {
  meta: {
    title: 'SEO local en Miami: posiciona tu negocio en Google | Marcyan',
    description:
      'Agencia de SEO local en Miami para negocios hispanos. Optimizamos tu Perfil de Google, tu sitio y tus reseñas para que te encuentren en Miami-Dade. Propuesta gratis en 24h.',
  },
  path: '/es/miami/seo-local',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Miami', path: '/es/miami' },
    { name: 'SEO local', path: '/es/miami/seo-local' },
  ],
  hero: {
    badge: 'Miami, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'SEO local',
    h1: 'SEO local en <em>Miami</em>',
    sub: 'Aparece cuando te buscan en Google Maps y en la IA, en español o en inglés, de Hialeah a Kendall. Preparamos tu ficha, tu web y tus reseñas para que te llamen a ti.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver cómo trabajamos', href: '#proceso' },
    chips: ['SEO en español', 'Sin contratos eternos', 'Reportes claros'],
    tone: 'gold',
  },
  // Texto propio de Miami (1-nov-2026, encargo de páginas de ciudad casi iguales): dos idiomas, barrios con su
  // gente, sin oficina. Datos del U.S. Census Bureau (los mismos del hub de Miami). Prueba real: MJA, rotulado con
  // su ciudad de verdad (Orlando, Florida), como en el hub; TRR va con la suya (Houston). Nada se presenta como Miami.
  answer: {
    q: '¿Qué es el SEO local y cómo ayuda a un negocio en Miami?',
    a: 'El SEO local es el trabajo que hace que tu negocio salga cuando alguien busca tu servicio cerca, en Google Maps o en la IA. En Miami se juega en dos idiomas: el 75% de los residentes de Miami-Dade de 5 años o más habla en casa un idioma distinto del inglés, según el U.S. Census Bureau, y muchos buscan en español. Si tu ficha y tu web solo hablan inglés, esa búsqueda se la lleva otro.',
    source: 'U.S. Census Bureau, ACS 2019-2023 (5 años)',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'SEO local para el Miami <em>que busca en dos idiomas</em>',
    items: [
      { icon: 'lucide:map-pin', title: 'Tu ficha de Google, en dos idiomas', desc: 'Categorías, servicios, fotos y descripción pensadas para el cliente que te busca en español y para el que te busca en inglés.' },
      { icon: 'lucide:file-text', title: 'Páginas por barrio', desc: 'Como las de Doral y Hialeah de este sitio: cada barrio fuerte para tu negocio con su página propia, escrita para su gente.' },
      { icon: 'lucide:star', title: 'Reseñas en español', desc: 'Te ayudamos a pedir reseñas a cada cliente y a contestarlas en su idioma. Una reseña en español le dice al siguiente cliente que aquí lo van a entender.' },
      { icon: 'lucide:list-checks', title: 'Los mismos datos en todas partes', desc: 'Nombre, teléfono y zonas idénticos en Google, Bing, Apple Maps y directorios, para que ni Google ni la IA duden de quién eres.' },
      { icon: 'lucide:languages', title: 'SEO en español de verdad', desc: 'Investigamos cómo se busca tu servicio en el español de Miami, que no es el de un traductor, y escribimos para esas búsquedas.' },
      { icon: 'marcyan-ai', title: 'Listo para la IA', desc: 'Tu información en Bing y en un formato que ChatGPT y Gemini pueden leer y citar, como ya pasa con Move Junk Away, nuestro cliente de Orlando, en la IA de Google.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué local',
    title: 'En Miami, el español <em>manda</em>',
    paragraphs: [
      'Miami-Dade es uno de los mercados más hispanos de Estados Unidos: cerca del 69% de su población es latina, según el U.S. Census Bureau. Aquí el español es la lengua del comercio y la competencia suele estar a pocas cuadras, así que salir en el «paquete local» de Google Maps, en español, puede ser la diferencia entre una llamada y un cliente perdido.',
      'Y cada barrio busca a su manera: Hialeah es cubano de raíz, Doral tiene una fuerte comunidad venezolana, Kendall y Brickell mucha presencia colombiana. <strong>Escribimos para cada uno en su español</strong>, y trabajamos todo Miami-Dade como negocio de área de servicio, sin oficina que visitar.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'SEO local, <em>desde $600 al mes</em>',
    price: '$600',
    unit: '/mes',
    lead: 'Sin contratos eternos. Empezamos por el barrio y el idioma donde más te buscan, y crecemos desde ahí.',
    features: [
      'Optimización del Perfil de Google de Negocio',
      'NAP en directorios clave',
      '1 página local optimizada al mes',
      'Gestión de reseñas',
      'Reporte mensual claro',
      'Soporte bilingüe',
    ],
    cta: { label: 'Propuesta gratis', href: '#contacto' },
    note: 'El precio final depende de cuántos barrios y servicios trabajemos, si lo hacemos en uno o en dos idiomas, y de tu competencia en Miami. Te damos el alcance por escrito en la propuesta.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'SEO local que ya posiciona, en <em>Florida</em> y en Texas',
    cta: { label: 'Sé nuestro primer caso en Miami', href: '#contacto' },
    // Honestidad: todavía NO hay cliente de SEO en Miami. MJA va primero por cercanía (decisión del dueño,
    // 31-oct y 1-nov) y su tarjeta dice Orlando, FL; TRR dice Houston, TX. El FAQ lo cuenta igual.
    items: proj('Move Junk Away', 'Texas Rush Remove'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'SEO local en Miami, sin <em>letra chica</em>',
    items: [
      { q: '¿Cuánto cuesta el SEO local en Miami?', a: 'Desde $600 al mes, sin contratos a largo plazo. En Miami el precio depende sobre todo de dos cosas: cuántos barrios quieres cubrir y si trabajamos tu presencia en español, en inglés o en los dos. Te lo damos por escrito en la propuesta gratuita, antes de que decidas.' },
      { q: '¿Tienen clientes en Miami?', a: 'Todavía no tenemos un caso publicado en Miami, y no te lo vamos a inventar. Nuestro trabajo más cercano es Move Junk Away, en Orlando: le rehicimos el sitio con SEO local y ya posiciona en su zona. También tenemos casos en Houston, y con gusto te los enseñamos en una llamada. Por eso ofrecemos cupos de Cliente Fundador en Miami.' },
      { q: '¿Mi negocio debe salir en español o en inglés?', a: 'En Miami, casi siempre en los dos. La mayoría de la gente habla español en casa, pero muchos servicios se buscan en inglés, como «dentist near me». Preparamos tu ficha y tus páginas para las dos búsquedas, sin traducciones que se noten.' },
      { q: '¿Puedo salir en Doral, Hialeah y Kendall a la vez?', a: 'Sí, si das servicio en esos barrios. Los marcamos como zonas en tu Perfil de Google, creamos una página propia para cada barrio fuerte y pedimos reseñas a clientes de cada uno. Nada de direcciones falsas ni oficinas virtuales: Google las castiga.' },
      { q: '¿Necesito una oficina en Miami para salir en Google Maps?', a: 'No. Si atiendes en casa del cliente o a domicilio, Google te deja ocultar la dirección y marcar las zonas que cubres. Así trabajamos nosotros también: como negocio de área de servicio en todo Miami-Dade.' },
      { q: '¿En cuánto tiempo se ven resultados, y garantizan el primer lugar?', a: 'Las primeras señales, más vistas y más llamadas desde tu ficha, suelen llegar entre 2 y 8 semanas. En las búsquedas más peleadas de Miami, subir al mapa puede tomar de 3 a 6 meses. Nadie puede garantizarte el primer lugar; lo que sí te damos cada mes es un reporte claro con lo que hicimos y lo que pasó.' },
    ],
  },
  cta: {
    title: 'Sé uno de nuestros primeros <em>casos en Miami</em>',
    sub: 'Buscamos Clientes Fundadores en Miami. Dinos tu barrio y en qué idioma te buscan tus clientes, y recibe una propuesta de SEO local en menos de 24 horas, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: 'Un sitio rápido y a medida es la base de todo buen SEO.', icon: 'lucide:layout-template' },
      { label: 'IA conversacional en Miami', href: '/es/miami/ia-conversacional', desc: 'Atiende y capta clientes 24/7 con un asistente en español.', icon: 'lucide:messages-square' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'El mismo servicio, en nuestra base de operaciones.', icon: 'lucide:search' },
    ],
  },
  service: {
    name: 'SEO local en Miami',
    serviceType: 'SEO local',
    description:
      'Optimización de SEO local para negocios en Miami: Perfil de Google de Negocio, consistencia NAP, contenido local bilingüe, gestión de reseñas y preparación para asistentes de IA.',
    path: '/es/miami/seo-local',
    areaCity: 'Miami',
    areaRegion: 'Florida',
    priceValue: '600',
    monthly: true,
    providerId: MIAMI_ID,
  },
};

const miamiEcommerce: ClusterPage = {
  meta: {
    title: 'Diseño de Tienda en línea en Miami | E-commerce bilingüe | Marcyan',
    description:
      'Diseño de tienda en línea en Miami para negocios hispanos: catálogo, pagos seguros y bilingüe (Shopify, WooCommerce o a medida). Desde $2,900. Propuesta gratis en 24h.',
  },
  path: '/es/miami/ecommerce',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Miami', path: '/es/miami' },
    { name: 'Tienda en línea', path: '/es/miami/ecommerce' },
  ],
  hero: {
    badge: 'Miami, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Tienda en línea',
    h1: 'Diseño de tienda en línea en <em>Miami</em>',
    sub: 'Una web para vender en Miami las 24 horas: tienda a medida, rápida y bilingüe, con pagos seguros para tu cliente de aquí y para el que te compra desde fuera. Lista para el celular, en español y en inglés.',
    primary: { label: 'Cotizar mi tienda', href: '#contacto' },
    secondary: { label: 'Ver todos los precios', href: '/es/precios' },
    chips: ['Pagos de aquí y de fuera', 'Bilingüe ES/EN', 'Shopify, WooCommerce o a medida'],
    tone: 'gold',
  },
  // Texto propio de Miami (1-nov-2026, encargo de páginas de ciudad casi iguales): impuesto de ventas de Florida
  // (6% estatal + 1% de recargo de Miami-Dade = 7%; registro con el Florida Department of Revenue), venta a
  // Latinoamérica y la búsqueda real «web para vender en miami». El dato del Census se queda en Houston.
  answer: {
    q: '¿Cuánto cuesta una tienda en línea en Miami?',
    a: 'Una tienda en línea profesional en Miami empieza en $2,900, con catálogo, carrito, pagos seguros y versión bilingüe. En Miami conviene pensarla desde el inicio para dos públicos: la comunidad hispana de aquí y el cliente de fuera, de otros estados o de Latinoamérica, que compra en dólares y quiere pagar con tarjeta o PayPal.',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Una tienda para vender <em>en Miami y más allá</em>',
    items: [
      { icon: 'lucide:shopping-bag', title: 'Catálogo en dos idiomas', desc: 'Fichas de producto con fotos, variantes y descripciones escritas en español y en inglés, no traducidas a máquina.' },
      { icon: 'lucide:credit-card', title: 'Pagos seguros, también de fuera', desc: 'Aceptas tarjeta y PayPal con pasarelas confiables como Stripe, incluido el cliente que paga desde Latinoamérica. Te guiamos con la cuenta y los requisitos.' },
      { icon: 'lucide:receipt', title: 'Impuesto de Florida configurado', desc: 'La tienda cobra el impuesto de ventas que toca: en Florida es 6% estatal y Miami-Dade suma 1%, un 7% en total.' },
      { icon: 'lucide:languages', title: 'Bilingüe para Miami y la región', desc: 'Le vendes en español a la comunidad cubana, venezolana y colombiana de Miami, y amplías tu alcance en inglés, todo en la misma tienda.' },
      { icon: 'lucide:package', title: 'Envíos dentro y fuera del país', desc: 'Tarifas de envío para Miami, para otros estados y, si tu producto lo permite, para Latinoamérica.' },
      { icon: 'lucide:search', title: 'Lista para Google y la IA', desc: 'Que tu tienda salga cuando buscan tu producto en Miami, en Google y en asistentes como ChatGPT.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Cómo lo hacemos',
    title: '¿Shopify, WooCommerce o <em>a medida</em>?',
    paragraphs: [
      'En Miami hay tiendas para todo, desde la repostería de Hialeah hasta la marca de moda de Wynwood, y cada una pide su plataforma. No vendemos una sola a la fuerza: Shopify para lanzar rápido y vender simple, WooCommerce si necesitas más control o ya usas WordPress, y a medida para lo especial. Lo elegimos contigo, con honestidad, según tu producto y tu presupuesto.',
      'Para vender en Florida te registras para cobrar el impuesto de ventas con el Florida Department of Revenue, abres una cuenta para recibir pagos y, según el caso, sacas tu EIN del IRS. <strong>Te acompañamos en cada paso</strong>, y como Miami es puerta de Latinoamérica, dejamos la tienda lista en español y en inglés para venderle a la comunidad de aquí y a la de fuera.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Tienda en línea, <em>desde $2,900</em>',
    price: '$2,900',
    unit: 'proyecto único',
    lead: 'Pago por proyecto. Lo que mueve el precio es cuántos productos tienes, en cuántos idiomas los vendes y a dónde envías.',
    features: [
      'Diseño a medida de tu tienda',
      'Catálogo y carrito de compras',
      'Pagos con tarjeta y PayPal, también de fuera',
      'Fichas en español e inglés',
      'Optimización SEO base',
      'Lista para móvil y para la IA',
    ],
    cta: { label: 'Cotizar mi tienda', href: '#contacto' },
    note: '$2,900 es el punto de partida. Si vendes fuera de Estados Unidos, usas suscripciones o quieres mudar tu tienda actual, te lo cotizamos aparte y por escrito. El mantenimiento y la carga de productos también tienen su precio claro.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Construimos a medida, y <em>buscamos tu tienda</em> en Miami',
    cta: { label: 'Sé nuestro primer caso de e-commerce', href: '#contacto' },
    // Honestidad: NO hay cliente e-commerce ni de Miami. Capacidad real, etiquetada por su ciudad: MJA (Orlando,
    // FL, el trabajo más cercano a Miami, decisión del dueño) y la web-app de Rosy Nails (Houston, TX).
    items: proj('Move Junk Away', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Tu tienda en línea en Miami, <em>claro</em>',
    items: [
      { q: '¿Cuánto cuesta una web para vender en Miami?', a: 'Una tienda a medida empieza en $2,900. Sube según el número de productos, si la quieres completa en dos idiomas, si envías fuera del país o si hay que mudar una tienda que ya tienes. Te damos el presupuesto por escrito en la propuesta gratuita, sin costos escondidos.' },
      { q: '¿Mi tienda cobra el impuesto de ventas de Florida?', a: 'Sí, la dejamos configurada. En Florida el impuesto estatal es 6% y Miami-Dade añade 1%, así que en Miami se cobra 7%. Antes tienes que registrarte con el Florida Department of Revenue, y tu contador confirma qué aplica a tus productos.' },
      { q: '¿Puedo venderle a clientes de Latinoamérica?', a: 'Sí, si tu producto se puede enviar. Activamos pagos con tarjetas de fuera y PayPal, tarifas de envío por país y la tienda en español. Antes de lanzar te avisamos de lo que conviene revisar, como aduanas y devoluciones.' },
      { q: '¿La tienda incluye dominio, hospedaje y certificado de seguridad (SSL)?', a: 'Te orientamos con el dominio, el hospedaje y el certificado SSL para que tu tienda salga en vivo y segura, sin dolores de cabeza. Según la plataforma, algunos van incluidos en su plan; te explicamos con claridad qué se paga y a quién, antes de empezar.' },
      { q: '¿Tienen tiendas en línea ya hechas en Miami que pueda ver?', a: 'Seremos honestos: estamos comenzando con e-commerce y nuestra operación en Miami, así que todavía no publicamos un caso de tienda propio en esta ciudad. Sí construimos web-apps y sitios a medida que ya están en vivo (como la app de reservas de Rosy Nails). Por eso ofrecemos cupos de Cliente Fundador para tu tienda, con condiciones especiales.' },
    ],
  },
  cta: {
    title: 'Empieza a vender en línea en <em>Miami</em>',
    sub: 'En Miami, una tienda en línea bilingüe te abre la comunidad local y la región. Cuéntanos qué vendes y cuántos productos tienes, y recibe una propuesta en menos de 24 horas, sin compromiso.',
    primary: { label: 'Cotizar mi tienda gratis', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: 'Si aún no necesitas vender en línea, empieza por tu sitio.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Miami', href: '/es/miami/seo-local', desc: 'Que tu tienda aparezca en Google y en Maps.', icon: 'lucide:search' },
      { label: 'Tienda en línea en Houston', href: '/es/houston/ecommerce', desc: 'El mismo servicio, en nuestra base de operaciones.', icon: 'lucide:shopping-bag' },
    ],
  },
  service: {
    name: 'Diseño de Tienda en línea en Miami',
    serviceType: 'Diseño de tienda en línea (e-commerce)',
    description:
      'Diseño y desarrollo de tiendas en línea a medida para negocios en Miami: catálogo, carrito, pagos seguros, bilingüe (español e inglés), en Shopify, WooCommerce o a medida.',
    path: '/es/miami/ecommerce',
    areaCity: 'Miami',
    areaRegion: 'Florida',
    priceValue: '2900',
    providerId: MIAMI_ID,
  },
};

// ═══════════════════════════════════════════════════════════════
// OLA 3 · INDUSTRIA × CIUDAD (Houston primero): bienes raíces. Copy GENUINO por
// industria (no templado). Honestidad DURA: sin clientes de este rubro → Cliente
// Fundador + proof real etiquetado por lo que es. Sin "#1".
// (Abogados de inmigración se fundió en /es/houston/diseno-web, nov 2026.)
// ═══════════════════════════════════════════════════════════════
const houstonBienesRaices: ClusterPage = {
  tool: { text: '¿Cuántos prospectos se enfrían por no responder a tiempo? Ponle número en 30 segundos.', linkLabel: 'Calculadora de llamadas perdidas', href: '/es/herramientas#llamadas' },
  meta: {
    title: 'Sitios Web para Agentes de Bienes Raíces en Houston | Marcyan',
    description:
      'Diseño web y SEO para agentes de bienes raíces en Houston: sitio bilingüe con tus propiedades, captación de compradores y vendedores, y SEO local. Desde $1,500. Propuesta gratis.',
  },
  path: '/es/houston/bienes-raices',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'Bienes raíces', path: '/es/houston/bienes-raices' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Bienes raíces · Houston',
    h1: 'Sitios para <em>agentes de bienes raíces</em> en Houston',
    sub: 'Un sitio bilingüe con tus propiedades, rápido en el celular y pensado para captar compradores y vendedores, más SEO local para aparecer cuando buscan «casas en venta» en tu zona de Houston.',
    primary: { label: 'Quiero mi sitio', href: '#contacto' },
    secondary: { label: 'Ver qué incluye', href: '#precios' },
    chips: ['Tus propiedades', 'Bilingüe ES/EN', 'Rápido en el celular'],
    tone: 'gold',
  },
  answer: {
    q: '¿Qué necesita el sitio web de un agente de bienes raíces en Houston?',
    a: 'Un sitio rápido en el celular (ahí busca la mayoría de los compradores), bilingüe, con tus propiedades bien presentadas y formularios que capten a quien quiere comprar o vender. Más SEO local para aparecer cuando buscan «casas en venta» en tu zona. El 53% abandona una página móvil que tarda más de 3 segundos en cargar.',
    source: 'Think with Google (2017)',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Un sitio que <em>trabaja</em> por tu negocio',
    items: [
      { icon: 'lucide:home', title: 'Tus propiedades, bien presentadas', desc: 'Listados con fotos, mapa y detalles, fáciles de explorar. Conectamos con tu fuente de propiedades donde se pueda.' },
      { icon: 'lucide:inbox', title: 'Captación de compradores y vendedores', desc: 'Formularios y un asistente que responde 24/7 para que cada interesado quede registrado, no perdido en mensajes.' },
      { icon: 'lucide:search', title: 'SEO local por zona', desc: 'Apareces cuando buscan «casas en venta en Katy» o «agente inmobiliario en Sugar Land», en Google y en la IA.' },
      { icon: 'lucide:smartphone', title: 'Rápido en el celular', desc: 'La mayoría busca casa desde el teléfono. Tu sitio carga al instante y se ve impecable en cualquier pantalla.' },
      { icon: 'lucide:languages', title: 'Bilingüe español e inglés', desc: 'Le hablas a tu comprador hispano en su idioma y amplías tu alcance en inglés, todo en el mismo sitio.' },
      { icon: 'lucide:badge-check', title: 'Tu marca personal', desc: 'En bienes raíces la gente te elige a TI. Tu sitio proyecta tu marca, tus reseñas y tu trayectoria.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué este enfoque',
    title: 'En Houston, tu comprador busca casa <em>desde el celular y en español</em>',
    paragraphs: [
      'El mercado inmobiliario de Houston es enorme y muy hispano, y la búsqueda casi siempre empieza en el teléfono: alguien escribe «casas en venta en Katy» o «townhomes en Cypress» camino al trabajo. Si tu sitio no carga rápido o no habla su idioma, pierdes a ese comprador en segundos.',
      'Por eso construimos tu sitio rápido y bilingüe, con tus propiedades al frente y la captación bien armada, y lo respaldamos con SEO local por zona para que aparezcas en esas búsquedas. <strong>Sin promesas de posición:</strong> nadie controla el algoritmo de Google; lo que hacemos es darte la mejor base honesta.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Sitio de bienes raíces, <em>desde $1,500</em>',
    price: '$1,500',
    unit: 'proyecto único',
    lead: 'Pago por proyecto. El precio depende del número de páginas, las propiedades y las integraciones.',
    features: [
      'Diseño a medida con tu marca',
      'Listados de propiedades',
      'Captación de compradores y vendedores',
      'Versión en español e inglés',
      'SEO base y rápido en móvil',
      'Listo para Google y la IA',
    ],
    cta: { label: 'Quiero mi sitio', href: '#contacto' },
    note: '$1,500 es el punto de partida de un sitio profesional. El SEO local continuo (desde $600/mes) y un asistente con IA para responder 24/7 (desde $900) se suman según lo que necesites. Te damos un alcance y un precio claros por escrito, sin sorpresas.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Sitios a medida reales, y <em>buscamos tu marca</em> inmobiliaria',
    cta: { label: 'Sé nuestro primer caso en bienes raíces', href: '#contacto' },
    // Honestidad: aún no hay agente inmobiliario cliente. Proof real de sitios a
    // medida (etiquetado por su rubro/ciudad real) + Cliente Fundador. Sin insinuar
    // que sean de bienes raíces.
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Tu sitio de bienes raíces en Houston, <em>claro</em>',
    items: [
      { q: '¿Cuánto cuesta un sitio para un agente de bienes raíces?', a: 'Un sitio profesional a medida empieza en $1,500. El precio final depende del número de páginas, cuántas propiedades muestres y qué integraciones necesites. Te entregamos un presupuesto claro y por escrito en la propuesta gratuita, sin costos ocultos.' },
      { q: '¿Se conecta con el MLS o con un IDX?', a: 'Depende de tu acceso y de las reglas de tu MLS. Donde es posible, integramos o embebemos un feed de propiedades; donde no, montamos tus listados de forma manual o semiautomática. Te decimos con honestidad qué se puede hacer en tu caso antes de empezar, sin prometer integraciones que no existan.' },
      { q: '¿Tienen clientes en bienes raíces?', a: 'Seremos honestos: aún no publicamos un caso de un agente inmobiliario. Sí tenemos sitios a medida reales y verificables en otros rubros (con enlaces que puedes visitar) y nuestro propio sitio como Caso #0. Por eso ofrecemos cupos de Cliente Fundador para agentes, con condiciones especiales.' },
      { q: '¿El sitio capta compradores y vendedores?', a: 'Sí: formularios claros, llamadas a la acción y, si lo sumas, un asistente con IA que responde 24/7. La idea es que ningún interesado se pierda entre mensajes: que cada uno quede registrado y contigo.' },
      { q: '¿El sitio es bilingüe?', a: 'Sí. En Houston tu comprador busca en español e inglés, así que diseñamos en ambos idiomas desde el inicio, con el contexto correcto para tu mercado.' },
      { q: '¿Garantizan el primer lugar en Google?', a: 'No, y desconfía de quien lo prometa. Nadie controla el algoritmo. Te damos una base técnica sólida, SEO local honesto y reportes claros; el liderazgo en búsquedas competidas se construye con trabajo constante, no con una garantía imposible.' },
    ],
  },
  cta: {
    title: 'Tu próximo sitio de <em>bienes raíces</em> empieza aquí',
    sub: 'Cuéntanos cómo trabajas y qué zonas cubres, y recibe una propuesta de sitio y SEO en menos de 24 horas, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios que componen el sistema',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El servicio a detalle: a medida, rápido y bilingüe.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que aparezcas cuando buscan casas en tu zona.', icon: 'lucide:search' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Un asistente que responde y capta interesados 24/7.', icon: 'lucide:messages-square' },
    ],
  },
  service: {
    name: 'Sitios Web para Agentes de Bienes Raíces en Houston',
    serviceType: 'Diseño web y SEO para agentes de bienes raíces',
    description:
      'Diseño y desarrollo de sitios web para agentes de bienes raíces en Houston: bilingües, rápidos en móvil, con listados de propiedades, captación de prospectos y SEO local por zona.',
    path: '/es/houston/bienes-raices',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

// ═══════════════════════════════════════════════════════════════
// OLA 3 · INDUSTRIAS × HOUSTON: contratistas (vertical web-led). Copy genuino por
// industria, honestidad dura (Cliente Fundador donde no hay cliente real,
// proof etiquetado por su rubro/ciudad real). Reusa la plantilla ClusterLanding.
// (Restaurantes, talleres, salones y clínicas se fundieron en /es/houston/diseno-web.)
// ═══════════════════════════════════════════════════════════════
const houstonContratistas: ClusterPage = {
  tool: { text: '¿Cuántos trabajos pierdes por llamadas sin contestar? Ponle número en 30 segundos.', linkLabel: 'Calculadora de llamadas perdidas', href: '/es/herramientas#llamadas' },
  meta: {
    title: 'Sitios Web para Contratistas en Houston | Marcyan',
    description:
      'Diseño web y SEO local para contratistas en Houston: sitio bilingüe con fotos de antes y después, presupuesto gratis, y una IA que rescata las llamadas que pierdes en la obra. Desde $1,500. Propuesta gratis.',
  },
  path: '/es/houston/contratistas',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'Contratistas', path: '/es/houston/contratistas' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Contratistas · Houston',
    h1: 'Sitios web para <em>contratistas</em> en Houston',
    sub: 'Un sitio propio que salga en Google cuando buscan «contratista cerca de mí», con tus fotos de antes y después y presupuesto gratis. Y una IA que contesta por ti cuando estás en la obra, para que no se te escape el siguiente trabajo.',
    primary: { label: 'Quiero mi sitio', href: '#contacto' },
    secondary: { label: 'Ver qué incluye', href: '#precios' },
    chips: ['Fotos de antes y después', 'Presupuesto gratis', 'Bilingüe ES/EN'],
    tone: 'gold',
  },
  answer: {
    q: '¿Qué necesita el sitio web de un contratista en Houston?',
    a: 'Lo más importante es un sitio propio que salga en Google cuando buscan «contratista cerca de mí» o «remodelación en Houston», con tus fotos de antes y después, reseñas y presupuesto gratis. Súmale una IA que rescata las llamadas que pierdes en la obra: responder en 5 minutos multiplica hasta por 21 las probabilidades de calificar a ese prospecto.',
    source: 'Lead Response Management Study (MIT)',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Un sitio que te <em>consigue trabajos</em>',
    items: [
      { icon: 'lucide:search', title: 'SEO local por oficio y zona', desc: 'Apareces cuando buscan «contratista cerca de mí», «remodelación en Houston» o «roofing en español», en Google y en la IA.' },
      { icon: 'lucide:image', title: 'Fotos de antes y después', desc: 'Tu mejor trabajo al frente: galería de proyectos terminados que demuestra calidad y rompe la desconfianza del rubro.' },
      { icon: 'lucide:phone-missed', title: 'Rescata llamadas perdidas', desc: 'Cuando estás en el techo o bajo el fregadero y no puedes contestar, una IA responde por mensaje al instante para que el cliente no llame al siguiente.' },
      { icon: 'lucide:clipboard-list', title: 'Solicitud de presupuesto', desc: 'Formularios claros para «estimado gratis» que llegan ordenados a tu correo, aunque el prospecto escriba de noche o entre obras.' },
      { icon: 'lucide:badge-check', title: 'Confianza: licencia y reseñas', desc: 'Mostramos tu «con licencia y asegurado», tus reseñas reales y tus garantías, lo que el cliente necesita para llamarte a ti.' },
      { icon: 'lucide:smartphone', title: 'Rápido y bilingüe en el celular', desc: 'Tu cliente busca desde el teléfono y en español. Tu sitio carga al instante y le habla en su idioma, sin depender de directorios.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué este enfoque',
    title: 'En Houston, el trabajo se lo lleva <em>quien contesta primero</em>',
    paragraphs: [
      'Houston tiene una de las comunidades hispanas más grandes del país, concentrada en barrios como East End, Gulfton, Spring Branch, Pasadena y Alief, donde el cliente del contratista es su propia comunidad. La gente busca «contratista que hable español», «con licencia y asegurado» y «presupuesto gratis», pero casi siempre termina en directorios y clasificados, donde apareces mezclado con todos los demás y dependes de las reglas de otro.',
      'El dolor real del rubro es simple: estás subido en el techo o manejando entre obras y no puedes contestar, y el cliente llama al siguiente. Responder rápido es lo que decide quién gana el trabajo: contestar a un prospecto en los primeros 5 minutos multiplica hasta por 21 las probabilidades de calificarlo, frente a esperar 30 (Lead Response Management Study, MIT). <strong>Por eso unimos un sitio propio con SEO local y una IA que responde por ti al instante:</strong> para que el trabajo de $5,000 o $15,000 lo cierres tú, no el contratista que contestó primero.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Sitio para contratistas, <em>desde $1,500</em>',
    price: '$1,500',
    unit: 'proyecto único',
    lead: 'Pago por proyecto. El precio depende del número de páginas, la galería de proyectos y las integraciones.',
    features: [
      'Diseño a medida con tu marca',
      'Galería de antes y después',
      'Solicitud de presupuesto gratis',
      'Versión en español e inglés',
      'SEO base y rápido en móvil',
      'Listo para Google y la IA',
    ],
    cta: { label: 'Quiero mi sitio', href: '#contacto' },
    note: '$1,500 es el punto de partida de un sitio profesional. El SEO local continuo (desde $600/mes) y una IA que rescata llamadas perdidas y responde 24/7 (desde $900) se suman según lo que necesites. Te damos un alcance y un precio claros por escrito, sin sorpresas.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Negocios locales <em>reales</em> en Houston',
    cta: { label: 'Sé nuestro primer caso', href: '#contacto' },
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Tu sitio de contratista en Houston, <em>claro</em>',
    items: [
      { q: '¿Cuánto cuesta un sitio web para un contratista?', a: 'Un sitio profesional a medida empieza en $1,500. El precio final depende de cuántas páginas necesites, el tamaño de tu galería de antes y después y qué integraciones quieras (presupuestos, IA para llamadas). Te entregamos un presupuesto claro y por escrito en la propuesta gratuita, sin costos ocultos.' },
      { q: '¿Cómo me ayuda con las llamadas que pierdo en la obra?', a: 'Sumamos una IA que responde por mensaje al instante cuando no puedes contestar: saluda al cliente, toma sus datos y le dice que ya lo contactarás. Así no llama al siguiente contratista. Responder rápido es la diferencia entre ganar el trabajo o perderlo, sobre todo en un oficio donde estás en la obra y no junto al teléfono.' },
      { q: '¿Para qué quiero un sitio si ya estoy en los directorios?', a: 'En los directorios y clasificados compites mezclado con todos los demás y dependes de sus reglas. Un sitio propio sale en Google cuando buscan «remodelación en Houston», muestra tu trabajo y tus reseñas, y los prospectos llegan directo a ti, no repartidos entre la competencia.' },
      { q: '¿Tienen clientes contratistas?', a: 'Seremos honestos: aún no publicamos un caso de un contratista de techos o remodelación. Sí trabajamos con negocios locales reales y verificables en Houston, como un paisajista y un servicio de junk removal, con enlaces que puedes visitar. Por eso ofrecemos cupos de Cliente Fundador en construcción y remodelación, con condiciones especiales.' },
      { q: '¿El sitio es bilingüe?', a: 'Sí. En Houston tu cliente busca en español e inglés, así que diseñamos en ambos idiomas desde el inicio, con el lenguaje de obra y de barrio que de verdad usa la gente: «presupuesto gratis», «con licencia y asegurado», «estimado sin compromiso».' },
      { q: '¿Garantizan el primer lugar en Google?', a: 'No, y desconfía de quien lo prometa. Nadie controla el algoritmo. Te damos una base técnica sólida, SEO local honesto, tu trabajo bien presentado y reportes claros; el liderazgo en búsquedas competidas se construye con trabajo constante, no con una garantía imposible.' },
    ],
  },
  cta: {
    title: 'Tu próximo sitio de <em>contratista</em> empieza aquí',
    sub: 'Cuéntanos qué trabajos haces y en qué zonas, y recibe una propuesta de sitio, SEO y rescate de llamadas en menos de 24 horas, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios que componen el sistema',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El servicio a detalle: a medida, rápido y bilingüe.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que aparezcas cuando buscan «contratista cerca de mí».', icon: 'lucide:search' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Una IA que rescata las llamadas que pierdes en la obra.', icon: 'lucide:messages-square' },
    ],
  },
  service: {
    name: 'Sitios Web para Contratistas en Houston',
    serviceType: 'Diseño web y SEO para contratistas y servicios para el hogar',
    description:
      'Diseño y desarrollo de sitios web para contratistas y servicios para el hogar en Houston: bilingües, rápidos en móvil, con galería de antes y después, solicitud de presupuesto, SEO local por oficio y zona, y una IA que rescata llamadas perdidas.',
    path: '/es/houston/contratistas',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

// ═══════════════════════════════════════════════════════════════
// OLA 3 · BARRIOS. Houston: Katy/Sugar Land (lideran con la ZONA, no el
// head-term; el wedge bilingüe se fundió en /es/houston/diseno-web).
// Miami: Doral (Doralzuela)/Hialeah (Cliente Fundador, diferencian por AEO/
// bilingüe/barrio, NO precio; proof etiquetado por su ciudad real).
// ═══════════════════════════════════════════════════════════════
const houstonKaty: ClusterPage = {
  meta: {
    title: 'Diseño web en Katy, TX: páginas web y SEO local | Marcyan',
    description:
      'Diseño web y SEO local para negocios en Katy, TX: sitio bilingüe, rápido en el celular y posicionado por zona (Cinco Ranch, Mason Rd, Grand Parkway 99). Desde $1,500. Propuesta gratis.',
  },
  path: '/es/houston/katy',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'Katy', path: '/es/houston/katy' },
  ],
  hero: {
    badge: 'Katy, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Diseño web · Katy',
    h1: 'Diseño web en <em>Katy</em>, para tu negocio local',
    sub: 'Un sitio bilingüe, rápido en el celular y diseñado a medida, más SEO local para que las familias de Cinco Ranch, Cross Creek Ranch y todo Katy te encuentren cuando buscan por tu zona y no dentro de resultados genéricos de «Houston».',
    primary: { label: 'Quiero mi sitio', href: '#contacto' },
    secondary: { label: 'Ver qué incluye', href: '#precios' },
    chips: ['SEO local por zona', 'Bilingüe ES/EN', 'Rápido en el celular'],
    tone: 'gold',
  },
  answer: {
    q: '¿Qué necesita la página web de un negocio en Katy, TX?',
    a: 'En Katy necesitas un sitio rápido en el celular, bilingüe y con SEO local por tu corredor (Mason Rd, Grand Parkway 99). El 46% de las búsquedas en Google tienen intención local y el 76% de quienes buscan «cerca de mí» visitan un negocio en menos de 24 horas.',
    source: 'Google · BrightLocal, 2025',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Un sitio pensado para <em>captar clientes de Katy</em>',
    intro: 'Diseño web a medida y SEO local, en un solo sistema honesto, para negocios de servicios para el hogar y profesionales del oeste de Houston.',
    items: [
      { icon: 'lucide:layout-template', title: 'Diseño 100% a medida', desc: 'Tu sitio se diseña desde cero alrededor de tu marca y tus servicios. Sin plantillas recicladas que se ven como las de tu competencia.' },
      { icon: 'lucide:smartphone', title: 'Rápido en el celular', desc: 'La familia de Cinco Ranch te juzga desde el teléfono. Tu sitio carga al instante y se ve impecable en cualquier pantalla.' },
      { icon: 'lucide:search', title: 'SEO local por zona', desc: 'Apareces cuando buscan «plomero en Katy» o «remodelación cerca de mí», por tu corredor (Mason Rd, FM 1463, Grand Parkway 99), en Google y en la IA.' },
      { icon: 'lucide:languages', title: 'Bilingüe español e inglés', desc: 'Le hablas a la comunidad hispana de Katy en su idioma y a la clientela anglo en el suyo, todo en el mismo sitio.' },
      { icon: 'lucide:inbox', title: 'Formularios y captación', desc: 'Cada interesado llega a tu correo y queda registrado. En una zona competida, el que responde primero se queda con el trabajo.' },
      { icon: 'lucide:navigation', title: 'Tu negocio en el mapa de Katy', desc: 'Estructuramos tu información de zona y servicio para que quede claro a quién atiendes y dónde, y se note local de Katy.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué este enfoque',
    title: 'En Katy, el cliente busca <em>por su zona, no por «Houston»</em>',
    paragraphs: [
      'Katy dejó de ser un pueblo ferroviario para convertirse en uno de los polos de comunidades planificadas más buscados del oeste de Houston: Cinco Ranch, Cross Creek Ranch, Cane Island y Elyson atraen miles de familias jóvenes cada año, muchas que llegan «por las escuelas» de Katy ISD. Ese hogar nuevo necesita constantemente servicios (remodelación, climatización, jardinería, limpieza, plomería, comida), y casi siempre empieza buscando en el celular por su zona o por su corredor, no por «Houston» genérico, porque el residente de Katy se identifica con Katy.',
      'Por eso tu página web debe liderar con Katy y cargar rápido en el móvil, donde se decide la primera impresión, y atender por igual a la clientela bilingüe (familias anglo y una comunidad hispana en expansión). Construimos tu sitio a medida y lo respaldamos con SEO local por zona para que aparezcas en esas búsquedas de Mason Rd, FM 1463 y la Grand Parkway. <strong>Sin promesas de posición:</strong> nadie controla el algoritmo de Google; lo que te damos es la mejor base honesta para competir.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Tu sitio en Katy, <em>desde $1,500</em>',
    price: '$1,500',
    unit: 'proyecto único',
    lead: 'Empezamos por un sitio profesional, bilingüe y a medida. El SEO local y la IA se suman según lo que tu negocio de Katy necesite.',
    features: [
      'Diseño 100% a medida',
      'Versión en español e inglés',
      'Rápido en el celular y listo para la IA',
      'Optimización SEO local por zona',
      'Formulario de contacto integrado',
      'Orientación con dominio y hospedaje',
    ],
    cta: { label: 'Quiero mi sitio', href: '#contacto' },
    note: '$1,500 es el punto de partida para un sitio profesional. El SEO local (desde $600/mes) y un asistente con IA (desde $900) son servicios que se suman según lo que tu negocio necesite. Te lo detallamos por escrito en la propuesta gratuita, sin compromiso.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Negocios reales del <em>área metro de Houston</em>',
    cta: { label: 'Quiero algo así para mi negocio', href: '#contacto' },
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Diseño web en Katy, <em>claro y sin letra chica</em>',
    items: [
      { q: '¿Hacen páginas web específicamente para negocios de Katy?', a: 'Sí. Trabajamos el área metropolitana de Houston, y Katy es parte de ese metro, así que diseñamos tu sitio para que lidere con Katy: tu zona, tus corredores (Mason Rd, FM 1463, Grand Parkway 99) y tus comunidades (Cinco Ranch, Cross Creek Ranch). El cliente de Katy busca por Katy, no por «Houston» genérico.' },
      { q: '¿Tienen clientes en Katy?', a: 'Seremos honestos: nuestro trabajo publicado es del área metro de Houston y lo etiquetamos por su ciudad real (Houston, TX). No vamos a inventarte un cliente «de Katy» que no existe. Katy es parte de ese mismo mercado de Houston que ya atendemos, y tu sitio se construye con copy 100% específico de tu zona.' },
      { q: '¿Cuánto cuesta una página web en Katy?', a: 'Un sitio profesional, bilingüe y a medida empieza en $1,500 (proyecto único). El SEO local va desde $600 al mes y un asistente con IA desde $900. Armamos el sistema según tu negocio y te damos un precio claro por escrito en la propuesta gratuita.' },
      { q: '¿Me garantizan salir #1 en Google en Katy?', a: 'No, y desconfía de quien lo prometa. Nadie controla el algoritmo de Google. Lo que sí hacemos es darte un sitio rápido y bilingüe y un SEO local honesto, estructurado por tu zona y tus corredores, para que tengas la mejor base posible para competir en las búsquedas de Katy.' },
      { q: '¿El sitio funciona en español y en inglés?', a: 'Sí, y en Katy importa: atiendes a familias anglo y a una comunidad hispana que sigue creciendo. Construimos tu sitio en los dos idiomas, escrito para cómo busca de verdad cada cliente, todo en el mismo lugar.' },
      { q: '¿Por qué es tan importante que cargue rápido en el celular?', a: 'Porque ahí se decide. La familia que se acaba de mudar a Cinco Ranch te busca desde el teléfono y compara dos o tres opciones en segundos. Un sitio lento o que se ve mal en móvil pierde a ese cliente antes de que te llame; por eso construimos en HTML ligero que carga al instante.' },
    ],
  },
  cta: {
    title: 'Que en Katy te encuentren <em>primero</em>',
    sub: 'Cuéntanos qué haces y a qué zona de Katy atiendes, y te propondremos un sitio y un plan de SEO local en menos de 24 horas, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios que componen el sistema',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El servicio a detalle: a medida, rápido y bilingüe.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que te encuentren cuando buscan por tu zona.', icon: 'lucide:search' },
      { label: 'Houston y sus zonas', href: '/es/houston', desc: 'Todos los servicios y zonas que cubrimos en Houston.', icon: 'lucide:map-pin' },
    ],
  },
  service: {
    name: 'Diseño web y SEO local en Katy, TX',
    serviceType: 'Diseño web y SEO local para negocios',
    description:
      'Diseño web a medida y SEO local para negocios en Katy, Texas: sitio bilingüe, rápido en el celular y posicionado por zona (Cinco Ranch, Mason Rd, Grand Parkway 99). Desde $1,500. Sin promesas de posición.',
    path: '/es/houston/katy',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const houstonSugarLand: ClusterPage = {
  meta: {
    title: 'Diseño web en Sugar Land, TX: sitios premium y bilingües | Marcyan',
    description:
      'Diseño web y SEO local para negocios en Sugar Land (Town Square, First Colony, Fort Bend). Sitio premium, rápido y bilingüe español e inglés. Desde $1,500. Propuesta gratis.',
  },
  path: '/es/houston/sugar-land',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'Sugar Land', path: '/es/houston/sugar-land' },
  ],
  hero: {
    badge: 'Sugar Land, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Diseño web y SEO · Sugar Land',
    h1: 'Diseño web premium en <em>Sugar Land</em>',
    sub: 'Sitios a medida y SEO local para negocios de Sugar Land y el condado de Fort Bend. Un sitio que se ve al nivel de Town Square y First Colony: rápido, profesional y bilingüe español e inglés, listo para un cliente exigente.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver qué incluye', href: '#precios' },
    chips: ['Diseño premium a medida', 'Bilingüe ES/EN', 'SEO local por zona'],
    tone: 'gold',
  },
  answer: {
    q: '¿Cuánto cuesta un sitio web profesional para un negocio en Sugar Land?',
    a: 'Un sitio profesional a medida en Sugar Land empieza desde $1,500 como proyecto único. Es una inversión que pesa: el 75% de las personas juzga la credibilidad de un negocio por su sitio web, y en un mercado acomodado y profesional como Fort Bend, la primera impresión decide quién recibe la llamada.',
    source: 'Universidad de Stanford',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Un sitio a la altura de Sugar Land',
    intro: 'Diseño premium a medida más SEO local, pensado para un público profesional y multicultural que decide rápido.',
    items: [
      { icon: 'lucide:pen-tool', title: 'Diseño premium a medida', desc: 'Cada sitio se diseña desde cero alrededor de tu marca. Sin plantillas recicladas, con el nivel visual que tu clientela de Sugar Land ya espera.' },
      { icon: 'lucide:languages', title: 'Bilingüe español e inglés', desc: 'Inglés como idioma principal de negocio y español donde aporta valor real, para una clientela multicultural y exigente.' },
      { icon: 'lucide:search', title: 'SEO local por zona', desc: 'Te optimizamos para Town Square, First Colony, Riverstone, Telfair y para las búsquedas "cerca de mí" de tu rubro.' },
      { icon: 'lucide:smartphone', title: 'Rápido en el celular', desc: 'HTML ligero que carga en un par de segundos, impecable en móvil y computadora, porque un profesional no espera.' },
      { icon: 'lucide:badge-check', title: 'Credibilidad visible', desc: 'Reseñas, certificaciones y señales de confianza bien presentadas, para que el sitio respalde tu reputación local.' },
      { icon: 'lucide:inbox', title: 'Formularios y captación', desc: 'Formularios que llegan a tu correo y a tu base de datos, para que ningún prospecto se pierda entre consultas.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué este enfoque',
    title: 'Sugar Land no es un mercado cualquiera',
    paragraphs: [
      'Sugar Land es una ciudad próspera al suroeste de Houston, núcleo del condado de Fort Bend, uno de los condados más diversos de Estados Unidos. Aquí conviven grandes comunidades del sur de Asia, del este asiático e hispana, y el corazón comercial late en Sugar Land Town Square y First Colony. El tejido de negocios es de servicios profesionales y consumo de gama media-alta: clínicas, bufetes, contadores, restaurantes, boutiques e inmobiliarias, donde el cliente juzga la credibilidad por el sitio y espera diseño de nivel.',
      'Por eso aquí el ángulo no es "más barato", es premium y bilingüe. <strong>Tu sitio compite contra la imagen pulida de todo Sugar Land, donde el SEO local es muy competido.</strong> Lideramos con diseño a medida que comunica con claridad a una clientela multicultural, español e inglés donde aporta valor, y SEO local por zona (Town Square, First Colony, Riverstone, Telfair) para que aparezcas cuando buscan por nombre de área o "cerca de mí".',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Sitio web en Sugar Land, <em>desde $1,500</em>',
    price: '$1,500',
    unit: 'proyecto único',
    lead: 'Un solo pago por un sitio premium, a medida y bilingüe, sin mensualidades atadas al diseño.',
    features: [
      'Diseño 100% a medida (sin plantillas)',
      'Varias páginas según el plan',
      'Versión en español e inglés',
      'Optimización SEO local base',
      'Formulario de contacto integrado',
      'Listo para móvil y para la IA',
    ],
    cta: { label: 'Propuesta gratis', href: '#contacto' },
    note: '$1,500 es el punto de partida para un sitio profesional. El SEO local (desde $600/mes) y una IA conversacional (desde $900) se suman si los necesitas; las tiendas en línea tienen su propio alcance. Te lo detallamos sin compromiso.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Trabajo real del área metro de Houston',
    cta: { label: 'Propuesta gratis', href: '#contacto' },
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Preguntas frecuentes sobre diseño web en Sugar Land',
    items: [
      { q: '¿Cuánto cuesta una página web en Sugar Land?', a: 'Un sitio profesional a medida empieza desde $1,500 como proyecto único (un solo pago). El precio final depende del número de páginas y las funciones; te enviamos una propuesta clara y sin compromiso antes de empezar.' },
      { q: '¿Trabajan con negocios fuera del centro de Sugar Land?', a: 'Sí. Atendemos todo Sugar Land y el condado de Fort Bend: Town Square, First Colony, Riverstone, Telfair y zonas cercanas, además del resto del área metropolitana de Houston.' },
      { q: '¿El sitio viene en español y en inglés?', a: 'Sí. Trabajamos el inglés como idioma principal de negocio y el español donde aporta valor real para tu clientela. En un mercado tan multicultural como Sugar Land, esa flexibilidad bilingüe marca la diferencia.' },
      { q: '¿Pueden mejorar mi posición en Google para Sugar Land?', a: 'Optimizamos tu sitio y tu presencia local (Perfil de Google, reseñas, contenido por zona) para que te encuentren. No prometemos el puesto #1: nadie serio puede garantizar una posición exacta en Google, pero sí trabajamos con método y reportes claros.' },
      { q: '¿Tienen clientes en Sugar Land?', a: 'Mostramos trabajo real del área metropolitana de Houston (Sugar Land es parte de ese metro y de Fort Bend), etiquetado por la ciudad real de cada proyecto. Preferimos ser honestos a inflar un caso que no corresponde.' },
      { q: '¿Cuánto tardan en entregar el sitio?', a: 'Depende del alcance, pero un sitio típico toma unas pocas semanas desde que tenemos tu contenido y tu visto bueno al diseño. En la propuesta te damos un tiempo estimado realista.' },
    ],
  },
  cta: {
    title: 'Tu negocio en Sugar Land merece un sitio premium',
    sub: 'Cuéntanos qué haces y a quién atiendes. Te enviamos una propuesta gratis, bilingüe y sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios que componen el sistema',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El servicio de diseño web a detalle: qué incluye, cómo trabajamos y qué entregamos.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Aparece en Google y en Maps cuando tu cliente busca por zona o "cerca de mí".', icon: 'lucide:search' },
      { label: 'Houston y su área metro', href: '/es/houston', desc: 'Todo lo que hacemos en Houston, Fort Bend y los suburbios como Sugar Land.', icon: 'lucide:building-2' },
    ],
  },
  service: {
    name: 'Diseño web y SEO local en Sugar Land',
    serviceType: 'Diseño web y SEO local',
    description:
      'Diseño web premium a medida y SEO local para negocios de Sugar Land y el condado de Fort Bend: sitio bilingüe español e inglés, rápido en el celular y optimizado por zona (Town Square, First Colony). Desde $1,500.',
    path: '/es/houston/sugar-land',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const miamiDoral: ClusterPage = {
  meta: {
    title: 'Diseño web y SEO en Doral (Doralzuela) | Marcyan',
    description:
      'Diseño web, SEO local e IA conversacional para negocios de Doral: areperas, panaderías venezolanas, servicios e import/export. Bilingüe y listo para IA. Desde $1,500. Propuesta gratis.',
  },
  path: '/es/miami/doral',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Miami', path: '/es/miami' },
    { name: 'Doral', path: '/es/miami/doral' },
  ],
  hero: {
    badge: 'Doral, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Doral · Miami-Dade',
    h1: 'Diseño web y SEO para negocios en <em>Doral</em>',
    sub: 'Sitios bilingües, SEO local e IA conversacional para los negocios de Doral, la «Doralzuela». Para que tu arepera, panadería, servicio profesional o firma de import/export aparezca en Google y en ChatGPT, y reciba al cliente por WhatsApp, en español y en inglés.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver qué incluye', href: '#precios' },
    chips: ['Bilingüe ES/EN', 'Listo para la IA', 'Atención por WhatsApp'],
    tone: 'gold',
  },
  answer: {
    q: '¿Por qué un negocio de Doral necesita un sitio web bilingüe y SEO local?',
    a: 'Porque el cliente de Doral busca y escribe en español, a menudo por WhatsApp. Un sitio bilingüe con SEO local te hace visible cuando alguien busca «cerca de mí»: el 46% de las búsquedas en Google tienen intención local y el 76% de quienes buscan «cerca de mí» visitan un negocio en menos de 24 horas.',
    source: 'Google · BrightLocal, 2025',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Un sistema completo para <em>tu negocio en Doral</em>',
    items: [
      { icon: 'lucide:layout-template', title: 'Sitio web a medida', desc: 'Diseñado desde cero para tu marca, rápido en el celular y pensado para el cliente venezolano y colombiano de Doral.' },
      { icon: 'lucide:languages', title: 'Bilingüe español e inglés', desc: 'En el español que de verdad se habla en Doral, y en inglés para los corredores EE.UU.-Latinoamérica.' },
      { icon: 'lucide:search', title: 'SEO local para Doral', desc: 'Optimizamos tu Perfil de Google y tu sitio para «diseño web Doral», «areperas en Doral» y búsquedas cerca de Downtown y CityPlace Doral.' },
      { icon: 'lucide:bot-message-square', title: 'IA conversacional', desc: 'Un asistente bilingüe que responde y capta clientes las 24 horas, ideal para el cliente de Doral que prefiere escribir por chat.' },
      { icon: 'lucide:scan-search', title: 'Listo para la IA (AEO)', desc: 'Estructura y schema para que ChatGPT y Gemini puedan leerte y citarte cuando alguien pregunta por opciones en Doral.' },
      { icon: 'lucide:smartphone', title: 'WhatsApp integrado', desc: 'Botón de WhatsApp visible y formularios que llegan a tu correo, para no perder ningún prospecto.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué Doral',
    title: 'Doral no es «Miami genérico»: es <em>Doralzuela</em>',
    paragraphs: [
      'Doral es una ciudad incorporada al oeste de Miami-Dade, pegada al aeropuerto MIA y conocida como «Doralzuela» por albergar una de las comunidades venezolanas más grandes de Estados Unidos, junto con fuerte presencia colombiana, argentina y cubana. Aquí el español es la lengua del comercio: areperas y panaderías como las de Downtown Doral, servicios profesionales hispanos y firmas de import/export que mueven la carga entre EE.UU., Venezuela y Colombia.',
      'El cliente de Doral busca en su idioma y contacta por WhatsApp, y valora que entiendas su cultura, no solo «Miami». Por eso el verdadero diferenciador no es el precio: es <strong>un sitio bilingüe real, SEO local por corredor (Downtown Doral, CityPlace Doral) y schema listo para la IA</strong>, escrito para tu cliente venezolano o colombiano y para tu vertical concreta.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Sitio web profesional, <em>desde $1,500</em>',
    price: '$1,500',
    unit: 'proyecto único',
    lead: 'Pago por proyecto. La base para que tu negocio de Doral tenga una presencia bilingüe a la altura de su reputación offline.',
    features: [
      'Diseño 100% a medida',
      'Versión en español e inglés',
      'Optimización SEO base + schema',
      'Botón de WhatsApp y formulario',
      'Listo para móvil y para la IA',
      'Te orientamos con dominio y hospedaje',
    ],
    cta: { label: 'Propuesta gratis', href: '#contacto' },
    note: '$1,500 es el punto de partida para un sitio profesional. El SEO local (desde $600/mes) y una IA conversacional (desde $900) se suman según lo que necesites. Las tiendas en línea y las funciones especiales tienen su propio alcance: te lo detallamos sin compromiso.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Trabajo real y verificable, y <em>buscamos tu negocio</em> en Doral',
    cta: { label: 'Sé nuestro primer caso en Doral', href: '#contacto' },
    // Honestidad: NO hay clientes en Miami/Doral. Proof etiquetado por su ciudad
    // REAL (Houston / Orlando). El título y el FAQ lo aclaran; nada insinúa Doral.
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Move Junk Away', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Tu presencia digital en Doral, sin <em>letra chica</em>',
    items: [
      { q: '¿Cuánto cuesta un sitio web para un negocio en Doral?', a: 'Un sitio profesional a medida empieza en $1,500 (pago único). El precio final depende del número de páginas y de las funciones que necesites. El SEO local (desde $600 al mes) y una IA conversacional (desde $900) se cotizan aparte. Te entregamos un alcance y un precio claros en la propuesta gratuita, antes de que decidas.' },
      { q: '¿Tienen clientes en Doral o en Miami?', a: 'Seremos honestos: estamos comenzando nuestra operación en Miami, así que todavía no tenemos casos publicados en Doral. Sí tenemos trabajo real y verificable, con enlaces que puedes visitar, para negocios en Houston y Orlando. Por eso ofrecemos cupos de Cliente Fundador en Doral, con condiciones especiales.' },
      { q: '¿El sitio funciona para mi arepera, panadería o restaurante venezolano?', a: 'Sí. Diseñamos para gastronomía: menú claro, fotos que abren apetito, botón de WhatsApp y de pedidos, y SEO local para que aparezcas cuando alguien busca arepas o empanadas en Doral. Escribimos en el español de tu cliente venezolano o colombiano, sin sonar a plantilla genérica en inglés.' },
      { q: '¿Y si tengo una firma de import/export o un servicio profesional cerca de MIA?', a: 'También. Para freight forwarders, agentes aduanales, contadores, abogados de inmigración y clínicas, construimos un sitio bilingüe profesional que da confianza en los corredores EE.UU.-Venezuela/Colombia. Inglés y español desde el inicio, con la estructura para que te encuentren en Google y en los asistentes de IA.' },
      { q: '¿Atiende el cliente por WhatsApp?', a: 'Sí, lo dejamos integrado. El cliente de Doral suele preferir escribir por WhatsApp antes que llamar, así que ponemos un botón visible y, si lo deseas, una IA conversacional bilingüe que responde al instante las 24 horas y capta el lead aunque tú estés ocupado.' },
      { q: '¿Garantizan el primer lugar en Google?', a: 'No, y desconfía de quien lo prometa: nadie controla el algoritmo de Google. Lo que sí garantizamos es trabajo honesto y medible: un sitio bilingüe correcto, SEO local bien hecho, schema listo para la IA y reportes claros. Nuestro compromiso es con el método y la transparencia, no con un número imposible de asegurar.' },
    ],
  },
  cta: {
    title: 'Pon a tu negocio de <em>Doral</em> en el mapa digital',
    sub: 'Buscamos Clientes Fundadores en Doral. Cuéntanos sobre tu negocio (arepera, panadería, servicio o import/export) y recibe una propuesta bilingüe en menos de 24 horas, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios que componen el sistema',
    links: [
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: 'El servicio de diseño web bilingüe a detalle.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Miami', href: '/es/miami/seo-local', desc: 'Que tu negocio aparezca en Google y en Maps.', icon: 'lucide:search' },
      { label: 'IA conversacional en Miami', href: '/es/miami/ia-conversacional', desc: 'Atiende y capta clientes 24/7 con un asistente bilingüe.', icon: 'lucide:messages-square' },
      { label: 'Miami (hub)', href: '/es/miami', desc: 'Todos nuestros servicios para Miami-Dade.', icon: 'lucide:globe' },
    ],
  },
  service: {
    name: 'Diseño web y SEO en Doral',
    serviceType: 'Diseño web, SEO local e IA conversacional',
    description:
      'Diseño web bilingüe, SEO local e IA conversacional para negocios en Doral (Miami-Dade): areperas, panaderías y restaurantes venezolanos, servicios profesionales hispanos y firmas de import/export cerca de MIA. En español e inglés, listo para Google y para los asistentes de IA.',
    path: '/es/miami/doral',
    areaCity: 'Miami',
    areaRegion: 'Florida',
    priceValue: '1500',
    providerId: MIAMI_ID,
  },
};

const miamiHialeah: ClusterPage = {
  meta: {
    title: 'Diseño web y SEO en Hialeah | Negocios locales en español | Marcyan',
    description:
      'Diseño web, SEO local e IA en español para negocios de Hialeah: ventanitas, panaderías, talleres, salones y mercados. Web rápida y bilingüe desde $1,500. Propuesta gratis.',
  },
  path: '/es/miami/hialeah',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Miami', path: '/es/miami' },
    { name: 'Hialeah', path: '/es/miami/hialeah' },
  ],
  hero: {
    badge: 'Hialeah, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Negocios locales · Hialeah',
    h1: 'Diseño web y SEO para tu <em>negocio</em> en Hialeah',
    sub: 'Tu negocio de Hialeah vive en español, por WhatsApp y por la ventanita. Te armamos la web rápida, la ficha de Google y la respuesta inmediata para que el cliente que busca «cerca de mí» te encuentre y te escriba, todo arrancando en español.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver qué incluye', href: '#precios' },
    chips: ['Todo en español', 'Rápido en el celular', 'Ficha de Google ordenada'],
    tone: 'gold',
  },
  answer: {
    q: '¿Le conviene a un negocio de Hialeah tener una página web en español?',
    a: 'Sí: es una de las mejores inversiones locales para un negocio de Hialeah. El 46% de las búsquedas en Google tienen intención local y el 76% de quienes buscan «cerca de mí» visitan un negocio en menos de 24 horas. Aquí el cliente busca en español desde el celular, y una web rápida con ficha de Google te pone delante de él.',
    source: 'Google · BrightLocal, 2025',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Tu negocio de Hialeah, <em>bien armado</em> en español',
    items: [
      { icon: 'lucide:layout-template', title: 'Web a medida en español', desc: 'Un sitio diseñado desde cero para tu negocio, no una plantilla: cafetería, panadería, taller, salón, botánica o mercado, escrito en el español del barrio.' },
      { icon: 'lucide:smartphone', title: 'Rápido en el celular', desc: 'HTML ligero que carga en un par de segundos, justo en el dispositivo con el que busca tu clientela. Nada de páginas pesadas que tardan en abrir.' },
      { icon: 'lucide:map-pin', title: 'Ficha de Google ordenada', desc: 'Creamos u optimizamos tu Perfil de Google de Negocio: categoría, horario, fotos, servicios y descripción en español, para que salgas en Maps cuando te buscan.' },
      { icon: 'lucide:search', title: 'SEO local del barrio', desc: 'Te posicionamos para «panadería cubana cerca de mí», «taller en Hialeah» y las búsquedas reales de Palm Ave, W 49 St y Hialeah Dr, en español.' },
      { icon: 'lucide:bot-message-square', title: 'Respuesta inmediata con IA', desc: 'Un asistente que contesta por WhatsApp y en tu web mientras atiendes el mostrador, para que el cliente que escribe no se vaya con el de al lado.' },
      { icon: 'lucide:languages', title: 'Español primero, inglés si hace falta', desc: 'Todo arranca en español, el idioma del día a día en Hialeah, y sumamos inglés solo donde de verdad lo necesitas. Sin sonar a traducción.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué Hialeah',
    title: 'En Hialeah, el español <em>es el negocio</em>',
    paragraphs: [
      'Hialeah es una de las ciudades más cubanas de Estados Unidos, una ciudad de Miami-Dade de clase trabajadora donde el español no es una concesión: es la lengua del día a día. La gente toma su cafecito en la ventanita, compra el pan en la panadería de toda la vida y le escribe al taller o al salón por WhatsApp, casi siempre en español. Tu negocio no necesita una web genérica en inglés: necesita existir bien en el idioma del barrio.',
      'La oportunidad real no es competir por precio, es <strong>existir bien en español</strong>. Muchísimos negocios de Hialeah viven solo de Facebook, Instagram o del boca a boca, sin web propia ni ficha de Google bien armada, así que el cliente que busca «cerca de mí» en el celular no los encuentra aunque estén a una cuadra. Una web rápida, una ficha ordenada y respuesta inmediata, todo en español, te ponen delante de ese cliente.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Web para tu negocio en Hialeah, <em>desde $1,500</em>',
    price: '$1,500',
    unit: 'proyecto único',
    lead: 'Pago por proyecto, sin mensualidades obligatorias. El precio depende del alcance.',
    features: webFeatures,
    cta: { label: 'Propuesta gratis', href: '#contacto' },
    note: '$1,500 es el punto de partida para un sitio profesional. El SEO local (desde $600/mes) para posicionarte en el barrio y un asistente con IA (desde $900) para contestar al instante se suman según lo que necesites. Te lo detallamos sin compromiso.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Trabajo real y <em>verificable</em>',
    cta: { label: 'Sé nuestro primer caso en Hialeah', href: '#contacto' },
    // Honestidad DURA: NO hay clientes en Miami. Proof etiquetado por su ciudad
    // real (Houston/Orlando). Nunca se insinua que sean de Hialeah ni de Miami.
    items: proj('Texas Rush Remove', "Julio's Landscape TX", 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Tu negocio en Hialeah, <em>sin rodeos</em>',
    items: [
      { q: '¿Cuánto cuesta una página web para mi negocio en Hialeah?', a: 'Un sitio profesional a medida empieza en $1,500, pago único, sin mensualidades obligatorias. El precio final depende de cuántas páginas necesites y de las funciones (reservas, menú, pagos). Si quieres SEO local para posicionarte en el barrio (desde $600 al mes) o un asistente con IA (desde $900), se cotizan aparte. Todo claro y por escrito en la propuesta gratuita.' },
      { q: '¿Tienen clientes en Hialeah o en Miami?', a: 'Seremos honestos: estamos comenzando nuestra operación en Miami, así que todavía no tenemos casos publicados de Hialeah ni de Miami. Sí tenemos trabajo real y verificable hecho para negocios en Houston y Orlando, con enlaces que puedes visitar. Por eso ofrecemos cupos de Cliente Fundador en Hialeah, con condiciones especiales para nuestros primeros casos locales.' },
      { q: '¿La web y la atención son de verdad en español?', a: 'Sí, y es nuestra especialidad. En Hialeah el español es la lengua del negocio, así que todo arranca en español: la web, la ficha de Google y el asistente que contesta. Lo escribimos en el español caribeño que de verdad usan tus clientes, no en una traducción robótica. Sumamos inglés solo donde lo necesitas.' },
      { q: '¿Pueden contestar mi WhatsApp mientras atiendo el mostrador?', a: 'Sí. Un asistente con IA responde por WhatsApp y en tu web al instante, justo cuando estás atendiendo la ventanita o el mostrador y no puedes tomar el teléfono. Así el prospecto que escribe recibe respuesta rápido y no se va con el de al lado. Te decimos con honestidad qué se puede integrar y qué no.' },
      { q: '¿Garantizan el primer lugar en Google?', a: 'No, y desconfía de quien lo prometa: nadie controla el algoritmo de Google. Lo que sí hacemos es trabajo honesto y medible: web rápida, ficha de Google ordenada, NAP consistente y contenido local en español, para que aparezcas cuando alguien busca tu servicio en Hialeah. El compromiso es con el método y la transparencia.' },
      { q: '¿Trabajan toda Hialeah y el área de Miami?', a: 'Sí. Trabajamos Hialeah y toda el área de Miami-Dade como negocio de área de servicio, de forma remota y eficiente. No necesitas ir a una oficina: todo el proceso, de la propuesta a la entrega, lo hacemos en línea y en tu idioma.' },
    ],
  },
  cta: {
    title: 'Sé uno de nuestros primeros <em>casos en Hialeah</em>',
    sub: 'Buscamos Clientes Fundadores en Hialeah. Cuéntanos sobre tu negocio y recibe una propuesta personalizada, en español, en menos de 24 horas, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios que componen el sistema',
    links: [
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: 'El servicio de diseño web a detalle: proceso, qué incluye y FAQ.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Miami', href: '/es/miami/seo-local', desc: 'Que tu negocio aparezca en Google y en Maps por todo Miami-Dade.', icon: 'lucide:search' },
      { label: 'IA conversacional en Miami', href: '/es/miami/ia-conversacional', desc: 'Un asistente que contesta tu WhatsApp 24/7, en español.', icon: 'lucide:messages-square' },
      { label: 'Miami y su área', href: '/es/miami', desc: 'Todos nuestros servicios para negocios de Miami-Dade.', icon: 'lucide:map-pin' },
    ],
  },
  service: {
    name: 'Diseño web y SEO en Hialeah',
    serviceType: 'Diseño web, SEO local e IA conversacional',
    description:
      'Diseño web a medida, SEO local e IA conversacional en español para negocios de Hialeah (Miami-Dade): cafeterías, panaderías, talleres, salones, botánicas y mercados. Web rápida y bilingüe, ficha de Google y respuesta inmediata por WhatsApp.',
    path: '/es/miami/hialeah',
    areaCity: 'Miami',
    areaRegion: 'Florida',
    priceValue: '1500',
    providerId: MIAMI_ID,
  },
};

export const clusters = {
  'houston/seo-local': houstonSeo,
  'houston/diseno-web': houstonWeb,
  'houston/ia-conversacional': houstonIa,
  'houston/ecommerce': houstonEcommerce,
  'houston/branding': houstonBranding,
  'houston/bienes-raices': houstonBienesRaices,
  'houston/contratistas': houstonContratistas,
  'houston/katy': houstonKaty,
  'houston/sugar-land': houstonSugarLand,
  'miami/diseno-web': miamiWeb,
  'miami/ia-conversacional': miamiIa,
  'miami/seo-local': miamiSeo,
  'miami/ecommerce': miamiEcommerce,
  'miami/doral': miamiDoral,
  'miami/hialeah': miamiHialeah,
  'ia-para-pymes': iaPymes,
} satisfies Record<string, ClusterPage>;

export { nap };
