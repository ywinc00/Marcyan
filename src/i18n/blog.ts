// ─────────────────────────────────────────────────────────────
// UI / chrome del BLOG (ES). El CONTENIDO de cada pieza vive en su Markdown
// (src/content/blog/*.md); aquí solo los textos de andamiaje compartidos del
// índice y del renderer de post. Español neutral hispano US, formal-cálido.
// ─────────────────────────────────────────────────────────────
import type { CrumbItem } from '../lib/schema';

export const blogIndex = {
  meta: {
    title: 'Blog · Guías de diseño web, IA y SEO para PYMEs | Marcyan Studio',
    description:
      'Guías claras y honestas sobre diseño web, inteligencia artificial y SEO para negocios hispanos en Houston y Miami. Precios reales, datos con fuente y cero promesas vacías.',
  },
  hero: {
    badge: 'Recursos',
    badgeIcon: 'lucide:book-open',
    kicker: 'Blog de Marcyan',
    h1: 'Guías honestas para <em>hacer crecer</em> tu negocio en línea',
    sub: 'Diseño web, inteligencia artificial y SEO explicados sin tecnicismos y sin letra pequeña, para dueños de negocios hispanos en Houston y Miami.',
    primary: { label: 'Explorar guías', href: '#articulos' },
    secondary: { label: 'Ver precios', href: '/es/precios' },
    tone: 'gold' as const,
  },
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Blog', path: '/es/blog' },
  ] as CrumbItem[],
  list: { tag: 'Últimas publicaciones', title: 'Artículos <em>recientes</em>' },
  cardCta: 'Leer guía',
  empty: 'Pronto publicaremos nuestras primeras guías.',
  cta: {
    title: '¿Listo para que tu negocio <em>despegue</em>?',
    sub: 'Cuéntanos tu idea y recibe una propuesta personalizada en menos de 24 horas, sin costo ni compromiso.',
    primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver precios', href: '/es/precios' },
    tone: 'gold' as const,
  },
};

export const postChrome = {
  root: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Blog', path: '/es/blog' },
  ] as CrumbItem[],
  readingSuffix: 'min de lectura',
  faq: { tag: 'Preguntas frecuentes', title: 'Preguntas <em>frecuentes</em>' },
  related: { tag: 'Sigue explorando', title: 'Recursos <em>relacionados</em>' },
  nav: { prev: 'Anterior', next: 'Siguiente', index: 'Ver todas las guías' },
  toc: 'En esta guía',
  rail: {
    cta: {
      aria: 'Pide tu propuesta',
      kicker: 'Hablemos de tu proyecto',
      title: '¿Listo para que tu negocio <em>despegue</em>?',
      // {web}/{ia}/{seo} los rellena RailCta desde PRICE_ANCHORS (fuente única).
      priceNote: 'Precios públicos: web desde {web} · asistente con IA desde {ia} · SEO local desde {seo}.',
      chip: 'Diagnóstico de visibilidad en IA — gratis',
      chipHref: '/es/diagnostico',
      form: {
        name: { label: 'Nombre', ph: 'Tu nombre' },
        contact: { label: 'Email o WhatsApp', ph: 'tu@email.com o tu número' },
        submit: 'Pedir propuesta gratis',
        sending: 'Enviando…',
        success: 'Recibido. Te respondemos en menos de 24h.',
        error: 'No se pudo enviar. Escríbenos por WhatsApp o inténtalo de nuevo.',
        invalid: 'Déjanos un email válido o un teléfono con al menos 7 dígitos.',
      },
      or: 'o si prefieres:',
      call: 'Llamar',
    },
    tools: {
      aria: 'Herramientas gratis',
      kicker: 'Herramientas gratis',
      intro: 'Ponle número a lo que estás perdiendo, en segundos y sin registro:',
      items: [
        { label: 'Calculadora de llamadas perdidas', href: '/es/herramientas#llamadas', icon: 'lucide:phone-missed' },
        { label: 'Calculadora de citas perdidas', href: '/es/herramientas#citas', icon: 'lucide:calendar-x' },
        { label: 'Diagnóstico digital gratis', href: '/es/diagnostico', icon: 'lucide:scan-search' },
      ],
      all: { label: 'Ver todas las herramientas', href: '/es/herramientas' },
    },
  },
  cta: {
    title: '¿Hablamos de tu <em>proyecto</em>?',
    sub: 'Propuesta personalizada en menos de 24 horas, sin costo ni compromiso. Atención bilingüe en Houston y Miami.',
    primary: { label: 'Explorar más guías', href: '/es/blog' },
    secondary: { label: 'Ver precios', href: '/es/precios' },
    tone: 'gold' as const,
  },
};
