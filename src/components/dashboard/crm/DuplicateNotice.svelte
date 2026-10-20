<script>
  // "Ya existe un cliente con ese correo o teléfono": lista los existentes
  // (409 del servidor o coincidencias de la ficha del lead) y ofrece usar
  // uno (onuse) o, si se pasa onforce, crear el nuevo de todas formas.
  // Un cliente archivado no se elige desde aquí (revisión int1, F2): el
  // selector no los ofrece y el servidor los rechaza. Se muestra como
  // información, con su ficha enlazada para reactivarlo. Solo donde onuse
  // abre la ficha (archivedUsable) mantiene su botón.
  import { href } from '../lib/router.svelte.js';
  import StatusChip from '../ui/StatusChip.svelte';
  import { clientName, clientStatus } from './crm.js';
  let { matches = [], title = 'Ya existe un cliente con ese correo o teléfono', onuse, onforce, useLabel = 'Usar este', busy = false, archivedUsable = false } = $props();
</script>

{#if matches.length}
  <div class="dup" role="status">
    <p class="dup__t">{title}</p>
    <ul class="dup__list">
      {#each matches as m (m.id)}
        <li class="dup__row">
          <div class="dup__who">
            <a class="dup__name" href={href('clientes', [m.id])}>{clientName(m)}</a>
            <span class="dup__sub">{m.client_code}{m.email ? ' · ' + m.email : ''}{m.phone ? ' · ' + m.phone : ''}</span>
            {#if onuse && m.status === 'archived' && !archivedUsable}<span class="dup__note">Reactívalo en su ficha para usarlo.</span>{/if}
          </div>
          {#if m.status !== 'active'}<StatusChip tone="neutral" label={clientStatus(m.status).label} />{/if}
          {#if onuse && (m.status !== 'archived' || archivedUsable)}<button type="button" class="b b--mini" disabled={busy} onclick={() => onuse(m)}>{useLabel}</button>{/if}
        </li>
      {/each}
    </ul>
    {#if onforce}
      <button type="button" class="b b--ghost b--mini dup__force" disabled={busy} onclick={onforce}>No es el mismo, crear uno nuevo igualmente</button>
    {/if}
  </div>
{/if}

<style>
  .dup { padding: 12px 14px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-warning) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent); }
  .dup__t { margin: 0 0 8px; font-size: var(--dash-small); font-weight: 600; color: var(--fg-primary); }
  .dup__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .dup__row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
  .dup__who { flex: 1 1 200px; min-width: 0; }
  .dup__name { color: var(--fg-primary); font-weight: 500; font-size: var(--dash-body); text-decoration: none; }
  .dup__name:hover { text-decoration: underline; }
  .dup__sub { display: block; font-size: var(--dash-caption); color: var(--fg-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dup__note { display: block; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .dup__force { margin-top: 8px; }
</style>
