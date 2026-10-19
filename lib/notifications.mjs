// ════════════════════════════════════════════════════════════════
//  lib/notifications.mjs — Bandeja de avisos in-dashboard
//  Gemelo de lib/leads.mjs en estilo (import { sql }, template tags
//  parametrizados, ramificación por filtro). Ver db/migrations/007.
//
//  IMPORTANTE: createNotification() es defensiva — NUNCA debe romper
//  el flujo que la llama (POST /api/contact, /api/brief, /api/handoff).
//  Si la inserción falla, loguea y devuelve null en vez de lanzar.
//
//  Enlaces (OP-12): cada aviso guarda su tipo y la referencia de su
//  entidad (ref = LEAD-xxx o MRC-xxx). Con eso se arma el enlace profundo
//  a Orbit (/dashboard#/leads/LEAD-012, /dashboard#/briefs/MRC-017). Los
//  avisos viejos guardaron url '/dashboard' a secas: la lectura devuelve
//  además `link`, calculado de type+ref, así que también enlazan sin migrar.
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';

export const NOTIFICATION_TYPES = ['new_lead', 'new_brief', 'chat_handoff', 'system'];

const COLS = 'id, type, title, body, ref, url, read_at, created_at';

// Enlace profundo a Orbit según el tipo y la referencia de la entidad.
// Devuelve null si no hay entidad concreta (p. ej. un aviso 'system').
export function notificationLink(type, ref) {
  const r = ref ? String(ref).trim() : '';
  if (r && (type === 'new_lead' || /^LEAD-/i.test(r)))  return `/dashboard#/leads/${encodeURIComponent(r)}`;
  if (r && (type === 'new_brief' || /^MRC-/i.test(r)))  return `/dashboard#/briefs/${encodeURIComponent(r)}`;
  if (type === 'chat_handoff') return '/dashboard#/avisos';
  return null;
}

// Añade `link` a una fila: el enlace profundo si se puede calcular; si no,
// la url guardada. El campo `url` original se conserva tal cual (contrato).
function withLink(row) {
  if (!row) return row;
  const deep = notificationLink(row.type, row.ref);
  const stored = row.url && row.url !== '/dashboard' ? row.url : null;
  return { ...row, link: stored || deep || row.url || '/dashboard' };
}

// ── Crear notificación ────────────────────────────────────────
// opts: { type, title, body, ref, url }
// Si url falta o es el genérico '/dashboard', se guarda el enlace profundo
// calculado de type+ref (los llamadores no tienen que saber las rutas).
// Devuelve la fila creada, o null si falla (no lanza).
export async function createNotification(opts = {}) {
  try {
    const type = NOTIFICATION_TYPES.includes(opts.type) ? opts.type : 'system';
    const title = (opts.title ?? '').toString().trim().slice(0, 300) || 'Aviso';
    const body = opts.body != null ? opts.body.toString().slice(0, 5000) : null;
    const ref = opts.ref != null ? opts.ref.toString().slice(0, 100) : null;
    let url = opts.url != null ? opts.url.toString().slice(0, 500) : null;
    if (!url || url === '/dashboard') url = notificationLink(type, ref) || url;

    // Dedup defensivo: evita avisos duplicados por reintentos/doble-submit
    // del mismo evento (mismo type+ref en los últimos 2 min).
    if (ref) {
      const dup = await sql`
        SELECT 1 FROM notifications
         WHERE type = ${type} AND ref = ${ref}
           AND created_at > NOW() - INTERVAL '2 minutes'
         LIMIT 1`;
      if (dup.rowCount) return null;
    }

    const r = await sql`
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

// ── Lectura ───────────────────────────────────────────────────
// opts: { limit=30, unreadOnly=false, type, offset=0, before }
//   · Paginación (OP-14): por cursor `before` (id del último aviso recibido:
//     trae los más antiguos que él) o por `offset`. Si llegan los dos, manda
//     el cursor. La respuesta trae `next_cursor` (null si no hay más).
//   · type: filtra por tipo (lista blanca NOTIFICATION_TYPES).
// Defensiva: si la tabla no existe todavía o el SELECT falla (p.ej. en
// un entorno donde aún no se aplicó la migración 007), loguea y devuelve
// { rows: [], limit } en vez de lanzar — así la sección muestra su estado
// vacío en lugar de 500-ear. Mismo criterio que unreadCount().
export async function listNotifications(opts = {}) {
  const lim = Math.min(Math.max(parseInt(opts.limit) || 30, 1), 200);
  const unreadOnly = opts.unreadOnly === true || opts.unreadOnly === 'true';
  const off = Math.max(parseInt(opts.offset) || 0, 0);
  const before = parseInt(opts.before, 10);
  const hasCursor = Number.isInteger(before) && before > 0;
  const type = NOTIFICATION_TYPES.includes(opts.type) ? opts.type : null;

  const where = [];
  const params = [];
  if (unreadOnly) where.push('read_at IS NULL');
  if (type)       { params.push(type);   where.push(`type = $${params.length}`); }
  const filterText = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const filterParams = [...params];
  if (hasCursor)  { params.push(before); where.push(`id < $${params.length}`); }
  const pageText = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    // Se pide uno de más para saber si hay página siguiente sin otro COUNT.
    params.push(lim + 1);
    let text = `SELECT ${COLS} FROM notifications ${pageText}
                 ORDER BY created_at DESC, id DESC LIMIT $${params.length}`;
    if (!hasCursor && off) { params.push(off); text += ` OFFSET $${params.length}`; }

    const [r, t] = await Promise.all([
      sql.query(text, params),
      sql.query(`SELECT COUNT(*)::int AS n FROM notifications ${filterText}`, filterParams),
    ]);
    const hasMore = r.rows.length > lim;
    const rows = r.rows.slice(0, lim).map(withLink);
    return {
      rows,
      limit: lim,
      offset: hasCursor ? null : off,
      total: t.rows[0].n,
      has_more: hasMore,
      next_cursor: hasMore && rows.length ? Number(rows[rows.length - 1].id) : null,
    };
  } catch (err) {
    console.error('[notifications] listNotifications falló:', err && err.message);
    return { rows: [], limit: lim, offset: hasCursor ? null : off, total: 0, has_more: false, next_cursor: null };
  }
}

// Conteo de no-leídas (para el badge del nav). Defensivo: 0 si falla.
// Barato: usa el índice (read_at, created_at).
export async function unreadCount() {
  try {
    const r = await sql`SELECT COUNT(*)::int AS n FROM notifications WHERE read_at IS NULL`;
    return r.rows[0].n;
  } catch (err) {
    console.error('[notifications] unreadCount falló:', err && err.message);
    return 0;
  }
}

// Conteos estables por tipo, independientes de la página cargada (OP-14):
// { total, unread, by_type: { new_lead: { total, unread }, … } }. Defensivo.
export async function notificationCounts() {
  const by_type = Object.fromEntries(NOTIFICATION_TYPES.map(t => [t, { total: 0, unread: 0 }]));
  try {
    const r = await sql`
      SELECT type,
             COUNT(*)::int                                AS total,
             COUNT(*) FILTER (WHERE read_at IS NULL)::int AS unread
        FROM notifications
       GROUP BY type`;
    let total = 0, unread = 0;
    for (const row of r.rows) {
      const k = NOTIFICATION_TYPES.includes(row.type) ? row.type : 'system';
      by_type[k].total  += row.total;
      by_type[k].unread += row.unread;
      total  += row.total;
      unread += row.unread;
    }
    return { total, unread, by_type };
  } catch (err) {
    console.error('[notifications] notificationCounts falló:', err && err.message);
    return { total: 0, unread: 0, by_type };
  }
}

// ── Mutaciones ────────────────────────────────────────────────
// Marca una notificación como leída (idempotente: COALESCE conserva
// el read_at original si ya estaba leída). Devuelve la fila o null.
export async function markRead(id) {
  const nid = parseInt(id, 10);
  if (!Number.isInteger(nid) || nid <= 0) return null;
  const r = await sql`
    UPDATE notifications
       SET read_at = COALESCE(read_at, NOW())
     WHERE id = ${nid}
    RETURNING id, type, title, body, ref, url, read_at, created_at`;
  return r.rowCount ? withLink(r.rows[0]) : null;
}

// Marca todas las no-leídas como leídas. Devuelve cuántas se afectaron.
export async function markAllRead() {
  const r = await sql`
    UPDATE notifications
       SET read_at = NOW()
     WHERE read_at IS NULL
    RETURNING id`;
  return r.rowCount;
}
