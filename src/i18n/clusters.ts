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
export interface RelatedLink { label: string; href: string; desc: string; icon?: string }
export interface SectionRelated { tag: string; title: string; links: RelatedLink[] }

export interface ClusterPage {
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
    { label: 'Precios', href: '/es/precios' },
    { label: 'Ciudades', href: '/es/ciudades' },
    { label: 'Blog', href: '/es/blog' },
  ],
  cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
  langLabel: 'EN',
  langHref: '/en/',
  openMenu: 'Abrir menú',
  closeMenu: 'Cerrar menú',
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
  url: '/es/',
  display: 'marcyanstudio.com',
  result: 'Construido en HTML estático para que ChatGPT y Gemini puedan leerlo y citarlo.',
  accent: 'teal',
};

// ── Contenido compartido entre las dos landings de diseño web ──
const webIncludesItems: FeatureItem[] = [
  { icon: 'lucide:pen-tool', title: 'Diseño a medida', desc: 'Cada sitio se diseña desde cero alrededor de tu marca y tus objetivos. Sin plantillas recicladas.' },
  { icon: 'lucide:gauge', title: 'Rápido y móvil primero', desc: 'HTML ligero que carga en un par de segundos, impecable en celular y en computadora.' },
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
    title: 'SEO Local en Houston: posiciona tu negocio en Google | Marcyan',
    description:
      'Agencia de SEO local en Houston para PYMEs hispanas. Optimizamos tu Perfil de Google, tu sitio y tus reseñas para que te encuentren. Propuesta gratis en 24h.',
  },
  path: '/es/houston/seo-local',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'SEO Local', path: '/es/houston/seo-local' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'SEO Local',
    h1: 'SEO Local en <em>Houston</em>',
    sub: 'Aparece cuando tus clientes buscan en Google Maps y en los asistentes de IA. Optimizamos tu presencia local para que tu negocio en Houston gane más llamadas, visitas y reseñas, en español e inglés.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver cómo trabajamos', href: '#proceso' },
    chips: ['Bilingüe ES/EN', 'Sin contratos eternos', 'Reportes claros'],
    tone: 'gold',
  },
  answer: {
    q: '¿Qué es el SEO local y cómo ayuda a un negocio en Houston?',
    a: 'El SEO local es el trabajo de optimización que hace que tu negocio aparezca cuando alguien busca un servicio «cerca de mí» en Houston. Importa porque el 46% de las búsquedas en Google tienen intención local y el 76% de quienes buscan «cerca de mí» visitan un negocio en menos de 24 horas.',
    source: 'Google · BrightLocal, 2025',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'SEO local que <em>sí</em> mueve la aguja',
    items: [
      { icon: 'lucide:map-pin', title: 'Perfil de Google de Negocio', desc: 'Creamos u optimizamos tu ficha: categorías, servicios, fotos, descripción bilingüe y publicaciones.' },
      { icon: 'lucide:list-checks', title: 'NAP consistente', desc: 'Tu nombre, dirección y teléfono idénticos en Google, Bing, Apple Maps y directorios: la base que la IA lee.' },
      { icon: 'lucide:file-text', title: 'Contenido y páginas locales', desc: 'Páginas por servicio y ciudad, escritas para tu mercado de Houston, en español e inglés.' },
      { icon: 'lucide:star', title: 'Reseñas y reputación', desc: 'Te ayudamos a pedir y responder reseñas de forma constante, en el idioma de cada cliente.' },
      { icon: 'lucide:gauge', title: 'SEO técnico y velocidad', desc: 'Sitio rápido en HTML que Google y los asistentes de IA pueden leer sin tropiezos.' },
      { icon: 'marcyan-ai', title: 'Listo para la IA (AEO)', desc: 'Tu información en Bing y en un formato que ChatGPT y Gemini pueden citar.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué local',
    title: 'Houston es un mercado <em>grande y competido</em>',
    paragraphs: [
      'Houston es la cuarta ciudad más grande de Estados Unidos y una de las de mayor población hispana. Eso significa oportunidad, y también competencia. Aparecer en el «paquete local» de Google Maps cuando alguien busca tu servicio puede ser la diferencia entre una llamada y un cliente perdido.',
      'Trabajamos toda el área metropolitana de Houston con contexto real: <strong>conocemos el mercado bilingüe</strong> y escribimos para cómo busca de verdad tu cliente, en español y en inglés. Nada de plantillas genéricas ni promesas vacías.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'SEO local, <em>desde $600 al mes</em>',
    price: '$600',
    unit: '/mes',
    lead: 'Sin contratos eternos. Empezamos con lo esencial y crecemos según los resultados.',
    features: [
      'Optimización del Perfil de Google de Negocio',
      'NAP en directorios clave',
      '1 página local optimizada al mes',
      'Gestión de reseñas',
      'Reporte mensual claro',
      'Soporte bilingüe',
    ],
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
    note: 'El precio final depende del estado actual de tu negocio y de tu competencia. Te damos un alcance honesto en la propuesta, sin sorpresas.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Negocios de Houston que <em>ya posicionan</em>',
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
    items: proj('Texas Rush Remove', "Julio's Landscape TX"),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'SEO local en Houston, sin <em>letra chica</em>',
    items: [
      { q: '¿Cuánto cuesta el SEO local en Houston?', a: 'Nuestros planes de SEO local empiezan en $600 al mes, sin contratos a largo plazo. El precio final depende del estado actual de tu negocio, de tu competencia y de cuántas páginas o ubicaciones trabajemos. Te entregamos un alcance y un precio claros en la propuesta gratuita, antes de que decidas.' },
      { q: '¿En cuánto tiempo se ven resultados?', a: 'Las primeras señales suelen aparecer entre 2 y 8 semanas: más reseñas y más vistas en tu ficha de Google. El liderazgo sólido en búsquedas competidas toma de 3 a 6 meses de trabajo constante. El SEO es acumulativo: no es un interruptor, es una inversión que crece.' },
      { q: '¿Garantizan el primer lugar en Google?', a: 'No, y desconfía de quien lo prometa. Nadie controla el algoritmo de Google. Lo que sí garantizamos es trabajo honesto y medible: optimización correcta, reportes claros y mejoras continuas. Nuestro compromiso es con el método y la transparencia, no con un número imposible de asegurar.' },
      { q: '¿Qué incluye exactamente el servicio?', a: 'Optimización de tu Perfil de Google de Negocio, consistencia de tu nombre, dirección y teléfono (NAP) en directorios, páginas locales por servicio, gestión de reseñas, SEO técnico y preparación para los asistentes de IA. Ajustamos el alcance a tu presupuesto y a tus prioridades.' },
      { q: '¿Trabajan en español e inglés?', a: 'Sí. Somos un equipo bilingüe enfocado en el mercado hispano de Estados Unidos. Optimizamos y creamos contenido en español e inglés, porque tus clientes en Houston buscan en ambos idiomas.' },
      { q: '¿Atienden solo a Houston o también el área metropolitana?', a: 'Cubrimos Houston y toda su área metropolitana. Trabajamos como negocio de área de servicio, así que podemos posicionarte en las zonas donde realmente atiendes, sin necesidad de una dirección pública.' },
    ],
  },
  cta: {
    title: '¿Listo para que Houston te <em>encuentre</em>?',
    sub: 'Cuéntanos sobre tu negocio y recibe una propuesta de SEO local personalizada en menos de 24 horas, sin compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'Un sitio rápido y a medida es la base de todo buen SEO.', icon: 'lucide:layout-template' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Atiende y capta clientes 24/7 con un asistente en español.', icon: 'marcyan-ai' },
      { label: '¿Cuánto cuesta el SEO local en Houston?', href: '/es/precios/cuanto-cuesta-seo-local-houston', desc: 'La tarifa mensual publicada y qué incluye.', icon: 'lucide:tag' },
    ],
  },
  service: {
    name: 'SEO Local en Houston',
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
    title: 'Diseño Web en Houston | Páginas a medida y bilingües | Marcyan',
    description:
      'Diseño web profesional en Houston para PYMEs hispanas. Sitios rápidos, a medida y bilingües, listos para Google y la IA. Propuesta gratis en menos de 24 horas.',
  },
  path: '/es/houston/diseno-web',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'Diseño Web', path: '/es/houston/diseno-web' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Diseño Web',
    h1: 'Diseño Web en <em>Houston</em>',
    sub: 'Sitios web a medida, rápidos y bilingües para negocios de Houston. Diseñados para verse increíbles, cargar al instante y convertir visitas en clientes, listos para Google y para la IA.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
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
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
    note: webPriceNote,
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Negocios de Houston con <em>sitio nuevo</em>',
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
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
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que tu sitio nuevo aparezca en Google y en Maps.', icon: 'lucide:search' },
      { label: 'Diseño web bilingüe', href: '/es/houston/diseno-web-bilingue', desc: 'Tu sitio en español e inglés de verdad, no traducido.', icon: 'lucide:languages' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Suma un asistente que contesta y agenda 24/7.', icon: 'marcyan-ai' },
      { label: 'Tienda en línea en Houston', href: '/es/houston/ecommerce', desc: 'Cuando quieras vender en línea, te montamos la tienda.', icon: 'lucide:shopping-bag' },
      { label: 'Sitios para bienes raíces', href: '/es/houston/bienes-raices', desc: '¿Eres agente? Sitio con tus propiedades y SEO por zona.', icon: 'lucide:home' },
    ],
  },
  service: {
    name: 'Diseño Web en Houston',
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
    title: 'Diseño Web en Miami | Páginas a medida y bilingües | Marcyan',
    description:
      'Diseño web profesional para negocios de Miami y su área metropolitana. Sitios a medida, rápidos y bilingües, listos para Google y la IA. Propuesta gratis en 24h.',
  },
  path: '/es/miami/diseno-web',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Miami', path: '/es/miami' },
    { name: 'Diseño Web', path: '/es/miami/diseno-web' },
  ],
  hero: {
    badge: 'Miami, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Diseño Web',
    h1: 'Diseño Web en <em>Miami</em>',
    sub: 'Sitios web a medida, rápidos y bilingües para negocios de Miami y su área metropolitana. Diseño de élite que carga al instante, convierte visitas en clientes y te prepara para Google y la IA.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
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
      'Miami es uno de los mercados más hispanos de Estados Unidos, cerca del 69% de Miami-Dade, de Hialeah a Doral y de Brickell a Kendall, y el español no es un «extra»: es el idioma de tus clientes. Un sitio que no habla su idioma, y que no carga rápido en el celular, deja dinero sobre la mesa.',
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
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
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
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'SEO local en Miami', href: '/es/miami/seo-local', desc: 'Que tu sitio nuevo aparezca en Google y en Maps.', icon: 'lucide:search' },
      { label: 'IA conversacional en Miami', href: '/es/miami/ia-conversacional', desc: 'Atiende y capta clientes 24/7 con un asistente en español.', icon: 'marcyan-ai' },
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El mismo servicio, en nuestra base de operaciones.', icon: 'lucide:layout-template' },
    ],
  },
  service: {
    name: 'Diseño Web en Miami',
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
    { name: 'Servicios', path: '/es/#servicios' },
    { name: 'IA para tu Negocio', path: '/es/ia-para-pymes' },
  ],
  hero: {
    badge: 'IA Operativa',
    badgeIcon: 'marcyan-ai',
    kicker: 'IA para PYMEs',
    h1: 'IA para tu <em>Negocio</em>',
    sub: '¿Tu negocio pierde clientes por no contestar a tiempo? Ponemos la inteligencia artificial a trabajar para ti: asistentes que responden, agendan citas y captan prospectos a toda hora, en español, sin que tengas que saber de tecnología.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
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
      { icon: 'marcyan-ai', title: 'Asistente que contesta 24/7', desc: 'Un asistente de chat en tu sitio que responde preguntas y capta prospectos a cualquier hora, en español.' },
      { icon: 'marcyan-ai', title: 'WhatsApp automático', desc: 'Respuestas y seguimiento automáticos por WhatsApp y mensajes, para que ningún cliente se quede esperando.' },
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
    title: 'IA para tu negocio, en <em>simple</em>',
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
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'teal',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'Un sitio rápido es la base donde vive tu IA.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Aparece en Google además de en la IA.', icon: 'lucide:search' },
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: '¿Operas en Miami? También diseñamos allí.', icon: 'lucide:palette' },
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
// 5 · FLAGSHIP DE PRECIO (Fase 0) — "¿Cuánto cuesta una página web en Houston?"
//   Página de intención de precio answer-first. Reusa la plantilla ClusterLanding
//   → hereda Service+Offer($1,500)+FAQPage+BreadcrumbList. Enlaza a /es/precios
//   y a /es/houston/diseno-web. Munición AEO (Once Once explota este clúster).
// ═══════════════════════════════════════════════════════════════
const precioWebHouston: ClusterPage = {
  meta: {
    title: '¿Cuánto cuesta una página web en Houston? Precio real 2026 | Marcyan',
    description:
      'Una página web profesional en Houston cuesta desde $1,500: a medida, bilingüe y con SEO base. Te explicamos qué incluye y de qué depende el precio, sin costos ocultos.',
  },
  path: '/es/precios/cuanto-cuesta-una-pagina-web-houston',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Precios', path: '/es/precios' },
    { name: '¿Cuánto cuesta una página web en Houston?', path: '/es/precios/cuanto-cuesta-una-pagina-web-houston' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Precio · Diseño web',
    h1: 'Cuánto cuesta una <em>página web</em> en Houston',
    sub: 'Respuesta directa y sin rodeos: cuánto invertir, qué incluye y de qué depende el precio de un sitio profesional en Houston, con cifras reales, no un «contáctanos para cotizar».',
    primary: { label: 'Pedir mi precio exacto', href: '#contacto' },
    secondary: { label: 'Ver todos los precios', href: '/es/precios' },
    chips: ['Desde $1,500', 'A medida y bilingüe', 'SEO base incluido'],
    tone: 'gold',
  },
  answer: {
    q: '¿Cuánto cuesta una página web en Houston?',
    a: 'Una página web profesional a medida en Houston cuesta desde $1,500. Ese precio incluye un sitio rápido, bilingüe (español e inglés) y con SEO base. El total final depende del número de páginas y de las funciones que necesites: una tienda en línea o un sistema de reservas suben la inversión.',
  },
  includes: {
    tag: 'Qué incluye ese precio',
    title: 'Qué obtienes <em>desde $1,500</em>',
    items: webIncludesItems,
    tone: 'gold',
  },
  local: {
    tag: 'De qué depende',
    title: 'Por qué decimos <em>«desde»</em> y no un precio fijo',
    paragraphs: [
      'El precio de un sitio web no es una talla única: depende de cuántas páginas necesites, de las funciones (reservas, pagos, blog, integraciones) y de si quieres una o dos versiones de idioma. Un sitio de presentación de varias páginas parte de $1,500; una tienda en línea (e-commerce) arranca más arriba, alrededor de $2,900.',
      'Por eso publicamos el punto de partida real y no un número inflado para «cerrarte en la llamada». <strong>Te damos el alcance y el total por escrito en la propuesta</strong>, antes de que decidas, sin costos que aparezcan después.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Página web en Houston, <em>desde $1,500</em>',
    price: '$1,500',
    unit: 'proyecto único',
    lead: 'Pago por proyecto, sin mensualidades obligatorias. El precio depende del alcance.',
    features: webFeatures,
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
    note: webPriceNote,
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Sitios reales que <em>ya están en vivo</em>',
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
    items: proj('Texas Rush Remove', "Julio's Landscape TX", 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Precio de tu página web, <em>sin letra chica</em>',
    items: [
      { q: '¿Qué incluye el precio de $1,500?', a: 'Incluye un sitio profesional a medida de varias páginas, diseñado desde cero, rápido, listo para móvil, con versión en español e inglés, SEO técnico base y un formulario de contacto que llega a tu correo. No es una plantilla: se diseña alrededor de tu marca y tus objetivos.' },
      { q: '¿Por qué «desde $1,500» y no un precio fijo?', a: 'Porque cada negocio necesita algo distinto. $1,500 es el punto de partida real para un sitio de presentación. El total sube si pides más páginas, una tienda en línea, reservas o integraciones. Te damos el alcance y el precio cerrado por escrito en la propuesta, antes de empezar.' },
      { q: '¿El precio incluye SEO?', a: 'Incluye SEO técnico base: estructura correcta, velocidad, etiquetas y un formato que Google y los asistentes de IA pueden leer. El posicionamiento local continuo (Perfil de Google, reseñas, contenido mensual) es el servicio aparte de SEO local, desde $600 al mes, si lo necesitas.' },
      { q: '¿En cuánto tiempo está lista mi página?', a: 'Un sitio típico de varias páginas toma entre 2 y 4 semanas, según la rapidez con que recibamos tu contenido (textos, fotos, logo) y el número de revisiones. Las tiendas en línea toman más tiempo. Te damos un calendario realista desde el inicio.' },
      { q: '¿Hay mensualidades obligatorias?', a: 'No. El diseño web se paga por proyecto, una sola vez. El mantenimiento (desde $120 al mes) es opcional: respaldos, seguridad y soporte. Puedes manejar el sitio por tu cuenta si prefieres: el sitio es tuyo, nunca te dejamos amarrado.' },
      { q: '¿La propuesta tiene costo?', a: 'No. Cuéntanos tu proyecto y en menos de 24 horas recibes una propuesta personalizada con alcance y precio, sin costo ni compromiso. Si decides no avanzar, no pasa nada.' },
    ],
  },
  cta: {
    title: 'Pide el precio <em>exacto</em> de tu sitio',
    sub: 'Cuéntanos cuántas páginas y qué funciones necesitas, y recibe una propuesta con el precio cerrado en menos de 24 horas, sin compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios y precios relacionados',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El servicio a detalle: proceso, proyectos y FAQ.', icon: 'lucide:layout-template' },
      { label: '¿Cuánto cuesta un chatbot?', href: '/es/precios/cuanto-cuesta-un-chatbot', desc: 'El precio de un asistente con IA y qué incluye.', icon: 'marcyan-ai' },
      { label: '¿Cuánto cuesta el SEO local en Houston?', href: '/es/precios/cuanto-cuesta-seo-local-houston', desc: 'La tarifa mensual publicada y qué incluye.', icon: 'lucide:search' },
    ],
  },
  service: {
    name: 'Diseño Web en Houston',
    serviceType: 'Diseño web',
    description:
      'Diseño y desarrollo de páginas web a medida para negocios en Houston: rápidas, bilingües (español e inglés), con SEO base, desde $1,500.',
    path: '/es/precios/cuanto-cuesta-una-pagina-web-houston',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
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
  meta: {
    title: 'IA Conversacional en Houston | Asistente que contesta 24/7 | Marcyan',
    description:
      'Asistente con IA para negocios en Houston: contesta llamadas y WhatsApp perdidos, agenda citas y atiende en español 24/7. Te lo instalamos y mantenemos. Desde $900.',
  },
  path: '/es/houston/ia-conversacional',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'IA Conversacional', path: '/es/houston/ia-conversacional' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'IA Conversacional',
    h1: 'Asistente de IA para tu <em>negocio</em> en Houston',
    sub: '¿Pierdes clientes por no contestar a tiempo? Ponemos un asistente con IA a trabajar para ti: contesta llamadas y mensajes perdidos, agenda citas y atiende en español las 24 horas. Nosotros te lo instalamos, lo entrenamos con tu negocio y lo mantenemos.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver cómo funciona', href: '#faq' },
    chips: ['En español de verdad', 'Te lo instalamos y mantenemos', 'Siempre te pasa con una persona'],
    tone: 'teal',
  },
  answer: {
    q: '¿Cómo puede un asistente de IA ayudar a un negocio en Houston?',
    a: 'Un asistente de IA contesta al instante, justo cuando más importa: atiende llamadas y mensajes perdidos, agenda citas y responde preguntas en español las 24 horas. Responder a un prospecto en los primeros 5 minutos lo hace hasta 21 veces más probable de calificar que esperar 30, según el Lead Response Management Study del MIT.',
    source: 'Lead Response Management Study (MIT)',
  },
  includes: {
    tag: 'Qué hace por ti',
    title: 'IA que <em>no deja escapar</em> ni un cliente',
    items: [
      { icon: 'lucide:phone-missed', title: 'Rescata llamadas perdidas', desc: 'Cuando no puedes contestar, la IA responde por mensaje al instante para que el cliente no se vaya con la competencia.' },
      { icon: 'marcyan-ai', title: 'Contesta WhatsApp y mensajes', desc: 'Responde y da seguimiento por WhatsApp y redes a cualquier hora, incluso a las 11 de la noche y los fines de semana.' },
      { icon: 'lucide:calendar-check', title: 'Agenda citas solo', desc: 'Tus clientes reservan citas sin llamadas ni idas y vueltas: de día, de noche y en español.' },
      { icon: 'lucide:languages', title: 'Atiende en español de verdad', desc: 'Configurado en el español de tus clientes, con tu tono. No es una traducción robótica.' },
      { icon: 'lucide:user-round', title: 'Siempre te pasa con una persona', desc: 'Cuando hace falta un humano, pasa la conversación a tu equipo. El cliente nunca queda atrapado con un robot.' },
      { icon: 'lucide:wrench', title: 'Lo instalamos y mantenemos', desc: 'No te entregamos un software para que pelees con él: lo dejamos funcionando, entrenado con tu negocio, y lo cuidamos.' },
    ],
    tone: 'teal',
  },
  local: {
    tag: 'Por qué con nosotros',
    title: 'Una agencia hispana que <em>te lo instala</em>, no un software que peleas solo',
    paragraphs: [
      'En internet hay decenas de herramientas de IA que te venden una suscripción y te dejan solo para configurarla. Para un negocio ocupado, eso casi siempre termina olvidado. Nosotros trabajamos distinto: somos una agencia hispana en Houston que te lo instala, lo entrena con tu negocio y le da mantenimiento.',
      'Hablamos tu idioma y conocemos a tu cliente hispano. Configuramos el asistente en español de verdad, no traducido por un robot, y nos aseguramos de que, cuando un cliente quiera una persona, hable con tu equipo. <strong>Tú te dedicas a tu negocio; de la tecnología nos encargamos nosotros.</strong>',
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
      'En español, con tu tono',
      'Integración con WhatsApp y tu calendario',
      'Mensajes y respuestas listos',
      'Capacitación para tu equipo',
      'Instalación y mantenimiento',
    ],
    cta: { label: 'Quiero automatizar mi negocio', href: '#contacto' },
    note: '$900 es el punto de partida para una automatización inicial (por ejemplo, un asistente o una agenda de citas). A diferencia de una suscripción de software que configuras tú, aquí incluimos la instalación, el entrenamiento con tu negocio y el mantenimiento. Los proyectos más completos se cotizan según el alcance.',
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
      { q: '¿Cuánto cuesta poner un asistente con IA en mi negocio?', a: 'Una automatización inicial empieza en $900 e incluye la instalación, el entrenamiento con tu negocio y el mantenimiento: no es solo una suscripción de software que configuras tú. Empezamos con una sola solución a tu mayor dolor y crecemos desde ahí. Te damos un precio claro en la propuesta gratuita.' },
      { q: '¿Necesito saber de tecnología para usarlo?', a: 'No, y esa es justamente la idea. Nosotros lo configuramos, lo conectamos y te lo dejamos funcionando, con una capacitación sencilla para tu equipo. Tú te dedicas a tu negocio; de la parte técnica nos encargamos nosotros.' },
      { q: '¿El asistente habla español o suena como robot?', a: 'Habla español de verdad, con el tono de tu negocio, no una traducción robótica. Lo configuramos para el español de tus clientes en Houston, y también en inglés si lo necesitas. El objetivo es que tus clientes se sientan bien atendidos.' },
      { q: '¿La IA puede contestar mi WhatsApp y agendar citas sola?', a: 'Sí. Conectamos el asistente con tu WhatsApp, tu calendario y muchas de las herramientas que ya usas, para que responda mensajes y agende citas a cualquier hora. En la propuesta te decimos con honestidad qué se puede integrar y qué no, sin promesas vacías.' },
      { q: '¿Qué pasa si el cliente quiere hablar con una persona?', a: 'Siempre puede. El asistente está hecho para ayudar, no para atrapar a nadie: cuando hace falta un humano, pasa la conversación a tu equipo. El cliente nunca queda dando vueltas con un robot.' },
      { q: '¿En cuánto tiempo queda funcionando?', a: 'Una automatización inicial suele quedar lista en una a tres semanas, según qué herramientas conectemos y qué tan listo esté tu contenido (respuestas, horarios, servicios). Te damos un calendario realista desde el inicio.' },
    ],
  },
  cta: {
    title: 'Deja de perder clientes por <em>no contestar</em>',
    sub: 'Cuéntanos cuál es tu mayor dolor (llamadas perdidas, WhatsApp sin responder, citas que no se agendan) y te propondremos una solución con IA en menos de 24 horas, sin compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'teal',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'Un sitio rápido es la base donde vive tu asistente de IA.', icon: 'lucide:layout-template' },
      { label: '¿Cuánto cuesta un chatbot?', href: '/es/precios/cuanto-cuesta-un-chatbot', desc: 'El precio de un asistente con IA y qué incluye.', icon: 'lucide:tag' },
      { label: 'IA para abogados de inmigración', href: '/es/houston/abogados-inmigracion', desc: 'El caso de uso: captar y agendar consultas 24/7 en español.', icon: 'lucide:scale' },
    ],
  },
  service: {
    name: 'IA Conversacional en Houston',
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
    title: 'Diseño de Tienda en Línea en Houston | E-Commerce bilingüe | Marcyan',
    description:
      'Diseño de tienda en línea en Houston para negocios hispanos: catálogo, pagos seguros y bilingüe (Shopify, WooCommerce o a medida). Desde $2,900. Propuesta gratis en 24h.',
  },
  path: '/es/houston/ecommerce',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'Tienda en Línea', path: '/es/houston/ecommerce' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Tienda en línea',
    h1: 'Diseño de tienda en línea en <em>Houston</em>',
    sub: 'Vende en línea las 24 horas con una tienda a medida, rápida y bilingüe. Catálogo, pagos seguros y todo listo para que tus clientes en Houston te compren desde el celular, en español e inglés.',
    primary: { label: 'Cotizar mi tienda', href: '#contacto' },
    secondary: { label: 'Ver todos los precios', href: '/es/precios' },
    chips: ['Pagos seguros', 'Bilingüe ES/EN', 'Shopify, WooCommerce o a medida'],
    tone: 'gold',
  },
  answer: {
    q: '¿Cuánto cuesta una tienda en línea en Houston?',
    a: 'Una tienda en línea profesional en Houston empieza en $2,900 e incluye catálogo, carrito, pagos seguros y versión bilingüe. Y la inversión tiene sentido: el comercio electrónico ya supera el 16% de las ventas minoristas en Estados Unidos y crece año con año, según el U.S. Census Bureau.',
    source: 'U.S. Census Bureau',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Una tienda lista para <em>vender</em>',
    items: [
      { icon: 'lucide:shopping-bag', title: 'Catálogo y carrito', desc: 'Tus productos organizados, con fotos y variantes, y un carrito de compras claro y fácil de usar.' },
      { icon: 'lucide:credit-card', title: 'Pagos seguros en línea', desc: 'Aceptas tarjeta y PayPal con pasarelas confiables como Stripe. Te guiamos con la cuenta y los requisitos.' },
      { icon: 'lucide:smartphone', title: 'Diseñada para el celular', desc: 'La mayoría compra desde el teléfono. Tu tienda carga rápido y se ve impecable en cualquier pantalla.' },
      { icon: 'lucide:languages', title: 'Bilingüe español e inglés', desc: 'Vende en español a tu comunidad y amplía tu alcance en inglés, todo en la misma tienda.' },
      { icon: 'lucide:search', title: 'Lista para Google y la IA', desc: 'Estructura optimizada para que te encuentren en buscadores y en asistentes como ChatGPT.' },
      { icon: 'lucide:settings', title: 'La plataforma correcta para ti', desc: 'Shopify, WooCommerce o una solución a medida: la elegimos contigo según tu producto y tu presupuesto.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Cómo lo hacemos',
    title: '¿Shopify, WooCommerce o <em>a medida</em>?',
    paragraphs: [
      'No vendemos una sola plataforma a la fuerza. Si quieres lanzar rápido y vender simple, Shopify suele ser ideal; si necesitas más control o ya usas WordPress, WooCommerce encaja mejor; y para necesidades especiales, construimos a medida. Lo elegimos contigo según tu producto, tu volumen y tu presupuesto, con honestidad.',
      'Para vender en Estados Unidos hay requisitos que son tuyos: una cuenta para recibir pagos y, según el caso, tu EIN del IRS. <strong>Te guiamos paso a paso en todo el proceso.</strong> Y como en Houston tu mercado es bilingüe, diseñamos tu tienda en español e inglés desde el inicio: un cruce que pocos aprovechan.',
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
      { q: '¿Cómo recibo los pagos con tarjeta y PayPal?', a: 'Tu tienda se conecta con pasarelas seguras como Stripe y PayPal. Para vender en Estados Unidos necesitas una cuenta para recibir pagos y, según el caso, tu EIN del IRS; te guiamos paso a paso en lo que es tuyo, sin dejarte solo con la parte complicada.' },
      { q: '¿La tienda incluye dominio, hospedaje y certificado de seguridad (SSL)?', a: 'Te orientamos con el dominio, el hospedaje y el certificado SSL para que tu tienda salga en vivo y segura, sin dolores de cabeza. Según la plataforma, algunos van incluidos en su plan; te explicamos con claridad qué se paga y a quién, antes de empezar.' },
      { q: '¿La tienda es bilingüe en español e inglés?', a: 'Sí, y es una de nuestras ventajas. Diseñamos tu tienda en español e inglés desde el inicio, para que vendas en español a tu comunidad y amplíes tu alcance en inglés: un cruce que pocos competidores en Houston aprovechan.' },
      { q: '¿Tienen tiendas en línea ya hechas que pueda ver?', a: 'Seremos honestos: estamos comenzando con e-commerce, así que todavía no publicamos un caso de tienda propio. Sí construimos web-apps y sitios a medida que ya están en vivo (como la app de reservas de Rosy Nails). Por eso ofrecemos cupos de Cliente Fundador para tu tienda, con condiciones especiales.' },
    ],
  },
  cta: {
    title: 'Empieza a vender en línea en <em>Houston</em>',
    sub: 'Cuéntanos qué vendes y cuántos productos tienes, y recibe una propuesta de tienda en línea en menos de 24 horas, sin compromiso.',
    primary: { label: 'Cotizar mi tienda gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'Si aún no necesitas vender en línea, empieza por tu sitio.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que tu tienda aparezca en Google y en Maps.', icon: 'lucide:search' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Un asistente que contesta y agenda 24/7.', icon: 'marcyan-ai' },
    ],
  },
  service: {
    name: 'Diseño de Tienda en Línea en Houston',
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
// 8 · PRECIO — ¿CUÁNTO CUESTA UN CHATBOT? ($900, wedge IA)  [Ola 2 · B2]
//   Intención de precio del wedge IA (demanda ALTA validada). Ángulo: $900 PAGO
//   ÚNICO, servicio gestionado (instalación+entrenamiento+mantenimiento), NO una
//   suscripción que crece. Honestidad DURA: Meta cobra por conversación vía la
//   API de WhatsApp → se DICE de frente (no "no pagas nada más").
// ═══════════════════════════════════════════════════════════════
const precioChatbot: ClusterPage = {
  meta: {
    title: '¿Cuánto cuesta un chatbot de WhatsApp con IA? Precio real | Marcyan',
    description:
      'Un asistente con IA con Marcyan cuesta desde $900, pago único, e incluye instalación, entrenamiento y mantenimiento — no es una suscripción que crece cada mes. Propuesta gratis en 24h.',
  },
  path: '/es/precios/cuanto-cuesta-un-chatbot',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Precios', path: '/es/precios' },
    { name: '¿Cuánto cuesta un chatbot?', path: '/es/precios/cuanto-cuesta-un-chatbot' },
  ],
  hero: {
    badge: 'Asistente con IA',
    badgeIcon: 'marcyan-ai',
    kicker: 'Precio · IA conversacional',
    h1: 'Cuánto cuesta un <em>chatbot</em> con IA',
    sub: 'Respuesta directa: cuánto invertir en un asistente con IA para tu WhatsApp y tu sitio, qué incluye y por qué un servicio hecho por nosotros no es lo mismo que una suscripción de software que crece cada mes.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver IA conversacional en Houston', href: '/es/houston/ia-conversacional' },
    chips: ['Desde $900, pago único', 'Instalación + entrenamiento', 'Te lo mantenemos'],
    tone: 'teal',
  },
  answer: {
    q: '¿Cuánto cuesta un chatbot de WhatsApp para tu negocio?',
    a: 'Con Marcyan, un asistente con IA para tu WhatsApp y tu sitio empieza en $900, como pago único, e incluye la instalación, el entrenamiento con la información de tu negocio y el mantenimiento. No es una suscripción de software que configuras tú: es un servicio hecho por nosotros, con un precio claro por adelantado.',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Qué cubre el <em>precio</em>',
    items: [
      { icon: 'lucide:settings-2', title: 'Instalación completa', desc: 'Lo dejamos funcionando en tu sitio y tu WhatsApp. Tú no peleas con ninguna configuración.' },
      { icon: 'lucide:graduation-cap', title: 'Entrenamiento con tu negocio', desc: 'Lo alimentamos con tus servicios, precios, horarios y preguntas frecuentes, para que responda como tu negocio.' },
      { icon: 'marcyan-ai', title: 'WhatsApp y sitio web', desc: 'Conectamos el asistente con tu WhatsApp y tu sitio para que conteste donde tus clientes te escriben.' },
      { icon: 'lucide:calendar-check', title: 'Captación y agenda', desc: 'Capta prospectos y agenda citas a cualquier hora, sin que se te escape un cliente.' },
      { icon: 'lucide:user-round', title: 'Pase a una persona', desc: 'Cuando hace falta un humano, pasa la conversación a tu equipo. El cliente nunca queda atrapado.' },
      { icon: 'lucide:wrench', title: 'Soporte y mantenimiento', desc: 'No te dejamos solo después del lanzamiento: lo ajustamos y le damos mantenimiento.' },
    ],
    tone: 'teal',
  },
  local: {
    tag: 'Cómo se cobra',
    title: 'Un servicio hecho por ti, no una <em>suscripción que crece</em>',
    paragraphs: [
      'En el mercado abundan las apps de chatbot por suscripción: empiezan baratas (unos $15 a $30 al mes) pero el precio sube al sumar la IA, las plantillas y los cobros por uso, y la configuras tú. Al otro extremo, un desarrollo totalmente a la medida puede costar miles de dólares. Nuestro punto medio: $900 una sola vez, hecho por nosotros.',
      '<strong>Seamos claros con un detalle técnico:</strong> si se usa la API oficial de WhatsApp, Meta cobra algunas conversaciones (hay un volumen gratis al mes y luego un costo por conversación). Ese cobro es de Meta, no nuestro: te lo explicamos por adelantado para que no haya sorpresas. Nosotros cobramos por dejarte el asistente funcionando, no por cada mensaje.',
    ],
    tone: 'teal',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Asistente con IA, <em>desde $900</em>',
    price: '$900',
    unit: 'pago único',
    lead: 'Pago único por el servicio: instalación, entrenamiento, puesta en marcha y mantenimiento. Sin mensualidad obligatoria.',
    features: [
      'Instalación y puesta en marcha',
      'Entrenamiento con tu negocio',
      'Conexión con WhatsApp y tu sitio',
      'Mensajes y respuestas en español',
      'Capacitación para tu equipo',
      'Mantenimiento y soporte',
    ],
    cta: { label: 'Quiero mi asistente', href: '#contacto' },
    note: '$900 es el punto de partida para una automatización inicial (por ejemplo, un asistente que contesta y agenda) e incluye instalación, entrenamiento, puesta en marcha y mantenimiento. Los proyectos más completos se cotizan según el alcance. Aparte: si se usa la API oficial de WhatsApp, Meta cobra algunas conversaciones; ese costo es de Meta, no nuestro, y te lo explicamos por adelantado.',
    tone: 'teal',
  },
  proof: {
    tag: 'Automatización real',
    title: 'Automatización que <em>ya está en vivo</em>',
    cta: { label: 'Quiero algo así', href: '#contacto' },
    items: [...proj('Rosy Nails & Care'), caso0],
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Precio del chatbot, <em>sin letra chica</em>',
    items: [
      { q: '¿El chatbot se paga una sola vez o es mensual?', a: 'Con nosotros se paga una sola vez: desde $900 por la instalación, el entrenamiento y la puesta en marcha, con mantenimiento incluido. No te amarramos a una mensualidad obligatoria. Si más adelante quieres un plan de mantenimiento continuo más amplio, es opcional y se cotiza aparte, siempre con un precio claro.' },
      { q: '¿Qué incluye el precio de $900?', a: 'Incluye instalar el asistente, entrenarlo con la información de tu negocio (servicios, precios, horarios, preguntas frecuentes), conectarlo con tu WhatsApp y tu sitio, dejar listos los mensajes en español, capacitar a tu equipo y darle mantenimiento. Es un servicio hecho por nosotros, no un software que configuras tú.' },
      { q: '¿Tengo que pagarle algo a WhatsApp o a Meta aparte?', a: 'Puede que sí, y preferimos decírtelo de frente: si se usa la API oficial de WhatsApp, Meta ofrece un volumen de conversaciones gratis al mes y luego cobra un costo por conversación. Ese cobro es de Meta, no nuestro. Te explicamos por adelantado si aplica a tu caso, para que no haya sorpresas.' },
      { q: '¿En qué se diferencia de una app de chatbot por suscripción?', a: 'Las apps por suscripción suelen empezar baratas y subir al sumar la IA y los extras, y las configuras tú. Nosotros te lo dejamos funcionando, entrenado con tu negocio y en español de verdad. Pagas por el resultado, no por pelear con una herramienta cada mes.' },
      { q: '¿Necesito saber de tecnología?', a: 'No. Nosotros lo configuramos, lo conectamos y te lo entregamos funcionando, con una capacitación sencilla para tu equipo. Tú te dedicas a tu negocio; de la parte técnica nos encargamos nosotros.' },
      { q: '¿En cuánto tiempo queda listo?', a: 'Una automatización inicial suele quedar lista en una a tres semanas, según qué herramientas conectemos y qué tan listo esté tu contenido (respuestas, horarios, servicios). Te damos un calendario realista desde el inicio.' },
    ],
  },
  cta: {
    title: 'Pon un asistente a <em>contestar por ti</em>',
    sub: 'Cuéntanos qué quieres que conteste y agende, y te damos una propuesta con el precio cerrado en menos de 24 horas, sin compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'teal',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'IA y precios',
    links: [
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'El servicio a detalle, con casos de uso reales.', icon: 'marcyan-ai' },
      { label: '¿Cuánto cuesta una página web en Houston?', href: '/es/precios/cuanto-cuesta-una-pagina-web-houston', desc: 'El precio de un sitio, con qué incluye.', icon: 'lucide:layout-template' },
      { label: '¿Cuánto cuesta el SEO local en Houston?', href: '/es/precios/cuanto-cuesta-seo-local-houston', desc: 'La tarifa mensual publicada y qué incluye.', icon: 'lucide:search' },
    ],
  },
  service: {
    name: 'Chatbot e IA Conversacional',
    serviceType: 'Automatización con IA y asistentes conversacionales',
    description:
      'Servicio gestionado de asistente con IA para negocios: instalación, entrenamiento con la información del negocio, conexión con WhatsApp y sitio web, y mantenimiento. En español, desde $900 (pago único).',
    path: '/es/precios/cuanto-cuesta-un-chatbot',
    priceValue: '900',
    providerId: ORG_ID,
  },
};

// ═══════════════════════════════════════════════════════════════
// 9 · PRECIO — ¿CUÁNTO CUESTA EL SEO LOCAL EN HOUSTON? ($600/mes)  [Ola 2 · B2]
//   Intención de precio (demanda ALTA). Ángulo TRANSPARENCIA: tarifa mensual
//   publicada. ⚠️ Once Once YA usa "transparencia + mes a mes" → DIFERENCIAR con
//   answer-first + FAQPage + honestidad de plazos + wedge bilingüe (no clonar, no
//   competir solo por precio, no nombrar competidores). Offer MENSUAL (monthly).
// ═══════════════════════════════════════════════════════════════
const precioSeoHouston: ClusterPage = {
  meta: {
    title: '¿Cuánto cuesta el SEO local en Houston? Precio mensual real | Marcyan',
    description:
      'El SEO local en Houston con Marcyan empieza en $600 al mes, publicado y sin contratos largos forzados. Qué incluye y en cuánto se ven resultados. Propuesta gratis en 24h.',
  },
  path: '/es/precios/cuanto-cuesta-seo-local-houston',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Precios', path: '/es/precios' },
    { name: '¿Cuánto cuesta el SEO local en Houston?', path: '/es/precios/cuanto-cuesta-seo-local-houston' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Precio · SEO local',
    h1: 'Cuánto cuesta el <em>SEO local</em> en Houston',
    sub: 'Respuesta directa, con la tarifa mensual publicada: cuánto invertir en SEO local en Houston, qué incluye y en cuánto tiempo se ven resultados, sin que tengas que pedir una llamada para conocer el precio.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver SEO local en Houston', href: '/es/houston/seo-local' },
    chips: ['Desde $600/mes', 'Sin contratos largos forzados', 'Reportes claros'],
    tone: 'gold',
  },
  answer: {
    q: '¿Cuánto cuesta el SEO local en Houston?',
    a: 'El SEO local en Houston con Marcyan empieza en $600 al mes, y lo publicamos de frente. El precio final depende de tu competencia y de cuántas páginas o ubicaciones trabajemos. Lo cobramos mes a mes, sin contratos largos forzados, y verás las primeras señales en 2 a 8 semanas, con tracción real en 3 a 6 meses.',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Qué incluye tu <em>mensualidad</em>',
    items: [
      { icon: 'lucide:map-pin', title: 'Perfil de Google de Negocio', desc: 'Creamos u optimizamos tu ficha: categorías, servicios, fotos, descripción bilingüe y publicaciones.' },
      { icon: 'lucide:list-checks', title: 'NAP y directorios', desc: 'Tu nombre, dirección y teléfono consistentes en Google, Bing, Apple Maps y directorios clave.' },
      { icon: 'lucide:file-text', title: 'Contenido local mensual', desc: 'Páginas y contenido por servicio y zona, escritos para tu mercado de Houston, en español e inglés.' },
      { icon: 'lucide:star', title: 'Reseñas y reputación', desc: 'Te ayudamos a pedir y responder reseñas de forma constante, en el idioma de cada cliente.' },
      { icon: 'lucide:bar-chart-3', title: 'Reporte mensual claro', desc: 'Cada mes ves qué hicimos y cómo va tu posicionamiento, sin tecnicismos confusos.' },
      { icon: 'marcyan-ai', title: 'Listo para la IA (AEO)', desc: 'Tu información en un formato que ChatGPT y Gemini pueden leer y citar.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué lo publicamos',
    title: 'La tarifa mensual, <em>a la vista</em>',
    paragraphs: [
      'El SEO local cobrado mes a mes va desde unos cientos hasta varios miles de dólares, según la competencia de tu sector y tu ciudad. Muchas agencias no te dicen su tarifa hasta meterte en una llamada de ventas. Nosotros la publicamos: empieza en $600 al mes, y de ahí ajustamos según tu caso, siempre por escrito.',
      '<strong>El SEO no es un interruptor, es una inversión que crece.</strong> Por eso trabajamos mes a mes, sin amarrarte a un contrato largo, pero te explicamos con honestidad que rendir toma su tiempo: las primeras señales llegan en semanas y el liderazgo sólido en búsquedas competidas, en varios meses. Preferimos que te quedes por los resultados.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'SEO local, <em>desde $600 al mes</em>',
    price: '$600',
    unit: '/mes',
    lead: 'Mes a mes, sin contratos largos forzados. Empezamos con lo esencial y crecemos según los resultados.',
    features: [
      'Optimización del Perfil de Google de Negocio',
      'NAP en directorios clave',
      '1 página local optimizada al mes',
      'Gestión de reseñas',
      'Reporte mensual claro',
      'Soporte bilingüe',
    ],
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
    note: 'El precio final depende del estado actual de tu negocio, de tu competencia y de cuántas páginas o ubicaciones trabajemos. Te damos un alcance y un precio claros en la propuesta gratuita, antes de que decidas. No prometemos el primer lugar: nadie controla el algoritmo de Google.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Negocios de Houston que <em>ya posicionan</em>',
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
    items: proj('Texas Rush Remove', "Julio's Landscape TX"),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Precio del SEO local, <em>sin rodeos</em>',
    items: [
      { q: '¿Cuánto cuesta el SEO local en Houston al mes?', a: 'Empieza en $600 al mes. El precio final depende de tu competencia, del estado actual de tu negocio y de cuántas páginas o ubicaciones trabajemos. Lo publicamos de frente y te entregamos un alcance y un precio claros en la propuesta gratuita, antes de que decidas.' },
      { q: '¿Hay contrato o permanencia mínima?', a: 'No te amarramos a un contrato largo: trabajamos mes a mes y puedes pausar o cancelar avisando con una anticipación razonable. Eso sí, te explicamos con honestidad que el SEO necesita varios meses para rendir: preferimos que te quedes por los resultados, no por una cláusula.' },
      { q: '¿En cuánto tiempo se ven resultados?', a: 'Las primeras señales suelen aparecer entre 2 y 8 semanas: más reseñas y más vistas en tu ficha de Google. La tracción sólida en búsquedas competidas toma de 3 a 6 meses de trabajo constante. El SEO es acumulativo: una inversión que crece, no un interruptor.' },
      { q: '¿Qué incluye la mensualidad?', a: 'Optimización de tu Perfil de Google de Negocio, consistencia de tu NAP en directorios, una página local al mes, gestión de reseñas, SEO técnico y preparación para los asistentes de IA, más un reporte mensual claro. Ajustamos el alcance a tu presupuesto y a tus prioridades.' },
      { q: '¿Garantizan el primer lugar en Google?', a: 'No, y desconfía de quien lo prometa. Nadie controla el algoritmo de Google. Lo que sí garantizamos es trabajo honesto y medible: optimización correcta, reportes claros y mejoras continuas. Nuestro compromiso es con el método y la transparencia, no con un número imposible de asegurar.' },
      { q: '¿Por qué unas agencias cobran $600 y otras miles?', a: 'Porque el alcance cambia muchísimo: número de ubicaciones, competencia del sector, cantidad de contenido y si incluyen anuncios o no. Nuestra tarifa empieza en $600 al mes para lo esencial del SEO local y sube según lo que tu caso necesite, siempre dicho por adelantado.' },
    ],
  },
  cta: {
    title: 'Aparece en Houston, mes <em>a mes</em>',
    sub: 'Cuéntanos sobre tu negocio y recibe una propuesta de SEO local con alcance y precio claros en menos de 24 horas, sin compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'SEO y precios',
    links: [
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'El servicio a detalle, con qué incluye y proyectos.', icon: 'lucide:search' },
      { label: '¿Cuánto cuesta una página web en Houston?', href: '/es/precios/cuanto-cuesta-una-pagina-web-houston', desc: 'El precio de un sitio, con qué incluye y de qué depende.', icon: 'lucide:layout-template' },
      { label: '¿Cuánto cuesta un chatbot?', href: '/es/precios/cuanto-cuesta-un-chatbot', desc: 'El precio de un asistente con IA y qué incluye.', icon: 'marcyan-ai' },
    ],
  },
  service: {
    name: 'SEO Local en Houston',
    serviceType: 'SEO local',
    description:
      'SEO local mensual para PYMEs en Houston: Perfil de Google de Negocio, consistencia NAP, contenido local bilingüe, gestión de reseñas y reporte mensual. Desde $600 al mes, sin contratos largos forzados.',
    path: '/es/precios/cuanto-cuesta-seo-local-houston',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '600',
    monthly: true,
    providerId: HOUSTON_ID,
  },
};

// ═══════════════════════════════════════════════════════════════
// 10 · HOUSTON — BRANDING E IDENTIDAD ($750)  [Ola 2 · B2]
//   Keyword "diseño de logo / branding houston". SERVICIO profesional (NO DIY).
//   PROOF REAL: Julio's Landscape TX (marca+identidad+sitio desde cero). Ángulo
//   honesto "¿usan IA?": IA para explorar, criterio humano para decidir. Stat
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
    { name: 'Branding e Identidad', path: '/es/houston/branding' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Branding e identidad',
    h1: 'Diseño de logo y marca en <em>Houston</em>',
    sub: 'Una identidad que se ve profesional y se siente tuya: logo, colores, tipografía y un sistema visual coherente. Diseñada a medida, en español, para que tu negocio en Houston cause una excelente primera impresión.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
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
      { icon: 'marcyan-ai', title: 'IA para explorar, criterio humano para decidir', desc: 'Usamos IA para proponer ideas rápido, pero cada decisión la toma un diseñador. La estrategia no la deja a la máquina.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Cómo lo hacemos',
    title: 'IA para <em>explorar</em>, criterio humano para decidir',
    paragraphs: [
      'La inteligencia artificial es excelente para generar muchas ideas rápido y barato, pero una marca que aguante el tiempo necesita estrategia y criterio. Por eso usamos la IA para acelerar la exploración y proponer caminos, y un diseñador define la dirección, refina cada detalle y se asegura de que tu marca diga lo correcto.',
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
      { q: '¿Usan inteligencia artificial o lo hace un diseñador?', a: 'Las dos cosas, en su justo lugar. Usamos IA para explorar ideas rápido, pero las decisiones de estrategia y el refinamiento los hace un diseñador. La IA acelera; el criterio humano decide. Así obtienes una marca pensada, no una plantilla generada al azar.' },
      { q: '¿El diseño de marca incluye la página web?', a: 'Puede incluirla. El branding y el sitio web son servicios distintos, pero los combinamos a menudo porque juntos quedan coherentes desde el inicio. Si quieres marca y sitio, te damos un alcance y un precio claros para todo el proyecto.' },
      { q: '¿Atienden a negocios hispanos y en español?', a: 'Sí, es nuestra especialidad. Trabajamos enfocados en el mercado hispano de Houston: diseñamos y te acompañamos en español, con el contexto cultural correcto para que tu marca conecte con tu cliente.' },
    ],
  },
  cta: {
    title: 'Dale a tu negocio una <em>marca a su altura</em>',
    sub: 'Cuéntanos sobre tu negocio y recibe una propuesta de branding personalizada en menos de 24 horas, sin compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
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
    name: 'Branding e Identidad en Houston',
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
  meta: {
    title: 'IA Conversacional en Miami | Asistente que contesta 24/7 | Marcyan',
    description:
      'Asistente con IA para negocios de Miami: contesta WhatsApp y llamadas perdidas, agenda citas y atiende en español 24/7. Te lo instalamos y mantenemos. Desde $900.',
  },
  path: '/es/miami/ia-conversacional',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Miami', path: '/es/miami' },
    { name: 'IA Conversacional', path: '/es/miami/ia-conversacional' },
  ],
  hero: {
    badge: 'Miami, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'IA Conversacional',
    h1: 'Asistente de IA para tu <em>negocio</em> en Miami',
    sub: '¿Pierdes clientes por no contestar a tiempo? Ponemos un asistente con IA a trabajar para ti: contesta WhatsApp y llamadas perdidas, agenda citas y atiende en el español de tus clientes las 24 horas. Nosotros te lo instalamos, lo entrenamos con tu negocio y lo mantenemos.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver cómo funciona', href: '#faq' },
    chips: ['En español de verdad', 'Te lo instalamos y mantenemos', 'Siempre te pasa con una persona'],
    tone: 'teal',
  },
  answer: {
    q: '¿Cómo puede un asistente de IA ayudar a un negocio en Miami?',
    a: 'En Miami tus clientes te escriben por WhatsApp, y el que contesta primero se queda con la venta. Un asistente de IA responde al instante, agenda citas y atiende en español las 24 horas. Responder en los primeros 5 minutos hace 21 veces más probable calificar un prospecto que esperar 30, según el Lead Response Management Study del MIT.',
    source: 'Lead Response Management Study (MIT)',
  },
  includes: {
    tag: 'Qué hace por ti',
    title: 'IA que <em>no deja escapar</em> ni un cliente',
    items: [
      { icon: 'marcyan-ai', title: 'Contesta WhatsApp y mensajes', desc: 'WhatsApp es el canal donde el cliente cubano, venezolano o colombiano de Miami te escribe. La IA responde y da seguimiento a cualquier hora, hasta de madrugada.' },
      { icon: 'lucide:calendar-check', title: 'Agenda citas y reservas solo', desc: 'Tu restaurante, tu clínica estética o tu taller llenan la agenda sin que pares de trabajar: el cliente reserva por su cuenta, de día o de noche.' },
      { icon: 'lucide:phone-missed', title: 'Rescata llamadas perdidas', desc: 'Cuando no puedes contestar, la IA responde por mensaje al instante para que el cliente no se vaya con el de al lado.' },
      { icon: 'lucide:languages', title: 'Habla como se habla en Miami', desc: 'Lo configuramos en el español que de verdad usan tus clientes, con su acento y su tono. No suena a traducción ni a robot, y detecta si prefieren inglés.' },
      { icon: 'lucide:user-round', title: 'Siempre te pasa con una persona', desc: 'Cuando hace falta un humano, pasa la conversación a tu equipo. El cliente nunca queda atrapado con un robot.' },
      { icon: 'lucide:wrench', title: 'Lo instalamos y mantenemos', desc: 'No te entregamos un software para que pelees con él: lo dejamos funcionando, entrenado con tu negocio, y lo cuidamos.' },
    ],
    tone: 'teal',
  },
  local: {
    tag: 'Por qué con nosotros',
    title: 'Una agencia hispana que <em>te lo instala</em>, no un software que peleas solo',
    paragraphs: [
      'En internet hay decenas de apps de IA que te venden una suscripción y te dejan solo para configurarla. Para un negocio ocupado, eso casi siempre termina olvidado. Nosotros trabajamos distinto: te lo instalamos, lo entrenamos con tu negocio y le damos mantenimiento; tú no tocas nada.',
      'En Miami eso pesa todavía más: aquí el primer contacto pasa por WhatsApp, desde la cafetería de Hialeah hasta la clínica de Brickell, y casi siempre en español. Configuramos el asistente para que hable como tus clientes (cubano, venezolano, colombiano) y conteste al toque. <strong>Tú te dedicas a tu negocio; de la tecnología nos encargamos nosotros.</strong>',
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
      'En el español de tus clientes',
      'Integración con WhatsApp y tu calendario',
      'Mensajes y respuestas listos',
      'Capacitación para tu equipo',
      'Instalación y mantenimiento',
    ],
    cta: { label: 'Quiero automatizar mi negocio', href: '#contacto' },
    note: '$900 es el punto de partida para una automatización inicial (por ejemplo, un asistente o una agenda de citas). A diferencia de una suscripción de software que configuras tú, aquí incluimos la instalación, el entrenamiento con tu negocio y el mantenimiento. Los proyectos más completos se cotizan según el alcance.',
    tone: 'teal',
  },
  proof: {
    tag: 'Automatización real',
    title: 'Automatización que <em>ya está en vivo</em>',
    cta: { label: 'Quiero algo así', href: '#contacto' },
    // Rosy Nails = web-app real de reservas (Houston) + Caso #0. NO son de Miami.
    items: [...proj('Rosy Nails & Care'), caso0],
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'IA para tu negocio en Miami, en <em>simple</em>',
    items: [
      { q: '¿Cuánto cuesta poner un asistente con IA en mi negocio?', a: 'Una automatización inicial empieza en $900 e incluye la instalación, el entrenamiento con tu negocio y el mantenimiento: no es solo una suscripción de software que configuras tú. Empezamos con una sola solución a tu mayor dolor y crecemos desde ahí. Te damos un precio claro en la propuesta gratuita.' },
      { q: '¿Necesito saber de tecnología para usarlo?', a: 'No, y esa es justamente la idea. Nosotros lo configuramos, lo conectamos y te lo dejamos funcionando, con una capacitación sencilla para tu equipo. Tú te dedicas a tu negocio; de la parte técnica nos encargamos nosotros.' },
      { q: '¿El asistente habla en el español de Miami o suena como robot?', a: 'Habla como tus clientes: el español que de verdad se usa en Miami (cubano, venezolano, colombiano), con el tono de tu negocio. No es una traducción robótica, y detecta si el cliente prefiere inglés.' },
      { q: '¿La IA puede contestar mi WhatsApp y agendar citas sola?', a: 'Sí. Conectamos el asistente con tu WhatsApp, tu calendario y las herramientas que ya usas, para que responda y agende citas o reservas a cualquier hora, ideal para restaurantes, clínicas, talleres y consultorios. En la propuesta te decimos con honestidad qué se puede integrar y qué no.' },
      { q: '¿Qué pasa si el cliente quiere hablar con una persona?', a: 'Siempre puede. El asistente está hecho para ayudar, no para atrapar a nadie: cuando hace falta un humano, pasa la conversación a tu equipo. El cliente nunca queda dando vueltas con un robot.' },
      { q: '¿En cuánto tiempo queda funcionando?', a: 'Una automatización inicial suele quedar lista en una a tres semanas, según qué herramientas conectemos y qué tan listo esté tu contenido (respuestas, horarios, servicios). Te damos un calendario realista desde el inicio.' },
    ],
  },
  cta: {
    title: 'Deja de perder clientes por <em>no contestar</em>',
    sub: 'En Miami, el cliente que te escribe por WhatsApp y no recibe respuesta se va con otro. Cuéntanos tu mayor dolor y te propondremos una solución con IA en menos de 24 horas, sin compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'teal',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: 'Un sitio rápido es la base donde vive tu asistente de IA.', icon: 'lucide:layout-template' },
      { label: '¿Cuánto cuesta un chatbot?', href: '/es/precios/cuanto-cuesta-un-chatbot', desc: 'El precio de un asistente con IA y qué incluye.', icon: 'lucide:tag' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'El mismo servicio, en nuestra base de operaciones.', icon: 'marcyan-ai' },
    ],
  },
  service: {
    name: 'IA Conversacional en Miami',
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
    title: 'SEO Local en Miami: posiciona tu negocio en Google | Marcyan',
    description:
      'Agencia de SEO local en Miami para negocios hispanos. Optimizamos tu Perfil de Google, tu sitio y tus reseñas para que te encuentren en Miami-Dade. Propuesta gratis en 24h.',
  },
  path: '/es/miami/seo-local',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Miami', path: '/es/miami' },
    { name: 'SEO Local', path: '/es/miami/seo-local' },
  ],
  hero: {
    badge: 'Miami, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'SEO Local',
    h1: 'SEO Local en <em>Miami</em>',
    sub: 'Aparece cuando tus clientes buscan en Google Maps y en los asistentes de IA. Optimizamos tu presencia local para que tu negocio en Miami gane más llamadas, visitas y reseñas, en español e inglés.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver cómo trabajamos', href: '#proceso' },
    chips: ['Bilingüe ES/EN', 'Sin contratos eternos', 'Reportes claros'],
    tone: 'gold',
  },
  answer: {
    q: '¿Qué es el SEO local y cómo ayuda a un negocio en Miami?',
    a: 'El SEO local es el trabajo de optimización que hace que tu negocio aparezca cuando alguien busca un servicio «cerca de mí» en Miami. Importa porque el 46% de las búsquedas en Google tienen intención local y el 76% de quienes buscan «cerca de mí» visitan un negocio en menos de 24 horas.',
    source: 'Google · BrightLocal, 2025',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'SEO local que <em>sí</em> mueve la aguja',
    items: [
      { icon: 'lucide:map-pin', title: 'Perfil de Google de Negocio', desc: 'Creamos u optimizamos tu ficha: categorías, servicios, fotos, descripción bilingüe y publicaciones.' },
      { icon: 'lucide:list-checks', title: 'NAP consistente', desc: 'Tu nombre, dirección y teléfono idénticos en Google, Bing, Apple Maps y directorios: la base que la IA lee.' },
      { icon: 'lucide:file-text', title: 'Contenido y páginas locales', desc: 'Páginas por servicio y zona, escritas para tu mercado de Miami, en español e inglés.' },
      { icon: 'lucide:star', title: 'Reseñas y reputación', desc: 'Te ayudamos a pedir y responder reseñas de forma constante, en el idioma de cada cliente.' },
      { icon: 'lucide:gauge', title: 'SEO técnico y velocidad', desc: 'Sitio rápido en HTML que Google y los asistentes de IA pueden leer sin tropiezos.' },
      { icon: 'marcyan-ai', title: 'Listo para la IA (AEO)', desc: 'Tu información en Bing y en un formato que ChatGPT y Gemini pueden citar.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué local',
    title: 'En Miami, el español <em>manda</em>',
    paragraphs: [
      'Miami-Dade es uno de los mercados más hispanos de Estados Unidos: cerca del 69% de su población es latina, según el U.S. Census Bureau (ACS 2023). Aquí el español no es un «extra», es la lengua del comercio, y aparecer en el «paquete local» de Google Maps, en español, puede ser la diferencia entre una llamada y un cliente perdido.',
      'Trabajamos toda el área de Miami-Dade con contexto real: Doral, Hialeah, Kendall, Coral Gables, Brickell y más. <strong>Conocemos a tu cliente</strong> (cubano, venezolano, colombiano) y optimizamos para cómo busca de verdad, en el español que de verdad habla.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'SEO local, <em>desde $600 al mes</em>',
    price: '$600',
    unit: '/mes',
    lead: 'Sin contratos eternos. Empezamos con lo esencial y crecemos según los resultados.',
    features: [
      'Optimización del Perfil de Google de Negocio',
      'NAP en directorios clave',
      '1 página local optimizada al mes',
      'Gestión de reseñas',
      'Reporte mensual claro',
      'Soporte bilingüe',
    ],
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
    note: 'El precio final depende del estado actual de tu negocio y de tu competencia. Te damos un alcance honesto en la propuesta, sin sorpresas.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'SEO real y verificable — y <em>buscamos tu negocio</em> en Miami',
    cta: { label: 'Sé nuestro primer caso en Miami', href: '#contacto' },
    // Honestidad: NO hay cliente de SEO en Miami. Proof etiquetado por su ciudad
    // real (Houston). NO se insinúa que sea de Miami; el título y el FAQ lo aclaran.
    items: proj('Texas Rush Remove', "Julio's Landscape TX"),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'SEO local en Miami, sin <em>letra chica</em>',
    items: [
      { q: '¿Cuánto cuesta el SEO local en Miami?', a: 'Nuestros planes de SEO local empiezan en $600 al mes, sin contratos a largo plazo. El precio final depende del estado actual de tu negocio, de tu competencia y de cuántas páginas o ubicaciones trabajemos. Te entregamos un alcance y un precio claros en la propuesta gratuita, antes de que decidas.' },
      { q: '¿Tienen clientes en Miami?', a: 'Seremos honestos: estamos comenzando nuestra operación en Miami, así que todavía no tenemos casos publicados de esta ciudad. Sí tenemos trabajo de SEO real y verificable hecho para negocios en Houston, con enlaces que puedes visitar. Por eso ofrecemos cupos de Cliente Fundador en Miami, con condiciones especiales.' },
      { q: '¿En cuánto tiempo se ven resultados?', a: 'Las primeras señales suelen aparecer entre 2 y 8 semanas: más reseñas y más vistas en tu ficha de Google. El liderazgo sólido en búsquedas competidas toma de 3 a 6 meses de trabajo constante. El SEO es acumulativo: no es un interruptor, es una inversión que crece.' },
      { q: '¿Garantizan el primer lugar en Google?', a: 'No, y desconfía de quien lo prometa. Nadie controla el algoritmo de Google. Lo que sí garantizamos es trabajo honesto y medible: optimización correcta, reportes claros y mejoras continuas. Nuestro compromiso es con el método y la transparencia, no con un número imposible de asegurar.' },
      { q: '¿Qué incluye exactamente el servicio?', a: 'Optimización de tu Perfil de Google de Negocio, consistencia de tu nombre, dirección y teléfono (NAP) en directorios, páginas locales por servicio, gestión de reseñas, SEO técnico y preparación para los asistentes de IA. Ajustamos el alcance a tu presupuesto y a tus prioridades.' },
      { q: '¿Trabajan en español e inglés?', a: 'Sí. Somos un equipo bilingüe enfocado en el mercado hispano de Estados Unidos. En Miami el español es la lengua del comercio, así que priorizamos el contenido en el español que de verdad usan tus clientes, y también lo hacemos en inglés.' },
    ],
  },
  cta: {
    title: 'Sé uno de nuestros primeros <em>casos en Miami</em>',
    sub: 'Buscamos Clientes Fundadores en Miami. Cuéntanos sobre tu negocio y recibe una propuesta de SEO local en menos de 24 horas, sin compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: 'Un sitio rápido y a medida es la base de todo buen SEO.', icon: 'lucide:layout-template' },
      { label: 'IA conversacional en Miami', href: '/es/miami/ia-conversacional', desc: 'Atiende y capta clientes 24/7 con un asistente en español.', icon: 'marcyan-ai' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'El mismo servicio, en nuestra base de operaciones.', icon: 'lucide:search' },
    ],
  },
  service: {
    name: 'SEO Local en Miami',
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
    title: 'Diseño de Tienda en Línea en Miami | E-Commerce bilingüe | Marcyan',
    description:
      'Diseño de tienda en línea en Miami para negocios hispanos: catálogo, pagos seguros y bilingüe (Shopify, WooCommerce o a medida). Desde $2,900. Propuesta gratis en 24h.',
  },
  path: '/es/miami/ecommerce',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Miami', path: '/es/miami' },
    { name: 'Tienda en Línea', path: '/es/miami/ecommerce' },
  ],
  hero: {
    badge: 'Miami, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Tienda en línea',
    h1: 'Diseño de tienda en línea en <em>Miami</em>',
    sub: 'Vende en línea las 24 horas con una tienda a medida, rápida y bilingüe. Catálogo, pagos seguros y todo listo para que tus clientes en Miami te compren desde el celular, en español e inglés.',
    primary: { label: 'Cotizar mi tienda', href: '#contacto' },
    secondary: { label: 'Ver todos los precios', href: '/es/precios' },
    chips: ['Pagos seguros', 'Bilingüe ES/EN', 'Shopify, WooCommerce o a medida'],
    tone: 'gold',
  },
  answer: {
    q: '¿Cuánto cuesta una tienda en línea en Miami?',
    a: 'Una tienda en línea profesional en Miami empieza en $2,900 e incluye catálogo, carrito, pagos seguros y versión bilingüe. Y en Miami, puerta de Latinoamérica, una tienda te deja venderle a la comunidad hispana local y más allá: el comercio electrónico ya supera el 16% de las ventas minoristas en EE.UU., según el U.S. Census Bureau.',
    source: 'U.S. Census Bureau',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Una tienda lista para <em>vender</em>',
    items: [
      { icon: 'lucide:shopping-bag', title: 'Catálogo y carrito', desc: 'Tus productos organizados, con fotos y variantes, y un carrito de compras claro y fácil de usar.' },
      { icon: 'lucide:credit-card', title: 'Pagos seguros, también de fuera', desc: 'Aceptas tarjeta y PayPal con pasarelas confiables como Stripe, incluido el cliente que paga desde Latinoamérica. Te guiamos con la cuenta y los requisitos.' },
      { icon: 'lucide:smartphone', title: 'Diseñada para el celular', desc: 'La mayoría compra desde el teléfono. Tu tienda carga rápido y se ve impecable en cualquier pantalla.' },
      { icon: 'lucide:languages', title: 'Bilingüe para Miami y la región', desc: 'Le vendes en español a la comunidad cubana, venezolana y colombiana de Miami, y amplías tu alcance en inglés, todo en la misma tienda.' },
      { icon: 'lucide:search', title: 'Lista para Google y la IA', desc: 'Estructura optimizada para que te encuentren en buscadores y en asistentes como ChatGPT.' },
      { icon: 'lucide:settings', title: 'La plataforma correcta para ti', desc: 'Shopify, WooCommerce o una solución a medida: la elegimos contigo según tu producto y tu presupuesto.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Cómo lo hacemos',
    title: '¿Shopify, WooCommerce o <em>a medida</em>?',
    paragraphs: [
      'En Miami hay tiendas para todo, desde la repostería de Hialeah hasta la marca de moda de Wynwood, y cada una pide su plataforma. No vendemos una sola a la fuerza: Shopify para lanzar rápido y vender simple, WooCommerce si necesitas más control o ya usas WordPress, y a medida para lo especial. Lo elegimos contigo, con honestidad, según tu producto y tu presupuesto.',
      'Para vender en Estados Unidos hay requisitos que son tuyos: una cuenta para recibir pagos y, según el caso, tu EIN del IRS. <strong>Te guiamos paso a paso en todo el proceso.</strong> Y como Miami es puerta de Latinoamérica y tu mercado es bilingüe, diseñamos tu tienda en español e inglés desde el inicio, para venderle a la comunidad hispana de Miami y más allá.',
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
    title: 'Construimos a medida, y <em>buscamos tu tienda</em> en Miami',
    cta: { label: 'Sé nuestro primer caso de e-commerce', href: '#contacto' },
    // Honestidad: NO hay cliente e-commerce ni de Miami. Capacidad real (web-app
    // Rosy Nails + sitios en vivo de Houston), etiquetada por lo que es.
    items: proj('Rosy Nails & Care', 'Texas Rush Remove', "Julio's Landscape TX"),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Tu tienda en línea en Miami, <em>claro</em>',
    items: [
      { q: '¿Cuánto cuesta hacer una tienda en línea en Miami?', a: 'Una tienda profesional a medida empieza en $2,900. El precio final depende del número de productos, las funciones (suscripciones, envíos, integraciones) y si hay que migrar una tienda existente. Te entregamos un presupuesto claro y por escrito en la propuesta gratuita, sin costos ocultos.' },
      { q: '¿Qué es mejor para mi tienda: Shopify o WooCommerce?', a: 'Depende de tu caso. Shopify es ideal para lanzar rápido y vender simple, sin preocuparte por lo técnico; WooCommerce te da más control y encaja si ya usas WordPress. Para necesidades especiales construimos a medida. Lo elegimos contigo con honestidad, según tu producto y tu presupuesto.' },
      { q: '¿Cómo recibo los pagos con tarjeta y PayPal?', a: 'Tu tienda se conecta con pasarelas seguras como Stripe y PayPal. Para vender en Estados Unidos necesitas una cuenta para recibir pagos y, según el caso, tu EIN del IRS; te guiamos paso a paso en lo que es tuyo, sin dejarte solo con la parte complicada.' },
      { q: '¿La tienda incluye dominio, hospedaje y certificado de seguridad (SSL)?', a: 'Te orientamos con el dominio, el hospedaje y el certificado SSL para que tu tienda salga en vivo y segura, sin dolores de cabeza. Según la plataforma, algunos van incluidos en su plan; te explicamos con claridad qué se paga y a quién, antes de empezar.' },
      { q: '¿La tienda es bilingüe, y puedo venderle a clientes fuera de Miami?', a: 'Sí a las dos. Diseñamos tu tienda en español e inglés desde el inicio, para venderle a la comunidad cubana, venezolana y colombiana de Miami. Y como Miami es puerta de Latinoamérica, la dejamos lista para recibir pedidos y pagos de clientes en otros países, si tu producto se presta.' },
      { q: '¿Tienen tiendas en línea ya hechas en Miami que pueda ver?', a: 'Seremos honestos: estamos comenzando con e-commerce y nuestra operación en Miami, así que todavía no publicamos un caso de tienda propio en esta ciudad. Sí construimos web-apps y sitios a medida que ya están en vivo (como la app de reservas de Rosy Nails). Por eso ofrecemos cupos de Cliente Fundador para tu tienda, con condiciones especiales.' },
    ],
  },
  cta: {
    title: 'Empieza a vender en línea en <em>Miami</em>',
    sub: 'En Miami, una tienda en línea bilingüe te abre la comunidad local y la región. Cuéntanos qué vendes y cuántos productos tienes, y recibe una propuesta en menos de 24 horas, sin compromiso.',
    primary: { label: 'Cotizar mi tienda gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
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
    name: 'Diseño de Tienda en Línea en Miami',
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
// OLA 3 · INDUSTRIA × CIUDAD (Houston primero). Inicio enfocado: 2 verticales de
// alto valor. Copy GENUINO por industria (no templado). Honestidad DURA: sin
// clientes de estos rubros → Cliente Fundador + proof real etiquetado por lo que
// es. ABOGADOS: regulado → la IA NO da consejo legal, sin prometer resultados de
// un caso ni "visa garantizada". Sin "#1".
// ═══════════════════════════════════════════════════════════════
const houstonAbogadosInmigracion: ClusterPage = {
  meta: {
    title: 'Marketing con IA para Abogados de Inmigración en Houston | Marcyan',
    description:
      'Capta más consultas de inmigración en Houston: un asistente con IA que responde y agenda 24/7 en español, sitio bilingüe que da confianza y SEO local. Sin promesas vacías. Propuesta gratis.',
  },
  path: '/es/houston/abogados-inmigracion',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'Abogados de inmigración', path: '/es/houston/abogados-inmigracion' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Inmigración · Houston',
    h1: 'Marketing con IA para <em>abogados de inmigración</em> en Houston',
    sub: 'Tus futuros clientes buscan ayuda en español, muchas veces de noche o el fin de semana. Captamos y agendamos esas consultas con un asistente de IA 24/7, sobre un sitio bilingüe que da confianza, sin prometer resultados de ningún caso.',
    primary: { label: 'Quiero más consultas', href: '#contacto' },
    secondary: { label: 'Ver cómo funciona', href: '#faq' },
    chips: ['Capta consultas 24/7', 'En español de verdad', 'La IA no da consejo legal'],
    tone: 'teal',
  },
  answer: {
    q: '¿Cómo consigue más clientes un abogado de inmigración en Houston?',
    a: 'Llegando primero y en español: la mayoría de las consultas de inmigración entran fuera de horario y se van con quien responde antes. Responder en 5 minutos hace a un prospecto 21 veces más probable de calificar que en 30, según el Lead Response Management Study del MIT. Un asistente con IA capta y agenda consultas 24/7.',
    source: 'Lead Response Management Study (MIT)',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Un sistema para <em>no perder ni una consulta</em>',
    items: [
      { icon: 'marcyan-ai', title: 'IA que capta consultas 24/7', desc: 'Responde y agenda la primera consulta en español a cualquier hora, incluso de madrugada o en fin de semana. Ninguna se enfría.' },
      { icon: 'lucide:clipboard-list', title: 'Intake básico (datos de la consulta)', desc: 'La IA reúne los datos generales del caso (nombre, contacto, tipo de trámite) y te los pasa listos. Tú decides a quién y cómo atender.' },
      { icon: 'lucide:shield-check', title: 'Sitio bilingüe que da confianza', desc: 'Un despacho se elige por confianza. Sitio profesional en español e inglés, rápido, con tus áreas de práctica y llamadas a la acción claras.' },
      { icon: 'lucide:search', title: 'SEO local de inmigración', desc: 'Apareces cuando alguien busca «abogado de inmigración cerca de mí» en Houston, en Google Maps y en los asistentes de IA.' },
      { icon: 'lucide:star', title: 'Reseñas y reputación', desc: 'La confianza se construye con reseñas reales. Te ayudamos a pedirlas y responderlas, en el idioma de cada cliente.' },
      { icon: 'lucide:scale', title: 'Sin consejo legal automatizado', desc: 'La IA agenda y responde lo general (horarios, ubicación, áreas de práctica). El consejo legal lo das tú: claro, ético y sin promesas.' },
    ],
    tone: 'teal',
  },
  local: {
    tag: 'Por qué este enfoque',
    title: 'En inmigración, la consulta que <em>no contestas</em> se va con otro',
    paragraphs: [
      'Houston es uno de los mercados de inmigración más grandes del país, y tus futuros clientes buscan ayuda en su idioma, muchas veces de noche o el fin de semana, cuando tu despacho ya cerró. En ese momento, el que contesta primero se queda con el caso.',
      'Por eso el centro de nuestro sistema es un asistente con IA que capta y agenda esas consultas 24/7, en español, <strong>sin dar consejo legal</strong>: reúne lo básico y te lo pasa, tú llevas el caso. Lo combinamos con un sitio bilingüe que transmite confianza y SEO local para que te encuentren. <strong>Honestidad ante todo:</strong> nunca prometemos el resultado de un caso ni una «visa garantizada»: eso no se promete.',
    ],
    tone: 'teal',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Captación con IA, <em>desde $900</em>',
    price: '$900',
    unit: 'proyecto inicial',
    lead: 'Empezamos por el asistente que capta consultas. El sitio y el SEO se suman según tu despacho.',
    features: [
      'Asistente con IA que capta y agenda 24/7',
      'En español, con el tono de tu despacho',
      'Integración con WhatsApp y tu calendario',
      'Intake básico de cada consulta',
      'Capacitación para tu equipo',
      'Instalación y mantenimiento',
    ],
    cta: { label: 'Quiero más consultas', href: '#contacto' },
    note: '$900 es el punto de partida del asistente de captación. El sitio web bilingüe (desde $1,500) y el SEO local (desde $600/mes) son servicios que se suman según lo que tu despacho necesite. Nunca cobramos por prometer el resultado de un caso, porque eso no se promete.',
    tone: 'teal',
  },
  proof: {
    tag: 'Automatización real',
    title: 'Agenda automática que <em>ya está en vivo</em>',
    cta: { label: 'Quiero algo así para mi despacho', href: '#contacto' },
    // Honestidad: aún no hay despacho cliente. Rosy Nails = web-app real que agenda
    // citas (paralelo honesto a "agendar consultas") + Caso #0. NO se insinúa que
    // sea un despacho; el FAQ aclara el framing Cliente Fundador.
    items: [...proj('Rosy Nails & Care'), caso0],
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'IA para tu despacho de inmigración, <em>claro y ético</em>',
    items: [
      { q: '¿La IA le da consejo legal a mis clientes?', a: 'No, y es deliberado. El asistente responde lo general (horarios, ubicación, áreas de práctica, cómo agendar), capta los datos básicos de la consulta y la agenda contigo. El consejo legal lo das tú. Lo dejamos claro al cliente para que sepa cuándo habla con un asistente y cuándo contigo.' },
      { q: '¿Garantizan más casos o el resultado de un trámite?', a: 'No, y desconfía de quien lo prometa. Nadie ético puede garantizar el resultado de un caso de inmigración ni una visa. Lo que sí hacemos es que no se te escape ninguna consulta y que tu despacho se vea profesional y confiable. El resto, y el caso, lo llevas tú.' },
      { q: '¿Tienen despachos de inmigración como clientes?', a: 'Seremos honestos: aún no publicamos un caso de un despacho de inmigración. Sí tenemos automatización real en vivo (como la app que agenda citas de Rosy Nails) y nuestro propio sitio como Caso #0. Por eso ofrecemos cupos de Cliente Fundador para despachos, con condiciones especiales.' },
      { q: '¿Cuánto cuesta?', a: 'El asistente de captación con IA empieza en $900. El sitio web bilingüe va desde $1,500 y el SEO local desde $600 al mes. Armamos el sistema según tu despacho y te damos un precio claro por escrito en la propuesta gratuita.' },
      { q: '¿Funciona en español y se integra con WhatsApp?', a: 'Sí. El español es la diferencia en este mercado: configuramos el asistente en el español de tus clientes y lo conectamos con tu WhatsApp y tu calendario, para que la consulta llegue por donde te escriben. Te decimos con honestidad qué se integra y qué no.' },
      { q: '¿Es compatible con las reglas de publicidad para abogados?', a: 'Trabajamos para que lo sea: sin promesas de resultados, sin «#1», sin testimonios inventados y dejando claro que el asistente no es un abogado. Tú revisas el contenido antes de publicar; la responsabilidad ética de la comunicación de tu despacho es tuya, y la respetamos.' },
    ],
  },
  cta: {
    title: 'Que ninguna consulta de inmigración <em>se enfríe</em>',
    sub: 'Cuéntanos cómo llegan hoy tus consultas y te propondremos un sistema de captación con IA en menos de 24 horas, sin compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'teal',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios que componen el sistema',
    links: [
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'El asistente que capta y agenda 24/7, a detalle.', icon: 'marcyan-ai' },
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El sitio bilingüe que transmite confianza.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que te encuentren cuando buscan un abogado.', icon: 'lucide:search' },
    ],
  },
  service: {
    name: 'Marketing con IA para Abogados de Inmigración en Houston',
    serviceType: 'Marketing digital y captación con IA para despachos de inmigración',
    description:
      'Sistema de captación para despachos de inmigración en Houston: asistente con IA que capta y agenda consultas 24/7 en español (sin dar consejo legal), sitio bilingüe y SEO local. Sin promesas de resultados.',
    path: '/es/houston/abogados-inmigracion',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '900',
    providerId: HOUSTON_ID,
  },
};

const houstonBienesRaices: ClusterPage = {
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
    title: 'Sitios a medida reales — y <em>buscamos tu marca</em> inmobiliaria',
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
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios que componen el sistema',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El servicio a detalle: a medida, rápido y bilingüe.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que aparezcas cuando buscan casas en tu zona.', icon: 'lucide:search' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Un asistente que responde y capta interesados 24/7.', icon: 'marcyan-ai' },
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
// OLA 3 · INDUSTRIAS × HOUSTON (5 verticales web-led). Copy genuino por
// industria, honestidad dura (Cliente Fundador donde no hay cliente real,
// proof etiquetado por su rubro/ciudad real). Reusa la plantilla ClusterLanding.
// ═══════════════════════════════════════════════════════════════
const houstonRestaurantes: ClusterPage = {
  meta: {
    title: 'Páginas Web para Restaurantes en Houston | Marcyan',
    description:
      'Sitio web con menú digital y QR para restaurantes y food trucks en Houston. Pedidos y reservas por WhatsApp, sin comisiones. Desde $1,500. Propuesta gratis.',
  },
  path: '/es/houston/restaurantes',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'Restaurantes', path: '/es/houston/restaurantes' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Restaurantes · Houston',
    h1: 'Páginas web para <em>restaurantes</em> en Houston',
    sub: 'Tu propio sitio con menú digital y código QR en la mesa, fotos que dan hambre y pedidos o reservas por WhatsApp. Recibes pedidos directos, sin pagar comisión a las apps de terceros, todo en español y bilingüe.',
    primary: { label: 'Quiero el sitio de mi restaurante', href: '#contacto' },
    secondary: { label: 'Ver qué incluye', href: '#precios' },
    chips: ['Menú con código QR', 'Pedidos por WhatsApp', 'Sin comisiones'],
    tone: 'gold',
  },
  answer: {
    q: '¿Cómo puede un restaurante o food truck en Houston recibir pedidos sin pagar comisiones?',
    a: 'Con tu propio sitio web: un menú digital con código QR en la mesa, fotos de tus platillos y un botón para pedir o reservar por WhatsApp. El cliente te escribe directo, sin la comisión del 25% al 30% que cobran las apps de delivery. El 53% abandona una página móvil que tarda más de 3 segundos en cargar.',
    source: 'Think with Google (2017)',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Un sitio que <em>llena tu cocina</em>',
    items: [
      { icon: 'lucide:utensils', title: 'Menú digital con código QR', desc: 'Tu carta en línea, lista para abrirse desde un código QR en la mesa o desde el celular, con secciones, precios y fotos.' },
      { icon: 'marcyan-ai', title: 'Pedidos por WhatsApp', desc: 'El cliente arma su pedido y te llega directo por WhatsApp, sin apps de terceros que se queden con una tajada de cada venta.' },
      { icon: 'lucide:calendar-check', title: 'Reservas por WhatsApp', desc: 'Quien quiere mesa te escribe y reserva al instante. Un asistente con IA responde lo general mientras estás en la plancha.' },
      { icon: 'lucide:image', title: 'Fotos que dan hambre', desc: 'Tus tacos, pupusas, ceviches y postres bien presentados. Una buena foto vende un platillo mejor que cualquier descripción.' },
      { icon: 'lucide:map-pin', title: 'Ubicación del día (food trucks)', desc: '¿Tu camión se mueve? Mostramos dónde estás hoy para que tus clientes te encuentren sin perder ventas.' },
      { icon: 'lucide:languages', title: 'Menú actualizable y bilingüe', desc: 'Cambias precios o quitas un platillo agotado sin reimprimir nada, en español e inglés, para todos tus comensales.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué este enfoque',
    title: 'En Houston, tu taquería vive del <em>WhatsApp, no de una app cara</em>',
    paragraphs: [
      'Houston tiene una de las comunidades hispanas más grandes del país, con un comensal hispano que crece sobre todo en el corazón mexicano de Magnolia Park y el Segundo Barrio (East End) y entre los centroamericanos de Gulfton y Spring Branch, donde abundan las pupuserías. Pero la mayoría de las taquerías y food trucks no tienen sitio propio: viven de una ficha en Yelp o Facebook, a veces armada por un directorio de terceros con el nombre mal escrito y fotos viejas.',
      'El golpe más duro lo dan las apps de delivery: se llevan del 25% al 30% de cada pedido, un mordisco que arruina el margen de un taco o una pupusa. Por eso construimos tu propio sitio, en español, con menú QR, fotos que dan hambre y pedidos o reservas directas por WhatsApp, para que cobres completo. <strong>Tú eres el dueño del sitio y de tu menú:</strong> lo actualizas cuando suben los precios o se acaba un platillo, sin reimprimir cartas ni pagar comisión por venta.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Sitio para tu restaurante, <em>desde $1,500</em>',
    price: '$1,500',
    unit: 'proyecto único',
    lead: 'Pago por proyecto. El precio depende del tamaño del menú, las fotos y las funciones de pedido o reserva.',
    features: [
      'Menú digital con código QR',
      'Pedidos y reservas por WhatsApp',
      'Galería de fotos de tus platillos',
      'Versión en español e inglés',
      'Menú que tú actualizas',
      'Rápido en el celular y listo para Google',
    ],
    cta: { label: 'Quiero el sitio de mi restaurante', href: '#contacto' },
    note: '$1,500 es el punto de partida de un sitio profesional con menú. Un asistente con IA que responde y toma pedidos por WhatsApp 24/7 (desde $900) y el SEO local para aparecer en Google y Maps (desde $600/mes) se suman según lo que necesites. Te damos un alcance y un precio claros por escrito, sin sorpresas.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Sitios a medida reales, y <em>buscamos tu restaurante</em>',
    cta: { label: 'Sé nuestro primer caso en restaurantes', href: '#contacto' },
    items: proj('Rosy Nails & Care', "Julio's Landscape TX", 'Texas Rush Remove'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'El sitio de tu restaurante en Houston, <em>claro</em>',
    items: [
      { q: '¿Cuánto cuesta el sitio web para un restaurante o food truck?', a: 'Un sitio profesional a medida con menú digital empieza en $1,500. El precio final depende del tamaño de tu menú, cuántas fotos prepares y si quieres pedidos o reservas por WhatsApp con un asistente. Te entregamos un presupuesto claro y por escrito en la propuesta gratuita, sin costos ocultos.' },
      { q: '¿Cómo recibo pedidos sin pagar comisión a Uber Eats o DoorDash?', a: 'Tu sitio incluye un botón para que el cliente arme su pedido y te lo mande directo por WhatsApp. El pedido te llega a ti, no a una app que se queda con el 25% al 30% de la venta. Tú cobras completo y atiendes en tu idioma. Es tu canal directo, no el de un tercero.' },
      { q: '¿Tienen clientes en restaurantes?', a: 'Seremos honestos: aún no publicamos un caso de un restaurante o food truck. Sí tenemos sitios a medida reales y verificables en otros rubros (con enlaces que puedes visitar), como una web app de reservas para un salón, un paralelo honesto a pedir y reservar en línea. Por eso ofrecemos cupos de Cliente Fundador para restaurantes, con condiciones especiales.' },
      { q: '¿Puedo cambiar el menú yo mismo cuando suben los precios?', a: 'Sí. Dejamos tu menú fácil de actualizar para que cambies precios o quites un platillo agotado sin reimprimir cartas ni esperarnos. Si prefieres que nosotros lo manejemos, también podemos hacerlo con un plan de mantenimiento (desde $120 al mes). El menú es tuyo.' },
      { q: '¿Sirve para un food truck que se mueve de lugar?', a: 'Sí. Para los food trucks mostramos la ubicación del día y los horarios, para que tus clientes sepan dónde encontrarte hoy sin tener que adivinar. Así dejas de perder ventas por no poder avisar a tiempo dónde estás.' },
      { q: '¿El menú y el sitio son bilingües?', a: 'Sí. En Houston tus comensales buscan en español e inglés, así que diseñamos el menú y el sitio en ambos idiomas desde el inicio. Le hablas a tu cliente hispano en su idioma y amplías tu alcance en inglés, todo en la misma página.' },
    ],
  },
  cta: {
    title: 'El sitio de tu <em>restaurante</em> empieza aquí',
    sub: 'Cuéntanos qué cocinas y cómo quieres recibir pedidos, y recibe una propuesta de sitio con menú en menos de 24 horas, sin compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios que componen el sistema',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El servicio a detalle: a medida, rápido y bilingüe.', icon: 'lucide:layout-template' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Un asistente que toma pedidos y reservas por WhatsApp 24/7.', icon: 'marcyan-ai' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que tu restaurante aparezca en Google y en Maps.', icon: 'lucide:search' },
    ],
  },
  service: {
    name: 'Páginas Web para Restaurantes en Houston',
    serviceType: 'Diseño web para restaurantes y food trucks',
    description:
      'Diseño y desarrollo de sitios web para restaurantes, taquerías y food trucks en Houston: menú digital con código QR, fotos de platillos, pedidos y reservas por WhatsApp sin comisiones, bilingües y rápidos en móvil.',
    path: '/es/houston/restaurantes',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const houstonContratistas: ClusterPage = {
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
    a: 'Lo más importante es un sitio propio que salga en Google cuando buscan «contratista cerca de mí» o «remodelación en Houston», con tus fotos de antes y después, reseñas y presupuesto gratis. Súmale una IA que rescata las llamadas que pierdes en la obra: responder en 5 minutos lo hace hasta 21 veces más probable de calificar.',
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
      'El dolor real del rubro es simple: estás subido en el techo o manejando entre obras y no puedes contestar, y el cliente llama al siguiente. Responder rápido es lo que decide quién gana el trabajo: contestar a un prospecto en los primeros 5 minutos lo hace hasta 21 veces más probable de calificar que esperar 30 (Lead Response Management Study, MIT). <strong>Por eso unimos un sitio propio con SEO local y una IA que responde por ti al instante:</strong> para que el trabajo de $5,000 o $15,000 lo cierres tú, no el contratista que contestó primero.',
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
    cta: { label: 'Sé nuestro primer caso en construcción y remodelación', href: '#contacto' },
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
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios que componen el sistema',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El servicio a detalle: a medida, rápido y bilingüe.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que aparezcas cuando buscan «contratista cerca de mí».', icon: 'lucide:search' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Una IA que rescata las llamadas que pierdes en la obra.', icon: 'marcyan-ai' },
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

const houstonTalleresMecanicos: ClusterPage = {
  meta: {
    title: 'Sitios Web para Talleres Mecánicos en Houston | Marcyan',
    description:
      'Diseño web y SEO local para talleres mecánicos en Houston: sitio bilingüe con tus servicios, ubicación y horario, más IA que contesta WhatsApp y agenda citas. Desde $1,500. Propuesta gratis.',
  },
  path: '/es/houston/talleres-mecanicos',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'Talleres mecánicos', path: '/es/houston/talleres-mecanicos' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Talleres mecánicos · Houston',
    h1: 'Sitios para <em>talleres mecánicos</em> en Houston',
    sub: 'Un sitio bilingüe con tus servicios, ubicación y horario, hecho para aparecer cuando buscan «taller mecánico cerca de mí», más un asistente con IA que contesta el WhatsApp y agenda citas mientras tú estás bajo un carro.',
    primary: { label: 'Quiero mi sitio', href: '#contacto' },
    secondary: { label: 'Ver qué incluye', href: '#precios' },
    chips: ['Tus servicios y horario', 'Aparece «cerca de mí»', 'IA que contesta el WhatsApp'],
    tone: 'gold',
  },
  answer: {
    q: '¿Qué necesita el sitio web de un taller mecánico en Houston?',
    a: 'En Houston, un sitio web profesional a medida para tu taller mecánico cuesta desde $1,500: rápido, bilingüe y geolocalizado para que aparezcas cuando buscan «taller cerca de mí». El 76% de quienes buscan «cerca de mí» visitan un negocio en menos de 24 horas.',
    source: 'Google · BrightLocal, 2025',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Un sitio que <em>trae carros</em> a tu taller',
    items: [
      { icon: 'lucide:wrench', title: 'Tus servicios, claros', desc: 'Mecánica general, frenos, A/C, hojalatería y pintura, llantas y más: cada servicio explicado para que el cliente sepa qué haces antes de llamar.' },
      { icon: 'lucide:map-pin', title: 'Ubicación y horario visibles', desc: 'Tu dirección, mapa y horario al frente, para que sepan si estás abierto y cómo llegar, sin tener que adivinar.' },
      { icon: 'lucide:search', title: 'SEO local «cerca de mí»', desc: 'Apareces cuando buscan «taller mecánico cerca de mí» o «mecánico en español Houston», en Google Maps y en la IA.' },
      { icon: 'marcyan-ai', title: 'IA que contesta el WhatsApp', desc: 'Cuando estás bajo un carro y no alcanzas el teléfono, un asistente responde al instante por chat y WhatsApp, en español.' },
      { icon: 'lucide:calendar-check', title: 'Agenda de citas', desc: 'El cliente reserva su servicio en línea, de día o de noche, y deja de llamar a tres talleres para irse con el primero que conteste.' },
      { icon: 'lucide:smartphone', title: 'Rápido en el celular', desc: 'Quien tiene el carro varado busca desde el teléfono. Tu sitio carga al instante y se ve impecable en cualquier pantalla.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué este enfoque',
    title: 'En Houston, el cliente <em>llama al taller que contesta primero</em>',
    paragraphs: [
      'En Houston casi nadie sobrevive sin carro: el transporte público es limitado y la gente depende 100% de su vehículo para ir a trabajar, muchas veces uno usado con bastantes millas. Por eso una reparación es urgencia, no lujo, y la búsqueda casi siempre empieza en el celular y en español: «mecánico que hable español», «el A/C del carro no enfría», «hojalatería y pintura». En barrios como East End, Gulfton, Spring Branch y Pasadena, tu cliente busca a alguien que le hable claro y le dé un estimado antes de tocar el carro.',
      'El problema real del rubro es simple: el dueño está bajo un carro o pintando y no alcanza a contestar el teléfono ni el WhatsApp, así que el cliente se va con el siguiente taller. La mayoría compite en Facebook, TikTok y Nextdoor, sin sitio propio, sin horario ni dirección visibles. <strong>Por eso unimos las dos cosas:</strong> un sitio geolocalizado que te encuentra y un asistente con IA que responde al instante para que ningún carro se te escape.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Sitio para tu taller, <em>desde $1,500</em>',
    price: '$1,500',
    unit: 'proyecto único',
    lead: 'Pago por proyecto. El precio depende del número de páginas, tus servicios y las integraciones.',
    features: [
      'Diseño a medida con tu marca',
      'Tus servicios, ubicación y horario',
      'Versión en español e inglés',
      'SEO local «cerca de mí»',
      'Rápido en móvil y listo para la IA',
      'Formulario y captación de clientes',
    ],
    cta: { label: 'Quiero mi sitio', href: '#contacto' },
    note: '$1,500 es el punto de partida de un sitio profesional. El asistente con IA que contesta el WhatsApp y agenda citas (desde $900) y el SEO local continuo (desde $600/mes) se suman según lo que necesites. Te damos un alcance y un precio claros por escrito, sin sorpresas.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Sitios a medida reales (y <em>buscamos tu taller</em>)',
    cta: { label: 'Sé nuestro primer caso en talleres mecánicos', href: '#contacto' },
    items: proj('Texas Rush Remove', "Julio's Landscape TX", 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Tu sitio de taller mecánico en Houston, <em>claro</em>',
    items: [
      { q: '¿Cuánto cuesta un sitio web para un taller mecánico?', a: 'Un sitio profesional a medida empieza en $1,500. El precio final depende del número de páginas, cuántos servicios muestres y qué integraciones necesites. Te entregamos un presupuesto claro y por escrito en la propuesta gratuita, sin costos ocultos.' },
      { q: '¿La IA contesta el WhatsApp cuando estoy bajo un carro?', a: 'Sí: ese es justo el problema que resuelve. Cuando no alcanzas el teléfono, el asistente responde al instante por chat y WhatsApp, en español, da información general de tus servicios y agenda la cita. El asistente con IA empieza en $900 y se suma a tu sitio.' },
      { q: '¿Tienen clientes en talleres mecánicos?', a: 'Seremos honestos: aún no publicamos un caso de un taller mecánico. Sí tenemos sitios a medida reales y verificables en otros rubros (con enlaces que puedes visitar) y nuestro propio sitio como Caso #0. Por eso ofrecemos cupos de Cliente Fundador para talleres, con condiciones especiales.' },
      { q: '¿El sitio aparece cuando buscan «taller cerca de mí»?', a: 'Esa es la meta. Construimos el sitio con SEO local y lo conectamos a tu Perfil de Google para que tengas la mejor base posible en búsquedas como «mecánico en español Houston». Nadie controla el algoritmo de Google, así que no prometemos el primer lugar, pero sí trabajo honesto y medible.' },
      { q: '¿El sitio es bilingüe?', a: 'Sí. En Houston tu cliente busca en español e inglés, con términos como «el check engine» o «alineación y balanceo». Diseñamos en ambos idiomas desde el inicio, con el español mexicano y centroamericano que de verdad usan tus clientes.' },
      { q: '¿Puedo mostrar mi ubicación, horario y precios?', a: 'Sí: tu dirección, mapa, horario (por ejemplo Lun–Sáb) y tus servicios van bien visibles, para que el cliente sepa si estás abierto y qué haces. Si quieres, mostramos estimados o rangos; tú decides qué precios publicar y cuáles dejar para la cita.' },
    ],
  },
  cta: {
    title: 'Tu próximo sitio de <em>taller mecánico</em> empieza aquí',
    sub: 'Cuéntanos qué servicios ofreces y en qué zona de Houston estás, y recibe una propuesta de sitio, SEO y asistente con IA en menos de 24 horas, sin compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios que componen el sistema',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El servicio a detalle: a medida, rápido y bilingüe.', icon: 'lucide:layout-template' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Un asistente que contesta el WhatsApp y agenda citas 24/7.', icon: 'marcyan-ai' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que aparezcas cuando buscan «taller cerca de mí».', icon: 'lucide:search' },
    ],
  },
  service: {
    name: 'Sitios Web para Talleres Mecánicos en Houston',
    serviceType: 'Diseño web y SEO local para talleres mecánicos',
    description:
      'Diseño y desarrollo de sitios web para talleres mecánicos en Houston: bilingües, rápidos en móvil, con servicios, ubicación y horario, SEO local «cerca de mí» y un asistente con IA que contesta WhatsApp y agenda citas.',
    path: '/es/houston/talleres-mecanicos',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const houstonSalonBelleza: ClusterPage = {
  meta: {
    title: 'Sitios Web con Reservas para Salones de Belleza en Houston | Marcyan',
    description: 'Diseño web con agenda en línea para salones de belleza en Houston: tus clientas reservan 24/7 y una IA responde WhatsApp. Desde $1,500. Propuesta gratis.',
  },
  path: '/es/houston/salon-belleza',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'Salones de belleza', path: '/es/houston/salon-belleza' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Salones de belleza · Houston',
    h1: 'Sitios con <em>reservas en línea</em> para salones en Houston',
    sub: 'Un sitio bilingüe con agenda en línea para que tus clientas reserven solas las 24 horas, galería de tus trabajos y una IA que contesta WhatsApp e Instagram. Para salones, barberías, uñas y spa que no quieren perder ni una cita.',
    primary: { label: 'Quiero mi sitio con reservas', href: '#contacto' },
    secondary: { label: 'Ver qué incluye', href: '#precios' },
    chips: ['Reservas 24/7', 'Galería de trabajos', 'Bilingüe ES/EN'],
    tone: 'gold',
  },
  answer: {
    q: '¿Qué necesita el sitio web de un salón de belleza en Houston?',
    a: 'El sitio de un salón en Houston necesita agenda en línea para que tus clientas reserven solas 24/7, galería de tus trabajos y un asistente con IA que responda WhatsApp e Instagram al instante. Responder en 5 minutos hace al prospecto hasta 21 veces más probable de calificar.',
    source: 'Lead Response Management Study (MIT)',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Un sitio que <em>llena tu agenda</em> sola',
    items: [
      { icon: 'lucide:calendar-check', title: 'Reservas en línea 24/7', desc: 'Tus clientas eligen servicio, estilista y hora desde el celular, sin llamar ni esperar respuesta. Toda reserva cae en un solo lugar.' },
      { icon: 'marcyan-ai', title: 'IA que responde y agenda', desc: 'Un asistente contesta WhatsApp e Instagram al instante, responde lo básico (horarios, precios, servicios) y guía a la clienta a reservar.' },
      { icon: 'lucide:image', title: 'Galería de tus trabajos', desc: 'Cortes, color, uñas y barba bien presentados. La clienta nueva ve tu estilo antes de decidir y llega sabiendo qué quiere.' },
      { icon: 'lucide:smartphone', title: 'Rápido en el celular', desc: 'Casi toda búsqueda de salón empieza en el teléfono. Tu sitio carga al instante y se ve impecable en cualquier pantalla.' },
      { icon: 'lucide:search', title: 'SEO local por zona', desc: 'Apareces cuando buscan «salón de belleza cerca de mí» o «barbería que hable español» en tu área de Houston, en Google y en la IA.' },
      { icon: 'lucide:languages', title: 'Bilingüe español e inglés', desc: 'Le hablas a tu clienta hispana en su idioma, que es justo por lo que muchas eligen el salón: poder explicar el corte que quieren.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué este enfoque',
    title: 'En Houston, tu clienta busca salón <em>desde el celular y en español</em>',
    paragraphs: [
      'Houston tiene una de las comunidades hispanas más grandes del país, y en barrios como Gulfton, Spring Branch, el East End y los corredores de Bellaire Blvd y S Gessner la gente busca su salón en el teléfono y en español: escribe «salón de uñas cerca de mí» o «barbería que hable español» y reserva con quien responde primero. Muchas clientas eligen el salón precisamente porque ahí pueden explicar el corte o el color que quieren en su idioma.',
      'El dolor del rubro es real: una buena parte de las citas terminan en no-show, y un mensaje de WhatsApp que se queda horas sin leer mientras atiendes a alguien en la silla es una clienta que ya reservó en otro lado. Por eso montamos tu agenda en línea, tu galería y una IA que responde al instante, y lo respaldamos con SEO local. <strong>Sin promesas de posición:</strong> nadie controla el algoritmo de Google; lo que hacemos es darte la mejor base honesta para que dejes de perder citas.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Sitio de salón con reservas, <em>desde $1,500</em>',
    price: '$1,500',
    unit: 'proyecto único',
    lead: 'Pago por proyecto. El precio depende del número de páginas, los servicios a reservar y las integraciones de agenda.',
    features: [
      'Diseño a medida con tu marca',
      'Agenda y reservas en línea',
      'Galería de tus trabajos',
      'Versión en español e inglés',
      'SEO base y rápido en móvil',
      'Listo para Google y la IA',
    ],
    cta: { label: 'Quiero mi sitio con reservas', href: '#contacto' },
    note: '$1,500 es el punto de partida de un sitio profesional con reservas. Un asistente con IA que responda WhatsApp e Instagram 24/7 (desde $900) y el SEO local continuo (desde $600/mes) se suman según lo que necesites. Te damos un alcance y un precio claros por escrito, sin sorpresas y sin comisión por cita.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Un salón real de Houston ya reserva con su <em>propia web app</em>',
    cta: { label: 'Quiero algo así para mi salón', href: '#contacto' },
    items: proj('Rosy Nails & Care', "Julio's Landscape TX", 'Texas Rush Remove'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Tu salón con reservas en línea, <em>claro</em>',
    items: [
      { q: '¿Cuánto cuesta un sitio con reservas para un salón de belleza?', a: 'Un sitio profesional a medida con agenda en línea empieza en $1,500. El precio final depende del número de páginas, cuántos servicios quieras que se puedan reservar y qué integraciones de calendario necesites. Te entregamos un presupuesto claro y por escrito en la propuesta gratuita, sin costos ocultos.' },
      { q: '¿Cómo funcionan las reservas en línea?', a: 'Tu clienta entra desde el celular, elige servicio, estilista y hora, y queda agendada sin llamar ni esperar respuesta. Todas las reservas caen en un solo lugar, no repartidas entre llamadas, WhatsApp e Instagram. Adaptamos el flujo a cómo trabaja tu salón.' },
      { q: '¿Tienen clientes en el rubro de salones?', a: 'Sí. Rosy Nails & Care es un salón de uñas real en Houston para el que construimos una web app a medida donde las clientas agendan sus citas y exploran inspiración de uñas. Es trabajo verificable del mismo sector, no un ejemplo prestado.' },
      { q: '¿Puedo dejar de pagar comisión por cada cita?', a: 'Esa es justo la idea. Hoy muchos salones reservan en Fresha o Booksy y pagan comisión por cada cita. Con tu propio sitio y tu propia agenda, las reservas llegan directo a ti. Si prefieres seguir usando tu herramienta actual, también podemos conectarla; te decimos qué se puede hacer en tu caso.' },
      { q: '¿La IA contesta WhatsApp e Instagram?', a: 'Sí, si la sumas. El asistente responde al instante las preguntas comunes (horarios, precios, servicios) y guía a la clienta a reservar, para que ningún mensaje se quede sin contestar mientras atiendes en la silla. El asistente con IA empieza en $900.' },
      { q: '¿Garantizan el primer lugar en Google?', a: 'No, y desconfía de quien lo prometa. Nadie controla el algoritmo. Te damos una base técnica sólida, SEO local honesto y reportes claros; aparecer arriba en búsquedas competidas se construye con trabajo constante, no con una garantía imposible.' },
    ],
  },
  cta: {
    title: 'Tu salón con <em>reservas en línea</em> empieza aquí',
    sub: 'Cuéntanos qué servicios ofreces y cómo trabajas, y recibe una propuesta de sitio con agenda y SEO en menos de 24 horas, sin compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios que componen el sistema',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El servicio a detalle: a medida, rápido y bilingüe.', icon: 'lucide:layout-template' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Un asistente que responde WhatsApp e Instagram y agenda 24/7.', icon: 'marcyan-ai' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que aparezcas cuando buscan «salón cerca de mí».', icon: 'lucide:search' },
    ],
  },
  service: {
    name: 'Sitios Web con Reservas para Salones de Belleza en Houston',
    serviceType: 'Diseño web con reservas en línea para salones de belleza',
    description: 'Diseño y desarrollo de sitios web con agenda en línea para salones de belleza, barberías, salones de uñas y spa en Houston: bilingües, rápidos en móvil, con reservas 24/7, galería de trabajos, asistente con IA y SEO local.',
    path: '/es/houston/salon-belleza',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const houstonClinicasDentales: ClusterPage = {
  meta: {
    title: 'Sitios Web para Clínicas Dentales en Houston | Marcyan',
    description:
      'Sitio web bilingüe para clínicas dentales en Houston: da confianza, aparece en «dentista en español cerca de mí» y agenda citas 24/7. Desde $1,500. Propuesta gratis.',
  },
  path: '/es/houston/clinicas-dentales',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'Clínicas dentales', path: '/es/houston/clinicas-dentales' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Clínicas dentales · Houston',
    h1: 'Sitios web para <em>clínicas dentales</em> en Houston',
    sub: 'Un sitio bilingüe que da confianza, muestra tus servicios y seguros con claridad, y aparece cuando buscan «dentista en español cerca de mí». Más un asistente que agenda citas y responde lo general (horarios, seguros, cómo llegar) 24/7, en español.',
    primary: { label: 'Quiero mi sitio', href: '#contacto' },
    secondary: { label: 'Ver qué incluye', href: '#precios' },
    chips: ['En español de verdad', 'Agenda citas 24/7', 'La IA no da consejo dental'],
    tone: 'gold',
  },
  answer: {
    q: '¿Qué necesita el sitio web de una clínica dental en Houston?',
    a: 'El sitio de una clínica dental en Houston necesita ser bilingüe, rápido en el celular y transmitir confianza, con SEO local para «dentista en español cerca de mí» y un asistente que agende citas 24/7. El 46% de las búsquedas en Google tienen intención local.',
    source: 'Google · BrightLocal, 2025',
  },
  includes: {
    tag: 'Qué incluye',
    title: 'Un sitio que <em>inspira confianza</em> y agenda',
    items: [
      { icon: 'lucide:shield-check', title: 'Confianza desde el primer clic', desc: 'Un sitio limpio y profesional que tranquiliza a un paciente nervioso: tu equipo, tus servicios y tus reseñas, presentados con calidez.' },
      { icon: 'lucide:calendar-check', title: 'Agenda de citas 24/7', desc: 'Tus pacientes solicitan o reservan su cita de día y de noche, sin tener que llamar en horario de oficina ni esperar a que alguien conteste.' },
      { icon: 'lucide:languages', title: 'Bilingüe español e inglés', desc: 'El español no es un «extra»: es como tu paciente entiende un tratamiento. Le hablamos en su idioma desde la primera pantalla.' },
      { icon: 'lucide:credit-card', title: 'Seguros y planes de pago claros', desc: 'Mostramos qué seguros aceptas, si atiendes sin seguro o Medicaid y tus planes de pago, para quitar el miedo a la factura sorpresa.' },
      { icon: 'lucide:search', title: 'SEO local en español', desc: 'Apareces cuando buscan «dentista en español Houston» o «clínica dental cerca de mí», en Google Maps y en los asistentes de IA.' },
      { icon: 'marcyan-ai', title: 'Asistente que responde lo general', desc: 'Un asistente con IA contesta horarios, servicios, seguros aceptados y cómo llegar, en español. No da diagnóstico ni consejo dental: eso lo das tú.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué este enfoque',
    title: 'En Houston, tu paciente busca un dentista <em>que le explique en español</em>',
    paragraphs: [
      'El paciente hispano de clínica dental en Houston suele ser de primera generación, con dominio limitado del inglés, y se concentra en zonas de altísima densidad latina como Gulfton, Sharpstown, Spring Branch, el East End y el corredor de Hillcroft y Westpark en el Southwest. Para él, el español no es preferencia: es lo que necesita para entender qué le van a hacer en la boca, cuánto cuesta y qué seguro le aceptan, antes de sentarse en la silla.',
      'Por eso construimos un sitio que da confianza y habla su idioma, con tus servicios, seguros y planes de pago claros, y lo respaldamos con SEO local y un asistente que agenda y responde lo general 24/7 (muchos pacientes trabajan turnos y no pueden llamar de día). <strong>Cuidado ante todo:</strong> la IA nunca da diagnóstico ni consejo dental ni promete resultados clínicos; solo agenda y orienta, y el cuidado profesional siempre lo das tú.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Sitio para tu clínica dental, <em>desde $1,500</em>',
    price: '$1,500',
    unit: 'proyecto único',
    lead: 'Pago por proyecto. El precio depende del número de páginas, los servicios que muestres y las integraciones.',
    features: [
      'Diseño a medida con tu marca',
      'Servicios, seguros y planes de pago claros',
      'Solicitud o agenda de citas',
      'Versión en español e inglés',
      'SEO base y rápido en móvil',
      'Listo para Google y la IA',
    ],
    cta: { label: 'Quiero mi sitio', href: '#contacto' },
    note: '$1,500 es el punto de partida de un sitio profesional. El SEO local continuo (desde $600/mes) y un asistente con IA que agenda y responde lo general 24/7 (desde $900) se suman según lo que necesites. Te damos un alcance y un precio claros por escrito, sin sorpresas.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Trabajo a medida real, y <em>buscamos tu clínica</em> dental',
    cta: { label: 'Sé nuestra primera clínica dental', href: '#contacto' },
    // Honestidad: aún no hay clínica dental cliente. Proof real de sitios a medida
    // (etiquetado por su rubro/ciudad real) + Cliente Fundador. Página web-led (gold):
    // 3 proyectos reales, SIN caso0 (caso0 se reserva para páginas lideradas por IA).
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Tu sitio de clínica dental en Houston, <em>claro</em>',
    items: [
      { q: '¿Cuánto cuesta un sitio web para una clínica dental?', a: 'Un sitio profesional a medida empieza en $1,500. El precio final depende del número de páginas, cuántos servicios muestres y qué integraciones necesites (agenda de citas, asistente con IA). Te entregamos un presupuesto claro y por escrito en la propuesta gratuita, sin costos ocultos.' },
      { q: '¿La IA da consejo dental o diagnóstico a mis pacientes?', a: 'No, y es deliberado. El asistente responde lo general (horarios, servicios, seguros que aceptas, planes de pago, cómo llegar) y ayuda a agendar la cita. Nunca da diagnóstico ni consejo dental: eso lo da tu equipo. Lo dejamos claro al paciente para que sepa cuándo habla con un asistente y cuándo con la clínica.' },
      { q: '¿El asistente agenda citas de verdad?', a: 'Sí. Según tu flujo, el asistente capta la solicitud de cita (nombre, motivo general, horario preferido) y la deja lista para tu equipo, o se conecta con tu sistema de agenda donde es posible. La idea es que ningún paciente se pierda por llamar fuera de horario, sin prometer integraciones que no existan en tu caso.' },
      { q: '¿Tienen clínicas dentales como clientes?', a: 'Seremos honestos: aún no publicamos un caso de una clínica dental. Sí tenemos trabajo real y verificable, como una web-app que agenda citas para un salón (Rosy Nails) y sitios a medida en otros rubros, además de nuestro propio sitio como Caso #0. Por eso ofrecemos cupos de Cliente Fundador para clínicas, con condiciones especiales.' },
      { q: '¿El sitio muestra los seguros y planes de pago?', a: 'Sí, y en Houston es clave. Mostramos con claridad qué seguros aceptas, si atiendes sin seguro o Medicaid y tus planes de pago, para quitarle al paciente el miedo a la factura sorpresa antes de que llame. Tú nos das la información exacta y la presentamos de forma clara y honesta.' },
      { q: '¿Garantizan más pacientes o el primer lugar en Google?', a: 'No, y desconfía de quien lo prometa. Nadie controla el algoritmo ni podemos garantizar resultados clínicos o de negocio. Te damos una base técnica sólida, un sitio que transmite confianza, SEO local honesto y reportes claros; el resto se construye con trabajo constante, no con una garantía imposible.' },
    ],
  },
  cta: {
    title: 'El próximo sitio de tu <em>clínica dental</em> empieza aquí',
    sub: 'Cuéntanos qué servicios ofreces y qué seguros aceptas, y recibe una propuesta de sitio, SEO y agenda con IA en menos de 24 horas, sin compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios que componen el sistema',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El servicio a detalle: a medida, rápido y bilingüe.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que aparezcas en «dentista en español cerca de mí».', icon: 'lucide:search' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Un asistente que agenda y responde lo general 24/7.', icon: 'marcyan-ai' },
    ],
  },
  service: {
    name: 'Sitios Web para Clínicas Dentales en Houston',
    serviceType: 'Diseño web y SEO para clínicas dentales',
    description:
      'Diseño y desarrollo de sitios web para clínicas dentales y consultorios en Houston: bilingües, rápidos en móvil, con servicios y seguros claros, agenda de citas, SEO local y un asistente con IA que responde lo general (sin dar consejo dental ni diagnóstico).',
    path: '/es/houston/clinicas-dentales',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

// ═══════════════════════════════════════════════════════════════
// OLA 3 · BARRIOS + WEDGE BILINGÜE. Houston: Katy/Sugar Land (lideran con la
// ZONA, no el head-term) + diseño-web-bilingüe (wedge, cross-link a diseno-web).
// Miami: Doral (Doralzuela)/Hialeah (Cliente Fundador, diferencian por AEO/
// bilingüe/barrio, NO precio; proof etiquetado por su ciudad real).
// ═══════════════════════════════════════════════════════════════
const houstonKaty: ClusterPage = {
  meta: {
    title: 'Diseño Web en Katy, TX: páginas web y SEO local | Marcyan',
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
    title: 'En Katy, el cliente se busca <em>por su zona, no por «Houston»</em>',
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
      { q: '¿Hacen páginas web específicamente para negocios de Katy?', a: 'Sí. Trabajamos el área metropolitana de Houston, y Katy es parte de ese metro, así que diseñamos tu sitio para que lidere con Katy: tu zona, tus corredores (Mason Rd, FM 1463, Grand Parkway 99) y tus comunidades (Cinco Ranch, Cross Creek Ranch). El cliente de Katy se busca por Katy, no por «Houston» genérico.' },
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
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
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
    name: 'Diseño Web y SEO Local en Katy, TX',
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
    title: 'Diseño Web en Sugar Land, TX: sitios premium y bilingües | Marcyan',
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
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
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
    title: 'Sugar Land no es un sitio web cualquiera',
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
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
    note: '$1,500 es el punto de partida para un sitio profesional. El SEO local (desde $600/mes) y una IA conversacional (desde $900) se suman si los necesitas; las tiendas en línea tienen su propio alcance. Te lo detallamos sin compromiso.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Trabajo real del área metro de Houston',
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
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
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
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
    name: 'Diseño Web y SEO Local en Sugar Land',
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

const houstonDisenoWebBilingue: ClusterPage = {
  meta: {
    title: 'Diseño Web Bilingüe en Houston (Español e Inglés) | Marcyan',
    description:
      'Diseño web bilingüe en Houston: tu página en español e inglés escrita como busca tu cliente, no traducida con Google. Desde $1,500. Propuesta gratis.',
  },
  path: '/es/houston/diseno-web-bilingue',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'Diseño web bilingüe', path: '/es/houston/diseno-web-bilingue' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Diseño web bilingüe · Houston',
    h1: 'Diseño web <em>bilingüe</em> en Houston (español e inglés)',
    sub: 'Una página real en dos idiomas para el negocio hispano de Houston: escrita como tu cliente busca de verdad en español y en inglés, no pasada por Google Translate. Con URLs separadas, hreflang y revisión de hablante nativo.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver qué incluye', href: '#precios' },
    chips: ['Español e inglés de verdad', 'Sin Google Translate', 'Contacto por WhatsApp'],
    tone: 'gold',
  },
  answer: {
    q: '¿Qué es una página web bilingüe de verdad y por qué importa en Houston?',
    a: 'Es un sitio con contenido nativo en español e inglés, escrito como busca cada cliente (no traducido palabra por palabra), con URLs separadas y hreflang para que Google muestre la versión correcta. Importa porque el 75% de las personas juzga la credibilidad de un negocio por su sitio web.',
    source: 'Universidad de Stanford',
  },
  includes: {
    tag: 'Cómo lo hacemos bilingüe',
    title: 'Una metodología, no un <em>botón de traducir</em>',
    intro: 'No pegamos un widget de Google Translate al final. Construimos cada idioma desde el inicio, con la estructura técnica para que Google y la IA entiendan que son dos versiones de tu negocio.',
    items: [
      { icon: 'lucide:pen-tool', title: 'Contenido nativo, no traducido', desc: 'Escribimos cada idioma por separado, como habla y busca de verdad tu cliente. Tu cliente hispano nota al instante una frase robótica, y eso resta confianza.' },
      { icon: 'lucide:search', title: 'Palabras como busca la gente', desc: 'No traducimos el keyword en inglés literal. Tu cliente busca "página web" o términos coloquiales de su país, no la traducción de "web design". Investigamos cómo busca en cada idioma.' },
      { icon: 'lucide:languages', title: 'URLs separadas y hreflang', desc: 'Una URL por idioma con etiquetas hreflang bien puestas, para que Google sepa cuál versión mostrar y las dos páginas no se canibalicen entre sí.' },
      { icon: 'lucide:users', title: 'Revisión de hablante nativo', desc: 'Las páginas que convierten las revisa un hablante nativo, para que el español suene natural y el inglés también, sin frases pegadas ni errores de contexto cultural.' },
      { icon: 'lucide:smartphone', title: 'Cambio de idioma claro en el celular', desc: 'Un selector de idioma visible y fácil en el teléfono, porque la misma persona busca en inglés de día y en español de tarde según el contexto.' },
      { icon: 'lucide:phone-call', title: 'Cierre por WhatsApp', desc: 'Botón de WhatsApp en los dos idiomas, porque tu clientela prefiere escribir por ahí antes que llenar un formulario o mandar un correo.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Por qué bilingüe en Houston',
    title: 'Tu cliente de Houston <em>busca en dos idiomas</em>',
    paragraphs: [
      'En corredores como East End, Gulfton, Sharpstown, Near Northside, Alief y Spring Branch, tu clientela es genuinamente bilingüe y cambia de idioma según el momento: la misma persona busca en inglés por la mañana y en español por la tarde, navega Instagram en español y Google en inglés. Una web que solo existe en un idioma deja a la mitad de tu mercado sin encontrarte.',
      'Y hay un hueco real de oportunidad: aparecer en resultados en español en tu ZIP de Houston enfrenta mucha menos competencia que el mismo servicio en inglés. <strong>Un plomero bilingüe en Sharpstown compite con pocos en español frente a cientos en inglés.</strong> Por eso no traducimos el keyword: escribimos cada idioma como busca de verdad la gente y reclamamos ese espacio que casi nadie está trabajando.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Sitio bilingüe, <em>desde $1,500</em>',
    price: '$1,500',
    unit: 'proyecto único',
    lead: 'Pago por proyecto, sin mensualidades obligatorias. Los dos idiomas vienen pensados desde el diseño, no como un extra al final.',
    features: [
      'Diseño 100% a medida',
      'Contenido nativo en español e inglés',
      'URLs separadas por idioma + hreflang',
      'Revisión de hablante nativo',
      'SEO base en ambos idiomas',
      'Botón de WhatsApp y formulario',
    ],
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
    note: '$1,500 es el punto de partida para un sitio bilingüe profesional. El número de páginas y las funciones definen el alcance final. El SEO local (desde $600/mes) y una IA conversacional (desde $900) se suman si los necesitas.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Negocios de Houston con <em>sitio a medida</em>',
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Diseño web bilingüe, <em>sin letra chica</em>',
    items: [
      { q: '¿Qué diferencia hay con poner Google Translate en mi web?', a: 'Mucha. Google Translate genera frases robóticas que tu cliente hispano nota al instante y que le restan credibilidad a tu negocio. Nosotros escribimos cada idioma desde cero, como busca y habla de verdad tu cliente, y un hablante nativo revisa las páginas que convierten.' },
      { q: '¿Cuánto cuesta una página web bilingüe en Houston?', a: 'Empieza en $1,500 por proyecto, con los dos idiomas pensados desde el diseño. El precio final depende de cuántas páginas necesites y qué funciones quieras (reservas, pagos, blog). Te entregamos un presupuesto claro y por escrito en la propuesta gratuita.' },
      { q: '¿No basta con traducir el sitio que ya tengo?', a: 'Traducir palabra por palabra casi nunca funciona para Google. La gente no busca la traducción literal del keyword en inglés: busca "página web" o términos coloquiales de su país. Por eso investigamos cómo busca tu cliente en cada idioma y escribimos para eso, no traducimos.' },
      { q: '¿Cómo evitan que las dos versiones compitan en Google?', a: 'Con URLs separadas por idioma y etiquetas hreflang bien configuradas desde el inicio. Así Google entiende que son dos versiones del mismo negocio y muestra la correcta según el idioma del usuario, sin que se canibalicen entre sí.' },
      { q: '¿Me garantizan salir primero en Google?', a: 'No. Nadie serio puede garantizar el puesto #1, y desconfía de quien lo prometa. Lo que sí hacemos es darte una base técnica sólida en ambos idiomas y aprovechar que en español hay mucha menos competencia local en tu ZIP, que es una ventaja real.' },
      { q: '¿Puedo contactar a mis clientes por WhatsApp desde el sitio?', a: 'Sí, y lo recomendamos. Tu clientela suele preferir WhatsApp antes que el correo o el formulario. Ponemos un botón visible en los dos idiomas para que escribirte sea de un toque, sin fricción.' },
    ],
  },
  cta: {
    title: 'Tu sitio en <em>dos idiomas</em> empieza aquí',
    sub: 'Cuéntanos tu negocio y recibe una propuesta de sitio bilingüe personalizada en menos de 24 horas, sin compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El servicio de diseño web a detalle: alcance, proceso y todo lo que incluye.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que tu sitio bilingüe aparezca en Google y en Maps en ambos idiomas.', icon: 'lucide:search' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Suma un asistente que contesta en español e inglés 24/7.', icon: 'marcyan-ai' },
      { label: 'Tienda en línea en Houston', href: '/es/houston/ecommerce', desc: 'Cuando quieras vender en línea, te montamos la tienda bilingüe.', icon: 'lucide:shopping-bag' },
    ],
  },
  service: {
    name: 'Diseño Web Bilingüe en Houston (Español e Inglés)',
    serviceType: 'Diseño web bilingüe',
    description:
      'Diseño y desarrollo de sitios web bilingües (español e inglés) para PYMEs hispanas en Houston: contenido nativo en cada idioma, URLs separadas con hreflang y revisión de hablante nativo, en lugar de traducción automática.',
    path: '/es/houston/diseno-web-bilingue',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const miamiDoral: ClusterPage = {
  meta: {
    title: 'Diseño Web y SEO en Doral (Doralzuela) | Marcyan',
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
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver qué incluye', href: '#precios' },
    chips: ['Bilingüe ES/EN', 'Listo para la IA', 'Cliente escribe por WhatsApp'],
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
      { icon: 'marcyan-ai', title: 'IA conversacional', desc: 'Un asistente bilingüe que responde y capta clientes las 24 horas, ideal para el cliente de Doral que prefiere escribir por chat.' },
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
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
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
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios que componen el sistema',
    links: [
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: 'El servicio de diseño web bilingüe a detalle.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Miami', href: '/es/miami/seo-local', desc: 'Que tu negocio aparezca en Google y en Maps.', icon: 'lucide:search' },
      { label: 'IA conversacional en Miami', href: '/es/miami/ia-conversacional', desc: 'Atiende y capta clientes 24/7 con un asistente bilingüe.', icon: 'marcyan-ai' },
      { label: 'Miami (hub)', href: '/es/miami', desc: 'Todos nuestros servicios para Miami-Dade.', icon: 'lucide:globe' },
    ],
  },
  service: {
    name: 'Diseño Web y SEO en Doral',
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
    title: 'Diseño Web y SEO en Hialeah | Negocios locales en español | Marcyan',
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
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver qué incluye', href: '#precios' },
    chips: ['Todo en español', 'Rápido en el celular', 'Ficha de Google ordenada'],
    tone: 'gold',
  },
  answer: {
    q: '¿Le conviene a un negocio de Hialeah tener una página web en español?',
    a: 'Sí, de las mejores inversiones locales para un negocio de Hialeah. El 46% de las búsquedas en Google tienen intención local y el 76% de quienes buscan «cerca de mí» visitan un negocio en menos de 24 horas. Aquí el cliente busca en español desde el celular, y una web rápida con ficha de Google te pone delante de él.',
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
      { icon: 'marcyan-ai', title: 'Respuesta inmediata con IA', desc: 'Un asistente que contesta por WhatsApp y en tu web mientras atiendes el mostrador, para que el cliente que escribe no se vaya con el de al lado.' },
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
    cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
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
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios que componen el sistema',
    links: [
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: 'El servicio de diseño web a detalle: proceso, qué incluye y FAQ.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Miami', href: '/es/miami/seo-local', desc: 'Que tu negocio aparezca en Google y en Maps por todo Miami-Dade.', icon: 'lucide:search' },
      { label: 'IA conversacional en Miami', href: '/es/miami/ia-conversacional', desc: 'Un asistente que contesta tu WhatsApp 24/7, en español.', icon: 'marcyan-ai' },
      { label: 'Miami y su área', href: '/es/miami', desc: 'Todos nuestros servicios para negocios de Miami-Dade.', icon: 'lucide:map-pin' },
    ],
  },
  service: {
    name: 'Diseño Web y SEO en Hialeah',
    serviceType: 'Diseño web, SEO local e IA conversacional',
    description:
      'Diseño web a medida, SEO local e IA conversacional en español para negocios de Hialeah (Miami-Dade): cafeterias, panaderias, talleres, salones, botanicas y mercados. Web rapida y bilingue, ficha de Google y respuesta inmediata por WhatsApp.',
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
  'houston/abogados-inmigracion': houstonAbogadosInmigracion,
  'houston/bienes-raices': houstonBienesRaices,
  'houston/restaurantes': houstonRestaurantes,
  'houston/contratistas': houstonContratistas,
  'houston/talleres-mecanicos': houstonTalleresMecanicos,
  'houston/salon-belleza': houstonSalonBelleza,
  'houston/clinicas-dentales': houstonClinicasDentales,
  'houston/katy': houstonKaty,
  'houston/sugar-land': houstonSugarLand,
  'houston/diseno-web-bilingue': houstonDisenoWebBilingue,
  'miami/diseno-web': miamiWeb,
  'miami/ia-conversacional': miamiIa,
  'miami/seo-local': miamiSeo,
  'miami/ecommerce': miamiEcommerce,
  'miami/doral': miamiDoral,
  'miami/hialeah': miamiHialeah,
  'ia-para-pymes': iaPymes,
  'precios/cuanto-cuesta-una-pagina-web-houston': precioWebHouston,
  'precios/cuanto-cuesta-un-chatbot': precioChatbot,
  'precios/cuanto-cuesta-seo-local-houston': precioSeoHouston,
} satisfies Record<string, ClusterPage>;

export { nap };
