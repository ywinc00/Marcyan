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
  } = input;

  const areaServed = areaCity
    ? { '@type': 'City', name: areaCity, ...(areaRegion ? { containedInPlace: { '@type': 'State', name: areaRegion } } : {}) }
    : [
        { '@type': 'City', name: 'Houston' },
        { '@type': 'City', name: 'Miami' },
      ];

  const priceSpec: Record<string, unknown> = monthly
    ? {
        '@type': 'UnitPriceSpecification',
        price: priceValue,
        priceCurrency,
        // "$X por mes" canónico (1 mes = unitCode MON), espejo de offerCatalog().
        referenceQuantity: { '@type': 'QuantitativeValue', value: '1', unitCode: 'MON' },
      }
    : {
        '@type': 'PriceSpecification',
        price: priceValue,
        priceCurrency,
        ...(unitText ? { unitText } : {}),
      };

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    serviceType,
    description,
    url: abs(path),
    provider: { '@id': providerId },
    areaServed,
    offers: {
      '@type': 'Offer',
      price: priceValue,
      priceCurrency,
      priceSpecification: priceSpec,
      availability: 'https://schema.org/InStock',
      url: abs(path),
    },
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
