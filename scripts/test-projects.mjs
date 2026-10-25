// ════════════════════════════════════════════════════════════════
//  scripts/test-projects.mjs  ·  npm run test:projects
//  Pruebas de Progreso (A5) SIN base de datos y SIN red:
//    · Validadores puros de lib/projects.mjs (montos, brief, cliente,
//      cambios de proyecto y de hito, orden de hitos, resumen global).
//    · Handlers de api/admin/projects/** con una base falsa
//      (scripts/fixtures/fake-postgres.mjs) y sesión falsa
//      (scripts/fixtures/fake-auth.mjs): se comprueba qué responden y QUÉ
//      SQL lanzan (p. ej. que el PATCH/DELETE de hitos filtra por proyecto).
//    · Formatos del panel (src/components/dashboard/progreso/format.js).
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FAKE_PG = pathToFileURL(path.join(HERE, 'fixtures', 'fake-postgres.mjs')).href;
const FAKE_AUTH = pathToFileURL(path.join(HERE, 'fixtures', 'fake-auth.mjs')).href;

// Redirige @vercel/postgres y lib/auth.mjs a los sustitutos (solo en este proceso).
const hooks = `
export async function resolve(spec, ctx, next) {
  if (spec === '@vercel/postgres') return { url: ${JSON.stringify(FAKE_PG)}, shortCircuit: true };
  const r = await next(spec, ctx);
  if (r.url.endsWith('/lib/auth.mjs')) return { url: ${JSON.stringify(FAKE_AUTH)}, shortCircuit: true };
  return r;
}`;
register('data:text/javascript,' + encodeURIComponent(hooks));

const P = await import('../lib/projects.mjs');
const listHandler = (await import('../api/admin/projects.mjs')).default;
const idHandler = (await import('../api/admin/projects/[id].mjs')).default;
const msHandler = (await import('../api/admin/projects/[id]/milestones.mjs')).default;
const F = await import('../src/components/dashboard/progreso/format.js');

let pass = 0;
const fails = [];
async function check(name, fn) {
  try { await fn(); pass++; } catch (e) { fails.push(name + ' → ' + e.message); }
}

// ── Base falsa ───────────────────────────────────────────────────
// db(rules): cada regla [regex, rows | (values, text) => rows]; la primera que
// casa con el texto responde. Sin regla → error (consulta inesperada).
function db(rules) {
  globalThis.__fakeDbLog = [];
  globalThis.__fakeDb = (text, values) => {
    for (const [re, out] of rules) if (re.test(text)) return typeof out === 'function' ? out(values, text) : out;
    throw new Error('consulta inesperada: ' + text.replace(/\s+/g, ' ').slice(0, 120));
  };
}
const log = () => globalThis.__fakeDbLog || [];
function call(handler, { method = 'GET', query = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200, headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.statusCode = c; return this; },
      json(o) { resolve({ status: this.statusCode, body: o }); return this; },
    };
    Promise.resolve(handler({ method, query, body, headers: {} }, res)).catch(reject);
  });
}
const PROJ = {
  id: '42', project_code: 'PRJ-042', client_id: '7', brief_project_id: null, name: 'Sitio web',
  service_type: 'web', agreed_amount_cents: '150000', status: 'on_hold', started_at: null,
  completed_at: null, created_at: '2026-10-01T15:00:00.000Z', updated_at: '2026-10-01T15:00:00.000Z',
  client_name: 'Taquería', client_code: 'CLI-007', invoices_count: 2,
};
const PROGRESS = [{ total: 3, done: 1, in_progress: 1, pending: 1 }];
const MS_LIST = [
  { id: '100', project_id: '42', label: 'Brief', status: 'done', position: 0 },
  { id: '101', project_id: '42', label: 'Diseño', status: 'in_progress', position: 1 },
  { id: '102', project_id: '42', label: 'Entrega', status: 'pending', position: 2 },
];
const BASE = [
  [/FROM projects p LEFT JOIN clients c/, [PROJ]],
  [/FROM project_milestones\s+WHERE project_id = \$1\s+ORDER BY/, MS_LIST],
  [/COUNT\(\*\) FILTER \(WHERE status = 'pending'\)/, PROGRESS],
];

// ── Validadores puros ────────────────────────────────────────────
await check('isValidDay: días reales sí, imposibles no', () => {
  assert.ok(P.isValidDay('2026-10-19'));
  assert.ok(P.isValidDay('2028-02-29'));
  assert.ok(!P.isValidDay('2026-02-29'));
  assert.ok(!P.isValidDay('2026-13-01'));
  assert.ok(!P.isValidDay('19/10/2026'));
  assert.ok(!P.isValidDay(''));
});
await check('parseCentsInput: vaciar el monto = $0 (MOCK-06), no NULL', () => {
  assert.deepEqual(P.parseCentsInput(''), { cents: 0 });
  assert.deepEqual(P.parseCentsInput(null), { cents: 0 });
  assert.deepEqual(P.parseCentsInput(undefined), { skip: true });
  assert.deepEqual(P.parseCentsInput('150000'), { cents: 150000 });
  assert.ok(P.parseCentsInput(-5).error);
  assert.ok(P.parseCentsInput('abc').error);
  assert.ok(P.parseCentsInput(P.MAX_CENTS + 1).error);
});
await check('normalizeBriefId: formato MRC y desvincular', () => {
  assert.deepEqual(P.normalizeBriefId(' mrc-017 '), { value: 'MRC-017' });
  assert.deepEqual(P.normalizeBriefId(''), { value: null });
  assert.deepEqual(P.normalizeBriefId(undefined), { skip: true });
  assert.ok(P.normalizeBriefId('017').error);
  assert.ok(P.normalizeBriefId("MRC-1'; DROP").error);
});
await check('normalizeProjectPatch: solo las claves que vienen', () => {
  assert.deepEqual(P.normalizeProjectPatch({ name: '  Nuevo  ' }).fields, { name: 'Nuevo' });
  assert.deepEqual(P.normalizeProjectPatch({ agreedAmountCents: '' }).fields, { agreedAmountCents: 0 });
  assert.deepEqual(P.normalizeProjectPatch({ briefProjectId: null }).fields, { briefProjectId: null });
  assert.deepEqual(P.normalizeProjectPatch({ clientId: '7', serviceType: '' }).fields, { clientId: '7', serviceType: null });
  assert.ok(P.normalizeProjectPatch({ name: '' }).error);
  assert.ok(P.normalizeProjectPatch({ status: 'hecho' }).error);
  assert.ok(P.normalizeProjectPatch({ clientId: '' }).error, 'quitar el cliente no se permite');
  assert.ok(P.normalizeProjectPatch({ clientId: 'abc' }).error);
});
await check('normalizeMilestonePatch: nombre, fecha (y quitarla) y estado', () => {
  assert.deepEqual(P.normalizeMilestonePatch({ label: ' Fotos ' }).fields, { label: 'Fotos' });
  assert.deepEqual(P.normalizeMilestonePatch({ dueDate: '' }).fields, { dueDate: null });
  assert.deepEqual(P.normalizeMilestonePatch({ dueDate: '2026-11-03' }).fields, { dueDate: '2026-11-03' });
  assert.ok(P.normalizeMilestonePatch({ dueDate: '2026-11-31' }).error);
  assert.ok(P.normalizeMilestonePatch({ label: '   ' }).error);
  assert.ok(P.normalizeMilestonePatch({ label: 'x'.repeat(P.MAX_LABEL + 1) }).error);
  assert.ok(P.normalizeMilestonePatch({ status: 'cancelled' }).error);
});
await check('validateOrder: exactamente los hitos del proyecto', () => {
  assert.deepEqual(P.validateOrder(['3', 1, '2'], ['1', '2', '3']), { ids: ['3', '1', '2'] });
  assert.equal(P.validateOrder(['1', '2'], ['1', '2', '3']).status, 409, 'falta uno');
  assert.equal(P.validateOrder(['1', '1', '2'], ['1', '2']).status, 409, 'repetido');
  assert.equal(P.validateOrder(['1', '99'], ['1', '2']).status, 409, 'ajeno');
  assert.ok(P.validateOrder([], ['1']).error);
  assert.ok(P.validateOrder(['x'], ['1']).error);
});
await check('summarizeStatusRows: cartera solo de activos; pausa aparte (OP-11, MOCK-13)', () => {
  const s = P.summarizeStatusRows([
    { status: 'active', n: 3, cents: '412000' }, { status: 'on_hold', n: 1, cents: '120000' },
    { status: 'completed', n: 2, cents: '270000' }, { status: 'cancelled', n: 1, cents: '30000' },
  ]);
  assert.equal(s.total, 7);
  assert.deepEqual(s.by_status, { active: 3, on_hold: 1, completed: 2, cancelled: 1 });
  assert.equal(s.active_cents, '412000');
  assert.equal(s.on_hold_cents, '120000');
});
await check('parseProjectRef: id numérico o código PRJ', () => {
  assert.deepEqual(P.parseProjectRef('42'), { id: '42' });
  assert.deepEqual(P.parseProjectRef('prj-003'), { code: 'PRJ-003' });
  assert.equal(P.parseProjectRef('42; DROP'), null);
  assert.equal(P.parseProjectRef(''), null);
});

// ── Lista ────────────────────────────────────────────────────────
await check('GET lista: trae summary global aunque se filtre', async () => {
  db([
    [/WHERE p.status = \$1\s+ORDER BY/, [PROJ]],
    [/SELECT COUNT\(\*\)::int AS n FROM projects WHERE status/, [{ n: 1 }]],
    [/FROM project_milestones\s+WHERE project_id = ANY/, [{ project_id: '42', total: 3, done: 1 }]],
    [/GROUP BY status/, [{ status: 'active', n: 3, cents: '412000' }, { status: 'on_hold', n: 1, cents: '150000' }]],
  ]);
  const r = await call(listHandler, { query: { status: 'on_hold' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.rows[0].progress, 33);
  assert.equal(r.body.summary.by_status.active, 3, 'el filtro no recorta el resumen');
  assert.equal(r.body.summary.active_cents, '412000');
});

// ── Crear ────────────────────────────────────────────────────────
await check('POST: brief inexistente → 400 claro y SIN insertar nada (OP-09)', async () => {
  db([[/FROM briefs WHERE project_id/, []]]);
  const r = await call(listHandler, { method: 'POST', body: { name: 'X', briefProjectId: 'mrc-099' } });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /MRC-099 no existe/);
  assert.ok(!log().some((q) => /INSERT/.test(q.text)), 'no debe insertar');
});
await check('POST: cliente inexistente → 400, ya no cae en "Directo" (CRM-05)', async () => {
  db([[/SELECT id, status FROM clients WHERE id/, []]]);
  const r = await call(listHandler, { method: 'POST', body: { name: 'X', clientId: '999' } });
  assert.equal(r.status, 400);
  assert.ok(!log().some((q) => /Directo|INSERT/.test(q.text)));
});
await check('POST: con cliente elegido usa ese cliente y fecha de inicio de Houston', async () => {
  let inserted;
  db([
    [/SELECT id, status FROM clients WHERE id/, [{ id: '7' }]],
    [/INSERT INTO projects/, (v) => { inserted = v; return [{ id: '42' }]; }],
    [/seed_default_milestones/, [{}]],
    ...BASE,
  ]);
  const r = await call(listHandler, { method: 'POST', body: { name: 'Sitio', clientId: '7', agreedAmountCents: '150000', status: 'active' } });
  assert.equal(r.status, 201);
  assert.equal(inserted[1], '7', 'client_id');
  assert.match(inserted[6], /^\d{4}-\d{2}-\d{2}$/, 'started_at como día');
});
await check('POST: creado como completado lleva inicio y entrega (A5-R3)', async () => {
  let inserted;
  db([
    [/SELECT id, status FROM clients WHERE id/, [{ id: '7' }]],
    [/INSERT INTO projects/, (v) => { inserted = v; return [{ id: '42' }]; }],
    [/seed_default_milestones/, [{}]],
    ...BASE,
  ]);
  const r = await call(listHandler, { method: 'POST', body: { name: 'Sitio', clientId: '7', status: 'completed' } });
  assert.equal(r.status, 201);
  assert.match(inserted[6], /^\d{4}-\d{2}-\d{2}$/, 'started_at');
  assert.equal(inserted[7], inserted[6], 'completed_at = mismo día');
});
await check('POST: en pausa no lleva fechas', async () => {
  let inserted;
  db([
    [/SELECT id, status FROM clients WHERE id/, [{ id: '7' }]],
    [/INSERT INTO projects/, (v) => { inserted = v; return [{ id: '42' }]; }],
    [/seed_default_milestones/, [{}]],
    ...BASE,
  ]);
  await call(listHandler, { method: 'POST', body: { name: 'Sitio', clientId: '7', status: 'on_hold' } });
  assert.equal(inserted[6], null);
  assert.equal(inserted[7], null);
});

// ── Cliente del brief (revisión int1, F1) y archivados (F2) ──────
// El brief MRC-021 llegó con el correo de CLI-003, que nació de MRC-010; en la
// ficha del brief se eligió "Usar este" (vínculo SOLO por evento).
const BRIEF21 = { project_id: 'MRC-021', business_name: 'Tacos Sol', owner_name: 'Rosa', email: 'rosa@sol.test', phone: '(713) 555-0118', city_state: 'Houston, TX', summary: null };
const CLI3 = { id: '3', client_code: 'CLI-003', business_name: 'Tacos Sol Centro', email: 'rosa@sol.test', status: 'active', source_brief_id: 'MRC-010' };
function briefRules({ linked = null, dup = [], onInsert } = {}) {
  return [
    [/SELECT 1 FROM briefs WHERE project_id/, [{ '?column?': 1 }]],
    [/SELECT \* FROM briefs WHERE project_id/, [BRIEF21]],
    [/FROM clients WHERE source_brief_id/, []],
    [/FROM brief_events[\s\S]*converted_to_client/, linked ? [linked] : []],
    [/LOWER\(email\)/, dup],
    [/INSERT INTO clients/, (v, t) => { onInsert?.(v, t); return [{ id: '9', client_code: 'CLI-009', business_name: 'Tacos Sol', status: 'active' }]; }],
    [/INSERT INTO brief_events/, []],
  ];
}
await check('POST con "cliente del brief": si el brief se vinculó por evento usa ESE cliente y no crea otro', async () => {
  let inserted;
  db([
    ...briefRules({ linked: CLI3 }),
    [/INSERT INTO projects/, (v) => { inserted = v; return [{ id: '42' }]; }],
    [/seed_default_milestones/, [{}]],
    ...BASE,
  ]);
  const r = await call(listHandler, { method: 'POST', body: { name: 'Segundo sitio', briefProjectId: 'mrc-021' } });
  assert.equal(r.status, 201);
  assert.equal(inserted[1], '3', 'el proyecto queda con CLI-003, el de la ficha del brief');
  assert.ok(!log().some((q) => /INSERT INTO clients/.test(q.text)), 'sin cliente duplicado');
  assert.ok(!log().some((q) => /INSERT INTO brief_events/.test(q.text)), 'sin evento nuevo: ya estaba vinculado');
});
await check('POST con "cliente del brief": correo o teléfono de otro cliente → 409 con coincidencias y sin crear nada', async () => {
  db([...briefRules({ dup: [CLI3] }), ...BASE]);
  const r = await call(listHandler, { method: 'POST', body: { name: 'Sitio', briefProjectId: 'MRC-021' } });
  assert.equal(r.status, 409);
  assert.equal(r.body.reason, 'duplicate');
  assert.equal(r.body.matches[0].client_code, 'CLI-003');
  assert.ok(!log().some((q) => /INSERT/.test(q.text)), 'ni cliente ni proyecto');
});
await check('POST con "cliente del brief" y "crear igualmente": crea el cliente con su evento y su autor', async () => {
  let client, inserted;
  db([
    ...briefRules({ dup: [CLI3], onInsert: (v) => { client = v; } }),
    [/INSERT INTO projects/, (v) => { inserted = v; return [{ id: '42' }]; }],
    [/seed_default_milestones/, [{}]],
    ...BASE,
  ]);
  const r = await call(listHandler, { method: 'POST', body: { name: 'Sitio', briefProjectId: 'MRC-021', allow_duplicate: true } });
  assert.equal(r.status, 201);
  assert.ok(client.includes('MRC-021'), 'el cliente nuevo nace del brief');
  assert.equal(inserted[1], '9');
  assert.ok(!log().some((q) => /LOWER\(email\)/.test(q.text)), 'no vuelve a mirar duplicados');
  const ev = log().find((q) => /INSERT INTO brief_events/.test(q.text));
  assert.ok(ev, 'deja el converted_to_client');
  assert.equal(ev.values[1], 'prueba@marcyan.test', 'con el autor');
});
await check('POST con cliente archivado → 409 en texto llano y sin crear el proyecto', async () => {
  db([[/SELECT id, status FROM clients WHERE id/, [{ id: '5', status: 'archived' }]], ...BASE]);
  const r = await call(listHandler, { method: 'POST', body: { name: 'Sitio', clientId: '5' } });
  assert.equal(r.status, 409);
  assert.match(r.body.error, /archivado\. Reactívalo en su ficha/);
  assert.ok(!log().some((q) => /INSERT/.test(q.text)));
});
await check('PATCH: pasar el proyecto a un cliente archivado → 409 sin tocar el proyecto', async () => {
  db([[/SELECT status FROM clients WHERE id/, [{ status: 'archived' }]], ...BASE]);
  const r = await call(idHandler, { method: 'PATCH', query: { id: '42' }, body: { clientId: '5' } });
  assert.equal(r.status, 409);
  assert.ok(!log().some((q) => /UPDATE/.test(q.text)));
});

// ── Ficha ────────────────────────────────────────────────────────
await check('GET ficha por código PRJ (enlace profundo)', async () => {
  db(BASE);
  const r = await call(idHandler, { query: { id: 'PRJ-042' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.project.invoices_count, 2);
  assert.ok(log()[0].text.includes('p.project_code = $1'));
  assert.equal(log()[0].values[0], 'PRJ-042');
});
await check('PATCH: vaciar el monto guarda 0, no NULL (MOCK-06)', async () => {
  let upd;
  db([[/UPDATE projects/, (v) => { upd = v; return [{ id: '42' }]; }], ...BASE]);
  const r = await call(idHandler, { method: 'PATCH', query: { id: '42' }, body: { agreedAmountCents: '' } });
  assert.equal(r.status, 200);
  assert.equal(upd[2], 0);
});
await check('PATCH: al pasar a activo fija started_at si faltaba (OP-08)', async () => {
  let text;
  db([[/UPDATE projects/, (v, t) => { text = t; return [{ id: '42' }]; }], ...BASE]);
  await call(idHandler, { method: 'PATCH', query: { id: '42' }, body: { status: 'active' } });
  assert.match(text, /started_at = CASE\s+WHEN \$\d+::text = 'active' THEN COALESCE\(started_at, \$\d+::date\)/);
});
await check('PATCH: brief inexistente → 400 claro', async () => {
  db([[/FROM briefs WHERE project_id/, []], ...BASE]);
  const r = await call(idHandler, { method: 'PATCH', query: { id: '42' }, body: { briefProjectId: 'MRC-404' } });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /MRC-404 no existe/);
  assert.ok(!log().some((q) => /UPDATE/.test(q.text)));
});
await check('PATCH: cambiar cliente y desvincular brief', async () => {
  let upd;
  db([
    [/SELECT status FROM clients WHERE id/, [{ status: 'active' }]],
    [/UPDATE projects/, (v) => { upd = v; return [{ id: '42' }]; }],
    ...BASE,
  ]);
  const r = await call(idHandler, { method: 'PATCH', query: { id: '42' }, body: { clientId: '9', briefProjectId: '' } });
  assert.equal(r.status, 200);
  assert.equal(upd[4], '9');
  assert.equal(upd[5], null);
});
await check('PATCH: nombre vacío → 400 sin tocar la base', async () => {
  db(BASE);
  const r = await call(idHandler, { method: 'PATCH', query: { id: '42' }, body: { name: '  ' } });
  assert.equal(r.status, 400);
  assert.equal(log().length, 0);
});
await check('DELETE: responde cuántas facturas se desvincularon (OP-29)', async () => {
  db([[/DELETE FROM project_milestones/, []], [/DELETE FROM projects/, [{ id: '42' }]], ...BASE]);
  const r = await call(idHandler, { method: 'DELETE', query: { id: '42' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.unlinked_invoices, 2);
});

// ── Hitos ────────────────────────────────────────────────────────
await check('PATCH hito: filtra por proyecto de la URL (OP-26, MOCK-07)', async () => {
  let text, values;
  db([[/UPDATE project_milestones/, (v, t) => { text = t; values = v; return []; }], ...BASE]);
  const r = await call(msHandler, { method: 'PATCH', query: { id: '42' }, body: { milestoneId: '555', label: 'Otro' } });
  assert.equal(r.status, 404, 'hito de otro proyecto');
  assert.match(text, /WHERE id = \$\d+ AND project_id = \$\d+/);
  assert.ok(values.includes('555') && values.includes('42'));
});
await check('PATCH hito: renombrar, fecha y estado en una sola consulta', async () => {
  let values;
  db([[/UPDATE project_milestones/, (v) => { values = v; return [MS_LIST[1]]; }], ...BASE]);
  const r = await call(msHandler, { method: 'PATCH', query: { id: '42' }, body: { milestoneId: '101', label: 'Diseño final', dueDate: '2026-11-03', status: 'done' } });
  assert.equal(r.status, 200);
  assert.ok(values.includes('Diseño final') && values.includes('2026-11-03') && values.includes('done'));
  assert.equal(r.body.milestones.length, 3);
});
await check('PATCH hito: quitar la fecha', async () => {
  let values;
  db([[/UPDATE project_milestones/, (v) => { values = v; return [MS_LIST[1]]; }], ...BASE]);
  const r = await call(msHandler, { method: 'PATCH', query: { id: '42' }, body: { milestoneId: '101', dueDate: '' } });
  assert.equal(r.status, 200);
  assert.equal(values[2], true, 'hasDue');
  assert.equal(values[3], null, 'due_date = NULL');
});
await check('PATCH hito: compatibilidad { milestoneId, status }', async () => {
  db([[/UPDATE project_milestones/, [MS_LIST[2]]], ...BASE]);
  const r = await call(msHandler, { method: 'PATCH', query: { id: '42' }, body: { milestoneId: 102, status: 'in_progress' } });
  assert.equal(r.status, 200);
});
await check('PATCH por etapa: etapa inexistente sin nombre → 404 claro, no 500 (A5-R4)', async () => {
  db([[/SELECT id FROM project_milestones WHERE project_id = \$1 AND stage/, []], ...BASE]);
  const r = await call(msHandler, { method: 'PATCH', query: { id: '42' }, body: { stage: 'qa', status: 'done' } });
  assert.equal(r.status, 404);
  assert.match(r.body.error, /etapa «qa»/);
  assert.ok(!log().some((q) => /INSERT/.test(q.text)));
});
await check('PATCH por etapa: nombre demasiado largo → 400 sin tocar la base (A5-R4)', async () => {
  db(BASE);
  const r = await call(msHandler, { method: 'PATCH', query: { id: '42' }, body: { stage: 'design', status: 'done', label: 'x'.repeat(P.MAX_LABEL + 1) } });
  assert.equal(r.status, 400);
  assert.ok(!log().some((q) => /project_milestones WHERE project_id = \$1 AND stage|UPDATE|INSERT/.test(q.text)));
});
await check('PATCH hito: sin cambios o fecha mala → 400', async () => {
  db(BASE);
  assert.equal((await call(msHandler, { method: 'PATCH', query: { id: '42' }, body: { milestoneId: '101' } })).status, 400);
  assert.equal((await call(msHandler, { method: 'PATCH', query: { id: '42' }, body: { milestoneId: '101', dueDate: '2026-02-30' } })).status, 400);
});
await check('PATCH orden: reordena en una sentencia, filtrando por proyecto', async () => {
  let text, values;
  db([
    [/SELECT id FROM project_milestones WHERE project_id/, MS_LIST.map((m) => ({ id: m.id }))],
    [/UPDATE project_milestones AS m/, (v, t) => { text = t; values = v; return []; }],
    ...BASE,
  ]);
  const r = await call(msHandler, { method: 'PATCH', query: { id: '42' }, body: { order: ['102', '100', '101'] } });
  assert.equal(r.status, 200);
  assert.match(text, /WITH ORDINALITY/);
  assert.match(text, /m\.project_id = \$\d+/);
  assert.deepEqual(values[0], ['102', '100', '101']);
});
await check('PATCH orden: lista desfasada → 409 sin escribir', async () => {
  db([[/SELECT id FROM project_milestones WHERE project_id/, MS_LIST.map((m) => ({ id: m.id }))], ...BASE]);
  const r = await call(msHandler, { method: 'PATCH', query: { id: '42' }, body: { order: ['102', '100'] } });
  assert.equal(r.status, 409);
  assert.ok(!log().some((q) => /UPDATE/.test(q.text)));
});
await check('DELETE hito: solo del proyecto de la URL', async () => {
  let text;
  db([[/DELETE FROM project_milestones WHERE id/, (v, t) => { text = t; return []; }], ...BASE]);
  const r = await call(msHandler, { method: 'DELETE', query: { id: '42', milestoneId: '555' } });
  assert.equal(r.status, 404);
  assert.match(text, /AND project_id = \$\d+/);
});
await check('DELETE hito: borra y devuelve la lista nueva', async () => {
  db([[/DELETE FROM project_milestones WHERE id/, [{ id: '102' }]], ...BASE]);
  const r = await call(msHandler, { method: 'DELETE', query: { id: '42', milestoneId: '102' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.deleted, '102');
  assert.ok(Array.isArray(r.body.milestones));
});
await check('POST hito: fecha inválida → 400', async () => {
  db(BASE);
  const r = await call(msHandler, { method: 'POST', query: { id: '42' }, body: { label: 'Fotos', dueDate: '31/10/2026' } });
  assert.equal(r.status, 400);
});

// ── Formatos del panel ───────────────────────────────────────────
await check('format: montos que escribe el dueño', () => {
  assert.deepEqual(F.parseMoneyToCents('1500'), { cents: 150000 });
  assert.deepEqual(F.parseMoneyToCents('$1,500'), { cents: 150000 });
  assert.deepEqual(F.parseMoneyToCents('1.500'), { cents: 150000 });
  assert.deepEqual(F.parseMoneyToCents('1,250,000'), { cents: 125000000 });
  assert.deepEqual(F.parseMoneyToCents('1500.50'), { cents: 150050 });
  assert.deepEqual(F.parseMoneyToCents('1500,5'), { cents: 150050 });
  assert.deepEqual(F.parseMoneyToCents('1.500,75'), { cents: 150075 });
  assert.deepEqual(F.parseMoneyToCents(''), { cents: 0, empty: true });
  assert.ok(F.parseMoneyToCents('mil').error);
  assert.ok(F.parseMoneyToCents('1.50.0').error);
});
await check('format: centavos al campo y a pantalla', () => {
  assert.equal(F.centsToInput('150000'), '1500');
  assert.equal(F.centsToInput(150050), '1500.50');
  assert.equal(F.centsToInput(0), '');
  assert.equal(F.fmtMoney('150000'), '$1,500');
  assert.equal(F.fmtMoney(null), '—');
});
await check('format: activo y completado con colores distintos (OP-32)', () => {
  assert.notEqual(F.pStatus('active').tone, F.pStatus('completed').tone);
  assert.equal(F.pStatus('completed').tone, F.mStatus('done').tone, 'hecho = completado');
  assert.equal(F.pStatus('active').tone, F.mStatus('in_progress').tone, 'en curso = activo');
  assert.ok(!F.P_STATUSES.some((s) => s.tone === 'accent'), 'el naranja no es un estado');
});
await check('format: filtros legibles en la URL y servicios con nombre', () => {
  assert.equal(F.statusFromSlug('pausa'), 'on_hold');
  assert.equal(F.slugFromStatus('completed'), 'completado');
  assert.equal(F.statusFromSlug('raro'), '');
  assert.equal(F.serviceLabel('aeo'), 'SEO para IA');
  assert.equal(F.serviceLabel('Mantenimiento'), 'Mantenimiento');
});
await check('format: la fecha escrita a medias no se guarda (A5-R1)', () => {
  assert.ok(F.isCompleteDay('2026-10-25'));
  assert.ok(!F.isCompleteDay('0002-10-19'), 'primera cifra del año');
  assert.ok(!F.isCompleteDay('0202-10-19'));
  assert.ok(!F.isCompleteDay(''));
  assert.ok(!F.isCompleteDay(undefined));
});
await check('format: mover hitos y recortar etiquetas', () => {
  assert.deepEqual(F.moveItem([1, 2, 3], 2, 0), [3, 1, 2]);
  assert.deepEqual(F.moveItem([1, 2, 3], 0, 5), [1, 2, 3]);
  assert.equal(F.truncateLabel('Fotos del local (sesión)', 12), 'Fotos del l…');
  assert.equal(F.truncateLabel('Brief', 12), 'Brief');
});

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) de Progreso fallaron:\n - ` + fails.join('\n - '));
  process.exit(1);
}
console.log(`✓ ${pass} pruebas de Progreso pasaron.`);
