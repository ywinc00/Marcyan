// GET /api/admin/export?status=...&search=...
// Descarga CSV con los briefs filtrados (comportamiento de siempre).
//
// GET /api/admin/export?type=leads&status=...&source=...&search=...&from=YYYY-MM-DD&to=YYYY-MM-DD
// Descarga CSV con TODOS los leads que cumplen los filtros (OP-18), no solo
// los cargados en pantalla. Columnas: LEAD_EXPORT_COLUMNS (sin IP ni navegador).
// from/to en hora de Houston, inclusivos.
//
// Ambos CSV salen de lib/csv.mjs: BOM UTF-8 (tildes en Excel) y celdas que
// empiezan por = + - @ tab o CR neutralizadas (vienen de formularios públicos).
import { requireAdmin } from '../../lib/auth.mjs';
import { listBriefs, BRIEF_STATUSES } from '../../lib/db.mjs';
import { rowsToCsv, sendCsv } from '../../lib/csv.mjs';
import {
  listLeadsForExport, LEAD_EXPORT_COLUMNS, LEAD_STATUSES, LEAD_SOURCES,
} from '../../lib/leads.mjs';
import { houstonDate } from '../../lib/dates.mjs';
import { LEGACY_COLUMNS, labelFor } from '../../lib/brief-schema.mjs';
import { briefData } from '../../lib/kit/build.mjs';

// Columnas del CSV de briefs derivadas del esquema único (CRM-20): mismo
// orden de siempre (identidad, las 39 claves históricas y el resumen) y, al
// final, lo nuevo del brief v2 para no mover columnas que alguien ya use.
// Los valores salen con su etiqueta legible (B-08): "Bilingüe", no "biling".
const META_COLUMNS = ['project_id', 'status', 'created_at', 'contacted_at', 'completed_at'];
const V2_COLUMNS = ['source', 'lang', 'services', 'preferred_contact', 'kit_status'];
const COLUMNS = [...META_COLUMNS, ...LEGACY_COLUMNS, 'summary', ...V2_COLUMNS];
const STATUS_LABEL = {
  pending: 'Pendiente', contacted: 'Contactado', in_progress: 'En curso',
  completed: 'Completado', archived: 'Archivado',
};
const SOURCE_LABEL = { web: 'Formulario', chat: 'Chat del sitio' };
const KIT_LABEL = { none: 'Sin enviar', sent: 'Enviado', in_progress: 'En curso', submitted: 'Recibido' };
const LANG_LABEL = { es: 'Español', en: 'Inglés' };

export function briefCsvRow(row) {
  const data = briefData(row);
  const out = {};
  for (const c of COLUMNS) {
    if (c === 'status') out[c] = STATUS_LABEL[row.status] || row.status;
    else if (c === 'source') out[c] = SOURCE_LABEL[row.source] || row.source || null;
    else if (c === 'lang') out[c] = LANG_LABEL[row.lang] || row.lang || null;
    else if (c === 'kit_status') out[c] = KIT_LABEL[row.kit_status] || row.kit_status || null;
    else if (META_COLUMNS.includes(c) || c === 'summary') out[c] = row[c];
    else out[c] = labelFor(c, data[c], 'es');
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
    const q = req.query || {};

    if (q.type === 'leads') {
      const rows = await listLeadsForExport({
        status: q.status && LEAD_STATUSES.includes(q.status) ? q.status : null,
        source: q.source && LEAD_SOURCES.includes(q.source) ? q.source : null,
        search: q.search ? String(q.search).slice(0, 200) : null,
        from:   q.from ? String(q.from).slice(0, 40) : null,
        to:     q.to   ? String(q.to).slice(0, 40)   : null,
      });
      const csv = rowsToCsv(rows, LEAD_EXPORT_COLUMNS);
      return sendCsv(res, `marcyan-leads-${houstonDate()}.csv`, csv);
    }

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

    const csv = rowsToCsv(rows.map(briefCsvRow), COLUMNS);
    return sendCsv(res, `marcyan-briefs-${houstonDate()}.csv`, csv);
  } catch (err) {
    console.error('[admin/export] error:', err);
    return res.status(500).json({ ok: false, error: 'Error al exportar' });
  }
}
