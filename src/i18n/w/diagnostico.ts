// ─────────────────────────────────────────────────────────────
// Copy NUEVO de la página del diagnóstico v3 (design/rediseno-workos.md §4.9, ola 3).
// Lo congelado (H1, bajada, pasos, FAQ, todo el wizard) sigue en src/i18n/growth-os.ts
// y NO se toca. Aquí solo lo que estrena el rediseño: los checks de "lo que pasa
// después", el estado vivo del escaneo, el resultado de ejemplo y "Gratis de verdad".
// Reglas: sin guiones conectores, sin cifras ni reseñas inventadas, sin precios
// (formulario sin precios; el "gratis" ya lo dice el H1 verbatim). Las notas del
// resultado de ejemplo son frases del catálogo real (lib/diagnostic-checks.mjs) salvo
// la de "Web móvil · Bien", que el catálogo no tiene porque solo describe fallos.
// ─────────────────────────────────────────────────────────────

export type DiagLang = 'es' | 'en';
type Kind = 'ok' | 'mid' | 'off';

export interface DiagCopy {
  /** Checks bajo el escáner (fuera de la tarjeta del formulario, §4.9). */
  despues: [string, string];
  /** Estado vivo del escaneo (W-NEW-33): punto que late solo durante el escaneo. */
  vivo: string;
  pasosLabel: string;
  resultado: {
    label: string;
    title: string;
    lead: string;
    biz: string;
    areasLabel: string;
    areas: { name: string; kind: Kind; verdict: string; note: string }[];
    rutaLabel: string;
    ruta: string;
    rutaNote: string;
    sr: string;
  };
  gratis: {
    items: [{ icon: string; text: string }, { icon: string; text: string }, { icon: string; text: string }, { icon: string; text: string }];
    title: string;
    checks: string[];
    cta: string;
  };
}

export const diagCopy: Record<DiagLang, DiagCopy> = {
  es: {
    despues: ['Ves tu resultado al momento', 'Te lo mandamos por correo si quieres'],
    vivo: 'Revisando tu negocio',
    pasosLabel: 'Pasos del diagnóstico',
    resultado: {
      label: 'Lo que verás',
      title: 'Un resultado por área, en tu idioma',
      lead: 'Al terminar ves cómo está cada parte de tu presencia digital, qué señales fallan y por dónde empezar.',
      biz: 'Tu Negocio',
      areasLabel: 'Por área',
      areas: [
        { name: 'Web móvil', kind: 'ok', verdict: 'Bien', note: 'Se ve bien en el teléfono.' },
        { name: 'SEO local', kind: 'mid', verdict: 'Mejorable', note: 'Falta la descripción que Google muestra bajo tu nombre.' },
        { name: 'Lectura por IA', kind: 'off', verdict: 'Falta', note: 'No hay respuestas directas a preguntas.' },
        { name: 'Conversión', kind: 'mid', verdict: 'Mejorable', note: 'No se puede llamar con un toque desde el móvil.' },
      ],
      rutaLabel: 'Ruta sugerida',
      ruta: 'SEO para IA',
      rutaNote: 'Lo primero que conviene arreglar en este ejemplo.',
      sr: 'Ejemplo de resultado: web móvil bien, SEO local mejorable, lectura por IA falta y conversión mejorable. Ruta sugerida: SEO para IA.',
    },
    gratis: {
      items: [
        { icon: 'lucide:list-checks', text: 'Tres pasos cortos, sin crear cuenta' },
        { icon: 'lucide:languages', text: 'En español o en inglés, como prefieras' },
        { icon: 'lucide:phone-off', text: 'Sin llamada obligatoria' },
        { icon: 'lucide:shield-check', text: 'Tus datos de contacto nunca pasan por la IA' },
      ],
      title: 'Gratis',
      checks: ['Ves el resultado sin dejar tus datos', 'El reporte por correo, solo si lo pides'],
      cta: 'Empezar el diagnóstico',
    },
  },
  en: {
    despues: ['See your results right away', "We'll email them to you if you want"],
    vivo: 'Checking your business',
    pasosLabel: 'Checkup steps',
    resultado: {
      label: "What you'll see",
      title: 'A result for each area, in your language',
      lead: "When you finish, you see how each part of your online presence is doing, which signals fail and where to start.",
      biz: 'Tu Negocio',
      areasLabel: 'By area',
      areas: [
        { name: 'Mobile site', kind: 'ok', verdict: 'Good', note: 'Looks right on a phone.' },
        { name: 'Local SEO', kind: 'mid', verdict: 'Needs work', note: 'The description Google shows under your name is missing.' },
        { name: 'AI readability', kind: 'off', verdict: 'Missing', note: 'There are no direct answers to questions.' },
        { name: 'Conversion', kind: 'mid', verdict: 'Needs work', note: 'You cannot call with one tap from mobile.' },
      ],
      rutaLabel: 'Suggested path',
      ruta: 'AI visibility (AEO)',
      rutaNote: 'The first thing worth fixing in this example.',
      sr: 'Example result: mobile site good, local SEO needs work, AI readability missing and conversion needs work. Suggested path: AI visibility.',
    },
    gratis: {
      items: [
        { icon: 'lucide:list-checks', text: 'Three short steps, no account needed' },
        { icon: 'lucide:languages', text: 'In English or Spanish, your choice' },
        { icon: 'lucide:phone-off', text: 'No sales call required' },
        { icon: 'lucide:shield-check', text: 'Your contact details never go through the AI' },
      ],
      title: 'Free',
      checks: ['See your result without leaving your details', 'The emailed report, only if you ask for it'],
      cta: 'Start the checkup',
    },
  },
};
