// /api/admin/clients
//   GET  ?status=&active=1&search=&limit=&offset=
//        → { rows, total, limit, offset, summary }
//        · rows: todas las columnas de siempre + projects_total, projects_active
//          y balance_cents (saldo por cobrar, sin borradores ni anuladas)
//        · active=1 excluye los archivados (lo usa el selector de cliente)
//        · summary: { active, inactive, archived, current, total, balance_cents,
//                     with_active_projects } (recuentos con la búsqueda aplicada)
//   POST { business_name, owner_name, email, phone, city_state, notes, status,
//          allow_duplicate? }
//        → 201 { client, created: true }
//        → 400 { error, fields }  sin nombre, correo o teléfono no válidos (CRM-16)
//        → 409 { error, reason: 'duplicate', matches }  ya hay un cliente con ese
//          correo o teléfono (se repite con allow_duplicate: true para crearlo igual)
//   POST { from_brief: 'MRC-XXX', allow_duplicate? }  (sin distinguir mayúsculas)
//        → 201 { client, created: true } o 200 { client, created: false } si ya
//          existía un cliente de ese brief (CRM-04). 404 si el brief no existe.
//          409 { reason: 'duplicate', matches } si ya hay un cliente con el
//          correo o el teléfono del brief (repetir con allow_duplicate: true, o
//          vincularlo con POST /api/admin/briefs/:id { client_id }).
//          "Ya existía" incluye el brief vinculado a un cliente anterior desde
//          la ficha del brief (evento converted_to_client). Vincular un brief a
//          un cliente que ya existe NO se hace aquí: es POST /api/admin/briefs/:id
//          { action: 'convert_to_client', client_id } (A3), para no tener dos caminos.
//   POST { from_lead: 'LEAD-XXX', ...datos corregidos?, allow_duplicate? }
//        → atajo de POST /api/admin/leads/:id/convert con { client: { mode: 'new' } }.
// Protegido con requireAdmin.
import { requireAdmin } from '../../lib/auth.mjs';
import {
  listClients, createClient, convertBriefToClient, findClientDuplicates,
  validateClientInput, clientDisplayName, CLIENT_STATUSES, CrmError,
} from '../../lib/finance.mjs';
import { convertLead } from '../../lib/leads.mjs';

const CLIENT_FIELDS = ['business_name', 'owner_name', 'email', 'phone', 'city_state', 'notes', 'status'];

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const q = req.query || {};
      const status = q.status && CLIENT_STATUSES.includes(q.status) ? q.status : null;
      const active = q.active === '1' || q.active === 'true';
      const search = q.search ? String(q.search).slice(0, 200) : null;
      const limit  = q.limit  ? parseInt(q.limit, 10)  : 50;
      const offset = q.offset ? parseInt(q.offset, 10) : 0;
      const result = await listClients({ status, active, search, limit, offset });
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
        const pid = String(body.from_brief).trim().toUpperCase();
        const r = await convertBriefToClient(pid, session.email, { checkDuplicates: body.allow_duplicate !== true });
        if (!r) return res.status(404).json({ ok: false, error: `No existe el brief ${pid}.` });
        return res.status(r.created ? 201 : 200).json({ ok: true, client: r.client, created: r.created });
      }

      // Conversión lead → cliente nuevo (atajo del endpoint de conversión)
      if (body.from_lead) {
        const ref = String(body.from_lead).trim().toUpperCase();
        const data = {};
        for (const k of CLIENT_FIELDS) if (body[k] !== undefined) data[k] = body[k];
        const r = await convertLead(ref, {
          client: { mode: 'new', data, allowDuplicate: body.allow_duplicate === true },
        }, { actorEmail: session.email });
        return res.status(201).json({ ok: true, client: r.client, lead: r.lead, created: true });
      }

      // Alta manual validada (CRM-16)
      const v = validateClientInput(body);
      if (!v.ok) return res.status(400).json({ ok: false, error: 'Revisa los datos del cliente.', fields: v.fields });
      if (body.allow_duplicate !== true) {
        const matches = await findClientDuplicates({ email: v.clean.email, phone: v.clean.phone });
        if (matches.length) {
          return res.status(409).json({
            ok: false,
            error: `Ya existe un cliente con ese correo o teléfono: ${matches[0].client_code} ${clientDisplayName(matches[0])}.`,
            reason: 'duplicate',
            matches,
          });
        }
      }
      const client = await createClient({ ...v.clean, source_brief_id: body.source_brief_id || null });
      return res.status(201).json({ ok: true, client, created: true });
    } catch (err) {
      if (err instanceof CrmError) return res.status(err.status).json({ ok: false, error: err.message, ...err.extra });
      // FK del brief de origen inexistente (alta manual con source_brief_id mal escrito).
      if (err && err.code === '23503') return res.status(400).json({ ok: false, error: 'El brief de origen no existe.' });
      console.error('[admin/clients POST] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al crear cliente' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
