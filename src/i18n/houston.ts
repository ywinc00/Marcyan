// ─────────────────────────────────────────────────────────────
// CONTENIDO · Ola 2 — HUB DE CIUDAD /es/houston (nodo del silo geográfico).
// NO es una landing de un servicio: presenta Houston y enlaza a los servicios
// ×Houston. Keyword primaria validada (jun 2026): "diseño de páginas web en
// Houston" (intención de dueño de negocio); "agencia de diseño web houston" como
// branding/H1 secundario. Diferenciador (NO guerra de precios): web + IA/chatbot
// bilingüe + precios públicos. Honestidad: sin "#1", sin superlativos absolutos.
// ─────────────────────────────────────────────────────────────

import type { FaqItem, CrumbItem, ListLink } from '../lib/schema';
import type { RelatedLink } from './clusters';
import { PRICE_ANCHORS } from './pricing';
import { nap } from './content';

// Formato display de las cifras canónicas. Las CIFRAS salen SIEMPRE de
// PRICE_ANCHORS (fuente única, guardada por check:kb); aquí solo se formatean
// (pricing.ts no exporta su usd() y está vetado tocarlo).
const usd = (n: number): string => '$' + n.toLocaleString('en-US');

// href de marcado directo derivado del NAP real (fuente única en content.ts).
const telHref = 'tel:' + nap.houston.replace(/[^\d+]/g, '');

// Cadena canónica de precios del hero — coherente con el FAQ de esta misma
// página. OJO: SEO local mensual = seoLocal ($600/mes); seoInitial ($300) es
// pago único y está PROHIBIDO mostrarlo como mensualidad.
const priceChain = `Web desde ${usd(PRICE_ANCHORS.web)} · Landing desde ${usd(PRICE_ANCHORS.webLanding)} · SEO desde ${usd(PRICE_ANCHORS.seoLocal)}/mes`;

export const houstonHub = {
  meta: {
    title: 'Diseño de páginas web en Houston | Agencia bilingüe: web, IA y SEO | Marcyan',
    description:
      'Agencia hispana de diseño de páginas web en Houston: sitios a medida, IA conversacional y SEO local. Bilingüe y con precios públicos. Propuesta gratis en 24h.',
  },
  path: '/es/houston',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
  ] as CrumbItem[],
  // Hero "Horizonte de llegada" (CityHero): kicker fusiona badge+kicker, UN solo
  // CTA + micro-reaseguro, riel de telemetría con los datos que deciden una
  // llamada (tel/horario/precios/coords) y el skyline oficial como escenario.
  hero: {
    kicker: 'Agencia hispana · Houston, TX',
    h1: 'Diseño de páginas web en <em>Houston</em>',
    sub: 'La agencia hispana que une tu web, tu IA y tu SEO, con precios públicos.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    microcopy: 'Respuesta en 1 hora hábil · Sin compromiso',
    explore: { label: 'Ver servicios y precios ↓', href: '#servicios' },
    telemetry: [
      { label: 'Línea directa', value: nap.houston, href: telHref, live: true },
      { label: 'Horario', value: nap.hours },
      { label: 'Precios públicos', value: priceChain, href: '#servicios' },
      { label: 'Base', value: '29.7604° N, 95.3698° W' },
    ],
    // Sin ilustración de skyline: el escenario queda como horizonte minimalista
    // (línea de suelo + atmósfera + sello de ciudad). `src` opcional para reponerlo.
    skyline: { caption: 'HOUSTON, TX — SPACE CITY' },
    tone: 'gold' as const,
  },
  answer: {
    q: '¿Por qué elegir una agencia de diseño web en Houston?',
    a: 'Una agencia local entiende tu mercado: el 46% de las búsquedas en Google tienen intención local y el 76% de quienes buscan «cerca de mí» visitan un negocio en menos de 24 horas. En Houston, una agencia hispana y bilingüe te ayuda a aparecer en Google y en la IA, y a hablarles a tus clientes en su idioma.',
    source: 'Google · BrightLocal, 2025',
  },
  // Servicios con PRECIO: el precio vive en su propio campo `price` (display,
  // cifras desde PRICE_ANCHORS) y las descs van a dieta — sin la cola "Desde $X."
  // Orden: los 2 primeros = tarjetas destacadas del hub (web + IA, los dos
  // pilares del posicionamiento "tu web, tu IA y tu SEO"); el resto, filas.
  services: {
    tag: 'Servicios en Houston',
    title: 'Todo para tu negocio, en una <em>sola agencia</em>',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'Sitios a medida, rápidos y bilingües, listos para Google y la IA.', icon: 'lucide:layout-template', price: `desde ${usd(PRICE_ANCHORS.web)}` },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Asistentes que contestan, agendan y captan prospectos 24/7, en español.', icon: 'lucide:messages-square', price: `desde ${usd(PRICE_ANCHORS.ia)}` },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Aparece en Google Maps y en la IA.', icon: 'lucide:search', price: `desde ${usd(PRICE_ANCHORS.seoLocal)}/mes` },
      { label: 'SEO para IA en Houston', href: '/es/houston/seo-para-ia', desc: 'Que ChatGPT y Gemini te recomienden.', icon: 'marcyan-ai', price: 'Diagnóstico gratis' },
      { label: 'Tienda en línea en Houston', href: '/es/houston/ecommerce', desc: 'E-commerce que vende, con pagos y catálogo.', icon: 'lucide:shopping-bag', price: `desde ${usd(PRICE_ANCHORS.ecommerce)}` },
      { label: 'Branding e identidad en Houston', href: '/es/houston/branding', desc: 'Logo, colores y tipografía con criterio experto.', icon: 'lucide:palette', price: `desde ${usd(PRICE_ANCHORS.branding)}` },
    ] as RelatedLink[],
  },
  // Directorio por industria: índice denso — subs mono de 3-6 palabras derivadas
  // de las descs honestas originales (sin cifras repetidas ni claims nuevos).
  industries: {
    tag: 'Por industria',
    title: 'Soluciones por sector',
    links: [
      { label: 'Bienes raíces', href: '/es/houston/bienes-raices', desc: 'Propiedades, captación y SEO por zona', icon: 'lucide:home' },
      { label: 'Contratistas', href: '/es/houston/contratistas', desc: 'IA que rescata llamadas perdidas', icon: 'lucide:hard-hat' },
    ] as RelatedLink[],
  },
  // Zonas: viven como pills-ruta dentro de la Ficha Houston (los 2 <a> del silo).
  zonas: {
    tag: 'Por zona',
    title: 'Diseño web por <em>zona de Houston</em>',
    links: [
      { label: 'Katy, TX', href: '/es/houston/katy', desc: 'Web y SEO local en Katy', icon: 'lucide:map-pin' },
      { label: 'Sugar Land, TX', href: '/es/houston/sugar-land', desc: 'Web bilingüe y SEO en Sugar Land', icon: 'lucide:map-pin' },
    ] as RelatedLink[],
  },
  // Ficha Houston (fusión del contexto local + riel NAP): los párrafos conservan
  // ÍNTEGROS el claim de mercado ("cuarta ciudad… población hispana") y el
  // <strong> de "No somos una agencia remota…" — es el argumento local completo.
  local: {
    tag: 'Houston',
    title: 'Conocemos el <em>mercado de Houston</em>',
    paragraphs: [
      'Houston es la cuarta ciudad más grande de Estados Unidos y una de las de mayor población hispana. Es un mercado enorme y competido, donde aparecer primero, en Google, en Maps y en los asistentes de IA, marca la diferencia entre una llamada y un cliente perdido.',
      'Trabajamos toda el área metropolitana como negocio de área de servicio, en español e inglés. <strong>No somos una agencia remota que «también cubre» Houston:</strong> diseñamos, escribimos y posicionamos pensando en cómo busca de verdad tu cliente aquí.',
    ],
    tone: 'gold' as const,
  },
  // Riel NAP de la Ficha (patrón dt/dd con hairlines). Datos ya presentes en el
  // sitio (content.ts / Locations); nada inventado.
  ficha: {
    meta: [
      { ic: 'lucide:phone', label: 'Línea directa', value: nap.houston, href: telHref },
      { ic: 'lucide:clock', label: 'Horario', value: nap.hours },
      { ic: 'lucide:map-pinned', label: 'Cobertura', value: 'Katy, Sugar Land, The Woodlands, Pearland' },
      { ic: 'lucide:languages', label: 'Idiomas', value: 'Español · Inglés' },
      { ic: 'lucide:locate-fixed', label: 'Coordenadas', value: '29.7604° N, 95.3698° W' },
    ],
    statePill: 'Texas, USA',
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Precios y más',
    links: [
      { label: 'Precios y planes', href: '/es/precios', desc: 'Todos los precios de arranque, publicados', icon: 'lucide:tag' },
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: 'También diseñamos en Miami', icon: 'lucide:layout-template' },
    ] as RelatedLink[],
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Agencia en Houston, <em>sin rodeos</em>',
    items: [
      { q: '¿Qué servicios ofrecen en Houston?', a: 'Diseño y desarrollo web a medida, SEO local, IA conversacional (asistentes que atienden 24/7), tiendas en línea, branding y mantenimiento. Todo bilingüe en español e inglés, y pensado para el mercado hispano de Houston. Puedes contratar un solo servicio o un paquete coordinado.' },
      { q: '¿Tienen oficina en Houston?', a: 'Trabajamos como negocio de área de servicio: cubrimos Houston y toda su área metropolitana de forma remota y eficiente, sin una dirección pública. No necesitas ir a una oficina. Todo el proceso, de la propuesta a la entrega, lo hacemos en línea y en tu idioma.' },
      { q: '¿Trabajan en español e inglés?', a: 'Sí. Somos un equipo bilingüe enfocado en el mercado hispano de Estados Unidos. Diseñamos, escribimos y posicionamos en español e inglés, porque en Houston tus clientes buscan en ambos idiomas.' },
      { q: '¿Atienden solo a Houston o también el área metropolitana?', a: 'Cubrimos Houston y toda su área metropolitana (Katy, Sugar Land, The Woodlands, Pearland y más). Al ser negocio de área de servicio, podemos atenderte en las zonas donde realmente operas, sin necesidad de una dirección pública.' },
      { q: '¿Cuánto cuestan sus servicios en Houston?', a: 'Publicamos nuestros precios de arranque: diseño web desde $1,500, IA desde $900, tienda en línea desde $2,900 y SEO local desde $600 al mes. El precio final depende del alcance, y siempre te lo damos por escrito antes de empezar. Puedes verlos todos en nuestra página de precios.' },
      { q: '¿Por qué una agencia hispana local y no una grande?', a: 'Porque hablamos tu idioma, conocemos a tu cliente hispano y te damos atención cercana, con precios públicos y sin contratos que te aten. Reunimos algo que pocos ofrecen en conjunto: diseño web, IA conversacional y SEO, todo bilingüe y bajo un mismo equipo.' },
    ] as FaqItem[],
  },
  // CTA final: verbo unificado con el hero ("Propuesta gratis") y la
  // secundaria es el TELÉFONO (marcado directo) — muere la fuga a /formulario.
  cta: {
    title: '¿Listo para crecer en <em>Houston</em>?',
    sub: 'Cuéntanos sobre tu negocio y recibe una propuesta personalizada en menos de 24 horas, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    secondary: { label: `Llámanos: ${nap.houston}`, href: telHref },
    tone: 'gold' as const,
  },
  // Micro-reaseguro (fila slim entre el CTA y el formulario). "Precio por escrito"
  // sale verbatim del FAQ de esta página; el plazo de respuesta es el compromiso
  // de contacto de todo el sitio (mismo que los correos y el chat), no un claim
  // propio de esta landing. Nombra los DOS plazos a propósito: justo encima, el
  // cta.sub promete la propuesta en 24 horas, y sin desambiguar se leían como
  // números contradictorios. Respuesta = contacto · Propuesta = entregable.
  reassure: 'Respuesta en 1 hora hábil · Propuesta gratis en 24h · Precio por escrito antes de empezar',
  // ItemList (schema) — los servicios ofrecidos en Houston, cada uno a su landing.
  itemList: [
    { name: 'Diseño web en Houston', path: '/es/houston/diseno-web' },
    { name: 'SEO local en Houston', path: '/es/houston/seo-local' },
    { name: 'IA conversacional en Houston', path: '/es/houston/ia-conversacional' },
    { name: 'SEO para IA en Houston', path: '/es/houston/seo-para-ia' },
    { name: 'Tienda en línea en Houston', path: '/es/houston/ecommerce' },
    { name: 'Branding e identidad en Houston', path: '/es/houston/branding' },
    { name: 'Sitios Web para Contratistas en Houston', path: '/es/houston/contratistas' },
    { name: 'Diseño web y SEO local en Katy, TX', path: '/es/houston/katy' },
    { name: 'Diseño web y SEO local en Sugar Land', path: '/es/houston/sugar-land' },
  ] as ListLink[],
  // ── Rediseño "el viaje" (2026-10-25) ── textos nuevos de la página; las claves de arriba siguen intactas
  // (meta, breadcrumb, servicios con sus anclas, industrias, zonas, local, answer, faq, cta, itemList).
  // El H1 del hero es el aprobado por el dueño; title y meta los cambia el chat de SEO (encargo 2026-10-24).
  journey: {
    h1: 'La agencia que pone tu negocio en el mapa de <em>Houston</em>',
    lead: 'Web, SEO e IA con un solo equipo. Te encuentran en Google, en Maps y en la IA, y tu negocio les contesta en su idioma.',
    call: { label: '713-823-9144', href: telHref },
    pinsLabel: 'Búsquedas de ejemplo en zonas de Houston',
    pins: [
      { name: 'THE WOODLANDS', q: 'kitchen remodeling contractor', en: true },
      { name: 'KATY', q: 'realtor que hable español' },
      { name: 'GULFTON', q: 'abogado de inmigración en español' },
      { name: 'PASADENA', q: 'taller mecánico que hable español' },
    ],
    card: {
      label: 'Resultado de ejemplo', name: 'Tu negocio', meta: 'Pasadena, TX · Abierto ahora',
      named: 'Te nombran', checks: ['✓ Google', '✓ Maps', '✓ La IA'], ai: 'Tu asistente le contesta en español, 24/7',
    },
    services: {
      title: 'Te encuentran, te eligen <em>y te contestan</em>',
      lead: 'Tres trabajos y un mismo equipo. Cada servicio tiene su precio de arranque publicado y el final te lo damos por escrito antes de empezar.',
      // índices sobre services.links (las anclas del silo no cambian)
      steps: [
        { n: '01', title: 'Te encuentran', txt: 'Que salgas cuando te buscan en Google, en Maps y en la IA.', links: [2, 3], vig: 'search', note: 'Google, Maps, ChatGPT y Gemini leen tu web y tu ficha: las dejamos listas para que te nombren.' },
        { n: '02', title: 'Te eligen', txt: 'Una web rápida y bilingüe que convence en segundos.', links: [0, 4, 5], vig: 'web', note: '' },
        { n: '03', title: 'Te contestan', txt: 'Un asistente que responde, agenda y capta clientes a cualquier hora.', links: [1], vig: 'chat', note: 'En tu web y en WhatsApp, en español e inglés. Cuando no sabe algo, te pasa la conversación a ti.' },
      ],
      vig: {
        query: 'taller mecánico que hable español', result: 'Tu negocio', open: 'Abierto ahora', checks: ['✓ Google', '✓ Maps', '✓ La IA'],
        time: '11:42 p. m.', me1: '¿Me revisan los frenos mañana?', bot: 'Claro, a las 8:30 tenemos espacio. ¿Te lo aparto?', me2: 'Sí, porfa. Carlos.', ok: 'Cita apartada · mañana 8:30',
      },
      all: { label: 'Ver todos los precios', href: '/es/precios' },
    },
    projects: {
      // trabajos que se muestran en esta ciudad y en este orden (decisión del dueño 2026-11-01: TRR, Rosy Nails, Julio's)
      slugs: ['trr', 'rn', 'jls'],
      tag: 'Portafolio', title: 'Trabajo real, negocios <em>reales</em>', did: 'Qué hicimos', result: 'Resultado',
      note: 'Por respeto a la privacidad de nuestros clientes mostramos las capturas, no los enlaces; con gusto te los enseñamos en una llamada.',
      more: { label: 'Ver Proyectos', href: '/es/portafolio' }, shotPc: 'vista de escritorio', shotMovil: 'vista móvil',
    },
    local: {
      nap: [
        { label: 'Línea directa', value: nap.houston, href: telHref },
        { label: 'Horario', value: nap.hours },
        { label: 'Idiomas', value: 'Español · Inglés' },
      ],
      mapLabel: 'Mapa del área de Houston con las zonas que atendemos',
      mapCap: 'Toda el área metropolitana',
      zonesLabel: 'Zonas del área de Houston',
      zones: [
        { n: 'Houston', hq: true }, { n: 'Katy', href: '/es/houston/katy' }, { n: 'Sugar Land', href: '/es/houston/sugar-land' },
        { n: 'The Woodlands' }, { n: 'Pearland' }, { n: 'Pasadena' },
      ],
    },
    sectors: {
      tag: 'Por sector', title: 'Así buscan a <em>tu sector</em> en Houston',
      lead: 'Lo que escribe el cliente de cada sector. Preparamos tu web y tu ficha para esa búsqueda.',
      // filas propias (desde la consolidación de nov 2026 solo algunos sectores conservan página: esas filas la
      // enlazan, buscada por su nombre en industries.links; las demás se quedan como fila sin enlace)
      rows: [
        { label: 'Abogados de inmigración', icon: 'lucide:scale', q: 'abogado de inmigración en español' },
        { label: 'Bienes raíces', icon: 'lucide:home', q: 'realtor que hable español' },
        { label: 'Restaurantes', icon: 'lucide:utensils', q: 'tacos cerca de mí abierto ahora' },
        { label: 'Contratistas', icon: 'lucide:hard-hat', q: 'kitchen remodeling contractor', en: true },
        { label: 'Talleres mecánicos', icon: 'lucide:car', q: 'taller mecánico que hable español' },
        { label: 'Salones de belleza', icon: 'lucide:scissors', q: 'salón de uñas cerca de mí' },
        { label: 'Clínicas dentales', icon: 'lucide:stethoscope', q: 'dentista que hable español' },
      ],
    },
    answer: {
      figs: [
        { n: 46, txt: 'de las búsquedas en Google tienen intención local' },
        { n: 76, txt: 'de quienes buscan «cerca de mí» visitan un negocio en menos de 24 horas' },
      ],
    },
    cta: { call: `Llámanos: ${nap.houston}`, wa: 'Escríbenos por WhatsApp' },
  },
};
