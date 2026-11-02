// ─────────────────────────────────────────────────────────────
// Copy NUEVO de las landings v3 de diseño web (design/rediseno-workos.md §4.14,
// ola 1, piloto). Solo textos libres: eyebrow, cola, bajada, tríada, títulos de
// sección y textos de objetos. Lo congelado (H1, answer, faq, local.paragraphs,
// service, meta, breadcrumb) se pinta tal cual desde clusters.ts, que no se toca.
// Reglas de copy: sin guiones como conector, "dominamos" la IA, nada inventado
// (lo de ejemplo va en objetos rotulados "Ejemplo"), precios solo de pricing.ts.
// ─────────────────────────────────────────────────────────────

export type WebCity = 'houston' | 'miami';

export interface WebCopy {
  chip: string;
  cityName: string;
  eyebrow: string;
  tail: string;
  lead: string;
  primary: string;
  link: string;
  triada: [
    { tone1: string; tone2: string; text: string },
    { tone1: string; tone2: string; text: string },
    { tone1: string; tone2: string; text: string },
  ];
  proceso: { label: string; title: string; demoText: string; steps: string[]; log: string[]; done: string; working: string };
  escalera: { label: string; title: string; demoLead: string; chip: string; pages: string[]; antes: string; despues: string };
  bento: {
    tone1: string; tone2: string; sub: string;
    cells: { icon: string; label: string; titleHtml: string; text: string; tray?: boolean }[];
  };
  prosa: { tone1: string; tone2: string; items: { icon: string; title: string; text: string }[] };
  proyectos: { label: string; title: string; lead: string; more: string };
  precio: { eyebrow: string; title: string; specsLabel: string; cta: string; specs: { k: string; v: string; note?: string }[] };
  franja: { queEs: string; desde: (landing: string, medida: string) => string; tiempo: string; verQue: string; verPrecios: string; pedir: string };
  hermanas: { title: string; lead: string; guia: { title: string; text: string }; diag: { title: string; text: string }; precios: { title: string; text: string } };
  cierre: { proof: string; warmTitle: string; warmText: string; warmCta: string };
}

const triada: WebCopy['triada'] = [
  { tone1: 'Rápida.', tone2: 'Carga al instante.', text: 'HTML ligero que abre rápido en el celular, donde te buscan primero.' },
  { tone1: 'Bilingüe.', tone2: 'De verdad.', text: 'Español e inglés escritos desde el diseño, no un botón de traducir.' },
  { tone1: 'Encontrable.', tone2: 'En Google y en la IA.', text: 'Estructura y datos que Google y los asistentes de IA pueden leer.' },
];

const proceso: WebCopy['proceso'] = {
  label: 'Cómo se construye tu web',
  title: 'De tu negocio a tu web publicada',
  demoText: 'La propuesta llega en 24 horas y cada paso deja algo que puedes ver. Al final, tu web está publicada y conectada.',
  steps: [
    'Revisamos tu negocio y tu competencia',
    'Escribimos los textos en español e inglés',
    'Diseñamos y montamos tu web',
    'La conectamos a tu ficha de mapa y a Marcy',
    'Publicada',
  ],
  // Registro de la demo: lo que deja cada paso (no repite la lista). Objeto de ejemplo.
  log: [
    'informe-competencia.pdf',
    'textos-es.md · textos-en.md',
    'inicio · servicios · contacto',
    'ficha + Marcy: conectadas',
    'tunegocio.example: en línea',
  ],
  done: 'Web publicada',
  working: 'Publicando tu web',
};

const escalera: WebCopy['escalera'] = {
  label: 'Hazla tuya',
  title: 'Elige por dónde empezar',
  demoLead: 'Tres formas de tener tu web, con el precio de entrada a la vista. Empieza con una página y crece cuando lo necesites.',
  chip: 'Tus colores, tu letra, en español e inglés',
  // La misma web de ejemplo en las tres opciones, cambiando de alcance (control 2).
  pages: ['Inicio', 'Servicios', 'Zonas', '+2'],
  antes: 'Antes',
  despues: 'Después',
};

const bento: WebCopy['bento'] = {
  tone1: 'Una web bonita no basta.',
  tone2: 'Tiene que traerte clientes.',
  sub: 'Cada parte de tu web trabaja para que te encuentren, te entiendan y te escriban.',
  cells: [
    { icon: 'lucide:inbox', label: 'Formulario', titleHtml: 'Ningún contacto se pierde', text: 'Cada mensaje se guarda antes de avisarte, aunque falle el correo.' },
    { icon: 'lucide:languages', label: 'Idiomas', titleHtml: 'Tu web en inglés también', text: 'El visitante elige idioma y todo cambia, textos y botones.' },
    { icon: 'lucide:map-pin', label: 'Ficha de mapa', titleHtml: 'Conectada a tu ficha', text: 'Mismo nombre, teléfono y horario en tu web y en el mapa.' },
    { icon: 'lucide:message-circle', label: 'Marcy', titleHtml: 'Contesta a las 23:40', text: 'Tu asistente responde cuando tú ya cerraste.', tray: false },
  ],
};

const prosaItems: WebCopy['prosa']['items'] = [
  { icon: 'lucide:smartphone', title: 'Primero el celular', text: 'Pensada para la pantalla donde te buscan.' },
  { icon: 'lucide:languages', title: 'Dos idiomas', text: 'Español e inglés con el contexto correcto.' },
  { icon: 'lucide:map-pin', title: 'Tus zonas, claras', text: 'Los barrios y zonas donde trabajas, a la vista en tu web.' },
  { icon: 'lucide:search', title: 'Lista para buscar', text: 'SEO base y datos que la IA entiende.' },
];

const precio: WebCopy['precio'] = {
  eyebrow: 'Inversión',
  title: 'Tu web, con el precio a la vista',
  specsLabel: 'Qué incluye',
  cta: 'Pedir mi propuesta',
  specs: [
    { k: 'Diseño', v: 'A medida', note: 'Sin plantillas recicladas.' },
    { k: 'Páginas', v: 'Según el plan', note: 'Las que necesita tu negocio.' },
    { k: 'Idiomas', v: 'Español e inglés', note: 'Cada versión escrita para su público.' },
    { k: 'SEO', v: 'Base incluida', note: 'Títulos, datos y velocidad desde el inicio.' },
    { k: 'Contacto', v: 'Formulario integrado', note: 'Llamada y WhatsApp siempre a la vista.' },
    { k: 'Listo para', v: 'Móvil y la IA', note: 'Se lee bien en el teléfono y en los asistentes.' },
    { k: 'Propuesta', v: 'En 24 horas', note: 'Clara, por escrito y sin compromiso.' },
    { k: 'Propiedad', v: 'La web es tuya', note: 'Nunca te dejamos amarrado.' },
  ],
};

const franja: WebCopy['franja'] = {
  queEs: 'Qué es',
  desde: (landing, medida) => `${landing} una landing; ${medida} un sitio a medida.`,
  tiempo: 'Propuesta en 24 horas. Te damos un calendario realista desde el inicio.',
  verQue: 'Ver qué incluye',
  verPrecios: 'Ver precios',
  pedir: 'Pedir propuesta',
};

const warm = {
  warmTitle: '¿Aún no sabes qué necesitas?',
  warmText: 'Revisa gratis si tu negocio está perdiendo clientes online.',
  warmCta: 'Hacer el diagnóstico',
};

export const webCopy: Record<WebCity, WebCopy> = {
  houston: {
    chip: 'Houston, TX',
    cityName: 'Houston',
    eyebrow: 'Web rápida',
    tail: 'que te trae clientes.',
    lead: 'Webs a medida, rápidas y en español e inglés, para que tus clientes de Houston te encuentren y te escriban.',
    primary: 'Quiero mi web',
    link: 'Ver proyectos',
    triada,
    proceso,
    escalera,
    bento,
    prosa: { tone1: 'Por qué en Houston.', tone2: 'Un sitio pensado para tu mercado.', items: prosaItems },
    proyectos: {
      label: 'Proyectos',
      title: 'Webs nuestras, en uso',
      lead: 'Negocios reales de Houston con su sitio nuevo.',
      more: 'Más proyectos',
    },
    precio,
    franja,
    hermanas: {
      title: "<span class='w-tone'>Tu web es el centro.</span> Lo demás la hace crecer.",
      lead: 'Servicios de Marcyan en Houston que se conectan con tu web.',
      guia: { title: 'Guía de precios de una web', text: 'Cuánto cuesta una página web en Houston.' },
      diag: { title: 'Diagnóstico gratis', text: 'Revisa si tu negocio pierde clientes online.' },
      precios: { title: 'Precios', text: 'Todos los precios de entrada, a la vista.' },
    },
    cierre: { proof: 'Texas Rush Remove ya posiciona en su zona de Houston con su sitio nuevo.', ...warm },
  },
  miami: {
    chip: 'Miami, FL',
    cityName: 'Miami',
    eyebrow: 'Web rápida',
    tail: 'que te trae clientes.',
    lead: 'Webs a medida, rápidas y en español e inglés, para que tus clientes de Miami te encuentren y te escriban.',
    primary: 'Quiero mi web',
    link: 'Ver proyectos',
    triada,
    proceso,
    escalera,
    bento,
    prosa: { tone1: 'Por qué Miami.', tone2: 'Un mercado bilingüe por naturaleza.', items: prosaItems },
    proyectos: {
      label: 'Proyectos',
      title: 'Webs nuestras, en uso',
      lead: 'Trabajo real y verificable, hecho para negocios de Houston y de Florida (Orlando).',
      more: 'Más proyectos',
    },
    precio,
    franja,
    hermanas: {
      title: "<span class='w-tone'>Tu web es el centro.</span> Lo demás la hace crecer.",
      lead: 'Servicios de Marcyan que se conectan con tu web.',
      guia: { title: 'Guía de precios de una web', text: 'Cuánto cuesta una página web, con precios reales.' },
      diag: { title: 'Diagnóstico gratis', text: 'Revisa si tu negocio pierde clientes online.' },
      precios: { title: 'Precios', text: 'Todos los precios de entrada, a la vista.' },
    },
    cierre: { proof: 'Move Junk Away, en Orlando, ya posiciona en su zona con su sitio nuevo.', ...warm },
  },
};
