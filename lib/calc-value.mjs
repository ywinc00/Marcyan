// ════════════════════════════════════════════════════════════════
//  lib/calc-value.mjs · «cuánto le vale un cliente», desde las calculadoras
//  ────────────────────────────────────────────────────────────────
//  Ventas §5: las calculadoras de llamadas y de citas perdidas pasan a la
//  propuesta el valor de un trabajo del visitante (ticket promedio o valor
//  por cita). Es la cifra que usa «se paga con N trabajos» en Orbit
//  (client_value_cents). Es un dato del CLIENTE, no un precio nuestro.
//
//  El navegador lo manda tal cual; aquí se valida contra el rango del control
//  de cada calculadora (ToolsHub.astro). Fuera de rango o mal formado → null:
//  no se recorta a la fuerza ni se inventa. Nunca va al modelo de IA.
// ════════════════════════════════════════════════════════════════

// Rangos en dólares, los mismos de los controles de ToolsHub.astro.
export const CALC_RANGES = {
  calls: { min: 50, max: 5000 },   // ticket promedio
  appt: { min: 20, max: 500 },     // valor por cita
};

/** @returns {{ type: 'calls'|'appt', value_cents: number } | null} */
export function parseCalcValue(input) {
  if (!input || typeof input !== 'object') return null;
  const type = input.type;
  // Solo los dos tipos propios: un «constructor» o «__proto__» encontraría algo heredado.
  if (type !== 'calls' && type !== 'appt') return null;
  const range = CALC_RANGES[type];
  if (typeof input.value_cents !== 'number' && typeof input.value_cents !== 'string') return null;
  const cents = Number(input.value_cents);
  if (!Number.isSafeInteger(cents)) return null;
  if (cents < range.min * 100 || cents > range.max * 100) return null;
  return { type, value_cents: cents };
}

/** Línea para el mensaje del contacto en Orbit (se ve aunque no haya propuesta). */
export function calcValueLine(v) {
  if (!v) return null;
  const usd = (v.value_cents / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
  return v.type === 'calls'
    ? `Calculadora de llamadas perdidas: su ticket promedio es de $${usd}.`
    : `Calculadora de citas perdidas: cada cita le vale $${usd}.`;
}
