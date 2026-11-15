<script>
  // Importar un extracto en CSV (banco, tarjeta, Stripe, PayPal, Revolut).
  // Se lee en el navegador con las reglas de lib/finance-import-rules.mjs (las
  // mismas que vuelve a aplicar el servidor), se enseña qué columna es cada
  // cosa y una muestra, y lo importado queda pendiente de revisar.
  import Modal from '../ui/Modal.svelte';
  import Field from '../ui/Field.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { toast } from '../lib/toast.svelte.js';
  import { fmtDay } from '../lib/dates.js';
  import { formatUsd } from './fin.js';
  import { loadAccounts } from './books.js';
  import {
    parseCsv, detectPreset, guessMapping, normalizeRows, IMPORT_PRESETS, IMPORT_MAX_ROWS,
  } from '../../../../lib/finance-import-rules.mjs';

  let { open = $bindable(false), ondone } = $props();

  let accounts = $state([]);
  let accountId = $state('');
  let fileName = $state('');
  let headers = $state([]);
  let dataRows = $state([]);
  let mapping = $state(null);
  let readError = $state('');
  let saving = $state(false);
  let saveError = $state('');

  $effect(() => {
    if (!open) return;
    fileName = ''; headers = []; dataRows = []; mapping = null; readError = ''; saveError = '';
    loadAccounts().then((a) => { accounts = a.filter((x) => x.active !== false); }).catch(() => { accounts = []; });
  });

  const KIND_FOR_PRESET = { stripe: 'stripe', paypal: 'paypal', revolut: 'revolut' };

  async function onFile(e) {
    const f = e.currentTarget.files && e.currentTarget.files[0];
    readError = ''; mapping = null; headers = []; dataRows = [];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { readError = 'El archivo pesa más de 5 MB: descarga el extracto por meses.'; return; }
    fileName = f.name;
    try {
      const rows = parseCsv(await f.text());
      if (rows.length < 2) { readError = 'El archivo no tiene movimientos.'; return; }
      headers = rows[0].map((h) => String(h).trim());
      dataRows = rows.slice(1);
      const preset = detectPreset(headers);
      mapping = guessMapping(headers, preset);
      // La cuenta se propone por el formato (Stripe → la cuenta de Stripe…).
      const kind = KIND_FOR_PRESET[preset];
      const acc = kind && accounts.find((a) => a.kind === kind);
      if (acc && !accountId) accountId = String(acc.id);
    } catch {
      readError = 'No se pudo leer el archivo. Tiene que ser un CSV.';
    }
  }

  const result = $derived(mapping && dataRows.length ? normalizeRows(dataRows, mapping) : null);
  const outCount = $derived(result ? result.rows.filter((r) => r.amount_cents < 0).length : 0);
  const inCount = $derived(result ? result.rows.filter((r) => r.amount_cents > 0).length : 0);
  const skippedTotal = $derived(result ? Object.values(result.skipped).reduce((a, n) => a + n, 0) : 0);
  const hasAmount = $derived(mapping && (mapping.amount >= 0 || mapping.debit >= 0 || mapping.credit >= 0));

  function setPreset(p) { mapping = guessMapping(headers, p); }
  function colSelect(key) { return mapping ? mapping[key] : -1; }
  function setCol(key, v) { mapping = { ...mapping, [key]: Number(v) }; }

  async function submit() {
    saveError = '';
    if (!accountId) { saveError = 'Elige de qué cuenta es el extracto.'; return; }
    if (!result || !result.rows.length) { saveError = 'No hay movimientos válidos que importar. Revisa las columnas.'; return; }
    saving = true;
    try {
      const j = await api('/api/admin/finance/import', {
        method: 'POST', timeout: 60000,
        body: { action: 'import', account_id: accountId, filename: fileName, rows: result.rows },
      });
      const r = j.result;
      const nuevos = r.created_expenses + r.created_income;
      toast(nuevos ? `${nuevos} movimiento${nuevos === 1 ? '' : 's'} nuevo${nuevos === 1 ? '' : 's'} por revisar${r.existing ? `; ${r.existing} ya estaban` : ''}` : 'Nada nuevo: esos movimientos ya estaban importados');
      open = false;
      ondone?.(r);
    } catch (e) {
      if (!isSessionError(e)) saveError = errorMessage(e, 'No se pudo importar el extracto.');
    } finally { saving = false; }
  }

  const COLS = [
    { key: 'date', label: 'Fecha' },
    { key: 'description', label: 'Concepto' },
    { key: 'amount', label: 'Importe (con signo)' },
    { key: 'debit', label: 'Cargo (si va en otra columna)' },
    { key: 'credit', label: 'Abono (si va en otra columna)' },
    { key: 'fee', label: 'Comisión (Stripe, PayPal)' },
  ];
</script>

<Modal bind:open title="Importar extracto" size="lg">
  <div class="imp">
    <div class="imp-grid">
      <Field label="Cuenta" required>
        {#snippet children(f)}
          <select class="ui-input" id={f.id} bind:value={accountId}>
            <option value="">Elige la cuenta</option>
            {#each accounts as a (a.id)}<option value={String(a.id)}>{a.name}</option>{/each}
          </select>
        {/snippet}
      </Field>
      <Field label="Archivo CSV" required hint="Descárgalo desde tu banco, Stripe, PayPal o Revolut." error={readError}>
        {#snippet children(f)}<input class="ui-input imp-file" id={f.id} type="file" accept=".csv,text/csv" aria-describedby={f.describedby} onchange={onFile} />{/snippet}
      </Field>
    </div>

    {#if mapping}
      <div class="imp-box">
        <div class="imp-row">
          <span class="imp-cap">Formato</span>
          <div class="imp-seg" role="group" aria-label="Formato del archivo">
            {#each Object.entries(IMPORT_PRESETS) as [id, p] (id)}
              <button type="button" aria-pressed={mapping.preset === id} onclick={() => setPreset(id)}>{p.label}</button>
            {/each}
          </div>
        </div>
        <div class="imp-cols">
          {#each COLS as c (c.key)}
            <label class="imp-col"><span>{c.label}</span>
              <select class="ui-input" value={colSelect(c.key)} onchange={(e) => setCol(c.key, e.currentTarget.value)}>
                <option value={-1}>Ninguna</option>
                {#each headers as h, i (i)}<option value={i}>{h || `Columna ${i + 1}`}</option>{/each}
              </select>
            </label>
          {/each}
          <label class="imp-col"><span>Fechas</span>
            <select class="ui-input" value={mapping.order} onchange={(e) => (mapping = { ...mapping, order: e.currentTarget.value })}>
              <option value="mdy">Mes/día/año (EE. UU.)</option>
              <option value="dmy">Día/mes/año</option>
            </select>
          </label>
        </div>
        <label class="imp-chk"><input type="checkbox" checked={mapping.invert} onchange={(e) => (mapping = { ...mapping, invert: e.currentTarget.checked })} />
          Los gastos salen en positivo (pasa en algunas tarjetas, como Amex): darles la vuelta</label>
      </div>

      {#if result}
        <p class="imp-sum num">
          {#if hasAmount}
            {result.rows.length} movimiento{result.rows.length === 1 ? '' : 's'}: {outCount} gasto{outCount === 1 ? '' : 's'} y {inCount} ingreso{inCount === 1 ? '' : 's'}.
            {#if skippedTotal}{' '}{skippedTotal === 1 ? 'Se salta 1' : `Se saltan ${skippedTotal}`}: {[result.skipped.status && `${result.skipped.status} pendiente${result.skipped.status === 1 ? '' : 's'} o fallido${result.skipped.status === 1 ? '' : 's'}`, result.skipped.currency && `${result.skipped.currency} en otra moneda`, result.skipped.zero && `${result.skipped.zero} en cero`, result.skipped.invalid && `${result.skipped.invalid} sin fecha, importe o concepto`].filter(Boolean).join(', ')}.{/if}
            {#if result.truncated} Solo entran los primeros {IMPORT_MAX_ROWS}: pártelo en meses.{/if}
          {:else}Elige la columna del importe.{/if}
        </p>
        {#if result.rows.length}
          <ul class="imp-prev num">
            {#each result.rows.slice(0, 8) as r, i (i)}
              <li><span class="imp-d">{fmtDay(r.date)}</span><span class="imp-t">{r.description}</span><span class:pos={r.amount_cents > 0}>{r.amount_cents > 0 ? '+' : '−'}{formatUsd(Math.abs(r.amount_cents))}</span></li>
            {/each}
          </ul>
        {/if}
      {/if}
    {/if}
    {#if saveError}<p class="imp-err" role="status">{saveError}</p>{/if}
  </div>
  {#snippet footer()}
    <button type="button" class="b" onclick={() => (open = false)} disabled={saving}>Cancelar</button>
    <button type="button" class="b b--primary" onclick={submit} disabled={saving || !result || !result.rows.length}>
      {saving ? 'Importando…' : result && result.rows.length ? `Importar ${result.rows.length}` : 'Importar'}
    </button>
  {/snippet}
</Modal>

<style>
  .imp { display: flex; flex-direction: column; gap: 14px; }
  .imp-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
  .imp-file { padding-block: 8px; height: auto; }
  .imp-box { border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 12px; background: var(--bg-elevated); }
  .imp-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
  .imp-cap { font: 500 var(--dash-caption)/1.2 var(--font-body); letter-spacing: 0; text-transform: none; font-family: var(--font-mono); color: var(--fg-subtle); }
  .imp-seg { display: inline-flex; flex-wrap: wrap; gap: 4px; }
  .imp-seg button { min-height: 32px; padding: 5px 11px; border-radius: var(--radius-pill); border: 1px solid var(--border); background: transparent; color: var(--fg-secondary); font: 500 var(--dash-small)/1.2 var(--font-body); cursor: pointer; }
  .imp-seg button[aria-pressed='true'] { background: var(--surface-3); border-color: var(--border-strong); color: var(--fg-primary); }
  .imp-seg button:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .imp-cols { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px 12px; }
  .imp-col { display: flex; flex-direction: column; gap: 4px; font-size: var(--dash-small); color: var(--fg-secondary); }
  .imp-chk { display: flex; gap: 8px; align-items: flex-start; font-size: var(--dash-small); color: var(--fg-secondary); }
  .imp-chk input { margin-top: 3px; }
  .imp-sum { margin: 0; color: var(--fg-secondary); font-size: var(--dash-small); }
  .imp-prev { list-style: none; margin: 0; padding: 0; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
  .imp-prev li { display: grid; grid-template-columns: 110px minmax(0, 1fr) auto; gap: 12px; padding: 8px 12px; border-top: 1px solid var(--border-subtle); font-size: var(--dash-small); }
  .imp-prev li:first-child { border-top: 0; }
  .imp-d { color: var(--fg-subtle); }
  .imp-t { overflow-wrap: anywhere; }
  .pos { color: var(--accent-teal); }
  .imp-err { margin: 0; color: var(--color-error); font-size: var(--dash-small); }
  .num { font-variant-numeric: tabular-nums; }
  @media (max-width: 559px) {
    .imp-grid { grid-template-columns: 1fr; }
    .imp-prev li { grid-template-columns: minmax(0, 1fr) auto; }
    .imp-d { grid-column: 1 / -1; }
  }
  @media (pointer: coarse) { .imp-seg button { min-height: 44px; } }
</style>
