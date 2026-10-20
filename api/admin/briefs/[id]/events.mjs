// /api/admin/briefs/:id/events
//   GET  → historial del brief (más reciente primero).
//   POST → { type: 'note', text } añade una nota interna al historial (CRM-18):
//          llamadas, acuerdos, seguimiento. Solo la ve el equipo en el panel.
//          Respuesta: { event } con la misma forma que las filas del GET.
import { requireAdmin } from '../../../../lib/auth.mjs';
import { listEvents, getBriefByProjectId, logEvent } from '../../../../lib/db.mjs';

const NOTE_MAX = 2000;

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const session = await requireAdmin(req, res);
  if (!session) return;

  const id = (req.query?.id || '').toString();
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });

  try {
    const brief = await getBriefByProjectId(id);
    if (!brief) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });

    if (req.method === 'POST') {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      if (body.type !== 'note') return res.status(400).json({ ok: false, error: 'Solo se pueden añadir notas.' });
      const text = String(body.text || '').replace(/\u0000/g, '').trim();
      if (!text) return res.status(400).json({ ok: false, error: 'Escribe la nota antes de guardarla.' });
      if (text.length > NOTE_MAX) {
        return res.status(400).json({ ok: false, error: `La nota es demasiado larga (máximo ${NOTE_MAX.toLocaleString('es-US')} caracteres).` });
      }
      await logEvent({ projectId: id, type: 'note', actorEmail: session.email, data: { text } });
      const [event] = await listEvents(id, 1);
      return res.status(201).json({ ok: true, event: event || null });
    }

    const events = await listEvents(id, 100);
    return res.status(200).json({ ok: true, events });
  } catch (err) {
    console.error('[admin/briefs/:id/events] error:', err);
    return res.status(500).json({ ok: false, error: req.method === 'POST' ? 'No se pudo guardar la nota' : 'Error al obtener eventos' });
  }
}
