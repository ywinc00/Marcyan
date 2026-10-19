// ════════════════════════════════════════════════════════════════
//  lib/notifications.mjs — Bandeja de avisos in-dashboard
//  Gemelo de lib/leads.mjs en estilo (import { sql }, template tags
//  parametrizados, ramificación por filtro). Ver db/migrations/007 y 015.
//
//  IMPORTANTE: createNotification() es defensiva — NUNCA debe romper
//  el flujo que la llama (POST /api/contact, /api/brief, /api/handoff).
//  Si la inserción falla, loguea y devuelve null en vez de lanzar.
//
//  Enlaces (OP-12): cada aviso guarda su tipo y la referencia de su
//  entidad (ref = LEAD-xxx, MRC-xxx, PRJ-xxx, INV-xxx o CLI-<id>). Con eso
//  se arma el enlace profundo a Orbit (/dashboard#/leads/LEAD-012…). Los
//  avisos viejos guardaron url '/dashboard' a secas: la lectura devuelve
//  además `link`, calculado de type+ref, así que también enlazan sin migrar.
//
//  Archivado (OP-15, migración 015): archived_at. Si la migración aún no se
//  aplicó, todo sigue funcionando sin archivado (se detecta la columna que
//  falta y se repite la consulta sin ella); archivar responde con un error
//  con code 'archive_unavailable'.
//
//  Avisos 'system' (OP-15): notifySystem() y sus atajos
//  (notifyEmailFailure, notifySeoSyncFailures) avisan al dueño de fallos
//  del servidor que debe saber, con deduplicación por clave y ventana.
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';

export const NOTIFICATION_TYPES = ['new_lead', 'new_brief', 'chat_handoff', 'system'];

// Cliente de BD. Las pruebas (scripts/test-notifications.mjs) lo sustituyen
// por uno falso para comprobar consultas, deduplicación y la vuelta atrás
// sin la columna archived_at, sin tocar ninguna base real.
let db = sql;
export function __setDbForTests(fake) { db = fake || sql; archiveCol = null; archiveMissingAt = 0; }

const BASE_COLS = 'id, type, title, body, ref, url, read_at, created_at';
const ARCH_COLS = BASE_COLS + ', archived_at';

// ¿Existe notifications.archived_at? null = aún no se sabe (se averigua con
// la primera consulta que la use), true / false después.
// Un "no existe" se vuelve a comprobar a los 5 min: si el dueño aplica la
// migración, una función ya caliente lo nota sin esperar a un despliegue.
let archiveCol = null;
let archiveMissingAt = 0;
function isMissingArchive(err) {
  if (!err) return false;
  if (err.code === '42703') return true;            // undefined_column
  return /archived_at/.test(String(err.message || '')) && /does not exist|no existe/i.test(String(err.message || ''));
}
// Ejecuta fn(true) si la columna existe (o no se sabe); si falla porque
// falta, recuerda que no existe y repite con fn(false).
async function withArchive(fn) {
  if (archiveCol === false && Date.now() - archiveMissingAt < 5 * 60 * 1000) return fn(false);
  try {
    const r = await fn(true);
    archiveCol = true;
    return r;
  } catch (err) {
    if (!isMissingArchive(err)) throw err;
    archiveCol = false;
    archiveMissingAt = Date.now();
    console.warn('[notifications] falta la columna archived_at (migración 015 sin aplicar): se lista sin archivado');
    return fn(false);
  }
}

export function archiveUnavailableError() {
  const e = new Error('Archivar todavía no está disponible.');
  e.code = 'archive_unavailable';
  return e;
}

// ── Títulos sin guion largo de conector (OP-30) ───────────────
// "Nuevo brief — Acme" → "Nuevo brief, Acme". También el guion corto con
// espacios usado como conector ("Kit - Acme"); no toca guiones dentro de
// palabras ni referencias (LEAD-012, $500-$1,500).
export function cleanTitle(s) {
  return String(s == null ? '' : s)
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s+-\s+/g, ', ')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ');
}

// Enlace profundo a Orbit según el tipo y la referencia de la entidad.
// Devuelve null si no hay entidad concreta (p. ej. un aviso 'system').
export function notificationLink(type, ref) {
  const r = ref ? String(ref).trim() : '';
  if (r && (type === 'new_lead' || /^LEAD-/i.test(r)))  return `/dashboard#/leads/${encodeURIComponent(r)}`;
  if (r && (type === 'new_brief' || /^MRC-/i.test(r)))  return `/dashboard#/briefs/${encodeURIComponent(r)}`;
  if (r && /^PRJ-/i.test(r)) return `/dashboard#/progreso/${encodeURIComponent(r)}`;
  if (r && /^INV-/i.test(r)) return `/dashboard#/finanzas/facturas/${encodeURIComponent(r)}`;
  const cli = /^CLI-(\d+)$/i.exec(r);
  if (cli) return `/dashboard#/clientes/${cli[1]}`;
  if (type === 'chat_handoff') return '/dashboard#/avisos';
  return null;
}

// Añade `link` a una fila: la url guardada si es un enlace concreto; si no,
// el enlace profundo calculado; si tampoco, la url tal cual. El campo `url`
// original se conserva (contrato). El título sale ya sin guion largo y
// `archived_at` siempre viene (null si la columna aún no existe).
function withLink(row) {
  if (!row) return row;
  const deep = notificationLink(row.type, row.ref);
  const stored = row.url && row.url !== '/dashboard' ? row.url : null;
  return {
    ...row,
    title: cleanTitle(row.title),
    archived_at: row.archived_at ?? null,
    link: stored || deep || row.url || '/dashboard',
  };
}

// ── Crear notificación ────────────────────────────────────────
// opts: { type, title, body, ref, url, dedupeMinutes = 2 }
// Si url falta o es el genérico '/dashboard', se guarda el enlace profundo
// calculado de type+ref (los llamadores no tienen que saber las rutas).
// Devuelve la fila creada, o null si falla o es un duplicado (no lanza).
export async function createNotification(opts = {}) {
  try {
    const type = NOTIFICATION_TYPES.includes(opts.type) ? opts.type : 'system';
    const title = cleanTitle((opts.title ?? '').toString().trim()).slice(0, 300) || 'Aviso';
    const body = opts.body != null ? opts.body.toString().slice(0, 5000) : null;
    const ref = opts.ref != null ? opts.ref.toString().slice(0, 100) : null;
    let url = opts.url != null ? opts.url.toString().slice(0, 500) : null;
    if (!url || url === '/dashboard') url = notificationLink(type, ref) || url;
    const minutes = Math.min(Math.max(parseInt(opts.dedupeMinutes, 10) || 2, 1), 60 * 24 * 7);

    // Dedup defensivo: evita avisos duplicados por reintentos/doble-submit
    // del mismo evento (mismo type+ref en la ventana; 2 min por defecto).
    if (ref) {
      const dup = await db`
        SELECT 1 FROM notifications
         WHERE type = ${type} AND ref = ${ref}
           AND created_at > NOW() - make_interval(mins => ${minutes})
         LIMIT 1`;
      if (dup.rowCount) return null;
    }

    const r = await db`
      INSERT INTO notifications (type, title, body, ref, url)
      VALUES (${type}, ${title}, ${body}, ${ref}, ${url})
      RETURNING id, type, title, body, ref, url, read_at, created_at
    `;
    return r.rowCount ? withLink(r.rows[0]) : null;
  } catch (err) {
    console.error('[notifications] createNotification falló:', err && err.message);
    return null;
  }
}

// ── Avisos 'system' ───────────────────────────────────────────
// Un fallo del servidor que el dueño debe saber. `key` agrupa los avisos
// del mismo problema (p. ej. 'seo-sync:3'): mientras haya uno de esa clave
// dentro de la ventana no se crea otro (un cron que falla cada día deja un
// aviso al día, no uno por intento). La clave se guarda en `ref`; el panel
// no la pinta (solo pinta referencias legibles como MRC-017). `url` = a
// dónde lleva "Abrir" (enlace de Orbit). Nunca lanza.
export async function notifySystem({ key, title, body = null, url = null, windowHours = 24 } = {}) {
  const k = key ? String(key).trim().slice(0, 100) : null;
  return createNotification({
    type: 'system', title, body, ref: k, url,
    dedupeMinutes: Math.round(Math.max(Number(windowHours) || 24, 0.05) * 60),
  });
}

// Correo de un brief sin confirmar. who: 'admin' (el aviso de brief nuevo al
// dueño) | 'client' (la confirmación al cliente). Texto en llano: el error
// técnico se queda en los registros del servidor.
// Redactado como duda, no como hecho (A7-04): api/brief.mjs corta la espera
// a los 8 s, así que un correo lento puede salir igual después del corte.
export function emailFailureNotice({ projectId, who = 'admin', businessName = '' } = {}) {
  const ref = projectId ? String(projectId) : '';
  const name = businessName ? String(businessName).trim() : '';
  const label = [ref, name].filter(Boolean).join(', ');
  if (who === 'client') {
    return {
      key: `email-client:${ref}`,
      title: `No pudimos confirmar que salió la confirmación del brief${label ? ' ' + label : ''}`,
      body: 'El servicio de correo tardó demasiado o dio un error, así que puede que al cliente le haya llegado y puede que no. Si quieres asegurarte, escríbele para confirmarle que recibimos su brief.',
      url: ref ? notificationLink('new_brief', ref) : null,
    };
  }
  return {
    key: `email-admin:${ref}`,
    title: `No pudimos confirmar que salió el correo del brief${label ? ' ' + label : ''}`,
    body: 'El brief se guardó bien, pero no sabemos si el correo de aviso salió. Revísalo aquí en el panel.',
    url: ref ? notificationLink('new_brief', ref) : null,
  };
}
export async function notifyEmailFailure(opts = {}) {
  try {
    if (!opts.projectId) return null;
    return await notifySystem({ ...emailFailureNotice(opts), windowHours: 24 * 7 });
  } catch (err) {
    console.error('[notifications] notifyEmailFailure falló:', err && err.message);
    return null;
  }
}

// Sincronización de SEO fallida (resultados de lib/seo.mjs syncProject).
// "No configurado" no avisa: eso ya lo dice la sección SEO y no es un fallo.
//
// QUIÉN LA LLAMA: solo el cron diario de SEO, que corre sin nadie mirando
// (desde el panel el error ya se ve en pantalla). En esta rama ese cron NO
// existe todavía: llega con A6 (GET /api/cron/seo-sync, programado en
// vercel.json). Al fusionar A6 + A7, su handler debe llamar a
// notifySeoSyncFailures(results) tras syncActiveProjects y a
// notifySeoSyncCrash() en su catch. scripts/test-avisos.mjs falla si ese
// archivo existe y no lo hace (A7-01/A7-02).
//
// Acepta las dos formas de resultado: la de hoy ({ gsc: { error }, ga4:
// { error } } con el error crudo) y la de A6 (status, error_detail.code y
// sources.gsc|ga4.error.code, con textos ya en español).
const SOURCE_LABEL = { gsc: 'Search Console', ga4: 'Google Analytics' };
const QUIET_CODES = new Set(['not_configured', 'no_ids']);
function sourceCode(r, s) {
  const src = r.sources && r.sources[s];
  if (src && src.error && src.error.code) return src.status === 'error' || !src.status ? String(src.error.code) : null;
  return r[s] && r[s].error ? String(r[s].error) : null;
}
export function seoSyncFailureNotices(results = []) {
  const out = [];
  for (const r of Array.isArray(results) ? results : []) {
    if (!r || r.ok) continue;
    const top = (r.error_detail && r.error_detail.code) || r.error;
    if (QUIET_CODES.has(String(top))) continue;
    const codes = {};
    for (const s of ['gsc', 'ga4']) codes[s] = sourceCode(r, s);
    const failed = ['gsc', 'ga4'].filter((s) => codes[s] && !QUIET_CODES.has(codes[s]));
    if (!failed.length) continue;
    const denied = failed.some((s) => /_forbidden$|\b403\b|permission|permiso/i.test(codes[s]));
    const name = r.name ? String(r.name) : `el proyecto ${r.project_id}`;
    out.push({
      key: `seo-sync:${r.project_id}`,
      title: `La sincronización de SEO falló para ${name}`,
      body: `No llegaron datos de ${failed.map((s) => SOURCE_LABEL[s]).join(' ni de ')}. ` +
        (denied
          ? 'Google no dio permiso: revisa que la cuenta de servicio siga con acceso a esa propiedad.'
          : 'Puede ser algo pasajero de Google; si se repite mañana, revisa la conexión en la sección SEO.'),
      url: `/dashboard#/seo/${encodeURIComponent(String(r.project_id))}`,
    });
  }
  return out;
}
export async function notifySeoSyncFailures(results = []) {
  const made = [];
  try {
    for (const n of seoSyncFailureNotices(results)) {
      const row = await notifySystem({ ...n, windowHours: 20 });
      if (row) made.push(row);
    }
  } catch (err) {
    console.error('[notifications] notifySeoSyncFailures falló:', err && err.message);
  }
  return made;
}
// El cron de SEO se cayó entero (su catch). Un aviso al día como mucho.
export const SEO_SYNC_CRASH_NOTICE = {
  key: 'seo-sync:all',
  title: 'La sincronización diaria de SEO no pudo terminar',
  body: 'Los datos de Google de hoy no se actualizaron. Si se repite mañana, revisa la conexión en la sección SEO.',
  url: '/dashboard#/seo',
};
export async function notifySeoSyncCrash() {
  return notifySystem({ ...SEO_SYNC_CRASH_NOTICE, windowHours: 20 });
}

// ── Lectura ───────────────────────────────────────────────────
// Consulta de la bandeja (pura, sin BD: la prueban los tests).
// opts: { limit, unreadOnly, type, offset, before, archived }
//   archived: 'only' → solo archivados; cualquier otro valor → la bandeja
//   (no archivados). Sin columna de archivado (useArchive=false) no filtra.
export function buildNotificationQuery(opts = {}, useArchive = true) {
  const lim = Math.min(Math.max(parseInt(opts.limit, 10) || 30, 1), 200);
  const unreadOnly = opts.unreadOnly === true || opts.unreadOnly === 'true' || opts.unreadOnly === '1';
  const off = Math.max(parseInt(opts.offset, 10) || 0, 0);
  const before = parseInt(opts.before, 10);
  const hasCursor = Number.isInteger(before) && before > 0 && String(before) === String(opts.before).trim();
  const type = NOTIFICATION_TYPES.includes(opts.type) ? opts.type : null;
  const archivedOnly = opts.archived === 'only' || opts.archived === '1' || opts.archived === true;

  const where = [];
  const params = [];
  if (useArchive) where.push(archivedOnly ? 'archived_at IS NOT NULL' : 'archived_at IS NULL');
  if (unreadOnly) where.push('read_at IS NULL');
  if (type)       { params.push(type);   where.push(`type = $${params.length}`); }
  const countText = `SELECT COUNT(*)::int AS n FROM notifications ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`.trim();
  const countParams = [...params];
  if (hasCursor)  { params.push(before); where.push(`id < $${params.length}`); }

  // Se pide uno de más para saber si hay página siguiente sin otro COUNT.
  // Orden por id: es estrictamente creciente con created_at (BIGSERIAL), así
  // el cursor `id < before` nunca salta ni repite filas.
  params.push(lim + 1);
  let text = `SELECT ${useArchive ? ARCH_COLS : BASE_COLS} FROM notifications ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY id DESC LIMIT $${params.length}`;
  if (!hasCursor && off) { params.push(off); text += ` OFFSET $${params.length}`; }
  return { text, params, countText, countParams, lim, off, hasCursor, archivedOnly };
}

// Si el SELECT falla, LANZA (A7-03): una página vacía con total 0 haría
// creer al dueño que no tiene avisos. El endpoint responde 500 y la sección
// pinta su error con Reintentar. (Sin la columna archived_at no es un fallo:
// se lista sin archivado.)
export async function listNotifications(opts = {}) {
  return withArchive(async (useArchive) => {
    const q = buildNotificationQuery(opts, useArchive);
    // Sin columna no hay archivados que enseñar.
    if (!useArchive && q.archivedOnly) {
      return { rows: [], limit: q.lim, offset: q.hasCursor ? null : q.off, total: 0, has_more: false, next_cursor: null, archive_available: false };
    }
    const [r, t] = await Promise.all([
      db.query(q.text, q.params),
      db.query(q.countText, q.countParams),
    ]);
    const hasMore = r.rows.length > q.lim;
    const rows = r.rows.slice(0, q.lim).map(withLink);
    return {
      rows,
      limit: q.lim,
      offset: q.hasCursor ? null : q.off,
      total: t.rows[0].n,
      has_more: hasMore,
      next_cursor: hasMore && rows.length ? Number(rows[rows.length - 1].id) : null,
      archive_available: useArchive,
    };
  });
}

// Conteo de no-leídas de la bandeja (para el contador del menú). Barato.
// Si falla, LANZA (A7-03): un 0 falso apagaría el contador del menú. Quien
// solo lo quiere de propina tras un cambio usa unreadCountOrNull().
export async function unreadCount() {
  return withArchive(async (useArchive) => {
    const r = useArchive
      ? await db`SELECT COUNT(*)::int AS n FROM notifications WHERE read_at IS NULL AND archived_at IS NULL`
      : await db`SELECT COUNT(*)::int AS n FROM notifications WHERE read_at IS NULL`;
    return r.rows[0].n;
  });
}
// El contador tras un cambio que YA se guardó: si la consulta falla, null
// (el panel conserva el último valor bueno) en vez de tumbar la respuesta.
export async function unreadCountOrNull() {
  try {
    return await unreadCount();
  } catch (err) {
    console.error('[notifications] unreadCount falló:', err && err.message);
    return null;
  }
}

// Conteos estables por tipo, independientes de la página cargada (OP-14).
// Solo la bandeja (sin archivados):
// { total, unread, archived, by_type: { new_lead: { total, unread }, … } }.
// Si falla, LANZA (A7-03): los KPIs no deben enseñar ceros falsos.
export async function notificationCounts() {
  return withArchive(async (useArchive) => {
    const r = useArchive
      ? await db`
        SELECT type,
               COUNT(*) FILTER (WHERE archived_at IS NULL)::int                     AS total,
               COUNT(*) FILTER (WHERE read_at IS NULL AND archived_at IS NULL)::int AS unread,
               COUNT(*) FILTER (WHERE archived_at IS NOT NULL)::int                 AS archived
          FROM notifications
         GROUP BY type`
      : await db`
        SELECT type,
               COUNT(*)::int                                AS total,
               COUNT(*) FILTER (WHERE read_at IS NULL)::int AS unread,
               0                                            AS archived
          FROM notifications
         GROUP BY type`;
    const bt = Object.fromEntries(NOTIFICATION_TYPES.map(t => [t, { total: 0, unread: 0 }]));
    let total = 0, unread = 0, archived = 0;
    for (const row of r.rows) {
      const k = NOTIFICATION_TYPES.includes(row.type) ? row.type : 'system';
      bt[k].total  += Number(row.total) || 0;
      bt[k].unread += Number(row.unread) || 0;
      total    += Number(row.total) || 0;
      unread   += Number(row.unread) || 0;
      archived += Number(row.archived) || 0;
    }
    return { total, unread, archived, by_type: bt };
  });
}

// ── Mutaciones ────────────────────────────────────────────────
function validId(id) {
  const s = String(id ?? '').trim();
  if (!/^\d{1,18}$/.test(s)) return null;
  return Number(s) > 0 ? s : null;
}
const RET = (useArchive) => (useArchive ? ARCH_COLS : BASE_COLS);

// Marca una notificación como leída (idempotente: COALESCE conserva
// el read_at original si ya estaba leída). Devuelve la fila o null.
export async function markRead(id) {
  const nid = validId(id);
  if (!nid) return null;
  return withArchive(async (useArchive) => {
    const r = await db.query(
      `UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = $1 RETURNING ${RET(useArchive)}`, [nid]);
    return r.rowCount ? withLink(r.rows[0]) : null;
  });
}

// Vuelve a dejarla sin leer. Devuelve la fila o null.
export async function markUnread(id) {
  const nid = validId(id);
  if (!nid) return null;
  return withArchive(async (useArchive) => {
    const r = await db.query(
      `UPDATE notifications SET read_at = NULL WHERE id = $1 RETURNING ${RET(useArchive)}`, [nid]);
    return r.rowCount ? withLink(r.rows[0]) : null;
  });
}

// Archiva (true) o devuelve a la bandeja (false). Archivar la marca también
// como leída (sale del contador). Lanza archive_unavailable sin migración 015.
export async function setArchived(id, archived = true) {
  const nid = validId(id);
  if (!nid) return null;
  return withArchive(async (useArchive) => {
    if (!useArchive) throw archiveUnavailableError();
    const r = archived
      ? await db.query(
          `UPDATE notifications
              SET archived_at = COALESCE(archived_at, NOW()), read_at = COALESCE(read_at, NOW())
            WHERE id = $1 RETURNING ${ARCH_COLS}`, [nid])
      : await db.query(
          `UPDATE notifications SET archived_at = NULL WHERE id = $1 RETURNING ${ARCH_COLS}`, [nid]);
    return r.rowCount ? withLink(r.rows[0]) : null;
  });
}

// Marca todas las no-leídas de la bandeja como leídas (opcional: solo un
// tipo). Devuelve cuántas se afectaron. Un tipo desconocido NO cae a "todas"
// (A7-07): lanza un error con code 'invalid_type' (el endpoint da 400).
export function invalidTypeError() {
  const e = new Error('Tipo de aviso no válido.');
  e.code = 'invalid_type';
  return e;
}
export async function markAllRead(type = null) {
  if (type != null && type !== '' && !NOTIFICATION_TYPES.includes(type)) throw invalidTypeError();
  const t = type || null;
  return withArchive(async (useArchive) => {
    const where = ['read_at IS NULL'];
    const params = [];
    if (useArchive) where.push('archived_at IS NULL');
    if (t) { params.push(t); where.push(`type = $${params.length}`); }
    const r = await db.query(`UPDATE notifications SET read_at = NOW() WHERE ${where.join(' AND ')} RETURNING id`, params);
    return r.rowCount;
  });
}
