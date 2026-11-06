// ─────────────────────────────────────────────────────────────
// Copy NUEVO de las landings v3 de SEO local (design/rediseno-workos.md §4.16, ola 2).
// Solo textos libres: cola, bajada, títulos de sección y textos de objetos. Lo
// congelado (H1, answer, faq, local.paragraphs, service, meta, breadcrumb) se pinta
// tal cual desde clusters.ts, que no se toca.
// Reglas de copy: sin guiones como conector, "dominamos" la IA, nada inventado (lo de
// ejemplo va en objetos rotulados "Ejemplo"), precios solo de pricing.ts, zonas reales
// (las del mapa del hub de cada ciudad y las que ya nombra la página).
// ─────────────────────────────────────────────────────────────

export type SeoCity = 'houston' | 'miami';

export interface CheckRow { k: string; v: string; ok?: boolean }
/** `logo`: cabecera de la ventana (v2 G05, §1.4): Google Maps en monocromo sobre baldosa;
 *  Apple Maps y Bing en palabra (LogoMarca). `resto`: lo que sigue a la palabra ("Places"). */
export interface Ventana { title: string; sub: string; steps: string[]; logo?: 'googlemaps' | 'applemaps-texto' | 'bing-texto'; resto?: string }
export interface ZonaFila { label: string; cells: { label: string; href?: string; current?: boolean }[] }

export interface SeoCopy {
  chip: string;
  cityName: string;
  tail: string;
  lead: string;
  primary: string;
  link: string;
  /** Resumen accesible de la tarjeta del hero (aria-hidden). */
  heroSr: string;
  revisamos: {
    label: string; title: string; lead: string;
    cells: { icon: string; label: string; titleHtml: string; text: string; tray?: boolean }[];
    datos: { title: string; rows: CheckRow[] };
    ficha: { title: string; rows: CheckRow[] };
  };
  ventanas: { label: string; title: string; lead: string; points: string[]; stepsLabel: string; windows: [Ventana, Ventana, Ventana] };
  barrios: { label: string; title: string; lead: string; tableLabel: string; columns: string[]; rows: ZonaFila[]; note: string };
  pasos: { label: string; title: string; lead: string; items: [{ title: string; text: string }, { title: string; text: string }, { title: string; text: string }] };
  prosa: { tone1: string; tone2: string; items: { icon: string; title: string; text: string }[] };
  proyectos: { label: string; title: string; lead: string; more: string; addText: string };
  precio: { eyebrow: string; title: string; cta: string; specsLabel: string; specKeys: string[] };
  franja: { queEs: string; desde: (inicial: string, mensual: string) => string; tiempo: string; verQue: string; verPrecios: string; pedir: string };
  hermanas: { title: string; lead: string; diag: { title: string; text: string }; precios: { title: string; text: string }; blog: { title: string; text: string } };
  cierre: { proof: string; warmTitle: string; warmText: string; warmCta: string };
}

const COLUMNS = ['SEO local', 'Diseño web', 'IA conversacional', 'Tienda en línea'];

const datos: SeoCopy['revisamos']['datos'] = {
  title: 'Tu restaurante: nombre, dirección y teléfono',
  rows: [
    { k: 'Tu web', v: 'Igual', ok: true },
    { k: 'Ficha de mapa', v: 'Igual', ok: true },
    { k: 'Bing Places', v: 'Igual', ok: true },
    { k: 'Apple Maps', v: 'Teléfono viejo', ok: false },
  ],
};

const ficha = (zonas: string): SeoCopy['revisamos']['ficha'] => ({
  title: 'Revisión de la ficha de mapa',
  rows: [
    { k: 'Categoría principal', v: 'Restaurante', ok: true },
    { k: 'Zonas que atiendes', v: zonas, ok: true },
    { k: 'Horario', v: 'Completo, los 7 días', ok: true },
    { k: 'Fotos', v: 'Platos y local reales', ok: true },
    { k: 'Reseñas', v: 'Sin contestar', ok: false },
  ],
});

const pasosItems = (zona: string): SeoCopy['pasos']['items'] => [
  { title: 'Revisamos tu ficha y tu web', text: 'Nombre, teléfono, categorías, horario, reseñas y lo que dice tu web de cada zona.' },
  { title: 'Corregimos y completamos', text: 'Los mismos datos en tu web, tu ficha, Bing, Apple Maps y los directorios de tu sector.' },
  { title: `Sumamos ${zona} cada mes`, text: 'Una página local al mes y un reporte claro de qué cambiamos y qué pasó con tus llamadas.' },
];

const ventanas = (zonas: string): SeoCopy['ventanas'] => ({
  label: 'Dónde te ponemos',
  title: 'En los mapas donde te buscan',
  lead: 'Cada mapa pide sus datos a su manera. Los dejamos completos e iguales en los tres, para que ni Google ni la IA duden de quién eres.',
  points: [
    'Ficha verificada y bien categorizada',
    `Tus zonas marcadas: ${zonas}`,
    'Los mismos datos en tu web y en cada mapa',
    'Lo que leen los asistentes de IA, en orden',
  ],
  stepsLabel: 'Pasos',
  windows: [
    { title: 'Bing Places', logo: 'bing-texto', resto: 'Places', sub: 'Microsoft', steps: ['Importar desde tu ficha', 'Revisar los datos', 'Zonas y horario', 'Lista para la IA'] },
    { title: 'Apple Maps', logo: 'applemaps-texto', sub: 'Business Connect', steps: ['Reclamar la ficha', 'Los mismos datos', 'Horario y fotos', 'Categoría correcta'] },
    { title: 'Google', logo: 'googlemaps', sub: 'Perfil de Negocio', steps: ['Verificar la ficha', 'Categorías y zonas', 'Servicios y horario', 'Fotos del trabajo', 'Reseñas contestadas'] },
  ],
});

const warm = {
  warmTitle: '¿No sabes si te encuentran?',
  warmText: 'Revisa gratis si tu negocio está perdiendo clientes online.',
  warmCta: 'Hacer el diagnóstico',
};

const precio: SeoCopy['precio'] = {
  eyebrow: 'Inversión',
  title: 'SEO local, con el precio a la vista',
  cta: 'Pedir mi propuesta',
  specsLabel: 'Qué incluye el plan mensual',
  // Rótulo de cada punto de pricing.features (clusters.ts), en el mismo orden; el valor
  // es el punto VERBATIM.
  specKeys: ['Ficha', 'Directorios', 'Contenido', 'Reseñas', 'Reporte', 'Idiomas'],
};

const franja: SeoCopy['franja'] = {
  queEs: 'Qué es',
  desde: (inicial, mensual) => `Desde ${inicial} la optimización inicial; desde ${mensual} al mes el trabajo continuo.`,
  tiempo: 'Las primeras señales, más vistas y llamadas desde tu ficha, llegan entre 2 y 8 semanas.',
  verQue: 'Ver cómo trabajamos',
  verPrecios: 'Ver precios',
  pedir: 'Pedir propuesta',
};

const hermanasBase = {
  diag: { title: 'Diagnóstico gratis', text: 'Revisa si tu negocio pierde clientes online.' },
  precios: { title: 'Precios', text: 'Todos los precios de entrada, a la vista.' },
  blog: { title: 'Aparecer en la IA', text: 'Cómo salir en ChatGPT y Perplexity.' },
};

export const seoCopy: Record<SeoCity, SeoCopy> = {
  houston: {
    chip: 'Houston, TX',
    cityName: 'Houston',
    tail: 'para que te llamen a ti.',
    lead: 'Aparece en el mapa y en la IA cuando te buscan cerca. Trabajamos tu ficha, tu web y tus reseñas zona por zona, de Katy a Pasadena.',
    primary: 'Quiero que me encuentren',
    link: 'Ver cómo trabajamos',
    heroSr: 'Ejemplo de ficha de mapa de un negocio de Houston, con su categoría, su horario y los botones para llamar, llegar o ir a su web.',
    revisamos: {
      label: 'Lo que revisamos',
      title: 'Todo lo que mira Google antes de enseñarte',
      lead: 'Google ordena por relevancia, distancia y prominencia. Revisamos cada señal que puedes mejorar tú.',
      cells: [
        { icon: 'lucide:radar', label: 'Búsquedas cerca de ti', titleHtml: 'Cuando te buscan cerca, sales tú', text: 'Quien busca «cerca de mí» ya está listo para llamar o para ir. El trabajo es que te encuentre a ti primero.', tray: false },
        { icon: 'lucide:list-checks', label: 'Tus datos', titleHtml: 'Iguales en todas partes', text: 'Nombre, dirección y teléfono idénticos en tu web, tu ficha y los directorios. Es lo primero que cruza la IA.' },
        { icon: 'lucide:map-pin', label: 'Tu ficha', titleHtml: 'Completa y con tus zonas', text: 'Categoría, zonas que atiendes, horario, fotos del trabajo y reseñas contestadas en su idioma.' },
        { icon: 'lucide:globe', label: 'Tu web', titleHtml: 'Una página por zona fuerte', text: 'Cada zona importante con su página, escrita para ese mercado y con tus datos a la vista.' },
      ],
      datos,
      ficha: ficha('Katy, Sugar Land'),
    },
    ventanas: ventanas('Katy, Sugar Land, Pearland'),
    barrios: {
      label: 'Barrio por barrio',
      title: 'Una página para cada zona que te da trabajo',
      lead: 'Así se ve este sitio hoy en Houston: cada casilla llena es una página que ya existe. Contigo hacemos lo mismo con tus zonas.',
      tableLabel: 'Páginas de Marcyan por zona y servicio en el área de Houston',
      columns: COLUMNS,
      rows: [
        { label: 'Toda el área', cells: [
          { label: 'SEO local', href: '/es/houston/seo-local', current: true },
          { label: 'Diseño web', href: '/es/houston/diseno-web' },
          { label: 'IA conversacional', href: '/es/houston/ia-conversacional' },
          { label: 'Tienda en línea', href: '/es/houston/ecommerce' },
        ] },
        { label: 'Katy', cells: [{ label: 'SEO local', href: '/es/houston/katy' }, { label: 'Diseño web', href: '/es/houston/katy' }, { label: 'IA conversacional' }, { label: 'Tienda en línea' }] },
        { label: 'Sugar Land', cells: [{ label: 'SEO local', href: '/es/houston/sugar-land' }, { label: 'Diseño web', href: '/es/houston/sugar-land' }, { label: 'IA conversacional' }, { label: 'Tienda en línea' }] },
        { label: 'Pearland', cells: COLUMNS.map((label) => ({ label })) },
      ],
      note: 'Casilla llena: página publicada. Casilla punteada: todavía sin página.',
    },
    pasos: {
      label: 'Cómo trabajamos',
      title: 'Primero lo que ya tienes, luego tus zonas',
      lead: 'Sin contratos eternos. Empezamos por tu zona más rentable y sumamos zonas según los resultados.',
      items: pasosItems('zonas'),
    },
    prosa: {
      tone1: 'Por qué en Houston.',
      tone2: 'El mapa se gana zona por zona.',
      items: [
        { icon: 'lucide:map-pin', title: 'Tus zonas, marcadas', text: 'Katy, Sugar Land, Pearland o las que de verdad atiendes.' },
        { icon: 'lucide:languages', title: 'En inglés también', text: 'Muchos servicios se buscan en inglés aunque el cliente hable español.' },
        { icon: 'lucide:house', title: 'Sin local, también', text: 'Si trabajas a domicilio, tu dirección no se publica.' },
        { icon: 'lucide:star', title: 'Reseñas por zona', text: 'Pedidas a cada cliente y contestadas en su idioma.' },
      ],
    },
    proyectos: {
      label: 'Proyectos',
      title: 'Negocios de Houston que ya posicionan',
      lead: 'Sitios reales del área de Houston, hechos por nosotros y en uso.',
      more: 'Más proyectos',
      addText: '¿Tu negocio trabaja en Houston? El siguiente caso puede ser el tuyo.',
    },
    precio,
    franja,
    hermanas: {
      title: "<span class='w-tone'>Primero, que te encuentren.</span> Luego, que te elijan.",
      lead: 'Servicios de Marcyan en Houston que trabajan junto a tu SEO local.',
      ...hermanasBase,
    },
    cierre: { proof: 'Texas Rush Remove trabaja a domicilio y ya posiciona en su zona de Houston.', ...warm },
  },
  miami: {
    chip: 'Miami, FL',
    cityName: 'Miami',
    tail: 'para que te llamen a ti.',
    lead: 'Aparece en el mapa y en la IA cuando te buscan cerca, en español o en inglés. Preparamos tu ficha, tu web y tus reseñas, de Hialeah a Kendall.',
    primary: 'Quiero que me encuentren',
    link: 'Ver cómo trabajamos',
    heroSr: 'Ejemplo de ficha de mapa de un negocio de Miami, con su categoría, su horario y los botones para llamar, llegar o ir a su web.',
    revisamos: {
      label: 'Lo que revisamos',
      title: 'Todo lo que mira Google antes de enseñarte',
      lead: 'En Miami se busca en dos idiomas. Revisamos cada señal que puedes mejorar tú, en español y en inglés.',
      cells: [
        { icon: 'lucide:radar', label: 'Búsquedas cerca de ti', titleHtml: 'Cuando te buscan cerca, sales tú', text: 'Quien busca «cerca de mí» ya está listo para llamar o para ir. El trabajo es que te encuentre a ti primero.', tray: false },
        { icon: 'lucide:list-checks', label: 'Tus datos', titleHtml: 'Iguales en todas partes', text: 'Nombre, teléfono y zonas idénticos en tu web, tu ficha y los directorios, para que nadie dude de quién eres.' },
        { icon: 'lucide:map-pin', label: 'Tu ficha', titleHtml: 'En dos idiomas y con tus barrios', text: 'Categoría, barrios que atiendes, horario, fotos del trabajo y reseñas contestadas en su idioma.' },
        { icon: 'lucide:globe', label: 'Tu web', titleHtml: 'Una página por barrio fuerte', text: 'Cada barrio importante con su página, escrita para su gente y con tus datos a la vista.' },
      ],
      datos,
      ficha: ficha('Doral, Hialeah'),
    },
    ventanas: ventanas('Doral, Hialeah, Kendall'),
    barrios: {
      label: 'Barrio por barrio',
      title: 'Una página para cada barrio que te da trabajo',
      lead: 'Así se ve este sitio hoy en Miami: cada casilla llena es una página que ya existe. Contigo hacemos lo mismo con tus barrios.',
      tableLabel: 'Páginas de Marcyan por barrio y servicio en Miami-Dade',
      columns: COLUMNS,
      rows: [
        { label: 'Todo Miami-Dade', cells: [
          { label: 'SEO local', href: '/es/miami/seo-local', current: true },
          { label: 'Diseño web', href: '/es/miami/diseno-web' },
          { label: 'IA conversacional', href: '/es/miami/ia-conversacional' },
          { label: 'Tienda en línea', href: '/es/miami/ecommerce' },
        ] },
        { label: 'Doral', cells: [{ label: 'SEO local', href: '/es/miami/doral' }, { label: 'Diseño web', href: '/es/miami/doral' }, { label: 'IA conversacional' }, { label: 'Tienda en línea' }] },
        { label: 'Hialeah', cells: [{ label: 'SEO local', href: '/es/miami/hialeah' }, { label: 'Diseño web', href: '/es/miami/hialeah' }, { label: 'IA conversacional' }, { label: 'Tienda en línea' }] },
        { label: 'Kendall', cells: COLUMNS.map((label) => ({ label })) },
      ],
      note: 'Casilla llena: página publicada. Casilla punteada: todavía sin página.',
    },
    pasos: {
      label: 'Cómo trabajamos',
      title: 'Primero lo que ya tienes, luego tus barrios',
      lead: 'Sin contratos eternos. Empezamos por el barrio y el idioma donde más te buscan, y crecemos desde ahí.',
      items: pasosItems('barrios'),
    },
    prosa: {
      tone1: 'Por qué en Miami.',
      tone2: 'Aquí el español manda.',
      items: [
        { icon: 'lucide:languages', title: 'Dos idiomas', text: 'Tu ficha y tus páginas para quien busca en español y en inglés.' },
        { icon: 'lucide:map-pin', title: 'Cada barrio, su página', text: 'Doral, Hialeah o Kendall, escritos para su gente.' },
        { icon: 'lucide:star', title: 'Reseñas en español', text: 'Le dicen al siguiente cliente que aquí lo van a entender.' },
        { icon: 'lucide:house', title: 'Sin oficina', text: 'Como negocio de área de servicio, en todo Miami-Dade.' },
      ],
    },
    proyectos: {
      label: 'Proyectos',
      title: 'SEO local que ya posiciona',
      lead: 'Todavía no hay un caso publicado en Miami. Este es el trabajo más cercano, en Florida (Orlando) y en Houston.',
      more: 'Más proyectos',
      addText: 'Buscamos los primeros negocios de Miami con los que trabajar.',
    },
    precio,
    franja,
    hermanas: {
      title: "<span class='w-tone'>Primero, que te encuentren.</span> Luego, que te elijan.",
      lead: 'Servicios de Marcyan que trabajan junto a tu SEO local.',
      ...hermanasBase,
    },
    cierre: { proof: 'Move Junk Away, en Orlando, ya posiciona en su zona con su sitio nuevo y su SEO local.', ...warm },
  },
};
