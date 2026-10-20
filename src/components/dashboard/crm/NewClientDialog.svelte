<script>
  // Alta de cliente validada (CRM-16): errores junto a cada campo (400 del
  // servidor) y, si el correo o el teléfono ya son de otro cliente (409), lo
  // dice y deja usar ese o crear el nuevo igualmente.
  //   · Sin onuse (vista Clientes, Finanzas): "Abrir ficha" del existente.
  //   · Con onuse (selector de cliente): "Usar este" lo elige en el selector.
  // Puede abrirse desde un selector que vive dentro de OTRO formulario (factura,
  // proyecto): su envío no se propaga al formulario de fuera.
  import { tick } from 'svelte';
  import Modal from '../ui/Modal.svelte';
  import ClientFields from './ClientFields.svelte';
  import DuplicateNotice from './DuplicateNotice.svelte';
  import { api, ApiError } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { navigate } from '../lib/router.svelte.js';
  import { clientName } from './crm.js';

  let { open = $bindable(false), initialName = '', oncreated, onuse } = $props();
  const formId = 'new-client-form-' + Math.random().toString(36).slice(2, 8);

  let values = $state({});
  let errors = $state({});
  let dupMatches = $state([]);
  let busy = $state(false);
  let dupEl = $state(null);

  $effect(() => {
    if (!open) return;
    values = { business_name: initialName || '', owner_name: '', email: '', phone: '', city_state: '', notes: '' };
    errors = {}; dupMatches = [];
  });

  async function submit(allowDuplicate = false) {
    errors = {};
    if (!String(values.business_name || '').trim() && !String(values.owner_name || '').trim()) {
      errors = { business_name: 'Escribe el nombre del negocio o de la persona.' };
      return;
    }
    busy = true;
    try {
      const j = await api('/api/admin/clients', { method: 'POST', body: { ...values, allow_duplicate: allowDuplicate } });
      toast(`Cliente ${j.client.client_code} creado: ${clientName(j.client)}.`);
      dupMatches = [];
      open = false;
      oncreated?.(j.client);
    } catch (e) {
      const d = e instanceof ApiError ? e.data : null;
      if (d?.reason === 'duplicate' && d.matches?.length) {
        dupMatches = d.matches;
        // En móvil el aviso queda bajo los campos: se trae a la vista.
        await tick();
        dupEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      else if (d?.fields) errors = d.fields;
      else toastError(e, 'No se pudo crear el cliente.');
    } finally { busy = false; }
  }

  function useExisting(m) {
    open = false;
    if (onuse) { toast(`Elegido el cliente que ya existía: ${m.client_code} ${clientName(m)}.`); onuse(m); }
    else navigate('clientes', [m.id]);
  }
</script>

<Modal bind:open title="Nuevo cliente" size="lg">
  <form id={formId} onsubmit={(e) => { e.preventDefault(); e.stopPropagation(); submit(false); }}>
    <ClientFields bind:values {errors} idPrefix="nc" disabled={busy} />
  </form>
  {#if dupMatches.length}
    <div bind:this={dupEl}><DuplicateNotice matches={dupMatches} onuse={useExisting} useLabel={onuse ? 'Usar este' : 'Abrir ficha'} archivedUsable={!onuse} onforce={() => submit(true)} {busy} /></div>
  {/if}
  {#snippet footer()}
    <button type="button" class="b" onclick={() => (open = false)} disabled={busy}>Cancelar</button>
    <button type="submit" form={formId} class="b b--primary" disabled={busy}>{busy ? 'Creando…' : 'Crear cliente'}</button>
  {/snippet}
</Modal>
