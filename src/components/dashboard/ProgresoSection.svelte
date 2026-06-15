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

  // ── Derivados ────────────────────────────────────────────────
  const percent = $derived(progress ? progress.percent : 0);

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
    saveMsg = ''; newMsLabel = '';
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
    <div class="empty">Sin proyectos que coincidan. Crea uno con “+ Nuevo proyecto”.</div>
  {:else}
    <div class="cards">
      {#each rows as r (r.id)}
        <button class="pcard" onclick={() => openProject(r.id)}>
          <div class="pcard__top">
            <div class="pcard__id mono gold">{r.project_code || ('PRJ-' + r.id)}</div>
            <span class="badge badge--{r.status}">{pStatusLabel(r.status)}</span>
          </div>
          <div class="pcard__name">{r.name || '— sin nombre —'}</div>
          <div class="pcard__sub mono">
            {r.client_name || 'Sin cliente'}{#if r.brief_project_id} · {r.brief_project_id}{/if}
          </div>

          <!-- Barra de progreso (SVG a mano) -->
          <div class="pcard__prog">
            <svg class="pbar" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
              <rect x="0" y="0" width="100" height="6" rx="3" fill="var(--bg-elevated)" />
              <rect x="0" y="0" width={Math.max(r.progress || 0, r.progress ? 2 : 0)} height="6" rx="3"
                    fill={(r.progress || 0) >= 100 ? 'var(--accent-teal)' : 'var(--accent-gold)'} />
            </svg>
            <span class="pcard__pct mono">{r.progress || 0}%</span>
          </div>
          <div class="pcard__foot mono">
            {r.milestones_done || 0}/{r.milestones_total || 0} hitos
            {#if r.agreed_amount_cents != null}<span class="dot">·</span> {fmtMoney(r.agreed_amount_cents)}{/if}
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

        <!-- Stepper de hitos (SVG a mano: nodos por hito) -->
        <section class="block">
          <div class="block__head">
            <h2 class="block__title">Avance · {percent}%</h2>
            <span class="prog-sum mono">{progress ? progress.done : 0}/{progress ? progress.total : 0} hechos</span>
          </div>

          {#if milestones.length}
            <svg class="stepper" viewBox="0 0 {Math.max(milestones.length * 120, 120)} 78" role="img" aria-label="Stepper de hitos">
              <!-- línea base -->
              <line x1="60" y1="30" x2={Math.max(milestones.length * 120, 120) - 60} y2="30"
                    stroke="var(--border)" stroke-width="2" />
              {#each milestones as ms, i}
                {@const cx = 60 + i * 120}
                {@const isDone = ms.status === 'done'}
                {@const isCurrent = ms.status === 'in_progress'}
                <!-- segmento coloreado hasta el último hito hecho -->
                {#if i > 0}
                  <line x1={60 + (i - 1) * 120} y1="30" x2={cx} y2="30"
                        stroke={milestones[i - 1].status === 'done' ? 'var(--accent-gold)' : 'var(--border)'}
                        stroke-width="2" />
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
              {/each}
            </svg>
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
                <select class="ms__sel" value={ms.status} onchange={(e) => setMilestoneStatus(ms, e.currentTarget.value)}>
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
      </aside>
    </div>
  {/if}
{/if}

{#if showNew}
  <div class="backdrop" onclick={(e) => { if (e.target === e.currentTarget) showNew = false; }}>
    <div class="modal">
      <h3 class="modal__t">Nuevo proyecto</h3>
      <label class="fl">Nombre del proyecto *</label>
      <input class="inp" type="text" placeholder="Sitio web — Negocio X" bind:value={nf.name} autocomplete="off" />
      <label class="fl">Brief vinculado (opcional)</label>
      <input class="inp" type="text" placeholder="MRC-001" bind:value={nf.briefProjectId} autocomplete="off" />
      <label class="fl">Tipo de servicio (opcional)</label>
      <input class="inp" type="text" placeholder="Landing, sitio completo, AEO…" bind:value={nf.serviceType} autocomplete="off" />
      <label class="fl">Monto acordado USD (opcional)</label>
      <input class="inp" type="number" min="0" step="1" placeholder="400" bind:value={nf.amount} />
      <label class="fl">Estado inicial</label>
      <select class="inp" bind:value={nf.status}>
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

<style>
  .sec-head { display: flex; align-items: center; justify-content: space-between; }
  .greet { font-family: var(--font-display); font-weight: 700; font-size: var(--text-xl); letter-spacing: var(--tracking-tight); margin: var(--space-5) 0 var(--space-4); }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: var(--space-3); }
  .chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--border); border-radius: var(--radius-pill); background: transparent; color: var(--fg-secondary); font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: all var(--duration-fast); }
  .chip:hover { border-color: var(--accent-gold); color: var(--fg-primary); }
  .chip.on { background: var(--accent-gold-dim); border-color: var(--accent-gold); color: var(--accent-gold); }

  .search { width: 100%; padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); font-size: var(--text-base); outline: none; margin-bottom: var(--space-4); }
  .search:focus { border-color: var(--accent-gold); }

  /* Tarjetas de proyecto */
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-3); }
  .pcard { display: flex; flex-direction: column; gap: 6px; text-align: left; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4); cursor: pointer; transition: all var(--duration-fast); }
  .pcard:hover { border-color: var(--accent-gold); background: var(--bg-elevated); }
  .pcard__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .pcard__id { font-size: var(--text-xs); }
  .pcard__name { font-family: var(--font-display); font-weight: 700; font-size: var(--text-md); color: var(--fg-primary); line-height: 1.2; }
  .pcard__sub { font-size: 11px; color: var(--fg-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pcard__prog { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
  .pbar { flex: 1; height: 6px; display: block; }
  .pcard__pct { font-size: 11px; color: var(--fg-secondary); width: 34px; text-align: right; flex: 0 0 auto; }
  .pcard__foot { font-size: 10px; color: var(--fg-subtle); letter-spacing: .04em; }
  .dot { color: var(--fg-subtle); }

  .badge { display: inline-block; padding: 3px 9px; border-radius: var(--radius-pill); font-family: var(--font-mono); font-size: 9px; letter-spacing: .12em; text-transform: uppercase; border: 1px solid; white-space: nowrap; }
  .badge--active { color: var(--accent-teal); border-color: var(--accent-teal-line); background: var(--accent-teal-dim); }
  .badge--on_hold { color: var(--accent-gold); border-color: var(--accent-gold-line); background: var(--accent-gold-dim); }
  .badge--completed { color: #9be8c1; border-color: rgba(155,232,193,.35); background: rgba(155,232,193,.06); }
  .badge--cancelled { color: var(--color-error); border-color: rgba(224,92,92,.35); background: rgba(224,92,92,.06); }

  .pager { display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-4); font-size: 11px; }

  .empty, .muted { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-6); text-align: center; color: var(--fg-secondary); font-style: italic; }
  .empty.err { color: var(--color-error); font-style: normal; }
  .muted { padding: var(--space-4); }

  /* Detalle */
  .back { background: transparent; border: 0; color: var(--fg-subtle); font-family: var(--font-mono); font-size: 10px; letter-spacing: .15em; text-transform: uppercase; cursor: pointer; margin: var(--space-4) 0; padding: 4px 0; }
  .back:hover { color: var(--accent-gold); }
  .detail { display: grid; grid-template-columns: minmax(0,1fr) 300px; gap: var(--space-5); align-items: start; }
  .detail__main { min-width: 0; }
  .d-head { border-bottom: 1px solid var(--border); padding-bottom: var(--space-3); margin-bottom: var(--space-4); }
  .d-id { font-family: var(--font-display); font-weight: 700; font-size: var(--text-2xl); letter-spacing: var(--tracking-tight); color: var(--accent-gold); margin: 0; }
  .d-biz { font-family: var(--font-display); font-style: italic; color: var(--fg-secondary); margin: 4px 0; }
  .d-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 10px; color: var(--fg-subtle); text-transform: uppercase; letter-spacing: .1em; }

  .block { margin-bottom: var(--space-4); }
  .block__head { display: flex; align-items: baseline; justify-content: space-between; }
  .block__title { font-family: var(--font-display); font-weight: 700; font-size: var(--text-md); letter-spacing: .06em; text-transform: uppercase; color: var(--fg-primary); margin: 0 0 var(--space-3); padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle); flex: 1; }
  .prog-sum { font-size: 11px; color: var(--fg-subtle); margin-left: 12px; }

  /* Stepper SVG */
  .stepper { width: 100%; height: auto; display: block; max-width: 100%; }
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
  .ms__sel { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); padding: 6px 8px; font-size: var(--text-xs); cursor: pointer; flex: 0 0 auto; }
  .ms__sel:focus { outline: none; border-color: var(--accent-gold); }

  .ms-add { display: flex; gap: 8px; }
  .ms-add .inp { flex: 1; }

  .inp { width: 100%; padding: 9px 12px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); font-family: var(--font-body); font-size: var(--text-sm); outline: none; }
  .inp:focus { border-color: var(--accent-gold); }

  .detail__aside { position: sticky; top: var(--space-3); display: flex; flex-direction: column; gap: var(--space-3); }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4); }
  .card__t { font-family: var(--font-mono); font-size: 9px; letter-spacing: .18em; text-transform: uppercase; color: var(--accent-gold); margin: 0 0 var(--space-3); }
  .kv { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--border-subtle); }
  .kv:last-child { border-bottom: 0; }
  .kv__k { font-size: var(--text-xs); color: var(--fg-secondary); }
  .kv__v { font-size: var(--text-sm); color: var(--fg-primary); text-align: right; }

  .b { display: inline-flex; align-items: center; justify-content: center; gap: 5px; border-radius: var(--radius-md); padding: 9px 12px; font-family: var(--font-mono); font-size: 9px; letter-spacing: .12em; text-transform: uppercase; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--fg-secondary); transition: all var(--duration-fast); }
  .b:hover:not(:disabled) { border-color: var(--accent-gold); color: var(--fg-primary); }
  .b--primary { background: var(--accent-gold); border-color: var(--accent-gold); color: var(--fg-inverse); font-weight: 700; }
  .b--primary:hover:not(:disabled) { background: var(--accent-gold-hover); }
  .b.full { width: 100%; }
  .b:disabled { opacity: .5; cursor: not-allowed; }

  .mono { font-family: var(--font-mono); }
  .gold { color: var(--accent-gold); }
  .teal { color: var(--accent-teal); }
  .dim { color: var(--fg-subtle); white-space: nowrap; }

  .msg { margin-top: 8px; font-family: var(--font-mono); font-size: 10px; color: var(--color-error); min-height: 12px; }
  .msg.ok { color: var(--accent-teal); }

  /* Modal nuevo proyecto */
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: var(--space-4); }
  .modal { width: 100%; max-width: 440px; background: var(--bg-card); border: 1px solid var(--border-accent); border-radius: var(--radius-lg); padding: var(--space-5); }
  .modal__t { font-family: var(--font-display); font-weight: 700; font-size: var(--text-lg); color: var(--accent-gold); margin: 0 0 var(--space-3); }
  .fl { display: block; font-family: var(--font-mono); font-size: 9px; letter-spacing: .15em; text-transform: uppercase; color: var(--accent-gold); margin: 10px 0 4px; }
  .modal__act { display: flex; justify-content: flex-end; gap: 8px; margin-top: var(--space-4); }

  @media (max-width: 880px) { .detail { grid-template-columns: 1fr; } .detail__aside { position: static; } }
</style>
