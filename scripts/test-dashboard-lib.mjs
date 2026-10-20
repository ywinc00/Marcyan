// ─────────────────────────────────────────────────────────────
// Pruebas de la base común del panel (A0): fechas y cliente HTTP.
//   node scripts/test-dashboard-lib.mjs   (o npm run test:dash)
// Sin red ni base de datos: fetch se sustituye por un doble en memoria.
// Se fuerza la zona horaria UTC del proceso para reproducir el caso real
// (Vercel/servidor en UTC, dueño en Houston) y otra vez en Houston.
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';

let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; console.log('  ok  ', name); }
  catch (e) { fail++; console.log('  FAIL', name, '\n       ', e.message); }
}

const dates = await import('../src/components/dashboard/lib/dates.js');
const apiMod = await import('../src/components/dashboard/lib/api.js');

console.log('\nFechas (lib/dates.js) · TZ del proceso =', process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone);

await t('DATE serializada como medianoche UTC no pierde un día (OP-06, MOCK-01)', () => {
  assert.equal(dates.fmtDay('2026-11-01T00:00:00.000Z'), '01 nov 2026');
  assert.equal(dates.fmtDay('2026-10-19'), '19 oct 2026');
});
await t('fmtDayShort de metric_date es el día guardado', () => {
  assert.equal(dates.fmtDayShort('2026-10-01T00:00:00.000Z'), '01/10');
});
await t('dayISO devuelve YYYY-MM-DD para inputs de fecha', () => {
  assert.equal(dates.dayISO('2026-03-09T00:00:00.000Z'), '2026-03-09');
  assert.equal(dates.dayISO(''), '');
  assert.equal(dates.dayISO('basura'), '');
});
await t('timestamp se muestra en hora de Houston (fecha local, no UTC)', () => {
  // 2026-10-19 03:00 UTC = 18 oct 22:00 en Houston (CDT, UTC-5)
  assert.equal(dates.fmtDate('2026-10-19T03:00:00Z'), '18 oct 2026');
});
await t('todayISO usa el día de Houston aunque en UTC ya sea mañana (FIN-03, MOCK-11)', () => {
  assert.equal(dates.todayISO(new Date('2026-10-31T23:30:00-05:00')), '2026-10-31');
  assert.equal(dates.monthKey(new Date('2026-10-31T23:30:00-05:00')), '2026-10');
});
await t('hourInHouston para el saludo', () => {
  assert.equal(dates.hourInHouston(new Date('2026-10-19T03:00:00Z')), 22);
});
await t('rel: ahora / minutos / horas / días / fecha', () => {
  const now = Date.parse('2026-10-19T12:00:00Z');
  assert.equal(dates.rel('2026-10-19T11:59:30Z', now), 'ahora');
  assert.equal(dates.rel('2026-10-19T11:30:00Z', now), '30m');
  assert.equal(dates.rel('2026-10-19T09:00:00Z', now), '3h');
  assert.equal(dates.rel('2026-10-17T12:00:00Z', now), '2d');
  assert.equal(dates.rel('2026-09-01T12:00:00Z', now), '01 sept 2026');
});
await t('valores vacíos o inválidos no rompen', () => {
  for (const f of [dates.fmtDay, dates.fmtDate, dates.fmtDateTime, dates.fmtTime, dates.rel]) {
    assert.equal(f(null), ''); assert.equal(f(''), ''); assert.equal(f('no-es-fecha'), '');
  }
});

console.log('\nCliente HTTP (lib/api.js)');
const { api, ApiError, MSG, onUnauthorized, onMutation } = apiMod;
function fakeFetch(status, body, { delay = 0, throws = null } = {}) {
  globalThis.fetch = (url, init = {}) => new Promise((resolve, reject) => {
    if (throws) return reject(throws);
    const timer = setTimeout(() => resolve(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })), delay);
    init.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('aborted', 'AbortError')); });
  });
}

await t('200 con JSON devuelve los datos', async () => {
  fakeFetch(200, { ok: true, rows: [1, 2] });
  const j = await api('/api/admin/x');
  assert.deepEqual(j.rows, [1, 2]);
});
await t('{ ok:false } lanza ApiError con el texto del servidor', async () => {
  fakeFetch(400, { ok: false, error: 'Email inválido' });
  await assert.rejects(api('/x'), (e) => e instanceof ApiError && e.message === 'Email inválido' && e.status === 400);
});
await t('texto técnico del servidor se cambia por uno llano', async () => {
  fakeFetch(400, { ok: false, error: 'amount_cents inválido' });
  await assert.rejects(api('/x'), (e) => e.message === 'Revisa los datos e inténtalo de nuevo.');
  fakeFetch(405, { ok: false, error: 'Method not allowed' });
  await assert.rejects(api('/x'), (e) => e.message === 'Esta acción no está disponible.');
  fakeFetch(500, { ok: false, error: 'Error interno' });
  await assert.rejects(api('/x'), (e) => e.message.startsWith('El servidor tuvo un problema'));
});
await t('HTML de error (502 del proxy) no revienta el parseo', async () => {
  fakeFetch(502, '<html>Bad gateway</html>');
  await assert.rejects(api('/x'), (e) => e instanceof ApiError && e.status === 502 && e.message.startsWith('El servidor'));
});
await t('200 con cuerpo no JSON es un error legible', async () => {
  fakeFetch(200, '<html></html>');
  await assert.rejects(api('/x'), (e) => e.kind === 'parse' && e.message === MSG.invalid);
});
await t('401 avisa a la carcasa y lanza "Tu sesión caducó"', async () => {
  let called = 0;
  const off = onUnauthorized(() => { called++; });
  fakeFetch(401, { ok: false, error: 'No autorizado' });
  await assert.rejects(api('/x'), (e) => e.kind === 'session' && e.message === MSG.session);
  assert.equal(called, 1);
  // auth:false (login, me, logout) NO cierra la sesión
  await assert.rejects(api('/x', { auth: false }), (e) => e.status === 401 && e.kind === 'http');
  assert.equal(called, 1);
  off();
});
await t('timeout a los N ms con mensaje en español', async () => {
  fakeFetch(200, { ok: true }, { delay: 200 });
  await assert.rejects(api('/x', { timeout: 30 }), (e) => e.kind === 'timeout' && e.message === MSG.timeout);
});
await t('fallo de red con mensaje en español', async () => {
  fakeFetch(0, null, { throws: new TypeError('Failed to fetch') });
  await assert.rejects(api('/x'), (e) => e.kind === 'network' && /conect|conexión/.test(e.message));
});
await t('acceptErrors devuelve el cuerpo del error sin lanzar', async () => {
  fakeFetch(207, { ok: false, configured: false, error: 'x_y' });
  const j = await api('/x', { method: 'POST', acceptErrors: true });
  assert.equal(j.ok, false); assert.equal(j.configured, false);
});
await t('body objeto se envía como JSON y las mutaciones avisan a la carcasa', async () => {
  let sent = null, mutations = 0;
  const off = onMutation(() => { mutations++; });
  globalThis.fetch = async (url, init) => { sent = init; return new Response('{"ok":true}', { status: 200 }); };
  await api('/x', { method: 'PATCH', body: { status: 'new' } });
  assert.equal(sent.body, '{"status":"new"}');
  assert.equal(sent.method, 'PATCH');
  assert.equal(sent.credentials, 'same-origin');
  await api('/x');                       // GET no cuenta
  await api('/x', { method: 'POST', auth: false }); // sesión no cuenta
  assert.equal(mutations, 1);
  off();
});
await t('204 sin cuerpo es éxito', async () => {
  globalThis.fetch = async () => new Response(null, { status: 204 });
  const j = await api('/x', { method: 'DELETE' });
  assert.equal(j.ok, true);
});

console.log('\nVuelta a la ficha tras el login (lib/return-hash.js, CT-02)');
const rh = await import('../src/components/dashboard/lib/return-hash.js');
const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
await t('se recuerda la ficha del correo y se restaura una sola vez al entrar sin destino propio', () => {
  const st = memStore();
  rh.rememberReturn('#/briefs/MRC-017', st);
  assert.equal(rh.takeReturn('#/inicio', st), '#/briefs/MRC-017');
  assert.equal(rh.takeReturn('#/inicio', st), null, 'solo una vez');
});
await t('Inicio no se recuerda; un destino propio de la pestaña manda; caduca a los 30 min', () => {
  const st = memStore();
  rh.rememberReturn('#/inicio', st);
  assert.equal(st.getItem(rh.RETURN_KEY), null);
  rh.rememberReturn('#/leads/LEAD-005', st);
  assert.equal(rh.takeReturn('#/clientes/4', st), null);
  const now = Date.now();
  assert.equal(rh.pickReturn({ h: '#/leads/LEAD-005', t: now - rh.RETURN_TTL_MS - 1 }, '#/inicio', now), null);
  assert.equal(rh.pickReturn({ h: '#/leads/LEAD-005', t: now - 1000 }, '', now), '#/leads/LEAD-005');
});
await t('solo rutas internas #/…; nada externo ni javascript:', () => {
  const now = Date.now();
  for (const bad of ['https://x.example/#/briefs', 'javascript:alert(1)', '//x.example', '#//x.example', '#/<script>']) {
    assert.equal(rh.pickReturn({ h: bad, t: now }, '#/inicio', now), null, bad);
  }
  assert.equal(rh.takeReturn('#/inicio', { getItem() { throw new Error('bloqueado'); }, removeItem() {} }), null);
});

console.log(`\n${pass} ok · ${fail} fallos`);
process.exit(fail ? 1 : 0);
