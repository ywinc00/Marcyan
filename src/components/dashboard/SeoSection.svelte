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
  import { untrack } from 'svelte';
  import { api, errorMessage, isSessionError } from './lib/api.js';
  import { route, setSub, setQuery } from './lib/router.svelte.js';
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
  import { nfmt, pct, pos, dayShort } from './seo/format.js';
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
  const prevTxt = $derived(`vs ${days} días anteriores`);
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
  const qCols = [
    { key: 'query', label: 'Búsqueda', primary: true },
    { key: 'clicks', label: 'Clics', align: 'end' },
    { key: 'impressions', label: 'Impresiones', align: 'end' },
    { key: 'ctr', label: 'CTR', align: 'end' },
    { key: 'position', label: 'Posición', align: 'end' },
  ];
</script>

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
    <span class={d.dir === 'flat' ? '' : d.better ? 'is-data' : 'seo-down'}>{d.dir === 'up' ? '↑' : d.dir === 'down' ? '↓' : '→'} {d.txt}</span> {prevTxt}
  {:else}
    {okTxt}
  {/if}
{/snippet}

<LoadingState loading={listLoading} rows={3} height={64} label="Cargando proyectos de SEO…">
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
    <!-- Barra de trabajo: proyecto, rango y actualizar -->
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
        <button type="button" class="b seo-bar__sync" onclick={() => syncNow()} disabled={Boolean(syncingId) || !configured || !(selected.gsc_site_url || selected.ga4_property_id)}>
          <span class:seo-spin={syncing}><Icon name="refresh" size={16} /></span>{syncing ? 'Actualizando…' : 'Actualizar ahora'}
        </button>
      {/if}
    </div>

    {#if missing}
      <EmptyState title="Ese proyecto ya no existe" text="Puede que se haya eliminado. Elige otro en la lista.">
        {#snippet action()}<button type="button" class="b" onclick={() => setSub([], { replace: true })}>Ver el más reciente</button>{/snippet}
      </EmptyState>
    {:else if selected}
      {#if proj}
        <p class="seo-meta">
          {#if proj.domain}<span>{proj.domain}</span>{/if}
          <span>Search Console: {proj.gsc_site_url || 'sin configurar'}</span>
          <span>Analytics: {proj.ga4_property_id || 'sin configurar'}</span>
          {#if proj.active === false}<span>Pausado: no entra en la sincronización automática</span>{/if}
        </p>
      {/if}

      {#if detailError && !detail}
        <ErrorState title="No se pudieron cargar los datos" message={detailError} onretry={() => loadDetail(String(selected.id), days)} />
      {:else}
        <LoadingState loading={detailLoading && !detail} rows={4} height={96} label="Cargando datos del proyecto…">
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
              {:else}
              <SeoSources project={proj} state={syncState} {configured} {syncing}
                through={{ gsc: sumG && sumG.through, ga4: sumA && sumA.through }}
                onedit={openEdit} onstatus={() => (statusOpen = true)} />

              <KpiGrid count={kpiCount} label="Resumen del período">
                <Kpi label="Clics" value={hasGsc && sumG ? nfmt(sumG.current.clicks) : '—'} art="cursor" tone="accent">
                  {@render kpiNote(dClicks, sumG ? (sumG.previous ? 'sin cambios' : 'sin período previo para comparar') : gscEmptyTxt, 'Search Console sin configurar.', !hasGsc)}
                </Kpi>
                <Kpi label="Impresiones" value={hasGsc && sumG ? nfmt(sumG.current.impressions) : '—'} art="eye">
                  {@render kpiNote(dImpr, sumG ? (sumG.previous ? 'sin cambios' : 'sin período previo para comparar') : gscEmptyTxt, 'Search Console sin configurar.', !hasGsc)}
                </Kpi>
                <Kpi label="Posición media" value={hasGsc && sumG ? pos(sumG.current.position) : '—'} art="medal">
                  {@render kpiNote(dPos, sumG ? 'ponderada por impresiones' : gscEmptyTxt, 'Search Console sin configurar.', !hasGsc)}
                </Kpi>
                <Kpi label="Sesiones" value={hasGa4 && sumA ? nfmt(sumA.current.sessions) : '—'} art="users" tone="data">
                  {@render kpiNote(dSess, sumA ? (sumA.previous ? 'sin cambios' : 'sin período previo para comparar') : ga4EmptyTxt, 'Analytics sin configurar.', !hasGa4)}
                </Kpi>
                {#if showKeyEvents}
                  <Kpi label="Eventos clave" value={nfmt(sumA.current.key_events)} art="check">
                    {@render kpiNote(dKey, 'contactos y objetivos de Analytics', '', false)}
                  </Kpi>
                {/if}
              </KpiGrid>
              {#if sumG || sumA}
                <p class="seo-window">
                  {#if sumG}Search Console: {windowTxt} (publica con 2 o 3 días de retraso).{/if}
                  {#if sumA}Analytics: {dayShort(sumA.current.start)} al {dayShort(sumA.current.end)}, sin el día de hoy.{/if}
                </p>
                {#if partialTxt}
                  <p class="seo-window seo-window--warn" role="note">{partialTxt}</p>
                {/if}
              {/if}

              {#if hasGsc}
                {#if gscDaily.length}
                  <div class="seo-charts">
                    <Card title="Clics por día" caption="Search Console">
                      {#snippet actions()}<span class="seo-cap">{chartCap}</span>{/snippet}
                      <SeoChart series={clicksSeries} tone="accent" unit="clics" unitOne="clic" label="Clics por día" {pendingLabel} />
                    </Card>
                    <Card title="Impresiones por día" caption="Search Console">
                      {#snippet actions()}<span class="seo-cap">{chartCap}</span>{/snippet}
                      <SeoChart series={imprSeries} tone="data" unit="impresiones" unitOne="impresión" label="Impresiones por día" {pendingLabel} />
                    </Card>
                  </div>
                {:else}
                  <Card title="Clics e impresiones" caption="Search Console">
                    {#if gscErr}
                      <EmptyState compact title="No se pudieron leer los datos de Search Console" text="El motivo y qué hacer están arriba, en Search Console.">
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
              {/if}

              <SeoIndexation indexation={detail.metrics.indexation} {hasGsc} state={syncState && syncState.sources ? syncState.sources.indexation : null}
                {syncing} gscFailed={Boolean(gscErr)} onsync={() => syncNow()} onedit={openEdit} onstatus={() => (statusOpen = true)} />

              {#if hasGsc && (topQ || gscDaily.length)}
                <Card title="Top búsquedas" caption="Search Console">
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
              {/if}

              {/if}

              <div class="seo-foot">
                {#if hasGsc || hasGa4}<button type="button" class="b" onclick={openEdit}>Editar proyecto</button>{:else}<span></span>{/if}
                <button type="button" class="b b--danger" onclick={() => (delOpen = true)}>Eliminar proyecto</button>
              </div>
            </div>
          {/if}
        </LoadingState>
      {/if}
    {/if}
  {/if}
</LoadingState>

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

  .seo-bar { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-3); }
  .seo-bar__pick { flex: 1 1 260px; max-width: 420px; min-width: 0; }
  .seo-bar__pick select { width: 100%; }
  .seo-bar__sync { margin-left: auto; }
  .seo-spin { display: inline-flex; animation: seo-spin 1s linear infinite; }
  @keyframes seo-spin { to { transform: rotate(360deg); } }

  /* Rango: pastillas segmentadas (E-06) con el estado en la URL. Neutras:
     el naranja queda para la acción principal (H-07). */
  .seo-range { display: inline-flex; padding: 3px; gap: 2px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-pill); }
  .seo-range__b { all: unset; box-sizing: border-box; cursor: pointer; padding: 6px 12px; min-height: 30px; display: inline-flex; align-items: center; border-radius: var(--radius-pill); font-size: var(--dash-small); font-weight: 500; color: var(--fg-secondary); white-space: nowrap; transition: background-color var(--duration-fast), color var(--duration-fast); }
  .seo-range__b:hover { color: var(--fg-primary); }
  .seo-range__b[aria-pressed='true'] { background: var(--surface-3); color: var(--fg-primary); box-shadow: inset 0 0 0 1px var(--border-strong); }
  .seo-range__b:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  @media (pointer: coarse) { .seo-range__b { min-height: 38px; } }

  .seo-meta { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 0 0 var(--space-4); font-size: var(--dash-caption); color: var(--fg-subtle); }
  .seo-meta span { overflow-wrap: anywhere; }

  .seo-stack { display: flex; flex-direction: column; gap: var(--space-4); transition: opacity var(--duration-fast); }
  .seo-stack.is-reloading { opacity: .7; }
  .seo-window { margin: -6px 0 0; font-size: var(--dash-caption); color: var(--fg-subtle); line-height: 1.5; }
  .seo-window--warn { color: var(--color-warning); }
  .seo-down { color: var(--color-error); font-weight: 600; }

  .seo-charts { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
  .seo-cap { font-size: var(--dash-caption); color: var(--fg-subtle); white-space: nowrap; }

  .q { display: inline-flex; align-items: center; gap: 10px; min-width: 0; max-width: 100%; }
  .q__rank { flex: 0 0 auto; width: 22px; height: 22px; border-radius: var(--radius-sm); display: inline-flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 11px; font-weight: 600; color: var(--fg-secondary); background: var(--bg-elevated); border: 1px solid var(--border); }
  .q__text { color: var(--fg-primary); overflow-wrap: anywhere; }
  .num { font-variant-numeric: tabular-nums; color: var(--fg-secondary); }
  .num--hi { color: var(--fg-primary); font-weight: 600; }
  .num--dim { color: var(--fg-subtle); }

  .seo-foot { display: flex; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-2); }

  @media (max-width: 1023px) { .seo-charts { grid-template-columns: 1fr; } }
  @media (max-width: 719px) {
    /* Búsquedas en el teléfono: las 4 cifras en 2 columnas (media tarjeta). */
    .seo-q :global(.ui-table tr) { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 20px; }
    .seo-q :global(.ui-table td.is-primary) { grid-column: 1 / -1; }
    .seo-q :global(.ui-table td:not(.is-primary):not(.is-action)) { grid-column: auto; }
    .seo-bar__pick { flex-basis: 100%; max-width: none; }
    .seo-bar__sync { margin-left: 0; }
  }
</style>
