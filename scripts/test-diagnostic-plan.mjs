// ════════════════════════════════════════════════════════════════
//  scripts/test-diagnostic-plan.mjs  ·  parte de `npm run test:diag`
//  Ventas §5: el diagnóstico recomienda un plan, sin precios, y entra en el
//  embudo de Orbit. Sin red ni base: todo con dobles.
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeSite, fallbackReport, plainSummary, recommendService } from '../lib/diagnostic-checks.mjs';
import { recommendPlan, planText, PLAN_OK_THRESHOLD } from '../lib/diagnostic-plan.mjs';
import { PLANES } from '../lib/planes.generado.mjs';
import { parseCalcValue, calcValueLine, CALC_RANGES } from '../lib/calc-value.mjs';
import { optionsFromCatalog, runDiagnosticFunnel, DIAGNOSTIC_DRAFTS, DIAGNOSTIC_PREFIX, isReplaceableDraft } from '../lib/diagnostic-funnel.mjs';
import { saveProposal, priceOption } from '../lib/proposals.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
const fails = [];
const check = async (name, fn) => { try { await fn(); pass++; } catch (e) { fails.push(name + ' → ' + e.message); } };

const S = (o) => ({ web: 80, seo: 80, ai: 80, conv: 80, rep: 80, ...o });

// ── Regla del plan (elegida por el dueño el 2026-11-20: «por lo más flojo») ──
await check('sin web (W1) → presencia', () => {
  const r = analyzeSite({ hasSite: false, reviewsBucket: 'ns' });
  assert.deepEqual(recommendPlan(r), { plan: 'presencia', frente: 'sin_web' });
});
await check('web en 0 sin W1 → presencia (sin web)', () => {
  assert.equal(recommendPlan({ scores: S({ web: 0 }) }).plan, 'presencia');
});
await check('lo más flojo es que te llamen → crecimiento', () => {
  assert.deepEqual(recommendPlan({ scores: S({ conv: 25 }) }), { plan: 'crecimiento', frente: 'llamar' });
});
await check('lo más flojo es que te encuentren (seo) → presencia', () => {
  assert.deepEqual(recommendPlan({ scores: S({ seo: 40 }) }), { plan: 'presencia', frente: 'encontrar' });
});
await check('lo más flojo es la IA → dominio', () => {
  assert.deepEqual(recommendPlan({ scores: S({ ai: 30 }) }), { plan: 'dominio', frente: 'ia' });
});
await check('todo en el umbral o más → crecimiento (todo bien)', () => {
  const t = PLAN_OK_THRESHOLD;
  assert.deepEqual(recommendPlan({ scores: S({ web: t, seo: t, ai: t, conv: t }) }), { plan: 'crecimiento', frente: 'todo_bien' });
});
await check('empate: manda «que te llamen», luego «que te encuentren», luego IA', () => {
  assert.equal(recommendPlan({ scores: S({ conv: 50, seo: 50, ai: 50 }) }).frente, 'llamar');
  assert.equal(recommendPlan({ scores: S({ seo: 50, ai: 50 }) }).frente, 'encontrar');
});
await check('las reseñas no deciden el plan', () => {
  assert.equal(recommendPlan({ scores: S({ rep: 0 }) }).frente, 'todo_bien');
});
await check('el ejemplo de la página (80/55/30/50) da Dominio, como dice el texto', () => {
  assert.equal(recommendPlan({ scores: { web: 80, seo: 55, ai: 30, conv: 50, rep: 60 } }).plan, 'dominio');
});
await check('nunca recomienda base ni un plan fuera del catálogo público', () => {
  for (const web of [0, 40, 90]) for (const conv of [0, 60, 100]) for (const ai of [0, 70, 100]) {
    const p = recommendPlan({ scores: { web, seo: 60, ai, conv, rep: 50 } }).plan;
    assert.ok(p !== 'base' && PLANES[p], p);
  }
});
await check('recommendService (la usa Marcy) no cambia', () => {
  assert.equal(recommendService({ scores: { web: 0, seo: 0, ai: 0, conv: 0, rep: 50 } }).key, 'conv');
});

// ── Textos del plan: del catálogo, sin cifras ──
await check('planText da nombre y frase en español, nombre en inglés', () => {
  assert.deepEqual(planText('crecimiento', 'es'), { key: 'crecimiento', name: 'Crecimiento', tagline: 'Que te llamen' });
  assert.equal(planText('dominio', 'en').name, 'Lead');
  assert.equal(planText('base', 'es'), null);
});
await check('lib/planes.generado.mjs no lleva ningún número fuera de la cabecera', () => {
  const src = readFileSync(resolve(RAIZ, 'lib/planes.generado.mjs'), 'utf8');
  const body = src.slice(src.indexOf('export const PLANES'));
  assert.ok(!/\d/.test(body), 'hay cifras en los textos de los planes');
});
await check('lib/planes.generado.mjs coincide con el catálogo de Ventas (si está en este equipo)', async () => {
  const { sincronizarPlanes } = await import('./sync-planes.mjs');
  try { sincronizarPlanes({ check: true }); }
  catch (e) { if (/No encuentro el catálogo/.test(e.message)) return; throw e; }
});

// ── Ningún precio interno en lo que toca este encargo ──
// Formas en que se escribiría un precio: «$1,950» o «$1950», o en centavos «195000».
// Un número suelto (un 300 de un tope o de un tamaño) no cuenta: daría falsas alarmas.
function priceRx(n) {
  const usd = [String(n), n.toLocaleString('en-US')].map((x) => x.replace(/,/g, ',?'));
  return new RegExp(`\\$\\s?(${usd.join('|')})(?!\\d)|(^|[^\\d])${n * 100}(?!\\d)`);
}
await check('la vigilancia de precios caza un precio escrito y no un número suelto', () => {
  for (const ok of ['cuesta $1,950', '$1950 al mes', 'cents: 195000,']) assert.ok(priceRx(1950).test(ok), ok);
  for (const no of ['slice(0, 1950)', '$19500', '1950000']) assert.ok(!priceRx(1950).test(no), no);
});
await check('sin precios internos en los archivos del diagnóstico', async () => {
  const files = [
    'lib/diagnostic-plan.mjs', 'lib/diagnostic-funnel.mjs', 'lib/planes.generado.mjs', 'lib/calc-value.mjs',
    'api/diagnostic.mjs', 'src/lib/calc-context.js', 'src/components/growthos/DiagnosticWizard.astro',
    'src/components/w/sections/diagnostico/ResultadoEjemplo.astro', 'src/i18n/w/diagnostico.ts',
  ];
  // Cifras del catálogo privado (si está en este equipo): ninguna puede aparecer como número.
  let precios = [];
  try {
    const { CATALOGO_JSON } = await import('./sync-catalogo.mjs');
    const cat = JSON.parse(readFileSync(CATALOGO_JSON, 'utf8'));
    const walk = (o, k = '') => {
      if (typeof o === 'number' && /precio|mensual|desde|setup|cents|usd/i.test(k) && o >= 100) precios.push(o);
      else if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) walk(v, kk);
    };
    walk({ planes: cat.planes, proyectos: cat.proyectos, anadidosMensuales: cat.anadidosMensuales });
  } catch { /* sin catálogo: solo la regla del $ */ }
  assert.ok(precios.length > 0 || !process.env.MARCYAN_EXIGIR_CATALOGO, 'no encontré el catálogo');
  for (const f of files) {
    const p = resolve(RAIZ, f);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8');
    assert.ok(!/\$\s?\d{3,}/.test(src.replace(/\$\{[^}]*\}/g, '')), `${f}: cifra con $`);
    for (const n of new Set(precios)) {
      assert.ok(!priceRx(n).test(src), `${f}: aparece ${n} como precio, y es un precio interno`);
    }
  }
});

// ── Valor de un cliente desde las calculadoras ──
await check('parseCalcValue acepta el ticket y el valor por cita dentro de su rango', () => {
  assert.deepEqual(parseCalcValue({ type: 'calls', value_cents: 35000 }), { type: 'calls', value_cents: 35000 });
  assert.deepEqual(parseCalcValue({ type: 'appt', value_cents: 6500 }), { type: 'appt', value_cents: 6500 });
});
await check('parseCalcValue rechaza lo raro sin recortar', () => {
  for (const bad of [null, 'x', {}, { type: 'calls' }, { type: 'calls', value_cents: 35000.5 },
    { type: 'calls', value_cents: CALC_RANGES.calls.max * 100 + 1 }, { type: 'appt', value_cents: 100 },
    { type: 'otra', value_cents: 5000 }, { type: 'calls', value_cents: 'abc' },
    // Nombres heredados de Object y un arreglo: no pueden colarse con cualquier cifra.
    JSON.parse('{"type":"constructor","value_cents":-999999999}'), JSON.parse('{"type":"__proto__","value_cents":1}'),
    JSON.parse('{"type":"toString","value_cents":1e300}'), JSON.parse('{"type":["calls"],"value_cents":500000}'),
    { type: 'calls', value_cents: 1e300 }, { type: 'calls', value_cents: [35000] }]) {
    assert.equal(parseCalcValue(bad), null, JSON.stringify(bad));
  }
});
await check('calcValueLine sin guion largo', () => {
  const l = calcValueLine({ type: 'appt', value_cents: 6500 });
  assert.ok(l.includes('$65') && !l.includes('—'), l);
  assert.equal(calcValueLine(null), null);
});

// ── Resumen e informe sin IA con el plan ──
await check('plainSummary y fallbackReport nombran el plan, sin servicio suelto', () => {
  const r = analyzeSite({ html: '<html><body><p>x</p></body></html>', https: false, hasSite: true, city: 'Houston', reviewsBucket: '0' });
  const recommended = recommendService({ scores: r.scores });
  const plan = planText(recommendPlan(r).plan, 'es');
  const sum = plainSummary({ refId: 'DGN-001', scores: r.scores, findings: r.findings, recommended, plan, lang: 'es' });
  assert.ok(sum.includes(`Plan recomendado: ${plan.name}`), sum);
  const rep = fallbackReport({ businessName: 'X', lang: 'es', findings: r.findings, recommended, plan });
  assert.ok(rep.includes(`el plan ${plan.name}`), rep);
  const repEn = fallbackReport({ businessName: 'X', lang: 'en', findings: r.findings, recommended, plan: planText(plan.key, 'en') });
  assert.ok(/the \w+ plan/.test(repEn), repEn);
});

// ── Embudo de Orbit ──
// Catálogo de juguete con la forma del de Ventas (cifras inventadas de 1 a 4, ninguna real):
// pC solo trae «desde», como los proyectos que Orbit deja «por confirmar».
const CAT = {
  planes: {
    base: { nombre: 'B', mensual: 1, enPropuestas: false }, presencia: { nombre: 'P', mensual: 2, enPropuestas: true },
    crecimiento: { nombre: 'C', mensual: 3, enPropuestas: true }, dominio: { nombre: 'D', mensual: 4, enPropuestas: true },
  },
  proyectos: { pA: { nombre: 'A', precio: 1 }, pB: { nombre: 'B', precio: 2 }, pC: { nombre: 'C', desde: 3 } },
  paquetes: [
    { plan: 'presencia', proyecto: 'pA', orden: 3, papel: 'entrada' },
    { plan: 'dominio', proyecto: 'pC', orden: 1, papel: 'ancla' },
    { plan: 'crecimiento', proyecto: 'pB', orden: 2, papel: 'recomendado' },
  ],
};
await check('opciones: más completa primero y la del diagnóstico recomendada', () => {
  const o = optionsFromCatalog(CAT, 'presencia');
  assert.deepEqual(o.options.map((x) => x.plan), ['dominio', 'crecimiento', 'presencia']);
  assert.deepEqual(o.options[0].projects, [{ id: 'pC' }]);
  assert.equal(o.recommended_option, 2);
  assert.equal(optionsFromCatalog(CAT, 'base').recommended_option, 1, 'sin plan válido, el recomendado del catálogo');
  assert.equal(optionsFromCatalog({ planes: {}, paquetes: [] }, 'dominio'), null);
});

function fakes({ existing = [], saveErr = null, advErr = null } = {}) {
  const calls = { advance: [], save: [], notify: [] };
  return {
    calls,
    deps: {
      drafts: true,
      advance: async (...a) => { calls.advance.push(a); if (advErr) throw advErr; return { moved: true }; },
      list: async () => existing,
      catalog: async () => ({ body: CAT }),
      // Como saveProposal: con replaces_prefix devuelve siempre `replaced` (vacío si no había nada).
      save: async (i) => { calls.save.push(i); if (saveErr) throw saveErr; return { created: true, ...(i.replaces_prefix ? { replaced: [] } : {}) }; },
      notify: async (n) => { calls.notify.push(n); },
    },
  };
}

await check('embudo: mueve a «diagnóstico hecho» y deja el borrador sin enviar', async () => {
  const f = fakes();
  const r = await runDiagnosticFunnel({ ref: 'DGN-010', leadRef: 'LEAD-020', plan: 'dominio', clientValueCents: 35000 }, f.deps);
  assert.deepEqual(r, { stage: 'moved', draft: 'created' });
  assert.deepEqual(f.calls.advance[0], ['LEAD-020', 'diagnosed', { by: 'diagnostic' }]);
  const s = f.calls.save[0];
  assert.equal(s.send, false);
  assert.equal(s.created_by, 'diagnostic');
  assert.equal(s.source_ref, 'DGN-010');
  assert.equal(s.recommended_option, 0);
  assert.equal(s.client_value_cents, 35000);
});
await check('embudo: no crea otra propuesta si el contacto ya tiene una abierta', async () => {
  const f = fakes({ existing: [{ status: 'sent' }] });
  const r = await runDiagnosticFunnel({ ref: 'DGN-011', leadRef: 'LEAD-021', plan: 'presencia' }, f.deps);
  assert.equal(r.draft, 'exists');
  assert.equal(f.calls.save.length, 0);
});
// Borradores que ya tiene el contacto (como los devuelve listProposals: created_at y updated_at).
const T0 = new Date('2026-11-21T10:00:00Z');
const T1 = new Date('2026-11-21T11:30:00Z');
const diagDraft = (extra = {}) => ({ status: 'draft', created_by: 'diagnostic', source_ref: 'DGN-020', created_at: T0, updated_at: T0, ...extra });

await check('embudo: pide a Orbit sustituir los borradores del diagnóstico con su folio (replaces_prefix válido)', async () => {
  // Fijado a mano: los folios son DGN-001…DGN-999 y siguen en DGN-1000 (009_growth_os.sql).
  assert.equal(DIAGNOSTIC_PREFIX, 'DGN-');
  for (const ref of ['DGN-001', 'DGN-099', 'DGN-100', 'DGN-999', 'DGN-1000']) {
    const f = fakes();
    await runDiagnosticFunnel({ ref, leadRef: 'LEAD-030', plan: 'dominio' }, f.deps);
    const s = f.calls.save[0];
    assert.equal(s.replaces_prefix, 'DGN-', ref);
    // La misma regla que valida saveProposal: principio del source_ref, 3 letras o más y distinto.
    assert.ok(s.replaces_prefix.length >= 3 && s.source_ref.startsWith(s.replaces_prefix) && s.source_ref !== s.replaces_prefix, ref);
  }
});
await check('embudo: el mismo contacto repite el diagnóstico → el borrador nuevo sustituye al anterior sin tocar', async () => {
  const f = fakes({ existing: [diagDraft()] });
  f.deps.save = async (i) => { f.calls.save.push(i); return { created: true, replaced: ['PRP-007'] }; };
  const r = await runDiagnosticFunnel({ ref: 'DGN-021', leadRef: 'LEAD-030', plan: 'presencia' }, f.deps);
  assert.deepEqual(r, { stage: 'moved', draft: 'replaced' });
  assert.equal(f.calls.save.length, 1);
});
await check('embudo: un borrador del diagnóstico que el dueño ya corrigió es suyo → no se crea otro', async () => {
  const f = fakes({ existing: [diagDraft({ updated_at: T1 })] });
  const r = await runDiagnosticFunnel({ ref: 'DGN-022', leadRef: 'LEAD-031', plan: 'dominio' }, f.deps);
  assert.equal(r.draft, 'exists');
  assert.equal(f.calls.save.length, 0);
});
await check('embudo: un borrador de Orbit o de Marcy, o una enviada, bloquean; las cerradas no', async () => {
  for (const p of [
    { status: 'draft', created_by: 'orbit', source_ref: null, created_at: T0, updated_at: T0 },
    { status: 'draft', created_by: 'marcy', source_ref: 'chat:abc:1', created_at: T0, updated_at: T0 },
    diagDraft({ status: 'sent' }),
  ]) {
    const f = fakes({ existing: [p] });
    const r = await runDiagnosticFunnel({ ref: 'DGN-023', leadRef: 'LEAD-032', plan: 'dominio' }, f.deps);
    assert.equal(r.draft, 'exists', JSON.stringify(p));
    assert.equal(f.calls.save.length, 0);
  }
  for (const status of ['accepted', 'rejected', 'expired']) {
    const f = fakes({ existing: [diagDraft({ status })] });
    const r = await runDiagnosticFunnel({ ref: 'DGN-024', leadRef: 'LEAD-033', plan: 'dominio' }, f.deps);
    assert.equal(r.draft, 'created', status);
  }
});
await check('embudo: un borrador sustituible junto a otra abierta del dueño → no se crea nada (en cualquier orden)', async () => {
  const otra = { status: 'sent', created_by: 'orbit', source_ref: null, created_at: T1, updated_at: T1 };
  for (const existing of [[diagDraft(), otra], [otra, diagDraft()]]) {
    const f = fakes({ existing });
    const r = await runDiagnosticFunnel({ ref: 'DGN-026', leadRef: 'LEAD-035', plan: 'dominio' }, f.deps);
    assert.equal(r.draft, 'exists');
    assert.equal(f.calls.save.length, 0);
  }
});
await check('embudo: pide a Orbit la regla dentro de su transacción (skip_if_open) y respeta su «ya hay otra abierta»', async () => {
  // Carrera: el atajo no vio nada, pero dentro de la transacción Orbit encontró otra abierta.
  const f = fakes();
  f.deps.save = async (i) => { f.calls.save.push(i); return { created: false, open: true, proposal: { status: 'sent' } }; };
  const r = await runDiagnosticFunnel({ ref: 'DGN-027', leadRef: 'LEAD-036', plan: 'dominio' }, f.deps);
  assert.equal(f.calls.save[0].skip_if_open, true);
  assert.deepEqual(r, { stage: 'moved', draft: 'exists' });
  assert.equal(f.calls.notify.length, 0, 'no es un fallo: no se avisa');
});
await check('isReplaceableDraft: solo borrador del diagnóstico, con folio DGN y sin tocar', () => {
  assert.equal(isReplaceableDraft(diagDraft()), true);
  assert.equal(isReplaceableDraft(diagDraft({ created_at: '2026-11-21T10:00:00.000Z', updated_at: '2026-11-21T10:00:00Z' })), true, 'fechas en texto');
  assert.equal(isReplaceableDraft(diagDraft({ updated_at: T1 })), false);
  assert.equal(isReplaceableDraft(diagDraft({ source_ref: 'chat:x' })), false);
  assert.equal(isReplaceableDraft(diagDraft({ created_by: 'marcy' })), false);
  assert.equal(isReplaceableDraft(diagDraft({ created_at: null, updated_at: null })), false, 'sin fechas no se da por intacto');
  assert.equal(isReplaceableDraft(null), false);
});
await check('contrato con Orbit: saveProposal acepta lo que manda el embudo (sin precios ni cifras propias)', async () => {
  const f = fakes();
  await runDiagnosticFunnel({ ref: 'DGN-025', leadRef: 'LEAD-034', plan: 'crecimiento', clientValueCents: 120000 }, f.deps);
  const input = f.calls.save[0];
  for (const o of input.options) {
    assert.deepEqual(Object.keys(o).sort(), ['plan', 'projects']);
    for (const p of o.projects) assert.deepEqual(Object.keys(p), ['id'], 'solo el proyecto: el precio lo pone Orbit o queda «por confirmar»');
  }
  // saveProposal real con una base de juguete: deja pasar la validación, el catálogo y los precios
  // de cada opción (priceOption) y se corta al ir a buscar el contacto. Si llega ahí, lo aceptó.
  const SENTINEL = new Error('opciones aceptadas');
  const seen = [];
  const fakeDb = {
    query: async (t) => {
      seen.push(t.trim().split(/\s+/).slice(0, 2).join(' '));
      if (/^(BEGIN|ROLLBACK)/.test(t)) return { rows: [], rowCount: 0 };
      if (/FROM proposals WHERE created_by/.test(t)) return { rows: [], rowCount: 0 };
      if (/FROM sales_catalog/.test(t)) return { rows: [{ version: 'juguete', body: CAT }], rowCount: 1 };
      throw SENTINEL;
    },
    release() {},
  };
  await assert.rejects(saveProposal(input, { connect: async () => fakeDb }), (e) => e === SENTINEL);
  assert.ok(seen.some((s) => /^SELECT version/.test(s)), 'llegó a leer el catálogo');
  // Y opción a opción: el proyecto con solo «desde» queda «por confirmar», sin cifra nuestra.
  const priced = input.options.map((o, i) => priceOption(CAT, o, { author: 'diagnostic', index: i }));
  assert.deepEqual(priced.map((p) => !!p.pending), [true, false, false]);
  // Un paquete que apunte a un proyecto que no existe lo rechaza Orbit: esta prueba lo vería.
  const roto = { ...CAT, paquetes: [{ plan: 'dominio', proyecto: 'noExiste', orden: 1 }] };
  assert.throws(() => priceOption(roto, optionsFromCatalog(roto, 'dominio').options[0], { author: 'diagnostic' }));
});
await check('contrato con el catálogo real (si está en este equipo): Orbit acepta los paquetes del diagnóstico', async () => {
  let cat = null;
  try {
    const { CATALOGO_JSON } = await import('./sync-catalogo.mjs');
    cat = JSON.parse(readFileSync(CATALOGO_JSON, 'utf8'));
  } catch { /* sin catálogo privado en este equipo */ }
  assert.ok(cat || !process.env.MARCYAN_EXIGIR_CATALOGO, 'no encontré el catálogo');
  if (!cat) return;
  for (const plan of ['presencia', 'crecimiento', 'dominio', null]) {
    const built = optionsFromCatalog(cat, plan);
    assert.ok(built && built.options.length, `sin paquetes para ${plan}`);
    // Sin mostrar cifras: solo si Orbit lo acepta o no.
    built.options.forEach((o, i) => assert.doesNotThrow(() => priceOption(cat, o, { author: 'diagnostic', index: i }), `${plan}: opción ${i} (${o.plan})`));
  }
});

await check('embudo: con el tope de correo saltado no deja borrador', async () => {
  const f = fakes();
  const r = await runDiagnosticFunnel({ ref: 'DGN-012', leadRef: 'LEAD-022', plan: 'presencia', allowDraft: false }, f.deps);
  assert.deepEqual(r, { stage: 'moved', draft: 'skipped' });
  assert.equal(f.calls.save.length, 0);
});
await check('embudo: un fallo no lanza, avisa sin cifras y sigue con lo demás', async () => {
  const err = Object.assign(new Error('Por debajo del mínimo ($9,999)'), { status: 400 });
  const f = fakes({ advErr: Object.assign(new Error('caída'), { status: 503 }), saveErr: err });
  const r = await runDiagnosticFunnel({ ref: 'DGN-013', leadRef: 'LEAD-023', plan: 'dominio' }, f.deps);
  assert.deepEqual(r, { stage: 'error', draft: 'error' });
  assert.equal(f.calls.notify.length, 2);
  assert.equal(f.calls.notify[0].key, 'diag-funnel:503', 'el 503 afecta a todos: un aviso al día');
  assert.equal(f.calls.notify[1].key, 'diag-funnel:LEAD-023', 'el resto, uno por contacto');
  for (const n of f.calls.notify) assert.ok(!/\$|\d{3,}/.test(n.title + (n.body || '').replace(/LEAD-\d+|DGN-\d+|029/g, '')), n.body);
});
await check('embudo: contacto borrado en Orbit (404) = sin aviso y sin borrador', async () => {
  const f = fakes({ advErr: Object.assign(new Error('Contacto no encontrado.'), { status: 404 }) });
  const r = await runDiagnosticFunnel({ ref: 'DGN-015', leadRef: 'LEAD-025', plan: 'dominio' }, f.deps);
  assert.deepEqual(r, { stage: 'error', draft: 'off' });
  assert.equal(f.calls.notify.length, 0);
  assert.equal(f.calls.save.length, 0);
});
await check('reclamo repetido: solo repara la etapa, nunca deja borrador', () => {
  const src = readFileSync(resolve(RAIZ, 'api/diagnostic.mjs'), 'utf8');
  assert.match(src, /if \(row\.lead_ref\) \{\s*await runDiagnosticFunnel\(funnelInput\(row\.lead_ref, false\)\)/);
});
await check('embudo: sin folio o sin contacto no hace nada', async () => {
  const f = fakes();
  assert.deepEqual(await runDiagnosticFunnel({ ref: '', leadRef: 'LEAD-1', plan: 'dominio' }, f.deps), { stage: 'skipped', draft: 'off' });
  assert.equal(f.calls.advance.length, 0);
});
await check('embudo: el borrador sigue apagado hasta el OK del dueño', async () => {
  assert.equal(DIAGNOSTIC_DRAFTS, false);
  const f = fakes();
  const r = await runDiagnosticFunnel({ ref: 'DGN-014', leadRef: 'LEAD-024', plan: 'dominio' }, { ...f.deps, drafts: undefined });
  assert.deepEqual(r, { stage: 'moved', draft: 'off' });
  assert.equal(f.calls.save.length, 0);
});

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) del plan del diagnóstico fallaron:\n - ` + fails.join('\n - '));
  process.exit(1);
}
console.log(`✓ ${pass} pruebas del plan del diagnóstico pasaron.`);
