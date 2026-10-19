<script>
  // Botón del sitio DENTRO de la isla. Es un espejo exacto de
  // src/components/ui/Button.astro (mismas variantes y valores: primary oro,
  // secondary contorno, ghost), porque los estilos de un componente Astro no
  // llegan a una isla Svelte. No es una variante nueva: si cambia Button.astro,
  // cambia aquí.
  // Con `sending`/`done` usa el contrato de BtnStates (.bstate + data-state y la
  // pila .bst); la página carga una vez BtnStates.astro para sus estilos globales.
  let {
    variant = 'primary', size = 'lg', href, type = 'button', onclick, disabled = false,
    state = '', sending, done, track, label, full = false, children, el = $bindable(),
  } = $props();
  const stacked = $derived(!!(sending && done));
</script>

{#if href}
  <a bind:this={el} class="btn btn--{variant} btn--{size}" class:btn--full={full} {href} data-track={track} aria-label={label} {onclick}
     target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
    {@render children?.()}
  </a>
{:else}
  <button
    bind:this={el}
    class="btn btn--{variant} btn--{size}"
    class:bstate={stacked}
    class:btn--full={full}
    {type}
    {onclick}
    disabled={disabled || state === 'sending' || state === 'done'}
    data-state={state || undefined}
    data-track={track}
    aria-label={label}
  >
    {#if stacked}
      <span class="bst">
        <span class="bst__s bst__s--idle">{@render children?.()}</span>
        <span class="bst__s bst__s--sending">{sending}</span>
        <span class="bst__s bst__s--done">
          <svg class="bst__check" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5" /></svg>{done}
        </span>
      </span>
    {:else}
      {@render children?.()}
    {/if}
  </button>
{/if}

<style>
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
    font-family: var(--font-body); font-weight: 600; letter-spacing: 0.01em;
    border-radius: var(--radius-md); cursor: pointer; text-align: center; border: 0;
    text-decoration: none; white-space: nowrap; min-height: var(--tap-min);
    transition: background var(--duration-fast) var(--ease-out-expo),
                border-color var(--duration-fast) var(--ease-out-expo),
                color var(--duration-fast), box-shadow var(--duration-base), transform var(--duration-fast);
  }
  .btn--md { padding: 10px 22px; font-size: var(--text-sm); }
  .btn--lg { padding: 14px 28px; font-size: var(--text-base); }
  .btn--full { width: 100%; }
  .btn:active { transform: scale(0.97); }
  .btn:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }

  .btn--primary { background: var(--accent-gold); color: var(--fg-inverse); }
  .btn--primary:hover { background: color-mix(in srgb, var(--accent-gold), white 10%); box-shadow: var(--shadow-gold); }

  .btn--secondary { background: transparent; color: var(--fg-primary); border: 1px solid var(--border-accent); }
  .btn--secondary:hover { border-color: var(--accent-gold); color: var(--accent-gold); }

  .btn--ghost { background: transparent; color: var(--fg-secondary); padding-inline: var(--space-2); }
  .btn--ghost:hover { color: var(--accent-gold); }

  .btn:disabled { opacity: .55; cursor: not-allowed; pointer-events: none; box-shadow: none; }
  .btn:disabled:hover { transform: none; }

  .btn[data-state='done'],
  .btn[data-state='done']:disabled {
    background: var(--accent-teal-dim); color: var(--accent-teal);
    box-shadow: inset 0 0 0 1px var(--accent-teal-line);
    opacity: 1; cursor: default;
  }
  .btn[data-state='sending']:disabled { opacity: .8; }

  @media (--motion-reduce) { .btn:active { transform: none; } }
</style>
