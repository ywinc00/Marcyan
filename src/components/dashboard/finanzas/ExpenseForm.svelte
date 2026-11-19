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

  // photo: la foto que se acaba de hacer con «Recibo» en el teléfono. La cámara
  // se abre en el mismo toque del botón (un clic programado después lo bloquea
  // Safari); aquí llega ya hecha y el recibo sale arriba, antes de los datos.
  let { open = $bindable(false), expense = null, onsaved, photo = null } = $props();
  let accounts = $state([]);
  let file = $state(null);
  let fromCamera = $state(false);
  let preview = $state('');
  const fileError = $derived(receiptProblem(file));
  const isImage = $derived(!!file && /^image\/(jpeg|png|webp)$/i.test(file.type || ''));
  // Vista previa de la foto (se libera al cambiarla o al cerrar).
  $effect(() => {
    if (!open || !isImage) { preview = ''; return; }
    const url = URL.createObjectURL(file);
    preview = url;
    return () => URL.revokeObjectURL(url);
  });
  function pick(e) {
    const f = e.currentTarget.files && e.currentTarget.files[0] ? e.currentTarget.files[0] : null;
    e.currentTarget.value = '';
    if (f) file = f;
  }

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
    file = photo || null;
    fromCamera = !!photo;
    form = expense
      ? { label: expense.label || '', category: expense.category || '', amount: centsToInput(expense.amount_cents), spent_at: dayISO(expense.spent_at), vendor: expense.vendor || '', notes: expense.notes || '', account_id: expense.account_id ? String(expense.account_id) : '', business_pct: String(expense.business_pct ?? 100) }
      : { label: '', category: '', amount: '', spent_at: todayISO(), vendor: '', notes: '', account_id: '', business_pct: '100' };
    loadAccounts().then((a) => { accounts = a.filter((x) => x.active !== false); }).catch(() => { accounts = []; });
  });

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

{#snippet receipt()}
  {#if preview}
    <div class="xf-photo" class:is-err={!!fileError}>
      <img src={preview} alt="Foto del recibo" />
      <div class="xf-photo__side">
        <span class="xf-photo__ok">{fileError || 'Recibo listo. Se guarda con el gasto.'}</span>
        <label class="b xf-photo__btn"><input class="sr-only" type="file" accept="image/*" capture="environment" onchange={pick} />Repetir foto</label>
        <button type="button" class="b xf-photo__btn" onclick={() => { file = null; }}>Quitar</button>
      </div>
    </div>
  {:else}
    <Field label="Recibo" hint={expense && expense.receipt_status === 'attached' ? 'Ya tiene recibo. Si eliges otro, sustituye al anterior.' : 'Foto o PDF. Desde $75 el contador lo pedirá.'} error={file ? fileError : ''}>
      {#snippet children(f)}
        <input class="ui-input xf-file" id={f.id} type="file" accept="image/jpeg,image/png,image/webp,image/heic,.heic,application/pdf"
          aria-describedby={f.describedby} onchange={pick} />
      {/snippet}
    </Field>
    {#if file}<p class="xf-has">Elegido: {file.name}</p>{/if}
  {/if}
{/snippet}

<Modal bind:open title={editing ? 'Editar gasto' : (fromCamera ? 'Gasto con recibo' : 'Nuevo gasto')}>
  <form class="xf" id="fin-expense-form" onsubmit={submit} novalidate>
    {#if fromCamera}{@render receipt()}{/if}
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
    {#if !fromCamera}{@render receipt()}{/if}
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
  .xf-photo { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: var(--space-3); align-items: start;
    padding: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-elevated); }
  .xf-photo img { width: 112px; height: 140px; object-fit: cover; border-radius: var(--radius-sm); background: var(--bg-card); display: block; }
  .xf-photo__side { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-2); min-width: 0; }
  .xf-photo__ok { font-size: var(--dash-small); color: var(--fg-secondary); }
  .xf-photo.is-err .xf-photo__ok { color: var(--color-error); }
  .xf-photo__btn { min-height: 40px; cursor: pointer; }
  .xf-photo__btn:focus-within { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  @media (max-width: 479px) { .xf-grid { grid-template-columns: 1fr; } }
</style>
