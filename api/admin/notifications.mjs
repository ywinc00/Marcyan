// /api/admin/notifications
//   GET   → lista (?limit=30&unreadOnly=true) + unreadCount
//           Opcionales (nuevos, no rompen el contrato de siempre):
//             ?before=<id>   paginación por cursor (los más antiguos que ese id)
//             ?offset=<n>    paginación por desplazamiento (si no hay cursor)
//             ?type=new_lead|new_brief|chat_handoff|system
//             ?countOnly=1   SOLO el contador de no leídos → { ok, unread }
//                            (barato, para el badge del menú con refresco; OP-13)
//           Respuesta completa: { ok, rows, limit, offset, total, has_more,
//             next_cursor, unread, counts }
//             rows[].link  enlace profundo a Orbit (#/leads/…, #/briefs/…)
//             counts       { total, unread, by_type: { tipo: { total, unread } } }
//   PATCH → marca TODAS las no-leídas como leídas
// Protegida con requireAdmin.
import { requireAdmin } from '../../lib/auth.mjs';
import {
  listNotifications, unreadCount, markAllRead, notificationCounts,
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
      const [result, counts] = await Promise.all([
        listNotifications({
          limit, unreadOnly,
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
      const affected = await markAllRead();
      const unread = await unreadCount();
      return res.status(200).json({ ok: true, affected, unread });
    } catch (err) {
      console.error('[admin/notifications PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al marcar avisos' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
