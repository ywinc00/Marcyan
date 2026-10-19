<script>
  // Ingresos por mes (por fecha de pago): el gráfico de barras de Orbit hecho
  // a mano, con su barra activa y su guía. FIN-16: colores SOLO con tokens
  // (antes había naranjas y grises sueltos). FIN-15: si los 6 meses están en
  // $0 se ve el vacío con salida, no un gráfico de ceros. El tooltip responde
  // también al dedo (pointer events), no solo al ratón.
  import Card from '../ui/Card.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import { formatUsd, fmtUsdShort, monthShort, monthLong, niceAxisMax } from './fin.js';

  // revenue: [{ month:'YYYY-MM', total_cents }] · delta: % vs el mismo tramo del mes anterior (o null)
  let { revenue = [], delta = null, prevLabel = '' } = $props();

  const hasRevenue = $derived(revenue.some((r) => Number(r.total_cents) > 0));
  const chartMax = $derived(Math.max(1, ...revenue.map((r) => Math.max(0, +r.total_cents || 0))));
  // Tope redondo del eje: marcas legibles ($500, $1K, $1.5K), no tercios sueltos.
  const axisMax = $derived(niceAxisMax(chartMax, 3));

  let hoverIdx = $state(-1);
  const CW = 560, CH = 200, TOP = 38, BASE = 160, PLOT = BASE - TOP;
  const BAR_MAX = 56;
  const bandW = () => CW / Math.max(1, revenue.length);
  const barW = () => Math.min(bandW() * 0.5, BAR_MAX);
  const barCx = (i) => i * bandW() + bandW() / 2;
  const barX = (i) => barCx(i) - barW() / 2;
  const barH = (c) => Math.max(0, (Number(c || 0) / axisMax) * PLOT);
  const barY = (c) => BASE - barH(c);

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width) return;
    const i = Math.floor((((e.clientX - r.left) / r.width) * CW) / bandW());
    hoverIdx = i >= 0 && i < revenue.length ? i : -1;
  }
  function onLeave(e) { if (e.pointerType !== 'touch') hoverIdx = -1; }

  const activeIdx = $derived(!hasRevenue ? -1 : (hoverIdx >= 0 ? hoverIdx : revenue.length - 1));
  const activeRow = $derived(activeIdx >= 0 ? revenue[activeIdx] : null);
  const isLast = $derived(activeIdx === revenue.length - 1);
</script>

<Card caption="Ingresos por mes · por fecha de pago">
  {#if !hasRevenue}
    <EmptyState art="chart-up" compact title="Aún no hay ingresos en los últimos 6 meses"
      text="Cuando registres un pago en una factura, aparecerá aquí en su mes." />
  {:else}
    <div class="rc-head">
      <div>
        <p class="rc-amount">{formatUsd(activeRow ? activeRow.total_cents : 0)}</p>
        <p class="rc-sub">
          <span class="rc-month">{activeRow ? monthLong(activeRow.month) : ''}{isLast ? ' (mes en curso)' : ''}</span>
          {#if isLast && delta !== null}
            <span class:rc-up={delta >= 0} class:rc-down={delta < 0}>{delta >= 0 ? '+' : ''}{delta}%</span>
            <span>vs el mismo tramo de {prevLabel}</span>
          {/if}
        </p>
      </div>
      <span class="rc-legend"><span class="rc-legend__dot"></span>Mes activo</span>
    </div>
    <div class="rc-wrap">
      <svg class="rc" viewBox="0 0 {CW} {CH}" role="img" aria-label="Ingresos de los últimos 6 meses"
        onpointermove={onMove} onpointerdown={onMove} onpointerleave={onLeave}>
        <defs>
          <linearGradient id="finBarActive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style="stop-color: var(--accent-gold-hover)" />
            <stop offset="1" style="stop-color: var(--accent-gold-deep)" />
          </linearGradient>
          <filter id="finBarGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" style="flood-color: var(--accent-gold); flood-opacity: 0.55" />
          </filter>
        </defs>
        {#each [0, 1, 2, 3] as g}
          {@const gy = TOP + (PLOT / 3) * g}
          <line x1="0" y1={gy} x2={CW} y2={gy} class={g === 3 ? 'rc-base' : 'rc-grid'} />
          <text x="2" y={gy - 5} class="rc-axis">{fmtUsdShort(axisMax - (axisMax / 3) * g)}</text>
        {/each}
        {#if activeRow}
          <line x1="0" y1={barY(activeRow.total_cents)} x2={CW} y2={barY(activeRow.total_cents)} class="rc-guide" />
        {/if}
        {#each revenue as a, i (a.month)}
          {@const active = i === activeIdx}
          <rect x={barX(i)} y={barY(a.total_cents)} width={barW()} height={barH(a.total_cents)} rx="7"
            class="rc-bar" class:is-active={active}
            fill={active ? 'url(#finBarActive)' : undefined}
            filter={active ? 'url(#finBarGlow)' : undefined} />
          <text x={barCx(i)} y={CH - 5} text-anchor="middle" class="rc-lbl" class:is-active={active}>{monthShort(a.month)}</text>
        {/each}
        {#if activeRow}
          <circle cx={barCx(activeIdx)} cy={barY(activeRow.total_cents)} r="4" class="rc-dot" />
        {/if}
      </svg>
      {#if activeRow}
        <span class="chart-tip" style="left:{(barCx(activeIdx) / CW) * 100}%;top:{(barY(activeRow.total_cents) / CH) * 100}%">{formatUsd(activeRow.total_cents)}</span>
      {/if}
    </div>
  {/if}
</Card>

<style>
  .rc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: var(--space-3); }
  .rc-amount { margin: 0; font-size: var(--dash-kpi); font-weight: 650; line-height: 1; letter-spacing: var(--tracking-tight); color: var(--fg-primary); font-variant-numeric: tabular-nums; }
  .rc-sub { margin: 8px 0 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: var(--dash-small); color: var(--fg-subtle); }
  .rc-month { color: var(--fg-secondary); }
  .rc-up { color: var(--accent-teal); font-weight: 600; }
  .rc-down { color: var(--color-error); font-weight: 600; }
  .rc-legend { display: inline-flex; align-items: center; gap: 6px; font-size: var(--dash-caption); color: var(--fg-subtle); white-space: nowrap; }
  .rc-legend__dot { width: 9px; height: 9px; border-radius: 3px; background: linear-gradient(180deg, var(--accent-gold-hover), var(--accent-gold-deep)); }
  .rc-wrap { position: relative; }
  .rc { width: 100%; height: auto; display: block; cursor: crosshair; touch-action: pan-y; }
  .rc-bar { fill: var(--chart-idle-top); transition: y .18s ease, height .18s ease; }
  .rc-lbl { fill: var(--fg-subtle); font-size: 11px; }
  .rc-lbl.is-active { fill: var(--fg-primary); font-weight: 700; }
  .rc-axis { fill: var(--fg-subtle); font-size: 9px; }
  .rc-grid { stroke: var(--border); stroke-dasharray: 3 4; }
  .rc-base { stroke: var(--border-strong); }
  .rc-guide { stroke: var(--accent-gold-line); stroke-dasharray: 4 4; }
  .rc-dot { fill: var(--accent-gold); stroke: var(--bg-card); stroke-width: 2.5; }
  @media (max-width: 719px) {
    .rc-amount { font-size: 26px; }
    .rc-lbl { font-size: 15px; }
    .rc-axis { font-size: 13px; }
  }
</style>
