// Copy de los componentes globales de la v2 (design/rediseno-workos-v2.md §3 G00).
// · cierreChat: la conversación de ejemplo que llena la tarjeta cálida "Marcy" de
//   CierreDosTarjetas. La 1.ª pregunta NO vive aquí: es el texto fijo `ask` de cada página
//   (el mismo que envía el botón "Pregúntale a Marcy"), así el ejemplo enseña justo lo que
//   pasa al pulsarlo. Las respuestas no prometen nada que Marcy no haga: pregunta por el
//   negocio (como hace en el chat real) y confirma que contesta en los dos idiomas, que es
//   lo que ya dice el texto de la tarjeta.

export const cierreChat = {
  es: {
    reply: 'Con gusto te lo explico. Primero, ¿a qué se dedica tu negocio?',
    q2: '¿También contestan en inglés?',
    a2: 'Sí, en español o en inglés, como prefieras.',
    sr: (ask: string) => `Ejemplo: le preguntas a Marcy «${ask}» y te contesta al momento.`,
    // Versión ligera de los hubs: solo el saludo con el que abre el chat.
    online: 'en línea',
    hola: '¡Hola! Soy Marcy. ¿En qué te ayudo con tu negocio?',
    srHola: 'Ejemplo: Marcy te saluda en el chat y te pregunta en qué te ayuda.',
  },
  en: {
    reply: "Happy to walk you through it. First, what does your business do?",
    q2: 'Do you answer in Spanish too?',
    a2: 'Yes, in English or Spanish, whichever you prefer.',
    sr: (ask: string) => `Example: you ask Marcy "${ask}" and she answers right away.`,
    online: 'online',
    hola: "Hi! I'm Marcy. How can I help your business?",
    srHola: 'Example: Marcy greets you in the chat and asks how she can help.',
  },
} as const;
