// ════════════════════════════════════════════════════════════════
//  scripts/test-finance-books.mjs  ·  npm run test:finance-books
//  Libros de Finanzas listos para impuestos (fase 1, migración 025), SIN base
//  de datos y SIN red:
//    · lib/finance-tax.mjs   trimestral calculado a mano, líneas del Schedule C,
//                            comidas al 50 %, duplicados, recibos, 1099, plazos.
//    · lib/finance-rules.mjs fechas reales de cargo de cada suscripción.
//    · lib/finance-books.mjs con una base FALSA: cargos idempotentes que no
//                            escriben en meses cerrados ni recrean lo borrado,
//                            checklist de cierre y bloqueo de meses cerrados.
//    · api/cron/finanzas y api/admin/finance/books: avisos y CSV para el contador.
//  Comprueba el SQL ENVIADO y la lógica, no un Postgres real.
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import { mock } from 'node:test';

let pass = 0;
const fails = [];
async function check(name, fn) {
  try { await fn(); pass++; } catch (e) { fails.push(name + ' → ' + (e && e.message)); }
}

// ── Base falsa (mismo patrón que test-finance) ───────────────────
const log = [];
let responder = () => ({ rows: [] });
const norm = (t) => String(t).replace(/\s+/g, ' ').trim();
function run(text, params) {
  const entry = { text: norm(text), params: params || [] };
  log.push(entry);
  const out = responder(entry.text, entry.params) || { rows: [] };
  return Promise.resolve({ rows: out.rows || [], rowCount: out.rowCount ?? (out.rows || []).length });
}
function sqlTag(strings, ...values) {
  let text = strings[0];
  values.forEach((v, i) => { text += `$${i + 1}` + strings[i + 1]; });
  return run(text, values);
}
sqlTag.query = (text, params) => run(text, params);
const db = { connect: async () => ({ query: (t, p) => run(t, p), release: () => {} }) };
mock.module('@vercel/postgres', { namedExports: { sql: sqlTag, db } });
const notices = [];
mock.module('../lib/notifications.mjs', { namedExports: { notifySystem: async (n) => { notices.push(n); return { id: '1' }; } } });
mock.module('../lib/auth.mjs', {
  namedExports: {
    requireAdmin: async () => ({ email: 'prueba@marcyan.test' }),
    safeEqual: (a, b) => a === b,
    getAllowedEmails: () => ['prueba@marcyan.test'],
    getTeamAccess: async () => [{ email: 'prueba@marcyan.test', last_access: null }],
  },
});

// Almacén de archivos falso: get() devuelve los «bytes» que diga cada prueba.
const blobs = { deleted: [], type: null };
mock.module('@vercel/blob', {
  namedExports: {
    get: async () => ({ statusCode: 200, stream: { cancel: async () => {} }, blob: { contentType: 'image/png', size: 10 } }),
    del: async (p) => { blobs.deleted.push(p); },
  },
});
mock.module('file-type', { namedExports: { fileTypeFromStream: async () => blobs.type } });

const tax = await import('../lib/finance-tax.mjs');
const rules = await import('../lib/finance-rules.mjs');
const books = await import('../lib/finance-books.mjs');
const exp = await import('../lib/expenses.mjs');
function reset(fn) { log.length = 0; notices.length = 0; responder = fn || (() => ({ rows: [] })); }
const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

// ════════════════════════════════════════════════════════════════
//  Impuestos (puro)
// ════════════════════════════════════════════════════════════════
await check('trimestral 2026: cuenta hecha a mano (60.000 en 6 meses, soltero)', () => {
  const e = tax.quarterlyEstimate({ year: 2026, ytdNet: 60000, monthsElapsed: 6, filing: 'single', paid: 0, today: '2026-07-01' });
  assert.equal(e.ok, true);
  near(e.annualNet, 120000);
  near(e.seTax, 16955.46);                 // 120.000 × 0,9235 × 15,3 %
  near(e.incomeTax, 15704.90);             // (120.000 − 8.477,73 − 16.100) por tramos
  near(e.totalAnnual, 32660.36);
  assert.equal(e.nextDue, '2026-09-15');
  assert.equal(e.paymentsLeft, 2);
  near(e.perPayment, 16330.18);
  assert.ok(e.assumptions.some((a) => /Schedule C/.test(a)));
  assert.ok(e.assumptions.some((a) => /safe harbor/.test(a)));
});
await check('trimestral: lo ya pagado se resta; el tope de Seguridad Social se aplica', () => {
  const a = tax.quarterlyEstimate({ year: 2026, ytdNet: 60000, monthsElapsed: 6, paid: 10000, today: '2026-07-01' });
  near(a.remaining, a.totalAnnual - 10000);
  const big = tax.quarterlyEstimate({ year: 2026, ytdNet: 500000, monthsElapsed: 12, today: '2026-12-31' });
  near(big.seTax, 184500 * 0.124 + 500000 * 0.9235 * 0.029);
  const loss = tax.quarterlyEstimate({ year: 2026, ytdNet: -5000, monthsElapsed: 3, today: '2026-04-01' });
  assert.equal(loss.totalAnnual, 0);
});
await check('trimestral: sin cifras verificadas del año no se calcula (no se inventan)', () => {
  const e = tax.quarterlyEstimate({ year: 2025, ytdNet: 1000, monthsElapsed: 1 });
  assert.equal(e.ok, false);
  assert.match(e.error, /contador/);
  assert.equal(tax.quarterlyEstimate({ year: 2031, ytdNet: 1, monthsElapsed: 1 }).ok, false);
});
await check('Schedule C: cada categoría a su línea; comidas al 50 % y uso de negocio', () => {
  assert.equal(tax.taxLineOf({ category: 'marketing' }), '8');
  assert.equal(tax.taxLineOf({ category: 'contratistas' }), '11');
  assert.equal(tax.taxLineOf({ category: 'hosting' }), '27b');
  assert.equal(tax.taxLineOf({ category: 'inventada' }), '27b');
  assert.equal(tax.taxLineOf({ category: 'marketing', tax_line: '27b' }), '27b');
  assert.equal(tax.deductibleCents({ category: 'comidas', amount_cents: 10000 }), 5000);
  assert.equal(tax.deductibleCents({ category: 'telefono', amount_cents: 10000, business_pct: 60 }), 6000);
  assert.equal(tax.deductibleCents({ category: 'comidas', amount_cents: 10000, business_pct: 50 }), 2500);
  assert.equal(tax.TAX_DISCLAIMER, 'Para revisión de tu contador, no es consejo fiscal.');
});
await check('1099: umbral 600 en 2025 y 2.000 en 2026; plazos de 2026 en orden', () => {
  assert.equal(tax.nec1099Threshold(2025), 600);
  assert.equal(tax.nec1099Threshold(2026), 2000);
  assert.equal(tax.nec1099Threshold(2040), null);
  const cal = tax.taxCalendar(2026);
  assert.deepEqual(cal.filter((c) => c.kind === 'estimated').map((c) => c.date), ['2026-04-15', '2026-06-15', '2026-09-15', '2027-01-15']);
  assert.deepEqual(cal.map((c) => c.date), [...cal.map((c) => c.date)].sort());
});
await check('millaje 2026: 72,5 ¢ hasta junio y 76 ¢ desde julio', () => {
  const c = tax.mileageDeductionCents([{ trip_date: '2026-03-02', miles: 10 }, { trip_date: '2026-08-02', miles: 10 }], 2026);
  assert.equal(c, 725 + 760);
});
await check('duplicados: mismo importe y proveedor en 5 días; los cargos de suscripción no', () => {
  const pairs = tax.findDuplicates([
    { id: 1, vendor: 'Figma', amount_cents: 1500, spent_at: '2026-10-01' },
    { id: 2, vendor: ' figma ', amount_cents: 1500, spent_at: '2026-10-04' },
    { id: 3, vendor: 'Figma', amount_cents: 1500, spent_at: '2026-10-20' },
    { id: 4, vendor: 'Vercel', amount_cents: 2000, spent_at: '2026-10-01', subscription_id: 9 },
    { id: 5, vendor: 'Vercel', amount_cents: 2000, spent_at: '2026-10-02', subscription_id: 9 },
  ]);
  assert.deepEqual(pairs, [['1', '2']]);
});
await check('doble conteo: gasto a mano que repite el cargo de una suscripción', () => {
  const pairs = tax.findSubscriptionOverlaps([
    { id: 10, label: 'Vercel', vendor: 'Vercel', amount_cents: 2000, spent_at: '2026-10-05', subscription_id: 3 },
    { id: 11, label: 'Pago Vercel Pro', vendor: null, amount_cents: 2000, spent_at: '2026-10-07' },
    { id: 12, label: 'Vercel', amount_cents: 2500, spent_at: '2026-10-05' },
    { id: 13, label: 'Vercel', amount_cents: 2000, spent_at: '2026-10-25' },
  ]);
  assert.deepEqual(pairs, [['11', '10']]);
});
await check('recibos: desde 75 USD, salvo «no hace falta» y cargos de suscripción', () => {
  const ids = tax.missingReceipts([
    { id: 1, amount_cents: 7500 },
    { id: 2, amount_cents: 7499 },
    { id: 3, amount_cents: 9000, receipt_status: 'attached' },
    { id: 4, amount_cents: 9000, receipt_status: 'not_required' },
    { id: 5, amount_cents: 9000, subscription_id: 2 },
  ]).map((e) => e.id);
  assert.deepEqual(ids, [1]);
});

// ════════════════════════════════════════════════════════════════
//  Fechas de cargo de una suscripción (puro)
// ════════════════════════════════════════════════════════════════
await check('cargos: mensual desde el alta, día 31 sin deriva, hasta hoy o la baja', () => {
  const sub = { started_at: '2026-01-31', next_charge_at: '2026-01-31', cycle: 'monthly' };
  assert.deepEqual(rules.subscriptionChargeDates(sub, '2026-04-30'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  assert.deepEqual(rules.subscriptionChargeDates({ ...sub, ended_at: '2026-03-15' }, '2026-12-31'), ['2026-01-31', '2026-02-28']);
});
await check('cargos: el ancla puede ir por delante del alta; anual cada 12 meses', () => {
  const sub = { started_at: '2026-02-10', next_charge_at: '2026-11-05', cycle: 'monthly' };
  assert.deepEqual(rules.subscriptionChargeDates(sub, '2026-05-01'), ['2026-03-05', '2026-04-05']);
  const yearly = { started_at: '2024-03-01', next_charge_at: '2027-03-01', cycle: 'yearly' };
  assert.deepEqual(rules.subscriptionChargeDates(yearly, '2026-11-14'), ['2024-03-01', '2025-03-01', '2026-03-01']);
  assert.deepEqual(rules.subscriptionChargeDates({ started_at: '2026-12-01', next_charge_at: '2026-12-01' }, '2026-11-14'), []);
});

// ════════════════════════════════════════════════════════════════
//  Libros con base falsa
// ════════════════════════════════════════════════════════════════
await check('cargos de suscripción: idempotentes, sin meses cerrados, sin recrear lo borrado, sin pausadas', async () => {
  reset((t, p) => {
    if (/FROM subscriptions/.test(t)) return { rows: [{ id: '7', name: 'Figma', category: 'software', amount_cents: '1500', cycle: 'monthly', next_charge_at: '2026-09-03', started_at: '2026-08-03', ended_at: null }] };
    if (/FROM finance_months WHERE status = 'closed'/.test(t)) return { rows: [{ m: '2026-08' }] };
    if (/INSERT INTO company_expenses/.test(t)) return { rows: p[3] === '2026-10-03' ? [] : [{ id: '1' }] }; // octubre ya existía
    return { rows: [] };
  });
  const out = await books.generateSubscriptionCharges({ today: '2026-11-14' });
  assert.deepEqual(out, { created: 2, skippedClosed: 1 });          // sept y nov; agosto cerrado
  const subQ = log.find((e) => /FROM subscriptions/.test(e.text)).text;
  assert.match(subQ, /WHERE active = true OR ended_at IS NOT NULL/);
  const ins = log.filter((e) => /INSERT INTO company_expenses/.test(e.text));
  assert.deepEqual(ins.map((e) => e.params[5]), ['sub:7:2026-09-03', 'sub:7:2026-10-03', 'sub:7:2026-11-03']);
  assert.match(ins[0].text, /NOT EXISTS \(SELECT 1 FROM finance_suppressed_refs WHERE source_ref = \$6::text\)/);
  assert.match(ins[0].text, /ON CONFLICT \(source_ref\) WHERE source_ref IS NOT NULL DO NOTHING/);
});
await check('cierre de mes: lo pendiente bloquea; duplicados y recibos solo avisan', async () => {
  const base = (over = {}) => (t) => {
    if (/FROM company_expenses WHERE spent_at >= \$1::date .* review_status = 'ok'/.test(t)) {
      return { rows: [
        { id: '1', label: 'Dominio', vendor: 'GoDaddy', category: 'hosting', amount_cents: '9000', spent_at: '2026-10-02', receipt_status: 'none' },
        { id: '2', label: 'Dominio', vendor: 'GoDaddy', category: 'hosting', amount_cents: '9000', spent_at: '2026-10-03', receipt_status: 'attached' },
      ] };
    }
    if (/FROM company_expenses WHERE spent_at .* review_status = 'pending'/.test(t)) return { rows: [{ n: over.pending ?? 0 }] };
    if (/FROM income_entries/.test(t)) return { rows: [{ n: 0 }] };
    if (/FROM invoices i WHERE i.status = 'void'/.test(t)) return { rows: over.voidPaid || [] };
    if (/account_id IS NULL/.test(t)) return { rows: [{ n: 0 }] };
    if (/FROM finance_months WHERE month = \$1/.test(t)) return { rows: [] };
    return { rows: [] };
  };
  reset(base());
  const ok = await books.monthChecklist('2026-10');
  assert.equal(ok.can_close, true);
  assert.equal(ok.items.find((i) => i.key === 'duplicates').count, 1);
  assert.deepEqual(ok.items.find((i) => i.key === 'receipts').ids, ['1']);
  reset(base({ pending: 3 }));
  assert.equal((await books.monthChecklist('2026-10')).can_close, false);
  reset(base({ voidPaid: [{ id: '9', number: 'INV-009' }] }));
  const v = await books.monthChecklist('2026-10');
  assert.equal(v.can_close, false);
  assert.deepEqual(v.items.find((i) => i.key === 'void_paid').ids, ['INV-009']);
  reset(base({ pending: 1 }));
  await assert.rejects(books.closeMonth('2026-10', 'yo'), (e) => e.status === 409);
  await assert.rejects(books.monthChecklist('octubre'), /Mes no válido/);
});
await check('mes cerrado: no se crea, edita ni borra un gasto en él (409 con el motivo)', async () => {
  const closed = (t) => {
    if (/FROM finance_months WHERE month = \$1/.test(t)) return { rows: [{ status: 'closed' }] };
    if (/FROM company_expenses WHERE id = \$1 LIMIT 1/.test(t)) return { rows: [{ id: '4', spent_at: '2026-09-10', source_ref: null }] };
    if (/SELECT spent_at, source_ref FROM company_expenses/.test(t)) return { rows: [{ spent_at: '2026-09-10', source_ref: null }] };
    return { rows: [{ id: '4' }] };
  };
  reset(closed);
  await assert.rejects(exp.createExpense({ label: 'Dominio', amount_cents: 1000, spent_at: '2026-09-12' }), (e) => e.status === 409 && /cerrado/.test(e.message));
  await assert.rejects(exp.updateExpense('4', { label: 'Otro' }), (e) => e.status === 409);
  await assert.rejects(exp.deleteExpense('4'), (e) => e.status === 409);
  assert.ok(!log.some((e) => /^(INSERT INTO company_expenses|UPDATE company_expenses|DELETE FROM company_expenses)/.test(e.text)));
  assert.equal(rules.isBusinessError(new books.BooksError('x', 409)), true);
});
await check('borrar un cargo automático deja su clave para que el cron no lo recree', async () => {
  reset((t) => {
    if (/SELECT spent_at, source_ref FROM company_expenses/.test(t)) return { rows: [{ spent_at: '2026-10-03', source_ref: 'sub:7:2026-10-03' }] };
    if (/DELETE FROM company_expenses/.test(t)) return { rows: [{ id: '4' }] };
    return { rows: [] };
  });
  assert.equal(await exp.deleteExpense('4', 'yo'), true);
  const sup = log.find((e) => /INSERT INTO finance_suppressed_refs/.test(e.text));
  assert.deepEqual(sup.params, ['sub:7:2026-10-03', 'yo']);
  assert.ok(log.indexOf(sup) < log.findIndex((e) => /DELETE FROM company_expenses/.test(e.text)));
});
await check('suscripción: pausar pone la baja hoy; reactivar abre un alta nueva sin borrar el pasado', async () => {
  const { houstonDate } = await import('../lib/dates.mjs');
  const today = houstonDate();
  let state = { id: '7', name: 'Figma', cycle: 'monthly', active: true, started_at: '2026-01-05', ended_at: null, next_charge_at: '2026-01-05' };
  reset((t, p) => {
    if (/^UPDATE subscriptions/.test(t)) {
      const cols = t.slice(t.indexOf('SET') + 4, t.indexOf(' WHERE')).split(', ').map((s) => s.split(' = ')[0]);
      cols.forEach((c, i) => { state = { ...state, [c]: p[i] }; });
      return { rows: [state] };
    }
    if (/FROM subscriptions WHERE id = \$1/.test(t)) return { rows: [state] };
    return { rows: [] };
  });
  await exp.updateSubscription('7', { active: false });
  assert.equal(state.ended_at, today);
  assert.ok(!log.some((e) => /DELETE FROM company_expenses/.test(e.text)), 'pausar no borra cargos');
  log.length = 0;
  await exp.updateSubscription('7', { active: true });
  assert.equal(state.started_at, today);
  assert.equal(state.ended_at, null);
  assert.ok(!log.some((e) => /DELETE FROM company_expenses/.test(e.text)), 'reactivar no borra los cargos pasados');
  log.length = 0;
  await exp.updateSubscription('7', { ended_at: '2026-12-01' });
  const del = log.find((e) => /DELETE FROM company_expenses/.test(e.text));
  assert.ok(del, 'adelantar la baja quita los cargos posteriores en meses abiertos');
  assert.match(del.text, /m\.status = 'closed'/);
});
await check('resumen Schedule C: bruto, devoluciones, comisiones a la línea 10 y neto', async () => {
  reset((t) => {
    if (/AS gross/.test(t)) return { rows: [{ gross: '1000000', fees: '3000' }] };
    if (/FROM refunds/.test(t)) return { rows: [{ c: '50000' }] };
    if (/FROM income_entries/.test(t)) return { rows: [{ category: 'intereses', c: '1200', fees: '0' }] };
    if (/FROM company_expenses/.test(t)) return { rows: [
      { id: '1', category: 'marketing', amount_cents: '20000', business_pct: 100 },
      { id: '2', category: 'comidas', amount_cents: '10000', business_pct: 100 },
      { id: '3', category: 'hosting', amount_cents: '5000', business_pct: 100 },
    ] };
    return { rows: [] };
  });
  const s = await books.scheduleCSummary(2026);
  assert.equal(s.line1_gross, 1000000);
  assert.equal(s.line2_returns, 50000);
  assert.equal(s.line6_other, 0);                    // los intereses no van al Schedule C
  assert.equal(s.interest_schedule_b, 1200);          // van al Schedule B
  assert.ok(s.notes.some((n) => /Schedule B/.test(n)));
  assert.deepEqual(s.expenses_by_line, { 8: 20000, '24b': 5000, '27b': 5000, 10: 3000 });
  assert.equal(s.net_profit, 1000000 - 50000 - 33000);
  assert.equal(s.disclaimer, tax.TAX_DISCLAIMER);
});
await check('1099: solo banco, transferencia o efectivo cuentan; aviso cerca del umbral', async () => {
  reset(() => ({ rows: [
    { id: '1', name: 'Ana', entity_type: 'individual', w9_status: 'missing', reportable: '250000', processor: '0' },
    { id: '2', name: 'Luis', entity_type: 'llc', w9_status: 'on_file', reportable: '160000', processor: '90000' },
  ] }));
  const l = await books.contractors1099(2026);
  assert.equal(l.threshold_usd, 2000);
  assert.equal(l.rows[0].needs_1099, true);
  assert.equal(l.rows[1].needs_1099, false);
  assert.equal(l.rows[1].near_threshold, true);
  assert.match(log[0].text, /a\.kind IN \('bank', 'revolut', 'cash', 'other'\)/);
});

// ════════════════════════════════════════════════════════════════
//  Cron y endpoint
// ════════════════════════════════════════════════════════════════
const cron = await import('../api/cron/finanzas.mjs');
const booksH = (await import('../api/admin/finance/books.mjs')).default;
function fakeRes() {
  const r = { statusCode: 200, body: null, headers: {} };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.send = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  return r;
}
await check('cron: mes anterior y plazos de los próximos 7 días', () => {
  assert.equal(cron.previousMonth('2026-01-03'), '2025-12');
  assert.equal(cron.previousMonth('2026-11-14'), '2026-10');
  assert.deepEqual(cron.upcomingDeadlines('2026-09-10').map((d) => d.date), ['2026-09-15']);
  assert.deepEqual(cron.upcomingDeadlines('2026-10-01'), []);
});
await check('cron: sin el secreto → 401 y no toca nada', async () => {
  process.env.CRON_SECRET = 'secreto-de-prueba';
  reset();
  const r = fakeRes();
  await cron.default({ method: 'GET', headers: { authorization: 'Bearer otro' } }, r);
  assert.equal(r.statusCode, 401);
  assert.equal(log.length, 0);
});
await check('libros: año raro → 400; vista desconocida → 400', async () => {
  reset();
  const r1 = fakeRes();
  await booksH({ method: 'GET', query: { view: 'year', year: '20x6' } }, r1);
  assert.equal(r1.statusCode, 400);
  const r2 = fakeRes();
  await booksH({ method: 'GET', query: { view: 'nada', year: '2026' } }, r2);
  assert.equal(r2.statusCode, 400);
});
await check('CSV para el contador: dólares como números y fórmulas neutralizadas', async () => {
  const { ledgerCsv } = await import('../api/admin/finance/books.mjs');
  const csv = ledgerCsv([{ fecha: '2026-10-02', tipo: 'gasto', contraparte: '=HYPERLINK("x")', referencia: 'Dominio', importe: -9000, comision: 0, categoria: 'hosting', linea: '27b', cuenta: 'Tarjeta', recibo: 'none' }]);
  const [head, row] = csv.replace(/^﻿/, '').trim().split('\r\n');
  assert.match(head, /^Fecha,Tipo,Cliente o proveedor,Concepto o factura,Importe \(USD\)/);
  assert.match(row, /,-90,0,hosting,27b,/);
  assert.match(row, /"'=HYPERLINK\(""x""\)"/);
});

// ════════════════════════════════════════════════════════════════
//  Registros: cuentas, proveedores, devoluciones, ingresos, millaje
// ════════════════════════════════════════════════════════════════
const rec = await import('../lib/finance-records.mjs');
await check('cuentas y proveedores: sin números de cuenta ni números fiscales', async () => {
  reset(() => ({ rows: [{ id: '1' }] }));
  await assert.rejects(rec.createAccount({ name: 'Chase 123456789', kind: 'bank' }), /números de cuenta/);
  await assert.rejects(rec.createVendor({ name: 'Ana', notes: 'SSN 123-45-6789' }), /números fiscales/);
  await assert.rejects(rec.createVendor({ name: 'Estudio', notes: 'EIN 12-3456789' }), /números fiscales/);
  await rec.createVendor({ name: 'Ana López', is_contractor: true });
  const ins = log.find((e) => /INSERT INTO finance_vendors/.test(e.text));
  assert.equal(ins.params[3], 'missing'); // contratista sin W-9 hasta que se marque
});
await check('devoluciones: nunca más de lo cobrado y con la factura del cobro', async () => {
  reset((t) => {
    if (/FROM payments p WHERE p.id = \$1/.test(t)) return { rows: [{ amount_cents: '50000', invoice_id: '5', client_id: '3', refunded: '20000' }] };
    if (/INSERT INTO refunds/.test(t)) return { rows: [{ id: '1' }] };
    return { rows: [] };
  });
  await assert.rejects(rec.createRefund({ payment_id: '9', amount_cents: 30001, refunded_at: '2026-10-10' }), (e) => e.status === 409 && /\$300\.00/.test(e.message));
  await rec.createRefund({ payment_id: '9', amount_cents: 30000, refunded_at: '2026-10-10' });
  const ins = log.find((e) => /INSERT INTO refunds/.test(e.text));
  assert.deepEqual(ins.params.slice(0, 5), ['9', '5', '3', 30000, '2026-10-10']);
  reset();
  await assert.rejects(rec.createRefund({ amount_cents: 100 }), /motivo/);
});
await check('millaje: sin motivo de negocio no se apunta', async () => {
  reset(() => ({ rows: [{ id: '1', miles: '12.5' }] }));
  await assert.rejects(rec.createMileage({ miles: 10 }), /motivo/);
  await assert.rejects(rec.createMileage({ miles: 0, purpose: 'Cliente' }), /millas/);
  const r = await rec.createMileage({ miles: '12,5', purpose: 'Reunión con cliente', trip_date: '2026-10-02' });
  assert.equal(r.miles, 12.5);
});

// ════════════════════════════════════════════════════════════════
//  Importar extractos
// ════════════════════════════════════════════════════════════════
const imr = await import('../lib/finance-import-rules.mjs');
const imp = await import('../lib/finance-import.mjs');
await check('CSV: comillas, comas dentro, punto y coma y BOM', () => {
  assert.deepEqual(imr.parseCsv('﻿a,b\n"x, y","di ""hola"""\n'), [['a', 'b'], ['x, y', 'di "hola"']]);
  assert.deepEqual(imr.parseCsv('a;b\r\n1;2'), [['a', 'b'], ['1', '2']]);
});
await check('fechas y montos de extractos reales', () => {
  assert.equal(imr.parseDate('10/02/2026'), '2026-10-02');
  assert.equal(imr.parseDate('02/10/2026', 'dmy'), '2026-10-02');
  assert.equal(imr.parseDate('13/02/2026'), '2026-02-13');
  assert.equal(imr.parseDate('2 Oct 2026'), '2026-10-02');
  assert.equal(imr.parseDate('2026-10-02 14:33:00'), '2026-10-02');
  assert.equal(imr.parseDate('02/30/2026'), null);
  assert.equal(imr.parseSignedCents('(45.00)'), -4500);
  assert.equal(imr.parseSignedCents('-1,234.56'), -123456);
  assert.equal(imr.parseSignedCents('12.00 DR'), -1200);
});
await check('PayPal: reconoce el formato, salta pendientes y otras monedas, comisión en positivo', () => {
  const csv = 'Date,Time,Name,Type,Status,Currency,Gross,Fee,Net,Transaction ID\n'
    + '10/02/2026,10:00,"Acme, LLC",Payment,Completed,USD,"1,250.00",-36.55,"1,213.45",ABC\n'
    + '10/03/2026,11:00,Figma,Subscription,Completed,USD,-15.00,0.00,-15.00,XYZ\n'
    + '10/04/2026,11:00,Otro,Payment,Pending,USD,50.00,0,50,P1\n'
    + '10/05/2026,11:00,Euro,Payment,Completed,EUR,50.00,0,50,P2';
  const rows = imr.parseCsv(csv);
  assert.equal(imr.detectPreset(rows[0]), 'paypal');
  const out = imr.normalizeRows(rows.slice(1), imr.guessMapping(rows[0], 'paypal'));
  assert.deepEqual(out.rows.map((r) => [r.amount_cents, r.fee_cents]), [[125000, 3655], [-1500, 0]]);
  assert.deepEqual(out.skipped, { invalid: 0, status: 1, currency: 1, zero: 0 });
});
await check('banco con columnas de cargo y abono; signo invertido para tarjetas como Amex', () => {
  const rows = imr.parseCsv('Date,Description,Debit,Credit\n10/01/2026,VERCEL INC,20.00,\n10/02/2026,ZELLE FROM ACME,,500.00');
  const map = imr.guessMapping(rows[0], 'bank');
  assert.deepEqual(imr.normalizeRows(rows.slice(1), map).rows.map((r) => r.amount_cents), [-2000, 50000]);
  const amex = imr.parseCsv('Date,Description,Amount\n10/01/2026,FIGMA,15.00');
  const m2 = { ...imr.guessMapping(amex[0], 'bank'), invert: true };
  assert.equal(imr.normalizeRows(amex.slice(1), m2).rows[0].amount_cents, -1500);
});
await check('proveedor y categoría probables del concepto', () => {
  assert.equal(imr.guessVendor('SQ *FIGMA.COM 4021 SAN FRANCISCO'), 'Figma');
  assert.equal(imr.guessVendor('POS DEBIT OFFICE DEPOT #123'), 'Office Depot');
  assert.equal(imr.guessCategory('VERCEL INC'), 'hosting');
  assert.equal(imr.guessCategory('OPENAI *CHATGPT SUBSCR'), 'ia');
  assert.equal(imr.guessCategory('PANADERIA LA ESPIGA'), null);
});
await check('claves de importación estables; dos filas idénticas son dos movimientos', () => {
  const h = (s) => s.length.toString(16).padStart(24, '0');
  const rows = [{ date: '2026-10-01', amount_cents: -500, description: 'Café', ref: '' }, { date: '2026-10-01', amount_cents: -500, description: 'café ', ref: '' }];
  const k = imr.importKeys('3', rows, h);
  assert.notEqual(k[0], k[1]);
  assert.deepEqual(imr.importKeys('3', rows, h), k);
  assert.match(k[0], /^imp:3:/);
});
await check('importar: pendiente de revisar, sin meses cerrados ni lo descartado; categoría aprendida', async () => {
  reset((t, p) => {
    if (/FROM finance_accounts WHERE id = \$1/.test(t)) return { rows: [{ id: '3', kind: 'bank' }] };
    if (/FROM finance_months WHERE status = 'closed'/.test(t)) return { rows: [{ m: '2026-09' }] };
    if (/FROM finance_suppressed_refs/.test(t)) return { rows: [{ source_ref: p[0][1] }] };
    if (/DISTINCT ON \(lower\(vendor\)\)/.test(t)) return { rows: [{ v: 'figma', category: 'software' }] };
    if (/INSERT INTO company_expenses/.test(t)) return { rows: [{ id: '1' }] };
    if (/INSERT INTO income_entries/.test(t)) return { rows: [{ id: '2' }] };
    return { rows: [] };
  });
  const out = await imp.importRows({ accountId: '3', filename: 'oct.csv', by: 'yo', rows: [
    { date: '2026-10-01', amount_cents: -1500, description: 'SQ *FIGMA.COM', ref: '' },
    { date: '2026-10-02', amount_cents: -999, description: 'Descartada antes', ref: '' },
    { date: '2026-09-20', amount_cents: -700, description: 'Mes cerrado', ref: '' },
    { date: '2026-10-03', amount_cents: 50000, fee_cents: 0, description: 'ZELLE FROM ACME', ref: '' },
  ] });
  assert.deepEqual(out, { total: 4, created_expenses: 1, created_income: 1, existing: 0, suppressed: 1, closed: 1 });
  const ins = log.find((e) => /INSERT INTO company_expenses/.test(e.text));
  assert.match(ins.text, /'import', t\.ref, 'pending'/);
  assert.deepEqual(ins.params[2], ['software']);   // aprendida del último gasto de Figma
  assert.deepEqual(ins.params[3], [1500]);         // el gasto se guarda en positivo
  assert.ok(log.some((e) => /INSERT INTO finance_imports/.test(e.text)));
  await assert.rejects(imp.importRows({ accountId: '3', rows: [{ date: '2026-10-01', amount_cents: 0, description: 'x' }] }), /fila 1/);
  await assert.rejects(imp.importRows({ accountId: 'x', rows: [] }), /cuenta/);
});
await check('revisar: traspaso se descarta sin volver; cobro de factura toma cuenta y comisión', async () => {
  reset((t) => {
    if (/FROM income_entries WHERE id = \$1/.test(t)) return { rows: [{ id: '2', received_at: '2026-10-03', amount_cents: '50000', fee_cents: '0', account_id: '3', source_ref: 'imp:3:abc:1' }] };
    if (/SELECT paid_at FROM payments WHERE id = \$1/.test(t)) return { rows: [{ paid_at: '2026-10-02' }] };
    if (/^UPDATE payments/.test(t)) return { rows: [{ id: '9' }] };
    return { rows: [] };
  });
  await imp.resolveIncome('2', 'payment', { payment_id: '9' }, 'yo');
  assert.ok(log.some((e) => /^UPDATE payments SET account_id = COALESCE\(account_id, \$1\)/.test(e.text)));
  assert.ok(log.some((e) => /INSERT INTO finance_suppressed_refs/.test(e.text) && e.params[0] === 'imp:3:abc:1'));
  assert.ok(log.some((e) => /DELETE FROM income_entries/.test(e.text)));
  reset((t) => (/FROM company_expenses WHERE id = \$1/.test(t) ? { rows: [{ id: '1', spent_at: '2026-10-01', amount_cents: '1500', source_ref: 'imp:3:x:1' }] } : { rows: [] }));
  await assert.rejects(imp.resolveExpense('1', 'accept', {}), /categoría/);
  await imp.resolveExpense('1', 'ignore', {}, 'yo');
  assert.ok(log.some((e) => /INSERT INTO finance_suppressed_refs/.test(e.text)));
});

// ════════════════════════════════════════════════════════════════
//  Recibos
// ════════════════════════════════════════════════════════════════
const rc = await import('../lib/finance-receipts.mjs');
const UUIDX = '123e4567-e89b-12d3-a456-426614174000';
await check('recibos: ruta exacta, solo fotos o PDF, 15 MB como mucho', async () => {
  assert.equal(rc.checkReceiptPath(`receipts/7/${UUIDX}.pdf`, '7', 'application/pdf'), true);
  assert.equal(rc.checkReceiptPath(`receipts/8/${UUIDX}.pdf`, '7', 'application/pdf'), false);
  assert.equal(rc.checkReceiptPath(`receipts/7/${UUIDX}.png`, '7', 'application/pdf'), false);
  assert.equal(rc.checkReceiptPath(`receipts/7/../x.pdf`, '7', 'application/pdf'), false);
  reset(() => ({ rows: [{ id: '7' }] }));
  await assert.rejects(rc.receiptTokenOptions(`receipts/7/${UUIDX}.svg`, JSON.stringify({ expenseId: '7', contentType: 'image/svg+xml', size: 10 })), /foto/);
  await assert.rejects(rc.receiptTokenOptions(`receipts/7/${UUIDX}.pdf`, JSON.stringify({ expenseId: '7', contentType: 'application/pdf', size: 16 * 1024 * 1024 })), /15 MB/);
  const opt = await rc.receiptTokenOptions(`receipts/7/${UUIDX}.pdf`, JSON.stringify({ expenseId: '7', contentType: 'application/pdf', size: 2048 }));
  assert.deepEqual([opt.allowedContentTypes, opt.maximumSizeInBytes, opt.addRandomSuffix, opt.allowOverwrite], [['application/pdf'], 2048, false, false]);
});
await check('recibos: el tipo real manda; un falso PDF se borra y no se enlaza', async () => {
  reset((t) => (/SELECT id, receipt_path FROM company_expenses/.test(t) ? { rows: [{ id: '7', receipt_path: `receipts/7/old.png` }] } : { rows: [] }));
  blobs.deleted.length = 0;
  blobs.type = { mime: 'text/html', ext: 'html' };
  await assert.rejects(rc.confirmReceipt('7', `receipts/7/${UUIDX}.pdf`), /no es una foto ni un PDF/);
  assert.deepEqual(blobs.deleted, [`receipts/7/${UUIDX}.pdf`]);
  assert.ok(!log.some((e) => /^UPDATE company_expenses/.test(e.text)));
  blobs.deleted.length = 0;
  blobs.type = { mime: 'application/pdf', ext: 'pdf' };
  await rc.confirmReceipt('7', `receipts/7/${UUIDX}.pdf`);
  assert.ok(log.some((e) => /receipt_status = 'attached'/.test(e.text)));
  assert.deepEqual(blobs.deleted, ['receipts/7/old.png']); // el anterior se borra
});

// ════════════════════════════════════════════════════════════════
//  Fallos que encontró la revisión adversarial (2026-11-14): que no vuelvan
// ════════════════════════════════════════════════════════════════
const fin = await import('../lib/finance.mjs');
await check('SQL: editar factura y suscripción llevan $ en cada parámetro', async () => {
  reset((t) => {
    if (/FROM invoices WHERE id = \$1 FOR UPDATE/.test(t)) return { rows: [{ id: '5', client_id: '3', status: 'sent', amount_cents: '1000' }] };
    if (/AS paid FROM payments/.test(t)) return { rows: [{ paid: '0' }] };
    return { rows: [] };
  });
  await fin.updateInvoice('5', { description: 'Anticipo', status: 'void' });
  const upd = log.find((e) => /^UPDATE invoices SET description/.test(e.text));
  assert.match(upd.text, /^UPDATE invoices SET description = \$1, status = \$2 WHERE id = \$3$/);
  let state = { id: '7', name: 'Figma', cycle: 'monthly', active: true, started_at: '2026-01-05', ended_at: null, next_charge_at: '2026-01-05' };
  reset((t, p) => (/^UPDATE subscriptions/.test(t) ? { rows: [state] } : /FROM subscriptions WHERE id = \$1/.test(t) ? { rows: [state] } : { rows: [] }));
  await exp.updateSubscription('7', { name: 'Figma Pro' });
  const us = log.find((e) => /^UPDATE subscriptions/.test(e.text));
  assert.match(us.text, /^UPDATE subscriptions SET name = \$1 WHERE id = \$2 RETURNING/);
});
await check('suscripción: cambiar el día de cobro o el ciclo vale desde hoy; la baja se valida antes de escribir', async () => {
  const { houstonDate } = await import('../lib/dates.mjs');
  let state = { id: '7', name: 'Figma', cycle: 'monthly', active: true, started_at: '2026-01-05', ended_at: null, next_charge_at: '2099-01-05' };
  reset((t, p) => {
    if (/^UPDATE subscriptions/.test(t)) {
      const cols = t.slice(t.indexOf('SET') + 4, t.indexOf(' WHERE')).split(', ').map((s) => s.split(' = ')[0]);
      cols.forEach((c, i) => { state = { ...state, [c]: p[i] }; });
      return { rows: [state] };
    }
    if (/FROM subscriptions WHERE id = \$1/.test(t)) return { rows: [state] };
    return { rows: [] };
  });
  await exp.updateSubscription('7', { next_charge_at: '2099-01-20' });
  assert.equal(state.started_at, houstonDate());
  log.length = 0;
  await assert.rejects(exp.updateSubscription('7', { ended_at: '2020-01-01' }), /baja no puede ser anterior/);
  assert.ok(!log.some((e) => /^UPDATE subscriptions/.test(e.text)), 'no escribe nada si la baja es inválida');
});
await check('suscripción pausada antes de la migración: reactivar abre alta nueva aunque no tenga baja', async () => {
  const { houstonDate } = await import('../lib/dates.mjs');
  let state = { id: '8', name: 'Neon', cycle: 'monthly', active: false, started_at: '2026-01-10', ended_at: null, next_charge_at: '2026-01-10' };
  reset((t, p) => {
    if (/^UPDATE subscriptions/.test(t)) {
      const cols = t.slice(t.indexOf('SET') + 4, t.indexOf(' WHERE')).split(', ').map((s) => s.split(' = ')[0]);
      cols.forEach((c, i) => { state = { ...state, [c]: p[i] }; });
      return { rows: [state] };
    }
    if (/FROM subscriptions WHERE id = \$1/.test(t)) return { rows: [state] };
    return { rows: [] };
  });
  await exp.updateSubscription('8', { active: true });
  assert.equal(state.started_at, houstonDate());
});
await check('cron: nunca otro cargo en el periodo del último registrado (aunque cambie el día)', async () => {
  assert.equal(books.afterPeriod('2026-10-20', '2026-10-05', 'monthly'), false);
  assert.equal(books.afterPeriod('2026-11-05', '2026-10-05', 'monthly'), true);
  assert.equal(books.afterPeriod('2026-12-01', '2026-03-01', 'yearly'), false);
  reset((t) => {
    if (/FROM subscriptions/.test(t)) return { rows: [{ id: '7', name: 'Figma', category: 'software', amount_cents: '1500', cycle: 'monthly', next_charge_at: '2026-10-20', started_at: '2026-09-01', ended_at: null }] };
    if (/MAX\(spent_at\)/.test(t)) return { rows: [{ id: '7', last: '2026-10-05' }] };
    if (/INSERT INTO company_expenses/.test(t)) return { rows: [{ id: '1' }] };
    return { rows: [] };
  });
  await books.generateSubscriptionCharges({ today: '2026-11-25' });
  const ins = log.filter((e) => /INSERT INTO company_expenses/.test(e.text)).map((e) => e.params[3]);
  assert.deepEqual(ins, ['2026-11-20']);   // ni sept ni oct (ya cobrados), solo noviembre
});
await check('cierre: una factura anulada y devuelta entera no bloquea el mes', async () => {
  reset(() => ({ rows: [{ n: 0 }] }));
  await books.monthChecklist('2026-03');
  const q = log.find((e) => /i.status = 'void'/.test(e.text));
  assert.match(q.text, /FROM refunds WHERE invoice_id = i.id\), 0\) > 0/);
});
await check('panel: lo importado sin revisar no cuenta en los gastos del mes', async () => {
  reset(() => ({ rows: [{ cents: '0', n: 0 }] }));
  await exp.financeExtras();
  assert.match(log[0].text, /WHERE review_status = 'ok'/);
});
await check('un cobro con devoluciones no se borra', async () => {
  reset((t) => {
    if (/SELECT paid_at FROM payments WHERE id = \$1 FOR UPDATE/.test(t)) return { rows: [{ paid_at: '2026-10-10' }] };
    if (/COUNT\(\*\)::int AS n FROM refunds/.test(t)) return { rows: [{ n: 1 }] };
    return { rows: [] };
  });
  await assert.rejects(fin.deletePayment('77'), (e) => e.status === 409 && /devolución/.test(e.message));
  assert.ok(!log.some((e) => /^DELETE FROM payments/.test(e.text)));
});
await check('trimestral: los intereses pagan renta pero no cuota de autónomo', () => {
  const a = tax.quarterlyEstimate({ year: 2026, ytdNet: 60000, monthsElapsed: 6, today: '2026-07-01' });
  const b = tax.quarterlyEstimate({ year: 2026, ytdNet: 60000, ytdOtherIncome: 1000, monthsElapsed: 6, today: '2026-07-01' });
  near(b.seTax, a.seTax);
  near(b.incomeTax - a.incomeTax, 2000 * 0.22);   // 1.000 en 6 meses = 2.000 al año, tramo del 22 %
});
await check('fechas reales del driver (objetos Date) en duplicados', () => {
  const pairs = tax.findDuplicates([
    { id: 1, vendor: 'Acme', amount_cents: 5000, spent_at: new Date('2026-11-06T00:00:00Z') },
    { id: 2, vendor: 'Acme', amount_cents: 5000, spent_at: new Date('2026-11-07T00:00:00Z') },
  ]);
  assert.deepEqual(pairs, [['1', '2']]);
});
await check('Stripe y Revolut: la hora UTC pasa a la fecha de Houston', () => {
  assert.equal(imr.utcToHouston('2026-04-01 02:30:00'), '2026-03-31');
  assert.equal(imr.utcToHouston('2026-04-01T18:00:00Z'), '2026-04-01');
  const rows = imr.parseCsv('id,Created date (UTC),Amount,Fee,Description,Status,Currency\nch_1,2026-04-01 02:30:00,100.00,3.20,Acme,Paid,usd');
  const out = imr.normalizeRows(rows.slice(1), imr.guessMapping(rows[0], 'stripe'));
  assert.equal(out.rows[0].date, '2026-03-31');
});
await check('asignar un cargo importado a su suscripción suprime el automático aunque aún no exista', async () => {
  reset((t, p) => {
    if (/FROM company_expenses WHERE id = \$1/.test(t)) return { rows: [{ id: '1', spent_at: '2026-10-16', amount_cents: '1500', source_ref: 'imp:3:x:1' }] };
    if (/FROM subscriptions WHERE id = \$1/.test(t)) return { rows: [{ id: '7', name: 'Figma', category: 'software', cycle: 'monthly', next_charge_at: '2026-10-20', started_at: '2026-09-01', ended_at: null }] };
    if (/WHERE source_ref = \$1/.test(t)) return { rows: [] };          // el automático del 20 aún no existe
    if (/^UPDATE company_expenses/.test(t)) return { rows: [{ id: '1' }] };
    return { rows: [] };
  });
  await imp.resolveExpense('1', 'subscription', { subscription_id: '7' }, 'yo');
  assert.ok(log.some((e) => /INSERT INTO finance_suppressed_refs/.test(e.text) && e.params[0] === 'sub:7:2026-10-20'));
});

// ── Ajustes: el perfil fiscal se valida antes de guardar ──
const settingsApi = await import('../api/admin/settings.mjs');
await check('ajustes: sociedad con socios que suman 100; nada de valores raros', () => {
  const c = settingsApi.cleanSetting;
  assert.deepEqual(c('finance.filing', 'mfj'), 'mfj');
  assert.throws(() => c('finance.filing', 'x'), /individual o conjunta/);
  assert.throws(() => c('finance.entity', { type: 'partnership', from: '2026-01-01', partners: [{ name: 'A', share: 60 }, { name: 'B', share: 30 }] }), /suman 90/);
  assert.throws(() => c('finance.entity', { type: 'partnership', from: '2026-01-01', partners: [{ name: 'A', share: 100 }] }), /al menos dos/);
  const ok = c('finance.entity', { type: 'partnership', from: '2026-01-01', partners: [{ name: 'Yan', share: 50 }, { name: 'Socia', share: 50 }] });
  assert.equal(ok.periods[0].partners.length, 2);
  assert.deepEqual(c('finance.entity', { type: 'single_llc', from: '2026-01-01', partners: [{ name: 'x', share: 1 }] }).periods[0].partners, []);
  assert.throws(() => c('finance.otra', 1), /desconocido/);
  assert.deepEqual(c('finance.sales_tax_tx', { registered: 1, local_rate: 99 }), { registered: true, local_rate: null });
});

await check('monto del cargo: precio de entrada, gratis y monto que varía', async () => {
  const base = { amount_cents: '1999', billing: 'fixed' };
  assert.deepEqual(rules.subscriptionChargeAmount(base, '2026-07-19'), { cents: 1999, estimate: false, intro: false });
  const intro = { ...base, intro_amount_cents: '199', intro_until: '2026-07-19' };
  assert.equal(rules.subscriptionChargeAmount(intro, '2026-06-19').cents, 199);        // primer mes rebajado
  assert.equal(rules.subscriptionChargeAmount(intro, '2026-07-19').cents, 1999);       // desde el fin, precio normal
  const free = { ...base, intro_amount_cents: '0', intro_until: '2026-03-01' };
  assert.equal(rules.subscriptionChargeAmount(free, '2026-02-01').cents, 0);           // mes gratis: sin cargo
  const vari = { amount_cents: '2000', billing: 'variable' };
  assert.deepEqual(rules.subscriptionChargeAmount(vari, '2026-11-16', '5330'), { cents: 5330, estimate: true, intro: false });
  assert.equal(rules.subscriptionChargeAmount(vari, '2026-11-16', null).cents, 2000);  // sin historial: el monto guardado
});
await check('cron: la que varía sale «por confirmar» con el último monto real; mes gratis sin cargo', async () => {
  reset((t) => {
    if (/FROM subscriptions/.test(t)) return { rows: [
      { id: '3', name: 'Vercel Pro', category: 'hosting', amount_cents: '2000', cycle: 'monthly', next_charge_at: '2026-11-16', started_at: '2026-04-16', ended_at: null, billing: 'variable' },
      { id: '4', name: 'Google AI Pro', category: 'software', amount_cents: '1999', cycle: 'monthly', next_charge_at: '2026-11-19', started_at: '2026-10-19', ended_at: null, billing: 'fixed', intro_amount_cents: '0', intro_until: '2026-11-19' },
    ] };
    if (/MAX\(spent_at\)/.test(t)) return { rows: [{ id: '3', last: '2026-10-16' }] };
    if (/DISTINCT ON \(subscription_id\)/.test(t)) return { rows: [{ id: '3', cents: '5330' }] };
    if (/INSERT INTO company_expenses/.test(t)) return { rows: [{ id: '1' }] };
    return { rows: [] };
  });
  await books.generateSubscriptionCharges({ today: '2026-11-20' });
  const ins = log.filter((e) => /INSERT INTO company_expenses/.test(e.text)).map((e) => e.params);
  // Vercel: noviembre por confirmar con 53,30; Google: octubre gratis (sin cargo), noviembre a precio normal.
  assert.deepEqual(ins.map((p) => [p[3], p[2], p[8]]), [['2026-11-16', 5330, 'pending'], ['2026-11-19', 1999, 'ok']]);
  assert.match(ins[0][0], /monto por confirmar/);
});
await check('el cargo real de una suscripción sustituye a su estimado y lo suprime', async () => {
  reset(() => ({ rows: [{ id: '9' }] }));
  await exp.createExpense({ label: 'Vercel', amount_cents: 5330, spent_at: '2026-11-16', subscription_id: '3' });
  const del = log.find((e) => /DELETE FROM company_expenses e/.test(e.text));
  assert.ok(del, 'borra el estimado');
  assert.match(del.text, /e.review_status = 'pending'/);
  assert.match(del.text, /BETWEEN \$2::date - 20 AND \$2::date \+ 20/);
  assert.match(del.text, /INSERT INTO finance_suppressed_refs/);
  assert.deepEqual(del.params, ['3', '2026-11-16', '9']);
});

// ── Encargo legal de Orbit (15-nov): los libros se guardan 7 años ──
const clientsApi = (await import('../api/admin/clients/[id].mjs')).default;
await check('cliente con facturas emitidas: no se borra (409) y no se lanza ningún DELETE', async () => {
  reset((t) => {
    if (/SELECT \* FROM clients WHERE id/.test(t)) return { rows: [{ id: '5', client_code: 'CLI-005', business_name: 'Sabor Boricua', status: 'archived' }] };
    if (/issued_invoices/.test(t)) return { rows: [{ projects: 1, milestones: 0, invoices: 2, issued_invoices: 1, payments: 0, payments_cents: 0 }] };
    return { rows: [] };
  });
  const res = fakeRes();
  await clientsApi({ method: 'DELETE', query: { id: '5', confirm: 'Sabor Boricua' }, body: {}, headers: {} }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.reason, 'has_invoices');
  assert.match(res.body.error, /7 años/);
  assert.ok(!log.some((e) => /DELETE FROM clients/.test(e.text)), 'no borra');
});
await check('cliente solo con borradores: sí se borra', async () => {
  reset((t) => {
    if (/SELECT \* FROM clients WHERE id/.test(t)) return { rows: [{ id: '6', client_code: 'CLI-006', business_name: 'Prueba', status: 'archived' }] };
    if (/issued_invoices/.test(t)) return { rows: [{ projects: 0, milestones: 0, invoices: 1, issued_invoices: 0, payments: 0, payments_cents: 0 }] };
    if (/DELETE FROM clients/.test(t)) return { rows: [{ id: '6' }] };
    return { rows: [] };
  });
  const res = fakeRes();
  await clientsApi({ method: 'DELETE', query: { id: '6', confirm: 'Prueba' }, body: {}, headers: {} }, res);
  assert.equal(res.statusCode, 200);
});
await check('ajustes: el equipo sale con el último acceso de cada correo', async () => {
  reset(() => ({ rows: [] }));
  const res = fakeRes();
  await settingsApi.default({ method: 'GET', query: {}, headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.team, [{ email: 'prueba@marcyan.test', last_access: null }]);
});

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) de los libros fallaron:\n - ` + fails.join('\n - '));
  process.exit(1);
}
console.log(`✓ ${pass} pruebas de los libros de Finanzas pasaron.`);
