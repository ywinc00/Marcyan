<script>
  // Marcar un contacto como perdido (Ventas §1): el motivo es obligatorio y nada viene
  // marcado de inicio; el botón no se enciende hasta elegir uno. Una nota opcional.
  // Guarda con PATCH /api/admin/leads/:ref { status: 'lost', lost_reason, lost_note }.
  import Modal from '../ui/Modal.svelte';
  import { api } from '../lib/api.js';
  import { toast } from '../lib/toast.svelte.js';
  import { LOST_REASONS } from './crm.js';

  let { open = $bindable(false), lead = null, onsaved } = $props();
  let reason = $state('');
  let note = $state('');
  let busy = $state(false);
  let error = $state('');
  const who = $derived(lead ? (lead.name || lead.business_name || lead.ref_id) : '');
  const groupId = 'lost-' + Math.random().toString(36).slice(2, 8);

  $effect(() => { if (open) { reason = ''; note = ''; error = ''; } });

  async function save() {
    if (!reason || busy) return;
    busy = true; error = '';
    try {
      const j = await api('/api/admin/leads/' + encodeURIComponent(lead.ref_id), {
        method: 'PATCH', body: { status: 'lost', lost_reason: reason, lost_note: note.trim() || null },
      });
      toast(`${who}: perdido`);
      open = false;
      onsaved?.(j.lead || { ...lead, status: 'lost', lost_reason: reason });
    } catch (e) {
      error = e?.message || 'No se pudo guardar. Inténtalo de nuevo.';
    } finally { busy = false; }
  }
</script>

<Modal bind:open title="Marcar como perdido" size="sm">
  <!-- El foco empieza aquí: en el primer motivo parecería ya elegido. -->
  <!-- svelte-ignore a11y_autofocus -->
  <p class="lead" tabindex="-1" autofocus><b>{who}</b>. Elige el motivo: sirve para ver por qué no cerramos.</p>
  <fieldset class="reasons" aria-describedby={error ? groupId + '-err' : undefined}>
    <legend class="sr-only">Motivo</legend>
    {#each LOST_REASONS as r (r.id)}
      <label class="reason">
        <input type="radio" name={groupId} value={r.id} bind:group={reason} disabled={busy} />
        <span>{r.label}</span>
      </label>
    {/each}
  </fieldset>
  <label class="ui-field">
    <span class="ui-field__label">Algo más (opcional)</span>
    <textarea class="ui-input note" rows="2" maxlength="2000" bind:value={note} disabled={busy}></textarea>
  </label>
  {#if error}<p class="err" id={groupId + '-err'} role="status">{error}</p>{/if}
  {#snippet footer()}
    <button type="button" class="b" onclick={() => (open = false)} disabled={busy}>Cancelar</button>
    <button type="button" class="b b--primary" disabled={!reason || busy} aria-busy={busy} onclick={save}>
      {busy ? 'Guardando…' : 'Marcar como perdido'}
    </button>
  {/snippet}
</Modal>

<style>
  .lead:focus { outline: none; } /* auditoria-ignorar: párrafo que solo recibe el foco inicial del diálogo, no es un control */
  .lead b { color: var(--fg-primary); font-weight: 600; }
  .lead { margin: 0; color: var(--fg-secondary); font-size: var(--dash-small); line-height: 1.5; }
  .reasons { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .reason { display: flex; align-items: center; gap: var(--space-3); min-height: 44px; padding: 0 var(--space-1); border-radius: var(--radius-sm); cursor: pointer; color: var(--fg-primary); font-size: var(--dash-body); }
  .reason:hover { background: var(--bg-elevated); }
  .reason input { width: 18px; height: 18px; margin: 0; accent-color: var(--accent-gold); flex: 0 0 auto; }
  .reason input:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .note { resize: vertical; min-height: 64px; line-height: 1.5; }
  .err { margin: 0; color: var(--delta-down); font-size: var(--dash-small); }
</style>
