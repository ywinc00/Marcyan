// ─────────────────────────────────────────────────────────────
// Builders de JSON-LD para las landings de cluster (Ola 1 SEO).
// Devuelven objetos planos; cada componente los serializa con
// <script type="application/ld+json" is:inline set:html={JSON.stringify(...)} />.
//
// El Layout ya emite el @graph base (Organization + 2 ProfessionalService).
// Estos builders AÑADEN, por página: Service · FAQPage · BreadcrumbList,
// enlazando el proveedor al @id de la Organization (DRY, sin duplicar NAP).
// ─────────────────────────────────────────────────────────────

export const SITE = 'https://marcyanstudio.com';
export const ORG_ID = `${SITE}/#organization`;
// @id de las ProfessionalService por ciudad (definidas en el @graph del Layout).
export const HOUSTON_ID = `${SITE}/#houston`;
export const MIAMI_ID = `${SITE}/#miami`;

/** Une path (con prefijo de idioma, sin dominio) al sitio, normalizando barras. */
export function abs(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const clean = `/${String(path).replace(/^\/+|\/+$/g, '')}`;
  return clean === '/' ? `${SITE}/` : `${SITE}${clean}/`;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface CrumbItem {
  name: string;
  /** Ruta con prefijo de idioma SIN dominio, p.ej. "/es/houston/seo-local". */
  path: string;
}

export interface ServiceInput {
  name: string;
  serviceType: string;
  description: string;
  /** Ruta canónica de la página (con prefijo de idioma, sin dominio). */
  path: string;
  /** Ciudad de cobertura, p.ej. "Houston". Si se omite → ambas ciudades. */
  areaCity?: string;
  areaRegion?: string;
  /** Valor numérico mínimo del "desde $", p.ej. "600". */
  priceValue: string;
  priceCurrency?: string;
  /** Unidad de facturación si aplica (p.ej. "MON" para mensual). */
  unitText?: string;
  /** true → tarifa recurrente mensual: emite UnitPriceSpecification con unitCode MON (precio "por mes"). */
  monthly?: boolean;
  /** @id del proveedor (por defecto, una de las ProfessionalService del Layout). */
  providerId?: string;
  /** Producto multi-nivel: si se define, el Service emite un Offer por nivel
   *  (p.ej. AEO: diagnóstico gratis + cimientos + monitoreo). priceValue se ignora
   *  para los offers (cada nivel trae el suyo). "0" = gratis. */
  tiers?: ServiceTier[];
}

export interface ServiceTier {
  name: string;
  /** Valor numérico; "0" = gratis. */
  priceValue: string;
  /** true → tarifa recurrente mensual. */
  monthly?: boolean;
}

/** Service con provider enlazado al @id de la Organization/ProfessionalService. */
export function service(input: ServiceInput) {
  const {
    name,
    serviceType,
    description,
    path,
    areaCity,
    areaRegion,
    priceValue,
    priceCurrency = 'USD',
    unitText,
    monthly = false,
    providerId = ORG_ID,
    tiers,
  } = input;

  const areaServed = areaCity
    ? { '@type': 'City', name: areaCity, ...(areaRegion ? { containedInPlace: { '@type': 'State', name: areaRegion } } : {}) }
    : [
        { '@type': 'City', name: 'Houston' },
        { '@type': 'City', name: 'Miami' },
      ];

  const url = abs(path);
  // Un Offer (con su priceSpecification: mensual = UnitPriceSpecification MON).
  const mkOffer = (value: string, isMonthly?: boolean, tierName?: string) => ({
    '@type': 'Offer',
    ...(tierName ? { name: tierName } : {}),
    price: value,
    priceCurrency,
    priceSpecification: isMonthly
      ? {
          '@type': 'UnitPriceSpecification',
          price: value,
          priceCurrency,
          // "$X por mes" canónico (1 mes = unitCode MON), espejo de offerCatalog().
          referenceQuantity: { '@type': 'QuantitativeValue', value: '1', unitCode: 'MON' },
        }
      : {
          '@type': 'PriceSpecification',
          price: value,
          priceCurrency,
          ...(unitText ? { unitText } : {}),
        },
    availability: 'https://schema.org/InStock',
    url,
  });

  // Multi-nivel (p.ej. AEO) → un Offer por nivel; si no, un único Offer.
  const offers =
    tiers && tiers.length
      ? tiers.map((t) => mkOffer(t.priceValue, t.monthly, t.name))
      : mkOffer(priceValue, monthly);

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    serviceType,
    description,
    url,
    provider: { '@id': providerId },
    areaServed,
    offers,
  };
}

/** FAQPage — el texto debe coincidir VERBATIM con el visible (regla AEO/Google). */
export function faqPage(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
}

/** BreadcrumbList — el último item es la página actual. */
export function breadcrumbList(items: CrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

// ─────────────────────────────────────────────────────────────
// ItemList — lista ordenada de enlaces (p.ej. los servicios de un hub de ciudad).
// Útil en páginas-hub (/es/houston) para declarar a buscadores/IA el conjunto de
// servicios que se ofrecen en esa ciudad, cada uno apuntando a su landing.
// ─────────────────────────────────────────────────────────────
export interface ListLink {
  name: string;
  /** Ruta con prefijo de idioma SIN dominio, p.ej. "/es/houston/ia-conversacional". */
  path: string;
}
export function itemList(items: ListLink[], opts?: { name?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    ...(opts?.name ? { name: opts.name } : {}),
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: abs(it.path),
    })),
  };
}

// ─────────────────────────────────────────────────────────────
// OfferCatalog — lista de servicios CON precio (Offer/priceSpecification).
// Munición AEO: en el mercado solo Once Once publica precio en el schema, así
// que la IA puede citar la tarifa de Marcyan. Lo usan /es/precios (los 6
// servicios) y la home (mismas anclas "desde $"). El provider enlaza al @id de
// la Organization del @graph del Layout (DRY, sin duplicar NAP).
// ─────────────────────────────────────────────────────────────
export interface OfferItem {
  name: string;
  serviceType: string;
  description: string;
  /** Valor numérico del "desde $", p.ej. "1500". */
  priceValue: string;
  priceCurrency?: string;
  /** Si el precio es recurrente mensual → precio por mes (UnitPriceSpecification, unitCode MON). */
  monthly?: boolean;
  /** Ruta canónica del servicio (landing si existe, o ancla en /es/precios). */
  url?: string;
}

/** OfferCatalog con un Offer por servicio (cada uno con su priceSpecification). */
export function offerCatalog(items: OfferItem[], opts?: { name?: string; url?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: opts?.name ?? 'Servicios y precios — Marcyan Studio',
    ...(opts?.url ? { url: abs(opts.url) } : {}),
    provider: { '@id': ORG_ID },
    itemListElement: items.map((it) => {
      const currency = it.priceCurrency ?? 'USD';
      const priceSpec = it.monthly
        ? {
            '@type': 'UnitPriceSpecification',
            price: it.priceValue,
            priceCurrency: currency,
            // "$X por mes" expresado de forma canónica (1 mes = unitCode MON).
            referenceQuantity: { '@type': 'QuantitativeValue', value: '1', unitCode: 'MON' },
          }
        : {
            '@type': 'PriceSpecification',
            price: it.priceValue,
            priceCurrency: currency,
          };
      return {
        '@type': 'Offer',
        ...(it.url ? { url: abs(it.url) } : {}),
        priceCurrency: currency,
        price: it.priceValue,
        priceSpecification: priceSpec,
        availability: 'https://schema.org/InStock',
        itemOffered: {
          '@type': 'Service',
          name: it.name,
          serviceType: it.serviceType,
          description: it.description,
          provider: { '@id': ORG_ID },
        },
      };
    }),
  };
}

// ─────────────────────────────────────────────────────────────
// BLOG / Article — BlogPosting por pieza + Blog (listado) para /es/blog.
// Autor y editor = la Organization del @graph del Layout (NO inventamos un
// Person del fundador hasta tener el dato real). Co-localizado, server-rendered.
// ─────────────────────────────────────────────────────────────

/** Une un path/ruta de imagen al sitio SIN barra final (las URLs de imagen no la llevan). */
function absAsset(src?: string): string | undefined {
  if (!src) return undefined;
  if (/^https?:\/\//.test(src)) return src;
  return `${SITE}/${String(src).replace(/^\/+/, '')}`;
}

export interface ArticleInput {
  headline: string;
  description: string;
  /** Ruta canónica de la pieza (con prefijo de idioma, sin dominio), p.ej. "/es/blog/slug". */
  path: string;
  /** Fecha de publicación en ISO (YYYY-MM-DD o completa). */
  datePublished: string;
  /** Última actualización en ISO (si difiere de la publicación). */
  dateModified?: string;
  inLanguage?: string;
  /** Imagen social (path interno o URL absoluta). */
  image?: string;
  /** Sección/categoría (p.ej. la primera etiqueta). */
  section?: string;
  /** Etiquetas → keywords. */
  keywords?: string[];
}

/** BlogPosting de una pieza; author/publisher enlazan al @id de la Organization (DRY). */
export function article(input: ArticleInput) {
  const {
    headline,
    description,
    path,
    datePublished,
    dateModified,
    inLanguage = 'es',
    image,
    section,
    keywords,
  } = input;
  const url = abs(path);
  const img = absAsset(image);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline,
    description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished,
    dateModified: dateModified ?? datePublished,
    inLanguage,
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    ...(img ? { image: img } : {}),
    ...(section ? { articleSection: section } : {}),
    ...(keywords && keywords.length ? { keywords: keywords.join(', ') } : {}),
  };
}

export interface BlogPostRef {
  headline: string;
  /** Ruta de la pieza (con prefijo de idioma, sin dominio). */
  path: string;
  description?: string;
  datePublished: string;
}

/** Blog (listado) para /es/blog — declara cada pieza como BlogPosting resumido. */
export function blog(
  posts: BlogPostRef[],
  opts: { name: string; description: string; path: string; inLanguage?: string },
) {
  const url = abs(opts.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${url}#blog`,
    name: opts.name,
    description: opts.description,
    url,
    inLanguage: opts.inLanguage ?? 'es',
    publisher: { '@id': ORG_ID },
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.headline,
      url: abs(p.path),
      ...(p.description ? { description: p.description } : {}),
      datePublished: p.datePublished,
      author: { '@id': ORG_ID },
      publisher: { '@id': ORG_ID },
    })),
  };
}

// ─────────────────────────────────────────────────────────────
// SCAFFOLDING (NO EMITIR aún) — AggregateRating/Review.
// 0/10 competidores publican rating en schema → estrellas en SERP que nadie
// tiene. REGLA DURA: prohibido inventar reseñas. Este builder queda listo para
// cuando existan reseñas REALES con consentimiento; NO se llama en ninguna
// página hasta entonces (no se emite ningún JSON-LD de rating).
// ─────────────────────────────────────────────────────────────
export interface RatingInput {
  ratingValue: string; // p.ej. "4.9" — SOLO con reseñas reales verificables
  reviewCount: string; // nº real de reseñas
  bestRating?: string;
}
export function aggregateRating(input: RatingInput) {
  return {
    '@type': 'AggregateRating',
    ratingValue: input.ratingValue,
    reviewCount: input.reviewCount,
    bestRating: input.bestRating ?? '5',
  };
}

// ─────────────────────────────────────────────────────────────
// CollectionPage / AboutPage — para /es/portafolio y /es/sobre-nosotros.
// Complementan el @graph base del Layout (Organization + 2 ProfessionalService).
// Honestidad: cada CreativeWork es un proyecto REAL (captura real); NO se emite
// AggregateRating/Review aquí hasta tener reseñas reales con consentimiento.
// ─────────────────────────────────────────────────────────────
export interface WorkItem {
  name: string;
  description: string;
  /** Categoría/rubro del proyecto (p.ej. "Junk Removal · Houston, TX"). */
  about?: string;
  /** Ruta interna o URL del proyecto (opcional; se omite por privacidad del cliente). */
  url?: string;
  /** Imagen de la captura (path interno o URL absoluta). */
  image?: string;
}

/** CollectionPage con un ItemList de CreativeWork (los proyectos del portafolio). */
export function collectionPage(input: {
  name: string;
  description: string;
  path: string;
  inLanguage?: string;
  items: WorkItem[];
}) {
  const url = abs(input.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    description: input.description,
    url,
    inLanguage: input.inLanguage ?? 'es',
    isPartOf: { '@id': ORG_ID },
    about: { '@id': ORG_ID },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: input.items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'CreativeWork',
          name: it.name,
          ...(it.description ? { description: it.description } : {}),
          ...(it.about ? { about: it.about } : {}),
          ...(it.url ? { url: abs(it.url) } : {}),
          ...(absAsset(it.image) ? { image: absAsset(it.image) } : {}),
          creator: { '@id': ORG_ID },
        },
      })),
    },
  };
}

/** AboutPage que apunta a la Organization del @graph (E-E-A-T). */
export function aboutPage(input: {
  name: string;
  description: string;
  path: string;
  inLanguage?: string;
}) {
  const url = abs(input.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: input.name,
    description: input.description,
    url,
    inLanguage: input.inLanguage ?? 'es',
    isPartOf: { '@id': ORG_ID },
    about: { '@id': ORG_ID },
    mainEntity: { '@id': ORG_ID },
  };
}
