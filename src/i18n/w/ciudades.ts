// ─────────────────────────────────────────────────────────────
// Copy de la página de Ciudades v3 (design/rediseno-workos.md §4.13, ola 3).
// · `meta`, `breadcrumb`, `h1`, `answer`, `itemList`, `teaser` y `cta` son el copy que
//   antes vivía dentro de src/pages/{es/ciudades,en/cities}.astro, sacado SIN cambiar
//   ni una letra (contratos SEO: H1, BreadcrumbList, ItemList, answer).
// · El resto es copy NUEVO (eyebrow, cola, bajada, títulos de sección, tarjeta ancha,
//   cierre): reglas del sitio (sin guiones como conector, "dominamos" la IA, nada
//   inventado). EN escrito nativo, no traducido (R4).
// Datos que NO viven aquí (se leen de su fuente): ciudades, área y teléfono
// (content.locations), servicios (w/nav.ts ← pricing.ts), barrios y sectores
// (houston*.ts / miami.ts), proyectos (portfolio*.ts).
// ─────────────────────────────────────────────────────────────

export type CiudadesLang = 'es' | 'en';

export interface CiudadesCopy {
  meta: { title: string; description: string; path: string };
  breadcrumb: { name: string; path: string }[];
  itemList: { name: string; path: string }[];
  itemListName: string;
  hero: { eyebrow: string; h1: string; tail: string; lead: string };
  /** Tarjetas de ciudad del hero: teaser de cada hub (copy de antes) y rótulo del enlace. */
  perfiles: {
    title: string;
    teaser: Record<'Houston' | 'Miami', string>;
    cta: (city: string) => string;
    wide: { title: string; text: string; cta: string };
  };
  matriz: { label: string; title: string; lead: string; tableLabel: string };
  sedes: { label: string; title: string; lead: string; more: string; callLabel: string };
  donde: { label: string; title: string; lead: string };
  proyectos: { label: string; title: string; lead: string; more: string };
  answer: { q: string; a: string };
  cta: { title: string };
  cierre: { proof: string; warmTitle: string; warmText: string; warmCta: string; warmHref: string };
}

export const ciudadesCopy: Record<CiudadesLang, CiudadesCopy> = {
  es: {
    meta: {
      title: 'Ciudades — Houston y Miami | Agencia hispana bilingüe | Marcyan',
      description:
        'Marcyan Studio trabaja con negocios hispanos en Houston, TX y Miami, FL: diseño web, IA y SEO local, en español e inglés. Elige tu ciudad.',
      path: 'ciudades',
    },
    breadcrumb: [
      { name: 'Inicio', path: '/es/' },
      { name: 'Ciudades', path: '/es/ciudades' },
    ],
    itemList: [
      { name: 'Marcyan en Houston, TX', path: '/es/houston' },
      { name: 'Marcyan en Miami, FL', path: '/es/miami' },
    ],
    itemListName: 'Ciudades de Marcyan Studio',
    hero: {
      eyebrow: 'Nuestras ciudades',
      h1: 'Houston y <em>Miami</em>',
      tail: 'Un mismo equipo, en tu idioma.',
      lead: 'Elige tu ciudad: servicios, teléfono y proyectos reales.',
    },
    perfiles: {
      title: 'Elige tu ciudad',
      teaser: {
        Houston: 'Nuestra base de operaciones, con casos reales y verificables.',
        Miami: 'Diseño, SEO e IA en el español del Caribe. Cupos de Cliente Fundador.',
      },
      cta: (city) => `Ver ${city}`,
      wide: {
        title: '¿Tu negocio está en otra ciudad?',
        text: 'Escríbenos y te decimos si podemos ayudarte.',
        cta: 'Escríbenos',
      },
    },
    matriz: {
      label: 'Qué hacemos en cada ciudad',
      title: 'Cada servicio, en su ciudad',
      lead: 'Toca una casilla para ir a la página de ese servicio en esa ciudad. Las punteadas todavía no tienen página propia.',
      tableLabel: 'Servicios de Marcyan por ciudad',
    },
    sedes: {
      label: 'Dónde estamos',
      title: 'Un teléfono en cada ciudad',
      lead: 'Somos negocio de área de servicio, sin oficina pública: trabajamos en toda el área metropolitana de Houston y de Miami.',
      more: 'Ver servicios',
      callLabel: 'Llamar a',
    },
    donde: {
      label: 'Barrios y sectores',
      title: 'Páginas para tu zona y tu sector',
      lead: 'Si tu negocio está en uno de estos barrios o sectores, aquí tienes la página hecha para ti.',
    },
    proyectos: {
      label: 'Proyectos por ciudad',
      title: 'Trabajo real, con nombre y ciudad',
      lead: 'Tres proyectos en Houston y uno en Florida (Orlando), con sus webs en vivo.',
      more: 'Houston, TX y Florida (Orlando)',
    },
    answer: {
      q: '¿En qué ciudades trabaja Marcyan?',
      a: 'Marcyan Studio atiende a negocios hispanos en Houston, Texas y Miami, Florida, como negocio de área de servicio (sin oficina pública). En ambas trabajamos diseño web, IA conversacional y SEO local, en español e inglés y con contexto local real. Houston es nuestra base de operaciones, con casos verificables.',
    },
    cta: {
      title: 'Cuéntanos de tu negocio, <em>te orientamos gratis</em>',
    },
    cierre: {
      proof: 'Texas Rush Remove ya posiciona en su zona de Houston con su sitio nuevo.',
      warmTitle: '¿Aún no sabes qué necesitas?',
      warmText: 'Revisa gratis si tu negocio está perdiendo clientes online.',
      warmCta: 'Hacer el diagnóstico',
      warmHref: '/es/diagnostico',
    },
  },
  en: {
    meta: {
      title: 'Cities — Houston and Miami | Bilingual studio | Marcyan',
      description:
        'Marcyan Studio works with businesses in Houston, TX and Miami, FL: web design, AI and local SEO, in true English and Spanish. Pick your city.',
      path: 'cities',
    },
    breadcrumb: [
      { name: 'Home', path: '/en/' },
      { name: 'Cities', path: '/en/cities' },
    ],
    itemList: [
      { name: 'Marcyan in Houston, TX', path: '/en/houston' },
      { name: 'Marcyan in Miami, FL', path: '/en/miami' },
    ],
    itemListName: 'Marcyan Studio Cities',
    hero: {
      eyebrow: 'Our cities',
      h1: 'Houston and <em>Miami</em>',
      tail: 'One team, in your language.',
      lead: 'Pick your city: services, phone and real projects.',
    },
    perfiles: {
      title: 'Pick your city',
      teaser: {
        Houston: 'Our base of operations, with real, verifiable case studies.',
        Miami: 'Design, SEO and AI in true English and Spanish. Founding Client spots open.',
      },
      cta: (city) => `See ${city}`,
      wide: {
        title: 'Is your business somewhere else?',
        text: "Message us and we'll tell you if we can help.",
        cta: 'Message us',
      },
    },
    matriz: {
      label: 'What we do in each city',
      title: 'Every service, city by city',
      lead: "Tap a box to see that service on the city's page. Dotted boxes aren't offered there yet.",
      tableLabel: 'Marcyan services by city',
    },
    sedes: {
      label: 'Where we are',
      title: 'A local number in each city',
      lead: "We're a service-area business with no public office: we work across greater Houston and greater Miami.",
      more: 'See pages',
      callLabel: 'Call',
    },
    donde: {
      label: 'By industry',
      title: 'Pages made for your trade',
      lead: 'If your Houston business is one of these, start here.',
    },
    proyectos: {
      label: 'Projects by city',
      title: 'Real work, with names and cities',
      lead: 'Three projects in Houston and one in Florida (Orlando), all live today.',
      more: 'Houston, TX and Florida (Orlando)',
    },
    answer: {
      q: 'What cities does Marcyan work in?',
      a: 'Marcyan Studio serves businesses in Houston, Texas and Miami, Florida, as a service-area business (no public office). In both we handle web design, conversational AI and local SEO, in true English and Spanish and with real local context. Houston is our base of operations, with verifiable case studies.',
    },
    cta: {
      title: 'Tell us about your business, <em>we point you in the right direction for free</em>',
    },
    cierre: {
      proof: 'Texas Rush Remove already ranks in its Houston area with its new site.',
      warmTitle: 'Not sure what you need yet?',
      warmText: 'Check for free whether your business is losing customers online.',
      warmCta: 'Take the checkup',
      warmHref: '/en/checkup',
    },
  },
};
