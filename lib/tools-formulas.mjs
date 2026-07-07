// ════════════════════════════════════════════════════════════════
//  lib/tools-formulas.mjs — Fórmulas de las calculadoras (FUENTE ÚNICA)
//  ────────────────────────────────────────────────────────────────
//  Las mismas fórmulas de la página de herramientas (ToolsHub.astro) y de
//  la tool interna del chat (calcular_perdida en api/chat.mjs). JS plano ESM
//  a propósito: lo importa una función Vercel Node (api/chat.mjs, sin
//  transpilar TS) y el <script> de ToolsHub (Vite lo bundlea). CERO deps.
//
//  Si ToolsHub y esta fuente divergen, el test de PARIDAD
//  (scripts/test-chat-guard.mjs) falla: son la MISMA cuenta o es un bug.
// ════════════════════════════════════════════════════════════════

// Semanas por mes (misma constante que ToolsHub).
export const WEEKS_PER_MONTH = 4.33;
// 40% de los no-shows es recuperable con recordatorios (documentado en ToolsHub).
export const NOSHOW_RECOVERY = 0.4;

// clamp defensivo: convierte a número (Number(v)||0 → NaN/Infinity/null caen a 0),
// luego encierra en [min, max]. Los rangos coinciden con los sliders de ToolsHub
// (evita que un input basura del modelo dispare una cifra disparatada).
const clamp = (v, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

// Calc 1 — llamadas perdidas.
// perdidaMensual = llamadas/sem · semanas/mes · (%sin_contestar/100) · ticket · (%cierre/100).
export function computeMissedCalls({ llamadas_semana, pct_sin_contestar, ticket, tasa_cierre = 30 }) {
  const calls = clamp(llamadas_semana, 1, 1000);
  const missed = clamp(pct_sin_contestar, 1, 95) / 100;
  const t = clamp(ticket, 10, 100000);
  const close = clamp(tasa_cierre, 5, 95) / 100;
  const monthly = Math.round(calls * WEEKS_PER_MONTH * missed * t * close);
  return { monthly, yearly: monthly * 12 };
}

// Calc 2 — citas / no-shows.
// perdidaMensual = citas/sem · semanas/mes · (%no_show/100) · valor_cita · recuperable(0.4).
export function computeNoShows({ citas_semana, pct_no_show, valor_cita }) {
  const appt = clamp(citas_semana, 1, 2000);
  const noshow = clamp(pct_no_show, 1, 95) / 100;
  const v = clamp(valor_cita, 5, 100000);
  const monthly = Math.round(appt * WEEKS_PER_MONTH * noshow * v * NOSHOW_RECOVERY);
  return { monthly, yearly: monthly * 12 };
}
