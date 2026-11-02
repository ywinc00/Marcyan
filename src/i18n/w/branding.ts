// ─────────────────────────────────────────────────────────────
// Copy NUEVO de la landing v3 de branding (design/rediseno-workos.md §4.18, ola 2).
// Solo textos libres: eyebrow, bajada, títulos de sección, textos de los objetos de
// ejemplo y de las tarjetas. Lo congelado (H1, answer, faq, local.paragraphs, service,
// meta, breadcrumb, cta.title, pricing.note) se pinta tal cual desde clusters.ts.
// La marca de los objetos es la de EJEMPLO "Tu Marca" (nunca Julio's ni otro cliente,
// E-32/E-47). Reglas de copy: sin guiones como conector, nada inventado, precios
// solo de pricing.ts (aquí no se escribe ninguno: los pone kinds/branding.ts).
// Solo ES: la landing de branding no tiene espejo en inglés.
// ─────────────────────────────────────────────────────────────

export interface BrandingCopy {
  chip: string;
  cityName: string;
  eyebrow: string;
  /** Cola del H1. Se omite: H1 + cola no caben en 2 líneas en el hero partido (§2.14);
   *  la idea pasa a la bajada. Se conserva para el informe. */
  tail?: string;
  lead: string;
  primary: string;
  link: string;
  entregables: { label: string; title: string; lead: string; specsLabel: string; specs: { k: string; v: string; note?: string }[] };
  marca: {
    label: string; title: string; lead: string; chip: string;
    logo: { title: string; text: string; main: string; variants: [string, string, string] };
    colores: { title: string; text: string; swatches: { role: string; name: string; hex: string }[] };
    tipo: { title: string; text: string; display: string; body: string; sampleH: string; sampleP: string };
    web: { title: string; text: string };
  };
  prosa: { tone1: string; tone2: string };
  caso: { label: string; title: string; lead: string };
  precio: { eyebrow: string; title: string; cta: string };
  franja: { queEs: string; desdeT: string; tiempoT: string; desde: (logo: string, marca: string) => string; tiempo: string; verQue: string; verPrecios: string; pedir: string };
  hermanas: { title: string; lead: string; portafolio: { title: string; text: string }; diag: { title: string; text: string }; precios: { title: string; text: string } };
  cierre: { proof: string; warmTitle: string; warmText: string; warmCta: string; ask: string };
}

export const brandingCopy: BrandingCopy = {
  chip: 'Houston, TX',
  cityName: 'Houston',
  eyebrow: 'Marca',
  tail: 'que se reconoce a una cuadra.',
  lead: 'Logo, colores, tipografía y una guía para usarlos. Una marca a medida y en español que se reconoce a una cuadra: en tu rótulo, en tu camioneta y en tu web.',
  primary: 'Quiero mi marca',
  link: 'Ver precios',

  // Revisión 1 (I-2, E-10): la lista de entregables ya está en el plano del hero; la 01
  // se queda solo con lo que no se repite (cómo trabajamos), con datos de clusters.ts
  // (includes, local, pricing) y la política de plazos.
  entregables: {
    label: 'El encargo',
    title: 'Una marca pensada, no una plantilla',
    lead: 'Lo que recibes está en el plano, pieza por pieza. Así trabajamos contigo para llegar ahí.',
    specsLabel: 'Ficha del encargo',
    specs: [
      { k: 'Criterio', v: 'De diseñador', note: 'Muchas direcciones exploradas, una decisión pensada.' },
      { k: 'Diseño', v: 'A medida', note: 'Sin plantillas: tu marca parte de tu negocio.' },
      { k: 'Idioma', v: 'En español', note: 'Te acompañamos en español de principio a fin.' },
      { k: 'Propuesta', v: 'En 24 horas', note: 'Clara, por escrito y sin compromiso.' },
      { k: 'Pago', v: 'Por proyecto', note: 'El precio depende del alcance: solo el logo o la marca completa.' },
      { k: 'Tu web', v: 'Opcional', note: 'Si la sumas, nace coherente con tu marca.' },
    ],
  },

  marca: {
    label: 'De la marca a todo lo demás',
    title: 'Una marca que se ve igual en todos lados',
    lead: 'Empieza por el logo y crece hasta tu web. Todo sale de la misma marca, así se ve coherente desde el primer día.',
    chip: 'La misma marca, de la tarjeta a la web',
    logo: {
      title: 'Tu logo',
      text: 'Diseñado desde cero, con su versión horizontal, vertical e icono.',
      main: 'Principal',
      variants: ['Horizontal', 'Icono', 'Negativo'],
    },
    colores: {
      title: 'Tus colores',
      text: 'Con el branding completo: paleta, tipografía y guía de uso.',
      swatches: [
        { role: 'Principal', name: 'Azul', hex: '#2F5266' },
        { role: 'Acento', name: 'Dorado', hex: '#C8A96E' },
        { role: 'Fondo', name: 'Crema', hex: '#F0EDE8' },
        { role: 'Texto', name: 'Tinta', hex: '#0E0E0D' },
      ],
    },
    tipo: {
      title: 'Tu tipografía',
      text: 'Va con tus colores: la voz escrita de tu marca.',
      display: 'Titulares',
      body: 'Textos',
      sampleH: 'Tu Marca, en todos lados',
      sampleP: 'Una sola voz en el rótulo, en tus redes y en tu web.',
    },
    web: {
      title: 'Tu web',
      text: 'Tu marca aplicada a tu web, para que todo nazca coherente.',
    },
  },

  prosa: { tone1: 'Cómo lo hacemos.', tone2: 'Exploración amplia, decisiones de diseñador.' },

  caso: {
    label: 'Caso real',
    title: 'Una marca hecha desde cero',
    lead: 'Trabajo real para un negocio de Houston: de la marca al sitio, coherente de principio a fin.',
  },

  precio: { eyebrow: 'Inversión', title: 'Tu marca, con el precio a la vista', cta: 'Pedir mi propuesta' },

  franja: {
    queEs: 'Qué es',
    desdeT: 'Desde cuánto',
    tiempoT: 'En cuánto tiempo',
    desde: (logo, marca) => `${logo} el logo; ${marca.replace('Desde', 'desde')} la marca completa.`,
    tiempo: 'Propuesta en 24 horas. Te damos un calendario realista desde el inicio.',
    verQue: 'Ver qué incluye',
    verPrecios: 'Ver precios',
    pedir: 'Pedir propuesta',
  },

  hermanas: {
    title: "<span class='w-tone'>Tu marca es el comienzo.</span> Lo demás la pone a trabajar.",
    lead: 'Servicios de Marcyan en Houston que llevan tu marca a todos lados.',
    portafolio: { title: 'Portafolio', text: 'Marcas y sitios reales, hechos desde cero.' },
    diag: { title: 'Diagnóstico gratis', text: 'Revisa si tu negocio pierde clientes online.' },
    precios: { title: 'Precios', text: 'Todos los precios de entrada, a la vista.' },
  },

  cierre: {
    proof: "Julio's Landscape TX ya tiene su marca, su identidad y su sitio, creados desde cero.",
    warmTitle: '¿Dudas sobre tu marca?',
    warmText: 'Pregúntale a Marcy qué incluye y cómo empezamos.',
    warmCta: 'Pregúntale a Marcy',
    ask: 'Quiero saber qué incluye el diseño de logo y marca.',
  },
};
