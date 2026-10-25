<script>
  // Stepper de hitos (SVG a mano, estilo Orbit conservado: nodos, línea
  // base y guía punteada al pasar el ratón). Legible con muchos hitos y en
  // el móvil (OP-24): cada nodo tiene un ANCHO MÍNIMO fijo y el SVG nunca se
  // encoge por debajo de él; si no cabe, la tira se desplaza en horizontal
  // con un degradado en el borde que avisa de que sigue, y al cargar se
  // centra en el hito en curso. Etiquetas recortadas con el nombre completo
  // en el title. Colores = semántica única de estado (OP-32).
  import { mStatus, TONE_COLOR, truncateLabel } from './format.js';
  import { fmtDay } from '../lib/dates.js';

  let { milestones = [] } = $props();

  const NODE = 116;            // ancho MÍNIMO por nodo (px reales: el SVG nunca se escala)
  const H = 86;
  let cw = $state(0);          // ancho visible de la tira
  // Si sobran píxeles, los nodos se reparten el ancho; si faltan, se desplaza.
  const node = $derived(Math.max(NODE, Math.floor((cw - 12) / Math.max(milestones.length, 1)) || NODE));
  const W = $derived(Math.max(milestones.length, 1) * node);
  const cx = (i) => node / 2 + i * node;

  let hover = $state(-1);
  let scroller = $state(null);
  let canLeft = $state(false);
  let canRight = $state(false);

  function measure() {
    if (!scroller) return;
    canLeft = scroller.scrollLeft > 2;
    canRight = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2;
  }

  // Al cargar (o cambiar la lista), lleva a la vista el hito en curso o el
  // primero pendiente.
  $effect(() => {
    const list = milestones;
    if (!scroller || !list.length) return;
    let i = list.findIndex((m) => m.status === 'in_progress');
    if (i < 0) i = list.findIndex((m) => m.status !== 'done');
    if (i < 0) i = list.length - 1;
    const target = cx(i) - scroller.clientWidth / 2;
    scroller.scrollLeft = Math.max(0, target);
    measure();
  });

  // La tira cambia de ancho (giro del móvil, barra lateral): recalcula los degradados.
  $effect(() => { cw; W; measure(); });

  const color = (s) => TONE_COLOR[mStatus(s).tone];
</script>

<svelte:window onresize={measure} />

<div class="stp" class:can-left={canLeft} class:can-right={canRight}>
  <div class="stp__scroll" bind:this={scroller} bind:clientWidth={cw} onscroll={measure} tabindex="0" role="group"
       aria-label="Avance por hitos (desliza para ver todos)">
    <svg class="stp__svg" viewBox="0 0 {W} {H}" width={W} height={H} role="img"
         aria-label={milestones.map((m) => `${m.label}: ${mStatus(m.status).label}`).join('. ')}
         onmouseleave={() => (hover = -1)}>
      <line x1={cx(0)} y1="28" x2={cx(milestones.length - 1)} y2="28" stroke="var(--border-strong)" stroke-width="2" />
      {#each milestones as ms, i (ms.id)}
        {@const done = ms.status === 'done'}
        {@const cur = ms.status === 'in_progress'}
        {@const c = color(ms.status)}
        {#if i > 0 && milestones[i - 1].status === 'done'}
          <line x1={cx(i - 1)} y1="28" x2={cx(i)} y2="28" stroke={TONE_COLOR.success} stroke-width="2" />
        {/if}
        {#if hover === i}
          <line x1={cx(i)} y1="10" x2={cx(i)} y2={H - 4} stroke="rgba(255,255,255,.18)" stroke-width="1" stroke-dasharray="2 3" />
          <circle cx={cx(i)} cy="28" r="15" fill="none" stroke={done || cur ? c : 'var(--border-strong)'} stroke-opacity=".55" stroke-width="1.5" />
        {/if}
        <circle cx={cx(i)} cy="28" r="11"
                fill={done ? c : cur ? 'color-mix(in srgb, var(--color-info) 18%, var(--bg-card))' : 'var(--bg-elevated)'}
                stroke={done || cur ? c : 'var(--border-strong)'} stroke-width="2" />
        {#if done}
          <path d="M{cx(i) - 4.5} 28 l3 3 l6 -6.5" fill="none" stroke="var(--fg-inverse)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        {:else if cur}
          <circle cx={cx(i)} cy="28" r="3.5" fill={c} />
        {/if}
        <text x={cx(i)} y="58" text-anchor="middle" class="stp__lbl">{truncateLabel(ms.label, 15)}<title>{ms.label}</title></text>
        <text x={cx(i)} y="75" text-anchor="middle" class="stp__st" fill={done || cur ? c : 'var(--fg-subtle)'}>
          {mStatus(ms.status).label + (ms.due_date && !done ? ' · ' + fmtDay(ms.due_date, { day: 'numeric', month: 'short' }) : '')}
        </text>
        <rect x={cx(i) - node / 2} y="0" width={node} height={H} fill="transparent" role="presentation"
              onmouseenter={() => (hover = i)} />
      {/each}
    </svg>
  </div>
</div>

<style>
  .stp { position: relative; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); }
  .stp__scroll { overflow-x: auto; overflow-y: hidden; padding: 10px 6px 6px; scrollbar-width: thin; border-radius: inherit; }
  .stp__scroll:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .stp__svg { display: block; flex: 0 0 auto; }
  .stp__lbl { fill: var(--fg-primary); font-family: var(--font-body); font-size: 12px; font-weight: 600; }
  .stp__st { font-family: var(--font-body); font-size: 11px; font-weight: 500; }
  /* Degradado de borde: dice "hay más" sin añadir controles (E-19, E-30). */
  .stp::before, .stp::after { content: ''; position: absolute; top: 1px; bottom: 1px; width: 28px; pointer-events: none; opacity: 0; transition: opacity var(--duration-fast); z-index: 1; }
  .stp::before { left: 1px; border-radius: var(--radius-md) 0 0 var(--radius-md); background: linear-gradient(90deg, var(--bg-elevated), transparent); }
  .stp::after { right: 1px; border-radius: 0 var(--radius-md) var(--radius-md) 0; background: linear-gradient(270deg, var(--bg-elevated), transparent); }
  .stp.can-left::before, .stp.can-right::after { opacity: 1; }
</style>
