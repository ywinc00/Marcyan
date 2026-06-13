// ─────────────────────────────────────────────────────────────
// CONTENIDO · Landing /es/houston/seo-para-ia — "SEO para IA / Visibilidad en IA" (AEO).
// El mayor wedge del negocio: que ChatGPT/Perplexity/Google te RECOMIENDEN a TI.
// Distinto de IA Conversacional (que atiende a TUS clientes). Página bespoke que
// reusa los componentes del DS (patrón /es/servicios) + PriceGrid para los 3
// niveles (Diagnóstico GRATIS · Cimientos $500 · Monitoreo $200/mes).
//
// Precios: viven en pricing.ts (PRICE_ANCHORS) y KB del chatbot — aquí solo se
// MUESTRAN (no son fuente). Honestidad dura: sin "#1"/garantías; AEO es volátil
// (se dice); stat con fuente (SOCi 2026). Keyword validada (jun 2026): el espacio
// "aparecer en ChatGPT / SEO para IA" en español lo ocupan blogs genéricos de
// España (intención GUÍA) → esta landing local-transaccional está diferenciada.
// ─────────────────────────────────────────────────────────────

import { HOUSTON_ID, type CrumbItem, type FaqItem, type ServiceInput } from '../lib/schema';
import type { RelatedLink } from './clusters';
import type { PriceService } from './pricing';

const LANDING = '/es/houston/seo-para-ia';

// ── Los 3 niveles del producto (tarjetas de PriceGrid; el diagnóstico es gratis) ──
export const aeoTiers: PriceService[] = [
  {
    id: 'aeo-diagnostico',
    icon: 'lucide:radar',
    name: 'Diagnóstico de Visibilidad en IA',
    serviceType: 'Optimización para motores de respuesta (AEO)',
    description:
      'Revisamos si ChatGPT, Perplexity y Google pueden encontrarte y recomendarte. Sin costo ni compromiso.',
    priceValue: '0',
    free: true,
    displayPrice: 'Gratis',
    displayUnit: 'sin compromiso',
    tagline: 'Revisamos si la IA puede encontrarte y recomendarte hoy.',
    includes: [
      'Revisión en ChatGPT, Perplexity y Google',
      'Estado de tu Bing Places y tu schema',
      'Qué te falta para que la IA te cite',
      'Sin costo ni compromiso',
    ],
    href: '#contacto',
    ctaLabel: 'Pedir diagnóstico gratis',
    tone: 'teal',
  },
  {
    id: 'aeo-cimientos',
    icon: 'lucide:layers',
    name: 'Cimientos AEO',
    serviceType: 'Optimización para motores de respuesta (AEO)',
    description:
      'Te dejamos listo para que los asistentes de IA te lean y te citen: Bing Places, schema, FAQ y llms.txt.',
    priceValue: '500',
    displayPrice: '$500',
    displayUnit: 'pago único',
    tagline: 'Te dejamos listo para que la IA te lea y te cite.',
    includes: [
      'Alta y optimización en Bing Places',
      'Datos estructurados (schema) en tu sitio',
      'Preguntas frecuentes en español e inglés',
      'NAP consistente y un archivo que guía a la IA (llms.txt)',
    ],
    href: '#contacto',
    ctaLabel: 'Quiero los cimientos',
    tone: 'teal',
  },
  {
    id: 'aeo-monitoreo',
    icon: 'lucide:line-chart',
    name: 'Monitoreo en IA',
    serviceType: 'Optimización para motores de respuesta (AEO)',
    description:
      'Seguimiento mensual de cómo te ven y te mencionan los asistentes de IA, con ajustes continuos.',
    priceValue: '200',
    monthly: true,
    displayPrice: '$200',
    displayUnit: '/mes',
    tagline: 'Seguimos cómo te ven y te mencionan los asistentes.',
    includes: [
      'Seguimiento mensual en ChatGPT y Perplexity',
      'Reporte claro de menciones y citas',
      'Ajustes continuos según resultados',
      'Mes a mes, sin permanencia',
    ],
    href: '#contacto',
    ctaLabel: 'Quiero monitoreo',
    tone: 'teal',
  },
];

export const seoIaPage = {
  meta: {
    title: 'SEO para IA en Houston — Que ChatGPT te recomiende | Marcyan',
    description:
      'Que ChatGPT, Perplexity y Google te recomienden a TI cuando preguntan por tu servicio. Diagnóstico de visibilidad en IA gratis; cimientos desde $500. Agencia hispana en Houston.',
  },
  path: LANDING,
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
    { name: 'SEO para IA', path: LANDING },
  ] as CrumbItem[],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'SEO para IA · Visibilidad en IA',
    h1: 'Que ChatGPT te <em>recomiende</em> a ti',
    sub: 'Tus clientes ya le preguntan a ChatGPT y Perplexity por negocios como el tuyo. Hacemos que la IA te encuentre, te entienda y te recomiende — en español. Empieza con un diagnóstico gratis.',
    primary: { label: 'Pide tu diagnóstico gratis', href: '#contacto' },
    secondary: { label: 'Ver cómo empezar', href: '#precios' },
    chips: ['Diagnóstico gratis', 'Te lo implementamos', 'Menos competencia en español'],
    tone: 'teal' as const,
  },
  answer: {
    q: '¿Cómo hago que ChatGPT y Perplexity recomienden mi negocio?',
    a: 'Preparando tu información para que la IA pueda leerte, entenderte y citarte: Bing Places, datos estructurados (schema), preguntas frecuentes y NAP consistente. Importa hacerlo ya — según el Índice de Visibilidad Local de SOCi 2026, ChatGPT recomienda apenas el 1.2% de los negocios locales. El que aparece se lleva la conversación.',
    source: 'SOCi · Índice de Visibilidad Local 2026',
  },
  // Distinción CLAVE — IA que te recomienda ≠ IA que atiende (cruza-enlace inline).
  distinction: {
    tag: 'No te confundas',
    title: 'IA que te <em>recomienda</em> ≠ IA que <em>atiende</em>',
    paragraphs: [
      'Hay dos cosas distintas que la IA puede hacer por tu negocio. Una es <strong>atender a tus clientes</strong>: un asistente que contesta, agenda y capta prospectos 24/7 — eso es nuestra <a href="/es/houston/ia-conversacional">IA Conversacional</a>. La otra, de la que trata esta página, es <strong>que la IA te recomiende a TI</strong> cuando alguien le pregunta por un servicio como el tuyo.',
      'Tus clientes ya le preguntan a ChatGPT y a Perplexity «¿qué taller, abogado o restaurante me recomiendas?». La pregunta es simple: <strong>¿apareces tú o aparece tu competencia?</strong> El SEO para IA (también llamado AEO o GEO) hace que seas tú.',
    ],
    tone: 'teal' as const,
  },
  grid: {
    tag: 'Cómo empezamos',
    title: 'Tres pasos, el primero <em>gratis</em>',
    intro: 'Empieza con el diagnóstico gratis. Si quieres que lo trabajemos, los cimientos y el monitoreo tienen precio público, sin letra pequeña.',
  },
  // Mecánica / qué hacemos (FeatureGrid).
  mechanics: {
    tag: 'Qué hacemos',
    title: 'Cómo te preparamos para que la <em>IA te cite</em>',
    tone: 'teal' as const,
    items: [
      { icon: 'lucide:search', title: 'Bing Places (la base de ChatGPT)', desc: 'ChatGPT consulta Bing, no Google. Damos de alta y optimizamos tu Bing Places — el paso fácil que casi nadie da.' },
      { icon: 'lucide:braces', title: 'Datos estructurados (schema)', desc: 'Marcamos tu información en JSON-LD para que los asistentes entiendan quién eres, qué ofreces y a qué precio.' },
      { icon: 'lucide:messages-square', title: 'Respuestas listas para citar', desc: 'Preguntas y respuestas claras en español e inglés, en el formato corto de 40-60 palabras (answer-first) que la IA cita textualmente.' },
      { icon: 'lucide:list-checks', title: 'NAP consistente y directorios', desc: 'Tu nombre, dirección y teléfono iguales en todas partes — la IA saca buena parte de sus datos locales de ahí.' },
      { icon: 'lucide:gauge', title: 'HTML que la IA sí lee', desc: 'Los rastreadores de IA no ejecutan JavaScript. Construimos en HTML estático (Astro), legible para ellos; si un sitio depende de JavaScript para mostrar su contenido, la IA puede no verlo.' },
      { icon: 'lucide:line-chart', title: 'Medición y ajuste', desc: 'Seguimos cómo te ven y te mencionan los asistentes, y ajustamos. La visibilidad en IA es volátil — por eso se cuida mes a mes.' },
    ],
  },
  // Caso #0 + done-for-you + wedge bilingüe (Prose).
  caso0: {
    tag: 'Caso #0',
    title: 'Lo aplicamos a <em>nuestro propio sitio</em>',
    paragraphs: [
      'No es teoría: este mismo sitio está construido para que la IA lo lea — HTML estático, datos estructurados, contenido answer-first y precios públicos que ChatGPT puede citar. Somos nuestro propio Caso #0.',
      'Y no te entregamos un PDF de recomendaciones para que te arregles solo: <strong>lo implementamos por ti</strong>, en español y para tu mercado local. El SEO para IA en español tiene mucha menos competencia que en inglés — una ventaja real para un negocio hispano que se mueve hoy.',
    ],
    tone: 'teal' as const,
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'SEO para IA, <em>sin rodeos</em>',
    items: [
      { q: '¿Qué es el SEO para IA (AEO/GEO)?', a: 'Es el trabajo de optimización para que los asistentes de IA — ChatGPT, Perplexity, Google AI — puedan encontrarte, entenderte y recomendarte cuando alguien pregunta por un servicio como el tuyo. También se le llama AEO (optimización para motores de respuesta) o GEO. En corto: que la IA te cite a ti, no solo a tu competencia.' },
      { q: '¿Es lo mismo que el SEO de toda la vida?', a: 'No, pero se complementan. El SEO clásico busca posicionarte en la lista de resultados de Google; el SEO para IA busca que los asistentes te mencionen en su respuesta directa. Comparten cimientos (un sitio rápido, legible y con buena información), pero la IA usa señales propias, como Bing y los datos estructurados.' },
      { q: '¿Cuánto cuesta?', a: 'El diagnóstico de visibilidad en IA es gratis, sin compromiso. Si quieres que trabajemos los cimientos (Bing, datos estructurados, preguntas frecuentes y un archivo que guía a la IA) es desde $500 una sola vez, y el monitoreo mensual desde $200 al mes. Todo publicado, sin letra pequeña.' },
      { q: '¿En cuánto tiempo se ven resultados?', a: 'Es difícil dar una fecha exacta, y desconfía de quien te la prometa. Como referencia —no garantía—, las primeras señales suelen tomar semanas y una presencia más sólida, varios meses. Además, las respuestas de la IA cambian solas: por eso es un trabajo continuo, no un interruptor que se enciende una vez.' },
      { q: '¿Garantizan que ChatGPT me recomiende?', a: 'No, y desconfía de quien lo prometa. Nadie controla qué recomienda la IA y sus respuestas son volátiles. Lo que sí hacemos es prepararte correctamente para tener las mejores probabilidades, y medirlo con honestidad. ChatGPT tampoco acepta pago por recomendaciones locales.' },
      { q: '¿Funciona en español?', a: 'Sí, y es nuestra ventaja: el SEO para IA en español tiene mucha menos competencia que en inglés. Preparamos tu información en español e inglés, para que aparezcas cuando tu cliente pregunta en su idioma.' },
    ] as FaqItem[],
  },
  cta: {
    title: 'Descubre si la IA te <em>recomienda</em> — gratis',
    sub: 'Pídenos el diagnóstico de visibilidad en IA: revisamos si ChatGPT, Perplexity y Google pueden encontrarte y te decimos con honestidad cómo estás. Sin costo ni compromiso.',
    primary: { label: 'Pedir diagnóstico gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
    tone: 'teal' as const,
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Aprende y compara',
    links: [
      { label: 'Guía: cómo aparecer en ChatGPT y Perplexity', href: '/es/blog/como-aparecer-en-chatgpt-perplexity', desc: 'La guía paso a paso, si prefieres entender el cómo a fondo.', icon: 'lucide:book-open' },
      { label: 'IA para tu negocio', href: '/es/ia-para-pymes', desc: 'La otra IA: un asistente que atiende a tus clientes 24/7.', icon: 'lucide:message-circle' },
      { label: 'Precios y planes', href: '/es/precios', desc: 'Todos los servicios con su precio de arranque y qué incluyen.', icon: 'lucide:tag' },
      { label: 'Agencia en Houston', href: '/es/houston', desc: 'Todos nuestros servicios para negocios de Houston.', icon: 'lucide:map-pin' },
    ] as RelatedLink[],
  },
  // Schema: Service con un Offer por nivel (diagnóstico gratis price "0").
  service: {
    name: 'SEO para IA en Houston (Visibilidad en IA)',
    serviceType: 'Optimización para motores de respuesta (AEO)',
    description:
      'Optimización para que los asistentes de IA (ChatGPT, Perplexity, Google AI) encuentren, entiendan y recomienden tu negocio: Bing Places, datos estructurados, contenido answer-first, NAP y monitoreo. En español, para Houston.',
    path: LANDING,
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '0',
    providerId: HOUSTON_ID,
    tiers: [
      { name: 'Diagnóstico de Visibilidad en IA', priceValue: '0' },
      { name: 'Cimientos AEO', priceValue: '500' },
      { name: 'Monitoreo en IA', priceValue: '200', monthly: true },
    ],
  } as ServiceInput,
};
