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
//  El paso 2 está APAGADO (DIAGNOSTIC_DRAFTS) hasta que Orbit deje editar o
//  descartar un borrador: hoy un borrador automático no se puede cambiar ni
//  quitar, y bloquea «Nueva propuesta». Se enciende en un cambio aparte.
//
//  Reglas: nunca lanza (el contacto ya está guardado; el reclamo no puede
//  fallar por esto); se puede repetir sin duplicar (source_ref = folio DGN y
//  un solo borrador o enviada por contacto); si algo falla, aviso al dueño
//  (uno al día por tipo). Ni precios ni propuestas salen de aquí hacia el
//  navegador ni hacia la IA: solo devuelve un resumen de estado.
//
//  Los paquetes NO están en el repo (es público): se leen del catálogo
//  privado de la base (sales_catalog) en el momento.
// ════════════════════════════════════════════════════════════════

import { advanceLeadStage, saveProposal, listProposals, loadCatalog } from './proposals.mjs';
import { notifySystem } from './notifications.mjs';

export const DIAGNOSTIC_DRAFTS = false;

const OPEN_PROPOSAL = new Set(['draft', 'sent']);

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
    await safeNotify(notify, e, ref, leadRef, 'mover el contacto a «diagnóstico hecho»');
  }

  if (!drafts) return out;
  if (!allowDraft) { out.draft = 'skipped'; return out; }
  try {
    const existing = await list({ lead_ref: leadRef });
    if ((existing || []).some((p) => p && OPEN_PROPOSAL.has(p.status))) { out.draft = 'exists'; return out; }
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
    });
    out.draft = r && r.created === false ? 'exists' : 'created';
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
      key: status === 503 ? 'diag-funnel:503' : `diag-funnel:${status || 'x'}`,
      title: `El diagnóstico no pudo ${what}`,
      body: status === 503
        ? `${leadRef} (${ref}): falta la migración 029 o el catálogo de Ventas en la base. El contacto está guardado.`
        : `${leadRef} (${ref}): hazlo a mano en Orbit. El contacto está guardado.`,
      url: '/dashboard',
      windowHours: 24,
    });
  } catch { /* notifySystem no lanza; por si acaso */ }
}
