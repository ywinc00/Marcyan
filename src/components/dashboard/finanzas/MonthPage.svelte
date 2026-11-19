<script>
  // Página de un mes (forma A elegida por el dueño el 2026-11-18, design/finanzas.md):
  // lo que entró y de quién, en qué se fue, cómo quedó frente al mes anterior y al
  // mismo mes del año pasado, el cierre de siempre y lo facturado sin cobrar.
  // Ruta #/finanzas/mes/AAAA-MM. Datos: /api/admin/finance/books?view=month.
  import Icon from '../ui/Icon.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import BrandLogo from '../BrandLogo.svelte';
  import MonthClose from './MonthClose.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { href, route } from '../lib/router.svelte.js';
  import { monthKey, fmtDay } from '../lib/dates.js';
  import { entityColor, initials } from '../lib/colors.js';
  import { fmtUsd0, formatUsd, monthLong, categoryLabel } from './fin.js';

  let { month, onchanged } = $props();

  const thisMonth = monthKey();
  let data = $state(null);
  let error = $state('');
  let showIn = $state(false);
  let showOut = $state(false);
  let side = $state('in');          // teléfono: qué desglose se ve
  let blocking = $state(null);      // lo que bloquea el cierre (lo cuenta MonthClose)
  let closeEl = $state(null);
  let scrolled = '';

  async function load() {
    const m = month;
    error = '';
    try {
      const j = await api(`/api/admin/finance/books?view=month&month=${encodeURIComponent(m)}`);
      if (m === month) data = j.month;
    } catch (e) {
      if (!isSessionError(e)) error = errorMessage(e, 'No se pudo cargar el mes.');
    }
  }
  $effect(() => { month; data = null; showIn = false; showOut = false; blocking = null; load(); });
  function changed() { load(); onchanged?.(); }

  // ── Nombres y navegación ──────────────────────────────────────
  function shift(m, d) {
    const y = Number(m.slice(0, 4)); const mo = Number(m.slice(5, 7)) - 1 + d;
    const dt = new Date(Date.UTC(y, mo, 1));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const mName = $derived(monthLong(month).split(' ')[0]);
  const title = $derived(cap(monthLong(month)));
  const year = $derived(month.slice(0, 4));
  const prevKey = $derived(shift(month, -1));
  const nextKey = $derived(shift(month, 1));
  const hasNext = $derived(nextKey <= thisMonth);
  const prevName = $derived(monthLong(prevKey).split(' ')[0]);
  const nextName = $derived(monthLong(nextKey).split(' ')[0]);
  const yearHref = $derived(href('finanzas', [], Number(year) !== Number(thisMonth.slice(0, 4)) ? { ano: year } : {}));
  const state = $derived(!data ? '' : data.status === 'closed' ? 'closed' : month === thisMonth ? 'current' : month > thisMonth ? 'future' : 'toclose');
  const chipLabel = $derived(blocking == null ? 'Por cerrar' : blocking ? `Por cerrar: ${blocking} bloquea${blocking === 1 ? '' : 'n'}` : 'Listo para cerrar');

  function reviewClose() {
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    closeEl?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    closeEl?.focus({ preventScroll: true });
  }
  // Llegando desde «Revisar octubre» (?ver=cierre), el cierre a la vista.
  $effect(() => {
    if (data && closeEl && route.query.ver === 'cierre' && scrolled !== month) {
      scrolled = month;
      queueMicrotask(() => closeEl?.scrollIntoView({ block: 'start' }));
    }
  });

  // ── Cifras ────────────────────────────────────────────────────
  const t = $derived(data ? data.totals : null);
  // El mes en curso se compara con los mismos días del mes anterior (no con un mes entero).
  const base = $derived(data ? (data.current && data.prev_same_period ? data.prev_same_period : data.prev) : null);
  const baseLabel = $derived(data && data.current && data.prev_same_period ? `los días 1 a ${data.prev_same_period.days} de ${prevName}` : prevName);
  const ly = $derived(data && !data.current && (data.last_year.income || data.last_year.out) ? data.last_year : null);
  const lyLabel = $derived(`${mName.slice(0, 3)} ${Number(year) - 1}`);
  const baseShort = $derived(data && data.current && data.prev_same_period ? `1–${data.prev_same_period.days} ${prevName.slice(0, 3)}` : prevName.slice(0, 3));
  function delta(a, b) {
    if (!b) return null;
    return Math.round(((a - b) / Math.abs(b)) * 100);
  }
  const fmtPct = (p) => (p > 0 ? '+' : p < 0 ? '−' : '') + Math.abs(p) + ' %';
  // «Banco (Zelle y transferencias)» → «Banco»: el detalle de la cuenta sobra aquí.
  const acct = (a) => String(a || '').replace(/\s*\(.*\)\s*$/, '');
  // Partes del total que suman 100 (resto mayor).
  function shares(list, total) {
    if (!total) return list.map(() => 0);
    const raw = list.map((v) => (v / total) * 100); const fl = raw.map(Math.floor);
    let left = 100 - fl.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - fl[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0 && raw[i] > 0) { fl[i]++; left--; } });
    return fl;
  }
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const dayShort = (d) => fmtDay(d, { day: 'numeric', month: 'short' });
  const subsCents = $derived(data ? data.expenses.filter((e) => e.subscription_id).reduce((a, e) => a + e.amount_cents, 0) : 0);

  // ── De dónde entró ───────────────────────────────────────────
  const inflow = $derived.by(() => {
    if (!data) return { rows: [], items: [], n: 0 };
    const meta = new Map();
    const note = (key, inv, account, date) => {
      const m = meta.get(key) || { invs: [], accts: new Set(), dates: [] };
      if (inv) m.invs.push(inv);
      if (account) m.accts.add(acct(account));
      m.dates.push(date);
      meta.set(key, m);
    };
    for (const p of data.payments) note(p.client_id ? `c${p.client_id}` : 'sin-cliente', p.invoice_number, p.account, p.date);
    for (const n of data.other_income) note(n.client_id ? `c${n.client_id}` : `i${n.id}`, 'sin factura', n.account, n.date);
    const pc = shares(data.by_client.map((r) => r.cents), t.income);
    const rows = data.by_client.map((r, i) => {
      const m = meta.get(r.key) || { invs: [], accts: new Set(), dates: [] };
      const invs = m.invs.length > 2 ? `${m.invs.slice(0, 2).join(', ')} y ${m.invs.length - 2} más` : m.invs.join(', ');
      // Un solo cobro del cliente: su fecha va aquí y no hace falta la lista.
      const when = m.dates.length === 1 ? dayShort(m.dates[0]) : '';
      return { ...r, pct: pc[i], sub: [when, invs, [...m.accts].join(', ')].filter(Boolean).join(' · ') };
    });
    const items = [
      ...data.payments.map((p) => ({ k: 'p' + p.id, date: p.date, title: p.client_name || 'Sin cliente', inv: p.invoice_number, sub: [p.account ? acct(p.account) : 'sin decir por dónde', p.fee_cents ? `comisión ${formatUsd(p.fee_cents)}` : ''].filter(Boolean).join(' · '), cents: p.amount_cents })),
      ...data.other_income.map((n) => ({ k: 'n' + n.id, date: n.date, title: n.client_name || n.label, inv: null, sub: ['sin factura', n.client_name ? n.label : '', acct(n.account), n.fee_cents ? `comisión ${formatUsd(n.fee_cents)}` : ''].filter(Boolean).join(' · '), cents: n.amount_cents })),
      ...data.refunds.map((r) => ({ k: 'r' + r.id, date: r.date, title: r.client_name || 'Devolución', inv: r.invoice_number, sub: ['devolución', r.reason || ''].filter(Boolean).join(' · '), cents: -r.amount_cents })),
    ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    // La lista uno a uno solo si aporta algo: algún cliente con varios cobros o una devolución.
    const needList = data.refunds.length > 0 || rows.some((r) => r.count > 1);
    return { rows, items, needList, n: data.payments.length + data.other_income.length };
  });
  const clientsN = $derived(data ? new Set(data.by_client.filter((r) => r.client_id).map((r) => r.client_id)).size : 0);

  // ── En qué se fue ────────────────────────────────────────────
  const outflow = $derived.by(() => {
    if (!data) return { rows: [], items: [] };
    const feeN = data.payments.filter((p) => p.fee_cents > 0).length + data.other_income.filter((n) => n.fee_cents > 0).length;
    const list = [
      ...data.by_category.map((c) => ({ k: 'c-' + c.category, label: categoryLabel(c.category), cents: c.cents, subs: c.subscriptions,
        count: c.subscriptions.length ? plural(c.count, 'cargo', 'cargos') : plural(c.count, 'gasto', 'gastos') })),
      { k: 'fees', label: 'Comisiones de cobro', cents: t.fees, subs: [], count: feeN ? plural(feeN, 'cobro', 'cobros') : 'ninguna' },
      { k: 'refunds', label: 'Devoluciones', cents: t.refunds, subs: [], count: data.refunds.length ? plural(data.refunds.length, 'devolución', 'devoluciones') : 'ninguna' },
    ];
    const pc = shares(list.map((r) => r.cents), t.out);
    const rows = list.map((r, i) => ({ ...r, pct: pc[i] }));
    const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    const items = [...data.expenses].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).map((e) => {
      const title = e.subscription_name || e.vendor || e.label;
      return {
      k: e.id, date: e.date, title,
      sub: [same(e.label, title) ? '' : e.label, categoryLabel(e.category), acct(e.account)].filter((x, i, a) => x && a.indexOf(x) === i).join(' · '),
      noReceipt: e.amount_cents >= 7500 && e.receipt_status === 'none' && !e.subscription_id,
      cents: e.amount_cents,
    };
    });
    return { rows, items };
  });
</script>

<div class="mp">
  <nav class="mp-back" aria-label="Volver"><a href={yearHref}><span class="mp-back__icon"><Icon name="chevron" size={16} /></span>Año {year}</a></nav>

  <header class="ui-page-head">
    <div class="ui-page-head__text mp-titlerow">
      <h1 class="ui-page-title">{title}</h1>
      <span class="mp-nav">
        <a class="mp-arw" href={href('finanzas', ['mes', prevKey])} aria-label={`Mes anterior: ${prevName}`}><span class="mp-flip"><Icon name="chevron" size={16} /></span></a>
        {#if hasNext}
          <a class="mp-arw" href={href('finanzas', ['mes', nextKey])} aria-label={`Mes siguiente: ${nextName}`}><Icon name="chevron" size={16} /></a>
        {:else}
          <span class="mp-arw is-off" aria-hidden="true"><Icon name="chevron" size={16} /></span>
        {/if}
      </span>
      {#if state === 'closed'}
        <span class="mp-lock"><Icon name="lock" size={14} />Cerrado</span>
      {:else if state === 'current'}
        <StatusChip tone="neutral" label="En curso" />
      {:else if state === 'toclose'}
        <StatusChip tone="warning" label={chipLabel} />
      {/if}
    </div>
    <div class="ui-page-head__actions">
      <a class="b mp-desk" href={`/api/admin/finance/books?view=export&month=${month}`} download><Icon name="download" size={16} />Descargar el mes</a>
      {#if state === 'toclose'}<button type="button" class="b b--primary mp-desk" onclick={reviewClose}>Revisar el cierre</button>{/if}
    </div>
  </header>

  {#if error}
    <ErrorState title="No se pudo cargar el mes" message={error} onretry={load} />
  {:else}
    <LoadingState loading={!data} rows={6} height={56} head={96} gap={12} label={`Cargando ${mName}`}>
      {#if data && t}
        {#if state === 'future'}
          <p class="mp-note">{cap(mName)} aún no ha llegado: aquí no hay nada todavía.</p>
        {/if}
        <section class="mp-figs" aria-label={`Resumen de ${mName}`}>
          <div class="mp-fig">
            <span class="mp-cap">Entró</span>
            <span class="mp-big num">{fmtUsd0(t.income)}</span>
            <span class="mp-sub">{inflow.n ? `${plural(inflow.n, 'cobro', 'cobros')}${clientsN ? ` de ${plural(clientsN, 'cliente', 'clientes')}` : ''}${data.other_income.length ? `, ${data.other_income.length} sin factura` : ''}` : 'Ningún cobro'}</span>
            {@render cmp(t.income, 'income')}
          </div>
          <div class="mp-fig">
            <span class="mp-cap">Salió</span>
            <span class="mp-big num">{fmtUsd0(t.out)}</span>
            <span class="mp-sub mp-l">Gastos {fmtUsd0(t.expenses)} · comisiones {fmtUsd0(t.fees)}{t.refunds ? ` · devoluciones ${fmtUsd0(t.refunds)}` : ''}</span>
            <span class="mp-sub mp-s">Comisiones {fmtUsd0(t.fees)}{t.refunds ? ` · devoluciones ${fmtUsd0(t.refunds)}` : ''}</span>
            {@render cmp(t.out, 'out')}
          </div>
          <div class="mp-fig mp-fig--net">
            <span class="mp-cap">Quedó</span>
            <span class="mp-big num" class:neg={t.net < 0}>{fmtUsd0(t.net)}</span>
            <span class="mp-sub">{t.income > 0 && t.net >= 0 ? `Te quedas ${Math.round((t.net / t.income) * 100)} de cada 100 dólares` : t.net < 0 ? 'Salió más de lo que entró' : 'Sin movimientos todavía'}</span>
            {@render cmp(t.net, 'net')}
          </div>
        </section>

        <div class="mp-seg" role="group" aria-label="Qué desglose ver">
          <button type="button" aria-pressed={side === 'in'} onclick={() => (side = 'in')}>De dónde entró</button>
          <button type="button" aria-pressed={side === 'out'} onclick={() => (side = 'out')}>En qué se fue</button>
        </div>

        <div class="mp-cols" data-side={side}>
          <div class="mp-col">
            <section class="mp-card mp-in" aria-labelledby="mp-in-h">
              <header class="mp-h"><h2 id="mp-in-h">De dónde entró</h2><span class="mp-tot num">{fmtUsd0(t.income)}</span></header>
              {#if inflow.rows.length}
                <ul class="mp-rows">
                  {#each inflow.rows as r (r.key)}
                    <li class="mp-row">
                      <span class="mp-who">
                        <span class="mp-av" style:background={entityColor(r.client_id, r.name)} aria-hidden="true">{initials(r.name)}</span>
                        <span class="mp-who__t"><span class="mp-name">{r.name}</span><small>{r.sub}{r.sub ? ' · ' : ''}<span class="num">{r.pct} %</span></small></span>
                      </span>
                      <span class="mp-bar" aria-hidden="true"><b style:width={`${r.pct}%`}></b></span>
                      <span class="mp-amt num">{fmtUsd0(r.cents)}</span>
                    </li>
                  {/each}
                </ul>
              {:else}
                <p class="mp-empty">No entró dinero en {mName}.</p>
              {/if}
              {#if showIn}
                <ul class="mp-list" aria-label={`Cobros de ${mName}, uno a uno`}>
                  {#each inflow.items as it (it.k)}
                    <li>
                      <span class="mp-d num">{dayShort(it.date)}</span>
                      <span class="mp-li__t"><span class="mp-name">{it.title}{#if it.inv}{' · '}<a href={href('finanzas', ['facturas', it.inv])}>{it.inv}</a>{/if}</span><small>{it.sub}</small></span>
                      <span class="mp-amt num" class:neg={it.cents < 0}>{formatUsd(it.cents)}</span>
                    </li>
                  {/each}
                </ul>
              {/if}
              {#if inflow.needList}
                <div class="mp-foot">
                  <button type="button" class="mp-more" aria-expanded={showIn} onclick={() => (showIn = !showIn)}>{showIn ? 'Ocultar la lista' : inflow.items.length === 1 ? 'Ver el cobro' : `Ver los ${inflow.items.length} ${data.refunds.length ? 'movimientos' : 'cobros'}`}</button>
                </div>
              {/if}
            </section>

            <section class="mp-card mp-close" aria-labelledby="mp-close-h" bind:this={closeEl} tabindex="-1">
              <header class="mp-h"><h2 id="mp-close-h">Cierre de {mName}</h2></header>
              {#if state === 'current'}
                <p class="mp-empty">El mes sigue en curso: se cierra cuando termine.{#if data.pending_review}{' '}Ya hay {plural(data.pending_review, 'movimiento importado', 'movimientos importados')} por revisar.{/if}</p>
              {:else if state === 'future'}
                <p class="mp-empty">Se podrá cerrar cuando termine.</p>
              {:else}
                <MonthClose {month} bind:blocking onchanged={changed} />
              {/if}
            </section>
            {#if state === 'closed'}{@render bill()}{/if}
          </div>

          <div class="mp-col">
            <section class="mp-card mp-out" aria-labelledby="mp-out-h">
              <header class="mp-h"><h2 id="mp-out-h">En qué se fue</h2><span class="mp-tot num">{fmtUsd0(t.out)}</span></header>
              {#if t.out > 0}
                <ul class="mp-rows">
                  {#each outflow.rows as r (r.k)}
                    <li class="mp-row mp-row--cat">
                      <span class="mp-who">
                        <span class="mp-who__t"><span class="mp-name">{r.label}</span><small>{r.count}{r.cents ? ` · ${r.pct} %` : ''}{#if r.subs.length}<span class="mp-logos" aria-hidden="true">{#each r.subs.slice(0, 6) as s (s)}<span class="mp-logo"><BrandLogo name={s} size={16} /></span>{/each}</span>{/if}</small></span>
                      </span>
                      <span class="mp-bar" aria-hidden="true">{#if r.cents}<b style:width={`${r.pct}%`}></b>{/if}</span>
                      <span class="mp-amt num">{fmtUsd0(r.cents)}</span>
                    </li>
                  {/each}
                </ul>
              {:else}
                <p class="mp-empty">No salió dinero en {mName}. Si falta algo, impórtalo en <a href={href('finanzas', ['movimientos'], { mes: month })}>Movimientos</a>.</p>
              {/if}
              {#if showOut}
                <ul class="mp-list" aria-label={`Gastos de ${mName}, uno a uno`}>
                  {#each outflow.items as it (it.k)}
                    <li>
                      <span class="mp-d num">{dayShort(it.date)}</span>
                      <span class="mp-li__t"><span class="mp-name">{it.title}{#if it.noReceipt}<span class="mp-flag">sin recibo</span>{/if}</span><small>{it.sub}</small></span>
                      <span class="mp-amt num">{formatUsd(it.cents)}</span>
                    </li>
                  {/each}
                </ul>
              {/if}
              {#if subsCents || data.estimates.length || (data.mileage && data.mileage.trips)}
                <ul class="mp-checks">
                  {#if subsCents}
                    <li><span class="mp-ck mp-ck--mute">De todo esto, {fmtUsd0(subsCents)} son cargos de suscripciones.</span></li>
                  {/if}
                  {#each data.estimates as e, k (k)}
                    <li><span class="mp-ic mp-ic--mute" aria-hidden="true">≈</span><span class="mp-ck">{e.name}: cargo estimado de {formatUsd(e.amount_cents)} <small>(aún no cuenta; se corrige solo cuando llegue su factura)</small></span></li>
                  {/each}
                  {#if data.mileage && data.mileage.trips}
                    <li><span class="mp-ic mp-ic--mute"><Icon name="car" size={16} /></span><span class="mp-ck">{plural(data.mileage.trips, 'viaje', 'viajes')} en coche, {data.mileage.miles.toLocaleString('en-US', { maximumFractionDigits: 1 })} millas{#if data.mileage.deduction_cents}{' '}<small>(deducible: {fmtUsd0(data.mileage.deduction_cents)})</small>{/if}</span></li>
                  {/if}
                </ul>
              {/if}
              <div class="mp-foot">
                {#if outflow.items.length}
                  <button type="button" class="mp-more" aria-expanded={showOut} onclick={() => (showOut = !showOut)}>{showOut ? 'Ocultar la lista' : outflow.items.length === 1 ? 'Ver el gasto' : `Ver los ${outflow.items.length} gastos`}</button>
                {/if}
                <a class="mp-link" href={href('finanzas', ['movimientos'], { mes: month })}>Abrir en Movimientos</a>
              </div>
            </section>

            {#if state !== 'closed'}{@render bill()}{/if}
          </div>
        </div>

        <p class="mp-dl-ph"><a class="b" href={`/api/admin/finance/books?view=export&month=${month}`} download><Icon name="download" size={16} />Descargar {mName} para el contador</a></p>

        <!-- Teléfono: mes anterior, la acción y mes siguiente, al alcance del pulgar -->
        <nav class="mp-bar-ph" aria-label="Moverse entre meses">
          <a class="b" href={href('finanzas', ['mes', prevKey])} aria-label={`Mes anterior: ${prevName}`}><span class="mp-flip"><Icon name="chevron" size={16} /></span>{cap(prevName.slice(0, 3))}</a>
          {#if state === 'toclose'}
            <button type="button" class="b b--primary" onclick={reviewClose}>Revisar el cierre</button>
          {:else}
            <a class="b" href={yearHref}>Ver el año</a>
          {/if}
          {#if hasNext}
            <a class="b" href={href('finanzas', ['mes', nextKey])} aria-label={`Mes siguiente: ${nextName}`}>{cap(nextName.slice(0, 3))}<Icon name="chevron" size={16} /></a>
          {:else}
            <span class="b is-off" aria-hidden="true">{cap(nextName.slice(0, 3))}<Icon name="chevron" size={16} /></span>
          {/if}
        </nav>
      {/if}
    </LoadingState>
  {/if}
</div>

{#snippet cmp(value, key)}
  {@const outward = key === 'out'}
  {@const d1 = base && state !== 'future' ? delta(value, base[key]) : null}
  {@const d2 = ly && state !== 'future' ? delta(value, ly[key]) : null}
  {#if d1 !== null || d2 !== null}
    <span class="mp-cmp">
      {#if d1 !== null}<span class={(outward ? d1 > 0 : d1 < 0) ? 'down' : d1 === 0 ? '' : 'up'}>{fmtPct(d1)}</span> vs <span class="mp-l">{baseLabel}</span><span class="mp-s">{baseShort}</span>{/if}{#if d1 !== null && d2 !== null}{' · '}{/if}{#if d2 !== null}<span class={(outward ? d2 > 0 : d2 < 0) ? 'down' : d2 === 0 ? '' : 'up'}>{fmtPct(d2)}</span> vs {lyLabel}{/if}
    </span>
  {/if}
{/snippet}

{#snippet bill()}
            <section class="mp-card mp-bill" aria-labelledby="mp-bill-h">
              <header class="mp-h"><h2 id="mp-bill-h">Facturado en {mName}</h2><span class="mp-tot num">{data.invoiced.count ? `${plural(data.invoiced.count, 'factura', 'facturas')} · ${fmtUsd0(data.invoiced.cents)}` : ''}</span></header>
              <ul class="mp-checks">
                {#each data.invoiced.unpaid as i (i.id)}
                  <li>
                    <span class="mp-ic mp-ic--warn"><Icon name="alert" size={16} /></span>
                    <span class="mp-ck">{i.number} de {i.client_name || 'un cliente'} sin cobrar: <b class="num">{fmtUsd0(i.balance_cents)}</b>{#if i.due_date}{' '}<small>(vence el {fmtDay(i.due_date, { day: 'numeric', month: 'long' })})</small>{/if}</span>
                    <a class="b b--mini" href={href('finanzas', ['facturas', i.number])}>Ver factura</a>
                  </li>
                {:else}
                  <li>
                    {#if data.invoiced.count}<span class="mp-ic mp-ic--ok"><Icon name="check" size={16} /></span>{:else}<span class="mp-ic mp-ic--mute" aria-hidden="true">·</span>{/if}
                    <span class="mp-ck mp-ck--mute">{data.invoiced.count ? `Todo lo facturado en ${mName} está cobrado.` : `No se emitió ninguna factura en ${mName}.`}</span>
                  </li>
                {/each}
              </ul>
            </section>
{/snippet}

<style>
  .mp { container-type: inline-size; }
  .num { font-variant-numeric: tabular-nums; }
  .neg { color: var(--color-error); }
  .up { color: var(--delta-up); }
  .down { color: var(--delta-down); }

  .mp-back { margin-top: var(--space-4); }
  .mp-back a { display: inline-flex; align-items: center; gap: var(--space-1); min-height: 32px; font-size: var(--dash-small); color: var(--fg-secondary); text-decoration: none; }
  .mp-back a:hover { color: var(--fg-primary); }
  .mp-back a:focus-visible, .mp-arw:focus-visible, .mp-more:focus-visible, .mp-link:focus-visible, .mp-list a:focus-visible, .mp-empty a:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; border-radius: var(--radius-sm); }
  .mp-back__icon, .mp-flip { display: inline-flex; transform: rotate(180deg); }

  .mp-titlerow { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2) var(--space-3); }
  .mp-titlerow .ui-page-title { margin: 0; }
  .mp-nav { display: inline-flex; gap: var(--space-1); }
  .mp-arw { display: inline-grid; place-items: center; width: 36px; height: 36px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-card); color: var(--fg-secondary); }
  .mp-arw:hover { color: var(--fg-primary); border-color: var(--border-strong); }
  .mp-arw.is-off { opacity: .35; }
  .mp-lock { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-3); border-radius: var(--radius-pill); background: var(--surface-3); color: var(--fg-secondary); font: 500 var(--dash-caption)/1.4 var(--font-body); }

  .mp-note { margin: 0 0 var(--space-3); padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); font-size: var(--dash-small); color: var(--fg-secondary); background: var(--bg-elevated); border: 1px solid var(--border); }

  /* Cifras del mes (pieza C-06): blanco; el color solo en la comparación pequeña (E-77). */
  .mp-figs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: var(--space-4); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .mp-fig { display: flex; flex-direction: column; gap: 2px; padding: var(--space-4) var(--space-5); min-width: 0; }
  .mp-fig + .mp-fig { border-left: 1px solid var(--border); }
  .mp-cap { font: 500 var(--dash-caption)/1.2 var(--font-mono); color: var(--fg-subtle); }
  .mp-big { margin-top: var(--space-1); font-size: var(--dash-kpi); font-weight: 650; letter-spacing: -.02em; color: var(--fg-primary); line-height: 1.15; }
  .mp-big.neg { color: var(--color-error); }
  .mp-sub { font-size: var(--dash-small); color: var(--fg-secondary); }
  .mp-cmp { font-size: var(--dash-caption); color: var(--fg-subtle); }

  .mp-seg, .mp-s { display: none; }
  .mp-cols { display: grid; gap: var(--space-4); grid-template-columns: minmax(0, 1fr); }
  .mp-col { display: contents; }
  .mp-in, .mp-out { order: 1; }
  .mp-close { order: 2; }
  .mp-bill { order: 3; }
  @container (min-width: 900px) {
    .mp-cols { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
    .mp-col { display: grid; gap: var(--space-4); align-content: start; min-width: 0; }
  }

  .mp-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; min-width: 0; }
  .mp-close { scroll-margin-top: var(--space-4); }
  .mp-close:focus { outline: none; }
  .mp-close:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .mp-h { display: flex; align-items: baseline; gap: var(--space-3); padding: var(--space-4) var(--space-4) var(--space-2); }
  .mp-h h2 { margin: 0; font-size: var(--dash-card-title); font-weight: 600; letter-spacing: -.01em; color: var(--fg-primary); }
  .mp-tot { margin-left: auto; font-size: var(--dash-small); color: var(--fg-subtle); white-space: nowrap; }

  .mp-rows, .mp-list, .mp-checks { list-style: none; margin: 0; padding: 0; }
  .mp-row { display: grid; grid-template-columns: minmax(0, 1fr) 112px 88px; align-items: center; gap: var(--space-4); min-height: 48px; padding: var(--space-2) var(--space-4); border-top: 1px solid var(--border-subtle); }
  .mp-row--cat { min-height: 44px; }
  .mp-who { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
  /* auditoria-ignorar: iniciales en blanco sobre el color propio de cada cliente (paleta de lib/colors.js, hecha para texto blanco) y al tamaño de los demás avatares de Orbit (.mono-av) */
  .mp-av { flex: none; display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; color: #fff; font: 600 10px/1 var(--font-body); }
  .mp-who__t, .mp-li__t { display: flex; flex-direction: column; min-width: 0; }
  .mp-name { color: var(--fg-primary); overflow-wrap: anywhere; }
  .mp-who__t small, .mp-li__t small { font-size: var(--dash-caption); color: var(--fg-subtle); overflow-wrap: anywhere; }
  .mp-logos { display: inline-flex; gap: var(--space-1); margin-left: var(--space-2); vertical-align: -3px; }
  .mp-logo { display: inline-flex; }
  .mp-bar { height: 6px; border-radius: var(--radius-pill); background: var(--bg-elevated); overflow: hidden; }
  .mp-bar b { display: block; height: 100%; border-radius: var(--radius-pill); background: var(--fg-subtle); }
  .mp-amt { text-align: right; color: var(--fg-primary); white-space: nowrap; }
  .mp-empty { margin: 0; padding: var(--space-3) var(--space-4) var(--space-4); color: var(--fg-secondary); font-size: var(--dash-small); border-top: 1px solid var(--border-subtle); }
  .mp-empty a, .mp-list a { color: var(--fg-primary); text-underline-offset: 3px; }

  .mp-list { border-top: 1px solid var(--border); background: var(--bg-2); }
  .mp-list li { display: grid; grid-template-columns: 56px minmax(0, 1fr) auto; gap: var(--space-3); align-items: center; min-height: 48px; padding: var(--space-2) var(--space-4); border-top: 1px solid var(--border-subtle); }
  .mp-list li:first-child { border-top: 0; }
  .mp-d { font-size: var(--dash-small); color: var(--fg-secondary); }
  .mp-flag { margin-left: var(--space-2); padding: 0 var(--space-2); border-radius: var(--radius-pill); background: var(--surface-3); color: var(--color-warning); font-size: var(--dash-caption); white-space: nowrap; }

  .mp-foot { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; padding: var(--space-2) var(--space-4); border-top: 1px solid var(--border-subtle); }
  .mp-more { all: unset; cursor: pointer; min-height: 32px; display: inline-flex; align-items: center; font-size: var(--dash-small); color: var(--fg-primary); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--border-strong); }
  .mp-link { font-size: var(--dash-small); color: var(--fg-secondary); text-underline-offset: 3px; }
  .mp-link:hover, .mp-more:hover { color: var(--fg-primary); }

  /* El cierre de siempre (MonthClose) dentro de su tarjeta: sin marco doble. */
  .mp-close :global(.mc) { border: 0; border-radius: 0; border-top: 1px solid var(--border-subtle); }

  .mp-checks li { display: flex; align-items: center; gap: var(--space-3); min-height: 44px; padding: var(--space-2) var(--space-4); border-top: 1px solid var(--border-subtle); }
  .mp-ic { flex: none; display: inline-grid; place-items: center; width: 24px; height: 24px; font-weight: 600; }
  .mp-ic--warn { color: var(--color-warning); }
  .mp-ic--ok { color: var(--color-success); }
  .mp-ic--mute { color: var(--fg-subtle); }
  .mp-ck { flex: 1; min-width: 0; color: var(--fg-primary); }
  .mp-ck b { font-weight: 600; }
  .mp-ck small { color: var(--fg-subtle); font-size: var(--dash-small); }
  .mp-ck--mute { color: var(--fg-secondary); }

  .mp-bar-ph, .mp-dl-ph { display: none; }

  /* Poco ancho: la cifra que importa (quedó) a lo ancho y entró y salió debajo. */
  @container (max-width: 780px) {
    .mp-figs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .mp-fig--net { grid-column: 1 / -1; order: -1; border-bottom: 1px solid var(--border); }
    .mp-fig + .mp-fig { border-left: 0; }
    .mp-fig:nth-child(2) { border-left: 1px solid var(--border); }
  }
  /* Teléfono: un desglose a la vez y las barras fuera (su parte del total sigue
     escrita en cada fila). */
  @container (max-width: 640px) {
    .mp-l { display: none; }
    .mp-s { display: inline; }
    .mp-sub.mp-s { display: block; }
    .mp-fig { padding: var(--space-3) var(--space-4); }
    .mp-big { font-size: var(--dash-title); }
    .mp-fig--net .mp-big { font-size: var(--dash-kpi); }
    .mp-seg { display: flex; gap: 2px; margin-bottom: var(--space-3); padding: var(--space-1); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); }
    .mp-seg button { flex: 1; min-height: 40px; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--fg-secondary); font: 500 var(--dash-small)/1.2 var(--font-body); cursor: pointer; }
    .mp-seg button[aria-pressed='true'] { background: var(--surface-3); color: var(--fg-primary); }
    .mp-seg button:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
    .mp-cols[data-side='in'] .mp-out, .mp-cols[data-side='out'] .mp-in { display: none; }
    .mp-in .mp-h h2, .mp-out .mp-h h2 { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .mp-row { grid-template-columns: minmax(0, 1fr) auto; padding: var(--space-2) var(--space-3); }
    .mp-bar { display: none; }
    .mp-h, .mp-foot, .mp-checks li { padding-inline: var(--space-3); }
    .mp-list li { grid-template-columns: 48px minmax(0, 1fr) auto; padding-inline: var(--space-3); }
  }

  /* Teléfono: barra abajo (como la de acciones rápidas de Finanzas), con la zona
     segura; «Revisar el cierre» de la cabecera pasa a esta barra. */
  @media (max-width: 719px) {
    .mp-desk { display: none; }
    .mp-bar-ph { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--space-2);
      padding: var(--space-2) max(var(--space-3), env(safe-area-inset-left, 0px)) calc(var(--space-2) + env(safe-area-inset-bottom, 0px)) max(var(--space-3), env(safe-area-inset-right, 0px));
      background: var(--bg-2); border-top: 1px solid var(--border); }
    .mp-bar-ph .b { min-height: 44px; justify-content: center; }
    .mp-bar-ph .is-off { opacity: .35; pointer-events: none; }
    .mp-dl-ph { display: block; margin: var(--space-4) 0 0; }
    .mp-dl-ph .b { width: 100%; justify-content: center; min-height: 44px; }
  }
</style>
