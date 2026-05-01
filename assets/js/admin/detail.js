/* ════════════════════════════════════════════════════════════════
   Admin · Detalle de Brief
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  async function adminFetch(url, opts = {}) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (res.status === 401) {
      location.replace('/admin?error=session');
      throw new Error('Unauthorized');
    }
    return res;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function val(v) {
    if (v === null || v === undefined || v === '') {
      return `<div class="admin-field-value is-empty">—</div>`;
    }
    return `<div class="admin-field-value">${escapeHtml(v)}</div>`;
  }

  function field(label, value, opts = {}) {
    const cls = opts.cls || '';
    const valHtml = opts.html || val(value);
    return `<div class="admin-field ${cls}">
      <div class="admin-field-label">${escapeHtml(label)}</div>
      ${valHtml}
    </div>`;
  }

  function tagList(arr) {
    if (!Array.isArray(arr) || !arr.length) {
      return `<div class="admin-field-value is-empty">—</div>`;
    }
    return `<div class="admin-tag-list">${
      arr.map(t => `<span class="admin-tag">${escapeHtml(t)}</span>`).join('')
    }</div>`;
  }

  // ── ID del query string ──────────────────────────────────────
  const params = new URLSearchParams(location.search);
  const projectId = params.get('id') || '';
  if (!projectId) {
    document.getElementById('detail-content').innerHTML =
      `<p class="admin-empty-title">Sin ID de brief</p>`;
    return;
  }

  // ── Elementos ────────────────────────────────────────────────
  const $content    = document.getElementById('detail-content');
  const $aside      = document.getElementById('detail-aside');
  const $userEmail  = document.getElementById('user-email');
  const $logout     = document.getElementById('logout-btn');

  const $statusSel  = document.getElementById('status-select');
  const $summary    = document.getElementById('summary-input');
  const $saveBtn    = document.getElementById('save-btn');
  const $saveStatus = document.getElementById('save-status');

  const $emailForm  = document.getElementById('email-form');
  const $emailSubj  = document.getElementById('email-subject');
  const $emailBody  = document.getElementById('email-body');
  const $emailStat  = document.getElementById('email-status');

  const $events     = document.getElementById('events-list');

  // ── Auth ─────────────────────────────────────────────────────
  (async () => {
    try {
      const r = await adminFetch('/api/admin/me');
      const j = await r.json();
      if (j && j.email) $userEmail.textContent = j.email;
    } catch (_) {}
  })();

  $logout.addEventListener('click', async () => {
    try { await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }); } catch (_) {}
    location.replace('/admin');
  });

  // ── Render del brief ─────────────────────────────────────────
  let currentBrief = null;

  function renderBrief(b) {
    currentBrief = b;
    const sections = [
      ['01 · Negocio', [
        ['Nombre del negocio', b.business_name],
        ['Propietario', b.owner_name],
        ['Industria', b.industry],
        ['Años en el mercado', b.years_in_market],
        ['Descripción', b.business_description, true],
        ['Productos / Servicios', b.products_services, true],
      ]],
      ['02 · Contacto', [
        ['Teléfono', b.phone],
        ['Email', b.email],
        ['Ciudad / Estado', b.city_state],
        ['Web actual', b.current_website],
        ['Instagram', b.instagram],
        ['Facebook', b.facebook],
        ['Otras redes', b.other_socials],
        ['Google Business', b.google_business],
      ]],
      ['03 · Tipo de sitio', [
        ['Tipo', b.website_type],
        ['¿Dominio propio?', b.has_domain],
        ['¿Hosting?', b.has_hosting],
      ]],
      ['04 · Audiencia & Objetivos', [
        ['Audiencia', b.target_audience, true],
        ['Objetivo principal', b.main_objective, true],
        ['Acción del visitante', b.visitor_action],
        ['Competidores', b.competitors, true],
      ]],
      ['05 · Identidad de marca', [
        ['¿Logo?', b.has_logo],
        ['Colores', b.brand_colors],
        ['Tipografías', b.brand_fonts],
        ['Personalidad', b.brand_personality],
        ['Inspiración', b.inspiration_sites, true],
        ['No le gusta', b.design_dislikes, true],
      ]],
      ['06 · Contenido', [
        ['Fotos', b.has_photos],
        ['Textos', b.has_copy],
        ['Video', b.has_video],
        ['Idioma', b.language],
      ]],
      ['07 · Presupuesto & Tiempos', [
        ['Inversión estimada', b.budget_range],
        ['Tiempo de entrega', b.timeline],
        ['Fecha límite', b.deadline],
      ]],
      ['08 · Notas', [
        ['Notas adicionales', b.additional_notes, true],
        ['¿Cómo se enteró?', b.referred_by],
        ['Agencia previa', b.previous_agency],
      ]],
    ];

    const sectionsHtml = sections.map(([title, rows]) => `
      <section class="admin-section">
        <h2 class="admin-section-title">${escapeHtml(title)}</h2>
        <div class="admin-section-grid">
          ${rows.map(([label, value, span]) =>
            field(label, value, span ? { cls: 'is-span' } : {})
          ).join('')}
        </div>
      </section>
    `).join('');

    // Tags de pages_required y features_required (sección 03)
    const pagesHtml = `
      <section class="admin-section">
        <h2 class="admin-section-title">03 · Páginas y funcionalidades</h2>
        <div class="admin-section-grid">
          <div class="admin-field">
            <div class="admin-field-label">Páginas / secciones</div>
            ${tagList(b.pages_required)}
          </div>
          <div class="admin-field">
            <div class="admin-field-label">Funcionalidades</div>
            ${tagList(b.features_required)}
          </div>
        </div>
      </section>
    `;

    $content.innerHTML = `
      <div class="admin-detail-header">
        <a href="/admin/briefs" class="admin-back-link">← Volver a la lista</a>
        <h1 class="admin-detail-id">${escapeHtml(b.project_id)}</h1>
        <p class="admin-detail-business">${escapeHtml(b.business_name || '— sin nombre de negocio —')}</p>
        <div class="admin-detail-meta">
          <span>Recibido ${fmtDate(b.created_at)}</span>
          ${b.contacted_at ? `<span>· Contactado ${fmtDate(b.contacted_at)}</span>` : ''}
          ${b.completed_at ? `<span>· Completado ${fmtDate(b.completed_at)}</span>` : ''}
        </div>
      </div>

      ${renderTimeline(b)}

      ${sectionsHtml.split('<!--PAGES-->').join('')}
      ${pagesHtml}

      ${b.summary ? `
        <section class="admin-section">
          <h2 class="admin-section-title">Resumen del proyecto</h2>
          <div class="admin-field-value" style="white-space:pre-wrap;">${escapeHtml(b.summary)}</div>
        </section>` : ''}
    `;

    $statusSel.value = b.status || 'pending';
    $summary.value   = b.summary || '';
    $aside.hidden = false;
  }

  function renderTimeline(b) {
    const steps = [
      { key: 'received', label: 'Recibido',   time: b.created_at },
      { key: 'contacted', label: 'Contactado', time: b.contacted_at },
      { key: 'in_progress', label: 'En curso', time: null }, // sin timestamp dedicado
      { key: 'completed', label: 'Completado', time: b.completed_at },
    ];
    const order = ['pending', 'contacted', 'in_progress', 'completed'];
    const idx = order.indexOf(b.status);
    return `<div class="admin-timeline">
      ${steps.map((s, i) => {
        let cls = '';
        if (b.status === 'archived') {
          // archivado: marcamos los hitos que tengan timestamp como done
          if (s.time) cls = 'is-done';
        } else {
          if (i < idx) cls = 'is-done';
          else if (i === idx) cls = 'is-current';
        }
        return `<div class="admin-timeline-step ${cls}">
          <div class="admin-timeline-dot"></div>
          <div class="admin-timeline-label">${escapeHtml(s.label)}</div>
          <div class="admin-timeline-time">${s.time ? fmtDate(s.time) : ''}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  // ── Load ─────────────────────────────────────────────────────
  async function loadBrief() {
    try {
      const res = await adminFetch('/api/admin/briefs/' + encodeURIComponent(projectId));
      const json = await res.json();
      if (!json.ok) {
        $content.innerHTML = `<p class="admin-empty-title">${escapeHtml(json.error || 'Error')}</p>`;
        return;
      }
      renderBrief(json.brief);
    } catch (err) {
      $content.innerHTML = `<p class="admin-empty-title">Error al cargar</p>`;
    }
  }

  async function loadEvents() {
    try {
      const res = await adminFetch('/api/admin/briefs/' + encodeURIComponent(projectId) + '/events');
      const json = await res.json();
      if (!json.ok) return;
      renderEvents(json.events);
    } catch (_) {}
  }

  function renderEvents(events) {
    if (!events.length) {
      $events.innerHTML = `<li class="admin-event"><span class="admin-event-time">— sin eventos —</span></li>`;
      return;
    }
    $events.innerHTML = events.map(e => {
      const labels = {
        brief_received: 'Brief recibido',
        status_changed: 'Status cambiado',
        summary_updated: 'Resumen actualizado',
        email_sent_to_client: 'Email enviado al cliente',
        note: 'Nota',
      };
      const data = e.data;
      let extra = '';
      if (e.event_type === 'status_changed' && data) {
        extra = `<div class="admin-event-data">${escapeHtml(data.from)} → ${escapeHtml(data.to)}</div>`;
      } else if (e.event_type === 'email_sent_to_client' && data) {
        extra = `<div class="admin-event-data">"${escapeHtml(data.subject || '')}" → ${escapeHtml(data.to || '')}</div>`;
      }
      return `<li class="admin-event">
        <div class="admin-event-type">${escapeHtml(labels[e.event_type] || e.event_type)}</div>
        <div class="admin-event-actor">${e.actor_email ? escapeHtml(e.actor_email) : 'sistema'}</div>
        <div class="admin-event-time">${fmtDate(e.created_at)}</div>
        ${extra}
      </li>`;
    }).join('');
  }

  // ── Save status + summary ────────────────────────────────────
  $saveBtn.addEventListener('click', async () => {
    if (!currentBrief) return;
    const newStatus  = $statusSel.value;
    const newSummary = $summary.value;
    const changed = (newStatus !== currentBrief.status)
                  || (newSummary !== (currentBrief.summary || ''));
    if (!changed) {
      $saveStatus.className = 'admin-save-status';
      $saveStatus.textContent = 'Sin cambios';
      return;
    }

    $saveBtn.disabled = true;
    $saveStatus.className = 'admin-save-status';
    $saveStatus.textContent = 'Guardando…';

    try {
      const res = await adminFetch(
        '/api/admin/briefs/' + encodeURIComponent(projectId),
        {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus, summary: newSummary }),
        }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error');
      $saveStatus.className = 'admin-save-status is-ok';
      $saveStatus.textContent = '✓ Guardado';
      currentBrief = json.brief;
      // Re-render para actualizar timeline
      renderBrief(currentBrief);
      loadEvents();
    } catch (err) {
      $saveStatus.className = 'admin-save-status is-error';
      $saveStatus.textContent = err.message || 'Error al guardar';
    } finally {
      $saveBtn.disabled = false;
    }
  });

  // ── Email manual ─────────────────────────────────────────────
  $emailForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const subject = $emailSubj.value.trim();
    const body    = $emailBody.value.trim();
    if (!subject || !body) {
      $emailStat.className = 'admin-save-status is-error';
      $emailStat.textContent = 'Completa asunto y mensaje';
      return;
    }
    if (!confirm(`¿Enviar email a ${currentBrief && currentBrief.email}?`)) return;

    $emailStat.className = 'admin-save-status';
    $emailStat.textContent = 'Enviando…';
    try {
      const res = await adminFetch(
        '/api/admin/briefs/' + encodeURIComponent(projectId) + '/email',
        { method: 'POST', body: JSON.stringify({ subject, body }) }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error');
      $emailStat.className = 'admin-save-status is-ok';
      $emailStat.textContent = '✓ Email enviado';
      $emailSubj.value = '';
      $emailBody.value = '';
      loadEvents();
    } catch (err) {
      $emailStat.className = 'admin-save-status is-error';
      $emailStat.textContent = err.message || 'Error al enviar';
    }
  });

  // ── Init ─────────────────────────────────────────────────────
  loadBrief();
  loadEvents();
})();
