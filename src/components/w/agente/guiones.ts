// ─────────────────────────────────────────────────────────────
// Guiones ES/EN de la ventana de agente (design/rediseno-workos-v2.md §2 P05).
// Datos puros: los lee VentanaAgente.astro (estado final en el HTML) y agente.ts
// (reproducción en el navegador). Todo es EJEMPLO rotulado; horas en 12 h (§1.6).
// Copy propuesto, a validar por el dueño (§5-11). Sin cifras ni testimonios.
//
// Bloques de una respuesta (Bloque):
//   { t: 'paso', texto, ramas[] }  → "● Paso" con ramas "├ …" / "└ …"; punto que
//                                     late mientras está pendiente y pasa a check.
//   { t: 'texto', partes[] }       → frase; partes con b:true van en negrita.
// ─────────────────────────────────────────────────────────────

export type Lang = 'es' | 'en';
export type Parte = { s: string; b?: boolean };
export type Bloque =
  | { t: 'paso'; texto: string; ramas: string[] }
  | { t: 'texto'; partes: Parte[] };

/** Una escena del guion "marcy": un cliente escribe por un canal y Marcy resuelve. */
export interface EscenaMarcy {
  /** Fila del menú ("1. Reservar una cita"). */
  opcion: string;
  /** Lo que escribe el cliente (se teclea en la banda del historial). */
  cliente: string;
  /** Lo que "Pregúntale tú a Marcy" manda al chat REAL: frase del visitante (dueño de un
   *  negocio), nunca la del cliente del ejemplo. Pendiente del OK del dueño. */
  pide: string;
  /** Título de la ventana mientras trabaja (va tras "✳ "). */
  titulo: string;
  /** Texto junto al spinner. */
  pensando: string;
  /** Respuesta en bloques. */
  bloques: Bloque[];
  /** Frase de cierre. */
  cierre: Parte[];
}

export interface GuionMarcy {
  tituloInicial: string;
  evento: string;
  nombre: string;
  rol: string;
  motor: string; // "funciona con" (va antes del logo de Claude)
  canal: string;
  pieA: string;
  pieB: string;
  preguntaMenu: string;
  pregunta: string; // "▸ Pregúntale tú a Marcy"
  hecha: string; // texto sr-only para opciones ya vistas
  idioma: { es: string; en: string; etiqueta: string };
  escenas: [EscenaMarcy, EscenaMarcy, EscenaMarcy];
  sr: string;
  ejemplo: string;
}

const MARCY_ES: GuionMarcy = {
  tituloInicial: 'Esperando mensajes',
  evento: 'whatsapp · cliente',
  nombre: 'Marcy',
  rol: 'asistente de Tu Negocio',
  motor: 'funciona con',
  canal: 'whatsapp · Tu Negocio',
  pieA: 'Atiende 24/7',
  pieB: 'ES · EN',
  preguntaMenu: '¿Qué más le pide tu cliente?',
  pregunta: 'Pregúntale tú a Marcy',
  hecha: 'vista',
  idioma: { es: 'Español', en: 'English', etiqueta: 'Idioma del ejemplo' },
  escenas: [
    {
      opcion: 'Reservar una cita',
      cliente: '¿Tienen cita mañana por la tarde?',
      pide: 'Quiero que Marcy reserve las citas de mi negocio.',
      titulo: 'Buscando hueco en tu agenda',
      pensando: 'Leyendo tu agenda…',
      bloques: [
        { t: 'paso', texto: 'Leyendo tu agenda', ramas: ['Mañana: 2 huecos libres'] },
        { t: 'paso', texto: 'Confirmando con el cliente', ramas: ['Cita a las 4:00 p. m.'] },
      ],
      cierre: [{ s: 'Listo. Cita mañana a las 4:00 p. m. en ' }, { s: 'Tu Negocio', b: true }, { s: '. Ya avisé al dueño por correo.' }],
    },
    {
      opcion: 'Pedir un presupuesto',
      cliente: '¿Me pueden dar un presupuesto?',
      pide: 'Quiero que Marcy atienda las peticiones de presupuesto de mi negocio.',
      titulo: 'Revisando tus servicios',
      pensando: 'Revisando tus servicios…',
      bloques: [{ t: 'paso', texto: 'Revisando tus servicios', ramas: ['Pide fotos del trabajo'] }],
      cierre: [{ s: 'Te lo paso con los datos para cotizar.' }],
    },
    {
      opcion: 'Hablar con una persona',
      cliente: '¿Puedo hablar con alguien?',
      pide: '¿Cómo me pasa Marcy las conversaciones que necesitan a una persona?',
      titulo: 'Pasando la conversación',
      pensando: 'Pasando la conversación…',
      bloques: [{ t: 'paso', texto: 'Pasando la conversación', ramas: ['Aviso al dueño por WhatsApp'] }],
      cierre: [{ s: 'Te escribe una persona en cuanto pueda.' }],
    },
  ],
  sr: 'Ejemplo: un cliente pregunta por WhatsApp si hay cita mañana por la tarde; Marcy, la asistente de Tu Negocio, lee la agenda, confirma la cita a las 4:00 p. m. y avisa al dueño por correo. Puedes elegir otra petición del cliente o preguntarle tú a Marcy.',
  ejemplo: 'Ejemplo',
};

const MARCY_EN: GuionMarcy = {
  tituloInicial: 'Waiting for messages',
  evento: 'whatsapp · customer',
  nombre: 'Marcy',
  rol: 'assistant for Your Business',
  motor: 'runs on',
  canal: 'whatsapp · Your Business',
  pieA: 'Answers 24/7',
  pieB: 'ES · EN',
  preguntaMenu: 'What else does your customer ask?',
  pregunta: 'Ask Marcy yourself',
  hecha: 'seen',
  idioma: { es: 'Español', en: 'English', etiqueta: 'Example language' },
  escenas: [
    {
      opcion: 'Book an appointment',
      cliente: 'Do you have anything tomorrow afternoon?',
      pide: 'I want Marcy to book appointments for my business.',
      titulo: 'Finding an open slot',
      pensando: 'Checking your calendar…',
      bloques: [
        { t: 'paso', texto: 'Checking your calendar', ramas: ['Tomorrow: 2 open slots'] },
        { t: 'paso', texto: 'Confirming with the customer', ramas: ['Booked for 4:00 PM'] },
      ],
      cierre: [{ s: "Done. You're booked tomorrow at 4:00 PM at " }, { s: 'Your Business', b: true }, { s: ". I've already emailed the owner." }],
    },
    {
      opcion: 'Get a quote',
      cliente: 'Can I get a quote?',
      pide: 'I want Marcy to handle quote requests for my business.',
      titulo: 'Reviewing your services',
      pensando: 'Reviewing your services…',
      bloques: [{ t: 'paso', texto: 'Reviewing your services', ramas: ['Asks for photos of the job'] }],
      cierre: [{ s: "I'm passing it on with the details for a quote." }],
    },
    {
      opcion: 'Talk to a person',
      cliente: 'Can I talk to someone?',
      pide: 'How does Marcy hand off conversations that need a person?',
      titulo: 'Handing off the conversation',
      pensando: 'Handing off the conversation…',
      bloques: [{ t: 'paso', texto: 'Handing off the conversation', ramas: ['Lets the owner know on WhatsApp'] }],
      cierre: [{ s: 'A person will message you as soon as they can.' }],
    },
  ],
  sr: 'Example: a customer asks on WhatsApp whether there is anything tomorrow afternoon; Marcy, the assistant for Your Business, checks the calendar, books 4:00 PM and emails the owner. You can pick another customer request or ask Marcy yourself.',
  ejemplo: 'Example',
};

// ── Guion "buscar" (SEO para IA, piel hueso, W-NEW-04) ──────────────
export type Escenario = 'sin' | 'con';
export interface GuionBuscar {
  titulo: string;
  cabecera: string; // "Así contestan los asistentes"
  pregunta: string; // "¿Qué le preguntan tus clientes a la IA?"
  opciones: [string, string, string];
  intro: string;
  respuestas: Record<Escenario, { bloques: Bloque[]; cierre: Parte[] }>;
  otra: string; // "Otra pregunta"
  escenarios: { sin: string; con: string; etiqueta: string };
  ayuda: string;
  sr: string;
  ejemplo: string;
}

const BUSCAR_ES: GuionBuscar = {
  titulo: '~ asistente · tu cliente pregunta',
  cabecera: 'Así contestan los asistentes',
  pregunta: '¿Qué le preguntan tus clientes a la IA?',
  opciones: ['Plomero que hable español en Houston', '¿Quién arregla un calentador hoy?', 'Tu negocio: la recomendación que buscamos'],
  intro: 'Busco opciones cerca de ti.',
  respuestas: {
    con: {
      bloques: [
        { t: 'paso', texto: 'Leyendo fuentes', ramas: ['tunegocio.example · datos para asistentes', 'Ficha de mapa · horario y servicios'] },
        { t: 'paso', texto: 'Comparando', ramas: ['Atiende en español e inglés', 'Abierto ahora'] },
      ],
      cierre: [{ s: 'Te recomiendo ' }, { s: 'Tu Negocio', b: true }, { s: ': atiende en español e inglés y abre hasta las 6 p. m.' }],
    },
    sin: {
      bloques: [
        { t: 'paso', texto: 'Leyendo fuentes', ramas: ['un directorio de negocios', 'Ficha de mapa · sin horario'] },
        { t: 'paso', texto: 'Comparando', ramas: ['No queda claro quién atiende en español'] },
      ],
      cierre: [{ s: 'Te sugiero revisar un directorio: no encontré datos claros de un negocio cercano.' }],
    },
  },
  otra: 'Otra pregunta',
  escenarios: { sin: 'Sin datos para IA', con: 'Con Marcyan', etiqueta: 'Escenario del ejemplo' },
  ayuda: '↑↓ para moverte · ↵ para elegir',
  sr: 'Ejemplo: un cliente le pregunta a un asistente de IA por un negocio cercano. Con los datos que prepara Marcyan, el asistente recomienda a Tu Negocio; sin esos datos, cita un directorio.',
  ejemplo: 'Ejemplo',
};

const BUSCAR_EN: GuionBuscar = {
  titulo: '~ assistant · your customer asks',
  cabecera: 'How assistants answer',
  pregunta: 'What do your customers ask AI?',
  opciones: ['Spanish-speaking plumber in Houston', 'Who can fix a water heater today?', 'Your business: the recommendation we want'],
  intro: "I'm looking for options near you.",
  respuestas: {
    con: {
      bloques: [
        { t: 'paso', texto: 'Reading sources', ramas: ['yourbusiness.example · data for assistants', 'Map listing · hours and services'] },
        { t: 'paso', texto: 'Comparing', ramas: ['Serves in Spanish and English', 'Open now'] },
      ],
      cierre: [{ s: 'I recommend ' }, { s: 'Your Business', b: true }, { s: ': they serve in Spanish and English and are open until 6 PM.' }],
    },
    sin: {
      bloques: [
        { t: 'paso', texto: 'Reading sources', ramas: ['a business directory', 'Map listing · no hours'] },
        { t: 'paso', texto: 'Comparing', ramas: ["It's unclear who serves in Spanish"] },
      ],
      cierre: [{ s: "Try checking a directory: I couldn't find clear details on a business nearby." }],
    },
  },
  otra: 'Another question',
  escenarios: { sin: 'Without AI-ready data', con: 'With Marcyan', etiqueta: 'Example scenario' },
  ayuda: '↑↓ to move · ↵ to pick',
  sr: 'Example: a customer asks an AI assistant for a business nearby. With the data Marcyan prepares, the assistant recommends Your Business; without it, it points to a directory.',
  ejemplo: 'Example',
};

export const GUIONES = {
  marcy: { es: MARCY_ES, en: MARCY_EN },
  buscar: { es: BUSCAR_ES, en: BUSCAR_EN },
} as const;

/** Glifos del spinner (en este orden, bucle de 1,2 s en steps(10)). */
export const SPINNER = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'];

/** Tiempos del guion "marcy" en ms desde que la pieza entra en vista (medidos en W-ADV-16). */
export const T = {
  aparece: 0, // 0-500 ms la ventana aparece
  evento: 600, // rótulo + banda; se teclea a 60 ms/letra
  letra: 60,
  enviado: 2900, // la banda se fija, cambia el título, spinner
  respuesta: 4300, // bloques, filas cada 150 ms
  fila: 150,
  cierre: 5300,
  menu: 5800,
  inactivo: 6000, // sin elección en 6 s → elige la siguiente (una vez por ciclo)
  reentrada: 8000, // fuera de vista ≥ 8 s → se reproduce de nuevo
} as const;
