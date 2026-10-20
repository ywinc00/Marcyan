<script>
  // Filtros en pastillas con su recuento (catálogo E-06). Cada pastilla dice
  // cuántos verías al pulsarla; la activa se marca con superficie y texto,
  // no con naranja (presupuesto del acento, H-07) y nunca solo por color
  // (aria-pressed + peso). El estado vive en la URL: lo decide el padre.
  //   options: [{ id, label, count? }]  (id '' = "Todos")
  let { options = [], value = '', label = 'Filtro', onchange } = $props();
</script>

<div class="pills" role="group" aria-label={label}>
  {#each options as o (o.id)}
    <button type="button" class="pill" class:on={value === o.id} aria-pressed={value === o.id}
      onclick={() => { if (value !== o.id) onchange?.(o.id); }}>
      <span>{o.label}</span>
      {#if o.count != null}<span class="pill__n">{o.count}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .pill {
    display: inline-flex; align-items: center; gap: 8px;
    min-height: 32px; padding: 5px 8px 5px 12px;
    border: 1px solid var(--border); border-radius: var(--radius-pill);
    background: transparent; color: var(--fg-secondary);
    font-family: var(--font-body); font-size: var(--dash-small); font-weight: 500; line-height: 1.2;
    cursor: pointer; white-space: nowrap;
    transition: background-color var(--duration-fast), border-color var(--duration-fast), color var(--duration-fast);
  }
  .pill:hover { border-color: var(--border-strong); color: var(--fg-primary); background: var(--bg-elevated); }
  .pill.on { background: var(--surface-3); border-color: var(--border-strong); color: var(--fg-primary); font-weight: 600; }
  .pill__n {
    min-width: 22px; padding: 1px 7px; border-radius: var(--radius-pill);
    background: var(--bg-elevated); color: var(--fg-secondary);
    font-size: var(--dash-caption); font-weight: 600; text-align: center; font-variant-numeric: tabular-nums;
  }
  .pill.on .pill__n { background: var(--bg-base); color: var(--fg-primary); }
  @media (pointer: coarse) { .pill { min-height: var(--tap-min); padding-left: 14px; } }
</style>
