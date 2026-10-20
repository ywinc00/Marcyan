// ════════════════════════════════════════════════════════════════
//  scripts/test-finance.mjs  ·  npm run test:finance
//  Pruebas de Finanzas (A4) SIN base de datos y SIN red:
//    · lib/finance-rules.mjs  montos ("1.500" y "1,500"), estado derivado,
//      estados manuales, pagos ≤ saldo, próximo cargo, categorías.
//    · lib/finance.mjs y lib/expenses.mjs con una base FALSA en memoria
//      (@vercel/postgres sustituido con mock.module): reglas de edición y
//      borrado, y que el SQL ENVIADO use next_*_id() dentro del INSERT
//      (FIN-19) y BEGIN/FOR UPDATE en los pagos. Eso comprueba el texto que
//      se manda, NO la atomicidad real: no hay un Postgres detrás.
//    · El CASE de estado en SQL traducido a JS y comparado con la regla JS.
//    · Handlers de api/admin con la sesión simulada: mensajes en español
//      llano y códigos (400/404/409) que el panel enseña tal cual.
//  Necesita --experimental-test-module-mocks (lo pone el script de npm).
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import { mock } from 'node:test';

let pass = 0;
const fails = [];
async function check(name, fn) {
  try { await fn(); pass++; } catch (e) { fails.push(name + ' → ' + (e && e.message)); }
}

// ── Base falsa ───────────────────────────────────────────────────
// Cada consulta se registra en `log` y la responde `responder(text, params)`,
// que cada prueba sustituye. Devuelve { rows, rowCount }.
const log = [];
let responder = () => ({ rows: [], rowCount: 0 });
const norm = (t) => String(t).replace(/\s+/g, ' ').trim();
function run(text, params, via) {
  const entry = { text: norm(text), params: params || [], via };
  log.push(entry);
  const out = responder(entry.text, entry.params) || { rows: [] };
  return Promise.resolve({ rows: out.rows || [], rowCount: out.rowCount ?? (out.rows || []).length });
}
function sqlTag(strings, ...values) {
  let text = strings[0];
  values.forEach((v, i) => { text += `$${i + 1}` + strings[i + 1]; });
  return run(text, values, 'sql');
}
sqlTag.query = (text, params) => run(text, params, 'sql');
const db = { connect: async () => ({ query: (text, params) => run(text, params, 'client'), release: () => {} }) };

mock.module('@vercel/postgres', { namedExports: { sql: sqlTag, db } });
mock.module('../lib/auth.mjs', {
  namedExports: { requireAdmin: async () => ({ email: 'prueba@marcyan.test' }) },
});

const rules = await import('../lib/finance-rules.mjs');
const fin = await import('../lib/finance.mjs');
const exp = await import('../lib/expenses.mjs');

function reset(fn) { log.length = 0; responder = fn || (() => ({ rows: [] })); }
const has = (re) => log.some((e) => re.test(e.text));

// ════════════════════════════════════════════════════════════════
//  Reglas puras
// ════════════════════════════════════════════════════════════════
const cents = (s) => rules.parseMoney(s).cents;

await check('monto: "1500", "1,500", "1.500", "$1,500.00", "1.500,00" = $1,500.00 (FIN-04)', () => {
  for (const s of ['1500', '1,500', '1.500', '$1,500.00', '1.500,00', '1,500.00', 'USD 1500', '$ 1 500']) {
    assert.equal(cents(s), 150000, s);
  }
});
await check('monto: decimales con punto o coma', () => {
  assert.equal(cents('1500.5'), 150050);
  assert.equal(cents('1500,50'), 150050);
  assert.equal(cents('19.99'), 1999);
  assert.equal(cents('1,5'), 150);
  assert.equal(cents('.50'), 50);
  assert.equal(cents('1500.'), 150000);
});
await check('monto: miles con varios grupos', () => {
  assert.equal(cents('1,500,000'), 150000000);
  assert.equal(cents('1.500.000'), 150000000);
  assert.equal(cents('12.500'), 1250000);
});
await check('monto: ambiguo o inválido da error, nunca un monto mil veces menor', () => {
  for (const s of ['0.500', '1500.000', '1,50,000', 'abc', '15OO', '1.5.0,0']) {
    const r = rules.parseMoney(s);
    assert.equal(r.ok, false, s);
    assert.ok(r.error && !/_/.test(r.error), s);
  }
});
await check('monto: vacío, negativo y demasiado grande', () => {
  assert.equal(rules.parseMoney('').empty, true);
  assert.equal(rules.parseMoney('   ').ok, false);
  assert.match(rules.parseMoney('-20').error, /negativo/);
  assert.match(rules.parseMoney('999,999,999.00').error, /demasiado grande/);
  assert.equal(cents('0'), 0); // lo acepta el parser; el "mayor que 0" lo exige quien guarda
});
await check('formatUsd', () => {
  assert.equal(rules.formatUsd(150000), '$1,500.00');
  assert.equal(rules.formatUsd('1999'), '$19.99');
});

const T = '2026-10-19';
const st = (o) => rules.effectiveInvoiceStatus({ status: 'sent', amount_cents: 1000, paid_cents: 0, due_date: null, ...o }, T);
await check('estado: saldo 0 = pagada, pago parcial = parcial, sin pagos = enviada (FIN-02)', () => {
  assert.equal(st({ paid_cents: 1000 }), 'paid');
  assert.equal(st({ paid_cents: 1200 }), 'paid');
  assert.equal(st({ paid_cents: 400 }), 'partial');
  assert.equal(st({}), 'sent');
  assert.equal(st({ status: 'paid', paid_cents: 0 }), 'sent'); // "pagada" sin pagos ya no miente
});
await check('estado: vencida SOLA cuando pasa la fecha con saldo (FIN-05)', () => {
  assert.equal(st({ due_date: '2026-10-18T00:00:00.000Z' }), 'overdue');
  assert.equal(st({ due_date: '2026-10-19' }), 'sent');            // vence hoy: aún no
  assert.equal(st({ due_date: '2026-10-01', paid_cents: 400 }), 'overdue');
  assert.equal(st({ due_date: '2026-10-01', paid_cents: 1000 }), 'paid');
  assert.equal(st({ status: 'overdue', due_date: '2026-12-01' }), 'sent'); // fila vieja marcada a mano
});
await check('estado: borradores y anuladas no vencen', () => {
  assert.equal(st({ status: 'draft', due_date: '2026-01-01' }), 'draft');
  assert.equal(st({ status: 'void', due_date: '2026-01-01' }), 'void');
  assert.equal(st({ status: 'void', paid_cents: 1000 }), 'void');
  assert.equal(st({ status: 'draft', paid_cents: 500 }), 'partial'); // un pago implica que se envió
});
await check('estado guardado nunca es "vencida"', () => {
  assert.equal(rules.baseInvoiceStatus({ status: 'overdue', amount_cents: 1000, paid_cents: 0 }), 'sent');
  assert.equal(rules.baseInvoiceStatus({ status: 'sent', amount_cents: 0, paid_cents: 0 }), 'paid');
});
// El CASE de sqlEffectiveStatus() es el ESPEJO en SQL de effectiveInvoiceStatus().
// Sin Postgres en las pruebas, se traduce el CASE generado a una expresión JS
// (CASE→paréntesis, WHEN/THEN/ELSE→ternarios) y se compara caso por caso con
// la función JS. Si alguien reordena o cambia un WHEN, esta prueba falla.
const { SQL_TODAY_HOUSTON } = await import('../lib/dates.mjs');
function caseToJs(sqlText) {
  let s = sqlText.split(SQL_TODAY_HOUSTON).join('r.today')
    .replace(/\bi\.status\b/g, 'r.status')
    .replace(/\bi\.amount_cents\b/g, 'r.amount')
    .replace(/\bi\.due_date\b/g, 'r.due')
    .replace(/\bPAID\b/g, 'r.paid')
    .replace(/\bIS NOT NULL\b/g, '!= null')
    .replace(/\bAND\b/g, '&&')
    .replace(/ = /g, ' === ')
    .replace(/\bCASE\s+WHEN\b/g, '((')
    .replace(/\bWHEN\b/g, ': (')
    .replace(/\bTHEN\b/g, ') ?')
    .replace(/\bELSE\b/g, ':')
    .replace(/\bEND\b/g, ')');
  // Lo que quede de SQL sin traducir haría fallar la prueba (no se adivina).
  assert.ok(!/\b(CASE|WHEN|THEN|COALESCE|now|::)\b/.test(s), 'CASE con sintaxis nueva sin traducir: ' + s);
  return new Function('r', 'return ' + s + ';');
}
await check('estado: el CASE de SQL da lo mismo que effectiveInvoiceStatus (espejo)', () => {
  const evalSql = caseToJs(norm(fin.sqlEffectiveStatus('i', 'PAID')));
  let n = 0;
  for (const status of ['draft', 'sent', 'paid', 'partial', 'overdue', 'void'])
    for (const amount of [0, 1000])
      for (const paid of [0, 400, 1000, 1200])
        for (const due of [null, '2026-10-01', T, '2026-12-01']) {
          const js = rules.effectiveInvoiceStatus({ status, amount_cents: amount, paid_cents: paid, due_date: due }, T);
          const sqlSt = evalSql({ status, amount, paid, due, today: T });
          assert.equal(sqlSt, js, `status=${status} monto=${amount} pagado=${paid} vence=${due}`);
          n++;
        }
  assert.equal(n, 192);
});
const { niceAxisMax } = await import('../src/components/dashboard/finanzas/fin.js');
await check('gráfico: el eje Y usa topes redondos (1, 2, 2.5 o 5 × 10^n por tramo)', () => {
  assert.equal(niceAxisMax(137000), 150000);   // $1,370 → $0 / $500 / $1K / $1.5K
  assert.equal(niceAxisMax(300000), 300000);   // $3,000 → tramos de $1K
  assert.equal(niceAxisMax(500001), 600000);   // $5,000.01 → tramos de $2K
  assert.equal(niceAxisMax(700000), 750000);   // $7,000 → tramos de $2.5K
  assert.equal(niceAxisMax(1000), 1500);       // $10 → tramos de $5
  assert.equal(niceAxisMax(1), 300);           // nunca tramos de centavos
  for (const m of [1, 999, 45700, 137000, 999999, 123456789]) {
    const top = niceAxisMax(m);
    assert.ok(top >= m, 'el tope cubre el máximo ' + m);
    const stepDollars = top / 3 / 100;
    const mant = stepDollars / Math.pow(10, Math.floor(Math.log10(stepDollars)));
    assert.ok([1, 2, 2.5, 5].some((x) => Math.abs(x - mant) < 1e-9), 'tramo redondo ' + stepDollars);
  }
});
await check('estado manual: solo Borrador, Enviada o Anulada; borrador sin pagos', () => {
  assert.equal(rules.manualStatusProblem('sent', 0), null);
  assert.equal(rules.manualStatusProblem('void', 500), null);
  assert.ok(rules.manualStatusProblem('paid', 0));
  assert.ok(rules.manualStatusProblem('overdue', 0));
  assert.match(rules.manualStatusProblem('draft', 1), /borrador/);
});
await check('pagos: nunca en anuladas ni por encima del saldo (FIN-09)', () => {
  const p = (o) => rules.paymentProblem({ status: 'sent', amount_cents: 1000, paid_cents: 0, add: 500, ...o });
  assert.equal(p({}), null);
  assert.equal(p({ add: 1000 }), null);
  assert.match(p({ add: 1001 }), /supera el saldo pendiente \(\$10\.00\)/);
  assert.match(p({ status: 'void' }), /anulada/);
  assert.match(p({ paid_cents: 1000 }), /pagada por completo/);
  assert.match(p({ add: 0 }), /mayor que \$0/);
});
await check('próximo cargo avanza solo según la periodicidad (FIN-10)', () => {
  assert.equal(rules.advanceChargeDate('2026-10-25', 'monthly', T), '2026-10-25'); // futuro: igual
  assert.equal(rules.advanceChargeDate('2026-10-19', 'monthly', T), '2026-10-19'); // hoy cuenta
  assert.equal(rules.advanceChargeDate('2026-07-05', 'monthly', T), '2026-11-05');
  assert.equal(rules.advanceChargeDate('2024-03-01T00:00:00.000Z', 'yearly', T), '2027-03-01');
  assert.equal(rules.advanceChargeDate('2026-01-31', 'monthly', '2026-02-10'), '2026-02-28');
  assert.equal(rules.advanceChargeDate('2026-01-31', 'monthly', '2026-03-01'), '2026-03-31'); // sin deriva
  assert.equal(rules.advanceChargeDate(null, 'monthly', T), null);
});
await check('categorías fijas: normaliza sinónimos y desconocidas a "otro" (FIN-21)', () => {
  assert.equal(rules.normalizeCategory('Hosting'), 'hosting');
  assert.equal(rules.normalizeCategory('hospedaje'), 'hosting');
  assert.equal(rules.normalizeCategory('Viajes'), 'otro');
  assert.equal(rules.normalizeCategory(''), null);
  assert.equal(rules.categoryLabel('legal'), 'Legal y contable');
  assert.equal(rules.categoryLabel('viajes'), 'Viajes');
});
await check('fechas y meses', () => {
  assert.equal(rules.isValidDay('2026-02-30'), false);
  assert.equal(rules.isValidDay('2026-02-28'), true);
  assert.deepEqual(rules.monthBounds('2026-12'), { start: '2026-12-01', end: '2027-01-01' });
  assert.equal(rules.monthBounds('2026-13'), null);
});

// ════════════════════════════════════════════════════════════════
//  lib/finance.mjs con base falsa
// ════════════════════════════════════════════════════════════════
await check('FIN-19: el número INV-XXX se genera DENTRO del INSERT (el bloqueo cubre la inserción)', async () => {
  reset((t) => {
    if (/FROM clients WHERE id/.test(t)) return { rows: [{ id: '3' }] };
    if (/INSERT INTO invoices/.test(t)) return { rows: [{ id: '9', invoice_number: 'INV-011' }] };
    return { rows: [] };
  });
  const inv = await fin.createInvoice({ client_id: 3, amount_cents: 150000, status: 'paid', currency: 'EUR' });
  assert.equal(inv.invoice_number, 'INV-011');
  assert.ok(!has(/^SELECT next_invoice_id/), 'no debe pedir el número en una consulta aparte');
  const ins = log.find((e) => /INSERT INTO invoices/.test(e.text));
  assert.match(ins.text, /VALUES \(next_invoice_id\(\)/);
  assert.match(ins.text, /'USD'/);                        // FIN-20: moneda fija
  assert.ok(ins.params.includes('sent'));                 // "Pagada" al crear → Enviada (FIN-02)
});
await check('FIN-19: clientes y proyectos también numeran dentro del INSERT', async () => {
  reset(() => ({ rows: [{ id: '1' }] }));
  await fin.createClient({ business_name: 'X' });
  await fin.createProject({ client_id: '1', name: 'Y' });
  // createClient (A2) arma el INSERT con columnas dinámicas: VALUES (next_client_id(), $1, ...).
  assert.ok(has(/INSERT INTO clients[\s\S]*VALUES \(\s*next_client_id\(\)/));
  assert.ok(has(/INSERT INTO projects .* VALUES \( next_project_code\(\)/));
  assert.ok(!has(/^SELECT next_(client_id|project_code)/));
});
await check('FIN-04: una factura de $0 se rechaza antes de tocar la base', async () => {
  reset();
  await assert.rejects(fin.createInvoice({ client_id: 3, amount_cents: 0 }), (e) => e.status === 400 && /mayor que \$0/.test(e.message));
  await assert.rejects(fin.createInvoice({ amount_cents: 100 }), /Elige un cliente/);
  await assert.rejects(fin.createInvoice({ client_id: 3, amount_cents: 100, issued_at: '2026-10-10', due_date: '2026-10-01' }), /anterior a la de emisión/);
  assert.equal(log.length, 0);
});
await check('FIN-08: el proyecto debe ser del mismo cliente', async () => {
  reset((t) => {
    if (/FROM clients WHERE id/.test(t)) return { rows: [{ id: '3' }] };
    if (/FROM projects WHERE id/.test(t)) return { rows: [{ client_id: '4' }] };
    return { rows: [] };
  });
  await assert.rejects(fin.createInvoice({ client_id: 3, amount_cents: 100, project_id: 7 }), /otro cliente/);
  assert.ok(!has(/INSERT INTO invoices/));
});

// Factura falsa para los pagos: amount 1000, ya pagado `paid`.
function invoiceDb({ status = 'sent', amount = 1000, paid = 0 } = {}) {
  return (t) => {
    if (/FROM invoices WHERE id = \$1 FOR UPDATE/.test(t)) return { rows: [{ id: '5', client_id: '3', status, amount_cents: String(amount) }] };
    if (/SUM\(amount_cents\), 0\)::bigint AS paid FROM payments/.test(t)) return { rows: [{ paid: String(paid) }] };
    if (/INSERT INTO payments/.test(t)) return { rows: [{ id: '77', amount_cents: '400' }] };
    if (/SELECT i.status, i.amount_cents/.test(t)) return { rows: [{ status, amount_cents: String(amount), paid_cents: String(paid + 400) }] };
    if (/FROM \( SELECT i.id/.test(t)) return { rows: [{ id: '5', status: 'partial' }] };
    return { rows: [] };
  };
}
await check('FIN-09: pago en factura anulada → 409 y ROLLBACK, sin INSERT', async () => {
  reset(invoiceDb({ status: 'void' }));
  await assert.rejects(fin.recordPayment({ invoice_id: 5, amount_cents: 400 }), (e) => e.status === 409 && /anulada/.test(e.message));
  assert.ok(has(/^BEGIN$/) && has(/^ROLLBACK$/) && !has(/INSERT INTO payments/) && !has(/^COMMIT$/));
});
await check('FIN-09: pago por encima del saldo → 409 con el saldo en dólares', async () => {
  reset(invoiceDb({ paid: 700 }));
  await assert.rejects(fin.recordPayment({ invoice_id: 5, amount_cents: 400 }), /supera el saldo pendiente \(\$3\.00\)/);
});
await check('pago válido: misma conexión, factura bloqueada, estado recalculado y COMMIT', async () => {
  reset(invoiceDb());
  const out = await fin.recordPayment({ invoice_id: 5, amount_cents: 400, method: 'zelle', paid_at: '2026-10-19' });
  assert.equal(out.payment.id, '77');
  const tx = log.filter((e) => e.via === 'client').map((e) => e.text);
  assert.equal(tx[0], 'BEGIN');
  assert.match(tx[1], /FOR UPDATE/);
  assert.ok(tx.some((t) => /INSERT INTO payments/.test(t)));
  assert.ok(tx.some((t) => /UPDATE invoices SET status = \$1/.test(t)), 'debe pasar a parcial');
  assert.equal(tx[tx.length - 1], 'COMMIT');
});
await check('FIN-03: un pago sin fecha se guarda con el día de Houston', async () => {
  reset(invoiceDb());
  await fin.recordPayment({ invoice_id: 5, amount_cents: 400 });
  const ins = log.find((e) => /INSERT INTO payments/.test(e.text));
  const { houstonDate } = await import('../lib/dates.mjs');
  assert.equal(ins.params[4], houstonDate());
});
await check('editar un pago: el saldo se calcula SIN ese pago', async () => {
  reset((t, p) => {
    if (/FROM payments WHERE id = \$1 FOR UPDATE/.test(t)) return { rows: [{ id: '77', invoice_id: '5', amount_cents: '400' }] };
    if (/AND id <> \$2/.test(t)) { assert.deepEqual(p, ['5', '77']); return { rows: [{ paid: '600' }] }; }
    return invoiceDb({ paid: 600 })(t, p);
  });
  await fin.updatePayment('77', { amount_cents: 400 });     // mismo monto: sin comprobación
  await fin.updatePayment('77', { amount_cents: 300 });     // baja: cabe
  await assert.rejects(fin.updatePayment('77', { amount_cents: 500 }), /supera el saldo pendiente \(\$4\.00\)/);
});
await check('borrar un pago recalcula su factura', async () => {
  reset((t) => {
    if (/DELETE FROM payments/.test(t)) return { rows: [{ invoice_id: '5' }] };
    if (/SELECT i.status, i.amount_cents/.test(t)) return { rows: [{ status: 'paid', amount_cents: '1000', paid_cents: '0' }] };
    return { rows: [] };
  });
  const out = await fin.deletePayment('77');
  assert.equal(out.deleted, '77');
  assert.ok(has(/UPDATE invoices SET status = \$1/));
  const upd = log.find((e) => /UPDATE invoices SET status = \$1/.test(e.text));
  assert.equal(upd.params[0], 'sent');
});
await check('editar factura: el monto no baja de lo cobrado y los estados calculados no se fuerzan', async () => {
  const db1 = (t) => {
    if (/FROM invoices WHERE id = \$1 FOR UPDATE/.test(t)) return { rows: [{ id: '5', client_id: '3', status: 'partial', amount_cents: '1000', project_id: null }] };
    if (/AS paid FROM payments/.test(t)) return { rows: [{ paid: '600' }] };
    return { rows: [] };
  };
  reset(db1);
  await assert.rejects(fin.updateInvoice('5', { amount_cents: 500 }), (e) => e.status === 409 && /\$6\.00/.test(e.message));
  reset(db1);
  await assert.rejects(fin.updateInvoice('5', { status: 'paid' }), /se calcula solo/);
  reset(db1);
  await assert.rejects(fin.updateInvoice('5', { status: 'draft' }), (e) => e.status === 409);
  reset(db1);
  await assert.rejects(fin.updateInvoice('5', { client_id: '9' }), /no se puede cambiar de cliente/);
  assert.ok(has(/^ROLLBACK$/));
});
await check('editar factura: anular con pagos se permite y guarda el estado', async () => {
  reset((t) => {
    if (/FROM invoices WHERE id = \$1 FOR UPDATE/.test(t)) return { rows: [{ id: '5', client_id: '3', status: 'partial', amount_cents: '1000' }] };
    if (/AS paid FROM payments/.test(t)) return { rows: [{ paid: '600' }] };
    if (/SELECT i.status, i.amount_cents/.test(t)) return { rows: [{ status: 'void', amount_cents: '1000', paid_cents: '600' }] };
    if (/FROM \( SELECT i.id/.test(t)) return { rows: [{ id: '5', status: 'void' }] };
    return { rows: [] };
  });
  const inv = await fin.updateInvoice('5', { status: 'void', description: '  Anticipo  ' });
  assert.equal(inv.status, 'void');
  const upd = log.find((e) => /^UPDATE invoices SET description/.test(e.text));
  assert.deepEqual(upd.params, ['Anticipo', 'void', '5']);
  assert.ok(has(/^COMMIT$/));
});
await check('borrar factura con pagos → 409 (se anula, no se borra); sin pagos → se borra', async () => {
  reset((t) => (/FROM invoices WHERE id = \$1 LIMIT 1/.test(t) ? { rows: [{ id: '5' }] } : { rows: [] }));
  await assert.rejects(fin.deleteInvoice(5), (e) => e.status === 409 && /Anúlala/.test(e.message));
  reset((t) => (/DELETE FROM invoices/.test(t) ? { rows: [{ id: '5', invoice_number: 'INV-005' }] } : { rows: [] }));
  assert.deepEqual(await fin.deleteInvoice(5), { invoice_number: 'INV-005' });
  assert.ok(has(/NOT EXISTS \(SELECT 1 FROM payments/));
  reset();
  assert.equal(await fin.deleteInvoice(99), null);
});
await check('FIN-20: búsqueda + cliente + estado en un solo WHERE parametrizado', () => {
  const f = fin.buildInvoiceFilter({ status: 'overdue', clientId: '3', search: "o'hara" });
  assert.match(f.text, /b\.status = \$1 AND b\.client_id = \$2 AND \(b\.invoice_number ILIKE \$3/);
  assert.deepEqual(f.params, ['overdue', '3', "%o'hara%"]);
  const open = fin.buildInvoiceFilter({ status: 'open' });
  assert.match(open.text, /b\.status IN \('sent', 'partial', 'overdue'\)/);
  assert.equal(fin.buildInvoiceFilter({ status: 'x; DROP' }).text, '');
});
await check('lista: recuento por estado para las pastillas', async () => {
  reset((t) => {
    if (/GROUP BY b\.status/.test(t)) return { rows: [{ status: 'sent', n: 2 }, { status: 'overdue', n: 1 }, { status: 'draft', n: 3 }] };
    if (/COUNT\(\*\)::int AS n FROM/.test(t)) return { rows: [{ n: 6 }] };
    return { rows: [{ id: '1', status: 'overdue' }] };
  });
  const out = await fin.listInvoices({ status: 'overdue' });
  assert.equal(out.rows[0].is_overdue, true);
  assert.equal(out.counts.all, 6);
  assert.equal(out.counts.open, 3);
  assert.equal(out.counts.paid, 0);
});
await check('estado derivado en SQL: vencida por fecha de Houston, borrador sin pagos no vence', () => {
  const s = fin.sqlEffectiveStatus();
  assert.match(s, /due_date < \(now\(\) AT TIME ZONE 'America\/Chicago'\)::date THEN 'overdue'/);
  assert.ok(s.indexOf("'draft' AND") < s.indexOf("'overdue'"), 'el borrador se decide antes que la fecha');
});
await check('FIN-11: Por cobrar y Vencido sin borradores; tramo comparable del mes anterior', async () => {
  reset((t) => {
    if (/AS prev_same/.test(t)) return { rows: [{ cents: '42000', prev_same: '21000' }] };
    if (/AS ar,/.test(t)) return { rows: [{ ar: '242000', open_n: 4, overdue: '105000', overdue_n: 2, draft: '12000', draft_n: 1, total_n: 10 }] };
    if (/FROM company_expenses/.test(t)) return { rows: [{ cents: '10399' }] };
    if (/FROM subscriptions/.test(t)) return { rows: [{ cents: '24339', n: 7 }] };
    if (/FROM clients/.test(t)) return { rows: [{ n: 6 }] };
    return { rows: [] };
  });
  const s = await fin.financeSummary();
  const arQ = log.find((e) => /AS ar,/.test(e.text)).text;
  assert.match(arQ, /status IN \('sent','partial','overdue'\)\), 0\)::bigint AS ar/);
  assert.equal(s.ar_total_cents, 242000);
  assert.equal(s.draft_total_cents, 12000);
  assert.equal(s.collected_prev_same_period_cents, 21000);
  assert.equal(s.net_this_month_cents, 42000 - 10399 - 24339);
  assert.equal(s.counts.open_invoices, 4);
  assert.equal(s.subscriptions_active, 7);
});

// ════════════════════════════════════════════════════════════════
//  lib/expenses.mjs con base falsa
// ════════════════════════════════════════════════════════════════
await check('gastos: filtro por mes y categoría, con la suma de todo lo filtrado (FIN-21)', async () => {
  reset((t) => (/COUNT/.test(t) ? { rows: [{ n: 2, cents: '10399' }] } : { rows: [] }));
  const out = await exp.listExpenses({ month: '2026-10', category: 'Hosting', limit: 20, offset: 20 });
  assert.equal(out.total_cents, 10399);
  const q = log[0];
  assert.match(q.text, /WHERE spent_at >= \$1 AND spent_at < \$2 AND category = \$3/);
  assert.deepEqual(q.params, ['2026-10-01', '2026-11-01', 'hosting', 20, 20]);
});
await check('gastos: monto > 0, categoría normalizada y fecha de Houston por defecto', async () => {
  reset(() => ({ rows: [{ id: '1' }] }));
  await assert.rejects(exp.createExpense({ label: 'Dominio', amount_cents: 0 }), /mayor que \$0/);
  await assert.rejects(exp.createExpense({ label: '  ', amount_cents: 100 }), /concepto/);
  await exp.createExpense({ label: 'Dominio', amount_cents: 2499, category: 'Hospedaje' });
  const ins = log.find((e) => /INSERT INTO company_expenses/.test(e.text));
  const { houstonDate } = await import('../lib/dates.mjs');
  assert.equal(ins.params[1], 'hosting');
  assert.equal(ins.params[3], houstonDate());
});
await check('gastos: editar (PATCH) con SET parametrizado y validación', async () => {
  reset(() => ({ rows: [{ id: '4', label: 'Nuevo' }] }));
  const r = await exp.updateExpense('4', { label: 'Nuevo', amount_cents: 1500, category: 'otro', hack: 'x' });
  assert.equal(r.label, 'Nuevo');
  assert.match(log[0].text, /UPDATE company_expenses SET label = \$1, category = \$2, amount_cents = \$3 WHERE id = \$4/);
  await assert.rejects(exp.updateExpense('4', { amount_cents: -5 }), /mayor que \$0/);
  assert.equal(await exp.updateExpense('abc', { label: 'x' }), null);
});
await check('suscripciones: próximo cargo sale avanzado y la fecha guardada se conserva', async () => {
  reset(() => ({ rows: [{ id: '1', name: 'Vercel', cycle: 'monthly', next_charge_at: new Date('2020-01-12T00:00:00Z'), active: true }] }));
  const rows = await exp.listSubscriptions();
  assert.equal(rows[0].next_charge_anchor, '2020-01-12');
  assert.ok(rows[0].next_charge_at >= (await import('../lib/dates.mjs')).houstonDate());
  assert.equal(rows[0].next_charge_at.slice(8), '12');
});

// ════════════════════════════════════════════════════════════════
//  Handlers (sesión simulada)
// ════════════════════════════════════════════════════════════════
function fakeRes() {
  const r = { statusCode: 200, body: null, headers: {} };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  return r;
}
const invoicesH = (await import('../api/admin/invoices.mjs')).default;
const invoiceIdH = (await import('../api/admin/invoices/[id].mjs')).default;
const paymentsH = (await import('../api/admin/payments.mjs')).default;
const paymentIdH = (await import('../api/admin/payments/[id].mjs')).default;
const expenseIdH = (await import('../api/admin/expenses/[id].mjs')).default;

await check('POST /invoices con $0 → 400 con mensaje legible (sin nombres de columna)', async () => {
  reset();
  const res = fakeRes();
  await invoicesH({ method: 'POST', body: { client_id: 3, amount_cents: 0 }, query: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.ok, false);
  assert.ok(!/[a-z]+_[a-z]/.test(res.body.error), res.body.error);
});
await check('POST /payments sobre el saldo → 409 con el saldo', async () => {
  reset(invoiceDb({ paid: 900 }));
  const res = fakeRes();
  await paymentsH({ method: 'POST', body: { invoice_id: 5, amount_cents: 400 }, query: {} }, res);
  assert.equal(res.statusCode, 409);
  assert.match(res.body.error, /\$1\.00/);
});
await check('GET /invoices/INV-004 abre la ficha por número (enlace profundo)', async () => {
  reset((t, p) => (/b\.invoice_number = \$1/.test(t) ? { rows: [{ id: '4', invoice_number: p[0], status: 'sent' }] } : { rows: [] }));
  const res = fakeRes();
  await invoiceIdH({ method: 'GET', query: { id: 'inv-004' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.invoice.invoice_number, 'INV-004');
  const res2 = fakeRes();
  await invoiceIdH({ method: 'DELETE', query: { id: 'INV-004' } }, res2);
  assert.equal(res2.statusCode, 400); // borrar solo por id numérico
});
await check('PATCH /invoices/:id sin cambios → 400; DELETE con pagos → 409', async () => {
  reset((t) => (/FROM invoices WHERE id = \$1 LIMIT 1/.test(t) ? { rows: [{ id: '5' }] } : { rows: [] }));
  const r1 = fakeRes();
  await invoiceIdH({ method: 'PATCH', query: { id: '5' }, body: { foo: 1 } }, r1);
  assert.equal(r1.statusCode, 400);
  const r2 = fakeRes();
  await invoiceIdH({ method: 'DELETE', query: { id: '5' } }, r2);
  assert.equal(r2.statusCode, 409);
});
await check('/payments/:id: 404 si no existe; ID inválido → 400', async () => {
  reset();
  const r1 = fakeRes();
  await paymentIdH({ method: 'DELETE', query: { id: '12' } }, r1);
  assert.equal(r1.statusCode, 404);
  const r2 = fakeRes();
  await paymentIdH({ method: 'PATCH', query: { id: '1;x' }, body: {} }, r2);
  assert.equal(r2.statusCode, 400);
});
await check('PATCH /expenses/:id con monto inválido → 400 legible', async () => {
  reset();
  const res = fakeRes();
  await expenseIdH({ method: 'PATCH', query: { id: '4' }, body: { amount_cents: 0 } }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /mayor que \$0/);
});

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) de Finanzas fallaron:\n - ` + fails.join('\n - '));
  process.exit(1);
}
console.log(`✓ ${pass} pruebas de Finanzas pasaron.`);
