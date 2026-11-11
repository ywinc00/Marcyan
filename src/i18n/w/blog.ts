// ─────────────────────────────────────────────────────────────
// Índice del blog v3 (design/rediseno-workos.md §4.7, ola 3 · 3-blog-indice).
// Solo el copy NUEVO de la plantilla v3 (ES + EN). Lo congelado sigue en su sitio:
//   · ES: meta, H1, migas → src/i18n/blog.ts (blogIndex), sin tocar.
//   · EN: meta, H1, migas → en la propia página /en/blog (como hoy).
// Reglas de copy: sin guiones conectores, "dominamos" la IA, nada inventado.
// Plazos oficiales: contacto en 1 hora hábil, propuesta en 24 horas (no se fusionan).
// ─────────────────────────────────────────────────────────────
export type BlogLang = 'es' | 'en';

/** Lo que las piezas del índice necesitan de cada artículo (todo sale del frontmatter). */
export interface PostCard {
  href: string;
  title: string;
  description: string;
  tags: string[];
  /** ids de tema (sin acentos) para el filtro. */
  cats: string[];
  dateISO: string;
  dateLabel: string;
  /** "12 min de lectura", misma fórmula que el artículo (~200 palabras/min). */
  reading: string;
}

export interface BlogW {
  /** Píldora de la cabecera (W-CONT-01, en lugar de la suscripción que no se construye). */
  pill: { label: string; href: string };
  /** Destacada y pareja. */
  team: string;
  readingSuffix: string;
  readMore: string;
  /** Listado con filtro. */
  list: { label: string; titleHtml: string; filterAria: string; all: string; none: string };
  /** Estado vacío (solo EN hoy). */
  empty: { title: string; text: string; link: string; linkHref: string };
  /** Cierre en dos tarjetas (W-CONT-50). */
  close: {
    aria: string;
    proposal: { title: string; text: string; form: string };
    checkup: { title: string; text: string; cta: string; href: string };
  };
}

export const blogW: Record<BlogLang, BlogW> = {
  es: {
    pill: { label: 'Diagnóstico gratis de tu web', href: '/es/diagnostico' },
    team: 'Equipo Marcyan',
    readingSuffix: 'min de lectura',
    readMore: 'Leer guía',
    list: {
      label: 'Guías',
      titleHtml: 'Explora por tema',
      filterAria: 'Filtrar por tema',
      all: 'Todas',
      none: 'No hay guías en este tema todavía.',
    },
    empty: {
      title: 'Pronto publicaremos nuestras primeras guías.',
      text: '',
      link: '',
      linkHref: '',
    },
    close: {
      aria: 'Siguiente paso',
      proposal: {
        title: '¿Tienes un proyecto en mente?',
        text: 'Cuéntanos tu negocio y te mandamos una propuesta en 24 horas.',
        form: 'Propuesta gratis',
      },
      checkup: {
        title: 'Diagnóstico gratis',
        text: 'Revisa gratis si tu negocio está perdiendo clientes online.',
        cta: 'Hacer el diagnóstico',
        href: '/es/diagnostico',
      },
    },
  },
  en: {
    pill: { label: 'Free website checkup', href: '/en/checkup' },
    team: 'Marcyan team',
    readingSuffix: 'min read',
    readMore: 'Read guide',
    list: {
      label: 'Guides',
      titleHtml: 'Browse by topic',
      filterAria: 'Filter by topic',
      all: 'All',
      none: 'No guides on this topic yet.',
    },
    empty: {
      title: 'Our English guides are coming soon.',
      text: 'In the meantime, our Spanish guides cover web design, pricing and AI for small businesses in Houston and Miami.',
      link: 'Read the guides in Spanish',
      linkHref: '/es/blog',
    },
    close: {
      aria: 'Next step',
      proposal: {
        title: 'Have a project in mind?',
        text: 'Tell us about your business and get a proposal within 24 hours.',
        form: 'Get my free proposal',
      },
      checkup: {
        title: 'Free checkup',
        text: 'See for free whether your business is losing customers online.',
        cta: 'Take the checkup',
        href: '/en/checkup',
      },
    },
  },
};
