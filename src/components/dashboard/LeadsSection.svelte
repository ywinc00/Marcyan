<script>
  // ─────────────────────────────────────────────────────────────
  // Leads (#/leads): atender y convertir.
  //   · Lista con búsqueda, pastillas de estado y origen con su recuento,
  //     y paginación; todo en la URL (#/leads?estado=nuevo&origen=chat&q=ana
  //     &pagina=2): recargar, Atrás y los enlaces conservan la vista (E-06).
  //   · Interés y mensaje por separado (CRM-01); negocio y ciudad visibles.
  //   · Estado que cambia sin recargar la tabla y con error visible (CRM-08,
  //     SH-19); "Convertido" abre la conversión de verdad (CRM-02).
  //   · Ficha en #/leads/<ref> (crm/LeadDetail.svelte, CRM-07).
  //   · Exportar = TODOS los leads del filtro, desde el servidor (CRM-17).
  //   · En el móvil la tabla pasa a tarjetas con el estado a la vista (SH-04).
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
  import LeadStatusSelect from './crm/LeadStatusSelect.svelte';
  import LeadDetail from './crm/LeadDetail.svelte';
  import { api, errorMessage, isSessionError } from './lib/api.js';
  import { loadLeads as refreshHomeLeads } from './lib/store.svelte.js';
  import { route, href, setQuery, setSub } from './lib/router.svelte.js';
  import { fmtDate, fmtDateTime } from './lib/dates.js';
  import {
    LEAD_STATUSES, LEAD_SOURCES, LEAD_PAGE, leadFiltersFromQuery, leadQueryPatch, leadApiParams,
    leadFilterPhrase, leadSource, initials, monoColor,
  } from './crm/crm.js';

  const COLUMNS = [
    { key: 'contact', label: 'Contacto', primary: true },
    { key: 'source', label: 'Origen' },
    { key: 'message', label: 'Mensaje', wide: true },
    { key: 'date', label: 'Fecha' },
    { key: 'status', label: 'Estado', action: true },
  ];

  // ── Ruta ─────────────────────────────────────────────────────
  const leadRef = $derived(route.section === 'leads' && route.sub[0] ? String(route.sub[0]).toUpperCase() : '');
  const filters = $derived(leadFiltersFromQuery(route.query));
  const filterKey = $derived(JSON.stringify(filters));
  const filtered = $derived(!!(filters.status || filters.source || filters.search));

  // En pantallas estrechas el texto de ayuda del buscador se cortaba: allí va uno corto.
  let narrow = $state(false);
  $effect(() => {
    const mq = window.matchMedia('(max-width: 719px)');
    narrow = mq.matches;
    const on = (e) => { narrow = e.matches; };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  });

  // ── Lista ────────────────────────────────────────────────────
  let rows = $state([]);
  let total = $state(0);
  let stats = $state(null);
  let facets = $state(null);
  let loading = $state(false);
  let loaded = $state(false);
  let error = $state('');
  let loadedKey = '';
  let seq = 0;
  let pendingConvert = $state('');   // "Convertido" elegido en la tabla → abre la conversión en la ficha

  // Sin la migración 011 las filas no traen converted_client_id: "Convertido"
  // se guarda como antes (solo la etiqueta).
  const crmReady = $derived(!rows.length || 'converted_client_id' in rows[0]);

  async function loadList() {
    const my = ++seq;
    const key = filterKey;
    loading = true; error = '';
    try {
      const j = await api('/api/admin/leads?' + leadApiParams(filters).toString());
      if (my !== seq) return;
      rows = j.rows || [];
      total = j.total || 0;
      stats = j.stats || null;
      facets = j.facets || null;
      loaded = true;
      loadedKey = key;
      // Página vacía tras borrar o filtrar (p. ej. ?pagina=9): vuelve a la última con datos.
      if (!rows.length && total > 0 && filters.page > 1) setQuery(leadQueryPatch({ page: Math.ceil(total / LEAD_PAGE) }));
    } catch (e) {
      if (my !== seq) return;
      if (!isSessionError(e)) error = errorMessage(e, 'No se pudieron cargar los leads.');
    } finally {
      if (my === seq) loading = false;
    }
  }

  // Recarga al cambiar los filtros de la URL (no al abrir o cerrar la ficha).
  $effect(() => {
    const key = filterKey;
    if (leadRef) return;
    untrack(() => { pendingConvert = ''; if (key !== loadedKey) loadList(); });
  });

  // Tras un cambio en la ficha la lista se vuelve a pedir al volver, y el
  // inicio (leads recientes) se refresca en silencio.
  function markStale() { loadedKey = ''; refreshHomeLeads(); }

  // Solo recuentos (sin tocar las filas: nada salta ni parpadea).
  async function refreshCounts() {
    try {
      const p = leadApiParams(filters); p.set('limit', '1'); p.set('offset', '0');
      const j = await api('/api/admin/leads?' + p.toString());
      stats = j.stats || stats; facets = j.facets || facets;
    } catch (e) {
      if (!isSessionError(e)) console.warn('[leads] recuentos', e?.message);
    }
    refreshHomeLeads();
  }

  function onRowSaved(updated) {
    const i = rows.findIndex((r) => r.ref_id === updated.ref_id);
    if (i >= 0) rows[i] = { ...rows[i], ...updated };
    refreshCounts();
  }
  function openConvert(lead) { pendingConvert = lead.ref_id; setSub([lead.ref_id]); }

  // ── Filtros ──────────────────────────────────────────────────
  let searchText = $state('');
  $effect(() => { const s = filters.search; untrack(() => { if (s !== searchText.trim()) searchText = s; }); });
  let timer = null;
  function onSearchInput(e) {
    searchText = e.currentTarget.value;
    clearTimeout(timer);
    timer = setTimeout(() => setQuery(leadQueryPatch({ search: searchText.trim(), page: 1 })), 300);
  }
  function clearFilters() { searchText = ''; setQuery({ estado: '', origen: '', q: '', pagina: '' }); }
  onDestroy(() => clearTimeout(timer));

  const statusPills = $derived([
    { id: '', label: 'Todos', count: facets?.status?.all },
    ...LEAD_STATUSES.map((s) => ({ id: s.id, label: s.plural, count: facets?.status?.[s.id] })),
  ]);
  const sourceOptions = $derived([
    { id: '', label: 'Todos los orígenes', count: facets?.source?.all },
    ...LEAD_SOURCES.map((s) => ({ id: s.id, label: s.label, count: facets?.source?.[s.id] })),
  ]);

  const exportHref = $derived('/api/admin/export?' + new URLSearchParams([['type', 'leads'], ...leadApiParams(filters, { paged: false })]).toString());
  const conversion = $derived(stats && stats.total ? Math.round((stats.converted / stats.total) * 100) : 0);
</script>

{#if leadRef}
  {#key leadRef}
    <LeadDetail refId={leadRef} autoConvert={pendingConvert === leadRef} onchanged={markStale} />
  {/key}
{:else}
  <PageHeader title="Leads">
    {#snippet actions()}
      <a class="b" href={exportHref} download title="Descarga en CSV todos los leads del filtro actual">
        <Icon name="download" size={16} />Exportar{filtered ? ' filtrados' : ''}
      </a>
      <button type="button" class="b b--ghost" onclick={loadList} disabled={loading}>
        <Icon name="refresh" size={16} />{loading && loaded ? 'Actualizando…' : 'Actualizar'}
      </button>
    {/snippet}
  </PageHeader>

  {#if stats}
    <KpiGrid count={3} label="Resumen de leads">
      <Kpi label="Este mes" value={stats.this_month ?? 0} note={`${stats.prev_month ?? 0} el mes pasado`} />
      <Kpi label="Por atender" value={stats.new ?? 0} tone={stats.new ? 'accent' : ''} href={href('leads', [], { estado: 'nuevo' })} note="Nuevos sin contactar todavía" />
      <Kpi label="Convertidos" value={stats.converted ?? 0} note={`${conversion} % de ${stats.total} leads`} />
    </KpiGrid>
  {/if}

  <div class="toolbar">
    <FilterPills label="Filtrar por estado" options={statusPills} value={filters.status}
      onchange={(id) => setQuery(leadQueryPatch({ status: id, page: 1 }))} />
    <div class="toolbar__row">
      <label class="search">
        <span class="sr-only">Buscar leads</span>
        <span class="search__icon"><Icon name="search" size={16} /></span>
        <input class="ui-input search__input" type="search" placeholder={narrow ? 'Buscar leads' : 'Buscar por nombre, correo, teléfono, negocio, ciudad o mensaje'}
          value={searchText} oninput={onSearchInput} autocomplete="off" />
      </label>
      <label class="origin">
        <span class="sr-only">Origen</span>
        <select class="ui-input origin__sel" value={filters.source}
          onchange={(e) => setQuery(leadQueryPatch({ source: e.currentTarget.value, page: 1 }))}>
          {#each sourceOptions as o (o.id)}<option value={o.id}>{o.label}{o.count != null ? ` (${o.count})` : ''}</option>{/each}
        </select>
      </label>
    </div>
  </div>

  {#if error && !loaded}
    <ErrorState title="No se pudieron cargar los leads" message={error} onretry={loadList} />
  {:else if !loaded}
    <LoadingState loading={true} rows={6} height={52} label="Cargando leads" />
  {:else}
    {#if error}
      <div class="stale"><ErrorState compact title="No se pudo actualizar la lista" message={error} onretry={loadList} /></div>
    {/if}
    {#if rows.length === 0}
      <div class="ui-card">
        {#if filtered}
          <EmptyState art="inbox" title={`No hay ${leadFilterPhrase(filters)}`} text="Prueba con otro estado u origen, o quita la búsqueda.">
            {#snippet action()}<button type="button" class="b" onclick={clearFilters}>Quitar filtros</button>{/snippet}
          </EmptyState>
        {:else}
          <EmptyState art="inbox" title="Sin leads todavía" text="Cuando alguien use el formulario de contacto, el chatbot o el diagnóstico gratis, aparecerá aquí." />
        {/if}
      </div>
    {:else}
      <div class="list" class:is-busy={loading} aria-busy={loading}>
        <DataTable columns={COLUMNS} {rows} rowKey="ref_id" caption="Leads">
          {#snippet cell(lead, col)}
            {#if col.key === 'contact'}
              {@const who = lead.name || lead.business_name || lead.email}
              <a class="c-cell" href={href('leads', [lead.ref_id], route.query)}>
                {#if who}
                  <span class="mono-av" style="background:{monoColor(who)}" aria-hidden="true">{initials(who)}</span>
                {:else}
                  <!-- Sin nombre, negocio ni correo: icono neutro, nunca letras sacadas del código (A2-R8) -->
                  <span class="mono-av mono-av--anon" aria-hidden="true"><Icon name="clientes" size={14} /></span>
                {/if}
                <span class="c-text">
                  <span class="c-name">{lead.name || 'Sin nombre'}</span>
                  <span class="c-sub">{[lead.business_name, lead.email || lead.phone].filter(Boolean).join(' · ') || lead.ref_id}</span>
                </span>
              </a>
            {:else if col.key === 'source'}
              <StatusChip tone={leadSource(lead.source).tone} label={leadSource(lead.source).label} />
            {:else if col.key === 'message'}
              {#if lead.interest || lead.message}
                <div class="msg">
                  {#if lead.interest}<span class="msg__interest" title={lead.interest}>{lead.interest}</span>{/if}
                  {#if lead.message}<span class="msg__text" title={lead.message}>{lead.message}</span>{/if}
                </div>
              {:else}
                <span class="none">Sin mensaje</span>
              {/if}
            {:else if col.key === 'date'}
              <span class="dim" title={fmtDateTime(lead.created_at)}>{fmtDate(lead.created_at)}</span>
            {:else if col.key === 'status'}
              <LeadStatusSelect {lead} {crmReady} onsaved={onRowSaved} onconvert={openConvert} />
            {/if}
          {/snippet}
        </DataTable>
      </div>
      <Pager page={filters.page} size={LEAD_PAGE} {total} onpage={(p) => setQuery(leadQueryPatch({ page: p }))} />
    {/if}
  {/if}
{/if}

<style>
  .stale { margin-bottom: var(--space-3); }
  .toolbar { display: flex; flex-direction: column; gap: var(--space-3); margin-bottom: var(--space-4); }
  .toolbar__row { display: flex; gap: var(--space-2); flex-wrap: wrap; }
  .search { position: relative; flex: 1 1 320px; min-width: 0; }
  .search__icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); display: inline-flex; color: var(--fg-subtle); pointer-events: none; }
  .search__input { padding-left: 36px; background: var(--bg-card); }
  .origin { flex: 0 1 240px; min-width: 200px; }
  .origin__sel {
    appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 30px; background-color: var(--bg-card);
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b8b95' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>");
    background-repeat: no-repeat; background-position: right 11px center;
  }
  .list { transition: opacity var(--duration-fast); }
  .list.is-busy { opacity: .6; }

  .c-cell { display: flex; align-items: center; gap: 10px; min-width: 0; color: inherit; text-decoration: none; border-radius: var(--radius-sm); }
  .c-cell:hover .c-name { text-decoration: underline; text-underline-offset: 3px; }
  .c-text { min-width: 0; display: flex; flex-direction: column; }
  .c-name { color: var(--fg-primary); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .c-sub { font-size: var(--dash-caption); color: var(--fg-subtle); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; }
  .mono-av { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: 0 0 auto; border-radius: var(--radius-pill); color: #fff; font-family: var(--font-display); font-size: 11px; font-weight: 700; line-height: 1; }
  .mono-av--anon { background: var(--bg-elevated); color: var(--fg-secondary); border: 1px solid var(--border-strong); }
  .dim { color: var(--fg-subtle); white-space: nowrap; font-size: var(--dash-small); font-variant-numeric: tabular-nums; }
  .none { color: var(--fg-subtle); }

  /* Interés y mensaje SIEMPRE por separado (CRM-01): el interés en una línea
     de apoyo y el mensaje debajo; el texto completo está en la ficha. */
  .msg { display: flex; flex-direction: column; gap: 2px; max-width: 360px; min-width: 0; }
  .msg__interest { font-size: var(--dash-caption); color: var(--fg-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .msg__text { color: var(--fg-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .msg__interest:only-child { font-size: var(--dash-body); color: var(--fg-secondary); }

  @media (max-width: 719px) {
    .origin { flex: 1 1 100%; }
    .msg { max-width: none; }
    .msg__interest { white-space: normal; overflow-wrap: anywhere; }
    .msg__text { white-space: normal; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; }
    .c-sub { max-width: none; }
  }
</style>
