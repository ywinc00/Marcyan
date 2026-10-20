<script>
  import KpiArt from '../KpiArt.svelte';
  // KPI de Orbit: rótulo, cifra grande (30/650), ilustración glossy de
  // esquina (KpiArt, conservada) y una nota. tone: '' | 'accent' | 'data' | 'error'.
  // ('error' lo añadió A4 para Vencido y un Neto negativo: color semántico, no acento.)
  // Con `href` la tarjeta entera es un enlace a lo pendiente.
  let { label, value, art = '', tone = '', note = '', href = '', children } = $props();
</script>

{#if href}
  <a class="ui-kpi ui-kpi--link" {href}>
    <p class="ui-kpi__label">{label}</p>
    <div class="ui-kpi__row">
      <span class="ui-kpi__num" class:is-accent={tone === 'accent'} class:is-data={tone === 'data'} class:is-error={tone === 'error'}>{value}</span>
      {#if art}<KpiArt kind={art} size={46} />{/if}
    </div>
    {#if children}<p class="ui-kpi__note">{@render children()}</p>{:else if note}<p class="ui-kpi__note">{note}</p>{/if}
  </a>
{:else}
  <article class="ui-kpi">
    <p class="ui-kpi__label">{label}</p>
    <div class="ui-kpi__row">
      <span class="ui-kpi__num" class:is-accent={tone === 'accent'} class:is-data={tone === 'data'} class:is-error={tone === 'error'}>{value}</span>
      {#if art}<KpiArt kind={art} size={46} />{/if}
    </div>
    {#if children}<p class="ui-kpi__note">{@render children()}</p>{:else if note}<p class="ui-kpi__note">{note}</p>{/if}
  </article>
{/if}
