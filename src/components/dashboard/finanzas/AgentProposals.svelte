<script>
  // Propuestas del agente contable (fase 2), en la portada de Finanzas.
  // El agente solo propone: cada fila espera «Aplicar» o «Descartar» del dueño.
  // Lo descartado no vuelve a salir en 60 días. Los avisos se cierran con
  // «Entendido». Sin propuestas, la tarjeta no ocupa sitio.
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { href } from '../lib/router.svelte.js';
  import { toast } from '../lib/toast.svelte.js';
  import { formatUsd } from './fin.js';

  let { onchanged } = $props();

  let state = $state(null);
  let busyId = $state('');
  let rowError = $state({});

  export async function load() {
    try { state = await api('/api/admin/finance/agent'); } catch (e) { if (!isSessionError(e)) state = null; }
  }
  $effect(() => { load(); });

  const LINKS = {
    ano: () => href('finanzas', [], {}),
    facturas: () => href('finanzas', ['facturas'], {}),
    movimientos: () => href('finanzas', ['movimientos'], {}),
    impuestos: () => href('finanzas', ['impuestos'], {}),
    registros: () => href('finanzas', ['registros'], {}),
  };
  const DONE = {
    registrar_gasto: 'Gasto apuntado',
    categorizar: 'Gasto aceptado con esa categoría',
    descartar_movimiento: 'Descartado: no cuenta en los libros',
    vincular_suscripcion: 'Cargo de la suscripción confirmado',
    vincular_cobro: 'Cobro confirmado; no se cuenta dos veces',
  };
  const list = $derived(state && state.proposals ? state.proposals : []);

  async function decide(p, action) {
    busyId = p.id; rowError = { ...rowError, [p.id]: '' };
    try {
      const r = await api('/api/admin/finance/agent', { method: 'POST', body: { action, id: p.id } });
      state = r.state;
      if (action === 'reject') toast('Descartada: no volverá a salir');
      else if (p.kind !== 'aviso') { toast(DONE[p.kind] || 'Aplicado'); onchanged?.(); }
    } catch (e) {
      if (!isSessionError(e)) rowError = { ...rowError, [p.id]: errorMessage(e, 'No se pudo guardar.') };
    } finally { busyId = ''; }
  }
</script>

{#if list.length}
  <section class="ap" aria-labelledby="ap-t">
    <header class="ap-head">
      <h3 id="ap-t">El agente propone<span class="ap-n">{list.length}</span></h3>
      <p>Nada se aplica sin tu visto bueno. Lo que descartes no vuelve a salir.</p>
    </header>
    <ul class="ap-list">
      {#each list as p (p.id)}
        {@const busy = busyId === p.id}
        <li class="ap-row">
          <div class="ap-main">
            <span class="ap-title">{p.title}</span>
            {#if p.amount_cents}<span class="ap-amt">−{formatUsd(p.amount_cents)}</span>{/if}
          </div>
          {#if p.detail}<p class="ap-detail">{p.detail}</p>{/if}
          <div class="ap-acts">
            {#if p.kind === 'aviso'}
              <button type="button" class="b b--mini" disabled={busy} onclick={() => decide(p, 'apply')}>Entendido</button>
            {:else}
              <button type="button" class="b b--mini" disabled={busy} onclick={() => decide(p, 'apply')}>Aplicar</button>
              <button type="button" class="b b--ghost b--mini" disabled={busy} onclick={() => decide(p, 'reject')}>Descartar</button>
            {/if}
            {#if p.link && LINKS[p.link]}<a class="ap-link" href={LINKS[p.link]()}>Ver en Finanzas</a>{/if}
          </div>
          {#if rowError[p.id]}<p class="ap-err" role="status">{rowError[p.id]}</p>{/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .ap { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; container-type: inline-size; }
  .ap-head { padding: 16px 20px; border-bottom: 1px solid var(--border); }
  .ap-head h3 { margin: 0; font-size: 17px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .ap-head p { margin: 4px 0 0; color: var(--fg-subtle); font-size: var(--dash-small); max-width: 60ch; }
  .ap-n { font-size: var(--dash-caption); font-weight: 500; color: var(--fg-secondary); background: var(--surface-3); border-radius: var(--radius-pill); padding: 1px 8px; }
  .ap-list { list-style: none; margin: 0; padding: 0; }
  .ap-row { padding: 12px 20px; border-top: 1px solid var(--border-subtle); }
  .ap-row:first-child { border-top: 0; }
  .ap-main { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .ap-title { color: var(--fg-primary); font-weight: 500; overflow-wrap: anywhere; }
  .ap-amt { color: var(--fg-primary); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .ap-detail { margin: 4px 0 0; color: var(--fg-secondary); font-size: var(--dash-small); max-width: 75ch; }
  .ap-acts { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; }
  .ap-link { color: var(--fg-secondary); font-size: var(--dash-small); text-underline-offset: 3px; padding: 6px 4px; }
  .ap-link:hover { color: var(--fg-primary); }
  .ap-err { margin: 8px 0 0; color: var(--color-error); font-size: var(--dash-small); }
  @media (pointer: coarse) { .ap-acts .b, .ap-link { min-height: 44px; display: inline-flex; align-items: center; } }
</style>
