// /api/admin/clients/:id   (id = clients.id numérico)
//   GET    → detalle del cliente
//   PATCH  → { business_name, ..., status } actualiza campos
//   DELETE → elimina el cliente (CASCADE a projects/invoices/payments)
import { requireAdmin } from '../../../lib/auth.mjs';
import { getClient, updateClient, deleteClient } from '../../../lib/finance.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const id = parseInt((req.query?.id || '').toString(), 10);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });

  if (req.method === 'GET') {
    try {
      const client = await getClient(id);
      if (!client) return res.status(404).json({ ok: false, error: 'Cliente no encontrado' });
      return res.status(200).json({ ok: true, client });
    } catch (err) {
      console.error('[admin/clients/:id GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al obtener cliente' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const before = await getClient(id);
      if (!before) return res.status(404).json({ ok: false, error: 'Cliente no encontrado' });
      const client = await updateClient(id, body);
      return res.status(200).json({ ok: true, client });
    } catch (err) {
      console.error('[admin/clients/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al actualizar cliente' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const before = await getClient(id);
      if (!before) return res.status(404).json({ ok: false, error: 'Cliente no encontrado' });
      const ok = await deleteClient(id);
      if (!ok) return res.status(500).json({ ok: false, error: 'No se pudo eliminar' });
      console.log(`[admin/clients/:id DELETE] ${before.client_code} eliminado por ${session.email}`);
      return res.status(200).json({ ok: true, deleted: id });
    } catch (err) {
      console.error('[admin/clients/:id DELETE] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al eliminar cliente' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
