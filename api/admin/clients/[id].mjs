// /api/admin/clients/:id   (id = clients.id numérico)
//   GET            → { client, related }  ficha: proyectos, facturas con saldo,
//                    briefs y leads de origen, totales e impacto de un borrado
//   GET ?lite=1    → { client }           solo el registro (selector de cliente)
//   PATCH          → { business_name, owner_name, email, phone, city_state, notes,
//                      status, allow_duplicate? } actualiza lo que llegue.
//                    Archivar = { status: 'archived' }; reactivar = { status: 'active' }.
//                    400 { fields } si queda sin nombre o el correo o teléfono no valen;
//                    409 { reason: 'duplicate', matches } si el nuevo correo o
//                    teléfono ya es de otro cliente.
//   DELETE ?confirm=<nombre o código>
//                  → borrado DEFINITIVO (CASCADE a proyectos, hitos, facturas y
//                    pagos). Sin la confirmación escrita: 400 con { impact }
//                    (CRM-13). Lo normal es archivar.
import { requireAdmin } from '../../../lib/auth.mjs';
import {
  getClient, getClientRelated, updateClient, deleteClient, clientDeleteImpact,
  validateClientInput, findClientDuplicates, clientDisplayName, deleteConfirmationMatches,
} from '../../../lib/finance.mjs';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const id = parseInt((req.query?.id || '').toString(), 10);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });

  if (req.method === 'GET') {
    try {
      const client = await getClient(id);
      if (!client) return res.status(404).json({ ok: false, error: 'Cliente no encontrado' });
      const lite = req.query?.lite === '1' || req.query?.lite === 'true';
      if (lite) return res.status(200).json({ ok: true, client });
      const related = await getClientRelated(client);
      return res.status(200).json({ ok: true, client, related });
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

      const v = validateClientInput(body, { partial: true });
      // Al menos un nombre tras el cambio (CRM-16).
      const after = { ...before, ...v.clean };
      if (!after.business_name && !after.owner_name) {
        v.fields.business_name = 'Escribe el nombre del negocio o de la persona.';
      }
      if (Object.keys(v.fields).length) {
        return res.status(400).json({ ok: false, error: 'Revisa los datos del cliente.', fields: v.fields });
      }
      const contactChanged = ('email' in v.clean && v.clean.email !== (before.email || null))
        || ('phone' in v.clean && v.clean.phone !== (before.phone || null));
      if (contactChanged && body.allow_duplicate !== true) {
        const matches = await findClientDuplicates({
          email: 'email' in v.clean ? v.clean.email : null,
          phone: 'phone' in v.clean ? v.clean.phone : null,
          excludeId: id,
        });
        if (matches.length) {
          return res.status(409).json({
            ok: false,
            error: `Ese correo o teléfono ya es de otro cliente: ${matches[0].client_code} ${clientDisplayName(matches[0])}.`,
            reason: 'duplicate',
            matches,
          });
        }
      }
      const client = await updateClient(id, v.clean);
      if (before.status !== client?.status) {
        console.log(`[admin/clients/:id PATCH] ${before.client_code} ${before.status} → ${client?.status} por ${session.email}`);
      }
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
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const typed = req.query?.confirm ?? body.confirm;
      if (!deleteConfirmationMatches(before, typed)) {
        const impact = await clientDeleteImpact(id);
        return res.status(400).json({
          ok: false,
          error: `Para borrar definitivamente escribe el nombre del cliente (${clientDisplayName(before)}).`,
          reason: 'confirm_required',
          impact,
        });
      }
      const impact = await clientDeleteImpact(id);
      const ok = await deleteClient(id);
      if (!ok) return res.status(500).json({ ok: false, error: 'No se pudo eliminar' });
      console.log(`[admin/clients/:id DELETE] ${before.client_code} eliminado por ${session.email}`, impact);
      return res.status(200).json({ ok: true, deleted: id, impact });
    } catch (err) {
      console.error('[admin/clients/:id DELETE] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al eliminar cliente' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
