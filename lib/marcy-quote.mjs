// ════════════════════════════════════════════════════════════════
//  lib/marcy-quote.mjs — Marcy cotiza con planes y paquetes (Ventas §4)
//  ────────────────────────────────────────────────────────────────
//  Marcy NO calcula precios: llama a la herramienta interna `cotizar` y el
//  servidor arma las opciones con la lista PRIVADA de Ventas (tabla sales_catalog,
//  la misma que usa Orbit) y les pone precio con priceOption de lib/proposals.mjs.
//  Así lo que Marcy dice en el chat y la propuesta que queda en Orbit son lo mismo.
//
//  Este repo es público: aquí no hay ni una cifra de la lista, solo los nombres de
//  sus campos. Reglas: docs/marcy/reglas-cotizacion.md.
//
//    buildQuote(catalog, input, { lang })   puro: opciones, cifras y lo que se guarda
//    salesCatalog()                          lista privada de la base, 10 min en memoria
//    saveQuote({ sid, quote })               la deja en la conversación y, si ya hay
//                                            contacto, la guarda en Orbit
//    attachQuote({ sid, ref })               al llegar el contacto, la guarda en Orbit
//
//  En Orbit entra como BORRADOR (send: false): la envía el dueño. En el chat es un
//  estimado que se confirma por escrito en la propuesta.
// ════════════════════════════════════════════════════════════════
import { projectPricing, priceOption, paysBackWith } from './proposals.mjs';

export const MAX_OPTIONS = 3;
const MAX_PROJECTS = 4;
// Rebaja si el cliente insiste (regla aprobada el 2026-11-07): hasta un 10 % más,
// siempre sujeta a aprobación y nunca por debajo del mínimo de la lista.
export const REBAJA = 0.1;
// Servicios que Marcy no cotiza: el diagnóstico es gratis y va por su herramienta.
const NOT_QUOTED = new Set(['diagnostico']);
const CATALOG_TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 3000;

// Frases legales cortas (Legal, 2026-11-20, `05-condiciones-comerciales.md`). Tal cual.
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
const ETIQUETAS = {
  es: { ancla: 'La completa', recomendado: 'La recomendada', entrada: 'La de entrada' },
  en: { ancla: 'The complete one', recomendado: 'Recommended', entrada: 'Starter' },
};

const cents = (usd) => Math.round(Number(usd) * 100);
const usd = (c) => Math.round(Number(c)) / 100;
const roundTo = (c, stepUsd) => (stepUsd > 0 ? Math.round(c / (stepUsd * 100)) * stepUsd * 100 : Math.round(c));

/** Qué incluye un plan, en frases cortas, a partir de su `trabajo` en la lista (puro). */
export function planIncludes(plan, lang = 'es') {
  const t = (plan && plan.trabajo) || {};
  const en = lang === 'en';
  const out = [];
  if (t.tandaSemanal) out.push(en ? 'work on your visibility every week' : 'trabajo en tu visibilidad cada semana');
  if (t.paginas && t.paginas !== '0') out.push(en ? `new pages: ${t.paginas}` : `páginas nuevas: ${t.paginas}`);
  if (t.publicacionesFicha && t.publicacionesFicha !== '0') out.push(en ? `posts on your Google profile: ${t.publicacionesFicha}` : `publicaciones en tu ficha de Google: ${t.publicacionesFicha}`);
  if (t.respuestasResenas) out.push(en ? 'replies to your reviews' : 'respuesta a tus reseñas');
  if (t.ia) out.push(en ? 'work so AI assistants recommend you' : 'trabajo para que la IA te recomiende');
  if (plan && plan.incluyeCuotaAsistente) out.push(en ? 'includes the AI assistant monthly fee' : 'incluye la cuota mensual del asistente con IA');
  if (t.trimestral && t.trimestral !== 'no') out.push(en ? `quarterly review: ${t.trimestral}` : `revisión trimestral: ${t.trimestral}`);
  return out;
}

// Una opción de entrada (del modelo o de un paquete) → { plan, projects, addons } limpios.
function cleanOption(catalog, raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const p = typeof o.plan === 'string' ? catalog.planes?.[o.plan] : null;
  const plan = p && p.enPropuestas !== false ? o.plan : null;
  const ids = Array.isArray(o.servicios) ? o.servicios : Array.isArray(o.projects) ? o.projects : [];
  const projects = [];
  for (const id of ids) {
    const k = typeof id === 'string' ? id : id && id.id;
    if (typeof k !== 'string' || NOT_QUOTED.has(k) || !catalog.proyectos?.[k] || projects.includes(k)) continue;
    if (projects.length < MAX_PROJECTS) projects.push(k);
  }
  const addons = [];
  if (plan) {
    for (const [k, a] of Object.entries(catalog.anadidosMensuales || {})) {
      const wanted = o.seguimiento_ia === true || (Array.isArray(o.anadidos) && o.anadidos.includes(k));
      if (wanted && (!Array.isArray(a.para) || a.para.includes(plan))) addons.push(k);
    }
  }
  return { plan, projects, addons, segundoIdioma: o.segundo_idioma === true };
}

// Precio de cada proyecto de la opción, con combinación, segundo idioma y la rebaja aparte.
function projectPrices(catalog, opt) {
  const r = catalog.reglas || {};
  const step = Number(r.redondeoProyectos) || 0;
  const combo = Number(r.comboDescuentoProyectos) || 0;
  const priced = opt.projects.map((id) => {
    const pr = projectPricing(catalog, id);
    const extra = opt.segundoIdioma && Number.isFinite(catalog.proyectos[id].segundoIdioma) ? cents(catalog.proyectos[id].segundoIdioma) : 0;
    return { id, pr, price: pr.list_cents + extra };
  });
  // Combinación: dos o más proyectos de pago único con precio fijo en la misma opción.
  const fixed = priced.filter((x) => x.price > 0 && !x.pr.from_price);
  const comboOn = combo > 0 && combo < 1 && fixed.length >= 2;
  let discount = 0;
  for (const x of priced) {
    if (comboOn && fixed.includes(x)) {
      const d = Math.max(x.pr.floor_cents, roundTo(x.price * (1 - combo), step));
      discount += x.price - Math.min(x.price, d);
      x.price = Math.min(x.price, d);
    }
    // Rebaja (si la pide): redondeada, nunca bajo el mínimo (redondeado hacia arriba) ni sobre
    // el precio. Un «desde» no se rebaja: su precio real sale de la propuesta.
    const floorUp = step > 0 ? Math.ceil(x.pr.floor_cents / (step * 100)) * step * 100 : x.pr.floor_cents;
    x.rebaja = x.pr.from_price ? x.price : Math.min(x.price, Math.max(floorUp, roundTo(x.price * (1 - REBAJA), step)));
  }
  return { priced, discount };
}

/**
 * Cotización (pura). input (lo que manda el modelo, nunca precios):
 *   { paquetes?: true, opciones?: [{ plan?, servicios?: [ids], seguimiento_ia?, segundo_idioma? }],
 *     valor_cliente?: USD que le deja un cliente o trabajo, pedir_rebaja?: true }
 * Devuelve { ok, visible, figures, save } o { ok: false, motivo }:
 *   visible  lo que lee Marcy (opciones de la más completa a la de entrada, recomendada,
 *            con cuántos clientes al mes se paga, condiciones tal cual)
 *   figures  cifras en dólares que Marcy puede repetir (allowlist del filtro de precios)
 *   save     entrada de saveProposal (ids y precios en centavos), sin contacto
 */
export function buildQuote(catalog, input = {}, { lang = 'es' } = {}) {
  if (!catalog || !catalog.proyectos || !catalog.planes) return { ok: false, motivo: 'sin_lista' };
  const en = lang === 'en';
  const C = CONDICIONES[en ? 'en' : 'es'];
  const L = ETIQUETAS[en ? 'en' : 'es'];
  const inp = input && typeof input === 'object' ? input : {};

  // 1) Qué opciones: los tres paquetes de la lista (en su orden) o las que arma Marcy.
  let raw = [];
  let roles = [];
  let notes = [];
  if (inp.paquetes === true && Array.isArray(catalog.paquetes) && catalog.paquetes.length) {
    const pk = [...catalog.paquetes].sort((a, b) => (a.orden || 0) - (b.orden || 0)).slice(0, MAX_OPTIONS);
    raw = pk.map((p) => ({ plan: p.plan, servicios: p.proyecto ? [p.proyecto] : [] }));
    roles = pk.map((p) => p.papel || null);
    notes = pk.map((p) => (p.nota ? C.tresPagos : null));
  } else if (Array.isArray(inp.opciones)) {
    raw = inp.opciones.slice(0, MAX_OPTIONS);
  }
  let opts = raw.map((o) => cleanOption(catalog, o));
  const keep = opts.map((o) => Boolean(o.plan || o.projects.length));
  opts = opts.filter((_, i) => keep[i]);
  roles = roles.filter((_, i) => keep[i]);
  notes = notes.filter((_, i) => keep[i]);
  if (!opts.length) return { ok: false, motivo: 'sin_opciones' };

  // 2) Precio de cada opción con priceOption (el mismo cálculo que guarda Orbit).
  let built;
  try {
    built = opts.map((o, i) => {
      const { priced, discount } = projectPrices(catalog, o);
      const out = priceOption(catalog, {
        plan: o.plan,
        projects: priced.map((x) => ({ id: x.id, price_cents: x.price })),
        addons: o.addons,
      }, { author: 'marcy', index: i });
      return { o, out, priced, discount, note: notes[i] || null, role: roles[i] || null };
    });
  } catch {
    return { ok: false, motivo: 'sin_precio' };
  }

  // 3) De la más completa a la de entrada (paquetes: el orden de la lista).
  if (!roles.length) {
    const lvl = (b) => (b.o.plan ? Number(catalog.planes[b.o.plan].nivel) || 0 : 0);
    built.sort((a, b) => lvl(b) - lvl(a) || b.out.project_cents - a.out.project_cents || b.out.monthly_cents - a.out.monthly_cents);
  }
  let rec = built.findIndex((b) => b.role === 'recomendado');
  if (rec < 0) rec = built.findIndex((b) => b.o.plan && catalog.planes[b.o.plan].recomendado);
  if (rec < 0) rec = built.length === 3 ? 1 : 0;
  const roleOf = (b, i) => b.role || (i === rec ? 'recomendado' : i === 0 && built.length > 1 ? 'ancla' : i === built.length - 1 && built.length > 2 ? 'entrada' : null);

  const value = Number(inp.valor_cliente);
  const valueCents = Number.isFinite(value) && value >= 1 && value <= 1e6 ? cents(value) : null;
  const rebaja = inp.pedir_rebaja === true;
  const figures = new Set();
  const fig = (c) => { const v = usd(c); if (v > 0) figures.add(v); return v; };
  if (valueCents) fig(valueCents);

  const opciones = built.map((b, i) => {
    const { out, priced } = b;
    const role = roleOf(b, i);
    const plan = out.plan ? catalog.planes[out.plan.id] : null;
    const servicios = out.projects.map((p) => {
      const pr = priced.find((x) => x.id === p.id);
      const s = { nombre: p.name, precio: fig(p.cents) };
      if (pr && pr.pr.from_price) s.desde = true;
      if (p.monthly_cents) s.cuota_mensual = fig(p.monthly_cents);
      if (p.monthly_included) s.cuota_incluida_en_el_plan = true;
      return s;
    });
    const detalle = [];
    if (out.plan) detalle.push({ concepto: 'Plan ' + (en && plan.en ? plan.en : out.plan.name), mensual: fig(out.plan.monthly_cents) });
    for (const a of out.addons) detalle.push({ concepto: a.name, mensual: fig(a.monthly_cents) });
    for (const p of out.projects) if (p.monthly_cents) detalle.push({ concepto: (en ? 'Monthly fee: ' : 'Cuota mensual: ') + p.name, mensual: fig(p.monthly_cents) });
    const o = {
      numero: i + 1,
      etiqueta: role ? L[role] : null,
      recomendada: i === rec,
      plan: plan ? { nombre: en && plan.en ? plan.en : plan.nombre, frase: plan.frase, incluye: planIncludes(plan, lang) } : null,
      servicios,
      pago_unico: fig(out.project_cents),
      mensual: fig(out.monthly_cents),
      mensual_detalle: detalle,
      se_paga_con_clientes_al_mes: paysBackWith(out.monthly_cents, valueCents),
    };
    if (b.discount > 0) o.descuento_combinacion = fig(b.discount);
    if (b.note) o.nota = b.note;
    if (rebaja && out.projects.length) {
      const total = priced.reduce((s, x) => s + x.rebaja, 0);
      if (total < out.project_cents) o.rebaja = { pago_unico: fig(total), sujeto_a_aprobacion: true };
    }
    return o;
  });

  const visible = {
    ok: true,
    moneda: 'USD',
    opciones,
    valor_cliente: valueCents ? usd(valueCents) : null,
    condiciones: [C.permanencia, C.garantia, C.anual],
    recuerda: C.recuerda,
  };
  const rebajaNote = opciones.filter((o) => o.rebaja)
    .map((o) => `${o.etiqueta || 'Opción ' + o.numero}: pidió rebaja, USD ${o.rebaja.pago_unico.toLocaleString('en-US')} sujeta a aprobación`).join(' · ');
  const save = {
    options: built.map((b, i) => ({
      label: roleOf(b, i) ? ETIQUETAS.es[roleOf(b, i)] : null,
      plan: b.out.plan ? b.out.plan.id : null,
      projects: b.out.projects.map((p) => ({ id: p.id, price_cents: p.cents })),
      addons: b.out.addons.map((a) => a.id),
    })),
    recommended_option: rec,
    client_value_cents: valueCents,
    notes: ['Cotización de Marcy en el chat (estimado; se confirma por escrito).', rebajaNote].filter(Boolean).join(' '),
  };
  return { ok: true, visible, figures: [...figures], save };
}

/** Clave estable de una cotización (para que el reintento no duplique en Orbit). */
export function quoteKey(save) {
  const s = JSON.stringify([save.options, save.recommended_option, save.client_value_cents]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

// ── Base (nunca rompen el chat) ───────────────────────────────
function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms); })]).finally(() => clearTimeout(t));
}
async function getSql(sqlImpl) { return sqlImpl || (await import('@vercel/postgres')).sql; }
const validSid = (sid) => typeof sid === 'string' && /^[\w-]{1,64}$/.test(sid);
const isLead = (ref) => typeof ref === 'string' && /^LEAD-\d+$/i.test(ref);

let cache = null;
/** Lista privada de Ventas (la de Orbit), 10 min en memoria. null si no se puede leer. */
export async function salesCatalog({ sqlImpl, now = Date.now(), load } = {}) {
  if (cache && now - cache.at < CATALOG_TTL_MS) return cache.body;
  try {
    const sql = await getSql(sqlImpl);
    const loader = load || (await import('./proposals.mjs')).loadCatalog;
    const c = await withTimeout(loader((text, params) => sql.query(text, params)), TIMEOUT_MS);
    cache = { at: now, body: c.body };
    return c.body;
  } catch (err) {
    console.warn('[cotizar] sin la lista de Ventas', err && (err.code || err.message));
    return null;
  }
}
export function __resetCatalogCache() { cache = null; }

async function defaultSave(input) {
  const { saveProposal } = await import('./proposals.mjs');
  return saveProposal(input);
}

// Guarda en Orbit la cotización de una conversación para un contacto (borrador).
async function toOrbit({ sid, ref, quote, save = defaultSave }) {
  const out = await withTimeout(save({
    lead_ref: ref,
    created_by: 'marcy',
    source_ref: `chat:${sid}:${quote.key || quoteKey(quote)}`,
    options: quote.options,
    recommended_option: quote.recommended_option,
    client_value_cents: quote.client_value_cents,
    notes: quote.notes,
    send: false,
  }), 6000);
  return out && out.proposal ? out.proposal.ref_id : null;
}

/**
 * Deja la última cotización en la conversación y, si ya tiene contacto (LEAD-…), la
 * guarda en Orbit. Sin la migración de la columna, solo avisa. Nunca lanza.
 */
export async function saveQuote({ sid, quote, sqlImpl, save } = {}) {
  if (!validSid(sid) || !quote || !Array.isArray(quote.options) || !quote.options.length) return null;
  const q = { ...quote, key: quoteKey(quote) };
  try {
    const sql = await getSql(sqlImpl);
    const r = await withTimeout(sql`UPDATE chat_conversations SET quote = ${JSON.stringify(q)}::jsonb, quote_at = NOW()
      WHERE sid = ${sid} RETURNING lead_ref`, 2500);
    const ref = r.rows && r.rows[0] && r.rows[0].lead_ref;
    if (isLead(ref)) return await toOrbit({ sid, ref, quote: q, save });
    return null;
  } catch (err) {
    if (!err || err.code !== '42703') console.warn('[cotizar] no pude guardar la cotización', err && (err.code || err.message));
    return null;
  }
}

/** Al llegar el contacto de una conversación, su cotización pasa a Orbit. Nunca lanza. */
export async function attachQuote({ sid, ref, sqlImpl, save } = {}) {
  if (!validSid(sid) || !isLead(ref)) return null;
  try {
    const sql = await getSql(sqlImpl);
    const r = await withTimeout(sql`SELECT quote FROM chat_conversations WHERE sid = ${sid}`, 2500);
    const quote = r.rows && r.rows[0] && r.rows[0].quote;
    if (!quote || !Array.isArray(quote.options) || !quote.options.length) return null;
    return await toOrbit({ sid, ref, quote, save });
  } catch (err) {
    if (!err || err.code !== '42703') console.warn('[cotizar] la cotización no pasó a Orbit', err && (err.code || err.message));
    return null;
  }
}
