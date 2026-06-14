// ════════════════════════════════════════════════════════════════
//  lib/notifications.mjs — Bandeja de avisos in-dashboard
//  Gemelo de lib/leads.mjs en estilo (import { sql }, template tags
//  parametrizados, ramificación por filtro). Ver db/migrations/007.
//
//  IMPORTANTE: createNotification() es defensiva — NUNCA debe romper
//  el flujo que la llama (POST /api/contact, /api/brief, /api/handoff).
//  Si la inserción falla, loguea y devuelve null en vez de lanzar.
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';

export const NOTIFICATION_TYPES = ['new_lead', 'new_brief', 'chat_handoff', 'system'];

// ── Crear notificación ────────────────────────────────────────
// opts: { type, title, body, ref, url }
// Devuelve la fila creada, o null si falla (no lanza).
export async function createNotification(opts = {}) {
  try {
    const type = NOTIFICATION_TYPES.includes(opts.type) ? opts.type : 'system';
    const title = (opts.title ?? '').toString().trim().slice(0, 300) || 'Aviso';
    const body = opts.body != null ? opts.body.toString().slice(0, 5000) : null;
    const ref = opts.ref != null ? opts.ref.toString().slice(0, 100) : null;
    const url = opts.url != null ? opts.url.toString().slice(0, 500) : null;

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
    return r.rowCount ? r.rows[0] : null;
  } catch (err) {
    console.error('[notifications] createNotification falló:', err && err.message);
    return null;
  }
}

// ── Lectura ───────────────────────────────────────────────────
// opts: { limit=30, unreadOnly=false }
export async function listNotifications(opts = {}) {
  const lim = Math.min(Math.max(parseInt(opts.limit) || 30, 1), 200);
  const unreadOnly = opts.unreadOnly === true || opts.unreadOnly === 'true';

  let rows;
  if (unreadOnly) {
    const r = await sql`
      SELECT id, type, title, body, ref, url, read_at, created_at
        FROM notifications
       WHERE read_at IS NULL
       ORDER BY created_at DESC
       LIMIT ${lim}`;
    rows = r.rows;
  } else {
    const r = await sql`
      SELECT id, type, title, body, ref, url, read_at, created_at
        FROM notifications
       ORDER BY created_at DESC
       LIMIT ${lim}`;
    rows = r.rows;
  }
  return { rows, limit: lim };
}

// Conteo de no-leídas (para el badge del nav). Defensivo: 0 si falla.
export async function unreadCount() {
  try {
    const r = await sql`SELECT COUNT(*)::int AS n FROM notifications WHERE read_at IS NULL`;
    return r.rows[0].n;
  } catch (err) {
    console.error('[notifications] unreadCount falló:', err && err.message);
    return 0;
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
  return r.rowCount ? r.rows[0] : null;
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
