<script>
  import KpiArt from '../KpiArt.svelte';
  // Vacío que propone salida (E-08): qué pasa aquí, por qué está vacío y
  // qué hacer. `action` = snippet con el botón o enlace de salida.
  let { title = '', text = '', art = '', action, compact = false } = $props();
</script>

<div class="ui-empty" class:ui-empty--compact={compact}>
  {#if art}<KpiArt kind={art} size={compact ? 36 : 44} />{/if}
  {#if title}<p class="ui-empty__title">{title}</p>{/if}
  {#if text}<p class="ui-empty__text">{text}</p>{/if}
  {#if action}<div class="ui-empty__action">{@render action()}</div>{/if}
</div>
