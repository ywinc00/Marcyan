<script>
  // Tarjeta (un nivel de la rampa de superficies, H-06): --bg-card, borde
  // de 1 px, radio 14, padding 20. `caption` = rótulo pequeño encima del
  // título; `actions` = snippet a la derecha de la cabecera.
  let { title = '', caption = '', actions, children, flush = false, tag = 'section' } = $props();
</script>

<svelte:element this={tag} class="ui-card" class:ui-card--flush={flush}>
  {#if title || caption || actions}
    <header class="ui-card__head">
      <div class="ui-card__titles">
        {#if caption}<p class="ui-card__caption">{caption}</p>{/if}
        {#if title}<h2 class="ui-card__title">{title}</h2>{/if}
      </div>
      {#if actions}<div class="ui-card__actions">{@render actions()}</div>{/if}
    </header>
  {/if}
  {@render children?.()}
</svelte:element>
