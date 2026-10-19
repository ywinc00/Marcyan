// /api/admin/leads/:id   (id = ref_id LEAD-XXX)
//   GET    → ficha: { lead, events, client, brief, client_matches, crm_ready }
//            · lead con todo lo guardado (incluidos IP y navegador)
//            · events: historial (migración 011; [] sin ella)
//            · client / brief: a qué se convirtió (o null)
//            · client_matches: clientes con el mismo correo o teléfono
//   PATCH  → { status?, notes? } (las notas necesitan la migración 011)
//            Respuesta: { lead } (compatible con el PATCH de antes)
//            409 { reason: 'use_convert' } si se pide 'converted' para un lead
//            sin cliente ni brief y la migración 011 está aplicada: eso se
//            hace con POST /api/admin/leads/:id/convert.
//   DELETE → elimina el lead (su historial se va con él; el cliente y el
//            brief creados a partir de él se conservan)
import { requireAdmin } from '../../../lib/auth.mjs';
import {
  getLeadByRefId, getLeadDetail, updateLead, deleteLead, LEAD_STATUSES,
} from '../../../lib/leads.mjs';
import { CrmError } from '../../../lib/finance.mjs';

// El ref se acepta sin distinguir mayúsculas ("lead-031").
const normRef = (v) => String(v || '').trim().toUpperCase().slice(0, 40);

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const id = normRef(req.query?.id);
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });

  if (req.method === 'GET') {
    try {
      const detail = await getLeadDetail(id);
      if (!detail) return res.status(404).json({ ok: false, error: 'Lead no encontrado' });
      return res.status(200).json({ ok: true, ...detail });
    } catch (err) {
      console.error('[admin/leads/:id GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al obtener lead' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const fields = {};
      if (body.status !== undefined) {
        const newStatus = typeof body.status === 'string' ? body.status.trim() : null;
        if (!newStatus || !LEAD_STATUSES.includes(newStatus)) {
          return res.status(400).json({ ok: false, error: 'Elige un estado válido para el lead.' });
        }
        fields.status = newStatus;
      }
      if (body.notes !== undefined) fields.notes = body.notes;
      if (!Object.keys(fields).length) {
        return res.status(400).json({ ok: false, error: 'No hay cambios que guardar.' });
      }
      const lead = await updateLead(id, fields, session.email);
      if (!lead) return res.status(404).json({ ok: false, error: 'Lead no encontrado' });
      return res.status(200).json({ ok: true, lead });
    } catch (err) {
      if (err instanceof CrmError) return res.status(err.status).json({ ok: false, error: err.message, ...err.extra });
      console.error('[admin/leads/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al actualizar lead' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const before = await getLeadByRefId(id);
      if (!before) return res.status(404).json({ ok: false, error: 'Lead no encontrado' });
      const ok = await deleteLead(id);
      if (!ok) return res.status(500).json({ ok: false, error: 'No se pudo eliminar' });
      console.log(`[admin/leads/:id DELETE] ${id} eliminado por ${session.email}`);
      return res.status(200).json({ ok: true, deleted: id });
    } catch (err) {
      console.error('[admin/leads/:id DELETE] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al eliminar lead' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
