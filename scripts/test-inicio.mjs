// ─────────────────────────────────────────────────────────────
// Pruebas de Inicio (A1): la lógica pura de lib/inicio.js.
//   node scripts/test-inicio.mjs   (o npm run test:inicio)
// Cubre los hallazgos de la auditoría que eran de cálculo: eje Y con
// etiquetas repetidas (SH-13), estado vacío que nunca salía (OP-22),
// embudo deformado y "en pipeline" con archivados (OP-19, SH-14),
// comparaciones reales o ninguna (OP-02, CRM-15) y montos en centavos.
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';

let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; console.log('  ok  ', name); }
  catch (e) { fail++; console.log('  FAIL', name, '\n       ', e.message); }
}

const m = await import('../src/components/dashboard/lib/inicio.js');

console.log('\nInicio (lib/inicio.js)');

await t('eje Y: enteros únicos, con 0 y cima real (SH-13)', () => {
  assert.deepEqual(m.axisScale(1), { top: 1, ticks: [1, 0] });
  assert.deepEqual(m.axisScale(2), { top: 2, ticks: [2, 1, 0] });
  assert.deepEqual(m.axisScale(8), { top: 8, ticks: [8, 6, 4, 2, 0] });
  assert.deepEqual(m.axisScale(9), { top: 9, ticks: [9, 6, 3, 0] });
  assert.deepEqual(m.axisScale(10), { top: 12, ticks: [12, 9, 6, 3, 0] });
  assert.deepEqual(m.axisScale(0), { top: 0, ticks: [] });
  for (let max = 1; max <= 500; max++) {
    const { top, ticks } = m.axisScale(max);
    assert.ok(top >= max, `cima ${top} < máx ${max}`);
    assert.equal(new Set(ticks).size, ticks.length, `ticks repetidos para ${max}`);
    assert.equal(ticks[ticks.length - 1], 0);
    assert.ok(ticks.every(Number.isInteger));
    assert.ok(ticks.length <= 5, `demasiados ticks para ${max}`);
  }
});

await t('actividad vacía = seis meses en cero (OP-22)', () => {
  const zeros = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map((month) => ({ month, leads: 0, briefs: 0, total: 0 }));
  assert.equal(m.hasActivity(zeros), false);
  assert.equal(m.hasActivity([]), false);
  assert.equal(m.hasActivity(null), false);
  zeros[3].total = 1;
  assert.equal(m.hasActivity(zeros), true);
});

await t('leads por estado: proporciones reales y archivados aparte (OP-19, SH-14)', () => {
  const s = m.leadStates({ new: 2, contacted: 8, converted: 4, archived: 20, total: 34, pipeline: 10 });
  assert.deepEqual(s.rows.map((r) => r.pct), [25, 100, 50]);   // Contactados > Nuevos se ve así
  assert.equal(s.pipeline, 10);
  assert.equal(s.archived, 20);
  assert.ok(!s.rows.some((r) => r.key === 'archived'), 'Archivados no es una etapa');
  assert.deepEqual(s.rows.map((r) => r.estado), ['nuevo', 'contactado', 'convertido']);
});

await t('leads por estado: pipeline calculado si el servidor no lo manda; todo en cero sin dividir por 0', () => {
  const s = m.leadStates({ new: '3', contacted: '1', converted: 0, archived: 2 });
  assert.equal(s.pipeline, 4);
  const z = m.leadStates({ new: 0, contacted: 0, converted: 0, archived: 0 });
  assert.deepEqual(z.rows.map((r) => r.pct), [0, 0, 0]);
  assert.equal(m.leadStates(null), null);
});

await t('comparación real o ninguna (OP-02, CRM-15)', () => {
  assert.deepEqual(m.delta(5, 2), { dir: 'up', diff: 3, text: '+3' });
  assert.deepEqual(m.delta(1, 4), { dir: 'down', diff: -3, text: '−3' });
  assert.deepEqual(m.delta(3, 3), { dir: 'same', diff: 0, text: 'igual' });
  assert.equal(m.delta(5, null), null);       // sin dato del mes anterior → sin comparación
  assert.equal(m.delta(null, 4), null);
  assert.deepEqual(m.delta('42000', '137000', m.money), { dir: 'down', diff: -95000, text: '−$950' });
  assert.equal(m.delta(1284050, 1460000, m.money).text, '−$1,759.50');
});

await t('centavos BIGINT (string) a dinero', () => {
  assert.equal(m.money('180000'), '$1,800');
  assert.equal(m.money(1284050), '$12,840.50');
  assert.equal(m.money(24339), '$243.39');
  assert.equal(m.money(0), '$0');
  assert.equal(m.money(null), '');
  assert.equal(m.money(-95000), '−$950');
});

await t('cifra del KPI de dinero: formas de la más precisa a la más corta (A1-01)', () => {
  assert.deepEqual(m.moneyFits(42000), ['$420']);
  assert.deepEqual(m.moneyFits('180050'), ['$1,801', '$1.8k', '$2k']);   // nunca centavos
  assert.deepEqual(m.moneyFits(1284050), ['$12,841', '$12.8k', '$13k']);
  assert.deepEqual(m.moneyFits(1000000), ['$10,000', '$10k']);          // sin repetir formas
  assert.deepEqual(m.moneyFits(9996000), ['$99,960', '$100k']);         // no "$100.0k"
  assert.deepEqual(m.moneyFits(12840500), ['$128,405', '$128k']);
  assert.deepEqual(m.moneyFits(99960000), ['$999,600', '$1M']);         // no "$1000k"
  assert.deepEqual(m.moneyFits(128405000), ['$1,284,050', '$1.3M', '$1M']);
  assert.deepEqual(m.moneyFits(99960), ['$1,000', '$1k']);
  assert.deepEqual(m.moneyFits(0), ['$0']);
  assert.deepEqual(m.moneyFits(-180050), ['−$1,801', '−$1.8k', '−$2k']);
  assert.deepEqual(m.moneyFits(null), []);
  // La forma más corta nunca pasa de 5 caracteres (lo que cabe en un móvil de 375).
  for (const c of [1, 99, 42000, 180050, 999949, 1284050, 9996000, 12840500, 99960000, 128405000, 9990000000]) {
    const f = m.moneyFits(c);
    assert.ok(f[f.length - 1].length <= 5, `${c} → ${f}`);
  }
});

await t('etiqueta accesible del gráfico con el desglose por mes (A1-03)', () => {
  const s = m.activityLabel([
    { month: '2026-05', leads: 2, briefs: 1, total: 3 },
    { month: '2026-06', leads: 0, briefs: 0, total: 0 },
    { month: '2026-07', leads: '1', briefs: 0, total: 1 },
  ]);
  assert.equal(s, 'Actividad por mes. may: 2 leads y 1 brief; jun: sin actividad; jul: 1 lead y 0 briefs');
  assert.equal(m.activityLabel(null), 'Actividad por mes');
});

await t('num: null es "sin dato", no cero', () => {
  assert.equal(m.num(null), null);
  assert.equal(m.num(undefined), null);
  assert.equal(m.num(''), null);
  assert.equal(m.num('7'), 7);
  assert.equal(m.num(0), 0);
  assert.equal(m.num('abc'), null);
});

await t('mes corto desde la clave YYYY-MM', () => {
  assert.equal(m.monthShort('2026-09'), 'sep');
  assert.equal(m.monthShort('2026-01'), 'ene');
  assert.equal(m.monthShort(''), '');
  assert.equal(m.monthShort(undefined), '');
});

await t('actividad acumulada', () => {
  assert.deepEqual(m.cumulative([{ total: 2 }, { total: 0 }, { total: '3' }]), [2, 2, 5]);
  assert.deepEqual(m.cumulative(null), []);
});

console.log(`\n${pass} ok, ${fail} fallos\n`);
if (fail) process.exit(1);
