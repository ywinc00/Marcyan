// ─────────────────────────────────────────────────────────────
// Copy NUEVO de las landings v3 de sector (design/rediseno-workos.md §4.19, ola 2).
// Una entrada por ruta: contratistas, bienes raíces (ES) y contractors, restaurants (EN).
// Solo textos libres: eyebrow, bajada, títulos de sección, dilema, ciclo, filas y textos
// de objetos. Lo congelado (H1, answer, faq, local.paragraphs, service, meta, breadcrumb)
// se pinta tal cual desde clusters.ts / clusters.en.ts, que no se tocan.
// Reglas de copy: sin guiones como conector, "dominamos" la IA, nada inventado (lo de
// ejemplo va en objetos rotulados "Ejemplo"), precios solo de pricing.ts (las notas se
// forman con PRICE_ANCHORS). EN escrito nativo (R4), no traducido.
// Sin cola en el H1 (R2): en ES los H1 son largos; en EN el H1 ya ocupa 2 líneas en la
// columna de 560 del hero partido y la cola lo llevaría a 4 (regla de §2.14). La idea de
// la cola va en la bajada.
// ─────────────────────────────────────────────────────────────
import { PRICE_ANCHORS } from '../pricing';

export type SectorKey = 'contratistas' | 'bienes-raices' | 'contractors' | 'restaurants';
export type SectorObj = 'contratista' | 'inmobiliaria' | 'restaurante';
/** Objeto de cada fila de "Lo que necesita tu web" (W-CORE-21). */
export type FilaObj = 'respuesta' | 'antes-despues' | 'chat' | 'listados' | 'mesa-qr' | 'platos';

type Msg = { from: 'c' | 'm'; text: string; time?: string };
interface Side { title: string; text: string; evidence: string[] }

export interface SectorCopy {
  /** Objeto del hero (SolicitudOficio). */
  obj: SectorObj;
  chip: string;
  eyebrow: string;
  lead: string;
  link: string;
  heroSr: string;
  dilema: { label: string; title: string; lead: string; left: Side; right: Side; bridge: string };
  ciclo: {
    label: string; title: string; lead: string; uTitle: string; uSub: string;
    nodes: [{ icon: string; label: string; text: string }, { icon: string; label: string; text: string }, { icon: string; label: string; text: string }, { icon: string; label: string; text: string }];
  };
  filas: {
    label: string; title: string; lead: string; includes: string;
    rows: { obj: FilaObj; title: string; text: string; items: number[] }[];
    /** Pregunta que se le hace al asistente en el objeto RespuestaAsistente. */
    question?: string;
    /** Guion del chat de Marcy del objeto "chat". */
    chat: { label: string; script: Msg[] };
    chatSr: string;
  };
  prosa: { tone1: string; tone2: string };
  proyectos: { label: string; title: string; lead: string; more: string };
  precio: { eyebrow: string; title: string; from: string; slice: string; includes: string; note: string; cta: string };
  franja: { queEs: string; desdeT: string; desde: string; tiempoT: string; tiempo: string; verQue: string; verPrecios: string; pedir: string; preciosHref: string };
  hermanas: { title: string; lead: string; diag: { title: string; text: string; href: string }; precios: { title: string; text: string; href: string } };
  cierre: { proof: string; warmTitle: string; warmText: string; warmCta: string; warmHref: string };
}

const usd = (n: number) => '$' + n.toLocaleString('en-US');
const A = PRICE_ANCHORS;

// ── Bloques comunes por idioma ────────────────────────────────
const franjaEs: SectorCopy['franja'] = {
  queEs: 'Qué es',
  desdeT: 'Desde cuánto',
  desde: `Desde ${usd(A.webLanding)} una landing; desde ${usd(A.web)} un sitio a medida.`,
  tiempoT: 'En cuánto tiempo',
  tiempo: 'Propuesta en 24 horas. Te damos un calendario realista desde el inicio.',
  verQue: 'Ver qué incluye',
  verPrecios: 'Ver precios',
  pedir: 'Pedir propuesta',
  preciosHref: '/es/precios',
};
const franjaEn: SectorCopy['franja'] = {
  queEs: 'What it is',
  desdeT: 'Starting at',
  desde: `From ${usd(A.webLanding)} for a landing page; from ${usd(A.web)} for a full custom site.`,
  tiempoT: 'How long it takes',
  tiempo: 'Proposal in 24 hours, with a realistic timeline from day one.',
  verQue: "See what's included",
  verPrecios: 'See pricing',
  pedir: 'Get a proposal',
  preciosHref: '/en/pricing',
};
const hermanasEs: SectorCopy['hermanas'] = {
  title: "<span class='w-tone'>Tu sitio es el centro.</span> Lo demás lo hace crecer.",
  lead: 'Servicios de Marcyan en Houston que se conectan con tu sitio.',
  diag: { title: 'Diagnóstico gratis', text: 'Revisa si tu negocio pierde clientes online.', href: '/es/diagnostico' },
  precios: { title: 'Precios', text: 'Todos los precios de entrada, a la vista.', href: '/es/precios' },
};
const hermanasEn: SectorCopy['hermanas'] = {
  title: "<span class='w-tone'>Your site is the hub.</span> The rest helps it grow.",
  lead: 'Marcyan services in Houston that plug into your site.',
  diag: { title: 'Free checkup', text: 'See if your business is losing customers online.', href: '/en/checkup' },
  precios: { title: 'Pricing', text: 'Every starting price, up front.', href: '/en/pricing' },
};
const cierreEs: SectorCopy['cierre'] = {
  proof: 'Negocios locales de Houston ya trabajan con el sitio a medida que les hicimos.',
  warmTitle: '¿Aún no sabes qué necesitas?',
  warmText: 'Revisa gratis si tu negocio está perdiendo clientes online.',
  warmCta: 'Hacer el diagnóstico',
  warmHref: '/es/diagnostico',
};
const cierreEn: SectorCopy['cierre'] = {
  proof: 'Local Houston businesses already run on the custom sites we built for them.',
  warmTitle: 'Not sure what you need yet?',
  warmText: 'Check for free whether your business is losing customers online.',
  warmCta: 'Take the checkup',
  warmHref: '/en/checkup',
};
const precioEs = (note: string): SectorCopy['precio'] => ({
  eyebrow: 'Inversión',
  title: 'Tu sitio, con el precio a la vista',
  from: 'Desde',
  slice: `Desde ${usd(A.web)}`,
  includes: 'Incluye',
  note,
  cta: 'Pedir mi propuesta',
});
const precioEn = (note: string): SectorCopy['precio'] => ({
  eyebrow: 'Investment',
  title: 'Your site, with the price up front',
  from: 'From',
  slice: `From ${usd(A.web)}`,
  includes: 'Included',
  note,
  cta: 'Get my proposal',
});

// ── Las cuatro páginas ────────────────────────────────────────
export const sectorCopy: Record<SectorKey, SectorCopy> = {
  contratistas: {
    obj: 'contratista',
    chip: 'Houston, TX',
    eyebrow: 'Contratistas',
    lead: 'Tu sitio sale en Google cuando buscan contratista cerca, enseña tus trabajos y contesta por ti mientras estás en la obra.',
    link: 'Ver precios',
    heroSr: 'Ejemplo: a las 9:40 p. m. te llega desde tu web una solicitud de presupuesto para remodelar una cocina en Katy.',
    dilema: {
      label: 'El problema',
      title: "<span class='w-tone'>Estás en la obra.</span><br /> El teléfono no espera.",
      lead: 'Hoy tienes dos opciones, y las dos te cuestan trabajos.',
      left: { title: 'Contestar en plena obra', text: 'Funciona, hasta que estás en el techo con las manos ocupadas.', evidence: ['Llamada entrante · 2:10 p. m.', 'Bajas del techo, pero ya colgaron.'] },
      right: { title: 'Dejar que suene', text: 'Sigues trabajando, y el cliente llama al siguiente contratista.', evidence: ['Llamada perdida · 2:10 p. m.', 'A las 2:12 p. m. ya llamó a otro.'] },
      bridge: 'Con tu sitio y su asistente, no tienes que elegir.',
    },
    ciclo: {
      label: 'Cómo funciona',
      title: "<span class='w-tone'>No contestaste.</span> El trabajo sigue siendo tuyo.",
      lead: 'Lo que pasa cuando suena el teléfono y tú estás en la obra.',
      uTitle: 'De la llamada al presupuesto',
      uSub: 'Cuatro pasos, sin que sueltes la herramienta.',
      nodes: [
        { icon: 'lucide:phone-missed', label: 'Llamada perdida', text: 'Estás en el techo y no puedes contestar.' },
        { icon: 'lucide:message-circle', label: 'Marcy contesta', text: 'Le escribe al instante y le pregunta qué trabajo necesita.' },
        { icon: 'lucide:bell', label: 'Contacto guardado y aviso', text: 'Sus datos quedan guardados y te llega el aviso.' },
        { icon: 'lucide:calendar-check', label: 'Presupuesto agendado', text: 'Lo llamas tú, con todo el contexto, a la hora acordada.' },
      ],
    },
    filas: {
      label: 'Lo que necesita tu web',
      title: 'Un sitio que te consigue trabajos',
      lead: 'Tres cosas que hace por ti mientras trabajas.',
      includes: 'Incluye',
      question: '¿Quién remodela cocinas en Houston?',
      rows: [
        { obj: 'respuesta', title: 'Te encuentran cuando buscan', text: 'Apareces cuando buscan contratista cerca o remodelación en Houston, en Google y en los asistentes de IA. Y tu sitio abre rápido y en su idioma.', items: [0, 5] },
        { obj: 'antes-despues', title: 'Tu trabajo, a la vista', text: 'Tus mejores obras al frente, con fotos de antes y después, tu licencia y tus reseñas reales: lo que el cliente necesita para llamarte a ti.', items: [1, 4] },
        { obj: 'chat', title: 'Ningún trabajo se escapa', text: 'Si no puedes contestar, una IA le escribe al cliente al instante. Y las solicitudes de presupuesto llegan ordenadas a tu correo.', items: [2, 3] },
      ],
      chat: {
        label: 'Llamada perdida',
        script: [
          { from: 'm', text: 'Hola, vimos tu llamada. Ahora mismo estamos en una obra. ¿Qué trabajo necesitas?', time: '2:11 p. m.' },
          { from: 'c', text: 'Cambiar el techo de mi casa, en Pasadena.', time: '2:12 p. m.' },
          { from: 'm', text: 'Anotado. Te llamamos hoy para darte el presupuesto. ¿A nombre de quién?', time: '2:12 p. m.' },
          { from: 'c', text: 'Ana. Gracias.', time: '2:13 p. m.' },
        ],
      },
      chatSr: 'Ejemplo: tras una llamada perdida, Marcy le escribe al cliente, anota el trabajo y queda en que lo llamas hoy con el presupuesto.',
    },
    prosa: { tone1: 'En Houston, el trabajo se lo lleva', tone2: 'quien contesta primero.' },
    proyectos: {
      label: 'Trabajo real',
      title: 'Un oficio de Houston, con su sitio nuevo',
      lead: 'Aún no publicamos un caso de contratista. Este paisajista de Houston sí es trabajo real y verificable.',
      more: 'Más proyectos',
    },
    precio: precioEs(`Una landing empieza en ${usd(A.webLanding)} y un sitio a medida, en ${usd(A.web)}. El SEO local continuo (desde ${usd(A.seoLocal)} al mes) y una IA que rescata llamadas perdidas (desde ${usd(A.ia)}) se suman según lo que necesites. Alcance y precio claros, por escrito.`),
    franja: franjaEs,
    hermanas: hermanasEs,
    cierre: cierreEs,
  },

  'bienes-raices': {
    obj: 'inmobiliaria',
    chip: 'Houston, TX',
    eyebrow: 'Bienes raíces',
    lead: 'Tus propiedades al frente, rápido en el celular y en español e inglés, para captar compradores y vendedores en tu zona de Houston.',
    link: 'Ver precios',
    heroSr: 'Ejemplo: un comprador pregunta si una casa de 3 recámaras sigue disponible.',
    dilema: {
      label: 'El problema',
      title: "<span class='w-tone'>El comprador pregunta hoy.</span><br /> Mañana ya vio otra casa.",
      lead: 'Responder a tiempo decide quién se queda con el cliente.',
      left: { title: 'Contestar tú cada mensaje', text: 'Funciona, hasta que estás mostrando una casa con el teléfono en silencio.', evidence: ['Mensaje · 10:10 p. m.', '¿Sigue disponible la casa de Katy?'] },
      right: { title: 'Contestar mañana', text: 'Tranquilo, hasta que el comprador ya agendó con otro agente.', evidence: ['Visto · 10:10 p. m.', 'Respondes a las 9:00 a. m. Ya tenía otra visita.'] },
      bridge: 'Con tu sitio y su asistente, ningún interesado se enfría.',
    },
    ciclo: {
      label: 'Cómo funciona',
      title: "<span class='w-tone'>El comprador escribe de noche.</span> Mañana ya tiene visita.",
      lead: 'Lo que pasa cuando alguien pregunta por una casa y tú estás mostrando otra.',
      uTitle: 'Del mensaje a la visita',
      uSub: 'Cada interesado queda registrado, aunque escriba a las diez de la noche.',
      nodes: [
        { icon: 'lucide:message-circle', label: 'Pregunta por una casa', text: 'Escribe a las 10:10 p. m. si sigue disponible.' },
        { icon: 'lucide:messages-square', label: 'Marcy responde', text: 'Contesta, pregunta si compra o vende y pide sus datos.' },
        { icon: 'lucide:bell', label: 'Interesado guardado y aviso', text: 'Queda registrado y te llega el aviso con el resumen.' },
        { icon: 'lucide:calendar-check', label: 'Visita agendada', text: 'La confirmas tú al día siguiente, con todo el contexto.' },
      ],
    },
    filas: {
      label: 'Lo que necesita tu web',
      title: 'Un sitio que trabaja por tu negocio',
      lead: 'Tres cosas que hace por ti mientras enseñas casas.',
      includes: 'Incluye',
      question: '¿Un agente inmobiliario que hable español en Katy?',
      rows: [
        { obj: 'listados', title: 'Tus propiedades, al frente', text: 'Listados con fotos, mapa y detalles, fáciles de explorar desde el celular, con tu marca personal en cada página.', items: [0, 5] },
        { obj: 'chat', title: 'Cada interesado, registrado', text: 'Formularios claros y un asistente que responde a cualquier hora, para que nadie se pierda entre mensajes.', items: [1, 3] },
        { obj: 'respuesta', title: 'Te encuentran por zona, en dos idiomas', text: 'Apareces cuando buscan casas en venta en tu zona, en Google y en la IA, y le hablas a cada comprador en su idioma.', items: [2, 4] },
      ],
      chat: {
        label: 'Comprador',
        script: [
          { from: 'c', text: 'Hola, ¿la casa de Katy sigue disponible?', time: '10:10 p. m.' },
          { from: 'm', text: 'Sí, sigue disponible y se muestra el sábado. ¿Buscas comprar, o también vender tu casa actual?', time: '10:10 p. m.' },
          { from: 'c', text: 'Comprar. ¿Puedo verla el sábado?', time: '10:11 p. m.' },
          { from: 'm', text: 'Claro. ¿Me dejas tu nombre? Te aparto la visita y te la confirman mañana.', time: '10:11 p. m.' },
        ],
      },
      chatSr: 'Ejemplo: a las 10:10 p. m. un comprador pregunta por una casa en Katy y Marcy le aparta la visita del sábado.',
    },
    prosa: { tone1: 'En Houston, tu comprador busca casa', tone2: 'desde el celular y en español.' },
    proyectos: {
      label: 'Trabajo real',
      title: 'Sitios a medida reales',
      lead: 'Aún no publicamos un caso inmobiliario. Estos sitios de Houston sí son trabajo real y verificable.',
      more: 'Proyectos',
    },
    precio: precioEs(`Una landing empieza en ${usd(A.webLanding)} y un sitio a medida, en ${usd(A.web)}. El SEO local continuo (desde ${usd(A.seoLocal)} al mes) y un asistente con IA que responde a cualquier hora (desde ${usd(A.ia)}) se suman según lo que necesites. Alcance y precio claros, por escrito.`),
    franja: franjaEs,
    hermanas: hermanasEs,
    cierre: cierreEs,
  },

  contractors: {
    obj: 'contratista',
    chip: 'Houston, TX',
    eyebrow: 'Contractors',
    lead: "Your site shows up when people search for a contractor nearby, shows off your work, and answers for you while you're on the job.",
    link: 'See pricing',
    heroSr: 'Example: at 9:40 PM an estimate request for a kitchen remodel in Katy comes in through your website.',
    dilema: {
      label: 'The problem',
      title: "<span class='w-tone'>You're on the job.</span><br /> The phone won't wait.",
      lead: 'Right now you have two options, and both cost you work.',
      left: { title: 'Pick up mid-job', text: "Works, until you're up on a roof with your hands full.", evidence: ['Incoming call · 2:10 PM', 'You climb down, but they already hung up.'] },
      right: { title: 'Let it ring', text: 'You keep working, and the customer calls the next contractor.', evidence: ['Missed call · 2:10 PM', "By 2:12 PM they'd called someone else."] },
      bridge: "With your site and its assistant, you don't have to choose.",
    },
    ciclo: {
      label: 'How it works',
      title: "<span class='w-tone'>You missed the call.</span> The job is still yours.",
      lead: "What happens when the phone rings and you're up on a roof.",
      uTitle: 'From missed call to estimate',
      uSub: 'Four steps, and you never put the tools down.',
      nodes: [
        { icon: 'lucide:phone-missed', label: 'Missed call', text: "You're on the roof and can't pick up." },
        { icon: 'lucide:message-circle', label: 'Marcy answers', text: 'She texts them right away and asks what job they need.' },
        { icon: 'lucide:bell', label: 'Lead saved, you get the alert', text: 'Their details are saved and you get notified.' },
        { icon: 'lucide:calendar-check', label: 'Estimate booked', text: 'You call back with the full picture, at the time you agreed on.' },
      ],
    },
    filas: {
      label: 'What your site needs',
      title: 'A site that wins you jobs',
      lead: 'Three things it does for you while you work.',
      includes: 'Included',
      question: 'Who does kitchen remodels in Houston?',
      rows: [
        { obj: 'respuesta', title: 'They find you when they search', text: 'You show up when people search for a contractor nearby or remodeling in Houston, on Google and in AI assistants. And your site loads fast, in their language.', items: [0, 5] },
        { obj: 'antes-despues', title: 'Your work, front and center', text: 'Your best jobs up front, with before-and-after photos, your license and your real reviews: what a customer needs to call you.', items: [1, 4] },
        { obj: 'chat', title: 'No job slips away', text: "When you can't pick up, AI texts the customer right away. And estimate requests land organized in your inbox.", items: [2, 3] },
      ],
      chat: {
        label: 'Missed call',
        script: [
          { from: 'm', text: "Hi, we saw your call. We're on a job right now. What work do you need done?", time: '2:11 PM' },
          { from: 'c', text: 'A new roof on my house, in Pasadena.', time: '2:12 PM' },
          { from: 'm', text: "Got it. We'll call you today with the estimate. What name should I put down?", time: '2:12 PM' },
          { from: 'c', text: 'Ana. Thanks.', time: '2:13 PM' },
        ],
      },
      chatSr: 'Example: after a missed call, Marcy texts the customer, notes the job and lets them know you will call today with the estimate.',
    },
    prosa: { tone1: 'In Houston, the job goes to', tone2: 'whoever answers first.' },
    proyectos: {
      label: 'Real work',
      title: 'A Houston trade, with its new site',
      lead: "We haven't published a contractor case yet. This Houston landscaper is real, verifiable work.",
      more: 'More projects',
    },
    precio: precioEn(`A landing page starts at ${usd(A.webLanding)} and a full custom site at ${usd(A.web)}. Ongoing local SEO (from ${usd(A.seoLocal)} a month) and AI that catches missed calls (from ${usd(A.ia)}) are added based on what you need. A clear scope and price, in writing.`),
    franja: franjaEn,
    hermanas: hermanasEn,
    cierre: cierreEn,
  },

  restaurants: {
    obj: 'restaurante',
    chip: 'Houston, TX',
    eyebrow: 'Restaurants',
    lead: 'Your menu online with a QR code on the table, and orders or reservations straight to your WhatsApp. No app takes a cut.',
    link: 'See pricing',
    heroSr: "Example: today's menu with a button to order on WhatsApp.",
    dilema: {
      label: 'The problem',
      title: "<span class='w-tone'>The apps take a cut.</span><br /> The phone rings mid-rush.",
      lead: 'Most kitchens end up picking one of two bad options.',
      left: { title: 'Sell through the apps', text: 'Easy, until 25% to 30% of every order goes to them.', evidence: ['App order · 7:15 PM', 'The commission comes off before you see it.'] },
      right: { title: 'Take orders by phone', text: 'No cut, until it rings with every burner going.', evidence: ['Missed call · 7:16 PM', 'Three tickets on the grill. Nobody free.'] },
      bridge: 'With your own site, orders come straight to you.',
    },
    ciclo: {
      label: 'How it works',
      title: "<span class='w-tone'>Mid-rush, someone wants to order.</span> The order still comes in.",
      lead: 'What happens when a customer writes and every burner is on.',
      uTitle: 'From question to pickup',
      uSub: 'Orders and reservations reach you directly, with no app in the middle.',
      nodes: [
        { icon: 'lucide:message-circle', label: 'Asks about the menu', text: 'A message comes in at 7:10 PM' },
        { icon: 'lucide:messages-square', label: 'Marcy replies', text: 'She sends the menu and takes the order or the reservation.' },
        { icon: 'lucide:bell', label: 'Order saved, you get the alert', text: 'It reaches your WhatsApp with everything the kitchen needs.' },
        { icon: 'lucide:shopping-bag', label: 'Ready for pickup', text: 'The customer picks up and pays you the full price.' },
      ],
    },
    filas: {
      label: 'What your site needs',
      title: 'A site that fills your kitchen',
      lead: 'Three things it does for you while you cook.',
      includes: 'Included',
      rows: [
        { obj: 'mesa-qr', title: 'Your menu, one scan away', text: 'A QR code on the table opens your menu on any phone, in English and Spanish. Change a price or pull a sold-out dish without reprinting.', items: [0, 5] },
        { obj: 'chat', title: 'Orders and reservations, straight to you', text: 'Customers build their order or ask for a table and it lands in your WhatsApp. No app takes a cut, and an assistant handles questions while you cook.', items: [1, 2] },
        { obj: 'platos', title: 'Photos that make people hungry', text: "Your dishes shown the way they deserve. And for food trucks, where you're parked today, so regulars can find you.", items: [3, 4] },
      ],
      chat: {
        label: 'To go',
        script: [
          { from: 'c', text: 'Hi! Two shrimp tacos and rice and beans, to go.', time: '7:10 PM' },
          { from: 'm', text: 'Got it: two shrimp tacos and rice and beans. Ready for pickup in 20 minutes. Name for the order?', time: '7:10 PM' },
          { from: 'c', text: 'Luis.', time: '7:11 PM' },
          { from: 'm', text: 'Thanks, Luis. Your order is in. See you at 7:30 PM.', time: '7:11 PM' },
        ],
      },
      chatSr: 'Example: a customer orders tacos to go by message and Marcy confirms the order and the pickup time.',
    },
    prosa: { tone1: 'In Houston, your taqueria lives on', tone2: 'WhatsApp, not an expensive app.' },
    proyectos: {
      label: 'Real work',
      title: 'Real bespoke sites',
      lead: "We haven't published a restaurant case yet. These Houston sites are real, verifiable work.",
      more: 'Projects',
    },
    precio: precioEn(`A landing page starts at ${usd(A.webLanding)} and a full custom site with your menu at ${usd(A.web)}. An AI assistant that takes orders over WhatsApp (from ${usd(A.ia)}) and local SEO for Google and Maps (from ${usd(A.seoLocal)} a month) are added based on what you need. A clear scope and price, in writing.`),
    franja: franjaEn,
    hermanas: hermanasEn,
    cierre: cierreEn,
  },
};

/** Clave de copy de cada ruta (las 4 de KIND_BY_PATH con tipo `sector`). */
export const SECTOR_BY_PATH: Record<string, SectorKey> = {
  '/es/houston/contratistas': 'contratistas',
  '/es/houston/bienes-raices': 'bienes-raices',
  '/en/houston/contractors': 'contractors',
  '/en/houston/restaurants': 'restaurants',
};
