// ─────────────────────────────────────────────────────────────
// CONTENIDO · /es/sobre-nosotros — E-E-A-T honesto (quiénes somos, cómo trabajamos).
// Honestidad DURA: SIN inventar fundador (el nodo Person + foto se añaden DESPUÉS —
// hay un bloque JSON-LD comentado en la página, listo para el dato real); sin "#1";
// SAB (sin oficina pública); sin LLC (no se afirma constitución). Schema: AboutPage
// que apunta a la Organization del @graph base del Layout.
// ─────────────────────────────────────────────────────────────
import type { FaqItem, CrumbItem } from '../lib/schema';
import type { SectionFeatures, RelatedLink } from './clusters';

export const sobreNosotros = {
  meta: {
    title: 'Sobre Marcyan: agencia hispana de web, IA y SEO | Marcyan',
    description:
      'Marcyan Studio: la agencia hispana que pone la IA a trabajar para tu negocio. Web, asistentes y SEO local en Houston y Miami. Bilingüe, precios públicos y trabajo verificable.',
  },
  path: '/es/sobre-nosotros',
  breadcrumb: [
    { name: 'Inicio', path: '/es/' },
    { name: 'Nosotros', path: '/es/sobre-nosotros' },
  ] as CrumbItem[],
  hero: {
    kicker: 'Sobre nosotros',
    h1: 'La agencia hispana que <em>pone la IA a trabajar para ti</em>',
    sub: 'Somos Marcyan Studio: web, IA y SEO local para el negocio hispano de Estados Unidos. Ponemos las últimas tecnologías a trabajar para tu negocio. Bilingüe de verdad, con precios públicos y trabajo real que puedes verificar.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    secondary: { label: 'Ver portafolio', href: '/es/portafolio' },
    chips: ['Houston y Miami', 'Bilingüe ES/EN', 'Precios públicos'],
    tone: 'gold' as const,
  },
  answer: {
    q: '¿Qué es Marcyan Studio?',
    a: 'Marcyan Studio es una agencia hispana de diseño web con base en Houston y presencia en Miami que hace la inteligencia artificial accesible para los negocios de Estados Unidos: sitios a medida, asistentes de IA que atienden clientes y SEO, en español e inglés de verdad, con precios públicos y trabajo real verificable, no plantillas ni promesas vacías.',
  },
  story: {
    tag: 'Quiénes somos',
    title: 'Un estudio <em>joven</em>, con trabajo real',
    paragraphs: [
      'Marcyan nació para cerrar un hueco claro: el negocio hispano de Estados Unidos merece sitios tan buenos como los de las grandes agencias, pero hechos en su idioma, con su contexto y a un precio honesto. Nuestra apuesta es simple: ponemos las últimas tecnologías a trabajar para tu negocio, desde un sitio que carga rápido hasta la IA que atiende a tus clientes, para que siempre esté actualizado y aparezca cuando alguien le pregunta a ChatGPT, Gemini o Meta AI.',
      'Seremos transparentes: somos un estudio joven y en crecimiento, pero no partimos de cero. Ya trabajamos con negocios reales en Houston y Orlando, con sitios, SEO, marca y web apps en vivo que puedes ver en nuestro portafolio. Y ya hay señales que no dependen de nuestra palabra: la IA de Google ya incluye a clientes nuestros en sus recomendaciones para algunas búsquedas, y uno de ellos ya recibe visitas que llegan desde ChatGPT. <strong>Preferimos enseñarte trabajo real antes que prometer lo que no podemos cumplir.</strong>',
    ],
    tone: 'gold' as const,
  },
  values: {
    tag: 'Nuestro enfoque',
    title: 'Lo que nos hace <em>distintos</em>',
    intro: 'No es un solo truco: es la combinación que casi nadie ejecuta junta para el mercado hispano.',
    items: [
      { icon: 'marcyan-ai', title: 'La IA, al alcance de tu negocio', desc: 'Hacemos la IA accesible: un asistente que atiende a tus clientes por ti y un sitio en HTML que ChatGPT y Gemini sí pueden leer, para que la IA te encuentre y te recomiende.' },
      { icon: 'lucide:languages', title: 'Bilingüe de verdad', desc: 'Español e inglés escritos para cómo busca tu cliente, no un botón de Google Translate. Conocemos el contexto hispano de EE.UU.' },
      { icon: 'lucide:tag', title: 'Precios públicos', desc: 'Publicamos hasta el precio del SEO mensual y el mantenimiento. Sin letra pequeña ni una llamada de ventas para enterarte de cuánto cuesta.' },
      { icon: 'lucide:map-pin', title: 'Local y cercano', desc: 'Houston y Miami como negocio de área de servicio. Atención directa, sin call center, en tu idioma y con contexto de tu mercado.' },
    ],
    tone: 'gold' as const,
  } as SectionFeatures,
  founders: {
    tag: 'Clientes Fundadores',
    title: 'Crece con nosotros <em>desde el principio</em>',
    paragraphs: [
      'Cuando abrimos un mercado o una industria nuevos, ofrecemos cupos de Cliente Fundador: a cambio de confiar en un estudio joven en esa plaza, recibes atención prioritaria, condiciones preferentes y te conviertes en uno de nuestros casos de estudio locales.',
      'Es honestidad en las dos direcciones: <strong>no fingimos tener clientes donde aún no los tenemos</strong> (por ejemplo, en Miami estamos comenzando), y a quienes llegan primero les damos dedicación real y un trato especial.',
    ],
    tone: 'gold' as const,
  },
  proof: {
    tag: 'Trabajo real',
    title: 'Negocios reales que ya <em>confiaron</em>',
    links: [
      { label: 'Ver el portafolio completo', href: '/es/portafolio', desc: 'Texas Rush Remove, Move Junk Away, Julio\'s Landscape y Rosy Nails: sitios, SEO, marca y app en vivo.', icon: 'lucide:folder' },
      { label: 'Nuestras ciudades', href: '/es/ciudades', desc: 'Houston y Miami, como negocio de área de servicio.', icon: 'lucide:map-pin' },
      { label: 'Precios y planes', href: '/es/precios', desc: 'El precio de arranque de cada servicio, sin letra pequeña.', icon: 'lucide:tag' },
    ] as RelatedLink[],
  },
  faq: {
    tag: 'Preguntas frecuentes',
    title: 'Sobre Marcyan, <em>sin rodeos</em>',
    items: [
      { q: '¿Tienen oficina en Houston o Miami?', a: 'Trabajamos como negocio de área de servicio: cubrimos Houston, Miami y sus áreas metropolitanas de forma remota y eficiente, sin una dirección pública. Todo el proceso, de la propuesta a la entrega, lo hacemos en línea y en tu idioma.' },
      { q: '¿Son una agencia nueva? ¿Puedo confiar?', a: 'Somos un estudio joven y lo decimos de frente, pero con trabajo real y verificable: sitios, SEO local que ya posiciona, marca y una web app en vivo para clientes en Houston y Orlando, y la IA de Google ya incluye a algunos en sus recomendaciones. Puedes ver las capturas en nuestro portafolio, y con gusto te mostramos los sitios en una llamada.' },
      { q: '¿Quién está detrás de Marcyan?', a: 'Un equipo hispano y bilingüe enfocado en el mercado de Estados Unidos, que combina diseño, desarrollo e inteligencia artificial. Trabajas directo con quien hace tu proyecto, sin intermediarios ni call center.' },
      { q: '¿En qué se diferencian de otras agencias?', a: 'En la combinación: diseño a medida, IA que de verdad te hace visible en buscadores y asistentes, bilingüe real con hreflang, precios públicos y presencia local. Cada pieza la tiene alguien; juntas, casi nadie en el nicho hispano.' },
      { q: '¿Trabajan en español e inglés?', a: 'Sí, es nuestra especialidad. Diseñamos, escribimos y te atendemos en español e inglés, con el contexto cultural correcto del mercado hispano de Houston y Miami.' },
      { q: '¿Garantizan el primer lugar en Google?', a: 'No, y desconfía de quien lo prometa: nadie controla el algoritmo. Lo que garantizamos es trabajo honesto y medible (sitios rápidos, SEO correcto, reportes claros) y una base sólida para competir.' },
    ] as FaqItem[],
  },
  cta: {
    title: 'Hablemos de <em>tu proyecto</em>',
    sub: 'Cuéntanos sobre tu negocio y recibe una propuesta personalizada en menos de 24 horas, sin compromiso.',
    primary: { label: 'Propuesta gratis', href: '#contacto' },
    tone: 'gold' as const,
  },
};
