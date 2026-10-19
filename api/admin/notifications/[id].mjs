// /api/admin/notifications/:id   (id = id numérico de la notificación)
//   PATCH → sin cuerpo (o { read: true }): la marca como leída (como siempre)
//           { read: false }      → la deja sin leer
//           { archived: true }   → la archiva (y la marca leída)
//           { archived: false }  → la devuelve a la bandeja
//           Se pueden combinar ({ archived: false, read: false }).
//   Respuesta: { ok, notification (con link), unread }
//   409 { code:'archive_unavailable' } si la migración 015 aún no está aplicada.
// Protegida con requireAdmin.
import { requireAdmin } from '../../../lib/auth.mjs';
import { markRead, markUnread, setArchived, unreadCount } from '../../../lib/notifications.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const id = (req.query?.id || '').toString();
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });

  if (req.method === 'PATCH') {
    try {
      const body = (req.body && typeof req.body === 'object') ? req.body : {};
      let updated = null;
      if (typeof body.archived === 'boolean') {
        updated = await setArchived(id, body.archived);
        if (updated && body.read === false) updated = await markUnread(id);
      } else if (body.read === false) {
        updated = await markUnread(id);
      } else {
        updated = await markRead(id);
      }
      if (!updated) return res.status(404).json({ ok: false, error: 'Aviso no encontrado' });
      const unread = await unreadCount();
      return res.status(200).json({ ok: true, notification: updated, unread });
    } catch (err) {
      if (err && err.code === 'archive_unavailable') {
        return res.status(409).json({ ok: false, code: 'archive_unavailable', error: 'Archivar todavía no está disponible.' });
      }
      console.error('[admin/notifications/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al actualizar el aviso' });
    }
  }

  res.setHeader('Allow', 'PATCH');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
