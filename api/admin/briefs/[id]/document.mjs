// GET /api/admin/briefs/:id/document?download=1
//   Genera un documento HTML imprimible del brief.
//   - Si download=1 → Content-Disposition: attachment (.html)
//   - Si no → text/html inline con window.print() automático para "Guardar como PDF"
//   Desde Orbit v2 es la "Ver ficha": la salida principal del brief es el kit
//   .zip (kit.mjs). Etiquetas del esquema único (B-08) y tipografía del DS v2 (B-18).
import { requireAdmin } from '../../../../lib/auth.mjs';
import { getBriefByProjectId } from '../../../../lib/db.mjs';
import { sectionsFor, labelFor, shortLabel, isActive } from '../../../../lib/brief-schema.mjs';
import { briefData } from '../../../../lib/kit/build.mjs';

// Secciones y etiquetas desde el esquema único (B-08): la ficha muestra
// "No sé", "Bilingüe" o "De 2 a 4 semanas", nunca los códigos guardados.
// Sale todo lo que tiene dato; del brief inicial también lo que quedó sin
// responder (para verlo de un vistazo). Los archivos se ven en el panel.
const isEmptyVal = (v) => v === null || v === undefined || v === '' || v === false
  || (Array.isArray(v) && v.length === 0)
  || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
const LONG_TYPES = new Set(['textarea', 'repeater', 'hours', 'zones']);
const TAG_TYPES = new Set(['checkbox', 'services']);

function buildSections(brief) {
  const data = briefData(brief);
  const services = data.services || [];
  const out = [];
  let n = 0;
  for (const s of sectionsFor(null, null, { includeHidden: true })) {
    const rows = [];
    for (const fd of s.fields) {
      if (fd.type === 'file') continue;
      const v = data[fd.key];
      const empty = isEmptyVal(v);
      if (empty && (fd.hidden || fd.moment !== 'inicial' || !isActive(fd, services))) continue;
      const kind = TAG_TYPES.has(fd.type) && Array.isArray(v) && fd.options ? 'tags' : null;
      rows.push({
        label: shortLabel(fd, 'es') || fd.label.es,
        span: LONG_TYPES.has(fd.type),
        kind,
        value: empty ? null : (kind ? v.map((x) => labelFor(fd, [x], 'es')) : labelFor(fd, v, 'es')),
      });
    }
    if (!rows.length || rows.every((r) => r.value === null && s.moment !== 'inicial')) continue;
    n += 1;
    const title = `${String(n).padStart(2, '0')} · ${s.moment === 'arranque' ? 'Kit · ' : ''}${s.short.es}`;
    out.push([title, rows]);
  }
  return out;
}

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
    return '<span class="empty">Sin dato</span>';
  }
  if (kind === 'tags') {
    const arr = Array.isArray(val) ? val : [];
    if (!arr.length) return '<span class="empty">Sin dato</span>';
    return arr.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(' ');
  }
  return escapeHtml(val).replace(/\n/g, '<br>');
}

export function renderHtml(brief, { autoPrint = true } = {}) {
  const sectionsHtml = buildSections(brief).map(([title, rows]) => `
    <section class="section">
      <h2>${escapeHtml(title)}</h2>
      <dl class="grid">
        ${rows.map(({ label, span, kind, value }) => `
          <div class="field${span ? ' span' : ''}">
            <dt>${escapeHtml(label)}</dt>
            <dd>${renderValue(value, kind)}</dd>
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
<title>Brief ${escapeHtml(brief.project_id)} · Marcyan</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  @page { size: Letter; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif;
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
    font-family: 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif;
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
    font-family: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
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
    font-family: 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif;
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
    font-family: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
    font-size: 9pt;
    letter-spacing: 0.1em;
    color: #777;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .badge {
    font-family: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
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
    font-family: 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif;
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
    font-family: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
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
    font-family: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
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
        <div class="business">${escapeHtml(brief.business_name || 'Sin nombre de negocio')}</div>
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
