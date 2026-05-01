// GET /api/admin/export?status=...&search=...
// Descarga CSV con los briefs filtrados.
import { requireAdmin } from '../../lib/auth.mjs';
import { listBriefs, BRIEF_STATUSES } from '../../lib/db.mjs';
import { rowsToCsv } from '../../lib/csv.mjs';

const COLUMNS = [
  'project_id', 'status', 'created_at', 'contacted_at', 'completed_at',
  'business_name', 'owner_name', 'industry', 'years_in_market',
  'business_description', 'products_services',
  'phone', 'email', 'city_state', 'current_website',
  'instagram', 'facebook', 'other_socials', 'google_business',
  'website_type', 'has_domain', 'has_hosting',
  'pages_required', 'features_required',
  'target_audience', 'main_objective', 'visitor_action', 'competitors',
  'has_logo', 'brand_colors', 'brand_fonts', 'brand_personality',
  'inspiration_sites', 'design_dislikes',
  'has_photos', 'has_copy', 'has_video', 'language',
  'budget_range', 'timeline', 'deadline',
  'additional_notes', 'referred_by', 'previous_agency',
  'summary',
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const q = req.query || {};
    const status = q.status && BRIEF_STATUSES.includes(q.status) ? q.status : null;
    const search = q.search ? String(q.search).slice(0, 200) : null;

    // listBriefs lista columnas reducidas — para export queremos todo.
    // Hacemos query directa via sql.
    const { sql } = await import('@vercel/postgres');

    let rows;
    if (status && search) {
      const pat = `%${search}%`;
      const r = await sql`
        SELECT * FROM briefs
         WHERE status = ${status}
           AND (business_name ILIKE ${pat} OR owner_name ILIKE ${pat}
                OR email ILIKE ${pat} OR phone ILIKE ${pat}
                OR project_id ILIKE ${pat})
         ORDER BY created_at DESC LIMIT 5000`;
      rows = r.rows;
    } else if (status) {
      const r = await sql`SELECT * FROM briefs WHERE status = ${status} ORDER BY created_at DESC LIMIT 5000`;
      rows = r.rows;
    } else if (search) {
      const pat = `%${search}%`;
      const r = await sql`
        SELECT * FROM briefs
         WHERE business_name ILIKE ${pat} OR owner_name ILIKE ${pat}
            OR email ILIKE ${pat} OR phone ILIKE ${pat}
            OR project_id ILIKE ${pat}
         ORDER BY created_at DESC LIMIT 5000`;
      rows = r.rows;
    } else {
      const r = await sql`SELECT * FROM briefs ORDER BY created_at DESC LIMIT 5000`;
      rows = r.rows;
    }

    const csv = rowsToCsv(rows, COLUMNS);
    const fname = `marcyan-briefs-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error('[admin/export] error:', err);
    return res.status(500).json({ ok: false, error: 'Error al exportar' });
  }
}
