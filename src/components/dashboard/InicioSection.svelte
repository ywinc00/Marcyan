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
  let plotW = $state(0);
  const PR = 34, BASE = 150, HEAD = 18, VH = 184;
  const VW = $derived(Math.max(260, Math.round(plotW) || 600));
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
  const recentProjects = $derived(projects.slice(0, 5));
  const PROJECT_STATUS = {
    active:    { label: 'En curso',  tone: 'accent'  },
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
  // Color determinista para el monograma (paleta sobria, texto blanco).
  const MONO_PALETTE = ['#6366f1', '#0ea5e9', '#14b8a6', '#f97316', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];
  function monoColor(s) {
    let h = 0; const t = s || '?';
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
    return MONO_PALETTE[Math.abs(h) % MONO_PALETTE.length];
  }

  // ── Leads recientes ──────────────────────────────────────────
  // Origen: chip neutro salvo chatbot (dato) y diagnóstico (info). H-07.
  const SOURCES = {
    chat:       { label: 'Chatbot',     tone: 'data'    },
    diagnostic: { label: 'Diagnóstico', tone: 'info'    },
    contact:    { label: 'Contacto',    tone: 'neutral' },
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
</script>

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
    <Kpi label="Leads recibidos" value={leadsThisMonth ?? '—'} art="inbox" tone={leadsThisMonth > 0 ? 'accent' : ''} href={href('leads')}>
      {#if leadsThisMonth === null}Sin dato de este mes
      {:else}este mes{#if leadsDelta && leadsDelta.dir !== 'same'}<span class="sep">·</span><wbr><span class="nw" class:is-data={leadsDelta.dir === 'up'} class:is-down={leadsDelta.dir === 'down'}>{leadsDelta.text}</span> vs. {prevLabel}
        {:else if leadsDelta && leadsThisMonth > 0}<span class="sep">·</span>igual que en {prevLabel}{/if}
      {/if}
    </Kpi>
    <Kpi label="Briefs pendientes" value={num(kpis.pending_briefs) ?? '—'} art="docs" href={href('briefs', [], { estado: 'pendiente' })}
      note={num(kpis.pending_briefs) === null ? 'Sin dato de briefs' : 'en cola de revisión'} />
    <Kpi label="Proyectos activos" value={activeProjects ?? '—'} art="clock" href={href('progreso', [], { estado: 'activo' })}
      note={activeProjects === null ? 'No se pudieron contar' : activeProjects === 1 ? 'proyecto en curso' : 'proyectos en curso'} />
    <div class="kpi-box" bind:this={revenueBox}>
    <Kpi label="Cobrado este mes" value={revenueShort} art="coins" tone={revenue ? 'data' : ''} href={href('finanzas')}>
      {#if revenue === null}Finanzas no respondió
      {:else}{#if revenueRounded}<span class="exact">{revenueExact}</span><span class="sep">·</span><wbr>{/if}{#if revenueDelta && revenueDelta.dir !== 'same'}<span class="nw" class:is-data={revenueDelta.dir === 'up'} class:is-down={revenueDelta.dir === 'down'}>{revenueDelta.text}</span> vs. {prevLabel}
      {:else if revenue === 0}Sin cobros registrados este mes
      {:else}igual que en {prevLabel}{/if}{/if}
    </Kpi>
    </div>
  </KpiGrid>
{/if}

<div class="stack">
{#if home}
  <!-- ── Fila 1: actividad por mes (ancho) + leads por estado ── -->
  <div class="row row--chart">
    <Card tag="article">
      <header class="m-head">
        <div>
          <p class="m-lbl">Actividad por mes</p>
          <p class="m-amount">{activeBar >= 0 ? (num(activity[activeBar]?.total) ?? 0) : 0} <span class="muted">{activeBar >= 0 ? monthShort(activity[activeBar]?.month) : 'en 6 meses'}</span></p>
        </div>
        <StatusChip tone="neutral" label="leads + briefs" />
      </header>

      {#if !anyActivity}
        <!-- OP-22: el servidor siempre manda 6 meses; vacío = todos en cero. -->
        <EmptyState art="chart-up" title="Sin actividad en los últimos 6 meses"
          text="Cada lead o brief que llegue suma aquí, en su mes." />
      {:else}
        {@const N = activity.length}
        {@const slot = PW / N}
        {@const bw = Math.min(56, slot * 0.5)}
        <div class="plot" bind:clientWidth={plotW}>
          {#if hoverBar >= 0 && hoverBar < N}
            {@const a = activity[hoverBar]}
            <!-- en px (el viewBox ya es px); el borde no corta el globo en la primera ni en la última barra -->
            <span class="chart-tip" style="left:{Math.min(Math.max(hoverBar * slot + slot / 2, 68), VW - 68)}px;top:{yOf(num(a.total) || 0)}px">
              {plural(num(a.leads) || 0, 'lead', 'leads')} · {plural(num(a.briefs) || 0, 'brief', 'briefs')}
            </span>
          {/if}
          <svg class="chart" viewBox="0 0 {VW} {VH}" width={VW} height={VH} role="img"
            aria-label={activityLabel(activity)}
            onmouseleave={() => (hoverBar = -1)}>
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

            <!-- Rejilla y números del eje con LA MISMA escala que las barras. El 0 es la base. -->
            {#each scale.ticks as t (t)}
              {@const gy = yOf(t)}
              {#if t > 0}<line x1="0" y1={gy} x2={PW} y2={gy} class="chart__grid" />{/if}
              <text x={VW - 4} y={gy + 4} text-anchor="end" class="chart__axis">{t}</text>
            {/each}
            <line x1="0" y1={BASE} x2={PW} y2={BASE} class="chart__base" />

            {#each activity as a, i (a.month)}
              {@const v = num(a.total) || 0}
              {@const cx = i * slot + slot / 2}
              {@const bx = cx - bw / 2}
              {@const by = yOf(v)}
              {@const bh = BASE - by}
              {@const isActive = i === activeBar}
              {#if isActive && v > 0}
                <line x1="0" y1={by} x2={PW} y2={by} class="chart__guide" />
              {/if}
              {#if v > 0}
                <rect x={bx} y={by} width={bw} height={bh} rx={Math.min(11, bh / 2)}
                  fill={isActive ? 'url(#barActive)' : 'url(#barIdle)'}
                  filter={isActive ? 'url(#barGlow)' : undefined} />
                {#if bh > 6}
                  <rect x={bx + 2} y={by + 1.5} width={Math.max(bw - 4, 0)} height="2" rx="1"
                    fill={isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)'} />
                {/if}
              {/if}
              {#if isActive && v > 0}
                <circle cx={cx} cy={by} r="4.5" fill="var(--accent-gold)" stroke="var(--bg-card)" stroke-width="2" />
              {/if}
              <!-- zona de hover/toque de todo el mes (ratón y dedo) -->
              <rect x={i * slot} y="0" width={slot} height={VH} fill="transparent" class="chart__hit"
                onmouseenter={() => (hoverBar = i)} onclick={() => (hoverBar = i)} role="presentation" />
              <text x={cx} y={BASE + 22} text-anchor="middle" class="chart__lbl" class:is-active={isActive}>{monthShort(a.month)}</text>
            {/each}
          </svg>
        </div>
      {/if}
    </Card>

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
          <!-- Barras proporcionales de verdad: la pista es el 100 % (el estado con más leads). -->
          <ul class="states">
            {#each states.rows as r (r.key)}
              <li>
                <a class="st" href={href('leads', [], { estado: r.estado })} aria-label="{r.name}: {r.n}. Ver la lista">
                  <span class="st__track">
                    {#if r.n > 0}<span class="st__fill" class:st__fill--accent={r.key === 'new'} style="width:{r.pct}%"></span>{/if}
                    <span class="st__name" class:is-accent={r.key === 'new' && r.n > 0}>{r.name}</span>
                  </span>
                  <span class="st__n">{r.n}</span>
                </a>
              </li>
            {/each}
          </ul>
          <a class="states__foot" href={href('leads', [], { estado: 'archivado' })}>
            <span><strong>{states.archived}</strong> {states.archived === 1 ? 'archivado' : 'archivados'}, fuera del pipeline</span>
            <Icon name="chevron" size={16} />
          </a>
        {/if}
      </div>
    </Card>
  </div>
{:else if !data.homeError}
  <!-- Mientras llega la analítica se reserva el hueco de la fila del gráfico:
       las listas de abajo no saltan cuando aparece (E-09). -->
  <LoadingState loading={true} label="Cargando actividad">
    {#snippet skeleton()}
      <div class="row row--chart">
        <div class="ui-skel chart-skel"></div><div class="ui-skel chart-skel"></div>
      </div>
    {/snippet}
  </LoadingState>
{/if}

<!-- ── Fila 2: proyectos recientes + leads recientes (misma altura) ── -->
<div class="row row--lists">
  <Card tag="article" title="Proyectos recientes">
    <div class="list-body">
      {#if data.projectsError && !recentProjects.length}
        <ErrorState compact title="No se pudieron cargar los proyectos" message={data.projectsError} onretry={loadProjects} />
      {:else if !data.projectsLoaded}
        <LoadingState loading={true} rows={5} height={52} label="Cargando proyectos" />
      {:else if recentProjects.length}
        <ul class="rows">
          {#each recentProjects as p (p.id)}
            {@const st = projStatus(p.status)}
            <li>
              <a class="prow" href={href('progreso', [p.project_code || p.id])}>
                <span class="folder" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" style="fill:var(--surface-3);stroke:var(--icon-muted)" stroke-width="1.3"/><path d="M3 9h18" style="stroke:var(--icon-muted)" stroke-width="1.1"/></svg>
                </span>
                <span class="prow__main">
                  <span class="prow__name">{p.name}</span>
                  <span class="prow__client">
                    <span class="mono-av" style="background:{monoColor(p.client_name)}">{initials(p.client_name)}</span>
                    <span class="ellip">{p.client_name || 'Sin cliente'}</span>
                  </span>
                  <span class="prog" role="progressbar" aria-label="Avance" aria-valuemin="0" aria-valuemax="100" aria-valuenow={num(p.progress) || 0}><span class="prog__bar" style="width:{num(p.progress) || 0}%"></span></span>
                </span>
                <StatusChip tone={st.tone} label={st.label} />
              </a>
            </li>
          {/each}
        </ul>
        <a class="list-more" href={href('progreso')}>Ver todos los proyectos <Icon name="chevron" size={16} /></a>
      {:else}
        <EmptyState art="folder" title="Sin proyectos todavía" text="Los proyectos se crean al cerrar un brief o desde Progreso.">
          {#snippet action()}<a class="b b--mini" href={href('progreso')}>Ir a Progreso</a>{/snippet}
        </EmptyState>
      {/if}
    </div>
  </Card>

  <Card tag="article" title="Leads recientes">
    <div class="list-body">
      {#if data.leadsError && !leads.length}
        <ErrorState compact title="No se pudieron cargar los leads" message={data.leadsError} onretry={loadLeads} />
      {:else if !data.leadsLoaded}
        <LoadingState loading={true} rows={5} height={52} label="Cargando leads" />
      {:else if leads.length}
        <ul class="rows">
          {#each leads.slice(0, 5) as lead (lead.ref_id)}
            {@const src = sourceMeta(lead.source)}
            {@const detail = leadDetail(lead)}
            <li>
              <a class="lrow" href={href('leads', [lead.ref_id])}>
                <span class="mono-av lg" style="background:{monoColor(leadTitle(lead) + lead.ref_id)}">{initials(lead.name || lead.email || lead.ref_id)}</span>
                <span class="lrow__main">
                  <span class="lrow__name">{leadTitle(lead)}</span>
                  {#if detail}<span class="lrow__detail">{detail}</span>{/if}
                </span>
                <span class="lrow__meta">
                  <StatusChip tone={src.tone} label={src.label} />
                  <span class="dim">{fmtDate(lead.created_at)}</span>
                </span>
              </a>
            </li>
          {/each}
        </ul>
        <a class="list-more" href={href('leads')}>Ver todos los leads <Icon name="chevron" size={16} /></a>
      {:else}
        <EmptyState art="inbox" title="Sin leads todavía" text="Cuando alguien use el formulario de contacto, el chatbot o el diagnóstico, aparecerá aquí." />
      {/if}
    </div>
  </Card>
</div>

{#if home}
  <!-- ── Fila 3: actividad acumulada (banda ancha y baja) ── -->
  <div class="row">
    <Card tag="article">
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
                <stop offset="0" style="stop-color:var(--accent-gold)" stop-opacity="0.42"/>
                <stop offset="1" style="stop-color:var(--accent-gold)" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <path d={sparkPath.area} fill="url(#sparkFill)" />
            <path d={sparkPath.line} fill="none" style="stroke:var(--accent-gold)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
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
    </Card>
  </div>
{/if}
</div>

<style>
  .block { margin-bottom: var(--space-4); }
  .kpi-skel { height: 142px; border-radius: var(--radius-lg); }
  .chart-skel { height: 298px; border-radius: var(--radius-lg); }

  /* ── Filas de tarjetas ── */
  .stack { display: flex; flex-direction: column; gap: 14px; }
  .row { display: grid; gap: 14px; }
  .row--chart { grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); }
  .row--lists { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  /* Las tarjetas de una fila miden lo mismo y su contenido llena la altura:
     el pie ("Ver todos", archivados) se ancla abajo, sin aire muerto. */
  .row > :global(.ui-card) { display: flex; flex-direction: column; }

  /* ── Cabecera de métrica (rótulo + cifra) ── */
  .m-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); margin-bottom: 14px; }
  .m-lbl { margin: 0 0 6px; color: var(--fg-secondary); font-size: var(--dash-small); font-weight: 500; }
  .m-amount { margin: 0; font-family: var(--font-display); font-size: var(--dash-title); font-weight: 650; letter-spacing: var(--tracking-tight); line-height: 1; color: var(--fg-primary); font-variant-numeric: tabular-nums; }
  .m-amount .muted { font-size: var(--dash-small); font-weight: 400; letter-spacing: 0; color: var(--fg-subtle); }

  /* Notas de los KPIs: comparación real con su signo (verde si sube). */
  .sep { margin: 0 6px; color: var(--fg-faint); }
  .is-data { color: var(--accent-teal); font-weight: 600; }
  .is-down { color: var(--fg-secondary); font-weight: 600; }
  /* Envoltorio del KPI de dinero para medirlo: sin caja, la rejilla no lo ve. */
  .kpi-box { display: contents; }
  .exact { color: var(--fg-secondary); font-variant-numeric: tabular-nums; white-space: nowrap; }
  /* El monto de la comparación no se parte (el signo "−" quedaba solo al final de
     línea); el <wbr> tras el "·" le deja bajar entero a la línea siguiente. */
  .nw { white-space: nowrap; }

  /* ── Gráfico de barras ── */
  .plot { position: relative; }
  .chart { width: 100%; height: 184px; display: block; overflow: visible; touch-action: pan-y; }
  .chart__lbl { fill: var(--fg-secondary); font-family: var(--font-body); font-size: 12px; }
  .chart__lbl.is-active { fill: var(--fg-primary); font-weight: 600; }
  .chart__axis { fill: var(--fg-subtle); font-family: var(--font-body); font-size: 11px; font-variant-numeric: tabular-nums; }
  .chart__grid { stroke: rgba(255, 255, 255, 0.06); stroke-dasharray: 3 4; }
  .chart__base { stroke: rgba(255, 255, 255, 0.12); }
  .chart__guide { stroke: rgba(255, 255, 255, 0.22); stroke-dasharray: 4 4; }
  .chart__hit { cursor: pointer; }
  .chart-tip { white-space: nowrap; }

  /* ── Leads por estado: pista = 100 %, relleno = proporción real ── */
  .states-card { display: flex; flex-direction: column; flex: 1; }
  .states { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .st { display: grid; grid-template-columns: 1fr 32px; align-items: center; gap: 12px; text-decoration: none; color: inherit; border-radius: var(--radius-pill); }
  .st__track {
    position: relative; display: flex; align-items: center; min-height: 38px; padding: 0 14px;
    border-radius: var(--radius-pill); border: 1px solid var(--border-subtle); background: rgba(255, 255, 255, 0.015);
    overflow: hidden; transition: border-color var(--duration-fast);
  }
  .st:hover .st__track { border-color: var(--border-strong); }
  .st__fill {
    /* A1-04: 6 px = marca de "hay alguno", sin inflar la proporción real. */
    position: absolute; inset: 0 auto 0 0; min-width: 6px;
    border-radius: var(--radius-pill); background: var(--surface-3); border-right: 1px solid var(--border-strong);
    transition: width .4s var(--ease);
  }
  .st__fill--accent { background: rgba(var(--accent-gold-rgb), .16); border-right-color: var(--accent-gold-line); }
  .st__name { position: relative; font-size: var(--dash-small); color: var(--fg-primary); white-space: nowrap; }
  .st__name.is-accent { color: var(--accent-gold); }
  .st__n { text-align: right; font-size: var(--dash-small); color: var(--fg-secondary); font-variant-numeric: tabular-nums; }
  .states__foot {
    margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: var(--space-2);
    min-height: 44px; padding-top: 12px; border-top: 1px solid var(--border-subtle);
    color: var(--fg-secondary); font-size: var(--dash-small); text-decoration: none;
  }
  .states__foot strong { color: var(--fg-primary); font-weight: 600; font-variant-numeric: tabular-nums; }
  .states__foot:hover { color: var(--fg-primary); }
  .states { margin-bottom: 16px; }

  /* ── Listas (proyectos y leads recientes) ── */
  .list-body { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .rows li + li { border-top: 1px solid var(--border-subtle); }
  .prow, .lrow {
    display: flex; align-items: center; gap: var(--space-3); min-height: 70px; padding: 8px;
    border-radius: var(--radius-sm); color: inherit; text-decoration: none; transition: background var(--duration-fast);
  }
  .prow:hover, .lrow:hover { background: var(--bg-elevated); }
  .folder { width: 26px; height: 26px; flex: 0 0 auto; display: inline-flex; }
  .folder svg { width: 100%; height: 100%; }
  .prow__main, .lrow__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .prow__name, .lrow__name { color: var(--fg-primary); font-size: var(--dash-body); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .prow__client { display: flex; align-items: center; gap: 6px; font-size: var(--dash-caption); color: var(--fg-subtle); min-width: 0; }
  .lrow__detail { font-size: var(--dash-caption); color: var(--fg-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ellip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lrow__meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex: 0 0 auto; }
  .prog { display: block; height: 4px; width: 100%; background: var(--bg-elevated); border-radius: var(--radius-pill); overflow: hidden; margin-top: 2px; }
  .prog__bar { display: block; height: 100%; background: linear-gradient(90deg, var(--accent-gold-deep), var(--accent-gold-hover)); border-radius: var(--radius-pill); min-width: 2px; transition: width var(--duration-base) var(--ease); }
  .list-more {
    margin-top: auto; display: flex; align-items: center; justify-content: center; gap: 4px;
    min-height: 44px; padding-top: 8px; border-top: 1px solid var(--border);
    color: var(--fg-secondary); font-size: var(--dash-small); text-decoration: none; transition: color var(--duration-fast);
  }
  .list-more:hover { color: var(--fg-primary); }
  .rows { margin-bottom: 8px; }

  /* monograma de iniciales */
  .mono-av { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: 0 0 auto; border-radius: var(--radius-pill); color: #fff; font-family: var(--font-display); font-size: 10px; font-weight: 700; line-height: 1; }
  .mono-av.lg { width: 26px; height: 26px; }
  .dim { color: var(--fg-subtle); white-space: nowrap; font-size: var(--dash-caption); font-variant-numeric: tabular-nums; }

  /* ── Curva acumulada ── */
  .spark-wrap { position: relative; }
  .spark { display: block; width: 100%; height: 120px; }
  .spark-dot {
    position: absolute; width: 11px; height: 11px; border-radius: 50%;
    background: var(--accent-gold); border: 3px solid var(--bg-card);
    transform: translate(-50%, -50%); pointer-events: none;
    box-shadow: 0 0 0 1px var(--accent-gold-line), 0 4px 12px -2px var(--accent-gold-glow);
  }
  .spark-axis { display: flex; justify-content: space-between; margin-top: 8px; color: var(--fg-subtle); font-size: var(--dash-caption); }

  /* A1-07: el gráfico se apila antes (necesita ancho); las dos listas
     caben lado a lado hasta ~900 px (portátil pequeño, iPad horizontal). */
  @media (max-width: 1099px) {
    .row--chart { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 899px) {
    .row--lists { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 719px) {
    .m-amount { font-size: 26px; }
    .prow, .lrow { gap: 10px; padding: 8px 4px; }
  }
</style>
