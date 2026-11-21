// ════════════════════════════════════════════════════════════════
//  lib/diagnostic-plan.mjs · el plan que recomienda el diagnóstico
//  ────────────────────────────────────────────────────────────────
//  Ventas §5 (regla elegida por el dueño el 2026-11-20, «por lo más flojo»):
//    · sin web (hallazgo W1 o web en 0)        → presencia   «Que te encuentren»
//    · lo más flojo es que te llamen/escriban  → crecimiento «Que te llamen»
//    · lo más flojo es que te encuentren       → presencia
//    · lo más flojo es que la IA te lea        → dominio     «Que la IA te recomiende»
//    · todo en 75 o más                        → crecimiento (el recomendado del catálogo)
//  Las reseñas (10 % del total, una sola señal declarada por el dueño) no
//  entran en el mínimo: no deben tapar una brecha medida. Nunca devuelve
//  `base` (el catálogo lo deja fuera de las propuestas).
//
//  Puro y determinista: el análisis y el reclamo dan el mismo plan con los
//  mismos puntajes. NO sustituye a recommendService (lo usa Marcy).
// ════════════════════════════════════════════════════════════════

import { PLANES } from './planes.generado.mjs';

// 75 = como mucho una señal roja por frente (en áreas de 4 comprobaciones,
// un fallo deja 75; en las de 5, 80).
export const PLAN_OK_THRESHOLD = 75;

const FRONT_PLAN = { llamar: 'crecimiento', encontrar: 'presencia', ia: 'dominio' };
// Desempate: el orden de prioridad que ya usaba el diagnóstico (contacto primero).
const FRONT_ORDER = ['llamar', 'encontrar', 'ia'];

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * @param {{ scores: {web:number, seo:number, ai:number, conv:number}, findings?: Array<{id?:string}> }} input
 * @returns {{ plan: 'presencia'|'crecimiento'|'dominio', frente: 'sin_web'|'llamar'|'encontrar'|'ia'|'todo_bien' }}
 */
export function recommendPlan({ scores = {}, findings = [] } = {}) {
  const ids = new Set((Array.isArray(findings) ? findings : []).map((f) => f && f.id).filter(Boolean));
  if (ids.has('W1') || num(scores.web) === 0) return { plan: 'presencia', frente: 'sin_web' };
  const fronts = {
    llamar: num(scores.conv),
    encontrar: Math.min(num(scores.web), num(scores.seo)),
    ia: num(scores.ai),
  };
  let weakest = FRONT_ORDER[0];
  for (const f of FRONT_ORDER) if (fronts[f] < fronts[weakest]) weakest = f;
  if (fronts[weakest] >= PLAN_OK_THRESHOLD) return { plan: 'crecimiento', frente: 'todo_bien' };
  return { plan: FRONT_PLAN[weakest], frente: weakest };
}

/** Nombre y frase del plan en el idioma pedido (sin cifras: vienen del catálogo). */
export function planText(plan, lang = 'es') {
  const p = PLANES[plan];
  if (!p) return null;
  return lang === 'en'
    ? { key: plan, name: p.en, tagline: p.fraseEn || null }
    : { key: plan, name: p.nombre, tagline: p.frase };
}
