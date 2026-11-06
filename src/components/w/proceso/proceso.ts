// ─────────────────────────────────────────────────────────────
// P11 · "Del concepto al lanzamiento" (design/rediseno-workos-v2.md §2 P11).
// Tipos, adaptador de content.process y copy de las escenas (ES/EN nativo).
// Los textos de las FASES no viven aquí: llegan verbatim de content.process.
// ─────────────────────────────────────────────────────────────
import { PRICE_ANCHORS } from '../../../i18n/pricing';

export type Lang = 'es' | 'en';

/** Una fase de la línea (props de LineaFases). */
export interface Fase { n: string; titulo: string; texto: string }

/** content.process.steps → fases (sin tocar el texto: verbatim). */
export const fasesDe = (steps: { n: string; title: string; desc: string }[]): Fase[] =>
  steps.map((s) => ({ n: s.n, titulo: s.title, texto: s.desc }));

/** Nombre del evento que emite la línea cuando se activa la última fase (lo escucha el cohete de G01). */
export const EVENTO_FIN = 'w2:fases-fin';
/** detail del evento: origen = centro del punto de la última fase, en px relativos a la sección. */
export interface DetalleFin { origen: { x: number; y: number }; lang: Lang }

const usd = (n: number) => '$' + n.toLocaleString('en-US');

export const copy = {
  es: {
    fase: 'Fase',
    correo: {
      aviso: 'Nuevo correo', titulo: 'Tu propuesta', hace: 'hace 1 min', para: 'Para: Tu Negocio',
      cuerpo: 'Hola, aquí tienes tu propuesta: alcance, precio y plazos.',
      idx: [['Alcance', 'Sitio a medida, en español e inglés'], ['Precio', `Desde ${usd(PRICE_ANCHORS.web)}`], ['Plazos', 'Fechas por fase']],
      pie: 'Propuesta en 24 horas', reloj: '24 h',
    },
    alcance: {
      lab: 'Tu plan', producto: 'Sitio a medida completo',
      items: ['Páginas a medida', 'En español e inglés', 'SEO base', 'Lista para la IA'],
      total: 'Total', desde: `Desde ${usd(PRICE_ANCHORS.web)}`, aprobar: 'Aprobar', aprobado: 'Aprobado',
      mes: 'Cada mes', mensual: [['SEO local', `Desde ${usd(PRICE_ANCHORS.seoLocal)}/mes`], ['Mantenimiento', `Desde ${usd(PRICE_ANCHORS.maintenance)}/mes`]],
    },
    bilingue: { es: 'ES', en: 'EN' },
    encontrar: { lab: 'Te encuentran en', pregunta: '¿Un buen plomero en Houston que atienda en español?', pasos: ['Buscando en la web', 'Leyendo fuentes'],
      antes: 'Una buena opción es ', despues: ': web bilingüe, responde rápido y enseña su trabajo.',
      cat: 'Plomero · Houston', abierto: 'Abierto', cierra: 'cierra 6:00 p. m.', llamar: 'Llamar', llegar: 'Cómo llegar' },
    publicada: { estado: 'Publicada', titular: 'Te atendemos hoy.', bajada: 'Plomería en Houston, en español e inglés.', boton: 'Llamar',
      asis: 'Tu asistente', linea: 'en línea', msg: 'Hola, ¿en qué te ayudo?' },
    sr: [
      'Ejemplo: te llega el correo con tu propuesta, con alcance, precio y plazos.',
      `Ejemplo: el plan con su alcance y un precio desde ${usd(PRICE_ANCHORS.web)}, listo para aprobar.`,
      'Ejemplo: la misma web cambia del español al inglés.',
      'Ejemplo: un asistente de IA recomienda a Tu Negocio y aparece su ficha en el mapa.',
      'Ejemplo: la web queda publicada y su asistente atiende en línea.',
    ],
  },
  en: {
    fase: 'Phase',
    correo: {
      aviso: 'New email', titulo: 'Your proposal', hace: '1 min ago', para: 'To: Your Business',
      cuerpo: "Hi, here's your proposal: scope, price and timeline.",
      idx: [['Scope', 'Custom site, in Spanish and English'], ['Price', `From ${usd(PRICE_ANCHORS.web)}`], ['Timeline', 'Dates for each phase']],
      pie: 'Proposal in 24 hours', reloj: '24 h',
    },
    alcance: {
      lab: 'Your plan', producto: 'Complete custom site',
      items: ['Custom pages', 'In Spanish and English', 'Core SEO', 'Ready for AI'],
      total: 'Total', desde: `From ${usd(PRICE_ANCHORS.web)}`, aprobar: 'Approve', aprobado: 'Approved',
      mes: 'Every month', mensual: [['Local SEO', `From ${usd(PRICE_ANCHORS.seoLocal)}/mo`], ['Maintenance', `From ${usd(PRICE_ANCHORS.maintenance)}/mo`]],
    },
    bilingue: { es: 'ES', en: 'EN' },
    encontrar: { lab: 'They find you on', pregunta: 'A good plumber in Houston who speaks Spanish?', pasos: ['Searching the web', 'Reading sources'],
      antes: 'A good option is ', despues: ': bilingual website, quick to reply and shows its work.',
      cat: 'Plumber · Houston', abierto: 'Open', cierra: 'closes 6:00 PM', llamar: 'Call', llegar: 'Directions' },
    publicada: { estado: 'Live', titular: 'We can help today.', bajada: 'Plumbing in Houston, in Spanish and English.', boton: 'Call',
      asis: 'Your assistant', linea: 'online', msg: 'Hi, how can I help?' },
    sr: [
      'Example: your proposal arrives by email, with scope, price and timeline.',
      `Example: the plan with its scope and a price from ${usd(PRICE_ANCHORS.web)}, ready to approve.`,
      'Example: the same website switches from Spanish to English.',
      'Example: an AI assistant recommends Your Business and its map listing shows up.',
      'Example: the website is live and its assistant is online.',
    ],
  },
} as const;

/** Copy de la web de ejemplo del salón (escena 03), en los dos idiomas: la escena enseña los dos. */
export const salon = {
  es: { nav: ['Servicios', 'Reservar'], titular: 'Tu cita, sin esperar.', bajada: 'Corte, color y uñas en Houston.', boton: 'Reservar cita',
    servicios: ['Corte', 'Color', 'Uñas'], horario: 'Mar a sáb · 10:00 a. m. a 7:00 p. m.' },
  en: { nav: ['Services', 'Book'], titular: 'Your chair, no wait.', bajada: 'Cuts, color and nails in Houston.', boton: 'Book a visit',
    servicios: ['Cut', 'Color', 'Nails'], horario: 'Tue to Sat · 10:00 AM to 7:00 PM' },
} as const;

// ─────────────────────────────────────────────────────────────
// Asistentes que nombra el paso 04 (content.process), uno por reproducción, con su logo en la
// cabecera de la respuesta (E-56-5, §1.4).
// PROVISIONAL hasta que P06 (LogoMarca, src/components/w/marcas/) esté integrado en la rama: entonces
// esta tabla se sustituye por <LogoMarca id="googlegemini" | "meta" | "chatgpt-texto"> y se borra.
// TRAZADOS: simple-icons 16.36.0, licencia CC0 1.0 del trazado (mismo origen y mismos datos que
// registra P06 en marcas/datos.ts y marcas/LICENCIAS.md). CC0 cubre el dibujo, no la marca: uso
// nominativo ("Te encuentran en"), nunca aval ni alianza. Gemini es multicolor en su guía: va en la
// tinta del objeto, nunca con un solo hex. Meta con su azul oficial. ChatGPT: palabra (no se dibuja
// el logo de OpenAI, decisión §5-2 del dueño pendiente).
// ─────────────────────────────────────────────────────────────
export interface Asistente { nombre: string; d?: string; hex?: string; optico?: number }
export const ASISTENTES: readonly Asistente[] = [
  { nombre: 'Gemini', optico: 1.08,
    d: 'M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81' },
  { nombre: 'ChatGPT' },
  { nombre: 'Meta AI', hex: '0467DF', optico: 1.12,
    d: 'M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z' },
];
/** viewBox 24×24 con el factor óptico centrado (f > 1 agranda el glifo sin mover la caja). */
export const vbOptico = (f = 1) => { const s = 24 / f, o = (24 - s) / 2; return `${o.toFixed(3)} ${o.toFixed(3)} ${s.toFixed(3)} ${s.toFixed(3)}`; };

