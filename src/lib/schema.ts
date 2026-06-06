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
    providerId = ORG_ID,
  } = input;

  const areaServed = areaCity
    ? { '@type': 'City', name: areaCity, ...(areaRegion ? { containedInPlace: { '@type': 'State', name: areaRegion } } : {}) }
    : [
        { '@type': 'City', name: 'Houston' },
        { '@type': 'City', name: 'Miami' },
      ];

  const priceSpec: Record<string, unknown> = {
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
