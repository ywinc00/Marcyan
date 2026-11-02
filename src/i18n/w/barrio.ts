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
  zonasTable: (b: string) => `Servicios por zona, con ${b} destacado`,
  zonasLegend: (b: string, c: string) => ({
    own: 'Zona con página propia',
    link: `Página del servicio en ${c}`,
    here: `Estás en ${b}`,
  }),
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
export const barrioComun = comun;

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
      lead: 'Cada casilla abre la página de ese servicio. Donde una zona no tiene página propia, te lleva a la de Houston.',
    },
    prosa: { tone1: 'En Katy, el cliente busca', tone2: 'por su zona, no por «Houston».', items: [1, 2, 3, 5] },
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
      lead: 'Cada casilla abre la página de ese servicio. Donde una zona no tiene página propia, te lleva a la de Houston.',
    },
    prosa: { tone1: 'Sugar Land', tone2: 'no es un mercado cualquiera.', items: [0, 1, 2, 4] },
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
      lead: 'Cada casilla abre la página de ese servicio. Donde una zona no tiene página propia, te lleva a la de Miami.',
    },
    prosa: { tone1: 'Doral no es «Miami genérico»:', tone2: 'es Doralzuela.', items: [0, 1, 2, 3] },
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
      lead: 'Cada casilla abre la página de ese servicio. Donde una zona no tiene página propia, te lleva a la de Miami.',
    },
    prosa: { tone1: 'En Hialeah, el español', tone2: 'es el negocio.', items: [0, 2, 3, 4] },
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
