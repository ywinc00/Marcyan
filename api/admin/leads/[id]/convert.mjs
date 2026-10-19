// POST /api/admin/leads/:id/convert   (id = ref_id LEAD-XXX)
// Convierte el lead en cliente (nuevo o existente) y/o en brief borrador,
// en una sola transacción (lib/leads.mjs → convertLead).
//
// Cuerpo:
//   { client: { mode: 'new', data?: { business_name, owner_name, email, phone, city_state, notes },
//               allow_duplicate?: true }
//           | { mode: 'existing', id: <clients.id> }
//           | null,
//     brief: true | false }
// Respuestas:
//   200 { lead, client, brief, created: { client, brief } }
//   400 { error, fields? }        datos del cliente nuevo no válidos / nada elegido
//   404                            lead o cliente inexistente
//   409 { error, reason, matches? } reason: duplicate (matches = clientes con ese
//                                   correo o teléfono) | already_client | already_brief
//   503                            falta la migración 011
import { requireAdmin } from '../../../../lib/auth.mjs';
import { convertLead } from '../../../../lib/leads.mjs';
import { CrmError } from '../../../../lib/finance.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const id = String(req.query?.id || '').trim().toUpperCase().slice(0, 40);
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });

  try {
    const body = (typeof req.body === 'object' && req.body) ? req.body : {};
    const c = body.client && typeof body.client === 'object' ? body.client : null;
    const client = c && c.mode === 'existing' ? { mode: 'existing', id: c.id }
      : c && c.mode === 'new' ? {
        mode: 'new',
        data: c.data && typeof c.data === 'object' ? c.data : {},
        allowDuplicate: c.allow_duplicate === true,
      }
      : null;
    const result = await convertLead(id, { client, brief: body.brief === true }, { actorEmail: session.email });
    console.log(`[admin/leads/:id/convert] ${id} → ${result.client?.client_code || '-'} / ${result.brief?.project_id || '-'} por ${session.email}`);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof CrmError) return res.status(err.status).json({ ok: false, error: err.message, ...err.extra });
    console.error('[admin/leads/:id/convert] error:', err);
    return res.status(500).json({ ok: false, error: 'No se pudo convertir el lead' });
  }
}
