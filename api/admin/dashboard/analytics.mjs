// GET /api/admin/dashboard/analytics
// Datos para la HOME del dashboard: KPIs agregados + actividad por mes
// (últimos 6) + embudo de leads. Una sola llamada para la pantalla principal.
//
// "Este mes" y "mes anterior" se miden en HORA DE HOUSTON (lib/dates.mjs),
// no en UTC: un lead de las 8 pm del 31 cuenta para ese mes.
//
// ── Contrato de respuesta ────────────────────────────────────────
// { ok, kpis, activity, funnel, briefs, leads, meta }
//
// kpis (todos enteros; montos en CENTAVOS USD; null = sin dato, no "cero"):
//   new_leads_this_month      leads creados este mes (Houston)          ← usar para "Leads nuevos · este mes"
//   new_leads_prev_month      leads creados el mes anterior (para el delta)
//   uncontacted_leads         leads en estado 'new' de cualquier fecha (sin contactar)
//   active_projects           proyectos con status 'active' (tabla projects) ← "Proyectos activos"
//   briefs_this_month         briefs recibidos este mes
//   revenue_this_month        cobrado este mes, centavos (pagos por paid_at) | null si Finanzas no responde
//   revenue_prev_month        cobrado el mes anterior, centavos | null
//   revenue_this_month_cents  alias explícito de revenue_this_month
//   revenue_prev_month_cents  alias explícito de revenue_prev_month
//   pending_briefs, in_progress_briefs, leads_from_chat, leads_from_contact, leads_from_diagnostic
//   ── Compatibilidad (no quitar; el panel actual los lee):
//   new_leads            = uncontacted_leads (NO es "este mes")
//   leads_this_month     = new_leads_this_month
//   projects_this_month  = briefs_this_month (son BRIEFS, no proyectos)
//   ⚠ revenue_this_month antes era siempre null; ahora es un número en centavos:
//     el panel debe formatearlo con money(), nunca pintarlo crudo.
//
// funnel: { new, contacted, converted, archived, total, pipeline }
//   pipeline = new + contacted (los vivos). total incluye archivados y
//   convertidos (compatibilidad); para "en pipeline" usar `pipeline` (OP-19).
//
// meta: { tz: 'America/Chicago', month: 'YYYY-MM', prev_month: 'YYYY-MM' }
import { requireAdmin } from '../../../lib/auth.mjs';
import { briefStats } from '../../../lib/db.mjs';
import { leadStats } from '../../../lib/leads.mjs';
import { financeSummary } from '../../../lib/finance.mjs';
import { TZ, monthRange, lastMonthKeys } from '../../../lib/dates.mjs';
import { sql } from '@vercel/postgres';

// Cobrado de este mes y del anterior, reutilizando el resumen de Finanzas
// (misma cifra que la sección Finanzas, sin duplicar la lógica). Defensivo:
// si Finanzas falla, la home se carga igual con null (= "sin dato").
async function revenueKpis(prevKey) {
  try {
    const fin = await financeSummary();
    const prev = (fin.revenue_by_month || []).find(r => r.month === prevKey);
    return {
      thisMonth: Number(fin.collected_this_month_cents) || 0,
      prevMonth: prev ? Number(prev.total_cents) || 0 : 0,
    };
  } catch (err) {
    console.error('[admin/dashboard/analytics] financeSummary falló:', err && err.message);
    return { thisMonth: null, prevMonth: null };
  }
}

// Proyectos activos reales (tabla projects). Defensivo igual que Finanzas.
async function activeProjects() {
  try {
    const r = await sql`SELECT COUNT(*)::int AS n FROM projects WHERE status = 'active'`;
    return r.rows[0].n;
  } catch (err) {
    console.error('[admin/dashboard/analytics] conteo de proyectos falló:', err && err.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const thisM  = monthRange(0);
    const prevM  = monthRange(-1);
    const since  = monthRange(-5); // inicio del 6.º mes hacia atrás (Houston)

    const [briefs, leads, revenue, projectsActive, leadsByMonth, briefsByMonth] = await Promise.all([
      briefStats(),
      leadStats(),
      revenueKpis(prevM.key),
      activeProjects(),
      // Actividad por mes (últimos 6): leads creados + briefs recibidos,
      // agrupados por mes LOCAL de Houston.
      sql`
        SELECT to_char(date_trunc('month', created_at AT TIME ZONE ${TZ}), 'YYYY-MM') AS month,
               COUNT(*)::int AS n
          FROM leads
         WHERE created_at >= ${since.startISO}
         GROUP BY 1`,
      sql`
        SELECT to_char(date_trunc('month', created_at AT TIME ZONE ${TZ}), 'YYYY-MM') AS month,
               COUNT(*)::int AS n
          FROM brief_events
         WHERE event_type = 'brief_received'
           AND created_at >= ${since.startISO}
         GROUP BY 1`,
    ]);

    const leadMap  = Object.fromEntries(leadsByMonth.rows.map(r => [r.month, r.n]));
    const briefMap = Object.fromEntries(briefsByMonth.rows.map(r => [r.month, r.n]));
    const months = lastMonthKeys(6);
    const activity = months.map(m => {
      const l = leadMap[m] || 0;
      const b = briefMap[m] || 0;
      return { month: m, leads: l, briefs: b, total: l + b };
    });

    const kpis = {
      // ── Nuevos (veraces) ──
      new_leads_this_month:     leads.this_month,
      new_leads_prev_month:     leads.prev_month,
      uncontacted_leads:        leads.new,
      active_projects:          projectsActive,
      briefs_this_month:        briefs.this_month,
      revenue_this_month:       revenue.thisMonth,
      revenue_prev_month:       revenue.prevMonth,
      revenue_this_month_cents: revenue.thisMonth,
      revenue_prev_month_cents: revenue.prevMonth,
      leads_from_contact:       leads.from_contact,
      leads_from_diagnostic:    leads.from_diagnostic,
      // ── De siempre (compatibilidad) ──
      new_leads:           leads.new,
      pending_briefs:      briefs.pending,
      in_progress_briefs:  briefs.in_progress,
      projects_this_month: briefs.this_month,
      leads_this_month:    leads.this_month,
      leads_from_chat:     leads.from_chat,
    };

    const funnel = {
      new:       leads.new,
      contacted: leads.contacted,
      converted: leads.converted,
      archived:  leads.archived,
      total:     leads.total,
      pipeline:  leads.pipeline,
    };

    const meta = { tz: TZ, month: thisM.key, prev_month: prevM.key };

    return res.status(200).json({ ok: true, kpis, activity, funnel, briefs, leads, meta });
  } catch (err) {
    console.error('[admin/dashboard/analytics] error:', err);
    return res.status(500).json({ ok: false, error: 'Error al cargar analítica' });
  }
}
