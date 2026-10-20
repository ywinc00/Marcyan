<script>
  // Convertir un lead (CRM-02): en cliente nuevo o existente, y/o en un brief
  // borrador. Todo en una transacción del servidor. Si ya hay un cliente con
  // el mismo correo o teléfono se ofrece ANTES de crear otro (y el servidor
  // lo vuelve a comprobar: 409 con las coincidencias).
  import Modal from '../ui/Modal.svelte';
  import ClientPicker from './ClientPicker.svelte';
  import ClientFields from './ClientFields.svelte';
  import DuplicateNotice from './DuplicateNotice.svelte';
  import { api, ApiError } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { href } from '../lib/router.svelte.js';
  import { clientName } from './crm.js';

  let { open = $bindable(false), detail = null, onconverted } = $props();

  const lead = $derived(detail?.lead || null);
  const hasClient = $derived(!!detail?.client || !!lead?.converted_client_id);
  const hasBrief = $derived(!!lead?.converted_brief_id);

  let mode = $state('new');          // new | existing | none
  let picked = $state(null);
  let wantBrief = $state(false);
  let values = $state({});
  let errors = $state({});
  let pickError = $state('');
  let dupMatches = $state([]);
  let busy = $state(false);
  let formError = $state('');

  // Al abrir: datos del lead precargados y la coincidencia ya elegida si existe.
  $effect(() => {
    if (!open || !lead) return;
    const matches = detail?.client_matches || [];
    values = {
      business_name: lead.business_name || lead.name || '',
      owner_name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      city_state: lead.city || '',
    };
    errors = {}; pickError = ''; dupMatches = []; formError = '';
    picked = matches.length ? matches[0] : null;
    mode = hasClient ? 'none' : (matches.length ? 'existing' : 'new');
    wantBrief = hasClient && !hasBrief;
  });

  const canSubmit = $derived(!busy && ((mode !== 'none' && !hasClient) || (wantBrief && !hasBrief)));

  function useExisting(c) { picked = c; mode = 'existing'; dupMatches = []; formError = ''; }

  async function submit(allowDuplicate = false) {
    if (!lead || !canSubmit) return;
    errors = {}; pickError = ''; formError = '';
    if (mode === 'existing' && !picked) { pickError = 'Elige un cliente de la lista.'; return; }
    const client = hasClient || mode === 'none' ? null
      : mode === 'existing' ? { mode: 'existing', id: picked.id }
      : { mode: 'new', data: { ...values }, allow_duplicate: allowDuplicate };
    busy = true;
    try {
      const j = await api('/api/admin/leads/' + encodeURIComponent(lead.ref_id) + '/convert', {
        method: 'POST', body: { client, brief: wantBrief && !hasBrief },
      });
      const parts = [];
      if (j.client) parts.push(j.created?.client ? `cliente nuevo ${j.client.client_code}` : `cliente ${j.client.client_code}`);
      if (j.brief) parts.push(`brief ${j.brief.project_id}`);
      toast(`${lead.ref_id} convertido: ${parts.join(' y ')}.`);
      dupMatches = [];
      open = false;
      onconverted?.(j);
    } catch (e) {
      const d = e instanceof ApiError ? e.data : null;
      if (d?.reason === 'duplicate' && d.matches?.length) {
        dupMatches = d.matches;
      } else if (d?.fields) {
        errors = d.fields;
        formError = 'Revisa los datos marcados.';
      } else {
        formError = e instanceof ApiError ? e.message : 'No se pudo convertir. Inténtalo de nuevo.';
        toastError(e, 'No se pudo convertir el lead.');
      }
    } finally {
      busy = false;
    }
  }
</script>

<Modal bind:open title={lead ? `Convertir ${lead.ref_id}` : 'Convertir lead'} size="lg">
  {#if lead}
    <section class="cv__set" aria-labelledby="cv-h-client">
      <h3 class="cv__legend" id="cv-h-client">Cliente</h3>
      {#if hasClient}
        <p class="cv__done">Ya es el cliente <a href={href('clientes', [detail.client?.id ?? lead.converted_client_id])}>{detail.client ? `${detail.client.client_code} ${clientName(detail.client)}` : 'vinculado'}</a>.</p>
      {:else}
        {#if (detail?.client_matches || []).length && mode !== 'existing'}
          <DuplicateNotice matches={detail.client_matches} title="Este correo o teléfono ya es de un cliente" onuse={useExisting} {busy} />
        {/if}
        <div class="cv__modes" role="radiogroup" aria-label="Cliente">
          <label class="cv__mode" class:on={mode === 'new'}><input type="radio" name="cv-mode" value="new" bind:group={mode} /> Cliente nuevo con estos datos</label>
          <label class="cv__mode" class:on={mode === 'existing'}><input type="radio" name="cv-mode" value="existing" bind:group={mode} /> Vincular a un cliente que ya existe</label>
          <label class="cv__mode" class:on={mode === 'none'}><input type="radio" name="cv-mode" value="none" bind:group={mode} /> Sin cliente por ahora</label>
        </div>
        {#if mode === 'new'}
          <ClientFields bind:values {errors} notes={false} idPrefix="cv" disabled={busy} />
          {#if dupMatches.length}
            <DuplicateNotice matches={dupMatches} onuse={useExisting} onforce={() => submit(true)} {busy} />
          {/if}
        {:else if mode === 'existing'}
          <ClientPicker bind:value={picked} label="Cliente" error={pickError} disabled={busy} id="cv-picker"
            hint={picked && (detail?.client_matches || []).some((m) => String(m.id) === String(picked.id)) ? 'Coincide con el correo o el teléfono de este lead.' : ''} />
        {/if}
      {/if}
    </section>

    <section class="cv__set" aria-labelledby="cv-h-brief">
      <h3 class="cv__legend" id="cv-h-brief">Brief</h3>
      {#if hasBrief}
        <p class="cv__done">Ya tiene el brief <a href={href('briefs', [lead.converted_brief_id])}>{lead.converted_brief_id}</a>.</p>
      {:else}
        <label class="cv__check">
          <input type="checkbox" bind:checked={wantBrief} disabled={busy} />
          <span>
            <span class="cv__check-t">Crear también un brief borrador con estos datos</span>
            <span class="cv__check-h">Queda como pendiente en Briefs, con el mensaje del lead en las notas, para completarlo con el cliente.</span>
          </span>
        </label>
      {/if}
    </section>

    {#if formError}<p class="cv__err" role="alert">{formError}</p>{/if}
  {/if}

  {#snippet footer()}
    <button type="button" class="b" onclick={() => (open = false)} disabled={busy}>Cancelar</button>
    <button type="button" class="b b--primary" disabled={!canSubmit} onclick={() => submit(false)}>{busy ? 'Convirtiendo…' : 'Convertir'}</button>
  {/snippet}
</Modal>

<style>
  .cv__set { margin: 0; padding: 0; border: 0; display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
  .cv__set + .cv__set { padding-top: var(--space-4); border-top: 1px solid var(--border); }
  .cv__legend { padding: 0; margin: 0; font-size: var(--dash-card-title); font-weight: 600; color: var(--fg-primary); }
  .cv__modes { display: flex; flex-wrap: wrap; gap: 6px; }
  .cv__mode {
    display: inline-flex; align-items: center; gap: 8px; min-height: 36px; padding: 6px 12px;
    border: 1px solid var(--border); border-radius: var(--radius-md); background: transparent;
    color: var(--fg-secondary); font-size: var(--dash-small); cursor: pointer;
  }
  .cv__mode.on { background: var(--surface-3); border-color: var(--border-strong); color: var(--fg-primary); }
  .cv__mode input { accent-color: var(--accent-gold); margin: 0; }
  .cv__done { margin: 0; font-size: var(--dash-body); color: var(--fg-secondary); }
  .cv__done a { color: var(--fg-primary); }
  .cv__check { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; }
  .cv__check input { margin-top: 3px; accent-color: var(--accent-gold); width: 16px; height: 16px; flex: 0 0 auto; }
  .cv__check-t { display: block; font-size: var(--dash-body); color: var(--fg-primary); }
  .cv__check-h { display: block; margin-top: 2px; font-size: var(--dash-small); color: var(--fg-subtle); line-height: 1.45; }
  .cv__err { margin: 0; font-size: var(--dash-small); color: var(--color-error); }
  @media (pointer: coarse) { .cv__mode { min-height: var(--tap-min); } }
  @media (max-width: 599px) { .cv__modes { flex-direction: column; } .cv__mode { width: 100%; } }
</style>
