<script>
  // Gastos puntuales del negocio (FIN-10, FIN-21): filtro por mes y por
  // categoría con el estado en la URL (#/finanzas?mes=2026-10&cat=hosting),
  // total de lo filtrado, "Cargar más", editar y borrar con confirmación.
  import Card from '../ui/Card.svelte';
  import DataTable from '../ui/DataTable.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import Icon from '../ui/Icon.svelte';
  import ExpenseForm from './ExpenseForm.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { route, setQuery } from '../lib/router.svelte.js';
  import { fmtDay, monthKey } from '../lib/dates.js';
  import { formatUsd, EXPENSE_CATEGORIES, categoryLabel, monthLong, lastMonthKeys } from './fin.js';

  let { onchanged } = $props();

  const PAGE = 20;
  const MONTHS = lastMonthKeys(monthKey(), 12);
  const month = $derived(/^\d{4}-\d{2}$/.test(route.query.mes || '') ? route.query.mes : '');
  const cat = $derived(EXPENSE_CATEGORIES.some((c) => c.id === route.query.cat) ? route.query.cat : '');

  let rows = $state([]);
  let total = $state(0);
  let totalCents = $state(0);
  let loading = $state(false);
  let loadingMore = $state(false);
  let error = $state('');
  let formOpen = $state(false);
  let editing = $state(null);
  let toDelete = $state(null);
  let confirmOpen = $state(false);
  let deleting = $state(false);

  function qs(offset) {
    const p = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
    if (month) p.set('month', month);
    if (cat) p.set('category', cat);
    return p.toString();
  }

  export async function load() {
    loading = true; error = '';
    try {
      const j = await api('/api/admin/expenses?' + qs(0));
      rows = j.rows || []; total = j.total || 0; totalCents = Number(j.total_cents || 0);
    } catch (e) {
      if (!isSessionError(e)) error = errorMessage(e, 'No se pudieron cargar los gastos.');
    } finally { loading = false; }
  }
  async function more() {
    loadingMore = true;
    try {
      const j = await api('/api/admin/expenses?' + qs(rows.length));
      rows = [...rows, ...(j.rows || [])]; total = j.total || total;
    } catch (e) { toastError(e, 'No se pudieron cargar más gastos.'); }
    finally { loadingMore = false; }
  }

  // Recarga al cambiar el mes o la categoría (también al llegar por enlace).
  $effect(() => { month; cat; load(); });

  function openNew() { editing = null; formOpen = true; }
  function openEdit(r) { editing = r; formOpen = true; }
  function askDelete(r) { toDelete = r; confirmOpen = true; }
  async function confirmDelete() {
    deleting = true;
    try {
      await api('/api/admin/expenses/' + toDelete.id, { method: 'DELETE' });
      toast('Gasto borrado');
      confirmOpen = false;
      await load(); onchanged?.();
    } catch (e) { toastError(e, 'No se pudo borrar el gasto.'); }
    finally { deleting = false; }
  }
  async function saved() { await load(); onchanged?.(); }

  const columns = [
    { key: 'label', label: 'Concepto', primary: true },
    { key: 'amount', label: 'Monto', align: 'end' },
    { key: 'date', label: 'Fecha' },
    { key: 'act', label: 'Acciones', action: true },
  ];
  const scope = $derived(month ? monthLong(month) : 'todos los meses');
</script>

<Card title="Gastos" caption="Puntuales del negocio">
  {#snippet actions()}
    <button type="button" class="b b--mini" onclick={openNew}>Nuevo gasto</button>
  {/snippet}

  <div class="xc-filters">
    <label class="xc-filter">
      <span class="sr-only">Mes</span>
      <select class="ui-input" value={month} onchange={(e) => setQuery({ mes: e.currentTarget.value })}>
        <option value="">Todos los meses</option>
        {#each MONTHS as m (m)}<option value={m}>{monthLong(m)}</option>{/each}
      </select>
    </label>
    <label class="xc-filter">
      <span class="sr-only">Categoría</span>
      <select class="ui-input" value={cat} onchange={(e) => setQuery({ cat: e.currentTarget.value })}>
        <option value="">Todas las categorías</option>
        {#each EXPENSE_CATEGORIES as c (c.id)}<option value={c.id}>{c.label}</option>{/each}
      </select>
    </label>
  </div>
  {#if !error && (total > 0 || month || cat)}
    <p class="xc-total" aria-live="polite">
      <span class="xc-total__num">{formatUsd(totalCents)}</span>
      en {scope}{cat ? ' · ' + categoryLabel(cat) : ''} · {total} gasto{total === 1 ? '' : 's'}
    </p>
  {/if}

  {#if error}
    <ErrorState compact title="No se pudieron cargar los gastos" message={error} onretry={load} />
  {:else}
    <LoadingState {loading} rows={3}>
      {#if !rows.length}
        <EmptyState compact title={month || cat ? 'Nada con estos filtros' : 'Aún no hay gastos'}
          text={month || cat ? 'Prueba con otro mes o categoría.' : 'Apunta aquí lo que pagas una sola vez: dominios, fotos, asesorías.'}>
          {#snippet action()}
            {#if month || cat}<button type="button" class="b b--mini" onclick={() => setQuery({ mes: '', cat: '' })}>Ver todos</button>{/if}
          {/snippet}
        </EmptyState>
      {:else}
        <div class="xc-table">
          <DataTable {columns} {rows} caption="Gastos">
            {#snippet cell(r, col)}
              {#if col.key === 'label'}
                <span class="xc-name">{r.label}</span>
                <span class="xc-sub">
                  {#if r.category}<StatusChip tone="neutral" label={categoryLabel(r.category)} />{/if}
                  {#if r.vendor}<span>{r.vendor}</span>{/if}
                </span>
              {:else if col.key === 'amount'}
                <span class="xc-money">{formatUsd(r.amount_cents)}</span>
              {:else if col.key === 'date'}
                <span class="xc-dim">{fmtDay(r.spent_at)}</span>
              {:else if col.key === 'act'}
                <span class="xc-acts">
                  <button type="button" class="ui-icon-btn" aria-label="Editar {r.label}" title="Editar" onclick={() => openEdit(r)}><Icon name="edit" size={17} /></button>
                  <button type="button" class="ui-icon-btn xc-del" aria-label="Borrar {r.label}" title="Borrar" onclick={() => askDelete(r)}><Icon name="trash" size={17} /></button>
                </span>
              {/if}
            {/snippet}
          </DataTable>
        </div>
        {#if rows.length < total}
          <div class="xc-more">
            <button type="button" class="b b--ghost" disabled={loadingMore} onclick={more}>
              {loadingMore ? 'Cargando…' : `Cargar más (${total - rows.length})`}
            </button>
          </div>
        {/if}
      {/if}
    </LoadingState>
  {/if}
</Card>

<ExpenseForm bind:open={formOpen} expense={editing} onsaved={saved} />
<ConfirmDialog bind:open={confirmOpen} title="¿Borrar este gasto?" busy={deleting} confirmLabel="Borrar gasto"
  message={toDelete ? `Se borra "${toDelete.label}" de ${formatUsd(toDelete.amount_cents)} (${fmtDay(toDelete.spent_at)}). Dejará de contar en los gastos del mes y en el neto. No se puede deshacer.` : ''}
  onconfirm={confirmDelete} />

<style>
  .xc-filters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
  .xc-filter { min-width: 0; }
  .xc-total { margin: 0 0 12px; font-size: var(--dash-small); color: var(--fg-subtle); }
  .xc-total__num { color: var(--fg-primary); font-weight: 600; font-variant-numeric: tabular-nums; margin-right: 2px; }
  .xc-table :global(.ui-table-wrap) { border: 0; border-top: 1px solid var(--border-subtle); border-radius: 0; background: transparent; }
  .xc-table :global(.ui-table th:first-child), .xc-table :global(.ui-table td:first-child) { padding-left: 0; }
  .xc-table :global(.ui-table th:last-child), .xc-table :global(.ui-table td:last-child) { padding-right: 0; }
  .xc-name { display: block; color: var(--fg-primary); }
  .xc-sub { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: var(--dash-caption); color: var(--fg-subtle); margin-top: 4px; }
  .xc-sub:empty { display: none; }
  .xc-dim { color: var(--fg-subtle); white-space: nowrap; }
  .xc-money { color: var(--fg-primary); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .xc-acts { display: inline-flex; gap: 2px; justify-content: flex-end; }
  .xc-del:hover { color: var(--color-error); }
  .xc-more { display: flex; justify-content: center; margin-top: 12px; }
  @media (max-width: 479px) { .xc-filters { grid-template-columns: 1fr; } }
  @media (max-width: 719px) {
    .xc-table :global(.ui-table tr) { background: var(--bg-elevated); }
    .xc-table :global(.ui-table-wrap) { border-top: 0; }
    .xc-table :global(.ui-table td:first-child) { padding-left: 0; }
  }
</style>
