// GET /api/admin/dashboard/analytics
// Datos para la HOME del dashboard: KPIs agregados + actividad por mes
// (últimos 6) + embudo de leads. Una sola llamada para la pantalla principal.
import { requireAdmin } from '../../../lib/auth.mjs';
import { briefStats } from '../../../lib/db.mjs';
import { leadStats } from '../../../lib/leads.mjs';
import { sql } from '@vercel/postgres';

// Devuelve los últimos `n` meses como ['YYYY-MM', ...] terminando en el mes actual.
function lastMonths(n) {
  const out = [];
  const d = new Date();
  d.setUTCDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push(`${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const [briefs, leads] = await Promise.all([briefStats(), leadStats()]);

    // Actividad por mes (últimos 6): leads creados + briefs recibidos.
    const sinceExpr = `date_trunc('month', NOW()) - INTERVAL '5 months'`;
    const [leadsByMonth, briefsByMonth] = await Promise.all([
      sql`
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS n
          FROM leads
         WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
         GROUP BY 1`,
      sql`
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS n
          FROM brief_events
         WHERE event_type = 'brief_received'
           AND created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
         GROUP BY 1`,
    ]);

    const leadMap  = Object.fromEntries(leadsByMonth.rows.map(r => [r.month, r.n]));
    const briefMap = Object.fromEntries(briefsByMonth.rows.map(r => [r.month, r.n]));
    const months = lastMonths(6);
    const activity = months.map(m => {
      const l = leadMap[m] || 0;
      const b = briefMap[m] || 0;
      return { month: m, leads: l, briefs: b, total: l + b };
    });

    const kpis = {
      new_leads:           leads.new,
      pending_briefs:      briefs.pending,
      in_progress_briefs:  briefs.in_progress,
      projects_this_month: briefs.this_month,
      leads_this_month:    leads.this_month,
      leads_from_chat:     leads.from_chat,
      revenue_this_month:  null, // placeholder hasta Finanzas
    };

    const funnel = {
      new:       leads.new,
      contacted: leads.contacted,
      converted: leads.converted,
      archived:  leads.archived,
      total:     leads.total,
    };

    return res.status(200).json({ ok: true, kpis, activity, funnel, briefs, leads });
  } catch (err) {
    console.error('[admin/dashboard/analytics] error:', err);
    return res.status(500).json({ ok: false, error: 'Error al cargar analítica' });
  }
}
