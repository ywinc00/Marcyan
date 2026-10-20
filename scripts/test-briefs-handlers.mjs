// ════════════════════════════════════════════════════════════════
//  scripts/test-briefs-handlers.mjs  ·  npm run test:briefs-handlers
//  EJECUTA los handlers de Briefs del panel (revisión A3-03) SIN base de
//  datos, SIN Blob y SIN correo: un gancho de carga de módulos de Node
//  sustituye, solo para api/admin/briefs/**, las funciones de lib/db.mjs,
//  lib/auth.mjs, lib/finance.mjs, lib/brief-files.mjs y lib/email.mjs por
//  dobles que cada prueba define. Una función sin doble LANZA (nunca llega a
//  la base real). Lo puro (esquema, prepareBriefEdits, briefData) es el real.
//  Cubre los códigos de cada rama:
//    · PATCH  400 por campo, 400 de estado, 404, 503 sin la 010, 200 con
//             cambios y evento 'brief_edited'.
//    · POST   400 acción, 400 cliente, 404 brief, 201 creado, 200 'already',
//             409 otro cliente, 404 cliente inexistente, 200 vinculado,
//             409 duplicado y "crear igualmente" (integración CRM), 409 al
//             vincular un cliente archivado (revisión int1), y un solo
//             evento 'converted_to_client' al crear (lo escribe finance).
//    · events POST de notas (400, 201 con { event }) y GET.
//    · email  el cuerpo queda en el historial.
//    · 401 sin sesión antes de leer nada.
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import path from 'node:path';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── Gancho de carga: dobles solo para los handlers de briefs ─────
const OVERRIDES = {
  'lib/db.mjs': ['getBriefByProjectId', 'updateBriefStatus', 'updateBriefSummary', 'deleteBrief', 'logEvent',
    'applyBriefEdits', 'getBriefClient', 'linkBriefToClient', 'listEvents'],
  'lib/auth.mjs': ['requireAdmin'],
  'lib/finance.mjs': ['convertBriefToClient'],
  'lib/brief-files.mjs': ['deleteBriefBlobs'],
  'lib/email.mjs': ['emailManualToClient'],
};
const HOOKS = `
const OVERRIDES = ${JSON.stringify(OVERRIDES)};
export async function resolve(specifier, context, next) {
  const r = await next(specifier, context);
  const parent = context.parentURL || '';
  if (!parent.includes('/api/admin/briefs/')) return r;
  const hit = Object.keys(OVERRIDES).find((m) => r.url.endsWith('/' + m));
  if (!hit) return r;
  return { url: 'stub:' + hit + '?real=' + encodeURIComponent(r.url), shortCircuit: true };
}
export async function load(url, context, next) {
  if (!url.startsWith('stub:')) return next(url, context);
  const mod = url.slice(5, url.indexOf('?'));
  const real = decodeURIComponent(url.slice(url.indexOf('?real=') + 6));
  const lines = [
    'import * as R from ' + JSON.stringify(real) + ';',
    'export * from ' + JSON.stringify(real) + ';',
    'const S = () => (globalThis.__briefStubs || {});',
  ];
  for (const n of OVERRIDES[mod]) {
    lines.push('export const ' + n + ' = (...a) => { const f = S().' + n
      + '; if (typeof f !== "function") throw new Error("[prueba] falta el doble de ' + n + '"); return f(...a); };');
  }
  lines.push('void R;');
  return { format: 'module', source: lines.join('\\n'), shortCircuit: true };
}
`;
register('data:text/javascript,' + encodeURIComponent(HOOKS), import.meta.url);

const load = async (rel) => (await import(pathToFileURL(path.join(ROOT, rel)).href)).default;
const briefHandler = await load('api/admin/briefs/[id].mjs');
const eventsHandler = await load('api/admin/briefs/[id]/events.mjs');
const emailHandler = await load('api/admin/briefs/[id]/email.mjs');

// ── Dobles y utilidades ──────────────────────────────────────────
const SESSION = { email: 'equipo@marcyan.test' };
const BRIEF = () => ({
  id: 7, project_id: 'MRC-007', status: 'pending', summary: '', source: 'web',
  business_name: 'Limpiezas Aurora', owner_name: 'Ana', email: 'ana@aurora.test', phone: '713 555 0142',
  website_type: null, services: ['seo-ia'], extra: {}, kit: {}, kit_status: 'none',
});
let calls;
function stubs(over = {}) {
  calls = { logEvent: [], applyBriefEdits: [], link: [], email: [], convert: [] };
  globalThis.__briefStubs = {
    requireAdmin: async () => SESSION,
    getBriefByProjectId: async (id) => (id === 'MRC-007' ? BRIEF() : null),
    logEvent: async (e) => { calls.logEvent.push(e); },
    applyBriefEdits: async (id, w) => { calls.applyBriefEdits.push(w); return true; },
    updateBriefStatus: async () => {},
    updateBriefSummary: async () => {},
    getBriefClient: async () => null,
    linkBriefToClient: async (pid, cid, actor) => {
      calls.link.push({ pid, cid, actor });
      return cid === 12 ? { client: { id: 12, client_code: 'CLI-012', business_name: 'Aurora', status: 'active' }, sourceSet: true } : null;
    },
    convertBriefToClient: async (pid, actor, opts) => {
      calls.convert.push({ pid, actor, opts });
      return { client: { id: 30, client_code: 'CLI-030', business_name: 'Limpiezas Aurora', status: 'active' }, created: true };
    },
    listEvents: async () => [{ id: 1, event_type: 'note', actor_email: SESSION.email, data: { text: 'Llamó' }, created_at: '2026-10-19T15:00:00Z' }],
    emailManualToClient: async (m) => { calls.email.push(m); },
    deleteBriefBlobs: async () => 0,
    deleteBrief: async () => true,
    ...over,
  };
}
async function call(handler, { method = 'GET', id = 'MRC-007', body } = {}) {
  const res = {
    statusCode: 200, body: undefined, headers: {},
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader(k, v) { this.headers[k] = v; },
    end() { return this; },
  };
  await handler({ method, query: { id }, body, headers: {} }, res);
  return res;
}

let pass = 0;
const fails = [];
async function check(name, fn) {
  try { stubs(); await fn(); pass++; } catch (e) { fails.push(name + ' → ' + e.message); }
}
// Silencia los console.error esperados de las ramas 500.
const quiet = async (fn) => { const e = console.error; console.error = () => {}; try { return await fn(); } finally { console.error = e; } };

// ── Sesión ───────────────────────────────────────────────────────
await check('sin sesión: 401 y no se lee el brief', async () => {
  let read = false;
  stubs({
    requireAdmin: async (req, res) => { res.status(401).json({ ok: false, error: 'No autorizado' }); return null; },
    getBriefByProjectId: async () => { read = true; return BRIEF(); },
  });
  for (const [h, m] of [[briefHandler, 'PATCH'], [briefHandler, 'POST'], [eventsHandler, 'POST'], [emailHandler, 'POST']]) {
    const r = await call(h, { method: m, body: {} });
    assert.equal(r.statusCode, 401);
  }
  assert.equal(read, false);
});

// ── PATCH ────────────────────────────────────────────────────────
await check('PATCH: valor que no vale → 400 con el error en su campo, sin escribir', async () => {
  const r = await call(briefHandler, { method: 'PATCH', body: { fields: { email: 'no-es-correo' } } });
  assert.equal(r.statusCode, 400);
  assert.ok(r.body.errors.email);
  assert.equal(calls.applyBriefEdits.length, 0);
});
await check('PATCH: opción de un campo de otro servicio también se valida (A3-02)', async () => {
  const r = await call(briefHandler, { method: 'PATCH', body: { fields: { website_type: 'zzz' } } });
  assert.equal(r.statusCode, 400);
  assert.ok(r.body.errors.website_type);
  assert.equal(calls.applyBriefEdits.length, 0);
});
await check('PATCH: estado inexistente → 400', async () => {
  const r = await call(briefHandler, { method: 'PATCH', body: { status: 'borrado' } });
  assert.equal(r.statusCode, 400);
});
await check('PATCH: brief inexistente → 404', async () => {
  const r = await call(briefHandler, { method: 'PATCH', id: 'MRC-999', body: { fields: { owner_name: 'Eva' } } });
  assert.equal(r.statusCode, 404);
});
await check('PATCH: sin la migración 010 → 503 con texto llano', async () => {
  stubs({ applyBriefEdits: async () => { const e = new Error('column "kit" does not exist'); e.code = '42703'; throw e; } });
  const r = await call(briefHandler, { method: 'PATCH', body: { fields: { legal_name: 'Aurora LLC' } } });
  assert.equal(r.statusCode, 503);
  assert.match(r.body.error, /actualización 010/);
});
await check('PATCH: cambio válido → 200, escribe solo lo cambiado y deja brief_edited', async () => {
  const r = await call(briefHandler, { method: 'PATCH', body: { fields: { owner_name: 'Eva', business_name: 'Limpiezas Aurora' } } });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body.changes.fields, ['owner_name']);
  assert.deepEqual(calls.applyBriefEdits[0].columns, { owner_name: 'Eva' });
  const ev = calls.logEvent.find((e) => e.type === 'brief_edited');
  assert.deepEqual(ev.data.changes.owner_name, { from: 'Ana', to: 'Eva' });
  assert.equal(ev.actorEmail, SESSION.email);
});
await check('PATCH: sin cambios reales → 200 sin escritura ni evento', async () => {
  const r = await call(briefHandler, { method: 'PATCH', body: { fields: { owner_name: 'Ana' } } });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body.changes.fields, []);
  assert.equal(calls.applyBriefEdits.length, 0);
  assert.equal(calls.logEvent.length, 0);
});

// ── POST: convertir en cliente ──────────────────────────────────
await check('POST: acción desconocida → 400', async () => {
  const r = await call(briefHandler, { method: 'POST', body: { action: 'borrar' } });
  assert.equal(r.statusCode, 400);
});
await check('POST: client_id que no es un número válido → 400', async () => {
  const r = await call(briefHandler, { method: 'POST', body: { action: 'convert_to_client', client_id: 'CLI-1' } });
  assert.equal(r.statusCode, 400);
});
await check('POST: brief inexistente → 404', async () => {
  const r = await call(briefHandler, { method: 'POST', id: 'MRC-999', body: { action: 'convert_to_client' } });
  assert.equal(r.statusCode, 404);
});
await check('POST: crear cliente → 201 y UN solo converted_to_client (lo escribe finance con el actor)', async () => {
  const r = await call(briefHandler, { method: 'POST', body: { action: 'convert_to_client' } });
  assert.equal(r.statusCode, 201);
  assert.equal(r.body.created, true);
  assert.equal(r.body.client.client_code, 'CLI-030');
  assert.deepEqual(calls.convert, [{ pid: 'MRC-007', actor: SESSION.email, opts: { checkDuplicates: true } }]);
  assert.equal(calls.logEvent.filter((e) => e.type === 'converted_to_client').length, 0, 'el handler no lo repite');
});
await check('POST: crear con correo o teléfono de otro cliente → 409 duplicate con coincidencias', async () => {
  const fin = await import('../lib/finance.mjs');
  stubs({ convertBriefToClient: async () => { throw new fin.CrmError(409, 'Ya existe un cliente con el correo o el teléfono de este brief: CLI-003 Aurora.', { reason: 'duplicate', matches: [{ id: 3, client_code: 'CLI-003' }] }); } });
  const r = await call(briefHandler, { method: 'POST', body: { action: 'convert_to_client' } });
  assert.equal(r.statusCode, 409);
  assert.equal(r.body.reason, 'duplicate');
  assert.equal(r.body.matches[0].client_code, 'CLI-003');
});
await check('POST: "crear igualmente" (allow_duplicate) no comprueba duplicados', async () => {
  const r = await call(briefHandler, { method: 'POST', body: { action: 'convert_to_client', allow_duplicate: true } });
  assert.equal(r.statusCode, 201);
  assert.deepEqual(calls.convert[0].opts, { checkDuplicates: false });
});
await check('POST: si al crear ya existía (carrera) → 200 already, sin crear otro', async () => {
  stubs({ convertBriefToClient: async () => ({ client: { id: 30, client_code: 'CLI-030' }, created: false }) });
  const r = await call(briefHandler, { method: 'POST', body: { action: 'convert_to_client' } });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.already, true);
});
await check('POST: ya es cliente y no se pide otro → 200 already, sin evento', async () => {
  stubs({ getBriefClient: async () => ({ id: 30, client_code: 'CLI-030' }) });
  const r = await call(briefHandler, { method: 'POST', body: { action: 'convert_to_client' } });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.already, true);
  assert.equal(calls.logEvent.length, 0);
});
await check('POST: ya es de OTRO cliente → 409 y no se vincula (A3-04)', async () => {
  stubs({ getBriefClient: async () => ({ id: 30, client_code: 'CLI-030' }) });
  const r = await call(briefHandler, { method: 'POST', body: { action: 'convert_to_client', client_id: 12 } });
  assert.equal(r.statusCode, 409);
  assert.match(r.body.error, /CLI-030/);
  assert.equal(calls.link.length, 0);
});
await check('POST: vincular a un cliente que no existe → 404', async () => {
  const r = await call(briefHandler, { method: 'POST', body: { action: 'convert_to_client', client_id: 99 } });
  assert.equal(r.statusCode, 404);
});
await check('POST: vincular → 200 linked; el evento lo escribe la misma sentencia del vínculo', async () => {
  const r = await call(briefHandler, { method: 'POST', body: { action: 'convert_to_client', client_id: 12 } });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.linked, true);
  assert.deepEqual(calls.link, [{ pid: 'MRC-007', cid: 12, actor: SESSION.email }]);
  assert.equal(calls.logEvent.length, 0);
});
await check('POST: vincular a un cliente ARCHIVADO → 409 en texto llano (revisión int1, F2)', async () => {
  stubs({ linkBriefToClient: async (pid, cid, actor) => {
    calls.link.push({ pid, cid, actor });
    return { client: { id: 5, client_code: 'CLI-005', business_name: 'Ana', status: 'archived' }, sourceSet: false, archived: true };
  } });
  const r = await call(briefHandler, { method: 'POST', body: { action: 'convert_to_client', client_id: 5 } });
  assert.equal(r.statusCode, 409);
  assert.equal(r.body.reason, 'archived');
  assert.match(r.body.error, /archivado\. Reactívalo en su ficha/);
});
await check('linkBriefToClient: con el cliente archivado la sentencia no escribe vínculo ni evento', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(path.join(ROOT, 'lib/db.mjs'), 'utf8');
  const fn = src.slice(src.indexOf('export async function linkBriefToClient'));
  const body = fn.slice(0, fn.indexOf('\n}\n'));
  assert.match(body, /ok AS \(\s*SELECT \* FROM c WHERE status IS DISTINCT FROM 'archived'/);
  assert.match(body, /WHERE id = \(SELECT id FROM ok\) AND source_brief_id IS NULL/);
  assert.match(body, /FROM ok\s+RETURNING id/);
  assert.match(body, /archived: client\.status === 'archived'/);
});
await check('POST: fallo inesperado → 500 con texto llano', async () => {
  stubs({ convertBriefToClient: async () => { throw new Error('boom'); } });
  const r = await quiet(() => call(briefHandler, { method: 'POST', body: { action: 'convert_to_client' } }));
  assert.equal(r.statusCode, 500);
  assert.match(r.body.error, /cliente/);
});

// ── Notas (events) ──────────────────────────────────────────────
await check('notas: tipo distinto de note → 400', async () => {
  const r = await call(eventsHandler, { method: 'POST', body: { type: 'status_changed', text: 'x' } });
  assert.equal(r.statusCode, 400);
});
await check('notas: vacía → 400; demasiado larga → 400', async () => {
  assert.equal((await call(eventsHandler, { method: 'POST', body: { type: 'note', text: '   ' } })).statusCode, 400);
  assert.equal((await call(eventsHandler, { method: 'POST', body: { type: 'note', text: 'a'.repeat(2001) } })).statusCode, 400);
  assert.equal(calls.logEvent.length, 0);
});
await check('notas: válida → 201 con { event } y evento note con el texto', async () => {
  const r = await call(eventsHandler, { method: 'POST', body: { type: 'note', text: '  Llamó  ' } });
  assert.equal(r.statusCode, 201);
  assert.equal(r.body.event.event_type, 'note');
  assert.deepEqual(calls.logEvent[0], { projectId: 'MRC-007', type: 'note', actorEmail: SESSION.email, data: { text: 'Llamó' } });
});
await check('notas: brief inexistente → 404; GET devuelve el historial', async () => {
  assert.equal((await call(eventsHandler, { method: 'POST', id: 'MRC-999', body: { type: 'note', text: 'x' } })).statusCode, 404);
  const g = await call(eventsHandler, { method: 'GET' });
  assert.equal(g.statusCode, 200);
  assert.equal(g.body.events.length, 1);
});

// ── Correo al cliente ───────────────────────────────────────────
await check('correo: se envía al correo del brief y el cuerpo queda en el historial', async () => {
  const r = await call(emailHandler, { method: 'POST', body: { subject: 'Hola', body: 'Línea 1\nLínea 2' } });
  assert.equal(r.statusCode, 200);
  assert.equal(calls.email[0].to, 'ana@aurora.test');
  const ev = calls.logEvent.find((e) => e.type === 'email_sent_to_client');
  assert.equal(ev.data.body, 'Línea 1\nLínea 2');
});
await check('correo: sin asunto → 400 y no se envía', async () => {
  const r = await call(emailHandler, { method: 'POST', body: { subject: '', body: 'x' } });
  assert.equal(r.statusCode, 400);
  assert.equal(calls.email.length, 0);
});

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) fallaron:\n  - ` + fails.join('\n  - '));
  process.exit(1);
}
console.log(`✓ ${pass} pruebas de los handlers de Briefs pasaron.`);
