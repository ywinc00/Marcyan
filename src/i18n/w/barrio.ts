// ─────────────────────────────────────────────────────────────
// Copy NUEVO de las landings v3 de barrio (design/rediseno-workos.md §4.20, ola 2).
// Solo textos libres: bajada del hero, títulos de sección, rótulos y líneas de las
// tarjetas. Lo congelado (H1, answer, faq, local.paragraphs, service, meta,
// breadcrumb) y lo libre que ya existe y se reutiliza tal cual (badge, local.title,
// includes.items, pricing.title/lead/features/note, proof.title, cta.title) se pinta
// desde clusters.ts, que no se toca.
// Reglas de copy: sin guiones como conector, "dominamos" la IA, nada inventado,
// precios solo de pricing.ts (aquí no se escribe ninguno).
// ─────────────────────────────────────────────────────────────

export type Barrio = 'katy' | 'sugar-land' | 'doral' | 'hialeah';
export type BarrioCity = 'houston' | 'miami';

export interface BarrioCopy {
  /** Nombre corto del barrio (filas de la matriz, resumen del chip). */
  name: string;
  city: BarrioCity;
  cityName: string;
  /** Bajada del hero (19 px, centrada). */
  lead: string;
  /** Rótulo del enlace secundario del hero (a #precios). */
  link: string;
  servicios: { title: string; lead: string };
  zonas: { title: string; lead: string };
  /** Titular de la prosa local a dos tonos (sale de local.title, sin la etiqueta). */
  prosa: { tone1: string; tone2: string; items: number[] };
  caso: { lead: string };
  cierre: { proof: string };
  /** v6 · portada: el producto que promete la bajada + la píldora quién → qué → resultado
   *  (WorkOS W-EVT-06). Todo es ejemplo y va rotulado en el objeto. */
  escena: {
    producto: 'planeta' | 'pasaporte' | 'bilingue' | 'chat';
    pildora: { quien: string; que: string; resultado: string; icon?: string };
    /** Guion del chat (solo producto 'chat'). */
    chat?: { from: 'c' | 'm'; text: string; time?: string }[];
    /** Tarjetas inclinadas de los lados (Hialeah). */
    lados?: { quien: string; texto: string }[];
  };
  /** v6 · ciclo «cómo llega un cliente» con la búsqueda del barrio (WorkOS W-PROOF-11). */
  ciclo: { busca: string; zona: string };
}

const comun = {
  serviciosLabel: 'Servicios en tu barrio',
  zonasLabel: 'Zonas que cubrimos',
  precioLabel: 'Inversión',
  casoLabel: 'Trabajo real',
  precioName: (b: string) => `Tu web en ${b}`,
  precioCta: 'Pedir propuesta',
  precioNoteTitle: '¿Qué se suma y cuándo?',
  tiersLabel: 'Precios',
  includesLabel: 'Qué incluye',
  // Zonas (vuelta 3): lista de zonas con su mapa real, en lugar de la tabla.
  zonasLista: (c: string, n: number) => `Área de ${c} · ${n} zonas`,
  zonasMapa: (b: string, c: string) => `Mapa del área de ${c} con sus zonas y ${b} encendida`,
  zonasTag: { here: 'Esta página', own: 'Página propia' },
  zonasServicios: (z: string) => `Servicios en ${z}`,
  fichaCaption: (b: string) => `Lo que ve quien te busca en ${b}: tu ficha en el mapa, con llamar, cómo llegar y tu web.`,
  recursos: {
    hub: (c: string) => ({ title: `${c} y sus zonas`, text: `Todo lo que hacemos en el área de ${c}.` }),
    diag: { title: 'Diagnóstico gratis', text: 'Revisa si tu negocio pierde clientes online.' },
    precios: { title: 'Precios', text: 'Todos los precios de entrada, a la vista.' },
  },
  franja: {
    queEs: 'Qué es',
    verQue: 'Ver qué incluye',
    desdeTitle: 'Desde cuánto',
    desde: (web: string, seo: string, ia: string) => `${web} el sitio; el SEO local ${seo} y la IA ${ia}, si los necesitas.`,
    verPrecios: 'Ver todos los precios',
    tiempoTitle: 'En cuánto tiempo',
    tiempo: 'Propuesta en 24 horas. Te damos un calendario realista desde el inicio.',
    pedir: 'Pedir propuesta',
  },
  warm: {
    warmTitle: '¿Aún no sabes qué necesitas?',
    warmText: 'Revisa gratis si tu negocio está perdiendo clientes online.',
    warmCta: 'Hacer el diagnóstico',
  },
};
export const barrioComun = {
  ...comun,
  // v6 · «Qué recibe tu negocio»: celdas con mini pantalla (WorkOS W-CORE-08), como «Más que una web».
  recibeLabel: 'Qué recibe tu negocio',
  recibeTitle: (b: string) => `<span class="w-tone">No es solo una web.</span> Es cómo te encuentran y te escriben en ${b}.`,
  recibeLead: 'Cuatro piezas que trabajan juntas. Cada una tiene su página con lo que incluye y desde cuánto.',
  recibe: (b: string) => [
    { id: 'diseno-web', tag: 'Tu web', title: 'Rápida en el celular, en español e inglés', text: `Lo primero que ven en ${b}: tus servicios, tu zona y un botón para llamar.`, link: 'Ver diseño web' },
    { id: 'seo-local', tag: 'Tu ficha del mapa', title: 'Completa y con tu zona', text: `Horario, fotos y reseñas al día, para que te elijan cuando buscan cerca de ${b}.`, link: 'Ver SEO local' },
    { id: 'ia-conversacional', tag: 'Marcy', title: 'Contesta aunque estés ocupado', text: 'Responde por chat y WhatsApp, agenda y te pasa lo que necesita una persona.', link: 'Ver IA conversacional' },
    { id: 'seo-ia', tag: 'Te encuentran', title: 'En Google, en Maps y en la IA', text: `Trabajamos las búsquedas que hacen en ${b} para que el que salga seas tú.`, link: 'Ver SEO para IA' },
  ],
  tambien: 'También:',
  cicloLabel: 'Cómo llega un cliente',
  cicloTitle: (b: string) => `<span class="w-tone">Te buscan en ${b}.</span> Te encuentran a ti.`,
  cicloLead: 'Lo que pasa entre la búsqueda y la llamada, sin que tengas que estar pendiente.',
  cicloU: { title: 'De la búsqueda al cliente', sub: 'Cuatro pasos, tú solo contestas al final.' },
  cicloNodes: (busca: string, zona: string): [{ icon: string; label: string; text: string }, { icon: string; label: string; text: string }, { icon: string; label: string; text: string }, { icon: string; label: string; text: string }] => [
    { icon: 'lucide:search', label: 'Busca en su zona', text: `Escribe «${busca}» desde ${zona}.` },
    { icon: 'lucide:map-pin', label: 'Te encuentra', text: 'Sales en el mapa y en la IA con tu ficha completa.' },
    { icon: 'lucide:message-circle', label: 'Marcy contesta', text: 'Le responde al momento y guarda sus datos.' },
    { icon: 'lucide:bell', label: 'Te llega el aviso', text: 'Lo llamas tú con todo el contexto.' },
  ],
  prosaMore: 'Seguir leyendo',
};

export const barrioCopy: Record<Barrio, BarrioCopy> = {
  katy: {
    name: 'Katy',
    city: 'houston',
    cityName: 'Houston',
    lead: 'Tu negocio, en el mapa de Katy. Una web bilingüe y rápida en el celular, con SEO local para que las familias de Cinco Ranch y Cross Creek Ranch te encuentren.',
    link: 'Ver precios',
    servicios: {
      title: '<span class="w-tone">Lo que hacemos en Houston,</span> también en Katy.',
      lead: 'Katy es parte del área de Houston que ya atendemos. Cada servicio tiene su página con lo que incluye y desde cuánto.',
    },
    zonas: {
      title: '<span class="w-tone">Todo el área de Houston,</span> con Katy encendida.',
      lead: 'Elige una zona para ver sus servicios. Donde una zona no tiene página propia, cada servicio te lleva a su página de Houston.',
    },
    prosa: { tone1: 'En Katy, el cliente busca', tone2: 'por su zona, no por «Houston».', items: [1, 2, 3, 5] },
    escena: { producto: 'planeta', pildora: { quien: 'Vecino en Cinco Ranch', que: '«taller mecánico abierto»', resultado: 'Pidió cómo llegar' } },
    ciclo: { busca: 'taller mecánico abierto', zona: 'Cinco Ranch' },
    caso: { lead: 'Nuestro trabajo publicado es del área de Houston y lo rotulamos por su ciudad real.' },
    cierre: { proof: 'Hacemos sitios para negocios reales del área de Houston, como Julio’s Landscape TX y Texas Rush Remove.' },
  },
  'sugar-land': {
    name: 'Sugar Land',
    city: 'houston',
    cityName: 'Houston',
    lead: 'Tu negocio, en el mapa de Sugar Land. Una web premium y bilingüe, a la altura de Town Square y First Colony, con SEO local por zona.',
    link: 'Ver precios',
    servicios: {
      title: '<span class="w-tone">Lo que hacemos en Houston,</span> también en Sugar Land.',
      lead: 'Sugar Land es parte del área de Houston que ya atendemos. Cada servicio tiene su página con lo que incluye y desde cuánto.',
    },
    zonas: {
      title: '<span class="w-tone">Todo el área de Houston,</span> con Sugar Land encendida.',
      lead: 'Elige una zona para ver sus servicios. Donde una zona no tiene página propia, cada servicio te lleva a su página de Houston.',
    },
    prosa: { tone1: 'Sugar Land', tone2: 'no es un mercado cualquiera.', items: [0, 1, 2, 4] },
    escena: { producto: 'pasaporte', pildora: { quien: 'Cliente en First Colony', que: 'abre tu web', resultado: 'Pidió presupuesto', icon: 'lucide:globe' } },
    ciclo: { busca: 'salón de belleza cerca de mí', zona: 'First Colony' },
    caso: { lead: 'Nuestro trabajo publicado es del área de Houston y lo rotulamos por su ciudad real.' },
    cierre: { proof: 'Hacemos sitios para negocios reales del área de Houston, como Julio’s Landscape TX y Texas Rush Remove.' },
  },
  doral: {
    name: 'Doral',
    city: 'miami',
    cityName: 'Miami',
    lead: 'Tu negocio, en el mapa de Doral. Web bilingüe, SEO local y un asistente con IA que contesta por chat, para que el cliente te encuentre y te escriba.',
    link: 'Ver precios',
    servicios: {
      title: '<span class="w-tone">Lo que hacemos en Miami,</span> también en Doral.',
      lead: 'Doral es parte del área de Miami que atendemos. Cada servicio tiene su página con lo que incluye y desde cuánto.',
    },
    zonas: {
      title: '<span class="w-tone">Todo el área de Miami,</span> con Doral encendida.',
      lead: 'Elige una zona para ver sus servicios. Donde una zona no tiene página propia, cada servicio te lleva a su página de Miami.',
    },
    prosa: { tone1: 'Doral no es «Miami genérico»:', tone2: 'es Doralzuela.', items: [0, 1, 2, 3] },
    escena: { producto: 'bilingue', pildora: { quien: 'Cliente en Doral', que: '«freight forwarder near me»', resultado: 'Cotizó en inglés' } },
    ciclo: { busca: 'agencia de carga en Doral', zona: 'Doral' },
    caso: { lead: 'Nuestro trabajo publicado es de Houston y de Florida (Orlando), y lo rotulamos por su ciudad real.' },
    cierre: { proof: 'Hacemos sitios para negocios reales, como Move Junk Away en Orlando, Florida.' },
  },
  hialeah: {
    name: 'Hialeah',
    city: 'miami',
    cityName: 'Miami',
    lead: 'Tu negocio, en el mapa de Hialeah. Web rápida en español, ficha de Google ordenada y respuesta inmediata cuando el cliente te escribe.',
    link: 'Ver precios',
    servicios: {
      title: '<span class="w-tone">Lo que hacemos en Miami,</span> también en Hialeah.',
      lead: 'Hialeah es parte del área de Miami que atendemos. Cada servicio tiene su página con lo que incluye y desde cuánto.',
    },
    zonas: {
      title: '<span class="w-tone">Todo el área de Miami,</span> con Hialeah encendida.',
      lead: 'Elige una zona para ver sus servicios. Donde una zona no tiene página propia, cada servicio te lleva a su página de Miami.',
    },
    prosa: { tone1: 'En Hialeah, el español', tone2: 'es el negocio.', items: [0, 2, 3, 4] },
    escena: { producto: 'chat', pildora: { quien: 'Cliente en Hialeah', que: '«¿abren hoy?»', resultado: 'Respondido al instante', icon: 'lucide:message-circle' },
      chat: [
        { from: 'c', text: 'Oye, ¿abren hoy? El aire del carro echa caliente.', time: '9:12' },
        { from: 'm', text: '¡Buenos días! Sí, hasta las 6:00 p. m. Tráelo a las 11:00 y te lo revisan.', time: '9:12' },
        { from: 'c', text: 'Perfecto, allá voy.', time: '9:13' },
      ],
      lados: [
        { quien: 'Panadería en la 49', texto: '¿Les quedan pastelitos de guayaba?' },
        { quien: 'Uñas en Palm Ave', texto: '¿Tienen turno el sábado por la mañana?' },
        { quien: 'Notaría', texto: '¿Hacen traducciones certificadas?' },
      ] },
    ciclo: { busca: 'mecánico en Hialeah', zona: 'Hialeah' },
    caso: { lead: 'Nuestro trabajo publicado es del área de Houston y lo rotulamos por su ciudad real.' },
    cierre: { proof: 'Hacemos sitios para negocios reales del área de Houston, como Texas Rush Remove.' },
  },
};

/** Zonas de cada ciudad, las mismas del mapa de su hub (src/components/city/cities.js). */
export const zonasCiudad: Record<BarrioCity, { name: string; page?: string }[]> = {
  houston: [
    { name: 'Houston' },
    { name: 'Katy', page: '/es/houston/katy' },
    { name: 'Sugar Land', page: '/es/houston/sugar-land' },
    { name: 'The Woodlands' },
    { name: 'Pearland' },
    { name: 'Pasadena' },
  ],
  miami: [
    { name: 'Miami' },
    { name: 'Doral', page: '/es/miami/doral' },
    { name: 'Hialeah', page: '/es/miami/hialeah' },
    { name: 'Miami Beach' },
    { name: 'Coral Gables' },
    { name: 'Kendall' },
    { name: 'Aventura' },
  ],
};

export const barrioOf = (path: string): Barrio => {
  const slug = path.split('/').pop() as Barrio;
  if (!(slug in barrioCopy)) throw new Error(`barrio: ${path} no es una landing de barrio`);
  return slug;
};
