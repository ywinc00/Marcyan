<script>
  // ═══ Finanzas (A4) ════════════════════════════════════════════════
  // "Saber qué entra, qué se debe y qué sale, y registrarlo sin errores."
  // Rutas:  #/finanzas                      resumen + facturas + egresos
  //         #/finanzas?estado=vencida&q=…&pag=2   filtros de facturas (E-06)
  //         #/finanzas?mes=2026-10&cat=hosting    filtros de gastos
  //         #/finanzas/facturas/INV-004     ficha de la factura
  // Las reglas de dinero (montos, estados, pagos) son las del servidor:
  // lib/finance-rules.mjs, compartido. Una sola acción primaria por vista
  // (H-07): aquí "Nueva factura"; en la ficha, "Registrar pago".
  import PageHeader from './ui/PageHeader.svelte';
  import KpiGrid from './ui/KpiGrid.svelte';
  import Kpi from './ui/Kpi.svelte';
  import Card from './ui/Card.svelte';
  import DataTable from './ui/DataTable.svelte';
  import { untrack } from 'svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import LoadingState from './ui/LoadingState.svelte';
  import StatusChip from './ui/StatusChip.svelte';
  import Icon from './ui/Icon.svelte';
  import RevenueChart from './finanzas/RevenueChart.svelte';
  import InvoiceDetail from './finanzas/InvoiceDetail.svelte';
  import InvoiceForm from './finanzas/InvoiceForm.svelte';
  import PaymentForm from './finanzas/PaymentForm.svelte';
  import ClientForm from './finanzas/ClientForm.svelte';
  import NewClientDialog from './crm/NewClientDialog.svelte';
  import ExpensesCard from './finanzas/ExpensesCard.svelte';
  import SubscriptionsCard from './finanzas/SubscriptionsCard.svelte';

  import { api, errorMessage, isSessionError } from './lib/api.js';
  import { route, href, setQuery, navigate } from './lib/router.svelte.js';
  import { refreshShell } from './lib/store.svelte.js';
  import { fmtDay, monthKey } from './lib/dates.js';
  import {
    formatUsd, fmtUsd0, STATUS_FILTERS, STATUS_TONE, INVOICE_STATUS_LABELS,
    isPayable, initials, monthLong, lastMonthKeys,
  } from './finanzas/fin.js';

  const PAGE = 25;

  // ── Ruta ──────────────────────────────────────────────────────
  const detailRef = $derived(route.sub[0] === 'facturas' && route.sub[1] ? route.sub[1] : '');
  const filter = $derived(STATUS_FILTERS.find((f) => f.id === (route.query.estado || '')) || STATUS_FILTERS[0]);
  const search = $derived((route.query.q || '').slice(0, 200));
  const page = $derived(Math.max(1, parseInt(route.query.pag, 10) || 1));
  // Facturas de un proyecto (CT-03): llega desde la ficha del proyecto como
  // ?proyecto=<id> y se ve como una píldora activa que se puede quitar.
  const projectFilter = $derived(/^\d{1,12}$/.test(route.query.proyecto || '') ? route.query.proyecto : '');
  // La lista vuelve con sus filtros (la ficha conserva la query del hash).
  const listQuery = $derived(Object.fromEntries(Object.entries(route.query).filter(([k]) => ['estado', 'q', 'pag', 'mes', 'cat', 'proyecto'].includes(k))));
  const backHref = $derived(href('finanzas', [], listQuery));

  // ── Resumen ───────────────────────────────────────────────────
  let summary = $state(null);
  let summaryError = $state('');
  let summaryLoading = $state(false);

  async function loadSummary() {
    summaryLoading = true; summaryError = '';
    try { summary = (await api('/api/admin/finance/summary')).summary; }
    catch (e) { if (!isSessionError(e)) summaryError = errorMessage(e, 'No se pudo cargar el resumen.'); }
    finally { summaryLoading = false; }
  }

  // % de lo cobrado este mes frente al MISMO tramo de días del mes anterior
  // (antes se comparaba un mes a medias con uno entero: FIN-11).
  const collectedDelta = $derived.by(() => {
    if (!summary) return null;
    const prev = Number(summary.collected_prev_same_period_cents || 0);
    if (prev <= 0) return null;
    return Math.round(((Number(summary.collected_this_month_cents) - prev) / prev) * 100);
  });
  const prevMonthName = $derived(monthLong(lastMonthKeys(monthKey(), 2)[1]).split(' ')[0]);
  const net = $derived(summary ? Number(summary.net_this_month_cents) : 0);

  // ── Facturas ──────────────────────────────────────────────────
  let invoices = $state([]);
  let invTotal = $state(0);
  let counts = $state(null);
  let invLoading = $state(false);
  let invError = $state('');
  let searchText = $state('');
  let searchTimer;

  async function loadInvoices() {
    invLoading = true; invError = '';
    const p = new URLSearchParams({ limit: String(PAGE), offset: String((page - 1) * PAGE) });
    if (filter.api) p.set('status', filter.api);
    if (search) p.set('search', search);
    if (projectFilter) p.set('projectId', projectFilter);
    try {
      const j = await api('/api/admin/invoices?' + p.toString());
      invoices = j.rows || []; invTotal = j.total || 0; counts = j.counts || null;
      // Página fuera de rango (enlace viejo o tras borrar la última factura de
      // la página): se salta a la última página que sí tiene facturas.
      if (!invoices.length && invTotal > 0 && page > 1) {
        const last = Math.ceil(invTotal / PAGE);
        setQuery({ pag: last > 1 ? String(last) : '' });
      }
    } catch (e) {
      if (!isSessionError(e)) invError = errorMessage(e, 'No se pudieron cargar las facturas.');
    } finally { invLoading = false; }
  }

  // Lista y resumen se recargan al entrar en la vista o al cambiar filtros.
  $effect(() => { if (!detailRef) { filter; search; page; projectFilter; loadInvoices(); } });
  $effect(() => { if (!detailRef) loadSummary(); });
  // El buscador refleja la URL (al llegar por enlace o con Atrás). Solo copia
  // si de verdad cambió: la URL guarda el texto recortado y, si se copiara
  // siempre, el espacio que se acaba de escribir desaparecería del campo.
  $effect(() => {
    const s = search;
    if (untrack(() => searchText.trim()) !== s) searchText = s;
  });

  function onSearch(e) {
    searchText = e.currentTarget.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setQuery({ q: searchText.trim(), pag: '' }), 300);
  }
  function setFilter(id) { setQuery({ estado: id, pag: '' }); }
  function goPage(n) { setQuery({ pag: n > 1 ? String(n) : '' }, { replace: false }); }
  const pages = $derived(Math.max(1, Math.ceil(invTotal / PAGE)));

  // ── Modales ───────────────────────────────────────────────────
  let invoiceFormOpen = $state(false);
  let payOpen = $state(false);
  let payInvoice = $state(null);
  let clientFormOpen = $state(false);
  let newClientOpen = $state(false);

  function openPay(inv) { payInvoice = inv; payOpen = true; }
  function invoiceCreated(inv) {
    navigate('finanzas', ['facturas', inv.invoice_number], listQuery);
  }
  async function afterChange() { await Promise.all([loadInvoices(), loadSummary()]); }
  function refreshAll() { afterChange(); refreshShell(); expensesCard?.load(); }
  let expensesCard = $state(null);

  const columns = [
    { key: 'number', label: 'Factura', primary: true },
    { key: 'client', label: 'Cliente' },
    { key: 'amount', label: 'Monto', align: 'end' },
    { key: 'balance', label: 'Saldo', align: 'end' },
    { key: 'due', label: 'Vence' },
    { key: 'status', label: 'Estado' },
    { key: 'act', label: 'Acción', action: true },
  ];
</script>

<div class="fin">
{#if detailRef}
  <InvoiceDetail ref={detailRef} {backHref} onclose={() => navigate('finanzas', [], listQuery)} />
{:else}
  <PageHeader title="Finanzas" subtitle="Lo que entra, lo que se debe y lo que sale.">
    {#snippet actions()}
      <button type="button" class="b" onclick={refreshAll} disabled={summaryLoading || invLoading}><Icon name="refresh" size={16} />Actualizar</button>
      <button type="button" class="b b--primary" onclick={() => (invoiceFormOpen = true)}>Nueva factura</button>
    {/snippet}
  </PageHeader>

  <!-- ═══ KPIs: cada nota dice qué cuenta la cifra (FIN-11, FIN-12) ═══ -->
  {#if summaryError && !summary}
    <div class="fin-block"><ErrorState title="No se pudo cargar el resumen" message={summaryError} onretry={loadSummary} /></div>
  {:else}
    <KpiGrid count={5} label="Resumen del mes">
      <Kpi label="Cobrado (mes)" art="coins" tone={summary && summary.collected_this_month_cents > 0 ? 'data' : ''} value={summary ? fmtUsd0(summary.collected_this_month_cents) : '…'}>
        {#if summary && collectedDelta !== null}
          <span class:fin-up={collectedDelta >= 0} class:fin-down={collectedDelta < 0}>{collectedDelta >= 0 ? '+' : ''}{collectedDelta}%</span> vs el mismo tramo de {prevMonthName}
        {:else}Pagos recibidos este mes{/if}
      </Kpi>
      <Kpi label="Por cobrar" art="invoice" tone={summary && summary.ar_total_cents > 0 ? 'accent' : ''} href={href('finanzas', [], { estado: 'abiertas' })}
        value={summary ? fmtUsd0(summary.ar_total_cents) : '…'}>
        {#if summary && !summary.counts.open_invoices}Ninguna factura abierta{#if summary.draft_count}{` (${summary.draft_count} en borrador, aparte)`}{/if}
        {:else if summary}
          Saldo de {summary.counts.open_invoices} factura{summary.counts.open_invoices === 1 ? '' : 's'} abierta{summary.counts.open_invoices === 1 ? '' : 's'}, sin borradores{#if summary.draft_count}{` (${summary.draft_count} aparte)`}{/if}
        {:else}Saldo de las facturas abiertas{/if}
      </Kpi>
      <Kpi label="Vencido" art="alert" tone={summary && summary.overdue_cents > 0 ? 'error' : ''}
        href={href('finanzas', [], { estado: 'vencida' })} value={summary ? fmtUsd0(summary.overdue_cents) : '…'}>
        {#if summary && summary.overdue_count > 0}
          {summary.overdue_count} factura{summary.overdue_count === 1 ? '' : 's'} pasada{summary.overdue_count === 1 ? '' : 's'} de fecha con saldo
        {:else}Ninguna factura pasada de fecha{/if}
      </Kpi>
      <Kpi label="Gastos (mes)" art="card" value={summary ? fmtUsd0(summary.expenses_this_month_cents) : '…'}>
        {#if summary}Gastos puntuales. Suscripciones aparte: {formatUsd(summary.subscriptions_monthly_cents)} al mes{:else}Gastos puntuales del mes{/if}
      </Kpi>
      <Kpi label="Neto (mes)" art="chart-up" tone={summary && net !== 0 ? (net > 0 ? 'data' : 'error') : ''} value={summary ? fmtUsd0(net) : '…'}
        note="Cobrado menos gastos del mes y suscripciones (estimado mensual)" />
    </KpiGrid>
  {/if}

  <div class="fin-block">
    {#if summary}
      <RevenueChart revenue={summary.revenue_by_month || []} delta={collectedDelta} prevLabel={prevMonthName} />
    {:else if !summaryError}
      <LoadingState loading={true} rows={1} height={260} label="Cargando el gráfico…" />
    {/if}
  </div>

  <!-- ═══ Facturas ═══ -->
  <div class="fin-block">
    <Card title="Facturas">
      {#snippet actions()}
        <button type="button" class="b b--ghost b--mini" onclick={() => (newClientOpen = true)}>Nuevo cliente</button>
        <button type="button" class="b b--ghost b--mini" onclick={() => (clientFormOpen = true)}>Cliente desde brief</button>
      {/snippet}

      <div class="fin-tools">
        <div class="fin-pills" role="group" aria-label="Filtrar por estado">
          {#each STATUS_FILTERS as f (f.id)}
            <button type="button" class="fin-pill" aria-pressed={filter.id === f.id} onclick={() => setFilter(f.id)}>
              {f.label}{#if counts}<span class="fin-pill__n">{counts[f.count] ?? 0}</span>{/if}
            </button>
          {/each}
          {#if projectFilter}
            <button type="button" class="fin-pill" aria-pressed="true" onclick={() => setQuery({ proyecto: '', pag: '' })}>
              Proyecto {invoices[0] && invoices[0].project_code ? invoices[0].project_code : `#${projectFilter}`}
              <span class="sr-only">(quitar este filtro)</span>
              <Icon name="close" size={14} />
            </button>
          {/if}
        </div>
        <label class="fin-search">
          <span class="fin-search__icon"><Icon name="search" size={16} /></span>
          <span class="sr-only">Buscar facturas</span>
          <input class="ui-input" type="search" placeholder="Buscar factura o cliente"
            value={searchText} oninput={onSearch} />
        </label>
      </div>

      {#if invError}
        <ErrorState compact title="No se pudieron cargar las facturas" message={invError} onretry={loadInvoices} />
      {:else}
        <LoadingState loading={invLoading && !invoices.length} rows={4}>
          {#if !invoices.length}
            {#if filter.id || search || projectFilter}
              <EmptyState compact title="Ninguna factura con estos filtros" text={search ? `No hay resultados para "${search}".` : `No hay facturas en estado ${filter.label.toLowerCase()}.`}>
                {#snippet action()}<button type="button" class="b b--mini" onclick={() => setQuery({ estado: '', q: '', pag: '', proyecto: '' })}>Quitar filtros</button>{/snippet}
              </EmptyState>
            {:else}
              <EmptyState art="invoice" title="Aún no hay facturas" text="Crea la primera con Nueva factura. Si el cliente no existe, créalo antes con Nuevo cliente." />
            {/if}
          {:else}
            <div class="fin-table" class:is-busy={invLoading}>
              <DataTable {columns} rows={invoices} caption="Facturas">
                {#snippet cell(inv, col)}
                  {#if col.key === 'number'}
                    <a class="fin-num" href={href('finanzas', ['facturas', inv.invoice_number], listQuery)}>{inv.invoice_number}</a>
                    {#if inv.description}<span class="fin-desc">{inv.description}</span>{/if}
                  {:else if col.key === 'client'}
                    <span class="fin-client">
                      <span class="fin-mono" aria-hidden="true">{initials(inv.client_name || inv.client_code)}</span>
                      <span class="fin-client__txt">
                        <span class="fin-client__name">{inv.client_name || 'Sin nombre'}</span>
                        <span class="fin-client__code">{inv.client_code}{inv.project_code ? ' · ' + inv.project_code : ''}</span>
                      </span>
                    </span>
                  {:else if col.key === 'amount'}
                    <span class="fin-money">{formatUsd(inv.amount_cents)}</span>
                  {:else if col.key === 'balance'}
                    <span class="fin-money" class:fin-money--zero={Number(inv.balance_cents) <= 0}>{formatUsd(inv.balance_cents)}</span>
                  {:else if col.key === 'due'}
                    <span class="fin-due" class:is-late={inv.status === 'overdue'}>{inv.due_date ? fmtDay(inv.due_date) : 'Sin fecha'}</span>
                  {:else if col.key === 'status'}
                    <StatusChip tone={STATUS_TONE[inv.status]} label={INVOICE_STATUS_LABELS[inv.status]} />
                  {:else if col.key === 'act'}
                    {#if isPayable(inv)}
                      <button type="button" class="b b--mini" onclick={() => openPay(inv)}>Registrar pago</button>
                    {:else}
                      <a class="b b--ghost b--mini" href={href('finanzas', ['facturas', inv.invoice_number], listQuery)}>Ver ficha</a>
                    {/if}
                  {/if}
                {/snippet}
              </DataTable>
            </div>
            {#if pages > 1}
              <nav class="fin-pager" aria-label="Páginas de facturas">
                <span class="fin-pager__txt">{(page - 1) * PAGE + 1} a {Math.min(page * PAGE, invTotal)} de {invTotal}</span>
                <span class="fin-pager__btns">
                  <button type="button" class="b b--ghost b--mini" disabled={page <= 1} onclick={() => goPage(page - 1)}>Anterior</button>
                  <button type="button" class="b b--ghost b--mini" disabled={page >= pages} onclick={() => goPage(page + 1)}>Siguiente</button>
                </span>
              </nav>
            {/if}
          {/if}
        </LoadingState>
      {/if}
    </Card>
  </div>

  <!-- ═══ Egresos ═══ -->
  <div class="fin-egresos">
    <ExpensesCard bind:this={expensesCard} onchanged={loadSummary} />
    <SubscriptionsCard onchanged={loadSummary} />
  </div>

  <InvoiceForm bind:open={invoiceFormOpen} onsaved={invoiceCreated} />
  <PaymentForm bind:open={payOpen} invoice={payInvoice} onsaved={afterChange} />
  <NewClientDialog bind:open={newClientOpen} />
  <ClientForm bind:open={clientFormOpen} />
{/if}
</div>

<style>
  /* Selects del panel sin el aspecto nativo del sistema: el caret de la
     familia de iconos. Con ámbito de la sección (también sus modales, que
     viven dentro de .fin). */
  .fin :global(select.ui-input) {
    appearance: none; -webkit-appearance: none; padding-right: 32px; cursor: pointer;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b8b95' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>");
    background-repeat: no-repeat; background-position: right 11px center;
  }
  .fin :global(select.ui-input:disabled) { cursor: not-allowed; opacity: .7; }

  .fin-block { margin-bottom: var(--space-5); }
  .fin-up { color: var(--accent-teal); font-weight: 600; }
  .fin-down { color: var(--color-error); font-weight: 600; }

  /* Filtros en pastillas con su recuento (E-06). El activo NO es naranja
     (H-07): un nivel más de superficie, borde fuerte y texto primario. */
  .fin-tools { display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px; }
  .fin-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .fin-pill { display: inline-flex; align-items: center; gap: 7px; min-height: 32px; padding: 5px 12px;
    border-radius: var(--radius-pill); border: 1px solid var(--border); background: transparent;
    color: var(--fg-secondary); font: 500 var(--dash-small)/1.2 var(--font-body); cursor: pointer;
    transition: background-color var(--duration-fast), border-color var(--duration-fast), color var(--duration-fast); }
  .fin-pill:hover { border-color: var(--border-strong); color: var(--fg-primary); }
  .fin-pill[aria-pressed='true'] { background: var(--surface-3); border-color: var(--border-strong); color: var(--fg-primary); }
  .fin-pill__n { font-size: var(--dash-caption); color: var(--fg-subtle); font-variant-numeric: tabular-nums; }
  .fin-pill[aria-pressed='true'] .fin-pill__n { color: var(--fg-secondary); }
  @media (pointer: coarse) { .fin-pill { min-height: 40px; } }
  .fin-search { position: relative; display: block; max-width: 420px; }
  .fin-search__icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); display: inline-flex; color: var(--fg-subtle); pointer-events: none; }
  .fin-search .ui-input { padding-left: 34px; }

  /* Tabla de facturas dentro de la tarjeta: sin doble marco. */
  .fin-table :global(.ui-table-wrap) { border: 0; border-top: 1px solid var(--border-subtle); border-radius: 0; background: transparent; }
  .fin-table :global(.ui-table th:first-child), .fin-table :global(.ui-table td:first-child) { padding-left: 0; }
  .fin-table :global(.ui-table th:last-child), .fin-table :global(.ui-table td:last-child) { padding-right: 0; }
  .fin-table.is-busy { opacity: .6; transition: opacity var(--duration-fast); }
  .fin-num { color: var(--fg-primary); font-weight: 600; text-decoration: none; white-space: nowrap; }
  .fin-num:hover { text-decoration: underline; text-underline-offset: 3px; }
  .fin-desc { display: block; max-width: 30ch; margin-top: 2px; font-size: var(--dash-caption); color: var(--fg-subtle);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fin-client { display: inline-flex; align-items: center; gap: 10px; min-width: 0; }
  /* Monograma con tokens (FIN-16): un nivel de la rampa, sin colores sueltos. */
  .fin-mono { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
    background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--fg-primary); font-size: 11px; font-weight: 650; letter-spacing: -.01em; }
  .fin-client__txt { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
  .fin-client__name { color: var(--fg-primary); }
  .fin-client__code { font-size: var(--dash-caption); color: var(--fg-subtle); }
  .fin-money { color: var(--fg-primary); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .fin-money--zero { color: var(--fg-subtle); }
  .fin-due { color: var(--fg-secondary); white-space: nowrap; }
  .fin-due.is-late { color: var(--color-error); }

  .fin-pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 14px; }
  .fin-pager__txt { font-size: var(--dash-small); color: var(--fg-subtle); }
  .fin-pager__btns { display: inline-flex; gap: 6px; }

  .fin-egresos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-items: start; margin-bottom: var(--space-6); }

  @media (max-width: 1099px) { .fin-egresos { grid-template-columns: 1fr; } }
  /* Móvil estrecho: las cifras de dinero necesitan el ancho entero (en dos
     columnas "$2,300" se cortaba en "$2,3…"). Solo en esta sección. */
  @media (max-width: 479px) {
    .fin :global(.ui-kpis[data-count="5"]) { grid-template-columns: 1fr; }
    .fin :global(.ui-kpis[data-count="3"]) { grid-template-columns: 1fr; }
  }
  @media (max-width: 719px) {
    .fin-table :global(.ui-table-wrap) { border-top: 0; }
    /* Tarjeta dentro de tarjeta: un nivel más de la rampa (H-06). */
    .fin :global(.ui-card .ui-table tr) { background: var(--bg-elevated); }
    .fin-desc { max-width: none; white-space: normal; }
    .fin-search { max-width: none; }
  }
</style>
