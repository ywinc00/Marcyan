// /api/admin/notifications
//   GET   → lista (?limit=30&unreadOnly=true) + unreadCount
//           Opcionales (nuevos, no rompen el contrato de siempre):
//             ?before=<id>   paginación por cursor (los más antiguos que ese id)
//             ?offset=<n>    paginación por desplazamiento (si no hay cursor)
//             ?type=new_lead|new_brief|chat_handoff|system
//             ?archived=1    solo los archivados (sin él: la bandeja, sin archivados)
//             ?countOnly=1   SOLO el contador de no leídos → { ok, unread }
//                            (barato, para el badge del menú con refresco; OP-13)
//           Respuesta completa: { ok, rows, limit, offset, total, has_more,
//             next_cursor, unread, counts, archive_available }
//             rows[].link         enlace profundo a Orbit (#/leads/…, #/briefs/…)
//             rows[].archived_at  null en la bandeja
//             counts       { total, unread, archived, by_type: { tipo: { total, unread } } }
//             archive_available  false si la migración 015 aún no está aplicada
//           Si la BD falla → 500 (también con countOnly): nunca un 0 falso
//           que apague el contador o finja una bandeja vacía (A7-03).
//   PATCH → marca TODAS las no-leídas de la bandeja como leídas
//           (body opcional { type } para marcar solo las de un tipo;
//           un type desconocido → 400, no marca nada)
//           Respuesta: { ok, affected, unread } (unread null si no se pudo
//           contar después; el cambio ya quedó guardado)
// Protegida con requireAdmin.
import { requireAdmin } from '../../lib/auth.mjs';
import {
  listNotifications, unreadCount, unreadCountOrNull, markAllRead, notificationCounts,
} from '../../lib/notifications.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const q = req.query || {};
      if (q.countOnly === '1' || q.countOnly === 'true') {
        const unread = await unreadCount();
        return res.status(200).json({ ok: true, unread });
      }
      const limit = q.limit ? parseInt(q.limit, 10) : 30;
      const unreadOnly = q.unreadOnly === 'true' || q.unreadOnly === '1';
      const archived = q.archived === '1' || q.archived === 'true' ? 'only' : null;
      const [result, counts] = await Promise.all([
        listNotifications({
          limit, unreadOnly, archived,
          offset: q.offset, before: q.before,
          type: q.type ? String(q.type) : null,
        }),
        notificationCounts(),
      ]);
      return res.status(200).json({ ok: true, ...result, unread: counts.unread, counts });
    } catch (err) {
      console.error('[admin/notifications GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al listar avisos' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = (req.body && typeof req.body === 'object') ? req.body : {};
      const affected = await markAllRead(body.type ? String(body.type) : null);
      const unread = await unreadCountOrNull();
      return res.status(200).json({ ok: true, affected, unread });
    } catch (err) {
      if (err && err.code === 'invalid_type') {
        return res.status(400).json({ ok: false, code: 'invalid_type', error: 'Tipo de aviso no válido.' });
      }
      console.error('[admin/notifications PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al marcar avisos' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
