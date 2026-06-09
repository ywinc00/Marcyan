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
  links: [
    { label: 'Servicios', href: '/es/#servicios' },
    { label: 'Precios', href: '/es/precios' },
    { label: 'IA', href: '/es/ia-para-pymes' },
    { label: 'Proyectos', href: '/es/#proyectos' },
    { label: 'Ciudades', href: '/es/#ciudades' },
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
  cat: 'Marcyan · Houston & Miami',
  url: '/es/',
  display: 'marcyanstudio.com',
  result: 'Construido en HTML estático para que ChatGPT y Perplexity puedan leerlo y citarlo.',
  accent: 'teal',
};

// ── Contenido compartido entre las dos landings de diseño web ──
const webIncludesItems: FeatureItem[] = [
  { icon: 'lucide:pen-tool', title: 'Diseño a medida', desc: 'Cada sitio se diseña desde cero alrededor de tu marca y tus objetivos. Sin plantillas recicladas.' },
  { icon: 'lucide:gauge', title: 'Rápido y móvil primero', desc: 'HTML ligero que carga en un par de segundos, impecable en celular y en computadora.' },
  { icon: 'lucide:languages', title: 'Bilingüe español e inglés', desc: 'Tu sitio en los dos idiomas, escrito para cómo busca de verdad tu cliente.' },
  { icon: 'lucide:search', title: 'SEO y listo para IA', desc: 'Estructura optimizada para Google y para que ChatGPT y Perplexity puedan leerte.' },
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
    { name: 'Houston', path: '/es/#ciudades' },
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
      { icon: 'lucide:bot', title: 'Listo para la IA (AEO)', desc: 'Tu información en Bing y en un formato que ChatGPT y Perplexity pueden citar.' },
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
      { label: 'IA para tu negocio', href: '/es/ia-para-pymes', desc: 'Atiende y capta clientes 24/7 con asistentes en español.', icon: 'lucide:bot' },
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: '¿También operas en Miami? También diseñamos para esa ciudad.', icon: 'lucide:palette' },
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
    { name: 'Houston', path: '/es/#ciudades' },
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
      { label: 'IA para tu negocio', href: '/es/ia-para-pymes', desc: 'Suma asistentes y automatización a tu sitio.', icon: 'lucide:bot' },
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: '¿También operas en Miami? También diseñamos allí.', icon: 'lucide:palette' },
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
    { name: 'Miami', path: '/es/#ciudades' },
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
      'Miami es uno de los mercados más hispanos de Estados Unidos: el español no es un «extra», es el idioma de tus clientes. Un sitio que no habla su idioma — y que no carga rápido en el celular — deja dinero sobre la mesa.',
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
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'Nuestra base de operaciones, con casos verificables.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que tu sitio aparezca en Google y en Maps.', icon: 'lucide:search' },
      { label: 'IA para tu negocio', href: '/es/ia-para-pymes', desc: 'Suma asistentes y automatización a tu sitio.', icon: 'lucide:bot' },
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
    badgeIcon: 'lucide:bot',
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
      { icon: 'lucide:messages-square', title: 'Asistente que contesta 24/7', desc: 'Un asistente de chat en tu sitio que responde preguntas y capta prospectos a cualquier hora, en español.' },
      { icon: 'lucide:message-circle', title: 'WhatsApp automático', desc: 'Respuestas y seguimiento automáticos por WhatsApp y mensajes, para que ningún cliente se quede esperando.' },
      { icon: 'lucide:calendar-check', title: 'Agenda de citas con IA', desc: 'Tus clientes reservan citas solos, de día y de noche, sin llamadas ni idas y vueltas.' },
      { icon: 'lucide:phone-missed', title: 'Rescata llamadas perdidas', desc: 'Cuando no puedes contestar, la IA responde por mensaje al instante para que no pierdas al cliente.' },
      { icon: 'lucide:bot', title: 'Aparece en ChatGPT y Perplexity', desc: 'Preparamos tu información para que los asistentes de IA puedan encontrarte y recomendarte.' },
      { icon: 'lucide:workflow', title: 'Automatiza el seguimiento', desc: 'Conectamos la IA con las herramientas que ya usas para que avisos y seguimientos ocurran solos.' },
    ],
    tone: 'teal',
  },
  local: {
    tag: 'El dato que importa',
    title: 'La mayoría de los negocios son <em>invisibles</em> para la IA',
    paragraphs: [
      'Cada vez más personas le preguntan a ChatGPT, Gemini o Perplexity por un servicio en lugar de buscar en Google. El problema: según el índice de visibilidad local de SOCi de 2026, ChatGPT recomienda apenas el <strong>1.2% de los negocios locales</strong>. El resto, sencillamente, no aparece.',
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
      { q: '¿Qué es eso de aparecer en ChatGPT?', a: 'Cada vez más gente le pide recomendaciones a ChatGPT o Perplexity en lugar de buscar en Google. Hoy esos asistentes recomiendan a muy pocos negocios locales. Preparamos tu información para que tengas más posibilidades de aparecer cuando alguien pregunte por tu tipo de servicio.' },
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
      { label: 'Todos los precios', href: '/es/precios', desc: 'Los 6 servicios con su precio de arranque y qué incluyen.', icon: 'lucide:tag' },
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'El servicio a detalle: proceso, proyectos y FAQ.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Que tu sitio nuevo aparezca en Google y en Maps.', icon: 'lucide:search' },
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

// ── Registro de las landings (clave = slug de ruta) ──
export const clusters = {
  'houston/seo-local': houstonSeo,
  'houston/diseno-web': houstonWeb,
  'miami/diseno-web': miamiWeb,
  'ia-para-pymes': iaPymes,
  'precios/cuanto-cuesta-una-pagina-web-houston': precioWebHouston,
} satisfies Record<string, ClusterPage>;

export { nap };
