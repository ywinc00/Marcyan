<script>
  // ─────────────────────────────────────────────────────────────
  // Clientes (#/clientes): ver todo de un cliente en un sitio (CRM-03).
  //   · Lista con búsqueda, pastillas de estado con su recuento y
  //     paginación en la URL (#/clientes?estado=inactivo&q=café&pagina=2).
  //     "Todos" = sin archivados; los archivados tienen su pastilla.
  //   · Cada fila: contacto, ciudad, proyectos activos y saldo por cobrar.
  //   · Ficha en #/clientes/<id> (crm/ClientDetail.svelte).
  //   · Alta validada en el servidor y sin duplicar (crm/NewClientDialog).
  // ─────────────────────────────────────────────────────────────
  import { onDestroy, untrack } from 'svelte';
  import PageHeader from './ui/PageHeader.svelte';
  import KpiGrid from './ui/KpiGrid.svelte';
  import Kpi from './ui/Kpi.svelte';
  import DataTable from './ui/DataTable.svelte';
  import StatusChip from './ui/StatusChip.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import LoadingState from './ui/LoadingState.svelte';
  import Icon from './ui/Icon.svelte';
  import FilterPills from './crm/FilterPills.svelte';
  import Pager from './crm/Pager.svelte';
  import ClientDetail from './crm/ClientDetail.svelte';
  import NewClientDialog from './crm/NewClientDialog.svelte';
  import { api, errorMessage, isSessionError } from './lib/api.js';
  import { route, href, setQuery, navigate } from './lib/router.svelte.js';
  import {
    CLIENT_STATUSES, CLIENT_PAGE, clientFiltersFromQuery, clientQueryPatch, clientApiParams,
    clientName, clientStatus, money, initials, monoColor, plural,
  } from './crm/crm.js';

  const COLUMNS = [
    { key: 'client', label: 'Cliente', primary: true },
    { key: 'contact', label: 'Contacto' },
    { key: 'city', label: 'Ciudad' },
    { key: 'projects', label: 'Proyectos' },
    { key: 'balance', label: 'Saldo', align: 'end' },
    { key: 'status', label: 'Estado', action: true },
  ];

  const detailId = $derived(route.section === 'clientes' && route.sub[0] ? String(route.sub[0]) : '');
  const filters = $derived(clientFiltersFromQuery(route.query));
  const filterKey = $derived(JSON.stringify(filters));

  let rows = $state([]);
  let total = $state(0);
  let summary = $state(null);
  let loading = $state(false);
  let loaded = $state(false);
  let error = $state('');
  let loadedKey = '';
  let seq = 0;
  let newOpen = $state(false);

  async function loadList() {
    const my = ++seq;
    const key = filterKey;
    loading = true; error = '';
    try {
      const j = await api('/api/admin/clients?' + clientApiParams(filters).toString());
      if (my !== seq) return;
      rows = j.rows || [];
      total = j.total || 0;
      summary = j.summary || null;
      loaded = true;
      loadedKey = key;
      if (!rows.length && total > 0 && filters.page > 1) setQuery(clientQueryPatch({ page: Math.ceil(total / CLIENT_PAGE) }));
    } catch (e) {
      if (my !== seq) return;
      if (!isSessionError(e)) error = errorMessage(e, 'No se pudieron cargar los clientes.');
    } finally {
      if (my === seq) loading = false;
    }
  }

  $effect(() => {
    const key = filterKey;
    if (detailId) return;
    untrack(() => { if (key !== loadedKey) loadList(); });
  });
  function markStale() { loadedKey = ''; }

  let searchText = $state('');
  $effect(() => { const s = filters.search; untrack(() => { if (s !== searchText.trim()) searchText = s; }); });
  let timer = null;
  function onSearchInput(e) {
    searchText = e.currentTarget.value;
    clearTimeout(timer);
    timer = setTimeout(() => setQuery(clientQueryPatch({ search: searchText.trim(), page: 1 })), 300);
  }
  onDestroy(() => clearTimeout(timer));

  const pills = $derived([
    { id: '', label: 'Todos', count: summary?.current },
    ...CLIENT_STATUSES.map((s) => ({ id: s.id, label: s.plural, count: summary?.[s.id] })),
  ]);
  const filtered = $derived(!!(filters.status || filters.search));
  const emptyTitle = $derived(
    filters.search ? `Ningún cliente${filters.status ? ' ' + clientStatus(filters.status).label.toLowerCase() : ''} coincide con «${filters.search}»`
    : filters.status ? `No hay clientes ${clientStatus(filters.status).plural.toLowerCase()}` : 'Aún no hay clientes');

  function onCreated(c) { markStale(); navigate('clientes', [c.id]); }
</script>

{#if detailId}
  {#key detailId}
    <ClientDetail clientId={detailId} onchanged={markStale} />
  {/key}
{:else}
  <PageHeader title="Clientes">
    {#snippet actions()}
      <button type="button" class="b b--ghost" onclick={loadList} disabled={loading}>
        <Icon name="refresh" size={16} />{loading && loaded ? 'Actualizando…' : 'Actualizar'}
      </button>
      <button type="button" class="b b--primary" onclick={() => (newOpen = true)}>Nuevo cliente</button>
    {/snippet}
  </PageHeader>

  {#if summary}
    <KpiGrid count={3} label="Resumen de clientes">
      <Kpi label="Clientes activos" value={summary.active} note={summary.inactive ? `${plural(summary.inactive, 'inactivo', 'inactivos')} aparte` : 'Ninguno inactivo'} />
      <Kpi label="Con proyecto en curso" value={summary.with_active_projects} tone="data" href={href('progreso')} note="Ver el avance en Progreso" />
      <Kpi label="Saldo por cobrar" value={money(summary.balance_cents)} note="Facturas emitidas sin pagar, sin borradores" />
    </KpiGrid>
  {/if}

  <div class="toolbar">
    <FilterPills label="Filtrar por estado" options={pills} value={filters.status}
      onchange={(id) => setQuery(clientQueryPatch({ status: id, page: 1 }))} />
    <label class="search">
      <span class="sr-only">Buscar clientes</span>
      <span class="search__icon"><Icon name="search" size={16} /></span>
      <input class="ui-input search__input" type="search" placeholder="Buscar por negocio, persona, correo, teléfono, ciudad o código"
        value={searchText} oninput={onSearchInput} autocomplete="off" />
    </label>
  </div>

  {#if error && !loaded}
    <ErrorState title="No se pudieron cargar los clientes" message={error} onretry={loadList} />
  {:else if !loaded}
    <LoadingState loading={true} rows={6} height={52} label="Cargando clientes" />
  {:else}
    {#if error}
      <div class="stale"><ErrorState compact title="No se pudo actualizar la lista" message={error} onretry={loadList} /></div>
    {/if}
    {#if rows.length === 0}
      <div class="ui-card">
        {#if filtered}
          <EmptyState art="users" title={emptyTitle} text="Prueba con otro estado o revisa lo que escribiste.">
            {#snippet action()}<button type="button" class="b" onclick={() => { searchText = ''; setQuery({ estado: '', q: '', pagina: '' }); }}>Quitar filtros</button>{/snippet}
          </EmptyState>
        {:else}
          <EmptyState art="users" title="Aún no hay clientes" text="Da de alta el primero o conviértelo desde un lead o un brief.">
            {#snippet action()}
              <button type="button" class="b" onclick={() => (newOpen = true)}>Nuevo cliente</button>
              <a class="b b--ghost" href={href('leads')}>Ver leads</a>
            {/snippet}
          </EmptyState>
        {/if}
      </div>
    {:else}
      <div class="list" class:is-busy={loading} aria-busy={loading}>
        <DataTable columns={COLUMNS} {rows} rowKey="id" caption="Clientes">
          {#snippet cell(c, col)}
            {#if col.key === 'client'}
              <a class="c-cell" href={href('clientes', [c.id], route.query)}>
                <span class="mono-av" style="background:{monoColor(clientName(c))}" aria-hidden="true">{initials(clientName(c))}</span>
                <span class="c-text">
                  <span class="c-name">{clientName(c)}</span>
                  <span class="c-sub">{[c.business_name && c.owner_name ? c.owner_name : '', c.client_code].filter(Boolean).join(' · ')}</span>
                </span>
              </a>
            {:else if col.key === 'contact'}
              <span class="contact">
                {#if c.email}<span class="contact__l">{c.email}</span>{/if}
                {#if c.phone}<span class="contact__l contact__l--sub">{c.phone}</span>{/if}
                {#if !c.email && !c.phone}<span class="none">Sin datos</span>{/if}
              </span>
            {:else if col.key === 'city'}
              <span class="dim">{c.city_state || 'Sin dato'}</span>
            {:else if col.key === 'projects'}
              <span class="dim">{c.projects_total ? (c.projects_active ? `${c.projects_active} en curso de ${c.projects_total}` : plural(c.projects_total, 'proyecto', 'proyectos')) : 'Ninguno'}</span>
            {:else if col.key === 'balance'}
              <span class="amt" class:amt--zero={!Number(c.balance_cents)}>{money(c.balance_cents)}</span>
            {:else if col.key === 'status'}
              <StatusChip tone={clientStatus(c.status).tone} label={clientStatus(c.status).label} />
            {/if}
          {/snippet}
        </DataTable>
      </div>
      <Pager page={filters.page} size={CLIENT_PAGE} {total} onpage={(p) => setQuery(clientQueryPatch({ page: p }))} />
    {/if}
  {/if}

  <NewClientDialog bind:open={newOpen} oncreated={onCreated} />
{/if}

<style>
  .stale { margin-bottom: var(--space-3); }
  .toolbar { display: flex; flex-direction: column; gap: var(--space-3); margin-bottom: var(--space-4); }
  .search { position: relative; display: block; }
  .search__icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); display: inline-flex; color: var(--fg-subtle); pointer-events: none; }
  .search__input { padding-left: 36px; background: var(--bg-card); }
  .list { transition: opacity var(--duration-fast); }
  .list.is-busy { opacity: .6; }
  .c-cell { display: flex; align-items: center; gap: 10px; min-width: 0; color: inherit; text-decoration: none; }
  .c-cell:hover .c-name { text-decoration: underline; text-underline-offset: 3px; }
  .c-text { min-width: 0; display: flex; flex-direction: column; }
  .c-name { color: var(--fg-primary); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .c-sub { font-size: var(--dash-caption); color: var(--fg-subtle); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mono-av { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: 0 0 auto; border-radius: var(--radius-pill); color: #fff; font-family: var(--font-display); font-size: 11px; font-weight: 700; line-height: 1; }
  .contact { display: flex; flex-direction: column; min-width: 0; }
  .contact__l { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px; color: var(--fg-secondary); }
  .contact__l--sub { font-size: var(--dash-caption); color: var(--fg-subtle); }
  .dim { color: var(--fg-secondary); white-space: nowrap; font-size: var(--dash-small); }
  .none { color: var(--fg-subtle); }
  .amt { color: var(--fg-primary); font-weight: 500; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .amt--zero { color: var(--fg-subtle); font-weight: 400; }
  @media (max-width: 719px) {
    .contact { align-items: flex-end; text-align: right; }
    .contact__l { max-width: 60vw; }
  }
</style>
