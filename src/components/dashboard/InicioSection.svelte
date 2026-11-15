<script>
  // ─────────────────────────────────────────────────────────────
  // Inicio (#/inicio): "¿qué necesita mi atención hoy?".
  // A1: cifras veraces (leads de ESTE mes con comparación real, proyectos
  // activos de la tabla de proyectos, cobrado del mes desde Finanzas),
  // error de la analítica con Reintentar en vez de esqueleto eterno,
  // leads por estado con proporciones reales (archivados aparte), eje Y
  // del gráfico con enteros que existen, y cada bloque enlazado a su
  // registro con el router (#/leads/<ref>, #/progreso/<PRJ>, filtros).
  // La lógica pura vive en lib/inicio.js (probada con npm run test:inicio).
  // ─────────────────────────────────────────────────────────────
  import { onMount } from 'svelte';
  import PageHeader from './ui/PageHeader.svelte';
  import KpiGrid from './ui/KpiGrid.svelte';
  import Kpi from './ui/Kpi.svelte';
  import Card from './ui/Card.svelte';
  import StatusChip from './ui/StatusChip.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import LoadingState from './ui/LoadingState.svelte';
  import Icon from './ui/Icon.svelte';
  import { data, loadHome, loadLeads, loadProjects } from './lib/store.svelte.js';
  import { fmtDate, fmtTime, hourInHouston } from './lib/dates.js';
  import { href } from './lib/router.svelte.js';
  import { num, money, moneyFits, delta, monthShort, hasActivity, axisScale, leadStates, cumulative, activityLabel } from './lib/inicio.js';

  let { user = '' } = $props();

  const home = $derived(data.home);
  const kpis = $derived(home?.kpis || null);
  const leads = $derived(data.leads);
  const projects = $derived(data.projects);

  // Mes anterior para las comparaciones ("vs. sep"), en hora de Houston (meta del servidor).
  const prevLabel = $derived(monthShort(home?.meta?.prev_month));

  // ── KPI 1 · Leads recibidos este mes (CRM-15, OP-03, MOCK-03) ──
  // Rótulo "Leads recibidos", no "nuevos": "Nuevos" es el ESTADO de la
  // tarjeta de Leads por estado (sin contactar, de cualquier fecha). A1-02.
  const leadsThisMonth = $derived(num(kpis?.new_leads_this_month ?? kpis?.leads_this_month));
  const leadsDelta = $derived(delta(leadsThisMonth, kpis?.new_leads_prev_month));
  const uncontacted = $derived(num(kpis?.uncontacted_leads ?? kpis?.new_leads));

  // ── KPI 3 · Proyectos activos reales (OP-01). Si el conteo del servidor
  // falla (null) pero la lista de proyectos sí llegó, se cuenta de ella.
  const activeFromList = $derived(data.projectsLoaded ? projects.filter((p) => p.status === 'active').length : null);
  const activeProjects = $derived(num(kpis?.active_projects) ?? activeFromList);

  // ── KPI 4 · Cobrado este mes desde Finanzas (OP-02, MOCK-02). null = Finanzas no respondió.
  const revenue = $derived(num(kpis?.revenue_this_month_cents));
  const revenueDelta = $derived(delta(revenue, kpis?.revenue_prev_month_cents, (n) => money(n)));
  // A1-01: la tarjeta corta con "…" lo que no cabe, y el hueco junto a la
  // ilustración va de ~72 px (móvil de 360) a más de 120 (escritorio). Se
  // pinta la forma más precisa que CABE en la tarjeta real ("$12,841",
  // luego "$12.8k", luego "$13k"); la cifra exacta va en la nota si la de
  // arriba está redondeada. Medido, no adivinado por el ancho de pantalla:
  // entre 1100 y 1279 px las 4 columnas son más estrechas que en el móvil.
  const revenueForms = $derived(revenue === null ? [] : moneyFits(revenue));
  const revenueKey = $derived(revenueForms.join('|'));
  let revenueFit = $state({ key: '', i: 0 });   // forma elegida para ESTA cifra
  const revenueIdx = $derived(revenueFit.key === revenueKey ? revenueFit.i : 0);
  const revenueShort = $derived(revenue === null ? '—' : revenueForms[revenueIdx] ?? '—');
  const revenueExact = $derived(revenue === null ? '' : money(revenue));
  const revenueRounded = $derived(revenue !== null && revenueShort !== revenueExact);
  let revenueBox = $state();   // envoltorio sin caja (display: contents) del KPI
  $effect(() => {
    // Tras pintar una forma: si no cabe, se prueba la siguiente más corta.
    const i = revenueIdx, key = revenueKey, n = revenueForms.length;
    const el = revenueBox?.querySelector('.ui-kpi__num');
    if (!el || i >= n - 1) return;
    if (el.scrollWidth > el.clientWidth + 0.5) revenueFit = { key, i: i + 1 };
  });
  $effect(() => {
    // Si la tarjeta cambia de ancho (giro, ventana), se vuelve a la más precisa.
    const card = revenueBox?.firstElementChild;
    if (!card || typeof ResizeObserver === 'undefined') return;
    let w = card.clientWidth;
    const ro = new ResizeObserver(() => {
      if (card.clientWidth === w) return;
      w = card.clientWidth;
      revenueFit = { key: '', i: 0 };
    });
    ro.observe(card);
    // La tipografía de la cifra llega después: se mide de nuevo con ella.
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) revenueFit = { key: '', i: 0 }; });
    return () => { alive = false; ro.disconnect(); };
  });

  // ── Gráfico de actividad por mes ─────────────────────────────
  const activity = $derived(home && Array.isArray(home.activity) ? home.activity : []);
  const anyActivity = $derived(hasActivity(activity));
  // Barra resaltada: la del cursor/toque, o el mes actual.
  let hoverBar = $state(-1);
  const activeBar = $derived(
    !anyActivity ? -1
    : hoverBar >= 0 && hoverBar < activity.length ? hoverBar
    : activity.length - 1
  );
  // Eje Y con enteros únicos, el 0 incluido y una cima que existe (SH-13).
  const scale = $derived(axisScale(Math.max(0, ...activity.map((a) => num(a.total) || 0))));
  // Geometría del SVG en PÍXELES reales: el viewBox sigue el ancho medido del
  // contenedor, así los números del eje y los meses se leen a 11-12 px también
  // en el móvil (antes el SVG se encogía entero y el texto quedaba en ~5 px).
  // PR = carril de números · PW = zona de barras · BASE = línea base ·
  // HEAD = respiro sobre la cima · VH = alto total.
  // Fase 3: el alto también se mide (el gráfico llena su tarjeta en Inicio a pantalla).
  let plotW = $state(0), plotH = $state(0);
  const PR = 34, HEAD = 34;
  const VW = $derived(Math.max(260, Math.round(plotW) || 600));
  const VH = $derived(Math.max(130, Math.round(plotH) || 210));
  const BASE = $derived(VH - 28);
  const PW = $derived(VW - PR);
  // UNA sola escala para rejilla, barras, guía y tooltip (antes cada una iba por su lado).
  function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }
  function yOf(v) { return scale.top > 0 ? BASE - (Math.max(0, v) / scale.top) * (BASE - HEAD) : BASE; }

  // ── Leads por estado (OP-19, SH-14) ──────────────────────────
  const states = $derived(leadStates(home?.funnel));

  // ── Actividad acumulada (curva, 6 meses) ─────────────────────
  const sparkPoints = $derived(cumulative(activity));
  const sparkTotal = $derived(sparkPoints.length ? sparkPoints[sparkPoints.length - 1] : 0);
  const SPARK_W = 560, SPARK_H = 120;
  const sparkPath = $derived.by(() => {
    const n = sparkPoints.length;
    if (!anyActivity || n === 0) return { line: '', area: '', dot: null };
    const max = Math.max(1, ...sparkPoints);
    const yS = (v) => SPARK_H - 8 - (v / max) * (SPARK_H - 24);
    if (n === 1) {
      const y = yS(sparkPoints[0]).toFixed(1);
      return { line: `M0 ${y} L${SPARK_W} ${y}`, area: `M0 ${SPARK_H} L0 ${y} L${SPARK_W} ${y} L${SPARK_W} ${SPARK_H} Z`, dot: { x: SPARK_W, y: +y } };
    }
    const step = SPARK_W / (n - 1);
    const xy = sparkPoints.map((v, i) => [i * step, yS(v)]);
    const line = xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = 'M0 ' + SPARK_H + ' ' + line.replace(/^M/, 'L') + ' L' + SPARK_W + ' ' + SPARK_H + ' Z';
    const last = xy[xy.length - 1];
    return { line, area, dot: { x: last[0], y: last[1] } };
  });

  // ── Proyectos recientes ──────────────────────────────────────
  // 5 filas, igual que leads recientes: los dos bloques miden lo mismo.
  const recentProjects = $derived(projects.slice(0, 8));
  const PROJECT_STATUS = {
    active:    { label: 'En curso',  tone: 'neutral' },
    on_hold:   { label: 'En pausa',  tone: 'neutral' },
    completed: { label: 'Terminado', tone: 'data'    },
    cancelled: { label: 'Cancelado', tone: 'neutral' },   // OP-23, MOCK-12
  };
  function projStatus(s) { return PROJECT_STATUS[s] || { label: 'Sin estado', tone: 'neutral' }; }
  function initials(s) {
    const parts = (s || '?').trim().split(/[\s—-]+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // ── Leads recientes ──────────────────────────────────────────
  // Origen en texto neutro (fase 3, H-07): el color queda para el estado.
  const SOURCES = {
    chat:       { label: 'Chatbot'     },
    diagnostic: { label: 'Diagnóstico' },
    contact:    { label: 'Contacto'    },
  };
  function sourceMeta(s) { return SOURCES[s] || SOURCES.contact; }
  function leadTitle(l) { return l.name || l.email || l.phone || 'Sin nombre'; }
  // Segunda línea: el negocio y la ciudad; si no hay, el contacto que no sea ya el título.
  function leadDetail(l) {
    const biz = [l.business_name, l.city].filter(Boolean).join(', ');
    if (biz) return biz;
    const t = leadTitle(l);
    return [l.email, l.phone].find((v) => v && v !== t) || '';
  }

  // ── Saludo según la hora de Houston ──────────────────────────
  // El nombre solo si la parte local del correo parece un nombre (SH-21).
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

  // ── Exportar leads ───────────────────────────────────────────
  // Lo serializa el servidor (lib/csv.mjs: BOM y fórmulas neutralizadas) con
  // TODOS los leads, no solo los 100 cargados en el panel. Es un enlace de
  // descarga normal: la cookie de sesión viaja sola.
  const EXPORT_LEADS_URL = '/api/admin/export?type=leads';
  const leadTotal = $derived(num(home?.funnel?.total) ?? (data.leadsLoaded ? leads.length : null));

  // "Se muestran las cifras de las 6:11 p.m." sin doble punto (la hora ya acaba en "p.m.").
  const staleMessage = $derived.by(() => {
    if (!data.loadedAt) return data.homeError;
    const t = fmtTime(data.loadedAt);
    return `Se muestran las cifras de las ${t}${t.endsWith('.') ? '' : '.'} ${data.homeError}`;
  });

  // Al volver al inicio con datos ya cargados, se refrescan en silencio
  // (las cifras viejas se ven mientras llegan las nuevas; SH-08).
  onMount(() => { if (data.home) { loadHome(); loadProjects(); loadLeads(); } });

  // ── Fase 3: Inicio cabe en la pantalla (≥ 1100 × 700) ───────
  // En ese tramo la página mide el alto de la ventana menos la carcasa y las
  // listas enseñan solo las filas que caben (ledger E-77). Por debajo, fluye.
  let fit = $state(false);
  onMount(() => {
    const mq = window.matchMedia('(min-width: 1100px) and (min-height: 700px)');
    const sync = () => (fit = mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  });
  const PROJ_ROW = 40, LEAD_ROW = 48;
  let projH = $state(0), leadH = $state(0);
  const projRows = $derived(fit && projH ? Math.max(1, Math.min(8, Math.floor((projH + 6) / PROJ_ROW))) : 5);
  const leadRows = $derived(fit && leadH ? Math.max(1, Math.min(8, Math.floor((leadH + 6) / LEAD_ROW))) : 5);

  // Comparación del mes resaltado con el anterior (pieza C-06: la cifra dice de dónde sale).
  const barDelta = $derived(activeBar > 0 ? delta(num(activity[activeBar]?.total) || 0, num(activity[activeBar - 1]?.total) || 0) : null);
</script>

<div class="ini" class:is-fit={fit}>
<PageHeader title={firstName ? `${greeting}, ${firstName}` : greeting}>
  {#snippet actions()}
    {#if leadTotal}
      <a class="b" href={EXPORT_LEADS_URL} download><Icon name="download" size={16} />Exportar leads</a>
    {:else}
      <button class="b" disabled title={home || data.leadsLoaded ? 'No hay leads para exportar' : 'Cargando leads'}><Icon name="download" size={16} />Exportar leads</button>
    {/if}
  {/snippet}
</PageHeader>

<!-- ── KPIs ── -->
{#if !home && data.homeError}
  <!-- La analítica falló sin datos previos: un solo error con Reintentar
       (SH-06, OP-21). Gráficos y embudo dependen de ella y no se pintan;
       proyectos y leads tienen su propia llamada y siguen abajo. -->
  <div class="block">
    <ErrorState title="No se pudieron cargar las cifras del inicio" message={data.homeError} onretry={loadHome} />
  </div>
{:else if !home}
  <LoadingState loading={true} label="Cargando cifras">
    {#snippet skeleton()}
      <KpiGrid count={4} label="Cargando resumen">
        {#each [0, 1, 2, 3] as i (i)}<div class="ui-skel kpi-skel"></div>{/each}
      </KpiGrid>
    {/snippet}
  </LoadingState>
{:else}
  {#if data.homeError}
    <!-- Hay cifras, pero la última actualización falló: se dice cuáles se ven. -->
    <div class="block">
      <ErrorState compact title="No se pudieron actualizar las cifras"
        message={staleMessage}
        onretry={loadHome} />
    </div>
  {/if}
  <KpiGrid count={4} label="Resumen">
    <Kpi label="Leads recibidos" value={leadsThisMonth ?? '—'} art="inbox" href={href('leads')}>
      {#if leadsThisMonth === null}Sin dato de este mes
      {:else}{#if leadsDelta && leadsDelta.dir !== 'same'}<span class="nw" class:is-up={leadsDelta.dir === 'up'} class:is-down={leadsDelta.dir === 'down'}>{leadsDelta.text}</span> vs. {prevLabel}
        {:else if leadsDelta && leadsThisMonth > 0}igual que en {prevLabel}
        {:else}este mes{/if}
      {/if}
    </Kpi>
    <Kpi label="Briefs pendientes" value={num(kpis.pending_briefs) ?? '—'} art="docs" href={href('briefs', [], { estado: 'pendiente' })}
      note={num(kpis.pending_briefs) === null ? 'Sin dato de briefs' : 'en cola de revisión'} />
    <Kpi label="Proyectos activos" value={activeProjects ?? '—'} art="folder" href={href('progreso', [], { estado: 'activo' })}
      note={activeProjects === null ? 'No se pudieron contar' : activeProjects === 1 ? 'proyecto en curso' : 'proyectos en curso'} />
    <div class="kpi-box" bind:this={revenueBox}>
    <Kpi label="Cobrado este mes" value={revenueShort} art="coins" href={href('finanzas')}>
      {#if revenue === null}Finanzas no respondió
      {:else}{#if revenueRounded}<span class="exact">{revenueExact}</span><span class="sep">·</span><wbr>{/if}{#if revenueDelta && revenueDelta.dir !== 'same'}<span class="nw" class:is-up={revenueDelta.dir === 'up'} class:is-down={revenueDelta.dir === 'down'}>{revenueDelta.text}</span> vs. {prevLabel}
      {:else if revenue === 0}Sin cobros este mes
      {:else}igual que en {prevLabel}{/if}{/if}
    </Kpi>
    </div>
  </KpiGrid>
{/if}

<!-- ── Fila 1: actividad por mes + proyectos recientes (como «Revenue» y «Recent Projects» de la referencia) ── -->
<div class="row row--a">
  {#if home}
    <Card tag="article">
      <header class="m-head">
        <div>
          <p class="m-lbl">Actividad por mes</p>
          <p class="m-amount">{activeBar >= 0 ? (num(activity[activeBar]?.total) ?? 0) : 0} <span class="muted">leads y briefs{activeBar >= 0 ? ` en ${monthShort(activity[activeBar]?.month)}` : ''}</span></p>
          {#if barDelta && barDelta.dir !== 'same' && activeBar > 0}
            <p class="m-delta"><span class:is-up={barDelta.dir === 'up'} class:is-down={barDelta.dir === 'down'}>{barDelta.text}</span> vs. {monthShort(activity[activeBar - 1]?.month)}</p>
          {:else if activeBar > 0}
            <p class="m-delta">igual que en {monthShort(activity[activeBar - 1]?.month)}</p>
          {/if}
        </div>
      </header>

      {#if !anyActivity}
        <!-- OP-22: el servidor siempre manda 6 meses; vacío = todos en cero. -->
        <EmptyState art="chart-up" title="Sin actividad en los últimos 6 meses"
          text="Cada lead o brief que llegue suma aquí, en su mes." />
      {:else}
        {@const N = activity.length}
        {@const slot = PW / N}
        {@const bw = Math.min(46, slot * 0.56)}
        <div class="plot" bind:clientWidth={plotW} bind:clientHeight={plotH}>
          {#if activeBar >= 0 && activeBar < N}
            {@const a = activity[activeBar]}
            {@const v = num(a.total) || 0}
            {#if v > 0}
              <!-- Globo con el dato, arriba a la izquierda de la barra (como la referencia). -->
              <span class="chart-tip chart-tip--bar" style="left:{Math.min(Math.max(activeBar * slot + slot / 2 - bw / 2, 70), VW - 70)}px;top:{yOf(v)}px">
                {plural(num(a.leads) || 0, 'lead', 'leads')} · {plural(num(a.briefs) || 0, 'brief', 'briefs')}
              </span>
            {/if}
          {/if}
          <svg class="chart" viewBox="0 0 {VW} {VH}" width={VW} height={VH} role="img"
            aria-label={activityLabel(activity)}
            onmouseleave={() => (hoverBar = -1)}>
            <defs>
              <linearGradient id="barActive" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" style="stop-color:#ea6a24"/>
                <stop offset=".62" style="stop-color:#f39a55"/>
                <stop offset="1" style="stop-color:var(--chart-peak)"/>
              </linearGradient>
              <linearGradient id="barIdle" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style="stop-color:var(--chart-idle-top)"/><stop offset="1" style="stop-color:var(--chart-idle-base)"/>
              </linearGradient>
            </defs>

            <!-- Rejilla y eje (a la derecha, en mono) con LA MISMA escala que las barras. -->
            {#each scale.ticks as t (t)}
              {@const gy = yOf(t)}
              {#if t > 0}<line x1="0" y1={gy} x2={PW - 6} y2={gy} class="chart__grid" />{/if}
              {#if t > 0}<text x={VW - 2} y={gy + 4} text-anchor="end" class="chart__axis">{t}</text>{/if}
            {/each}
            <line x1="0" y1={BASE} x2={PW - 6} y2={BASE} class="chart__base" />

            {#each activity as a, i (a.month)}
              {@const v = num(a.total) || 0}
              {@const cx = i * slot + slot / 2}
              {@const bx = cx - bw / 2}
              {@const by = yOf(v)}
              {@const bh = BASE - by}
              {@const r = Math.min(8, bh / 2, bw / 2)}
              {@const isActive = i === activeBar}
              {#if v > 0}
                <path d="M{bx} {BASE}V{by + r}Q{bx} {by} {bx + r} {by}H{bx + bw - r}Q{bx + bw} {by} {bx + bw} {by + r}V{BASE}Z"
                  fill={isActive ? 'url(#barActive)' : 'url(#barIdle)'} class="chart__bar" class:is-active={isActive} />
                {#if isActive}
                  <line x1={bx + bw + 4} y1={by} x2={PW - 6} y2={by} class="chart__guide" />
                  <circle cx={bx} cy={by} r="4" class="chart__dot" />
                {/if}
              {/if}
              <!-- zona de hover/toque de todo el mes (ratón y dedo) -->
              <rect x={i * slot} y="0" width={slot} height={VH} fill="transparent" class="chart__hit"
                onmouseenter={() => (hoverBar = i)} onclick={() => (hoverBar = i)} role="presentation" />
              <text x={cx} y={BASE + 20} text-anchor="middle" class="chart__lbl" class:is-active={isActive}>{monthShort(a.month)}</text>
            {/each}
          </svg>
        </div>
      {/if}
    </Card>
  {:else if !data.homeError}
    <LoadingState loading={true} label="Cargando actividad">
      {#snippet skeleton()}<div class="ui-skel chart-skel"></div>{/snippet}
    </LoadingState>
  {/if}

  <Card tag="article">
    <header class="l-head">
      <h2 class="l-title">Proyectos recientes</h2>
      <a class="l-more" href={href('progreso')}>Ver todos<Icon name="chevron" size={14} /></a>
    </header>
    <div class="list-body">
      {#if data.projectsError && !recentProjects.length}
        <ErrorState compact title="No se pudieron cargar los proyectos" message={data.projectsError} onretry={loadProjects} />
      {:else if !data.projectsLoaded}
        <LoadingState loading={true} rows={5} height={34} gap={6} label="Cargando proyectos" />
      {:else if recentProjects.length}
        <div class="tcols tcols--p" aria-hidden="true"><span>Proyecto</span><span>Cliente</span><span>Avance</span></div>
        <div class="rows-box" bind:clientHeight={projH}>
          <ul class="rows">
            {#each recentProjects.slice(0, projRows) as p (p.id)}
              {@const st = projStatus(p.status)}
              {@const pct = num(p.progress) || 0}
              <li>
                <a class="prow" href={href('progreso', [p.project_code || p.id])}>
                  <span class="prow__name"><Icon name="folder" size={16} /><span class="ellip">{p.name}</span></span>
                  <span class="prow__client"><span class="mono-av" aria-hidden="true">{initials(p.client_name)}</span><span class="ellip">{p.client_name || 'Sin cliente'}</span></span>
                  {#if p.status === 'active'}
                    <span class="prow__prog" role="progressbar" aria-label="Avance" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct}>
                      <span class="prog"><span class="prog__bar" style="width:{pct}%"></span></span><span class="prog__n">{pct}%</span>
                    </span>
                  {:else}
                    <span class="prow__st"><StatusChip tone={st.tone} label={st.label} /></span>
                  {/if}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {:else}
        <EmptyState art="folder" title="Sin proyectos todavía" text="Los proyectos se crean al cerrar un brief o desde Progreso.">
          {#snippet action()}<a class="b b--mini" href={href('progreso')}>Ir a Progreso</a>{/snippet}
        </EmptyState>
      {/if}
    </div>
  </Card>
</div>

<!-- ── Fila 2: leads por estado + leads recientes + actividad acumulada ── -->
<div class="row row--b">
  {#if home && states}
    <Card tag="article">
      <div class="states-card">
        <header class="m-head">
          <div>
            <p class="m-lbl">Leads por estado</p>
            <p class="m-amount">{states.pipeline} <span class="muted">en pipeline</span></p>
          </div>
        </header>
        {#if states.rows.every((r) => r.n === 0) && !states.archived}
          <EmptyState compact art="users" text="Aún no hay leads. Llegan del formulario de contacto, del chatbot y del diagnóstico." />
        {:else}
          <!-- Píldoras como la referencia: el relleno mide la proporción real y lleva el nombre dentro. -->
          <ul class="states">
            {#each states.rows as r (r.key)}
              <li>
                <a class="st" href={href('leads', [], { estado: r.estado })} aria-label="{r.name}: {r.n}. Ver la lista">
                  <span class="st__track">
                    <span class="st__fill" class:is-zero={r.n === 0} style="--pct:{r.pct}%;--lbl:{r.name.length}ch"><span class="st__name">{r.name}</span></span>
                  </span>
                  <span class="st__n">{r.n}</span>
                </a>
              </li>
            {/each}
          </ul>
          <a class="states__foot" href={href('leads', [], { estado: 'archivado' })}>
            <span><strong>{states.archived}</strong> {states.archived === 1 ? 'archivado' : 'archivados'}, fuera del pipeline</span>
            <Icon name="chevron" size={14} />
          </a>
        {/if}
      </div>
    </Card>
  {:else if !data.homeError}
    <LoadingState loading={true} label="Cargando leads por estado">
      {#snippet skeleton()}<div class="ui-skel chart-skel"></div>{/snippet}
    </LoadingState>
  {/if}

  <Card tag="article">
    <header class="l-head">
      <h2 class="l-title">Leads recientes</h2>
      <a class="l-more" href={href('leads')}>Ver todos<Icon name="chevron" size={14} /></a>
    </header>
    <div class="list-body">
      {#if data.leadsError && !leads.length}
        <ErrorState compact title="No se pudieron cargar los leads" message={data.leadsError} onretry={loadLeads} />
      {:else if !data.leadsLoaded}
        <LoadingState loading={true} rows={4} height={42} gap={6} label="Cargando leads" />
      {:else if leads.length}
        <div class="rows-box" bind:clientHeight={leadH}>
          <ul class="rows">
            {#each leads.slice(0, leadRows) as lead (lead.ref_id)}
              {@const src = sourceMeta(lead.source)}
              {@const detail = leadDetail(lead)}
              <li>
                <a class="lrow" href={href('leads', [lead.ref_id])}>
                  <span class="mono-av lg" aria-hidden="true">{initials(lead.name || lead.email || lead.ref_id)}</span>
                  <span class="lrow__main">
                    <span class="lrow__name">{leadTitle(lead)}</span>
                    {#if detail}<span class="lrow__detail">{detail}</span>{/if}
                  </span>
                  <span class="lrow__meta">
                    <span class="lrow__src">{src.label}</span>
                    <span class="dim">{fmtDate(lead.created_at)}</span>
                  </span>
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {:else}
        <EmptyState art="inbox" title="Sin leads todavía" text="Cuando alguien use el formulario de contacto, el chatbot o el diagnóstico, aparecerá aquí." />
      {/if}
    </div>
  </Card>

  {#if home}
    <Card tag="article">
      <div class="acc">
        <header class="m-head">
          <div>
            <p class="m-lbl">Actividad acumulada</p>
            <p class="m-amount">{sparkTotal} <span class="muted">leads y briefs en 6 meses</span></p>
          </div>
        </header>
        {#if sparkPath.line}
          <div class="spark-wrap">
            <svg class="spark" viewBox="0 0 {SPARK_W} {SPARK_H}" preserveAspectRatio="none" role="img" aria-label="Actividad acumulada: {sparkTotal} en 6 meses">
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" style="stop-color:var(--accent-gold)" stop-opacity="0.30"/>
                  <stop offset="1" style="stop-color:var(--accent-gold)" stop-opacity="0"/>
                </linearGradient>
              </defs>
              {#each [0.25, 0.5, 0.75] as gy (gy)}<line x1="0" x2={SPARK_W} y1={SPARK_H * gy} y2={SPARK_H * gy} class="spark__grid" vector-effect="non-scaling-stroke" />{/each}
              <path d={sparkPath.area} fill="url(#sparkFill)" />
              <path d={sparkPath.line} fill="none" style="stroke:var(--accent-gold)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
            </svg>
            {#if sparkPath.dot}
              <span class="spark-dot" style="left:{sparkPath.dot.x / SPARK_W * 100}%;top:{sparkPath.dot.y / SPARK_H * 100}%"></span>
            {/if}
          </div>
          <div class="spark-axis" aria-hidden="true">
            {#each activity as a (a.month)}<span>{monthShort(a.month)}</span>{/each}
          </div>
        {:else}
          <EmptyState compact text="La curva aparece con el primer lead o brief." />
        {/if}
      </div>
    </Card>
  {/if}
</div>
</div>

<style>
  .block { margin-bottom: 14px; }
  /* Medidas reales de las tarjetas (cifra 104; gráfico y listas llenan su fila). */
  .kpi-skel { height: 104px; border-radius: 12px; }
  .chart-skel { height: 100%; min-height: 240px; border-radius: 12px; }

  /* ── Rejilla de la página ── */
  .ini { display: flex; flex-direction: column; gap: 14px; }
  .ini > :global(.ui-page-head) { margin: 6px 0 0; }
  .ini > :global(.ui-kpis) { margin: 0; }
  .row { display: grid; gap: 14px; grid-template-columns: repeat(12, minmax(0, 1fr)); }
  .row > :global(*) { min-width: 0; }
  .row--a > :global(:first-child) { grid-column: span 7; }
  .row--a > :global(:nth-child(2)) { grid-column: span 5; }
  .row--b > :global(*) { grid-column: span 4; }
  /* Las tarjetas de una fila miden lo mismo y su contenido llena la altura. */
  .row > :global(.ui-card) { display: flex; flex-direction: column; min-height: 0; }

  /* En la pantalla de un portátil o mayor, Inicio cabe entero (E-77): alto de la
     ventana menos la carcasa; la fila del gráfico se lleva algo más que la de abajo. */
  .ini.is-fit { height: calc(100dvh - var(--chrome-y, 76px)); min-height: 0; }
  .ini.is-fit .row { min-height: 0; }
  .ini.is-fit .row--a { flex: 1.22 1 0; }
  .ini.is-fit .row--b { flex: 1 1 0; }

  /* ── Cabecera de métrica (rótulo mono + cifra) ── */
  .m-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); margin-bottom: 10px; }
  .m-lbl { margin: 0 0 6px; font-family: var(--font-mono); font-size: var(--dash-mono); color: var(--fg-subtle); }
  .m-amount { margin: 0; font-family: var(--font-display); font-size: 24px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.05; color: var(--fg-primary); font-variant-numeric: tabular-nums; }
  .m-amount .muted { font-family: var(--font-mono); font-size: var(--dash-mono); font-weight: 400; letter-spacing: 0; color: var(--fg-subtle); }
  .m-delta { margin: 6px 0 0; font-family: var(--font-mono); font-size: var(--dash-mono); color: var(--fg-subtle); }

  /* Notas de los KPIs y de los gráficos: la comparación lleva el color, la cifra no. */
  .sep { margin: 0 6px; color: var(--fg-faint); }
  .is-up { color: var(--delta-up); font-weight: 500; }
  .is-down { color: var(--delta-down); font-weight: 500; }
  .kpi-box { display: contents; }
  .exact { color: var(--fg-secondary); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .nw { white-space: nowrap; }

  /* ── Gráfico de barras (como «Revenue» de la referencia) ── */
  .plot { position: relative; height: 210px; }
  .ini.is-fit .plot { flex: 1 1 auto; height: auto; min-height: 120px; }
  .chart { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; touch-action: pan-y; }
  .chart__lbl { fill: var(--fg-subtle); font-family: var(--font-mono); font-size: 12px; }
  .chart__lbl.is-active { fill: var(--fg-primary); }
  .chart__axis { fill: var(--fg-subtle); font-family: var(--font-mono); font-size: 11px; font-variant-numeric: tabular-nums; }
  .chart__grid { stroke: var(--chart-grid); }
  .chart__base { stroke: rgba(255, 255, 255, 0.1); }
  .chart__bar { stroke: rgba(255, 255, 255, 0.07); stroke-width: 1; transition: opacity var(--duration-fast); }
  .chart__bar.is-active { stroke: none; }
  .chart__guide { stroke: rgba(255, 255, 255, 0.4); stroke-dasharray: 4 4; }
  .chart__dot { fill: #e9e9e9; stroke: var(--bg-card); stroke-width: 2.5; }
  .chart__hit { cursor: pointer; }
  .chart-tip { white-space: nowrap; }
  .chart-tip--bar { transform: translate(-100%, -150%); margin-left: 6px; font-family: var(--font-mono); font-weight: 400; font-size: 11px; border-radius: 999px; padding: 3px 9px; background: #262626; box-shadow: none; }

  /* ── Listas con columnas (como «Recent Projects» de la referencia) ── */
  .l-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: 12px; }
  .l-title { margin: 0; font-size: var(--dash-body); font-weight: 500; color: var(--fg-primary); }
  .l-more { display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 10px; border: 1px solid var(--border); border-radius: 8px; color: var(--fg-secondary); font-size: var(--dash-caption); text-decoration: none; transition: color var(--duration-fast), border-color var(--duration-fast), background-color var(--duration-fast); }
  .l-more:hover { color: var(--fg-primary); border-color: var(--border-strong); background: var(--bg-elevated); }
  .list-body { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .tcols { display: grid; gap: 12px; padding: 0 12px 8px; font-family: var(--font-mono); font-size: var(--dash-mono); color: var(--fg-subtle); }
  .tcols--p, .prow { grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr) 88px; }
  .rows-box { flex: 1 1 auto; min-height: 0; overflow: hidden; }
  .rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }

  .prow {
    display: grid; align-items: center; gap: 12px; min-height: 34px; padding: 0 12px;
    background: #242424; border: 1px solid var(--border-subtle); border-radius: 8px;
    color: inherit; text-decoration: none; font-size: var(--dash-small);
    transition: background-color var(--duration-fast), border-color var(--duration-fast);
  }
  .prow:hover { background: var(--bg-elevated); border-color: var(--border); }
  .prow__name { display: flex; align-items: center; gap: 8px; min-width: 0; color: var(--fg-primary); }
  .prow__name :global(.ui-icon) { flex: 0 0 auto; color: var(--fg-subtle); }
  .prow__client { display: flex; align-items: center; gap: 8px; min-width: 0; color: var(--fg-secondary); font-size: var(--dash-caption); }
  .prow__prog { display: flex; align-items: center; gap: 8px; }
  .prow__st { display: flex; }
  .prow__st :global(.ui-chip) { padding: 1px 8px; font-size: 11px; }
  .prog { flex: 1; height: 4px; background: #333; border-radius: 999px; overflow: hidden; }
  .prog__bar { display: block; height: 100%; background: var(--fg-secondary); border-radius: 999px; min-width: 2px; transition: width var(--duration-base) var(--ease); }
  .prog__n { width: 3.6ch; text-align: right; font-family: var(--font-mono); font-size: 11px; color: var(--fg-subtle); font-variant-numeric: tabular-nums; }
  .ellip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }

  .lrow {
    display: flex; align-items: center; gap: 10px; min-height: 42px; padding: 4px 10px;
    background: #242424; border: 1px solid var(--border-subtle); border-radius: 8px;
    color: inherit; text-decoration: none;
    transition: background-color var(--duration-fast), border-color var(--duration-fast);
  }
  .lrow:hover { background: var(--bg-elevated); border-color: var(--border); }
  .lrow__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .lrow__name { color: var(--fg-primary); font-size: var(--dash-small); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lrow__detail { font-size: var(--dash-caption); color: var(--fg-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lrow__meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex: 0 0 auto; }
  .lrow__src { font-size: 11px; color: var(--fg-secondary); }
  .dim { color: var(--fg-subtle); white-space: nowrap; font-family: var(--font-mono); font-size: 11px; font-variant-numeric: tabular-nums; }

  /* Monograma neutro (fase 3: sin colores aleatorios que compitan). */
  .mono-av { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex: 0 0 auto; border-radius: 999px; background: #333; border: 1px solid var(--border-strong); color: var(--fg-secondary); font-size: 9px; font-weight: 600; line-height: 1; }
  .mono-av.lg { width: 26px; height: 26px; font-size: 10px; }

  /* ── Leads por estado (píldoras de la referencia) ── */
  .states-card { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .states { list-style: none; margin: 4px 0 12px; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .ini.is-fit .states { flex: 1 1 auto; justify-content: space-evenly; margin: 0 0 10px; }
  .st { display: grid; grid-template-columns: 1fr 34px; align-items: center; gap: 12px; text-decoration: none; color: inherit; border-radius: 999px; }
  .st__track { position: relative; display: block; height: 26px; border-radius: 999px; background: rgba(255, 255, 255, 0.025); }
  .st__fill {
    position: absolute; inset: 0 auto 0 0; display: flex; align-items: center; justify-content: flex-end;
    width: max(var(--pct), calc(var(--lbl) + 30px)); max-width: 100%; padding: 0 12px;
    border-radius: 999px; background: linear-gradient(90deg, rgba(255,255,255,0.02), #3b3b3b);
    border: 1px solid rgba(255, 255, 255, 0.09); transition: width .4s var(--ease), border-color var(--duration-fast);
  }
  .st__fill.is-zero { background: transparent; border-style: dashed; }
  .st:hover .st__fill { border-color: rgba(255, 255, 255, 0.2); }
  .st__name { font-family: var(--font-mono); font-size: var(--dash-mono); color: var(--fg-primary); white-space: nowrap; }
  .st__n { text-align: right; font-family: var(--font-mono); font-size: var(--dash-mono); color: var(--fg-secondary); font-variant-numeric: tabular-nums; }
  .states__foot {
    margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: var(--space-2);
    min-height: 36px; padding-top: 10px; border-top: 1px solid var(--border-subtle);
    color: var(--fg-subtle); font-size: var(--dash-caption); text-decoration: none;
  }
  .states__foot strong { color: var(--fg-primary); font-weight: 500; font-variant-numeric: tabular-nums; }
  .states__foot:hover { color: var(--fg-primary); }

  /* ── Curva acumulada (como «Content visits» de la referencia) ── */
  .acc { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .spark-wrap { position: relative; height: 130px; }
  .ini.is-fit .spark-wrap { flex: 1 1 auto; height: auto; min-height: 70px; }
  .spark { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
  .spark__grid { stroke: var(--chart-grid); stroke-width: 1; }
  .spark-dot {
    position: absolute; width: 10px; height: 10px; border-radius: 50%;
    background: var(--accent-gold); border: 2.5px solid var(--bg-card);
    transform: translate(-50%, -50%); pointer-events: none;
  }
  .spark-axis { display: flex; justify-content: space-between; margin-top: 8px; font-family: var(--font-mono); color: var(--fg-subtle); font-size: 11px; }

  /* Tablet y portátil estrecho: el gráfico y la lista de proyectos a lo ancho;
     abajo, estados y leads lado a lado y la curva a lo ancho. */
  @media (max-width: 1099px) {
    .row--a > :global(:first-child), .row--a > :global(:nth-child(2)) { grid-column: 1 / -1; }
    .row--b > :global(*) { grid-column: span 6; }
    .row--b > :global(:nth-child(3)) { grid-column: 1 / -1; }
  }
  @media (max-width: 719px) {
    .row--b > :global(*) { grid-column: 1 / -1; }
    .m-amount { font-size: 22px; }
    /* En el teléfono el cliente baja bajo el nombre (no se esconde, E-62). */
    .tcols--p { display: none; }
    .prow { grid-template-columns: minmax(0, 1fr) 84px; row-gap: 2px; padding: 7px 12px; }
    .prow__name { grid-column: 1; grid-row: 1; }
    .prow__client { grid-column: 1; grid-row: 2; }
    .prow__prog, .prow__st { grid-column: 2; grid-row: 1 / span 2; }
  }
  @media (pointer: coarse) {
    .prow, .lrow { min-height: 44px; }
  }
  /* Movimiento reducido (pieza F-02). */
  @media (prefers-reduced-motion: reduce) { .st__fill, .prog__bar { transition: none; } }
</style>
