<script>
  // ─────────────────────────────────────────────────────────────
  // Leads (#/leads): atender y convertir.
  // Sale de DashboardApp sin cambiar su funcionalidad (A0): lista con
  // conteo por estado, mensaje desplegable y cambio de estado en línea.
  // Ahora con el cliente HTTP único (el error del cambio de estado se ve),
  // fechas de Houston y la tabla que pasa a tarjetas en el móvil.
  // Búsqueda, filtros en la URL, ficha y convertir llegan en A2.
  // ─────────────────────────────────────────────────────────────
  import { onMount } from 'svelte';
  import PageHeader from './ui/PageHeader.svelte';
  import KpiGrid from './ui/KpiGrid.svelte';
  import Kpi from './ui/Kpi.svelte';
  import DataTable from './ui/DataTable.svelte';
  import StatusChip from './ui/StatusChip.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import LoadingState from './ui/LoadingState.svelte';
  import Icon from './ui/Icon.svelte';
  import { api } from './lib/api.js';
  import { toast, toastError } from './lib/toast.svelte.js';
  import { data, loadLeads } from './lib/store.svelte.js';
  import { fmtDate, fmtDateTime } from './lib/dates.js';

  const STATUSES = [
    { id: 'new', label: 'Nuevo' },
    { id: 'contacted', label: 'Contactado' },
    { id: 'converted', label: 'Convertido' },
    { id: 'archived', label: 'Archivado' },
  ];
  const SOURCES = {
    chat:       { label: 'Chatbot',     tone: 'data'    },
    diagnostic: { label: 'Diagnóstico', tone: 'info'    },
    contact:    { label: 'Contacto',    tone: 'neutral' },
  };
  function sourceMeta(s) { return SOURCES[s] || SOURCES.contact; }

  const COLUMNS = [
    { key: 'contact', label: 'Contacto', primary: true },
    { key: 'source', label: 'Origen' },
    { key: 'message', label: 'Mensaje', wide: true },
    { key: 'date', label: 'Fecha' },
    { key: 'status', label: 'Estado', action: true },
  ];

  const leads = $derived(data.leads);
  const stats = $derived(data.leadStats);

  // Tira de conteo por estado para la cabecera de Leads (densidad).
  const leadCounts = $derived([
    { id: 'new',       label: 'Nuevos',      n: stats?.new ?? 0       },
    { id: 'contacted', label: 'Contactados', n: stats?.contacted ?? 0 },
    { id: 'converted', label: 'Convertidos', n: stats?.converted ?? 0 },
    { id: 'archived',  label: 'Archivados',  n: stats?.archived ?? 0  },
  ]);

  // ── Monograma ────────────────────────────────────────────────
  function initials(s) {
    const parts = (s || '?').trim().split(/[\s—-]+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  const MONO_PALETTE = ['#6366f1', '#0ea5e9', '#14b8a6', '#f97316', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];
  function monoColor(s) {
    let h = 0; const t = s || '?';
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
    return MONO_PALETTE[Math.abs(h) % MONO_PALETTE.length];
  }

  // ── Cambio de estado (optimista; si falla, se revierte y se avisa) ──
  async function setStatus(lead, status) {
    const prev = lead.status;
    if (prev === status) return;
    lead.status = status;
    try {
      await api('/api/admin/leads/' + encodeURIComponent(lead.ref_id), {
        method: 'PATCH',
        body: { status },
      });
      toast('Estado actualizado');
      loadLeads();
    } catch (e) {
      lead.status = prev;
      toastError(e, 'No se pudo cambiar el estado.');
    }
  }

  onMount(() => { if (data.leadsLoaded) loadLeads(); });
</script>

<PageHeader title="Leads">
  {#snippet actions()}
    <button class="b b--ghost" onclick={loadLeads} disabled={data.leadsLoading}>
      <Icon name="refresh" size={16} />{data.leadsLoading ? 'Actualizando…' : 'Actualizar'}
    </button>
  {/snippet}
</PageHeader>

{#if stats}
  <KpiGrid count={5} label="Leads por estado">
    <Kpi label="Total" value={stats.total ?? leads.length} />
    {#each leadCounts as c (c.id)}
      <Kpi label={c.label} value={c.n} />
    {/each}
  </KpiGrid>
{/if}

{#if data.leadsError && !leads.length}
  <ErrorState title="No se pudieron cargar los leads" message={data.leadsError} onretry={loadLeads} />
{:else if !data.leadsLoaded}
  <LoadingState loading={true} rows={6} height={52} label="Cargando leads" />
{:else if leads.length === 0}
  <div class="ui-card">
    <EmptyState art="inbox" title="Sin leads todavía" text="Cuando alguien use el formulario de contacto, el chatbot o el diagnóstico, aparecerá aquí." />
  </div>
{:else}
  {#if data.leadsError}
    <div class="stale"><ErrorState compact title="No se pudo actualizar" message={data.leadsError} onretry={loadLeads} /></div>
  {/if}
  <DataTable columns={COLUMNS} rows={leads} rowKey="ref_id" caption="Leads">
    {#snippet cell(lead, col)}
      {#if col.key === 'contact'}
        <div class="c-cell">
          <span class="mono-av" style="background:{monoColor(lead.name || lead.email || lead.ref_id)}">{initials(lead.name || lead.email || lead.ref_id)}</span>
          <div class="c-text">
            <div class="c-name">{lead.name || 'Sin nombre'}</div>
            <div class="c-sub">{lead.email || lead.phone || lead.ref_id}</div>
          </div>
        </div>
      {:else if col.key === 'source'}
        {@const src = sourceMeta(lead.source)}
        <StatusChip tone={src.tone} label={src.label} />
      {:else if col.key === 'message'}
        {#if lead.interest || lead.message}
          {@const full = lead.interest || lead.message}
          {#if full.length > 80 || full.includes('\n')}
            <details class="msg-det">
              <summary class="msg-sum" title={full}><span class="msg-caret"><Icon name="chevron" size={14} /></span><span class="msg-txt">{full}</span></summary>
              <div class="msg-full">{full}</div>
            </details>
          {:else}
            <span class="msg-line" title={full}>{full}</span>
          {/if}
        {:else}
          <span class="none">Sin mensaje</span>
        {/if}
      {:else if col.key === 'date'}
        <span class="dim" title={fmtDateTime(lead.created_at)}>{fmtDate(lead.created_at)}</span>
      {:else if col.key === 'status'}
        <select class="status status--{lead.status}" value={lead.status} aria-label={'Estado de ' + (lead.name || lead.email || lead.ref_id)}
          onchange={(e) => setStatus(lead, e.currentTarget.value)}>
          {#each STATUSES as s}<option value={s.id}>{s.label}</option>{/each}
        </select>
      {/if}
    {/snippet}
  </DataTable>
{/if}

<style>
  .stale { margin-bottom: var(--space-3); }
  .c-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .c-text { min-width: 0; }
  .c-name { color: var(--fg-primary); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .c-sub { font-size: var(--dash-caption); color: var(--fg-subtle); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mono-av { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: 0 0 auto; border-radius: var(--radius-pill); color: #fff; font-family: var(--font-display); font-size: 11px; font-weight: 700; line-height: 1; }
  .dim { color: var(--fg-subtle); white-space: nowrap; font-size: var(--dash-small); font-variant-numeric: tabular-nums; }
  .none { color: var(--fg-faint); }

  /* Texto corto: una línea con elipsis + tooltip nativo (title). */
  .msg-line { display: block; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* Texto largo / multilínea: <details> expandible por fila (transcript del chat). */
  .msg-det { max-width: 320px; }
  .msg-sum { display: flex; align-items: center; gap: 4px; cursor: pointer; list-style: none; color: var(--fg-secondary); transition: color var(--duration-fast); }
  .msg-sum::-webkit-details-marker { display: none; }
  .msg-sum:hover { color: var(--fg-primary); }
  .msg-txt { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .msg-caret { display: inline-flex; flex: 0 0 auto; color: var(--fg-subtle); transition: transform var(--duration-fast); }
  .msg-det[open] .msg-caret { transform: rotate(90deg); }
  .msg-det[open] .msg-txt { white-space: normal; color: var(--fg-primary); }
  .msg-full { margin-top: 8px; padding: 10px 12px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); white-space: pre-wrap; word-break: break-word; line-height: 1.5; color: var(--fg-primary); max-height: 280px; overflow-y: auto; }

  /* Estado como píldora tintada (Orbit): sigue siendo un <select> editable. */
  .status { appearance: none; -webkit-appearance: none; min-height: 30px; background: var(--accent-gold-dim); border: 1px solid var(--accent-gold-line); border-radius: var(--radius-pill); color: var(--accent-gold); padding: 5px 12px; font-size: var(--dash-caption); font-weight: 600; cursor: pointer; transition: filter var(--duration-fast); }
  .status:hover { filter: brightness(1.12); }
  .status option { background: var(--bg-elevated); color: var(--fg-primary); }
  .status--contacted { background: var(--accent-teal-dim); border-color: var(--accent-teal-line); color: var(--accent-teal); }
  .status--converted { background: var(--accent-teal-dim); border-color: var(--accent-teal-line); color: var(--accent-teal); }
  .status--archived { background: var(--bg-elevated); border-color: var(--border-strong); color: var(--fg-secondary); }
  @media (pointer: coarse) { .status { min-height: var(--tap-min); padding: 8px 14px; } }

  @media (max-width: 719px) {
    .msg-line, .msg-det { max-width: none; }
    .msg-line { white-space: normal; }
  }
</style>
