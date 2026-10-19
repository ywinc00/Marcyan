<script>
  // Alta rápida de cliente desde Finanzas: nuevo a mano o copiado de un brief
  // (MRC-XXX). Las mismas dos funciones que antes vivían en tarjetas sueltas.
  // A2 construye la vista Clientes y un ClientPicker común: cuando exista,
  // este atajo se unificará con él.
  import Modal from '../ui/Modal.svelte';
  import Field from '../ui/Field.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { toast } from '../lib/toast.svelte.js';

  // mode: 'new' | 'brief'
  let { open = $bindable(false), mode = 'new', onsaved } = $props();

  let form = $state({ business_name: '', owner_name: '', email: '', phone: '', city_state: '', notes: '' });
  let brief = $state('');
  let saving = $state(false);
  let formError = $state('');

  $effect(() => {
    if (!open) return;
    formError = '';
    form = { business_name: '', owner_name: '', email: '', phone: '', city_state: '', notes: '' };
    brief = '';
  });

  async function submit(e) {
    e?.preventDefault();
    formError = '';
    let body;
    if (mode === 'brief') {
      const id = brief.trim().toUpperCase();
      if (!/^MRC-\d+$/.test(id)) { formError = 'Escribe el número del brief, por ejemplo MRC-017.'; return; }
      body = { from_brief: id };
    } else {
      if (!form.business_name.trim() && !form.owner_name.trim()) { formError = 'Indica al menos el negocio o el propietario.'; return; }
      body = { ...form };
    }
    saving = true;
    try {
      const j = await api('/api/admin/clients', { method: 'POST', body });
      const c = j.client || {};
      toast(`${c.client_code || 'Cliente'} listo${c.business_name ? ': ' + c.business_name : ''}`);
      open = false;
      onsaved?.(c);
    } catch (err) {
      if (!isSessionError(err)) formError = errorMessage(err, 'No se pudo crear el cliente.');
    } finally { saving = false; }
  }
</script>

<Modal bind:open title={mode === 'brief' ? 'Cliente desde un brief' : 'Nuevo cliente'} size={mode === 'brief' ? 'sm' : 'md'}>
  <form class="cf" id="fin-client-form" onsubmit={submit} novalidate>
    {#if mode === 'brief'}
      <p class="cf-hint">Copiamos el negocio, el contacto y la ciudad del brief a un cliente nuevo. Si ya existe, no se duplica.</p>
      <Field label="Número del brief" required>
        {#snippet children(f)}<input class="ui-input" id={f.id} type="text" placeholder="MRC-017" autocomplete="off" bind:value={brief} />{/snippet}
      </Field>
    {:else}
      <div class="cf-grid">
        <Field label="Negocio">{#snippet children(f)}<input class="ui-input" id={f.id} type="text" bind:value={form.business_name} />{/snippet}</Field>
        <Field label="Propietario">{#snippet children(f)}<input class="ui-input" id={f.id} type="text" bind:value={form.owner_name} />{/snippet}</Field>
        <Field label="Email">{#snippet children(f)}<input class="ui-input" id={f.id} type="email" bind:value={form.email} />{/snippet}</Field>
        <Field label="Teléfono">{#snippet children(f)}<input class="ui-input" id={f.id} type="tel" bind:value={form.phone} />{/snippet}</Field>
        <Field label="Ciudad y estado">{#snippet children(f)}<input class="ui-input" id={f.id} type="text" placeholder="Houston, TX" bind:value={form.city_state} />{/snippet}</Field>
        <Field label="Notas">{#snippet children(f)}<input class="ui-input" id={f.id} type="text" bind:value={form.notes} />{/snippet}</Field>
      </div>
    {/if}
    {#if formError}<p class="cf-err" role="alert">{formError}</p>{/if}
  </form>
  {#snippet footer()}
    <button type="button" class="b" onclick={() => (open = false)} disabled={saving}>Cancelar</button>
    <button type="submit" form="fin-client-form" class="b b--primary" disabled={saving}>
      {saving ? 'Guardando…' : 'Crear cliente'}
    </button>
  {/snippet}
</Modal>

<style>
  .cf { display: flex; flex-direction: column; gap: 14px; }
  .cf-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
  .cf-hint { margin: 0; font-size: var(--dash-small); color: var(--fg-secondary); line-height: 1.5; }
  .cf-err { margin: 0; padding: 10px 12px; border-radius: var(--radius-md); font-size: var(--dash-small);
    color: var(--color-error); background: rgba(var(--color-error-rgb), .08); border: 1px solid rgba(var(--color-error-rgb), .28); }
  @media (max-width: 479px) { .cf-grid { grid-template-columns: 1fr; } }
</style>
