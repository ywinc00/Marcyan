// Copy NUEVO (libre) de /es/houston/seo-para-ia · rediseño WorkOS v2 (design/rediseno-workos-v2.md §3 G07).
// Lo congelado (H1, meta, path, breadcrumb, answer, faq, distinction, mechanics, caso0, grid,
// cta.title, service, precios) vive en src/i18n/seo-ia.ts, que NO se toca.
// Reglas: sin guiones conectores, "dominamos" la IA, nada inventado; todo objeto de ejemplo va
// rotulado "Ejemplo". Negocio de ejemplo NEUTRO "Tu Negocio" (reparto de marcas §1.6: la marca
// plomería vive en diseño web y contratistas). Horario de ejemplo = el del pase (lun a sáb,
// 9:00 a. m. a 7:00 p. m.), en 12 h en todo el copy visible.
import { aeoTiers } from '../seo-ia';
import type { MarcaId } from '../../components/w/marcas/datos';

const [diag, cimientos, monitoreo] = aeoTiers;
const BIZ = 'Tu Negocio';

export interface PasoRespuesta { /** [mientras trabaja, cuando termina] */ txt: [string, string] }
export interface PestanaAsistente {
  id: string;
  marca: MarcaId;
  /** Nombre que se escribe junto al logo (vacío si el logo ya es la palabra). */
  nombre: string;
  /** "Responde Gemini" en la cabecera de la respuesta. */
  responde: string;
  pasos: [PasoRespuesta, PasoRespuesta];
  /** Respuesta: texto antes, negocio en negrita, texto después. refs = notas [1] [2] (Perplexity). */
  answer: { pre: string; biz: string; post: string; refs?: [string, string] };
  /** Fuente que leyó (u) y qué datos sacó de ella (lee). */
  sources: { u: string; lee: string }[];
  sr: string;
}

const pasosWeb: [PasoRespuesta, PasoRespuesta] = [
  { txt: ['Buscando en la web', 'Busqué en la web'] },
  { txt: ['Leyendo fuentes', 'Leí 2 fuentes'] },
];

export const seoIaW = {
  eyebrow: 'Que la IA te nombre',
  lead: 'Cuando le pregunten a la IA, que diga tu nombre. Preparamos tu negocio de Houston para que ChatGPT, Gemini y Google te encuentren y te recomienden, en español.',
  primary: 'Diagnóstico de IA gratis',
  question: '¿Qué plomero de Houston atiende en español?',
  business: BIZ,

  // 01 · Cada asistente, su respuesta (W-HOME-11 + W-CORE-10).
  asistentes: {
    label: 'Cada asistente, su respuesta',
    title: 'La misma pregunta, <em>seis respuestas</em>',
    lead: 'Cada asistente arma su respuesta con fuentes distintas. Preparamos tu información para todos, no solo para Google.',
    intro: 'Tu cliente no pregunta en un solo sitio. Por eso cuidamos lo que lee cada asistente.',
    tablistLabel: 'Asistentes de IA',
    ejemplo: 'Ejemplo',
    srcTitle: 'Fuentes que leyó',
    srcOk: 'leída',
    traits: [
      { marca: 'chatgpt-texto', nombre: '', text: 'Busca sobre todo en Bing.' },
      { marca: 'googlegemini', nombre: 'Gemini', text: 'Se apoya en la búsqueda de Google.' },
      { marca: 'perplexity', nombre: 'Perplexity', text: 'Cita las páginas que lee, con su enlace.' },
      { marca: 'claude', nombre: 'Claude', text: 'Busca en la web y dice de dónde saca cada dato.' },
      { marca: 'meta', nombre: 'Meta AI', text: 'Contesta dentro de WhatsApp, Instagram y Facebook.' },
      { marca: 'google', nombre: 'Google', text: 'Resume la respuesta en la misma página de resultados.' },
    ] as { marca: MarcaId; nombre: string; text: string }[],
    tabs: [
      {
        id: 'chatgpt', marca: 'chatgpt-texto', nombre: '', responde: 'responde', pasos: pasosWeb,
        answer: { pre: 'Te sugiero ', biz: BIZ, post: ': atiende en español e inglés y trabaja en Houston, Katy y Sugar Land.' },
        sources: [{ u: 'Bing Places', lee: 'categoría · zonas · teléfono' }, { u: 'tunegocio.example', lee: 'idiomas · servicios · horario' }],
        sr: `Ejemplo: ChatGPT responde que sugiere ${BIZ}, que atiende en español e inglés. Fuentes: Bing Places y la web del negocio.`,
      },
      {
        id: 'gemini', marca: 'googlegemini', nombre: 'Gemini', responde: 'responde', pasos: pasosWeb,
        answer: { pre: 'Una opción es ', biz: BIZ, post: ', en Houston: atiende en los dos idiomas y cubre Katy y Sugar Land.' },
        sources: [{ u: 'Perfil de empresa en Google', lee: 'horario · zonas · categoría' }, { u: 'tunegocio.example', lee: 'idiomas · servicios' }],
        sr: `Ejemplo: Gemini responde que una opción es ${BIZ}. Fuentes: su perfil de empresa en Google y su web.`,
      },
      {
        id: 'perplexity', marca: 'perplexity', nombre: 'Perplexity', responde: 'responde',
        pasos: [{ txt: ['Buscando en la web', 'Busqué en la web'] }, { txt: ['Leyendo 2 páginas', 'Leí 2 páginas'] }],
        answer: { pre: '', biz: BIZ, post: ' es un servicio de plomería en Houston con atención en español.', refs: [' En su web indica sus zonas y su horario.', ''] },
        sources: [{ u: 'tunegocio.example/servicios', lee: 'servicios · zonas' }, { u: 'tunegocio.example/preguntas', lee: 'idiomas · horario' }],
        sr: `Ejemplo: Perplexity responde que ${BIZ} es un servicio de plomería en Houston con atención en español, y cita dos páginas de su web.`,
      },
      {
        id: 'claude', marca: 'claude', nombre: 'Claude', responde: 'responde', pasos: pasosWeb,
        answer: { pre: 'Según su web, ', biz: BIZ, post: ' atiende en español e inglés y trabaja en Houston, Katy y Sugar Land.' },
        sources: [{ u: 'tunegocio.example', lee: 'idiomas · servicios' }, { u: 'tunegocio.example/contacto', lee: 'zonas · teléfono · horario' }],
        sr: `Ejemplo: Claude responde que, según su web, ${BIZ} atiende en español e inglés.`,
      },
      {
        id: 'meta', marca: 'meta', nombre: 'Meta AI', responde: 'responde en WhatsApp',
        pasos: [{ txt: ['Buscando en la web', 'Busqué en la web'] }, { txt: ['Leyendo resultados', 'Leí 2 fuentes'] }],
        answer: { pre: 'Prueba con ', biz: BIZ, post: ': plomeros de Houston que atienden en español. Tienen WhatsApp en su web.' },
        sources: [{ u: 'Resultados de búsqueda', lee: 'nombre · categoría · zona' }, { u: 'tunegocio.example', lee: 'idiomas · WhatsApp' }],
        sr: `Ejemplo: Meta AI responde dentro de WhatsApp que pruebes con ${BIZ}.`,
      },
      {
        id: 'google', marca: 'google', nombre: 'Google', responde: 'resume en la búsqueda',
        pasos: [{ txt: ['Buscando', 'Busqué'] }, { txt: ['Armando el resumen', 'Resumen listo'] }],
        answer: { pre: '', biz: BIZ, post: ' es un plomero de Houston con atención en español. Abre de lunes a sábado, de 9:00 a. m. a 7:00 p. m.' },
        sources: [{ u: 'Ficha de mapa', lee: 'horario · ubicación · categoría' }, { u: 'tunegocio.example', lee: 'idiomas · servicios' }],
        sr: `Ejemplo: el resumen de Google dice que ${BIZ} es un plomero de Houston con atención en español.`,
      },
    ] as PestanaAsistente[],
  },

  // 02 · Pregúntale tú (W-NEW-04/05 auth.md · VentanaAgente guion "buscar", piel hueso).
  pregunta: {
    label: 'Pregúntale tú',
    title: 'Elige la pregunta y <em>mira a quién</em> recomienda',
    lead: 'Así trabaja un asistente por dentro: lee fuentes, compara y nombra a un negocio. Cambia el escenario y mira qué pasa cuando tu negocio no tiene datos para IA.',
    pasos: [
      { k: 'Elige una pregunta', text: 'Tres preguntas como las que le hace tu cliente a la IA.' },
      { k: 'Cambia el escenario', text: 'Sin datos para IA, el asistente acaba citando un directorio.' },
      { k: 'Mira lo que lee', text: 'Tu web y tu ficha de mapa: justo lo que preparamos.' },
    ],
  },

  dice: {
    label: 'Lo que dices y lo que entiende la IA',
    cardTitle: 'De tu web a datos que la IA lee',
    colSay: 'En tu web',
    colData: 'Para la IA',
    rows: [
      { say: 'Abrimos de lunes a sábado, de 9 a. m. a 7 p. m.', key: 'openingHours', value: '"Mo-Sa 09:00-19:00"' },
      { say: 'Hablamos español e inglés', key: 'availableLanguage', value: '["es", "en"]' },
      { say: 'Trabajamos en Katy y Sugar Land', key: 'areaServed', value: '["Katy", "Sugar Land"]' },
      { say: 'Somos plomeros', key: '@type', value: '"Plumber"' },
    ],
    title: 'Lo que ya dices, en el formato que la IA entiende',
    lead: 'Un párrafo se puede malinterpretar; un dato estructurado no. Pasamos tu horario, tus zonas y tus idiomas a schema, el formato que leen Google, Bing y los asistentes.',
    link: 'Ver qué cambiamos',
  },

  cambiamos: {
    label: 'Qué cambiamos',
    card: {
      name: BIZ,
      kind: 'Plomero · Houston, TX',
      rows: [
        { k: 'Bing Places', v: 'Al día' },
        { k: 'Schema', v: 'En cada página' },
        { k: 'Preguntas', v: 'ES y EN' },
        { k: 'Nombre y teléfono', v: 'Iguales' },
      ],
      result: 'Lista para que la IA la cite',
    },
  },

  // 05 · La ficha que leen los asistentes (W2N-02 pase + W-NEW-38).
  ficha: {
    label: 'La ficha que leen los asistentes',
    title: 'Un archivo que le explica tu negocio a la IA',
    lead: 'Además del schema, dejamos en tu web un llms.txt: un resumen en texto plano de quién eres, qué haces y dónde trabajas, pensado para los asistentes.',
    loLeen: ['chatgpt-texto', 'googlegemini', 'perplexity', 'claude', 'meta'] as MarcaId[],
    file: {
      name: 'tunegocio.example/llms.txt',
      kind: 'Texto',
      foot: 'Cada negocio lleva el suyo, escrito con sus datos reales.',
      lines: [
        { t: 'h1', text: '# Tu Negocio' },
        { t: 'q', text: '> Plomeros en Houston. Atendemos en español e inglés.' },
        { t: 'sp' },
        { t: 'h2', text: '## Servicios' },
        { t: 'li', text: '- Fugas, drenajes y calentadores de agua' },
        { t: 'h2', text: '## Zonas' },
        { t: 'li', text: '- Houston, Katy y Sugar Land' },
        { t: 'h2', text: '## Horario' },
        { t: 'li', text: '- Lunes a sábado, de 9:00 a. m. a 7:00 p. m.' },
      ] as { t: 'h1' | 'q' | 'h2' | 'li' | 'sp'; text?: string }[],
    },
    notes: [
      { k: 'La ficha', text: 'Nombre, zonas, idiomas, horario y canales, siempre iguales en tu web, tu ficha de mapa y Bing.' },
      { k: 'Índice', text: 'llms.txt resume tu negocio en una sola página que la IA lee rápido.' },
      { k: 'Datos estructurados', text: 'El schema de cada página dice tu horario, tus zonas y tus servicios.' },
    ],
  },

  gratis: {
    items: [
      { icon: 'lucide:radar', text: diag.includes![0] },
      { icon: 'lucide:map-pin', text: diag.includes![1] },
      { icon: 'lucide:list-checks', text: diag.includes![2] },
      { icon: 'lucide:languages', text: 'En español, para tu mercado local' },
    ] as [{ icon: string; text: string }, { icon: string; text: string }, { icon: string; text: string }, { icon: string; text: string }],
    checks: [diag.includes![3], 'Te decimos con honestidad cómo estás'],
  },
  desde: 'Desde',
  precioNote: { title: '¿Empiezas por el diagnóstico?', text: 'Es gratis y te dice qué te falta antes de pagar nada.' },
  franja: {
    queEs: 'Qué es',
    desdeT: 'Desde cuánto',
    tiempoT: 'En cuánto tiempo',
    desde: `Diagnóstico gratis. Cimientos desde ${cimientos.displayPrice} y monitoreo desde ${monitoreo.displayPrice} al mes.`,
    tiempo: 'Propuesta en 24 horas. Las primeras señales suelen tomar semanas.',
    verQue: 'Ver qué cambiamos',
    verPrecios: 'Ver precios',
    pedir: 'Pedir diagnóstico',
  },
  hermanas: {
    title: "<span class='w-tone'>Que la IA te nombre es el principio.</span> Lo demás te trae el cliente.",
    lead: 'Servicios de Marcyan en Houston que trabajan junto al SEO para IA.',
    guia: { title: 'Guía: aparecer en ChatGPT', text: 'El paso a paso, si quieres entenderlo a fondo.' },
    diag: { title: 'Diagnóstico gratis', text: 'Mira cómo te ven hoy tu web y tu ficha.' },
    precios: { title: 'Precios', text: 'Todos los precios de entrada, a la vista.' },
  },
  cierre: {
    proof: 'Lo aplicamos en nuestro sitio y en el de nuestros clientes en Houston y Orlando.',
    warmTitle: '¿Quieres verlo tú primero?',
    warmText: 'Haz el diagnóstico gratis y mira qué encuentra la IA sobre tu negocio.',
    warmCta: 'Hacer el diagnóstico',
  },
};
