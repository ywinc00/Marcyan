<script>
  // Lista de briefs. Filtros, búsqueda y página viven en la URL (E-06,
  // CRM-10): #/briefs?estado=pendiente&buscar=fiesta&pagina=2. Al abrir un
  // brief se conserva la query, así que "Volver" (o Atrás) devuelve la lista
  // tal como estaba y la caja de búsqueda muestra lo que filtra.
  import { untrack } from 'svelte';
  import { api } from '../lib/api.js';
  import { toastError } from '../lib/toast.svelte.js';
  import { fmtDateTime, rel } from '../lib/dates.js';
  import { route, setQuery, href } from '../lib/router.svelte.js';
  import PageHeader from '../ui/PageHeader.svelte';
  import KpiGrid from '../ui/KpiGrid.svelte';
  import Kpi from '../ui/Kpi.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import Icon from '../ui/Icon.svelte';
  import {
    STATUSES, statusLabel, statusTone, statusFromSlug, slugFromStatus,
    FIELDS, valueText, SOURCE_LABEL,
  } from './brief-panel.js';
  import { initials, avatarColor } from './avatar.js';

  const LIMIT = 30;
  const FUNNEL_ORDER = ['pending', 'contacted', 'in_progress', 'completed', 'archived'];

  // ── Estado leído de la URL ─────────────────────────────────
  const status = $derived(statusFromSlug(route.query.estado));
  const search = $derived(String(route.query.buscar || '').slice(0, 200));
  const page = $derived(Math.max(1, parseInt(route.query.pagina, 10) || 1));
  const offset = $derived((page - 1) * LIMIT);

  let stats = $state(null);
  let statsError = $state('');
  let rows = $state([]);
  let total = $state(0);
  let loaded = $state(false);
  let loading = $state(false);
  let error = $state('');
  let reqSeq = 0;

  // La caja de búsqueda refleja la URL (también al volver con Atrás).
  let searchText = $state(untrack(() => search));
  let searchFocused = false;
  let searchTimer;
  $effect(() => {
    const s = search;
    if (!searchFocused) untrack(() => { if (searchText !== s) searchText = s; });
  });

  async function loadStats() {
    statsError = '';
    try { const j = await api('/api/admin/stats'); stats = j.stats || null; }
    catch (e) { statsError = e.message; toastError(e, 'No se pudieron cargar las cifras de briefs.'); }
  }

  async function loadList(st, q, off) {
    const seq = ++reqSeq;
    loading = true; error = '';
    const p = new URLSearchParams();
    if (st) p.set('status', st);
    if (q) p.set('search', q);
    p.set('limit', String(LIMIT)); p.set('offset', String(off));
    try {
      const j = await api('/api/admin/briefs?' + p.toString());
      if (seq !== reqSeq) return;
      rows = j.rows || []; total = j.total || 0; loaded = true;
    } catch (e) {
      if (seq !== reqSeq) return;
      error = e.message;
    } finally {
      if (seq === reqSeq) loading = false;
    }
  }

  $effect(() => { untrack(loadStats); });
  $effect(() => {
    const st = status, q = search, off = offset;
    untrack(() => loadList(st, q, off));
  });

  // Una página que ya no existe (se archivaron briefs) vuelve a la última.
  $effect(() => {
    if (loaded && !loading && !error && rows.length === 0 && total > 0 && page > 1) {
      untrack(() => setQuery({ pagina: Math.ceil(total / LIMIT) > 1 ? Math.ceil(total / LIMIT) : '' }));
    }
  });

  function setStatus(id) { setQuery({ estado: slugFromStatus(id), pagina: '' }); }
  function onSearchInput(e) {
    searchText = e.currentTarget.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setQuery({ buscar: searchText.trim(), pagina: '' }), 300);
  }
  function clearFilters() { searchText = ''; setQuery({ estado: '', buscar: '', pagina: '' }); }
  function goPage(n) { setQuery({ pagina: n > 1 ? n : '' }, { replace: false }); }

  function exportCsv() {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (search) p.set('search', search);
    window.location.href = '/api/admin/export?' + p.toString();
  }

  // Embudo: proporción sobre el máximo, suelo del 28 % (min-width de la pill).
  const funnel = $derived.by(() => {
    if (!stats) return [];
    const counts = FUNNEL_ORDER.map((id) => ({ id, label: statusLabel(id), n: stats[id] ?? 0 }));
    const max = Math.max(1, ...counts.map((c) => c.n));
    return counts.map((c) => ({ ...c, w: Math.max(28, Math.round((c.n / max) * 100)) }));
  });
  const hasPipeline = $derived(funnel.some((f) => f.n > 0));
  const pages = $derived(Math.max(1, Math.ceil(total / LIMIT)));
  const filtered = $derived(!!status || !!search);
  const countFor = (id) => (stats ? (id ? (stats[id] ?? 0) : (stats.total ?? 0)) : null);
  const label = (key, v) => valueText(FIELDS.get(key), v);
</script>

<PageHeader title="Briefs">
  {#snippet actions()}
    <button class="b" type="button" onclick={exportCsv}><Icon name="download" size={16} />Exportar CSV</button>
  {/snippet}
</PageHeader>

{#if stats}
  <div class="kpis">
    <KpiGrid count={4} label="Cifras de briefs">
      <Kpi label="Total briefs" value={stats.total ?? 0} art="folder">
        {#if (stats.this_month ?? 0) > 0}<span class="is-data">+{stats.this_month}</span> este mes{:else}Sin altas este mes{/if}
      </Kpi>
      <Kpi label="Por atender" value={(stats.pending ?? 0) + (stats.contacted ?? 0)} art="bell" note="Pendientes y contactados" />
      <Kpi label="Completados" value={stats.completed ?? 0} art="check">
        {#if (stats.completed_this_month ?? 0) > 0}<span class="is-data">+{stats.completed_this_month}</span> este mes{:else}Ninguno este mes{/if}
      </Kpi>
      <article class="ui-kpi funnel-cell">
        <p class="ui-kpi__label">Briefs por estado</p>
        {#if hasPipeline}
          <div class="funnel">
            {#each funnel as f, i (f.id)}
              <div class="funnel__row">
                <span class="funnel__pill" class:funnel__pill--accent={i === 0} style="--w:{f.w}%">{f.label}</span>
                <span class="funnel__n">{f.n}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="funnel-empty">Aún no hay briefs.</p>
        {/if}
      </article>
    </KpiGrid>
  </div>
{:else if statsError}
  <div class="block"><ErrorState title="No se pudieron cargar las cifras" message={statsError} onretry={loadStats} compact /></div>
{/if}

<div class="filters" role="group" aria-label="Filtrar por estado">
  {#each [{ id: '', label: 'Todos' }, ...STATUSES] as f (f.id)}
    <button type="button" class="pill" aria-pressed={status === f.id} onclick={() => setStatus(f.id)}>
      {f.label}
      {#if countFor(f.id) !== null}<span class="pill__n">{countFor(f.id)}</span>{/if}
    </button>
  {/each}
</div>

<label class="search">
  <span class="search__icon" aria-hidden="true"><Icon name="search" size={16} /></span>
  <span class="sr-only">Buscar briefs</span>
  <input class="ui-input search__input" type="search" placeholder="Buscar negocio, persona o MRC"
    value={searchText} oninput={onSearchInput}
    onfocus={() => (searchFocused = true)} onblur={() => (searchFocused = false)} />
</label>

{#if error}
  <ErrorState title="No se pudo cargar la lista" message={error} onretry={() => loadList(status, search, offset)} />
{:else if !loaded}
  <LoadingState loading={true} label="Cargando briefs">
    {#snippet skeleton()}
      <div class="cards">{#each Array(6) as _, i (i)}<div class="ui-skel skel-card"></div>{/each}</div>
    {/snippet}
  </LoadingState>
{:else if rows.length === 0}
  <div class="ui-card">
    {#if filtered}
      <EmptyState title="Ningún brief coincide"
        text={search ? `No hay briefs ${status ? 'en "' + statusLabel(status).toLowerCase() + '" ' : ''}que contengan "${search}".` : `No hay briefs en "${statusLabel(status).toLowerCase()}".`}>
        {#snippet action()}<button class="b" type="button" onclick={clearFilters}>Ver todos los briefs</button>{/snippet}
      </EmptyState>
    {:else}
      <EmptyState art="folder" title="Todavía no hay briefs"
        text="Cuando un cliente rellene el formulario o lo deje en el chat del sitio, aparecerá aquí con su MRC." />
    {/if}
  </div>
{:else}
  <p class="count" aria-live="polite">{total} {total === 1 ? 'brief' : 'briefs'}{filtered ? ' con estos filtros' : ''}</p>
  <div class="cards" class:is-busy={loading} aria-busy={loading}>
    {#each rows as r (r.project_id)}
      <a class="bcard" href={href('briefs', [r.project_id], route.query)}>
        <div class="bcard__top">
          <span class="avatar" style="background:{avatarColor(r.business_name)}" aria-hidden="true">{initials(r.business_name)}</span>
          <div class="bcard__id">
            <span class="bcard__name">{r.business_name || 'Sin nombre de negocio'}</span>
            <span class="bcard__sub">{r.owner_name || r.email || r.phone || 'Sin contacto'}</span>
          </div>
          <StatusChip tone={statusTone(r.status)} label={statusLabel(r.status)} />
        </div>
        <div class="bcard__meta">
          {#if r.website_type}<span class="meta">{label('website_type', r.website_type)}</span>{/if}
          {#if r.budget_range}<span class="meta meta--num">{label('budget_range', r.budget_range)}</span>{/if}
          {#if r.city_state}<span class="meta meta--soft">{r.city_state}</span>{/if}
          {#if r.source === 'chat' || r.source === 'panel'}<span class="meta meta--soft">{SOURCE_LABEL[r.source]}</span>{/if}
        </div>
        <div class="bcard__foot">
          <span class="mono">{r.project_id}</span>
          <span class="mono soft" title={fmtDateTime(r.created_at)}>Recibido {rel(r.created_at)}</span>
        </div>
      </a>
    {/each}
  </div>
  {#if pages > 1}
    <nav class="pager" aria-label="Páginas de briefs">
      <span class="soft">{offset + 1} a {Math.min(offset + LIMIT, total)} de {total}</span>
      <span class="pager__btns">
        <button class="b" type="button" disabled={page <= 1} onclick={() => goPage(page - 1)}>Anterior</button>
        <button class="b" type="button" disabled={page >= pages} onclick={() => goPage(page + 1)}>Siguiente</button>
      </span>
    </nav>
  {/if}
{/if}

<style>
  /* El embudo es la celda ancha del strip (como en la versión aprobada):
     3 KPIs iguales + embudo 1,35 fr en escritorio ancho. */
  @media (min-width: 1100px) {
    .kpis :global(.ui-kpis[data-count="4"]) { grid-template-columns: repeat(3, minmax(0, 1fr)) 1.35fr; }
  }
  /* Móvil: el total a lo ancho, dos KPIs y el embudo a lo ancho (sin
     huérfanos y sin pastillas cortadas en media columna). */
  @media (max-width: 719px) {
    .kpis :global(.ui-kpis[data-count="4"] > :first-child),
    .kpis :global(.ui-kpis[data-count="4"] > .funnel-cell) { grid-column: 1 / -1; }
  }
  .funnel-cell { display: flex; flex-direction: column; }
  .funnel-empty { margin: 6px 0 0; color: var(--fg-subtle); font-size: var(--dash-small); }
  .block { margin-bottom: var(--space-5); }

  /* Filtros en pastillas (E-06): aria-pressed, número de resultados. */
  .filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: var(--space-3); }
  .pill {
    display: inline-flex; align-items: center; gap: 7px; min-height: 32px; padding: 5px 12px;
    border: 1px solid var(--border); border-radius: var(--radius-pill); background: transparent;
    color: var(--fg-secondary); font-family: var(--font-body); font-size: var(--dash-small); font-weight: 500;
    cursor: pointer; transition: border-color var(--duration-fast), background-color var(--duration-fast), color var(--duration-fast);
  }
  .pill:hover { border-color: var(--border-strong); color: var(--fg-primary); }
  .pill[aria-pressed="true"] { background: var(--accent-gold-dim); border-color: var(--accent-gold-line); color: var(--fg-primary); }
  .pill__n { min-width: 18px; padding: 0 6px; border-radius: var(--radius-pill); background: var(--bg-elevated); color: var(--fg-secondary); font-size: var(--dash-caption); text-align: center; font-variant-numeric: tabular-nums; }
  @media (pointer: coarse) { .pill { min-height: var(--tap-min); } }

  .search { position: relative; display: block; margin-bottom: var(--space-4); }
  .search__icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--fg-subtle); display: inline-flex; pointer-events: none; }
  .search__input { padding-left: 36px; background: var(--bg-card); }

  .count { margin: 0 0 var(--space-3); font-size: var(--dash-small); color: var(--fg-subtle); }

  /* Tarjetas de briefs (aprobadas): rejilla de 14 px, hairline, hover = borde fuerte. */
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(278px, 1fr)); gap: 14px; transition: opacity var(--duration-fast); }
  .cards.is-busy { opacity: .6; }
  .skel-card { height: 156px; border-radius: var(--radius-lg); }
  .bcard {
    display: flex; flex-direction: column; gap: 11px; min-width: 0;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px;
    color: inherit; text-decoration: none;
    transition: background-color var(--duration-fast), border-color var(--duration-fast);
  }
  .bcard:hover { background: var(--bg-elevated); border-color: var(--border-strong); }
  .bcard__top { display: flex; align-items: center; gap: 10px; }
  .bcard__id { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
  .bcard__name { font-size: var(--dash-body); font-weight: 600; color: var(--fg-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bcard__sub { font-size: var(--dash-caption); color: var(--fg-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bcard__meta { display: flex; flex-wrap: wrap; gap: 6px; min-height: 24px; }
  .bcard__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 9px; border-top: 1px solid var(--border-subtle); }

  .avatar { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; flex-shrink: 0; border-radius: var(--radius-md); color: #fff; font-family: var(--font-display); font-weight: 700; font-size: 13px; }
  .meta { display: inline-flex; align-items: center; padding: 3px 9px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-pill); font-size: var(--dash-caption); color: var(--fg-secondary); white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .meta--num { color: var(--fg-primary); font-variant-numeric: tabular-nums; }
  .meta--soft { color: var(--fg-subtle); background: transparent; }
  .mono { font-family: var(--font-mono); font-size: var(--dash-caption); font-variant-numeric: tabular-nums; color: var(--fg-secondary); }
  .soft { color: var(--fg-subtle); }

  .pager { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-4); font-size: var(--dash-small); }
  .pager__btns { display: flex; gap: var(--space-2); }
</style>
