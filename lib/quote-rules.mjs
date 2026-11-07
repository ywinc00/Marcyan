// ════════════════════════════════════════════════════════════════
//  lib/quote-rules.mjs — Reglas de cotización de Marcy (P3, opción A)
//  ────────────────────────────────────────────────────────────────
//  Marcy NO calcula precios: llama a la herramienta interna `cotizar` y el
//  servidor aplica estas reglas. Ella solo repite las cifras que salen de aquí.
//
//  APROBADAS POR EL DUEÑO 2026-11-07. Los precios base son los publicados
//  (PRICES = espejo de src/i18n/pricing.ts). Cambiar cifras = OK del dueño.
//  Tabla legible para el dueño: docs/marcy/reglas-cotizacion.md (mantener igual).
//
//  Puro y sin red: se prueba en scripts/test-chat-guard.mjs.
// ════════════════════════════════════════════════════════════════
import { PRICES } from './chat-kb.mjs';

// Qué incluye cada servicio en su precio base y cuánto suma cada extra.
// incluye: cantidades incluidas · extras: { campo: { precio, cada } }
//   cada = tamaño del bloque (p. ej. productos: +150 por cada 25 de más).
export const SERVICES = {
  webLanding: {
    es: 'Landing Page', en: 'Landing Page',
    incluye: { paginas: 1, idiomas: 1 },
    extras: { idiomas: { precio: 150, cada: 1 } },
  },
  webRedesign: {
    es: 'Rediseño de sitio', en: 'Website redesign',
    incluye: { paginas: 5, idiomas: 1 },
    extras: { paginas: { precio: 100, cada: 1 }, idiomas: { precio: 200, cada: 1 } },
  },
  web: {
    es: 'Sitio a medida completo', en: 'Full custom website',
    incluye: { paginas: 5, idiomas: 2 },
    extras: { paginas: { precio: 150, cada: 1 } },
  },
  iaBasic: {
    es: 'Asistente básico', en: 'Basic assistant',
    incluye: { flujos: 1, canales: 1 },
    extras: { flujos: { precio: 200, cada: 1 }, canales: { precio: 250, cada: 1 } },
  },
  ia: {
    es: 'Asistente completo', en: 'Full assistant',
    incluye: { flujos: 3, canales: 2 },
    extras: { flujos: { precio: 200, cada: 1 }, canales: { precio: 250, cada: 1 } },
  },
  ecommerceEssential: {
    es: 'Tienda esencial', en: 'Essential store',
    incluye: { productos: 25, idiomas: 1 },
    extras: { productos: { precio: 150, cada: 25 }, idiomas: { precio: 300, cada: 1 } },
  },
  ecommerce: {
    es: 'Tienda a medida', en: 'Custom store',
    incluye: { productos: 100, idiomas: 2 },
    extras: { productos: { precio: 200, cada: 50 } },
  },
  seoInitial: {
    es: 'Optimización inicial SEO local', en: 'Local SEO setup',
    incluye: { ubicaciones: 1 },
    extras: { ubicaciones: { precio: 150, cada: 1 } },
  },
  seoLocal: {
    es: 'SEO local continuo', en: 'Ongoing local SEO',
    incluye: { ubicaciones: 1 },
    extras: { ubicaciones: { precio: 200, cada: 1 } },
  },
  aeoFoundations: { es: 'Cimientos AEO', en: 'AEO foundations', incluye: {}, extras: {} },
  aeoMonitoring:  { es: 'Monitoreo en IA', en: 'AI visibility monitoring', incluye: {}, extras: {} },
  brandingLogo:   { es: 'Diseño de logo', en: 'Logo design', incluye: {}, extras: {} },
  branding:       { es: 'Branding completo', en: 'Full branding', incluye: {}, extras: {} },
  maintenance:    { es: 'Mantenimiento mensual', en: 'Monthly maintenance', incluye: {}, extras: {} },
};

export const SERVICE_KEYS = Object.keys(SERVICES);

// Reglas generales.
export const RULES = {
  comboMinProyectos: 2,      // con 2 o más proyectos de pago único en la misma cotización…
  comboDescuento: 0.10,      // …10 % sobre el subtotal de pago único. Lo mensual nunca se descuenta.
  rebajaMax: 0.10,           // rebaja extra que Marcy puede ofrecer si el cliente insiste (sujeta a aprobación)
  pisoSobreBase: 0.85,       // el total de pago único nunca baja del 85 % de la suma de precios base
  redondeo: 50,              // totales y rebajas a múltiplos de 50
  maxLineas: 6,
  maxCantidad: 500,          // tope defensivo por campo (páginas, productos…)
};

const roundTo = (v, step) => Math.round(v / step) * step;
const toInt = (v) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, RULES.maxCantidad) : 0;
};

/**
 * Cotiza una lista de servicios con las reglas de arriba.
 * @param {Array<{servicio:string, paginas?, idiomas?, flujos?, canales?, productos?, ubicaciones?}>} items
 * @param {{ pedirRebaja?: boolean, lang?: 'es'|'en' }} opts
 * @returns {{ ok:boolean, lineas?, pago_unico?, mensual?, rebaja?, cifras?:number[] }}
 */
export function quote(items, { pedirRebaja = false, lang = 'es' } = {}) {
  if (!Array.isArray(items) || items.length === 0) return { ok: false };
  const seen = new Set();
  const lineas = [];
  let baseUnico = 0;
  let subtotalUnico = 0;
  let mensual = 0;
  let proyectos = 0;

  for (const raw of items.slice(0, RULES.maxLineas)) {
    const key = raw && raw.servicio;
    const svc = SERVICES[key];
    const price = PRICES[key];
    if (!svc || !price || seen.has(key)) continue;
    seen.add(key);

    let total = price.value;
    const extras = [];
    for (const [campo, rule] of Object.entries(svc.extras)) {
      const pedido = toInt(raw[campo]);
      const incluido = svc.incluye[campo] || 0;
      if (pedido > incluido) {
        const bloques = Math.ceil((pedido - incluido) / rule.cada);
        const suma = bloques * rule.precio;
        total += suma;
        extras.push({ campo, cantidad: pedido, incluido, suma });
      }
    }
    lineas.push({
      servicio: key,
      nombre: lang === 'en' ? svc.en : svc.es,
      base: price.value,
      extras,
      total,
      mensual: price.monthly,
    });
    if (price.monthly) mensual += total;
    else { subtotalUnico += total; baseUnico += price.value; proyectos += 1; }
  }
  if (lineas.length === 0) return { ok: false };

  const combo = proyectos >= RULES.comboMinProyectos ? roundTo(subtotalUnico * RULES.comboDescuento, RULES.redondeo) : 0;
  const piso = roundTo(baseUnico * RULES.pisoSobreBase, RULES.redondeo);
  const totalUnico = Math.max(subtotalUnico - combo, piso);

  let rebaja = null;
  if (pedirRebaja && totalUnico > 0) {
    const conRebaja = Math.max(roundTo(totalUnico * (1 - RULES.rebajaMax), RULES.redondeo), piso);
    if (conRebaja < totalUnico) rebaja = { total_pago_unico: conRebaja, sujeto_a_aprobacion: true };
  }

  const out = {
    ok: true,
    lineas,
    pago_unico: { subtotal: subtotalUnico, descuento_combinacion: combo, total: totalUnico },
    mensual: { total: mensual },
    rebaja,
  };
  // Todas las cifras que Marcy puede citar (para el filtro de precios).
  const cifras = new Set([subtotalUnico, combo, totalUnico, mensual]);
  for (const l of lineas) { cifras.add(l.base); cifras.add(l.total); for (const e of l.extras) cifras.add(e.suma); }
  if (rebaja) cifras.add(rebaja.total_pago_unico);
  out.cifras = [...cifras].filter((n) => n > 0);
  return out;
}
