// /api/admin/push — avisos de Orbit en este dispositivo (Web Push, migración 021).
//   GET                         → { ok, publicKey, configurado, dispositivos }
//   POST   { subscription, device } → guarda la suscripción de este dispositivo
//   POST   { test: true }       → manda un aviso de prueba a todos los dispositivos
//   DELETE { endpoint }         → quita este dispositivo
// Protegida con requireAdmin.
import { requireAdmin } from '../../lib/auth.mjs';
import { VAPID_PUBLIC_KEY, pushConfigured, validSubscription, saveSubscription, removeSubscription, countSubscriptions, pushToAdmins } from '../../lib/push.mjs';

const missing = (err) => err && (err.code === '42P01' || /does not exist/i.test(err.message || ''));

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  try {
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, publicKey: VAPID_PUBLIC_KEY, configurado: pushConfigured(), dispositivos: await countSubscriptions() });
    }
    if (req.method === 'POST' && b.test) {
      const r = await pushToAdmins({ title: 'Avisos de Orbit activos', body: 'Así te llegará cada lead, cita o correo importante.', url: '/dashboard#/avisos', tag: 'prueba' });
      return res.status(200).json({ ok: true, ...r });
    }
    if (req.method === 'POST') {
      if (!validSubscription(b.subscription)) return res.status(400).json({ ok: false, error: 'Suscripción no válida' });
      await saveSubscription({ sub: b.subscription, email: session.email, device: b.device });
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'DELETE') {
      if (typeof b.endpoint !== 'string') return res.status(400).json({ ok: false, error: 'Falta el dispositivo' });
      await removeSubscription({ endpoint: b.endpoint });
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    if (missing(err)) return res.status(503).json({ ok: false, code: 'migration_pending', error: 'Falta aplicar la migración 021' });
    console.error('[admin/push] error:', err);
    return res.status(500).json({ ok: false, error: 'Error con los avisos' });
  }
}
