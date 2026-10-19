<script>
  // Alta y edición de una suscripción (FIN-10). La fecha del próximo cargo
  // es el punto de partida: el servidor la avanza sola según la periodicidad.
  import Modal from '../ui/Modal.svelte';
  import Field from '../ui/Field.svelte';
  import MoneyInput from './MoneyInput.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { toast } from '../lib/toast.svelte.js';
  import { dayISO } from '../lib/dates.js';
  import { centsToInput, EXPENSE_CATEGORIES, categoryLabel, SUBSCRIPTION_CYCLES, CYCLE_LABELS } from './fin.js';

  let { open = $bindable(false), subscription = null, onsaved } = $props();

  const editing = $derived(!!subscription);
  let form = $state({ name: '', category: '', amount: '', cycle: 'monthly', next_charge_at: '', notes: '', active: true });
  let cents = $state(null);
  let saving = $state(false);
  let formError = $state('');
  let tried = $state(false);
  // Fecha que se mostró al abrir (ya avanzada). Si no se toca, no se manda:
  // así el día de referencia guardado (p. ej. el 31) no se pierde al editar.
  let shownCharge = '';
  const legacyCategory = $derived(subscription && subscription.category && !EXPENSE_CATEGORIES.some((c) => c.id === subscription.category) ? subscription.category : '');

  $effect(() => {
    if (!open) return;
    formError = ''; tried = false;
    const s = subscription;
    shownCharge = s ? dayISO(s.next_charge_at) : '';
    form = s
      ? { name: s.name || '', category: s.category || '', amount: centsToInput(s.amount_cents), cycle: s.cycle || 'monthly', next_charge_at: dayISO(s.next_charge_at), notes: s.notes || '', active: !!s.active }
      : { name: '', category: '', amount: '', cycle: 'monthly', next_charge_at: '', notes: '', active: true };
  });

  async function submit(e) {
    e?.preventDefault();
    tried = true; formError = '';
    if (!form.name.trim()) { formError = 'Escribe el nombre del servicio.'; return; }
    if (cents == null) { formError = 'Revisa el monto.'; return; }
    saving = true;
    const body = {
      name: form.name.trim(), amount_cents: cents, cycle: form.cycle,
      notes: form.notes.trim() || null, active: form.active,
    };
    if (!editing || form.next_charge_at !== shownCharge) body.next_charge_at = form.next_charge_at || null;
    if (!legacyCategory || form.category !== legacyCategory) body.category = form.category || null;
    try {
      const j = editing
        ? await api('/api/admin/subscriptions/' + subscription.id, { method: 'PATCH', body })
        : await api('/api/admin/subscriptions', { method: 'POST', body });
      toast(editing ? `${j.subscription.name} actualizada` : `${j.subscription.name} añadida`);
      open = false;
      onsaved?.(j.subscription);
    } catch (err) {
      if (!isSessionError(err)) formError = errorMessage(err, 'No se pudo guardar la suscripción.');
    } finally { saving = false; }
  }
</script>

<Modal bind:open title={editing ? `Editar ${subscription.name}` : 'Nueva suscripción'}>
  <form class="sf" id="fin-sub-form" onsubmit={submit} novalidate>
    <Field label="Servicio" required error={tried && !form.name.trim() ? 'Escribe el nombre del servicio.' : ''}>
      {#snippet children(f)}
        <input class="ui-input" id={f.id} type="text" maxlength="120" placeholder="Vercel" aria-describedby={f.describedby} bind:value={form.name} />
      {/snippet}
    </Field>
    <div class="sf-grid">
      <MoneyInput bind:value={form.amount} bind:cents showErrors={tried} />
      <Field label="Periodicidad">
        {#snippet children(f)}
          <select class="ui-input" id={f.id} bind:value={form.cycle}>
            {#each SUBSCRIPTION_CYCLES as c}<option value={c}>{CYCLE_LABELS[c]}</option>{/each}
          </select>
        {/snippet}
      </Field>
      <Field label="Próximo cargo" hint="Avanza solo cada mes o cada año.">
        {#snippet children(f)}<input class="ui-input" id={f.id} type="date" aria-describedby={f.describedby} bind:value={form.next_charge_at} />{/snippet}
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
    </div>
    <Field label="Notas" hint="Opcional.">
      {#snippet children(f)}<input class="ui-input" id={f.id} type="text" maxlength="1000" placeholder="Plan Pro" aria-describedby={f.describedby} bind:value={form.notes} />{/snippet}
    </Field>
    <label class="sf-check"><input type="checkbox" bind:checked={form.active} /> Activa (cuenta en el gasto mensual)</label>
    {#if formError}<p class="sf-err" role="alert">{formError}</p>{/if}
  </form>
  {#snippet footer()}
    <button type="button" class="b" onclick={() => (open = false)} disabled={saving}>Cancelar</button>
    <button type="submit" form="fin-sub-form" class="b b--primary" disabled={saving}>
      {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Añadir suscripción')}
    </button>
  {/snippet}
</Modal>

<style>
  .sf { display: flex; flex-direction: column; gap: 14px; }
  .sf-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
  .sf-check { display: inline-flex; align-items: center; gap: 10px; min-height: 36px; font-size: var(--dash-body); color: var(--fg-secondary); cursor: pointer; }
  .sf-check input { width: 18px; height: 18px; accent-color: var(--accent-teal); }
  .sf-err { margin: 0; padding: 10px 12px; border-radius: var(--radius-md); font-size: var(--dash-small);
    color: var(--color-error); background: rgba(var(--color-error-rgb), .08); border: 1px solid rgba(var(--color-error-rgb), .28); }
  @media (max-width: 479px) { .sf-grid { grid-template-columns: 1fr; } }
</style>
