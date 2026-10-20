// ════════════════════════════════════════════════════════════════
//  scripts/test-avisos.mjs  ·  npm run test:avisos
//  Pruebas de Avisos (Orbit A7) SIN base de datos y SIN red:
//    · lib/notifications.mjs con un cliente de BD falso: consultas de la
//      bandeja (tipo, sin leer, archivados, cursor), vuelta atrás si falta
//      la columna archived_at (migración 015 sin aplicar), deduplicación,
//      títulos sin guion largo, enlaces y avisos 'system' (correo, SEO).
//    · src/components/dashboard/lib/avisos.js: filtros de la URL, destino
//      de "Abrir", contador y el ciclo de refresco solo con la pestaña visible.
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import * as N from '../lib/notifications.mjs';
import * as A from '../src/components/dashboard/lib/avisos.js';

let pass = 0;
const fails = [];
async function check(name, fn) {
  try { await fn(); pass++; } catch (e) { fails.push(name + ' → ' + (e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e)); }
}

// ── BD falsa: registra cada consulta y responde con `answer(text, params)` ──
function fakeDb(answer) {
  const calls = [];
  const run = (text, params) => {
    calls.push({ text: text.replace(/\s+/g, ' ').trim(), params });
    const r = answer(text.replace(/\s+/g, ' ').trim(), params);
    if (r instanceof Error) return Promise.reject(r);
    return Promise.resolve(r || { rows: [], rowCount: 0 });
  };
  const tag = (strings, ...vals) => run(strings.reduce((acc, s, i) => acc + (i ? '$' + i : '') + s, ''), vals);
  tag.query = (text, params = []) => run(text, params);
  tag.calls = calls;
  return tag;
}
const missingCol = () => Object.assign(new Error('column "archived_at" does not exist'), { code: '42703' });
const row = (o = {}) => ({ id: '7', type: 'new_lead', title: 'Nuevo lead — Ana', body: null, ref: 'LEAD-012', url: '/dashboard', read_at: null, created_at: '2026-10-19T12:00:00Z', ...o });

// ── Títulos y enlaces ────────────────────────────────────────────
await check('cleanTitle: guion largo y corto de conector → coma; respeta referencias y rangos', () => {
  assert.equal(N.cleanTitle('Nuevo brief — Taquería Los Compadres'), 'Nuevo brief, Taquería Los Compadres');
  assert.equal(N.cleanTitle('Nuevo lead (diagnóstico) – Fernando Ríos'), 'Nuevo lead (diagnóstico), Fernando Ríos');
  assert.equal(N.cleanTitle('Kit de arranque recibido - MRC-017'), 'Kit de arranque recibido, MRC-017');
  assert.equal(N.cleanTitle('LEAD-012 pidió $500-$1,500'), 'LEAD-012 pidió $500-$1,500');
  assert.equal(N.cleanTitle('— Aviso —'), 'Aviso');
  assert.equal(A.cleanTitle('Nuevo brief — Acme'), N.cleanTitle('Nuevo brief — Acme'), 'cliente y servidor limpian igual');
});

await check('notificationLink: lead, brief, proyecto, factura, cliente y handoff', () => {
  assert.equal(N.notificationLink('new_lead', 'LEAD-012'), '/dashboard#/leads/LEAD-012');
  assert.equal(N.notificationLink('new_brief', 'MRC-017'), '/dashboard#/briefs/MRC-017');
  assert.equal(N.notificationLink('system', 'PRJ-004'), '/dashboard#/progreso/PRJ-004');
  assert.equal(N.notificationLink('system', 'INV-2026-004'), '/dashboard#/finanzas/facturas/INV-2026-004');
  assert.equal(N.notificationLink('system', 'CLI-12'), '/dashboard#/clientes/12');
  assert.equal(N.notificationLink('chat_handoff', null), '/dashboard#/avisos');
  assert.equal(N.notificationLink('system', 'seo-sync:3'), null, 'una clave interna no es un enlace');
});

// ── Consulta de la bandeja ───────────────────────────────────────
await check('buildNotificationQuery: bandeja sin archivados, tipo, sin leer y cursor', () => {
  const q = N.buildNotificationQuery({ limit: 30, unreadOnly: 'true', type: 'new_brief', before: '120' });
  assert.match(q.text, /archived_at IS NULL/);
  assert.match(q.text, /read_at IS NULL/);
  assert.match(q.text, /type = \$1/);
  assert.match(q.text, /id < \$2/);
  assert.match(q.text, /ORDER BY id DESC LIMIT \$3/);
  assert.deepEqual(q.params, ['new_brief', 120, 31]);
  assert.doesNotMatch(q.countText, /id </, 'el total no depende del cursor');
  assert.deepEqual(q.countParams, ['new_brief']);
});
await check('buildNotificationQuery: archivados, tipo desconocido ignorado, cursor basura ignorado', () => {
  const q = N.buildNotificationQuery({ archived: 'only', type: 'DROP TABLE', before: '12abc', offset: '30' });
  assert.match(q.text, /archived_at IS NOT NULL/);
  assert.doesNotMatch(q.text, /type =/);
  assert.doesNotMatch(q.text, /id </);
  assert.match(q.text, /OFFSET \$2/);
  const legacy = N.buildNotificationQuery({ archived: 'only' }, false);
  assert.doesNotMatch(legacy.text, /archived_at/);
});

await check('listNotifications: página, next_cursor, enlace y título limpio', async () => {
  const rows = [row({ id: '30' }), row({ id: '29', title: 'Nuevo brief — Acme', type: 'new_brief', ref: 'MRC-003' }), row({ id: '28' })];
  const db = fakeDb((t) => (t.startsWith('SELECT COUNT') ? { rows: [{ n: 9 }], rowCount: 1 } : { rows, rowCount: rows.length }));
  N.__setDbForTests(db);
  const r = await N.listNotifications({ limit: 2 });
  assert.equal(r.rows.length, 2);
  assert.equal(r.has_more, true);
  assert.equal(r.next_cursor, 29);
  assert.equal(r.total, 9);
  assert.equal(r.archive_available, true);
  assert.equal(r.rows[1].title, 'Nuevo brief, Acme');
  assert.equal(r.rows[1].link, '/dashboard#/briefs/MRC-003');
  assert.equal(r.rows[0].archived_at, null);
});

await check('sin migración 015: lista igual (sin archivado) y archivar avisa que no está disponible', async () => {
  const db = fakeDb((t) => {
    if (/archived_at/.test(t)) return missingCol();
    if (t.startsWith('SELECT COUNT')) return { rows: [{ n: 1 }], rowCount: 1 };
    return { rows: [row()], rowCount: 1 };
  });
  N.__setDbForTests(db);
  const r = await N.listNotifications({});
  assert.equal(r.rows.length, 1);
  assert.equal(r.archive_available, false);
  const arch = await N.listNotifications({ archived: 'only' });
  assert.equal(arch.rows.length, 0);
  assert.equal(await N.unreadCount(), 1);
  await assert.rejects(() => N.setArchived('7', true), (e) => e.code === 'archive_unavailable');
  const c = await N.notificationCounts();
  assert.equal(c.archived, 0);
});

await check('unreadCount y markAllRead excluyen los archivados', async () => {
  const db = fakeDb((t) => (t.startsWith('SELECT COUNT') ? { rows: [{ n: 4 }], rowCount: 1 } : { rows: [{ id: 1 }, { id: 2 }], rowCount: 2 }));
  N.__setDbForTests(db);
  assert.equal(await N.unreadCount(), 4);
  assert.match(db.calls[0].text, /read_at IS NULL AND archived_at IS NULL/);
  assert.equal(await N.markAllRead('new_lead'), 2);
  const upd = db.calls[db.calls.length - 1];
  assert.match(upd.text, /archived_at IS NULL/);
  assert.match(upd.text, /type = \$1/);
  assert.deepEqual(upd.params, ['new_lead']);
});

await check('A7-03: si la BD falla, lista, contador y conteos LANZAN (nada de ceros falsos)', async () => {
  const db = fakeDb(() => new Error('conexión caída'));
  N.__setDbForTests(db);
  await assert.rejects(() => N.listNotifications({}), /conexión caída/);
  await assert.rejects(() => N.unreadCount(), /conexión caída/);
  await assert.rejects(() => N.notificationCounts(), /conexión caída/);
  assert.equal(await N.unreadCountOrNull(), null, 'tras un cambio ya guardado: null, el panel conserva el último valor');
});
await check('A7-07: markAllRead con un tipo desconocido no marca nada y lanza invalid_type', async () => {
  const db = fakeDb(() => ({ rows: [{ id: 1 }], rowCount: 1 }));
  N.__setDbForTests(db);
  await assert.rejects(() => N.markAllRead('DROP TABLE'), (e) => e.code === 'invalid_type');
  assert.equal(db.calls.length, 0, 'no llega a la BD');
  assert.equal(await N.markAllRead(null), 1);
  assert.doesNotMatch(db.calls[0].text, /type =/, 'sin tipo: todas las de la bandeja');
});

await check('markUnread, setArchived (archiva y marca leído) e ids inválidos', async () => {
  const db = fakeDb(() => ({ rows: [row({ read_at: null, archived_at: '2026-10-19T13:00:00Z' })], rowCount: 1 }));
  N.__setDbForTests(db);
  const u = await N.markUnread('7');
  assert.match(db.calls[0].text, /SET read_at = NULL WHERE id = \$1/);
  assert.equal(u.link, '/dashboard#/leads/LEAD-012');
  await N.setArchived('7', true);
  assert.match(db.calls[1].text, /archived_at = COALESCE\(archived_at, NOW\(\)\), read_at = COALESCE\(read_at, NOW\(\)\)/);
  await N.setArchived('7', false);
  assert.match(db.calls[2].text, /SET archived_at = NULL/);
  assert.equal(await N.markRead('abc'), null);
  assert.equal(await N.markUnread('-3'), null);
  assert.equal(db.calls.length, 3, 'un id inválido no llega a la BD');
});

await check('notificationCounts: por tipo, tipos raros cuentan como sistema', async () => {
  const db = fakeDb(() => ({ rows: [
    { type: 'new_lead', total: 5, unread: 2, archived: 1 },
    { type: 'raro', total: 1, unread: 1, archived: 0 },
  ], rowCount: 2 }));
  N.__setDbForTests(db);
  const c = await N.notificationCounts();
  assert.equal(c.total, 6); assert.equal(c.unread, 3); assert.equal(c.archived, 1);
  assert.deepEqual(c.by_type.new_lead, { total: 5, unread: 2 });
  assert.deepEqual(c.by_type.system, { total: 1, unread: 1 });
});

// ── Crear y deduplicar ───────────────────────────────────────────
await check('createNotification: limpia el título, guarda el enlace profundo y deduplica 2 min', async () => {
  const db = fakeDb((t) => (t.startsWith('SELECT 1') ? { rows: [], rowCount: 0 } : { rows: [row({ title: 'Nuevo brief, Acme', type: 'new_brief', ref: 'MRC-020', url: '/dashboard#/briefs/MRC-020' })], rowCount: 1 }));
  N.__setDbForTests(db);
  const r = await N.createNotification({ type: 'new_brief', title: 'Nuevo brief — Acme', ref: 'MRC-020', url: '/dashboard' });
  assert.ok(r);
  assert.deepEqual(db.calls[0].params, ['new_brief', 'MRC-020', 2]);
  const ins = db.calls[1];
  assert.equal(ins.params[1], 'Nuevo brief, Acme');
  assert.equal(ins.params[4], '/dashboard#/briefs/MRC-020');
});
await check('createNotification: duplicado → null sin insertar; fallo de BD → null sin lanzar', async () => {
  let db = fakeDb((t) => (t.startsWith('SELECT 1') ? { rows: [{ '?column?': 1 }], rowCount: 1 } : { rows: [row()], rowCount: 1 }));
  N.__setDbForTests(db);
  assert.equal(await N.createNotification({ type: 'new_lead', title: 'x', ref: 'LEAD-1' }), null);
  assert.equal(db.calls.length, 1);
  db = fakeDb(() => new Error('conexión caída'));
  N.__setDbForTests(db);
  assert.equal(await N.createNotification({ type: 'new_lead', title: 'x', ref: 'LEAD-1' }), null);
});

await check("notifySystem: tipo 'system', clave en ref y ventana de deduplicación en minutos", async () => {
  const db = fakeDb((t) => (t.startsWith('SELECT 1') ? { rows: [], rowCount: 0 } : { rows: [row({ type: 'system', ref: 'seo-sync:3', url: '/dashboard#/seo/3' })], rowCount: 1 }));
  N.__setDbForTests(db);
  const r = await N.notifySystem({ key: 'seo-sync:3', title: 'La sincronización de SEO falló — Acme', url: '/dashboard#/seo/3', windowHours: 20 });
  assert.deepEqual(db.calls[0].params, ['system', 'seo-sync:3', 1200]);
  assert.equal(db.calls[1].params[0], 'system');
  assert.equal(db.calls[1].params[1], 'La sincronización de SEO falló, Acme');
  assert.equal(r.link, '/dashboard#/seo/3');
});

await check('emailFailureNotice: textos en llano y enlace al brief; claves distintas por destinatario', () => {
  const a = N.emailFailureNotice({ projectId: 'MRC-017', who: 'admin', businessName: 'Acme' });
  const c = N.emailFailureNotice({ projectId: 'MRC-017', who: 'client', businessName: 'Acme' });
  assert.equal(a.url, '/dashboard#/briefs/MRC-017');
  assert.notEqual(a.key, c.key);
  assert.match(c.title, /No pudimos confirmar que salió la confirmación del brief MRC-017, Acme/);
  for (const n of [a, c]) {
    assert.doesNotMatch(n.title + n.body, /[—–]|Resend|timeout|API|SMTP/i, 'sin jerga ni guion largo');
    // A7-04: con el corte de 8 s el correo puede salir igual; no se afirma que no llegó.
    assert.doesNotMatch(n.title, /no recibió|no llegó|no salió/i, 'el título no afirma lo que no sabemos');
  }
});

await check('seoSyncFailureNotices: ignora "no configurado", explica el 403 y enlaza al proyecto', () => {
  const out = N.seoSyncFailureNotices([
    { project_id: '1', name: 'Marcyan', ok: true, gsc: { error: null }, ga4: { error: null } },
    { project_id: '2', name: 'TRR', ok: false, error: 'not_configured', gsc: { error: 'not_configured' }, ga4: { error: 'not_configured' } },
    { project_id: '3', name: 'Clínica Sonrisa', ok: false, gsc: { error: null }, ga4: { error: 'GA4 403: permission denied' } },
    { project_id: '4', name: 'MJA', ok: false, gsc: { error: 'fetch failed' }, ga4: { error: 'boom' } },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].key, 'seo-sync:3');
  assert.equal(out[0].url, '/dashboard#/seo/3');
  assert.match(out[0].body, /Google Analytics/);
  assert.match(out[0].body, /no dio permiso/);
  assert.match(out[1].body, /Search Console ni de Google Analytics/);
  for (const n of out) assert.doesNotMatch(n.title + n.body, /[—–]|403|fetch failed/, 'sin códigos crudos');
});

await check('seoSyncFailureNotices: también entiende la forma de A6 (status, códigos y textos en español)', () => {
  const err = (code, title) => ({ code, title, action: '', detail: '' });
  const out = N.seoSyncFailureNotices([
    { project_id: '5', name: 'TRR', ok: false, status: 'error', error: 'Google no está conectado', error_detail: err('not_configured', 'Google no está conectado'),
      gsc: { error: 'Google no está conectado' }, ga4: { error: null },
      sources: { gsc: { status: 'error', error: err('not_configured', 'x') }, ga4: { status: 'off', error: null } } },
    { project_id: '6', name: 'MJA', ok: false, status: 'partial', error: 'Search Console no dio permiso', error_detail: err('gsc_forbidden', 'Search Console no dio permiso'),
      gsc: { error: 'Search Console no dio permiso' }, ga4: { error: null },
      sources: { gsc: { status: 'error', error: err('gsc_forbidden', 'x') }, ga4: { status: 'ok', error: null } } },
    { project_id: '7', name: 'Sin ids', ok: false, status: 'error', error: 'Faltan los datos', error_detail: err('no_ids', 'Faltan'),
      gsc: { error: null }, ga4: { error: null }, sources: { gsc: { status: 'off', error: null }, ga4: { status: 'off', error: null } } },
  ]);
  assert.equal(out.length, 1, '"no configurado" y "sin identificadores" no avisan');
  assert.equal(out[0].key, 'seo-sync:6');
  assert.match(out[0].body, /de Search Console\./);
  assert.match(out[0].body, /no dio permiso/);
});
await check('notifySeoSyncCrash: aviso del día con clave fija y enlace a SEO', async () => {
  const db = fakeDb((t) => (t.startsWith('SELECT 1') ? { rows: [], rowCount: 0 } : { rows: [row({ type: 'system', ref: 'seo-sync:all', url: '/dashboard#/seo' })], rowCount: 1 }));
  N.__setDbForTests(db);
  const r = await N.notifySeoSyncCrash();
  assert.deepEqual(db.calls[0].params, ['system', 'seo-sync:all', 1200]);
  assert.equal(r.link, '/dashboard#/seo');
});

// A7-01/A7-02: el aviso de SEO solo tiene sentido desde el cron que de verdad
// se programa. Ese cron llega con A6 (api/cron/seo-sync.mjs). En cuanto ese
// archivo exista en la rama (fusión A6 + A7), su handler TIENE que llamar a
// notifySeoSyncFailures y a notifySeoSyncCrash: si no, esta prueba falla y
// la fusión no se da por buena sin volver a colocar el aviso.
await check('A7-01/02: el cron de SEO (si existe) avisa al panel de sus fallos', () => {
  const cron = new URL('../api/cron/seo-sync.mjs', import.meta.url);
  if (!existsSync(cron)) {
    console.log('  · pendiente: el cron de SEO aún no existe en esta rama (llega con A6); al fusionar, esta prueba exige el aviso');
    return;
  }
  const src = readFileSync(cron, 'utf8');
  assert.match(src, /from ['"][./]+lib\/notifications\.mjs['"]/, 'el cron importa lib/notifications.mjs');
  assert.match(src, /notifySeoSyncFailures\(/, 'el cron llama a notifySeoSyncFailures(results)');
  assert.match(src, /notifySeoSyncCrash\(/, 'el cron llama a notifySeoSyncCrash() en su catch');
  const sync = readFileSync(new URL('../api/admin/seo/sync.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(sync, /notifySeoSyncFailures/, 'el botón del panel no avisa: el error ya se ve en pantalla');
});

N.__setDbForTests(null);

// ── Panel: lib/avisos.js ─────────────────────────────────────────
await check('badgeText: vacío en 0, 99+ por encima de 99', () => {
  assert.equal(A.badgeText(0), ''); assert.equal(A.badgeText(null), '');
  assert.equal(A.badgeText(3), '3'); assert.equal(A.badgeText(120), '99+');
});
await check('readFilters + listParams: valores legibles en la URL, códigos al servidor', () => {
  assert.deepEqual(A.readFilters({ tipo: 'persona', estado: 'sin-leer' }), { tipo: 'persona', estado: 'sin-leer' });
  assert.deepEqual(A.readFilters({ tipo: 'chat_handoff', estado: 'x' }), { tipo: '', estado: '' });
  const p = new URLSearchParams(A.listParams({ tipo: 'persona', estado: 'sin-leer' }, { limit: 30, before: 41 }));
  assert.equal(p.get('type'), 'chat_handoff');
  assert.equal(p.get('unreadOnly'), 'true');
  assert.equal(p.get('before'), '41');
  const q = new URLSearchParams(A.listParams({ tipo: '', estado: 'archivados' }));
  assert.equal(q.get('archived'), '1'); assert.equal(q.get('type'), null);
});
await check('A7-07: "Marcar todas" respeta el filtro de tipo', () => {
  assert.deepEqual(A.markAllAction(''), { label: 'Marcar todas como leídas', body: undefined, type: null });
  const l = A.markAllAction('lead');
  assert.equal(l.label, 'Marcar leads como leídos');
  assert.deepEqual(l.body, { type: 'new_lead' });
  assert.deepEqual(A.markAllAction('persona').body, { type: 'chat_handoff' });
  assert.equal(A.markAllAction('raro').body, undefined);
  for (const t of A.TYPE_FILTERS) assert.doesNotMatch(A.markAllAction(t.id).label, /[—–]/);
});
await check('A7-05: Ctrl, Cmd, Mayús o la rueda no navegan en la pestaña actual', () => {
  assert.equal(A.isModifiedClick({ button: 0 }), false);
  assert.equal(A.isModifiedClick({ button: 0, ctrlKey: true }), true);
  assert.equal(A.isModifiedClick({ button: 0, metaKey: true }), true);
  assert.equal(A.isModifiedClick({ button: 0, shiftKey: true }), true);
  assert.equal(A.isModifiedClick({ button: 1 }), true);
  assert.equal(A.isModifiedClick(undefined), false);
});
await check('openTarget: al registro concreto; nada si no lleva a ningún sitio', () => {
  assert.equal(A.openTarget('/dashboard#/leads/LEAD-012'), '#/leads/LEAD-012');
  assert.equal(A.openTarget('/dashboard#/briefs/MRC-017'), '#/briefs/MRC-017');
  assert.equal(A.openTarget('/dashboard#/seo/3'), '#/seo/3');
  assert.equal(A.openTarget('/dashboard#/avisos'), null);
  assert.equal(A.openTarget('/dashboard'), null);
  assert.equal(A.openTarget(null), null);
});
await check('visibleRef: solo referencias legibles, nunca claves internas', () => {
  assert.equal(A.visibleRef('MRC-017'), 'MRC-017');
  assert.equal(A.visibleRef('seo-sync:3'), '');
  assert.equal(A.visibleRef('email-client:MRC-017'), '');
});

// Ciclo de refresco con documento y temporizadores falsos.
function fakeEnv(state = 'visible') {
  const doc = { visibilityState: state, listeners: new Set(),
    addEventListener(_, fn) { this.listeners.add(fn); }, removeEventListener(_, fn) { this.listeners.delete(fn); },
    fire(s) { this.visibilityState = s; for (const fn of this.listeners) fn(); } };
  const timers = new Map(); let seq = 0;
  const win = { setTimeout(fn, ms) { const id = ++seq; timers.set(id, { fn, ms }); return id; }, clearTimeout(id) { timers.delete(id); } };
  const runNext = async () => { const [id, t] = [...timers.entries()][0] || []; if (!id) return false; timers.delete(id); await t.fn(); return true; };
  return { doc, win, timers, runNext };
}
const flush = () => new Promise((r) => setTimeout(r, 0));
await check('refresco: consulta al arrancar y cada 60 s con la pestaña visible', async () => {
  const env = fakeEnv('visible'); let calls = 0;
  const stop = A.startUnreadPolling({ doc: env.doc, win: env.win, refresh: async () => { calls++; } });
  await flush();
  assert.equal(calls, 1);
  assert.equal(env.timers.size, 1);
  assert.equal([...env.timers.values()][0].ms, 60000);
  await env.runNext(); await flush();
  assert.equal(calls, 2);
  stop();
  assert.equal(env.timers.size, 0);
  assert.equal(env.doc.listeners.size, 0);
});
await check('refresco: oculta no consulta; al volver consulta enseguida', async () => {
  const env = fakeEnv('hidden'); let calls = 0;
  const stop = A.startUnreadPolling({ doc: env.doc, win: env.win, refresh: async () => { calls++; } });
  await flush();
  assert.equal(calls, 0); assert.equal(env.timers.size, 0);
  env.doc.fire('visible'); await flush();
  assert.equal(calls, 1); assert.equal(env.timers.size, 1);
  env.doc.fire('hidden');
  assert.equal(env.timers.size, 0, 'al ocultarse se cancela el siguiente');
  stop();
});
await check('refresco: un fallo no corta el ciclo', async () => {
  const env = fakeEnv('visible'); let calls = 0;
  const stop = A.startUnreadPolling({ doc: env.doc, win: env.win, refresh: async () => { calls++; throw new Error('red'); } });
  await flush();
  assert.equal(calls, 1);
  assert.equal(env.timers.size, 1);
  stop();
});

console.log(`test:avisos · ${pass} ok, ${fails.length} fallos`);
for (const f of fails) console.log('  ✗ ' + f);
process.exit(fails.length ? 1 : 0);
