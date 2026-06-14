// /api/admin/clients
//   GET  ?status=&search=&limit=&offset=   → lista paginada de clientes
//   POST { business_name, ... } | { from_brief: 'MRC-XXX' } → crear cliente
// Protegido con requireAdmin.
import { requireAdmin } from '../../lib/auth.mjs';
import {
  listClients, createClient, createClientFromBrief, CLIENT_STATUSES,
} from '../../lib/finance.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const q = req.query || {};
      const status = q.status && CLIENT_STATUSES.includes(q.status) ? q.status : null;
      const search = q.search ? String(q.search).slice(0, 200) : null;
      const limit  = q.limit  ? parseInt(q.limit, 10)  : 50;
      const offset = q.offset ? parseInt(q.offset, 10) : 0;
      const result = await listClients({ status, search, limit, offset });
      return res.status(200).json({ ok: true, ...result });
    } catch (err) {
      console.error('[admin/clients GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al listar clientes' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};

      // Conversión brief → cliente
      if (body.from_brief) {
        const pid = String(body.from_brief).trim();
        const client = await createClientFromBrief(pid);
        if (!client) return res.status(404).json({ ok: false, error: `Brief ${pid} no encontrado` });
        return res.status(201).json({ ok: true, client });
      }

      const client = await createClient({
        business_name: body.business_name,
        owner_name: body.owner_name,
        email: body.email,
        phone: body.phone,
        city_state: body.city_state,
        source_brief_id: body.source_brief_id,
        notes: body.notes,
        status: body.status,
      });
      return res.status(201).json({ ok: true, client });
    } catch (err) {
      console.error('[admin/clients POST] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al crear cliente' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
