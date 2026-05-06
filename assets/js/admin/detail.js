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

  function tagList(arr) {
    if (!Array.isArray(arr) || !arr.length) {
      return `<div class="admin-field-value is-empty">—</div>`;
    }
    return `<div class="admin-tag-list">${
      arr.map(t => `<span class="admin-tag">${escapeHtml(t)}</span>`).join('')
    }</div>`;
  }

  function inputFor(key, value, opts = {}) {
    const v = value == null ? '' : String(value);
    if (opts.long) {
      return `<textarea class="admin-edit-input" data-field="${escapeHtml(key)}"
                rows="3">${escapeHtml(v)}</textarea>`;
    }
    return `<input class="admin-edit-input" type="text" data-field="${escapeHtml(key)}"
              value="${escapeHtml(v)}">`;
  }

  function tagsInput(key, arr) {
    const csv = Array.isArray(arr) ? arr.join(', ') : '';
    return `<input class="admin-edit-input" type="text" data-field="${escapeHtml(key)}"
              data-kind="tags" placeholder="Separar con comas"
              value="${escapeHtml(csv)}">`;
  }

  function field(label, value, key, opts = {}) {
    const cls = opts.cls || '';
    const inner = state.editMode && key
      ? inputFor(key, value, opts)
      : val(value);
    return `<div class="admin-field ${cls}">
      <div class="admin-field-label">${escapeHtml(label)}</div>
      ${inner}
    </div>`;
  }

  // ── ID del query string ──────────────────────────────────────
  const params = new URLSearchParams(location.search);
  const projectId = params.get('id') || '';
  if (!projectId) {
    document.getElementById('detail-content').innerHTML =
      `<p class="admin-empty-title">Sin ID de brief</p>`;
    return;
  }

  // ── State ────────────────────────────────────────────────────
  const state = {
    editMode: false,
  };

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

  const $downloadPrint = document.getElementById('download-print-btn');
  const $downloadHtml  = document.getElementById('download-html-btn');
  const $editToggle    = document.getElementById('edit-toggle-btn');
  const $deleteBtn     = document.getElementById('delete-btn');
  const $actionStatus  = document.getElementById('action-status');

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
        ['Nombre del negocio', 'business_name', b.business_name],
        ['Propietario', 'owner_name', b.owner_name],
        ['Industria', 'industry', b.industry],
        ['Años en el mercado', 'years_in_market', b.years_in_market],
        ['Descripción', 'business_description', b.business_description, true],
        ['Productos / Servicios', 'products_services', b.products_services, true],
      ]],
      ['02 · Contacto', [
        ['Teléfono', 'phone', b.phone],
        ['Email', 'email', b.email],
        ['Ciudad / Estado', 'city_state', b.city_state],
        ['Web actual', 'current_website', b.current_website],
        ['Instagram', 'instagram', b.instagram],
        ['Facebook', 'facebook', b.facebook],
        ['Otras redes', 'other_socials', b.other_socials],
        ['Google Business', 'google_business', b.google_business],
      ]],
      ['03 · Tipo de sitio', [
        ['Tipo', 'website_type', b.website_type],
        ['¿Dominio propio?', 'has_domain', b.has_domain],
        ['¿Hosting?', 'has_hosting', b.has_hosting],
      ]],
      ['04 · Audiencia & Objetivos', [
        ['Audiencia', 'target_audience', b.target_audience, true],
        ['Objetivo principal', 'main_objective', b.main_objective, true],
        ['Acción del visitante', 'visitor_action', b.visitor_action],
        ['Competidores', 'competitors', b.competitors, true],
      ]],
      ['05 · Identidad de marca', [
        ['¿Logo?', 'has_logo', b.has_logo],
        ['Colores', 'brand_colors', b.brand_colors],
        ['Tipografías', 'brand_fonts', b.brand_fonts],
        ['Personalidad', 'brand_personality', b.brand_personality],
        ['Inspiración', 'inspiration_sites', b.inspiration_sites, true],
        ['No le gusta', 'design_dislikes', b.design_dislikes, true],
      ]],
      ['06 · Contenido', [
        ['Fotos', 'has_photos', b.has_photos],
        ['Textos', 'has_copy', b.has_copy],
        ['Video', 'has_video', b.has_video],
        ['Idioma', 'language', b.language],
      ]],
      ['07 · Presupuesto & Tiempos', [
        ['Inversión estimada', 'budget_range', b.budget_range],
        ['Tiempo de entrega', 'timeline', b.timeline],
        ['Fecha límite', 'deadline', b.deadline],
      ]],
      ['08 · Notas', [
        ['Notas adicionales', 'additional_notes', b.additional_notes, true],
        ['¿Cómo se enteró?', 'referred_by', b.referred_by],
        ['Agencia previa', 'previous_agency', b.previous_agency],
      ]],
    ];

    const sectionsHtml = sections.map(([title, rows]) => `
      <section class="admin-section${state.editMode ? ' is-editing' : ''}">
        <h2 class="admin-section-title">${escapeHtml(title)}</h2>
        <div class="admin-section-grid">
          ${rows.map(([label, key, value, span]) =>
            field(label, value, key, { cls: span ? 'is-span' : '', long: span })
          ).join('')}
        </div>
      </section>
    `).join('');

    // Páginas y funcionalidades (tags vs CSV input)
    const pagesHtml = `
      <section class="admin-section${state.editMode ? ' is-editing' : ''}">
        <h2 class="admin-section-title">03 · Páginas y funcionalidades</h2>
        <div class="admin-section-grid">
          <div class="admin-field">
            <div class="admin-field-label">Páginas / secciones</div>
            ${state.editMode
              ? tagsInput('pages_required', b.pages_required)
              : tagList(b.pages_required)}
          </div>
          <div class="admin-field">
            <div class="admin-field-label">Funcionalidades</div>
            ${state.editMode
              ? tagsInput('features_required', b.features_required)
              : tagList(b.features_required)}
          </div>
        </div>
      </section>
    `;

    const editBar = state.editMode ? `
      <div class="admin-edit-bar">
        <span class="admin-edit-bar-label">✎ Modo edición</span>
        <div class="admin-edit-bar-actions">
          <button type="button" class="admin-btn" id="edit-cancel-btn">Cancelar</button>
          <button type="button" class="admin-btn is-primary" id="edit-save-btn">Guardar cambios</button>
        </div>
      </div>` : '';

    $content.innerHTML = `
      ${editBar}
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

      ${sectionsHtml}
      ${pagesHtml}

      ${b.summary && !state.editMode ? `
        <section class="admin-section">
          <h2 class="admin-section-title">Resumen del proyecto</h2>
          <div class="admin-field-value" style="white-space:pre-wrap;">${escapeHtml(b.summary)}</div>
        </section>` : ''}
    `;

    if (state.editMode) {
      const $cancel = document.getElementById('edit-cancel-btn');
      const $save   = document.getElementById('edit-save-btn');
      if ($cancel) $cancel.addEventListener('click', () => exitEditMode());
      if ($save)   $save.addEventListener('click', () => saveEditedFields());
    }

    $statusSel.value = b.status || 'pending';
    $summary.value   = b.summary || '';
    $aside.hidden = false;
    $editToggle.textContent = state.editMode ? '✕ Salir de edición' : '✎ Editar brief';
  }

  function renderTimeline(b) {
    const steps = [
      { key: 'received', label: 'Recibido',   time: b.created_at },
      { key: 'contacted', label: 'Contactado', time: b.contacted_at },
      { key: 'in_progress', label: 'En curso', time: null },
      { key: 'completed', label: 'Completado', time: b.completed_at },
    ];
    const order = ['pending', 'contacted', 'in_progress', 'completed'];
    const idx = order.indexOf(b.status);
    return `<div class="admin-timeline">
      ${steps.map((s, i) => {
        let cls = '';
        if (b.status === 'archived') {
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
        brief_edited: 'Brief editado',
        email_sent_to_client: 'Email enviado al cliente',
        note: 'Nota',
      };
      const data = e.data;
      let extra = '';
      if (e.event_type === 'status_changed' && data) {
        extra = `<div class="admin-event-data">${escapeHtml(data.from)} → ${escapeHtml(data.to)}</div>`;
      } else if (e.event_type === 'email_sent_to_client' && data) {
        extra = `<div class="admin-event-data">"${escapeHtml(data.subject || '')}" → ${escapeHtml(data.to || '')}</div>`;
      } else if (e.event_type === 'brief_edited' && data && Array.isArray(data.fields)) {
        extra = `<div class="admin-event-data">${data.fields.length} campo${data.fields.length === 1 ? '' : 's'}: ${escapeHtml(data.fields.join(', '))}</div>`;
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

  // ── Edit mode ────────────────────────────────────────────────
  function enterEditMode() {
    if (!currentBrief) return;
    state.editMode = true;
    renderBrief(currentBrief);
    setActionStatus('Editando — modifica los campos y pulsa Guardar.', '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function exitEditMode() {
    state.editMode = false;
    renderBrief(currentBrief);
    setActionStatus('', '');
  }

  async function saveEditedFields() {
    if (!currentBrief) return;
    const inputs = $content.querySelectorAll('.admin-edit-input[data-field]');
    const fields = {};
    inputs.forEach(el => {
      const k = el.dataset.field;
      const kind = el.dataset.kind;
      let v = el.value;
      if (kind === 'tags') {
        v = v.split(',').map(s => s.trim()).filter(Boolean);
      }
      fields[k] = v;
    });

    const $saveEdit = document.getElementById('edit-save-btn');
    if ($saveEdit) $saveEdit.disabled = true;
    setActionStatus('Guardando cambios…', '');

    try {
      const res = await adminFetch(
        '/api/admin/briefs/' + encodeURIComponent(projectId),
        { method: 'PATCH', body: JSON.stringify({ fields }) }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error');
      currentBrief = json.brief;
      const n = (json.changes && json.changes.fields) ? json.changes.fields.length : 0;
      state.editMode = false;
      renderBrief(currentBrief);
      setActionStatus(n
        ? `✓ ${n} campo${n === 1 ? '' : 's'} actualizado${n === 1 ? '' : 's'}`
        : '✓ Sin cambios', 'is-ok');
      loadEvents();
    } catch (err) {
      setActionStatus(err.message || 'Error al guardar', 'is-error');
      if ($saveEdit) $saveEdit.disabled = false;
    }
  }

  $editToggle.addEventListener('click', () => {
    if (state.editMode) exitEditMode();
    else enterEditMode();
  });

  // ── Descargar documento ──────────────────────────────────────
  $downloadPrint.addEventListener('click', () => {
    const url = '/api/admin/briefs/' + encodeURIComponent(projectId) + '/document';
    window.open(url, '_blank', 'noopener');
  });

  $downloadHtml.addEventListener('click', () => {
    const url = '/api/admin/briefs/' + encodeURIComponent(projectId) + '/document?download=1';
    // Forzamos navegación para activar Content-Disposition: attachment
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // ── Eliminar brief ───────────────────────────────────────────
  $deleteBtn.addEventListener('click', () => {
    if (!currentBrief) return;
    openDeleteModal(currentBrief.project_id);
  });

  function openDeleteModal(pid) {
    const back = document.createElement('div');
    back.className = 'admin-modal-backdrop';
    back.innerHTML = `
      <div class="admin-modal" role="dialog" aria-labelledby="del-title">
        <h3 class="admin-modal-title" id="del-title">Eliminar brief</h3>
        <div class="admin-modal-body">
          Esta acción es <strong>irreversible</strong>. Se borrarán también los eventos del audit log
          asociados a <strong>${escapeHtml(pid)}</strong>.<br><br>
          Para confirmar, escribe el ID del brief:
          <code style="display:block;margin-top:6px;color:var(--accent);font-family:var(--font-mono);">${escapeHtml(pid)}</code>
        </div>
        <input class="admin-modal-input" id="del-confirm-input" type="text"
               placeholder="${escapeHtml(pid)}" autocomplete="off" spellcheck="false">
        <div class="admin-modal-actions">
          <button type="button" class="admin-btn" id="del-cancel">Cancelar</button>
          <button type="button" class="admin-btn is-danger" id="del-confirm" disabled>Eliminar</button>
        </div>
      </div>`;
    document.body.appendChild(back);

    const input = back.querySelector('#del-confirm-input');
    const cancel = back.querySelector('#del-cancel');
    const confirm = back.querySelector('#del-confirm');

    input.addEventListener('input', () => {
      confirm.disabled = input.value.trim() !== pid;
    });
    cancel.addEventListener('click', () => back.remove());
    back.addEventListener('click', (e) => { if (e.target === back) back.remove(); });

    confirm.addEventListener('click', async () => {
      confirm.disabled = true;
      cancel.disabled = true;
      try {
        const res = await adminFetch(
          '/api/admin/briefs/' + encodeURIComponent(pid),
          { method: 'DELETE' }
        );
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Error');
        back.remove();
        location.replace('/admin/briefs?deleted=' + encodeURIComponent(pid));
      } catch (err) {
        confirm.disabled = false;
        cancel.disabled = false;
        setActionStatus(err.message || 'Error al eliminar', 'is-error');
        back.remove();
      }
    });

    setTimeout(() => input.focus(), 50);
  }

  function setActionStatus(text, cls) {
    $actionStatus.className = 'admin-save-status ' + (cls || '');
    $actionStatus.textContent = text || '';
  }

  // ── Init ─────────────────────────────────────────────────────
  loadBrief();
  loadEvents();
})();
