<script>
  // Ficha de una factura: #/finanzas/facturas/INV-004 (FIN-01, FIN-07, FIN-08).
  // Descripción, fechas, estado con su porqué, proyecto (acordado, facturado,
  // cobrado) e historial de pagos con editar y borrar. Una sola acción
  // primaria: "Registrar pago" (si hay saldo). Borrar solo si no tiene pagos;
  // si los tiene, se anula (el historial de cobros no se pierde).
  import PageHeader from '../ui/PageHeader.svelte';
  import KpiGrid from '../ui/KpiGrid.svelte';
  import Kpi from '../ui/Kpi.svelte';
  import Card from '../ui/Card.svelte';
  import DataTable from '../ui/DataTable.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import Icon from '../ui/Icon.svelte';
  import InvoiceForm from './InvoiceForm.svelte';
  import PaymentForm from './PaymentForm.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { fmtDay, todayISO, dayISO } from '../lib/dates.js';
  import {
    formatUsd, INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS, STATUS_TONE, STATUS_HELP,
    isPayable, daysBetween,
  } from './fin.js';

  let { ref, backHref = '#/finanzas', onclose } = $props();

  let inv = $state(null);
  let loading = $state(true);
  let error = $state('');
  let notFound = $state(false);

  let editOpen = $state(false);
  let payOpen = $state(false);
  let payEditing = $state(null);
  let confirmOpen = $state(false);
  let confirmKind = $state('delete'); // delete | void | payment
  let paymentToDelete = $state(null);
  let busy = $state(false);

  async function load() {
    loading = true; error = ''; notFound = false;
    try {
      const j = await api('/api/admin/invoices/' + encodeURIComponent(ref));
      inv = j.invoice;
    } catch (e) {
      inv = null;
      if (e && e.status === 404) notFound = true;
      else if (!isSessionError(e)) error = errorMessage(e, 'No se pudo cargar la factura.');
    } finally { loading = false; }
  }
  $effect(() => { ref; load(); });

  const payments = $derived(inv ? inv.payments || [] : []);
  const hasPayments = $derived(payments.length > 0);
  const overdueDays = $derived(inv && inv.status === 'overdue' ? daysBetween(dayISO(inv.due_date), todayISO()) : 0);
  const project = $derived(inv ? inv.project : null);

  function openPay() { payEditing = null; payOpen = true; }
  function editPayment(p) { payEditing = p; payOpen = true; }
  function askDestroy() { confirmKind = hasPayments ? 'void' : 'delete'; confirmOpen = true; }
  function askDeletePayment(p) { paymentToDelete = p; confirmKind = 'payment'; confirmOpen = true; }

  // Tras guardar en un modal: la respuesta ya trae la factura recalculada.
  function applied(next) { if (next && next.id) inv = next; else load(); }

  async function confirm() {
    busy = true;
    try {
      if (confirmKind === 'delete') {
        await api('/api/admin/invoices/' + inv.id, { method: 'DELETE' });
        toast(`${inv.invoice_number} borrada`);
        confirmOpen = false;
        onclose?.();
        return;
      }
      if (confirmKind === 'void') {
        const j = await api('/api/admin/invoices/' + inv.id, { method: 'PATCH', body: { status: 'void' } });
        toast(`${inv.invoice_number} anulada`);
        confirmOpen = false;
        inv = j.invoice;
        return;
      }
      const j = await api('/api/admin/payments/' + paymentToDelete.id, { method: 'DELETE' });
      toast('Pago borrado');
      confirmOpen = false;
      applied(j.invoice);
    } catch (e) { toastError(e, 'No se pudo completar la acción.'); }
    finally { busy = false; }
  }

  const confirmText = $derived.by(() => {
    if (!inv) return { title: '', message: '', label: '' };
    if (confirmKind === 'delete') return {
      title: `¿Borrar ${inv.invoice_number}?`, label: 'Borrar factura',
      message: `Se borra la factura de ${formatUsd(inv.amount_cents)} a ${inv.client_name || 'este cliente'}. No tiene pagos, así que no se pierde ningún cobro. No se puede deshacer.`,
    };
    if (confirmKind === 'void') return {
      title: `¿Anular ${inv.invoice_number}?`, label: 'Anular factura',
      message: `Tiene ${payments.length} pago${payments.length === 1 ? '' : 's'} registrado${payments.length === 1 ? '' : 's'}, por eso no se borra: se anula. Deja de contar en Por cobrar (${formatUsd(inv.balance_cents)} de saldo) y no admite más pagos. Los pagos se conservan y puedes reactivarla al editarla.`,
    };
    const p = paymentToDelete;
    return {
      title: '¿Borrar este pago?', label: 'Borrar pago',
      message: p ? `Se borra el pago de ${formatUsd(p.amount_cents)} del ${fmtDay(p.paid_at)}. El saldo de ${inv.invoice_number} sube a ${formatUsd(Number(inv.balance_cents) + Number(p.amount_cents))} y deja de contar en Cobrado. No se puede deshacer.` : '',
    };
  });

  const payColumns = [
    { key: 'date', label: 'Fecha', primary: true },
    { key: 'method', label: 'Método' },
    { key: 'ref', label: 'Referencia' },
    { key: 'amount', label: 'Monto', align: 'end' },
    { key: 'act', label: 'Acciones', action: true },
  ];
</script>

<nav class="fd-back" aria-label="Volver">
  <a href={backHref}><span class="fd-back__icon"><Icon name="chevron" size={16} /></span>Facturas</a>
</nav>

{#if loading && !inv}
  <LoadingState loading={true} rows={4} height={64} label="Cargando la factura…" />
{:else if notFound}
  <EmptyState art="invoice" title="No encontramos la factura {ref}"
    text="Puede que se haya borrado o que el enlace esté mal escrito.">
    {#snippet action()}<a class="b" href={backHref}>Ver todas las facturas</a>{/snippet}
  </EmptyState>
{:else if error}
  <ErrorState title="No se pudo cargar la factura" message={error} onretry={load} />
{:else if inv}
  <PageHeader title={inv.invoice_number} subtitle={[inv.client_name, inv.description].filter(Boolean).join(' · ')}>
    {#snippet badge()}<StatusChip tone={STATUS_TONE[inv.status]} label={INVOICE_STATUS_LABELS[inv.status]} />{/snippet}
    {#snippet actions()}
      <!-- Anulada con pagos: ya no hay nada que anular ni se puede borrar. -->
      {#if !(inv.status === 'void' && hasPayments)}
        <button type="button" class="b b--danger" onclick={askDestroy}>{hasPayments ? 'Anular' : 'Borrar'}</button>
      {/if}
      <button type="button" class="b" onclick={() => (editOpen = true)}><Icon name="edit" size={16} />Editar</button>
      {#if isPayable(inv)}
        <button type="button" class="b b--primary" onclick={openPay}>Registrar pago</button>
      {/if}
    {/snippet}
  </PageHeader>

  {#if inv.status === 'void' && hasPayments}
    <p class="fd-note">Anulada. Ya no está en Por cobrar; sus pagos siguen contando como cobrados en su mes.</p>
  {/if}

  <KpiGrid count={3} label="Importes de la factura">
    <Kpi label="Monto" value={formatUsd(inv.amount_cents)} art="invoice" note={inv.issued_at ? 'Emitida el ' + fmtDay(inv.issued_at) : 'Total de la factura'} />
    <Kpi label="Cobrado" value={formatUsd(inv.paid_cents)} art="coins" tone={Number(inv.paid_cents) > 0 ? 'data' : ''}
      note="{payments.length} pago{payments.length === 1 ? '' : 's'}" />
    <Kpi label="Saldo" value={formatUsd(inv.balance_cents)} art={inv.status === 'overdue' ? 'alert' : 'card'}
      tone={inv.status === 'overdue' ? 'error' : (Number(inv.balance_cents) > 0 && inv.status !== 'void' ? 'accent' : '')}
      note={inv.status === 'void' ? 'Anulada: no se cobra' : (Number(inv.balance_cents) > 0 ? 'Pendiente de cobro' : 'Nada pendiente')} />
  </KpiGrid>

  <div class="fd-grid">
    <Card title="Datos de la factura">
      <dl class="fd-dl">
        <div><dt>Estado</dt><dd><strong class="fd-strong">{INVOICE_STATUS_LABELS[inv.status]}.</strong> <span class="fd-help">{STATUS_HELP[inv.status]}</span></dd></div>
        <div><dt>Cliente</dt><dd>{inv.client_name || 'Sin nombre'} <span class="fd-dim">{inv.client_code}</span></dd></div>
        <div><dt>Emitida</dt><dd>{inv.issued_at ? fmtDay(inv.issued_at) : 'Sin fecha'}</dd></div>
        <div><dt>Vence</dt><dd class:fd-late={inv.status === 'overdue'}>
          {inv.due_date ? fmtDay(inv.due_date) : 'Sin fecha'}
          {#if overdueDays > 0}<span> · vencida hace {overdueDays} día{overdueDays === 1 ? '' : 's'}</span>{/if}
        </dd></div>
        <div class="fd-dl__wide"><dt>Descripción</dt><dd>{inv.description || 'Sin descripción'}</dd></div>
      </dl>
    </Card>

    <Card title="Proyecto">
      {#if project}
        <p class="fd-project">{project.name || 'Proyecto'} <span class="fd-dim">{project.project_code}</span></p>
        <dl class="fd-dl fd-dl--nums">
          <div><dt>Acordado</dt><dd>{formatUsd(project.agreed_amount_cents)}</dd></div>
          <div><dt>Facturado</dt><dd>{formatUsd(project.invoiced_cents)}</dd></div>
          <div><dt>Cobrado</dt><dd>{formatUsd(project.collected_cents)}</dd></div>
          <div><dt>Falta por facturar</dt><dd>{formatUsd(Math.max(0, Number(project.agreed_amount_cents) - Number(project.invoiced_cents)))}</dd></div>
        </dl>
        <p class="fd-foot">Facturado no cuenta las anuladas.</p>
      {:else}
        <EmptyState compact title="Sin proyecto"
          text="Enlázala a un proyecto con Editar para ver cuánto falta por facturar y por cobrar de ese trabajo." />
      {/if}
    </Card>
  </div>

  <Card title="Pagos" caption="Historial de cobros de esta factura">
    {#if !hasPayments}
      <EmptyState compact title="Sin pagos todavía"
        text={inv.status === 'void' ? 'Está anulada: no admite pagos.' : 'Cuando el cliente pague, regístralo con Registrar pago.'} />
    {:else}
      <div class="fd-table">
        <DataTable columns={payColumns} rows={payments} caption="Pagos de la factura">
          {#snippet cell(p, col)}
            {#if col.key === 'date'}<span class="fd-strong">{fmtDay(p.paid_at)}</span>
            {:else if col.key === 'method'}{PAYMENT_METHOD_LABELS[p.method] || 'Otro'}
            {:else if col.key === 'ref'}<span class="fd-dim">{p.reference || 'Sin referencia'}</span>
            {:else if col.key === 'amount'}<span class="fd-money">{formatUsd(p.amount_cents)}</span>
            {:else if col.key === 'act'}
              <span class="fd-acts">
                <button type="button" class="ui-icon-btn" aria-label="Editar el pago del {fmtDay(p.paid_at)}" title="Editar" onclick={() => editPayment(p)}><Icon name="edit" size={17} /></button>
                <button type="button" class="ui-icon-btn fd-del" aria-label="Borrar el pago del {fmtDay(p.paid_at)}" title="Borrar" onclick={() => askDeletePayment(p)}><Icon name="trash" size={17} /></button>
              </span>
            {/if}
          {/snippet}
        </DataTable>
      </div>
    {/if}
  </Card>

  <InvoiceForm bind:open={editOpen} invoice={inv} onsaved={applied} />
  <PaymentForm bind:open={payOpen} invoice={inv} payment={payEditing} onsaved={applied} />
  <ConfirmDialog bind:open={confirmOpen} title={confirmText.title} message={confirmText.message}
    confirmLabel={confirmText.label} busy={busy} onconfirm={confirm} />
{/if}

<style>
  .fd-back { margin-top: var(--space-4); }
  .fd-back a { display: inline-flex; align-items: center; gap: 4px; min-height: 32px; font-size: var(--dash-small); color: var(--fg-secondary); text-decoration: none; }
  .fd-back a:hover { color: var(--fg-primary); }
  .fd-back__icon { display: inline-flex; transform: rotate(180deg); }
  .fd-note { margin: 0 0 var(--space-4); padding: 10px 14px; border-radius: var(--radius-md); font-size: var(--dash-small); color: var(--fg-secondary); background: var(--bg-elevated); border: 1px solid var(--border); }
  .fd-grid { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 14px; margin-bottom: 14px; }
  .fd-dl { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 18px; }
  .fd-dl > div { min-width: 0; }
  .fd-dl__wide { grid-column: 1 / -1; }
  .fd-dl dt { font-size: var(--dash-caption); font-weight: 500; color: var(--fg-subtle); margin-bottom: 4px; }
  .fd-dl dd { margin: 0; font-size: var(--dash-body); color: var(--fg-primary); line-height: 1.45; overflow-wrap: anywhere; }
  .fd-dl--nums dd { font-variant-numeric: tabular-nums; font-weight: 600; }
  .fd-help { color: var(--fg-secondary); }
  .fd-dim { color: var(--fg-subtle); font-size: var(--dash-small); }
  .fd-late { color: var(--color-error); }
  .fd-project { margin: 0 0 14px; font-size: var(--dash-body); color: var(--fg-primary); font-weight: 500; }
  .fd-foot { margin: 14px 0 0; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .fd-table :global(.ui-table-wrap) { border: 0; border-top: 1px solid var(--border-subtle); border-radius: 0; background: transparent; }
  .fd-table :global(.ui-table th:first-child), .fd-table :global(.ui-table td:first-child) { padding-left: 0; }
  .fd-table :global(.ui-table th:last-child), .fd-table :global(.ui-table td:last-child) { padding-right: 0; }
  .fd-strong { color: var(--fg-primary); }
  .fd-money { color: var(--fg-primary); font-variant-numeric: tabular-nums; }
  .fd-acts { display: inline-flex; gap: 2px; }
  .fd-del:hover { color: var(--color-error); }
  @media (max-width: 899px) { .fd-grid { grid-template-columns: 1fr; } }
  @media (max-width: 479px) { .fd-dl:not(.fd-dl--nums) { grid-template-columns: 1fr; } }
  @media (max-width: 719px) {
    .fd-table :global(.ui-table-wrap) { border-top: 0; }
    .fd-table :global(.ui-table tr) { background: var(--bg-elevated); }
  }
</style>
