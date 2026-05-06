// GET /api/admin/briefs/:id/document?download=1
//   Genera un documento HTML imprimible del brief.
//   - Si download=1 → Content-Disposition: attachment (.html)
//   - Si no → text/html inline con window.print() automático para "Guardar como PDF"
import { requireAdmin } from '../../../../lib/auth.mjs';
import { getBriefByProjectId } from '../../../../lib/db.mjs';

const SECTIONS = [
  ['01 · Información del negocio', [
    ['Nombre del negocio', 'business_name'],
    ['Propietario / contacto', 'owner_name'],
    ['Industria', 'industry'],
    ['Años en el mercado', 'years_in_market'],
    ['Descripción del negocio', 'business_description', true],
    ['Productos / Servicios', 'products_services', true],
  ]],
  ['02 · Contacto e información digital', [
    ['Teléfono', 'phone'],
    ['Email', 'email'],
    ['Ciudad / Estado', 'city_state'],
    ['Web actual', 'current_website'],
    ['Instagram', 'instagram'],
    ['Facebook', 'facebook'],
    ['Otras redes', 'other_socials'],
    ['Google Business', 'google_business'],
  ]],
  ['03 · Tipo de sitio', [
    ['Tipo de sitio', 'website_type'],
    ['¿Dominio propio?', 'has_domain'],
    ['¿Hosting?', 'has_hosting'],
    ['Páginas requeridas', 'pages_required', false, 'tags'],
    ['Funcionalidades', 'features_required', false, 'tags'],
  ]],
  ['04 · Audiencia y objetivos', [
    ['Audiencia', 'target_audience', true],
    ['Objetivo principal', 'main_objective', true],
    ['Acción del visitante', 'visitor_action'],
    ['Competidores', 'competitors', true],
  ]],
  ['05 · Identidad de marca', [
    ['¿Logo existente?', 'has_logo'],
    ['Colores', 'brand_colors'],
    ['Tipografías', 'brand_fonts'],
    ['Personalidad', 'brand_personality'],
    ['Inspiración', 'inspiration_sites', true],
    ['No le gusta', 'design_dislikes', true],
  ]],
  ['06 · Contenido del sitio', [
    ['Fotos', 'has_photos'],
    ['Textos', 'has_copy'],
    ['Video', 'has_video'],
    ['Idioma', 'language'],
  ]],
  ['07 · Presupuesto y tiempos', [
    ['Inversión estimada', 'budget_range'],
    ['Tiempo de entrega', 'timeline'],
    ['Fecha límite', 'deadline'],
  ]],
  ['08 · Notas adicionales', [
    ['Notas adicionales', 'additional_notes', true],
    ['¿Cómo se enteró?', 'referred_by'],
    ['Agencia previa', 'previous_agency'],
  ]],
];

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
}

function statusLabel(s) {
  return ({
    pending: 'Pendiente', contacted: 'Contactado',
    in_progress: 'En curso', completed: 'Completado', archived: 'Archivado',
  })[s] || s;
}

function renderValue(val, kind) {
  if (val === null || val === undefined || val === '') {
    return '<span class="empty">—</span>';
  }
  if (kind === 'tags') {
    const arr = Array.isArray(val) ? val : [];
    if (!arr.length) return '<span class="empty">—</span>';
    return arr.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(' ');
  }
  return escapeHtml(val).replace(/\n/g, '<br>');
}

function renderHtml(brief, { autoPrint = true } = {}) {
  const sectionsHtml = SECTIONS.map(([title, rows]) => `
    <section class="section">
      <h2>${escapeHtml(title)}</h2>
      <dl class="grid">
        ${rows.map(([label, key, span, kind]) => `
          <div class="field${span ? ' span' : ''}">
            <dt>${escapeHtml(label)}</dt>
            <dd>${renderValue(brief[key], kind)}</dd>
          </div>
        `).join('')}
      </dl>
    </section>
  `).join('');

  const summaryHtml = brief.summary ? `
    <section class="section">
      <h2>Resumen del proyecto</h2>
      <p class="summary">${escapeHtml(brief.summary).replace(/\n/g, '<br>')}</p>
    </section>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Brief ${escapeHtml(brief.project_id)} — Marcyan</title>
<style>
  @page { size: Letter; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1a1a1a;
    background: #fff;
    padding: 32px 36px;
    max-width: 900px;
    margin: 0 auto;
  }
  header.doc-head {
    border-bottom: 2px solid #c8a96e;
    padding-bottom: 14px;
    margin-bottom: 22px;
  }
  .brand {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 22pt;
    font-weight: 600;
    letter-spacing: 0.18em;
    color: #c8a96e;
    text-transform: uppercase;
  }
  .brand em {
    font-weight: 300;
    font-style: italic;
    color: #b59964;
  }
  .tagline {
    font-size: 9pt;
    letter-spacing: 0.2em;
    color: #666;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .doc-meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    margin-top: 14px;
  }
  h1.project-id {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 24pt;
    margin: 0;
    letter-spacing: 0.12em;
    color: #1a1a1a;
  }
  .business {
    font-size: 13pt;
    font-style: italic;
    color: #444;
  }
  .meta-line {
    font-size: 9pt;
    letter-spacing: 0.1em;
    color: #777;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border: 1px solid #c8a96e;
    border-radius: 100px;
    font-size: 8.5pt;
    letter-spacing: 0.12em;
    color: #c8a96e;
    text-transform: uppercase;
  }
  .section { margin-bottom: 18px; page-break-inside: avoid; }
  .section h2 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 13pt;
    letter-spacing: 0.08em;
    color: #1a1a1a;
    text-transform: uppercase;
    margin: 0 0 10px 0;
    padding-bottom: 6px;
    border-bottom: 1px solid #ddd;
  }
  dl.grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 24px;
    margin: 0;
  }
  .field { display: flex; flex-direction: column; gap: 2px; }
  .field.span { grid-column: 1 / -1; }
  dt {
    font-size: 8pt;
    letter-spacing: 0.16em;
    color: #c8a96e;
    text-transform: uppercase;
    font-weight: 700;
  }
  dd {
    margin: 0;
    font-size: 10.5pt;
    color: #1a1a1a;
    word-break: break-word;
  }
  dd .empty { color: #aaa; font-style: italic; }
  dd .tag {
    display: inline-block;
    padding: 2px 8px;
    margin: 2px 4px 2px 0;
    border: 1px solid #ccc;
    border-radius: 100px;
    font-size: 9pt;
    color: #444;
  }
  p.summary {
    white-space: pre-wrap;
    margin: 0;
    padding: 10px 14px;
    background: #faf8f3;
    border-left: 3px solid #c8a96e;
    font-size: 10.5pt;
  }
  footer.doc-foot {
    margin-top: 28px;
    padding-top: 12px;
    border-top: 1px solid #ddd;
    font-size: 8pt;
    letter-spacing: 0.12em;
    color: #999;
    text-transform: uppercase;
    text-align: center;
  }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <header class="doc-head">
    <div class="brand">Mar<em>cyan</em></div>
    <div class="tagline">Diseño Web · IA · Houston · Miami</div>
    <div class="doc-meta">
      <div>
        <h1 class="project-id">${escapeHtml(brief.project_id)}</h1>
        <div class="business">${escapeHtml(brief.business_name || '— sin nombre de negocio —')}</div>
        <div class="meta-line">
          Recibido ${escapeHtml(fmtDate(brief.created_at))}
          ${brief.contacted_at ? ` · Contactado ${escapeHtml(fmtDate(brief.contacted_at))}` : ''}
          ${brief.completed_at ? ` · Completado ${escapeHtml(fmtDate(brief.completed_at))}` : ''}
        </div>
      </div>
      <span class="badge">${escapeHtml(statusLabel(brief.status))}</span>
    </div>
  </header>

  ${sectionsHtml}
  ${summaryHtml}

  <footer class="doc-foot">
    Marcyan LLC · Brief de cliente · Documento generado ${escapeHtml(fmtDate(new Date()))}
  </footer>

  ${autoPrint ? `<script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 250);
    });
  </script>` : ''}
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const session = await requireAdmin(req, res);
  if (!session) return;

  const id = (req.query?.id || '').toString();
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });

  try {
    const brief = await getBriefByProjectId(id);
    if (!brief) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });

    const isDownload = String(req.query?.download || '') === '1';
    const html = renderHtml(brief, { autoPrint: !isDownload });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (isDownload) {
      const fname = `marcyan-brief-${brief.project_id}.html`;
      res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    }
    return res.status(200).send(html);
  } catch (err) {
    console.error('[admin/briefs/:id/document] error:', err);
    return res.status(500).json({ ok: false, error: 'Error al generar documento' });
  }
}
