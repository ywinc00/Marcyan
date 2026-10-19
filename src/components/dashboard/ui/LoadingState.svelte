<script>
  import { onDestroy } from 'svelte';
  // Carga honesta (E-09): el esqueleto NO aparece si la respuesta llega en
  // menos de 300 ms (sin parpadeo) y, si aparece, se queda al menos 400 ms
  // (sin destello). El esqueleto copia la geometría real: pásale un snippet
  // `skeleton` con la forma de lo que viene, o usa rows/height por defecto.
  let { loading = false, delay = 300, min = 400, rows = 3, height = 52, label = 'Cargando…', skeleton, children } = $props();

  let shown = $state(false);
  let shownAt = 0;
  let timer = null;

  $effect(() => {
    const isLoading = loading;
    if (isLoading) {
      if (!shown && !timer) {
        timer = setTimeout(() => { timer = null; shown = true; shownAt = performance.now(); }, delay);
      }
    } else {
      if (timer && !shown) { clearTimeout(timer); timer = null; }
      if (shown && !timer) {
        const left = min - (performance.now() - shownAt);
        if (left > 0) timer = setTimeout(() => { timer = null; shown = false; }, left);
        else shown = false;
      }
    }
  });

  onDestroy(() => { if (timer) clearTimeout(timer); });
</script>

{#if shown}
  <div class="ui-loading" role="status" aria-live="polite">
    <span class="sr-only">{label}</span>
    {#if skeleton}
      {@render skeleton()}
    {:else}
      {#each Array(rows) as _, i (i)}
        <div class="ui-skel" style="height:{height}px"></div>
      {/each}
    {/if}
  </div>
{:else if !loading}
  {@render children?.()}
{:else}
  <div class="ui-loading ui-loading--hold" aria-busy="true"><span class="sr-only">{label}</span></div>
{/if}
