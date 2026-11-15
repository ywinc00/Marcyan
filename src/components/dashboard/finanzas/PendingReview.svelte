<script>
  // Movimientos importados por revisar (pestaña Movimientos). Lo importado no
  // cuenta en los libros hasta aceptarlo, y el mes no se cierra con pendientes.
  // Cada fila trae UNA acción sugerida (el cobro de una factura, el cargo de una
  // suscripción, un traspaso o la categoría de siempre) y «Otra cosa» para
  // elegir a mano. Ordenadas por fecha, lo más reciente primero.
  import Icon from '../ui/Icon.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { toast } from '../lib/toast.svelte.js';
  import { fmtDay } from '../lib/dates.js';
  import { formatUsd, EXPENSE_CATEGORIES, categoryLabel } from './fin.js';

  let { onchanged, onimport } = $props();

  let pending = $state(null);
  let error = $state('');
  let busyId = $state('');
  let rowError = $state({});
  let cats = $state({});        // categoría elegida por fila de gasto
  let incCat = $state({});      // tipo elegido por fila de ingreso
  let manual = $state({});      // filas con «Otra cosa» abierto

  export async function load() {
    error = '';
    try {
      pending = (await api('/api/admin/finance/import')).pending;
      for (const e of pending.expenses) if (!(e.id in cats)) cats[e.id] = e.category || '';
      for (const n of pending.income) if (!(n.id in incCat)) incCat[n.id] = 'servicios';
    } catch (e) { if (!isSessionError(e)) error = errorMessage(e, 'No se pudo cargar lo que falta por revisar.'); }
  }
  $effect(() => { load(); });

  const shortAcc = (n) => String(n || '').replace(/\s*\(.*\)\s*$/, '') || 'Sin cuenta';
  const isTransfer = (s) => /stripe|paypal|transfer|traspaso|revolut/i.test(s);
  const isCardPayment = (s) => /payment|thank you|autopay|pago tarjeta|card pmt/i.test(s);

  // Una sola lista por fecha, con lo que se sugiere en cada fila.
  const rows = $derived.by(() => {
    if (!pending) return [];
    const inc = pending.income.map((n) => {
      const p = n.payment_matches && n.payment_matches[0];
      const suggest = p
        ? { label: 'Es ese cobro', text: `Parece el cobro de la factura ${p.invoice_number}${p.client ? ` (${p.client})` : ''}, que ya está apuntado.`, decision: 'payment', extra: { payment_id: String(p.id) }, done: 'Cobro confirmado; no se cuenta dos veces' }
        : isTransfer(n.label)
          ? { label: 'Es un traspaso', text: 'Parece dinero que pasa de una cuenta tuya a otra, no un ingreso.', decision: 'ignore', extra: {}, done: 'Traspaso: no cuenta como ingreso' }
          : null;
      return { kind: 'income', row: n, date: String(n.received_at).slice(0, 10), label: n.label, cents: n.amount_cents, acc: n.account_name, suggest };
    });
    const exp = pending.expenses.map((e) => {
      const s = e.subscription_matches && e.subscription_matches[0];
      const suggest = s
        ? { label: 'Es ese cargo', text: `Parece el cargo de la suscripción ${s.name}.`, decision: 'subscription', extra: { subscription_id: String(s.subscription_id) }, done: 'Cargo de la suscripción confirmado' }
        : isCardPayment(e.label)
          ? { label: 'Es el pago de la tarjeta', text: 'Parece el pago de la tarjeta desde el banco: si importas la tarjeta, sus gastos ya están ahí y esto no cuenta.', decision: 'ignore', extra: {}, done: 'Pago de la tarjeta: no cuenta como gasto' }
          : e.category
            ? { label: `Aceptar como ${categoryLabel(e.category).toLowerCase()}`, text: `${categoryLabel(e.category)}, como los gastos anteriores de este proveedor.`, decision: 'accept', extra: { category: e.category }, done: 'Gasto aceptado' }
            : null;
      return { kind: 'expense', row: e, date: String(e.spent_at).slice(0, 10), label: e.label, cents: -e.amount_cents, acc: e.account_name, suggest };
    });
    return [...inc, ...exp].sort((a, b) => b.date.localeCompare(a.date));
  });

  async function decide(r, decision, extra = {}, done = '') {
    const key = r.kind + r.row.id;
    busyId = key; rowError = { ...rowError, [key]: '' };
    try {
      await api('/api/admin/finance/import', { method: 'POST', body: { action: r.kind, id: String(r.row.id), decision, ...extra } });
      const list = r.kind === 'expense' ? pending.expenses : pending.income;
      list.splice(list.indexOf(r.row), 1);
      if (done) toast(done);
      onchanged?.();
    } catch (e) {
      if (!isSessionError(e)) rowError = { ...rowError, [key]: errorMessage(e, 'No se pudo guardar.') };
    } finally { busyId = ''; }
  }
</script>

<section class="pr" aria-labelledby="pr-t">
  <header class="pr-head">
    <div>
      <h3 id="pr-t">Por revisar{#if rows.length}<span class="pr-n">{rows.length}</span>{/if}</h3>
      <p>Lo importado del banco, la tarjeta, Stripe, PayPal o Revolut no cuenta hasta que lo aceptes.</p>
    </div>
    <button type="button" class="b" onclick={() => onimport?.()}><Icon name="upload" size={16} />Importar extracto</button>
  </header>

  {#if error}
    <ErrorState compact title="No se pudo cargar" message={error} onretry={load} />
  {:else}
    <LoadingState loading={!pending} rows={3} height={64} gap={1} label="Cargando lo que falta por revisar">
      {#if pending}
        {#if !rows.length}
          <EmptyState compact title="Nada por revisar" text="Importa el extracto del mes del banco, la tarjeta, Stripe o PayPal y aquí aparecerá lo que haya que aceptar." />
        {:else}
          <ul class="pr-list">
            {#each rows as r (r.kind + r.row.id)}
              {@const key = r.kind + r.row.id}
              {@const busy = busyId === key}
              {@const open = manual[key] || !r.suggest}
              <li class="pr-row">
                <div class="pr-main">
                  <span class="pr-date">{fmtDay(r.date)}<span>{shortAcc(r.acc)}</span></span>
                  <span class="pr-desc">{r.label}</span>
                  <span class="pr-amt" class:pos={r.cents > 0}>{r.cents > 0 ? '+' : '−'}{formatUsd(Math.abs(r.cents))}</span>
                </div>
                <div class="pr-acts">
                  {#if r.suggest}
                    <span class="pr-hint">{r.suggest.text}</span>
                    <button type="button" class="b b--mini" disabled={busy} onclick={() => decide(r, r.suggest.decision, r.suggest.extra, r.suggest.done)}>{r.suggest.label}</button>
                    {#if !manual[key]}<button type="button" class="b b--ghost b--mini" disabled={busy} onclick={() => (manual[key] = true)}>Otra cosa</button>{/if}
                  {/if}
                  {#if open}
                    <span class="pr-manual">
                      {#if r.kind === 'income'}
                        <label class="pr-sel"><span class="sr-only">Tipo de ingreso</span>
                          <select class="ui-input" bind:value={incCat[r.row.id]} disabled={busy}>
                            <option value="servicios">Ingreso de clientes sin factura</option>
                            <option value="otros">Otro ingreso del negocio</option>
                            <option value="intereses">Intereses del banco</option>
                          </select>
                        </label>
                        <button type="button" class="b b--mini" disabled={busy} onclick={() => decide(r, 'accept', { category: incCat[r.row.id] }, 'Ingreso aceptado')}>Aceptar</button>
                        <button type="button" class="b b--ghost b--mini" disabled={busy} onclick={() => decide(r, 'ignore', {}, 'Descartado: no cuenta como ingreso')}>No es ingreso</button>
                      {:else}
                        <label class="pr-sel"><span class="sr-only">Categoría</span>
                          <select class="ui-input" bind:value={cats[r.row.id]} disabled={busy}>
                            <option value="">Elige categoría</option>
                            {#each EXPENSE_CATEGORIES as c (c.id)}<option value={c.id}>{c.label}</option>{/each}
                          </select>
                        </label>
                        <button type="button" class="b b--mini" disabled={busy || !cats[r.row.id]} onclick={() => decide(r, 'accept', { category: cats[r.row.id] }, 'Gasto aceptado')}>Aceptar</button>
                        <button type="button" class="b b--ghost b--mini" disabled={busy} onclick={() => decide(r, 'ignore', {}, 'Descartado: no cuenta como gasto')}>No es gasto</button>
                      {/if}
                    </span>
                  {/if}
                </div>
                {#if rowError[key]}<p class="pr-err" role="status">{rowError[key]}</p>{/if}
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    </LoadingState>
  {/if}
</section>

<style>
  .pr { max-width: 1100px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; container-type: inline-size; }
  .pr-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 18px 20px; border-bottom: 1px solid var(--border); }
  .pr-head h3 { margin: 0; font-size: 17px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .pr-head p { margin: 4px 0 0; color: var(--fg-subtle); font-size: var(--dash-small); max-width: 60ch; }
  .pr-n { font-size: var(--dash-caption); font-weight: 500; color: var(--fg-secondary); background: var(--surface-3); border-radius: var(--radius-pill); padding: 1px 8px; }
  .pr-list { list-style: none; margin: 0; padding: 0; }
  .pr-row { padding: 12px 20px; border-top: 1px solid var(--border-subtle); }
  .pr-row:first-child { border-top: 0; }
  .pr-main { display: grid; grid-template-columns: 110px minmax(0, 1fr) auto; gap: 12px; align-items: baseline; font-variant-numeric: tabular-nums; }
  .pr-date { color: var(--fg-secondary); font-size: var(--dash-small); }
  .pr-date span { display: block; color: var(--fg-subtle); font-size: var(--dash-caption); }
  .pr-desc { color: var(--fg-primary); overflow-wrap: anywhere; }
  .pr-amt { color: var(--fg-primary); white-space: nowrap; }
  .pos { color: var(--accent-teal); }
  .pr-acts { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 8px 0 0 122px; }
  .pr-hint { flex-basis: 100%; color: var(--fg-secondary); font-size: var(--dash-small); }
  .pr-manual { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .pr-sel .ui-input { min-height: 32px; padding-block: 4px; font-size: var(--dash-small); }
  .pr-err { margin: 8px 0 0 122px; color: var(--color-error); font-size: var(--dash-small); }
  @container (max-width: 560px) {
    .pr-main { grid-template-columns: minmax(0, 1fr) auto; }
    .pr-date { grid-column: 1 / -1; }
    .pr-acts, .pr-err { margin-left: 0; }
    .pr-manual, .pr-sel { flex: 1 1 100%; }
    .pr-sel .ui-input { width: 100%; }
  }
  @media (pointer: coarse) { .pr-acts .b, .pr-sel .ui-input { min-height: 44px; } }
</style>
