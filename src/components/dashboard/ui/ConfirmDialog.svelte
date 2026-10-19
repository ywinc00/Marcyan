<script>
  // Confirmación de una acción destructiva. Dice QUÉ se borra y QUÉ
  // arrastra; con `requireText` hay que escribir el identificador para
  // habilitar el botón (borrados definitivos).
  import Modal from './Modal.svelte';
  let {
    open = $bindable(false), title = '¿Seguro?', message = '', confirmLabel = 'Borrar',
    danger = true, busy = false, requireText = '', onconfirm, oncancel,
  } = $props();
  let typed = $state('');
  const canConfirm = $derived(!busy && (!requireText || typed.trim() === requireText));
  $effect(() => { if (!open) typed = ''; });
</script>

<Modal bind:open {title} size="sm" onclose={() => oncancel?.()}>
  {#if message}<p class="ui-confirm__msg">{message}</p>{/if}
  {#if requireText}
    <label class="ui-field">
      <span class="ui-field__label">Escribe <strong>{requireText}</strong> para confirmar</span>
      <input class="ui-input" bind:value={typed} autocomplete="off" spellcheck="false" />
    </label>
  {/if}
  {#snippet footer()}
    <button type="button" class="b" onclick={() => (open = false)} disabled={busy}>Cancelar</button>
    <button type="button" class="b {danger ? 'b--danger' : 'b--primary'}" disabled={!canConfirm} onclick={() => onconfirm?.()}>
      {busy ? 'Un momento…' : confirmLabel}
    </button>
  {/snippet}
</Modal>
