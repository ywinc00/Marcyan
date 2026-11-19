<script>
  // Portada de Finanzas (dirección A, elegida por el dueño 2026-11-14): el año
  // como libro de doce filas con lo que entró, lo que salió, lo que quedó, el
  // mismo mes del año anterior y el estado de cada mes. Cada mes abre su página
  // (#/finanzas/mes/AAAA-MM, forma A del 2026-11-18) con su detalle y su cierre.
  // Datos: /api/admin/finance/books (lib/finance-books.mjs).
  import Icon from '../ui/Icon.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { route, setQuery, href } from '../lib/router.svelte.js';
  import { monthKey } from '../lib/dates.js';
  import { fmtUsd0, monthLong, monthShort, categoryLabel } from './fin.js';

  let { pendingMonth = $bindable(''), onchanged } = $props();

  const thisMonth = monthKey();
  const thisYear = Number(thisMonth.slice(0, 4));
  const year = $derived(Number(/^\d{4}$/.test(route.query.ano || '') ? route.query.ano : thisYear));

  let book = $state(null);
  let prev = $state(null);
  let years = $state([]);
  let error = $state('');
  let schedNet = $state(null);
  let tax = $state(null);
  let w9Missing = $state([]);
  let pendingCount = $state(null);    // { blocking, warnings } del primer mes por cerrar

  export async function load() {
    error = '';
    const y = year;
    try {
      const [a, b] = await Promise.all([
        api(`/api/admin/finance/books?view=year&year=${y}`),
        api(`/api/admin/finance/books?view=year&year=${y - 1}`).catch(() => null),
      ]);
      if (y !== year) return;
      book = a.book; years = (a.years || []).map((r) => Number(r.year)); prev = b ? b.book : null;
    } catch (e) {
      if (!isSessionError(e)) error = errorMessage(e, 'No se pudo cargar el año.');
      return;
    }
    // Lo secundario no bloquea la tabla: si falla, la tarjeta lo dice.
    api(`/api/admin/finance/books?view=schedule-c&year=${y}`).then((r) => { schedNet = r.summary.net_profit; }).catch(() => { schedNet = null; });
    if (y === thisYear) {
      api(`/api/admin/finance/books?view=tax&year=${y}`).then((r) => { tax = r.tax; }).catch(() => { tax = null; });
      api(`/api/admin/finance/books?view=1099&year=${y}`).then((r) => {
        w9Missing = (r.list.rows || []).filter((x) => x.needs_1099 && x.w9_status === 'missing');
      }).catch(() => { w9Missing = []; });
    }
  }
  $effect(() => { year; load(); });

  // Meses que se enseñan: el año pasado entero; el actual, hasta este mes.
  const months = $derived(book ? book.months.filter((m) => m.month <= thisMonth) : []);
  const prevByMonth = $derived(prev ? Object.fromEntries(prev.months.map((m) => [m.month.slice(5, 7), m])) : {});
  // El primer mes ya terminado que sigue abierto: el que toca cerrar.
  const toClose = $derived(months.find((m) => m.month < thisMonth && m.status !== 'closed')?.month || '');
  $effect(() => { pendingMonth = toClose; });
  $effect(() => {
    const m = toClose;
    pendingCount = null;
    if (!m) return;
    api(`/api/admin/finance/books?view=close&month=${m}`)
      .then((r) => { if (m === toClose) pendingCount = { blocking: r.checklist.items.filter((i) => i.blocking && i.count > 0).length, warnings: r.checklist.items.filter((i) => !i.blocking && i.count > 0).length }; })
      .catch(() => {});
  });

  const totals = $derived.by(() => {
    const t = { income: 0, out: 0, net: 0, prevNet: 0 };
    for (const m of months) {
      t.income += m.income;
      t.out += m.expenses + m.fees + m.refunds;
      t.net += m.net;
      const p = prevByMonth[m.month.slice(5, 7)];
      if (p) t.prevNet += p.net;
    }
    return t;
  });
  const hasPrev = $derived(Boolean(prev && prev.months.some((m) => m.income || m.expenses)));

  // Gastos del año por categoría, con las suscripciones aparte (se ven como gasto).
  const categories = $derived.by(() => {
    if (!book) return [];
    const rows = Object.entries(book.byCategory || {}).map(([id, arr]) => ({ id, label: categoryLabel(id), cents: arr.reduce((a, c) => a + c, 0) }));
    return rows.filter((r) => r.cents > 0).sort((a, b) => b.cents - a.cents).slice(0, 5);
  });

  function chipLabel(m) {
    if (!pendingCount || m.month !== toClose) return 'Por cerrar';
    if (pendingCount.blocking) return `Por cerrar: ${pendingCount.blocking} bloquea${pendingCount.blocking === 1 ? '' : 'n'}`;
    return 'Listo para cerrar';
  }
  function stateOf(m) {
    if (m.status === 'closed') return 'closed';
    if (m.month === thisMonth) return 'current';
    return 'toclose';
  }
  const out = (m) => m.expenses + m.fees + m.refunds;
  const nextDue = $derived(tax && tax.estimate && tax.estimate.ok ? tax.estimate : null);
  const nextLabel = $derived.by(() => {
    if (!nextDue || !tax.calendar) return '';
    const it = tax.calendar.find((c) => c.date === nextDue.nextDue);
    return it ? it.label : '';
  });
</script>

<div class="yb">
  <div class="yb-top">
    {#if years.length > 1}
      <div class="yb-seg" role="group" aria-label="Año">
        {#each years.slice(0, 4) as y (y)}
          <button type="button" aria-pressed={y === year} onclick={() => setQuery({ ano: y === thisYear ? '' : String(y), mes: '' })}>{y}</button>
        {/each}
      </div>
    {:else}
      <span class="yb-year">{year}</span>
    {/if}
  </div>

  {#if toClose && year === thisYear}
    <div class="yb-due">
      <div><b>{monthLong(toClose).split(' ')[0].replace(/^./, (c) => c.toUpperCase())} está por cerrar</b>
        {#if pendingCount}<span>{pendingCount.blocking ? `${pendingCount.blocking} cosa${pendingCount.blocking === 1 ? '' : 's'} lo bloquea${pendingCount.blocking === 1 ? '' : 'n'}` : 'Ya se puede cerrar'}{pendingCount.warnings ? `; ${pendingCount.warnings} aviso${pendingCount.warnings === 1 ? '' : 's'}` : ''}.</span>{/if}</div>
      <a class="b b--primary" href={href('finanzas', ['mes', toClose], { ver: 'cierre' })}>Revisar {monthLong(toClose).split(' ')[0]}</a>
    </div>
  {/if}
  {#if error}
    <ErrorState title="No se pudo cargar el año" message={error} onretry={load} />
  {:else}
    <LoadingState loading={!book} rows={8} height={52} head={40} gap={1} label="Cargando el año">
      {#if book}
        <div class="yb-card">
          <table class="yb-t">
            <caption class="sr-only">Lo que entró, lo que salió y lo que quedó cada mes de {year}</caption>
            <thead>
              <tr>
                <th scope="col">Mes</th>
                <th scope="col" class="r yb-wide">Entró</th>
                <th scope="col" class="r yb-wide">Salió</th>
                <th scope="col" class="r">Quedó</th>
                {#if hasPrev}<th scope="col" class="r">En {year - 1}</th>{/if}
                <th scope="col" class="yb-st">Estado</th>
                <th scope="col"><span class="sr-only">Abrir</span></th>
              </tr>
            </thead>
            <tbody>
              {#each months as m (m.month)}
                {@const st = stateOf(m)}
                {@const p = prevByMonth[m.month.slice(5, 7)]}
                <tr class="yb-row" class:is-flag={st === 'toclose'}>
                  <th scope="row">
                    <a class="yb-month" href={href('finanzas', ['mes', m.month])}>
                      <span class="yb-mname">{monthLong(m.month).split(' ')[0]}</span><span class="yb-mshort" aria-hidden="true"><span class="yb-mcap">{monthShort(m.month)}</span><span class="yb-mstate" class:is-warn={st === 'toclose'}>{st === 'closed' ? 'Cerrado' : st === 'current' ? 'En curso' : 'Por cerrar'}</span></span>
                    </a>
                  </th>
                  <td class="r yb-wide">{fmtUsd0(m.income)}</td>
                  <td class="r yb-wide sec">{fmtUsd0(out(m))}</td>
                  <td class="r" class:neg={m.net < 0}>{fmtUsd0(m.net)}</td>
                  {#if hasPrev}<td class="r sec">{p ? fmtUsd0(p.net) : ''}</td>{/if}
                  <td class="yb-st">
                    {#if st === 'closed'}
                      <span class="yb-lock"><Icon name="lock" size={14} /><span>Cerrado</span></span>
                    {:else if st === 'current'}
                      <StatusChip tone="neutral" label="En curso" />
                    {:else}
                      <StatusChip tone="warning" label={chipLabel(m)} />
                    {/if}
                  </td>
                  <td class="yb-chev" aria-hidden="true"><span><Icon name="chevron" size={16} /></span></td>
                </tr>
              {/each}
            </tbody>
            <tfoot>
              <tr class="yb-tot">
                <th scope="row"><span class="yb-mname">{year === thisYear ? `${year} hasta hoy` : year}</span><span class="yb-mshort" aria-hidden="true">{year}</span></th>
                <td class="r yb-wide">{fmtUsd0(totals.income)}</td>
                <td class="r yb-wide">{fmtUsd0(totals.out)}</td>
                <td class="r" class:neg={totals.net < 0}>{fmtUsd0(totals.net)}</td>
                {#if hasPrev}<td class="r sec">{fmtUsd0(totals.prevNet)}</td>{/if}
                <td colspan="2" class="yb-diff">
                  {#if hasPrev}
                    {@const d = totals.net - totals.prevNet}
                    <span class:pos={d >= 0} class:neg={d < 0}>{fmtUsd0(Math.abs(d))} {d >= 0 ? 'más' : 'menos'} que en {year - 1}</span>
                  {/if}
                </td>
              </tr>
            </tfoot>
          </table>
          {#if hasPrev}{@const d = totals.net - totals.prevNet}<p class="yb-diffline"><span class:pos={d >= 0} class:neg={d < 0}>{fmtUsd0(Math.abs(d))} {d >= 0 ? 'más' : 'menos'} que en {year - 1}</span> a esta altura del año.</p>{/if}
          <p class="yb-foot">«Quedó» es dinero: lo que entró menos lo que salió (gastos, comisiones y devoluciones).{#if schedNet !== null && schedNet !== totals.net}{' '}El beneficio para impuestos ({fmtUsd0(schedNet)}) no coincide porque cuenta las comidas al 50&nbsp;%, aplica el uso de negocio de cada gasto y deja fuera los intereses del banco.{/if}{' '}<a href={href('finanzas', ['impuestos'], year !== thisYear ? { ano: String(year) } : {})}>Ver Impuestos</a></p>
        </div>

        <div class="yb-cards">
          {#if year === thisYear}
            <section class="yb-c" aria-label="Próximo plazo fiscal">
              <h3 class="yb-cap">Próximo plazo fiscal</h3>
              {#if nextDue && nextDue.perPayment > 0}
                <p class="yb-big num">{fmtUsd0(Math.round(nextDue.perPayment * 100))}</p>
                <p class="sec">{nextLabel || 'Pago trimestral'}, vence el {new Date(nextDue.nextDue + 'T12:00:00').toLocaleDateString('es-US', { day: 'numeric', month: 'long' })}</p>
              {:else if nextDue}
                <p class="sec">Con lo ya pagado, no queda nada por pagar este año según el cálculo.</p>
              {:else}
                <p class="sec">El cálculo aparece cuando haya meses cerrados.</p>
              {/if}
              {#each w9Missing as v (v.id)}
                <p class="yb-warn"><Icon name="alert" size={16} /><span>Falta el W-9 de {v.name}: le toca 1099.</span></p>
              {/each}
              <p class="yb-small">{tax && tax.books_closed_through ? `Con los libros cerrados hasta ${monthLong(tax.books_closed_through).split(' ')[0]}. ` : ''}Para revisión de tu contador, no es consejo fiscal.</p>
            </section>
          {/if}
          <section class="yb-c" aria-label="Gastos del año por categoría">
            <h3 class="yb-cap">Dinero que salió en {year}, por categoría</h3>
            <ul class="yb-cats num">
              {#each categories as c (c.id)}
                <li><a href={href('finanzas', ['movimientos'], { cat: c.id, ano: String(year) })}><span>{c.label}</span><span>{fmtUsd0(c.cents)}</span></a></li>
              {/each}
              {#if !categories.length && !(book.subscriptions && book.subscriptions.cents > 0)}
                <li class="sec">Aún no hay gastos en {year}.</li>
              {/if}
            </ul>
            {#if book.subscriptions && book.subscriptions.cents > 0}<p class="yb-small">De todo esto, {fmtUsd0(book.subscriptions.cents)} son cargos de suscripciones. <a href={href('finanzas', ['registros'])}>Ver suscripciones</a>. Para impuestos cuenta la cifra de cada línea en Impuestos.</p>{/if}
          </section>
        </div>
      {/if}
    </LoadingState>
  {/if}
</div>

<style>
  .yb { container-type: inline-size; }
  .yb-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .yb-year { font-weight: 600; color: var(--fg-secondary); }
  .yb-seg { display: inline-flex; gap: 2px; padding: 3px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-card); }
  .yb-seg button { min-height: 30px; padding: 4px 12px; border: 0; border-radius: 7px; background: transparent; color: var(--fg-secondary); font: 500 var(--dash-small)/1 var(--font-body); cursor: pointer; }
  .yb-seg button[aria-pressed='true'] { background: var(--surface-3); color: var(--fg-primary); }
  .yb-seg button:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  @media (pointer: coarse) { .yb-seg button { min-height: 40px; } }

  .yb-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
  .yb-t { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  .yb-t th, .yb-t td { padding: 0 16px; height: 52px; border-bottom: 1px solid var(--border-subtle); text-align: left; font-weight: 400; }
  .yb-t thead th { height: auto; padding: 12px 16px; font: 500 var(--dash-caption)/1.2 var(--font-body); letter-spacing: 0; text-transform: none; font-family: var(--font-mono); color: var(--fg-subtle); border-bottom: 1px solid var(--border); }
  .yb-t .r { text-align: right; }
  .yb-t tbody th { padding: 0; }
  .yb-month { box-sizing: border-box; display: flex; align-items: center; width: 100%; height: 52px; padding: 0 16px; cursor: pointer; color: var(--fg-primary); text-decoration: none; text-transform: capitalize; }
  .yb-month:hover .yb-mname, .yb-month:hover .yb-mcap { text-decoration: underline; text-underline-offset: 3px; }
  .yb-month:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: -2px; border-radius: 6px; }
  .yb-mshort { display: none; }
  .yb-row:hover td, .yb-row:hover th { background: var(--bg-elevated); }
  .yb-row.is-flag .yb-mname { font-weight: 600; }
  .yb-foot a { color: var(--fg-primary); text-underline-offset: 3px; }
  .yb-st { padding-left: 24px !important; }
  .yb-lock { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: var(--radius-pill); background: var(--surface-3); color: var(--fg-secondary); font: 500 var(--dash-caption)/1.4 var(--font-body); }
  .yb-chev { width: 40px; color: var(--fg-subtle); }
  .yb-chev span { display: inline-flex; }
  .yb-tot th, .yb-tot td { font-weight: 600; border-top: 1px solid var(--border-strong); border-bottom: 0; color: var(--fg-primary); }
  .yb-tot th { padding: 0 16px; }
  .yb-diff { font-weight: 500 !important; padding-left: 24px !important; }
  .sec { color: var(--fg-secondary); }
  .neg { color: var(--color-error); }
  .pos { color: var(--accent-teal); }
  .yb-foot { margin: 0; padding: 12px 16px; border-top: 1px solid var(--border-subtle); color: var(--fg-subtle); font-size: var(--dash-small); }

  .yb-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 16px; align-items: start; }
  .yb-mstate { display: block; margin-top: 2px; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .yb-mstate.is-warn { color: var(--color-warning); }
  .yb-due { display: none; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; padding: 14px 16px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-card); }
  .yb-due b { font-weight: 600; display: block; }
  .yb-due span { color: var(--fg-secondary); font-size: var(--dash-small); }
  .yb-due .b { min-height: 44px; }
  .yb-small a { color: var(--fg-primary); text-underline-offset: 3px; }
  .yb-diffline { display: none; margin: 0; padding: 12px 10px 0; font-size: var(--dash-small); color: var(--fg-secondary); }
  .yb-c { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 18px 20px; min-width: 0; }
  .yb-cap { margin: 0 0 10px; font: 500 var(--dash-caption)/1.2 var(--font-body); letter-spacing: 0; text-transform: none; font-family: var(--font-mono); color: var(--fg-subtle); }
  .yb-big { margin: 0; font-size: 28px; font-weight: 650; letter-spacing: -.02em; color: var(--fg-primary); }
  .yb-c p { margin: 4px 0 0; }
  .yb-warn { display: flex; gap: 8px; align-items: flex-start; margin-top: 12px !important; color: var(--fg-primary); }
  .yb-warn :global(.ui-icon) { color: var(--color-warning); flex: none; margin-top: 2px; }
  .yb-small { color: var(--fg-subtle); font-size: var(--dash-small); margin-top: 10px !important; }
  .yb-cats { list-style: none; margin: 0; padding: 0; }
  .yb-cats li { border-bottom: 1px solid var(--border-subtle); }
  .yb-cats li:last-child { border-bottom: 0; }
  .yb-cats a { display: flex; justify-content: space-between; gap: 12px; align-items: center; min-height: 40px; color: var(--fg-primary); text-decoration: none; }
  .yb-cats a:hover span:first-child { text-decoration: underline; text-underline-offset: 3px; }
  .yb-cats a:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; border-radius: 4px; }
  .num { font-variant-numeric: tabular-nums; }

  /* Estrecho: el mes, lo que quedó, el año anterior y el estado; lo que entró y
     salió sigue a la vista al abrir el mes (E-62: nada se pierde). */
  @container (max-width: 640px) {
    /* El estado pasa debajo del mes (texto, no solo icono) y la comparación con
       el año anterior, a una línea bajo la tabla: nada se pierde (E-62). */
    .yb-st, .yb-diff { display: none; }
    .yb-due { display: flex; }
    .yb-diffline { display: block; }
    .yb-month { height: auto; min-height: 56px; padding-block: 8px; }
    .yb-wide { display: none; }
    .yb-mname { display: none; }
    .yb-mshort { display: inline; text-transform: none; }
    .yb-mcap { text-transform: capitalize; }
    .yb-t td.r { white-space: nowrap; }
    .yb-t th, .yb-t td { padding: 0 10px; }
    .yb-month { padding: 0 10px; }
    .yb-st { padding-left: 10px !important; }
    .yb-st :global(.ui-chip) { white-space: normal; }
    .yb-chev { width: 28px; }
  }
</style>
