// ─────────────────────────────────────────────────────────────
// CONTENIDO · Fase 0 SEO — Hub de precios (/es/precios).
// FUENTE ÚNICA de los 6 servicios con precio: la usan el PriceGrid (display)
// y el OfferCatalog JSON-LD (schema), y también la home reusa offerItems.
//
// Decisión del dueño (2026-06-09): mantener precios "desde $X" REENMARCADOS
// como transparencia/premium-accesible. NO bajar números, NO tiers, NO ocultar.
// El diferenciador real: publicamos lo recurrente (SEO mensual + mantenimiento),
// que la competencia esconde. Precios reales: web 1500 · IA 900 · ecom 2900 ·
// SEO 600/mes · branding 750 · mantenimiento 120/mes.
//
// Honestidad (regla dura): nada falso, sin promesa de #1, sin reseñas inventadas.
// ─────────────────────────────────────────────────────────────

import type { OfferItem, FaqItem, CrumbItem } from '../lib/schema';

export interface PriceService {
  id: string;
  icon: string;
  /** Nombre visible y de schema (Service.name). */
  name: string;
  /** serviceType del schema. */
  serviceType: string;
  /** Descripción honesta y concreta (Service.description). */
  description: string;
  /** Valor numérico del "desde $", p.ej. "1500". */
  priceValue: string;
  /** true → tarifa recurrente mensual (cambia el schema y el sufijo visible). */
  monthly?: boolean;
  /** Precio mostrado, p.ej. "$1,500". */
  displayPrice: string;
  /** Sufijo visible, p.ej. "proyecto único" o "/mes". */
  displayUnit: string;
  /** Frase de valor (una línea). */
  tagline: string;
  /** Qué incluye (viñetas visibles). */
  includes: string[];
  /** Destino del CTA: landing real o #contacto. */
  href: string;
  ctaLabel: string;
  tone: 'gold' | 'teal';
}

// ── Los 6 servicios (orden por relevancia comercial) ──────────
export const priceServices: PriceService[] = [
  {
    id: 'diseno-web',
    icon: 'lucide:layout-template',
    name: 'Diseño Web Premium',
    serviceType: 'Diseño web',
    description:
      'Diseño y desarrollo de sitios web a medida, rápidos y bilingües (español e inglés), optimizados para SEO y legibles por asistentes de IA.',
    priceValue: '1500',
    displayPrice: '$1,500',
    displayUnit: 'proyecto único',
    tagline: 'Sitios a medida, rápidos y bilingües, listos para Google y la IA.',
    includes: [
      'Diseño 100% a medida, sin plantillas',
      'Versión en español e inglés',
      'Optimización SEO base',
      'Listo para móvil y para la IA',
    ],
    href: '/es/houston/diseno-web',
    ctaLabel: 'Ver diseño web',
    tone: 'gold',
  },
  {
    id: 'ia-conversacional',
    icon: 'lucide:message-circle',
    name: 'IA Conversacional',
    serviceType: 'Automatización con IA y asistentes conversacionales',
    description:
      'Asistentes conversacionales y automatización con IA para PYMEs: contestan, agendan citas y captan prospectos 24/7, configurados en español.',
    priceValue: '900',
    displayPrice: '$900',
    displayUnit: 'proyecto inicial',
    tagline: 'Asistentes que contestan, agendan y captan prospectos 24/7, en español.',
    includes: [
      'Asistente o automatización a medida',
      'Configurado en español',
      'Integración con tus herramientas',
      'Capacitación y soporte',
    ],
    href: '/es/ia-para-pymes',
    ctaLabel: 'Ver IA para tu negocio',
    tone: 'teal',
  },
  {
    id: 'ecommerce',
    icon: 'lucide:shopping-bag',
    name: 'E-Commerce & Tiendas',
    serviceType: 'Diseño de tienda en línea (e-commerce)',
    description:
      'Tiendas en línea optimizadas para conversión: catálogo, carrito, pagos seguros y experiencia bilingüe, a medida del negocio.',
    priceValue: '2900',
    displayPrice: '$2,900',
    displayUnit: 'proyecto único',
    tagline: 'Tiendas en línea optimizadas para vender, con catálogo y pagos.',
    includes: [
      'Catálogo y carrito de compras',
      'Pagos en línea seguros',
      'Optimizado para conversión',
      'Bilingüe español e inglés',
    ],
    href: '#contacto',
    ctaLabel: 'Cotizar mi tienda',
    tone: 'gold',
  },
  {
    id: 'seo-local',
    icon: 'lucide:search',
    name: 'SEO Local',
    serviceType: 'SEO local',
    description:
      'SEO local mensual para PYMEs: Perfil de Google de Negocio, consistencia NAP, contenido local bilingüe y gestión de reseñas.',
    priceValue: '600',
    monthly: true,
    displayPrice: '$600',
    displayUnit: '/mes',
    tagline: 'Aparece en Google Maps y en los asistentes de IA, mes a mes.',
    includes: [
      'Perfil de Google de Negocio',
      'NAP en directorios clave',
      '1 página local optimizada al mes',
      'Reporte mensual claro',
    ],
    href: '/es/houston/seo-local',
    ctaLabel: 'Ver SEO local',
    tone: 'gold',
  },
  {
    id: 'branding',
    icon: 'lucide:palette',
    name: 'Branding & Identidad',
    serviceType: 'Diseño de marca (branding)',
    description:
      'Identidad visual a medida: logo y variantes, paleta de color, tipografías y guía de uso básica, listos para usar.',
    priceValue: '750',
    displayPrice: '$750',
    displayUnit: 'proyecto único',
    tagline: 'Logo, colores y tipografía con criterio humano experto.',
    includes: [
      'Logo y sus variantes',
      'Paleta de color y tipografías',
      'Guía de uso básica',
      'Archivos listos para usar',
    ],
    href: '#contacto',
    ctaLabel: 'Cotizar mi marca',
    tone: 'gold',
  },
  {
    id: 'mantenimiento',
    icon: 'lucide:wrench',
    name: 'Mantenimiento Continuo',
    serviceType: 'Mantenimiento de sitios web',
    description:
      'Mantenimiento mensual del sitio: chequeos de disponibilidad, actualizaciones de seguridad, respaldos periódicos y soporte bilingüe.',
    priceValue: '120',
    monthly: true,
    displayPrice: '$120',
    displayUnit: '/mes',
    tagline: 'Tu sitio sano: respaldos, seguridad y soporte bilingüe.',
    includes: [
      'Chequeos de disponibilidad',
      'Actualizaciones de seguridad',
      'Respaldos periódicos',
      'Soporte bilingüe',
    ],
    href: '#contacto',
    ctaLabel: 'Quiero mantenimiento',
    tone: 'gold',
  },
];

// ── Mapeo a OfferItem (schema). url → landing real, o el hub si no hay página. ──
export const offerItems: OfferItem[] = priceServices.map((s) => ({
  name: s.name,
  serviceType: s.serviceType,
  description: s.description,
  priceValue: s.priceValue,
  monthly: s.monthly,
  url: s.href.startsWith('/es/') ? s.href : '/es/precios',
}));

// ── Copy de la página /es/precios ─────────────────────────────
export const preciosPage = {
  meta: {
    title: 'Precios — Diseño web, IA y SEO en Houston y Miami | Marcyan',
    description:
      'Precios públicos y claros: diseño web desde $1,500, IA desde $900, SEO local desde $600/mes. Sin letra pequeña ni costos ocultos. Propuesta gratis en 24h.',
  },
  path: '/es/precios',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Precios', path: '/es/precios' },
  ] as CrumbItem[],
  hero: {
    kicker: 'Precios públicos',
    h1: 'Precios <em>claros</em>, sin letra pequeña',
    sub: 'Publicamos hasta el precio del SEO mensual y el mantenimiento — lo que la mayoría de agencias te esconde hasta venderte una llamada. Así de transparente trabajamos.',
    primary: { label: 'Quiero mi propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver qué incluye cada servicio', href: '#precios' },
    chips: ['Precios reales publicados', 'Sin contratos forzados', 'Propuesta gratis en 24h'],
    tone: 'gold' as const,
  },
  answer: {
    q: '¿Cuánto cuesta trabajar con Marcyan?',
    a: 'Depende del servicio, y por eso lo publicamos todo: un sitio web a medida empieza en $1,500, una automatización con IA en $900 y el SEO local en $600 al mes. No escondemos el precio recurrente ni el mantenimiento. Cada proyecto recibe un alcance y un precio claros por escrito, sin compromiso.',
  },
  transparency: {
    tag: 'Por qué lo publicamos',
    title: 'La mayoría te <em>esconde</em> el precio recurrente',
    paragraphs: [
      'En este mercado es normal que te muestren un precio de arranque atractivo y te oculten lo que de verdad pesa con el tiempo: la mensualidad del SEO, el mantenimiento, las renovaciones. Te enteras cuando ya estás adentro.',
      'Nosotros hacemos lo contrario. <strong>Publicamos todas nuestras tarifas de arranque</strong>, incluido lo recurrente, para que decidas con la información completa. El precio final depende del alcance real de tu proyecto y siempre te lo damos por escrito antes de que decidas — sin sorpresas.',
    ],
    tone: 'gold' as const,
  },
  grid: {
    tag: 'Nuestros precios',
    title: 'Lo que cuesta y lo que <em>incluye</em>',
    intro: 'Cada precio es un punto de partida real, "desde $". El alcance final lo definimos juntos en una propuesta gratuita y honesta.',
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
        icon: 'lucide:message-circle',
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
        a: 'Porque esconder el precio suele ser esconder algo. Publicar nuestras tarifas de arranque — incluido el SEO mensual y el mantenimiento — te deja comparar con calma y llegar a la conversación con confianza, no a que te «vendan». Es el tipo de trato que a nosotros nos gustaría recibir.',
      },
      {
        q: '¿Hay contratos forzados o permanencia?',
        a: 'No. Los servicios recurrentes como el SEO local y el mantenimiento son mes a mes; puedes pausar o cancelar avisando con una anticipación razonable. No creemos en amarrar clientes con contratos largos: preferimos que te quedes por los resultados, no por una cláusula.',
      },
      {
        q: '¿El precio es por plantilla o a medida?',
        a: 'Todo a medida. No reciclamos plantillas: diseñamos y programamos cada proyecto desde cero alrededor de tu marca. Por eso el precio es un ancla «desde $» y no una tarifa fija — el alcance real lo definimos contigo en la propuesta.',
      },
      {
        q: '¿Cómo son los pagos?',
        a: 'En los proyectos trabajamos con un anticipo para arrancar y el resto contra entrega, o en parcialidades según el alcance. Los servicios mensuales (SEO, mantenimiento) se cobran al inicio de cada mes. Te dejamos las condiciones claras y por escrito en la propuesta, antes de empezar.',
      },
      {
        q: '¿El precio «desde $» puede subir mucho?',
        a: 'El «desde $» es el punto de partida real para un proyecto estándar. Sube si pides más páginas, más funciones (tienda, reservas, integraciones) o más idiomas. Nunca te lo cambiamos a mitad del camino: el alcance y el total acordado quedan por escrito antes de que decidas.',
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
