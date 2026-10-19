<script>
  import Icon from './Icon.svelte';
  // Error con rescate (E-10): dice qué falló en llano y ofrece Reintentar.
  let { title = 'No se pudo cargar', message = '', onretry, compact = false } = $props();
  let retrying = $state(false);
  async function retry() {
    if (!onretry || retrying) return;
    retrying = true;
    try { await onretry(); } finally { retrying = false; }
  }
</script>

<div class="ui-error" class:ui-error--compact={compact} role="alert">
  <span class="ui-error__icon"><Icon name="alert" size={20} /></span>
  <div class="ui-error__body">
    <p class="ui-error__title">{title}</p>
    {#if message}<p class="ui-error__text">{message}</p>{/if}
  </div>
  {#if onretry}
    <button type="button" class="b" onclick={retry} disabled={retrying}>
      <Icon name="refresh" size={16} />{retrying ? 'Reintentando…' : 'Reintentar'}
    </button>
  {/if}
</div>
