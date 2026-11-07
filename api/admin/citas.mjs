// /api/admin/citas — calendario de citas de Orbit (sección Marcy, vista Citas).
//   GET   ?desde=YYYY-MM-DD&dias=7  → { ok, citas, horario }  (hora de Houston)
//   PATCH { id, status }           → { ok }  status: pendiente | hecha | cancelada | no_vino
// Protegida con requireAdmin.
import { requireAdmin } from '../../lib/auth.mjs';
import { listAppointments, setAppointmentStatus, zonedToUtc, HOURS, STATUSES } from '../../lib/appointments.mjs';

const missing = (err) => err && (err.code === '42P01' || /does not exist/i.test(err.message || ''));

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      const m = String(q.desde || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const dias = Math.min(Math.max(parseInt(q.dias, 10) || 7, 1), 42);
      const now = new Date();
      const [y, mo, d] = m ? [+m[1], +m[2], +m[3]] : [now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()];
      const from = zonedToUtc(y, mo, d, 0).toISOString();
      const end = new Date(Date.UTC(y, mo - 1, d + dias, 12));
      const to = zonedToUtc(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate(), 0).toISOString();
      const citas = await listAppointments({ from, to });
      return res.status(200).json({ ok: true, citas, horario: HOURS });
    }
    if (req.method === 'PATCH') {
      const b = req.body && typeof req.body === 'object' ? req.body : {};
      const id = parseInt(b.id, 10);
      if (!id || !STATUSES.includes(b.status)) return res.status(400).json({ ok: false, error: 'Datos no válidos' });
      try {
        const ok = await setAppointmentStatus(id, b.status);
        return ok ? res.status(200).json({ ok: true }) : res.status(404).json({ ok: false, error: 'Cita no encontrada' });
      } catch (err) {
        if (err && err.code === '23505') return res.status(409).json({ ok: false, error: 'Esa hora ya tiene otra cita' });
        throw err;
      }
    }
    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    if (missing(err)) return res.status(503).json({ ok: false, code: 'migration_pending', error: 'Falta aplicar la migración 019' });
    console.error('[admin/citas] error:', err);
    return res.status(500).json({ ok: false, error: 'Error con las citas' });
  }
}
