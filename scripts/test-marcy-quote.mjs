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
import { orbitEnabled, buildQuote, quoteKey, saveQuote, retryPendingQuotes, salesCatalog, __resetCatalogCache, planIncludes, CONDICIONES, MARCY_QUOTE_SENT } from '../lib/marcy-quote.mjs';
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
    seoInitial: { nombre: 'SEO inicial', precio: 606 },
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
  assert.equal(o[0].servicios[0].desde, 7070, 'la web por ciudades es un «desde»');
  assert.equal(o[0].pago_unico_es_desde, true);
  assert.equal(o[1].pago_unico_es_desde, undefined);
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
  // web 3030 × 0.9 = 2727 → 2750 (hacia arriba), bajo el mínimo 2900 (= público) → 2900; iaBasic 999 → 1000.
  assert.deepEqual(o.servicios.map((s) => s.precio), [2900, 1000]);
  assert.equal(o.descuento_combinacion, 130 + 110);
  assert.equal(o.pago_unico, 3900);
  assert.deepEqual(q.save.options[0].projects, [{ id: 'web', price_cents: 290000 }, { id: 'iaBasic', price_cents: 100000 }]);
});
await check('rebaja solo si se pide, sujeta a aprobación, nunca bajo el mínimo; un «desde» no se rebaja', () => {
  assert.equal(buildQuote(CAT, { opciones: [{ servicios: ['webRedesign'] }] }).visible.opciones[0].rebaja, undefined);
  const q = buildQuote(CAT, { opciones: [{ servicios: ['webRedesign'] }, { servicios: ['webCiudades'] }], pedir_rebaja: true });
  const [ciudades, red] = q.visible.opciones;
  assert.deepEqual(red.rebaja, { pago_unico: 1100, sujeto_a_aprobacion: true }); // 1210 × 0.9 = 1089 → 1100 hacia arriba (mínimo 968 → 1000)
  assert.equal(ciudades.rebaja, undefined);
  assert.match(q.save.notes, /sujeta a aprobación/);
});
await check('el descuento nunca pasa del 10 %: redondeo hacia arriba', () => {
  const cat = { ...CAT, proyectos: { ...CAT.proyectos, a: { nombre: 'A', precio: 1060 }, b: { nombre: 'B', precio: 2040 } } };
  const o = buildQuote(cat, { opciones: [{ servicios: ['a', 'b'] }], pedir_rebaja: true }).visible.opciones[0];
  // a: 954 → 1000 · b: 1836 → 1850. Con Math.round serían 950 y 1850 (a bajaría un 10,4 %).
  assert.deepEqual(o.servicios.map((x) => x.precio), [1000, 1850]);
  for (const x of o.servicios) assert.ok(x.precio % 50 === 0);
});
await check('segundo idioma del rediseño, y queda escrito en lo que va a Orbit', () => {
  const q = buildQuote(CAT, { opciones: [{ servicios: ['webRedesign'], segundo_idioma: true }] });
  assert.equal(q.visible.opciones[0].pago_unico, 1540);
  assert.match(q.save.notes, /dos idiomas/);
});
await check('un añadido cuya lista interna queda bajo su precio público no se cotiza', () => {
  const cat = { ...CAT, preciosPublicos: { ...CAT.preciosPublicos, anclas: { ...CAT.preciosPublicos.anclas, aeoMonitoring: 60 } } };
  const o = buildQuote(cat, { opciones: [{ plan: 'presencia', seguimiento_ia: true }] }).visible.opciones[0];
  assert.equal(o.mensual, 333);
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
await check('cifras: todas al allowlist del filtro; lo guardado no lleva cifras de más', async () => {
  const out = await quoteToolResult({ paquetes: true, valor_cliente: 300 }, 'es', CAT);
  const v = JSON.parse(out.content);
  assert.equal(v.ok, true);
  for (const n of ['7070', '3030', '888', '555', '333', '300']) assert.ok(out.extraAllow.includes(n), n);
  assert.ok(pricePostFilter('La completa sale en $7,070 y $888 al mes.', 'es', out.extraAllow).includes('$7,070'));
  // Exactas, sin redondeos: un redondeo dejaría pasar una cifra inventada.
  for (const n of ['7000', '3000', '900', '1000']) assert.ok(!out.extraAllow.includes(n), 'sin redondeo ' + n);
  assert.doesNotMatch(pricePostFilter('Te la dejo en $3,000.', 'es', out.extraAllow), /\$3,000/);
  assert.equal(out.quote.paquetes, true);
  assert.equal(out.quote.valor_cliente, 300);
  assert.ok(out.quote.key);
  assert.doesNotMatch(JSON.stringify(out.quote), /price_cents|7070|3030|888/, 'lo que se guarda en la conversación no lleva cifras');
  assert.ok(!('save' in v) && !('figures' in v) && !('stored' in v));
});
await check('sin lista (base caída): ok false, sin cifras y sin guardar', async () => {
  const out = await quoteToolResult({ paquetes: true }, 'es', null);
  assert.deepEqual(JSON.parse(out.content), { ok: false, motivo: 'sin_lista' });
  assert.deepEqual(out.extraAllow, []);
  assert.equal(out.quote, undefined);
});
await check('clave estable: lo mismo pedido, la misma clave; la rebaja cambia la clave', () => {
  const a = buildQuote(CAT, { paquetes: true, valor_cliente: 300 }).stored;
  const b = buildQuote(CAT, { paquetes: true, valor_cliente: 300 }).stored;
  assert.equal(a.key, b.key);
  assert.equal(quoteKey(a), a.key);
  assert.notEqual(a.key, buildQuote(CAT, { paquetes: true }).stored.key);
  assert.notEqual(a.key, buildQuote(CAT, { paquetes: true, valor_cliente: 300, pedir_rebaja: true }).stored.key);
});
await check('lo guardado vuelve a dar la misma cotización', () => {
  const q = buildQuote(CAT, { opciones: [{ plan: 'crecimiento', servicios: ['web', 'iaBasic'] }, { servicios: ['webRedesign'], segundo_idioma: true }], valor_cliente: 400, pedir_rebaja: true });
  const again = buildQuote(CAT, q.stored, { lang: q.stored.lang });
  assert.deepEqual(again.save, q.save);
  assert.deepEqual(again.visible, q.visible);
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

// ── Guardar en la conversación y pasar a Orbit ──
function fakeSql({ noColumn = false, pending = [] } = {}) {
  const calls = [];
  const sql = async (strings, ...values) => {
    const text = strings.join('?');
    calls.push({ text, values });
    if (noColumn && /quote/.test(text)) { const e = new Error('column "quote" does not exist'); e.code = '42703'; throw e; }
    if (/quote_proposal IS NULL/.test(text)) return { rows: pending, rowCount: pending.length };
    return { rows: [], rowCount: 1 };
  };
  return { sql, calls };
}
const STORED = buildQuote(CAT, { paquetes: true, valor_cliente: 300 }).stored;
const okSave = (saved, ref = 'PROP-1') => async (x) => { saved.push(x); return { proposal: { ref_id: ref } }; };

await check('guardar en la conversación: solo lo pedido, pendiente, sin llamar a Orbit', async () => {
  const { sql, calls } = fakeSql();
  assert.equal(await saveQuote({ sid: 'abc-1', quote: STORED, sqlImpl: sql }), true);
  assert.match(calls[0].text, /SET quote =/);
  assert.match(calls[0].text, /quote_proposal = CASE WHEN quote->>'key' = \? AND quote_at > NOW\(\) - INTERVAL '30 days' THEN quote_proposal END/,
    'lo mismo pedido otra vez conserva su marca (un borrador descartado no vuelve a crearse)');
  assert.ok(calls[0].values.filter((v) => v === STORED.key).length >= 3);
  assert.equal(calls.length, 1);
  assert.equal(await saveQuote({ sid: 'x y', quote: STORED, sqlImpl: sql }), false);
  assert.equal(await saveQuote({ sid: 'abc-1', quote: { paquetes: true }, sqlImpl: sql }), false, 'sin clave no se guarda');
});
await check('pasar a Orbit: contacto con lead_ref y brief con brief_ref, borrador de Marcy, precio de la lista de ahora', async () => {
  const pending = [
    { sid: 's-1', lead_ref: 'LEAD-042', quote: STORED, quote_tries: 0 },
    { sid: 's-2', lead_ref: 'MRC-012', quote: STORED, quote_tries: 0 },
  ];
  const { sql, calls } = fakeSql({ pending });
  const saved = [];
  assert.equal(await retryPendingQuotes({ sqlImpl: sql, catalog: CAT, enabled: true, save: okSave(saved, 'PROP-7') }), 2);
  assert.equal(saved[0].lead_ref, 'LEAD-042');
  assert.equal(saved[1].brief_ref, 'MRC-012');
  assert.equal(saved[1].lead_ref, undefined);
  for (const x of saved) {
    assert.equal(x.created_by, 'marcy');
    assert.equal(x.send, MARCY_QUOTE_SENT);
    assert.equal(x.client_value_cents, 30000);
    assert.equal(x.recommended_option, 1);
    assert.equal(x.options.length, 3);
  }
  assert.equal(saved[0].source_ref, `chat:s-1:${STORED.key}`);
  assert.equal(saved[0].replaces_prefix, 'chat:s-1:');
  assert.ok(saved[0].source_ref.startsWith(saved[0].replaces_prefix), 'el prefijo es el principio del source_ref (si no, Orbit da 400)');
  // La web por ciudades (solo «desde») va sin precio: Orbit la deja por confirmar.
  const ciudades = saved[0].options.flatMap((o) => o.projects).find((p) => p.id === 'webCiudades');
  assert.deepEqual(ciudades, { id: 'webCiudades' });
  assert.ok(saved[0].options.flatMap((o) => o.projects).filter((p) => p.id !== 'webCiudades').every((p) => Number.isInteger(p.price_cents)));
  assert.deepEqual(saved[0].options, buildQuote(CAT, STORED).save.options);
  const marks = calls.filter((c) => /SET quote_proposal =/.test(c.text));
  assert.equal(marks.length, 2);
  assert.ok(marks[0].values.includes('PROP-7') && marks[0].values.includes(STORED.key), 'marca solo la cotización que subió');
  assert.equal(MARCY_QUOTE_SENT, false, 'decidido el 20-nov: borrador');
});
await check('si la lista cambió desde que Marcy cotizó, lo dice en las notas', async () => {
  const { sql } = fakeSql({ pending: [{ sid: 's-1', lead_ref: 'LEAD-1', quote: { ...STORED, version: 'vieja' }, quote_tries: 0 }] });
  const saved = [];
  await retryPendingQuotes({ sqlImpl: sql, catalog: CAT, enabled: true, save: okSave(saved) });
  assert.match(saved[0].notes, /La lista cambió desde que Marcy cotizó \(vieja → prueba-marcy\)/);
});
await check('Orbit rechaza (400 o 404): se descarta y se avisa; caída (503): suma un intento y sigue', async () => {
  const pending = [
    { sid: 's-1', lead_ref: 'LEAD-1', quote: STORED, quote_tries: 0 },
    { sid: 's-2', lead_ref: 'LEAD-2', quote: STORED, quote_tries: 3 },
    { sid: 's-3', lead_ref: 'LEAD-3', quote: STORED, quote_tries: 19 },
  ];
  const { sql, calls } = fakeSql({ pending });
  const notes = [];
  const save = async (x) => {
    if (x.lead_ref === 'LEAD-1') throw Object.assign(new Error('Contacto no encontrado.'), { status: 404 });
    throw Object.assign(new Error('Falta la migración'), { status: 503 });
  };
  assert.equal(await retryPendingQuotes({ sqlImpl: sql, catalog: CAT, enabled: true, save, notify: async (t, b) => notes.push(t) }), 0);
  const marks = calls.filter((c) => /SET quote_proposal =/.test(c.text));
  assert.ok(marks[0].values.includes('descartada'));
  assert.ok(!marks[1].values.includes('descartada'));
  assert.equal(notes.length, 2, 'avisa la descartada y la que llega a 20 intentos');
});
await check('interruptor apagado (por defecto): nada pasa a Orbit; la cotización queda pendiente', async () => {
  assert.equal(orbitEnabled({}), false);
  assert.equal(orbitEnabled({ MARCY_COTIZACION_ORBIT: 'on' }), true);
  const { sql, calls } = fakeSql({ pending: [{ sid: 's-1', lead_ref: 'LEAD-1', quote: STORED, quote_tries: 0 }] });
  const saved = [];
  assert.equal(await retryPendingQuotes({ sqlImpl: sql, catalog: CAT, enabled: false, save: okSave(saved) }), 0);
  assert.equal(saved.length, 0);
  assert.equal(calls.length, 0);
});
await check('sin la lista o sin la migración: no rompe y no descarta', async () => {
  const { sql, calls } = fakeSql({ pending: [{ sid: 's-1', lead_ref: 'LEAD-1', quote: STORED, quote_tries: 0 }] });
  assert.equal(await retryPendingQuotes({ sqlImpl: sql, catalog: null, enabled: true, save: okSave([]), notify: async () => {} }), 0);
  assert.ok(!calls.some((c) => c.values.includes('descartada')));
  assert.equal(await retryPendingQuotes({ sqlImpl: fakeSql({ noColumn: true }).sql, catalog: CAT, enabled: true }), 0);
  assert.equal(await saveQuote({ sid: 'abc-1', quote: STORED, sqlImpl: fakeSql({ noColumn: true }).sql }), false);
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
await check('en inglés el plan va sin frase (fraseEn sin el OK del dueño); en español, con ella', () => {
  const es = buildQuote(CAT, { paquetes: true }).visible.opciones.filter((o) => o.plan);
  const en = buildQuote(CAT, { paquetes: true }, { lang: 'en' }).visible.opciones.filter((o) => o.plan);
  assert.ok(es.length && es.every((o) => typeof o.plan.frase === 'string'));
  assert.ok(en.length && en.every((o) => !('frase' in o.plan)));
  assert.doesNotMatch(JSON.stringify(en), /fraseEn/);
});
await check('proyecto solo «desde»: por confirmar en el borrador y fuera de «se paga con»', () => {
  const con = buildQuote(CAT, { opciones: [{ plan: 'dominio', servicios: ['webCiudades'] }], valor_cliente: 300 });
  const sin = buildQuote(CAT, { opciones: [{ plan: 'dominio' }], valor_cliente: 300 });
  const o = con.visible.opciones[0];
  assert.equal(o.pago_unico_es_desde, true);
  assert.ok('desde' in o.servicios[0] && !('precio' in o.servicios[0]));
  assert.equal(o.se_paga_con_clientes_al_mes, sin.visible.opciones[0].se_paga_con_clientes_al_mes);
  assert.match(con.save.notes, /Precio por confirmar \(solo «desde»\): Web de servicios por ciudades/);
  assert.doesNotMatch(sin.save.notes, /por confirmar/);
});
await check('cada frase legal vive en un solo sitio (lib/condiciones-legales.mjs)', () => {
  const frases = Object.values(CONDICIONES).flatMap((c) => Object.values(c));
  const skip = new Set(['node_modules', '.git', '.vercel', 'dist', '.astro', '.claude']);
  const hits = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (skip.has(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(mjs|js|ts|astro|md|json)$/.test(e.name) && path.relative(ROOT, p) !== path.join('lib', 'condiciones-legales.mjs')) {
        const t = fs.readFileSync(p, 'utf8');
        for (const f of frases) if (t.includes(f)) hits.push(`${path.relative(ROOT, p)}: ${f.slice(0, 40)}`);
      }
    }
  };
  for (const d of ['lib', 'api', 'src', 'docs']) if (fs.existsSync(path.join(ROOT, d))) walk(path.join(ROOT, d));
  assert.ok(SYSTEM_PROMPT.includes(CONDICIONES.es.permanencia), 'el guion la toma de ahí');
  assert.ok(!SYSTEM_PROMPT.includes(CONDICIONES.es.tresPagos), 'los tres pagos solo en la nota del paquete que los lleva');
  assert.deepEqual(hits, []);
});

await check('dos opciones que quedan iguales se juntan en una', () => {
  const q = buildQuote(CAT, { opciones: [{ plan: 'crecimiento', servicios: ['web'] }, { plan: 'crecimiento', servicios: ['web', 'diagnostico'] }, { plan: 'presencia', servicios: ['webLanding'] }] });
  assert.equal(q.visible.opciones.length, 2);
  assert.equal(q.save.options.length, 2);
  assert.equal(q.stored.opciones.length, 2);
  assert.equal(buildQuote(CAT, { opciones: [{ plan: 'crecimiento' }, { plan: 'crecimiento' }, { plan: 'crecimiento' }] }).visible.opciones.length, 1);
});
await check('añadido pedido y no cotizado: queda dicho (no_cotizado) y en la nota del borrador', () => {
  const bajo = { ...CAT, preciosPublicos: { ...CAT.preciosPublicos, anclas: { ...CAT.preciosPublicos.anclas, aeoMonitoring: 60 } } };
  const q = buildQuote(bajo, { opciones: [{ plan: 'crecimiento', servicios: ['web'], seguimiento_ia: true }] });
  const o = q.visible.opciones[0];
  assert.deepEqual(o.no_cotizado, ['Seguimiento en IA']);
  assert.equal(o.mensual, 555);
  assert.match(q.save.notes, /pidió Seguimiento en IA, sin cotizar/);
  assert.deepEqual(q.stored.opciones[0].anadidos, ['aeoMonitoring']);
  assert.deepEqual(buildQuote(bajo, q.stored).visible, q.visible, 'al pasar a Orbit sale igual');
  // Dominio no lo admite (ya trae el trabajo de IA): no lo lleva y no dice que va aparte.
  const dom = buildQuote(CAT, { opciones: [{ plan: 'dominio', seguimiento_ia: true }] });
  assert.equal(dom.visible.opciones[0].no_cotizado, undefined);
  assert.doesNotMatch(dom.save.notes, /sin cotizar/);
  // Sin plan no se puede llevar: se dice.
  assert.deepEqual(buildQuote(CAT, { opciones: [{ servicios: ['web'], seguimiento_ia: true }] }).visible.opciones[0].no_cotizado, ['Seguimiento en IA']);
  // Cotizado de verdad: sin no_cotizado.
  assert.equal(buildQuote(CAT, { opciones: [{ plan: 'crecimiento', seguimiento_ia: true }] }).visible.opciones[0].no_cotizado, undefined);
});
await check('con un plan, el SEO inicial va incluido y no se cobra; sin plan, sí', () => {
  const con = buildQuote(CAT, { opciones: [{ plan: 'presencia', servicios: ['seoInitial', 'webLanding'] }] });
  const o = con.visible.opciones[0];
  assert.equal(o.pago_unico, 1010);
  assert.deepEqual(o.incluido_en_el_plan, ['SEO inicial']);
  assert.ok(!o.servicios.some((s) => s.nombre === 'SEO inicial'));
  assert.deepEqual(buildQuote(CAT, con.stored).visible, con.visible);
  assert.equal(buildQuote(CAT, { opciones: [{ servicios: ['seoInitial'] }] }).visible.opciones[0].pago_unico, 606);
});
await check('ids con nombre de propiedad interna (constructor, toString) no rompen la cotización', () => {
  const q = buildQuote(CAT, { opciones: [{ plan: 'constructor', servicios: ['web', 'toString', '__proto__'] }] });
  assert.equal(q.ok, true);
  assert.deepEqual(q.visible.opciones[0].servicios.map((s) => s.nombre), ['Web que vende']);
  assert.equal(q.visible.opciones[0].plan, null);
});
await check('la tarea de 5 min pone precio con la lista recién leída aunque haya otra en memoria', async () => {
  __resetCatalogCache();
  await salesCatalog({ sqlImpl: async () => ({ rows: [] }), load: async () => ({ body: { ...CAT, version: 'vieja' } }) });
  const { sql } = fakeSql({ pending: [{ sid: 's-1', lead_ref: 'LEAD-1', quote: STORED, quote_tries: 0 }] });
  const saved = [];
  assert.equal(await retryPendingQuotes({ sqlImpl: sql, enabled: true, save: okSave(saved), load: async () => ({ body: CAT }) }), 1);
  assert.doesNotMatch(saved[0].notes, /La lista cambió/, 'usó la lista de la base (la misma versión), no la vieja de memoria');
  __resetCatalogCache();
});
await check('los tres pagos van con el contenido: la opción a la medida con el plan y la web del paquete también los lleva', () => {
  const o = buildQuote(CAT, { opciones: [{ plan: 'crecimiento', servicios: ['web'] }] }).visible.opciones[0];
  assert.equal(o.nota, CONDICIONES.es.tresPagos);
  assert.equal(buildQuote(CAT, { opciones: [{ plan: 'presencia', servicios: ['web'] }] }).visible.opciones[0].nota, undefined);
  assert.equal(buildQuote(CAT, { opciones: [{ servicios: ['web'] }] }).visible.opciones[0].nota, undefined);
});
await check('la tarea de 5 min lee la lista de la base, no la de memoria', async () => {
  __resetCatalogCache();
  const vieja = { ...CAT, version: 'vieja' };
  await salesCatalog({ sqlImpl: async () => ({ rows: [] }), load: async () => ({ body: vieja }), now: 1000 });
  assert.equal((await salesCatalog({ load: async () => ({ body: CAT }), now: 2000 })).version, 'vieja', 'el chat usa la de memoria');
  assert.equal((await salesCatalog({ sqlImpl: async () => ({ rows: [] }), load: async () => ({ body: CAT }), now: 3000, fresh: true })).version, 'prueba-marcy');
  __resetCatalogCache();
});
await check('lo mismo pedido que ya tenía una propuesta enviada: no se duplica y se avisa', async () => {
  const { sql, calls } = fakeSql({ pending: [{ sid: 'wa-1', lead_ref: 'LEAD-9', quote: STORED, quote_tries: 0 }] });
  const notes = [];
  const save = async () => ({ proposal: { ref_id: 'PROP-3', status: 'sent' }, created: false });
  assert.equal(await retryPendingQuotes({ sqlImpl: sql, catalog: CAT, enabled: true, save, notify: async (t, b) => notes.push(b) }), 1);
  assert.equal(notes.length, 1);
  assert.match(notes[0], /PROP-3 \(sent\)/);
  assert.ok(calls.some((c) => /SET quote_proposal =/.test(c.text) && c.values.includes('PROP-3')));
  const notes2 = [];
  const { sql: sql2 } = fakeSql({ pending: [{ sid: 'web-1', lead_ref: 'LEAD-9', quote: STORED, quote_tries: 0 }] });
  await retryPendingQuotes({ sqlImpl: sql2, catalog: CAT, enabled: true, save: async () => ({ proposal: { ref_id: 'PROP-4', status: 'draft' }, created: false }), notify: async (t, b) => notes2.push(b) });
  assert.equal(notes2.length, 0, 'un reintento que encuentra su borrador no avisa');
});
await check('la frase de la garantía no hace saltar el filtro de marca; un claim de verdad, sí', async () => {
  const { brandBlocks, brandPostFilter } = await import('../lib/chat-kb.mjs');
  const es = 'Con Crecimiento quedan en $3,030 y $555 al mes. ' + CONDICIONES.es.garantia;
  assert.equal(brandBlocks(es), false);
  assert.equal(brandPostFilter(es), es);
  assert.equal(brandBlocks('Growth works. ' + CONDICIONES.en.garantia.replace("'", '’')), false);
  assert.equal(brandBlocks('garantizamos el trabajo, no el resultado'), false);
  assert.equal(brandBlocks('Te garantizamos la primera página de Google.'), true);
  assert.equal(brandBlocks(CONDICIONES.es.garantia + ' Y garantizamos más clientes.'), true);
});
await check('turno con cotizar: una cuota mensual inventada por debajo de 100 se corta; la de cotizar pasa', () => {
  const strict = { strictLow: true };
  for (const t of ['El asistente lleva una cuota de $45 al mes.', 'El asistente lleva $45 de cuota mensual.', 'Son $45 más al mes.',
    'Pagas $45 de mensualidad.', 'Lo mensual sube $45.']) assert.match(pricePostFilter(t, 'es', [], strict), /no me cuadra/, t);
  for (const t of ['The assistant is $45/mo.', 'Add $45 extra per month.', 'The assistant adds $45 in monthly fees.']) assert.match(pricePostFilter(t, 'en', [], strict), /doesn.t sound right/, t);
  assert.equal(pricePostFilter('El asistente lleva $77 al mes.', 'es', ['77'], strict), 'El asistente lleva $77 al mes.');
  assert.equal(pricePostFilter('Si cada corte te deja $45, se paga solo.', 'es', ['45'], strict), 'Si cada corte te deja $45, se paga solo.', 'la cifra que dijo el cliente pasa');
  assert.equal(pricePostFilter('El asistente lleva una cuota de $45 al mes.', 'es', []), 'El asistente lleva una cuota de $45 al mes.', 'sin cotizar en el turno, la banda baja sigue igual');
});

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
