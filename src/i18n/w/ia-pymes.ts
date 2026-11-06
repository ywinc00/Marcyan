// ─────────────────────────────────────────────────────────────
// Copy nuevo del tipo `ia-pymes` · IA para pymes (design/rediseno-workos.md §4.11, ola 2),
// ES (/es/ia-para-pymes) y EN nativo (/en/ai-for-small-business, R4: escrito en inglés, no
// traducido palabra por palabra). Solo texto LIBRE; lo congelado (H1, answer, faq,
// local.paragraphs, service, meta) sigue en clusters.ts / clusters.en.ts.
// Sin guiones conectores, "dominamos" / "we master" la IA, sin cifras ni reseñas
// inventadas; las conversaciones y los negocios son de EJEMPLO y van rotulados.
// ─────────────────────────────────────────────────────────────

type Kind = 'ok' | 'mid' | 'off';

const es = {
  eyebrow: 'Marcy contesta por ti',
  // Sin cola: H1 noche + cola no caben en 2 líneas a 1440 en la columna de 560 (regla de
  // §2.14); la idea abre la bajada y el degradado pasa a la cifra del precio.
  lead: 'Tu negocio contesta aunque estés cerrado. Marcy responde a tus clientes, agenda citas y te pasa lo que necesita una persona, en español y sin que tengas que saber de tecnología.',
  primary: 'Quiero a Marcy',
  link: 'Ver cómo decide',

  triada: [
    { tone1: 'Contesta.', tone2: 'A cualquier hora.', text: 'De día, de noche y en fin de semana, en el momento en que te escriben.' },
    { tone1: 'Bilingüe.', tone2: 'De verdad.', text: 'En el español de tus clientes y en inglés, con tu tono. No suena a traducción.' },
    { tone1: 'Te avisa.', tone2: 'Cuando hace falta.', text: 'Lo que necesita una persona te llega a ti, con el resumen de lo que se habló.' },
  ] as [{ tone1: string; tone2: string; text: string }, { tone1: string; tone2: string; text: string }, { tone1: string; tone2: string; text: string }],

  dilema: {
    label: 'Cómo decide',
    title: '<span class="w-tone">Contestar tú o poner un bot.</span> Hay una tercera opción.',
    lead: 'Contestar todo tú no escala, y un bot de respuestas fijas cansa al cliente. Marcy entiende lo que te piden y responde con los datos de tu negocio.',
    left: { title: 'Contestar tú cada mensaje', text: 'Respondes bien, pero entre trabajo y trabajo, y de noche nadie contesta.', evidence: ['Mensaje de las 22:14', '¿Tienen cita para mañana temprano?', 'Sin responder'] },
    right: { title: 'Un bot de respuestas fijas', text: 'Contesta siempre, pero solo lo que alguien le dejó escrito.', evidence: ['Respuesta automática', 'Gracias por escribir. Horario de 9 a 5.', 'La misma, pregunte lo que pregunte.'] },
    bridge: 'Marcy contesta como tu negocio, a cualquier hora, y te pasa lo demás.',
  },

  decide: {
    label: 'La IA ya decide por tus clientes',
    title: '<span class="w-tone">Tus clientes ya le preguntan a la IA.</span> ¿Te nombra a ti?',
  },

  montada: {
    label: 'Así está montada',
    title: '<span class="w-tone">Un cerebro,</span> todos tus canales.',
    text: 'Marcy piensa con Claude y responde donde te escriben tus clientes.',
    filas: ['Piensa con', 'Contesta en', 'Te encuentran en'] as [string, string, string],
  },

  canales: {
    label: 'Dónde trabaja',
    title: '<span class="w-tone">Donde ya te escriben.</span> Sin cambiar de herramientas.',
    text: 'Marcy contesta en tu web y en los canales que tus clientes ya usan, agenda en tu calendario y te avisa por correo. Antes de empezar te decimos con honestidad cuáles se pueden conectar en tu negocio.',
    chips: ['Tu web', 'WhatsApp', 'Instagram', 'Messenger', 'Calendario', 'Correo'],
    sr: 'Marcy trabaja con tu web, WhatsApp, Instagram, Messenger, tu calendario y tu correo.',
  },

  datos: {
    label: 'Tus datos, a salvo',
    title: '<span class="w-tone">Contesta por ti.</span> Sin poner en riesgo a tus clientes.',
    text: 'Así está hecha Marcy en este mismo sitio, y así la instalamos en tu negocio.',
    checks: [
      'Los datos personales de tus clientes no pasan por el modelo de IA.',
      'Te pasa a una persona cuando hace falta, con el resumen de lo que se habló.',
      'No inventa precios: si no está en tus datos, te lo pasa.',
      'Tú decides qué responde y qué no.',
    ],
    wrote: 'Lo que escribe tu cliente',
    sees: 'Lo que recibe la IA',
    msg: ['Hola, soy ', 'Ana Pérez', ', mi número es ', '(713) 555 0142', '. ¿Me agendan el sábado?'],
    masked: ['[nombre]', '[teléfono]'],
    stays: 'El nombre y el teléfono se quedan en tu negocio',
    sr: 'Ejemplo: el cliente escribe su nombre y su teléfono, y a la IA le llega el mensaje con esos datos ocultos.',
  },

  caso: {
    label: 'Automatización real',
    title: '<span class="w-tone">No es una promesa.</span> Ya está en uso.',
    lead: 'Una web app de reservas que hicimos para un salón de Houston: sus clientas agendan solas.',
  },

  precio: { eyebrow: 'Inversión', title: 'Automatización con IA', cta: 'Quiero automatizar mi negocio', includesLabel: 'Qué incluye' },

  franja: {
    queEs: 'Qué es', verQue: 'Ver qué incluye',
    desde: 'Desde cuánto', verPrecios: 'Ver precios', preciosHref: '/es/precios',
    desdeText: (basic: string, full: string) => `Asistente básico ${basic.toLowerCase()}. Completo, instalado y mantenido, ${full.toLowerCase()}.`,
    tiempo: 'En cuánto tiempo', pedir: 'Pedir propuesta',
    tiempoText: 'Propuesta en 24 horas. Empezamos por una sola solución a tu mayor dolor y crecemos desde ahí.',
  },

  cierre: {
    proof: 'Marcy, la asistente de este sitio, contesta en español y en inglés a cualquier hora. La tuya puede hacer lo mismo.',
    warmTitle: 'Pregúntale a Marcy ahora',
    warmText: 'Está aquí mismo. Pregúntale lo que quieras saber antes de pedir tu propuesta.',
    warmCta: 'Abrir el chat',
    ask: '¿Cómo funcionaría un asistente como tú en mi negocio?',
  },

  hermanas: {
    title: '<span class="w-tone">Marcy trabaja mejor</span> con todo lo demás.',
    lead: 'Todo lo que hacemos, para que tu asistente tenga una buena casa.',
    calc: { title: 'Calculadora de llamadas perdidas', text: 'Mira cuánto vale al mes lo que hoy se te escapa por no contestar.', href: '/es/herramientas#llamadas' },
    diag: { title: 'Diagnóstico gratis', text: 'Revisamos tu web, tu ficha de mapa y si la IA te encuentra.', href: '/es/diagnostico' },
    precios: { title: 'Precios', text: 'Todos los servicios y lo que incluye cada uno.', href: '/es/precios' },
  },
};

const en: typeof es = {
  eyebrow: 'Marcy answers for you',
  lead: 'Your business answers even when you are closed. Marcy replies to your customers, books appointments and hands you what needs a person, in English and Spanish, no tech skills required.',
  primary: 'I want Marcy',
  link: 'See how she decides',

  triada: [
    { tone1: 'Answers.', tone2: 'Any time.', text: 'Day, night or weekend, the moment a customer reaches out.' },
    { tone1: 'Bilingual.', tone2: 'For real.', text: 'Natural English and your customers’ Spanish, in your voice. Never a word-for-word translation.' },
    { tone1: 'Loops you in.', tone2: 'When it matters.', text: 'Anything that needs a person comes straight to you, with a summary of the chat.' },
  ],

  dilema: {
    label: 'How she decides',
    title: '<span class="w-tone">Answer it all yourself, or set up a bot.</span> There is a third way.',
    lead: 'Answering everything yourself does not scale, and a canned-reply bot wears customers out. Marcy understands what people ask and replies with your business details.',
    left: { title: 'Answering every message yourself', text: 'You reply well, but only between jobs, and nobody answers at night.', evidence: ['Message at 10:14 p.m.', 'Any openings early tomorrow?', 'No reply'] },
    right: { title: 'A canned-reply bot', text: 'It always answers, but only what someone typed in ahead of time.', evidence: ['Auto-reply', 'Thanks for reaching out. Hours are 9 to 5.', 'Same reply, whatever you ask.'] },
    bridge: 'Marcy answers like your business would, any time, and hands you the rest.',
  },

  decide: {
    label: 'AI already decides for your customers',
    title: '<span class="w-tone">Your customers already ask AI.</span> Does it name you?',
  },

  montada: {
    label: 'How it’s built',
    title: '<span class="w-tone">One brain,</span> every channel.',
    text: 'Marcy thinks with Claude and answers wherever your customers reach you.',
    filas: ['Thinks with', 'Answers on', 'Found on'],
  },

  canales: {
    label: 'Where she works',
    title: '<span class="w-tone">Where customers already reach you.</span> No new tools to learn.',
    text: 'Marcy answers on your website and on the channels your customers already use, books into your calendar and lets you know by email. Before we start, we tell you honestly which ones we can connect for your business.',
    chips: ['Your website', 'WhatsApp', 'Instagram', 'Messenger', 'Calendar', 'Email'],
    sr: 'Marcy works with your website, WhatsApp, Instagram, Messenger, your calendar and your email.',
  },

  datos: {
    label: 'Your data, kept safe',
    title: '<span class="w-tone">She answers for you.</span> Without putting your customers at risk.',
    text: 'That is how Marcy works on this very site, and how we set her up for your business.',
    checks: [
      'Your customers’ personal details never go through the AI model.',
      'She hands the chat to a person when needed, with a summary of what was said.',
      'She never makes up prices: if it is not in your details, she passes it to you.',
      'You decide what she answers and what she does not.',
    ],
    wrote: 'What your customer types',
    sees: 'What the AI receives',
    msg: ['Hi, I’m ', 'Ana Pérez', ', my number is ', '(713) 555 0142', '. Can you book me for Saturday?'],
    masked: ['[name]', '[phone]'],
    stays: 'The name and phone number stay with your business',
    sr: 'Example: the customer types their name and phone number, and the AI receives the message with those details hidden.',
  },

  caso: {
    label: 'Real automation',
    title: '<span class="w-tone">Not a promise.</span> Already in use.',
    lead: 'A booking web app we built for a Houston nail salon: clients book on their own.',
  },

  precio: { eyebrow: 'Investment', title: 'AI automation', cta: 'I want to automate my business', includesLabel: 'What’s included' },

  franja: {
    queEs: 'What it is', verQue: 'See what’s included',
    desde: 'Starting price', verPrecios: 'See pricing', preciosHref: '/en/pricing',
    desdeText: (basic: string, full: string) => `Basic assistant ${basic.toLowerCase()}. Complete, installed and maintained, ${full.toLowerCase()}.`,
    tiempo: 'How long it takes', pedir: 'Get a proposal',
    tiempoText: 'Proposal within 24 hours. We start with one solution to your biggest pain point and grow from there.',
  },

  cierre: {
    proof: 'Marcy, the assistant on this site, answers in English and Spanish at any hour. Yours can do the same.',
    warmTitle: 'Ask Marcy right now',
    warmText: 'She is right here. Ask her anything before you request your proposal.',
    warmCta: 'Open the chat',
    ask: 'How would an assistant like you work for my business?',
  },

  hermanas: {
    title: '<span class="w-tone">Marcy works best</span> with everything else.',
    lead: 'Everything we do, so your assistant has a good home.',
    calc: { title: 'Missed-call calculator', text: 'See what the calls you miss today are worth each month.', href: '/en/tools#calls' },
    diag: { title: 'Free checkup', text: 'We review your website, your map listing and whether AI can find you.', href: '/en/checkup' },
    precios: { title: 'Pricing', text: 'Every service and what each one includes.', href: '/en/pricing' },
  },
};

export const iaPymesCopy = { es, en };
export type IaPymesCopy = typeof es;
export type { Kind };
