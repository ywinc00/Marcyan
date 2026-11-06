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
    correo: { de: 'De Marcyan', titulo: 'Tu propuesta', hace: 'hace 1 min', idx: ['Alcance', 'Precio', 'Plazos'], pie: 'Propuesta en 24 horas' },
    alcance: {
      lab: 'Tu plan', producto: 'Sitio a medida completo',
      items: ['Páginas a medida', 'En español e inglés', 'SEO base', 'Lista para la IA'],
      total: 'Total', desde: `Desde ${usd(PRICE_ANCHORS.web)}`, aprobar: 'Aprobar', aprobado: 'Aprobado',
    },
    bilingue: { es: 'ES', en: 'EN' },
    encontrar: { lab: 'Te encuentran en', pregunta: '¿Un buen plomero en Houston que atienda en español?' },
    sr: [
      'Ejemplo: te llega el correo con tu propuesta, con alcance, precio y plazos.',
      `Ejemplo: el plan con su alcance y un precio desde ${usd(PRICE_ANCHORS.web)}, listo para aprobar.`,
      'Ejemplo: la misma web cambia del español al inglés.',
      'Ejemplo: un asistente de IA recomienda a Tu Negocio y aparece su ficha en el mapa.',
      'Ejemplo: la web queda publicada.',
    ],
  },
  en: {
    fase: 'Phase',
    correo: { de: 'From Marcyan', titulo: 'Your proposal', hace: '1 min ago', idx: ['Scope', 'Price', 'Timeline'], pie: 'Proposal in 24 hours' },
    alcance: {
      lab: 'Your plan', producto: 'Complete custom site',
      items: ['Custom pages', 'In Spanish and English', 'Core SEO', 'Ready for AI'],
      total: 'Total', desde: `From ${usd(PRICE_ANCHORS.web)}`, aprobar: 'Approve', aprobado: 'Approved',
    },
    bilingue: { es: 'ES', en: 'EN' },
    encontrar: { lab: 'They find you on', pregunta: 'A good plumber in Houston who speaks Spanish?' },
    sr: [
      'Example: your proposal arrives by email, with scope, price and timeline.',
      `Example: the plan with its scope and a price from ${usd(PRICE_ANCHORS.web)}, ready to approve.`,
      'Example: the same website switches from Spanish to English.',
      'Example: an AI assistant recommends Your Business and its map listing shows up.',
      'Example: the website is live.',
    ],
  },
} as const;

/** Asistentes que nombra el paso 04 (content.process), uno por reproducción. Píldora de texto (§1.4). */
export const ASISTENTES = ['ChatGPT', 'Gemini', 'Meta AI'] as const;
