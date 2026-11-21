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
  import KpiSkeleton from './ui/KpiSkeleton.svelte';
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
  import PipelineTable from './crm/PipelineTable.svelte';
  import { api, errorMessage, isSessionError } from './lib/api.js';
  import { loadLeads as refreshHomeLeads } from './lib/store.svelte.js';
  import { route, href, setQuery, setSub } from './lib/router.svelte.js';
  import { fmtDate, fmtDateTime } from './lib/dates.js';
  import {
    LEAD_SOURCES, LEAD_PAGE, OPEN_STATUSES, leadFiltersFromQuery, leadQueryPatch, leadApiParams,
    leadFilterPhrase, leadSource, initials, monoColor, isPipelineView, todayCounts, filterPipeline, money, leadStatus,
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
  // «En curso» (sin estado en la URL): tabla agrupada por etapas o «Para hoy» (Ventas §1).
  const pipeline = $derived(isPipelineView(filters));

  // En pantallas estrechas el texto de ayuda del buscador se cortaba: allí va uno corto.
  let narrow = $state(false);
  let tiny = $state(false);   // menos de 360: el origen dice solo «Origen»
  $effect(() => {
    const mq = window.matchMedia('(max-width: 1599px)');
    const mqTiny = window.matchMedia('(max-width: 359px)');
    tiny = mqTiny.matches;
    const onTiny = (e) => { tiny = e.matches; };
    mqTiny.addEventListener('change', onTiny);
    narrow = mq.matches;
    const on = (e) => { narrow = e.matches; };
    mq.addEventListener('change', on);
    return () => { mq.removeEventListener('change', on); mqTiny.removeEventListener('change', onTiny); };
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

  // En curso: la lista entera con su propuesta y su siguiente paso, y el embudo (cifras).
  let pipe = $state(null);
  async function loadPipe() {
    const j = await api('/api/admin/proposals?view=pipeline');
    return { leads: j.leads || [], funnel: j.funnel || null };
  }

  async function loadList() {
    const my = ++seq;
    const key = fetchKey;
    const inPipe = pipeline;
    loading = true; error = '';
    try {
      // En curso trae de la lista solo las cifras y los recuentos (limit=1); el embudo
      // se pide siempre, porque sus cifras están arriba en todas las vistas.
      const p = leadApiParams(inPipe ? { ...filters, status: '', page: 1 } : filters);
      if (inPipe) p.set('limit', '1');
      const [j, pj] = await Promise.all([
        api('/api/admin/leads?' + p.toString()),
        loadPipe().catch((e) => { if (inPipe) throw e; console.warn('[leads] embudo', e?.message); return null; }),
      ]);
      if (my !== seq) return;
      rows = inPipe ? [] : (j.rows || []);
      total = j.total || 0;
      stats = j.stats || null;
      facets = j.facets || null;
      pipe = pj || pipe;
      loaded = true;
      loadedKey = key;
      // Página vacía tras borrar o filtrar (p. ej. ?pagina=9): vuelve a la última con datos.
      if (!inPipe && !rows.length && total > 0 && filters.page > 1) setQuery(leadQueryPatch({ page: Math.ceil(total / LEAD_PAGE) }));
    } catch (e) {
      if (my !== seq) return;
      if (!isSessionError(e)) error = errorMessage(e, 'No se pudieron cargar los leads.');
    } finally {
      if (my === seq) loading = false;
    }
  }

  // Recarga al cambiar los filtros de la URL (no al abrir o cerrar la ficha). En En curso,
  // la búsqueda, el origen y el cambio de vista se aplican sin volver a pedir nada.
  const fetchKey = $derived(pipeline ? 'pipe' : filterKey);
  $effect(() => {
    const key = fetchKey;
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
    if (pipeline) { loadList(); refreshHomeLeads(); return; }   // la fila cambia de sección o sale de En curso
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
  let searchOpen = $state(false);
  let searchEl = $state(null);
  const searchShown = $derived(searchOpen || !!searchText.trim());
  function openSearch() { searchOpen = true; queueMicrotask(() => searchEl?.focus()); }
  function clearFilters() { searchText = ''; setQuery({ estado: '', origen: '', q: '', pagina: '' }); }
  onDestroy(() => clearTimeout(timer));

  // En curso (las cuatro etapas abiertas), luego los cerrados y apartados, y Todos al final.
  const openCount = $derived(facets?.status ? OPEN_STATUSES.reduce((s, k) => s + (Number(facets.status[k]) || 0), 0) : null);
  const statusPills = $derived([
    { id: '', label: 'En curso', count: openCount },
    ...['converted', 'lost', 'archived', 'test', 'spam'].map((id) => ({ id, label: leadStatus(id).plural, count: facets?.status?.[id] })),
    { id: 'all', label: 'Todos', count: facets?.status?.all },
  ]);
  const pillValue = $derived(filters.all ? 'all' : filters.status);
  const pipeRows = $derived(pipe ? filterPipeline(pipe.leads, filters) : []);
  const counts = $derived(pipe ? todayCounts(pipe.leads) : { due: 0, late: 0 });
  const proposed = $derived(pipe?.funnel?.proposed || null);
  function setView(v) { setQuery(leadQueryPatch({ status: '', view: v, page: 1 })); }
  const sourceOptions = $derived([
    { id: '', label: tiny ? 'Origen' : narrow ? 'Origen: todos' : 'Todos los orígenes', count: narrow ? null : facets?.source?.all },
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
    {#snippet badge()}
      <!-- Por etapas · Para hoy (I-06): la misma tabla de En curso, agrupada de dos maneras. -->
      <span class="views">
        <span class="seg" role="group" aria-label="Ver En curso">
          <button type="button" aria-pressed={pipeline && filters.view === 'stages'} onclick={() => setView('stages')}>Por etapas</button>
          <button type="button" aria-pressed={pipeline && filters.view === 'today'} onclick={() => setView('today')}>
            Para hoy{#if pipe}<span class="seg__n">{counts.due}</span>{/if}
          </button>
        </span>
        {#if counts.late}<span class="late">{counts.late} {counts.late === 1 ? 'atrasado' : 'atrasados'}</span>{/if}
      </span>
    {/snippet}
    {#snippet actions()}
      <!-- En el teléfono quedan solo los iconos, junto al título (el texto sigue para lectores de pantalla). -->
      <a class="b act" href={exportHref} download title="Descarga en CSV todos los leads del filtro actual">
        <Icon name="download" size={16} /><span class="act__t">Exportar{filtered ? ' filtrados' : ''}</span>
      </a>
      <button type="button" class="b b--ghost act" onclick={loadList} disabled={loading} title="Actualizar">
        <Icon name="refresh" size={16} /><span class="act__t">{loading && loaded ? 'Actualizando…' : 'Actualizar'}</span>
      </button>
    {/snippet}
  </PageHeader>

  <!-- Primera carga: hueco de las cifras para que la lista no baje al llegar (E-09). -->
  {#snippet kpiSkel()}<KpiSkeleton labels={['Este mes', 'Por atender', 'Propuestas abiertas', 'Ganados']} notes={['en el mes pasado', 'Nuevos sin contactar todavía', 'con la opción recomendada', 'del total de contactos']} />{/snippet}
  <LoadingState loading={loading && !loaded} skeleton={kpiSkel} label="Cargando las cifras de leads">
  {#if stats}
    <div class="kpi-cards">
      <KpiGrid count={4} label="Resumen de leads">
        <Kpi label="Este mes" value={stats.this_month ?? 0} art="inbox" note={`vs. ${stats.prev_month ?? 0} el mes anterior`} />
        <Kpi label="Por atender" value={stats.new ?? 0} art="bell" tone={stats.new ? 'accent' : ''} href={href('leads', [], { estado: 'nuevo' })} note="Nuevos sin contactar todavía" />
        <Kpi label="Propuestas abiertas" value={proposed ? money(proposed.project_cents) : '—'} art="coins"
          note={!proposed ? 'Sin datos del embudo' : proposed.open ? `${proposed.open}\u00a0${proposed.open === 1 ? 'propuesta' : 'propuestas'}${proposed.monthly_cents ? ` +\u00a0${money(proposed.monthly_cents)}/mes` : ''}` : 'Ninguna enviada ahora'} />
        <Kpi label="Ganados" value={stats.converted ?? 0} art="check" note={`${conversion} % de ${stats.total} contactos`} />
      </KpiGrid>
    </div>
    <!-- Teléfono: las cuatro cifras en una línea, para que la lista asome en la primera pantalla (boceto aprobado). -->
    <p class="kpi-line">
      <span><b>{stats.this_month ?? 0}</b> este mes</span>
      <a href={href('leads', [], { estado: 'nuevo' })}><b>{stats.new ?? 0}</b> por atender</a>
      {#if proposed}<span><b>{money(proposed.project_cents)}</b> propuesto</span>{/if}
      <span><b>{stats.converted ?? 0}</b> {stats.converted === 1 ? 'ganado' : 'ganados'}</span>
    </p>
  {/if}
  </LoadingState>

  <div class="toolbar">
    <FilterPills label="Filtrar por estado" options={statusPills} value={pillValue} pending={loading && !loaded}
      onchange={(id) => setQuery(leadQueryPatch({ status: id, page: 1 }))} />
    <div class="toolbar__row">
      <!-- Entre 1366 y 1599 el buscador es un botón que se despliega: así filtros, buscador y
           origen caben en una fila y la tabla gana una fila a la vista. -->
      <button type="button" class="b b--ghost search-btn" class:is-hidden={searchShown} aria-label="Buscar leads" title="Buscar"
        aria-expanded={searchShown} onclick={openSearch}><Icon name="search" size={16} /></button>
      <label class="search" class:is-open={searchShown}>
        <span class="sr-only">Buscar leads</span>
        <span class="search__icon"><Icon name="search" size={16} /></span>
        <input class="ui-input search__input" type="search" placeholder={narrow ? 'Buscar leads' : 'Buscar por nombre, correo, teléfono, negocio, ciudad o mensaje'}
          value={searchText} oninput={onSearchInput} onblur={() => { if (!searchText.trim()) searchOpen = false; }} bind:this={searchEl} autocomplete="off" />
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
    <LoadingState loading={true} rows={10} height={54} head={40} gap={1} movil={233} label="Cargando leads" />
  {:else}
    {#if error}
      <div class="stale"><ErrorState compact title="No se pudo actualizar la lista" message={error} onretry={loadList} /></div>
    {/if}
    {#if pipeline}
      {#if !pipe}
        <LoadingState loading={true} rows={8} height={54} head={40} gap={1} movil={64} label="Cargando los contactos en curso" />
      {:else if pipeRows.length === 0}
        <div class="ui-card">
          {#if filters.search || filters.source}
            <EmptyState art="inbox" title={`No hay ${leadFilterPhrase(filters).replace(/^leads/, 'contactos en curso')}`} text="Prueba con otro origen o quita la búsqueda.">
              {#snippet action()}<button type="button" class="b" onclick={clearFilters}>Quitar filtros</button>{/snippet}
            </EmptyState>
          {:else}
            <EmptyState art="inbox" title="Nada en curso" text="Cuando llegue un contacto nuevo o tengas una propuesta abierta, aparecerá aquí, en su etapa." />
          {/if}
        </div>
      {:else}
        <div class="list" class:is-busy={loading} aria-busy={loading}>
          <PipelineTable rows={pipeRows} view={filters.view} {crmReady} onsaved={onRowSaved} onconvert={openConvert} />
        </div>
      {/if}
    {:else if rows.length === 0}
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
                  <span class="mono-av" style="background:{monoColor(lead.ref_id, who)}" aria-hidden="true">{initials(who)}</span>
                {:else}
                  <!-- Sin nombre, negocio ni correo: icono neutro, nunca letras sacadas del código (A2-R8) -->
                  <span class="mono-av mono-av--anon" aria-hidden="true"><Icon name="clientes" size={14} /></span>
                {/if}
                <span class="c-text">
                  <span class="c-name">{lead.name || 'Sin nombre'}</span>
                  <span class="c-sub">{[lead.business_name, lead.email || lead.phone].filter(Boolean).join(' · ') || lead.ref_id}</span>
                  <!-- Entre 720 y 1099 px la columna Origen se pliega aquí, bajo el contacto. -->
                  <span class="c-src">{leadSource(lead.source).label}</span>
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
  /* Por etapas · Para hoy (I-06): el mismo control segmentado que Marcy, junto al título. */
  .views { display: inline-flex; align-items: center; gap: var(--space-3); margin-left: var(--space-3); vertical-align: middle; font-size: var(--dash-small); font-weight: 400; letter-spacing: 0; }
  .seg { display: inline-flex; padding: 3px; gap: 2px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); } /* auditoria-ignorar: medidas del segmentado de Marcy, la misma pieza en el panel */
  .seg button { min-height: 32px; padding: 5px 12px; border: 0; border-radius: 7px; background: transparent; color: var(--fg-secondary); font: inherit; font-size: var(--dash-small); font-weight: 500; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; } /* auditoria-ignorar: radio 7 px del segmentado de Marcy, que es la pieza que se repite */
  .seg button:hover { color: var(--fg-primary); }
  .seg button[aria-pressed='true'] { background: var(--surface-3); color: var(--fg-primary); }
  .seg button:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .seg__n { color: var(--fg-subtle); font-variant-numeric: tabular-nums; }
  .late { display: inline-flex; align-items: center; gap: var(--space-2); color: var(--delta-down); white-space: nowrap; }
  .late::before { content: ''; width: 6px; height: 6px; border-radius: var(--radius-pill); background: var(--delta-down); }
  /* Teléfono: el interruptor baja a su propia línea, bajo el título, y no parte sus palabras. */
  .act__t { display: inline; }
  /* Teléfono (E-77): que la lista asome en la primera pantalla. Exportar y Actualizar quedan
     como iconos a la altura del título; el interruptor baja a su línea; los filtros van en
     una sola fila que se desliza (con un fundido que avisa de que hay más) y el buscador
     comparte fila con el origen. */
  @media (max-width: 719px) {
    :global(.ui-page-head:has(.views)) { position: relative; }
    :global(.ui-page-head:has(.views) .ui-page-head__actions) { position: absolute; top: 0; right: 0; }
    :global(.ui-page-title:has(.views)) { flex-wrap: wrap; }
    .views { flex: 1 0 100%; margin: var(--space-1) 0 0; }
    .seg button { white-space: nowrap; }
    .act { min-width: 44px; min-height: 44px; justify-content: center; padding-inline: var(--space-3); }
    .act__t { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .toolbar__row { flex-wrap: nowrap; }
    .toolbar__row .search { flex: 1 1 0; }
    .toolbar__row .origin { flex: 0 1 44%; min-width: 0; }
    .kpi-cards { display: none; }
    .views { flex-wrap: wrap; row-gap: var(--space-2); }
  }
  /* Hasta 1365, las pastillas en una sola fila que se desliza (con un fundido que avisa de
     que hay más) en vez de dejar una sola en la segunda línea. */
  @media (max-width: 1365px) {
    .toolbar :global(.pills) { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding-right: var(--space-5); -webkit-mask-image: linear-gradient(90deg, #000 85%, transparent); mask-image: linear-gradient(90deg, #000 85%, transparent); } /* auditoria-ignorar: el negro de la máscara solo marca la opacidad del fundido, no es un color */
    .toolbar :global(.pills::-webkit-scrollbar) { display: none; }
  }
  /* Teléfono: cuatro cifras en dos columnas, sin que ninguna se quede sola en otra línea. */
  .kpi-line { display: grid; grid-template-columns: repeat(2, max-content); gap: var(--space-1) var(--space-5); margin: 0 0 var(--space-4); font-size: var(--dash-small); color: var(--fg-subtle); }
  .kpi-line b { color: var(--fg-primary); font-weight: 600; font-variant-numeric: tabular-nums; }
  @media (min-width: 720px) { .kpi-line { display: none; } }
  .kpi-line a { color: inherit; text-decoration: underline; text-decoration-color: var(--border-strong); text-underline-offset: 3px; }
  .toolbar { display: flex; flex-direction: column; gap: var(--space-3); margin-bottom: var(--space-4); }
  .toolbar__row { display: flex; gap: var(--space-2); flex-wrap: wrap; }
  .search-btn { display: none; min-width: 40px; justify-content: center; }
  /* Desde 1366: filtros, buscador y origen en una sola fila (la tabla gana una fila a la vista).
     Hasta 1599 el buscador se despliega desde su botón; desde 1600 cabe abierto. */
  @media (min-width: 1366px) {
    .toolbar { flex-direction: row; flex-wrap: wrap; align-items: center; }
    .toolbar__row { flex: 1 1 auto; justify-content: flex-end; flex-wrap: nowrap; }
    .toolbar__row .origin { flex: 0 0 200px; min-width: 0; }
    .toolbar__row .search { flex: 1 1 280px; }
  }
  @media (min-width: 1366px) and (max-width: 1599px) {
    .search-btn { display: inline-flex; }
    .search-btn.is-hidden, .search:not(.is-open) { display: none; }
    .toolbar__row .search { flex: 0 1 240px; }
  }
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
  .c-sub { font-size: var(--dash-caption); color: var(--fg-subtle); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: clamp(120px, 14vw, 300px); }
  .mono-av { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: 0 0 auto; border-radius: var(--radius-pill); color: #fff; font-family: var(--font-display); font-size: 11px; font-weight: 700; line-height: 1; }
  .mono-av--anon { background: var(--bg-elevated); color: var(--fg-secondary); border: 1px solid var(--border-strong); }
  .dim { color: var(--fg-subtle); white-space: nowrap; font-size: var(--dash-small); font-variant-numeric: tabular-nums; }
  .none { color: var(--fg-subtle); }

  /* Interés y mensaje SIEMPRE por separado (CRM-01): el interés en una línea
     de apoyo y el mensaje debajo; el texto completo está en la ficha. */
  .msg { display: flex; flex-direction: column; gap: 2px; max-width: clamp(140px, 18vw, 360px); min-width: 0; }
  .msg__interest { font-size: var(--dash-caption); color: var(--fg-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .msg__text { color: var(--fg-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .msg__interest:only-child { font-size: var(--dash-body); color: var(--fg-secondary); }

  .c-src { display: none; margin-top: 2px; font-family: var(--font-mono); font-size: var(--dash-mono); color: var(--fg-subtle); }
  /* Tableta y portátil estrecho: sin la columna Origen (va bajo el contacto), la
     tabla cabe entera y el estado se ve sin desplazarla (ronda 3 de la crítica). */
  @media (min-width: 720px) and (max-width: 1099px) {
    .list :global(.ui-table:not(.pipe) th:nth-child(2)), .list :global(.ui-table:not(.pipe) td:nth-child(2)) { display: none; }
    .c-src { display: block; }
  }
  /* Teléfono estrecho: el selector de estado baja a su fila, bajo el nombre, que así
     usa todo el ancho de la tarjeta. */
  @media (max-width: 479px) {
    .list :global(.ui-table td.is-primary) { grid-column: 1 / -1; }
    .list :global(.ui-table td.is-action) { grid-column: 1 / -1; grid-row: 2; padding: 0 0 12px; margin: 0 0 4px; justify-content: flex-start; border-bottom: 1px solid var(--border-subtle); }
    .list :global(.ui-table td.is-primary) { border-bottom: 0; padding-bottom: 8px; margin-bottom: 0; }
  }
  @media (max-width: 719px) {
    .msg { max-width: none; }
    .msg__interest { white-space: normal; overflow-wrap: anywhere; }
    .msg__text { white-space: normal; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; }
    .c-sub { max-width: none; white-space: normal; overflow-wrap: anywhere; }
  }
</style>
