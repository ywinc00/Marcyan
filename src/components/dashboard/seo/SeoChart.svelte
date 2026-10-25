<script>
  // Gráfico de línea diario de Search Console (estilo Orbit aprobado: línea
  // de 2 px, área con degradado del color, cuadrícula discontinua, guía y
  // punto al apuntar). Lo que cambia (SEO-10, SEO-11):
  //   · eje Y con escala (0, mitad y máximo redondeados);
  //   · un punto por DÍA real del rango: los días sin fila valen 0 y los que
  //     Google aún no publica quedan como hueco sombreado y rotulado;
  //   · tooltip con ratón, toque (pointer events) y teclado (flechas), que no
  //     se sale por los bordes.
  import { niceScale } from '../../../../lib/seo-core.mjs';
  import { nfmt, axisNum, dayShort, dayRangeShort } from './format.js';

  let {
    series = [],          // [{ date, v (número | null), pending }]
    tone = 'accent',      // 'accent' (naranja) | 'data' (verde)
    unit = 'clics',       // texto del tooltip (plural)
    unitOne = '',         // singular ('clic'); sin él se usa el plural
    label = '',           // nombre accesible del gráfico
    pendingLabel = 'Google aún no publica estos días',
  } = $props();

  // El lienzo mide lo mismo que su caja (1 unidad = 1 px): los rótulos se
  // leen a 11 px también en el teléfono, en vez de encogerse con el SVG.
  let boxW = $state(560);
  const VBW = $derived(Math.max(260, Math.round(boxW || 560)));
  const VBH = $derived(VBW < 480 ? 180 : 210);
  const PAD_R = 8, PAD_T = 14, PAD_B = 26;
  const uid = 'sc' + Math.random().toString(36).slice(2, 8);
  const color = $derived(tone === 'data' ? 'var(--accent-teal)' : 'var(--accent-gold)');

  const n = $derived(series.length);
  const values = $derived(series.map((p) => p.v).filter((v) => v != null));
  const scale = $derived(niceScale(values.length ? Math.max(...values) : 0));
  // A6-R6: el margen izquierdo se mide con el rótulo más largo del eje
  // (mono de 11 px ≈ 6,7 px por carácter + 8 de separación + 4 de aire), con
  // el mínimo de siempre (40) para no mover los gráficos de números cortos.
  const yLabels = $derived(scale.ticks.map((t) => ({ t, s: axisNum(t) })));
  const PAD_L = $derived(Math.max(40, Math.ceil(Math.max(0, ...yLabels.map((l) => l.s.length)) * 6.7) + 12));
  const innerW = $derived(VBW - PAD_L - PAD_R);
  const innerH = $derived(VBH - PAD_T - PAD_B);
  const step = $derived(n > 1 ? innerW / (n - 1) : 0);
  function x(i) { return n <= 1 ? PAD_L + innerW / 2 : PAD_L + i * step; }
  function y(v) { return PAD_T + innerH - (v / scale.max) * innerH; }

  // Tramos continuos (un día pendiente corta la línea).
  const segments = $derived.by(() => {
    const out = [];
    let cur = [];
    series.forEach((p, i) => {
      if (p.v == null) { if (cur.length) out.push(cur); cur = []; return; }
      cur.push({ x: x(i), y: y(p.v) });
    });
    if (cur.length) out.push(cur);
    return out;
  });
  const lines = $derived(segments.map((seg) => seg.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')));
  const areas = $derived(segments.map((seg, k) => {
    const base = (PAD_T + innerH).toFixed(1);
    if (seg.length === 1) return '';
    return `${lines[k]} L${seg[seg.length - 1].x.toFixed(1)},${base} L${seg[0].x.toFixed(1)},${base} Z`;
  }));

  // Zona de días pendientes (desde el primero hasta el final).
  const firstPending = $derived(series.findIndex((p) => p.pending));
  const pendingRect = $derived.by(() => {
    if (firstPending < 0) return null;
    const x0 = firstPending === 0 ? PAD_L : x(firstPending) - step / 2;
    return { x: x0, w: VBW - PAD_R - x0 };
  });

  // Rótulos del eje X: primer día, mitad y último, con el mismo día corto
  // que el resto de la tarjeta ('3 oct'), no DD/MM (A6-R6).
  const xLabels = $derived.by(() => {
    if (!n) return [];
    if (n === 1) return [{ i: 0, t: dayShort(series[0].date), a: 'middle' }];
    const mid = Math.floor((n - 1) / 2);
    return [
      { i: 0, t: dayShort(series[0].date), a: 'start' },
      { i: mid, t: dayShort(series[mid].date), a: 'middle' },
      { i: n - 1, t: dayShort(series[n - 1].date), a: 'end' },
    ];
  });

  // ── Interacción ──
  let idx = $state(-1);
  const lastReal = $derived.by(() => { for (let i = n - 1; i >= 0; i--) if (series[i].v != null) return i; return -1; });
  const hovered = $derived(idx >= 0 && idx < n ? series[idx] : null);

  function nearest(evt) {
    const svg = evt.currentTarget;
    const r = svg.getBoundingClientRect();
    if (!r.width || !n) return -1;
    const xs = ((evt.clientX - r.left) / r.width) * VBW;
    if (n === 1) return 0;
    return Math.max(0, Math.min(n - 1, Math.round((xs - PAD_L) / step)));
  }
  function onMove(e) { idx = nearest(e); }
  function onLeave(e) { if (e.pointerType === 'mouse') idx = -1; }
  function onKey(e) {
    if (!n) return;
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'Home' || k === 'End') {
      e.preventDefault();
      const base = idx < 0 ? lastReal : idx;
      if (k === 'ArrowLeft') idx = Math.max(0, base - 1);
      else if (k === 'ArrowRight') idx = Math.min(n - 1, base + 1);
      else if (k === 'Home') idx = 0;
      else idx = n - 1;
    } else if (k === 'Escape') idx = -1;
  }

  // Tooltip acotado a la caja: en el 15 % de cada borde se alinea hacia dentro.
  const tip = $derived.by(() => {
    if (!hovered) return null;
    const px = x(idx);
    const py = hovered.v == null ? PAD_T + innerH / 2 : y(hovered.v);
    const fx = px / VBW;
    return {
      left: fx * 100, top: (py / VBH) * 100,
      align: fx < 0.15 ? 'start' : fx > 0.85 ? 'end' : 'mid',
      below: py / VBH < 0.28,
    };
  });
  const liveText = $derived(hovered ? `${dayShort(hovered.date)}: ${hovered.v == null ? 'sin datos todavía' : nfmt(hovered.v) + ' ' + (hovered.v === 1 && unitOne ? unitOne : unit)}` : '');
</script>

<div class="sc-box" bind:clientWidth={boxW}>
  {#if tip}
    <span class="chart-tip sc-tip sc-tip--{tip.align}" class:sc-tip--below={tip.below} style="left:{tip.left}%;top:{tip.top}%">
      {#if hovered.v == null}
        Sin datos todavía
      {:else}
        <strong>{nfmt(hovered.v)}</strong> {hovered.v === 1 && unitOne ? unitOne : unit}
      {/if}
      <span class="sc-tip__d">{dayShort(hovered.date)}</span>
    </span>
  {/if}
  <!-- Un deslizador por los días: con flechas, toque o ratón se elige un día. -->
  <svg
    class="sc" viewBox="0 0 {VBW} {VBH}" role="slider" tabindex="0"
    aria-label="{label}. Usa las flechas para recorrer los días."
    aria-valuemin="0" aria-valuemax={Math.max(0, n - 1)} aria-valuenow={Math.max(0, idx < 0 ? lastReal : idx)}
    aria-valuetext={liveText || undefined}
    onpointermove={onMove} onpointerdown={onMove} onpointerleave={onLeave}
    onkeydown={onKey} onfocus={() => { if (idx < 0) idx = lastReal; }} onblur={() => (idx = -1)}
  >
    <defs>
      <linearGradient id="{uid}-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color={color} stop-opacity="0.30" />
        <stop offset="1" stop-color={color} stop-opacity="0" />
      </linearGradient>
    </defs>

    {#if pendingRect}
      <rect x={pendingRect.x} y={PAD_T} width={pendingRect.w} height={innerH} class="sc__pending" />
    {/if}

    {#each yLabels as l (l.t)}
      <line x1={PAD_L} y1={y(l.t)} x2={VBW - PAD_R} y2={y(l.t)} class="sc__grid" />
      <text x={PAD_L - 8} y={y(l.t) + 4} text-anchor="end" class="sc__lbl">{l.s}</text>
    {/each}

    {#each areas as d, k (k)}{#if d}<path d={d} fill="url(#{uid}-fill)" stroke="none" />{/if}{/each}
    {#each lines as d, k (k)}<path d={d} fill="none" stroke={color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />{/each}
    {#each segments as seg, k (k)}{#if seg.length === 1}<circle cx={seg[0].x} cy={seg[0].y} r="2.5" fill={color} />{/if}{/each}

    {#if hovered}
      <line x1={x(idx)} y1={PAD_T - 6} x2={x(idx)} y2={PAD_T + innerH} class="sc__guide" />
      {#if hovered.v != null}
        <circle cx={x(idx)} cy={y(hovered.v)} r="5" fill={color} stroke="var(--bg-card)" stroke-width="2" />
      {/if}
    {:else if lastReal >= 0}
      <circle cx={x(lastReal)} cy={y(series[lastReal].v)} r="3.5" fill={color} />
    {/if}

    {#each xLabels as l (l.i)}
      <text x={x(l.i)} y={VBH - 7} text-anchor={l.a} class="sc__lbl">{l.t}</text>
    {/each}
  </svg>
  {#if firstPending >= 0}
    <p class="sc-legend"><span class="sc-legend__sw" aria-hidden="true"></span>{pendingLabel}: {dayRangeShort(series[firstPending].date, series[n - 1].date)}</p>
  {/if}
</div>

<style>
  .sc-box { position: relative; }
  .sc { width: 100%; height: auto; display: block; touch-action: pan-y; cursor: crosshair; border-radius: var(--radius-sm); }
  .sc:focus { outline: none; }
  .sc:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 4px; }
  .sc__lbl { fill: var(--fg-subtle); font-family: var(--font-mono); font-size: 11px; }
  .sc__grid { stroke: var(--border); stroke-dasharray: 3 4; }
  .sc__guide { stroke: var(--border-strong); stroke-dasharray: 3 4; stroke-width: 1; }
  .sc__pending { fill: var(--bg-elevated); opacity: .55; }
  .sc-legend { display: flex; align-items: center; gap: 8px; margin: 8px 0 0; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .sc-legend__sw { width: 12px; height: 10px; border-radius: 2px; background: var(--bg-elevated); border: 1px solid var(--border); flex: 0 0 auto; }
  /* El tooltip base (.chart-tip) vive en dashboard.css; aquí solo se acota
     a la caja: en los bordes se alinea hacia dentro y arriba baja bajo el punto. */
  .sc-tip { line-height: 1.25; }
  .sc-tip--start { transform: translate(-10px, -120%); }
  .sc-tip--end { transform: translate(calc(-100% + 10px), -120%); }
  .sc-tip--mid.sc-tip--below { transform: translate(-50%, 24px); }
  .sc-tip--start.sc-tip--below { transform: translate(-10px, 24px); }
  .sc-tip--end.sc-tip--below { transform: translate(calc(-100% + 10px), 24px); }
  .sc-tip__d { display: block; font-weight: 400; color: var(--fg-subtle); font-size: 11px; margin-top: 2px; }
</style>
