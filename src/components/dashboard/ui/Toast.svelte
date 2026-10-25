<script>
  // Pinta la cola de avisos breves (lib/toast.svelte.js). Región viva
  // educada: el lector de pantalla los anuncia sin interrumpir.
  // layer: la de la carcasa va sin capa; cada <dialog> modal monta la suya
  // con su id, y solo pinta la de la capa abierta de más arriba.
  import Icon from './Icon.svelte';
  import { toasts, dismissToast, layers } from '../lib/toast.svelte.js';
  let { layer = null } = $props();
  const active = $derived((layers.length ? layers[layers.length - 1] : null) === layer);
</script>

<div class="ui-toasts" aria-live="polite" aria-atomic="false">
  {#if active}
  {#each toasts as t (t.id)}
    <div class="ui-toast ui-toast--{t.tone}" role={t.tone === 'error' ? 'alert' : 'status'}>
      <span class="ui-toast__icon"><Icon name={t.tone === 'error' ? 'alert' : 'check'} size={18} /></span>
      <p class="ui-toast__msg">{t.message}</p>
      <button type="button" class="ui-icon-btn ui-icon-btn--sm" aria-label="Cerrar aviso" onclick={() => dismissToast(t.id)}><Icon name="close" size={16} /></button>
    </div>
  {/each}
  {/if}
</div>
