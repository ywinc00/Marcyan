// ════════════════════════════════════════════════════════════════
//  scripts/test-brief-files.mjs  ·  npm run test:brief-files
//  Conciliación de archivos del brief y del kit (lib/brief-files.mjs) con
//  la base y Vercel Blob FALSOS (mock.module), sin red ni base real:
//    · lo quitado sale de brief_files y del almacén y no se devuelve,
//      también en el kit con archivos ya enlazados (B1-R04)
//    · una subida que el navegador no declara no se enlaza (R6)
//    · si el almacén falla al borrar, el borrador entra en la cola y el
//      cron la repite con lo que mandó el navegador (R4)
//    · plazo de conservación (lib/brief-retention.mjs): fecha de borrado a
//      12 meses de terminar (la última vez que pasó a Completado; se anula
//      si se reabre) o de archivar sin completar (el último archivado),
//      con la causa en el aviso y en la ficha (retentionCause), aviso 30
//      días antes deduplicado, borrado por tandas
//      que nunca toca briefs sin terminar, evento 'files_purged', y el
//      endpoint DELETE /api/admin/briefs/:id/files detrás de requireAdmin
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
const db = { files: [], drafts: [], nextId: 1, briefs: [], events: [], notifications: [], projects: [], candidateCalls: 0, failRecords: 0 };
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
  // ── Plazo de conservación ──
  if (t.startsWith('SELECT b.id, b.project_id, b.business_name, b.status, b.completed_at,')) {
    db.candidateCalls++;
    const rows = db.briefs
      .filter((b) => ['completed', 'archived'].includes(b.status) && b.id > p[0] && db.files.some((f) => f.brief_id === b.id))
      .sort((a, b) => a.id - b.id).slice(0, p[1])
      .map((b) => {
        const by = {};
        for (const f of db.files) if (f.brief_id === b.id) by[f.kind] = (by[f.kind] || 0) + 1;
        const events = db.events.filter((e) => e.project_id === b.project_id && e.event_type === 'status_changed')
          .sort((x, y) => (x.created_at < y.created_at ? -1 : 1));
        const projects = db.projects.filter((x) => x.brief_project_id === b.project_id).map((x) => ({ status: x.status, completed_at: x.completed_at }));
        return { id: b.id, project_id: b.project_id, business_name: b.business_name, status: b.status, completed_at: b.completed_at, events, projects, by_kind: by };
      });
    return ok(rows);
  }
  if (t === 'SELECT status FROM briefs WHERE id = $1 LIMIT 1') return ok(db.briefs.filter((b) => b.id === p[0]).map((b) => ({ status: b.status })));
  if (t === 'SELECT * FROM briefs WHERE project_id = $1 LIMIT 1') return ok(db.briefs.filter((b) => b.project_id === p[0]).map((b) => ({ ...b })));
  if (t === 'SELECT id, pathname FROM brief_files WHERE brief_id = $1') return ok(db.files.filter((f) => f.brief_id === p[0]).map((f) => ({ id: f.id, pathname: f.pathname })));
  if (t.startsWith('SELECT id FROM brief_drafts WHERE brief_id = $1 AND (submitted_at IS NOT NULL OR expires_at <= NOW())')) {
    return ok(db.drafts.filter((d) => d.brief_id === p[0] && (d.submitted_at || (d.expires_at && d.expires_at <= Date.now()))).map((d) => ({ id: d.id })));
  }
  // Borrado de filas + evento en UNA sentencia (RET-06): si falla, no cambia nada.
  if (t.startsWith('WITH gone AS ( DELETE FROM brief_files WHERE brief_id = $1 AND id::text = ANY($2) RETURNING id ) INSERT INTO brief_events')) {
    if (db.failRecords > 0) { db.failRecords--; return Promise.reject(new Error('Base caída')); }
    const gone = db.files.filter((f) => f.brief_id === p[0] && p[1].includes(String(f.id)));
    db.files = db.files.filter((f) => !gone.includes(f));
    db.events.push({ project_id: p[2], event_type: 'files_purged', actor_email: p[3], data: { files: gone.length, reason: p[4] }, created_at: new Date().toISOString() });
    return ok([{ files: gone.length }]);
  }
  if (t === 'SELECT status, completed_at FROM projects WHERE brief_project_id = $1') {
    return ok(db.projects.filter((x) => x.brief_project_id === p[0]).map((x) => ({ status: x.status, completed_at: x.completed_at })));
  }
  if (t === "SELECT MIN(created_at) AS at FROM notifications WHERE type = 'system' AND ref = $1") {
    const at = db.notifications.filter((n) => n.type === 'system' && n.ref === p[0]).map((n) => n.at).sort((a, b) => a - b)[0];
    return ok([{ at: at ? new Date(at).toISOString() : null }]);
  }
  if (t === 'DELETE FROM brief_files WHERE brief_id IS NULL AND draft_id::text = ANY($1)') {
    db.files = db.files.filter((f) => !(f.brief_id === null && p[0].includes(f.draft_id)));
    return ok();
  }
  if (t.startsWith('INSERT INTO brief_events (project_id, event_type, actor_email, data)')) {
    db.events.push({ project_id: p[0], event_type: p[1], actor_email: p[2], data: p[3] ? JSON.parse(p[3]) : null, created_at: new Date().toISOString() });
    return ok();
  }
  if (t.startsWith('SELECT event_type, actor_email, data, created_at FROM brief_events WHERE project_id = $1')) {
    const rows = db.events.filter((e) => e.project_id === p[0] && ['status_changed', 'files_purged'].includes(e.event_type))
      .sort((x, y) => (x.created_at < y.created_at ? 1 : -1));
    assert.ok(/ORDER BY created_at DESC LIMIT 500$/.test(t), 'lee los 500 más recientes');
    return ok(rows.slice(0, 500));
  }
  if (t.startsWith('SELECT f.id, f.kind, f.pathname')) {
    return ok(db.files.filter((f) => f.brief_id === p[0]).map((f) => ({ ...f, purpose: 'brief', created_at: new Date().toISOString() })));
  }
  if (t.startsWith('SELECT 1 FROM notifications WHERE type = $1 AND ref = $2')) {
    return ok(db.notifications.filter((n) => n.type === p[0] && n.ref === p[1] && Date.now() - n.at < p[2] * 60000).map(() => ({ x: 1 })));
  }
  if (t.startsWith('INSERT INTO notifications (type, title, body, ref, url)')) {
    const row = { id: db.notifications.length + 1, type: p[0], title: p[1], body: p[2], ref: p[3], url: p[4], read_at: null, created_at: new Date().toISOString(), at: Date.now() };
    db.notifications.push(row);
    return ok([row]);
  }
  throw new Error(`consulta no prevista en la base falsa: ${t.slice(0, 120)}`);
}
function sqlTag(strings, ...values) {
  let text = strings[0];
  values.forEach((v, i) => { text += `$${i + 1}` + strings[i + 1]; });
  return run(text, values);
}
sqlTag.query = (text, params) => run(text, params);
// Conexión con transacción (lib/db.mjs updateBriefStatus): registra las
// consultas y puede fallar en el INSERT del evento.
const tx = { log: [], failInsert: false, status: 'completed', released: 0 };
const fakeDb = {
  connect: async () => ({
    query: async (text, params = []) => {
      const t = norm(text);
      tx.log.push(t);
      if (t.startsWith('SELECT status FROM briefs WHERE project_id = $1 FOR UPDATE')) return { rows: [{ status: tx.status }], rowCount: 1 };
      if (t.startsWith('UPDATE briefs SET status = $1')) return { rows: [{ status: params[0], contacted_at: null, completed_at: '2025-03-01T15:00:00Z' }], rowCount: 1 };
      if (t.startsWith('INSERT INTO brief_events')) {
        if (tx.failInsert) throw new Error('Base caída');
        tx.inserted = params;
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release: () => { tx.released++; },
  }),
};
mock.module('@vercel/postgres', { namedExports: { sql: sqlTag, db: fakeDb } });

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

// ── Sesión de admin falsa (lib/auth.mjs) ──────────────────────────
// requireAdmin responde 401 si la prueba no puso sesión.
let SESSION = null;
mock.module(new URL('../lib/auth.mjs', import.meta.url).href, {
  namedExports: {
    requireAdmin: async (req, res) => {
      if (!SESSION) { res.status(401).json({ ok: false, error: 'No autorizado' }); return null; }
      return SESSION;
    },
    safeEqual: (a, b) => String(a) === String(b),
  },
});
process.env.BLOB_READ_WRITE_TOKEN = 'token-de-prueba';
process.env.CRON_SECRET = 'secreto-de-prueba';

const { reconcileDraft, queueDraftSweep, sweepQueuedDrafts, runFileRetention, purgeBriefFiles } = await import('../lib/brief-files.mjs');
const R = await import('../lib/brief-retention.mjs');
const { houstonDate: houstonDay } = await import('../lib/dates.mjs');
const filesHandler = (await import('../api/admin/briefs/[id]/files.mjs')).default;
const cronHandler = (await import('../api/cron/brief-cleanup.mjs')).default;

const DRAFT = '6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f';
const KIT = '7a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const P = (d, n) => `briefs/${d}/photo/${n}.jpg`;
function reset() {
  db.files = []; db.drafts = []; db.nextId = 1; db.briefs = []; db.events = []; db.notifications = []; db.projects = []; db.candidateCalls = 0; db.failRecords = 0; SESSION = null; blob.items.clear(); blob.failDel = 0; blob.deleted = []; log.length = 0;
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

// ════════════════════════════════════════════════════════════════
//  Plazo de conservación de los archivos
// ════════════════════════════════════════════════════════════════
const DAY = 86400000;
const ago = (days) => new Date(Date.now() - days * DAY).toISOString();
const SC = (to, at, from = 'in_progress') => ({ event_type: 'status_changed', data: { from, to }, created_at: at });
const quiet = async (fn) => {
  const e = console.error, l = console.log, w = console.warn;
  console.error = console.log = console.warn = () => {};
  try { return await fn(); } finally { console.error = e; console.log = l; console.warn = w; }
};
function resCap() {
  return {
    statusCode: 200, body: undefined, headers: {},
    status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; }, setHeader(k, v) { this.headers[k] = v; },
  };
}

await check('fecha: 12 meses desde que pasó a Completado, en día de Houston', () => {
  const b = { status: 'completed', completed_at: '2026-03-01T15:00:00Z' };
  // 03:00 UTC del 20-oct = 22:00 del 19-oct en Houston.
  assert.equal(R.purgeDate(b, [SC('completed', '2026-10-20T03:00:00Z')]), '2027-10-19');
  assert.equal(R.purgeDate(b, [SC('completed', '2026-10-20T15:00:00Z')]), '2027-10-20');
});

await check('fecha: cuenta la ÚLTIMA vez que pasó a Completado (completed_at guarda la primera)', () => {
  const b = { status: 'completed', completed_at: '2026-01-10T15:00:00Z' };
  const ev = [SC('completed', '2026-01-10T15:00:00Z'), SC('in_progress', '2026-02-01T15:00:00Z', 'completed'), SC('completed', '2026-05-04T15:00:00Z')];
  assert.equal(R.purgeDate(b, ev), '2027-05-04');
  assert.equal(R.purgeDate(b, ev.slice().reverse()), '2027-05-04', 'el orden de llegada no importa');
});

await check('fecha: si el brief se reabre, el reloj se anula (null)', () => {
  const ev = [SC('completed', '2026-01-10T15:00:00Z'), SC('in_progress', '2026-02-01T15:00:00Z', 'completed')];
  assert.equal(R.purgeDate({ status: 'in_progress', completed_at: '2026-01-10T15:00:00Z' }, ev), null);
  assert.equal(R.purgeDate({ status: 'pending' }, []), null);
  assert.equal(R.purgeDate({ status: 'contacted', completed_at: '2026-01-10T15:00:00Z' }, []), null);
  assert.equal(R.purgeDate(null, ev), null);
});

await check('fecha: archivar un proyecto terminado no para el reloj; archivar sin terminar arranca el suyo', () => {
  const ev = [SC('completed', '2026-01-10T15:00:00Z'), SC('archived', '2026-03-01T15:00:00Z', 'completed')];
  assert.equal(R.purgeDate({ status: 'archived', completed_at: '2026-01-10T15:00:00Z' }, ev), '2027-01-10');
  assert.equal(R.retentionCause({ status: 'archived', completed_at: '2026-01-10T15:00:00Z' }, ev), 'completed');
  // Decisión del dueño 2026-10-20: archivado sin completar = 12 meses desde que se archivó.
  assert.equal(R.purgeDate({ status: 'archived' }, [SC('archived', '2026-03-01T15:00:00Z', 'contacted')]), '2027-03-01');
  // Reabierto tras completarse y archivado sin volver a completarse: cuenta el archivado.
  const reopened = [SC('completed', '2026-01-10T15:00:00Z'), SC('contacted', '2026-02-01T15:00:00Z', 'completed'), SC('archived', '2026-03-01T15:00:00Z', 'contacted')];
  assert.equal(R.purgeDate({ status: 'archived', completed_at: '2026-01-10T15:00:00Z' }, reopened), '2027-03-01');
  assert.equal(R.retentionCause({ status: 'archived', completed_at: '2026-01-10T15:00:00Z' }, reopened), 'archived');
});

await check('archivado sin completar: 12 meses desde el archivado, en día de Houston', () => {
  const b = { status: 'archived', completed_at: null };
  // 03:00 UTC del 5-mar = 21:00 del 4-mar en Houston.
  const ev = [SC('contacted', '2026-02-01T15:00:00Z', 'pending'), SC('archived', '2026-03-05T03:00:00Z', 'contacted')];
  assert.equal(R.purgeDate(b, ev), '2027-03-04');
  assert.equal(R.finishedAt(b, ev).toISOString(), '2026-03-05T03:00:00.000Z');
  assert.equal(R.retentionCause(b, ev), 'archived');
});

await check('archivado, reabierto y vuelto a archivar: cuenta el ÚLTIMO archivado', () => {
  const b = { status: 'archived' };
  const ev = [
    SC('archived', '2026-01-10T15:00:00Z', 'pending'),
    SC('contacted', '2026-04-01T15:00:00Z', 'archived'),
    SC('archived', '2026-06-20T15:00:00Z', 'contacted'),
  ];
  assert.equal(R.purgeDate(b, ev), '2027-06-20');
  assert.equal(R.purgeDate(b, ev.slice().reverse()), '2027-06-20', 'el orden de llegada no importa');
  assert.equal(R.retentionCause(b, ev), 'archived');
  // Si se reabre y sigue abierto, no hay fecha ni causa.
  const open = ev.slice(0, 2);
  assert.equal(R.purgeDate({ status: 'contacted' }, open), null);
  assert.equal(R.retentionCause({ status: 'contacted' }, open), null);
  // Archivado otra vez pero sin ese paso registrado: conservador, sin fecha.
  assert.equal(R.purgeDate(b, open), null);
});

await check('completado y luego archivado: cuenta el completado, no el archivado', () => {
  const b = { status: 'archived', completed_at: '2026-01-10T15:00:00Z' };
  const ev = [SC('completed', '2026-01-10T15:00:00Z'), SC('archived', '2026-08-01T15:00:00Z', 'completed')];
  assert.equal(R.purgeDate(b, ev), '2027-01-10');
  assert.equal(R.retentionCause(b, ev), 'completed');
});

await check('archivado sin historial de estados y nunca completado: sin fecha (conservador)', () => {
  assert.equal(R.purgeDate({ status: 'archived', completed_at: null }, []), null);
  assert.equal(R.finishedAt({ status: 'archived' }, []), null);
  assert.equal(R.retentionCause({ status: 'archived' }, []), null);
  // Sin historial pero con completed_at: cuenta como terminado.
  assert.equal(R.retentionCause({ status: 'archived', completed_at: '2026-01-10T15:00:00Z' }, []), 'completed');
});

await check('archivado sin completar con su proyecto de Progreso activo o en pausa: sin fecha', () => {
  const b = { status: 'archived' };
  const ev = [SC('archived', '2026-03-01T15:00:00Z', 'contacted')];
  assert.equal(R.purgeDate(b, ev, [{ status: 'active', completed_at: null }]), null);
  assert.equal(R.purgeDate(b, ev, [{ status: 'on_hold', completed_at: null }]), null);
  assert.equal(R.retentionCause(b, ev, [{ status: 'active', completed_at: null }]), null);
  // Cancelado no frena: sigue el reloj del archivado.
  assert.equal(R.purgeDate(b, ev, [{ status: 'cancelled', completed_at: null }]), '2027-03-01');
  assert.equal(R.retentionCause(b, ev, [{ status: 'cancelled', completed_at: null }]), 'archived');
  // Si su proyecto se completó, sí llegó a ser proyecto: manda su cierre.
  assert.equal(R.purgeDate(b, ev, [{ status: 'completed', completed_at: '2026-05-01T15:00:00Z' }]), '2027-05-01');
  assert.equal(R.retentionCause(b, ev, [{ status: 'completed', completed_at: '2026-05-01T15:00:00Z' }]), 'completed');
});

await check('fecha: sin historial de estados usa completed_at; fin de mes sin desbordar', () => {
  assert.equal(R.purgeDate({ status: 'completed', completed_at: '2026-06-15T18:00:00Z' }, []), '2027-06-15');
  assert.equal(R.addMonthsDay('2028-02-29', 12), '2029-02-28');
  assert.equal(R.addMonthsDay('2026-01-31', 1), '2026-02-28');
  assert.equal(R.addMonthsDay('nada', 12), null);
});

await check('etapas: más de 30 días guarda, 30 o menos avisa, el día llegado borra', () => {
  const now = Date.parse('2026-10-19T15:00:00Z'); // 10 a. m. en Houston
  assert.equal(R.daysUntil('2026-11-19', now), 31);
  assert.equal(R.retentionStage('2026-11-19', now), 'keep');
  assert.equal(R.retentionStage('2026-11-18', now), 'notice');
  assert.equal(R.retentionStage('2026-10-20', now), 'notice');
  assert.equal(R.retentionStage('2026-10-19', now), 'purge');
  assert.equal(R.retentionStage('2026-10-01', now), 'purge');
  assert.equal(R.retentionStage(null, now), 'keep');
});

await check('aviso: dice qué se borra, cuándo y que se puede descargar el kit; sin guion largo', () => {
  const n = R.purgeNotice({ projectId: 'MRC-017', businessName: 'Acme', purgeOn: '2027-10-19', byKind: { logo: 1, photo: 3, legal: 1 } });
  assert.equal(n.key, 'files-purge:MRC-017:2027-10-19');
  assert.equal(n.url, '/dashboard#/briefs/MRC-017');
  assert.match(n.title, /MRC-017, Acme se borrarán el 19 de octubre de 2027/);
  assert.match(n.body, /1 logo, 3 fotos y 1 documento legal/);
  assert.match(n.body, /descarga el kit/);
  assert.match(n.body, /documentos legales no van en el kit/);
  assert.ok(!/[—–]/.test(n.title + n.body), 'sin guion largo');
  assert.match(n.body, /^Ese día se cumplen 12 meses desde que se terminó el proyecto/, 'por defecto, la causa es el proyecto terminado');
});

await check('aviso: con causa archivado dice que se archivó sin llegar a ser proyecto (también tarde)', () => {
  const n = R.purgeNotice({ projectId: 'MRC-018', businessName: 'Beta', purgeOn: '2027-03-01', byKind: { photo: 2 }, cause: 'archived' });
  assert.equal(n.key, 'files-purge:MRC-018:2027-03-01', 'la clave no cambia con la causa');
  assert.match(n.body, /^Ese día se cumplen 12 meses desde que se archivó este brief sin llegar a ser proyecto y se borran sus archivos: 2 fotos\./);
  assert.ok(!/terminó el proyecto/.test(n.body));
  const late = R.purgeNotice({ projectId: 'MRC-018', purgeOn: '2027-03-01', deleteOn: '2027-03-09', cause: 'archived' });
  assert.match(late.body, /^Ya se cumplieron 12 meses desde que se archivó este brief sin llegar a ser proyecto\. Sus archivos se borran ese día/);
  assert.match(late.title, /se borrarán el 9 de marzo de 2027/);
  assert.ok(!/[—–]/.test(n.title + n.body + late.title + late.body), 'sin guion largo');
});

// Siembra de un brief con archivos (borrador ya enviado).
function seedBrief(id, status, events = [], { files = 2, kind = 'photo', completed_at = null } = {}) {
  const pid = `MRC-${String(id).padStart(3, '0')}`;
  db.briefs.push({ id, project_id: pid, business_name: 'Negocio ' + id, status, completed_at });
  for (const e of events) db.events.push({ project_id: pid, actor_email: 'equipo@marcyan.test', ...e });
  const d = `${String(id).padStart(8, '0')}-4b5a-4c7d-8e9f-0a1b2c3d4e5f`;
  db.drafts.push({ id: d, brief_id: id, submitted_at: Date.now() });
  for (let i = 0; i < files; i++) {
    const pathname = `briefs/${d}/${kind}/f${i}.jpg`;
    db.files.push({ id: db.nextId++, draft_id: d, brief_id: id, kind, pathname, content_type: 'image/jpeg', verified: true, tags: {} });
    blob.items.set(pathname, { pathname, size: 1000, contentType: 'image/jpeg' });
  }
  return pid;
}
// Aviso del panel ya enviado hace `daysAgo` días para cada brief sembrado
// (el cron solo borra con un aviso de 7 días o más, RET-02).
function noticeAll(daysAgo = 10) {
  for (const b of db.briefs) {
    const ev = db.events.filter((e) => e.project_id === b.project_id && e.event_type === 'status_changed');
    const day = R.purgeDate(b, ev, db.projects.filter((x) => x.brief_project_id === b.project_id));
    if (!day) continue;
    const at = Date.now() - daysAgo * DAY;
    db.notifications.push({ id: db.notifications.length + 1, type: 'system', ref: R.purgeNotice({ projectId: b.project_id, purgeOn: day }).key, title: 'aviso', at, created_at: new Date(at).toISOString() });
  }
}

await check('cron: aviso 30 días antes, uno solo aunque el cron corra cada día', async () => {
  reset();
  const pid = seedBrief(1, 'completed', [SC('completed', ago(365 - 20))]);
  const a = await runFileRetention({ limit: 10, budgetMs: 5000 });
  const b = await runFileRetention({ limit: 10, budgetMs: 5000 });
  assert.equal(a.notices, 1);
  assert.equal(b.notices, 0, 'el segundo día no repite');
  assert.equal(db.notifications.length, 1);
  const n = db.notifications[0];
  assert.equal(n.type, 'system');
  assert.equal(n.url, `/dashboard#/briefs/${pid}`);
  assert.match(n.title, /se borrarán el/);
  assert.equal(db.files.length, 2, 'avisar no borra nada');
});

await check('cron: si se reabre no hace nada; al volver a terminarse la fecha cambia y sale un aviso nuevo', async () => {
  reset();
  seedBrief(1, 'completed', [SC('completed', ago(365 - 20))]);
  await runFileRetention({ limit: 10, budgetMs: 5000 });
  db.briefs[0].status = 'in_progress';
  db.events.push({ project_id: 'MRC-001', event_type: 'status_changed', data: { from: 'completed', to: 'in_progress' }, created_at: ago(5) });
  const mid = await runFileRetention({ limit: 10, budgetMs: 5000 });
  assert.equal(mid.checked, 0, 'un brief sin terminar no entra');
  db.briefs[0].status = 'completed';
  db.events.push({ project_id: 'MRC-001', event_type: 'status_changed', data: { from: 'in_progress', to: 'completed' }, created_at: ago(4) });
  const out = await runFileRetention({ limit: 10, budgetMs: 5000, now: Date.now() + 345 * DAY });
  assert.equal(out.notices, 1);
  assert.equal(db.notifications.length, 2);
  assert.notEqual(db.notifications[0].ref, db.notifications[1].ref);
  assert.equal(db.files.length, 2);
});

await check('cron: borra por tandas los briefs vencidos, deja el evento y nunca toca los no terminados', async () => {
  reset();
  seedBrief(1, 'completed', [SC('completed', ago(400))], { files: 3 });
  seedBrief(2, 'archived', [SC('completed', ago(390)), SC('archived', ago(380), 'completed')], { files: 1, kind: 'logo' });
  seedBrief(3, 'in_progress', [SC('completed', ago(400)), SC('in_progress', ago(399), 'completed')], { files: 2 });
  seedBrief(4, 'completed', [SC('completed', ago(100))], { files: 2 });
  seedBrief(5, 'completed', [], { files: 1, completed_at: ago(370) });
  noticeAll(10);
  const out = await runFileRetention({ limit: 2, budgetMs: 5000 });
  assert.equal(out.purged, 3);
  assert.equal(out.files, 5);
  assert.equal(out.failed, 0);
  assert.ok(db.candidateCalls >= 2, 'trabaja por tandas');
  assert.deepEqual([...new Set(db.files.map((f) => f.brief_id))].sort(), [3, 4], 'el no terminado y el reciente siguen');
  assert.ok(![...blob.items.keys()].some((k) => /\/0000000[125]-/.test(k)), 'blobs borrados');
  const ev = db.events.filter((e) => e.event_type === 'files_purged');
  assert.deepEqual(ev.map((e) => [e.project_id, e.data.files, e.data.reason, e.actor_email]).sort(),
    [['MRC-001', 3, 'retention', null], ['MRC-002', 1, 'retention', null], ['MRC-005', 1, 'retention', null]]);
});

await check('cron: si el almacén falla, no se toca la base y se reintenta al día siguiente', async () => {
  reset();
  seedBrief(1, 'completed', [SC('completed', ago(400))], { files: 2 });
  noticeAll(10);
  blob.failDel = 1;
  const out = await quiet(() => runFileRetention({ limit: 10, budgetMs: 5000 }));
  assert.equal(out.failed, 1);
  assert.equal(db.files.length, 2, 'las filas siguen');
  assert.ok(!db.events.some((e) => e.event_type === 'files_purged'));
  const alert = db.notifications.filter((n) => n.ref === 'files-purge-failed');
  assert.equal(alert.length, 1, 'el fallo deja un aviso en el panel (RET-03)');
  assert.match(alert[0].title, /No se pudo completar el borrado de archivos de 1 brief/);
  assert.ok(!/[—–]/.test(alert[0].title + alert[0].body), 'sin guion largo');
  const again = await runFileRetention({ limit: 10, budgetMs: 5000 });
  assert.equal(again.purged, 1);
  assert.equal(db.files.length, 0);
});

await check('cron: con el tope de tiempo agotado deja el resto para mañana', async () => {
  reset();
  seedBrief(1, 'completed', [SC('completed', ago(400))]);
  const out = await runFileRetention({ limit: 10, budgetMs: 0 });
  assert.equal(out.pending, true);
  assert.equal(out.purged, 0);
  assert.equal(db.files.length, 2);
});

await check('borrado del cron: re-comprueba que el brief siga terminado', async () => {
  reset();
  seedBrief(1, 'in_progress', [], { files: 2 });
  assert.equal(await purgeBriefFiles(1, { projectId: 'MRC-001', reason: 'retention', requireFinished: true }), null);
  assert.equal(db.files.length, 2);
});

await check('cron completo: el handler sigue exigiendo el secreto e incluye el paso de conservación', async () => {
  reset();
  seedBrief(1, 'completed', [SC('completed', ago(400))]);
  noticeAll(10);
  const no = resCap();
  await cronHandler({ method: 'GET', headers: { authorization: 'Bearer otro' } }, no);
  assert.equal(no.statusCode, 401);
  assert.equal(db.files.length, 2, 'sin secreto no borra nada');
  const yes = resCap();
  await quiet(() => cronHandler({ method: 'GET', headers: { authorization: 'Bearer secreto-de-prueba' } }, yes));
  assert.equal(yes.statusCode, 200);
  assert.equal(yes.body.retention.ok, true);
  assert.equal(yes.body.retention.purged, 1);
  assert.equal(db.files.length, 0);
});

await check('endpoint: DELETE sin sesión responde 401 y no borra nada', async () => {
  reset();
  seedBrief(1, 'completed', [SC('completed', ago(10))]);
  const res = resCap();
  await filesHandler({ method: 'DELETE', query: { id: 'MRC-001' }, headers: {} }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(db.files.length, 2);
  assert.equal(blob.deleted.length, 0);
});

await check('endpoint: DELETE con sesión borra blobs y filas y deja evento con el actor; el brief sigue', async () => {
  reset();
  seedBrief(1, 'contacted', [], { files: 3 });
  SESSION = { email: 'equipo@marcyan.test' };
  const res = resCap();
  await quiet(() => filesHandler({ method: 'DELETE', query: { id: 'MRC-001' }, headers: {} }, res));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.files, 3);
  assert.equal(db.files.length, 0);
  assert.equal(blob.items.size, 0);
  assert.equal(db.briefs.length, 1, 'el brief no se borra');
  const ev = db.events.find((e) => e.event_type === 'files_purged');
  assert.deepEqual([ev.actor_email, ev.data.files, ev.data.reason], ['equipo@marcyan.test', 3, 'request']);
  const get = resCap();
  await filesHandler({ method: 'GET', query: { id: 'MRC-001' }, headers: {} }, get);
  assert.deepEqual(get.body.files, []);
  assert.equal(get.body.retention.lastPurge.files, 3);
  assert.equal(get.body.retention.lastPurge.reason, 'request');
  const nf = resCap();
  await filesHandler({ method: 'DELETE', query: { id: 'MRC-999' }, headers: {} }, nf);
  assert.equal(nf.statusCode, 404);
});

await check('endpoint: GET de un brief terminado trae la fecha prevista; si el almacén falla el DELETE da 502', async () => {
  reset();
  seedBrief(1, 'completed', [SC('completed', ago(10))]);
  SESSION = { email: 'equipo@marcyan.test' };
  const get = resCap();
  await filesHandler({ method: 'GET', query: { id: 'MRC-001' }, headers: {} }, get);
  assert.match(get.body.retention.purgeOn, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(get.body.retention.daysLeft > 340 && get.body.retention.daysLeft <= 356);
  blob.failDel = 1;
  const del = resCap();
  await quiet(() => filesHandler({ method: 'DELETE', query: { id: 'MRC-001' }, headers: {} }, del));
  assert.equal(del.statusCode, 502);
  assert.equal(db.files.length, 2);
});

await check('cron y ficha: el prospecto archivado sin completar avisa con su causa y se borra a su plazo', async () => {
  reset();
  const pid = seedBrief(1, 'archived', [SC('contacted', ago(400), 'pending'), SC('archived', ago(365 - 20), 'contacted')], { files: 2 });
  seedBrief(2, 'archived', [SC('archived', ago(300), 'pending')], { files: 1 });  // aún lejos
  const out = await runFileRetention({ limit: 10, budgetMs: 5000 });
  assert.equal(out.notices, 1);
  const n = db.notifications[0];
  assert.equal(n.url, `/dashboard#/briefs/${pid}`);
  assert.match(n.body, /desde que se archivó este brief sin llegar a ser proyecto/);
  assert.equal(db.files.length, 3, 'avisar no borra nada');
  SESSION = { email: 'equipo@marcyan.test' };
  const get = resCap();
  await filesHandler({ method: 'GET', query: { id: pid }, headers: {} }, get);
  assert.equal(get.body.retention.cause, 'archived');
  assert.match(get.body.retention.purgeOn, /^\d{4}-\d{2}-\d{2}$/);
  const later = await runFileRetention({ limit: 10, budgetMs: 5000, now: Date.now() + 25 * DAY });
  assert.equal(later.purged, 1);
  assert.deepEqual([...new Set(db.files.map((f) => f.brief_id))], [2], 'el archivado reciente sigue');
  // Un brief completado trae causa 'completed'; sin fecha, causa null.
  reset();
  seedBrief(1, 'completed', [SC('completed', ago(10))]);
  seedBrief(2, 'contacted', [SC('contacted', ago(10), 'pending')]);
  SESSION = { email: 'equipo@marcyan.test' };
  const g1 = resCap();
  await filesHandler({ method: 'GET', query: { id: 'MRC-001' }, headers: {} }, g1);
  assert.equal(g1.body.retention.cause, 'completed');
  const g2 = resCap();
  await filesHandler({ method: 'GET', query: { id: 'MRC-002' }, headers: {} }, g2);
  assert.deepEqual([g2.body.retention.purgeOn, g2.body.retention.cause], [null, null]);
});

// ── Revisión adversarial (RET-01 a RET-08) ──────────────────────
await check('RET-01: reabierto y vuelto a cerrar sin su evento, la fecha nunca sale de la PRIMERA terminación', () => {
  const b = { status: 'completed', completed_at: '2025-03-01T15:00:00Z' };
  const ev = [SC('completed', '2025-03-01T15:00:00Z'), SC('in_progress', '2026-09-01T15:00:00Z', 'completed')];
  const day = R.purgeDate(b, ev);
  assert.equal(day, '2027-09-01', 'cuenta desde el último cambio registrado, no desde 2025');
  assert.equal(R.retentionStage(day, Date.parse('2026-10-20T15:00:00Z')), 'keep');
  // Archivado tras reabrir, sin paso a Completado registrado: sin fecha.
  assert.equal(R.purgeDate({ status: 'archived', completed_at: '2025-03-01T15:00:00Z' }, ev), null);
});

await check('RET-01: el cambio de estado y su evento van en la misma transacción', async () => {
  const { updateBriefStatus } = await import('../lib/db.mjs');
  tx.log.length = 0; tx.failInsert = false; tx.status = 'in_progress'; tx.released = 0;
  const r = await updateBriefStatus('MRC-001', 'completed', 'equipo@marcyan.test');
  assert.equal(r.from, 'in_progress');
  assert.equal(tx.log[0], 'BEGIN');
  assert.ok(tx.log.some((q) => q.startsWith('INSERT INTO brief_events')), 'deja el evento');
  assert.equal(tx.log[tx.log.length - 1], 'COMMIT');
  assert.deepEqual(JSON.parse(tx.inserted[2]), { from: 'in_progress', to: 'completed' });
  assert.equal(tx.inserted[1], 'equipo@marcyan.test');
  // Si el evento falla, se deshace el cambio de estado.
  tx.log.length = 0; tx.failInsert = true;
  await assert.rejects(() => updateBriefStatus('MRC-001', 'completed', 'equipo@marcyan.test'), /Base caída/);
  assert.ok(tx.log.includes('ROLLBACK') && !tx.log.includes('COMMIT'), 'sin evento no hay cambio');
  assert.equal(tx.released, 2, 'la conexión siempre se suelta');
  // Mismo estado: no se inventa un evento.
  tx.log.length = 0; tx.failInsert = false; tx.status = 'completed';
  await updateBriefStatus('MRC-001', 'completed', 'equipo@marcyan.test');
  assert.ok(!tx.log.some((q) => q.startsWith('INSERT INTO brief_events')));
});

await check('RET-02: sin aviso previo el cron nunca borra; avisa hoy y borra a los 7 días', async () => {
  reset();
  const pid = seedBrief(1, 'completed', [], { files: 2, completed_at: ago(395) }); // 13 meses, sin eventos
  const first = await runFileRetention({ limit: 10, budgetMs: 5000 });
  assert.equal(first.purged, 0, 'el primer día no borra');
  assert.equal(first.notices, 1);
  assert.equal(db.files.length, 2);
  const n = db.notifications[0];
  const policy = R.purgeDate(db.briefs[0], []);
  assert.equal(n.ref, `files-purge:${pid}:${policy}`, 'la clave es la fecha de la política');
  const shown = R.addDaysDay(houstonDay(Date.now()), 7);
  assert.ok(n.title.includes(R.fmtLongDay(shown)), 'dice el día real del borrado');
  assert.match(n.body, /^Ya se cumplieron 12 meses/);
  assert.ok(!/[—–]/.test(n.title + n.body), 'sin guion largo');
  // La ficha dice la misma fecha.
  SESSION = { email: 'equipo@marcyan.test' };
  const get = resCap();
  await filesHandler({ method: 'GET', query: { id: pid }, headers: {} }, get);
  assert.equal(get.body.retention.purgeOn, shown);
  assert.equal(get.body.retention.daysLeft, 7);
  const six = await runFileRetention({ limit: 10, budgetMs: 5000, now: Date.now() + 6 * DAY });
  assert.equal(six.purged, 0, 'a los 6 días aún no');
  assert.equal(six.notices, 0, 'no repite el aviso');
  const seven = await runFileRetention({ limit: 10, budgetMs: 5000, now: Date.now() + 7 * DAY });
  assert.equal(seven.purged, 1, 'a los 7 días sí');
  assert.equal(db.files.length, 0);
});

await check('RET-02: el aviso normal (30 días antes) deja borrar el día de la política', () => {
  const day = '2027-10-19';
  const noticeAt = Date.parse('2027-09-19T09:40:00Z');
  assert.equal(R.effectivePurgeDay(day, noticeAt, Date.parse('2027-10-19T09:40:00Z')), day);
  assert.equal(R.effectivePurgeDay(day, Date.parse('2027-10-15T09:40:00Z')), '2027-10-22', 'aviso tardío: 7 días desde el aviso');
  assert.equal(R.effectivePurgeDay(null, null), null);
});

await check('RET-03: con el almacén caído el paso del cron sale en falso y avisa', async () => {
  reset();
  seedBrief(1, 'completed', [SC('completed', ago(400))]);
  noticeAll(10);
  blob.failDel = 1;
  const res = resCap();
  await quiet(() => cronHandler({ method: 'GET', headers: { authorization: 'Bearer secreto-de-prueba' } }, res));
  assert.equal(res.body.retention.failed, 1);
  assert.equal(res.body.retention.ok, false);
  assert.equal(res.body.ok, false);
  assert.ok(db.notifications.some((x) => x.ref === 'files-purge-failed'));
});

await check('RET-04: con su proyecto de Progreso en marcha no hay fecha; completado, cuenta su cierre', async () => {
  const b = { status: 'completed', completed_at: '2026-01-10T15:00:00Z' };
  const ev = [SC('completed', '2026-01-10T15:00:00Z')];
  assert.equal(R.purgeDate(b, ev, [{ status: 'active', completed_at: null }]), null);
  assert.equal(R.purgeDate(b, ev, [{ status: 'on_hold', completed_at: null }]), null);
  assert.equal(R.purgeDate(b, ev, [{ status: 'completed', completed_at: '2026-06-01T15:00:00Z' }]), '2027-06-01');
  assert.equal(R.purgeDate(b, ev, [{ status: 'completed', completed_at: '2025-12-01T15:00:00Z' }]), '2027-01-10', 'lo último de los dos');
  assert.equal(R.purgeDate(b, ev, [{ status: 'cancelled', completed_at: null }]), '2027-01-10');
  assert.equal(R.purgeDate(b, ev, []), '2027-01-10');
  // El cron no toca un brief vencido con su proyecto activo, y la ficha no da fecha.
  reset();
  seedBrief(1, 'completed', [SC('completed', ago(400))]);
  db.projects.push({ brief_project_id: 'MRC-001', status: 'active', completed_at: null });
  const out = await runFileRetention({ limit: 10, budgetMs: 5000 });
  assert.deepEqual([out.notices, out.purged], [0, 0]);
  assert.equal(db.files.length, 2);
  SESSION = { email: 'equipo@marcyan.test' };
  const get = resCap();
  await filesHandler({ method: 'GET', query: { id: 'MRC-001' }, headers: {} }, get);
  assert.equal(get.body.retention.purgeOn, null);
});

await check('RET-06: si falla la base tras borrar del almacén, el 502 lo dice y un segundo intento termina', async () => {
  reset();
  seedBrief(1, 'contacted', [], { files: 2 });
  SESSION = { email: 'equipo@marcyan.test' };
  db.failRecords = 1;
  const bad = resCap();
  await quiet(() => filesHandler({ method: 'DELETE', query: { id: 'MRC-001' }, headers: {} }, bad));
  assert.equal(bad.statusCode, 502);
  assert.match(bad.body.error, /ya se borraron/);
  assert.ok(!/No se borró nada/.test(bad.body.error));
  assert.equal(db.files.length, 2, 'filas y evento van juntos: ninguno se escribió');
  assert.ok(!db.events.some((e) => e.event_type === 'files_purged'));
  const ok2 = resCap();
  await quiet(() => filesHandler({ method: 'DELETE', query: { id: 'MRC-001' }, headers: {} }, ok2));
  assert.equal(ok2.statusCode, 200);
  assert.equal(ok2.body.files, 2);
  assert.equal(db.files.length, 0);
  assert.equal(db.events.filter((e) => e.event_type === 'files_purged').length, 1);
  // Con el almacén caído el texto sigue diciendo que no se borró nada.
  seedBrief(2, 'contacted', [], { files: 1 });
  blob.failDel = 1;
  const st = resCap();
  await quiet(() => filesHandler({ method: 'DELETE', query: { id: 'MRC-002' }, headers: {} }, st));
  assert.equal(st.statusCode, 502);
  assert.match(st.body.error, /No se borró nada/);
});

await check('RET-08: con más de 500 eventos la ficha usa los más recientes', async () => {
  reset();
  seedBrief(1, 'completed', [], { files: 1 });
  for (let i = 0; i < 520; i++) db.events.push({ project_id: 'MRC-001', event_type: 'files_purged', actor_email: null, data: { files: i, reason: 'request' }, created_at: new Date(Date.parse('2026-01-01T00:00:00Z') + i * 60000).toISOString() });
  const { retentionEvents } = await import('../lib/brief-files.mjs');
  const ev = await retentionEvents('MRC-001');
  assert.equal(ev.length, 500);
  assert.ok(ev[0].created_at < ev[ev.length - 1].created_at, 'en orden de llegada');
  assert.equal(R.lastPurge(ev).files, 519, 'el último borrado está');
});

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) de la conciliación de archivos fallaron:`);
  for (const f of fails) console.error(' - ' + f);
  process.exit(1);
}
console.log(`✓ ${pass} pruebas de la conciliación y del plazo de conservación de archivos pasaron.`);
