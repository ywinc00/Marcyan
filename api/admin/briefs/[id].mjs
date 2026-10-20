// /api/admin/briefs/:id
//   GET    → { brief, data, client }
//            brief: la fila completa (como siempre).
//            data:  valores combinados de columnas + extra + kit (briefData, la
//                   misma lectura que el documento y el kit), con los servicios.
//            client: { id, client_code, business_name, status } si el brief ya
//                   es cliente (CRM-04), o null.
//   PATCH  → { status?, summary?, fields? } actualiza estado, resumen y/o campos.
//            fields: SOLO lo que cambió (CRM-09). Cada valor se valida con el
//            esquema único (B-22). El historial registra campo por campo el
//            valor anterior y el nuevo. Respuesta: { brief, data, changes }
//            con changes.fields = las claves que de verdad cambiaron.
//            400 { errors: { clave: mensaje } } si algún valor no vale.
//   POST   → { action: 'convert_to_client', client_id?, allow_duplicate? }
//            Sin client_id crea el cliente con los datos del brief; con
//            client_id lo vincula a uno que ya existe. Deja UN evento
//            'converted_to_client' (con el actor) en el historial del brief.
//            Respuesta: { client, created, linked, already } (201 si se creó).
//            409 si el brief ya es de OTRO cliente (no se cambia por aquí).
//            409 { reason: 'duplicate', matches } si al crear ya hay un
//            cliente con su correo o teléfono: se vincula a uno de ellos
//            (client_id) o se repite con allow_duplicate: true.
//   DELETE → elimina el brief (cascade a brief_events) y antes sus archivos en Blob
import { requireAdmin } from '../../../lib/auth.mjs';
import {
  getBriefByProjectId, updateBriefStatus, updateBriefSummary, deleteBrief,
  logEvent, BRIEF_STATUSES, prepareBriefEdits, applyBriefEdits,
  getBriefClient, linkBriefToClient,
} from '../../../lib/db.mjs';
import { convertBriefToClient, CrmError } from '../../../lib/finance.mjs';
import { deleteBriefBlobs, isMissingSchema } from '../../../lib/brief-files.mjs';
import { briefData } from '../../../lib/kit/build.mjs';

const asObj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

// El cliente vinculado nunca debe romper la ficha: si la consulta falla
// (tabla de clientes sin crear en un entorno nuevo), la ficha sale sin él.
async function safeClient(id) {
  try { return await getBriefClient(id); }
  catch (err) {
    console.error('[admin/briefs/:id] cliente vinculado no disponible:', err && err.message);
    return null;
  }
}

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const id = (req.query?.id || '').toString();
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });

  if (req.method === 'GET') {
    try {
      const brief = await getBriefByProjectId(id);
      if (!brief) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });
      const client = await safeClient(id);
      return res.status(200).json({ ok: true, brief, data: briefData(brief), client });
    } catch (err) {
      console.error('[admin/briefs/:id GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al obtener brief' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const newStatus  = typeof body.status  === 'string' ? body.status.trim()  : null;
      const newSummary = typeof body.summary === 'string' ? body.summary        : null;
      const fieldsObj  = (body.fields && typeof body.fields === 'object' && !Array.isArray(body.fields)) ? body.fields : null;

      if (newStatus !== null && !BRIEF_STATUSES.includes(newStatus)) {
        return res.status(400).json({ ok: false, error: 'Ese estado no existe. Elige uno de la lista.' });
      }
      if (newSummary !== null && newSummary.length > 10000) {
        return res.status(400).json({ ok: false, error: 'El resumen es demasiado largo (máximo 10.000 caracteres).' });
      }

      const before = await getBriefByProjectId(id);
      if (!before) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });

      const changes = {};

      if (fieldsObj) {
        const data = briefData(before);
        const plan = prepareBriefEdits({
          data, extra: asObj(before.extra), kit: asObj(before.kit),
          fields: fieldsObj, services: data.services || [],
        });
        if (Object.keys(plan.errors).length) {
          return res.status(400).json({ ok: false, error: 'Revisa los campos marcados.', errors: plan.errors });
        }
        const keys = Object.keys(plan.changes);
        if (keys.length) {
          try {
            await applyBriefEdits(id, plan.writes);
          } catch (err) {
            if (isMissingSchema(err)) {
              return res.status(503).json({ ok: false, error: 'Algunos de estos campos necesitan la actualización 010 de la base de datos. Los demás se pueden guardar por separado.' });
            }
            throw err;
          }
          changes.fields = keys;
          await logEvent({
            projectId: id,
            type: 'brief_edited',
            actorEmail: session.email,
            data: { fields: keys, changes: plan.changes },
          });
        } else {
          changes.fields = [];
        }
      }

      if (newStatus !== null && newStatus !== before.status) {
        await updateBriefStatus(id, newStatus, session.email);
        changes.status = { from: before.status, to: newStatus };
        await logEvent({
          projectId: id,
          type: 'status_changed',
          actorEmail: session.email,
          data: { from: before.status, to: newStatus },
        });
      }

      if (newSummary !== null && newSummary !== (before.summary || '')) {
        await updateBriefSummary(id, newSummary);
        changes.summary = { len: newSummary.length };
        await logEvent({
          projectId: id,
          type: 'summary_updated',
          actorEmail: session.email,
          data: { length: newSummary.length },
        });
      }

      const after = await getBriefByProjectId(id);
      return res.status(200).json({ ok: true, brief: after, data: briefData(after), changes });
    } catch (err) {
      console.error('[admin/briefs/:id PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al actualizar brief' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      if (body.action !== 'convert_to_client') {
        return res.status(400).json({ ok: false, error: 'Acción no reconocida.' });
      }
      const brief = await getBriefByProjectId(id);
      if (!brief) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });

      const current = await getBriefClient(id);
      const wanted = body.client_id === undefined || body.client_id === null || body.client_id === ''
        ? null : Number(body.client_id);
      if (wanted !== null && (!Number.isInteger(wanted) || wanted <= 0)) {
        return res.status(400).json({ ok: false, error: 'Elige un cliente de la lista.' });
      }
      // Ya es cliente (y no se pide otro): no se duplica, se avisa.
      if (current && (wanted === null || Number(current.id) === wanted)) {
        return res.status(200).json({ ok: true, client: current, created: false, linked: false, already: true });
      }
      // Ya es de OTRO cliente: no se cambia por aquí (la ficha seguiría
      // mostrando el primero y el vínculo quedaría a medias). Revisión A3-04.
      if (current) {
        return res.status(409).json({
          ok: false, client: current,
          error: current.client_code
            ? `Este brief ya está vinculado al cliente ${current.client_code}.`
            : 'Este brief ya está vinculado a otro cliente.',
        });
      }

      let client;
      let created = false;
      let linked = false;
      if (wanted === null) {
        // convertBriefToClient escribe el evento 'converted_to_client' con el
        // actor; aquí no se repite (antes quedaba dos veces en el historial).
        const r = await convertBriefToClient(id, session.email, { checkDuplicates: body.allow_duplicate !== true });
        if (!r) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });
        client = r.client;
        created = r.created;
      } else {
        // El vínculo y su evento van juntos en una sola sentencia.
        const r = await linkBriefToClient(id, wanted, session.email);
        if (!r) return res.status(404).json({ ok: false, error: 'Ese cliente ya no existe. Búscalo de nuevo.' });
        client = r.client;
        linked = true;
      }
      const slim = {
        id: client.id, client_code: client.client_code,
        business_name: client.business_name, status: client.status,
      };
      return res.status(created ? 201 : 200).json({ ok: true, client: slim, created, linked, already: !created && !linked });
    } catch (err) {
      if (err instanceof CrmError) return res.status(err.status).json({ ok: false, error: err.message, ...err.extra });
      console.error('[admin/briefs/:id POST] error:', err);
      return res.status(500).json({ ok: false, error: 'No se pudo convertir el brief en cliente' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const before = await getBriefByProjectId(id);
      if (!before) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });
      // Primero los archivos del cliente en Vercel Blob (privacidad y coste):
      // si el almacén falla, NO se borra el brief para no dejar huérfanos.
      let filesDeleted = 0;
      try {
        filesDeleted = await deleteBriefBlobs(before.id);
      } catch (err) {
        console.error(`[admin/briefs/:id DELETE] ${id} archivos no borrados:`, err && err.message);
        return res.status(502).json({
          ok: false,
          error: 'No se pudieron borrar los archivos del brief. No se borró nada; inténtalo de nuevo en un momento.',
        });
      }
      const ok = await deleteBrief(id);
      if (!ok) return res.status(500).json({ ok: false, error: 'No se pudo eliminar' });
      // No logEvent: el FK ON DELETE CASCADE ya limpió brief_events para este project_id.
      console.log(`[admin/briefs/:id DELETE] ${id} eliminado por ${session.email} · archivos=${filesDeleted}`);
      return res.status(200).json({ ok: true, deleted: id, filesDeleted });
    } catch (err) {
      console.error('[admin/briefs/:id DELETE] error:', err);
      return res.status(500).json({ ok: false, error: 'Error al eliminar brief' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, POST, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
