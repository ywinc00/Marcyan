<script>
  // ─────────────────────────────────────────────────────────────
  // Inicio (#/inicio): "¿qué necesita mi atención hoy?".
  // Sale de DashboardApp tal cual estaba (A0): misma información, ahora
  // enchufada al cliente HTTP único, a las fechas de Houston y a las
  // primitivas. Las cifras veraces (leads de este mes, proyectos activos
  // reales, cobrado del mes) llegan en A1.
  // ─────────────────────────────────────────────────────────────
  import { onMount } from 'svelte';
  import PageHeader from './ui/PageHeader.svelte';
  import KpiGrid from './ui/KpiGrid.svelte';
  import Kpi from './ui/Kpi.svelte';
  import StatusChip from './ui/StatusChip.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import LoadingState from './ui/LoadingState.svelte';
  import Icon from './ui/Icon.svelte';
  import { data, loadHome, loadLeads, loadProjects } from './lib/store.svelte.js';
  import { fmtDate, hourInHouston, todayISO } from './lib/dates.js';
  import { href } from './lib/router.svelte.js';

  let { user = '' } = $props();

  const home = $derived(data.home);
  const leads = $derived(data.leads);
  const projects = $derived(data.projects);

  // Índice de barra resaltada en el gráfico (hover). Por defecto, el mes actual.
  let hoverBar = $state(-1);

  const MONTH_LABELS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  function monthLabel(m) { return m ? (MONTH_LABELS[parseInt(m.slice(5, 7), 10) - 1] || m) : ''; }
  const activity = $derived(home && Array.isArray(home.activity) ? home.activity : []);
  // Barra "activa": la que tiene el cursor encima, o el mes actual si no hay hover.
  // Si no hay datos, queda en -1 (el bloque del gráfico no se renderiza).
  const activeBar = $derived(
    activity.length === 0 ? -1
    : hoverBar >= 0 && hoverBar < activity.length ? hoverBar
    : activity.length - 1
  );
  // Escala "bonita" del eje Y: ticks redondeados por encima del máximo real
  // para que las etiquetas del eje derecho sean números limpios (Orbit).
  const yTop = $derived.by(() => {
    const m = Math.max(...activity.map((a) => a.total || 0), 0);
    if (m <= 0) return 4;            // datos vacíos → eje 0..4 (no rompe)
    const pow = Math.pow(10, Math.floor(Math.log10(m)));
    const n = Math.ceil(m / pow) * pow;
    return n === m ? n + pow / 2 : n; // un respiro sobre el pico
  });
  // 4 etiquetas de eje (arriba→abajo) — enteras y crecientes.
  const yTicks = $derived([yTop, yTop * 0.75, yTop * 0.5, yTop * 0.25].map((v) => Math.round(v)));

  // ── Embudo (pills decrecientes Orbit) ────────────────────────
  const funnelRows = $derived(home ? [
    { name: 'Nuevos',      n: home.funnel.new       },
    { name: 'Contactados', n: home.funnel.contacted },
    { name: 'Convertidos', n: home.funnel.converted },
    { name: 'Archivados',  n: home.funnel.archived  },
  ] : []);
  const funnelMax = $derived(home
    ? Math.max(1, home.funnel.new, home.funnel.contacted, home.funnel.converted, home.funnel.archived)
    : 1);
  // Ancho decreciente garantizado (cada etapa nunca más ancha que la anterior),
  // con piso para que no desaparezca; la pill global aplica además min-width.
  function funnelW(i) {
    if (!funnelRows.length) return 100;
    const raw = funnelRows.map((r) => Math.round((r.n / funnelMax) * 100));
    let cap = 100;
    const out = raw.map((v) => { const w = Math.min(v, cap); cap = w; return Math.max(w, 34); });
    return out[i];
  }

  // ── Sparkline: actividad acumulada en los 6 meses ────────────
  const sparkPoints = $derived.by(() => {
    if (!activity.length) return [];
    let acc = 0;
    return activity.map((a) => (acc += (a.total || 0)));
  });
  const sparkTotal = $derived(sparkPoints.length ? sparkPoints[sparkPoints.length - 1] : 0);
  const SPARK_W = 560, SPARK_H = 150;
  // Devuelve line/area + coordenadas del último punto (dot final).
  // n===1 → traza una línea plana en la base para que no quede vacío.
  const sparkPath = $derived.by(() => {
    const n = sparkPoints.length;
    if (n === 0) return { line: '', area: '', dot: null };
    const max = Math.max(1, ...sparkPoints);
    const yOf = (v) => SPARK_H - 8 - (v / max) * (SPARK_H - 24);
    if (n === 1) {
      const y = yOf(sparkPoints[0]).toFixed(1);
      const line = `M0 ${y} L${SPARK_W} ${y}`;
      const area = `M0 ${SPARK_H} L0 ${y} L${SPARK_W} ${y} L${SPARK_W} ${SPARK_H} Z`;
      return { line, area, dot: { x: SPARK_W, y: +y } };
    }
    const step = SPARK_W / (n - 1);
    const xy = sparkPoints.map((v, i) => [i * step, yOf(v)]);
    const line = xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = 'M0 ' + SPARK_H + ' ' + line.replace(/^M/, 'L') + ' L' + SPARK_W + ' ' + SPARK_H + ' Z';
    const last = xy[xy.length - 1];
    return { line, area, dot: { x: last[0], y: last[1] } };
  });

  // ── Proyectos recientes (Orbit table) ────────────────────────
  const recentProjects = $derived(projects.slice(0, 6));
  const PROJECT_STATUS = {
    active:    { label: 'En curso',   tone: 'accent'  },
    on_hold:   { label: 'En pausa',   tone: 'neutral' },
    completed: { label: 'Terminado',  tone: 'data'    },
    cancelled: { label: 'Cancelado',  tone: 'neutral' },
  };
  function projStatus(s) { return PROJECT_STATUS[s] || { label: s || 'Sin estado', tone: 'neutral' }; }
  function initials(s) {
    const parts = (s || '?').trim().split(/[\s—-]+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  // Color determinista para el monograma (paleta sobria, texto blanco).
  const MONO_PALETTE = ['#6366f1', '#0ea5e9', '#14b8a6', '#f97316', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];
  function monoColor(s) {
    let h = 0; const t = s || '?';
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
    return MONO_PALETTE[Math.abs(h) % MONO_PALETTE.length];
  }

  // Origen del lead: chip neutro salvo chatbot (dato) y diagnóstico (info).
  // El naranja ya no se gasta en chips de origen (H-07).
  const SOURCES = {
    chat:       { label: 'Chatbot',     tone: 'data'    },
    diagnostic: { label: 'Diagnóstico', tone: 'info'    },
    contact:    { label: 'Contacto',    tone: 'neutral' },
  };
  function sourceMeta(s) { return SOURCES[s] || SOURCES.contact; }

  // ── Saludo según la hora de Houston ──────────────────────────
  // El nombre solo si la parte local del correo parece un nombre (letras):
  // "Buenas tardes, ywinc00" no saluda a nadie (SH-21).
  const firstName = $derived.by(() => {
    const local = (user || '').split('@')[0] || '';
    if (!/^[a-záéíóúñü]{2,}$/i.test(local)) return '';
    return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
  });
  const greeting = $derived.by(() => {
    const h = hourInHouston();
    if (h < 12) return 'Buenos días';
    if (h < 20) return 'Buenas tardes';
    return 'Buenas noches';
  });

  // ── Exportar leads a CSV (cliente) ──────────────────────────
  // Mismas dos protecciones que el serializador del servidor (lib/csv.mjs):
  //  · los datos vienen de formularios PÚBLICOS: un texto que empieza por
  //    = + - @ tabulador o retorno de carro se ejecutaría como fórmula en
  //    Excel/Sheets (=HYPERLINK(…)); se le antepone una comilla simple.
  //  · BOM UTF-8 al inicio para que Excel de Windows lea bien las tildes.
  const CSV_BOM = '﻿';
  function csvCell(v) {
    let s = v == null ? '' : String(v);
    if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function exportLeads() {
    const cols = ['ref_id', 'name', 'email', 'phone', 'source', 'status', 'created_at'];
    const head = cols.join(',');
    const body = (leads || []).map((l) => cols.map((c) => csvCell(l[c])).join(',')).join('\r\n');
    const blob = new Blob([CSV_BOM + head + '\r\n' + body + '\r\n'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads-' + todayISO() + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const kpiVal = (v) => (home?.kpis && v != null ? v : '—');

  // Al volver al inicio con datos ya cargados, se refrescan en silencio
  // (las cifras viejas se ven mientras llegan las nuevas; SH-08).
  onMount(() => { if (data.home) { loadHome(); loadProjects(); } });
</script>

<PageHeader title={firstName ? `${greeting}, ${firstName}` : greeting}>
  {#snippet actions()}
    <button class="b" onclick={exportLeads} disabled={!leads.length} title={leads.length ? '' : 'No hay leads para exportar'}>
      <Icon name="download" size={16} />Exportar leads
    </button>
  {/snippet}
</PageHeader>

{#if data.homeError && !home}
  <div class="block"><ErrorState title="No se pudieron cargar las cifras" message={data.homeError} onretry={loadHome} /></div>
{/if}

<!-- ── KPIs: número grande + nota + arte de esquina glossy (KpiArt) ── -->
<KpiGrid count={4} label="Resumen">
  <!-- Sin cifras (cargando o error) las notas callan: no se afirma nada que no se sabe. -->
  <Kpi label="Leads nuevos" value={kpiVal(home?.kpis?.new_leads)} art="inbox" tone={home ? 'accent' : ''} href={href('leads')}>
    {#if !home}&nbsp;{:else if home.kpis?.new_leads}<span class="is-data">+{home.kpis.new_leads}</span> este mes
    {:else}aún sin leads este mes{/if}
  </Kpi>
  <Kpi label="Briefs pendientes" value={kpiVal(home?.kpis?.pending_briefs)} art="docs" note={home ? 'en cola de revisión' : ' '} href={href('briefs')} />
  <Kpi label="En curso (mes)" value={kpiVal(home?.kpis?.projects_this_month)} art="clock" note={home ? 'proyectos activos' : ' '} href={href('progreso')} />
  <Kpi label="Cobrado (mes)" value={kpiVal(home?.kpis?.revenue_this_month)} art="coins" tone={home ? 'data' : ''} href={href('finanzas')}
    note={!home ? ' ' : home.kpis?.revenue_this_month != null ? 'cobrado este mes' : 'sin cobros registrados este mes'} />
</KpiGrid>

<!-- ── Fila 1: gráfico interactivo (ancho) + proyectos recientes ── -->
<div class="grid-2 grid-2--chart">
  <article class="ui-card">
    <header class="card__head">
      <div>
        <p class="card__lbl">Actividad por mes</p>
        <h2 class="card__amount">{!home ? '—' : activeBar >= 0 ? (activity[activeBar]?.total ?? 0) : 0} <span class="muted">{activeBar >= 0 ? monthLabel(activity[activeBar]?.month) : ''}</span></h2>
      </div>
      <StatusChip tone="neutral" label="leads + briefs" />
    </header>

    {#if !home && data.homeError}
      <EmptyState compact text="Sin datos mientras no carguen las cifras." />
    {:else if !home}
      <LoadingState loading={true} label="Cargando actividad">
        {#snippet skeleton()}<div class="ui-skel" style="height:196px"></div>{/snippet}
      </LoadingState>
    {:else if activity.length === 0}
      <EmptyState art="chart-up" text="Sin actividad todavía. Aparecerá aquí cuando lleguen leads o briefs." />
    {:else}
      <!-- VW=viewBox · PR=carril derecho de números · PW=plot útil · PLOT=alto de barras -->
      {@const N = activity.length}
      {@const VW = 600}
      {@const PR = 40}
      {@const PW = VW - PR}
      {@const PLOT = 150}
      {@const slot = PW / N}
      {@const bw = Math.min(56, slot * 0.5)}
      <div class="plot">
        {#if hoverBar >= 0 && hoverBar < N}
          {@const hx = (hoverBar * slot + slot / 2) / VW * 100}
          {@const hy = (PLOT - (activity[hoverBar].total / yTop) * (PLOT - 18)) / 196 * 100}
          <span class="chart-tip" style="left:{hx}%;top:{hy}%">{activity[hoverBar].total}</span>
        {/if}
        <svg class="chart" viewBox="0 0 {VW} 196" role="img" aria-label="Actividad por mes" onmouseleave={() => (hoverBar = -1)}>
          <defs>
            <linearGradient id="barActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style="stop-color:var(--accent-gold-hover)"/><stop offset="1" style="stop-color:var(--accent-gold-deep)"/>
            </linearGradient>
            <linearGradient id="barIdle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style="stop-color:var(--chart-idle-top)"/><stop offset="1" style="stop-color:var(--chart-idle-base)"/>
            </linearGradient>
            <filter id="barGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="6" stdDeviation="7" style="flood-color:var(--accent-gold)" flood-opacity="0.5" />
            </filter>
          </defs>

          <!-- gridlines punteadas + números del eje derecho (4 ticks) -->
          {#each yTicks as t, gi}
            {@const gy = (gi / 4) * PLOT + 6}
            <line x1="0" y1={gy} x2={VW} y2={gy} class="chart__grid" />
            <!-- placa opaca para que la rejilla "pase por detrás" del número (Orbit) -->
            {@const lw = (String(t).length * 7) + 8}
            <rect x={VW - lw} y={gy - 8} width={lw} height="16" fill="var(--bg-card)" />
            <text x={VW} y={gy + 3} text-anchor="end" class="chart__axis">{t}</text>
          {/each}
          <line x1="0" y1={PLOT} x2={PW} y2={PLOT} class="chart__base" />

          {#each activity as a, i}
            {@const cx = i * slot + slot / 2}
            {@const bx = cx - bw / 2}
            {@const bh = (Math.max(a.total, 0) / yTop) * (PLOT - 18)}
            {@const by = PLOT - bh}
            {@const isActive = i === activeBar}
            {#if isActive && a.total > 0}
              <line x1="0" y1={by} x2={PW} y2={by} class="chart__guide" />
            {/if}
            <rect
              x={bx} y={by} width={bw} height={Math.max(bh, 2)} rx="11"
              fill={isActive ? 'url(#barActive)' : 'url(#barIdle)'}
              filter={isActive ? 'url(#barGlow)' : undefined} />
            <!-- brillo especular superior (da volumen a las barras) -->
            {#if bh > 6}
              <rect x={bx + 2} y={by + 1.5} width={Math.max(bw - 4, 0)} height="2" rx="1"
                fill={isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)'} />
            {/if}
            <!-- hit area transparente para hover cómodo -->
            <rect x={i * slot} y="0" width={slot} height={PLOT} fill="transparent"
              onmouseenter={() => (hoverBar = i)} role="presentation" />
            {#if isActive && a.total > 0}
              <circle cx={cx} cy={by} r="4.5" fill="var(--accent-gold)" stroke="var(--bg-card)" stroke-width="2" />
            {/if}
            <text x={cx} y="174" text-anchor="middle" class="chart__lbl" class:is-active={isActive}>{monthLabel(a.month)}</text>
          {/each}
        </svg>
      </div>
    {/if}
  </article>

  <article class="ui-card">
    <header class="card__head card__head--row">
      <h2 class="card__title">Proyectos recientes</h2>
    </header>
    {#if data.projectsError && !recentProjects.length}
      <ErrorState compact title="No se pudieron cargar los proyectos" message={data.projectsError} onretry={loadProjects} />
    {:else if !data.projectsLoaded}
      <LoadingState loading={true} rows={4} height={50} label="Cargando proyectos" />
    {:else if recentProjects.length}
      <div class="ptable">
        <div class="ptable__head">
          <span>Proyecto</span>
          <span>Estado</span>
        </div>
        {#each recentProjects as p (p.id)}
          {@const st = projStatus(p.status)}
          <div class="prow">
            <span class="folder" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" style="fill:var(--surface-3);stroke:var(--icon-muted)" stroke-width="1.3"/><path d="M3 9h18" style="stroke:var(--icon-muted)" stroke-width="1.1"/></svg>
            </span>
            <div class="prow__main">
              <span class="prow__name">{p.name}</span>
              <span class="prow__client">
                <span class="mono-av" style="background:{monoColor(p.client_name)}">{initials(p.client_name)}</span>
                {p.client_name || 'Sin cliente'}
              </span>
              <span class="prog"><span class="prog__bar" style="width:{p.progress || 0}%"></span></span>
            </div>
            <StatusChip tone={st.tone} label={st.label} />
          </div>
        {/each}
      </div>
      <a class="ptable__more" href={href('progreso')}>Ver todos los proyectos</a>
    {:else}
      <EmptyState art="folder" text="Sin proyectos todavía.">
        {#snippet action()}<a class="b b--mini" href={href('progreso')}>Crear el primero</a>{/snippet}
      </EmptyState>
    {/if}
  </article>
</div>

<!-- ── Fila 2: embudo (pills decrecientes) + sparkline de actividad acumulada ── -->
<div class="grid-2 grid-2--funnel">
  <article class="ui-card">
    <header class="card__head">
      <div>
        <p class="card__lbl">Leads por estado</p>
        <h2 class="card__amount">{home ? (home.funnel.new + home.funnel.contacted + home.funnel.converted + home.funnel.archived) : '—'} <span class="muted">en pipeline</span></h2>
      </div>
    </header>
    {#if !home && data.homeError}
      <EmptyState compact text="Sin datos mientras no carguen las cifras." />
    {:else if !home}
      <LoadingState loading={true} label="Cargando leads por estado">
        {#snippet skeleton()}<div class="ui-skel" style="height:168px"></div>{/snippet}
      </LoadingState>
    {:else}
      <div class="funnel">
        {#each funnelRows as row, i}
          <div class="funnel__row">
            <span class="funnel__pill" class:funnel__pill--accent={i === 0 && row.n > 0} style="--w:{funnelW(i)}%">{row.name}</span>
            <span class="funnel__n">{row.n}</span>
          </div>
        {/each}
      </div>
    {/if}
  </article>

  <article class="ui-card">
    <header class="card__head">
      <div>
        <p class="card__lbl">Actividad acumulada</p>
        <h2 class="card__amount big">{home ? sparkTotal : '—'} <span class="muted">en 6 meses</span></h2>
      </div>
    </header>
    {#if !home && data.homeError}
      <EmptyState compact text="Sin datos mientras no carguen las cifras." />
    {:else if !home}
      <LoadingState loading={true} label="Cargando actividad acumulada">
        {#snippet skeleton()}<div class="ui-skel" style="height:150px"></div>{/snippet}
      </LoadingState>
    {:else if sparkPath.line}
      <div class="spark-wrap">
        <svg class="spark" viewBox="0 0 {SPARK_W} {SPARK_H}" preserveAspectRatio="none" role="img" aria-label="Actividad acumulada">
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style="stop-color:var(--accent-gold)" stop-opacity="0.42"/>
              <stop offset="1" style="stop-color:var(--accent-gold)" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path d={sparkPath.area} fill="url(#sparkFill)" />
          <path d={sparkPath.line} fill="none" style="stroke:var(--accent-gold)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
        </svg>
        <!-- Dot final como overlay HTML (no se deforma por preserveAspectRatio=none) -->
        {#if sparkPath.dot}
          <span class="spark-dot" style="left:{sparkPath.dot.x / SPARK_W * 100}%;top:{sparkPath.dot.y / SPARK_H * 100}%"></span>
        {/if}
      </div>
    {:else}
      <EmptyState art="chart-up" text="La curva aparece con el primer mes de datos." />
    {/if}
  </article>
</div>

<!-- ── Leads recientes (compacto) ── -->
<article class="ui-card block-top">
  <header class="card__head card__head--row">
    <h2 class="card__title">Leads recientes</h2>
    <a class="link-btn" href={href('leads')}>Ver todos</a>
  </header>
  {#if data.leadsError && !leads.length}
    <ErrorState compact title="No se pudieron cargar los leads" message={data.leadsError} onretry={loadLeads} />
  {:else if !data.leadsLoaded}
    <LoadingState loading={true} rows={3} height={36} label="Cargando leads" />
  {:else if leads.length}
    <div class="recent">
      {#each leads.slice(0, 5) as lead (lead.ref_id)}
        {@const src = sourceMeta(lead.source)}
        <div class="recent__row">
          <span class="mono-av sm" style="background:{monoColor(lead.name || lead.email || lead.ref_id)}">{initials(lead.name || lead.email || lead.ref_id)}</span>
          <span class="recent__name">{lead.name || lead.email || lead.phone || 'Sin nombre'}</span>
          <StatusChip tone={src.tone} label={src.label} />
          <span class="dim">{fmtDate(lead.created_at)}</span>
        </div>
      {/each}
    </div>
  {:else}
    <EmptyState compact text="Sin leads todavía. Cuando alguien use el formulario de contacto o el chatbot, aparecerá aquí." />
  {/if}
</article>

<style>
  .block { margin-bottom: var(--space-4); }
  .block-top { margin-top: 18px; }

  /* ── Grids densos de cards (proporciones exactas Orbit) ── */
  .grid-2 { display: grid; gap: 14px; margin-top: 18px; }
  .grid-2--chart { grid-template-columns: 1.4fr 1fr; margin-top: 0; }
  .grid-2--funnel { grid-template-columns: 1fr 1.6fr; }
  .card__head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); margin-bottom: 18px; }
  .card__head--row { align-items: center; margin-bottom: var(--space-2); }
  .card__lbl { margin: 0 0 6px; color: var(--fg-secondary); font-size: 13px; font-weight: 500; }
  .card__title { margin: 0; font-size: var(--dash-card-title); font-weight: 600; color: var(--fg-primary); }
  .card__amount { margin: 0; font-family: var(--font-display); font-size: 28px; font-weight: 650; letter-spacing: var(--tracking-tight); line-height: 1; }
  .card__amount.big { font-size: 30px; }
  .card__amount .muted { font-size: 13px; font-weight: 400; letter-spacing: 0; color: var(--fg-subtle); }
  .link-btn { display: inline-flex; align-items: center; min-height: 32px; color: var(--fg-secondary); font-size: var(--dash-small); text-decoration: none; padding: 4px 8px; border-radius: var(--radius-sm); transition: color var(--duration-fast), background-color var(--duration-fast); }
  .link-btn:hover { color: var(--fg-primary); background: var(--bg-elevated); }

  /* ── Gráfico de barras interactivo (Orbit) ── */
  .plot { position: relative; }
  .chart { width: 100%; height: auto; display: block; overflow: visible; }
  .chart__lbl { fill: var(--fg-secondary); font-family: var(--font-body); font-size: 12px; }
  .chart__lbl.is-active { fill: var(--fg-primary); font-weight: 600; }
  .chart__axis { fill: var(--fg-subtle); font-family: var(--font-body); font-size: 11px; }
  .chart__grid { stroke: rgba(255, 255, 255, 0.06); stroke-dasharray: 3 4; }
  .chart__base { stroke: rgba(255, 255, 255, 0.12); }
  .chart__guide { stroke: rgba(255, 255, 255, 0.22); stroke-dasharray: 4 4; }
  .chart rect[role="presentation"] { cursor: pointer; }

  /* ── Tabla de proyectos (Orbit) ── */
  .ptable { display: flex; flex-direction: column; }
  .ptable__head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: 0 8px 7px; font-size: var(--dash-caption); font-weight: 500; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-subtle); }
  .prow { display: flex; align-items: center; gap: var(--space-3); padding: 9px 8px; border-top: 1px solid var(--border-subtle); border-radius: var(--radius-sm); transition: background var(--duration-fast); }
  .prow:first-of-type { border-top: 0; }
  .prow:hover { background: var(--bg-elevated); }
  .folder { width: 26px; height: 26px; flex: 0 0 auto; display: inline-flex; }
  .folder svg { width: 100%; height: 100%; }
  .prow__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .prow__name { color: var(--fg-primary); font-size: var(--dash-small); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .prow__client { display: flex; align-items: center; gap: 6px; font-size: var(--dash-caption); color: var(--fg-subtle); min-width: 0; }
  .prog { display: block; height: 4px; width: 100%; background: var(--bg-elevated); border-radius: var(--radius-pill); overflow: hidden; margin-top: 2px; }
  .prog__bar { display: block; height: 100%; background: linear-gradient(90deg, var(--accent-gold-deep), var(--accent-gold-hover)); border-radius: var(--radius-pill); min-width: 2px; transition: width var(--duration-base) var(--ease); }
  .ptable__more { display: flex; align-items: center; justify-content: center; min-height: 40px; width: 100%; padding: 10px; margin-top: var(--space-2); border-top: 1px solid var(--border); color: var(--fg-secondary); font-size: var(--dash-small); text-decoration: none; transition: color var(--duration-fast); }
  .ptable__more:hover { color: var(--fg-primary); }

  /* monograma de iniciales */
  .mono-av { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: 0 0 auto; border-radius: var(--radius-pill); color: #fff; font-family: var(--font-display); font-size: 10px; font-weight: 700; line-height: 1; }
  .mono-av.sm { width: 24px; height: 24px; }

  /* sparkline */
  .spark-wrap { position: relative; }
  .spark { display: block; width: 100%; height: 150px; }
  .spark-dot {
    position: absolute; width: 11px; height: 11px; border-radius: 50%;
    background: var(--accent-gold); border: 3px solid var(--bg-card);
    transform: translate(-50%, -50%); pointer-events: none;
    box-shadow: 0 0 0 1px var(--accent-gold-line), 0 4px 12px -2px var(--accent-gold-glow);
  }

  /* leads recientes compactos */
  .recent { display: flex; flex-direction: column; }
  .recent__row { display: flex; align-items: center; gap: var(--space-3); min-height: 44px; padding: 6px 6px; border-top: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: var(--dash-body); transition: background var(--duration-fast); }
  .recent__row:first-child { border-top: 0; }
  .recent__row:hover { background: var(--bg-elevated); }
  .recent__name { flex: 1; min-width: 0; color: var(--fg-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dim { color: var(--fg-subtle); white-space: nowrap; font-size: var(--dash-caption); font-variant-numeric: tabular-nums; }

  @media (max-width: 1099px) {
    .grid-2--chart, .grid-2--funnel { grid-template-columns: 1fr; }
  }
  @media (max-width: 719px) {
    .recent__row { flex-wrap: wrap; row-gap: 4px; }
    .recent__name { flex-basis: calc(100% - 40px); }
    .recent__row :global(.ui-chip) { margin-left: 36px; }
    .dim { margin-left: auto; }
  }
</style>
