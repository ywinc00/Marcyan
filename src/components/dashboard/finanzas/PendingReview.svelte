<script>
  // Movimientos importados por revisar (pestaña Movimientos). Lo importado no
  // cuenta en los libros hasta aceptarlo, y el mes no se cierra con pendientes.
  // Cada fila trae su sugerencia: el cobro de una factura, el cargo de una
  // suscripción o la categoría de siempre de ese proveedor.
  import Icon from '../ui/Icon.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { toast } from '../lib/toast.svelte.js';
  import { fmtDay } from '../lib/dates.js';
  import { formatUsd, EXPENSE_CATEGORIES } from './fin.js';

  let { onchanged, onimport } = $props();

  let pending = $state(null);
  let error = $state('');
  let busyId = $state('');
  let rowError = $state({});
  let cats = $state({});        // categoría elegida por fila de gasto
  let incCat = $state({});      // categoría elegida por fila de ingreso

  export async function load() {
    error = '';
    try {
      pending = (await api('/api/admin/finance/import')).pending;
      for (const e of pending.expenses) if (!(e.id in cats)) cats[e.id] = e.category || '';
      for (const n of pending.income) if (!(n.id in incCat)) incCat[n.id] = 'servicios';
    } catch (e) { if (!isSessionError(e)) error = errorMessage(e, 'No se pudo cargar lo que falta por revisar.'); }
  }
  $effect(() => { load(); });

  const count = $derived(pending ? pending.expenses.length + pending.income.length : 0);

  async function decide(kind, row, decision, extra = {}, done = '') {
    busyId = kind + row.id; rowError = { ...rowError, [kind + row.id]: '' };
    try {
      await api('/api/admin/finance/import', { method: 'POST', body: { action: kind, id: String(row.id), decision, ...extra } });
      const list = kind === 'expense' ? pending.expenses : pending.income;
      list.splice(list.indexOf(row), 1);
      if (done) toast(done);
      onchanged?.();
    } catch (e) {
      if (!isSessionError(e)) rowError = { ...rowError, [kind + row.id]: errorMessage(e, 'No se pudo guardar.') };
    } finally { busyId = ''; }
  }
</script>

<section class="pr" aria-labelledby="pr-t">
  <header class="pr-head">
    <div>
      <h3 id="pr-t">Por revisar{#if count}<span class="pr-n">{count}</span>{/if}</h3>
      <p>Lo importado del banco, la tarjeta, Stripe, PayPal o Revolut no cuenta hasta que lo aceptes.</p>
    </div>
    <button type="button" class="b" onclick={() => onimport?.()}><Icon name="upload" size={16} />Importar extracto</button>
  </header>

  {#if error}
    <ErrorState compact title="No se pudo cargar" message={error} onretry={load} />
  {:else}
    <LoadingState loading={!pending} rows={3} height={64} gap={1} label="Cargando lo que falta por revisar">
      {#if pending}
        {#if !count}
          <EmptyState compact title="Nada por revisar" text="Importa el extracto del mes del banco, la tarjeta, Stripe o PayPal y aquí aparecerá lo que haya que aceptar." />
        {:else}
          <ul class="pr-list">
            {#each pending.income as n (n.id)}
              {@const busy = busyId === 'income' + n.id}
              <li class="pr-row">
                <div class="pr-main">
                  <span class="pr-date">{fmtDay(n.received_at)}<span>{n.account_name || 'Sin cuenta'}</span></span>
                  <span class="pr-desc">{n.label}</span>
                  <span class="pr-amt pos">+{formatUsd(n.amount_cents)}</span>
                </div>
                <div class="pr-acts">
                  {#if n.payment_matches && n.payment_matches.length}
                    {@const p = n.payment_matches[0]}
                    <span class="pr-hint">Parece el cobro de la factura {p.invoice_number}{p.client ? ` (${p.client})` : ''}, ya apuntado.</span>
                    <button type="button" class="b b--mini" disabled={busy} onclick={() => decide('income', n, 'payment', { payment_id: String(p.id) }, 'Cobro confirmado; la línea del extracto no se cuenta dos veces')}>Es ese cobro</button>
                  {:else if /stripe|paypal|transfer|traspaso/i.test(n.label)}
                    <span class="pr-hint">Parece dinero que pasa de una cuenta tuya a otra, no un ingreso.</span>
                  {/if}
                  <label class="pr-sel"><span class="sr-only">Tipo de ingreso</span>
                    <select class="ui-input" bind:value={incCat[n.id]} disabled={busy}>
                      <option value="servicios">Ingreso de clientes sin factura</option>
                      <option value="otros">Otro ingreso del negocio</option>
                      <option value="intereses">Intereses del banco</option>
                    </select>
                  </label>
                  <button type="button" class="b b--mini" disabled={busy} onclick={() => decide('income', n, 'accept', { category: incCat[n.id] }, 'Ingreso aceptado')}>Aceptar</button>
                  <button type="button" class="b b--ghost b--mini" disabled={busy} onclick={() => decide('income', n, 'ignore', {}, 'Descartado: no cuenta como ingreso')}>No es ingreso</button>
                </div>
                {#if rowError['income' + n.id]}<p class="pr-err" role="status">{rowError['income' + n.id]}</p>{/if}
              </li>
            {/each}
            {#each pending.expenses as e (e.id)}
              {@const busy = busyId === 'expense' + e.id}
              <li class="pr-row">
                <div class="pr-main">
                  <span class="pr-date">{fmtDay(e.spent_at)}<span>{e.account_name || 'Sin cuenta'}</span></span>
                  <span class="pr-desc">{e.label}</span>
                  <span class="pr-amt">−{formatUsd(e.amount_cents)}</span>
                </div>
                <div class="pr-acts">
                  {#if e.subscription_matches && e.subscription_matches.length}
                    {@const s = e.subscription_matches[0]}
                    <span class="pr-hint">Parece el cargo de la suscripción {s.name}.</span>
                    <button type="button" class="b b--mini" disabled={busy} onclick={() => decide('expense', e, 'subscription', { subscription_id: String(s.subscription_id) }, 'Cargo de la suscripción confirmado')}>Es ese cargo</button>
                  {:else if /payment|thank you|autopay|pago tarjeta/i.test(e.label)}
                    <span class="pr-hint">Parece el pago de la tarjeta: si importas la tarjeta, sus gastos ya están ahí.</span>
                  {/if}
                  <label class="pr-sel"><span class="sr-only">Categoría</span>
                    <select class="ui-input" bind:value={cats[e.id]} disabled={busy}>
                      <option value="">Elige categoría</option>
                      {#each EXPENSE_CATEGORIES as c (c.id)}<option value={c.id}>{c.label}</option>{/each}
                    </select>
                  </label>
                  <button type="button" class="b b--mini" disabled={busy || !cats[e.id]} onclick={() => decide('expense', e, 'accept', { category: cats[e.id] }, 'Gasto aceptado')}>Aceptar</button>
                  <button type="button" class="b b--ghost b--mini" disabled={busy} onclick={() => decide('expense', e, 'ignore', {}, 'Descartado: no cuenta como gasto')}>No es gasto</button>
                </div>
                {#if rowError['expense' + e.id]}<p class="pr-err" role="status">{rowError['expense' + e.id]}</p>{/if}
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    </LoadingState>
  {/if}
</section>

<style>
  .pr { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; container-type: inline-size; }
  .pr-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 18px 20px; border-bottom: 1px solid var(--border); }
  .pr-head h3 { margin: 0; font-size: 17px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .pr-head p { margin: 4px 0 0; color: var(--fg-subtle); font-size: var(--dash-small); max-width: 60ch; }
  .pr-n { font-size: var(--dash-caption); font-weight: 500; color: var(--fg-secondary); background: var(--surface-3); border-radius: var(--radius-pill); padding: 1px 8px; }
  .pr-list { list-style: none; margin: 0; padding: 0; }
  .pr-row { padding: 12px 20px; border-top: 1px solid var(--border-subtle); }
  .pr-row:first-child { border-top: 0; }
  .pr-main { display: grid; grid-template-columns: 120px minmax(0, 1fr) auto; gap: 12px; align-items: baseline; font-variant-numeric: tabular-nums; }
  .pr-date { color: var(--fg-secondary); font-size: var(--dash-small); }
  .pr-date span { display: block; color: var(--fg-subtle); font-size: var(--dash-caption); }
  .pr-desc { color: var(--fg-primary); overflow-wrap: anywhere; }
  .pr-amt { color: var(--fg-primary); white-space: nowrap; }
  .pos { color: var(--accent-teal); }
  .pr-acts { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 10px 0 0 132px; }
  .pr-hint { flex-basis: 100%; color: var(--fg-secondary); font-size: var(--dash-small); }
  .pr-sel .ui-input { min-height: 32px; padding-block: 4px; font-size: var(--dash-small); }
  .pr-err { margin: 8px 0 0 132px; color: var(--color-error); font-size: var(--dash-small); }
  @container (max-width: 560px) {
    .pr-main { grid-template-columns: minmax(0, 1fr) auto; }
    .pr-date { grid-column: 1 / -1; }
    .pr-acts, .pr-err { margin-left: 0; }
    .pr-sel { flex: 1 1 100%; }
    .pr-sel .ui-input { width: 100%; }
  }
  @media (pointer: coarse) { .pr-acts .b, .pr-sel .ui-input { min-height: 44px; } }
</style>
