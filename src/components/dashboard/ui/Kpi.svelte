<script>
  import KpiArt from '../KpiArt.svelte';
  // KPI de Orbit (fase 3, como la lámina original): rótulo, cifra en BLANCO,
  // nota en mono con la comparación, y el objeto en relieve (KpiArt) que la
  // tarjeta corta por abajo a la derecha. La cifra ya no se pinta de naranja,
  // verde o rojo (H-07): el color va en la comparación pequeña de la nota.
  // tone: '' | 'accent' | 'data' | 'error'. Solo 'error' deja huella: la nota
  // en rojo suave (Vencido, Neto negativo). Con `href` la tarjeta es un enlace.
  let { label, value, art = '', tone = '', note = '', href = '', children } = $props();

  // Tarjeta estrecha (teléfono a dos columnas): si la nota no cabe en dos líneas al lado
  // del objeto, el objeto pasa a su propia franja debajo (is-strip). Se decide por el
  // largo del texto y el ancho de la tarjeta, nunca por el alto (no hay rebotes).
  let card = $state();
  let strip = $state(false);
  $effect(() => {
    void value; void note;
    if (!card || !art || typeof ResizeObserver === 'undefined') return;
    const check = () => {
      const cs = getComputedStyle(card);
      const cw = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (cw >= 160) { if (strip) strip = false; return; }
      const el = card.querySelector('.ui-kpi__note');
      const len = el ? el.textContent.trim().length : 0;
      const perLine = Math.max(1, Math.floor((cw - 64) / 7.3));
      const next = len > perLine * 2;
      if (next !== strip) strip = next;
    };
    const ro = new ResizeObserver(check);
    ro.observe(card);
    check();
    return () => ro.disconnect();
  });
</script>

{#snippet body()}
  <p class="ui-kpi__label">{label}</p>
  <span class="ui-kpi__num">{value}</span>
  {#if children}<p class="ui-kpi__note" class:is-error={tone === 'error'}>{@render children()}</p>{:else if note}<p class="ui-kpi__note" class:is-error={tone === 'error'}>{note}</p>{/if}
  {#if art}<span class="ui-kpi__art"><KpiArt kind={art} /></span>{/if}
{/snippet}

{#if href}
  <a class="ui-kpi ui-kpi--link" class:has-art={!!art} class:is-strip={strip} bind:this={card} {href}>{@render body()}</a>
{:else}
  <article class="ui-kpi" class:has-art={!!art} class:is-strip={strip} bind:this={card}>{@render body()}</article>
{/if}
