<script>
  // ═══ Progreso ═══ (Orbit v2 · A5)
  // Lista de proyectos con KPIs GLOBALES (no los de pantalla, OP-11), filtros
  // en pastillas con su número y la búsqueda en la URL (E-06):
  //   #/progreso?estado=activo&q=web&pagina=2
  // y la ficha de cada proyecto en #/progreso/PRJ-003 (progreso/ProjectDetail).
  // Recargar, Atrás y los enlaces de avisos y correos abren lo mismo.
  import { untrack } from 'svelte';
  import { api } from './lib/api.js';
  import { toast } from './lib/toast.svelte.js';
  import { route, href, setQuery, navigate } from './lib/router.svelte.js';
  import PageHeader from './ui/PageHeader.svelte';
  import KpiGrid from './ui/KpiGrid.svelte';
  import Kpi from './ui/Kpi.svelte';
  import StatusChip from './ui/StatusChip.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import LoadingState from './ui/LoadingState.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import Modal from './ui/Modal.svelte';
  import Icon from './ui/Icon.svelte';
  import ProjectDetail from './progreso/ProjectDetail.svelte';
  import ProjectForm from './progreso/ProjectForm.svelte';
  import {
    P_STATUSES, pStatus, statusFromSlug, slugFromStatus, serviceLabel,
    fmtMoney, monoColor, initials, TONE_COLOR,
  } from './progreso/format.js';

  const LIMIT = 24;

  // ── Ruta ─────────────────────────────────────────────────────
  const detailRef = $derived(route.section === 'progreso' ? (route.sub[0] || '') : '');
  const status = $derived(statusFromSlug(route.query.estado || ''));
  const q = $derived((route.query.q || '').trim());
  const page = $derived(Math.max(1, parseInt(route.query.pagina, 10) || 1));
  const offset = $derived((page - 1) * LIMIT);

  // ── Lista ────────────────────────────────────────────────────
  let rows = $state([]);
  let total = $state(0);
  let summary = $state(null);
  let loading = $state(true);
  let error = $state('');
  let reqSeq = 0;

  async function loadList() {
    const seq = ++reqSeq;
    loading = true; error = '';
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (q) p.set('search', q);
    p.set('limit', LIMIT); p.set('offset', offset);
    try {
      const j = await api('/api/admin/projects?' + p.toString());
      if (seq !== reqSeq) return;          // llegó tarde: hay otra búsqueda más nueva
      rows = j.rows || []; total = j.total || 0; summary = j.summary || null;
    } catch (e) {
      if (seq !== reqSeq) return;
      error = e?.message || 'No se pudieron cargar los proyectos.';
    } finally { if (seq === reqSeq) loading = false; }
  }

  // Carga al entrar en la lista y cada vez que cambian filtro, búsqueda o página.
  $effect(() => {
    if (detailRef) return;
    status; q; offset;
    untrack(() => loadList());
  });

  // ── Búsqueda (escribe en la URL con una pequeña espera) ──────
  let searchText = $state(untrack(() => route.query.q || ''));
  let searchTimer;
  $effect(() => {
    // Atrás/Adelante cambian q: el campo lo refleja.
    const fromUrl = route.query.q || '';
    untrack(() => { if (document.activeElement?.id !== 'prj-search') searchText = fromUrl; });
  });
  function onSearch(e) {
    searchText = e.currentTarget.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setQuery({ q: searchText.trim(), pagina: '' }), 300);
  }
  function setFilter(id) { setQuery({ estado: slugFromStatus(id), pagina: '' }); }
  function clearFilters() { searchText = ''; setQuery({ estado: '', q: '', pagina: '' }); }
  function goPage(n) { setQuery({ pagina: n > 1 ? String(n) : '' }, { replace: false }); }

  // ── KPIs globales ────────────────────────────────────────────
  const by = $derived(summary?.by_status || { active: 0, on_hold: 0, completed: 0, cancelled: 0 });
  const kpiCount = $derived(by.cancelled ? 5 : 4);
  const onHoldCents = $derived(Number(summary?.on_hold_cents) || 0);
  const filtered = $derived(!!(status || q));

  // ── Nuevo proyecto ───────────────────────────────────────────
  let showNew = $state(false);
  let creating = $state(false);
  let createError = $state('');
  function openNew() { createError = ''; showNew = true; }
  async function create(payload) {
    creating = true; createError = '';
    try {
      const j = await api('/api/admin/projects', { method: 'POST', body: payload });
      showNew = false;
      toast(`Proyecto ${j.project?.project_code || ''} creado`);
      if (j.project?.project_code) navigate('progreso', [j.project.project_code]);
      else loadList();
    } catch (e) {
      createError = e?.message || 'No se pudo crear el proyecto.';
    } finally { creating = false; }
  }

  const cardHref = (r) => href('progreso', [r.project_code || String(r.id)], route.query);
</script>

{#if detailRef}
  <ProjectDetail ref={detailRef} />
{:else}
  <PageHeader title="Progreso por proyecto">
    {#snippet actions()}
      <button type="button" class="b b--primary" onclick={openNew}><Icon name="plus" size={16} />Nuevo proyecto</button>
    {/snippet}
  </PageHeader>

  {#if summary && summary.total > 0}
    <div class="pl-kpis">
    <KpiGrid count={kpiCount} label="Resumen de proyectos">
      <Kpi label="Activos" value={by.active} art="rocket" note="en curso ahora" href={href('progreso', [], { estado: 'activo' })} />
      <Kpi label="En pausa" value={by.on_hold} art="pause" note="detenidos por ahora" href={href('progreso', [], { estado: 'pausa' })} />
      <Kpi label="Completados" value={by.completed} art="check" note="entregados" href={href('progreso', [], { estado: 'completado' })} />
      <Kpi label="Valor en cartera" value={fmtMoney(summary.active_cents)} art="coins" tone="data"
           note={onHoldCents ? `solo activos, + ${fmtMoney(onHoldCents)} en pausa` : 'solo proyectos activos'} />
      {#if by.cancelled}
        <Kpi label="Cancelados" value={by.cancelled} art="folder" note="archivados" href={href('progreso', [], { estado: 'cancelado' })} />
      {/if}
    </KpiGrid>
    </div>
  {/if}

  {#if !summary || summary.total > 0 || error}
    <div class="pl-tools">
      <div class="pl-pills" role="group" aria-label="Filtrar por estado">
        <button type="button" class="pl-pill" aria-pressed={!status} onclick={() => setFilter('')}>
          Todos{#if summary}<span class="pl-pill__n">{summary.total}</span>{/if}
        </button>
        {#each P_STATUSES as s (s.id)}
          <button type="button" class="pl-pill" aria-pressed={status === s.id} onclick={() => setFilter(s.id)}>
            {s.label}{#if summary}<span class="pl-pill__n">{by[s.id] || 0}</span>{/if}
          </button>
        {/each}
      </div>
      <div class="pl-search">
        <Icon name="search" size={16} />
        <label class="sr-only" for="prj-search">Buscar proyectos</label>
        <input id="prj-search" class="ui-input" type="search" placeholder="Buscar proyecto, cliente o MRC"
               value={searchText} oninput={onSearch} />
      </div>
    </div>
  {/if}

  <LoadingState {loading}>
    {#snippet skeleton()}
      <div class="pl-cards">{#each Array(6) as _, i (i)}<div class="ui-skel" style="height:150px;border-radius:var(--radius-lg)"></div>{/each}</div>
    {/snippet}
    {#if error}
      <ErrorState title="No se pudieron cargar los proyectos" message={error} onretry={loadList} />
    {:else if !rows.length}
      {#if filtered}
        <EmptyState art="folder" title="Ningún proyecto coincide" text="Prueba con otro estado o quita la búsqueda.">
          {#snippet action()}<button type="button" class="b" onclick={clearFilters}>Quitar filtros</button>{/snippet}
        </EmptyState>
      {:else}
        <EmptyState art="rocket" title="Aún no hay proyectos"
          text="Crea el primero con el botón Nuevo proyecto y sigue su avance por hitos: brief, propuesta, diseño, desarrollo y entrega." />
      {/if}
    {:else}
      <p class="sr-only" aria-live="polite">{total} {total === 1 ? 'proyecto' : 'proyectos'}</p>
      <div class="pl-cards">
        {#each rows as r (r.id)}
          {@const st = pStatus(r.status)}
          {@const pct = r.progress || 0}
          {@const tone = pct >= 100 ? 'success' : st.tone}
          <a class="pcard" href={cardHref(r)}>
            <div class="pcard__top">
              <span class="pcard__mono" style={`background:${monoColor(r.client_name || r.name || r.project_code)}`} aria-hidden="true">{initials(r.client_name || r.name)}</span>
              <div class="pcard__hd">
                <span class="pcard__id">{r.project_code || ('PRJ-' + r.id)}{#if r.service_type}<span class="pcard__svc">{' · ' + serviceLabel(r.service_type)}</span>{/if}</span>
                <span class="pcard__name">{r.name || 'Proyecto sin nombre'}</span>
              </div>
              <StatusChip tone={st.tone} label={st.label} />
            </div>
            <div class="pcard__sub">
              <span class="pcard__client">{r.client_name || 'Sin cliente'}</span>
              {#if r.brief_project_id}<span class="pcard__dot" aria-hidden="true">·</span><span>{r.brief_project_id}</span>{/if}
            </div>
            <div class="pcard__prog">
              <div class="pcard__bar" aria-hidden="true"><span style={`width:${Math.max(pct, pct ? 3 : 0)}%;background:${TONE_COLOR[tone]}`}></span></div>
              <span class="pcard__pct" style={`color:${TONE_COLOR[tone]}`}>{pct}%</span>
            </div>
            <div class="pcard__foot">
              <span class="pcard__hit">{r.milestones_done || 0} de {r.milestones_total || 0} hitos</span>
              <span class="pcard__amt">{fmtMoney(r.agreed_amount_cents)}</span>
            </div>
          </a>
        {/each}
      </div>
      {#if total > LIMIT}
        <nav class="pl-pager" aria-label="Páginas de proyectos">
          <span class="pl-pager__txt">{offset + 1} a {Math.min(offset + LIMIT, total)} de {total}</span>
          <span class="pl-pager__btns">
            <button type="button" class="b b--ghost" disabled={page <= 1} onclick={() => goPage(page - 1)}>Anterior</button>
            <button type="button" class="b b--ghost" disabled={offset + LIMIT >= total} onclick={() => goPage(page + 1)}>Siguiente</button>
          </span>
        </nav>
      {/if}
    {/if}
  </LoadingState>
{/if}

<Modal bind:open={showNew} title="Nuevo proyecto" size="md">
  <ProjectForm mode="create" formId="np-form" busy={creating} serverError={createError} onsubmit={create} />
  {#snippet footer()}
    <button type="button" class="b" onclick={() => (showNew = false)} disabled={creating}>Cancelar</button>
    <button type="submit" form="np-form" class="b b--primary" disabled={creating}>{creating ? 'Creando…' : 'Crear proyecto'}</button>
  {/snippet}
</Modal>

<style>
  /* Filtros en pastillas (E-06): estado activo neutro y claro, sin naranja
     (presupuesto del acento, H-07); cada pastilla dice cuántos hay. */
  .pl-tools { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); margin: 0 0 var(--space-4); }
  .pl-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .pl-pill {
    display: inline-flex; align-items: center; gap: 8px; min-height: 34px; padding: 6px 12px;
    border: 1px solid var(--border); border-radius: var(--radius-pill); background: transparent;
    color: var(--fg-secondary); font: inherit; font-size: var(--dash-small); font-weight: 500; cursor: pointer;
    transition: background-color var(--duration-fast), border-color var(--duration-fast), color var(--duration-fast);
  }
  .pl-pill:hover { border-color: var(--border-strong); color: var(--fg-primary); }
  .pl-pill[aria-pressed="true"] { background: var(--surface-3); border-color: var(--border-strong); color: var(--fg-primary); }
  .pl-pill__n { font-size: var(--dash-caption); color: var(--fg-subtle); font-variant-numeric: tabular-nums; }
  .pl-pill[aria-pressed="true"] .pl-pill__n { color: var(--fg-secondary); }
  .pl-search { position: relative; flex: 0 1 340px; min-width: 220px; color: var(--fg-subtle); }
  .pl-search :global(.ui-icon) { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; }
  .pl-search .ui-input { padding-left: 36px; }
  @media (pointer: coarse) { .pl-pill { min-height: var(--tap-min); } }

  /* Tarjetas de proyecto (gramática Orbit conservada: hairline, radio 14,
     monograma; el hover sube borde y superficie). Ahora son enlaces reales
     a la ficha (#/progreso/PRJ-…): se abren en otra pestaña y se comparten. */
  .pl-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
  .pcard {
    display: flex; flex-direction: column; gap: 10px; min-width: 0;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg);
    padding: 16px; color: inherit; text-decoration: none;
    transition: border-color var(--duration-fast), background-color var(--duration-fast);
  }
  .pcard:hover { border-color: var(--border-strong); background: var(--bg-elevated); }
  .pcard__top { display: flex; align-items: flex-start; gap: 10px; }
  .pcard__mono {
    width: 34px; height: 34px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
    border-radius: var(--radius-md); color: #fff; font-weight: 700; font-size: 13px; line-height: 1;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.18);
  }
  .pcard__hd { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
  .pcard__id { font-size: var(--dash-caption); color: var(--fg-secondary); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pcard__svc { color: var(--fg-subtle); }
  .pcard__name {
    font-size: var(--dash-card-title); font-weight: 600; color: var(--fg-primary); line-height: 1.3; letter-spacing: -0.01em;
    display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .pcard__sub { display: flex; align-items: center; gap: 6px; font-size: var(--dash-small); color: var(--fg-subtle); min-width: 0; }
  .pcard__client { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pcard__dot { color: var(--fg-subtle); }
  .pcard__prog { display: flex; align-items: center; gap: 10px; margin-top: auto; }
  .pcard__bar { flex: 1; height: 6px; border-radius: var(--radius-pill); background: var(--bg-elevated); overflow: hidden; }
  .pcard:hover .pcard__bar { background: var(--surface-3); }
  .pcard__bar span { display: block; height: 100%; border-radius: inherit; }
  .pcard__pct { font-size: var(--dash-caption); font-weight: 600; width: 38px; text-align: right; font-variant-numeric: tabular-nums; }
  .pcard__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 10px; border-top: 1px solid var(--border-subtle); }
  .pcard__hit { font-size: var(--dash-small); color: var(--fg-secondary); }
  .pcard__amt { font-size: var(--dash-small); font-weight: 600; color: var(--accent-teal); font-variant-numeric: tabular-nums; }

  /* Móvil: en media columna la cifra de dinero no cabe junto a la ilustración;
     se oculta solo esa ilustración (la cifra manda). */
  @media (max-width: 520px) { .pl-kpis :global(.ui-kpi:nth-child(4) .ui-kpi__row > :not(.ui-kpi__num)) { display: none; } }

  .pl-pager { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-top: var(--space-4); }
  .pl-pager__txt { font-size: var(--dash-small); color: var(--fg-subtle); }
  .pl-pager__btns { display: flex; gap: 8px; }

  @media (max-width: 720px) {
    .pl-search { flex: 1 1 100%; }
    .pl-cards { grid-template-columns: 1fr; }
  }
</style>
