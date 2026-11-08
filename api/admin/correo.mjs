// /api/admin/correo — bandeja de correo que clasificó Marcy (Orbit, Marcy › Correo).
//   GET   ?dias=14         → { ok, correos, estado }
//   PATCH { id, status }   → { ok }  status: nuevo | visto | respondido | archivado
// Protegida con requireAdmin. Solo lee lo que guarda la pasada (nunca el cuerpo).
import { requireAdmin } from '../../lib/auth.mjs';
import { listMail, setMailStatus } from '../../lib/mail-pass.mjs';

const missing = (err) => err && (err.code === '42P01' || /does not exist/i.test(err.message || ''));

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  try {
    if (req.method === 'GET') {
      const dias = Math.min(Math.max(parseInt((req.query || {}).dias, 10) || 14, 1), 90);
      const { sql } = await import('@vercel/postgres');
      const [correos, st] = await Promise.all([
        listMail({ days: dias }),
        sql`SELECT mailbox, updated_at, last_error FROM mail_state`,
      ]);
      return res.status(200).json({ ok: true, correos, estado: st.rows, acuse_activo: process.env.MAIL_ACK_ENABLED !== '0' });
    }
    if (req.method === 'PATCH') {
      const b = req.body && typeof req.body === 'object' ? req.body : {};
      const id = parseInt(b.id, 10);
      if (!id) return res.status(400).json({ ok: false, error: 'Datos no válidos' });
      try {
        const ok = await setMailStatus({ id, status: b.status });
        return ok ? res.status(200).json({ ok: true }) : res.status(404).json({ ok: false, error: 'Correo no encontrado' });
      } catch { return res.status(400).json({ ok: false, error: 'Estado no válido' }); }
    }
    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    if (missing(err)) return res.status(503).json({ ok: false, code: 'migration_pending', error: 'Falta aplicar la migración 020' });
    console.error('[admin/correo] error:', err);
    return res.status(500).json({ ok: false, error: 'Error con la bandeja' });
  }
}
