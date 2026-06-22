// ─────────────────────────────────────────────────────────────
// CONTENIDO · /es/servicios — catálogo completo de servicios (hub).
// Reúne los 7 productos (con sus niveles) en una sola página navegable,
// reusando los componentes del DS. Las tarjetas de precio salen de
// priceServices (i18n/pricing); aquí vive el copy de la página + el schema.
// ES por ahora (hasEn=false). Honestidad dura: sin #1/garantías, Miami sin
// claims locales, precios solo los publicados.
// ─────────────────────────────────────────────────────────────

import type { CrumbItem, FaqItem, ListLink } from '../lib/schema';
import type { RelatedLink } from './clusters';

export const serviciosPage = {
  meta: {
    title: 'Servicios — Diseño web, IA y SEO en Houston y Miami | Marcyan',
    description:
      'El catálogo completo de Marcyan: diseño web desde $400, IA conversacional desde $500, SEO para IA con diagnóstico gratis, e-commerce, SEO local, branding y mantenimiento. Precios públicos.',
  },
  path: '/es/servicios',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Servicios', path: '/es/servicios' },
  ] as CrumbItem[],
  hero: {
    kicker: 'Servicios',
    h1: 'Todo lo que tu marca <em>necesita</em>',
    sub: 'Siete servicios para hacer crecer tu negocio en Houston y Miami: diseño web, IA, SEO para que te encuentre la IA, tiendas en línea, SEO local, branding y mantenimiento. Cada uno empieza con una opción accesible y crece según lo que necesites.',
    primary: { label: 'Quiero mi propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver precios a detalle', href: '/es/precios' },
    chips: ['7 servicios, desde $150', 'Diagnóstico de IA gratis', 'Precios públicos'],
    tone: 'gold' as const,
  },
  answer: {
    q: '¿Qué servicios ofrece Marcyan?',
    a: 'Marcyan ofrece siete servicios para PYMEs en Houston y Miami: diseño web (desde $400), IA conversacional (desde $500), SEO para IA con diagnóstico gratis, tiendas en línea (desde $900), SEO local (desde $300), branding (desde $150) y mantenimiento (desde $120 al mes). Cada uno empieza con una opción accesible y crece según lo que necesites, siempre con precio por escrito.',
  },
  grid: {
    tag: 'El catálogo',
    title: 'Cada servicio, con su <em>punto de partida</em>',
    intro: 'Mostramos primero la opción más accesible de cada servicio. Toca cualquiera para ver el detalle, o pídenos una propuesta gratis con tu alcance exacto.',
  },
  related: {
    tag: 'Explora a fondo',
    title: 'Cada servicio en <em>detalle</em>',
    links: [
      { label: 'Diseño web en Houston', href: '/es/houston/diseno-web', desc: 'Landing, rediseño o sitio completo a medida, rápido y bilingüe.', icon: 'lucide:layout-template' },
      { label: 'IA para tu negocio', href: '/es/ia-para-pymes', desc: 'Asistentes que contestan, agendan y captan prospectos 24/7.', icon: 'marcyan-ai' },
      { label: 'SEO para IA en Houston', href: '/es/houston/seo-para-ia', desc: 'Que ChatGPT y Gemini te recomienden a ti. Diagnóstico gratis.', icon: 'marcyan-ai' },
      { label: 'SEO local en Houston', href: '/es/houston/seo-local', desc: 'Aparece en Google Maps y en la búsqueda local de tu zona.', icon: 'lucide:search' },
      { label: 'Tienda en línea en Houston', href: '/es/houston/ecommerce', desc: 'Catálogo, carrito y pagos seguros para vender en línea.', icon: 'lucide:shopping-bag' },
      { label: 'Branding en Houston', href: '/es/houston/branding', desc: 'Desde solo el logo hasta una identidad de marca completa.', icon: 'lucide:palette' },
      { label: 'Precios y qué incluye', href: '/es/precios', desc: 'Todas las tarifas publicadas, sin letra pequeña.', icon: 'lucide:tag' },
    ] as RelatedLink[],
  },
  why: {
    tag: 'Por qué Marcyan',
    title: 'Lo que nos hace <em>distintos</em>',
    items: [
      { icon: 'lucide:languages', title: 'Bilingüe de verdad', desc: 'Tu sitio en español e inglés real, no un botón de Google Translate. Nuestro propio sitio es bilingüe.' },
      { icon: 'marcyan-ai', title: 'Te encuentra la IA', desc: 'Construimos en HTML rápido que ChatGPT, Gemini y Meta AI sí pueden leer, para que aparezcas cuando preguntan por lo que ofreces.' },
      { icon: 'lucide:tag', title: 'Precios públicos', desc: 'Publicamos todo, hasta el SEO mensual y el mantenimiento. Sin letra pequeña ni sorpresas en la factura.' },
      { icon: 'lucide:map-pin', title: 'Presencia local real', desc: 'Te atendemos en Houston y Miami, en tu idioma y tu zona horaria, no una operación remota anónima.' },
    ],
    tone: 'gold' as const,
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Sobre nuestros servicios, <em>sin rodeos</em>',
    items: [
      {
        q: '¿Qué servicio necesito para empezar?',
        a: 'Depende de tu punto de partida. Si no tienes sitio, suele empezar por una landing o un sitio web; si ya tienes y no te llegan clientes, por SEO local o SEO para IA; y si pierdes llamadas, por un asistente con IA. En la propuesta gratis te decimos con honestidad por dónde conviene empezar según tu negocio.',
      },
      {
        q: '¿Puedo combinar varios servicios?',
        a: 'Sí, y suele ser lo más efectivo: por ejemplo, un sitio nuevo más SEO local, o un asistente con IA más SEO para IA. Armamos un alcance combinado con su precio claro por escrito, y puedes empezar por una parte y crecer cuando quieras.',
      },
      {
        q: '¿El diagnóstico de visibilidad en IA es de verdad gratis?',
        a: 'Sí, sin costo ni compromiso. Revisamos si ChatGPT, Gemini y Meta AI pueden encontrarte y recomendarte, y te decimos con honestidad cómo estás. Si después quieres que trabajemos los cimientos o el monitoreo, esos sí tienen precio publicado; el diagnóstico no.',
      },
      {
        q: '¿Trabajan a medida o con plantillas?',
        a: 'Todo a medida. Diseñamos y programamos cada proyecto desde cero alrededor de tu marca, sin plantillas recicladas. Por eso el precio es un ancla «desde $» y no una tarifa fija: el alcance real lo definimos contigo en la propuesta.',
      },
      {
        q: '¿Atienden solo a Houston y Miami?',
        a: 'Nuestro enfoque es Houston y Miami, donde damos contexto local y atención en tu zona horaria. Trabajamos como negocio de área de servicio, de forma remota y eficiente, así que también hemos entregado proyectos en otras ciudades. Cuéntanos dónde estás y lo vemos.',
      },
    ] as FaqItem[],
  },
  cta: {
    title: 'Cuéntanos qué necesitas, <em>te orientamos gratis</em>',
    sub: 'En menos de 24 horas recibes una propuesta con el servicio (o la combinación) que mejor te conviene, con alcance y precio claros, sin compromiso.',
    primary: { label: 'Solicitar propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver formulario completo', href: '/formulario' },
    tone: 'gold' as const,
  },
  // Schema ItemList — los 7 servicios apuntando a su página real (o al hub).
  itemList: [
    { name: 'Diseño Web', path: '/es/houston/diseno-web' },
    { name: 'IA Conversacional', path: '/es/ia-para-pymes' },
    { name: 'SEO para IA (Visibilidad en IA)', path: '/es/houston/seo-para-ia' },
    { name: 'E-Commerce & Tiendas', path: '/es/houston/ecommerce' },
    { name: 'SEO Local', path: '/es/houston/seo-local' },
    { name: 'Branding & Identidad', path: '/es/houston/branding' },
    { name: 'Mantenimiento Continuo', path: '/es/servicios' },
  ] as ListLink[],
};
