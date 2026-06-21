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

export const houstonHub = {
  meta: {
    title: 'Diseño de Páginas Web en Houston | Agencia bilingüe: web, IA y SEO | Marcyan',
    description:
      'Agencia hispana de diseño de páginas web en Houston: sitios a medida, IA conversacional y SEO local. Bilingüe y con precios públicos. Propuesta gratis en 24h.',
  },
  path: '/es/houston',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Houston', path: '/es/houston' },
  ] as CrumbItem[],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Agencia local',
    h1: 'Diseño de páginas web en <em>Houston</em>',
    sub: 'Una sola agencia hispana para tu sitio, tu IA y tu SEO local — a medida, bilingüe y con precios públicos. Hecho para cómo busca de verdad tu cliente en Houston.',
    primary: { label: 'Quiero mi propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver precios y planes', href: '/es/precios' },
    chips: ['Bilingüe ES/EN', 'Precios públicos', 'Área metro de Houston'],
    tone: 'gold' as const,
  },
  answer: {
    q: '¿Por qué elegir una agencia de diseño web en Houston?',
    a: 'Una agencia local entiende tu mercado: el 46% de las búsquedas en Google tienen intención local y el 76% de quienes buscan «cerca de mí» visitan un negocio en menos de 24 horas. En Houston, una agencia hispana y bilingüe te ayuda a aparecer en Google y en la IA, y a hablarle a tus clientes en su idioma.',
    source: 'Google · BrightLocal, 2025',
  },
  services: {
    tag: 'Servicios en Houston',
    title: 'Todo para tu negocio, en una <em>sola agencia</em>',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'Sitios a medida, rápidos y bilingües. Desde $1,500.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Aparece en Google Maps y en la IA. Desde $600/mes.', icon: 'lucide:search' },
      { label: 'IA conversacional en Houston', href: '/es/houston/ia-conversacional', desc: 'Asistentes que contestan y agendan 24/7. Desde $900.', icon: 'marcyan-ai' },
      { label: 'SEO para IA en Houston', href: '/es/houston/seo-para-ia', desc: 'Que ChatGPT y Gemini te recomienden. Diagnóstico gratis.', icon: 'marcyan-ai' },
      { label: 'Tienda en línea en Houston', href: '/es/houston/ecommerce', desc: 'E-commerce que vende, con pagos y catálogo. Desde $2,900.', icon: 'lucide:shopping-bag' },
      { label: 'Branding e identidad en Houston', href: '/es/houston/branding', desc: 'Logo, colores y tipografía con criterio experto. Desde $750.', icon: 'lucide:palette' },
    ] as RelatedLink[],
  },
  industries: {
    tag: 'Por industria',
    title: 'Soluciones por <em>sector</em>',
    links: [
      { label: 'Abogados de inmigración', href: '/es/houston/abogados-inmigracion', desc: 'Capta y agenda consultas 24/7 con IA, en español. Sin promesas de resultados.', icon: 'lucide:scale' },
      { label: 'Bienes raíces', href: '/es/houston/bienes-raices', desc: 'Sitio con tus propiedades, captación y SEO local por zona.', icon: 'lucide:home' },
    ] as RelatedLink[],
  },
  local: {
    tag: 'Houston',
    title: 'Conocemos el <em>mercado de Houston</em>',
    paragraphs: [
      'Houston es la cuarta ciudad más grande de Estados Unidos y una de las de mayor población hispana. Es un mercado enorme y competido, donde aparecer primero — en Google, en Maps y en los asistentes de IA — marca la diferencia entre una llamada y un cliente perdido.',
      'Trabajamos toda el área metropolitana de Houston como negocio de área de servicio, en español e inglés. <strong>No somos una agencia remota que «también cubre» Houston:</strong> diseñamos, escribimos y posicionamos pensando en cómo busca de verdad tu cliente aquí.',
    ],
    tone: 'gold' as const,
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Precios y más',
    links: [
      { label: 'Precios y planes', href: '/es/precios', desc: 'Los 6 servicios con su precio de arranque y qué incluyen.', icon: 'lucide:tag' },
      { label: '¿Cuánto cuesta una página web en Houston?', href: '/es/precios/cuanto-cuesta-una-pagina-web-houston', desc: 'La respuesta directa, con el precio real y qué incluye.', icon: 'lucide:help-circle' },
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: '¿También operas en Miami? También diseñamos allí.', icon: 'lucide:palette' },
    ] as RelatedLink[],
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Agencia en Houston, <em>sin rodeos</em>',
    items: [
      { q: '¿Qué servicios ofrecen en Houston?', a: 'Diseño y desarrollo web a medida, SEO local, IA conversacional (asistentes que atienden 24/7), tiendas en línea, branding y mantenimiento. Todo bilingüe en español e inglés, y pensado para el mercado hispano de Houston. Puedes tomar un solo servicio o un paquete coordinado.' },
      { q: '¿Tienen oficina en Houston?', a: 'Trabajamos como negocio de área de servicio: cubrimos Houston y toda su área metropolitana de forma remota y eficiente, sin una dirección pública. No necesitas ir a una oficina — todo el proceso, de la propuesta a la entrega, lo hacemos en línea y en tu idioma.' },
      { q: '¿Trabajan en español e inglés?', a: 'Sí. Somos un equipo bilingüe enfocado en el mercado hispano de Estados Unidos. Diseñamos, escribimos y posicionamos en español e inglés, porque en Houston tus clientes buscan en ambos idiomas.' },
      { q: '¿Atienden solo a Houston o también el área metropolitana?', a: 'Cubrimos Houston y toda su área metropolitana (Katy, Sugar Land, The Woodlands, Pearland y más). Al ser negocio de área de servicio, podemos atenderte en las zonas donde realmente operas, sin necesidad de una dirección pública.' },
      { q: '¿Cuánto cuestan sus servicios en Houston?', a: 'Publicamos nuestros precios de arranque: diseño web desde $1,500, IA desde $900, tienda en línea desde $2,900 y SEO local desde $600 al mes. El precio final depende del alcance, y siempre te lo damos por escrito antes de empezar. Puedes verlos todos en nuestra página de precios.' },
      { q: '¿Por qué una agencia hispana local y no una grande?', a: 'Porque hablamos tu idioma, conocemos a tu cliente hispano y te damos atención cercana, con precios públicos y sin contratos forzados. Reunimos algo que pocos ofrecen en conjunto: diseño web, IA conversacional y SEO, todo bilingüe y bajo un mismo equipo.' },
    ] as FaqItem[],
  },
  cta: {
    title: '¿Listo para crecer en <em>Houston</em>?',
    sub: 'Cuéntanos sobre tu negocio y recibe una propuesta personalizada en menos de 24 horas, sin compromiso.',
    primary: { label: 'Solicitar propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
    tone: 'gold' as const,
  },
  // ItemList (schema) — los servicios ofrecidos en Houston, cada uno a su landing.
  itemList: [
    { name: 'Diseño Web en Houston', path: '/es/houston/diseno-web' },
    { name: 'SEO Local en Houston', path: '/es/houston/seo-local' },
    { name: 'IA Conversacional en Houston', path: '/es/houston/ia-conversacional' },
    { name: 'SEO para IA en Houston', path: '/es/houston/seo-para-ia' },
    { name: 'Tienda en Línea en Houston', path: '/es/houston/ecommerce' },
    { name: 'Branding e Identidad en Houston', path: '/es/houston/branding' },
  ] as ListLink[],
};
