// ─────────────────────────────────────────────────────────────
// Copy NUEVO de la página del diagnóstico v3 (design/rediseno-workos.md §4.9, ola 3).
// Lo congelado (H1, bajada, pasos, FAQ, todo el wizard) sigue en src/i18n/growth-os.ts
// y NO se toca. Aquí solo lo que estrena el rediseño: los checks de "lo que pasa
// después", el estado vivo del escaneo, el resultado de ejemplo y "Gratis de verdad".
// Reglas: sin guiones conectores, sin cifras ni reseñas inventadas, sin precios
// (formulario sin precios; el "gratis" ya lo dice el H1 verbatim). El resultado de
// ejemplo copia la FORMA del real (puntaje 0-100, 5 áreas con barra y cifra, prioridad,
// señales y ruta): cifras de ejemplo coherentes con la ponderación del motor
// (lib/diagnostic-checks.mjs, WEIGHTS → 56, prioridad media, área más débil = IA → ruta
// "SEO para IA"), rotuladas "Ejemplo"; las señales son frases verbatim del catálogo.
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
    risk: string;
    score: number;
    scoreLabel: string;
    areasLabel: string;
    /** Valor 0-100 de ejemplo; `verdict` es la lectura de esa cifra (ChipsVeredicto). */
    areas: { name: string; value: number; kind: Kind; verdict: string }[];
    signalsLabel: string;
    signals: string[];
    rutaLabel: string;
    ruta: string;
    rutaNote: string;
    sr: string;
  };
  gratis: {
    label: string;
    heading: string;
    lead: string;
    items: [{ icon: string; text: string }, { icon: string; text: string }, { icon: string; text: string }, { icon: string; text: string }];
    title: string;
    checks: string[];
    cta: string;
  };
  /** Cabecera de la FAQ (rótulo + titular). Las preguntas siguen verbatim en growth-os.ts. */
  faq: { tag: string; title: string };
}

export const diagCopy: Record<DiagLang, DiagCopy> = {
  es: {
    despues: ['Ves tu resultado al momento', 'Te lo mandamos por correo si quieres'],
    vivo: 'Revisando tu negocio',
    pasosLabel: 'Pasos del diagnóstico',
    resultado: {
      label: 'Lo que verás',
      title: 'Tu puntaje y cinco áreas, de un vistazo',
      lead: 'Al terminar ves tu puntaje de 0 a 100, cómo está cada área, qué señales fallan y por dónde empezar.',
      biz: 'Tu Negocio',
      risk: 'Prioridad: media',
      score: 56,
      scoreLabel: 'Puntaje',
      areasLabel: 'Por área',
      areas: [
        { name: 'Web móvil', value: 80, kind: 'ok', verdict: 'Bien' },
        { name: 'SEO local', value: 55, kind: 'mid', verdict: 'Mejorable' },
        { name: 'Lectura por IA', value: 30, kind: 'off', verdict: 'Falta' },
        { name: 'Conversión', value: 50, kind: 'mid', verdict: 'Mejorable' },
        { name: 'Reseñas', value: 60, kind: 'mid', verdict: 'Mejorable' },
      ],
      signalsLabel: 'Señales detectadas',
      signals: [
        'No hay respuestas directas a preguntas: la IA prefiere sitios que responden claro.',
        'Falta la descripción que Google muestra bajo tu nombre.',
        'No se puede llamar con un toque desde el móvil.',
      ],
      rutaLabel: 'Ruta sugerida',
      ruta: 'SEO para IA',
      rutaNote: 'El área más débil de este ejemplo, por donde conviene empezar.',
      sr: 'Ejemplo de resultado: puntaje 56 de 100, prioridad media. Web móvil 80, SEO local 55, lectura por IA 30, conversión 50 y reseñas 60. Ruta sugerida: SEO para IA.',
    },
    gratis: {
      label: 'Gratis de verdad',
      heading: 'Sin cuenta y sin letra pequeña',
      lead: 'El resultado en pantalla y el reporte por correo no cuestan nada.',
      items: [
        { icon: 'lucide:list-checks', text: 'Tres pasos cortos, sin crear cuenta' },
        { icon: 'lucide:globe', text: 'Funciona aunque todavía no tengas web' },
        { icon: 'lucide:layout-grid', text: 'Cinco áreas en una sola revisión' },
        { icon: 'lucide:shield-check', text: 'Tus datos de contacto nunca pasan por la IA' },
      ],
      title: 'Gratis',
      checks: ['Ves el resultado sin dejar tus datos', 'El reporte por correo, solo si lo pides'],
      cta: 'Empezar el diagnóstico',
    },
    faq: { tag: 'Preguntas frecuentes', title: 'Lo que conviene saber <em>antes de empezar</em>' },
  },
  en: {
    despues: ['See your results right away', "We'll email them to you if you want"],
    vivo: 'Checking your business',
    pasosLabel: 'Checkup steps',
    resultado: {
      label: "What you'll see",
      title: 'Your score and five areas at a glance',
      lead: "When you finish, you see your score from 0 to 100, how each area is doing, which signals are failing and where to start.",
      biz: 'Tu Negocio',
      risk: 'Priority: medium',
      score: 56,
      scoreLabel: 'Score',
      areasLabel: 'By area',
      areas: [
        { name: 'Mobile site', value: 80, kind: 'ok', verdict: 'Good' },
        { name: 'Local SEO', value: 55, kind: 'mid', verdict: 'Needs work' },
        { name: 'AI readability', value: 30, kind: 'off', verdict: 'Missing' },
        { name: 'Conversion', value: 50, kind: 'mid', verdict: 'Needs work' },
        { name: 'Reviews', value: 60, kind: 'mid', verdict: 'Needs work' },
      ],
      signalsLabel: 'Signals detected',
      signals: [
        'There are no direct answers to questions: AI prefers sites that answer clearly.',
        'The description Google shows under your name is missing.',
        'You cannot call with one tap from mobile.',
      ],
      rutaLabel: 'Suggested path',
      ruta: 'AI visibility (AEO)',
      rutaNote: 'The weakest area in this example, and the place to start.',
      sr: 'Example result: score 56 out of 100, medium priority. Mobile site 80, local SEO 55, AI readability 30, conversion 50 and reviews 60. Suggested path: AI visibility.',
    },
    gratis: {
      label: 'Free, for real',
      heading: 'No account, no fine print',
      lead: 'The on-screen result and the emailed report cost nothing.',
      items: [
        { icon: 'lucide:list-checks', text: 'Three short steps, no account needed' },
        { icon: 'lucide:globe', text: "Works even if you don't have a website yet" },
        { icon: 'lucide:layout-grid', text: 'Five areas in a single checkup' },
        { icon: 'lucide:shield-check', text: 'Your contact details never go through the AI' },
      ],
      title: 'Free',
      checks: ['See your result without leaving your details', 'The emailed report, only if you ask for it'],
      cta: 'Start the checkup',
    },
    faq: { tag: 'Frequently asked questions', title: 'Good to know <em>before you start</em>' },
  },
};
