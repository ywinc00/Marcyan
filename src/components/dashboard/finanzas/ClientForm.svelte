<script>
  // Cliente desde un brief (MRC-XXX), atajo de Finanzas. El alta a mano ya
  // no vive aquí: "Nuevo cliente" abre el alta única de Clientes
  // (crm/NewClientDialog), que valida y avisa de duplicados (integración CRM).
  // Si ya hay un cliente con el correo o el teléfono del brief (409), se
  // ofrece usar ese (vincula el brief a él) o crear el nuevo igualmente.
  import Modal from '../ui/Modal.svelte';
  import Field from '../ui/Field.svelte';
  import DuplicateNotice from '../crm/DuplicateNotice.svelte';
  import { api, ApiError, errorMessage, isSessionError } from '../lib/api.js';
  import { toast } from '../lib/toast.svelte.js';
  import { clientName } from '../crm/crm.js';

  let { open = $bindable(false), onsaved } = $props();

  let brief = $state('');
  let saving = $state(false);
  let formError = $state('');
  let dupMatches = $state([]);

  $effect(() => {
    if (!open) return;
    formError = '';
    brief = '';
    dupMatches = [];
  });

  const briefId = () => brief.trim().toUpperCase();

  async function submit(e, allowDuplicate = false) {
    e?.preventDefault();
    formError = '';
    const id = briefId();
    if (!/^MRC-\d+$/.test(id)) { formError = 'Escribe el número del brief, por ejemplo MRC-017.'; return; }
    saving = true;
    try {
      const j = await api('/api/admin/clients', { method: 'POST', body: { from_brief: id, allow_duplicate: allowDuplicate } });
      const c = j.client || {};
      toast(j.created === false
        ? `${id} ya era del cliente ${c.client_code || ''}${c.business_name ? ': ' + c.business_name : ''}.`
        : `${c.client_code || 'Cliente'} creado${c.business_name ? ': ' + c.business_name : ''}.`);
      dupMatches = [];
      open = false;
      onsaved?.(c);
    } catch (err) {
      const d = err instanceof ApiError ? err.data : null;
      if (d?.reason === 'duplicate' && d.matches?.length) dupMatches = d.matches;
      else if (!isSessionError(err)) formError = errorMessage(err, 'No se pudo crear el cliente.');
    } finally { saving = false; }
  }

  // "Usar este": el brief queda vinculado al cliente que ya existía.
  async function useExisting(m) {
    const id = briefId();
    saving = true; formError = '';
    try {
      const j = await api('/api/admin/briefs/' + encodeURIComponent(id), {
        method: 'POST', body: { action: 'convert_to_client', client_id: Number(m.id) },
      });
      const c = j.client || m;
      toast(`${id} vinculado al cliente ${c.client_code}: ${clientName(c)}.`);
      dupMatches = [];
      open = false;
      onsaved?.(c);
    } catch (err) {
      if (!isSessionError(err)) formError = errorMessage(err, 'No se pudo vincular el brief.');
    } finally { saving = false; }
  }
</script>

<Modal bind:open title="Cliente desde un brief" size="sm">
  <form class="cf" id="fin-client-form" onsubmit={(e) => submit(e)} novalidate>
    <p class="cf-hint">Copiamos el negocio, el contacto y la ciudad del brief a un cliente nuevo. Si ya existe, no se duplica.</p>
    <Field label="Número del brief" required>
      {#snippet children(f)}<input class="ui-input" id={f.id} type="text" placeholder="MRC-017" autocomplete="off" bind:value={brief} oninput={() => (dupMatches = [])} />{/snippet}
    </Field>
    {#if dupMatches.length}
      <DuplicateNotice matches={dupMatches} title="Ya existe un cliente con el correo o el teléfono de este brief"
        onuse={useExisting} onforce={() => submit(null, true)} busy={saving} />
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
  .cf-hint { margin: 0; font-size: var(--dash-small); color: var(--fg-secondary); line-height: 1.5; }
  .cf-err { margin: 0; padding: 10px 12px; border-radius: var(--radius-md); font-size: var(--dash-small);
    color: var(--color-error); background: rgba(var(--color-error-rgb), .08); border: 1px solid rgba(var(--color-error-rgb), .28); }
</style>
