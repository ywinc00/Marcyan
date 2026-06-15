<script>
  import { onMount } from 'svelte';

  // ── Helpers (autosuficiente, igual que BriefsSection) ────────
  async function api(url, opts = {}) {
    return fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
  }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : ''; }
  function fmtDateTime(d) { return d ? new Date(d).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : ''; }
  function fmtMoney(cents) {
    if (cents == null || cents === '') return '—';
    const n = Number(cents);
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('es-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n / 100);
  }

  const P_STATUSES = [
    { id: 'active', label: 'Activo' }, { id: 'on_hold', label: 'En pausa' },
    { id: 'completed', label: 'Completado' }, { id: 'cancelled', label: 'Cancelado' },
  ];
  function pStatusLabel(s) { return (P_STATUSES.find((x) => x.id === s) || {}).label || s; }
  const P_FILTERS = [{ id: '', label: 'Todos' }, ...P_STATUSES];

  const M_STATUSES = [
    { id: 'pending', label: 'Pendiente' }, { id: 'in_progress', label: 'En curso' }, { id: 'done', label: 'Hecho' },
  ];
  function mStatusLabel(s) { return (M_STATUSES.find((x) => x.id === s) || {}).label || s; }

  // ── Estado lista ─────────────────────────────────────────────
  let rows = $state([]);
  let total = $state(0);
  let filter = $state('');
  let search = $state('');
  let offset = $state(0);
  const LIMIT = 50;
  let loading = $state(false);
  let error = $state('');
  let searchTimer;

  // ── Estado detalle ───────────────────────────────────────────
  let selected = $state(null);
  let milestones = $state([]);
  let progress = $state(null);
  let detailLoading = $state(false);
  let statusSel = $state('');
  let saveMsg = $state('');
  let saveOk = $state(false);

  // ── Estado "nuevo proyecto" ─────────────────────────────────
  let showNew = $state(false);
  let nf = $state({ name: '', briefProjectId: '', serviceType: '', amount: '', status: 'active' });
  let creating = $state(false);
  let newMsg = $state('');

  // ── Estado "nuevo hito" ─────────────────────────────────────
  let newMsLabel = $state('');
  let addingMs = $state(false);

  // ── Estado "eliminar proyecto" ──────────────────────────────
  let showDelete = $state(false);
  let deleting = $state(false);

  // ── Monograma de cliente/proyecto (avatar con iniciales) ────
  // Color de fondo determinista hasheado del nombre (paleta sobria).
  const MONO_PALETTE = ['#6366f1', '#0ea5e9', '#14b8a6', '#f97316', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];
  function monoColor(n) {
    let h = 0; const s = n || '?';
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return MONO_PALETTE[Math.abs(h) % MONO_PALETTE.length];
  }
  function initials(n) {
    const parts = (n || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '—';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // ── Derivados ────────────────────────────────────────────────
  const percent = $derived(progress ? progress.percent : 0);

  // Resumen rápido (KPI chips) derivado de las filas cargadas.
  const summary = $derived.by(() => {
    const c = { active: 0, on_hold: 0, completed: 0, cancelled: 0 };
    for (const r of rows) if (c[r.status] != null) c[r.status] += 1;
    return c;
  });

  // Suma de montos acordados (cents) de las filas en pantalla, para el KPI de valor.
  const totalAgreedCents = $derived.by(() => {
    let t = 0;
    for (const r of rows) { const n = Number(r.agreed_amount_cents); if (Number.isFinite(n)) t += n; }
    return t;
  });

  // ── Hover del stepper (detalle): índice del nodo bajo el cursor ──
  let hoverStep = $state(-1);

  // ── Carga lista ──────────────────────────────────────────────
  async function loadList() {
    loading = true; error = '';
    const p = new URLSearchParams();
    if (filter) p.set('status', filter);
    if (search) p.set('search', search);
    p.set('limit', LIMIT); p.set('offset', offset);
    try {
      const r = await api('/api/admin/projects?' + p.toString());
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

  // ── Detalle ──────────────────────────────────────────────────
  async function openProject(id) {
    detailLoading = true; selected = null; milestones = []; progress = null;
    saveMsg = ''; newMsLabel = ''; hoverStep = -1;
    try {
      const r = await api('/api/admin/projects/' + encodeURIComponent(id));
      const j = await r.json();
      if (j.ok) { selected = j.project; milestones = j.milestones || []; progress = j.progress; statusSel = j.project.status; }
      else error = j.error || 'No encontrado';
    } catch (_) {}
    finally { detailLoading = false; }
  }
  function closeProject() { selected = null; loadList(); }

  // ── Guardar estado del proyecto ──────────────────────────────
  async function saveStatus() {
    if (!selected) return;
    if (statusSel === selected.status) { saveOk = false; saveMsg = 'Sin cambios'; return; }
    saveMsg = 'Guardando…'; saveOk = false;
    try {
      const r = await api('/api/admin/projects/' + encodeURIComponent(selected.id),
        { method: 'PATCH', body: JSON.stringify({ status: statusSel }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      selected = j.project; progress = j.progress; saveOk = true; saveMsg = '✓ Guardado';
    } catch (e) { saveOk = false; saveMsg = e.message || 'Error al guardar'; }
  }

  // ── Cambiar estado de un hito ────────────────────────────────
  // Ciclo al hacer clic: pending → in_progress → done → pending
  function nextMsStatus(s) {
    if (s === 'pending') return 'in_progress';
    if (s === 'in_progress') return 'done';
    return 'pending';
  }
  async function setMilestoneStatus(ms, status) {
    const prev = ms.status;
    ms.status = status; milestones = [...milestones];
    try {
      const r = await api('/api/admin/projects/' + encodeURIComponent(selected.id) + '/milestones',
        { method: 'PATCH', body: JSON.stringify({ milestoneId: ms.id, status }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      milestones = j.milestones || milestones; progress = j.progress;
    } catch (_) {
      ms.status = prev; milestones = [...milestones];
    }
  }
  function cycleMilestone(ms) { setMilestoneStatus(ms, nextMsStatus(ms.status)); }

  // ── Añadir hito ──────────────────────────────────────────────
  async function addMilestone() {
    const label = newMsLabel.trim();
    if (!label) return;
    addingMs = true;
    try {
      const r = await api('/api/admin/projects/' + encodeURIComponent(selected.id) + '/milestones',
        { method: 'POST', body: JSON.stringify({ label }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      if (j.milestone) milestones = [...milestones, j.milestone];
      progress = j.progress; newMsLabel = '';
    } catch (_) {}
    finally { addingMs = false; }
  }

  // ── Eliminar proyecto ────────────────────────────────────────
  // selected.id es STRING (BIGINT) — se pasa tal cual, sin parseInt.
  async function doDelete() {
    if (!selected) return;
    deleting = true;
    try {
      const r = await api('/api/admin/projects/' + encodeURIComponent(selected.id), { method: 'DELETE' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      showDelete = false; selected = null;
      loadList();
    } catch (e) { saveOk = false; saveMsg = e.message || 'Error al eliminar'; showDelete = false; }
    finally { deleting = false; }
  }

  // ── Crear proyecto ───────────────────────────────────────────
  function openNew() { showNew = true; newMsg = ''; nf = { name: '', briefProjectId: '', serviceType: '', amount: '', status: 'active' }; }
  async function createProject() {
    if (!nf.name.trim()) { newMsg = 'El nombre es requerido'; return; }
    creating = true; newMsg = 'Creando…';
    const amountCents = nf.amount !== '' && nf.amount != null
      ? Math.round(Number(nf.amount) * 100) : null;
    try {
      const r = await api('/api/admin/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: nf.name.trim(),
          briefProjectId: nf.briefProjectId.trim() || null,
          serviceType: nf.serviceType.trim() || null,
          agreedAmountCents: amountCents,
          status: nf.status,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      showNew = false;
      loadList();
      if (j.project) openProject(j.project.id);
    } catch (e) { newMsg = e.message || 'Error al crear'; }
    finally { creating = false; }
  }

  onMount(() => { loadList(); });
</script>

{#if !selected}
  <!-- ═══ LISTA ═══ -->
  <div class="sec-head">
    <h1 class="greet">Progreso por proyecto</h1>
    <button class="b b--primary" onclick={openNew}>+ Nuevo proyecto</button>
  </div>

  {#if rows.length}
    <div class="kpis">
      <!-- KPI: Activos (teal) — render glossy de "reloj/órbita en marcha" -->
      <article class="kpi">
        <div class="kpi__txt">
          <span class="kpi__l">Activos</span>
          <span class="kpi__n teal">{summary.active}</span>
          <span class="kpi__delta"><span class="muted">en curso ahora</span></span>
        </div>
        <div class="kpi__art" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <radialGradient id="pk-act" cx="38%" cy="30%" r="75%">
                <stop offset="0" stop-color="#6ee7c2"/><stop offset="55%" stop-color="#34d399"/><stop offset="1" stop-color="#0f8f6b"/>
              </radialGradient>
            </defs>
            <ellipse cx="32" cy="56" rx="17" ry="4" fill="#34d399" opacity=".18"/>
            <circle cx="32" cy="30" r="20" fill="url(#pk-act)" stroke="#7df0cd" stroke-opacity=".5"/>
            <path d="M14 24a20 20 0 0 1 30-9" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M32 19v12l8 5" stroke="#063b2b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <ellipse cx="25" cy="22" rx="6" ry="3.4" fill="#fff" opacity=".4"/>
          </svg>
        </div>
      </article>

      <!-- KPI: En pausa (gold) — render de "pausa" en disco vidrioso -->
      <article class="kpi">
        <div class="kpi__txt">
          <span class="kpi__l">En pausa</span>
          <span class="kpi__n gold">{summary.on_hold}</span>
          <span class="kpi__delta"><span class="muted">esperando insumos</span></span>
        </div>
        <div class="kpi__art" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <radialGradient id="pk-hold" cx="38%" cy="30%" r="75%">
                <stop offset="0" stop-color="#fdba74"/><stop offset="55%" stop-color="#f97316"/><stop offset="1" stop-color="#b34708"/>
              </radialGradient>
            </defs>
            <ellipse cx="32" cy="56" rx="17" ry="4" fill="#f97316" opacity=".18"/>
            <circle cx="32" cy="30" r="20" fill="url(#pk-hold)" stroke="#ffd2a8" stroke-opacity=".5"/>
            <rect x="25" y="21" width="5" height="18" rx="2.2" fill="#5c2406"/>
            <rect x="34" y="21" width="5" height="18" rx="2.2" fill="#5c2406"/>
            <ellipse cx="25" cy="22" rx="6" ry="3.4" fill="#fff" opacity=".4"/>
          </svg>
        </div>
      </article>

      <!-- KPI: Completados — render de "check" sobre disco apilado -->
      <article class="kpi">
        <div class="kpi__txt">
          <span class="kpi__l">Completados</span>
          <span class="kpi__n">{summary.completed}</span>
          <span class="kpi__delta"><span class="muted">entregados</span></span>
        </div>
        <div class="kpi__art" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <radialGradient id="pk-done" cx="38%" cy="30%" r="75%">
                <stop offset="0" stop-color="#3f3f48"/><stop offset="60%" stop-color="#26262d"/><stop offset="1" stop-color="#16161a"/>
              </radialGradient>
            </defs>
            <ellipse cx="32" cy="56" rx="17" ry="4" fill="#000" opacity=".28"/>
            <circle cx="32" cy="30" r="20" fill="url(#pk-done)" stroke="#4a4a55"/>
            <path d="M23 30.5l6 6 12-13" stroke="#34d399" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <ellipse cx="25" cy="22" rx="6" ry="3.2" fill="#fff" opacity=".14"/>
          </svg>
        </div>
      </article>

      <!-- KPI: Valor en cartera — suma de montos acordados -->
      <article class="kpi">
        <div class="kpi__txt">
          <span class="kpi__l">Valor en cartera</span>
          <span class="kpi__n gold kpi__n--money">{fmtMoney(totalAgreedCents)}</span>
          <span class="kpi__delta"><span class="muted">{rows.length} {rows.length === 1 ? 'proyecto' : 'proyectos'}</span></span>
        </div>
        <div class="kpi__art" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="pk-val" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#fdba74"/><stop offset="1" stop-color="#ea580c"/>
              </linearGradient>
            </defs>
            <ellipse cx="32" cy="57" rx="18" ry="4" fill="#f97316" opacity=".16"/>
            <rect x="16" y="40" width="32" height="8" rx="3" fill="#23232a" stroke="#4a4a55"/>
            <rect x="19" y="29" width="26" height="10" rx="3" fill="#2c2c33" stroke="#4a4a55"/>
            <circle cx="32" cy="20" r="13" fill="url(#pk-val)" stroke="#ffd2a8" stroke-opacity=".5"/>
            <path d="M32 14v12M28.5 17.5h5.5a2.2 2.2 0 0 1 0 4.4h-4a2.2 2.2 0 0 0 0 4.4H35" stroke="#5c2406" stroke-width="2.4" stroke-linecap="round" fill="none"/>
            <ellipse cx="27" cy="14" rx="4.5" ry="2.6" fill="#fff" opacity=".45"/>
          </svg>
        </div>
      </article>

      {#if summary.cancelled}
        <article class="kpi">
          <div class="kpi__txt">
            <span class="kpi__l">Cancelados</span>
            <span class="kpi__n err">{summary.cancelled}</span>
            <span class="kpi__delta"><span class="down">archivados</span></span>
          </div>
          <div class="kpi__art" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <defs>
                <radialGradient id="pk-cnl" cx="38%" cy="30%" r="75%">
                  <stop offset="0" stop-color="#fca5a5"/><stop offset="55%" stop-color="#ef4444"/><stop offset="1" stop-color="#991b1b"/>
                </radialGradient>
              </defs>
              <ellipse cx="32" cy="56" rx="17" ry="4" fill="#ef4444" opacity=".18"/>
              <circle cx="32" cy="30" r="20" fill="url(#pk-cnl)" stroke="#fecaca" stroke-opacity=".5"/>
              <path d="M25 23l14 14M39 23L25 37" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>
              <ellipse cx="25" cy="22" rx="6" ry="3.4" fill="#fff" opacity=".4"/>
            </svg>
          </div>
        </article>
      {/if}
    </div>
  {/if}

  <div class="chips">
    {#each P_FILTERS as f}
      <button class="chip" class:on={filter === f.id} onclick={() => setFilter(f.id)}>{f.label}</button>
    {/each}
  </div>

  <input class="search" type="search" placeholder="Buscar por nombre, código, MRC, cliente…" oninput={onSearchInput} />

  {#if loading}
    <div class="empty">Cargando…</div>
  {:else if error}
    <div class="empty err">{error}</div>
  {:else if rows.length === 0}
    <div class="empty empty--big">
      <div class="empty__icon" aria-hidden="true">📁</div>
      <p class="empty__title">
        {#if filter || search}Sin proyectos que coincidan{:else}Aún no hay proyectos{/if}
      </p>
      <p class="empty__sub">
        {#if filter || search}Probá otro filtro o limpiá la búsqueda.{:else}Creá el primero para empezar a seguir su avance.{/if}
      </p>
      {#if !filter && !search}
        <button class="b b--primary" onclick={openNew}>+ Nuevo proyecto</button>
      {/if}
    </div>
  {:else}
    <div class="cards">
      {#each rows as r (r.id)}
        {@const done = (r.progress || 0) >= 100}
        <button class="pcard" onclick={() => openProject(r.id)}>
          <div class="pcard__top">
            <span class="pmono pmono--card" style={`background:${monoColor(r.client_name || r.name || r.project_code)}`}>{initials(r.client_name || r.name)}</span>
            <div class="pcard__hd">
              <span class="pcard__id mono gold">{r.project_code || ('PRJ-' + r.id)}</span>
              <span class="pcard__name">{r.name || '— sin nombre —'}</span>
            </div>
            <span class="badge badge--{r.status}">{pStatusLabel(r.status)}</span>
          </div>

          <div class="pcard__sub mono">
            <svg class="pcard__usr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5"/></svg>
            <span class="pcard__client">{r.client_name || 'Sin cliente'}</span>
            {#if r.brief_project_id}<span class="dot">·</span><span>{r.brief_project_id}</span>{/if}
          </div>

          <!-- Barra de progreso (SVG a mano) — naranja en curso / verde al 100% -->
          <div class="pcard__prog">
            <svg class="pbar" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id={`pg-${r.id}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stop-color={done ? '#6ee7c2' : '#fdba74'}/>
                  <stop offset="1" stop-color={done ? 'var(--accent-teal)' : 'var(--accent-gold)'}/>
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="100" height="8" rx="4" fill="var(--bg-elevated)" />
              <rect x="0" y="0" width={Math.max(r.progress || 0, r.progress ? 3 : 0)} height="8" rx="4" fill={`url(#pg-${r.id})`} />
            </svg>
            <span class="pcard__pct mono" class:teal={done}>{r.progress || 0}%</span>
          </div>

          <div class="pcard__foot">
            <span class="pcard__hit mono">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M21 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>
              {r.milestones_done || 0}/{r.milestones_total || 0} hitos
            </span>
            {#if r.agreed_amount_cents != null}<span class="pcard__amt mono teal">{fmtMoney(r.agreed_amount_cents)}</span>{/if}
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

{:else}
  <!-- ═══ DETALLE ═══ -->
  <button class="back" onclick={closeProject}>← Volver a proyectos</button>

  {#if detailLoading}
    <div class="empty">Cargando…</div>
  {:else}
    <div class="detail">
      <div class="detail__main">
        <div class="d-head">
          <span class="pmono pmono--lg" style={`background:${monoColor(selected.client_name || selected.name || selected.project_code)}`}>{initials(selected.client_name || selected.name)}</span>
          <div class="d-head__txt">
            <h1 class="d-id">{selected.project_code || ('PRJ-' + selected.id)}</h1>
            <p class="d-biz">{selected.name || '— sin nombre —'}</p>
            <div class="d-meta mono">
              <span>{selected.client_name || 'Sin cliente'}</span>
              {#if selected.brief_project_id}<span>· Brief {selected.brief_project_id}</span>{/if}
              {#if selected.service_type}<span>· {selected.service_type}</span>{/if}
              {#if selected.started_at}<span>· Inicio {fmtDate(selected.started_at)}</span>{/if}
              {#if selected.completed_at}<span>· Fin {fmtDate(selected.completed_at)}</span>{/if}
            </div>
          </div>
        </div>

        <!-- Stepper de hitos (SVG a mano: nodos por hito) -->
        <section class="block">
          <div class="block__head">
            <h2 class="block__title">Avance · {percent}%</h2>
            <span class="prog-sum mono">{progress ? progress.done : 0}/{progress ? progress.total : 0} hechos</span>
          </div>

          {#if milestones.length}
            {@const W = Math.max(milestones.length * 120, 120)}
            <div class="stepper-wrap" role="presentation" onmouseleave={() => (hoverStep = -1)}>
              <svg class="stepper" viewBox="0 0 {W} 84" role="img" aria-label="Stepper de hitos">
                <!-- línea base -->
                <line x1="60" y1="30" x2={W - 60} y2="30" stroke="var(--border)" stroke-width="2" />
                {#each milestones as ms, i}
                  {@const cx = 60 + i * 120}
                  {@const isDone = ms.status === 'done'}
                  {@const isCurrent = ms.status === 'in_progress'}
                  {@const hot = hoverStep === i}
                  <!-- segmento coloreado hasta el último hito hecho -->
                  {#if i > 0}
                    <line x1={60 + (i - 1) * 120} y1="30" x2={cx} y2="30"
                          stroke={milestones[i - 1].status === 'done' ? 'var(--accent-gold)' : 'var(--border)'}
                          stroke-width="2" />
                  {/if}
                  <!-- guía vertical punteada al hover (estilo Orbit) -->
                  {#if hot}
                    <line x1={cx} y1="14" x2={cx} y2="74" stroke="rgba(255,255,255,.18)" stroke-width="1" stroke-dasharray="2 3" />
                    <circle cx={cx} cy="30" r="15" fill="none" stroke={isDone ? 'var(--accent-gold)' : isCurrent ? 'var(--accent-teal)' : 'var(--border-strong)'} stroke-opacity=".55" stroke-width="1.5" />
                  {/if}
                  <circle cx={cx} cy="30" r="11"
                          fill={isDone ? 'var(--accent-gold)' : isCurrent ? 'var(--accent-teal-dim)' : 'var(--bg-elevated)'}
                          stroke={isDone ? 'var(--accent-gold)' : isCurrent ? 'var(--accent-teal)' : 'var(--border)'}
                          stroke-width="2" />
                  {#if isDone}
                    <path d="M{cx - 4.5} 30 l3 3 l6 -6.5" fill="none" stroke="var(--fg-inverse)" stroke-width="2"
                          stroke-linecap="round" stroke-linejoin="round" />
                  {:else if isCurrent}
                    <circle cx={cx} cy="30" r="3.5" fill="var(--accent-teal)" />
                  {/if}
                  <text x={cx} y="58" text-anchor="middle" class="step__lbl">{ms.label}</text>
                  <text x={cx} y="72" text-anchor="middle"
                        class="step__st" fill={isDone ? 'var(--accent-gold)' : isCurrent ? 'var(--accent-teal)' : 'var(--fg-subtle)'}>
                    {mStatusLabel(ms.status)}
                  </text>
                  <!-- zona de hover invisible y ancha por nodo -->
                  <rect x={cx - 58} y="0" width="116" height="84" fill="transparent"
                        onmouseenter={() => (hoverStep = i)} role="presentation" />
                {/each}
              </svg>
              {#if hoverStep >= 0 && milestones[hoverStep]}
                {@const cx = 60 + hoverStep * 120}
                <span class="chart-tip" style={`left:${(cx / W) * 100}%;top:18px`}>
                  {milestones[hoverStep].label} · {mStatusLabel(milestones[hoverStep].status)}
                </span>
              {/if}
            </div>
          {:else}
            <div class="muted">— este proyecto no tiene hitos —</div>
          {/if}
        </section>

        <!-- Lista editable de hitos -->
        <section class="block">
          <h2 class="block__title">Hitos</h2>
          <ul class="mslist">
            {#each milestones as ms (ms.id)}
              <li class="ms ms--{ms.status}">
                <button class="ms__dot ms__dot--{ms.status}" title="Cambiar estado" onclick={() => cycleMilestone(ms)} aria-label="Cambiar estado del hito">
                  {#if ms.status === 'done'}✓{:else if ms.status === 'in_progress'}●{:else}○{/if}
                </button>
                <span class="ms__label">{ms.label}</span>
                {#if ms.due_date}<span class="ms__due mono">vence {fmtDate(ms.due_date)}</span>{/if}
                <span class="ms__pill ms__pill--{ms.status}">{mStatusLabel(ms.status)}</span>
                <select class="ms__sel" value={ms.status} onchange={(e) => setMilestoneStatus(ms, e.currentTarget.value)} aria-label="Estado del hito">
                  {#each M_STATUSES as s}<option value={s.id}>{s.label}</option>{/each}
                </select>
              </li>
            {/each}
          </ul>
          <div class="ms-add">
            <input class="inp" type="text" placeholder="Añadir hito…" bind:value={newMsLabel}
                   onkeydown={(e) => { if (e.key === 'Enter') addMilestone(); }} />
            <button class="b b--ghost" disabled={!newMsLabel.trim() || addingMs} onclick={addMilestone}>
              {addingMs ? '…' : '+ Añadir'}
            </button>
          </div>
        </section>
      </div>

      <aside class="detail__aside">
        <div class="card">
          <h3 class="card__t">Estado del proyecto</h3>
          <select class="inp" bind:value={statusSel}>
            {#each P_STATUSES as s}<option value={s.id}>{s.label}</option>{/each}
          </select>
          <button class="b b--primary full" style="margin-top:10px" onclick={saveStatus}>Guardar estado</button>
          {#if saveMsg}<div class="msg" class:ok={saveOk}>{saveMsg}</div>{/if}
        </div>

        <div class="card">
          <h3 class="card__t">Resumen</h3>
          <div class="kv"><span class="kv__k">Monto acordado</span><span class="kv__v teal">{fmtMoney(selected.agreed_amount_cents)}</span></div>
          <div class="kv"><span class="kv__k">Hitos hechos</span><span class="kv__v">{progress ? progress.done : 0} / {progress ? progress.total : 0}</span></div>
          <div class="kv"><span class="kv__k">En curso</span><span class="kv__v">{progress ? progress.in_progress : 0}</span></div>
          <div class="kv"><span class="kv__k">Pendientes</span><span class="kv__v">{progress ? progress.pending : 0}</span></div>
          {#if selected.brief_project_id}<div class="kv"><span class="kv__k">Brief</span><span class="kv__v mono gold">{selected.brief_project_id}</span></div>{/if}
          <div class="kv"><span class="kv__k">Creado</span><span class="kv__v mono">{fmtDateTime(selected.created_at)}</span></div>
        </div>

        <div class="card card--danger">
          <h3 class="card__t card__t--danger">Zona de riesgo</h3>
          <p class="danger-note">Eliminar borra el proyecto y todos sus hitos. No se puede deshacer.</p>
          <button class="b b--danger full" onclick={() => showDelete = true}>🗑 Eliminar proyecto</button>
        </div>
      </aside>
    </div>
  {/if}
{/if}

{#if showNew}
  <div class="backdrop" role="presentation" tabindex="-1"
       onclick={(e) => { if (e.target === e.currentTarget) showNew = false; }}
       onkeydown={(e) => { if (e.key === 'Escape') showNew = false; }}>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="new-proj-title">
      <h3 class="modal__t" id="new-proj-title">Nuevo proyecto</h3>
      <label class="fl" for="np-name">Nombre del proyecto *</label>
      <input id="np-name" class="inp" type="text" placeholder="Sitio web — Negocio X" bind:value={nf.name} autocomplete="off" />
      <label class="fl" for="np-brief">Brief vinculado (opcional)</label>
      <input id="np-brief" class="inp" type="text" placeholder="MRC-001" bind:value={nf.briefProjectId} autocomplete="off" />
      <label class="fl" for="np-service">Tipo de servicio (opcional)</label>
      <input id="np-service" class="inp" type="text" placeholder="Landing, sitio completo, AEO…" bind:value={nf.serviceType} autocomplete="off" />
      <label class="fl" for="np-amount">Monto acordado USD (opcional)</label>
      <input id="np-amount" class="inp" type="number" min="0" step="1" placeholder="400" bind:value={nf.amount} />
      <label class="fl" for="np-status">Estado inicial</label>
      <select id="np-status" class="inp" bind:value={nf.status}>
        {#each P_STATUSES as s}<option value={s.id}>{s.label}</option>{/each}
      </select>
      {#if newMsg}<div class="msg">{newMsg}</div>{/if}
      <div class="modal__act">
        <button class="b b--ghost" onclick={() => showNew = false}>Cancelar</button>
        <button class="b b--primary" disabled={creating || !nf.name.trim()} onclick={createProject}>
          {creating ? 'Creando…' : 'Crear proyecto'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showDelete && selected}
  <div class="backdrop" role="presentation" tabindex="-1"
       onclick={(e) => { if (e.target === e.currentTarget) showDelete = false; }}
       onkeydown={(e) => { if (e.key === 'Escape') showDelete = false; }}>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="del-proj-title">
      <h3 class="modal__t modal__t--danger" id="del-proj-title">Eliminar proyecto</h3>
      <p class="modal__b">
        Se borra <strong class="mono gold">{selected.project_code || ('PRJ-' + selected.id)}</strong>
        y sus hitos. Esta acción es <strong>irreversible</strong>.
      </p>
      <div class="modal__act">
        <button class="b b--ghost" onclick={() => showDelete = false}>Cancelar</button>
        <button class="b b--danger" disabled={deleting} onclick={doDelete}>{deleting ? 'Eliminando…' : 'Eliminar'}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sec-head { display: flex; align-items: center; justify-content: space-between; }
  .greet { font-family: var(--font-display); font-weight: 700; font-size: var(--text-xl); letter-spacing: var(--tracking-tight); margin: var(--space-5) 0 var(--space-4); }

  /* KPI cards (resumen de la lista) — tratamiento Orbit: label + número
     grande + delta + render glossy en la esquina (SVG con gradiente+glow). */
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: var(--space-3); margin: var(--space-2) 0 var(--space-4); }
  .kpi { position: relative; overflow: hidden; display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-2); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-4) 13px; transition: border-color var(--duration-fast), transform var(--duration-fast); }
  .kpi:hover { border-color: var(--border-strong); transform: translateY(-1px); }
  .kpi__txt { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
  .kpi__l { font-family: var(--font-body); font-weight: 500; font-size: var(--text-xs); letter-spacing: normal; text-transform: none; color: var(--fg-secondary); }
  .kpi__n { font-family: var(--font-display); font-weight: 700; font-size: 34px; line-height: 1; color: var(--fg-primary); letter-spacing: var(--tracking-tight); }
  .kpi__n--money { font-size: 26px; }
  .kpi__delta { display: flex; align-items: baseline; gap: 6px; font-size: 11.5px; margin-top: 1px; }
  .kpi__delta .up { color: var(--accent-teal); font-weight: 600; }
  .kpi__delta .down { color: var(--color-error); font-weight: 600; }
  .kpi__delta .muted { color: var(--fg-subtle); }
  .kpi__art { width: 58px; height: 58px; flex: 0 0 auto; filter: drop-shadow(0 6px 14px rgba(0,0,0,.45)); }
  .kpi__art svg { width: 100%; height: 100%; display: block; }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: var(--space-3); }
  .chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--border); border-radius: var(--radius-pill); background: transparent; color: var(--fg-secondary); font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: all var(--duration-fast); }
  .chip:hover { border-color: var(--accent-gold); color: var(--fg-primary); }
  .chip.on { background: var(--accent-gold-dim); border-color: var(--accent-gold); color: var(--accent-gold); }

  .search { width: 100%; padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); font-size: var(--text-base); outline: none; margin-bottom: var(--space-4); }
  .search:focus { border-color: var(--accent-gold); }

  /* Tarjetas de proyecto — densas, con monograma de cliente */
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(264px, 1fr)); gap: var(--space-3); }
  .pcard { display: flex; flex-direction: column; gap: 9px; text-align: left; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 15px; cursor: pointer; transition: transform var(--duration-fast), border-color var(--duration-fast), background var(--duration-fast), box-shadow var(--duration-fast); }
  .pcard:hover { border-color: var(--accent-gold); background: var(--bg-elevated); transform: translateY(-2px); box-shadow: var(--shadow-gold); }
  .pcard__top { display: flex; align-items: flex-start; gap: 10px; }
  .pcard__hd { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
  .pcard__id { font-size: 10px; letter-spacing: .04em; }
  .pcard__name { font-family: var(--font-display); font-weight: 700; font-size: var(--text-md); color: var(--fg-primary); line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pmono--card { width: 34px; height: 34px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-md); color: #fff; font-family: var(--font-display); font-weight: 700; font-size: 13px; line-height: 1; letter-spacing: -.01em; box-shadow: inset 0 1px 0 rgba(255,255,255,.18); }
  .pcard__sub { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--fg-subtle); overflow: hidden; }
  .pcard__usr { width: 13px; height: 13px; flex: 0 0 auto; color: var(--fg-subtle); }
  .pcard__client { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pcard__prog { display: flex; align-items: center; gap: 10px; margin-top: 1px; }
  .pbar { flex: 1; height: 8px; display: block; }
  .pcard__pct { font-size: 11px; font-weight: 600; color: var(--accent-gold); width: 34px; text-align: right; flex: 0 0 auto; }
  .pcard__pct.teal { color: var(--accent-teal); }
  .pcard__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 9px; border-top: 1px solid var(--border-subtle); }
  .pcard__hit { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--fg-secondary); }
  .pcard__hit svg { width: 13px; height: 13px; color: var(--fg-subtle); }
  .pcard__amt { font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .dot { color: var(--fg-subtle); }

  .badge { display: inline-block; padding: 3px 9px; border-radius: var(--radius-pill); font-family: var(--font-mono); font-size: 9px; letter-spacing: .12em; text-transform: uppercase; border: 1px solid; white-space: nowrap; }
  .badge--active { color: var(--accent-teal); border-color: var(--accent-teal-line); background: var(--accent-teal-dim); }
  .badge--on_hold { color: var(--accent-gold); border-color: var(--accent-gold-line); background: var(--accent-gold-dim); }
  .badge--completed { color: var(--accent-teal); border-color: rgba(var(--accent-teal-rgb),.22); background: rgba(var(--accent-teal-rgb),.07); }
  .badge--cancelled { color: var(--color-error); border-color: rgba(var(--color-error-rgb),.35); background: rgba(var(--color-error-rgb),.06); }

  .pager { display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-4); font-size: 11px; }

  .empty, .muted { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-6); text-align: center; color: var(--fg-secondary); line-height: 1.55; }
  .empty.err { color: var(--color-error); }
  .muted { padding: var(--space-4); font-style: italic; }

  /* Empty state centrado (Orbit) */
  .empty--big { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-9) var(--space-6); font-style: normal; }
  .empty__icon { font-size: 32px; opacity: .65; margin-bottom: var(--space-1); }
  .empty__title { font-family: var(--font-display); font-weight: 700; font-size: var(--text-md); color: var(--fg-primary); margin: 0; }
  .empty__sub { font-size: var(--text-sm); color: var(--fg-subtle); margin: 0 0 var(--space-2); }

  /* Detalle */
  .back { background: transparent; border: 0; color: var(--fg-subtle); font-family: var(--font-mono); font-size: 10px; letter-spacing: .15em; text-transform: uppercase; cursor: pointer; margin: var(--space-4) 0; padding: 4px 0; }
  .back:hover { color: var(--accent-gold); }
  .detail { display: grid; grid-template-columns: minmax(0,1fr) 300px; gap: var(--space-5); align-items: start; }
  .detail__main { min-width: 0; }
  .d-head { display: flex; align-items: flex-start; gap: var(--space-3); border-bottom: 1px solid var(--border); padding-bottom: var(--space-3); margin-bottom: var(--space-4); }
  .d-head__txt { min-width: 0; flex: 1; }
  .pmono--lg { width: 46px; height: 46px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-md); color: #fff; font-family: var(--font-display); font-weight: 700; font-size: 17px; line-height: 1; letter-spacing: -.01em; box-shadow: inset 0 1px 0 rgba(255,255,255,.18); }
  .d-id { font-family: var(--font-display); font-weight: 700; font-size: var(--text-2xl); letter-spacing: var(--tracking-tight); color: var(--accent-gold); margin: 0; }
  .d-biz { font-family: var(--font-display); font-style: italic; color: var(--fg-secondary); margin: 4px 0; }
  .d-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 10px; color: var(--fg-subtle); text-transform: uppercase; letter-spacing: .1em; }

  .block { margin-bottom: var(--space-4); }
  .block__head { display: flex; align-items: baseline; justify-content: space-between; }
  .block__title { font-family: var(--font-display); font-weight: 600; font-size: var(--text-md); letter-spacing: normal; text-transform: none; color: var(--fg-primary); margin: 0 0 var(--space-3); padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle); flex: 1; }
  .prog-sum { font-size: 11px; color: var(--fg-subtle); margin-left: 12px; }

  /* Stepper SVG interactivo */
  .stepper-wrap { position: relative; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 8px 10px; }
  .stepper { width: 100%; height: auto; display: block; max-width: 100%; }
  .stepper rect[role="presentation"] { cursor: pointer; }
  .step__lbl { fill: var(--fg-primary); font-family: var(--font-display); font-size: 11px; font-weight: 600; }
  .step__st  { font-family: var(--font-mono); font-size: 9px; letter-spacing: .06em; text-transform: uppercase; }

  /* Lista de hitos */
  .mslist { list-style: none; margin: 0 0 var(--space-3); padding: 0; }
  .ms { display: flex; align-items: center; gap: var(--space-3); padding: 10px 0; border-bottom: 1px solid var(--border-subtle); }
  .ms:last-child { border-bottom: 0; }
  .ms__dot { width: 24px; height: 24px; flex: 0 0 auto; border-radius: 50%; border: 1.5px solid var(--border); background: var(--bg-elevated); color: var(--fg-subtle); font-size: 12px; line-height: 1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all var(--duration-fast); }
  .ms__dot--done { background: var(--accent-gold); border-color: var(--accent-gold); color: var(--fg-inverse); }
  .ms__dot--in_progress { border-color: var(--accent-teal); color: var(--accent-teal); background: var(--accent-teal-dim); }
  .ms__label { flex: 1; color: var(--fg-primary); font-size: var(--text-sm); }
  .ms--done .ms__label { color: var(--fg-secondary); }
  .ms__due { font-size: 10px; color: var(--fg-subtle); }
  /* Pill de estado tintada (se oculta en pantallas estrechas a favor del select) */
  .ms__pill { padding: 2px 9px; border-radius: var(--radius-pill); font-family: var(--font-mono); font-size: 9px; letter-spacing: .1em; text-transform: uppercase; border: 1px solid; white-space: nowrap; flex: 0 0 auto; }
  .ms__pill--pending { color: var(--fg-subtle); border-color: var(--border); background: var(--bg-elevated); }
  .ms__pill--in_progress { color: var(--accent-teal); border-color: var(--accent-teal-line); background: var(--accent-teal-dim); }
  .ms__pill--done { color: var(--accent-gold); border-color: var(--accent-gold-line); background: var(--accent-gold-dim); }
  /* El caret (background-image) lo aplica la regla global .ms__sel en dashboard.css. */
  .ms__sel { background-color: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); padding: 6px 26px 6px 8px; font-size: var(--text-xs); cursor: pointer; flex: 0 0 auto; background-position: right 8px center; }
  .ms__sel:focus { outline: none; border-color: var(--accent-gold); }

  .ms-add { display: flex; gap: 8px; }
  .ms-add .inp { flex: 1; }

  .inp { width: 100%; padding: 9px 12px; background-color: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); font-family: var(--font-body); font-size: var(--text-sm); outline: none; }
  .inp:focus { border-color: var(--accent-gold); }
  /* Reserva espacio para el caret del select (la imagen viene del global). */
  select.inp { padding-right: 30px; }

  .detail__aside { position: sticky; top: var(--space-3); display: flex; flex-direction: column; gap: var(--space-3); }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4); }
  .card__t { font-family: var(--font-body); font-weight: 600; font-size: var(--text-sm); letter-spacing: normal; text-transform: none; color: var(--fg-secondary); margin: 0 0 var(--space-3); }
  .card--danger { border-color: rgba(var(--color-error-rgb),.28); }
  .card__t--danger { color: var(--color-error); }
  .danger-note { font-size: var(--text-xs); color: var(--fg-subtle); margin: 0 0 var(--space-3); line-height: 1.4; }
  .kv { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--border-subtle); }
  .kv:last-child { border-bottom: 0; }
  .kv__k { font-size: var(--text-xs); color: var(--fg-secondary); }
  .kv__v { font-size: var(--text-sm); color: var(--fg-primary); text-align: right; }

  /* La definición canónica de .b/.b--primary/.b--danger/.b.full
     vive en dashboard.css (global). */

  .mono { font-family: var(--font-mono); }
  .gold { color: var(--accent-gold); }
  .teal { color: var(--accent-teal); }
  .err { color: var(--color-error); }
  .dim { color: var(--fg-subtle); white-space: nowrap; }

  .msg { margin-top: 8px; font-family: var(--font-mono); font-size: 10px; color: var(--color-error); min-height: 12px; }
  .msg.ok { color: var(--accent-teal); }

  /* Modal nuevo proyecto */
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: var(--space-4); }
  .modal { width: 100%; max-width: 440px; background: var(--bg-card); border: 1px solid var(--border-accent); border-radius: var(--radius-lg); padding: var(--space-5); }
  .modal__t { font-family: var(--font-display); font-weight: 700; font-size: var(--text-lg); color: var(--accent-gold); margin: 0 0 var(--space-3); }
  .modal__t--danger { color: var(--color-error); }
  .modal__b { font-size: var(--text-sm); color: var(--fg-secondary); line-height: 1.5; margin: 0 0 var(--space-2); }
  .fl { display: block; font-family: var(--font-body); font-weight: 500; font-size: var(--text-xs); letter-spacing: normal; text-transform: none; color: var(--fg-secondary); margin: 10px 0 4px; }
  .modal__act { display: flex; justify-content: flex-end; gap: 8px; margin-top: var(--space-4); }

  @media (max-width: 880px) { .detail { grid-template-columns: 1fr; } .detail__aside { position: static; } }
  @media (max-width: 560px) { .ms__pill { display: none; } }
</style>
