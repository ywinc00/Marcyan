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
  cta: {
    title: '¿Hablamos de tu <em>proyecto</em>?',
    sub: 'Propuesta personalizada en menos de 24 horas, sin costo ni compromiso. Atención bilingüe en Houston y Miami.',
    primary: { label: 'Explorar más guías', href: '/es/blog' },
    secondary: { label: 'Ver precios', href: '/es/precios' },
    tone: 'gold' as const,
  },
};
