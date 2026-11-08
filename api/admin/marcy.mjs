// /api/admin/marcy — sección "Marcy" de Orbit (migración 018)
//   GET                 → { ok, rows, embudo, gasto }  conversaciones recientes con su
//                         resultado (en_vivo · abierta · cerrada · transferida ·
//                         no_cerrada · abandonada) y el gasto del mes.
//                         ?limit=50 (máx 200) · ?days=30 (máx 400)
//   GET ?sid=<id>       → { ok, conversation }  turnos, resultado y dónde falló.
//   POST { sid, action:'tomar'|'devolver'|'enviar', text } → "Tomo yo" (migración 022):
//                         el dueño toma la conversación (Marcy calla), escribe, y la devuelve.
//   Entorno: el del despliegue (la vista previa ve solo sus pruebas).
//   Si la migración 018 no está aplicada → { ok:false, code:'migration_pending' } (503).
// Protegida con requireAdmin.
import { requireAdmin } from '../../lib/auth.mjs';
import { listConversations, getConversation, monthlySpend, monthFunnel } from '../../lib/chat-log.mjs';
import { setTakeover, recordOwnerMessage } from '../../lib/takeover.mjs';

const missing = (err) => err && (err.code === '42P01' || /does not exist/i.test(err.message || ''));

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  if (req.method === 'POST') {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const sid = String(b.sid || '');
    try {
      if (b.action === 'tomar' || b.action === 'devolver') {
        const ok = await setTakeover({ sid, on: b.action === 'tomar', by: session.email });
        return ok ? res.status(200).json({ ok: true }) : res.status(404).json({ ok: false, error: 'Conversación no encontrada' });
      }
      if (b.action === 'enviar') {
        const row = await recordOwnerMessage({ sid, text: b.text });
        return row ? res.status(200).json({ ok: true, turno: row }) : res.status(409).json({ ok: false, error: 'Primero toma la conversación' });
      }
      return res.status(400).json({ ok: false, error: 'Acción no válida' });
    } catch (err) {
      if (err && (err.code === '42703' || missing(err))) return res.status(503).json({ ok: false, code: 'migration_pending', error: 'Falta aplicar la migración 022' });
      if (err && err.message === 'vacío') return res.status(400).json({ ok: false, error: 'Escribe un mensaje' });
      console.error('[admin/marcy POST] error:', err);
      return res.status(500).json({ ok: false, error: 'No se pudo' });
    }
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const q = req.query || {};
  try {
    if (q.sid) {
      const conversation = await getConversation(String(q.sid));
      if (!conversation) return res.status(404).json({ ok: false, error: 'Conversación no encontrada' });
      return res.status(200).json({ ok: true, conversation });
    }
    const [rows, embudo, gasto] = await Promise.all([
      listConversations({ limit: q.limit, days: q.days }),
      monthFunnel(),
      monthlySpend().catch(() => null), // sin la tabla de uso, la lista sigue
    ]);
    return res.status(200).json({ ok: true, rows, embudo, gasto });
  } catch (err) {
    if (missing(err)) return res.status(503).json({ ok: false, code: 'migration_pending', error: 'Falta aplicar la migración 018' });
    console.error('[admin/marcy GET] error:', err);
    return res.status(500).json({ ok: false, error: 'Error al leer las conversaciones' });
  }
}
