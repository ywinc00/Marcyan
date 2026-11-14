<script>
  // Hueco de una fila de cifras mientras llegan (pieza E-09): mismas tarjetas,
  // mismos rótulos (se saben de antemano) y la cifra y la nota en hueco, para
  // que la lista de debajo no baje de golpe al llegar los datos. Se usa como
  // snippet `skeleton` de LoadingState, que pone el umbral y el aria-busy.
  // `extra`: snippet opcional para una celda distinta (p. ej. el embudo de Briefs).
  import KpiGrid from './KpiGrid.svelte';
  // `notes`: texto típico de cada nota, sin cifras; solo da el largo del hueco para
  // que en el teléfono parta línea igual que la nota real. Va en un ::before
  // transparente: no se lee, no se encuentra con Ctrl+F y no sale en alto contraste.
  let { labels = [], notes = [], extra } = $props();
</script>

<KpiGrid count={labels.length + (extra ? 1 : 0)}>
  {#each labels as l, i (l)}
    <article class="ui-kpi">
      <p class="ui-kpi__label">{l}</p>
      <div class="ui-kpi__row"><span class="ui-skel ui-kpi__skel-num"></span></div>
      <p class="ui-kpi__note">{#if notes[i]}<span class="ui-skel ui-kpi__skel-text" data-t={notes[i]}></span>{:else}<span class="ui-skel ui-kpi__skel-note"></span>{/if}</p>
    </article>
  {/each}
  {#if extra}{@render extra()}{/if}
</KpiGrid>
