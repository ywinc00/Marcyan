<script>
  import { onMount } from 'svelte';

  // ── Helpers ──────────────────────────────────────────────────
  // Timeout de cliente (~12s) vía AbortController: una función colgada o un
  // cold-start ya no deja un spinner infinito — surface el error.
  async function api(url, opts = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    try {
      return await fetch(url, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        ...opts,
      });
    } catch (e) {
      if (e && e.name === 'AbortError') throw new Error('La petición tardó demasiado. Reintenta.');
      throw e;
    } finally {
      clearTimeout(t);
    }
  }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : ''; }
  function fmtDateTime(d) { return d ? new Date(d).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : ''; }
  function rel(d) {
    if (!d) return '';
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + 'd';
    return fmtDate(d);
  }
  // Monograma determinista: iniciales del negocio + color estable por hash.
  const AVATAR_PALETTE = ['#6366f1', '#0ea5e9', '#14b8a6', '#f97316', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];
  function initials(s) {
    const parts = (s || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '—';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  function avatarColor(s) {
    let h = 0; const str = s || '?';
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
  }

  const STATUSES = [
    { id: 'pending', label: 'Pendiente' }, { id: 'contacted', label: 'Contactado' },
    { id: 'in_progress', label: 'En curso' }, { id: 'completed', label: 'Completado' },
    { id: 'archived', label: 'Archivado' },
  ];
  function statusLabel(s) { return (STATUSES.find((x) => x.id === s) || {}).label || s; }

  const FILTERS = [
    { id: '', label: 'Todos' }, ...STATUSES,
  ];

  // Embudo de estados (orden de pipeline) — anchos relativos calculados sobre
  // el máximo para que la barra más alta llene la fila.
  const FUNNEL_ORDER = ['pending', 'contacted', 'in_progress', 'completed', 'archived'];

  const SECTIONS = [
    ['01 · Negocio', [
      ['Nombre del negocio', 'business_name'], ['Propietario', 'owner_name'],
      ['Industria', 'industry'], ['Años en el mercado', 'years_in_market'],
      ['Descripción', 'business_description', true], ['Productos / Servicios', 'products_services', true],
    ]],
    ['02 · Contacto', [
      ['Teléfono', 'phone'], ['Email', 'email'], ['Ciudad / Estado', 'city_state'],
      ['Web actual', 'current_website'], ['Instagram', 'instagram'], ['Facebook', 'facebook'],
      ['Otras redes', 'other_socials'], ['Google Business', 'google_business'],
    ]],
    ['03 · Tipo de sitio', [
      ['Tipo', 'website_type'], ['¿Dominio propio?', 'has_domain'], ['¿Hosting?', 'has_hosting'],
      ['Páginas / secciones', 'pages_required', false, 'tags'], ['Funcionalidades', 'features_required', false, 'tags'],
    ]],
    ['04 · Audiencia & Objetivos', [
      ['Audiencia', 'target_audience', true], ['Objetivo principal', 'main_objective', true],
      ['Acción del visitante', 'visitor_action'], ['Competidores', 'competitors', true],
    ]],
    ['05 · Identidad de marca', [
      ['¿Logo?', 'has_logo'], ['Colores', 'brand_colors'], ['Tipografías', 'brand_fonts'],
      ['Personalidad', 'brand_personality'], ['Inspiración', 'inspiration_sites', true], ['No le gusta', 'design_dislikes', true],
    ]],
    ['06 · Contenido', [
      ['Fotos', 'has_photos'], ['Textos', 'has_copy'], ['Video', 'has_video'], ['Idioma', 'language'],
    ]],
    ['07 · Presupuesto & Tiempos', [
      ['Inversión estimada', 'budget_range'], ['Tiempo de entrega', 'timeline'], ['Fecha límite', 'deadline'],
    ]],
    ['08 · Notas', [
      ['Notas adicionales', 'additional_notes', true], ['¿Cómo se enteró?', 'referred_by'], ['Agencia previa', 'previous_agency'],
    ]],
  ];

  // ── Estado lista ─────────────────────────────────────────────
  let rows = $state([]);
  let total = $state(0);
  let stats = $state(null);
  let filter = $state('');
  let search = $state('');
  let offset = $state(0);
  const LIMIT = 30;
  let loading = $state(false);
  let error = $state('');
  let searchTimer;

  // Embudo derivado de stats (counts por estado + ancho relativo).
  const funnel = $derived.by(() => {
    if (!stats) return [];
    const counts = FUNNEL_ORDER.map((id) => ({ id, label: statusLabel(id), n: stats[id] ?? 0 }));
    const max = Math.max(1, ...counts.map((c) => c.n));
    return counts.map((c) => ({ ...c, w: Math.max(28, Math.round((c.n / max) * 100)) }));
  });

  // ── Estado detalle ───────────────────────────────────────────
  let selected = $state(null);
  let events = $state([]);
  let detailLoading = $state(false);
  let detailError = $state('');
  let openingId = $state('');   // pid en curso/erróneo: mantiene el contexto detalle visible
  let editMode = $state(false);
  let edited = $state({});
  let statusSel = $state('');
  let summaryVal = $state('');
  let saveMsg = $state('');
  let saveOk = $state(false);

  let emailSubject = $state('');
  let emailBody = $state('');
  let emailMsg = $state('');
  let emailOk = $state(false);

  let showDelete = $state(false);
  let deleteConfirm = $state('');
  let deleting = $state(false);

  // ── Carga lista ──────────────────────────────────────────────
  async function loadStats() {
    try { const r = await api('/api/admin/stats'); const j = await r.json(); if (j.ok) stats = j.stats; } catch (_) {}
  }
  async function loadList() {
    loading = true; error = '';
    const p = new URLSearchParams();
    if (filter) p.set('status', filter);
    if (search) p.set('search', search);
    p.set('limit', LIMIT); p.set('offset', offset);
    try {
      const r = await api('/api/admin/briefs?' + p.toString());
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      rows = j.rows || []; total = j.total || 0;
    } catch (e) { error = e.message || 'Error al cargar'; }
    finally { loading = false; }
  }
  function setFilter(s) { filter = s; offset = 0; loadList(); }
  function onSearchInput(e) {
    search = e.currentTarget.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { offset = 0; loadList(); }, 300);
  }
  function nextPage() { if (offset + LIMIT < total) { offset += LIMIT; loadList(); } }
  function prevPage() { if (offset > 0) { offset = Math.max(0, offset - LIMIT); loadList(); } }

  function exportCsv() {
    const p = new URLSearchParams();
    if (filter) p.set('status', filter);
    if (search) p.set('search', search);
    window.location.href = '/api/admin/export?' + p.toString();
  }

  // ── Detalle ──────────────────────────────────────────────────
  async function openBrief(pid) {
    detailLoading = true; selected = null; events = []; editMode = false;
    detailError = ''; openingId = pid;
    saveMsg = ''; emailMsg = ''; emailSubject = ''; emailBody = ''; showDelete = false; deleteConfirm = '';
    try {
      const r = await api('/api/admin/briefs/' + encodeURIComponent(pid));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'No encontrado');
      selected = j.brief; statusSel = j.brief.status; summaryVal = j.brief.summary || '';
      loadEvents(pid);
    } catch (e) {
      detailError = (e && e.message) || 'No se pudo abrir el brief';
    } finally {
      detailLoading = false;
    }
  }
  function closeBrief() { selected = null; editMode = false; detailError = ''; openingId = ''; detailLoading = false; loadList(); loadStats(); }
  async function loadEvents(pid) {
    try { const r = await api('/api/admin/briefs/' + encodeURIComponent(pid) + '/events'); const j = await r.json(); if (j.ok) events = j.events || []; } catch (_) {}
  }

  const EVENT_LABELS = {
    brief_received: 'Brief recibido', status_changed: 'Estado cambiado',
    summary_updated: 'Resumen actualizado', brief_edited: 'Brief editado',
    email_sent_to_client: 'Email enviado', note: 'Nota',
  };

  // ── Guardar estado + resumen ─────────────────────────────────
  async function saveStatusSummary() {
    if (!selected) return;
    const changed = statusSel !== selected.status || summaryVal !== (selected.summary || '');
    if (!changed) { saveOk = false; saveMsg = 'Sin cambios'; return; }
    saveMsg = 'Guardando…'; saveOk = false;
    try {
      const r = await api('/api/admin/briefs/' + encodeURIComponent(selected.project_id),
        { method: 'PATCH', body: JSON.stringify({ status: statusSel, summary: summaryVal }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      selected = j.brief; saveOk = true; saveMsg = '✓ Guardado'; loadEvents(selected.project_id);
    } catch (e) { saveOk = false; saveMsg = e.message || 'Error al guardar'; }
  }

  // ── Editar campos ────────────────────────────────────────────
  const TAG_FIELDS = ['pages_required', 'features_required'];
  function enterEdit() {
    const e = {};
    for (const [, fields] of SECTIONS) {
      for (const [, key, , kind] of fields) {
        if (kind === 'tags') e[key] = (selected[key] || []).join(', ');
        else e[key] = selected[key] == null ? '' : selected[key];
      }
    }
    edited = e; editMode = true; saveMsg = '';
  }
  function cancelEdit() { editMode = false; saveMsg = ''; }
  async function saveEdit() {
    saveMsg = 'Guardando…'; saveOk = false;
    try {
      const r = await api('/api/admin/briefs/' + encodeURIComponent(selected.project_id),
        { method: 'PATCH', body: JSON.stringify({ fields: { ...edited } }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      selected = j.brief; editMode = false; saveOk = true;
      const n = (j.changes && j.changes.fields) ? j.changes.fields.length : 0;
      saveMsg = n ? `✓ ${n} campo${n === 1 ? '' : 's'} actualizado${n === 1 ? '' : 's'}` : '✓ Sin cambios';
      loadEvents(selected.project_id);
    } catch (e) { saveOk = false; saveMsg = e.message || 'Error al guardar'; }
  }

  // ── Email ────────────────────────────────────────────────────
  async function sendEmail() {
    if (!emailSubject.trim() || !emailBody.trim()) { emailOk = false; emailMsg = 'Completa asunto y mensaje'; return; }
    if (!confirm('¿Enviar email a ' + (selected.email || 'el cliente') + '?')) return;
    emailMsg = 'Enviando…'; emailOk = false;
    try {
      const r = await api('/api/admin/briefs/' + encodeURIComponent(selected.project_id) + '/email',
        { method: 'POST', body: JSON.stringify({ subject: emailSubject, body: emailBody }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      emailOk = true; emailMsg = '✓ Email enviado'; emailSubject = ''; emailBody = ''; loadEvents(selected.project_id);
    } catch (e) { emailOk = false; emailMsg = e.message || 'Error al enviar'; }
  }

  // ── Descargar ────────────────────────────────────────────────
  function download(asFile) {
    const base = '/api/admin/briefs/' + encodeURIComponent(selected.project_id) + '/document';
    window.open(asFile ? base + '?download=1' : base, '_blank', 'noopener');
  }

  // ── Eliminar ─────────────────────────────────────────────────
  async function doDelete() {
    if (deleteConfirm !== selected.project_id) return;
    deleting = true;
    try {
      const r = await api('/api/admin/briefs/' + encodeURIComponent(selected.project_id), { method: 'DELETE' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      showDelete = false; selected = null; loadList(); loadStats();
    } catch (e) { saveOk = false; saveMsg = e.message || 'Error al eliminar'; showDelete = false; }
    finally { deleting = false; }
  }

  onMount(() => { loadStats(); loadList(); });
</script>

{#if !selected && !detailLoading && !detailError}
  <!-- ═══ LISTA ═══ -->
  <div class="sec-head">
    <h1 class="greet">Briefs</h1>
    <button class="b b--ghost" onclick={exportCsv}>⬇ CSV</button>
  </div>

  {#if stats}
    <!-- KPI strip + embudo: densidad Orbit -->
    <section class="kpis">
      <article class="kpi">
        <p class="kpi__label">Total briefs</p>
        <div class="kpi__row">
          <h3 class="kpi__num">{stats.total ?? 0}</h3>
          <div class="kpi__art" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <defs>
                <linearGradient id="kpiDocA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2A2A33"/><stop offset="1" stop-color="#16161A"/></linearGradient>
                <linearGradient id="kpiDocB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FB923C"/><stop offset="1" stop-color="#EA580C"/></linearGradient>
              </defs>
              <rect x="18" y="16" width="32" height="40" rx="4" fill="url(#kpiDocA)" stroke="#4A4A55"/>
              <rect x="12" y="10" width="32" height="40" rx="4" fill="url(#kpiDocB)" stroke="rgba(255,255,255,.25)"/>
              <path d="M18 18h20M18 24h20M18 30h13" stroke="#fff" stroke-opacity=".85" stroke-width="2" stroke-linecap="round"/>
              <circle cx="44" cy="48" r="3" fill="#fff" fill-opacity=".5"/>
            </svg>
          </div>
        </div>
        <p class="kpi__delta"><span class="up">+{stats.this_month ?? 0}</span> <span class="muted">este mes</span></p>
      </article>

      <article class="kpi">
        <p class="kpi__label">Por atender</p>
        <div class="kpi__row">
          <h3 class="kpi__num">{(stats.pending ?? 0) + (stats.contacted ?? 0)}</h3>
          <div class="kpi__art" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <defs>
                <radialGradient id="kpiBell" cx="0.5" cy="0.35" r="0.75"><stop offset="0" stop-color="#FBBF77"/><stop offset="1" stop-color="#EA580C"/></radialGradient>
              </defs>
              <ellipse cx="32" cy="50" rx="20" ry="5" fill="#000" fill-opacity=".25"/>
              <path d="M18 44c0-9 4-18 14-18s14 9 14 18z" fill="url(#kpiBell)" stroke="rgba(255,255,255,.25)"/>
              <rect x="14" y="44" width="36" height="5" rx="2.5" fill="#23232A" stroke="#4A4A55"/>
              <circle cx="32" cy="22" r="3.5" fill="#FBBF77"/>
              <path d="M22 36c1-5 4-8 10-9" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
        <p class="kpi__delta"><span class="dot dot--gold"></span> <span class="muted">pendientes + contactados</span></p>
      </article>

      <article class="kpi">
        <p class="kpi__label">Completados</p>
        <div class="kpi__row">
          <h3 class="kpi__num">{stats.completed ?? 0}</h3>
          <div class="kpi__art" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <defs>
                <linearGradient id="kpiOk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6EE7B7"/><stop offset="1" stop-color="#059669"/></linearGradient>
              </defs>
              <ellipse cx="32" cy="50" rx="18" ry="4" fill="#000" fill-opacity=".25"/>
              <circle cx="32" cy="30" r="18" fill="url(#kpiOk)" stroke="rgba(255,255,255,.3)"/>
              <circle cx="26" cy="24" r="6" fill="#fff" fill-opacity=".22"/>
              <path d="M24 30l5 6 11-12" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <p class="kpi__delta"><span class="up">+{stats.completed_this_month ?? 0}</span> <span class="muted">este mes</span></p>
      </article>

      <article class="kpi kpi--funnel">
        <p class="kpi__label">Pipeline por estado</p>
        <div class="funnel">
          {#each funnel as f, i}
            <div class="funnel__row">
              <span class="funnel__pill" class:funnel__pill--accent={i === 0} style="--w:{f.w}%">{f.label}</span>
              <span class="funnel__n">{f.n}</span>
            </div>
          {/each}
        </div>
      </article>
    </section>
  {/if}

  <div class="chips">
    {#each FILTERS as f}
      <button class="chip" class:on={filter === f.id} onclick={() => setFilter(f.id)}>
        {f.label}
        {#if stats}<span class="chip__n">{f.id === '' ? stats.total : (stats[f.id] ?? 0)}</span>{/if}
      </button>
    {/each}
  </div>

  <input class="search" type="search" placeholder="Buscar por negocio, email, ID…" oninput={onSearchInput} />

  {#if loading}
    <div class="empty">Cargando…</div>
  {:else if error}
    <div class="empty err">{error}</div>
  {:else if rows.length === 0}
    <div class="empty">Sin briefs que coincidan.</div>
  {:else}
    <div class="cards">
      {#each rows as r (r.project_id)}
        <button class="bcard" type="button" onclick={() => openBrief(r.project_id)}>
          <div class="bcard__top">
            <span class="mono avatar" style="background:{avatarColor(r.business_name)}">{initials(r.business_name)}</span>
            <div class="bcard__id-wrap">
              <span class="bcard__name">{r.business_name || '— sin nombre —'}</span>
              <span class="bcard__sub mono">{r.email || r.phone || r.project_id}</span>
            </div>
            <span class="badge badge--{r.status}">{statusLabel(r.status)}</span>
          </div>
          <div class="bcard__meta">
            {#if r.website_type}<span class="meta-pill">{r.website_type}</span>{/if}
            {#if r.budget_range}<span class="meta-pill meta-pill--gold">{r.budget_range}</span>{/if}
            {#if r.city_state}<span class="meta-pill meta-pill--ghost">{r.city_state}</span>{/if}
          </div>
          <div class="bcard__foot">
            <span class="mono gold">{r.project_id}</span>
            <span class="mono dim" title={fmtDateTime(r.created_at)}>recibido {rel(r.created_at)}</span>
          </div>
        </button>
      {/each}
    </div>
    {#if total > LIMIT}
      <div class="pager">
        <span class="dim mono">{offset + 1}–{Math.min(offset + LIMIT, total)} de {total}</span>
        <span>
          <button class="b b--ghost" disabled={offset === 0} onclick={prevPage}>‹ Anterior</button>
          <button class="b b--ghost" disabled={offset + LIMIT >= total} onclick={nextPage}>Siguiente ›</button>
        </span>
      </div>
    {/if}
  {/if}

{:else if detailLoading}
  <!-- ═══ DETALLE · CARGANDO ═══ -->
  <button class="back" onclick={closeBrief}>← Volver a la lista</button>
  <div class="state-card">
    <div class="spinner" aria-hidden="true"></div>
    <p class="state-card__t">Abriendo brief {openingId}…</p>
  </div>

{:else if detailError}
  <!-- ═══ DETALLE · ERROR ═══ -->
  <button class="back" onclick={closeBrief}>← Volver a la lista</button>
  <div class="state-card">
    <p class="state-card__t err">No se pudo abrir el brief</p>
    <p class="state-card__sub">{detailError}</p>
    <button class="b b--primary" onclick={() => openBrief(openingId)}>Reintentar</button>
  </div>

{:else}
  <!-- ═══ DETALLE ═══ -->
  <button class="back" onclick={closeBrief}>← Volver a la lista</button>

  <div class="detail">
    <div class="detail__main">
      <div class="d-head">
        <span class="mono avatar avatar--lg" style="background:{avatarColor(selected.business_name)}">{initials(selected.business_name)}</span>
        <div class="d-head__txt">
          <div class="d-head__row">
            <h1 class="d-id">{selected.project_id}</h1>
            <span class="badge badge--{selected.status}">{statusLabel(selected.status)}</span>
          </div>
          <p class="d-biz">{selected.business_name || '— sin nombre de negocio —'}</p>
          <div class="d-meta mono">
            <span>Recibido {fmtDateTime(selected.created_at)}</span>
            {#if selected.contacted_at}<span>· Contactado {fmtDate(selected.contacted_at)}</span>{/if}
            {#if selected.completed_at}<span>· Completado {fmtDate(selected.completed_at)}</span>{/if}
          </div>
        </div>
      </div>

      {#if editMode}
        <div class="editbar">
          <span class="editbar__lbl">✎ Modo edición</span>
          <span>
            <button class="b b--ghost" onclick={cancelEdit}>Cancelar</button>
            <button class="b b--primary" onclick={saveEdit}>Guardar campos</button>
          </span>
        </div>
      {/if}

      {#each SECTIONS as [title, fields]}
        <section class="block">
          <h2 class="block__title">{title}</h2>
          <div class="grid">
            {#each fields as [label, key, span, kind]}
              <div class="field" class:span>
                <div class="field__lbl">{label}</div>
                {#if editMode}
                  {#if span}
                    <textarea class="inp" rows="2" bind:value={edited[key]}></textarea>
                  {:else if kind === 'tags'}
                    <input class="inp" type="text" placeholder="Separar con comas" bind:value={edited[key]} />
                  {:else}
                    <input class="inp" type="text" bind:value={edited[key]} />
                  {/if}
                {:else if kind === 'tags'}
                  {#if (selected[key] || []).length}
                    <div class="tags">{#each selected[key] as t}<span class="tag">{t}</span>{/each}</div>
                  {:else}<div class="field__val empty">—</div>{/if}
                {:else}
                  <div class="field__val" class:empty={!selected[key]}>{selected[key] || '—'}</div>
                {/if}
              </div>
            {/each}
          </div>
        </section>
      {/each}

      {#if selected.summary && !editMode}
        <section class="block">
          <h2 class="block__title">Resumen del proyecto</h2>
          <div class="field__val pre">{selected.summary}</div>
        </section>
      {/if}
    </div>

    <aside class="detail__aside">
      <div class="card">
        <h3 class="card__t">Acciones</h3>
        <div class="actgrid">
          <button class="b b--ghost" onclick={() => download(false)}>⎙ Imprimir / PDF</button>
          <button class="b b--ghost" onclick={() => download(true)}>⬇ .html</button>
          <button class="b b--ghost" onclick={() => editMode ? cancelEdit() : enterEdit()}>{editMode ? '✕ Salir' : '✎ Editar'}</button>
          <button class="b b--danger" onclick={() => { showDelete = true; deleteConfirm = ''; }}>🗑 Eliminar</button>
        </div>
        {#if saveMsg}<div class="msg" class:ok={saveOk}>{saveMsg}</div>{/if}
      </div>

      <div class="card">
        <h3 class="card__t">Estado del proyecto</h3>
        <select class="inp" bind:value={statusSel}>
          {#each STATUSES as s}<option value={s.id}>{s.label}</option>{/each}
        </select>
        <h3 class="card__t" style="margin-top:14px">Resumen</h3>
        <textarea class="inp" rows="4" placeholder="Resumen del trabajo al cerrar…" bind:value={summaryVal}></textarea>
        <button class="b b--primary full" style="margin-top:10px" onclick={saveStatusSummary}>Guardar cambios</button>
      </div>

      <div class="card">
        <h3 class="card__t">Enviar email al cliente</h3>
        <input class="inp" type="text" placeholder="Asunto" maxlength="200" bind:value={emailSubject} />
        <textarea class="inp" rows="4" placeholder="Mensaje al cliente…" maxlength="10000" bind:value={emailBody} style="margin-top:8px"></textarea>
        <button class="b full" style="margin-top:10px" onclick={sendEmail}>Enviar</button>
        {#if emailMsg}<div class="msg" class:ok={emailOk}>{emailMsg}</div>{/if}
      </div>

      <div class="card">
        <h3 class="card__t">Historial</h3>
        {#if events.length}
          <ul class="events">
            {#each events as ev}
              <li class="ev">
                <span class="ev__dot" aria-hidden="true"></span>
                <div class="ev__body">
                  <div class="ev__t">{EVENT_LABELS[ev.event_type] || ev.event_type}</div>
                  <div class="ev__a">{ev.actor_email || 'sistema'}</div>
                  <div class="ev__d mono">{fmtDateTime(ev.created_at)}</div>
                </div>
              </li>
            {/each}
          </ul>
        {:else}<div class="muted">— sin eventos —</div>{/if}
      </div>
    </aside>
  </div>

  {#if showDelete}
    <div class="backdrop" role="presentation" tabindex="-1"
         onclick={(e) => { if (e.target === e.currentTarget) showDelete = false; }}
         onkeydown={(e) => { if (e.key === 'Escape') showDelete = false; }}>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="del-brief-title">
        <h3 class="modal__t" id="del-brief-title">Eliminar brief</h3>
        <p class="modal__b">Esta acción es <strong>irreversible</strong>. Se borran también los eventos de auditoría de <strong>{selected.project_id}</strong>. Para confirmar, escribe el ID:</p>
        <code class="modal__code">{selected.project_id}</code>
        <input class="inp" type="text" placeholder={selected.project_id} bind:value={deleteConfirm} autocomplete="off" />
        <div class="modal__act">
          <button class="b b--ghost" onclick={() => showDelete = false}>Cancelar</button>
          <button class="b b--danger" disabled={deleteConfirm !== selected.project_id || deleting} onclick={doDelete}>{deleting ? 'Eliminando…' : 'Eliminar'}</button>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .sec-head { display: flex; align-items: center; justify-content: space-between; }
  .greet { font-family: var(--font-display); font-weight: 700; font-size: var(--text-xl); letter-spacing: var(--tracking-tight); margin: var(--space-5) 0 var(--space-4); }

  /* ── KPI strip (Orbit stats) ───────────────────────────────── */
  .kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) 1.3fr; gap: 12px; margin-bottom: var(--space-4); }
  .kpi { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 15px 16px 13px; min-width: 0; }
  .kpi__label { margin: 0 0 8px; color: var(--fg-secondary); font-size: 12.5px; font-weight: 500; }
  .kpi__row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .kpi__num { margin: 0; font-family: var(--font-display); font-size: 32px; font-weight: 700; letter-spacing: var(--tracking-tight); line-height: 1; color: var(--fg-primary); }
  .kpi__art { width: 52px; height: 52px; flex-shrink: 0; filter: drop-shadow(0 6px 14px rgba(0,0,0,.35)); }
  .kpi__art svg { width: 100%; height: 100%; }
  .kpi__delta { margin: 11px 0 0; font-size: 12px; display: flex; align-items: center; gap: 6px; }
  .kpi__delta .up { color: var(--accent-teal); font-weight: 600; }
  .kpi__delta .muted { color: var(--fg-subtle); }
  .dot { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }
  .dot--gold { background: var(--accent-gold); box-shadow: 0 0 0 3px var(--accent-gold-dim); }
  .kpi--funnel { grid-row: span 1; }
  .kpi--funnel .funnel { margin-top: 4px; }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: var(--space-4); }
  .chip { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border: 1px solid var(--border); border-radius: var(--radius-pill); background: transparent; color: var(--fg-secondary); font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; transition: all var(--duration-fast); }
  .chip:hover { border-color: var(--accent-gold-line); color: var(--fg-primary); }
  .chip.on { background: var(--accent-gold-dim); border-color: var(--accent-gold); color: var(--accent-gold); }
  .chip__n { min-width: 16px; padding: 1px 6px; background: var(--bg-elevated); border-radius: var(--radius-pill); font-size: 9px; color: var(--fg-secondary); text-align: center; }
  .chip.on .chip__n { background: rgba(var(--accent-gold-rgb), .22); color: var(--accent-gold); }

  .search { width: 100%; padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); font-size: var(--text-sm); outline: none; margin-bottom: var(--space-4); transition: border-color var(--duration-fast), box-shadow var(--duration-fast); }
  .search::placeholder { color: var(--fg-subtle); }
  .search:focus { border-color: var(--accent-gold); box-shadow: 0 0 0 3px var(--accent-gold-dim); }

  /* ── Card-grid de briefs (Orbit rows, denso) ───────────────── */
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 12px; }
  .bcard { display: flex; flex-direction: column; gap: 11px; text-align: left; width: 100%; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px; cursor: pointer; transition: background var(--duration-fast), border-color var(--duration-fast), transform var(--duration-fast); }
  .bcard:hover { background: var(--bg-elevated); border-color: var(--accent-gold-line); transform: translateY(-1px); }
  .bcard__top { display: flex; align-items: center; gap: 10px; }
  .bcard__id-wrap { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
  .bcard__name { font-size: var(--text-sm); font-weight: 600; color: var(--fg-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bcard__sub { font-size: 11px; color: var(--fg-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bcard__meta { display: flex; flex-wrap: wrap; gap: 6px; min-height: 22px; }
  .bcard__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 9px; border-top: 1px solid var(--border-subtle); }

  .avatar { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; flex-shrink: 0; border-radius: var(--radius-md); color: #fff; font-family: var(--font-display); font-weight: 700; font-size: 13px; letter-spacing: 0; }
  .avatar--lg { width: 52px; height: 52px; font-size: 18px; border-radius: var(--radius-lg); }

  .meta-pill { display: inline-flex; align-items: center; padding: 3px 9px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-pill); font-size: 11px; color: var(--fg-secondary); white-space: nowrap; }
  .meta-pill--gold { color: var(--accent-gold); border-color: var(--accent-gold-line); background: var(--accent-gold-dim); font-variant-numeric: tabular-nums; }
  .meta-pill--ghost { color: var(--fg-subtle); }

  .mono { font-family: var(--font-mono); font-size: var(--text-xs); font-variant-numeric: tabular-nums; }
  .gold { color: var(--accent-gold); }
  .dim { color: var(--fg-subtle); white-space: nowrap; }

  .badge { display: inline-block; padding: 3px 9px; border-radius: var(--radius-pill); font-family: var(--font-mono); font-size: 9px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; border: 1px solid; white-space: nowrap; flex-shrink: 0; }
  /* Pills tintados sobre la paleta Orbit (naranja = activo/atención, verde = positivo) */
  .badge--pending { color: var(--accent-gold); border-color: var(--accent-gold-line); background: var(--accent-gold-dim); }
  .badge--contacted { color: var(--accent-teal); border-color: var(--accent-teal-line); background: var(--accent-teal-dim); }
  .badge--in_progress { color: var(--accent-gold-hover); border-color: rgba(var(--accent-gold-rgb), .22); background: rgba(var(--accent-gold-rgb), .08); }
  .badge--completed { color: var(--accent-teal); border-color: rgba(var(--accent-teal-rgb), .22); background: rgba(var(--accent-teal-rgb), .07); }
  .badge--archived { color: var(--fg-subtle); border-color: var(--border-strong); background: var(--bg-elevated); }

  .pager { display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-4); font-size: 11px; }

  .empty, .muted { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-6); text-align: center; color: var(--fg-secondary); line-height: 1.55; }
  .empty.err { color: var(--color-error); }
  .muted { padding: var(--space-3); border: 0; background: transparent; text-align: left; color: var(--fg-subtle); line-height: 1.45; }

  /* Estado de carga / error del detalle — tarjeta centrada e intencional */
  .state-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-3); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-8) var(--space-6); text-align: center; }
  .state-card__t { margin: 0; font-size: var(--text-base); color: var(--fg-primary); }
  .state-card__t.err { color: var(--color-error); font-weight: 600; }
  .state-card__sub { margin: 0; font-size: var(--text-sm); color: var(--fg-secondary); max-width: 40ch; }
  .spinner { width: 26px; height: 26px; border: 2px solid var(--accent-gold-line); border-top-color: var(--accent-gold); border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Detalle */
  .back { background: transparent; border: 0; color: var(--fg-secondary); font-family: var(--font-body); font-weight: 500; font-size: 12px; letter-spacing: .02em; cursor: pointer; margin: var(--space-4) 0; padding: 4px 0; transition: color var(--duration-fast); }
  .back:hover { color: var(--accent-gold); }
  .detail { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: var(--space-5); align-items: start; }
  .detail__main { min-width: 0; }
  .d-head { display: flex; align-items: flex-start; gap: 14px; border-bottom: 1px solid var(--border); padding-bottom: var(--space-4); margin-bottom: var(--space-5); }
  .d-head__txt { min-width: 0; flex: 1; }
  .d-head__row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .d-id { font-family: var(--font-display); font-weight: 700; font-size: var(--text-2xl); letter-spacing: var(--tracking-tight); color: var(--accent-gold); margin: 0; }
  .d-biz { font-size: var(--text-md); color: var(--fg-primary); margin: 6px 0 10px; }
  .d-meta { display: flex; flex-wrap: wrap; gap: 6px 12px; font-size: 10px; color: var(--fg-subtle); text-transform: uppercase; letter-spacing: .06em; font-variant-numeric: tabular-nums; }

  .editbar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; margin-bottom: var(--space-4); background: var(--accent-gold-dim); border: 1px solid var(--accent-gold-line); border-radius: var(--radius-md); }
  .editbar__lbl { font-family: var(--font-body); font-weight: 600; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; color: var(--accent-gold); }

  .block { margin-bottom: var(--space-5); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-4) var(--space-5); }
  .block__title { font-family: var(--font-body); font-weight: 600; font-size: var(--text-sm); letter-spacing: normal; text-transform: none; color: var(--fg-secondary); margin: 0 0 var(--space-3); padding-bottom: 8px; border-bottom: 1px solid var(--border-subtle); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4) var(--space-5); }
  .field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .field.span { grid-column: 1 / -1; }
  .field__lbl { font-family: var(--font-body); font-weight: 500; font-size: var(--text-xs); letter-spacing: normal; text-transform: none; color: var(--fg-subtle); }
  .field__val { font-size: var(--text-sm); color: var(--fg-primary); line-height: 1.5; word-break: break-word; white-space: pre-wrap; }
  .field__val.empty { color: var(--fg-subtle); }
  .field__val.pre { white-space: pre-wrap; }
  .tags { display: flex; flex-wrap: wrap; gap: 5px; }
  .tag { padding: 2px 9px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-pill); font-size: 11px; color: var(--fg-secondary); }

  .inp { width: 100%; padding: 9px 12px; background-color: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); font-family: var(--font-body); font-size: var(--text-sm); outline: none; resize: vertical; transition: border-color var(--duration-fast), box-shadow var(--duration-fast); }
  .inp::placeholder { color: var(--fg-subtle); }
  .inp:focus { border-color: var(--accent-gold); box-shadow: 0 0 0 3px var(--accent-gold-dim); }
  /* Reserva espacio para el caret del select (la imagen viene del global). */
  select.inp { padding-right: 30px; }

  .detail__aside { position: sticky; top: var(--space-3); display: flex; flex-direction: column; gap: var(--space-3); }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4); }
  .card__t { font-family: var(--font-body); font-weight: 600; font-size: var(--text-sm); letter-spacing: normal; text-transform: none; color: var(--fg-secondary); margin: 0 0 var(--space-3); }
  .actgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }

  /* La definición canónica de .b/.b--primary/.b--ghost/.b--danger/.b.full
     vive en dashboard.css (global). */

  .msg { margin-top: 8px; font-size: 11px; color: var(--color-error); min-height: 12px; }
  .msg.ok { color: var(--accent-teal); }

  .events { list-style: none; margin: 0; padding: 0; }
  .ev { position: relative; display: flex; gap: 11px; padding: 9px 0; border-bottom: 1px solid var(--border-subtle); }
  .ev:last-child { border-bottom: 0; padding-bottom: 0; }
  .ev__dot { flex-shrink: 0; width: 8px; height: 8px; margin-top: 5px; border-radius: 999px; background: var(--accent-gold); box-shadow: 0 0 0 3px var(--accent-gold-dim); }
  .ev__body { min-width: 0; }
  .ev__t { font-size: var(--text-sm); font-weight: 500; color: var(--fg-primary); }
  .ev__a { font-size: 11px; color: var(--fg-secondary); margin-top: 2px; }
  .ev__d { font-size: 10px; color: var(--fg-subtle); margin-top: 2px; font-variant-numeric: tabular-nums; }

  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: var(--space-4); }
  .modal { width: 100%; max-width: 440px; background: var(--bg-card); border: 1px solid var(--border-accent); border-radius: var(--radius-lg); padding: var(--space-5); }
  .modal__t { font-family: var(--font-display); font-weight: 700; font-size: var(--text-lg); color: var(--color-error); margin: 0 0 10px; }
  .modal__b { color: var(--fg-secondary); font-size: var(--text-sm); line-height: 1.55; margin: 0 0 10px; }
  .modal__b strong { color: var(--fg-primary); }
  .modal__code { display: block; margin-bottom: 10px; color: var(--accent-gold); font-family: var(--font-mono); }
  .modal__act { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }

  @media (max-width: 1100px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .kpi--funnel { grid-column: 1 / -1; } }
  @media (max-width: 880px) { .detail { grid-template-columns: 1fr; } .detail__aside { position: static; } }
  @media (max-width: 560px) { .kpis { grid-template-columns: 1fr; } .kpi--funnel { grid-column: auto; } }
</style>
