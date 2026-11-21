// ════════════════════════════════════════════════════════════════
//  scripts/test-marcy-quote.mjs — Marcy cotiza con planes y paquetes (Ventas §4)
//  npm run test:cotizar
//
//  Sin base ni red. El catálogo de aquí es INVENTADO (el repo es público): las
//  cifras reales viven en la base (sales_catalog) y en _cerebro/ventas/catalogo.json.
//  Si ese archivo está en el equipo, una prueba más comprueba que ninguna cifra
//  interna aparece en los archivos de Marcy.
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildQuote, quoteKey, saveQuote, attachQuote, salesCatalog, __resetCatalogCache, planIncludes, CONDICIONES } from '../lib/marcy-quote.mjs';
import { QUOTE_TOOL, QUOTE_SERVICES, QUOTE_PLANS, SYSTEM_PROMPT, pricePostFilter } from '../lib/chat-kb.mjs';
import { quoteToolResult } from '../api/chat.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
const fails = [];
async function check(name, fn) { try { await fn(); pass++; } catch (e) { fails.push(name + ' → ' + (e && e.message)); } }

// Catálogo INVENTADO: mismas claves que el real, cifras que no son las reales.
const CAT = {
  version: 'prueba-marcy',
  reglas: { pisoSobreBase: 0.8, comboDescuentoProyectos: 0.1, redondeoProyectos: 50, propuestaValidaDias: 14, seguimientoDias: [2, 5, 10] },
  proyectos: {
    diagnostico: { nombre: 'Diagnóstico', precio: 0 },
    webLanding: { nombre: 'Página web + ficha de Google', precio: 1010 },
    webRedesign: { nombre: 'Rediseño', precio: 1210, segundoIdioma: 330 },
    web: { nombre: 'Web que vende', precio: 3030 },
    webCiudades: { nombre: 'Web de servicios por ciudades', desde: 7070 },
    iaBasic: { nombre: 'Asistente con IA básico', precio: 1110, mensual: 77 },
    ia: { nombre: 'Asistente con IA completo', precio: 2020, mensual: 133 },
    brandingLogo: { nombre: 'Logo', precio: 505 },
  },
  planes: {
    base: { nivel: 1, nombre: 'Base', en: 'Base', mensual: 111, enPropuestas: false, frase: 'Tu web segura' },
    presencia: { nivel: 2, nombre: 'Presencia', en: 'Presence', mensual: 333, enPropuestas: true, frase: 'Que te encuentren', trabajo: { paginas: '1 cada 2 meses', publicacionesFicha: '1 al mes', trimestral: 'resumen' } },
    crecimiento: { nivel: 3, nombre: 'Crecimiento', en: 'Growth', mensual: 555, enPropuestas: true, recomendado: true, frase: 'Que te llamen', trabajo: { tandaSemanal: true, paginas: '2 al mes', respuestasResenas: true } },
    dominio: { nivel: 4, nombre: 'Dominio', en: 'Lead', mensual: 888, enPropuestas: true, incluyeCuotaAsistente: true, ancla: true, frase: 'Que la IA te recomiende', trabajo: { tandaSemanal: true, ia: true } },
  },
  anadidosMensuales: { aeoMonitoring: { nombre: 'Seguimiento en IA', mensual: 44, para: ['presencia', 'crecimiento'] } },
  paquetes: [
    { plan: 'presencia', proyecto: 'webLanding', orden: 3, papel: 'entrada' },
    { plan: 'dominio', proyecto: 'webCiudades', orden: 1, papel: 'ancla' },
    { plan: 'crecimiento', proyecto: 'web', orden: 2, papel: 'recomendado', nota: 'con 6 meses de plan, la web en 3 pagos' },
  ],
  preciosPublicos: { anclas: { webLanding: 900, web: 2900, iaBasic: 1000, brandingLogo: 450 }, mensuales: [] },
};

// ── La cotización (pura) ──
await check('paquetes: tres opciones en el orden de la lista, la completa primero', () => {
  const q = buildQuote(CAT, { paquetes: true });
  assert.equal(q.ok, true);
  const o = q.visible.opciones;
  assert.deepEqual(o.map((x) => x.plan.nombre), ['Dominio', 'Crecimiento', 'Presencia']);
  assert.deepEqual(o.map((x) => x.etiqueta), ['La completa', 'La recomendada', 'La de entrada']);
  assert.deepEqual(o.map((x) => x.recomendada), [false, true, false]);
  assert.deepEqual(o.map((x) => x.pago_unico), [7070, 3030, 1010]);
  assert.deepEqual(o.map((x) => x.mensual), [888, 555, 333]);
  assert.equal(o[0].servicios[0].desde, true, 'la web por ciudades es un «desde»');
  assert.equal(o[1].nota, CONDICIONES.es.tresPagos, 'la recomendada lleva la web en tres pagos');
  assert.equal(q.save.recommended_option, 1);
});
await check('paquetes en inglés: nombre del plan y condiciones en inglés', () => {
  const q = buildQuote(CAT, { paquetes: true }, { lang: 'en' });
  assert.deepEqual(q.visible.opciones.map((x) => x.plan.nombre), ['Lead', 'Growth', 'Presence']);
  assert.equal(q.visible.recuerda, CONDICIONES.en.recuerda);
  assert.ok(q.visible.condiciones.includes(CONDICIONES.en.permanencia));
});
await check('valor de un cliente: con cuántos clientes al mes se paga lo mensual', () => {
  const q = buildQuote(CAT, { paquetes: true, valor_cliente: 300 });
  assert.deepEqual(q.visible.opciones.map((x) => x.se_paga_con_clientes_al_mes), [3, 2, 2]);
  assert.equal(q.save.client_value_cents, 30000);
  assert.equal(buildQuote(CAT, { paquetes: true }).visible.opciones[0].se_paga_con_clientes_al_mes, null);
  assert.equal(buildQuote(CAT, { paquetes: true, valor_cliente: -5 }).save.client_value_cents, null);
});
await check('a la medida: de la más completa a la de entrada y la de Crecimiento recomendada', () => {
  const q = buildQuote(CAT, { opciones: [{ servicios: ['webLanding'] }, { plan: 'dominio', servicios: ['ia'] }, { plan: 'crecimiento', servicios: ['iaBasic'] }] });
  const o = q.visible.opciones;
  assert.deepEqual(o.map((x) => (x.plan ? x.plan.nombre : null)), ['Dominio', 'Crecimiento', null]);
  assert.equal(o[1].recomendada, true);
});
await check('Base no se ofrece; servicios inventados o el diagnóstico, fuera', () => {
  assert.equal(buildQuote(CAT, { opciones: [{ plan: 'base' }] }).ok, false);
  const q = buildQuote(CAT, { opciones: [{ plan: 'base', servicios: ['hackeo', 'diagnostico', 'web'] }] });
  assert.equal(q.visible.opciones.length, 1);
  assert.equal(q.visible.opciones[0].plan, null);
  assert.deepEqual(q.visible.opciones[0].servicios.map((s) => s.nombre), ['Web que vende']);
  assert.equal(buildQuote(CAT, {}).ok, false);
  assert.equal(buildQuote(null, { paquetes: true }).ok, false);
});
await check('cuota del asistente: aparte en Crecimiento, incluida en Dominio', () => {
  const q = buildQuote(CAT, { opciones: [{ plan: 'crecimiento', servicios: ['iaBasic'] }, { plan: 'dominio', servicios: ['ia'] }] });
  const [dom, cre] = q.visible.opciones;
  assert.equal(cre.mensual, 555 + 77);
  assert.ok(cre.mensual_detalle.some((d) => /Cuota mensual/.test(d.concepto) && d.mensual === 77));
  assert.equal(dom.mensual, 888);
  assert.equal(dom.servicios[0].cuota_incluida_en_el_plan, true);
});
await check('combinación: dos proyectos de pago único, 10 % menos redondeado, nunca bajo el mínimo', () => {
  const q = buildQuote(CAT, { opciones: [{ plan: 'crecimiento', servicios: ['web', 'iaBasic'] }] });
  const o = q.visible.opciones[0];
  // web 3030 → 2750 (redondeado a 50, sobre el mínimo 2900 = público) → 2900; iaBasic 1110 → 1000 (público 1000).
  assert.deepEqual(o.servicios.map((s) => s.precio), [2900, 1000]);
  assert.equal(o.descuento_combinacion, 130 + 110);
  assert.equal(o.pago_unico, 3900);
  assert.deepEqual(q.save.options[0].projects, [{ id: 'web', price_cents: 290000 }, { id: 'iaBasic', price_cents: 100000 }]);
});
await check('rebaja solo si se pide, sujeta a aprobación, nunca bajo el mínimo; un «desde» no se rebaja', () => {
  assert.equal(buildQuote(CAT, { opciones: [{ servicios: ['webRedesign'] }] }).visible.opciones[0].rebaja, undefined);
  const q = buildQuote(CAT, { opciones: [{ servicios: ['webRedesign'] }, { servicios: ['webCiudades'] }], pedir_rebaja: true });
  const [ciudades, red] = q.visible.opciones;
  assert.deepEqual(red.rebaja, { pago_unico: 1100, sujeto_a_aprobacion: true }); // 1210 × 0.9 = 1089 → 1100 (mínimo 968 → 1000)
  assert.equal(ciudades.rebaja, undefined);
  assert.match(q.save.notes, /sujeta a aprobación/);
});
await check('segundo idioma del rediseño', () => {
  assert.equal(buildQuote(CAT, { opciones: [{ servicios: ['webRedesign'], segundo_idioma: true }] }).visible.opciones[0].pago_unico, 1540);
});
await check('Seguimiento en IA: solo con los planes que lo admiten', () => {
  const q = buildQuote(CAT, { opciones: [{ plan: 'presencia', seguimiento_ia: true }, { plan: 'dominio', seguimiento_ia: true }] });
  const [dom, pre] = q.visible.opciones;
  assert.equal(pre.mensual, 333 + 44);
  assert.equal(dom.mensual, 888);
});
await check('qué incluye un plan, en frases', () => {
  assert.ok(planIncludes(CAT.planes.dominio).some((t) => /cuota mensual del asistente/.test(t)));
  assert.ok(planIncludes(CAT.planes.crecimiento, 'en').some((t) => /every week/.test(t)));
});
await check('cifras: todas al allowlist del filtro; lo guardado no lleva cifras de más', () => {
  const out = quoteToolResult({ paquetes: true, valor_cliente: 300 }, 'es', CAT);
  const v = JSON.parse(out.content);
  assert.equal(v.ok, true);
  for (const n of ['7070', '3030', '888', '555', '333', '300']) assert.ok(out.extraAllow.includes(n), n);
  assert.ok(pricePostFilter('La completa sale en $7,070 y $888 al mes.', 'es', out.extraAllow).includes('$7,070'));
  assert.equal(out.quote.options.length, 3);
  assert.ok(!('save' in v) && !('figures' in v));
});
await check('sin lista (base caída): ok false, sin cifras y sin guardar', () => {
  const out = quoteToolResult({ paquetes: true }, 'es', null);
  assert.deepEqual(JSON.parse(out.content), { ok: false, motivo: 'sin_lista' });
  assert.deepEqual(out.extraAllow, []);
  assert.equal(out.quote, undefined);
});
await check('clave estable: la misma cotización, la misma clave', () => {
  const a = buildQuote(CAT, { paquetes: true, valor_cliente: 300 }).save;
  const b = buildQuote(CAT, { paquetes: true, valor_cliente: 300 }).save;
  assert.equal(quoteKey(a), quoteKey(b));
  assert.notEqual(quoteKey(a), quoteKey(buildQuote(CAT, { paquetes: true }).save));
});

// ── Herramienta y guion ──
await check('herramienta: planes ofrecidos y servicios = claves de la lista; sin cifras', () => {
  const p = QUOTE_TOOL.input_schema.properties;
  assert.deepEqual(p.opciones.items.properties.plan.enum, QUOTE_PLANS);
  assert.ok(!QUOTE_PLANS.includes('base'));
  assert.deepEqual(p.opciones.items.properties.servicios.items.enum, Object.keys(QUOTE_SERVICES));
  assert.doesNotMatch(JSON.stringify(QUOTE_TOOL), /\$\s?\d/);
});
await check('guion: planes por su nombre, completa primero, valor de un cliente antes de la cifra', () => {
  for (const t of ['Presencia', 'Crecimiento', 'Dominio', 'PLANES Y PAQUETES', 'cuánto le deja', 'la más completa primero', 'salvo con la web en tres pagos', 'NO ofreces']) assert.ok(SYSTEM_PROMPT.includes(t), t);
});

// ── Guardar en la conversación y en Orbit ──
function fakeSql({ leadRef = null, quote = null, noColumn = false } = {}) {
  const calls = [];
  const sql = async (strings, ...values) => {
    const text = strings.join('?');
    calls.push({ text, values });
    if (noColumn && /quote/.test(text)) { const e = new Error('column "quote" does not exist'); e.code = '42703'; throw e; }
    if (/^UPDATE chat_conversations SET quote/.test(text.trim())) return { rows: [{ lead_ref: leadRef }], rowCount: 1 };
    if (/SELECT quote FROM chat_conversations/.test(text)) return { rows: quote ? [{ quote }] : [], rowCount: quote ? 1 : 0 };
    return { rows: [], rowCount: 0 };
  };
  return { sql, calls };
}
const SAVE = buildQuote(CAT, { paquetes: true, valor_cliente: 300 }).save;

await check('sin contacto todavía: queda en la conversación y no se guarda en Orbit', async () => {
  const { sql, calls } = fakeSql();
  const saved = [];
  assert.equal(await saveQuote({ sid: 'abc-1', quote: SAVE, sqlImpl: sql, save: async (x) => { saved.push(x); return { proposal: { ref_id: 'PROP-1' } }; } }), null);
  assert.equal(saved.length, 0);
  assert.ok(calls[0].values[0].includes('"recommended_option":1'));
});
await check('con contacto: borrador en Orbit, de Marcy, con la conversación de origen', async () => {
  const { sql } = fakeSql({ leadRef: 'LEAD-042' });
  const saved = [];
  const ref = await saveQuote({ sid: 'abc-1', quote: SAVE, sqlImpl: sql, save: async (x) => { saved.push(x); return { proposal: { ref_id: 'PROP-7' } }; } });
  assert.equal(ref, 'PROP-7');
  assert.equal(saved[0].lead_ref, 'LEAD-042');
  assert.equal(saved[0].created_by, 'marcy');
  assert.equal(saved[0].send, false);
  assert.equal(saved[0].client_value_cents, 30000);
  assert.match(saved[0].source_ref, /^chat:abc-1:[a-z0-9]+$/);
});
await check('un brief (MRC) o un paso a persona no reciben la propuesta', async () => {
  const { sql } = fakeSql({ leadRef: 'MRC-012' });
  const saved = [];
  await saveQuote({ sid: 'abc-1', quote: SAVE, sqlImpl: sql, save: async (x) => { saved.push(x); } });
  assert.equal(await attachQuote({ sid: 'abc-1', ref: 'MRC-012', sqlImpl: sql, save: async (x) => { saved.push(x); } }), null);
  assert.equal(saved.length, 0);
});
await check('al llegar el contacto, la cotización guardada pasa a Orbit con la misma clave', async () => {
  const { sql } = fakeSql({ quote: { ...SAVE, key: 'k1' } });
  const saved = [];
  await attachQuote({ sid: 'abc-1', ref: 'LEAD-050', sqlImpl: sql, save: async (x) => { saved.push(x); return { proposal: { ref_id: 'PROP-9' } }; } });
  assert.equal(saved[0].source_ref, 'chat:abc-1:k1');
  assert.equal(saved[0].lead_ref, 'LEAD-050');
});
await check('sin la columna nueva o con Orbit caído: no rompe el chat', async () => {
  const { sql } = fakeSql({ noColumn: true });
  assert.equal(await saveQuote({ sid: 'abc-1', quote: SAVE, sqlImpl: sql }), null);
  assert.equal(await attachQuote({ sid: 'abc-1', ref: 'LEAD-1', sqlImpl: sql }), null);
  const ok = fakeSql({ leadRef: 'LEAD-3' });
  assert.equal(await saveQuote({ sid: 'abc-1', quote: SAVE, sqlImpl: ok.sql, save: async () => { throw new Error('503'); } }), null);
});
await check('lista de la base: en memoria 10 minutos; si falla, null', async () => {
  __resetCatalogCache();
  let n = 0;
  const load = async () => { n++; return { version: 'v', body: CAT }; };
  const sqlImpl = { query: async () => ({ rows: [] }) };
  assert.equal(await salesCatalog({ sqlImpl, load, now: 1000 }), CAT);
  await salesCatalog({ sqlImpl, load, now: 1000 + 5 * 60 * 1000 });
  assert.equal(n, 1);
  await salesCatalog({ sqlImpl, load, now: 1000 + 11 * 60 * 1000 });
  assert.equal(n, 2);
  __resetCatalogCache();
  assert.equal(await salesCatalog({ sqlImpl, load: async () => { throw new Error('caída'); } }), null);
  __resetCatalogCache();
});

// ── Fuga: ninguna cifra interna de la lista real en los archivos de Marcy ──
function findCatalog() {
  let dir = ROOT;
  for (let i = 0; i < 12; i++) {
    const f = path.join(dir, '_cerebro/ventas/catalogo.json');
    if (fs.existsSync(f)) return f;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
const realPath = process.env.MARCYAN_CATALOGO || findCatalog();
if (realPath && fs.existsSync(realPath)) {
  await check('fuga: ninguna cifra interna en los archivos de Marcy', () => {
    const real = JSON.parse(fs.readFileSync(realPath, 'utf8'));
    const pub = new Set(Object.values(real.preciosPublicos?.anclas || {}));
    const vals = new Set();
    for (const p of Object.values(real.proyectos || {})) for (const k of ['precio', 'desde', 'mensual', 'segundoIdioma']) if (p[k] > 0) vals.add(p[k]);
    for (const p of Object.values(real.planes || {})) if (p.mensual > 0) vals.add(p.mensual);
    for (const a of Object.values(real.anadidosMensuales || {})) if (a.mensual > 0) vals.add(a.mensual);
    const internal = [...vals].filter((v) => !pub.has(v));
    const files = ['lib/marcy-quote.mjs', 'lib/chat-kb.mjs', 'api/chat.mjs', 'lib/channels.mjs', 'docs/marcy/reglas-cotizacion.md',
      'docs/marcy-sales-playbook.md', 'scripts/test-marcy-quote.mjs', 'scripts/test-chat-guard.mjs', 'scripts/evals/marcy-casos.mjs'];
    const hits = [];
    for (const f of files) {
      const p = path.join(ROOT, f);
      if (!fs.existsSync(p)) continue;
      const text = fs.readFileSync(p, 'utf8');
      for (const v of internal) {
        const fmt = [String(v), v.toLocaleString('en-US')].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        if (new RegExp(`\\$\\s?(${fmt.join('|')})(?![\\d,])`).test(text)) hits.push(`${f}: $${v}`);
      }
    }
    assert.deepEqual(hits, []);
  });
}

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) de la cotización de Marcy fallaron:`);
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log(`✓ ${pass} pruebas de la cotización de Marcy pasaron${realPath ? '' : ' (sin la lista real: la prueba de fuga no corrió)'}.`);
