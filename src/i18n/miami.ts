// ─────────────────────────────────────────────────────────────
// CONTENIDO · Ola 2 · B3 — HUB DE CIUDAD /es/miami (nodo del silo geográfico).
// Presenta Miami y enlaza a sus servicios. Contexto GENUINO (NO clon de Houston):
// Miami-Dade ~69% hispano (Census), liderado por cubanos pero pan-latino
// (venezolanos en Doral, colombianos en Kendall/Brickell, nicaragüenses en
// Sweetwater). Español CARIBEÑO (NO modismos mexicanos). Honestidad DURA: SIN
// clientes en Miami → Cliente Fundador + proof real etiquetado por su ciudad
// (Houston/Orlando), nunca Miami. Sin "#1". Mercado saturado → diferenciar por
// honestidad/AEO/presencia local real, NO precio.
// ─────────────────────────────────────────────────────────────

import type { FaqItem, CrumbItem, ListLink } from '../lib/schema';
import type { RelatedLink } from './clusters';
import { nap } from './content';

const telHref = 'tel:' + nap.miami.replace(/[^\d+]/g, '');

export const miamiHub = {
  meta: {
    title: 'Diseño de páginas web en Miami | Agencia hispana: web, IA y SEO | Marcyan',
    description:
      'Agencia hispana de diseño de páginas web en Miami: sitios a medida, IA conversacional y SEO local. Bilingüe, en el español de tus clientes y con precios públicos. Propuesta gratis en 24h.',
  },
  path: '/es/miami',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Miami', path: '/es/miami' },
  ] as CrumbItem[],
  hero: {
    badge: 'Miami, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Agencia hispana · Miami, FL',
    microcopy: 'Respuesta en 1 hora hábil · Sin compromiso',
    h1: 'Diseño de páginas web en <em>Miami</em>',
    sub: 'Una sola agencia hispana para tu sitio, tu IA y tu SEO local en Miami, a medida, bilingüe y con precios públicos. Todo pensado para cómo busca de verdad tu cliente cubano, venezolano o colombiano.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver precios y planes', href: '/es/precios' },
    chips: ['El español de Miami', 'Precios públicos', 'Todo Miami-Dade'],
    tone: 'gold' as const,
  },
  answer: {
    q: '¿Por qué elegir una agencia hispana de diseño web en Miami?',
    a: 'Porque en Miami el español es la lengua del comercio: cerca del 69% de Miami-Dade es hispano, según el U.S. Census Bureau. Necesitas una agencia que hable el español de tus clientes, cubano, venezolano, colombiano, y que construya tu sitio para que te encuentren en Google y en la IA. Eso te conecta con tu mercado mejor que una agencia genérica.',
    source: 'U.S. Census Bureau, ACS 2023',
  },
  services: {
    tag: 'Servicios en Miami',
    title: 'Todo para tu negocio, en una <em>sola agencia</em>',
    links: [
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: 'Sitios a medida, rápidos y bilingües. Desde $1,500.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Miami', href: '/es/miami/seo-local', desc: 'Aparece en Google Maps y en la IA. Desde $600/mes.', icon: 'lucide:search' },
      { label: 'IA conversacional en Miami', href: '/es/miami/ia-conversacional', desc: 'Asistentes que contestan WhatsApp y agendan 24/7. Desde $900.', icon: 'lucide:messages-square' },
      { label: 'Tienda en línea en Miami', href: '/es/miami/ecommerce', desc: 'E-commerce que vende, con pagos y catálogo. Desde $2,900.', icon: 'lucide:shopping-bag' },
    ] as RelatedLink[],
  },
  barrios: {
    tag: 'Por barrio',
    title: 'Soluciones por <em>barrio</em>',
    links: [
      { label: 'Doral (Doralzuela)', href: '/es/miami/doral', desc: 'Diseño web, SEO e IA para negocios de Doral. Bilingüe, desde $1,500.', icon: 'lucide:map-pin' },
      { label: 'Hialeah', href: '/es/miami/hialeah', desc: 'Web, SEO local e IA en español para negocios de Hialeah.', icon: 'lucide:map-pin' },
    ] as RelatedLink[],
  },
  local: {
    tag: 'Miami',
    title: 'Conocemos el <em>Miami hispano</em>',
    paragraphs: [
      'Miami-Dade es uno de los mercados más latinos de Estados Unidos: cerca del 69% de su población es hispana. Pero no es un bloque uniforme: es cubano de raíz, con Doral venezolano, Kendall y Brickell colombianos, Hialeah cubano y Sweetwater nicaragüense. Le hablamos a cada uno en su español, no en uno genérico.',
      '<strong>Seamos transparentes:</strong> apenas estamos empezando operaciones en Miami, así que todavía no mostramos casos locales. Lo que sí mostramos es trabajo real y verificable que ya hicimos en Houston y Orlando, y buscamos a nuestros primeros Clientes Fundadores de Miami. Trabajamos toda el área de Miami-Dade como negocio de área de servicio, en español e inglés.',
    ],
    tone: 'gold' as const,
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Precios y más',
    links: [
      { label: 'Precios y planes', href: '/es/precios', desc: 'Todos los servicios con su precio de arranque y qué incluyen.', icon: 'lucide:tag' },
      { label: 'SEO para IA (que la IA te recomiende)', href: '/es/houston/seo-para-ia', desc: 'Que ChatGPT y Gemini te recomienden. Diagnóstico gratis.', icon: 'marcyan-ai' },
      { label: 'Agencia en Houston', href: '/es/houston', desc: 'Nuestra base de operaciones, con casos verificables.', icon: 'lucide:map-pin' },
    ] as RelatedLink[],
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Agencia en Miami, <em>sin rodeos</em>',
    items: [
      { q: '¿Qué servicios ofrecen en Miami?', a: 'Diseño y desarrollo web a medida, SEO local, IA conversacional (asistentes que atienden 24/7) y tiendas en línea; también branding y SEO para IA. Todo bilingüe en español e inglés, y pensado para el mercado hispano de Miami. Puedes contratar un solo servicio o un paquete coordinado.' },
      { q: '¿Tienen clientes u oficina en Miami?', a: 'Vamos a ser honestos: estamos comenzando operaciones en Miami, así que todavía no tenemos casos publicados de esta ciudad ni una dirección pública (trabajamos como negocio de área de servicio). Sí tenemos trabajo real y verificable hecho en Houston y Orlando, con enlaces que puedes visitar. Por eso ofrecemos cupos de Cliente Fundador en Miami.' },
      { q: '¿Trabajan en el español de Miami?', a: 'Sí. Somos un equipo bilingüe enfocado en el mercado hispano de Estados Unidos. En Miami eso significa el español que de verdad se habla aquí, cubano, venezolano, colombiano, y también inglés. Escribimos y posicionamos pensando en cómo habla y busca de verdad tu cliente, no en un español genérico.' },
      { q: '¿Atienden toda el área de Miami?', a: 'Sí. Cubrimos Miami-Dade y su área metropolitana (Doral, Hialeah, Kendall, Coral Gables, Brickell, Aventura y más) como negocio de área de servicio, de forma remota y eficiente. No necesitas ir a una oficina: todo el proceso, de la propuesta a la entrega, lo hacemos en línea y en tu idioma.' },
      { q: '¿Cuánto cuestan sus servicios en Miami?', a: 'Publicamos nuestros precios de arranque: diseño web desde $1,500, IA desde $900, tienda en línea desde $2,900 y SEO local desde $600 al mes. El precio final depende del alcance, y siempre te lo damos por escrito antes de empezar. Puedes verlos todos en nuestra página de precios.' },
      { q: '¿Por qué una agencia hispana nueva en Miami y no una ya establecida?', a: 'Porque hablamos tu idioma de verdad, tenemos presencia local real (no somos una operación remota anónima) y trabajamos con honestidad: precios públicos, sin contratos que te aten y sin prometer el «#1». Somos nuevos en Miami, pero con trabajo verificable, y a nuestros Clientes Fundadores les damos dedicación y condiciones especiales.' },
    ] as FaqItem[],
  },
  cta: {
    title: '¿Listo para crecer en <em>Miami</em>?',
    sub: 'Cuéntanos sobre tu negocio y recibe una propuesta personalizada en menos de 24 horas, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'gold' as const,
  },
  // Reaseguro bajo el cierre (mismos plazos que en todo el sitio: contacto en 1 hora hábil, propuesta en 24 horas)
  reassure: 'Respuesta en 1 hora hábil · Propuesta gratis en 24h · Precio por escrito antes de empezar',
  // ── Rediseño "el viaje" (2026-11-01, la base de Houston con lo de Miami) ── textos nuevos de la página; las claves de
  // arriba siguen intactas (meta, breadcrumb, servicios con sus enlaces, barrios, local, answer, faq, cta, itemList).
  // Title y meta no cambian aquí (son del departamento de SEO).
  journey: {
    h1: 'La agencia que pone tu negocio en el mapa de <em>Miami</em>',
    lead: 'Web, SEO e IA con un solo equipo. En Miami te buscan en español y en inglés: que te encuentren en Google, en Maps y en la IA, y que tu negocio conteste en los dos.',
    call: { label: '786-938-1754', href: telHref },
    pinsLabel: 'Búsquedas de ejemplo en zonas de Miami',
    // el orden importa (posiciones en cities.js): arriba, izquierda, abajo y la encendida
    pins: [
      { name: 'HIALEAH', q: 'taller de mecánica cerca de mí' },
      { name: 'DORAL', q: 'abogado de inmigración en español' },
      { name: 'KENDALL', q: 'dentist near me', en: true },
      { name: 'MIAMI BEACH', q: 'restaurante cubano abierto ahora' },
    ],
    card: {
      label: 'Resultado de ejemplo', name: 'Tu negocio', meta: 'Miami Beach, FL · Abierto ahora',
      named: 'Te nombran', checks: ['✓ Google', '✓ Maps', '✓ La IA'], ai: 'Tu asistente contesta en español o en inglés, 24/7',
    },
    services: {
      title: 'Te encuentran, te eligen <em>y te contestan</em>',
      lead: 'Tres trabajos y un mismo equipo para todo Miami-Dade. Cada servicio tiene su precio de arranque publicado y el final te lo damos por escrito antes de empezar.',
      // índices sobre services.links (diseño web, SEO local, IA conversacional, tienda en línea)
      steps: [
        { n: '01', title: 'Te encuentran', txt: 'Que salgas cuando Miami te busca, en español o en inglés, en Google, en Maps y en la IA.', links: [1], vig: 'search', note: 'Tu web y tu ficha listas para como busca Miami: en español, en inglés y muchas veces en los dos a la vez.' },
        { n: '02', title: 'Te eligen', txt: 'Una web rápida, en español y en inglés de verdad, sin traducciones que se notan.', links: [0, 3], vig: 'web', note: '' },
        { n: '03', title: 'Te contestan', txt: 'Un asistente que contesta, agenda y capta clientes a cualquier hora, en el idioma en que te escriben.', links: [2], vig: 'chat', note: 'En tu web y en WhatsApp, donde vive Miami. Cuando no sabe algo, te pasa la conversación a ti.' },
      ],
      vig: {
        query: 'restaurante cubano abierto ahora', result: 'Tu negocio', open: 'Abierto ahora', checks: ['✓ Google', '✓ Maps', '✓ La IA'],
        time: '11:42 p. m.', me1: '¿Tienen mesa para cuatro mañana a las 8?', bot: 'Claro que sí. Mañana a las 8 hay mesa en la terraza. ¿Se la separo?', me2: 'Dale, a nombre de Carlos.', ok: 'Mesa separada · mañana 8:00 p. m.',
      },
      all: { label: 'Ver todos los precios', href: '/es/precios' },
    },
    projects: {
      // trabajos que se muestran en esta ciudad (decisión del dueño 2026-11-01: MJA por cercanía; GNS cuando esté listo)
      slugs: ['mja'],
      tag: 'Portafolio', title: 'Trabajo real en <em>Florida</em>', did: 'Qué hicimos', result: 'Resultado',
      note: 'Move Junk Away está en Orlando: es nuestro proyecto más cercano a Miami y lo mostramos con su ciudad real. Por privacidad enseñamos las capturas, no los enlaces; con gusto te lo mostramos en una llamada.',
      more: { label: 'Ver Proyectos', href: '/es/portafolio' }, shotPc: 'vista de escritorio', shotMovil: 'vista móvil',
    },
    local: {
      nap: [
        { label: 'Línea directa', value: nap.miami, href: telHref },
        { label: 'Horario', value: nap.hours },
        { label: 'Idiomas', value: 'Español · Inglés' },
      ],
      mapLabel: 'Mapa del área de Miami con las zonas que atendemos',
      mapCap: 'Todo Miami-Dade',
      zonesLabel: 'Zonas del área de Miami',
      zones: [
        { n: 'Miami', hq: true }, { n: 'Doral', href: '/es/miami/doral' }, { n: 'Hialeah', href: '/es/miami/hialeah' },
        { n: 'Miami Beach' }, { n: 'Coral Gables' }, { n: 'Kendall' }, { n: 'Aventura' },
      ],
    },
    sectors: {
      tag: 'Por sector', title: 'Así buscan a <em>tu sector</em> en Miami',
      lead: 'Lo que escribe el cliente de cada sector en Miami, en español o en inglés. Preparamos tu web y tu ficha para esa búsqueda.',
      rows: [
        { label: 'Restaurantes', icon: 'lucide:utensils', q: 'restaurante cubano abierto ahora' },
        { label: 'Abogados de inmigración', icon: 'lucide:scale', q: 'abogado de inmigración en Doral' },
        { label: 'Bienes raíces', icon: 'lucide:home', q: 'realtor que hable español en Brickell' },
        { label: 'Contratistas', icon: 'lucide:hard-hat', q: 'roofing contractor near me', en: true },
        { label: 'Talleres mecánicos', icon: 'lucide:car', q: 'taller de mecánica en Hialeah' },
        { label: 'Salones de belleza', icon: 'lucide:scissors', q: 'salón de uñas en Kendall' },
        { label: 'Clínicas dentales', icon: 'lucide:stethoscope', q: 'dentista que hable español' },
      ],
    },
    answer: {
      figs: [
        { n: 46, txt: 'de las búsquedas en Google tienen intención local' },
        { n: 76, txt: 'de quienes buscan «cerca de mí» visitan un negocio en menos de 24 horas' },
      ],
    },
    cta: { call: `Llámanos: ${nap.miami}`, wa: 'Escríbenos por WhatsApp' },
  },
  // ItemList (schema) — los servicios ofrecidos en Miami, cada uno a su landing.
  itemList: [
    { name: 'Diseño web en Miami', path: '/es/miami/diseno-web' },
    { name: 'SEO local en Miami', path: '/es/miami/seo-local' },
    { name: 'IA conversacional en Miami', path: '/es/miami/ia-conversacional' },
    { name: 'Tienda en línea en Miami', path: '/es/miami/ecommerce' },
    { name: 'Diseño web y SEO en Doral', path: '/es/miami/doral' },
    { name: 'Diseño web y SEO en Hialeah', path: '/es/miami/hialeah' },
  ] as ListLink[],
};
