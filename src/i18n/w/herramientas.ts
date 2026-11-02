// Copy nuevo de /es/herramientas y /en/tools (rediseño WorkOS, design/rediseno-workos.md §4.10).
// Los textos de las calculadoras (títulos, deslizadores, resultado, aviso) siguen en
// src/i18n/growth-os.ts (GOS.<lang>.tools) y NO se tocan: aquí solo lo nuevo de la piel v3
// (eyebrow, bajada, desglose, banda de Marcy y cierre). Reglas: sin guiones conectores,
// nada inventado (los plazos son los oficiales: contacto en 1 hora hábil, propuesta en 24 horas;
// Marcy "contesta, agenda y capta 24/7" sale de pricing.ts), EN escrito nativo (R4).

export type ToolsLang = 'es' | 'en';

interface Band { title: string; text: string }
export interface ToolsCopy {
  /** Nombre de la sección (el mismo del megamenú, "Calculadoras"); no repite el H1 (R3). */
  eyebrow: string;
  /** Frase de la cola. Solo se pinta si H1 + cola caben en 2 líneas a 1440 (§2.14). */
  tail?: string;
  lead: string;
  panelTitle: string;
  /** Última fila del desglose (el mismo total que la tarjeta). */
  totalRow: string;
  calls: { rows: [string, string, string, string]; note: string; band: Band };
  appt: { rows: [string, string, string, string]; note: string; band: Band };
  bandCta: string;
  bandMarcy: string;
  cierre: { titleHtml: string; proof: string };
}

export const herramientasCopy: Record<ToolsLang, ToolsCopy> = {
  es: {
    eyebrow: 'Calculadoras',
    lead: 'Calcula lo que te cuesta no contestar a tiempo.',
    panelTitle: 'Cómo se calcula',
    totalRow: 'Al mes',
    calls: {
      rows: ['Llamadas al mes', 'Se quedan sin contestar', 'Ventas que se escapan', 'Ticket promedio'],
      note: 'Supuesto del cálculo: 4.33 semanas por mes.',
      band: {
        title: '¿Quieres que Marcy conteste por ti?',
        text: 'Contesta, agenda citas y toma los datos del cliente a cualquier hora.',
      },
    },
    appt: {
      rows: ['Citas al mes', 'Citas que no llegan', 'Recuperables con recordatorios', 'Valor por cita'],
      note: 'Supuesto del cálculo: con recordatorios se recuperan 4 de cada 10 citas perdidas.',
      band: {
        title: '¿Quieres que Marcy agende por ti?',
        text: 'Agenda citas a cualquier hora, sin que tengas que contestar el teléfono.',
      },
    },
    bandCta: 'Pedir propuesta',
    bandMarcy: 'Pregúntale a Marcy',
    cierre: {
      titleHtml: 'Deja de perder clientes por no contestar.',
      proof: 'Te contestamos en 1 hora hábil y la propuesta llega en 24 horas.',
    },
  },
  en: {
    eyebrow: 'Calculators',
    lead: 'See what slow replies are really costing you.',
    panelTitle: 'How it adds up',
    totalRow: 'Per month',
    calls: {
      rows: ['Calls a month', 'Go unanswered', 'Sales that slip away', 'Average ticket'],
      note: 'Assumes 4.33 weeks per month.',
      band: {
        title: 'Want Marcy to pick up for you?',
        text: 'She answers, books appointments and takes down customer details around the clock.',
      },
    },
    appt: {
      rows: ['Appointments a month', 'No-shows', 'Recoverable with reminders', 'Value per appointment'],
      note: 'Assumes reminders win back 4 in 10 missed appointments.',
      band: {
        title: 'Want Marcy to book for you?',
        text: "She books appointments around the clock, so you don't have to pick up.",
      },
    },
    bandCta: 'Get a proposal',
    bandMarcy: 'Ask Marcy',
    cierre: {
      titleHtml: 'Stop losing customers to unanswered calls.',
      proof: 'We reply within 1 business hour, and your proposal arrives within 24 hours.',
    },
  },
};
