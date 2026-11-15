<script>
  // Alta y edición de un gasto puntual (FIN-10, FIN-21): categorías de la
  // lista cerrada, monto con lectura en vivo, fecha de Houston por defecto.
  import Modal from '../ui/Modal.svelte';
  import Field from '../ui/Field.svelte';
  import MoneyInput from './MoneyInput.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { toast } from '../lib/toast.svelte.js';
  import { todayISO, dayISO } from '../lib/dates.js';
  import { centsToInput, EXPENSE_CATEGORIES, categoryLabel } from './fin.js';
  import { loadAccounts, receiptProblem, uploadReceipt, receiptUrl } from './books.js';

  // withReceipt: abierto desde «Recibo» en el teléfono (la foto primero).
  let { open = $bindable(false), expense = null, onsaved, withReceipt = false } = $props();
  let accounts = $state([]);
  let file = $state(null);
  let fileInput = $state(null);
  const fileError = $derived(receiptProblem(file));

  const editing = $derived(!!expense);
  let form = $state({ label: '', category: '', amount: '', spent_at: todayISO(), vendor: '', notes: '', account_id: '', business_pct: '100' });
  let cents = $state(null);
  let saving = $state(false);
  let formError = $state('');
  let tried = $state(false);
  // Una categoría vieja en texto libre se conserva hasta que se elija otra.
  const legacyCategory = $derived(expense && expense.category && !EXPENSE_CATEGORIES.some((c) => c.id === expense.category) ? expense.category : '');

  $effect(() => {
    if (!open) return;
    formError = ''; tried = false;
    file = null;
    form = expense
      ? { label: expense.label || '', category: expense.category || '', amount: centsToInput(expense.amount_cents), spent_at: dayISO(expense.spent_at), vendor: expense.vendor || '', notes: expense.notes || '', account_id: expense.account_id ? String(expense.account_id) : '', business_pct: String(expense.business_pct ?? 100) }
      : { label: '', category: '', amount: '', spent_at: todayISO(), vendor: '', notes: '', account_id: '', business_pct: '100' };
    loadAccounts().then((a) => { accounts = a.filter((x) => x.active !== false); }).catch(() => { accounts = []; });
  });
  // Desde «Recibo» en el teléfono se abre directamente la cámara o la galería.
  $effect(() => { if (open && withReceipt && fileInput) setTimeout(() => fileInput?.click(), 50); });

  async function submit(e) {
    e?.preventDefault();
    tried = true; formError = '';
    if (!form.label.trim()) { formError = 'Escribe el concepto del gasto.'; return; }
    if (cents == null) { formError = 'Revisa el monto.'; return; }
    if (!form.spent_at) { formError = 'Indica la fecha del gasto.'; return; }
    if (fileError) { formError = fileError; return; }
    const pct = Number(form.business_pct);
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) { formError = 'El uso de negocio va de 0 a 100 %.'; return; }
    saving = true;
    const body = {
      label: form.label.trim(), amount_cents: cents, spent_at: form.spent_at,
      vendor: form.vendor.trim() || null, notes: form.notes.trim() || null,
      account_id: form.account_id || null, business_pct: pct,
    };
    if (!legacyCategory || form.category !== legacyCategory) body.category = form.category || null;
    try {
      const j = editing
        ? await api('/api/admin/expenses/' + expense.id, { method: 'PATCH', body })
        : await api('/api/admin/expenses', { method: 'POST', body });
      // El recibo se sube después de guardar el gasto: si falla, el gasto queda
      // guardado y se dice en llano (se puede volver a subir desde su ficha).
      if (file) {
        try { await uploadReceipt(j.expense.id, file); }
        catch (up) { toast('Gasto guardado, pero el recibo no se subió: ' + (up && up.message ? up.message : 'vuelve a intentarlo.'), { tone: 'error', timeout: 7000 }); open = false; onsaved?.(j.expense); return; }
      }
      toast(editing ? 'Gasto actualizado' : 'Gasto añadido');
      open = false;
      onsaved?.(j.expense);
    } catch (err) {
      if (!isSessionError(err)) formError = errorMessage(err, 'No se pudo guardar el gasto.');
    } finally { saving = false; }
  }
</script>

<Modal bind:open title={editing ? 'Editar gasto' : 'Nuevo gasto'}>
  <form class="xf" id="fin-expense-form" onsubmit={submit} novalidate>
    <Field label="Concepto" required error={tried && !form.label.trim() ? 'Escribe el concepto del gasto.' : ''}>
      {#snippet children(f)}
        <input class="ui-input" id={f.id} type="text" maxlength="200" placeholder="Renovación de dominio" aria-describedby={f.describedby} bind:value={form.label} />
      {/snippet}
    </Field>
    <div class="xf-grid">
      <MoneyInput bind:value={form.amount} bind:cents showErrors={tried} />
      <Field label="Fecha" required>
        {#snippet children(f)}<input class="ui-input" id={f.id} type="date" bind:value={form.spent_at} />{/snippet}
      </Field>
      <Field label="Categoría">
        {#snippet children(f)}
          <select class="ui-input" id={f.id} bind:value={form.category}>
            <option value="">Sin categoría</option>
            {#if legacyCategory}<option value={legacyCategory}>{categoryLabel(legacyCategory)} (anterior)</option>{/if}
            {#each EXPENSE_CATEGORIES as c (c.id)}<option value={c.id}>{c.label}</option>{/each}
          </select>
        {/snippet}
      </Field>
      <Field label="Proveedor" hint="Opcional.">
        {#snippet children(f)}<input class="ui-input" id={f.id} type="text" maxlength="200" placeholder="Namecheap" aria-describedby={f.describedby} bind:value={form.vendor} />{/snippet}
      </Field>
    </div>
    <div class="xf-grid">
      <Field label="Pagado con" hint="Banco, tarjeta, PayPal…">
        {#snippet children(f)}
          <select class="ui-input" id={f.id} aria-describedby={f.describedby} bind:value={form.account_id}>
            <option value="">Sin decir</option>
            {#each accounts as a (a.id)}<option value={String(a.id)}>{a.name}</option>{/each}
          </select>
        {/snippet}
      </Field>
      <Field label="Uso de negocio (%)" hint="100 si es solo del negocio.">
        {#snippet children(f)}<input class="ui-input" id={f.id} type="number" inputmode="numeric" min="0" max="100" step="1" aria-describedby={f.describedby} bind:value={form.business_pct} />{/snippet}
      </Field>
    </div>
    <Field label="Recibo" hint={expense && expense.receipt_status === 'attached' ? 'Ya tiene recibo. Si eliges otro, sustituye al anterior.' : 'Foto o PDF. Desde $75 el contador lo pedirá.'} error={file ? fileError : ''}>
      {#snippet children(f)}
        <input class="ui-input xf-file" id={f.id} type="file" accept="image/jpeg,image/png,image/webp,image/heic,.heic,application/pdf"
          aria-describedby={f.describedby} bind:this={fileInput} onchange={(e) => { file = e.currentTarget.files && e.currentTarget.files[0] ? e.currentTarget.files[0] : null; }} />
      {/snippet}
    </Field>
    {#if expense && expense.receipt_status === 'attached'}<p class="xf-has"><a href={receiptUrl(expense.id)} target="_blank" rel="noopener">Ver el recibo guardado</a></p>{/if}
    <Field label="Notas" hint="Opcional.">
      {#snippet children(f)}<input class="ui-input" id={f.id} type="text" maxlength="1000" aria-describedby={f.describedby} bind:value={form.notes} />{/snippet}
    </Field>
    {#if formError}<p class="xf-err" role="alert">{formError}</p>{/if}
  </form>
  {#snippet footer()}
    <button type="button" class="b" onclick={() => (open = false)} disabled={saving}>Cancelar</button>
    <button type="submit" form="fin-expense-form" class="b b--primary" disabled={saving}>
      {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Añadir gasto')}
    </button>
  {/snippet}
</Modal>

<style>
  .xf { display: flex; flex-direction: column; gap: 14px; }
  .xf-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
  .xf-err { margin: 0; padding: 10px 12px; border-radius: var(--radius-md); font-size: var(--dash-small);
    color: var(--color-error); background: rgba(var(--color-error-rgb), .08); border: 1px solid rgba(var(--color-error-rgb), .28); }
  .xf-file { padding-block: 8px; height: auto; }
  .xf-has { margin: -6px 0 0; font-size: var(--dash-small); }
  .xf-has a { color: var(--fg-primary); text-underline-offset: 3px; }
  @media (max-width: 479px) { .xf-grid { grid-template-columns: 1fr; } }
</style>
