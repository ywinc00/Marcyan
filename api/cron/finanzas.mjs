// /api/cron/finanzas — una vez al día (vercel.json).
//  1. Genera los cargos reales de las suscripciones que tocan hasta hoy (idempotente).
//  2. Avisa en el panel: cerrar el mes anterior (días 1 a 5) y plazos fiscales
//     que vencen en los próximos 7 días. Avisos deduplicados por clave.
//  3. Ventas (Ventas §1): las propuestas enviadas cuya caducidad pasó quedan vencidas y
//     avisan; el contacto NO pasa a perdido (lo decide el dueño). Si falla, Finanzas sigue.
// Autorización: Authorization: Bearer <CRON_SECRET> (Vercel lo manda solo).
import { safeEqual } from '../../lib/auth.mjs';
import { houstonDate } from '../../lib/dates.mjs';
import { generateSubscriptionCharges, monthChecklist } from '../../lib/finance-books.mjs';
import { taxCalendar } from '../../lib/finance-tax.mjs';
import { notifySystem } from '../../lib/notifications.mjs';
import { expireDueProposals } from '../../lib/proposals.mjs';

function bearerOk(req) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(h).trim());
  return Boolean(m && safeEqual(m[1].trim(), secret));
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function previousMonth(today) {
  const [y, m] = today.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function upcomingDeadlines(today, days = 7) {
  const y = Number(today.slice(0, 4));
  const limit = new Date(Date.parse(today) + days * 864e5).toISOString().slice(0, 10);
  return [...taxCalendar(y - 1), ...taxCalendar(y)].filter((it) => it.date >= today && it.date <= limit);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!bearerOk(req)) return res.status(401).json({ ok: false, error: 'No autorizado' });

  const today = houstonDate();
  const out = { today };
  try {
    out.charges = await generateSubscriptionCharges({ today });

    const day = Number(today.slice(8, 10));
    if (day <= 5) {
      const prev = previousMonth(today);
      const cl = await monthChecklist(prev);
      if (cl.status !== 'closed') {
        const name = MONTHS[Number(prev.slice(5, 7)) - 1];
        await notifySystem({
          key: `finanzas-cierre:${prev}`,
          title: `Cierra ${name} en Finanzas`,
          body: cl.can_close ? 'Está todo revisado: solo falta tu visto bueno.' : 'Hay movimientos por revisar antes de cerrarlo.',
          url: `/dashboard#/finanzas/cierre/${prev}`,
          windowHours: 24 * 6,
        });
      }
    }
    for (const it of upcomingDeadlines(today)) {
      await notifySystem({
        key: `finanzas-plazo:${it.date}:${it.kind}`,
        title: `Plazo fiscal el ${it.date}: ${it.label}`,
        body: 'Revisa la hoja de impuestos en Finanzas y llévala a tu contador.',
        url: '/dashboard#/finanzas/impuestos',
        windowHours: 24 * 8,
      });
    }
    try {
      const exp = await expireDueProposals();
      for (const it of exp.items) {
        await notifySystem({
          key: `ventas-vencida:${it.ref_id}`,
          title: `Venció sin respuesta la propuesta ${it.ref_id}`,
          body: 'Pasaron 14 días. En su ficha decide si la eligió, si la rechazó o si haces otra.',
          url: it.lead_ref ? `/dashboard#/leads/${encodeURIComponent(it.lead_ref)}` : '/dashboard#/leads?vista=hoy',
          windowHours: 24 * 30,
        });
      }
      out.proposals_expired = exp.expired.length;
    } catch (e) {
      console.error('[cron/finanzas] propuestas vencidas:', e.message);
    }
    console.log(`[cron/finanzas] cargos=${out.charges.created} saltados_cerrados=${out.charges.skippedClosed}`);
    return res.status(200).json({ ok: true, ...out });
  } catch (err) {
    console.error('[cron/finanzas] error:', err);
    return res.status(500).json({ ok: false, error: 'Error en el cron de finanzas' });
  }
}
