// ─────────────────────────────────────────────────────────────
// Copy v3 de Sobre nosotros · /es/sobre-nosotros y /en/about (design/rediseno-workos.md §4.6).
// SOLO el copy NUEVO o reubicado de la página v3. Lo congelado (meta, path, breadcrumb,
// hero.h1, answer, faq, story) sigue en i18n/sobre-nosotros(.en).ts y se pinta literal.
// Reglas: sin guiones conectores, "dominamos" la IA, nada inventado (ni cifras ni reseñas);
// los datos de la ficha salen de hechos ya publicados (políticas de contacto y propuesta,
// precios públicos, clientes que la IA ya recomienda: celda que el dueño mantiene, 1-nov).
// ─────────────────────────────────────────────────────────────

export interface SobreCopy {
  hero: { lead: string; chip: string; primary: string; link: string; linkHref: string };
  capitulo: { tone1: string; tone2: string };
  datos: { label: string; title: string; lead: string; cells: { k: string; v: string; note: string }[] };
  proceso: { label: string; title: string; lead: string };
  razones: { label: string; lead?: string };
  sedes: { label: string; title: string; lead: string; more: string; call: string };
  fundadores: { checks: [string, string, string]; cta: string; aria: string };
  salida: {
    portafolio: { title: string; text: string; cta: string; href: string };
    marcy: { title: string; text: string; cta: string; ask: string };
  };
  cierre: { warmTitle: string; warmText: string; warmCta: string; warmHref: string };
}

const es: SobreCopy = {
  hero: {
    lead: 'Dominamos la IA para que tu negocio no tenga que hacerlo. Web, asistentes y SEO local, en español e inglés de verdad.',
    chip: 'Houston y Miami',
    primary: 'Propuesta gratis',
    link: 'Ver portafolio',
    linkHref: '/es/portafolio',
  },
  capitulo: { tone1: 'Un estudio joven.', tone2: 'Con trabajo real.' },
  datos: {
    label: 'Datos, no adjetivos',
    title: 'Lo que puedes comprobar hoy',
    lead: 'Hechos que puedes verificar en esta misma web, no promesas.',
    cells: [
      { k: 'Ciudades', v: 'Houston y Miami', note: 'Negocio de área de servicio, atención directa en tu mercado.' },
      { k: 'Idiomas', v: 'Español e inglés', note: 'Escrito para cómo busca tu cliente, no Google Translate.' },
      { k: 'Precios', v: 'Públicos', note: 'Hasta el SEO mensual y el mantenimiento, sin letra chica.' },
      { k: 'Contacto', v: '1 hora hábil', note: 'Es lo que tardamos en responderte cuando nos escribes.' },
      { k: 'Propuesta', v: '24 horas', note: 'Tu propuesta personalizada, gratis y sin compromiso.' },
      { k: 'Visibilidad en IA', v: 'Clientes que la IA ya recomienda', note: 'La IA de Google ya incluye a clientes nuestros en algunas recomendaciones.' },
    ],
  },
  proceso: {
    label: 'Cómo es un proyecto',
    title: 'Del concepto al lanzamiento',
    lead: 'Cinco pasos, con los precios sobre la mesa desde el primero.',
  },
  razones: { label: 'Por qué Marcyan' },
  sedes: {
    label: 'Dónde estamos',
    title: 'Presentes donde tu negocio crece',
    lead: 'Trabajamos como negocio de área de servicio: en línea, en tu idioma y sin oficina pública.',
    more: 'Ver detalles',
    call: 'Llamar a',
  },
  fundadores: {
    checks: ['Atención prioritaria', 'Condiciones preferentes', 'Uno de nuestros casos de estudio locales'],
    cta: 'Pregunta por tu cupo',
    aria: 'Lo que recibe un Cliente Fundador',
  },
  salida: {
    portafolio: {
      title: 'Mira el portafolio',
      text: 'Cuatro negocios reales con su web, su SEO o su marca en vivo.',
      cta: 'Ver proyectos',
      href: '/es/portafolio',
    },
    marcy: {
      title: 'Habla con Marcy',
      text: 'Nuestra asistente te contesta ahora, en español o en inglés.',
      cta: 'Abrir el chat',
      ask: 'Hola Marcy, quiero saber más sobre Marcyan y cómo trabajan.',
    },
  },
  cierre: {
    warmTitle: '¿Aún no sabes qué necesitas?',
    warmText: 'Revisa gratis si tu negocio está perdiendo clientes online.',
    warmCta: 'Hacer el diagnóstico',
    warmHref: '/es/diagnostico',
  },
};

const en: SobreCopy = {
  hero: {
    lead: 'We master AI so your business doesn’t have to. Websites, AI assistants and local SEO, in English and Spanish that actually sound native.',
    chip: 'Houston and Miami',
    primary: 'Get my free proposal',
    link: 'View portfolio',
    linkHref: '/en/portfolio',
  },
  capitulo: { tone1: 'A young studio.', tone2: 'With real work.' },
  datos: {
    label: 'Facts, not adjectives',
    title: 'What you can check today',
    lead: 'Facts you can verify on this very site, not promises.',
    cells: [
      { k: 'Cities', v: 'Houston and Miami', note: 'Service-area business, with hands-on support in your market.' },
      { k: 'Languages', v: 'English and Spanish', note: 'Written for how your customer searches, not Google Translate.' },
      { k: 'Pricing', v: 'Public', note: 'Down to the monthly SEO and maintenance, no fine print.' },
      { k: 'Contact', v: '1 business hour', note: 'That is how fast we get back to you when you write.' },
      { k: 'Proposal', v: '24 hours', note: 'Your custom proposal, free and with no commitment.' },
      { k: 'AI visibility', v: 'Clients AI already recommends', note: 'Google’s AI already includes our clients in some recommendations.' },
    ],
  },
  proceso: {
    label: 'What a project looks like',
    title: 'From idea to launch',
    lead: 'Five steps, with pricing on the table from the first one.',
  },
  razones: { label: 'Why Marcyan' },
  sedes: {
    label: 'Where we are',
    title: 'Right where your business grows',
    lead: 'We work as a service-area business: online, in your language, with no public office.',
    more: 'See details',
    call: 'Call',
  },
  fundadores: {
    checks: ['Priority treatment', 'Preferential terms', 'One of our local case studies'],
    cta: 'Ask about your spot',
    aria: 'What a Founding Client gets',
  },
  salida: {
    portafolio: {
      title: 'See the portfolio',
      text: 'Four real businesses with their site, SEO or brand live.',
      cta: 'View projects',
      href: '/en/portfolio',
    },
    marcy: {
      title: 'Talk to Marcy',
      text: 'Our assistant answers right now, in English or Spanish.',
      cta: 'Open the chat',
      ask: 'Hi Marcy, I’d like to know more about Marcyan and how you work.',
    },
  },
  cierre: {
    warmTitle: 'Not sure what you need yet?',
    warmText: 'Check for free whether your business is losing customers online.',
    warmCta: 'Take the checkup',
    warmHref: '/en/checkup',
  },
};

export const sobreCopy = { es, en };
