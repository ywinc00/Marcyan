// ════════════════════════════════════════════════════════════════
//  src/lib/calc-context.js · el valor de un cliente, de la calculadora al reclamo
//  ────────────────────────────────────────────────────────────────
//  Ventas §5: si el visitante MUEVE el control del ticket (llamadas) o del
//  valor por cita (citas), se guarda ese valor en su navegador; cuando luego
//  pide su informe en el diagnóstico, viaja con el reclamo y llega a la
//  propuesta como «cuánto le vale un cliente». Nunca se guarda el valor de
//  partida del control (sería nuestro número, no el suyo).
//
//  localStorage con caducidad (2 h): llega también si abre el diagnóstico en
//  otra pestaña. Todo va en try/catch: sin almacenamiento, no pasa nada.
//  El servidor lo vuelve a validar (lib/calc-value.mjs).
// ════════════════════════════════════════════════════════════════

const KEY = 'mrc_calc';
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

/** @param {'calls'|'appt'} type  @param {number} usd */
export function saveCalc(type, usd) {
  const n = Number(usd);
  if ((type !== 'calls' && type !== 'appt') || !Number.isFinite(n) || n <= 0) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ type, value_cents: Math.round(n * 100), at: Date.now() }));
  } catch { /* sin almacenamiento */ }
}

/** @returns {{ type: 'calls'|'appt', value_cents: number } | null} */
export function readCalc() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!c || typeof c.at !== 'number' || Date.now() - c.at > MAX_AGE_MS) return null;
    return { type: c.type, value_cents: c.value_cents };
  } catch {
    return null;
  }
}
