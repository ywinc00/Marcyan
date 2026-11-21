// ════════════════════════════════════════════════════════════════
//  lib/condiciones-legales.mjs — frases legales cortas que Marcy puede decir
//
//  Legal, 2026-11-15 (estimado) y 2026-11-20 (`05-condiciones-comerciales.md`), tal cual.
//  Es el ÚNICO sitio de cada frase: el guion (lib/chat-kb.mjs) y la cotización
//  (lib/marcy-quote.mjs) las importan de aquí, y test:cotizar falla si una se copia.
//  Cambiar una = cambiarla aquí, con el texto que dé Legal.
//
//  `anual` está PENDIENTE de Legal (20-nov): dicha en el chat puede entenderse como
//  13 meses por el precio de 12. Los textos en inglés son traducción, sin revisar.
// ════════════════════════════════════════════════════════════════
export const CONDICIONES = {
  es: {
    permanencia: 'Mes a mes, sin permanencia, salvo con la web en tres pagos.',
    garantia: 'Si un mes no hacemos lo que dice tu plan, ese mes no se cobra. Garantizamos el trabajo, no el resultado.',
    anual: 'Paga el año por adelantado y tienes un mes de regalo.',
    tresPagos: 'Tu web en 3 pagos sin recargo si eliges 6 meses de plan.',
    recuerda: 'Es un estimado; te lo confirmamos por escrito en la propuesta.',
  },
  en: {
    permanencia: 'Month to month, no long-term commitment, except with the website in three payments.',
    garantia: "If we don't deliver what your plan says in a month, that month is free. We guarantee the work, not the result.",
    anual: 'Pay the year upfront and get one month free.',
    tresPagos: 'Your website in 3 payments with no surcharge if you choose 6 months of plan.',
    recuerda: "It's an estimate; we'll confirm it in writing in the proposal.",
  },
};
