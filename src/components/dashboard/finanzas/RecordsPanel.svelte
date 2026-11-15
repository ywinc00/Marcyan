<script>
  // Registros de los libros (pestaña Registros): cuentas, contratistas,
  // devoluciones, ingresos sin factura, pagos de impuestos ya hechos y millaje.
  // Una lista y un formulario por tipo, con la misma pieza. Nunca se piden
  // números de cuenta ni números fiscales: solo nombres y estados.
  import Modal from '../ui/Modal.svelte';
  import Field from '../ui/Field.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import Icon from '../ui/Icon.svelte';
  import MoneyInput from './MoneyInput.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { toast } from '../lib/toast.svelte.js';
  import { fmtDay, todayISO } from '../lib/dates.js';
  import { formatUsd, fmtUsd0 } from './fin.js';
  import { loadAccounts } from './books.js';

  let { kind, year = new Date().getFullYear(), onchanged, openNew = $bindable(false) } = $props();

  const KIND_LABEL = { bank: 'Banco', stripe: 'Stripe', paypal: 'PayPal', revolut: 'Revolut', card: 'Tarjeta', cash: 'Efectivo', other: 'Otra' };
  const W9 = { missing: 'Falta W-9', on_file: 'W-9 guardado', not_required: 'No hace falta' };
  const ENTITY = { individual: 'Persona', llc: 'LLC', partnership: 'Sociedad', corporation: 'Corporación', unknown: 'Tipo sin indicar' };
  const INCOME_CAT = { servicios: 'De clientes, sin factura', otros: 'Otro ingreso del negocio', intereses: 'Intereses del banco' };

  // Qué enseña y qué pide cada tipo.
  const CONF = {
    accounts: { title: 'Cuentas', text: 'Por dónde entra y sale el dinero. Solo el nombre: nunca números de cuenta.', add: 'Nueva cuenta', empty: 'Aún no hay cuentas.', byYear: false,
      fields: [{ k: 'name', label: 'Nombre', type: 'text', req: true, ph: 'Banco (Zelle y transferencias)' }, { k: 'kind', label: 'Tipo', type: 'select', opts: KIND_LABEL }] },
    vendors: { title: 'Proveedores y contratistas', text: 'A quién pagas. Los contratistas a los que pagas $2,000 o más por banco o efectivo necesitan 1099 y su W-9 (no guardes aquí su número fiscal).', add: 'Nuevo proveedor', empty: 'Aún no hay proveedores.', byYear: false,
      fields: [{ k: 'name', label: 'Nombre', type: 'text', req: true, ph: 'Ana López' }, { k: 'is_contractor', label: 'Es contratista (le pagas por un trabajo)', type: 'check' },
        { k: 'entity_type', label: 'Es', type: 'select', opts: ENTITY }, { k: 'w9_status', label: 'W-9', type: 'select', opts: W9 }, { k: 'email', label: 'Correo', type: 'text', ph: 'ana@ejemplo.com' }] },
    refunds: { title: 'Devoluciones a clientes', text: 'Dinero que devolviste. Resta de los ingresos (línea 2) y permite anular la factura.', add: 'Nueva devolución', empty: 'Ninguna devolución este año.', byYear: true,
      fields: [{ k: 'invoice_id', label: 'Factura', type: 'invoice', req: true }, { k: 'amount_cents', label: 'Importe devuelto (USD)', type: 'money', req: true },
        { k: 'refunded_at', label: 'Fecha', type: 'date', req: true }, { k: 'account_id', label: 'Desde la cuenta', type: 'account' }, { k: 'reason', label: 'Motivo', type: 'text', ph: 'Proyecto cancelado' }] },
    income: { title: 'Ingresos sin factura', text: 'Cobros sueltos e intereses del banco. Los intereses van al Schedule B; el resto al C.', add: 'Nuevo ingreso', empty: 'Ningún ingreso sin factura este año.', byYear: true,
      fields: [{ k: 'label', label: 'De dónde viene', type: 'text', req: true, ph: 'Intereses de la cuenta' }, { k: 'category', label: 'Tipo', type: 'select', opts: INCOME_CAT },
        { k: 'amount_cents', label: 'Importe (USD)', type: 'money', req: true }, { k: 'received_at', label: 'Fecha', type: 'date', req: true }, { k: 'account_id', label: 'En la cuenta', type: 'account' }] },
    'tax-payments': { title: 'Pagos de impuestos ya hechos', text: 'Los trimestrales que ya pagaste. Se restan en la hoja del trimestral.', add: 'Nuevo pago', empty: 'Ningún pago apuntado este año.', byYear: true,
      fields: [{ k: 'tax_year', label: 'Año fiscal', type: 'number', req: true }, { k: 'quarter', label: 'Trimestre', type: 'select', opts: { '': 'Sin trimestre', 1: '1', 2: '2', 3: '3', 4: '4' } },
        { k: 'amount_cents', label: 'Importe (USD)', type: 'money', req: true }, { k: 'paid_at', label: 'Pagado el', type: 'date', req: true }, { k: 'jurisdiction', label: 'A', type: 'select', opts: { federal: 'IRS (federal)', state: 'Estado' } }] },
    mileage: { title: 'Millaje', text: 'Viajes en coche por trabajo. Sin el motivo de negocio no se puede deducir.', add: 'Nuevo viaje', empty: 'Ningún viaje apuntado este año.', byYear: true,
      fields: [{ k: 'trip_date', label: 'Fecha', type: 'date', req: true }, { k: 'destination', label: 'A dónde', type: 'text', ph: 'Oficina del cliente, Katy' },
        { k: 'purpose', label: 'Motivo de negocio', type: 'text', req: true, ph: 'Reunión con Taller Acme' }, { k: 'miles', label: 'Millas (ida y vuelta)', type: 'number', req: true }] },
  };
  const conf = $derived(CONF[kind]);

  let rows = $state(null);
  let error = $state('');
  let accounts = $state([]);
  let invoices = $state([]);

  async function load() {
    error = ''; rows = null;
    try { rows = (await api(`/api/admin/finance/records?kind=${kind}${conf.byYear ? `&year=${year}` : ''}`)).rows || []; }
    catch (e) { if (!isSessionError(e)) error = errorMessage(e, 'No se pudo cargar.'); }
  }
  $effect(() => { kind; year; load(); });

  // ── Formulario ──
  let formOpen = $state(false);
  let form = $state({});
  let cents = $state(null);
  let money = $state('');
  let saving = $state(false);
  let formError = $state('');
  let tried = $state(false);

  function blank() {
    const f = {};
    for (const fl of conf.fields) {
      if (fl.type === 'date') f[fl.k] = todayISO();
      else if (fl.type === 'check') f[fl.k] = kind === 'vendors';
      else if (fl.type === 'select') f[fl.k] = Object.keys(fl.opts)[0];
      else if (fl.k === 'tax_year') f[fl.k] = String(year);
      else f[fl.k] = '';
    }
    if (kind === 'vendors') { f.w9_status = 'missing'; f.entity_type = 'individual'; }
    if (kind === 'tax-payments') f.quarter = '';
    return f;
  }
  function openForm() {
    form = blank(); money = ''; cents = null; formError = ''; tried = false; formOpen = true;
    loadAccounts().then((a) => { accounts = a.filter((x) => x.active !== false); }).catch(() => {});
    if (conf.fields.some((f) => f.type === 'invoice')) {
      api('/api/admin/invoices?limit=100').then((j) => {
        invoices = (j.rows || []).filter((i) => Number(i.amount_cents) - Number(i.balance_cents) > 0);
      }).catch(() => { invoices = []; });
    }
  }
  $effect(() => { if (openNew) { openNew = false; openForm(); } });

  async function submit(e) {
    e?.preventDefault();
    tried = true; formError = '';
    for (const fl of conf.fields) {
      if (!fl.req) continue;
      if (fl.type === 'money' ? cents == null : !String(form[fl.k] ?? '').trim()) { formError = `Falta: ${fl.label.toLowerCase()}.`; return; }
    }
    const body = { ...form };
    if (conf.fields.some((f) => f.type === 'money')) body.amount_cents = cents;
    saving = true;
    try {
      await api(`/api/admin/finance/records?kind=${kind}`, { method: 'POST', body });
      toast('Guardado');
      formOpen = false;
      load(); onchanged?.();
    } catch (err) { if (!isSessionError(err)) formError = errorMessage(err, 'No se pudo guardar.'); }
    finally { saving = false; }
  }

  // ── Cambios en la fila ──
  async function patch(row, fields, done) {
    try {
      await api(`/api/admin/finance/records?kind=${kind}&id=${encodeURIComponent(row.id)}`, { method: 'PATCH', body: fields });
      Object.assign(row, fields); if (done) toast(done); onchanged?.();
    } catch (e) { if (!isSessionError(e)) toast(errorMessage(e, 'No se pudo guardar.'), { tone: 'error' }); }
  }
  let toDelete = $state(null);
  let deleting = $state(false);
  async function remove() {
    deleting = true;
    try {
      await api(`/api/admin/finance/records?kind=${kind}&id=${encodeURIComponent(toDelete.id)}`, { method: 'DELETE' });
      rows = rows.filter((r) => r !== toDelete); toDelete = null; toast('Borrado'); onchanged?.();
    } catch (e) { if (!isSessionError(e)) toast(errorMessage(e, 'No se pudo borrar.'), { tone: 'error' }); }
    finally { deleting = false; }
  }
  const canDelete = $derived(kind !== 'accounts');
  const accName = (id) => (accounts.find((a) => String(a.id) === String(id)) || {}).name || '';
  $effect(() => { if (rows && rows.some((r) => r.account_id)) loadAccounts().then((a) => { accounts = a; }).catch(() => {}); });
</script>

<section class="rp" aria-labelledby={`rp-${kind}`}>
  <header class="rp-head">
    <div><h3 id={`rp-${kind}`}>{conf.title}</h3><p>{conf.text}</p></div>
    <button type="button" class="b" onclick={openForm}><Icon name="plus" size={16} />{conf.add}</button>
  </header>
  {#if error}
    <ErrorState compact title="No se pudo cargar" message={error} onretry={load} />
  {:else}
    <LoadingState loading={!rows} rows={3} height={52} gap={1} label="Cargando">
      {#if rows}
        {#if !rows.length}
          <EmptyState compact title={conf.empty} text="" />
        {:else}
          <ul class="rp-list num">
            {#each rows as r (r.id)}
              <li class="rp-row">
                {#if kind === 'accounts'}
                  <span class="rp-main">{r.name}<span class="rp-sub">{KIND_LABEL[r.kind] || 'Otra'}</span></span>
                  {#if r.active === false}<StatusChip tone="neutral" label="Sin usar" />{/if}
                  <button type="button" class="b b--ghost b--mini" onclick={() => patch(r, { active: r.active === false }, r.active === false ? 'Cuenta activa' : 'Cuenta sin usar')}>{r.active === false ? 'Volver a usar' : 'Dejar de usar'}</button>
                {:else if kind === 'vendors'}
                  <span class="rp-main">{r.name}<span class="rp-sub">{r.is_contractor ? 'Contratista' : 'Proveedor'} · {ENTITY[r.entity_type] || 'Tipo sin indicar'}{r.year_cents ? ` · ${fmtUsd0(r.year_cents)} este año` : ''}</span></span>
                  {#if r.is_contractor}
                    <label class="rp-sel"><span class="sr-only">W-9 de {r.name}</span>
                      <select class="ui-input" value={r.w9_status} onchange={(e) => patch(r, { w9_status: e.currentTarget.value }, 'W-9 actualizado')}>
                        {#each Object.entries(W9) as [k, v] (k)}<option value={k}>{v}</option>{/each}
                      </select>
                    </label>
                  {/if}
                {:else if kind === 'refunds'}
                  <span class="rp-main">{r.invoice_number || 'Sin factura'}<span class="rp-sub">{fmtDay(r.refunded_at)}{r.reason ? ` · ${r.reason}` : ''}</span></span>
                  <span class="rp-amt">−{formatUsd(r.amount_cents)}</span>
                {:else if kind === 'income'}
                  <span class="rp-main">{r.label}<span class="rp-sub">{fmtDay(r.received_at)} · {INCOME_CAT[r.category] || r.category}{accName(r.account_id) ? ` · ${accName(r.account_id)}` : ''}</span></span>
                  <span class="rp-amt">{formatUsd(r.amount_cents)}</span>
                {:else if kind === 'tax-payments'}
                  <span class="rp-main">{r.jurisdiction === 'state' ? 'Estado' : 'IRS'}{r.quarter ? `, trimestre ${r.quarter}` : ''} de {r.tax_year}<span class="rp-sub">Pagado el {fmtDay(r.paid_at)}</span></span>
                  <span class="rp-amt">{formatUsd(r.amount_cents)}</span>
                {:else if kind === 'mileage'}
                  <span class="rp-main">{r.purpose}<span class="rp-sub">{fmtDay(r.trip_date)}{r.destination ? ` · ${r.destination}` : ''}</span></span>
                  <span class="rp-amt">{Number(r.miles).toLocaleString('en-US')} mi</span>
                {/if}
                {#if canDelete}<button type="button" class="ui-icon-btn rp-del" aria-label="Borrar" onclick={() => (toDelete = r)}><Icon name="trash" size={16} /></button>{/if}
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    </LoadingState>
  {/if}
</section>

<Modal bind:open={formOpen} title={conf.add}>
  <form class="rp-form" id={`rp-form-${kind}`} onsubmit={submit} novalidate>
    {#each conf.fields as fl (fl.k)}
      {#if fl.type === 'money'}
        <MoneyInput label={fl.label} bind:value={money} bind:cents showErrors={tried} />
      {:else if fl.type === 'check'}
        <label class="rp-chk"><input type="checkbox" bind:checked={form[fl.k]} />{fl.label}</label>
      {:else}
        <Field label={fl.label} required={fl.req}>
          {#snippet children(f)}
            {#if fl.type === 'select'}
              <select class="ui-input" id={f.id} bind:value={form[fl.k]}>{#each Object.entries(fl.opts) as [k, v] (k)}<option value={k}>{v}</option>{/each}</select>
            {:else if fl.type === 'account'}
              <select class="ui-input" id={f.id} bind:value={form[fl.k]}><option value="">Sin decir</option>{#each accounts as a (a.id)}<option value={String(a.id)}>{a.name}</option>{/each}</select>
            {:else if fl.type === 'invoice'}
              <select class="ui-input" id={f.id} bind:value={form[fl.k]}><option value="">Elige la factura</option>{#each invoices as i (i.id)}<option value={String(i.id)}>{i.invoice_number} · {i.client_name || ''} · cobrado {formatUsd(Number(i.amount_cents) - Number(i.balance_cents))}</option>{/each}</select>
            {:else if fl.type === 'date'}
              <input class="ui-input" id={f.id} type="date" bind:value={form[fl.k]} />
            {:else if fl.type === 'number'}
              <input class="ui-input" id={f.id} type="number" inputmode="decimal" min="0" step="any" bind:value={form[fl.k]} />
            {:else}
              <input class="ui-input" id={f.id} type="text" maxlength="200" placeholder={fl.ph || ''} bind:value={form[fl.k]} />
            {/if}
          {/snippet}
        </Field>
      {/if}
    {/each}
    {#if formError}<p class="rp-err" role="status">{formError}</p>{/if}
  </form>
  {#snippet footer()}
    <button type="button" class="b" onclick={() => (formOpen = false)} disabled={saving}>Cancelar</button>
    <button type="submit" form={`rp-form-${kind}`} class="b b--primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
  {/snippet}
</Modal>

<ConfirmDialog open={!!toDelete} title="Borrar" confirmLabel="Borrar" busy={deleting}
  message="Se borra este registro. Si es de un mes cerrado, primero hay que reabrir el mes."
  onconfirm={remove} oncancel={() => (toDelete = null)} />

<style>
  .rp { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; container-type: inline-size; }
  .rp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 18px 20px; border-bottom: 1px solid var(--border); }
  .rp-head h3 { margin: 0; font-size: 17px; font-weight: 600; }
  .rp-head p { margin: 4px 0 0; color: var(--fg-subtle); font-size: var(--dash-small); max-width: 62ch; }
  .rp-list { list-style: none; margin: 0; padding: 0; }
  .rp-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 20px; min-height: 56px; border-top: 1px solid var(--border-subtle); }
  .rp-row:first-child { border-top: 0; }
  .rp-main { flex: 1 1 220px; min-width: 0; color: var(--fg-primary); overflow-wrap: anywhere; }
  .rp-sub { display: block; color: var(--fg-subtle); font-size: var(--dash-small); }
  .rp-amt { color: var(--fg-primary); white-space: nowrap; }
  .rp-sel .ui-input { min-height: 32px; padding-block: 4px; font-size: var(--dash-small); }
  .rp-del { color: var(--fg-subtle); }
  .rp-form { display: flex; flex-direction: column; gap: 14px; }
  .rp-chk { display: flex; gap: 8px; align-items: center; color: var(--fg-primary); }
  .rp-err { margin: 0; color: var(--color-error); font-size: var(--dash-small); }
  .num { font-variant-numeric: tabular-nums; }
  @media (pointer: coarse) { .rp-sel .ui-input, .rp-row .b { min-height: 44px; } }
</style>
