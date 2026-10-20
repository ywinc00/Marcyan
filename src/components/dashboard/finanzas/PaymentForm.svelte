<script>
  // Registrar o editar un pago (FIN-01, FIN-09). El monto propone el saldo
  // pendiente y avisa en línea si lo supera; nunca en facturas anuladas
  // (el servidor lo vuelve a comprobar). Fecha por defecto: hoy en Houston.
  import Modal from '../ui/Modal.svelte';
  import Field from '../ui/Field.svelte';
  import MoneyInput from './MoneyInput.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { toast } from '../lib/toast.svelte.js';
  import { todayISO, dayISO } from '../lib/dates.js';
  import { centsToInput, formatUsd, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from './fin.js';

  // invoice: { id, invoice_number, client_name, amount_cents, balance_cents, status }
  // payment: el pago a editar (null = nuevo)
  let { open = $bindable(false), invoice = null, payment = null, onsaved } = $props();

  const editing = $derived(!!payment);
  let form = $state({ amount: '', method: 'zelle', paid_at: todayISO(), reference: '' });
  let cents = $state(null);
  let saving = $state(false);
  let formError = $state('');
  let tried = $state(false);

  // Tope = saldo pendiente (al editar, sumando lo que ya valía este pago).
  const maxCents = $derived(invoice
    ? Number(invoice.balance_cents || 0) + (payment ? Number(payment.amount_cents || 0) : 0)
    : null);

  $effect(() => {
    if (!open) return;
    formError = ''; tried = false;
    form = payment
      ? { amount: centsToInput(payment.amount_cents), method: payment.method || 'other', paid_at: dayISO(payment.paid_at), reference: payment.reference || '' }
      : { amount: centsToInput(invoice ? invoice.balance_cents : 0), method: 'zelle', paid_at: todayISO(), reference: '' };
  });

  async function submit(e) {
    e?.preventDefault();
    tried = true; formError = '';
    if (cents == null) { formError = 'Revisa el monto.'; return; }
    if (!form.paid_at) { formError = 'Indica la fecha del pago.'; return; }
    saving = true;
    const body = { amount_cents: cents, method: form.method, paid_at: form.paid_at, reference: form.reference.trim() || null };
    try {
      const j = editing
        ? await api('/api/admin/payments/' + payment.id, { method: 'PATCH', body })
        : await api('/api/admin/payments', { method: 'POST', body: { ...body, invoice_id: invoice.id } });
      toast(editing ? 'Pago actualizado' : `Pago de ${formatUsd(cents)} registrado`);
      open = false;
      onsaved?.(j.invoice);
    } catch (err) {
      if (!isSessionError(err)) formError = errorMessage(err, 'No se pudo guardar el pago.');
    } finally { saving = false; }
  }
</script>

<Modal bind:open title={editing ? 'Editar pago' : 'Registrar pago'}>
  {#if invoice}
    <dl class="pay-ctx">
      <div><dt>Factura</dt><dd>{invoice.invoice_number}{invoice.client_name ? ' · ' + invoice.client_name : ''}</dd></div>
      <div><dt>Total</dt><dd class="num">{formatUsd(invoice.amount_cents)}</dd></div>
      <div><dt>{editing ? 'Saldo sin este pago' : 'Saldo pendiente'}</dt><dd class="num pay-ctx__bal">{formatUsd(maxCents)}</dd></div>
    </dl>
  {/if}
  <form class="pay-form" id="fin-payment-form" onsubmit={submit} novalidate>
    <MoneyInput bind:value={form.amount} bind:cents max={maxCents} showErrors={tried} />
    <div class="pay-grid">
      <Field label="Método">
        {#snippet children(f)}
          <select class="ui-input" id={f.id} bind:value={form.method}>
            {#each PAYMENT_METHODS as m}<option value={m}>{PAYMENT_METHOD_LABELS[m]}</option>{/each}
          </select>
        {/snippet}
      </Field>
      <Field label="Fecha del pago" required>
        {#snippet children(f)}<input class="ui-input" id={f.id} type="date" bind:value={form.paid_at} />{/snippet}
      </Field>
    </div>
    <Field label="Referencia" hint="Número de confirmación o nota. Opcional.">
      {#snippet children(f)}
        <input class="ui-input" id={f.id} type="text" maxlength="200" placeholder="Zelle conf. 8XK2" aria-describedby={f.describedby} bind:value={form.reference} />
      {/snippet}
    </Field>
    {#if formError}<p class="pay-err" role="alert">{formError}</p>{/if}
  </form>
  {#snippet footer()}
    <button type="button" class="b" onclick={() => (open = false)} disabled={saving}>Cancelar</button>
    <button type="submit" form="fin-payment-form" class="b b--primary" disabled={saving}>
      {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Registrar pago')}
    </button>
  {/snippet}
</Modal>

<style>
  .pay-ctx { margin: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px;
    padding: 12px 14px; border-radius: var(--radius-md); background: var(--bg-elevated); border: 1px solid var(--border); }
  .pay-ctx div { min-width: 0; }
  .pay-ctx dt { font-size: var(--dash-caption); color: var(--fg-subtle); }
  .pay-ctx dd { margin: 2px 0 0; font-size: var(--dash-small); color: var(--fg-primary); overflow-wrap: anywhere; }
  .pay-ctx__bal { font-weight: 600; }
  .num { font-variant-numeric: tabular-nums; }
  .pay-form { display: flex; flex-direction: column; gap: 14px; }
  .pay-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
  .pay-err { margin: 0; padding: 10px 12px; border-radius: var(--radius-md); font-size: var(--dash-small);
    color: var(--color-error); background: rgba(var(--color-error-rgb), .08); border: 1px solid rgba(var(--color-error-rgb), .28); }
  @media (max-width: 479px) {
    .pay-ctx { grid-template-columns: 1fr 1fr; }
    .pay-ctx div:first-child { grid-column: 1 / -1; }
    .pay-grid { grid-template-columns: 1fr; }
  }
</style>
