<script>
  // Paginación de las listas de Leads y Clientes: "31–60 de 84" y
  // Anterior / Siguiente. La página vive en la URL (?pagina=N).
  import Icon from '../ui/Icon.svelte';
  let { page = 1, size = 30, total = 0, onpage } = $props();
  const pages = $derived(Math.max(1, Math.ceil(total / size)));
  const from = $derived(total ? (page - 1) * size + 1 : 0);
  const to = $derived(Math.min(page * size, total));
</script>

{#if total > size}
  <nav class="pager" aria-label="Páginas">
    <span class="pager__info">{from}–{to} de {total}</span>
    <span class="pager__btns">
      <button type="button" class="b b--ghost" disabled={page <= 1} onclick={() => onpage?.(page - 1)}>
        <span class="flip"><Icon name="chevron" size={16} /></span>Anterior
      </button>
      <button type="button" class="b b--ghost" disabled={page >= pages} onclick={() => onpage?.(page + 1)}>
        Siguiente<Icon name="chevron" size={16} />
      </button>
    </span>
  </nav>
{/if}

<style>
  .pager { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-4); }
  .pager__info { font-size: var(--dash-small); color: var(--fg-subtle); font-variant-numeric: tabular-nums; }
  .pager__btns { display: flex; gap: var(--space-2); }
  .flip { display: inline-flex; transform: rotate(180deg); }
</style>
