<script>
  // Chip de estado: pastilla 12/500, fondo del color al 14 % y texto del
  // color. SIEMPRE con texto (nunca solo color).
  // tone: neutral | accent | data | success | warning | error | info
  let { tone = 'neutral', label = '', children } = $props();
</script>

<span class="ui-chip ui-chip--{tone}">{#if children}{@render children()}{:else}{label}{/if}</span>
