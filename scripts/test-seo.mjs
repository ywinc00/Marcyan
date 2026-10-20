// ════════════════════════════════════════════════════════════════
//  scripts/test-seo.mjs  ·  npm run test:seo
//  Pruebas de la sección SEO SIN base de datos y SIN red:
//    · lib/seo-core.mjs  identificadores de Google, errores en español,
//                        estado por fuente, ventanas y período previo,
//                        posición ponderada, serie con huecos, escala del
//                        eje, lectura del diagnóstico.
//    · lib/seo.mjs       funciones puras (dedupe del lote, fuentes que
//                        invalida un cambio de propiedad, forma del proyecto).
//    · Recorrido estático: cron protegido en tiempo constante, cron en
//      vercel.json, diag solo GET, sync con maxDuration, sin tokens en logs,
//      migración 014 idempotente con advisory lock.
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  normalizeGa4PropertyId, normalizeGscSiteUrl, normalizeDomain, validateProjectFields,
  classifyGoogleError, explainCode, overallStatus, mergeSyncState, projectHealth, globalHealth,
  summarizeGsc, summarizeGa4, delta, buildSeries, niceScale, explainDiagProject,
  addDays, spanDays, eachDay, lookbackDays, clampDays, bareDomain, ymd,
  coverageOf, invalidateSyncState, sameField, canonicalField,
} from '../lib/seo-core.mjs';
import { dedupeByDate, sourcesInvalidatedBy, shapeProject, defaultRange } from '../lib/seo.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0;
const fails = [];
async function check(name, fn) {
  try { await fn(); pass++; } catch (e) { fails.push(name + ' → ' + e.message); }
}

// ── Fechas ───────────────────────────────────────────────────────
await check('fechas: suma de días y fin de mes / año', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2026-03-08T00:00:00.000Z', 1), '2026-03-09');
  assert.equal(spanDays('2026-10-01', '2026-10-28'), 28);
  assert.equal(eachDay('2026-10-30', '2026-11-02').length, 4);
  assert.equal(ymd('2026-10-19T00:00:00.000Z'), '2026-10-19');
});
await check('fechas: rango a pedir = días ×2 + 4 y límites 1..365', () => {
  assert.equal(lookbackDays(28), 60);
  assert.equal(clampDays('abc'), 28);
  assert.equal(clampDays(0), 1);
  assert.equal(clampDays(9999), 365);
});
await check('fechas: defaultRange usa el día de Houston, no el UTC', () => {
  // 20 oct 2026 02:00 UTC = 19 oct 21:00 en Houston.
  const r = defaultRange(28, new Date('2026-10-20T02:00:00Z'));
  assert.equal(r.endDate, '2026-10-19');
  assert.equal(r.startDate, '2026-09-22');
});

// ── Identificadores (SEO-16) ─────────────────────────────────────
await check('GA4: el ID de medición G- se rechaza con explicación', () => {
  const r = normalizeGa4PropertyId('G-ABC123XYZ');
  assert.equal(r.ok, false);
  assert.match(r.error, /ID de medición/);
});
await check('GA4: properties/123 y espacios se normalizan a dígitos', () => {
  assert.deepEqual(normalizeGa4PropertyId(' properties/412345678 '), { ok: true, value: '412345678' });
  assert.equal(normalizeGa4PropertyId('4123 45678').value, '412345678');
  assert.equal(normalizeGa4PropertyId('').ok, true);
  assert.equal(normalizeGa4PropertyId('abc').ok, false);
  assert.equal(normalizeGa4PropertyId('UA-1234-1').ok, false);
});
await check('GSC: sc-domain se normaliza (minúsculas, sin esquema)', () => {
  assert.equal(normalizeGscSiteUrl('sc-domain:Marcyan.com').value, 'sc-domain:marcyan.com');
  assert.equal(normalizeGscSiteUrl('sc-domain:https://marcyan.com/').value, 'sc-domain:marcyan.com');
  assert.equal(normalizeGscSiteUrl('sc-domain:').ok, false);
});
await check('GSC: prefijo con barra final añadida', () => {
  assert.equal(normalizeGscSiteUrl('https://www.Ejemplo.com').value, 'https://www.ejemplo.com/');
  assert.equal(normalizeGscSiteUrl('https://ejemplo.com/blog').value, 'https://ejemplo.com/blog/');
  assert.equal(normalizeGscSiteUrl('https://ejemplo.com/?a=1').ok, false);
});
await check('GSC: dominio suelto se rechaza proponiendo las dos formas', () => {
  const r = normalizeGscSiteUrl('ejemplo.com');
  assert.equal(r.ok, false);
  assert.match(r.error, /sc-domain:ejemplo\.com/);
  assert.match(r.error, /https:\/\/ejemplo\.com\//);
});
await check('dominio: sin esquema ni ruta', () => {
  assert.equal(normalizeDomain('https://www.ejemplo.com/contacto').value, 'www.ejemplo.com');
  assert.equal(normalizeDomain('no es un dominio').ok, false);
  assert.equal(bareDomain('https://www.Ejemplo.com/x'), 'ejemplo.com');
  assert.equal(bareDomain('sc-domain:ejemplo.com'), 'ejemplo.com');
});
await check('validateProjectFields: alta exige nombre y junta errores por campo', () => {
  const v = validateProjectFields({ name: '  ', ga4_property_id: 'G-1', gsc_site_url: 'x.com' });
  assert.equal(v.ok, false);
  assert.ok(v.errors.name && v.errors.ga4_property_id && v.errors.gsc_site_url);
});
await check('validateProjectFields: edición parcial solo toca lo enviado', () => {
  const v = validateProjectFields({ gsc_site_url: 'https://a.com' }, { partial: true });
  assert.equal(v.ok, true);
  assert.deepEqual(v.values, { gsc_site_url: 'https://a.com/' });
  const w = validateProjectFields({ active: 0 }, { partial: true });
  assert.deepEqual(w.values, { active: false });
});

// ── Voseo (A6-R5) ────────────────────────────────────────────────
// \b no sirve: en una regex de JS la vocal con tilde no cuenta como letra de
// palabra, así que /\btocá\b/ nunca coincide. Límites explícitos con \p{L}.
const VOSEO = /(^|[^\p{L}])(tocá|revisá|conectá|podés|elegí|guardá|corregí|creá|usá|tenés|querés|sabés|mirá|pulsá|escribí|probá|andá|fijate)(?=$|[^\p{L}])/iu;
await check('voseo: la regex detecta las formas que vigila (caso positivo)', () => {
  for (const s of ['Tocá aquí', 'revisá el campo', 'Podés ver', 'conectá la cuenta.', '¿Guardá?', 'usá', 'Elegí otro']) {
    assert.match(s, VOSEO, s);
  }
  for (const s of ['Toca aquí', 'Revisa el campo', 'Puedes ver', 'usado', 'creación', 'guardado']) {
    assert.doesNotMatch(s, VOSEO, s);
  }
});

// ── Errores en español (SEO-02) ──────────────────────────────────
await check('errores: 403 de Search Console → permiso de la propiedad', () => {
  const e = classifyGoogleError('gsc', { status: 403, message: 'GSC query falló (403): User does not have sufficient permission' });
  assert.equal(e.code, 'gsc_forbidden');
  assert.match(e.title, /no tiene permiso/);
  assert.match(e.detail, /403/);
});
await check('errores: GA4 400/404 → ID mal; 403 → acceso; código leído del texto', () => {
  assert.equal(classifyGoogleError('ga4', { status: 400 }).code, 'ga4_bad_id');
  assert.equal(classifyGoogleError('ga4', { message: 'GA4 runReport falló (403): …' }).code, 'ga4_forbidden');
});
await check('errores: not_configured, auth, cuota, caída, desconocido', () => {
  assert.equal(classifyGoogleError('gsc', { code: 'not_configured', message: 'x' }).code, 'not_configured');
  assert.equal(classifyGoogleError('gsc', { code: 'auth_failed' }).code, 'auth_failed');
  assert.equal(classifyGoogleError('ga4', { status: 429 }).code, 'quota');
  assert.equal(classifyGoogleError('gsc', { status: 503 }).code, 'unavailable');
  assert.equal(classifyGoogleError('gsc', { status: 418 }).code, 'unknown');
  assert.equal(classifyGoogleError('indexation', { status: 403 }).code, 'index_forbidden');
});
await check('errores: ningún título ni acción con jerga, voseo ni em-dash', () => {
  const codes = ['not_configured', 'auth_failed', 'no_ids', 'gsc_forbidden', 'gsc_not_found', 'ga4_forbidden', 'ga4_bad_id', 'quota', 'unavailable', 'no_sitemaps', 'index_forbidden', 'index_empty', 'ids_changed', 'db_failed', 'unknown'];
  for (const c of codes) {
    const e = explainCode(c);
    assert.equal(e.code, c, c + ' sin texto propio');
    const txt = e.title + ' ' + e.action;
    assert.doesNotMatch(txt, /—|–/, c + ' con em-dash');
    assert.doesNotMatch(txt, VOSEO, c + ' con voseo');
    assert.doesNotMatch(txt, /\b(WIF|OIDC|STS|GOOGLE_[A-Z_]+|not_configured|403|404)\b/, c + ' con jerga');
  }
});

// ── Estado por fuente (SEO-03, SEO-07) ───────────────────────────
await check('estado: ok solo si todas las fuentes configuradas van bien', () => {
  assert.equal(overallStatus({ gsc: { status: 'ok' }, ga4: { status: 'ok' } }), 'ok');
  assert.equal(overallStatus({ gsc: { status: 'ok' }, ga4: { status: 'error' } }), 'partial');
  assert.equal(overallStatus({ gsc: { status: 'error' }, ga4: { status: 'error' } }), 'error');
  assert.equal(overallStatus({ gsc: { status: 'ok' }, ga4: { status: 'off' } }), 'ok');
  assert.equal(overallStatus({ gsc: { status: 'off' }, ga4: { status: 'off' } }), 'error', 'sin identificadores no es éxito');
});
await check('estado: un fallo conserva la última vez que fue bien (ok_at)', () => {
  const prev = mergeSyncState(null, { at: 'T1', status: 'ok', sources: { gsc: { status: 'ok', at: 'T1' }, ga4: { status: 'ok', at: 'T1' } } });
  const next = mergeSyncState(prev, { at: 'T2', status: 'partial', sources: { gsc: { status: 'ok', at: 'T2' }, ga4: { status: 'error', at: 'T2', error: { code: 'ga4_forbidden' } } } });
  assert.equal(next.sources.gsc.ok_at, 'T2');
  assert.equal(next.sources.ga4.ok_at, 'T1');
  assert.equal(next.sources.ga4.error.code, 'ga4_forbidden');
});
await check('estado: chip por proyecto y global sin "conectado" de mentira', () => {
  assert.equal(projectHealth({ gsc_site_url: 'sc-domain:a.com', sync_state: { status: 'partial' } }).label, 'Con fallos');
  assert.equal(projectHealth({}, { configured: true }).key, 'no_ids');
  assert.equal(projectHealth({ gsc_site_url: 'x' }, { configured: false }).key, 'not_configured');
  assert.equal(globalHealth([], { configured: false }).label, 'Google sin configurar');
  const g = globalHealth([{ active: true, gsc_site_url: 'x', sync_state: { status: 'error' } }, { active: true, gsc_site_url: 'y', sync_state: { status: 'ok' } }]);
  assert.equal(g.tone, 'error');
  assert.equal(globalHealth([{ active: true, gsc_site_url: 'y', sync_state: { status: 'ok' } }]).label, 'Google al día');
});

// ── Ventanas, período previo real y posición ponderada (SEO-13, 19) ─
function gscRows(from, to, f) { return eachDay(from, to).map((d, i) => ({ date: d + 'T00:00:00.000Z', ...f(i, d) })); }
await check('GSC: la ventana termina en el último día con datos y el previo es del mismo tamaño', () => {
  const rows = gscRows('2026-08-20', '2026-10-16', () => ({ clicks: 1, impressions: 10, position: 10 }));
  const s = summarizeGsc(rows, { days: 28, today: '2026-10-19' });
  assert.equal(s.through, '2026-10-16');
  assert.equal(s.lag_days, 3);
  assert.equal(s.current.start, '2026-09-19');
  assert.equal(s.current.clicks, 28);
  assert.equal(s.previous.start, '2026-08-22');
  assert.equal(s.previous.end, '2026-09-18');
  assert.equal(s.previous.clicks, 28);
});
await check('GSC: sin datos del período previo no se inventa comparación', () => {
  const rows = gscRows('2026-09-19', '2026-10-16', () => ({ clicks: 1, impressions: 10, position: 10 }));
  assert.equal(summarizeGsc(rows, { days: 28, today: '2026-10-19' }).previous, null);
  // Con el rango pedido en la sync que sí cubre el previo, vale aunque falten filas al principio.
  const s = summarizeGsc(gscRows('2026-08-25', '2026-10-16', () => ({ clicks: 1, impressions: 1, position: 1 })), { days: 28, synced: { startDate: '2026-08-20' } });
  assert.ok(s.previous);
});
await check('GSC: posición media ponderada por impresiones', () => {
  const rows = [
    { date: '2026-10-15', clicks: 0, impressions: 1, position: 80 },
    { date: '2026-10-16', clicks: 3, impressions: 300, position: 12 },
  ];
  const s = summarizeGsc(rows, { days: 2 });
  assert.equal(Math.round(s.current.position * 100) / 100, 12.23);
  assert.equal(s.current.ctr, 3 / 301);
});
await check('GSC: el resumen de búsquedas no cuenta como día', () => {
  const s = summarizeGsc([{ date: '2026-10-16', clicks: 1, impressions: 2, position: 3 }, { date: '2026-10-19', kind: 'top_queries', queries: [] }], { days: 7 });
  assert.equal(s.through, '2026-10-16');
});
await check('GA4: excluye hoy (a medias) y suma eventos clave', () => {
  const rows = eachDay('2026-08-01', '2026-10-19').map((d) => ({ date: d, sessions: 2, totalUsers: 1, keyEvents: d === '2026-10-19' ? 50 : 0 }));
  const s = summarizeGa4(rows, { days: 28, today: '2026-10-19' });
  assert.equal(s.current.end, '2026-10-18');
  assert.equal(s.current.sessions, 56);
  assert.equal(s.current.key_events, 0);
  assert.equal(s.previous.sessions, 56);
});
await check('delta: dirección, mejora con posición menor y sin base', () => {
  assert.equal(delta(120, 100).txt, '+20 %');
  assert.equal(delta(8, 10, { lowerIsBetter: true }).better, true);
  assert.equal(delta(5, 0), null);
  assert.equal(delta(5, null), null);
  assert.equal(delta(100, 100).dir, 'flat');
});

// ── Cobertura guardada, no la de la última sync (A6-R1) ──────────
await check('cobertura: una sync manual corta no borra la comparación de 28 ni de 90 días', () => {
  // 184 días guardados por el cron; después, "Actualizar ahora" con 7 días.
  const rows = gscRows('2026-04-15', '2026-10-16', () => ({ clicks: 1, impressions: 10, position: 10 }));
  let st = mergeSyncState(null, { at: 'T1', status: 'ok', sources: { gsc: { status: 'ok', at: 'T1', range: { startDate: '2026-04-15', endDate: '2026-10-19' } } } });
  st = mergeSyncState(st, { at: 'T2', status: 'ok', sources: { gsc: { status: 'ok', at: 'T2', range: { startDate: '2026-10-02', endDate: '2026-10-19' } } } });
  assert.equal(st.sources.gsc.covered_from, '2026-04-15');
  for (const days of [28, 90]) {
    const s = summarizeGsc(rows, { days, today: '2026-10-19', synced: coverageOf(st.sources.gsc) });
    assert.ok(s.previous, `${days} días sin período previo`);
    assert.equal(s.current.complete, true);
  }
});
await check('cobertura: un intento fallido conserva lo guardado; uno de otra propiedad no', () => {
  const ok = mergeSyncState(null, { at: 'T1', status: 'ok', sources: { ga4: { status: 'ok', at: 'T1', range: { startDate: '2026-04-15' } } } });
  const failed = mergeSyncState(ok, { at: 'T2', status: 'error', sources: { ga4: { status: 'error', at: 'T2', range: { startDate: '2026-10-01' }, error: { code: 'quota' } } } });
  assert.equal(failed.sources.ga4.covered_from, '2026-04-15');
  const moved = mergeSyncState(ok, { at: 'T3', status: 'error', sources: { ga4: { status: 'error', at: 'T3', error: { code: 'ids_changed' } } } });
  assert.equal(moved.sources.ga4.covered_from, null);
  assert.equal(moved.sources.ga4.ok_at, null);
  // Estados de antes de covered_from: el rango vale solo si aquel intento fue bien.
  assert.deepEqual(coverageOf({ status: 'ok', range: { startDate: '2026-05-01' } }), { startDate: '2026-05-01' });
  assert.equal(coverageOf({ status: 'error', range: { startDate: '2026-05-01' } }), null);
});
await check('cobertura: la vista de 90 días con menos guardado se marca incompleta', () => {
  const rows = gscRows('2026-09-01', '2026-10-16', () => ({ clicks: 1, impressions: 10, position: 10 }));
  const s = summarizeGsc(rows, { days: 90, today: '2026-10-19', synced: { startDate: '2026-09-01' } });
  assert.equal(s.current.complete, false);
  assert.equal(s.current.data_from, '2026-09-01');
  assert.equal(s.previous, null);
  const full = summarizeGsc(rows, { days: 28, today: '2026-10-19', synced: { startDate: '2026-09-01' } });
  assert.equal(full.current.complete, true);
  const a = summarizeGa4(eachDay('2026-10-01', '2026-10-19').map((d) => ({ date: d, sessions: 1 })), { days: 28, today: '2026-10-19' });
  assert.equal(a.current.complete, false);
  assert.equal(a.current.data_from, '2026-10-01');
});
await check('sync: el diario se pide siempre para el rango mayor y su previo', () => {
  const src = read('lib/seo.mjs');
  assert.match(src, /lookbackDays\(Math\.max\(clampDays\(days\), CRON_DAYS\)\)/);
  const det = read('api/admin/seo/projects/[id].mjs');
  assert.match(det, /coverageOf\(srcs\.gsc\)/);
  assert.match(det, /complete === false \? gsc\.current\.data_from/, 'el gráfico no pinta como ceros los días no guardados');
  assert.match(read('src/components/dashboard/SeoSection.svelte'), /los totales no cubren los/);
});

// ── Cambio de propiedad: estado y escrituras (A6-R2, A6-R3) ─────
await check('cambio de propiedad: el estado deja de decir "Al día" y last_synced_at se reinicia', () => {
  const state = { status: 'ok', at: 'T1', error: null, sources: { gsc: { status: 'ok', at: 'T1' }, ga4: { status: 'ok', at: 'T1' }, indexation: { status: 'ok', at: 'T1' } } };
  // GA4 nuevo: aún sin datos → sin estado global.
  const a = invalidateSyncState(state, ['ga4'], { gsc_site_url: 'sc-domain:a.com', ga4_property_id: '412345678' });
  assert.equal(a.status, null);
  assert.equal(a.clearSynced, true);
  assert.ok(!('ga4' in a.sync_state.sources));
  assert.equal(a.sync_state.sources.gsc.status, 'ok');
  const p = shapeProject({ id: '1', gsc_site_url: 'sc-domain:a.com', ga4_property_id: '412345678', sync_state: a.sync_state, last_synced_at: null });
  assert.ok(p.sync_state, 'se conservan las fuentes que siguen valiendo');
  assert.equal(projectHealth(p).label, 'Sin sincronizar');
  // GA4 quitado: el global sale de lo que queda y last_synced_at se conserva.
  const b = invalidateSyncState(state, ['ga4'], { gsc_site_url: 'sc-domain:a.com', ga4_property_id: null });
  assert.equal(b.status, 'ok');
  assert.equal(b.clearSynced, false);
});
await check('cambio de propiedad: PATCH en una transacción y escrituras de la sync con guarda', () => {
  const src = read('lib/seo.mjs');
  assert.match(src, /export async function updateSeoProjectAndSources/);
  assert.match(src, /BEGIN/);
  assert.match(src, /FOR UPDATE/);
  assert.match(src, /FOR SHARE\)/);
  assert.match(src, /upsertMetrics\(project\.id, 'gsc', dateRows, guard\)/);
  assert.match(src, /upsertMetrics\(project\.id, 'ga4', ga\.rows, idsGuard\(project, 'ga4'\)\)/);
  assert.match(src, /upsertMetric\(project\.id, 'indexation', today, r\.data, idsGuard\(project, 'gsc'\)\)/);
  assert.match(read('api/admin/seo/projects/[id].mjs'), /updateSeoProjectAndSources\(id, v\.values\)/);
  const ui = read('src/components/dashboard/SeoSection.svelte');
  assert.match(ui, /queuedSync = String\(id\)/, 'la sync pedida durante otra no se descarta');
});
await check('cambio de propiedad: la guarda se explica en español y no es "fallo de la base"', () => {
  const e = classifyGoogleError('ga4', { code: 'ids_changed', message: 'x' });
  assert.equal(e.code, 'ids_changed');
  assert.match(e.action, /Actualizar ahora/);
});

// ── Tiempo límite de las llamadas a Google (A6-R4) ──────────────
await check('Google: todas las llamadas con tope de tiempo y el tope se explica', () => {
  const src = read('lib/seo.mjs');
  assert.doesNotMatch(src.replace(/function gfetch[\s\S]*?\n}/, ''), /[^g]fetch\(/, 'queda un fetch sin tope');
  assert.match(src, /AbortSignal\.timeout\(GOOGLE_TIMEOUT_MS\)/);
  const t = new Error('The operation was aborted due to timeout'); t.name = 'TimeoutError';
  assert.equal(classifyGoogleError('gsc', t).code, 'unavailable');
  const ab = new Error('This operation was aborted'); ab.name = 'AbortError';
  assert.equal(classifyGoogleError('ga4', ab).code, 'unavailable');
});
await check('Google: entre el presupuesto de los lotes y maxDuration cabe un proyecto entero', async () => {
  const { GOOGLE_PROJECT_WORST_MS } = await import('../lib/seo.mjs');
  const sync = read('api/admin/seo/sync.mjs');
  const maxD = Number(/maxDuration: (\d+)/.exec(sync)[1]) * 1000;
  assert.match(sync, /BULK_BUDGET_MS = 120000 - GOOGLE_PROJECT_WORST_MS - 10000/);
  assert.ok(maxD - (120000 - GOOGLE_PROJECT_WORST_MS - 10000) >= GOOGLE_PROJECT_WORST_MS);
  assert.ok(maxD >= GOOGLE_PROJECT_WORST_MS + 10000, 'una sync de un proyecto cabe');
  assert.match(read('api/cron/seo-sync.mjs'), /300000 - GOOGLE_PROJECT_WORST_MS - 10000/);
});

// ── Identificadores equivalentes (A6-R7) ────────────────────────
await check('identificadores: la barra final no es otra propiedad ni borra datos', () => {
  assert.equal(sameField('gsc_site_url', 'https://www.x.com', 'https://www.x.com/'), true);
  assert.equal(sameField('gsc_site_url', 'https://www.x.com/', 'sc-domain:x.com'), false);
  assert.equal(sameField('ga4_property_id', 'properties/412345678', '412345678'), true);
  assert.equal(canonicalField('name', '  A  '), 'A');
  const before = { gsc_site_url: 'https://www.x.com', ga4_property_id: '412345678' };
  assert.deepEqual(sourcesInvalidatedBy(before, { ...before, gsc_site_url: 'https://www.x.com/' }), []);
  const form = read('src/components/dashboard/seo/SeoProjectForm.svelte');
  assert.match(form, /onblur=\{\(\) => validateField\('name'\)\}/, 'el nombre se valida al salir');
  assert.match(form, /sameField\('gsc_site_url'/);
  assert.match(form, /body: changed/, 'la edición solo envía lo que cambió');
});

// ── Serie y eje (SEO-10) ─────────────────────────────────────────
await check('serie: todos los días, ceros reales y días pendientes como hueco', () => {
  const s = buildSeries([{ date: '2026-10-10', clicks: 4 }, { date: '2026-10-12', clicks: 2 }], 'clicks', '2026-10-10', '2026-10-14', '2026-10-12');
  assert.deepEqual(s.map((p) => p.v), [4, 0, 2, null, null]);
  assert.equal(s[1].missing, true);
  assert.equal(s[3].pending, true);
});
await check('eje Y: escala redonda con 3 marcas que cubren el máximo', () => {
  assert.deepEqual(niceScale(0).ticks, [0, 2, 4]);
  const a = niceScale(37); assert.ok(a.max >= 37 && a.ticks.length === 3);
  const b = niceScale(1234); assert.ok(b.max >= 1234 && b.max <= 2500);
  assert.equal(niceScale(3).max, 4);
});
await check('eje Y: los miles caben (rótulo compacto desde 10 mil) y el eje X dice "3 oct"', async () => {
  const { axisNum, dayShort } = await import('../src/components/dashboard/seo/format.js');
  assert.equal(axisNum(2000), '2,000');
  assert.equal(axisNum(10000), '10 mil');
  for (const m of [5432, 12000, 87000, 4200000]) {
    const sc = niceScale(m);
    for (const t of sc.ticks) assert.ok(axisNum(t).length <= 7, `${t} → "${axisNum(t)}" demasiado largo`);
  }
  assert.equal(dayShort('2026-10-03'), '3 oct');
  const chart = read('src/components/dashboard/seo/SeoChart.svelte');
  assert.doesNotMatch(chart, /fmtDayShort/, 'el eje X no usa DD\/MM');
  assert.match(chart, /const PAD_L = \$derived\(/, 'el margen izquierdo se mide con el rótulo');
});

// ── Diagnóstico (SEO-01) ─────────────────────────────────────────
await check('diag: propiedad de prefijo con acceso solo al dominio → sugiere usarlo', () => {
  const f = explainDiagProject({
    gsc_site_url: 'https://www.a.com/', gsc_exact_match: false,
    gsc_same_domain_accessible: [{ siteUrl: 'sc-domain:a.com' }], gsc_probe: { ok: false, status: 403 },
    ga4_property_id: '123', ga4_exact_match: true, ga4_probe: { ok: true },
  }, { gscListed: true, ga4Listed: true });
  const g = f.find((x) => x.source === 'gsc');
  assert.equal(g.level, 'error');
  assert.deepEqual(g.suggestion, { gsc_site_url: 'sc-domain:a.com' });
  assert.equal(f.find((x) => x.source === 'ga4').level, 'ok');
});
await check('diag: sin identificadores → "sin configurar", no error', () => {
  const f = explainDiagProject({}, {});
  assert.ok(f.every((x) => x.level === 'off'));
});

// ── lib/seo.mjs puras ────────────────────────────────────────────
await check('lote: una fila por fecha (la última gana), sin fechas vacías', () => {
  const out = dedupeByDate([{ date: '2026-10-01', a: 1 }, { date: '2026-10-01', a: 2 }, { a: 3 }, { date: '2026-10-02T00:00:00.000Z', a: 4 }]);
  assert.deepEqual(out, [{ date: '2026-10-01', payload: { a: 2 } }, { date: '2026-10-02', payload: { a: 4 } }]);
});
await check('cambiar la propiedad invalida sus fuentes (SEO-06)', () => {
  const b = { gsc_site_url: 'https://a.com/', ga4_property_id: '1' };
  assert.deepEqual(sourcesInvalidatedBy(b, { ...b, gsc_site_url: 'sc-domain:a.com' }), ['gsc', 'gsc_queries', 'indexation']);
  assert.deepEqual(sourcesInvalidatedBy(b, { ...b, ga4_property_id: '2' }), ['ga4']);
  assert.deepEqual(sourcesInvalidatedBy(b, { ...b, name: 'x' }), []);
});
await check('forma del proyecto: id como texto y campos nuevos aunque falte la 014', () => {
  const p = shapeProject({ id: 9007199254740993n.toString(), name: 'x', active: true, sync_state: {} });
  assert.equal(p.id, '9007199254740993');
  assert.equal(p.sync_state, null);
  assert.equal(p.last_attempt_at, null);
  assert.ok('last_sync_status' in p);
});

// syncProject sin red: los dos casos que no llegan a llamar a Google.
// (Sin base de datos, guardar el estado falla y se registra; no rompe.)
{
  const origErr = console.error;
  console.error = () => {};
  const saved = { a: process.env.GOOGLE_WIF_AUDIENCE, s: process.env.GOOGLE_SA_EMAIL };
  delete process.env.GOOGLE_WIF_AUDIENCE; delete process.env.GOOGLE_SA_EMAIL;
  // Nunca contra la base real: sin cadena de conexión, guardar el estado falla aquí.
  for (const k of Object.keys(process.env)) if (/^(POSTGRES|DATABASE|PG)/.test(k)) delete process.env[k];
  const { syncProject } = await import('../lib/seo.mjs');
  await check('sync: proyecto sin identificadores → error explicado, no "0 actualizados"', async () => {
    const r = await syncProject({ id: '7', name: 'X' }, 28);
    assert.equal(r.ok, false);
    assert.equal(r.status, 'error');
    assert.equal(r.error_detail.code, 'no_ids');
    assert.equal(r.sync_state.error.code, 'no_ids');
  });
  await check('sync: Google sin configurar → cada fuente con su error en español', async () => {
    const r = await syncProject({ id: '8', name: 'Y', gsc_site_url: 'sc-domain:a.com', ga4_property_id: '412345678' }, 28);
    assert.equal(r.status, 'error');
    assert.equal(r.sources.gsc.error.code, 'not_configured');
    assert.equal(r.sources.ga4.error.code, 'not_configured');
    assert.match(r.gsc.error, /no está configurado/);
  });
  if (saved.a != null) process.env.GOOGLE_WIF_AUDIENCE = saved.a;
  if (saved.s != null) process.env.GOOGLE_SA_EMAIL = saved.s;
  console.error = origErr;
}

// ── Recorrido estático ───────────────────────────────────────────
await check('cron: protegido con CRON_SECRET en tiempo constante', () => {
  const src = read('api/cron/seo-sync.mjs');
  assert.match(src, /safeEqual\(/);
  assert.doesNotMatch(src, /===\s*secret/);
  assert.match(src, /status\(401\)/);
});
await check('cron: registrado en vercel.json de madrugada y con maxDuration', () => {
  const v = JSON.parse(read('vercel.json'));
  const c = v.crons.find((x) => x.path === '/api/cron/seo-sync');
  assert.ok(c, 'falta el cron');
  const hourUtc = Number(c.schedule.split(' ')[1]);
  // 3 a 6 a. m. en Houston (UTC−6 o −5): madrugada todo el año.
  assert.ok(hourUtc - 6 >= 2 && hourUtc - 5 <= 6, 'no es de madrugada en Houston');
  assert.ok(v.functions['api/cron/*.mjs'] && v.functions['api/cron/*.mjs'].maxDuration >= 120);
});
await check('sync: maxDuration explícito y bearer en tiempo constante', () => {
  const src = read('api/admin/seo/sync.mjs');
  assert.match(src, /export const config = \{ maxDuration: \d+ \}/);
  assert.match(src, /safeEqual\(/);
});
await check('diag: solo GET y errores con JSON', () => {
  const src = read('api/admin/seo/diag.mjs');
  assert.match(src, /req\.method !== 'GET'/);
  assert.match(src, /status\(500\)\.json/);
});
await check('lib/seo.mjs: no registra tokens ni claims', () => {
  const src = read('lib/seo.mjs');
  assert.doesNotMatch(src, /console\.(log|error)\([^)]*(token|oidc|audience|claims)/i);
});
await check('migración 014: idempotente, con advisory lock y CHECK de fuentes', () => {
  const src = read('db/migrations/014_seo.sql');
  assert.match(src, /pg_advisory_xact_lock\(\d+\)/);
  assert.match(src, /ADD COLUMN IF NOT EXISTS sync_state/);
  assert.match(src, /DROP CONSTRAINT IF EXISTS seo_metrics_source_check/);
  assert.match(src, /'gsc_queries'/);
  assert.match(src, /^BEGIN;/m);
  assert.match(src, /^COMMIT;/m);
});
await check('panel: sin voseo ni emojis en la sección SEO', () => {
  const dir = path.join(ROOT, 'src/components/dashboard/seo');
  const files = ['src/components/dashboard/SeoSection.svelte', ...(fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => 'src/components/dashboard/seo/' + f) : [])];
  for (const f of files) {
    const src = read(f);
    assert.doesNotMatch(src, VOSEO, f + ' con voseo');
    assert.doesNotMatch(src, /[\u{1F300}-\u{1FAFF}✎]/u, f + ' con emoji');
  }
});

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) de SEO fallaron:\n - ` + fails.join('\n - '));
  process.exit(1);
}
console.log(`✓ ${pass} pruebas de SEO en verde`);
