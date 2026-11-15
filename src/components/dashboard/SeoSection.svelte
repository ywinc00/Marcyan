<script>
  // ─────────────────────────────────────────────────────────────
  // Sección SEO del panel (A6). "¿Funciona Google y qué traen las páginas?"
  //   · Ruta: #/seo/<id>?dias=7|28|90 (recargar, Atrás y los enlaces abren
  //     el proyecto y el rango concretos).
  //   · Estado real de Google por proyecto y por fuente (SEO-03, SEO-07) y
  //     "Estado de Google" con el diagnóstico y la sincronización de todos
  //     (SEO-01, SEO-17), en seo/SeoStatusDialog.svelte.
  //   · KPIs contra el período previo de verdad, posición ponderada,
  //     "sin configurar" en vez de ceros (SEO-13, SEO-14, SEO-18, SEO-19).
  //   · Gráficos con eje Y, días reales y toque (seo/SeoChart.svelte).
  //   · Sin carreras al cambiar de proyecto (SEO-22).
  // La lógica pura (validación, ventanas, errores en español) está en
  // lib/seo-core.mjs, compartida con el servidor.
  // ─────────────────────────────────────────────────────────────
  import { untrack, onMount } from 'svelte';
  import { api, errorMessage, isSessionError } from './lib/api.js';
  import { route, setSub, setQuery, href } from './lib/router.svelte.js';
  import { toast } from './lib/toast.svelte.js';
  import PageHeader from './ui/PageHeader.svelte';
  import KpiGrid from './ui/KpiGrid.svelte';
  import Kpi from './ui/Kpi.svelte';
  import Card from './ui/Card.svelte';
  import DataTable from './ui/DataTable.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import LoadingState from './ui/LoadingState.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import ConfirmDialog from './ui/ConfirmDialog.svelte';
  import Icon from './ui/Icon.svelte';
  import SeoChart from './seo/SeoChart.svelte';
  import SeoIndexation from './seo/SeoIndexation.svelte';
  import SeoSources from './seo/SeoSources.svelte';
  import SeoProjectForm from './seo/SeoProjectForm.svelte';
  import SeoStatusDialog from './seo/SeoStatusDialog.svelte';
  import { nfmt, pct, pos, dayShort, whenTxt } from './seo/format.js';
  import { RANGE_OPTIONS, DEFAULT_DAYS, delta, buildSeries, globalHealth } from '../../../lib/seo-core.mjs';

  // ── Lista de proyectos ──
  let projects = $state([]);
  let configured = $state(true);
  let listLoading = $state(true);
  let listError = $state('');
  let listLoaded = $state(false);

  // ── Detalle ──
  let detail = $state(null);          // { project, metrics, range, summary, today }
  let detailLoading = $state(false);
  let detailError = $state('');
  let seq = 0;                        // SEO-22: solo vale la última respuesta pedida

  // ── Sincronización de esta sesión (por si la 014 no está aplicada) ──
  let syncingId = $state('');
  let lastState = $state({});         // { [id]: sync_state del último intento }

  // ── Modales ──
  let formOpen = $state(false);
  let formProject = $state(null);
  let statusOpen = $state(false);
  let delOpen = $state(false);
  let deleting = $state(false);

  // ── Ruta ──
  const routeId = $derived(route.sub[0] ? String(route.sub[0]) : '');
  const days = $derived(RANGE_OPTIONS.includes(+route.query.dias) ? +route.query.dias : DEFAULT_DAYS);
  const selected = $derived(projects.find((p) => String(p.id) === routeId) || null);
  const missing = $derived(listLoaded && routeId && !selected);

  async function loadProjects() {
    listError = '';
    try {
      const j = await api('/api/admin/seo/projects');
      projects = j.projects || [];
      configured = j.configured !== false && j.connected !== false;
      listLoaded = true;
    } catch (e) {
      if (!isSessionError(e)) listError = errorMessage(e, 'No se pudieron cargar los proyectos de SEO.');
    } finally { listLoading = false; }
  }
  loadProjects();

  // Sin proyecto en la ruta: el último sincronizado (el que tiene datos), sin
  // ensuciar el historial.
  $effect(() => {
    if (!listLoaded || routeId || !projects.length) return;
    const best = projects.slice().filter((p) => p.active !== false)
      .sort((a, b) => String(b.last_synced_at || '').localeCompare(String(a.last_synced_at || '')))[0] || projects[0];
    untrack(() => setSub([String(best.id)], { replace: true }));
  });

  async function loadDetail(id, d) {
    const my = ++seq;
    detailLoading = true; detailError = '';
    try {
      const j = await api('/api/admin/seo/projects/' + encodeURIComponent(id) + '?days=' + d);
      if (my !== seq) return;            // llegó tarde: ya se pidió otro proyecto o rango
      detail = { project: j.project, metrics: j.metrics, range: j.range, summary: j.summary || {}, today: j.today };
      if (j.configured === false || j.connected === false) configured = false;
    } catch (e) {
      if (my !== seq) return;
      if (!isSessionError(e)) detailError = errorMessage(e, 'No se pudieron cargar los datos del proyecto.');
    } finally { if (my === seq) detailLoading = false; }
  }

  $effect(() => {
    const id = selected ? String(selected.id) : '';
    const d = days;
    if (!id) return;
    untrack(() => {
      // Al cambiar de proyecto no se enseña el anterior bajo el nombre nuevo.
      if (detail && String(detail.project.id) !== id) detail = null;
      loadDetail(id, d);
    });
  });

  function pickProject(e) { const v = e.currentTarget.value; if (v) setSub([v]); }
  function pickDays(n) { setQuery({ dias: n === DEFAULT_DAYS ? '' : n }); }

  // ── Sincronizar un proyecto ("Actualizar ahora") ──
  // A6-R2: si llega otra petición mientras una sync está en curso (p. ej. al
  // guardar una propiedad nueva), no se descarta: se hace al terminar.
  let queuedSync = '';
  async function syncNow(id = selected && selected.id) {
    if (!id) return;
    if (syncingId) { queuedSync = String(id); return; }
    syncingId = String(id);
    try {
      const j = await api('/api/admin/seo/sync', { method: 'POST', body: { id: String(id), days }, acceptErrors: true, timeout: 120000 });
      const r = j.results && j.results[0];
      if (r && r.sync_state) lastState = { ...lastState, [String(id)]: r.sync_state };
      if (!r) toast(j.error || 'No se pudo sincronizar.', { tone: 'error', timeout: 6500 });
      else if (r.status === 'ok') toast('Datos actualizados.');
      else if (r.status === 'partial') toast('Actualizado a medias: una fuente falló. Mira el detalle debajo.', { tone: 'info', timeout: 6500 });
      else toast(r.error || 'La sincronización falló. Mira el detalle debajo.', { tone: 'error', timeout: 6500 });
    } catch (e) {
      if (!isSessionError(e)) toast(errorMessage(e, 'No se pudo sincronizar.'), { tone: 'error', timeout: 6500 });
    } finally {
      syncingId = '';
      await loadProjects();
      if (selected && String(selected.id) === String(id)) await loadDetail(String(id), days);
      const next = queuedSync;
      queuedSync = '';
      if (next) syncNow(next);
    }
  }

  // ── Alta / edición ──
  function openAdd() { formProject = null; formOpen = true; }
  function openEdit() { if (selected) { formProject = selected; formOpen = true; } }
  async function onSaved(p, { cleared, created, syncNow: doSync }) {
    if (cleared && cleared.length && p) { const c = { ...lastState }; delete c[String(p.id)]; lastState = c; }
    await loadProjects();
    if (p && created) setSub([String(p.id)]);
    else if (p) await loadDetail(String(p.id), days);
    if (p && doSync) syncNow(p.id);
  }

  // ── Borrar ──
  async function doDelete() {
    if (!selected) return;
    deleting = true;
    try {
      await api('/api/admin/seo/projects/' + encodeURIComponent(selected.id), { method: 'DELETE' });
      toast('Proyecto eliminado.');
      delOpen = false;
      detail = null;
      await loadProjects();
      setSub([], { replace: true });
    } catch (e) {
      if (!isSessionError(e)) toast(errorMessage(e, 'No se pudo eliminar el proyecto.'), { tone: 'error', timeout: 6500 });
    } finally { deleting = false; }
  }

  // ── Derivados del detalle ──
  const proj = $derived(detail ? detail.project : selected);
  const hasGsc = $derived(Boolean(proj && proj.gsc_site_url));
  const hasGa4 = $derived(Boolean(proj && proj.ga4_property_id));
  const sumG = $derived(detail && detail.summary ? detail.summary.gsc : null);
  const sumA = $derived(detail && detail.summary ? detail.summary.ga4 : null);
  const syncState = $derived(proj ? (proj.sync_state || lastState[String(proj.id)] || null) : null);
  const syncing = $derived(Boolean(proj) && syncingId === String(proj.id));
  // Si la lista no cargó no se sabe el estado: no se pinta ni verde ni rojo.
  const health = $derived(listError ? { tone: 'neutral', label: 'Estado de Google' } : globalHealth(projects, { configured }));

  const gscDaily = $derived(detail ? (detail.metrics.gsc || []).filter((r) => r.kind !== 'top_queries') : []);
  const chartStart = $derived(detail ? detail.range.startDate : '');
  const chartEnd = $derived(detail ? detail.range.endDate : '');
  const clicksSeries = $derived(detail ? buildSeries(gscDaily, 'clicks', chartStart, chartEnd, sumG && sumG.through) : []);
  const imprSeries = $derived(detail ? buildSeries(gscDaily, 'impressions', chartStart, chartEnd, sumG && sumG.through) : []);
  // Días que Search Console aún no publica (normal: 2 o 3) o que faltan por sincronizar.
  const stale = $derived(Boolean(sumG && sumG.lag_days != null && sumG.lag_days > 5));
  const pendingLabel = $derived(stale ? 'Sin sincronizar' : 'Google aún no publica estos días');

  const topQ = $derived(detail && detail.metrics.top_queries ? detail.metrics.top_queries : null);
  const queries = $derived(topQ ? topQ.queries.map((q, i) => ({ ...q, rank: i + 1 })) : []);

  // KPIs
  // Nota corta (cabe en una línea de la cifra): el rango ya se ve arriba, en las pastillas.

  const dClicks = $derived(sumG ? delta(sumG.current.clicks, sumG.previous && sumG.previous.clicks) : null);
  const dImpr = $derived(sumG ? delta(sumG.current.impressions, sumG.previous && sumG.previous.impressions) : null);
  const dPos = $derived(sumG ? delta(sumG.current.position, sumG.previous && sumG.previous.position, { lowerIsBetter: true }) : null);
  const dSess = $derived(sumA ? delta(sumA.current.sessions, sumA.previous && sumA.previous.sessions) : null);
  const showKeyEvents = $derived(Boolean(hasGa4 && sumA && sumA.current.key_events != null && (sumA.current.key_events > 0 || (sumA.previous && sumA.previous.key_events > 0))));
  const dKey = $derived(showKeyEvents ? delta(sumA.current.key_events, sumA.previous && sumA.previous.key_events) : null);
  const kpiCount = $derived(showKeyEvents ? 5 : 4);
  // Sin datos: ¿porque falló la fuente o porque aún no se ha sincronizado?
  const srcFailed = (k) => Boolean(syncState && syncState.sources && syncState.sources[k] && syncState.sources[k].status === 'error');
  const gscEmptyTxt = $derived(srcFailed('gsc') ? 'sin datos: Search Console falló' : 'sin datos todavía');
  const ga4EmptyTxt = $derived(srcFailed('ga4') ? 'sin datos: Analytics falló' : 'sin datos todavía');
  const gscErr = $derived(srcFailed('gsc') ? syncState.sources.gsc.error : null);

  const windowTxt = $derived(sumG ? `${dayShort(sumG.current.start)} al ${dayShort(sumG.current.end)}` : '');
  // A6-R1: si lo guardado no cubre todo el rango, el total es de menos días y se dice.
  const partialG = $derived(Boolean(sumG && sumG.current.complete === false && sumG.current.data_from));
  const partialA = $derived(Boolean(sumA && sumA.current.complete === false && sumA.current.data_from));
  const partialTxt = $derived.by(() => {
    const tail = `: los totales no cubren los ${days} días. Con Actualizar ahora se traen los que faltan.`;
    if (partialG && partialA && sumG.current.data_from === sumA.current.data_from) {
      return `Search Console y Analytics solo tienen datos guardados desde el ${dayShort(sumG.current.data_from)}` + tail;
    }
    const parts = [];
    if (partialG) parts.push(`Search Console solo tiene datos guardados desde el ${dayShort(sumG.current.data_from)}`);
    if (partialA) parts.push(`Analytics desde el ${dayShort(sumA.current.data_from)}`);
    return parts.length ? parts.join(' y ') + tail : '';
  });
  // Título del gráfico: los días que de verdad pinta.
  const chartCap = $derived(sumG ? (partialG ? `Del ${dayShort(sumG.current.data_from)} al ${dayShort(sumG.through)}` : `${days} días hasta el ${dayShort(sumG.through)}`) : '');
  // ── Fase 3: pestañas y Resumen a pantalla ──
  const VIEWS = [{ id: 'resumen', label: 'Resumen' }, { id: 'paginas', label: 'Páginas' }, { id: 'busquedas', label: 'Búsquedas' }];
  const ver = $derived(VIEWS.some((v) => v.id === route.query.ver) ? route.query.ver : 'resumen');
  function pickVer(v) { setQuery({ ver: v === 'resumen' ? '' : v }, { replace: false }); }
  let metric = $state('clicks');       // qué pinta el gráfico del Resumen: un solo gráfico, un solo color
  let fit = $state(false);
  onMount(() => {
    const mq = window.matchMedia('(min-width: 1100px) and (min-height: 700px)');
    const sync = () => (fit = mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  });
  const fitOn = $derived(fit && ver === 'resumen' && Boolean(detail) && (hasGsc || hasGa4));
  // Mejores búsquedas: tantas filas como quepan (34 px + 6 de separación), cinco si la página fluye.
  let qH = $state(0);
  const qMax = $derived(queries.length ? Math.max(...queries.map((q) => Number(q.clicks) || 0)) : 0);
  // Portátil de poco alto (menos de 820): gráfico, indexación y búsquedas en tres columnas.
  let short = $state(false);
  onMount(() => {
    const mq = window.matchMedia('(max-height: 819px)');
    const sync = () => (short = mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  });
  // Filas de 32 px (40 en tres columnas, a dos líneas) más 6 de separación.
  const qRows = $derived(fitOn && qH ? Math.max(1, Math.min(10, Math.floor((qH + 6) / (short ? 46 : 38)))) : 5);
  const qCols = [
    { key: 'query', label: 'Búsqueda', primary: true },
    { key: 'clicks', label: 'Clics', align: 'end' },
    { key: 'impressions', label: 'Impresiones', align: 'end' },
    { key: 'ctr', label: 'CTR', align: 'end' },
    { key: 'position', label: 'Posición', align: 'end' },
  ];
</script>

<div class="seo" class:is-fit={fitOn} class:is-short={fitOn && short}>
<PageHeader title="SEO">
  {#snippet actions()}
    <button type="button" class="b seo-health seo-health--{health.tone}" onclick={() => (statusOpen = true)} aria-haspopup="dialog">
      <span class="seo-health__dot" aria-hidden="true"></span>{health.label}
    </button>
    <button type="button" class="b b--primary" onclick={openAdd}>Nuevo proyecto</button>
  {/snippet}
</PageHeader>

{#snippet kpiNote(d, okTxt, offTxt, isOff)}
  {#if isOff}
    {offTxt}
  {:else if d}
    <span class={d.dir === 'flat' ? '' : d.better ? 'is-up' : 'is-down'}>{d.dir === 'up' ? '↑' : d.dir === 'down' ? '↓' : '→'} {d.txt}</span>
  {:else}
    {okTxt}
  {/if}
{/snippet}

<!-- Huecos con la forma real (pieza E-09): franja de fuentes, cifras y la fila de gráfico e indexación. -->
{#snippet detalleSkel()}
  <div class="seo-stack">
    <div class="ui-skel sk-seo-strip"></div>
    <div class="ui-kpis" data-count="5">{#each [0, 1, 2, 3, 4] as i (i)}<div class="ui-skel sk-seo-kpi"></div>{/each}</div>
    <div class="seo-row"><div class="ui-skel sk-seo-chart"></div><div class="ui-skel sk-seo-chart"></div></div>
  </div>
{/snippet}
{#snippet paginaSkel()}
  <div>
    <div class="seo-bar"><div class="ui-skel sk-seo-bar"></div></div>
    <div class="seo-tabs"><span class="ui-skel sk-seo-tabs"></span></div>
    {@render detalleSkel()}
  </div>
{/snippet}
<LoadingState loading={listLoading} skeleton={paginaSkel} label="Cargando proyectos de SEO">
  {#if listError}
    <ErrorState title="No se pudieron cargar los proyectos" message={listError} onretry={loadProjects} />
  {:else if !projects.length}
    <Card>
      <EmptyState art="medal" title="Todavía no hay proyectos de SEO"
        text="Un proyecto es un sitio que se sigue en Google: guarda su propiedad de Search Console y el ID de Analytics, y cada madrugada se traen sus datos.">
        {#snippet action()}<button type="button" class="b" onclick={openAdd}>Crear el primero</button>{/snippet}
      </EmptyState>
    </Card>
  {:else}
    <!-- Barra de trabajo: proyecto, rango y acciones del proyecto -->
    <div class="seo-bar">
      <label class="seo-bar__pick">
        <span class="sr-only">Proyecto</span>
        <select class="ui-input" value={routeId} onchange={pickProject}>
          {#if missing}<option value={routeId} disabled>Proyecto no encontrado</option>{/if}
          {#each projects as p (p.id)}
            <option value={String(p.id)}>{p.name}{p.client_name && p.client_name !== p.name ? ` · ${p.client_name}` : ''}{p.active === false ? ' (pausado)' : ''}</option>
          {/each}
        </select>
      </label>
      <div class="seo-range" role="group" aria-label="Rango de fechas">
        {#each RANGE_OPTIONS as n (n)}
          <button type="button" class="seo-range__b" aria-pressed={days === n} onclick={() => pickDays(n)}>{n} días</button>
        {/each}
      </div>
      {#if selected}
        <div class="seo-bar__acts">
          <button type="button" class="b" onclick={() => syncNow()} disabled={Boolean(syncingId) || !configured || !(selected.gsc_site_url || selected.ga4_property_id)} title="Actualizar ahora">
            <span class:seo-spin={syncing}><Icon name="refresh" size={16} /></span><span class="seo-bar__txt">{syncing ? 'Actualizando…' : 'Actualizar ahora'}</span>
          </button>
          <button type="button" class="b" onclick={openEdit} aria-label="Editar proyecto"><Icon name="edit" size={16} /><span class="seo-bar__txt" aria-hidden="true">Editar</span></button>
          <button type="button" class="ui-icon-btn seo-del" onclick={() => (delOpen = true)} aria-label="Eliminar proyecto" title="Eliminar proyecto"><Icon name="trash" size={18} /></button>
        </div>
      {/if}
    </div>

    {#if missing}
      <EmptyState title="Ese proyecto ya no existe" text="Puede que se haya eliminado. Elige otro en la lista.">
        {#snippet action()}<button type="button" class="b" onclick={() => setSub([], { replace: true })}>Ver el más reciente</button>{/snippet}
      </EmptyState>
    {:else if selected}
      <!-- Pestañas (fase 3): la primera pantalla resume; las listas largas van aparte. -->
      <div class="seo-tabs">
        <nav class="seo-tabs__nav" aria-label="Partes de SEO">
          {#each VIEWS as v (v.id)}
            <a class="seo-tab" href={href('seo', [routeId], { ...route.query, ver: v.id === 'resumen' ? '' : v.id })} aria-current={ver === v.id ? 'page' : undefined}>{v.label}</a>
          {/each}
        </nav>
        <p class="seo-tabs__meta">
          {#if proj && proj.domain}<span>{proj.domain}</span>{/if}
          {#if sumG}<span title="Search Console publica con 2 o 3 días de retraso">Search Console: {windowTxt}</span>{/if}
          {#if sumA}<span title="Analytics, sin el día de hoy">Analytics: {dayShort(sumA.current.start)} al {dayShort(sumA.current.end)}</span>{/if}
          <span>Cambios vs. {days} días antes</span>
          {#if proj && proj.active === false}<span>Pausado: fuera de la sincronización automática</span>{:else if syncState && syncState.at}<span title="Se sincroniza solo cada madrugada">Actualizado {whenTxt(syncState.at)}</span>{/if}
        </p>
      </div>

      {#if detailError && !detail}
        <ErrorState title="No se pudieron cargar los datos" message={detailError} onretry={() => loadDetail(String(selected.id), days)} />
      {:else}
        <LoadingState loading={detailLoading && !detail} skeleton={detalleSkel} label="Cargando datos del proyecto">
          {#if detail}
            <div class="seo-stack" class:is-reloading={detailLoading}>
              {#if detailError}
                <ErrorState compact title="No se pudo actualizar la vista" message={detailError} onretry={() => loadDetail(String(selected.id), days)} />
              {/if}

              {#if !hasGsc && !hasGa4}
                <Card>
                  <EmptyState art="folder" title="Este proyecto aún no está conectado a Google"
                    text="Añade su propiedad de Search Console, su ID de Analytics o los dos. Después se traen sus datos cada madrugada.">
                    {#snippet action()}<button type="button" class="b" onclick={openEdit}>Añadir los identificadores</button>{/snippet}
                  </EmptyState>
                </Card>
              {:else if ver === 'paginas'}
                <SeoIndexation indexation={detail.metrics.indexation} {hasGsc} state={syncState && syncState.sources ? syncState.sources.indexation : null}
                  {syncing} gscFailed={Boolean(gscErr)} onsync={() => syncNow()} onedit={openEdit} onstatus={() => (statusOpen = true)} />
              {:else if ver === 'busquedas'}
                {#if hasGsc}
                  <Card title="Búsquedas" caption="Search Console">
                    {#snippet actions()}
                      {#if topQ && topQ.range}<span class="seo-cap">{dayShort(topQ.range.startDate)} al {dayShort(topQ.range.endDate)}</span>{/if}
                    {/snippet}
                    {#if queries.length}
                      <div class="seo-q"><DataTable columns={qCols} rows={queries} rowKey="rank" caption="Búsquedas con más clics">
                        {#snippet cell(row, col)}
                          {#if col.key === 'query'}
                            <span class="q"><span class="q__rank">{row.rank}</span><span class="q__text">{row.query || '—'}</span></span>
                          {:else if col.key === 'clicks'}<span class="num num--hi">{nfmt(row.clicks)}</span>
                          {:else if col.key === 'impressions'}<span class="num">{nfmt(row.impressions)}</span>
                          {:else if col.key === 'ctr'}<span class="num num--dim">{pct(row.ctr)}</span>
                          {:else}<span class="num num--dim">{pos(row.position)}</span>{/if}
                        {/snippet}
                      </DataTable></div>
                    {:else}
                      <EmptyState compact title="Sin búsquedas registradas"
                        text={topQ ? 'Google no registró búsquedas con clics o impresiones en ese período.' : 'El resumen de búsquedas se guarda en cada sincronización.'} />
                    {/if}
                  </Card>
                {:else}
                  <Card><EmptyState compact title="Search Console sin configurar" text="Las búsquedas salen de Search Console. Añade su propiedad al proyecto.">
                    {#snippet action()}<button type="button" class="b" onclick={openEdit}>Editar proyecto</button>{/snippet}
                  </EmptyState></Card>
                {/if}
              {:else}
              <SeoSources mode="alerts" project={proj} state={syncState} {configured} {syncing}
                through={{ gsc: sumG && sumG.through, ga4: sumA && sumA.through }}
                onedit={openEdit} onstatus={() => (statusOpen = true)} />
              {#if partialTxt}
                <p class="seo-window seo-window--warn" role="note">{partialTxt}</p>
              {/if}

              <KpiGrid count={kpiCount} label="Resumen del período">
                <Kpi label="Clics" value={hasGsc && sumG ? nfmt(sumG.current.clicks) : '—'} art="cursor">
                  {@render kpiNote(dClicks, sumG ? (sumG.previous ? 'sin cambios' : 'sin período previo') : gscEmptyTxt, 'Search Console sin configurar.', !hasGsc)}
                </Kpi>
                <Kpi label="Impresiones" value={hasGsc && sumG ? nfmt(sumG.current.impressions) : '—'} art="eye">
                  {@render kpiNote(dImpr, sumG ? (sumG.previous ? 'sin cambios' : 'sin período previo') : gscEmptyTxt, 'Search Console sin configurar.', !hasGsc)}
                </Kpi>
                <Kpi label="Posición media" value={hasGsc && sumG ? pos(sumG.current.position) : '—'} art="medal">
                  {@render kpiNote(dPos, sumG ? 'ponderada por impresiones' : gscEmptyTxt, 'Search Console sin configurar.', !hasGsc)}
                </Kpi>
                <Kpi label="Sesiones" value={hasGa4 && sumA ? nfmt(sumA.current.sessions) : '—'} art="users">
                  {@render kpiNote(dSess, sumA ? (sumA.previous ? 'sin cambios' : 'sin período previo') : ga4EmptyTxt, 'Analytics sin configurar.', !hasGa4)}
                </Kpi>
                {#if showKeyEvents}
                  <Kpi label="Eventos clave" value={nfmt(sumA.current.key_events)} art="check">
                    {@render kpiNote(dKey, 'contactos y objetivos', '', false)}
                  </Kpi>
                {/if}
              </KpiGrid>

              {#if hasGsc}
                <div class="seo-row seo-row--a">
                  {#if gscDaily.length}
                    <Card tag="article" caption="Search Console" title={metric === 'clicks' ? 'Clics por día' : 'Impresiones por día'}>
                      {#snippet actions()}
                        <span class="seo-cap">{chartCap}</span>
                        <div class="seo-range seo-range--sm" role="group" aria-label="Qué se ve en el gráfico">
                          <button type="button" class="seo-range__b" aria-pressed={metric === 'clicks'} onclick={() => (metric = 'clicks')}>Clics</button>
                          <button type="button" class="seo-range__b" aria-pressed={metric === 'impressions'} onclick={() => (metric = 'impressions')}>Impresiones</button>
                        </div>
                      {/snippet}
                      {#key metric}
                        <SeoChart fill={fitOn} series={metric === 'clicks' ? clicksSeries : imprSeries} tone="accent"
                          unit={metric === 'clicks' ? 'clics' : 'impresiones'} unitOne={metric === 'clicks' ? 'clic' : 'impresión'}
                          label={metric === 'clicks' ? 'Clics por día' : 'Impresiones por día'} {pendingLabel} />
                      {/key}
                    </Card>
                  {:else}
                    <Card title="Clics e impresiones" caption="Search Console">
                      {#if gscErr}
                        <EmptyState compact title="No se pudieron leer los datos de Search Console" text="El motivo y qué hacer están en el estado de Google.">
                          {#snippet action()}<button type="button" class="b" onclick={() => (statusOpen = true)}>Ver estado de Google</button>{/snippet}
                        </EmptyState>
                      {:else}
                        <EmptyState compact title="Aún no hay datos de Search Console"
                          text={configured ? 'Se traen cada madrugada. Si no quieres esperar, actualiza ahora.' : 'Cuando el acceso a Google esté configurado, aquí verás los clics e impresiones de cada día.'}>
                          {#snippet action()}{#if configured}<button type="button" class="b" onclick={() => syncNow()} disabled={Boolean(syncingId)}>{syncing ? 'Actualizando…' : 'Actualizar ahora'}</button>{/if}{/snippet}
                        </EmptyState>
                      {/if}
                    </Card>
                  {/if}
                  <SeoIndexation mode="summary" onpages={() => pickVer('paginas')} indexation={detail.metrics.indexation} {hasGsc} state={syncState && syncState.sources ? syncState.sources.indexation : null}
                    {syncing} gscFailed={Boolean(gscErr)} onsync={() => syncNow()} onedit={openEdit} onstatus={() => (statusOpen = true)} />

                {#if topQ || gscDaily.length}
                  <Card tag="article" title="Mejores búsquedas">
                    {#snippet actions()}
                      {#if topQ && topQ.range}<span class="seo-cap">{dayShort(topQ.range.startDate)} al {dayShort(topQ.range.endDate)}</span>{/if}
                      {#if queries.length > qRows}<button type="button" class="seo-more" onclick={() => pickVer('busquedas')}>Ver las {queries.length}<Icon name="chevron" size={14} /></button>{/if}
                    {/snippet}
                    {#if queries.length}
                      <div class="qs">
                        <div class="qs__cols" aria-hidden="true"><span>Búsqueda</span><span class="qs__x"></span><span>Clics</span><span class="qs__x">Impresiones</span><span class="qs__x">CTR</span><span>Posición</span></div>
                        <div class="qs__box" bind:clientHeight={qH}>
                          <ol class="qs__rows">
                            {#each queries.slice(0, qRows) as q (q.rank)}
                              <li class="qs__row">
                                <span class="q"><span class="q__rank">{q.rank}</span><span class="q__text ellip">{q.query || '—'}</span></span>
                                <!-- barra de clics frente a la búsqueda con más clics -->
                                <span class="qs__bar" aria-hidden="true"><i style="width:{qMax ? Math.max(2, (Number(q.clicks) || 0) / qMax * 100) : 0}%"></i></span>
                                <span class="num num--hi"><span class="qs__lbl">Clics</span>{nfmt(q.clicks)}</span>
                                <span class="num qs__x"><span class="qs__lbl">Impr.</span>{nfmt(q.impressions)}</span>
                                <span class="num num--dim qs__x"><span class="qs__lbl">CTR</span>{pct(q.ctr)}</span>
                                <span class="num num--dim"><span class="qs__lbl">Pos.</span>{pos(q.position)}</span>
                              </li>
                            {/each}
                          </ol>
                        </div>
                      </div>
                    {:else}
                      <EmptyState compact title="Sin búsquedas registradas"
                        text={topQ ? 'Google no registró búsquedas con clics o impresiones en ese período.' : 'El resumen de búsquedas se guarda en cada sincronización.'} />
                    {/if}
                  </Card>
                {/if}
                </div>
              {/if}
              {/if}
            </div>
          {/if}
        </LoadingState>
      {/if}
    {/if}
  {/if}
</LoadingState>
</div>

<SeoProjectForm bind:open={formOpen} project={formProject} {configured} onsaved={onSaved} />
<SeoStatusDialog bind:open={statusOpen} {projects} {configured} {days}
  onchanged={async () => { await loadProjects(); if (selected) await loadDetail(String(selected.id), days); }}
  onopenproject={(id) => setSub([String(id)])} />
<ConfirmDialog bind:open={delOpen} title="Eliminar proyecto de SEO" confirmLabel="Eliminar proyecto" busy={deleting}
  message={selected ? `Se elimina «${selected.name}» con todos sus datos guardados: clics, impresiones, sesiones, indexación y búsquedas. En Google no se borra nada; si lo creas de nuevo, los datos se vuelven a traer.` : ''}
  onconfirm={doDelete} />

<style>
  /* Indicador de estado de Google: botón secundario con un punto de color
     (el color nunca va solo: el texto dice el estado). */
  .seo-health__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--fg-subtle); flex: 0 0 auto; }
  .seo-health--success .seo-health__dot { background: var(--color-success); }
  .seo-health--warning .seo-health__dot { background: var(--color-warning); }
  .seo-health--error .seo-health__dot { background: var(--color-error); }

  /* ── Página (fase 3): en un portátil o mayor, el Resumen cabe en la pantalla (E-77) ── */
  .seo { display: flex; flex-direction: column; }
  .seo > :global(.ui-page-head) { margin: 6px 0 14px; }
  .seo.is-fit { height: min(calc(100dvh - var(--chrome-y, 76px)), 1040px); min-height: 0; }
  .seo.is-fit .seo-stack { flex: 1 1 auto; min-height: 0; }
  /* Rejilla del Resumen: gráfico e indexación arriba, búsquedas abajo; en portátil
     de poco alto, las tres en una fila (E-77: cabe en 1366×768). */
  .seo-row--a { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
  .seo-row--a > :global(:nth-child(3)) { grid-column: 1 / -1; }
  .seo.is-fit .seo-row--a { flex: 1 1 auto; min-height: 0; grid-template-rows: minmax(0, 1.2fr) minmax(0, 1fr); }
  /* Nota de la cifra en dos líneas fijas: el cambio arriba, el periodo debajo. */
  .seo.is-short .seo-row--a { grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr) minmax(0, 1.15fr); grid-template-rows: minmax(0, 1fr); }
  .seo.is-short .seo-row--a > :global(:nth-child(3)) { grid-column: auto; }
  .seo.is-short .qs__cols, .seo.is-short .qs__row { grid-template-columns: minmax(0, 1fr) 48px 52px; }
  .seo.is-short .qs__bar, .seo.is-short .qs__x { display: none; }
  /* Tres columnas: la búsqueda baja a dos líneas en vez de cortarse. */
  .seo.is-short .qs__row { min-height: 40px; padding-top: 4px; padding-bottom: 4px; }
  .seo.is-short .q__text { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; font-size: var(--dash-caption); line-height: 1.3; }
  .seo.is-short > :global(.ui-page-head) { margin-bottom: 10px; }

  .seo-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
  .seo-bar__pick { flex: 1 1 260px; max-width: 380px; min-width: 0; }
  .seo-bar__pick select { width: 100%; }
  .seo-bar__acts { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .seo-del:hover { color: var(--color-error); }
  .seo-spin { display: inline-flex; animation: seo-spin 1s linear infinite; }
  @keyframes seo-spin { to { transform: rotate(360deg); } }

  /* Rango y conmutador del gráfico: pastillas segmentadas (E-06), neutras (H-07). */
  .seo-range { display: inline-flex; padding: 3px; gap: 2px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-pill); }
  .seo-range__b { all: unset; box-sizing: border-box; cursor: pointer; padding: 6px 12px; min-height: 30px; display: inline-flex; align-items: center; border-radius: var(--radius-pill); font-size: var(--dash-small); font-weight: 500; color: var(--fg-secondary); white-space: nowrap; transition: background-color var(--duration-fast), color var(--duration-fast); }
  .seo-range__b:hover { color: var(--fg-primary); }
  .seo-range__b[aria-pressed='true'] { background: var(--surface-3); color: var(--fg-primary); box-shadow: inset 0 0 0 1px var(--border-strong); }
  .seo-range__b:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .seo-range--sm .seo-range__b { padding: 3px 10px; min-height: 26px; font-size: var(--dash-caption); }
  @media (pointer: coarse) { .seo-range__b, .seo-range--sm .seo-range__b { min-height: 38px; } }

  /* Pestañas como las de Finanzas (subrayado), con la ventana de datos en mono a la derecha. */
  .seo-tabs { display: flex; align-items: flex-end; justify-content: space-between; gap: 6px 20px; flex-wrap: wrap; border-bottom: 1px solid var(--border); margin: 0 0 14px; }
  .seo-tabs__nav { display: flex; gap: 22px; }
  .seo-tab { position: relative; display: inline-flex; align-items: center; min-height: 36px; padding-bottom: 2px; font-size: var(--dash-body); color: var(--fg-secondary); text-decoration: none; }
  .seo-tab:hover { color: var(--fg-primary); }
  .seo-tab[aria-current='page'] { color: var(--fg-primary); }
  .seo-tab[aria-current='page']::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--fg-primary); border-radius: 2px; }
  .seo-tabs__meta { margin: 0 0 9px; display: flex; flex-wrap: wrap; gap: 4px 10px; font-family: var(--font-mono); font-size: var(--dash-mono); color: var(--fg-subtle); }
  .seo-tabs__meta span { overflow-wrap: anywhere; }
  .seo-tabs__meta span:not(:last-child)::after { content: '·'; margin-left: 10px; color: var(--fg-faint); }

  .seo-stack { display: flex; flex-direction: column; gap: 14px; transition: opacity var(--duration-fast); }
  .seo-stack > :global(.ui-kpis) { margin: 0; }
  .seo-stack.is-reloading { opacity: .7; }
  .seo-row { display: grid; gap: 14px; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
  .seo-row > :global(.ui-card) { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
  .seo-row > :global(.ui-card) :global(.ui-card__actions) { gap: 12px; }

  /* Huecos con las medidas del contenido real (1440): franja 34, cifras 104, fila 300. */
  .sk-seo-bar { height: 38px; width: min(620px, 100%); }
  .sk-seo-tabs { display: inline-block; height: 26px; width: 240px; margin-bottom: 9px; }
  .sk-seo-strip { height: 34px; border-radius: 10px; }
  .sk-seo-kpi { height: 104px; border-radius: 12px; }
  .sk-seo-chart { height: 300px; border-radius: 12px; }
  @media (max-width: 719px) { .sk-seo-bar { height: 128px; } .sk-seo-strip { height: 70px; } }
  .seo-window { margin: 0; font-size: var(--dash-caption); color: var(--fg-subtle); line-height: 1.5; }
  .seo-window--warn { color: var(--color-warning); }

  .seo-cap { font-family: var(--font-mono); font-size: var(--dash-mono); color: var(--fg-subtle); white-space: nowrap; }
  .seo-more { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 10px; border: 1px solid var(--border); border-radius: 8px; color: var(--fg-secondary); font-size: var(--dash-caption); white-space: nowrap; }
  .seo-more:hover { color: var(--fg-primary); border-color: var(--border-strong); background: var(--bg-elevated); }
  .seo-more:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }

  /* Mejores búsquedas: filas compactas como «Recent Projects» de la referencia. */
  .qs { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
  .qs__cols, .qs__row { display: grid; grid-template-columns: minmax(150px, 1.3fr) minmax(0, 1fr) 56px 92px 60px 64px; gap: 14px; align-items: center; }
  .qs__cols { padding: 0 12px 8px; font-family: var(--font-mono); font-size: var(--dash-mono); color: var(--fg-subtle); }
  .qs__cols > :nth-child(n+3) { text-align: right; }
  .qs__bar { display: block; height: 4px; border-radius: 999px; background: rgba(255, 255, 255, 0.05); overflow: hidden; }
  .qs__bar i { display: block; height: 100%; border-radius: 999px; background: #6a6a6a; }
  /* Tableta y portátil estrecho: la barra (adorno) cede su sitio a la búsqueda, que no se corta. */
  @media (max-width: 1099px) {
    .qs__cols, .qs__row { grid-template-columns: minmax(0, 1fr) 52px 88px 60px 64px; }
    .qs__bar, .qs__cols > :nth-child(2) { display: none; }
  }
  .qs__box { flex: 1 1 auto; min-height: 0; overflow: hidden; }
  .qs__rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .qs__row { min-height: 32px; padding: 0 12px; background: #242424; border: 1px solid var(--border-subtle); border-radius: 8px; font-size: var(--dash-small); }
  .qs__row > .num { text-align: right; }
  /* Rótulo de cada cifra: oculto a la vista en escritorio (lo dicen las columnas), visible en el teléfono. */
  .qs__lbl { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; margin-right: 5px; }
  .ellip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }

  .q { display: inline-flex; align-items: center; gap: 10px; min-width: 0; max-width: 100%; }
  .q__rank { flex: 0 0 auto; width: 20px; height: 20px; border-radius: 5px; display: inline-flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 11px; color: var(--fg-secondary); background: var(--bg-elevated); border: 1px solid var(--border); }
  .q__text { color: var(--fg-primary); }
  .num { font-family: var(--font-mono); font-size: var(--dash-mono); font-variant-numeric: tabular-nums; color: var(--fg-secondary); }
  .num--hi { color: var(--fg-primary); }
  .num--dim { color: var(--fg-subtle); }

  @media (max-width: 1099px) { .seo-row { grid-template-columns: minmax(0, 1fr); } }
  @media (max-width: 719px) {
    /* Búsquedas en el teléfono (pestaña): las 4 cifras en 2 columnas. */
    .seo-q :global(.ui-table tr) { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 20px; }
    .seo-q :global(.ui-table td.is-primary) { grid-column: 1 / -1; }
    .seo-q :global(.ui-table td:not(.is-primary):not(.is-action)) { grid-column: auto; }
    .seo-bar__pick { flex-basis: 100%; max-width: none; }
    /* Teléfono: el rango en su fila y las acciones del proyecto debajo, con su nombre. */
    .seo-range { flex: 1 1 100%; justify-content: space-between; }
    .seo-range__b { flex: 1 1 0; justify-content: center; }
    .seo-bar__acts { flex: 1 1 100%; margin-left: 0; flex-wrap: nowrap; gap: 8px; }
    .seo-range__b { padding: 6px 9px; font-size: var(--dash-caption); }
    .seo-tabs__meta { gap: 2px 12px; font-size: 11px; }
    /* Resumen: la búsqueda arriba y sus cuatro cifras debajo, con su rótulo. */
    .qs__cols { display: none; }
    .qs__row { grid-template-columns: repeat(4, minmax(0, 1fr)); row-gap: 4px; padding: 8px 12px; }
    .qs__row > .q { grid-column: 1 / -1; }
    .qs__bar { display: none; }
    .qs__lbl { display: block; margin: 0 0 1px; }
    .qs__row > .num { text-align: left; }
    .qs__lbl { position: static; width: auto; height: auto; overflow: visible; clip: auto; color: var(--fg-faint); }
  }
  /* Movimiento reducido (pieza F-02). */
  @media (prefers-reduced-motion: reduce) { .seo-spin { animation: none; } }
</style>
