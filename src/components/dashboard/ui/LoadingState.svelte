<script module>
  import { setRetencion } from '../lib/api.js';

  // Si el armazón del arranque estaba a la vista, las secciones que montan
  // justo después enseñan su esqueleto sin esperar el umbral: así no queda un
  // hueco en blanco entre el armazón y el esqueleto de la sección.
  let skipDelayUntil = 0;
  export function continueSkeletons(ms = 1500) {
    skipDelayUntil = (typeof performance !== 'undefined' ? performance.now() : 0) + ms;
  }

  // Mínimo de 400 ms aunque la sección quite el esqueleto al llegar el dato
  // (patrón {:else if !loaded}): la lectura que llega antes espera aquí.
  const MIN = 400;
  let visibles = 0;
  let ultimaVez = 0;
  function esperaMinima() {
    if (!visibles) return Promise.resolve();
    const falta = MIN - (performance.now() - ultimaVez);
    return falta > 0 ? new Promise((r) => setTimeout(r, falta)) : Promise.resolve();
  }
  setRetencion(esperaMinima);
</script>

<script>
  import { onDestroy, untrack } from 'svelte';
  import { entra, sale } from '../lib/cargando.svelte.js';
  // Carga honesta (pieza E-09): el hueco se reserva desde el primer instante
  // con la forma de lo que viene, pero el esqueleto NO se ve si la respuesta
  // llega en menos de 300 ms (sin parpadeo) y, si se ve, se queda al menos
  // 400 ms (sin destello). El esqueleto copia la geometría real: pásale un
  // snippet `skeleton` con la forma de lo que viene, o usa rows/height.
  // Tablas: `head` (alto de la cabecera) y `gap` 1 para que las filas se lean
  // como las de la tabla real; `movil` = alto de cada fila cuando en el
  // teléfono la tabla pasa a tarjetas.
  let { loading = false, delay = 300, rows = 3, height = 52, head = 0, gap = 10, movil = 0, label = 'Cargando…', skeleton, children } = $props();

  const now = () => performance.now();
  // Valor inicial a propósito (tras el arranque, el esqueleto sale ya visible).
  let shown = $state(untrack(() => loading) && now() < skipDelayUntil);
  let shownAt = untrack(() => shown) ? now() : 0;
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
        const left = MIN - (now() - shownAt);
        if (left > 0) timer = setTimeout(() => { timer = null; shown = false; }, left);
        else shown = false;
      }
    }
  });

  // Mientras el esqueleto se ve: cuenta para la retención y su rótulo va a la
  // región única de la carcasa (nada de una región por esqueleto).
  $effect(() => {
    if (!shown) return;
    const etiqueta = label;
    visibles += 1;
    ultimaVez = now();
    // untrack: entra/sale leen y escriben la lista compartida; sin él, este efecto
    // dependería de ella y se volvería a disparar a sí mismo.
    untrack(() => entra(etiqueta));
    return () => { visibles -= 1; untrack(() => sale(etiqueta)); };
  });

  onDestroy(() => { if (timer) clearTimeout(timer); });
</script>

{#if loading || shown}
  <!-- Mientras espera: el hueco ya mide lo que medirá el contenido (antes del
       umbral, invisible). -->
  <div class="ui-loading" class:ui-loading--wait={!shown} aria-busy="true">
    <div class="ui-loading__shape" class:ui-loading__shape--tabla={!skeleton && gap <= 2}
      style:gap={skeleton ? null : `${gap}px`} style:--h-movil={movil ? `${movil}px` : null} aria-hidden="true">
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
{:else}
  {@render children?.()}
{/if}
