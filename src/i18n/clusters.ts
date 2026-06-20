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
  cta: { label: 'Iniciar Proyecto', href: '#contacto' },
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
  '$1,500 es el punto de partida para un sitio profesional. Las tiendas en línea (e-commerce) y los proyectos con funciones especiales tienen su propio alcance — te lo detallamos sin compromiso.';

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
    sub: 'Aparece cuando tus clientes buscan en Google Maps y en los asistentes de IA. Optimizamos tu presencia local para que tu negocio en Houston gane más llamadas, visitas y reseñas — en español e inglés.',
    primary: { label: 'Propuesta gratis en 24h', href: '#contacto' },
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
      { icon: 'lucide:list-checks', title: 'NAP consistente', desc: 'Tu nombre, dirección y teléfono idénticos en Google, Bing, Apple Maps y directorios — la base que la IA lee.' },
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
      'Houston es la cuarta ciudad más grande de Estados Unidos y una de las de mayor población hispana. Eso significa oportunidad — y también competencia. Aparecer en el «paquete local» de Google Maps cuando alguien busca tu servicio puede ser la diferencia entre una llamada y un cliente perdido.',
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
    cta: { label: 'Solicitar propuesta', href: '#contacto' },
    note: 'El precio final depende del estado actual de tu negocio y de tu competencia. Te damos un alcance honesto en la propuesta, sin sorpresas.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Negocios de Houston que <em>ya posicionan</em>',
    cta: { label: 'Inicia tu proyecto', href: '#contacto' },
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
    primary: { label: 'Solicitar propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
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
    sub: 'Sitios web a medida, rápidos y bilingües para negocios de Houston. Diseñados para verse increíbles, cargar al instante y convertir visitas en clientes — listos para Google y para la IA.',
    primary: { label: 'Propuesta gratis en 24h', href: '#contacto' },
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
    cta: { label: 'Solicitar propuesta', href: '#contacto' },
    note: webPriceNote,
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Negocios de Houston con <em>sitio nuevo</em>',
    cta: { label: 'Inicia tu proyecto', href: '#contacto' },
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
      { q: '¿El sitio es bilingüe?', a: 'Puede serlo. Construimos en español e inglés desde el diseño, porque en Houston tus clientes buscan en ambos idiomas. Si prefieres un solo idioma, también es posible — lo definimos según tu mercado.' },
      { q: '¿Quién mantiene el sitio después?', a: 'Tú decides. Puedes manejarlo por tu cuenta o tomar nuestro plan de mantenimiento (desde $120 al mes) con respaldos, actualizaciones de seguridad y soporte bilingüe. Nunca te dejamos amarrado: el sitio es tuyo.' },
    ],
  },
  cta: {
    title: 'Tu próximo sitio web <em>empieza aquí</em>',
    sub: 'Cuéntanos tu proyecto y recibe una propuesta de diseño web personalizada en menos de 24 horas, sin compromiso.',
    primary: { label: 'Solicitar propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
    tone: 'gold',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Servicios relacionados',
    links: [
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que tu sitio nuevo aparezca en Google y en Maps.', icon: 'lucide:search' },
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
    primary: { label: 'Propuesta gratis en 24h', href: '#contacto' },
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
      'Miami es uno de los mercados más hispanos de Estados Unidos — cerca del 69% de Miami-Dade, de Hialeah a Doral y de Brickell a Kendall —, y el español no es un «extra»: es el idioma de tus clientes. Un sitio que no habla su idioma, y que no carga rápido en el celular, deja dinero sobre la mesa.',
      '<strong>Seamos transparentes:</strong> apenas estamos abriendo nuestra operación de diseño en Miami, así que todavía no mostramos casos locales aquí. Lo que sí mostramos es trabajo real y verificable que ya hicimos para otros negocios (en Houston y Orlando) — y buscamos a nuestros primeros Clientes Fundadores de Miami para sumar casos de esta ciudad.',
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
    cta: { label: 'Solicitar propuesta', href: '#contacto' },
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
    primary: { label: 'Solicitar propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
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
    sub: '¿Tu negocio pierde clientes por no contestar a tiempo? Ponemos la inteligencia artificial a trabajar para ti: asistentes que responden, agendan citas y captan prospectos a toda hora — en español, sin que tengas que saber de tecnología.',
    primary: { label: 'Quiero una propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver cómo funciona', href: '#faq' },
    chips: ['En español', 'Sin saber de tecnología', 'Se integra con lo que ya usas'],
    tone: 'teal',
  },
  answer: {
    q: '¿Cómo puede la inteligencia artificial ayudar a un negocio pequeño?',
    a: 'La IA ayuda a tu negocio a responder al instante y a no perder ventas: atiende mensajes, agenda citas y contesta preguntas las 24 horas. La velocidad importa — responder a un prospecto en los primeros 5 minutos multiplica hasta por 100 las probabilidades de contactarlo, según Harvard Business Review.',
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
      'Eso es a la vez un riesgo y una oportunidad enorme. Es un terreno nuevo donde un negocio pequeño puede adelantarse a competidores más grandes — sobre todo en español, donde casi nadie está trabajando esto todavía. Te ayudamos a estar entre los que sí aparecen.',
    ],
    tone: 'teal',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Automatización con IA, <em>desde $900</em>',
    price: '$900',
    unit: 'proyecto inicial',
    lead: 'Empezamos con una solución concreta a tu mayor dolor — no con un proyecto enorme.',
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
      { q: '¿La IA va a sonar como un robot frío?', a: 'No, si se hace bien. Escribimos los mensajes con tu tono y tu personalidad, en español natural. El objetivo es que tus clientes se sientan bien atendidos — y que sepan con claridad cuándo hablan con una persona y cuándo con un asistente.' },
    ],
  },
  cta: {
    title: 'Deja de perder clientes por <em>no contestar</em>',
    sub: 'Cuéntanos cuál es tu mayor dolor y te propondremos una solución con IA en menos de 24 horas, sin compromiso.',
    primary: { label: 'Quiero mi propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
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
    sub: 'Respuesta directa y sin rodeos: cuánto invertir, qué incluye y de qué depende el precio de un sitio profesional en Houston — con cifras reales, no un «contáctanos para cotizar».',
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
    cta: { label: 'Solicitar propuesta', href: '#contacto' },
    note: webPriceNote,
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Sitios reales que <em>ya están en vivo</em>',
    cta: { label: 'Inicia tu proyecto', href: '#contacto' },
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
      { q: '¿Hay mensualidades obligatorias?', a: 'No. El diseño web se paga por proyecto, una sola vez. El mantenimiento (desde $120 al mes) es opcional: respaldos, seguridad y soporte. Puedes manejar el sitio por tu cuenta si prefieres — el sitio es tuyo, nunca te dejamos amarrado.' },
      { q: '¿La propuesta tiene costo?', a: 'No. Cuéntanos tu proyecto y en menos de 24 horas recibes una propuesta personalizada con alcance y precio, sin costo ni compromiso. Si decides no avanzar, no pasa nada.' },
    ],
  },
  cta: {
    title: 'Pide el precio <em>exacto</em> de tu sitio',
    sub: 'Cuéntanos cuántas páginas y qué funciones necesitas, y recibe una propuesta con el precio cerrado en menos de 24 horas, sin compromiso.',
    primary: { label: 'Solicitar propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
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
    primary: { label: 'Quiero una propuesta gratis', href: '#contacto' },
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
      { icon: 'lucide:calendar-check', title: 'Agenda citas solo', desc: 'Tus clientes reservan citas sin llamadas ni idas y vueltas — de día, de noche y en español.' },
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
      'Hablamos tu idioma y conocemos a tu cliente hispano. Configuramos el asistente en español de verdad — no traducido por un robot — y nos aseguramos de que, cuando un cliente quiera una persona, hable con tu equipo. <strong>Tú te dedicas a tu negocio; de la tecnología nos encargamos nosotros.</strong>',
    ],
    tone: 'teal',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Asistente con IA, <em>desde $900</em>',
    price: '$900',
    unit: 'proyecto inicial',
    lead: 'Empezamos con una solución concreta a tu mayor dolor — no con un proyecto enorme.',
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
      { q: '¿Cuánto cuesta poner un asistente con IA en mi negocio?', a: 'Una automatización inicial empieza en $900 e incluye la instalación, el entrenamiento con tu negocio y el mantenimiento — no es solo una suscripción de software que configuras tú. Empezamos con una sola solución a tu mayor dolor y crecemos desde ahí. Te damos un precio claro en la propuesta gratuita.' },
      { q: '¿Necesito saber de tecnología para usarlo?', a: 'No, y esa es justamente la idea. Nosotros lo configuramos, lo conectamos y te lo dejamos funcionando, con una capacitación sencilla para tu equipo. Tú te dedicas a tu negocio; de la parte técnica nos encargamos nosotros.' },
      { q: '¿El asistente habla español o suena como robot?', a: 'Habla español de verdad, con el tono de tu negocio — no una traducción robótica. Lo configuramos para el español de tus clientes en Houston, y también en inglés si lo necesitas. El objetivo es que tus clientes se sientan bien atendidos.' },
      { q: '¿La IA puede contestar mi WhatsApp y agendar citas sola?', a: 'Sí. Conectamos el asistente con tu WhatsApp, tu calendario y muchas de las herramientas que ya usas, para que responda mensajes y agende citas a cualquier hora. En la propuesta te decimos con honestidad qué se puede integrar y qué no, sin promesas vacías.' },
      { q: '¿Qué pasa si el cliente quiere hablar con una persona?', a: 'Siempre puede. El asistente está hecho para ayudar, no para atrapar a nadie: cuando hace falta un humano, pasa la conversación a tu equipo. El cliente nunca queda dando vueltas con un robot.' },
      { q: '¿En cuánto tiempo queda funcionando?', a: 'Una automatización inicial suele quedar lista en una a tres semanas, según qué herramientas conectemos y qué tan listo esté tu contenido (respuestas, horarios, servicios). Te damos un calendario realista desde el inicio.' },
    ],
  },
  cta: {
    title: 'Deja de perder clientes por <em>no contestar</em>',
    sub: 'Cuéntanos cuál es tu mayor dolor — llamadas perdidas, WhatsApp sin responder, citas que no se agendan — y te propondremos una solución con IA en menos de 24 horas, sin compromiso.',
    primary: { label: 'Quiero mi propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
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
    sub: 'Vende en línea las 24 horas con una tienda a medida, rápida y bilingüe. Catálogo, pagos seguros y todo listo para que tus clientes en Houston te compren desde el celular — en español e inglés.',
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
      { icon: 'lucide:settings', title: 'La plataforma correcta para ti', desc: 'Shopify, WooCommerce o una solución a medida — la elegimos contigo según tu producto y tu presupuesto.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Cómo lo hacemos',
    title: '¿Shopify, WooCommerce o <em>a medida</em>?',
    paragraphs: [
      'No vendemos una sola plataforma a la fuerza. Si quieres lanzar rápido y vender simple, Shopify suele ser ideal; si necesitas más control o ya usas WordPress, WooCommerce encaja mejor; y para necesidades especiales, construimos a medida. Lo elegimos contigo según tu producto, tu volumen y tu presupuesto — con honestidad.',
      'Para vender en Estados Unidos hay requisitos que son tuyos: una cuenta para recibir pagos y, según el caso, tu EIN del IRS. <strong>Te guiamos paso a paso en todo el proceso.</strong> Y como en Houston tu mercado es bilingüe, diseñamos tu tienda en español e inglés desde el inicio — un cruce que pocos aprovechan.',
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
      { q: '¿La tienda es bilingüe en español e inglés?', a: 'Sí, y es una de nuestras ventajas. Diseñamos tu tienda en español e inglés desde el inicio, para que vendas en español a tu comunidad y amplíes tu alcance en inglés — un cruce que pocos competidores en Houston aprovechan.' },
      { q: '¿Tienen tiendas en línea ya hechas que pueda ver?', a: 'Seremos honestos: estamos comenzando con e-commerce, así que todavía no publicamos un caso de tienda propio. Sí construimos web-apps y sitios a medida que ya están en vivo (como la app de reservas de Rosy Nails). Por eso ofrecemos cupos de Cliente Fundador para tu tienda, con condiciones especiales.' },
    ],
  },
  cta: {
    title: 'Empieza a vender en línea en <em>Houston</em>',
    sub: 'Cuéntanos qué vendes y cuántos productos tienes, y recibe una propuesta de tienda en línea en menos de 24 horas, sin compromiso.',
    primary: { label: 'Cotizar mi tienda gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
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
    primary: { label: 'Quiero mi propuesta gratis', href: '#contacto' },
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
      '<strong>Seamos claros con un detalle técnico:</strong> si se usa la API oficial de WhatsApp, Meta cobra algunas conversaciones (hay un volumen gratis al mes y luego un costo por conversación). Ese cobro es de Meta, no nuestro — te lo explicamos por adelantado para que no haya sorpresas. Nosotros cobramos por dejarte el asistente funcionando, no por cada mensaje.',
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
    note: '$900 es el punto de partida para una automatización inicial (por ejemplo, un asistente que contesta y agenda) e incluye instalación, entrenamiento, puesta en marcha y mantenimiento. Los proyectos más completos se cotizan según el alcance. Aparte: si se usa la API oficial de WhatsApp, Meta cobra algunas conversaciones — ese costo es de Meta, no nuestro, y te lo explicamos por adelantado.',
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
    primary: { label: 'Quiero mi propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
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
    sub: 'Respuesta directa, con la tarifa mensual publicada: cuánto invertir en SEO local en Houston, qué incluye y en cuánto tiempo se ven resultados — sin que tengas que pedir una llamada para conocer el precio.',
    primary: { label: 'Quiero mi propuesta gratis', href: '#contacto' },
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
    cta: { label: 'Solicitar propuesta', href: '#contacto' },
    note: 'El precio final depende del estado actual de tu negocio, de tu competencia y de cuántas páginas o ubicaciones trabajemos. Te damos un alcance y un precio claros en la propuesta gratuita, antes de que decidas. No prometemos el primer lugar: nadie controla el algoritmo de Google.',
    tone: 'gold',
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Negocios de Houston que <em>ya posicionan</em>',
    cta: { label: 'Inicia tu proyecto', href: '#contacto' },
    items: proj('Texas Rush Remove', "Julio's Landscape TX"),
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Precio del SEO local, <em>sin rodeos</em>',
    items: [
      { q: '¿Cuánto cuesta el SEO local en Houston al mes?', a: 'Empieza en $600 al mes. El precio final depende de tu competencia, del estado actual de tu negocio y de cuántas páginas o ubicaciones trabajemos. Lo publicamos de frente y te entregamos un alcance y un precio claros en la propuesta gratuita, antes de que decidas.' },
      { q: '¿Hay contrato o permanencia mínima?', a: 'No te amarramos a un contrato largo: trabajamos mes a mes y puedes pausar o cancelar avisando con una anticipación razonable. Eso sí, te explicamos con honestidad que el SEO necesita varios meses para rendir — preferimos que te quedes por los resultados, no por una cláusula.' },
      { q: '¿En cuánto tiempo se ven resultados?', a: 'Las primeras señales suelen aparecer entre 2 y 8 semanas: más reseñas y más vistas en tu ficha de Google. La tracción sólida en búsquedas competidas toma de 3 a 6 meses de trabajo constante. El SEO es acumulativo: una inversión que crece, no un interruptor.' },
      { q: '¿Qué incluye la mensualidad?', a: 'Optimización de tu Perfil de Google de Negocio, consistencia de tu NAP en directorios, una página local al mes, gestión de reseñas, SEO técnico y preparación para los asistentes de IA, más un reporte mensual claro. Ajustamos el alcance a tu presupuesto y a tus prioridades.' },
      { q: '¿Garantizan el primer lugar en Google?', a: 'No, y desconfía de quien lo prometa. Nadie controla el algoritmo de Google. Lo que sí garantizamos es trabajo honesto y medible: optimización correcta, reportes claros y mejoras continuas. Nuestro compromiso es con el método y la transparencia, no con un número imposible de asegurar.' },
      { q: '¿Por qué unas agencias cobran $600 y otras miles?', a: 'Porque el alcance cambia muchísimo: número de ubicaciones, competencia del sector, cantidad de contenido y si incluyen anuncios o no. Nuestra tarifa empieza en $600 al mes para lo esencial del SEO local y sube según lo que tu caso necesite — siempre dicho por adelantado.' },
    ],
  },
  cta: {
    title: 'Aparece en Houston, mes <em>a mes</em>',
    sub: 'Cuéntanos sobre tu negocio y recibe una propuesta de SEO local con alcance y precio claros en menos de 24 horas, sin compromiso.',
    primary: { label: 'Solicitar propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
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
    primary: { label: 'Quiero mi propuesta gratis', href: '#contacto' },
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
      'La inteligencia artificial es excelente para generar muchas ideas rápido y barato — pero una marca que aguante el tiempo necesita estrategia y criterio. Por eso usamos la IA para acelerar la exploración y proponer caminos, y un diseñador define la dirección, refina cada detalle y se asegura de que tu marca diga lo correcto.',
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
    primary: { label: 'Solicitar propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
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
    primary: { label: 'Quiero una propuesta gratis', href: '#contacto' },
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
      'En internet hay decenas de apps de IA que te venden una suscripción y te dejan solo para configurarla. Para un negocio ocupado, eso casi siempre termina olvidado. Nosotros trabajamos distinto: te lo instalamos, lo entrenamos con tu negocio y le damos mantenimiento — tú no tocas nada.',
      'En Miami eso pesa todavía más: aquí el primer contacto pasa por WhatsApp, desde la cafetería de Hialeah hasta la clínica de Brickell, y casi siempre en español. Configuramos el asistente para que hable como tus clientes — cubano, venezolano, colombiano — y conteste al toque. <strong>Tú te dedicas a tu negocio; de la tecnología nos encargamos nosotros.</strong>',
    ],
    tone: 'teal',
  },
  pricing: {
    tag: 'Inversión',
    title: 'Asistente con IA, <em>desde $900</em>',
    price: '$900',
    unit: 'proyecto inicial',
    lead: 'Empezamos con una solución concreta a tu mayor dolor — no con un proyecto enorme.',
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
      { q: '¿Cuánto cuesta poner un asistente con IA en mi negocio?', a: 'Una automatización inicial empieza en $900 e incluye la instalación, el entrenamiento con tu negocio y el mantenimiento — no es solo una suscripción de software que configuras tú. Empezamos con una sola solución a tu mayor dolor y crecemos desde ahí. Te damos un precio claro en la propuesta gratuita.' },
      { q: '¿Necesito saber de tecnología para usarlo?', a: 'No, y esa es justamente la idea. Nosotros lo configuramos, lo conectamos y te lo dejamos funcionando, con una capacitación sencilla para tu equipo. Tú te dedicas a tu negocio; de la parte técnica nos encargamos nosotros.' },
      { q: '¿El asistente habla en el español de Miami o suena como robot?', a: 'Habla como tus clientes: el español que de verdad se usa en Miami — cubano, venezolano, colombiano —, con el tono de tu negocio. No es una traducción robótica, y detecta si el cliente prefiere inglés.' },
      { q: '¿La IA puede contestar mi WhatsApp y agendar citas sola?', a: 'Sí. Conectamos el asistente con tu WhatsApp, tu calendario y las herramientas que ya usas, para que responda y agende citas o reservas a cualquier hora — ideal para restaurantes, clínicas, talleres y consultorios. En la propuesta te decimos con honestidad qué se puede integrar y qué no.' },
      { q: '¿Qué pasa si el cliente quiere hablar con una persona?', a: 'Siempre puede. El asistente está hecho para ayudar, no para atrapar a nadie: cuando hace falta un humano, pasa la conversación a tu equipo. El cliente nunca queda dando vueltas con un robot.' },
      { q: '¿En cuánto tiempo queda funcionando?', a: 'Una automatización inicial suele quedar lista en una a tres semanas, según qué herramientas conectemos y qué tan listo esté tu contenido (respuestas, horarios, servicios). Te damos un calendario realista desde el inicio.' },
    ],
  },
  cta: {
    title: 'Deja de perder clientes por <em>no contestar</em>',
    sub: 'En Miami, el cliente que te escribe por WhatsApp y no recibe respuesta se va con otro. Cuéntanos tu mayor dolor y te propondremos una solución con IA en menos de 24 horas, sin compromiso.',
    primary: { label: 'Quiero mi propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
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
    sub: 'Aparece cuando tus clientes buscan en Google Maps y en los asistentes de IA. Optimizamos tu presencia local para que tu negocio en Miami gane más llamadas, visitas y reseñas — en español e inglés.',
    primary: { label: 'Propuesta gratis en 24h', href: '#contacto' },
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
      { icon: 'lucide:list-checks', title: 'NAP consistente', desc: 'Tu nombre, dirección y teléfono idénticos en Google, Bing, Apple Maps y directorios — la base que la IA lee.' },
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
      'Miami-Dade es uno de los mercados más hispanos de Estados Unidos: cerca del 69% de su población es latina, según el U.S. Census Bureau (ACS 2023). Aquí el español no es un «extra», es la lengua del comercio — y aparecer en el «paquete local» de Google Maps, en español, puede ser la diferencia entre una llamada y un cliente perdido.',
      'Trabajamos toda el área de Miami-Dade con contexto real: Doral, Hialeah, Kendall, Coral Gables, Brickell y más. <strong>Conocemos a tu cliente</strong> — cubano, venezolano, colombiano — y optimizamos para cómo busca de verdad, en el español que de verdad habla.',
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
    cta: { label: 'Solicitar propuesta', href: '#contacto' },
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
    primary: { label: 'Solicitar propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
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
    sub: 'Vende en línea las 24 horas con una tienda a medida, rápida y bilingüe. Catálogo, pagos seguros y todo listo para que tus clientes en Miami te compren desde el celular — en español e inglés.',
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
      { icon: 'lucide:credit-card', title: 'Pagos seguros, también de fuera', desc: 'Aceptas tarjeta y PayPal con pasarelas confiables como Stripe — incluido el cliente que paga desde Latinoamérica. Te guiamos con la cuenta y los requisitos.' },
      { icon: 'lucide:smartphone', title: 'Diseñada para el celular', desc: 'La mayoría compra desde el teléfono. Tu tienda carga rápido y se ve impecable en cualquier pantalla.' },
      { icon: 'lucide:languages', title: 'Bilingüe para Miami y la región', desc: 'Le vendes en español a la comunidad cubana, venezolana y colombiana de Miami, y amplías tu alcance en inglés — todo en la misma tienda.' },
      { icon: 'lucide:search', title: 'Lista para Google y la IA', desc: 'Estructura optimizada para que te encuentren en buscadores y en asistentes como ChatGPT.' },
      { icon: 'lucide:settings', title: 'La plataforma correcta para ti', desc: 'Shopify, WooCommerce o una solución a medida — la elegimos contigo según tu producto y tu presupuesto.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Cómo lo hacemos',
    title: '¿Shopify, WooCommerce o <em>a medida</em>?',
    paragraphs: [
      'En Miami hay tiendas para todo — desde la repostería de Hialeah hasta la marca de moda de Wynwood — y cada una pide su plataforma. No vendemos una sola a la fuerza: Shopify para lanzar rápido y vender simple, WooCommerce si necesitas más control o ya usas WordPress, y a medida para lo especial. Lo elegimos contigo, con honestidad, según tu producto y tu presupuesto.',
      'Para vender en Estados Unidos hay requisitos que son tuyos: una cuenta para recibir pagos y, según el caso, tu EIN del IRS. <strong>Te guiamos paso a paso en todo el proceso.</strong> Y como Miami es puerta de Latinoamérica y tu mercado es bilingüe, diseñamos tu tienda en español e inglés desde el inicio — para venderle a la comunidad hispana de Miami y más allá.',
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
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
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
    sub: 'Tus futuros clientes buscan ayuda en español, muchas veces de noche o el fin de semana. Captamos y agendamos esas consultas con un asistente de IA 24/7, sobre un sitio bilingüe que da confianza — sin prometer resultados de ningún caso.',
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
      'Houston es uno de los mercados de inmigración más grandes del país, y tus futuros clientes buscan ayuda en su idioma — muchas veces de noche o el fin de semana, cuando tu despacho ya cerró. En ese momento, el que contesta primero se queda con el caso.',
      'Por eso el centro de nuestro sistema es un asistente con IA que capta y agenda esas consultas 24/7, en español, <strong>sin dar consejo legal</strong>: reúne lo básico y te lo pasa, tú llevas el caso. Lo combinamos con un sitio bilingüe que transmite confianza y SEO local para que te encuentren. <strong>Honestidad ante todo:</strong> nunca prometemos el resultado de un caso ni una «visa garantizada» — eso no se promete.',
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
    primary: { label: 'Solicitar propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
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
    sub: 'Un sitio bilingüe con tus propiedades, rápido en el celular y pensado para captar compradores y vendedores — más SEO local para aparecer cuando buscan «casas en venta» en tu zona de Houston.',
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
      { q: '¿El sitio capta compradores y vendedores?', a: 'Sí: formularios claros, llamadas a la acción y, si lo sumas, un asistente con IA que responde 24/7. La idea es que ningún interesado se pierda entre mensajes — que cada uno quede registrado y contigo.' },
      { q: '¿El sitio es bilingüe?', a: 'Sí. En Houston tu comprador busca en español e inglés, así que diseñamos en ambos idiomas desde el inicio, con el contexto correcto para tu mercado.' },
      { q: '¿Garantizan el primer lugar en Google?', a: 'No, y desconfía de quien lo prometa. Nadie controla el algoritmo. Te damos una base técnica sólida, SEO local honesto y reportes claros; el liderazgo en búsquedas competidas se construye con trabajo constante, no con una garantía imposible.' },
    ],
  },
  cta: {
    title: 'Tu próximo sitio de <em>bienes raíces</em> empieza aquí',
    sub: 'Cuéntanos cómo trabajas y qué zonas cubres, y recibe una propuesta de sitio y SEO en menos de 24 horas, sin compromiso.',
    primary: { label: 'Solicitar propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
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

export const clusters = {
  'houston/seo-local': houstonSeo,
  'houston/diseno-web': houstonWeb,
  'houston/ia-conversacional': houstonIa,
  'houston/ecommerce': houstonEcommerce,
  'houston/branding': houstonBranding,
  'houston/abogados-inmigracion': houstonAbogadosInmigracion,
  'houston/bienes-raices': houstonBienesRaices,
  'miami/diseno-web': miamiWeb,
  'miami/ia-conversacional': miamiIa,
  'miami/seo-local': miamiSeo,
  'miami/ecommerce': miamiEcommerce,
  'ia-para-pymes': iaPymes,
  'precios/cuanto-cuesta-una-pagina-web-houston': precioWebHouston,
  'precios/cuanto-cuesta-un-chatbot': precioChatbot,
  'precios/cuanto-cuesta-seo-local-houston': precioSeoHouston,
} satisfies Record<string, ClusterPage>;

export { nap };
