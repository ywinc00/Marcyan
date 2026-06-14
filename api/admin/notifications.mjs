// /api/admin/notifications
//   GET   → lista (?limit=30&unreadOnly=true) + unreadCount
//   PATCH → marca TODAS las no-leídas como leídas
// Protegida con requireAdmin.
import { requireAdmin } from '../../lib/auth.mjs';
import { listNotifications, unreadCount, markAllRead } from '../../lib/notifications.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const q = req.query || {};
      const limit = q.limit ? parseInt(q.limit, 10) : 30;
      const unreadOnly = q.unreadOnly === 'true' || q.unreadOnly === '1';
      const result = await listNotifications({ limit, unreadOnly });
      const unread = await unreadCount();
      return res.status(200).json({ ok: true, ...result, unread });
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
