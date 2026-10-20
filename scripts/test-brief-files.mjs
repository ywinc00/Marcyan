// ════════════════════════════════════════════════════════════════
//  scripts/test-brief-files.mjs  ·  npm run test:brief-files
//  Conciliación de archivos del brief y del kit (lib/brief-files.mjs) con
//  la base y Vercel Blob FALSOS (mock.module), sin red ni base real:
//    · lo quitado sale de brief_files y del almacén y no se devuelve,
//      también en el kit con archivos ya enlazados (B1-R04)
//    · una subida que el navegador no declara no se enlaza (R6)
//    · si el almacén falla al borrar, el borrador entra en la cola y el
//      cron la repite con lo que mandó el navegador (R4)
//  Necesita --experimental-test-module-mocks (lo pone el script de npm).
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import { mock } from 'node:test';

let pass = 0;
const fails = [];
async function check(name, fn) {
  try { await fn(); pass++; } catch (e) { fails.push(name + ' → ' + (e && e.message)); }
}

// ── Base falsa: brief_files y brief_drafts en memoria ─────────────
const norm = (t) => String(t).replace(/\s+/g, ' ').trim();
const db = { files: [], drafts: [], nextId: 1 };
const log = [];
function run(text, p) {
  const t = norm(text);
  log.push(t);
  const ok = (rows = []) => Promise.resolve({ rows, rowCount: rows.length });
  if (t.startsWith('SELECT pathname, content_type, brief_id FROM brief_files WHERE draft_id')) {
    return ok(db.files.filter((f) => f.draft_id === p[0]).map((f) => ({ pathname: f.pathname, content_type: f.content_type, brief_id: f.brief_id })));
  }
  if (t.startsWith('DELETE FROM brief_files WHERE draft_id = $1 AND (pathname = ANY($2) OR (brief_id IS NULL AND pathname = ANY($3)))')) {
    const before = db.files.length;
    db.files = db.files.filter((f) => !(f.draft_id === p[0] && (p[1].includes(f.pathname) || (f.brief_id === null && p[2].includes(f.pathname)))));
    return Promise.resolve({ rows: [], rowCount: before - db.files.length });
  }
  if (t === 'DELETE FROM brief_files WHERE draft_id = $1') { db.files = db.files.filter((f) => f.draft_id !== p[0]); return ok(); }
  if (t === 'DELETE FROM brief_drafts WHERE id = $1') { db.drafts = db.drafts.filter((d) => d.id !== p[0]); return ok(); }
  if (t.startsWith('INSERT INTO brief_files')) {
    const [draft_id, brief_id, kind, pathname, content_type, size, original_name, converted_from, tags] = p;
    let f = db.files.find((x) => x.pathname === pathname);
    if (!f) { f = { id: db.nextId++, draft_id, brief_id: null, kind, pathname, verified: null }; db.files.push(f); }
    Object.assign(f, { brief_id: brief_id ?? f.brief_id, content_type: content_type ?? f.content_type, size: size ?? f.size, original_name: original_name ?? f.original_name, converted_from, tags: JSON.parse(tags) });
    return ok([{ id: f.id }]);
  }
  if (t.startsWith('UPDATE brief_files SET brief_id = $1 WHERE draft_id = $2 AND pathname = ANY($3)')) {
    for (const f of db.files) if (f.draft_id === p[1] && p[2].includes(f.pathname)) f.brief_id = p[0];
    return ok();
  }
  if (t.startsWith('SELECT id, kind, pathname, content_type, size, original_name, converted_from, tags, verified FROM brief_files WHERE draft_id')) {
    return ok(db.files.filter((f) => f.draft_id === p[0] && f.brief_id === p[1]));
  }
  if (t.startsWith('UPDATE brief_drafts SET sweep_at = NOW(), sweep_meta = COALESCE')) {
    const d = db.drafts.find((x) => x.id === p[1]);
    if (d) { d.sweep_at = Date.now(); if (p[0] !== null) d.sweep_meta = JSON.parse(p[0]); }
    return ok();
  }
  if (t.startsWith('SELECT id, brief_id, sweep_meta FROM brief_drafts WHERE sweep_at IS NOT NULL')) {
    return ok(db.drafts.filter((d) => d.sweep_at).map((d) => ({ id: d.id, brief_id: d.brief_id, sweep_meta: d.sweep_meta })));
  }
  if (t.startsWith('UPDATE brief_drafts SET sweep_at = NULL WHERE id')) { db.drafts.find((x) => x.id === p[0]).sweep_at = null; return ok(); }
  if (t.startsWith('UPDATE brief_drafts SET sweep_meta = NULL WHERE id')) { const d = db.drafts.find((x) => x.id === p[0]); if (!d.sweep_at) d.sweep_meta = null; return ok(); }
  if (t.startsWith('UPDATE brief_drafts SET sweep_at = NOW() WHERE id')) { db.drafts.find((x) => x.id === p[0]).sweep_at = Date.now(); return ok(); }
  throw new Error(`consulta no prevista en la base falsa: ${t.slice(0, 120)}`);
}
function sqlTag(strings, ...values) {
  let text = strings[0];
  values.forEach((v, i) => { text += `$${i + 1}` + strings[i + 1]; });
  return run(text, values);
}
sqlTag.query = (text, params) => run(text, params);
mock.module('@vercel/postgres', { namedExports: { sql: sqlTag } });

// ── Almacén falso ─────────────────────────────────────────────────
const blob = { items: new Map(), failDel: 0, deleted: [] };
mock.module('@vercel/blob', {
  namedExports: {
    list: async ({ prefix }) => ({ blobs: [...blob.items.values()].filter((b) => b.pathname.startsWith(prefix)), hasMore: false }),
    head: async (p) => ({ contentType: (blob.items.get(p) || {}).contentType || null }),
    get: async () => null,
    del: async (paths) => {
      if (blob.failDel > 0) { blob.failDel--; throw new Error('Blob caído'); }
      for (const p of [].concat(paths)) { blob.items.delete(p); blob.deleted.push(p); }
    },
  },
});

const { reconcileDraft, queueDraftSweep, sweepQueuedDrafts } = await import('../lib/brief-files.mjs');

const DRAFT = '6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f';
const KIT = '7a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const P = (d, n) => `briefs/${d}/photo/${n}.jpg`;
function reset() {
  db.files = []; db.drafts = []; db.nextId = 1; blob.items.clear(); blob.failDel = 0; blob.deleted = []; log.length = 0;
}
// Reserva (como reserveUpload) y, si llegó, el blob.
function seed(draftId, name, { uploaded = true, briefId = null } = {}) {
  const pathname = P(draftId, name);
  db.files.push({ id: db.nextId++, draft_id: draftId, brief_id: briefId, kind: 'photo', pathname, content_type: 'image/jpeg', verified: null, tags: {} });
  if (uploaded) blob.items.set(pathname, { pathname, size: 1000, contentType: 'image/jpeg' });
  return pathname;
}

await check('brief: lo quitado sale del almacén y de brief_files, y no se devuelve (B1-R04)', async () => {
  reset();
  db.drafts.push({ id: DRAFT, brief_id: 10 });
  const a = seed(DRAFT, 'a'), b = seed(DRAFT, 'b');
  const rows = await reconcileDraft({ draftId: DRAFT, briefId: 10, filesMeta: [{ pathname: a, tags: { field: 'photo_files' } }, { pathname: b, removed: true }] });
  assert.deepEqual(rows.map((r) => r.pathname), [a]);
  assert.ok(!blob.items.has(b) && blob.deleted.includes(b), 'borrado del almacén');
  assert.ok(!db.files.some((f) => f.pathname === b), 'borrado de brief_files');
  assert.equal(db.files.find((f) => f.pathname === a).brief_id, 10);
});

await check('brief: una subida que el navegador no declara (recarga a mitad) se borra y no entra (R6)', async () => {
  reset();
  db.drafts.push({ id: DRAFT, brief_id: 10 });
  const a = seed(DRAFT, 'a'), h = seed(DRAFT, 'huerfana');
  const rows = await reconcileDraft({ draftId: DRAFT, briefId: 10, filesMeta: [{ pathname: a }] });
  assert.deepEqual(rows.map((r) => r.pathname), [a]);
  assert.ok(!blob.items.has(h) && !db.files.some((f) => f.pathname === h));
});

await check('kit: lo ya enlazado se conserva aunque no venga en la lista; lo quitado se borra aunque estuviera enlazado', async () => {
  reset();
  db.drafts.push({ id: KIT, brief_id: 20 });
  const antes = seed(KIT, 'antes', { briefId: 20 });
  const quitado = seed(KIT, 'quitado', { briefId: 20 });
  const nueva = seed(KIT, 'nueva');
  const rows = await reconcileDraft({ draftId: KIT, briefId: 20, filesMeta: [{ pathname: nueva }, { pathname: quitado, removed: true }] });
  assert.deepEqual(rows.map((r) => r.pathname).sort(), [antes, nueva].sort());
  assert.ok(!blob.items.has(quitado) && !db.files.some((f) => f.pathname === quitado));
  assert.ok(blob.items.has(antes));
});

await check('kit: un guardado intermedio no borra la subida que terminó mientras viajaba (DM-02); el envío sí decide', async () => {
  reset();
  db.drafts.push({ id: KIT, brief_id: 20 });
  const vista = seed(KIT, 'vista');
  const recien = seed(KIT, 'recien'); // el put terminó, el navegador aún no la declara
  const quitado = seed(KIT, 'quitado');
  const rows = await reconcileDraft({ draftId: KIT, briefId: 20, filesMeta: [{ pathname: vista }, { pathname: quitado, removed: true }], final: false });
  assert.deepEqual(rows.map((r) => r.pathname), [vista]);
  assert.ok(blob.items.has(recien), 'la subida recién terminada sigue en el almacén');
  assert.equal(db.files.find((f) => f.pathname === recien).brief_id, null, 'su reserva sigue, sin enlazar');
  assert.ok(!blob.items.has(quitado), 'lo quitado sí se borra');
  // El siguiente guardado ya la declara: entra.
  const after = await reconcileDraft({ draftId: KIT, briefId: 20, filesMeta: [{ pathname: vista }, { pathname: recien }] });
  assert.deepEqual(after.map((r) => r.pathname).sort(), [recien, vista].sort());
});

await check('sin lista del navegador: todo lo reservado entra, como antes', async () => {
  reset();
  db.drafts.push({ id: DRAFT, brief_id: 10 });
  const a = seed(DRAFT, 'a'), b = seed(DRAFT, 'b');
  const rows = await reconcileDraft({ draftId: DRAFT, briefId: 10 });
  assert.deepEqual(rows.map((r) => r.pathname).sort(), [a, b].sort());
});

await check('Blob falla al borrar: el borrador entra en la cola y el cron lo termina (R4)', async () => {
  reset();
  db.drafts.push({ id: DRAFT, brief_id: 10, sweep_at: null, sweep_meta: null });
  const a = seed(DRAFT, 'a'), b = seed(DRAFT, 'b');
  const meta = [{ pathname: a }, { pathname: b, removed: true }];
  blob.failDel = 1;
  const rows = await reconcileDraft({ draftId: DRAFT, briefId: 10, filesMeta: meta });
  assert.deepEqual(rows.map((r) => r.pathname), [a], 'lo quitado no entra aunque el borrado falle');
  assert.ok(blob.items.has(b), 'el blob sigue en el almacén');
  const d = db.drafts[0];
  assert.ok(d.sweep_at, 'en la cola');
  assert.deepEqual(d.sweep_meta.map((m) => m.pathname), [a, b]);
  const out = await sweepQueuedDrafts({ limit: 5 });
  assert.deepEqual(out, { swept: 1, failed: 0 });
  assert.ok(!blob.items.has(b), 'el cron lo borró');
  assert.ok(!d.sweep_at && d.sweep_meta === null, 'fuera de la cola');
  assert.equal(db.files.find((f) => f.pathname === a).brief_id, 10, 'lo que el cliente dejó sigue enlazado');
});

await check('conciliación que falla entera: el cron enlaza lo que el cliente dejó y borra lo que quitó (R4)', async () => {
  reset();
  db.drafts.push({ id: DRAFT, brief_id: 10, sweep_at: null, sweep_meta: null });
  const a = seed(DRAFT, 'a'), b = seed(DRAFT, 'b');
  await queueDraftSweep(DRAFT, [{ pathname: a, tags: { field: 'photo_files' } }, { pathname: b, removed: true }]);
  assert.ok(db.drafts[0].sweep_at);
  blob.failDel = 1; // el primer intento del cron vuelve a fallar: sigue en la cola
  await sweepQueuedDrafts();
  assert.ok(db.drafts[0].sweep_at, 'sigue en la cola tras fallar');
  assert.ok(blob.items.has(b));
  await sweepQueuedDrafts();
  assert.ok(!db.drafts[0].sweep_at && !blob.items.has(b));
  assert.equal(db.files.find((f) => f.pathname === a).brief_id, 10);
});

await check('cola sin brief (se borró): el cron borra todo lo del borrador', async () => {
  reset();
  db.drafts.push({ id: DRAFT, brief_id: null, sweep_at: Date.now(), sweep_meta: null });
  seed(DRAFT, 'a');
  const out = await sweepQueuedDrafts();
  assert.deepEqual(out, { swept: 1, failed: 0 });
  assert.ok(!blob.items.size, 'los blobs del borrador sin brief se borran');
  assert.ok(!db.files.length && !db.drafts.length, 'y sus filas');
});

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) de la conciliación de archivos fallaron:`);
  for (const f of fails) console.error(' - ' + f);
  process.exit(1);
}
console.log(`✓ ${pass} pruebas de la conciliación de archivos pasaron.`);
