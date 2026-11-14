<script module>
  // Si el armazón del arranque estaba a la vista, las secciones que montan
  // justo después enseñan su esqueleto sin esperar el umbral: así no queda un
  // hueco en blanco entre el armazón y el esqueleto de la sección.
  let skipDelayUntil = 0;
  export function continueSkeletons(ms = 1500) {
    skipDelayUntil = (typeof performance !== 'undefined' ? performance.now() : 0) + ms;
  }
</script>

<script>
  import { onDestroy } from 'svelte';
  // Carga honesta (pieza E-09): el hueco se reserva desde el primer instante
  // con la forma de lo que viene, pero el esqueleto NO se ve si la respuesta
  // llega en menos de 300 ms (sin parpadeo) y, si se ve, se queda al menos
  // 400 ms (sin destello). El esqueleto copia la geometría real: pásale un
  // snippet `skeleton` con la forma de lo que viene, o usa rows/height.
  // Tablas: `head` (alto de la cabecera) y `gap` 1 para que las filas se lean
  // como las de la tabla real, con su misma altura.
  let { loading = false, delay = 300, min = 400, rows = 3, height = 52, head = 0, gap = 10, label = 'Cargando…', skeleton, children } = $props();

  const now = () => performance.now();
  let shown = $state(loading && now() < skipDelayUntil);
  let shownAt = shown ? now() : 0;
  let timer = null;

  $effect(() => {
    const isLoading = loading;
    if (isLoading) {
      if (!shown && !timer) {
        const wait = now() < skipDelayUntil ? 0 : delay;
        timer = setTimeout(() => { timer = null; shown = true; shownAt = now(); }, wait);
      }
    } else {
      if (timer && !shown) { clearTimeout(timer); timer = null; }
      if (shown && !timer) {
        const left = min - (now() - shownAt);
        if (left > 0) timer = setTimeout(() => { timer = null; shown = false; }, left);
        else shown = false;
      }
    }
  });

  onDestroy(() => { if (timer) clearTimeout(timer); });
</script>

{#if loading || shown}
  <!-- Mientras espera: el hueco ya mide lo que medirá el contenido (antes del
       umbral, invisible). El texto para el lector de pantalla sale solo cuando
       el esqueleto se ve, en una región aparte para que aria-busy no lo calle. -->
  <div class="ui-loading" class:ui-loading--wait={!shown} aria-busy="true">
    <div class="ui-loading__shape" class:ui-loading__shape--tabla={!skeleton && gap <= 2} style:gap={skeleton ? null : `${gap}px`} aria-hidden="true">
      {#if skeleton}
        {@render skeleton()}
      {:else}
        {#if head}<div class="ui-skel ui-skel--head" style="height:{head}px"></div>{/if}
        {#each Array(rows) as _, i (i)}
          <div class="ui-skel" style="height:{height}px"></div>
        {/each}
      {/if}
    </div>
  </div>
  <span class="sr-only" role="status">{shown ? label : ''}</span>
{:else}
  {@render children?.()}
{/if}
