<script>
  // Suscripciones (FIN-10, FIN-18). Lee y escribe el MISMO estado que la
  // barra lateral (store de la carcasa): tras cada cambio se llama a
  // refreshShell() y la barra y esta lista cuadran sin recargar.
  // El próximo cargo llega ya avanzado por el servidor según la periodicidad.
  import Card from '../ui/Card.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import Icon from '../ui/Icon.svelte';
  import BrandLogo from '../BrandLogo.svelte';
  import SubscriptionForm from './SubscriptionForm.svelte';
  import { api } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { data, refreshShell } from '../lib/store.svelte.js';
  import { fmtDay } from '../lib/dates.js';
  import { formatUsd, categoryLabel, CYCLE_LABELS } from './fin.js';

  let { onchanged } = $props();

  let formOpen = $state(false);
  let editing = $state(null);
  let toDelete = $state(null);
  let confirmOpen = $state(false);
  let deleting = $state(false);
  let busyId = $state(null);
  let retrying = $state(false);

  const subs = $derived(data.subs);
  const monthlyCents = $derived(subs.filter((s) => s.active).reduce((acc, s) => {
    const c = Number(s.amount_cents || 0);
    return acc + (s.cycle === 'yearly' ? Math.round(c / 12) : c);
  }, 0));
  const activeCount = $derived(subs.filter((s) => s.active).length);
  const hasYearly = $derived(subs.some((s) => s.active && s.cycle === 'yearly'));

  async function changed() { await refreshShell(); onchanged?.(); }

  async function toggle(sub) {
    const next = !sub.active;
    busyId = sub.id;
    sub.active = next; // optimista: el interruptor responde al instante
    try {
      await api('/api/admin/subscriptions/' + sub.id, { method: 'PATCH', body: { active: next } });
      toast(next ? `${sub.name} activada` : `${sub.name} pausada`);
      await changed();
    } catch (e) {
      sub.active = !next;
      toastError(e, 'No se pudo cambiar la suscripción.');
    } finally { busyId = null; }
  }
  function openNew() { editing = null; formOpen = true; }
  function openEdit(s) { editing = s; formOpen = true; }
  function askDelete(s) { toDelete = s; confirmOpen = true; }
  async function confirmDelete() {
    deleting = true;
    try {
      await api('/api/admin/subscriptions/' + toDelete.id, { method: 'DELETE' });
      toast(`${toDelete.name} borrada`);
      confirmOpen = false;
      await changed();
    } catch (e) { toastError(e, 'No se pudo borrar la suscripción.'); }
    finally { deleting = false; }
  }
  async function retry() { retrying = true; try { await refreshShell(); } finally { retrying = false; } }
</script>

<Card title="Suscripciones" caption="Servicios que pagamos cada mes o cada año">
  {#snippet actions()}
    <button type="button" class="b b--mini" onclick={openNew}>Nueva suscripción</button>
  {/snippet}

  {#if data.subsError && !subs.length}
    <ErrorState compact title="No se pudieron cargar las suscripciones" message={data.subsError} onretry={retry} />
  {:else}
    <LoadingState loading={!data.subsLoaded} rows={3} height={44}>
      {#if !subs.length}
        <EmptyState compact title="Aún no hay suscripciones"
          text="Añade lo que pagas de forma recurrente (hosting, correo, diseño) y verás cuánto suma al mes." />
      {:else}
        <div class="sc-head">
          <p class="sc-head__num">{formatUsd(monthlyCents)}<span class="sc-head__unit">&nbsp;al mes</span></p>
          <p class="sc-head__meta">{activeCount} activa{activeCount === 1 ? '' : 's'} · {formatUsd(monthlyCents * 12)} al año{hasYearly ? ' · las anuales cuentan una doceava parte al mes' : ''}</p>
        </div>
        <ul class="sc-list">
          {#each subs as s (s.id)}
            <li class="sc-row" class:is-off={!s.active}>
              <BrandLogo name={s.name} size={28} />
              <div class="sc-main">
                <span class="sc-name">{s.name}</span>
                <span class="sc-meta">
                  {#if s.category}<StatusChip tone="neutral" label={categoryLabel(s.category)} />{/if}
                  {#if !s.active}<span>Pausada</span>
                  {:else if s.next_charge_at}<span>Próximo cargo {fmtDay(s.next_charge_at)}</span>
                  {:else}<span>Sin fecha de cargo</span>{/if}
                </span>
              </div>
              <div class="sc-price">
                <span class="sc-amount">{formatUsd(s.amount_cents)}</span>
                <span class="sc-cycle">{CYCLE_LABELS[s.cycle] || s.cycle}</span>
              </div>
              <div class="sc-acts">
                <button type="button" class="sc-toggle" class:on={s.active} role="switch" aria-checked={s.active}
                  aria-label="{s.name}: {s.active ? 'activa' : 'pausada'}" disabled={busyId === s.id} onclick={() => toggle(s)}>
                  <span class="sc-toggle__knob"></span>
                </button>
                <button type="button" class="ui-icon-btn" aria-label="Editar {s.name}" title="Editar" onclick={() => openEdit(s)}><Icon name="edit" size={17} /></button>
                <button type="button" class="ui-icon-btn sc-del" aria-label="Borrar {s.name}" title="Borrar" onclick={() => askDelete(s)}><Icon name="trash" size={17} /></button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </LoadingState>
  {/if}
</Card>

<SubscriptionForm bind:open={formOpen} subscription={editing} onsaved={changed} />
<ConfirmDialog bind:open={confirmOpen} title="¿Borrar esta suscripción?" busy={deleting} confirmLabel="Borrar suscripción"
  message={toDelete ? `Se borra ${toDelete.name} (${formatUsd(toDelete.amount_cents)} ${toDelete.cycle === 'yearly' ? 'al año' : 'al mes'}) de Finanzas y de la barra lateral. Si solo vas a dejar de usarla un tiempo, mejor ponla en pausa con el interruptor. No se puede deshacer.` : ''}
  onconfirm={confirmDelete} />

<style>
  .sc-head { padding: 12px 14px; margin-bottom: 8px; border-radius: var(--radius-md); background: var(--bg-elevated); border: 1px solid var(--border); }
  .sc-head__num { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: var(--tracking-tight); color: var(--fg-primary); font-variant-numeric: tabular-nums; }
  .sc-head__unit { font-size: var(--dash-small); font-weight: 500; color: var(--fg-secondary); }
  .sc-head__meta { margin: 4px 0 0; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .sc-list { list-style: none; margin: 0; padding: 0; }
  .sc-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--border-subtle); }
  .sc-row:first-child { border-top: 0; }
  .sc-row.is-off .sc-main, .sc-row.is-off .sc-price, .sc-row.is-off :global(.brandlogo) { opacity: .55; }
  .sc-main { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
  .sc-name { font-size: var(--dash-body); font-weight: 500; color: var(--fg-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sc-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .sc-price { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex: 0 0 auto; }
  .sc-amount { font-size: var(--dash-small); color: var(--fg-primary); font-variant-numeric: tabular-nums; }
  .sc-cycle { font-size: var(--dash-caption); color: var(--fg-subtle); }
  .sc-acts { display: flex; align-items: center; gap: 2px; flex: 0 0 auto; }
  .sc-del:hover { color: var(--color-error); }
  .sc-toggle { position: relative; width: 36px; height: 20px; margin-right: 4px; flex: 0 0 auto; border-radius: var(--radius-pill);
    border: 1px solid var(--border-strong); background: var(--bg-elevated); padding: 0; cursor: pointer;
    transition: background-color var(--duration-fast), border-color var(--duration-fast); }
  .sc-toggle__knob { position: absolute; top: 50%; left: 2px; width: 14px; height: 14px; border-radius: 50%;
    background: var(--fg-subtle); transform: translateY(-50%); transition: left var(--duration-fast), background-color var(--duration-fast); }
  .sc-toggle.on { background: var(--accent-teal-dim); border-color: var(--accent-teal-line); }
  .sc-toggle.on .sc-toggle__knob { left: 18px; background: var(--accent-teal); }
  .sc-toggle:disabled { opacity: .6; cursor: progress; }
  /* Táctil: el interruptor ocupa 44 px de alto de zona de toque sin crecer a la vista. */
  @media (pointer: coarse) {
    .sc-toggle::after { content: ''; position: absolute; inset: -12px -6px; }
  }
  /* Móvil: logo | datos | precio arriba y las acciones bajo el precio. */
  @media (max-width: 479px) {
    .sc-row { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; column-gap: 12px; row-gap: 4px; align-items: start; }
    .sc-row > :global(.brandlogo) { grid-row: 1 / 3; margin-top: 2px; }
    .sc-main { grid-column: 2; grid-row: 1 / 3; }
    .sc-price { grid-column: 3; grid-row: 1; }
    .sc-acts { grid-column: 3; grid-row: 2; justify-self: end; }
  }
</style>
