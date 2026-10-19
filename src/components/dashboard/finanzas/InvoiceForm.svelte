<script>
  // Alta y edición de factura (FIN-01, FIN-02, FIN-04, FIN-08) en un modal.
  //   · Cliente: selector simple de clientes activos (A2 construye un
  //     ClientPicker común; se unificará cuando exista).
  //   · Proyecto: opcional, solo los del cliente elegido.
  //   · Monto con lectura en vivo; nunca $0.
  //   · Estado: a mano solo Borrador, Enviada o Anulada. Pagada, Parcial y
  //     Vencida las calcula el servidor con los pagos y la fecha.
  import Modal from '../ui/Modal.svelte';
  import Field from '../ui/Field.svelte';
  import MoneyInput from './MoneyInput.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { toast } from '../lib/toast.svelte.js';
  import { todayISO, dayISO } from '../lib/dates.js';
  import { centsToInput, formatUsd, INVOICE_STATUS_LABELS } from './fin.js';

  let { open = $bindable(false), invoice = null, onsaved } = $props();

  const editing = $derived(!!invoice);
  let form = $state(blank());
  let cents = $state(null);
  let clients = $state([]);
  let projects = $state([]);
  let loadingLists = $state(false);
  let listsError = $state('');
  let saving = $state(false);
  let formError = $state('');
  let tried = $state(false);

  function blank() {
    return { client_id: '', project_id: '', amount: '', issued_at: todayISO(), due_date: '', description: '', status: 'sent' };
  }

  // Al abrir: rellena el formulario y carga clientes y proyectos.
  $effect(() => {
    if (!open) return;
    formError = ''; tried = false;
    if (invoice) {
      const manual = ['draft', 'sent', 'void'].includes(invoice.stored_status) && invoice.status !== 'paid' && invoice.status !== 'partial' && invoice.status !== 'overdue';
      form = {
        client_id: String(invoice.client_id || ''),
        project_id: invoice.project_id ? String(invoice.project_id) : '',
        amount: centsToInput(invoice.amount_cents),
        issued_at: dayISO(invoice.issued_at),
        due_date: dayISO(invoice.due_date),
        description: invoice.description || '',
        status: manual ? invoice.stored_status : 'auto',
      };
    } else {
      form = blank();
    }
    loadLists();
  });

  async function loadLists() {
    loadingLists = true; listsError = '';
    try {
      const [c, p] = await Promise.all([
        api('/api/admin/clients?limit=200&status=active'),
        api('/api/admin/projects?limit=200'),
      ]);
      clients = c.rows || [];
      projects = p.rows || [];
    } catch (e) {
      if (!isSessionError(e)) listsError = errorMessage(e, 'No se pudo cargar la lista de clientes.');
    } finally { loadingLists = false; }
  }

  // La factura que se edita puede ser de un cliente ya inactivo: se añade a la lista.
  const clientOptions = $derived.by(() => {
    const list = clients.slice();
    if (invoice && invoice.client_id && !list.some((c) => String(c.id) === String(invoice.client_id))) {
      list.unshift({ id: invoice.client_id, client_code: invoice.client_code, business_name: invoice.client_name });
    }
    return list;
  });
  const projectOptions = $derived(projects.filter((p) =>
    String(p.client_id) === String(form.client_id)
    && (p.status !== 'cancelled' || String(p.id) === String(form.project_id))));
  // Cambiar de cliente suelta un proyecto que ya no es suyo.
  $effect(() => {
    if (form.project_id && projects.length && !projectOptions.some((p) => String(p.id) === String(form.project_id))) {
      form.project_id = '';
    }
  });

  const paidCents = $derived(invoice ? Number(invoice.paid_cents || 0) : 0);
  const hasPayments = $derived(paidCents > 0);
  const dateError = $derived(form.issued_at && form.due_date && form.due_date < form.issued_at
    ? 'La fecha de vencimiento no puede ser anterior a la de emisión.' : '');
  const amountTooLow = $derived(editing && cents != null && cents < paidCents
    ? `No puede ser menor que lo ya cobrado (${formatUsd(paidCents)}).` : '');

  async function submit(e) {
    e?.preventDefault();
    tried = true; formError = '';
    if (!form.client_id) { formError = 'Elige un cliente.'; return; }
    if (cents == null) { formError = 'Revisa el monto.'; return; }
    if (amountTooLow || dateError) { formError = amountTooLow || dateError; return; }
    saving = true;
    const body = {
      client_id: form.client_id,
      project_id: form.project_id || null,
      amount_cents: cents,
      issued_at: form.issued_at || null,
      due_date: form.due_date || null,
      description: form.description.trim() || null,
    };
    if (form.status !== 'auto') body.status = form.status;
    try {
      const j = editing
        ? await api('/api/admin/invoices/' + invoice.id, { method: 'PATCH', body })
        : await api('/api/admin/invoices', { method: 'POST', body });
      toast(editing ? `${j.invoice.invoice_number} actualizada` : `${j.invoice.invoice_number} creada`);
      open = false;
      onsaved?.(j.invoice);
    } catch (err) {
      if (!isSessionError(err)) formError = errorMessage(err, 'No se pudo guardar la factura.');
    } finally { saving = false; }
  }
</script>

<Modal bind:open title={editing ? `Editar ${invoice.invoice_number}` : 'Nueva factura'} size="lg">
  <form class="fin-form" id="fin-invoice-form" onsubmit={submit} novalidate>
    {#if listsError}<p class="fin-form__err" role="alert">{listsError}</p>{/if}
    <div class="fin-grid">
      <Field label="Cliente" required error={tried && !form.client_id ? 'Elige un cliente.' : ''}
        hint={editing && hasPayments ? 'Tiene pagos: el cliente ya no se puede cambiar.' : ''}>
        {#snippet children(f)}
          <select class="ui-input" id={f.id} aria-describedby={f.describedby} bind:value={form.client_id}
            disabled={loadingLists || (editing && hasPayments)}>
            <option value="">{loadingLists ? 'Cargando clientes…' : 'Elige un cliente'}</option>
            {#each clientOptions as c (c.id)}
              <option value={String(c.id)}>{c.business_name || c.owner_name || 'Sin nombre'} · {c.client_code}</option>
            {/each}
          </select>
        {/snippet}
      </Field>
      <Field label="Proyecto" hint={form.client_id && !projectOptions.length ? 'Este cliente no tiene proyectos.' : 'Opcional.'}>
        {#snippet children(f)}
          <select class="ui-input" id={f.id} aria-describedby={f.describedby} bind:value={form.project_id}
            disabled={!form.client_id || !projectOptions.length}>
            <option value="">Sin proyecto</option>
            {#each projectOptions as p (p.id)}
              <option value={String(p.id)}>{p.name || 'Proyecto'} · {p.project_code}</option>
            {/each}
          </select>
        {/snippet}
      </Field>
      <div class="fin-amount">
        <MoneyInput bind:value={form.amount} bind:cents showErrors={tried} />
        {#if amountTooLow}<p class="ui-field__error" role="alert">{amountTooLow}</p>{/if}
      </div>
      <Field label="Estado"
        hint={form.status === 'auto' ? 'Se calcula solo con los pagos y la fecha de vencimiento.' : (form.status === 'draft' ? 'Un borrador no cuenta en Por cobrar.' : (form.status === 'void' ? 'Anulada: deja de contar en Por cobrar.' : 'Pendiente de pago.'))}>
        {#snippet children(f)}
          <select class="ui-input" id={f.id} aria-describedby={f.describedby} bind:value={form.status}>
            {#if form.status === 'auto' && invoice}
              <option value="auto">{INVOICE_STATUS_LABELS[invoice.status]} (automático)</option>
            {/if}
            <option value="draft" disabled={hasPayments}>Borrador{hasPayments ? ' (tiene pagos)' : ''}</option>
            <option value="sent">Enviada</option>
            {#if editing}<option value="void">Anulada</option>{/if}
          </select>
        {/snippet}
      </Field>
      <Field label="Emitida">
        {#snippet children(f)}<input class="ui-input" id={f.id} type="date" bind:value={form.issued_at} />{/snippet}
      </Field>
      <Field label="Vence" error={dateError}>
        {#snippet children(f)}<input class="ui-input" id={f.id} type="date" aria-describedby={f.describedby} bind:value={form.due_date} />{/snippet}
      </Field>
      <div class="fin-grid__wide">
        <Field label="Descripción" hint="De qué trabajo es la factura. Se ve en la lista y en la ficha.">
          {#snippet children(f)}
            <input class="ui-input" id={f.id} type="text" maxlength="500" placeholder="Landing page, anticipo 50 %" aria-describedby={f.describedby} bind:value={form.description} />
          {/snippet}
        </Field>
      </div>
    </div>
    {#if formError}<p class="fin-form__err" role="alert">{formError}</p>{/if}
  </form>
  {#snippet footer()}
    <button type="button" class="b" onclick={() => (open = false)} disabled={saving}>Cancelar</button>
    <button type="submit" form="fin-invoice-form" class="b b--primary" disabled={saving}>
      {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear factura')}
    </button>
  {/snippet}
</Modal>

<style>
  .fin-form { display: flex; flex-direction: column; gap: var(--space-3); }
  .fin-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
  .fin-grid__wide { grid-column: 1 / -1; }
  .fin-amount { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .fin-form__err { margin: 0; padding: 10px 12px; border-radius: var(--radius-md); font-size: var(--dash-small);
    color: var(--color-error); background: rgba(var(--color-error-rgb), .08); border: 1px solid rgba(var(--color-error-rgb), .28); }
  @media (max-width: 599px) { .fin-grid { grid-template-columns: 1fr; } }
</style>
