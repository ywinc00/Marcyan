<script>
  // Brief → cliente (CRM-04) sin teclear IDs: crear un cliente nuevo con los
  // datos del brief o vincularlo a uno que ya existe con el selector único
  // del panel (crm/ClientPicker, integración CRM; sin archivados).
  // Si al crear ya hay un cliente con su correo o teléfono (409), se ofrece
  // usar ese (pasa a "vincular") o crear el nuevo igualmente.
  import { untrack } from 'svelte';
  import Modal from '../ui/Modal.svelte';
  import Icon from '../ui/Icon.svelte';
  import ClientPicker from '../crm/ClientPicker.svelte';
  import DuplicateNotice from '../crm/DuplicateNotice.svelte';
  import { api, ApiError } from '../lib/api.js';

  let { open = $bindable(false), pid, data = {}, onconverted } = $props();

  let mode = $state('new');          // 'new' | 'existing'
  let picked = $state(null);
  let busy = $state(false);
  let error = $state('');
  let dupMatches = $state([]);

  $effect(() => {
    if (open) untrack(() => {
      mode = 'new'; picked = null; error = ''; busy = false; dupMatches = [];
    });
  });

  function useExisting(c) { picked = c; mode = 'existing'; dupMatches = []; error = ''; }

  async function confirm(allowDuplicate = false) {
    if (busy) return;
    if (mode === 'existing' && !picked) { error = 'Elige un cliente de la lista.'; return; }
    busy = true; error = '';
    try {
      const body = {
        action: 'convert_to_client',
        ...(mode === 'existing' ? { client_id: Number(picked.id) } : { allow_duplicate: allowDuplicate }),
      };
      const j = await api('/api/admin/briefs/' + encodeURIComponent(pid), { method: 'POST', body });
      dupMatches = [];
      onconverted?.(j);
      open = false;
    } catch (e) {
      const d = e instanceof ApiError ? e.data : null;
      if (d?.reason === 'duplicate' && d.matches?.length) dupMatches = d.matches;
      else error = e.message;
    }
    finally { busy = false; }
  }
</script>

<Modal bind:open title="Convertir en cliente">
  <div class="modes" role="radiogroup" aria-label="Cómo convertir">
    <label class="mode" class:on={mode === 'new'}>
      <input type="radio" name="convert-mode" value="new" checked={mode === 'new'} onchange={() => { mode = 'new'; error = ''; }} />
      <span class="mode__t">Crear un cliente nuevo</span>
      <span class="mode__d">Con los datos de este brief.</span>
    </label>
    <label class="mode" class:on={mode === 'existing'}>
      <input type="radio" name="convert-mode" value="existing" checked={mode === 'existing'} onchange={() => { mode = 'existing'; error = ''; dupMatches = []; }} />
      <span class="mode__t">Vincular a un cliente que ya existe</span>
      <span class="mode__d">Por ejemplo, un cliente que pide un segundo proyecto.</span>
    </label>
  </div>

  {#if mode === 'new'}
    <dl class="preview">
      <div><dt>Negocio</dt><dd>{data.business_name || 'Sin nombre'}</dd></div>
      <div><dt>Propietario</dt><dd>{data.owner_name || 'Sin dato'}</dd></div>
      <div><dt>Correo</dt><dd>{data.email || 'Sin dato'}</dd></div>
      <div><dt>Teléfono</dt><dd>{data.phone || 'Sin dato'}</dd></div>
      <div><dt>Ciudad</dt><dd>{data.city_state || 'Sin dato'}</dd></div>
    </dl>
    {#if dupMatches.length}
      <DuplicateNotice matches={dupMatches} title="Ya existe un cliente con el correo o el teléfono de este brief"
        onuse={useExisting} onforce={() => confirm(true)} {busy} />
    {/if}
  {:else}
    <ClientPicker bind:value={picked} label="Cliente" id="brief-convert-picker" disabled={busy}
      onchange={() => (error = '')} />
  {/if}
  {#if error}<p class="err" role="alert">{error}</p>{/if}

  {#snippet footer()}
    <button type="button" class="b" onclick={() => (open = false)} disabled={busy}>Cancelar</button>
    <button type="button" class="b b--primary" onclick={() => confirm(false)} disabled={busy || (mode === 'existing' && !picked)}>
      <Icon name="user" size={16} />{busy ? 'Un momento…' : mode === 'new' ? 'Crear cliente' : 'Vincular'}
    </button>
  {/snippet}
</Modal>

<style>
  .modes { display: grid; gap: 8px; }
  .mode { display: grid; grid-template-columns: auto 1fr; column-gap: 10px; row-gap: 2px; align-items: center; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-elevated); cursor: pointer; transition: border-color var(--duration-fast); }
  .mode:hover { border-color: var(--border-strong); }
  .mode.on { border-color: var(--accent-gold-line); }
  .mode input { grid-row: span 2; width: 18px; height: 18px; accent-color: var(--accent-gold); }
  .mode__t { font-size: var(--dash-body); font-weight: 500; color: var(--fg-primary); }
  .mode__d { font-size: var(--dash-small); color: var(--fg-subtle); }
  .preview { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; padding: 12px 14px; border-radius: var(--radius-md); background: var(--bg-2); border: 1px solid var(--border-subtle); }
  .preview div { min-width: 0; }
  .preview dt { font-size: var(--dash-caption); color: var(--fg-subtle); }
  .preview dd { margin: 2px 0 0; font-size: var(--dash-small); color: var(--fg-primary); overflow-wrap: anywhere; }
  .err { margin: 0; font-size: var(--dash-small); color: var(--color-error); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  @media (max-width: 479px) { .preview { grid-template-columns: 1fr; } }
</style>
