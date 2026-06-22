// ─────────────────────────────────────────────────────────────
// CATÁLOGO DE PRODUCTOS · fuente única de precios del sitio.
// 7 productos principales, cada uno con NIVELES (ancla baja → completo).
// La usan: PriceGrid (/es/precios), /es/servicios (catálogo detallado),
// el OfferCatalog JSON-LD (schema) y la home (offerItems).
//
// ⚠️ PARIDAD CON EL CHATBOT — los números canónicos viven en PRICE_ANCHORS.
//   `lib/chat-kb.mjs` debe espejar PRICE_ANCHORS en su `PRICES`.
//   La guarda `npm run check:kb` (scripts/verify-chat-kb.mjs) falla si hay drift.
//   Si cambias un precio aquí, cámbialo también en chat-kb.mjs.
//
// Decisiones LOCKED (2026-06-13, marcyan_nav_catalog_plan):
//   - Se muestra primero el ANCLA MÁS BAJA por categoría (no asusta); el ancla
//     baja es un producto REAL más pequeño, no un descuento del flagship.
//   - Los 6 precios "completos" históricos se mantienen como nivel superior.
//   - SEO para IA (AEO) = producto nuevo, con diagnóstico GRATIS (imán de leads).
//
// Honestidad (regla dura): nada falso, sin promesa de #1, sin reseñas inventadas.
// ─────────────────────────────────────────────────────────────

import type { OfferItem, FaqItem, CrumbItem } from '../lib/schema';

// ── Anclas de precio canónicas (USD, numéricas). FUENTE DE VERDAD. ──
// Espejadas en lib/chat-kb.mjs → PRICES. Guardadas por npm run check:kb.
// (El diagnóstico AEO es GRATIS → no lleva número aquí; se modela como tier free.)
export const PRICE_ANCHORS = {
  web: 1500,
  webLanding: 400,
  webRedesign: 500,
  ia: 900,
  iaBasic: 500,
  aeoFoundations: 500,
  aeoMonitoring: 200,
  ecommerce: 2900,
  ecommerceEssential: 900,
  seoLocal: 600,
  seoInitial: 300,
  branding: 750,
  brandingLogo: 150,
  maintenance: 120,
} as const;

/** "$1,500" desde 1500. */
const usd = (n: number): string => '$' + n.toLocaleString('en-US');

// ── Tipos del catálogo ────────────────────────────────────────
export interface CatalogTier {
  /** Clave (coincide con PRICE_ANCHORS, salvo el diagnóstico free). */
  key: string;
  name: string;
  /** Qué es y para quién, una línea. */
  blurb: string;
  /** Valor numérico; null = gratis. */
  value: number | null;
  /** true → tarifa recurrente mensual. */
  monthly?: boolean;
  /** Precio mostrado, p.ej. "$400", "$600/mes", "Gratis". */
  display: string;
  /** El nivel de entrada que se muestra primero por categoría. */
  anchor?: boolean;
  /** Destino del CTA del nivel (landing real o #contacto). */
  href: string;
}

export interface CatalogProduct {
  id: string;
  icon: string;
  /** Nombre visible y de schema. */
  name: string;
  serviceType: string;
  /** Descripción honesta (schema + /es/servicios). */
  description: string;
  /** Frase de valor corta (tarjetas). */
  tagline: string;
  /** Unidad mostrada junto al ancla baja, p.ej. "proyecto", "/mes", "diagnóstico". */
  anchorUnit: string;
  href: string;
  ctaLabel: string;
  tone: 'gold' | 'teal';
  tiers: CatalogTier[];
  /** Si se define, sustituye la escalera de niveles en la tarjeta de /es/precios. */
  cardBullets?: string[];
}

// Helper de display por nivel.
const tierDisplay = (value: number | null, monthly?: boolean): string =>
  value === null ? 'Gratis' : monthly ? `${usd(value)}/mes` : usd(value);

// ── El catálogo (7 productos · ancla baja → completo) ──────────
export const catalog: CatalogProduct[] = [
  {
    id: 'diseno-web',
    icon: 'lucide:layout-template',
    name: 'Diseño Web',
    serviceType: 'Diseño web',
    description:
      'Sitios a medida, rápidos y bilingües (español e inglés), con SEO base y legibles por asistentes de IA. Desde una landing de una página hasta un sitio completo.',
    tagline: 'Sitios a medida, rápidos y bilingües, listos para Google y la IA.',
    anchorUnit: 'proyecto',
    href: '/es/houston/diseno-web',
    ctaLabel: 'Ver diseño web',
    tone: 'gold',
    tiers: [
      { key: 'webLanding', name: 'Landing Page', value: PRICE_ANCHORS.webLanding, display: tierDisplay(PRICE_ANCHORS.webLanding), anchor: true,
        blurb: 'Una sola página enfocada en convertir: ideal para una promoción, un servicio o validar tu negocio.', href: '/es/houston/diseno-web' },
      { key: 'webRedesign', name: 'Rediseño de sitio', value: PRICE_ANCHORS.webRedesign, display: tierDisplay(PRICE_ANCHORS.webRedesign),
        blurb: 'Renovamos tu sitio actual (diseño, velocidad y textos) sin empezar de cero.', href: '/es/houston/diseno-web' },
      { key: 'web', name: 'Sitio a medida completo', value: PRICE_ANCHORS.web, display: tierDisplay(PRICE_ANCHORS.web),
        blurb: 'Varias páginas a medida y bilingües, con SEO base y listo para la IA.', href: '/es/houston/diseno-web' },
    ],
  },
  {
    id: 'ia-conversacional',
    icon: 'marcyan-ai',
    name: 'IA Conversacional',
    serviceType: 'Automatización con IA y asistentes conversacionales',
    description:
      'Asistentes con IA que atienden a TUS clientes: contestan, agendan citas y captan prospectos 24/7, configurados en español e integrados con tus herramientas.',
    tagline: 'Asistentes que contestan, agendan y captan prospectos 24/7, en español.',
    anchorUnit: 'proyecto',
    href: '/es/ia-para-pymes',
    ctaLabel: 'Ver IA para tu negocio',
    tone: 'teal',
    tiers: [
      { key: 'iaBasic', name: 'Asistente básico', value: PRICE_ANCHORS.iaBasic, display: tierDisplay(PRICE_ANCHORS.iaBasic), anchor: true,
        blurb: 'Un asistente con un flujo principal (contestar y captar prospectos), configurado en español.', href: '/es/ia-para-pymes' },
      { key: 'ia', name: 'Asistente completo', value: PRICE_ANCHORS.ia, display: tierDisplay(PRICE_ANCHORS.ia),
        blurb: 'Done-for-you: lo instalamos, lo entrenamos con tu negocio, lo integramos y lo mantenemos.', href: '/es/ia-para-pymes' },
    ],
  },
  {
    id: 'seo-ia',
    icon: 'marcyan-ai',
    name: 'SEO para IA (Visibilidad en IA)',
    serviceType: 'Optimización para motores de respuesta (AEO)',
    description:
      'Que ChatGPT, Gemini y Meta AI te recomienden a TI cuando alguien pregunta por tu servicio. Distinto de la IA Conversacional (que atiende a tus clientes): aquí el objetivo es que la IA te encuentre y te cite.',
    tagline: 'Que la IA te recomiende cuando preguntan por tu servicio.',
    anchorUnit: 'diagnóstico',
    href: '/es/houston/seo-para-ia',
    ctaLabel: 'Pedir diagnóstico gratis',
    tone: 'teal',
    tiers: [
      { key: 'aeoDiagnostic', name: 'Diagnóstico de Visibilidad en IA', value: null, display: tierDisplay(null), anchor: true,
        blurb: 'Revisamos si ChatGPT, Gemini y Meta AI pueden encontrarte y recomendarte. Sin costo ni compromiso.', href: '/es/houston/seo-para-ia' },
      { key: 'aeoFoundations', name: 'Cimientos AEO', value: PRICE_ANCHORS.aeoFoundations, display: tierDisplay(PRICE_ANCHORS.aeoFoundations),
        blurb: 'Te preparamos para la IA: Bing Places, schema, FAQ y llms.txt para que los asistentes te lean y te citen.', href: '/es/houston/seo-para-ia' },
      { key: 'aeoMonitoring', name: 'Monitoreo en IA', value: PRICE_ANCHORS.aeoMonitoring, monthly: true, display: tierDisplay(PRICE_ANCHORS.aeoMonitoring, true),
        blurb: 'Seguimiento mensual de cómo te ven y te mencionan los asistentes de IA, con ajustes continuos.', href: '/es/houston/seo-para-ia' },
    ],
  },
  {
    id: 'ecommerce',
    icon: 'lucide:shopping-bag',
    name: 'E-Commerce & Tiendas',
    serviceType: 'Diseño de tienda en línea (e-commerce)',
    description:
      'Tiendas en línea optimizadas para vender: catálogo, carrito y pagos seguros, en experiencia bilingüe. Desde una tienda esencial hasta una a medida.',
    tagline: 'Tiendas en línea optimizadas para vender, con catálogo y pagos.',
    anchorUnit: 'proyecto',
    href: '/es/houston/ecommerce',
    ctaLabel: 'Ver tienda en línea',
    tone: 'gold',
    tiers: [
      { key: 'ecommerceEssential', name: 'Tienda Esencial', value: PRICE_ANCHORS.ecommerceEssential, display: tierDisplay(PRICE_ANCHORS.ecommerceEssential), anchor: true,
        blurb: 'Catálogo simple con carrito y pagos, para empezar a vender en línea sin complicarte.', href: '/es/houston/ecommerce' },
      { key: 'ecommerce', name: 'Tienda a medida', value: PRICE_ANCHORS.ecommerce, display: tierDisplay(PRICE_ANCHORS.ecommerce),
        blurb: 'Tienda completa a medida, optimizada para conversión y bilingüe.', href: '/es/houston/ecommerce' },
    ],
  },
  {
    id: 'seo-local',
    icon: 'lucide:search',
    name: 'SEO Local',
    serviceType: 'SEO local',
    description:
      'Aparece en Google Maps y en la búsqueda local: Perfil de Google de Negocio, consistencia NAP, contenido local bilingüe y gestión de reseñas. Puntual o mes a mes.',
    tagline: 'Aparece en Google Maps y en la búsqueda local de tu zona.',
    anchorUnit: 'pago único',
    href: '/es/houston/seo-local',
    ctaLabel: 'Ver SEO local',
    tone: 'gold',
    tiers: [
      { key: 'seoInitial', name: 'Optimización inicial', value: PRICE_ANCHORS.seoInitial, display: tierDisplay(PRICE_ANCHORS.seoInitial), anchor: true,
        blurb: 'Puesta a punto de tu Perfil de Google y tu presencia local. Pago único, sin permanencia.', href: '/es/houston/seo-local' },
      { key: 'seoLocal', name: 'SEO Local continuo', value: PRICE_ANCHORS.seoLocal, monthly: true, display: tierDisplay(PRICE_ANCHORS.seoLocal, true),
        blurb: 'Trabajo mensual: ficha, NAP, contenido local y reseñas, mes a mes y sin contratos forzados.', href: '/es/houston/seo-local' },
    ],
  },
  {
    id: 'branding',
    icon: 'lucide:palette',
    name: 'Branding & Identidad',
    serviceType: 'Diseño de marca (branding)',
    description:
      'Identidad visual a medida con criterio humano: desde solo el logo hasta un sistema de marca completo (paleta, tipografías y guía de uso).',
    tagline: 'Logo, colores y tipografía con criterio humano experto.',
    anchorUnit: 'proyecto',
    href: '/es/houston/branding',
    ctaLabel: 'Ver branding',
    tone: 'gold',
    tiers: [
      { key: 'brandingLogo', name: 'Diseño de Logo', value: PRICE_ANCHORS.brandingLogo, display: tierDisplay(PRICE_ANCHORS.brandingLogo), anchor: true,
        blurb: 'Solo el logo y sus variantes, con criterio humano. El arranque más accesible de tu marca.', href: '/es/houston/branding' },
      { key: 'branding', name: 'Branding completo', value: PRICE_ANCHORS.branding, display: tierDisplay(PRICE_ANCHORS.branding),
        blurb: 'Logo, paleta, tipografías y guía de uso: identidad lista para usar.', href: '/es/houston/branding' },
    ],
  },
  {
    id: 'mantenimiento',
    icon: 'lucide:wrench',
    name: 'Mantenimiento Continuo',
    serviceType: 'Mantenimiento de sitios web',
    description:
      'Mantenimiento mensual del sitio: chequeos de disponibilidad, actualizaciones de seguridad, respaldos periódicos y soporte bilingüe.',
    tagline: 'Tu sitio sano: respaldos, seguridad y soporte bilingüe.',
    anchorUnit: '/mes',
    href: '#contacto',
    ctaLabel: 'Quiero mantenimiento',
    tone: 'gold',
    cardBullets: [
      'Chequeos de disponibilidad y actualizaciones de seguridad',
      'Respaldos periódicos',
      'Soporte bilingüe, mes a mes',
    ],
    tiers: [
      { key: 'maintenance', name: 'Mantenimiento mensual', value: PRICE_ANCHORS.maintenance, monthly: true, display: tierDisplay(PRICE_ANCHORS.maintenance, true), anchor: true,
        blurb: 'Chequeos de disponibilidad, seguridad, respaldos y soporte bilingüe, mes a mes.', href: '#contacto' },
    ],
  },
];

// ── PriceService: tarjeta de /es/precios (lidera con el ancla baja) ──
// Se conserva por compatibilidad (PriceGrid). Derivada del catálogo.
export interface PriceService {
  id: string;
  icon: string;
  name: string;
  serviceType: string;
  description: string;
  priceValue: string;
  monthly?: boolean;
  /** true → el ancla es gratis (la tarjeta no muestra "desde"). */
  free?: boolean;
  displayPrice: string;
  displayUnit: string;
  tagline: string;
  includes: string[];
  href: string;
  ctaLabel: string;
  tone: 'gold' | 'teal';
}

export const priceServices: PriceService[] = catalog.map((p) => {
  const anchor = p.tiers.find((t) => t.anchor) ?? p.tiers[0];
  return {
    id: p.id,
    icon: p.icon,
    name: p.name,
    serviceType: p.serviceType,
    description: p.description,
    priceValue: anchor.value === null ? '0' : String(anchor.value),
    monthly: anchor.monthly,
    free: anchor.value === null,
    displayPrice: anchor.value === null ? 'Gratis' : usd(anchor.value),
    displayUnit: p.anchorUnit,
    tagline: p.tagline,
    includes: p.cardBullets ?? p.tiers.map((t) => `${t.name} — ${t.display}`),
    href: p.href,
    ctaLabel: p.ctaLabel,
    tone: p.tone,
  };
});

// ── Mapeo a OfferItem (schema) — TODOS los niveles (munición AEO). ──
// El diagnóstico gratis se emite como Offer price "0" (señal AEO de "gratis").
// url sin fragmento (#) y solo si es una página real /es/, o el hub de precios.
export const offerItems: OfferItem[] = catalog.flatMap((p) =>
  p.tiers.map((t) => {
    const pageHref = (t.href || p.href).split('#')[0];
    return {
      name: `${p.name} — ${t.name}`,
      serviceType: p.serviceType,
      description: t.blurb,
      priceValue: t.value === null ? '0' : String(t.value),
      monthly: t.monthly,
      url: pageHref.startsWith('/es/') ? pageHref : '/es/precios',
    };
  }),
);

// ── Copy de la página /es/precios ─────────────────────────────
export const preciosPage = {
  meta: {
    title: 'Precios — Diseño web, IA y SEO en Houston y Miami | Marcyan',
    description:
      'Precios públicos y claros: diseño web desde $400, IA desde $500, SEO local desde $300 y un diagnóstico de visibilidad en IA gratis. Sin letra pequeña ni costos ocultos.',
  },
  path: '/es/precios',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Precios', path: '/es/precios' },
  ] as CrumbItem[],
  hero: {
    kicker: 'Precios públicos',
    h1: 'Precios <em>claros</em>, sin letra pequeña',
    sub: 'Publicamos todo: desde una landing en $400 hasta el SEO mensual y el mantenimiento, lo que la mayoría de agencias te esconde hasta venderte una llamada. Así de transparente trabajamos.',
    primary: { label: 'Quiero mi propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver qué incluye cada servicio', href: '#precios' },
    chips: ['Desde $400 · diagnóstico IA gratis', 'Sin contratos forzados', 'Propuesta gratis en 24h'],
    tone: 'gold' as const,
  },
  answer: {
    q: '¿Cuánto cuesta trabajar con Marcyan?',
    a: 'Depende del servicio, y por eso lo publicamos todo: una página web va desde $400 (un sitio a medida completo desde $1,500), un asistente con IA desde $500, el SEO local desde $300 y un logo desde $150. Hasta el precio recurrente (SEO mensual y mantenimiento) está publicado, y el diagnóstico de visibilidad en IA es gratis. Cada proyecto recibe un alcance y un precio claros por escrito, sin compromiso.',
  },
  transparency: {
    tag: 'Por qué lo publicamos',
    title: 'La mayoría te <em>esconde</em> el precio recurrente',
    paragraphs: [
      'En este mercado es normal que te muestren un precio de arranque atractivo y te oculten lo que de verdad pesa con el tiempo: la mensualidad del SEO, el mantenimiento, las renovaciones. Te enteras cuando ya estás adentro.',
      'Nosotros hacemos lo contrario. <strong>Publicamos todas nuestras tarifas de arranque</strong>, incluido lo recurrente, para que decidas con la información completa. Cada servicio empieza con una opción accesible y crece según lo que necesites. El precio final depende del alcance real de tu proyecto y siempre te lo damos por escrito antes de que decidas. Sin sorpresas.',
    ],
    tone: 'gold' as const,
  },
  grid: {
    tag: 'Nuestros precios',
    title: 'Lo que cuesta y lo que <em>incluye</em>',
    intro: 'Cada precio es un punto de partida real, "desde $". Mostramos primero la opción más accesible de cada servicio; el alcance final lo definimos juntos en una propuesta gratuita y honesta.',
  },
  related: {
    tag: 'Guías de precio',
    title: 'Respuestas concretas',
    links: [
      {
        label: '¿Cuánto cuesta una página web en Houston?',
        href: '/es/precios/cuanto-cuesta-una-pagina-web-houston',
        desc: 'El precio real de un sitio, con qué incluye y de qué depende.',
        icon: 'lucide:layout-template',
      },
      {
        label: '¿Cuánto cuesta un chatbot?',
        href: '/es/precios/cuanto-cuesta-un-chatbot',
        desc: 'Qué incluye un asistente con IA y por qué no es solo una suscripción.',
        icon: 'marcyan-ai',
      },
      {
        label: '¿Cuánto cuesta el SEO local en Houston?',
        href: '/es/precios/cuanto-cuesta-seo-local-houston',
        desc: 'La tarifa mensual publicada, sin contratos largos forzados.',
        icon: 'lucide:search',
      },
    ],
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Sobre precios, <em>sin rodeos</em>',
    items: [
      {
        q: '¿Por qué muestran los precios si casi nadie lo hace?',
        a: 'Porque esconder el precio suele ser esconder algo. Publicar nuestras tarifas de arranque, incluido el SEO mensual y el mantenimiento, te deja comparar con calma y llegar a la conversación con confianza, no a que te «vendan». Es el tipo de trato que a nosotros nos gustaría recibir.',
      },
      {
        q: '¿El precio más bajo es el mismo servicio que el completo?',
        a: 'No: es un producto real más pequeño. Una landing de una página, un rediseño o solo el logo cuestan menos porque son menos trabajo que un sitio completo o una marca entera, no porque sean una versión recortada de mala calidad. Empiezas por donde tiene sentido para tu negocio y creces cuando lo necesites.',
      },
      {
        q: '¿De verdad el diagnóstico de visibilidad en IA es gratis?',
        a: 'Sí, sin costo ni compromiso. Revisamos si ChatGPT, Gemini y Meta AI pueden encontrarte y recomendarte, y te decimos con honestidad cómo estás. Si quieres que trabajemos los cimientos o el monitoreo después, esos sí tienen precio publicado; el diagnóstico no.',
      },
      {
        q: '¿Hay contratos forzados o permanencia?',
        a: 'No. Los servicios recurrentes como el SEO local y el mantenimiento son mes a mes; puedes pausar o cancelar avisando con una anticipación razonable. No creemos en amarrar clientes con contratos largos: preferimos que te quedes por los resultados, no por una cláusula.',
      },
      {
        q: '¿El precio «desde $» puede subir mucho?',
        a: 'El «desde $» es el punto de partida real para ese producto. Sube si pides más páginas, más funciones (tienda, reservas, integraciones) o más idiomas. Nunca te lo cambiamos a mitad del camino: el alcance y el total acordado quedan por escrito antes de que decidas.',
      },
      {
        q: '¿La propuesta tiene costo?',
        a: 'No. Cuéntanos tu proyecto y en menos de 24 horas recibes una propuesta personalizada con alcance y precio, sin costo ni compromiso. Si decides no avanzar, no pasa nada.',
      },
    ] as FaqItem[],
  },
  cta: {
    title: 'Pide tu precio <em>exacto</em>, gratis',
    sub: 'Cuéntanos tu proyecto y recibe una propuesta con alcance y precio claros en menos de 24 horas, sin compromiso.',
    primary: { label: 'Solicitar propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
    tone: 'gold' as const,
  },
};
