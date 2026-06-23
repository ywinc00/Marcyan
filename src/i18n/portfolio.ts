// ─────────────────────────────────────────────────────────────
// CONTENIDO · /es/portafolio — proof real (4 clientes) + E-E-A-T.
// Honestidad DURA: 4 negocios REALES con capturas reales (public/Galeria/*.webp);
// SIN métricas inventadas; SIN enlaces a los sitios de los clientes (privacidad,
// decisión de la auditoría UI). Schema: CollectionPage + ItemList (CreativeWork).
// Las capturas y los datos base son los mismos que usa la home (Projects.astro).
// ─────────────────────────────────────────────────────────────
import type { FaqItem, CrumbItem } from '../lib/schema';
import type { RelatedLink } from './clusters';

export interface PortfolioProject {
  name: string;
  cat: string;            // rubro · ciudad
  slug: string;           // base de la captura en /Galeria (slug-pc.webp / slug-movil.webp)
  mh: number;             // alto nativo de la captura móvil (evita CLS)
  accent: 'gold' | 'teal';
  badge: string;
  tags: string[];
  did: string;            // "qué hicimos" — honesto, sin métricas inventadas
  result: string;         // resultado real
  serviceLabel: string;   // enlace al servicio relevante
  serviceHref: string;
}

// Los 4 clientes reales. cat/result coherentes con content.ts (projects); mh espejo
// de las alturas nativas en Projects.astro (SHOTS) para evitar CLS.
export const portfolioProjects: PortfolioProject[] = [
  {
    name: 'Texas Rush Remove', cat: 'Junk Removal · Houston, TX', slug: 'trr', mh: 2431, accent: 'gold',
    badge: 'Sitio + SEO', tags: ['Reconstruido desde cero', 'SEO local', 'Bilingüe'],
    did: 'Reconstruimos su sitio desde cero, rápido y bilingüe, y montamos su SEO local: Perfil de Google, NAP consistente y páginas por servicio para su área de Houston.',
    result: 'Un sitio nuevo y un SEO local honesto. Ya posiciona en su zona de Houston.',
    serviceLabel: 'SEO local en Houston', serviceHref: '/es/houston/seo-local',
  },
  {
    name: 'Move Junk Away', cat: 'Junk Removal · Orlando, FL', slug: 'mja', mh: 2282, accent: 'teal',
    badge: 'Sitio + SEO', tags: ['Reconstruido desde cero', 'SEO local', 'Bilingüe'],
    did: 'Lo mismo en Orlando: sitio reconstruido desde cero, rápido y bilingüe, con SEO local (Perfil de Google, NAP y contenido por servicio) para su mercado de Florida.',
    result: 'Sitio nuevo más SEO local. Ya posiciona en su zona de Orlando.',
    serviceLabel: 'SEO local', serviceHref: '/es/houston/seo-local',
  },
  {
    name: "Julio's Landscape TX", cat: 'Paisajismo · Houston, TX', slug: 'jls', mh: 2397, accent: 'gold',
    badge: 'Marca + Sitio', tags: ['Identidad de marca', 'Sitio a medida', 'Desde cero'],
    did: 'Creamos su marca desde cero (logo, paleta y tipografías) y su sitio web a medida, coherente de principio a fin, para un paisajista de Houston.',
    result: 'Una identidad de marca y un sitio nuevos, hechos a medida desde cero.',
    serviceLabel: 'Branding e identidad', serviceHref: '/es/houston/branding',
  },
  {
    name: 'Rosy Nails & Care', cat: 'Salón de uñas · Houston, TX', slug: 'rn', mh: 2710, accent: 'teal',
    badge: 'Web app', tags: ['Agenda de citas', 'A medida', 'Reservas en línea'],
    did: 'Construimos una web app a medida donde las clientas agendan sus citas en línea y exploran inspiración de diseños de uñas, para un salón de Houston.',
    result: 'Una web app de reservas a medida, en vivo y en uso por sus clientas.',
    serviceLabel: 'Sitios para salones de belleza', serviceHref: '/es/houston/salon-belleza',
  },
];

export const portfolioPage = {
  meta: {
    title: 'Portafolio: trabajo real, negocios reales | Marcyan',
    description:
      'Portafolio de Marcyan Studio: sitios web, SEO local, branding y web apps para negocios hispanos reales en Houston y Orlando. Capturas reales, sin métricas infladas.',
  },
  path: '/es/portafolio',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Portafolio', path: '/es/portafolio' },
  ] as CrumbItem[],
  hero: {
    kicker: 'Portafolio',
    h1: 'Trabajo real, negocios <em>reales</em>',
    sub: 'No mostramos maquetas de catálogo: estos son clientes reales para los que diseñamos sitios, SEO, marca y web apps. Capturas reales de cada proyecto, en español e inglés, sin métricas infladas.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver servicios', href: '/es/servicios' },
    chips: ['4 negocios reales', 'Houston y Orlando', 'Capturas reales'],
    tone: 'gold' as const,
  },
  answer: {
    q: '¿Qué tipo de proyectos hace Marcyan?',
    a: 'Marcyan diseña y construye sitios web a medida, SEO local, identidad de marca y web apps para negocios hispanos. Nuestro portafolio incluye cuatro clientes reales en Houston y Orlando: dos de junk removal, un paisajista y un salón de uñas, cada uno con su sitio o app en vivo.',
  },
  worksHead: {
    tag: 'Trabajo real',
    title: 'Cuatro clientes, <em>cuatro soluciones</em>',
    intro:
      'Cada proyecto se diseñó a medida alrededor del negocio. Por respeto a la privacidad de nuestros clientes mostramos las capturas, no los enlaces; con gusto te los enseñamos en una llamada.',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Lo que podemos hacer por ti',
    links: [
      { label: 'Todos los servicios', href: '/es/servicios', desc: 'Diseño web, IA, SEO, e-commerce y branding, con precios públicos.', icon: 'lucide:layers' },
      { label: 'Sobre Marcyan', href: '/es/sobre-nosotros', desc: 'Quiénes somos, cómo trabajamos y por qué bilingüe.', icon: 'lucide:users' },
      { label: 'Precios y planes', href: '/es/precios', desc: 'El precio de arranque de cada servicio y qué incluye.', icon: 'lucide:tag' },
    ] as RelatedLink[],
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Sobre nuestro portafolio, <em>claro</em>',
    items: [
      { q: '¿Estos son clientes reales?', a: 'Sí. Los cuatro son negocios reales para los que trabajamos: Texas Rush Remove y Move Junk Away (junk removal), Julio\'s Landscape (paisajismo) y Rosy Nails & Care (salón de uñas). Las capturas que ves son de sus sitios y app reales, no maquetas de catálogo.' },
      { q: '¿Por qué no muestran los enlaces a los sitios?', a: 'Por respeto a la privacidad de nuestros clientes no publicamos sus dominios aquí. Si quieres verlos en vivo, te los mostramos con gusto en una llamada o en la propuesta.' },
      { q: '¿Tienen casos en mi industria o ciudad?', a: 'Trabajamos sobre todo en Houston y también en Orlando, en rubros como servicios para el hogar, paisajismo y belleza. Si aún no tenemos un caso publicado de tu industria o ciudad (por ejemplo, Miami), te ofrecemos un cupo de Cliente Fundador con condiciones especiales.' },
      { q: '¿Publican métricas o números de resultados?', a: 'Solo decimos lo que podemos respaldar con honestidad: que reconstruimos sitios, montamos SEO local que ya posiciona y entregamos marcas y apps a medida. No inflamos porcentajes ni inventamos cifras: preferimos enseñarte el trabajo y hablar de tu caso.' },
      { q: '¿Cuánto tarda un proyecto como estos?', a: 'Un sitio a medida suele tomar entre 2 y 4 semanas según el alcance y la rapidez con que recibamos tu contenido; una web app o una tienda toman más. Te damos un calendario realista en la propuesta gratuita.' },
    ] as FaqItem[],
  },
  cta: {
    title: 'El siguiente caso <em>puede ser el tuyo</em>',
    sub: 'Cuéntanos sobre tu negocio y recibe una propuesta personalizada en menos de 24 horas, sin compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Brief detallado del proyecto', href: '/formulario' },
    tone: 'gold' as const,
  },
};
