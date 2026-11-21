// ════════════════════════════════════════════════════════════════
//  lib/diagnostic-funnel.mjs · el diagnóstico entra en el embudo de Orbit
//  ────────────────────────────────────────────────────────────────
//  Ventas §5 (aprobado por el dueño): cuando un visitante deja su contacto
//  en el diagnóstico,
//    1) el contacto pasa a la etapa «diagnóstico hecho» (advanceLeadStage);
//    2) se deja en BORRADOR su propuesta de tres paquetes, con el plan del
//       diagnóstico marcado como recomendado y, si lo dio en una calculadora,
//       cuánto le vale un cliente. La envía el dueño desde Orbit en 24 horas.
//
//  El paso 2 está APAGADO (DIAGNOSTIC_DRAFTS). Orbit ya deja corregir y
//  descartar un borrador (PR #98); se enciende con el OK del dueño, en un
//  cambio aparte de una línea.
//
//  Reglas: nunca lanza (el contacto ya está guardado; el reclamo no puede
//  fallar por esto); se puede repetir sin duplicar (source_ref = folio DGN);
//  si el mismo contacto repite el diagnóstico, el borrador nuevo SUSTITUYE al
//  anterior del diagnóstico que nadie ha tocado (replaces_prefix 'DGN-'); si
//  el contacto ya tiene otra propuesta abierta (enviada, de Orbit o de Marcy,
//  o un borrador del diagnóstico que el dueño ya corrigió), no se crea nada:
//  esa es del dueño. Los proyectos con solo «desde» entran «por confirmar»
//  (lo marca Orbit; aquí no se pone ninguna cifra). Si algo falla, aviso al
//  dueño. Ni precios ni propuestas salen de aquí hacia el navegador ni hacia
//  la IA: solo devuelve un resumen de estado.
//
//  Los paquetes NO están en el repo (es público): se leen del catálogo
//  privado de la base (sales_catalog) en el momento.
// ════════════════════════════════════════════════════════════════

import { advanceLeadStage, saveProposal, listProposals, loadCatalog } from './proposals.mjs';
import { notifySystem } from './notifications.mjs';

export const DIAGNOSTIC_DRAFTS = false;

const OPEN_PROPOSAL = new Set(['draft', 'sent']);

// Principio común de los folios del diagnóstico (DGN-001, DGN-002…): con él, Orbit sustituye
// los borradores sin tocar del diagnóstico de ESE contacto (lib/proposals.mjs, replaces_prefix).
export const DIAGNOSTIC_PREFIX = 'DGN-';

function time(v) {
  const t = v instanceof Date ? v.getTime() : Date.parse(v);
  return Number.isFinite(t) ? t : NaN;
}

/** Un borrador del diagnóstico que nadie ha tocado: el que Orbit dejaría sustituir. */
export function isReplaceableDraft(p) {
  if (!p || p.status !== 'draft' || p.created_by !== 'diagnostic') return false;
  if (typeof p.source_ref !== 'string' || !p.source_ref.startsWith(DIAGNOSTIC_PREFIX)) return false;
  const c = time(p.created_at);
  return Number.isFinite(c) && c === time(p.updated_at);
}

/** Opciones de la propuesta a partir de los paquetes del catálogo (más completa primero). */
export function optionsFromCatalog(body, plan) {
  const planes = (body && body.planes) || {};
  const paquetes = Array.isArray(body && body.paquetes) ? body.paquetes : [];
  const usable = paquetes
    .filter((p) => p && p.plan && p.proyecto && planes[p.plan] && planes[p.plan].enPropuestas === true)
    .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0))
    .slice(0, 3);
  if (!usable.length) return null;
  const options = usable.map((p) => ({ plan: p.plan, projects: [{ id: p.proyecto }] }));
  let rec = usable.findIndex((p) => p.plan === plan);
  if (rec < 0) rec = usable.findIndex((p) => p.papel === 'recomendado');
  return { options, recommended_option: rec < 0 ? 0 : rec };
}

async function defaultQuery(text, params) {
  const { sql } = await import('@vercel/postgres');
  return sql.query(text, params);
}

/**
 * @param {{ ref: string, leadRef: string, plan: string, clientValueCents?: number|null, allowDraft?: boolean }} input
 * @param {object} deps  inyectables en pruebas: advance, save, list, catalog, notify, drafts
 * @returns {Promise<{ stage: string, draft: string }>}
 */
export async function runDiagnosticFunnel(input = {}, deps = {}) {
  const { ref, leadRef, plan, clientValueCents = null, allowDraft = true } = input;
  const advance = deps.advance || ((r, s, d) => advanceLeadStage(r, s, d));
  const save = deps.save || ((i) => saveProposal(i));
  const list = deps.list || ((i) => listProposals(i));
  const catalog = deps.catalog || (() => loadCatalog(defaultQuery));
  const notify = deps.notify || notifySystem;
  const drafts = deps.drafts ?? DIAGNOSTIC_DRAFTS;
  const out = { stage: 'skipped', draft: 'off' };
  if (!leadRef || !ref) return out;

  try {
    const r = await advance(leadRef, 'diagnosed', { by: 'diagnostic' });
    out.stage = r && r.moved ? 'moved' : 'kept';
  } catch (e) {
    out.stage = 'error';
    console.error(`[diagnostic] ${ref} etapa:`, e && e.message);
    // 404: el contacto ya no existe (el dueño lo borró en Orbit). No hay nada que hacer
    // ni que avisar; el borrador tampoco tendría a quién ir.
    if (e && e.status === 404) return out;
    await safeNotify(notify, e, ref, leadRef, 'mover el contacto a «diagnóstico hecho»');
  }

  if (!drafts) return out;
  if (!allowDraft) { out.draft = 'skipped'; return out; }
  try {
    const existing = await list({ lead_ref: leadRef });
    // Abierta y del dueño (enviada, de Orbit o Marcy, o ya corregida): no se duplica ni se toca.
    // Se mira antes de guardar, fuera de la transacción de saveProposal: si el dueño corrige o envía
    // justo en ese instante, pueden quedar dos abiertas (muy raro). El arreglo de fondo es que
    // saveProposal lo compruebe dentro de su transacción (lib/proposals.mjs, de Panel Admin; pedido).
    const owned = (existing || []).some((p) => p && OPEN_PROPOSAL.has(p.status) && !isReplaceableDraft(p));
    if (owned) { out.draft = 'exists'; return out; }
    const cat = await catalog();
    const built = optionsFromCatalog(cat && cat.body, plan);
    if (!built) throw new Error('El catálogo no trae paquetes para propuestas.');
    const cv = Number.isInteger(clientValueCents) && clientValueCents > 0 ? clientValueCents : null;
    const r = await save({
      lead_ref: leadRef,
      created_by: 'diagnostic',
      source_ref: ref,
      options: built.options,
      recommended_option: built.recommended_option,
      client_value_cents: cv,
      send: false,
      // Si este contacto repite el diagnóstico, el borrador nuevo sustituye al anterior sin tocar.
      replaces_prefix: DIAGNOSTIC_PREFIX,
    });
    out.draft = r && r.created === false ? 'exists'
      : r && Array.isArray(r.replaced) && r.replaced.length ? 'replaced' : 'created';
  } catch (e) {
    out.draft = 'error';
    console.error(`[diagnostic] ${ref} borrador:`, e && e.message);
    await safeNotify(notify, e, ref, leadRef, 'dejar la propuesta en borrador');
  }
  return out;
}

// Un aviso al día por tipo de fallo (503 = falta la migración o el catálogo).
// El texto no lleva el mensaje del error: algunos llevan cifras de precios.
async function safeNotify(notify, err, ref, leadRef, what) {
  const status = err && err.status;
  try {
    await notify({
      // 503 (falta la migración o el catálogo) afecta a todos: un aviso al día basta.
      // El resto es de ese contacto: un aviso por contacto, para que no se esconda ninguno.
      key: status === 503 ? 'diag-funnel:503' : `diag-funnel:${leadRef}`,
      title: `El diagnóstico no pudo ${what}`,
      body: status === 503
        ? `Desde ${leadRef} (${ref}), y hasta que se arregle: falta la migración 029 o el catálogo de Ventas en la base. Los contactos se guardan igual.`
        : `${leadRef} (${ref}): hazlo a mano en Orbit. El contacto está guardado.`,
      url: '/dashboard',
      windowHours: 24,
    });
  } catch { /* notifySystem no lanza; por si acaso */ }
}
