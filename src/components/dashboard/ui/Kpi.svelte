<script>
  import KpiArt from '../KpiArt.svelte';
  // KPI de Orbit (fase 3, como la lámina original): rótulo, cifra en BLANCO,
  // nota en mono con la comparación, y el objeto en relieve (KpiArt) que la
  // tarjeta corta por abajo a la derecha. La cifra ya no se pinta de naranja,
  // verde o rojo (H-07): el color va en la comparación pequeña de la nota.
  // tone: '' | 'accent' | 'data' | 'error'. Solo 'error' deja huella: la nota
  // en rojo suave (Vencido, Neto negativo). Con `href` la tarjeta es un enlace.
  let { label, value, art = '', tone = '', note = '', href = '', children } = $props();
</script>

{#snippet body()}
  <p class="ui-kpi__label">{label}</p>
  <span class="ui-kpi__num">{value}</span>
  {#if children}<p class="ui-kpi__note" class:is-error={tone === 'error'}>{@render children()}</p>{:else if note}<p class="ui-kpi__note" class:is-error={tone === 'error'}>{note}</p>{/if}
  {#if art}<span class="ui-kpi__art"><KpiArt kind={art} /></span>{/if}
{/snippet}

{#if href}
  <a class="ui-kpi ui-kpi--link" class:has-art={!!art} {href}>{@render body()}</a>
{:else}
  <article class="ui-kpi" class:has-art={!!art}>{@render body()}</article>
{/if}
