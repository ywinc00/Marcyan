<script>
  // Avisos (#/avisos): "no perder nada, cada aviso lleva a su registro".
  //   · "Abrir" navega por el router al lead, brief, proyecto, factura o
  //     cliente concreto y marca el aviso como leído (OP-12).
  //   · Filtros por tipo y estado en la URL: #/avisos?tipo=lead&estado=sin-leer
  //   · "Cargar más" con cursor (OP-14); KPIs con conteos del servidor, no
  //     de la página cargada.
  //   · Marcar como no leído y archivar (OP-15). El contador de la barra
  //     lateral se actualiza con el `unread` que devuelve cada cambio.
  import { api, errorMessage, isSessionError } from './lib/api.js';
  import { fmtDateTime, rel } from './lib/dates.js';
  import { route, href, setQuery, parseHash, navigate } from './lib/router.svelte.js';
  import { toast, toastError } from './lib/toast.svelte.js';
  import {
    setUnread, readFilters, listParams, openTarget, visibleRef, cleanTitle,
    TYPE_FILTERS, STATE_FILTERS,
  } from './lib/avisos.svelte.js';
  import PageHeader from './ui/PageHeader.svelte';
  import KpiGrid from './ui/KpiGrid.svelte';
  import Kpi from './ui/Kpi.svelte';
  import StatusChip from './ui/StatusChip.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import LoadingState from './ui/LoadingState.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import Icon from './ui/Icon.svelte';

  // type → etiqueta legible + tono del chip (sin naranja: el acento queda
  // para la acción principal y lo pendiente, H-07).
  const TYPES = {
    new_lead:     { label: 'Nuevo lead',    tone: 'info',    cls: 'lead' },
    new_brief:    { label: 'Nuevo brief',   tone: 'data',    cls: 'brief' },
    chat_handoff: { label: 'Quiere hablar', tone: 'warning', cls: 'handoff' },
    system:       { label: 'Sistema',       tone: 'neutral', cls: 'system' },
  };
  function typeMeta(t) { return TYPES[t] || TYPES.system; }

  const PAGE = 30;
  const EMPTY_COUNTS = { total: 0, unread: 0, archived: 0, by_type: { new_lead: { total: 0, unread: 0 }, new_brief: { total: 0, unread: 0 }, chat_handoff: { total: 0, unread: 0 }, system: { total: 0, unread: 0 } } };

  // ── Estado ───────────────────────────────────────────────────
  const filters = $derived(readFilters(route.query));
  let rows = $state([]);
  let counts = $state(EMPTY_COUNTS);
  let total = $state(0);
  let nextCursor = $state(null);
  let archiveAvailable = $state(true);
  let loading = $state(true);
  let loaded = $state(false);
  let error = $state('');
  let loadingMore = $state(false);
  let moreError = $state('');
  let busyAll = $state(false);
  let busy = $state({});          // id → true mientras se guarda un cambio

  const unread = $derived(counts.unread || 0);
  const typeLabel = $derived((TYPE_FILTERS.find((f) => f.id === filters.tipo) || TYPE_FILTERS[0]).label);

  function applyCounts(j) {
    if (j && j.counts) counts = { ...EMPTY_COUNTS, ...j.counts, by_type: { ...EMPTY_COUNTS.by_type, ...(j.counts.by_type || {}) } };
    if (j && j.unread != null) { counts = { ...counts, unread: Number(j.unread) || 0 }; setUnread(j.unread); }
  }

  // ── Carga ────────────────────────────────────────────────────
  // seq evita que una respuesta lenta de un filtro anterior pise la actual.
  let seq = 0;
  async function load() {
    const my = ++seq;
    loading = true; error = ''; moreError = '';
    try {
      const j = await api('/api/admin/notifications?' + listParams(filters, { limit: PAGE }));
      if (my !== seq) return;
      rows = j.rows || [];
      total = Number(j.total) || 0;
      nextCursor = j.has_more ? j.next_cursor : null;
      archiveAvailable = j.archive_available !== false;
      applyCounts(j);
      loaded = true;
    } catch (e) {
      if (my !== seq) return;
      if (!isSessionError(e)) error = errorMessage(e, 'No se pudieron cargar los avisos.');
    } finally {
      if (my === seq) loading = false;
    }
  }

  async function loadMore() {
    if (loadingMore || nextCursor == null) return;
    const my = seq;
    loadingMore = true; moreError = '';
    try {
      const j = await api('/api/admin/notifications?' + listParams(filters, { limit: PAGE, before: nextCursor }));
      if (my !== seq) return;
      const seen = new Set(rows.map((r) => String(r.id)));
      rows = [...rows, ...(j.rows || []).filter((r) => !seen.has(String(r.id)))];
      nextCursor = j.has_more ? j.next_cursor : null;
      total = Number(j.total) || total;
      applyCounts(j);
    } catch (e) {
      if (my === seq && !isSessionError(e)) moreError = errorMessage(e, 'No se pudieron cargar más avisos.');
    } finally {
      loadingMore = false;
    }
  }

  // Recarga al cambiar de filtro (y la primera vez).
  $effect(() => {
    filters.tipo; filters.estado;   // dependencias
    load();
  });

  function setTipo(id) { setQuery({ tipo: id || null }); }
  function setEstado(id) { setQuery({ estado: id || null }); }
  function clearFilters() { setQuery({ tipo: null, estado: null }); }

  // ¿Sigue el aviso dentro del filtro actual tras un cambio?
  function fits(n) {
    if (filters.estado === 'sin-leer') return !n.read_at && !n.archived_at;
    if (filters.estado === 'archivados') return !!n.archived_at;
    return !n.archived_at;
  }
  function replaceRow(n) {
    if (fits(n)) rows = rows.map((x) => (String(x.id) === String(n.id) ? n : x));
    else { rows = rows.filter((x) => String(x.id) !== String(n.id)); total = Math.max(0, total - 1); }
  }

  // PATCH de un aviso. Devuelve la fila nueva o null si falló (con toast).
  async function patch(n, body, fallback) {
    const id = String(n.id);
    if (busy[id]) return null;
    busy = { ...busy, [id]: true };
    try {
      const j = await api('/api/admin/notifications/' + encodeURIComponent(id), { method: 'PATCH', body });
      if (j.unread != null) { setUnread(j.unread); counts = { ...counts, unread: Number(j.unread) || 0 }; }
      return j.notification || null;
    } catch (e) {
      toastError(e, fallback);
      if (e && e.data && e.data.code === 'archive_unavailable') archiveAvailable = false;
      return null;
    } finally {
      const { [id]: _, ...rest } = busy;
      busy = rest;
    }
  }

  // ── Acciones ─────────────────────────────────────────────────
  // Abrir: marca leída (sin esperar a que el usuario vuelva) y navega al
  // registro con el router, sin recargar la página.
  function openNote(n) {
    const target = openTarget(n.link || n.url);
    if (!target) return;
    if (!n.read_at) {
      patch(n, undefined, 'No se pudo marcar el aviso como leído.').then((u) => {
        if (u) { replaceRow(u); refreshCounts(); }
      });
    }
    const r = parseHash(target);
    navigate(r.section, r.sub, r.query);
  }

  async function toggleRead(n) {
    const u = await patch(n, n.read_at ? { read: false } : undefined,
      n.read_at ? 'No se pudo marcar como no leído.' : 'No se pudo marcar como leído.');
    if (u) { replaceRow(u); refreshCounts(); }
  }

  async function setArchived(n, archived) {
    const u = await patch(n, { archived }, archived ? 'No se pudo archivar el aviso.' : 'No se pudo devolver el aviso a la bandeja.');
    if (!u) return;
    replaceRow(u);
    refreshCounts();
    toast(archived ? 'Aviso archivado. Está en Archivados.' : 'Aviso devuelto a la bandeja.');
  }

  async function markAll() {
    if (busyAll || unread === 0) return;
    busyAll = true;
    try {
      const j = await api('/api/admin/notifications', { method: 'PATCH' });
      setUnread(j.unread ?? 0);
      toast(j.affected === 1 ? '1 aviso marcado como leído.' : `${j.affected || 0} avisos marcados como leídos.`);
      await load();
    } catch (e) {
      toastError(e, 'No se pudieron marcar los avisos.');
    } finally {
      busyAll = false;
    }
  }

  // Conteos por tipo tras un cambio suelto (barato; si falla, se quedan los
  // de antes y el contador ya vino en la respuesta del cambio).
  let countsTimer = null;
  function refreshCounts() {
    clearTimeout(countsTimer);
    countsTimer = setTimeout(async () => {
      try {
        const j = await api('/api/admin/notifications?limit=1');
        applyCounts(j);
      } catch (e) {
        if (!isSessionError(e)) console.warn('[avisos] conteos sin actualizar:', e && e.message);
      }
    }, 600);
  }
  $effect(() => () => clearTimeout(countsTimer));

  // Texto del vacío: repite el filtro para que se entienda qué quitar (E-06/E-08).
  const emptyCopy = $derived.by(() => {
    const filtered = filters.tipo || filters.estado;
    if (filters.estado === 'archivados') {
      if (!archiveAvailable) return { title: 'Archivar todavía no está disponible', text: 'Cuando se active, los avisos que archives quedarán aquí.' };
      return { title: 'No hay avisos archivados', text: filters.tipo ? `Ningún aviso de ${typeLabel.toLowerCase()} está archivado.` : 'Los avisos que archives quedarán aquí, por si los necesitas.' };
    }
    if (filters.estado === 'sin-leer') return { title: 'Todo leído', text: filters.tipo ? `No quedan avisos de ${typeLabel.toLowerCase()} sin leer.` : 'No tienes avisos sin leer.' };
    if (filtered) return { title: `Sin avisos de ${typeLabel.toLowerCase()}`, text: 'Prueba con otro tipo o quita el filtro.' };
    return { title: 'Sin avisos todavía', text: 'Cuando llegue un lead, un brief o alguien pida hablar con una persona, aparecerá aquí.' };
  });

  // Sin datos (primera carga fallida) los KPIs no fingen ceros.
  const kv = (n) => (loaded ? String(n) : '—');
  const kpiNote = (t) => {
    if (!loaded) return 'Sin datos';
    const c = counts.by_type[t] || { total: 0, unread: 0 };
    return c.unread ? `${c.unread} sin leer` : (c.total ? 'Todo leído' : 'Ninguno en la bandeja');
  };
</script>

<PageHeader title="Avisos" subtitle="Lo que pasó en el sitio y en el panel. Cada aviso te lleva a su registro.">
  {#snippet actions()}
    <button type="button" class="b b--ghost" onclick={load} disabled={loading}><Icon name="refresh" size={16} />Actualizar</button>
    <button type="button" class="b b--primary" disabled={busyAll || unread === 0} onclick={markAll}>
      <Icon name="check" size={16} />{busyAll ? 'Marcando…' : 'Marcar todas como leídas'}
    </button>
  {/snippet}
</PageHeader>

<!-- KPIs con conteos del servidor (la bandeja entera, sin archivados).
     Los de tipo filtran la lista: el KPI es el anfitrión del atajo (E-19). -->
<KpiGrid count={4} label="Resumen de avisos">
  <Kpi label="Sin leer" value={kv(unread)} art="bell" tone={unread ? 'accent' : ''}
       href={href('avisos', [], { tipo: filters.tipo, estado: 'sin-leer' })}
       note={!loaded ? 'Sin datos' : unread ? (unread === 1 ? '1 aviso pendiente' : `${unread} avisos pendientes`) : 'Todo al día'} />
  <Kpi label="Leads" value={kv(counts.by_type.new_lead.total)} art="inbox"
       href={href('avisos', [], { tipo: 'lead', estado: filters.estado })} note={kpiNote('new_lead')} />
  <Kpi label="Briefs" value={kv(counts.by_type.new_brief.total)} art="docs"
       href={href('avisos', [], { tipo: 'brief', estado: filters.estado })} note={kpiNote('new_brief')} />
  <Kpi label="Quieren hablar" value={kv(counts.by_type.chat_handoff.total)} art="users"
       href={href('avisos', [], { tipo: 'persona', estado: filters.estado })} note={kpiNote('chat_handoff')} />
</KpiGrid>

<!-- Filtros en pastillas con el estado en la URL (E-06). -->
<div class="filters">
  <div class="pills" role="group" aria-label="Tipo de aviso">
    {#each TYPE_FILTERS as f (f.id)}
      <button type="button" class="pill" aria-pressed={filters.tipo === f.id} onclick={() => setTipo(f.id)}>{f.label}</button>
    {/each}
  </div>
  <div class="pills" role="group" aria-label="Estado">
    {#each STATE_FILTERS as f (f.id)}
      <button type="button" class="pill" aria-pressed={filters.estado === f.id} onclick={() => setEstado(f.id)}>
        {f.label}{#if f.id === 'sin-leer' && unread}<span class="pill__n">{unread}</span>{/if}
      </button>
    {/each}
  </div>
</div>

{#if error}
  <ErrorState title="No se pudieron cargar los avisos" message={error} onretry={load} />
{:else}
  <LoadingState loading={loading && !loaded} label="Cargando avisos…">
    {#snippet skeleton()}
      {#each Array(4) as _, i (i)}
        <div class="skel-note">
          <div class="ui-skel skel-note__icon"></div>
          <div class="skel-note__lines">
            <div class="ui-skel" style="height:12px;width:22%"></div>
            <div class="ui-skel" style="height:14px;width:56%"></div>
            <div class="ui-skel" style="height:12px;width:40%"></div>
          </div>
        </div>
      {/each}
    {/snippet}

    {#if rows.length === 0}
      <div class="ui-card">
        <EmptyState title={emptyCopy.title} text={emptyCopy.text} art="bell">
          {#snippet action()}
            {#if filters.tipo || filters.estado}
              <button type="button" class="b" onclick={clearFilters}>Ver toda la bandeja</button>
            {/if}
          {/snippet}
        </EmptyState>
      </div>
    {:else}
      <p class="count" aria-live="polite">
        {rows.length === total ? (total === 1 ? '1 aviso' : `${total} avisos`) : `Mostrando ${rows.length} de ${total} avisos`}
      </p>
      <ul class="feed" aria-busy={loading}>
        {#each rows as n (n.id)}
          {@const tm = typeMeta(n.type)}
          {@const target = openTarget(n.link || n.url)}
          {@const ref = visibleRef(n.ref)}
          {@const isBusy = !!busy[String(n.id)]}
          <li class="note note--{tm.cls}" class:unread={!n.read_at && !n.archived_at}>
            <span class="note__icon note__icon--{tm.cls}" aria-hidden="true">
              {#if tm.cls === 'lead'}
                <svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="6" width="17" height="12" rx="2" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.4"/><path d="M4.5 7.5L12 13l7.5-5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {:else if tm.cls === 'brief'}
                <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3.5" width="14" height="17" rx="2" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.4"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              {:else if tm.cls === 'handoff'}
                <svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 17h-9l-5 4v-4H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 6z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="9" cy="11.5" r="1" fill="currentColor"/><circle cx="12" cy="11.5" r="1" fill="currentColor"/><circle cx="15" cy="11.5" r="1" fill="currentColor"/></svg>
              {:else}
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.4"/><path d="M12 8v4.5M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              {/if}
            </span>
            <div class="note__body">
              <div class="note__top">
                <StatusChip tone={tm.tone} label={tm.label} />
                {#if ref}<span class="note__ref">{ref}</span>{/if}
                <!-- El punto de no leído va EN la fila, antes de la hora (OP-28). -->
                <span class="note__when" title={fmtDateTime(n.created_at)}>
                  {#if !n.read_at && !n.archived_at}<span class="note__dot" aria-hidden="true"></span><span class="sr-only">Sin leer, </span>{/if}
                  <time datetime={n.created_at}>{rel(n.created_at)}</time>
                </span>
              </div>
              <p class="note__title">{cleanTitle(n.title)}</p>
              {#if n.body}<p class="note__text">{n.body}</p>{/if}
              <div class="note__foot">
                {#if target}
                  <a class="note__open" href={target} onclick={(e) => { e.preventDefault(); openNote(n); }}>
                    Abrir<Icon name="chevron" size={14} />
                  </a>
                {/if}
                {#if !n.archived_at}
                  <button type="button" class="note__act" disabled={isBusy} onclick={() => toggleRead(n)}>
                    {n.read_at ? 'Marcar como no leído' : 'Marcar como leído'}
                  </button>
                {/if}
                {#if archiveAvailable}
                  <button type="button" class="note__act" disabled={isBusy} onclick={() => setArchived(n, !n.archived_at)}>
                    {n.archived_at ? 'Devolver a la bandeja' : 'Archivar'}
                  </button>
                {/if}
                {#if n.archived_at}
                  <span class="note__meta">Archivado {rel(n.archived_at)}</span>
                {:else if n.read_at}
                  <span class="note__meta">Leído {rel(n.read_at)}</span>
                {/if}
              </div>
            </div>
          </li>
        {/each}
      </ul>

      {#if moreError}
        <div class="more"><ErrorState compact title="No se pudieron cargar más avisos" message={moreError} onretry={loadMore} /></div>
      {:else if nextCursor != null}
        <div class="more">
          <button type="button" class="b" onclick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      {/if}
    {/if}
  </LoadingState>
{/if}

<style>
  /* ── Filtros (E-06): pastillas neutras; la activa sube de superficie y de
     texto, sin naranja (H-07). Dos grupos: tipo a la izquierda, estado a la
     derecha; en móvil se apilan y envuelven (nunca se pisan, E-30). */
  .filters { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px var(--space-4); margin-bottom: var(--space-4); }
  .pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .pill { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 5px 12px; border: 1px solid var(--border); border-radius: var(--radius-pill); background: transparent; color: var(--fg-secondary); font: inherit; font-size: var(--dash-small); font-weight: 500; cursor: pointer; transition: background-color var(--duration-fast), border-color var(--duration-fast), color var(--duration-fast); }
  .pill:hover { border-color: var(--border-strong); color: var(--fg-primary); }
  .pill:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .pill[aria-pressed='true'] { background: var(--surface-3); border-color: var(--fg-subtle); color: var(--fg-primary); font-weight: 600; }
  .pill__n { min-width: 18px; padding: 0 6px; border-radius: var(--radius-pill); background: var(--accent-gold-dim); color: var(--accent-gold); font-size: var(--dash-caption); font-weight: 600; text-align: center; font-variant-numeric: tabular-nums; }

  .count { margin: 0 0 8px; font-size: var(--dash-small); color: var(--fg-subtle); }

  /* ── Esqueleto con la geometría del aviso (E-09) ── */
  .skel-note { display: flex; gap: var(--space-3); padding: 14px 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .skel-note__icon { width: 36px; height: 36px; flex: 0 0 auto; }
  .skel-note__lines { flex: 1 1 auto; display: flex; flex-direction: column; gap: 8px; }

  /* ── Feed: una columna de avisos compactos (aspecto aprobado) ── */
  .feed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .note { display: flex; gap: var(--space-3); padding: 14px var(--space-4) 12px 13px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); transition: border-color var(--duration-fast), background-color var(--duration-fast); }
  .note:hover { border-color: var(--border-strong); }
  /* Sin leer: sube un nivel de superficie y lleva la barra del acento
     (lo pendiente es el dato destacado de esta vista). */
  .note.unread { background: var(--bg-elevated); border-left: 3px solid var(--accent-gold); padding-left: 11px; }

  /* Icono: glifo SVG en una losa teñida por tipo. */
  .note__icon { flex: 0 0 auto; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-md); border: 1px solid var(--border); color: var(--fg-secondary); background: var(--surface-3); }
  .note__icon svg { width: 20px; height: 20px; }
  /* Mismo color que su chip (StatusChip): mezcla al 10 % / 28 %. */
  .note__icon--lead    { --tint: var(--color-info); }
  .note__icon--brief   { --tint: var(--accent-teal); }
  .note__icon--handoff { --tint: var(--color-warning); }
  .note__icon--lead, .note__icon--brief, .note__icon--handoff {
    color: var(--tint);
    border-color: color-mix(in srgb, var(--tint) 28%, transparent);
    background: color-mix(in srgb, var(--tint) 10%, transparent);
  }
  .note__icon--system  { color: var(--fg-subtle); }

  .note__body { min-width: 0; flex: 1 1 auto; }
  .note__top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
  .note__ref { font-size: var(--dash-caption); font-weight: 500; color: var(--fg-secondary); letter-spacing: .02em; font-variant-numeric: tabular-nums; }
  .note__when { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; font-size: var(--dash-caption); color: var(--fg-subtle); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .note__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-gold); flex: 0 0 auto; }

  .note__title { margin: 0; font-size: var(--dash-body); color: var(--fg-primary); line-height: 1.45; font-weight: 500; overflow-wrap: anywhere; }
  .note__text { margin: 2px 0 0; font-size: var(--dash-small); color: var(--fg-secondary); line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }

  .note__foot { display: flex; align-items: center; flex-wrap: wrap; gap: 4px var(--space-4); margin-top: 8px; }
  .note__open { display: inline-flex; align-items: center; gap: 2px; min-height: 28px; font-size: var(--dash-small); font-weight: 600; color: var(--accent-teal); text-decoration: none; border-radius: var(--radius-sm, 6px); }
  .note__open:hover { color: var(--fg-primary); }
  .note__act { min-height: 28px; padding: 0; background: transparent; border: 0; cursor: pointer; font: inherit; font-size: var(--dash-small); color: var(--fg-secondary); border-radius: var(--radius-sm, 6px); }
  .note__act:hover:not(:disabled) { color: var(--fg-primary); text-decoration: underline; text-underline-offset: 3px; }
  .note__act:disabled { opacity: .45; cursor: progress; }
  .note__open:focus-visible, .note__act:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .note__meta { margin-left: auto; font-size: var(--dash-caption); color: var(--fg-subtle); white-space: nowrap; }

  .more { display: flex; justify-content: center; margin-top: var(--space-4); }
  .more :global(.ui-error) { width: 100%; }

  /* Táctil: objetivos de 44 px (solo crecen, E-30). */
  @media (pointer: coarse) {
    .pill, .note__open, .note__act { min-height: var(--tap-min); }
  }
  @media (max-width: 719px) {
    .filters { flex-direction: column; align-items: stretch; }
    .note { padding: 12px 12px 10px 11px; gap: 10px; }
    .note.unread { padding-left: 9px; }
    .note__icon { width: 32px; height: 32px; }
    .note__meta { margin-left: 0; width: 100%; }
  }
</style>
