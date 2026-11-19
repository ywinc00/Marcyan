<script>
  // Pestaña Impuestos (dirección C, elegida por el dueño 2026-11-14): la hoja
  // que se lleva al contador. Encima, la revisión (lo que falla, avisa o
  // conviene); en el centro, el Schedule C línea a línea, y cada línea se
  // abre en sus movimientos con la cuenta y el recibo; debajo, el trimestral
  // con sus supuestos, los 1099 y los plazos. Todo es material para el
  // contador: lo dice cada bloque. Datos: /api/admin/finance/books.
  import Icon from '../ui/Icon.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { route, setQuery, href } from '../lib/router.svelte.js';
  import { monthKey, fmtDay } from '../lib/dates.js';
  import { fmtUsd0, formatUsd, monthLong } from './fin.js';

  let { pendingCount = $bindable(0) } = $props();
  const thisYear = Number(monthKey().slice(0, 4));
  const year = $derived(Number(/^\d{4}$/.test(route.query.ano || '') ? route.query.ano : thisYear));
  const openLine = $derived(route.query.linea || '');

  let sc = $state(null);
  let tax = $state(null);
  let list1099 = $state(null);
  let book = $state(null);
  let error = $state('');
  let lineRows = $state(null);
  let lineError = $state('');

  // Nombre en llano de cada línea del Schedule C (2026: la 16 va partida).
  const LINES = {
    8: 'Publicidad', 9: 'Coche y millaje', 10: 'Comisiones de cobro (Stripe, PayPal)', 11: 'Contratistas', 13: 'Depreciación',
    15: 'Seguros', '16a': 'Intereses de hipoteca', '16b': 'Otros intereses', '16c': 'Intereses de préstamos', 17: 'Legal y contable',
    18: 'Oficina', '20a': 'Alquiler de vehículos y equipos', '20b': 'Alquiler de local', 21: 'Reparaciones', 22: 'Material',
    23: 'Impuestos y licencias', '24a': 'Viajes', '24b': 'Comidas de negocio, al 50 %', 25: 'Teléfono e internet', 26: 'Salarios',
    '27b': 'Otros gastos (parte V)',
  };
  const ORDER = ['8', '9', '10', '11', '13', '15', '16a', '16b', '16c', '17', '18', '20a', '20b', '21', '22', '23', '24a', '24b', '25', '26', '27b'];

  async function load() {
    error = ''; const y = year;
    try {
      const [a, b, c, d] = await Promise.all([
        api(`/api/admin/finance/books?view=schedule-c&year=${y}`),
        api(`/api/admin/finance/books?view=tax&year=${y}`).catch(() => null),
        api(`/api/admin/finance/books?view=1099&year=${y}`).catch(() => null),
        api(`/api/admin/finance/books?view=year&year=${y}`).catch(() => null),
      ]);
      if (y !== year) return;
      sc = a.summary; tax = b ? b.tax : null; list1099 = c ? c.list : null; book = d ? d.book : null;
    } catch (e) { if (!isSessionError(e)) error = errorMessage(e, 'No se pudo cargar la hoja de impuestos.'); }
  }
  $effect(() => { year; load(); });

  async function loadLine(l) {
    lineRows = null; lineError = '';
    try { const r = await api(`/api/admin/finance/books?view=line&year=${year}&line=${encodeURIComponent(l)}`); if (openLine === l) lineRows = r; }
    catch (e) { if (!isSessionError(e)) lineError = errorMessage(e, 'No se pudieron cargar los movimientos de esta línea.'); }
  }
  $effect(() => { if (openLine && !['1', '2'].includes(openLine)) loadLine(openLine); });

  const expenseLines = $derived(sc ? ORDER.filter((l) => sc.expenses_by_line[l]).map((l) => ({ line: l, cents: sc.expenses_by_line[l] })) : []);
  const gross = $derived(sc ? sc.line1_gross - sc.line2_returns : 0);
  const thisMonth = monthKey();
  const openMonths = $derived(book ? book.months.filter((m) => m.month < thisMonth && m.status !== 'closed') : []);
  const pendingImported = $derived(book && book.pending ? (book.pending.expenses || 0) + (book.pending.income || 0) : 0);
  $effect(() => { pendingCount = pendingImported; });
  const closedThrough = $derived(tax && tax.books_closed_through ? monthLong(tax.books_closed_through).split(' ')[0] : '');
  const w9 = $derived(list1099 ? list1099.rows.filter((r) => r.needs_1099) : []);
  const w9Missing = $derived(w9.filter((r) => r.w9_status === 'missing'));
  const est = $derived(tax && tax.estimate && tax.estimate.ok ? tax.estimate : null);
  const today = monthKey() + '-01';
  const upcoming = $derived(tax ? (tax.calendar || []).filter((c) => c.date >= today).slice(0, 4) : []);
  const usd = (n) => fmtUsd0(Math.round(Number(n || 0) * 100));
  const dayLong = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-US', { day: 'numeric', month: 'long', year: 'numeric' });

  function toggleLine(l) { setQuery({ linea: openLine === l ? '' : l }); }
  // «Banco (Zelle y transferencias)» → «Banco» en las filas (el nombre entero vive en Registros).
  const shortAcc = (n) => String(n || '').replace(/\s*\(.*\)\s*$/, '');
</script>

<div class="tx">
  {#if error}
    <ErrorState title="No se pudo cargar la hoja de impuestos" message={error} onretry={load} />
  {:else}
    <LoadingState loading={!sc} rows={10} height={52} head={60} gap={1} label="Cargando la hoja de impuestos">
      {#if sc}
        <!-- Revisión: lo que falla, lo que avisa y lo que conviene -->
        {#if openMonths.length || pendingImported || w9Missing.length || !sc.miles}
          <section class="tx-card tx-review" aria-label="Revisión">
            {#if openMonths.length}
              <div class="tx-row"><span class="tx-ic tx-ic--err"><Icon name="close" size={14} /></span>
                <span class="tx-txt">{openMonths.length === 1 ? `${monthLong(openMonths[0].month).split(' ')[0].replace(/^./, (c) => c.toUpperCase())} sigue abierto` : `${openMonths.length} meses siguen abiertos`}: sus cifras aún pueden cambiar.</span>
                <a class="b b--mini" href={href('finanzas', ['mes', openMonths[0].month], { ver: 'cierre' })}>Ir al cierre</a></div>
            {/if}
            {#if pendingImported}
              <div class="tx-row"><span class="tx-ic tx-ic--warn"><Icon name="alert" size={16} /></span>
                <span class="tx-txt">{pendingImported} movimiento{pendingImported === 1 ? '' : 's'} importado{pendingImported === 1 ? '' : 's'} sin revisar: no cuentan hasta que los aceptes.</span>
                <a class="b b--mini" href={href('finanzas', ['movimientos'], { ver: 'pendientes' })}>Revisar</a></div>
            {/if}
            {#each w9Missing as v (v.id)}
              <div class="tx-row"><span class="tx-ic tx-ic--warn"><Icon name="alert" size={16} /></span>
                <span class="tx-txt">Falta el W-9 de {v.name}, que necesita 1099.</span>
                <a class="b b--mini" href={href('finanzas', ['registros'], { ver: 'contratistas' })}>Ya lo tengo</a></div>
            {/each}
            {#if !sc.miles}
              <div class="tx-row"><span class="tx-ic tx-ic--info"><Icon name="car" size={16} /></span>
                <span class="tx-txt">No hay millaje apuntado. Si usas el coche para ver clientes, puede deducirse.</span>
                <a class="b b--mini" href={href('finanzas', ['registros'], { ver: 'millaje' })}>Apuntar</a></div>
            {/if}
          </section>
        {/if}

        <div class="tx-layout">
        <!-- Schedule C -->
        <section class="tx-card" aria-labelledby="tx-sc">
          <header class="tx-head">
            <h3 id="tx-sc">Schedule C de {year}</h3>
            <p>{closedThrough ? `Meses cerrados hasta ${closedThrough}` : 'Ningún mes cerrado todavía'}; lo abierto aún puede cambiar. Para revisión de tu contador, no es consejo fiscal.</p>
          </header>
          <table class="tx-t num">
            <caption class="sr-only">Schedule C de {year} por líneas</caption>
            <thead><tr><th scope="col" class="tx-l">Línea</th><th scope="col">Parte I, ingresos</th><th scope="col" class="r">Total</th><th scope="col"><span class="sr-only">Abrir</span></th></tr></thead>
            <tbody>
              <tr class="tx-line" class:is-open={openLine === '1'}>
                <td class="tx-l">1</td>
                <td><button type="button" class="tx-btn" aria-expanded={openLine === '1'} onclick={() => toggleLine('1')}>Ingresos brutos</button></td>
                <td class="r">{fmtUsd0(sc.line1_gross)}</td>
                <td class="tx-chev" aria-hidden="true"><span class:is-rot={openLine === '1'}><Icon name="chevron" size={16} /></span></td>
              </tr>
              {#if openLine === '1'}<tr class="tx-detail"><td></td><td colspan="2"><p class="tx-small">Sale de los cobros de las facturas (antes de comisiones) y de los ingresos sin factura de clientes. <a href={href('finanzas', ['facturas'])}>Ver facturas</a> · <a href={href('finanzas', ['registros'], { ver: 'ingresos' })}>Ver ingresos sin factura</a></p></td><td></td></tr>{/if}
              <tr class="tx-line" class:is-open={openLine === '2'}>
                <td class="tx-l">2</td>
                <td><button type="button" class="tx-btn" aria-expanded={openLine === '2'} onclick={() => toggleLine('2')}>Devoluciones a clientes</button></td>
                <td class="r">{sc.line2_returns ? '−' + fmtUsd0(sc.line2_returns) : fmtUsd0(0)}</td>
                <td class="tx-chev" aria-hidden="true"><span class:is-rot={openLine === '2'}><Icon name="chevron" size={16} /></span></td>
              </tr>
              {#if openLine === '2'}<tr class="tx-detail"><td></td><td colspan="2"><p class="tx-small">Dinero devuelto a clientes este año. <a href={href('finanzas', ['registros'], { ver: 'devoluciones' })}>Ver devoluciones</a></p></td><td></td></tr>{/if}
              <tr class="tx-sub"><td class="tx-l">7</td><td>Ingreso bruto</td><td class="r">{fmtUsd0(gross + sc.line6_other)}</td><td></td></tr>
            </tbody>
            <tbody>
              <tr><th scope="colgroup" class="tx-l"></th><th scope="colgroup" colspan="3" class="tx-part">Parte II, gastos</th></tr>
              {#each expenseLines as l (l.line)}
                {@const isOpen = openLine === l.line}
                <tr class="tx-line" class:is-open={isOpen}>
                  <td class="tx-l">{l.line}</td>
                  <td><button type="button" class="tx-btn" aria-expanded={isOpen} onclick={() => toggleLine(l.line)}>{LINES[l.line] || 'Línea ' + l.line}</button></td>
                  <td class="r">{fmtUsd0(l.cents)}</td>
                  <td class="tx-chev" aria-hidden="true"><span class:is-rot={isOpen}><Icon name="chevron" size={16} /></span></td>
                </tr>
                {#if isOpen}
                  <tr class="tx-detail"><td></td><td colspan="2">
                    {#if l.line === '27b' && sc.part_v}
                      <p class="tx-pv">{Object.entries(sc.part_v).map(([k, v]) => `${k} ${fmtUsd0(v)}`).join(' · ')}</p>
                    {/if}
                    {#if lineError}
                      <ErrorState compact title="No se pudieron cargar los movimientos" message={lineError} onretry={() => loadLine(l.line)} />
                    {:else if !lineRows}
                      <p class="tx-small">Cargando los movimientos…</p>
                    {:else if !lineRows.rows.length}
                      <p class="tx-small">{l.line === '10' ? 'Esta línea sale de las comisiones de cada cobro.' : l.line === '9' ? 'Esta línea sale del millaje apuntado.' : 'Sin movimientos en esta línea.'}</p>
                    {:else}
                      <ul class="tx-items">
                        {#each lineRows.rows.slice(0, 12) as e (e.id)}
                          <li>
                            <span class="tx-d">{fmtDay(e.spent_at)}</span>
                            <span class="tx-n">{e.vendor || e.label}<span class="tx-small">{[shortAcc(e.account_name) || 'Sin cuenta', e.business_pct < 100 ? `${e.business_pct} % de negocio` : '', e.receipt_status === 'attached' ? 'con recibo' : e.receipt_status === 'not_required' ? '' : Number(e.amount_cents) >= 7500 ? 'falta recibo' : ''].filter(Boolean).join(' · ')}</span></span>
                            <span class="r">{fmtUsd0(e.deductible_cents)}</span>
                          </li>
                        {/each}
                      </ul>
                      <p class="tx-small">{lineRows.total > 12 ? `Y ${lineRows.total - 12} más. ` : ''}<a href={href('finanzas', ['movimientos'], {})}>Ver los {lineRows.total} en Movimientos</a></p>
                    {/if}
                  </td></tr>
                {/if}
              {:else}
                <tr><td></td><td colspan="3" class="tx-small">Aún no hay gastos en {year}.</td></tr>
              {/each}
              <tr class="tx-sub"><td class="tx-l">28</td><td>Total de gastos</td><td class="r">{fmtUsd0(sc.total_expenses)}</td><td></td></tr>
              <tr class="tx-tot"><td class="tx-l">31</td><td>Beneficio neto</td><td class="r" class:neg={sc.net_profit < 0}>{fmtUsd0(sc.net_profit)}</td><td></td></tr>
            </tbody>
          </table>
          <div class="tx-notes">
            {#if sc.line6_other}<p>Incluye {fmtUsd0(sc.line6_other)} de otros ingresos del negocio (línea 6).</p>{/if}
            {#if sc.interest_schedule_b}<p>Fuera de este formulario: intereses del banco, {fmtUsd0(sc.interest_schedule_b)}. Suelen ir al Schedule B; lo decide tu contador.</p>{/if}
            {#each sc.notes.filter((n) => !/Schedule B/.test(n)) as n}<p>{n}</p>{/each}
          </div>
        </section>

        <div class="tx-grid">
          <section class="tx-card tx-pad" aria-labelledby="tx-q">
            <h3 id="tx-q" class="tx-cap">Pago trimestral estimado</h3>
            {#if est}
              {#if est.perPayment > 0}
                <p class="tx-big num">{usd(est.perPayment)}</p>
                <p class="sec">vence el {dayLong(est.nextDue)}{est.paymentsLeft > 1 ? `; quedan ${est.paymentsLeft} pagos` : ''}</p>
              {:else}
                <p class="sec">Con lo ya pagado ({usd(est.paid)}), no queda nada por pagar según el cálculo.</p>
              {/if}
              <p class="tx-small num">Impuesto del año calculado: {usd(est.totalAnnual)} (autónomo {usd(est.seTax)} y renta {usd(est.incomeTax)}); ya pagado {usd(est.paid)}.</p>
              {#if tax.entity_note}<p class="tx-small">{tax.entity_note}</p>{/if}
              <details class="tx-ass"><summary>Supuestos del cálculo</summary><ul>{#each est.assumptions as a}<li>{a}</li>{/each}</ul></details>
            {:else if tax && tax.estimate && !tax.estimate.ok}
              <p class="sec">{tax.estimate.error}</p>
            {:else if tax && tax.partners && tax.partners.length}
              {#each tax.partners as p (p.partner)}<p><b>{p.partner}</b>: {p.estimate.ok ? usd(p.estimate.perPayment) : p.estimate.error}</p>{/each}
            {:else}
              <p class="sec">El cálculo aparece cuando haya datos del año.</p>
            {/if}
            <p class="tx-small">Para revisión de tu contador, no es consejo fiscal.</p>
          </section>

          <section class="tx-card tx-pad" aria-labelledby="tx-1099">
            <h3 id="tx-1099" class="tx-cap">1099 de {year}</h3>
            {#if list1099 && list1099.rows.length}
              <ul class="tx-list">
                {#each list1099.rows as r (r.id)}
                  <li>
                    <span>{r.name}<span class="tx-small num">{fmtUsd0(r.reportable_cents)} por banco o efectivo</span></span>
                    {#if r.needs_1099}
                      <StatusChip tone={r.w9_status === 'on_file' ? 'neutral' : 'warning'} label={r.w9_status === 'on_file' ? 'Le toca 1099, W-9 guardado' : 'Le toca 1099, falta W-9'} />
                    {:else if r.near_threshold}
                      <StatusChip tone="neutral" label="Cerca del límite" />
                    {:else}
                      <StatusChip tone="neutral" label="No le toca" />
                    {/if}
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="sec">No hay contratistas apuntados en {year}.</p>
            {/if}
            <p class="tx-small">{list1099 && list1099.threshold_usd ? `Solo pagos por banco, transferencia o efectivo de $${list1099.threshold_usd.toLocaleString('en-US')} o más; lo pagado con tarjeta, PayPal o Stripe no va en el 1099-NEC.` : ''}</p>
          </section>

          <section class="tx-card tx-pad" aria-labelledby="tx-cal">
            <h3 id="tx-cal" class="tx-cap">Próximos plazos</h3>
            {#if upcoming.length}
              <ul class="tx-list">{#each upcoming as c (c.date + c.kind)}<li><span>{c.label}</span><span class="sec num">{fmtDay(c.date)}</span></li>{/each}</ul>
            {:else}<p class="sec">Sin plazos pendientes para {year}.</p>{/if}
            <a class="b b--mini tx-dl" href={`/api/admin/finance/books?view=export&year=${year}`} download><Icon name="download" size={16} />Movimientos de {year} para el contador</a>
          </section>
        </div>
        </div>
      {/if}
    </LoadingState>
  {/if}
</div>

<style>
  .tx { container-type: inline-size; }
  .tx-layout { display: block; }
  @container (min-width: 1100px) {
    .tx-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
    .tx-layout > .tx-card { margin-bottom: 0; }
    .tx-layout .tx-grid { grid-template-columns: 1fr; }
  }
  .tx-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 16px; }
  .tx-pad { padding: 18px 20px; margin-bottom: 0; min-width: 0; }
  .tx-review { padding: 4px 0; }
  .tx-row { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-top: 1px solid var(--border-subtle); min-height: 48px; }
  .tx-row:first-child { border-top: 0; }
  .tx-ic { flex: none; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; }
  .tx-ic--err { color: var(--color-error); border: 1.6px solid currentColor; }
  .tx-ic--warn { color: var(--color-warning); }
  .tx-ic--info { color: var(--fg-subtle); }
  .tx-txt { flex: 1; min-width: 0; }
  .tx-head { padding: 18px 20px; border-bottom: 1px solid var(--border); }
  .tx-head h3 { margin: 0; font-size: 17px; font-weight: 600; }
  .tx-head p { margin: 4px 0 0; color: var(--fg-subtle); font-size: var(--dash-small); }
  .tx-t { width: 100%; border-collapse: collapse; }
  .tx-t th, .tx-t td { height: 48px; padding: 0 16px; border-bottom: 1px solid var(--border-subtle); text-align: left; font-weight: 400; }
  .tx-t thead th { height: auto; padding: 12px 16px; font: 500 var(--dash-caption)/1.2 var(--font-body); letter-spacing: 0; text-transform: none; font-family: var(--font-mono); color: var(--fg-subtle); border-bottom: 1px solid var(--border); }
  .tx-t .r { text-align: right; white-space: nowrap; }
  .tx-l { width: 64px; color: var(--fg-subtle); }
  .tx-part { font: 500 var(--dash-caption)/1.2 var(--font-body) !important; letter-spacing: 0; text-transform: none; font-family: var(--font-mono) !important; color: var(--fg-subtle) !important; height: 40px !important; }
  .tx-sub td { font-weight: 600; color: var(--fg-primary); }
  .tx-sub .tx-l { font-weight: 400; color: var(--fg-subtle); }
  .tx-tot td { font-weight: 600; border-top: 1px solid var(--border-strong); border-bottom: 0; }
  .tx-tot .tx-l { font-weight: 400; }
  .tx-btn { all: unset; cursor: pointer; color: var(--fg-primary); }
  .tx-btn:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 3px; border-radius: 4px; }
  .tx-line:hover td, .tx-line.is-open td, .tx-detail td { background: var(--bg-elevated); }
  .tx-chev { width: 36px; color: var(--fg-subtle); }
  .tx-chev span { display: inline-flex; transition: transform var(--duration-fast); }
  .tx-chev .is-rot { transform: rotate(90deg); }
  @media (prefers-reduced-motion: reduce) { .tx-chev span { transition: none; } }
  .tx-detail td { height: auto; padding: 4px 16px 14px; }
  .tx-pv { margin: 0 0 8px; color: var(--fg-secondary); font-size: var(--dash-small); }
  .tx-items { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .tx-items li { display: grid; grid-template-columns: 90px minmax(0, 1fr) auto; gap: 12px; align-items: baseline; font-size: var(--dash-small); }
  .tx-d { color: var(--fg-subtle); }
  .tx-n { color: var(--fg-primary); min-width: 0; overflow-wrap: anywhere; }
  .tx-n .tx-small { display: block; }
  .tx-r { color: var(--fg-subtle); }
  .tx-items .r { text-align: right; color: var(--fg-primary); }
  .tx-small { color: var(--fg-subtle); font-size: var(--dash-small); margin: 6px 0 0; }
  .tx-notes { padding: 12px 16px; border-top: 1px solid var(--border-subtle); color: var(--fg-subtle); font-size: var(--dash-small); }
  .tx-notes p { margin: 0 0 4px; }
  .tx-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
  .tx-cap { margin: 0 0 10px; font: 500 var(--dash-caption)/1.2 var(--font-body); letter-spacing: 0; text-transform: none; font-family: var(--font-mono); color: var(--fg-subtle); }
  .tx-big { margin: 0; font-size: 28px; font-weight: 650; letter-spacing: -.02em; }
  .tx-pad p { margin: 4px 0 0; }
  .tx-ass { margin-top: 10px; font-size: var(--dash-small); color: var(--fg-secondary); }
  .tx-ass summary { cursor: pointer; color: var(--fg-primary); }
  .tx-ass ul { margin: 8px 0 0; padding-left: 18px; display: grid; gap: 4px; }
  .tx-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .tx-list li { display: flex; justify-content: space-between; align-items: center; gap: 8px 12px; flex-wrap: wrap; }
  .tx-list li > .sec { white-space: nowrap; }
  .tx-list li > span:first-child { min-width: 0; }
  .tx-list .tx-small { display: block; margin: 2px 0 0; }
  .tx-dl { margin-top: 14px; display: inline-flex; gap: 6px; }
  .sec { color: var(--fg-secondary); }
  .neg { color: var(--color-error); }
  .num { font-variant-numeric: tabular-nums; }
  @container (max-width: 560px) {
    .tx-l { width: 46px; white-space: nowrap; }
    .tx-t th, .tx-t td { padding: 0 8px; }
    .tx-t td:nth-child(2) { overflow-wrap: anywhere; }
    .tx-chev { width: 22px; }
    .tx-t thead th { padding: 10px 8px; }
    .tx-detail td { padding: 4px 8px 12px; }
    .tx-items li { grid-template-columns: minmax(0, 1fr) auto; }
    .tx-items .tx-d { grid-column: 1 / -1; }
    .tx-items .tx-n { order: 1; }
    .tx-items .r { order: 2; }
    .tx-row { flex-wrap: wrap; }
  }
  @media (pointer: coarse) { .tx-row .b, .tx-dl { min-height: 44px; } }
</style>
