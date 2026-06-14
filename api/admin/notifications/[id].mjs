// /api/admin/notifications/:id   (id = id numérico de la notificación)
//   PATCH → marca esa notificación como leída
// Protegida con requireAdmin.
import { requireAdmin } from '../../../lib/auth.mjs';
import { markRead, unreadCount } from '../../../lib/notifications.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const id = (req.query?.id || '').toString();
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });

  if (req.method === 'PATCH') {
    try {
      const updated = await markRead(id);
      if (!updated) return res.status(404).json({ ok: false, error: 'Aviso no encontrado' });
      const unread = await unreadCount();
      return res.status(200).json({ ok: true, notification: updated, unread });
    } catch (err) {
      console.error('[admin/notifications/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al marcar aviso' });
    }
  }

  res.setHeader('Allow', 'PATCH');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
