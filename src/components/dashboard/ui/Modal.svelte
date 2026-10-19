<script>
  // Modal sobre <dialog> nativo: el navegador da la trampa de foco, el
  // fondo inerte y Escape. Aquí: foco inicial al primer campo (o al primer
  // botón), el foco vuelve al disparador al cerrar, y clic en el velo cierra.
  // open es bindable: <Modal bind:open title="…">…</Modal>
  import Icon from './Icon.svelte';
  import Toast from './Toast.svelte';
  import { pushLayer, popLayer } from '../lib/toast.svelte.js';
  let { open = $bindable(false), title = '', size = 'md', onclose, children, footer, dismissable = true } = $props();

  let dlg = $state(null);
  let returnTo = null;
  const titleId = 'ui-modal-' + Math.random().toString(36).slice(2, 9);

  $effect(() => {
    if (!dlg) return;
    if (open && !dlg.open) {
      returnTo = document.activeElement;
      dlg.showModal();
      pushLayer(titleId);   // los avisos pasan a pintarse dentro de este diálogo
      queueMicrotask(() => {
        const first = dlg.querySelector('[autofocus], input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled)')
          || dlg.querySelector('.ui-modal__body button:not(:disabled), .ui-modal__foot button:not(:disabled)');
        first?.focus();
      });
    } else if (!open && dlg.open) {
      dlg.close();
    }
  });
  // Si el modal se desmonta abierto, su capa no puede quedarse en la pila.
  $effect(() => () => popLayer(titleId));

  function handleClose() {
    // Se dispara tras dlg.close() (programático, Escape o el botón cerrar).
    popLayer(titleId);
    if (open) open = false;
    onclose?.();
    if (returnTo && typeof returnTo.focus === 'function' && document.contains(returnTo)) returnTo.focus();
    returnTo = null;
  }
  function onCancel(e) { if (!dismissable) e.preventDefault(); }
  function onBackdrop(e) { if (dismissable && e.target === dlg) open = false; }
</script>

<dialog bind:this={dlg} class="ui-modal ui-modal--{size}" aria-labelledby={title ? titleId : undefined}
  onclose={handleClose} oncancel={onCancel} onclick={onBackdrop}>
  <div class="ui-modal__panel">
    <header class="ui-modal__head">
      <h2 class="ui-modal__title" id={titleId}>{title}</h2>
      {#if dismissable}
        <button type="button" class="ui-icon-btn" aria-label="Cerrar" onclick={() => (open = false)}><Icon name="close" size={18} /></button>
      {/if}
    </header>
    <div class="ui-modal__body">{@render children?.()}</div>
    {#if footer}<footer class="ui-modal__foot">{@render footer()}</footer>{/if}
  </div>
  <Toast layer={titleId} />
</dialog>
