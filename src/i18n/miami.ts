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

export const miamiHub = {
  meta: {
    title: 'Diseño de Páginas Web en Miami | Agencia hispana: web, IA y SEO | Marcyan',
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
    kicker: 'Agencia local',
    h1: 'Diseño de páginas web en <em>Miami</em>',
    sub: 'Una sola agencia hispana para tu sitio, tu IA y tu SEO local en Miami — a medida, bilingüe y con precios públicos. Hecho para cómo busca de verdad tu cliente cubano, venezolano o colombiano.',
    primary: { label: 'Quiero mi propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver precios y planes', href: '/es/precios' },
    chips: ['El español de Miami', 'Precios públicos', 'Todo Miami-Dade'],
    tone: 'gold' as const,
  },
  answer: {
    q: '¿Por qué elegir una agencia hispana de diseño web en Miami?',
    a: 'Porque en Miami el español es la lengua del comercio: cerca del 69% de Miami-Dade es hispano, según el U.S. Census Bureau. Una agencia que habla el español de tus clientes — cubano, venezolano, colombiano — y construye para que te encuentren en Google y en la IA te conecta mejor con tu mercado que una operación genérica.',
    source: 'U.S. Census Bureau, ACS 2023',
  },
  services: {
    tag: 'Servicios en Miami',
    title: 'Todo para tu negocio, en una <em>sola agencia</em>',
    links: [
      { label: 'Diseño web en Miami', href: '/es/miami/diseno-web', desc: 'Sitios a medida, rápidos y bilingües. Desde $1,500.', icon: 'lucide:layout-template' },
      { label: 'SEO local en Miami', href: '/es/miami/seo-local', desc: 'Aparece en Google Maps y en la IA. Desde $600/mes.', icon: 'lucide:search' },
      { label: 'IA conversacional en Miami', href: '/es/miami/ia-conversacional', desc: 'Asistentes que contestan WhatsApp y agendan 24/7. Desde $900.', icon: 'lucide:bot-message-square' },
      { label: 'Tienda en línea en Miami', href: '/es/miami/ecommerce', desc: 'E-commerce que vende, con pagos y catálogo. Desde $2,900.', icon: 'lucide:shopping-bag' },
    ] as RelatedLink[],
  },
  local: {
    tag: 'Miami',
    title: 'Conocemos el <em>Miami hispano</em>',
    paragraphs: [
      'Miami-Dade es uno de los mercados más latinos de Estados Unidos: cerca del 69% de su población es hispana. Pero no es un bloque uniforme: es cubano de raíz, con Doral venezolano, Kendall y Brickell colombianos, Hialeah cubano y Sweetwater nicaragüense. Le hablamos a cada uno en su español, no en un genérico.',
      '<strong>Seamos transparentes:</strong> apenas estamos abriendo nuestra operación en Miami, así que todavía no mostramos casos locales. Lo que sí mostramos es trabajo real y verificable que ya hicimos en Houston y Orlando — y buscamos a nuestros primeros Clientes Fundadores de Miami. Trabajamos toda el área de Miami-Dade como negocio de área de servicio, en español e inglés.',
    ],
    tone: 'gold' as const,
  },
  related: {
    tag: 'Sigue explorando',
    title: 'Precios y más',
    links: [
      { label: 'Precios y planes', href: '/es/precios', desc: 'Todos los servicios con su precio de arranque y qué incluyen.', icon: 'lucide:tag' },
      { label: 'SEO para IA (que la IA te recomiende)', href: '/es/houston/seo-para-ia', desc: 'Que ChatGPT y Gemini te recomienden. Diagnóstico gratis.', icon: 'lucide:sparkles' },
      { label: 'Agencia en Houston', href: '/es/houston', desc: 'Nuestra base de operaciones, con casos verificables.', icon: 'lucide:map-pin' },
    ] as RelatedLink[],
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Agencia en Miami, <em>sin rodeos</em>',
    items: [
      { q: '¿Qué servicios ofrecen en Miami?', a: 'Diseño y desarrollo web a medida, SEO local, IA conversacional (asistentes que atienden 24/7) y tiendas en línea; también branding y SEO para IA. Todo bilingüe en español e inglés, y pensado para el mercado hispano de Miami. Puedes tomar un solo servicio o un paquete coordinado.' },
      { q: '¿Tienen clientes u oficina en Miami?', a: 'Seremos honestos: estamos comenzando nuestra operación en Miami, así que todavía no tenemos casos publicados de esta ciudad ni una dirección pública (trabajamos como negocio de área de servicio). Sí tenemos trabajo real y verificable hecho en Houston y Orlando, con enlaces que puedes visitar. Por eso ofrecemos cupos de Cliente Fundador en Miami.' },
      { q: '¿Trabajan en el español de Miami?', a: 'Sí. Somos un equipo bilingüe enfocado en el mercado hispano de Estados Unidos. En Miami eso significa el español que de verdad se habla aquí — cubano, venezolano, colombiano — y también inglés. Escribimos y configuramos para cómo de verdad habla y busca tu cliente, no en un español genérico.' },
      { q: '¿Atienden toda el área de Miami?', a: 'Sí. Cubrimos Miami-Dade y su área metropolitana — Doral, Hialeah, Kendall, Coral Gables, Brickell, Aventura y más — como negocio de área de servicio, de forma remota y eficiente. No necesitas ir a una oficina: todo el proceso, de la propuesta a la entrega, lo hacemos en línea y en tu idioma.' },
      { q: '¿Cuánto cuestan sus servicios en Miami?', a: 'Publicamos nuestros precios de arranque: diseño web desde $1,500, IA desde $900, tienda en línea desde $2,900 y SEO local desde $600 al mes. El precio final depende del alcance, y siempre te lo damos por escrito antes de empezar. Puedes verlos todos en nuestra página de precios.' },
      { q: '¿Por qué una agencia hispana nueva en Miami y no una ya establecida?', a: 'Porque hablamos tu idioma de verdad, tenemos presencia local real (no somos una operación remota anónima) y trabajamos con honestidad: precios públicos, sin contratos forzados y sin prometer el «#1». Somos nuevos en Miami, pero con trabajo verificable, y a nuestros Clientes Fundadores les damos dedicación y condiciones especiales.' },
    ] as FaqItem[],
  },
  cta: {
    title: '¿Listo para crecer en <em>Miami</em>?',
    sub: 'Cuéntanos sobre tu negocio y recibe una propuesta personalizada en menos de 24 horas, sin compromiso.',
    primary: { label: 'Solicitar propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
    tone: 'gold' as const,
  },
  // ItemList (schema) — los servicios ofrecidos en Miami, cada uno a su landing.
  itemList: [
    { name: 'Diseño Web en Miami', path: '/es/miami/diseno-web' },
    { name: 'SEO Local en Miami', path: '/es/miami/seo-local' },
    { name: 'IA Conversacional en Miami', path: '/es/miami/ia-conversacional' },
    { name: 'Tienda en Línea en Miami', path: '/es/miami/ecommerce' },
  ] as ListLink[],
};
