<script>
  import { onMount } from 'svelte';
  import BrandLogo from './BrandLogo.svelte';
  import BriefsSection from './BriefsSection.svelte';
  import FinanzasSection from './FinanzasSection.svelte';
  import ProgresoSection from './ProgresoSection.svelte';
  import SeoSection from './SeoSection.svelte';
  import NotificationsSection from './NotificationsSection.svelte';

  // ── Estado ───────────────────────────────────────────────────
  let phase = $state('loading');      // loading | login | app
  let user = $state('');
  let emailInput = $state('');
  let loginMsg = $state('');
  let loginSending = $state(false);

  let section = $state('dashboard');  // dashboard | leads
  let leads = $state([]);
  let stats = $state(null);
  let leadsLoading = $state(false);
  let leadsError = $state('');

  let home = $state(null);
  let projects = $state([]);
  let subs = $state([]);
  let installPrompt = $state(null);

  // Índice de barra resaltada en el gráfico (hover). Por defecto, el mes actual.
  let hoverBar = $state(-1);

  const MONTH_LABELS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  function monthLabel(m) { return MONTH_LABELS[parseInt(m.slice(5, 7), 10) - 1] || m; }
  const activity = $derived(home ? home.activity : []);
  const chartMax = $derived(Math.max(1, ...activity.map((a) => a.total)));
  // Barra "activa": la que tiene el cursor encima, o el mes actual si no hay hover.
  const activeBar = $derived(hoverBar >= 0 ? hoverBar : activity.length - 1);

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
    return activity.map((a) => (acc += a.total));
  });
  const sparkTotal = $derived(sparkPoints.length ? sparkPoints[sparkPoints.length - 1] : 0);
  const SPARK_W = 560, SPARK_H = 150;
  const sparkPath = $derived.by(() => {
    const n = sparkPoints.length;
    if (n < 2) return { line: '', area: '' };
    const max = Math.max(1, ...sparkPoints);
    const step = SPARK_W / (n - 1);
    const xy = sparkPoints.map((v, i) => [i * step, SPARK_H - 8 - (v / max) * (SPARK_H - 24)]);
    const line = xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = 'M0 ' + SPARK_H + ' ' + line.replace(/^M/, 'L') + ' L' + SPARK_W + ' ' + SPARK_H + ' Z';
    return { line, area };
  });

  // ── Suscripciones activas → sidebar + run-rate mensual ───────
  const activeSubs = $derived(subs.filter((s) => s.active).slice(0, 6));
  const monthlyRunRate = $derived(subs
    .filter((s) => s.active)
    .reduce((sum, s) => sum + (s.cycle === 'yearly' ? Math.round((s.amount_cents || 0) / 12) : (s.amount_cents || 0)), 0));
  function money(cents) {
    return '$' + ((cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  // ── Proyectos recientes (Orbit table) ────────────────────────
  const recentProjects = $derived(projects.slice(0, 6));
  const PROJECT_STATUS = {
    active:    { label: 'En curso',   cls: 'active'    },
    on_hold:   { label: 'En pausa',   cls: 'hold'      },
    completed: { label: 'Terminado',  cls: 'completed' },
  };
  function projStatus(s) { return PROJECT_STATUS[s] || { label: s || '—', cls: 'hold' }; }
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

  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', live: true },
    { id: 'leads', label: 'Leads', icon: 'M3 8l9 6 9-6M3 8v10h18V8M3 8l9-5 9 5', live: true },
    { id: 'briefs', label: 'Briefs', icon: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6zM14 3v6h6', live: true },
    { id: 'finanzas', label: 'Finanzas', icon: 'M3 7h18v10H3zM3 7l9 6 9-6', live: true },
    { id: 'progreso', label: 'Progreso', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11', live: true },
    { id: 'seo', label: 'SEO', icon: 'M4 20V10M10 20V4M16 20v-6M22 20H2', live: true },
    { id: 'notificaciones', label: 'Avisos', icon: 'M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0', live: true },
  ];

  const STATUSES = [
    { id: 'new', label: 'Nuevo' },
    { id: 'contacted', label: 'Contactado' },
    { id: 'converted', label: 'Convertido' },
    { id: 'archived', label: 'Archivado' },
  ];

  // ── Helpers ──────────────────────────────────────────────────
  async function api(url, opts = {}) {
    return fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
  }

  function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const firstName = $derived(user ? user.split('@')[0] : '');
  const sectionTitle = $derived((NAV.find((n) => n.id === section) || {}).label || '');

  // Tira de conteo por estado para la cabecera de Leads (densidad).
  const leadCounts = $derived([
    { id: 'new',       label: 'Nuevos',      n: stats?.new ?? 0       },
    { id: 'contacted', label: 'Contactados', n: stats?.contacted ?? 0 },
    { id: 'converted', label: 'Convertidos', n: stats?.converted ?? 0 },
    { id: 'archived',  label: 'Archivados',  n: stats?.archived ?? 0  },
  ]);

  // ── Sesión ───────────────────────────────────────────────────
  async function checkSession() {
    try {
      const res = await api('/api/admin/me');
      if (res.ok) {
        const j = await res.json();
        if (j && j.email) { user = j.email; phase = 'app'; loadHome(); loadLeads(); loadProjects(); loadSubs(); return; }
      }
    } catch (_) {}
    phase = 'login';
  }

  async function doLogin(e) {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) return;
    loginSending = true;
    loginMsg = '';
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ email }) });
    } catch (_) {}
    loginSending = false;
    loginMsg = 'Si tu correo está autorizado, te enviamos un enlace de acceso. Ábrelo y vuelve a /dashboard.';
  }

  async function logout() {
    try { await api('/api/admin/logout', { method: 'POST' }); } catch (_) {}
    user = '';
    phase = 'login';
  }

  // ── Home / analítica ─────────────────────────────────────────
  async function loadHome() {
    try {
      const res = await api('/api/admin/dashboard/analytics');
      if (res.status === 401) { phase = 'login'; return; }
      const j = await res.json();
      if (j.ok) home = j;
    } catch (_) {}
  }

  async function loadProjects() {
    try {
      const res = await api('/api/admin/projects');
      if (!res.ok) return;
      const j = await res.json();
      if (j.ok) projects = j.rows || [];
    } catch (_) {}
  }

  async function loadSubs() {
    try {
      const res = await api('/api/admin/subscriptions');
      if (!res.ok) return;
      const j = await res.json();
      if (j.ok) subs = j.rows || [];
    } catch (_) {}
  }

  // ── PWA install ──────────────────────────────────────────────
  async function doInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    try { await installPrompt.userChoice; } catch (_) {}
    installPrompt = null;
  }

  // ── Leads ────────────────────────────────────────────────────
  async function loadLeads() {
    leadsLoading = true;
    leadsError = '';
    try {
      const res = await api('/api/admin/leads?limit=100');
      if (res.status === 401) { phase = 'login'; return; }
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      leads = j.rows || [];
      stats = j.stats || null;
    } catch (err) {
      leadsError = err.message || 'Error al cargar leads';
    } finally {
      leadsLoading = false;
    }
  }

  async function setStatus(lead, status) {
    const prev = lead.status;
    lead.status = status;
    leads = [...leads];
    try {
      const res = await api('/api/admin/leads/' + encodeURIComponent(lead.ref_id), {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      loadLeads();
    } catch (_) {
      lead.status = prev;
      leads = [...leads];
    }
  }

  onMount(() => {
    checkSession();
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
  });
</script>

{#if phase === 'loading'}
  <div class="center"><div class="spinner"></div></div>

{:else if phase === 'login'}
  <div class="center">
    <form class="login" onsubmit={doLogin}>
      <div class="brand brand--lg">
        <span class="planet" aria-hidden="true"></span>
        <span class="wordmark">MAR<em>CYAN</em></span>
      </div>
      <p class="login__tag">Panel de operaciones</p>
      <label class="login__lbl" for="login-email">Tu correo</label>
      <input id="login-email" type="email" bind:value={emailInput} placeholder="tu@marcyanstudio.com" autocomplete="email" required />
      <button type="submit" class="b b--primary" disabled={loginSending}>
        {loginSending ? 'Enviando…' : 'Enviar enlace de acceso'}
      </button>
      {#if loginMsg}<p class="login__msg">{loginMsg}</p>{/if}
    </form>
  </div>

{:else}
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="planet" aria-hidden="true"></span>
        <span class="wordmark">MAR<em>CYAN</em></span>
      </div>
      <nav class="nav">
        <span class="nav__cap">Operación</span>
        {#each NAV as item}
          <button
            class="nav__item"
            class:active={section === item.id}
            class:soon={!item.live}
            disabled={!item.live}
            onclick={() => item.live && (section = item.id)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={item.icon} /></svg>
            <span>{item.label}</span>
            {#if !item.live}<span class="nav__soon">pronto</span>{/if}
          </button>
        {/each}
      </nav>

      <div class="side-subs">
        <span class="nav__cap">Suscripciones</span>
        {#if activeSubs.length}
          <div class="subs">
            {#each activeSubs as s (s.id)}
              <div class="subs__row" title={`${s.name} · ${money(s.amount_cents)}/${s.cycle === 'yearly' ? 'año' : 'mes'}`}>
                <BrandLogo name={s.name} size={22} />
                <span class="subs__name">{s.name}</span>
                <span class="subs__tag">{s.category}</span>
              </div>
            {/each}
          </div>
          <div class="runrate">
            <span class="runrate__lbl">Gasto / mes</span>
            <span class="runrate__num">{money(monthlyRunRate)}</span>
          </div>
        {:else}
          <p class="subs__hint">Agregá tus suscripciones en Finanzas.</p>
        {/if}
      </div>

      <div class="sidebar__foot">
        <span class="online"></span> En línea
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <span class="crumb">{sectionTitle}</span>
        <div class="topbar__right">
          {#if installPrompt}<button class="install" onclick={doInstall}>⤓ Instalar app</button>{/if}
          <span class="user" title={user}>{user}</span>
          <button class="b b--ghost" onclick={logout}>Salir</button>
        </div>
      </header>

      {#if section === 'dashboard'}
        <h1 class="greet">Hola, {firstName}</h1>

        <!-- ── KPIs: número grande + delta + arte de esquina 3D-ish ── -->
        <div class="kpis">
          <article class="kpi">
            <p class="kpi__lbl">Leads nuevos</p>
            <div class="kpi__row">
              <span class="kpi__num gold">{home?.kpis ? home.kpis.new_leads : '–'}</span>
              <div class="kpi__art" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none">
                  <defs>
                    <linearGradient id="kpiInbox" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stop-color="#fb923c"/><stop offset="1" stop-color="#ea580c"/>
                    </linearGradient>
                  </defs>
                  <rect x="12" y="20" width="40" height="28" rx="5" fill="#1b1b20" stroke="#3a3a43"/>
                  <path d="M12 25l20 13 20-13" fill="none" stroke="#4a4a55" stroke-width="1.4"/>
                  <rect x="20" y="12" width="24" height="18" rx="3" fill="url(#kpiInbox)"/>
                  <path d="M24 18h16M24 22h11" stroke="#fff" stroke-opacity="0.85" stroke-width="1.6" stroke-linecap="round"/>
                  <circle cx="46" cy="44" r="3" fill="#fff" fill-opacity="0.18"/>
                </svg>
              </div>
            </div>
            <p class="kpi__delta"><span class="up">{home?.kpis?.new_leads ? '+' + home.kpis.new_leads : '·'}</span> <span class="muted">este mes</span></p>
          </article>

          <article class="kpi">
            <p class="kpi__lbl">Briefs pendientes</p>
            <div class="kpi__row">
              <span class="kpi__num">{home?.kpis ? home.kpis.pending_briefs : '–'}</span>
              <div class="kpi__art" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none">
                  <rect x="18" y="22" width="28" height="34" rx="3" fill="#23232a" stroke="#4a4a55"/>
                  <rect x="14" y="16" width="28" height="34" rx="3" fill="#1b1b20" stroke="#4a4a55"/>
                  <path d="M19 24h18M19 29h18M19 34h12" stroke="#6b6b74" stroke-width="1.6" stroke-linecap="round"/>
                  <path d="M24 40l2.5 2.5L32 37" stroke="#fb923c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <rect x="14" y="16" width="28" height="6" rx="3" fill="#fff" fill-opacity="0.05"/>
                </svg>
              </div>
            </div>
            <p class="kpi__delta"><span class="muted">en cola de revisión</span></p>
          </article>

          <article class="kpi">
            <p class="kpi__lbl">En curso (mes)</p>
            <div class="kpi__row">
              <span class="kpi__num">{home?.kpis ? home.kpis.projects_this_month : '–'}</span>
              <div class="kpi__art" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none">
                  <defs>
                    <radialGradient id="kpiClock" cx="0.4" cy="0.35" r="0.8">
                      <stop offset="0" stop-color="#2a2a31"/><stop offset="1" stop-color="#15151a"/>
                    </radialGradient>
                  </defs>
                  <circle cx="32" cy="34" r="20" fill="url(#kpiClock)" stroke="#4a4a55"/>
                  <circle cx="32" cy="34" r="20" fill="none" stroke="#fb923c" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="78 126" transform="rotate(-90 32 34)"/>
                  <path d="M32 34V24M32 34l7 4" stroke="#f4f4f5" stroke-width="2" stroke-linecap="round"/>
                  <ellipse cx="26" cy="27" rx="6" ry="4" fill="#fff" fill-opacity="0.07"/>
                </svg>
              </div>
            </div>
            <p class="kpi__delta"><span class="muted">proyectos activos</span></p>
          </article>

          <article class="kpi">
            <p class="kpi__lbl">Cobrado (mes)</p>
            <div class="kpi__row">
              <span class="kpi__num teal">{home?.kpis && home.kpis.revenue_this_month != null ? home.kpis.revenue_this_month : '—'}</span>
              <div class="kpi__art" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none">
                  <defs>
                    <linearGradient id="kpiCoin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stop-color="#6ee7b7"/><stop offset="1" stop-color="#34d399"/>
                    </linearGradient>
                  </defs>
                  <ellipse cx="32" cy="48" rx="16" ry="5" fill="#1b1b20" stroke="#3a3a43"/>
                  <ellipse cx="32" cy="44" rx="16" ry="5" fill="#23232a" stroke="#4a4a55"/>
                  <ellipse cx="32" cy="40" rx="16" ry="5" fill="#1b1b20" stroke="#4a4a55"/>
                  <ellipse cx="32" cy="34" rx="16" ry="6" fill="url(#kpiCoin)"/>
                  <text x="32" y="38" text-anchor="middle" font-size="9" font-weight="700" fill="#0e3b2c">$</text>
                  <ellipse cx="27" cy="32" rx="5" ry="2" fill="#fff" fill-opacity="0.35"/>
                </svg>
              </div>
            </div>
            <p class="kpi__delta"><span class="up">cobrado</span> <span class="muted">vs mes anterior</span></p>
          </article>
        </div>

        <!-- ── Fila 1: gráfico interactivo (ancho) + proyectos recientes ── -->
        <div class="grid-2 grid-2--chart">
          <article class="card">
            <header class="card__head">
              <div>
                <p class="card__lbl">Actividad por mes</p>
                <h3 class="card__amount">{activity.length ? activity[activeBar]?.total ?? 0 : 0} <span class="muted">{activity.length ? monthLabel(activity[activeBar]?.month || '') : ''}</span></h3>
              </div>
              <span class="chip">leads + briefs</span>
            </header>

            {#if home && activity.length}
              {@const N = activity.length}
              {@const PW = 560}
              {@const slot = PW / N}
              {@const PLOT = 150}
              <div class="plot">
                {#if hoverBar >= 0}
                  <span class="chart-tip" style="left:{(hoverBar * slot + slot / 2) / PW * 100}%;top:{(PLOT - (activity[hoverBar].total / chartMax) * (PLOT - 22)) / 196 * 100}%">{activity[hoverBar].total}</span>
                {/if}
                <svg class="chart" viewBox="0 0 560 196" role="img" aria-label="Actividad por mes" onmouseleave={() => (hoverBar = -1)}>
                  <defs>
                    <linearGradient id="barActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stop-color="#fb923c"/><stop offset="1" stop-color="#ea580c"/>
                    </linearGradient>
                    <filter id="barGlow" x="-60%" y="-60%" width="220%" height="220%">
                      <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="rgb(249, 115, 22)" flood-opacity="0.5" />
                    </filter>
                  </defs>
                  <line x1="0" y1="44" x2="560" y2="44" class="chart__grid" />
                  <line x1="0" y1="82" x2="560" y2="82" class="chart__grid" />
                  <line x1="0" y1="120" x2="560" y2="120" class="chart__grid" />
                  <line x1="0" y1="150" x2="560" y2="150" class="chart__base" />

                  {#each activity as a, i}
                    {@const bx = i * slot + slot * 0.28}
                    {@const bw = slot * 0.44}
                    {@const bh = (a.total / chartMax) * (PLOT - 22)}
                    {@const by = PLOT - bh}
                    {@const cx = i * slot + slot / 2}
                    {@const isActive = i === activeBar}
                    {#if isActive}
                      <line x1="0" y1={by} x2="560" y2={by} class="chart__guide" />
                    {/if}
                    <rect
                      x={bx} y={by} width={bw} height={Math.max(bh, 1)} rx="5"
                      fill={isActive ? 'url(#barActive)' : '#2b2b33'}
                      filter={isActive ? 'url(#barGlow)' : undefined} />
                    <!-- hit area transparente para hover cómodo -->
                    <rect x={i * slot} y="0" width={slot} height={PLOT} fill="transparent"
                      onmouseenter={() => (hoverBar = i)} role="presentation" />
                    {#if isActive}
                      <circle cx={cx} cy={by} r="4" fill="var(--accent-gold)" stroke="var(--bg-card)" stroke-width="1.5" />
                    {/if}
                    <text x={cx} y="174" text-anchor="middle" class="chart__lbl" class:is-active={isActive}>{monthLabel(a.month)}</text>
                  {/each}
                </svg>
              </div>
            {:else}<div class="muted">Cargando…</div>{/if}
          </article>

          <article class="card">
            <header class="card__head card__head--row">
              <h3 class="card__title">Proyectos recientes</h3>
            </header>
            {#if recentProjects.length}
              <div class="ptable">
                {#each recentProjects as p (p.id)}
                  {@const st = projStatus(p.status)}
                  <div class="prow">
                    <span class="folder" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="#23232a" stroke="#4a4a55" stroke-width="1.3"/><path d="M3 9h18" stroke="#4a4a55" stroke-width="1.1"/></svg>
                    </span>
                    <div class="prow__main">
                      <span class="prow__name">{p.name}</span>
                      <span class="prow__client">
                        <span class="mono-av" style="background:{monoColor(p.client_name)}">{initials(p.client_name)}</span>
                        {p.client_name}
                      </span>
                      <span class="prog"><span class="prog__bar" style="width:{p.progress || 0}%"></span></span>
                    </div>
                    <span class="pill-st pill-st--{st.cls}">{st.label}</span>
                  </div>
                {/each}
              </div>
              <button class="ptable__more" onclick={() => (section = 'progreso')}>Ver todos los proyectos</button>
            {:else}<div class="muted">Sin proyectos todavía.</div>{/if}
          </article>
        </div>

        <!-- ── Fila 2: embudo (pills decrecientes) + sparkline de actividad acumulada ── -->
        <div class="grid-2 grid-2--funnel">
          <article class="card">
            <header class="card__head">
              <div>
                <p class="card__lbl">Leads por estado</p>
                <h3 class="card__amount">{home ? (home.funnel.new + home.funnel.contacted + home.funnel.converted + home.funnel.archived) : 0} <span class="muted">en pipeline</span></h3>
              </div>
            </header>
            {#if home}
              <div class="funnel">
                {#each funnelRows as row, i}
                  <div class="funnel__row">
                    <span class="funnel__pill" class:funnel__pill--accent={i === 0} style="--w:{funnelW(i)}%">{row.name}</span>
                    <span class="funnel__n">{row.n}</span>
                  </div>
                {/each}
              </div>
            {:else}<div class="muted">Cargando…</div>{/if}
          </article>

          <article class="card">
            <header class="card__head">
              <div>
                <p class="card__lbl">Actividad acumulada</p>
                <h3 class="card__amount big">{sparkTotal} <span class="muted">en 6 meses</span></h3>
              </div>
              <span class="chip chip--up">↑ tendencia</span>
            </header>
            {#if home && sparkPath.line}
              <svg class="spark" viewBox="0 0 {SPARK_W} {SPARK_H}" preserveAspectRatio="none" role="img" aria-label="Actividad acumulada">
                <defs>
                  <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#f97316" stop-opacity="0.42"/>
                    <stop offset="1" stop-color="#f97316" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path d={sparkPath.area} fill="url(#sparkFill)" />
                <path d={sparkPath.line} fill="none" stroke="#f97316" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            {:else}<div class="muted">Cargando…</div>{/if}
          </article>
        </div>

        <!-- ── Leads recientes (compacto) ── -->
        <article class="card">
          <header class="card__head card__head--row">
            <h3 class="card__title">Leads recientes</h3>
            <button class="link-btn" onclick={() => (section = 'leads')}>Ver todos</button>
          </header>
          {#if leads.length}
            <div class="recent">
              {#each leads.slice(0, 5) as lead (lead.ref_id)}
                <div class="recent__row">
                  <span class="mono-av sm" style="background:{monoColor(lead.name || lead.email || lead.ref_id)}">{initials(lead.name || lead.email || lead.ref_id)}</span>
                  <span class="recent__name">{lead.name || lead.email || lead.phone || '—'}</span>
                  <span class="src src--{lead.source}">{lead.source === 'chat' ? 'chatbot' : 'contacto'}</span>
                  <span class="mono dim">{fmtDate(lead.created_at)}</span>
                </div>
              {/each}
            </div>
          {:else}<div class="empty-inline">Sin leads todavía.</div>{/if}
        </article>

      {:else if section === 'leads'}
        <div class="sec-head">
          <h1 class="greet">Leads</h1>
          <button class="b b--ghost" onclick={loadLeads}>Actualizar</button>
        </div>

        {#if stats}
          <div class="count-strip">
            <div class="count">
              <span class="count__n">{stats.total ?? leads.length}</span>
              <span class="count__lbl">Total</span>
            </div>
            {#each leadCounts as c}
              <div class="count count--{c.id}">
                <span class="count__n">{c.n}</span>
                <span class="count__lbl">{c.label}</span>
              </div>
            {/each}
          </div>
        {/if}

        {#if leadsLoading}
          <div class="empty">Cargando…</div>
        {:else if leadsError}
          <div class="empty err">{leadsError}</div>
        {:else if leads.length === 0}
          <div class="empty">Sin leads todavía. Cuando alguien use el formulario de contacto o el chatbot, aparecerá aquí.</div>
        {:else}
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>Contacto</th><th>Origen</th><th>Mensaje</th><th>Fecha</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {#each leads as lead (lead.ref_id)}
                  <tr>
                    <td>
                      <div class="c-cell">
                        <span class="mono-av" style="background:{monoColor(lead.name || lead.email || lead.ref_id)}">{initials(lead.name || lead.email || lead.ref_id)}</span>
                        <div class="c-text">
                          <div class="c-name">{lead.name || '—'}</div>
                          <div class="c-sub">{lead.email || lead.phone || lead.ref_id}</div>
                        </div>
                      </div>
                    </td>
                    <td><span class="src src--{lead.source}">{lead.source === 'chat' ? 'chatbot' : 'contacto'}</span></td>
                    <td class="msg">{lead.interest || lead.message || '—'}</td>
                    <td class="mono dim">{fmtDate(lead.created_at)}</td>
                    <td>
                      <select class="status status--{lead.status}" value={lead.status} onchange={(e) => setStatus(lead, e.currentTarget.value)}>
                        {#each STATUSES as s}<option value={s.id}>{s.label}</option>{/each}
                      </select>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}

      {:else if section === 'briefs'}
        <BriefsSection />
      {:else if section === 'finanzas'}
        <FinanzasSection />
      {:else if section === 'progreso'}
        <ProgresoSection />
      {:else if section === 'seo'}
        <SeoSection />
      {:else if section === 'notificaciones'}
        <NotificationsSection />
      {/if}
    </main>
  </div>
{/if}

<style>
  /* ── Layout base ── */
  .center { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: var(--space-5); }
  .spinner { width: 28px; height: 28px; border: 2px solid var(--accent-gold-line); border-top-color: var(--accent-gold); border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Marca ── */
  .brand { display: flex; align-items: center; gap: var(--space-3); }
  .brand--lg { justify-content: center; margin-bottom: var(--space-2); }
  .planet { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--accent-gold); position: relative; flex: 0 0 auto; }
  .planet::after { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: var(--accent-gold); }
  .wordmark { font-family: var(--font-display); font-weight: 700; letter-spacing: .14em; font-size: 15px; color: var(--accent-gold); }
  .wordmark em { font-style: italic; font-weight: 400; color: var(--accent-gold); opacity: .85; }

  /* ── Login ── */
  .login { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: var(--space-3); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-7) var(--space-6); }
  .login__tag { text-align: center; font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: var(--tracking-widest); text-transform: uppercase; color: var(--fg-secondary); margin: 0 0 var(--space-3); }
  .login__lbl { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--accent-gold); }
  .login input { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); padding: 11px 14px; font-size: var(--text-base); min-height: var(--tap-min); }
  .login input:focus { outline: none; border-color: var(--accent-gold); box-shadow: 0 0 0 3px var(--accent-gold-dim); }
  .login__msg { font-size: var(--text-sm); color: var(--accent-teal); line-height: 1.5; margin: var(--space-1) 0 0; }

  /* ── Botones ── */
  /* La definición canónica de .b/.btn vive en dashboard.css (global). */

  /* ── Shell ── */
  .shell { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
  .sidebar { background: var(--bg-2); border-right: 1px solid var(--border); padding: var(--space-5) var(--space-4); display: flex; flex-direction: column; gap: var(--space-5); }
  .nav { display: flex; flex-direction: column; gap: 3px; }
  .nav__cap { font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-wider); text-transform: uppercase; color: var(--fg-subtle); padding: 0 10px var(--space-2); }
  .nav__item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: var(--radius-md); border: 0; background: transparent; color: var(--fg-secondary); font-size: var(--text-sm); cursor: pointer; text-align: left; width: 100%; transition: all var(--duration-fast); }
  .nav__item svg { width: 17px; height: 17px; flex: 0 0 auto; }
  .nav__item:hover:not(:disabled) { background: var(--bg-elevated); color: var(--fg-primary); }
  .nav__item.active { background: var(--bg-elevated); color: var(--accent-gold); box-shadow: inset 2px 0 0 var(--accent-gold), 0 0 0 1px var(--border); border-radius: var(--radius-md); font-weight: 600; }
  .nav__item.soon { cursor: default; color: var(--fg-subtle); }
  .nav__soon { margin-left: auto; font-family: var(--font-mono); font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: var(--fg-subtle); }
  .sidebar__foot { margin-top: auto; display: flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--accent-teal); padding: 8px 10px; border: 1px solid var(--accent-teal-line); border-radius: var(--radius-md); }
  .online { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-teal); }

  /* ── Sidebar: suscripciones ── */
  .side-subs { display: flex; flex-direction: column; gap: 4px; }
  .subs__hint { margin: 4px 10px 0; font-size: var(--text-xs); color: var(--fg-subtle); line-height: 1.5; }
  .runrate { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin: 6px 0 0; padding: 9px 11px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); }
  .runrate__lbl { font-size: var(--text-xs); color: var(--fg-subtle); }
  .runrate__num { font-family: var(--font-display); font-weight: 700; font-size: var(--text-sm); color: var(--accent-gold); font-variant-numeric: tabular-nums; }

  /* ── Main ── */
  .main { padding: var(--space-5) var(--space-6); min-width: 0; }
  .topbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding-bottom: var(--space-4); border-bottom: 1px solid var(--border); }
  .crumb { font-family: var(--font-body); font-weight: 600; font-size: var(--text-sm); letter-spacing: normal; color: var(--fg-secondary); }
  .topbar__right { display: flex; align-items: center; gap: var(--space-4); }
  .install { font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--accent-gold); background: transparent; border: 1px solid var(--accent-gold-line); border-radius: var(--radius-sm); padding: 5px 9px; cursor: pointer; transition: all var(--duration-fast); }
  .install:hover { background: var(--accent-gold-dim); border-color: var(--accent-gold); }
  .user { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--fg-secondary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .greet { font-family: var(--font-display); font-weight: 700; font-size: var(--text-xl); letter-spacing: var(--tracking-tight); margin: var(--space-5) 0 var(--space-4); }
  .sec-head { display: flex; align-items: center; justify-content: space-between; }

  /* ── KPI cards: número grande + delta + arte de esquina ── */
  .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-3); }
  .kpi { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-4) var(--space-3); }
  .kpi__lbl { margin: 0 0 var(--space-3); font-weight: 500; font-size: var(--text-sm); color: var(--fg-secondary); }
  .kpi__row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
  .kpi__num { font-family: var(--font-display); font-weight: 700; font-size: var(--text-2xl); line-height: 1; letter-spacing: var(--tracking-tight); color: var(--fg-primary); }
  .kpi__num.gold { color: var(--accent-gold); }
  .kpi__num.teal { color: var(--accent-teal); }
  .kpi__art { width: 60px; height: 60px; flex: 0 0 auto; }
  .kpi__art svg { width: 100%; height: 100%; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.45)); }
  .kpi__delta { margin: var(--space-3) 0 0; font-size: var(--text-sm); }
  .kpi__delta .up { color: var(--accent-teal); font-weight: 600; }

  /* ── Grids densos de cards ── */
  .grid-2 { display: grid; gap: var(--space-3); margin-top: var(--space-3); }
  .grid-2--chart { grid-template-columns: 1.5fr 1fr; }
  .grid-2--funnel { grid-template-columns: 1fr 1.45fr; }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5) var(--space-4); }
  .card__head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); }
  .card__head--row { align-items: center; margin-bottom: var(--space-2); }
  .card__lbl { margin: 0 0 6px; color: var(--fg-secondary); font-size: var(--text-sm); font-weight: 500; }
  .card__title { margin: 0; font-size: var(--text-sm); font-weight: 600; color: var(--fg-primary); }
  .card__amount { margin: 0; font-family: var(--font-display); font-size: 26px; font-weight: 700; letter-spacing: var(--tracking-tight); line-height: 1; }
  .card__amount.big { font-size: 30px; }
  .card__amount .muted { font-size: var(--text-sm); font-weight: 400; letter-spacing: 0; }
  .chip { font-size: 11px; font-weight: 500; color: var(--fg-secondary); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-pill); padding: 5px 11px; white-space: nowrap; }
  .chip--up { color: var(--accent-teal); border-color: var(--accent-teal-line); background: var(--accent-teal-dim); }
  .link-btn { background: transparent; border: 0; color: var(--fg-secondary); font-size: var(--text-sm); cursor: pointer; padding: 4px 6px; border-radius: var(--radius-sm); transition: color var(--duration-fast); }
  .link-btn:hover { color: var(--accent-gold); }
  .muted { color: var(--fg-subtle); font-size: var(--text-sm); padding: var(--space-4) 0; }

  /* ── Gráfico de barras interactivo ── */
  .plot { position: relative; }
  .chart { width: 100%; height: auto; display: block; }
  .chart__lbl { fill: var(--fg-subtle); font-family: var(--font-mono); font-size: 11px; }
  .chart__lbl.is-active { fill: var(--accent-gold); font-weight: 700; }
  .chart__grid { stroke: rgba(255, 255, 255, 0.06); stroke-dasharray: 3 4; }
  .chart__base { stroke: rgba(255, 255, 255, 0.12); }
  .chart__guide { stroke: rgba(255, 255, 255, 0.22); stroke-dasharray: 4 4; }
  .chart rect[role="presentation"] { cursor: pointer; }

  /* ── Tabla de proyectos (Orbit) ── */
  .ptable { display: flex; flex-direction: column; }
  .prow { display: flex; align-items: center; gap: var(--space-3); padding: 9px 8px; border-top: 1px solid var(--border-subtle); border-radius: var(--radius-sm); transition: background var(--duration-fast); }
  .prow:first-child { border-top: 0; }
  .prow:hover { background: var(--bg-elevated); }
  .folder { width: 26px; height: 26px; flex: 0 0 auto; display: inline-flex; }
  .folder svg { width: 100%; height: 100%; }
  .prow__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .prow__name { color: var(--fg-primary); font-size: var(--text-sm); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .prow__client { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--fg-subtle); }
  .prog { display: block; height: 4px; width: 100%; background: var(--bg-elevated); border-radius: var(--radius-pill); overflow: hidden; margin-top: 2px; }
  .prog__bar { display: block; height: 100%; background: linear-gradient(90deg, var(--accent-gold-deep), var(--accent-gold-hover)); border-radius: var(--radius-pill); min-width: 2px; transition: width var(--duration-base) var(--ease); }
  .ptable__more { display: block; width: 100%; text-align: center; padding: 10px; margin-top: var(--space-2); border: 0; border-top: 1px solid var(--border); background: transparent; color: var(--fg-secondary); font-size: var(--text-sm); cursor: pointer; transition: color var(--duration-fast); }
  .ptable__more:hover { color: var(--fg-primary); }

  /* monograma de iniciales */
  .mono-av { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: 0 0 auto; border-radius: var(--radius-pill); color: #fff; font-family: var(--font-display); font-size: 10px; font-weight: 700; line-height: 1; }
  .mono-av.sm { width: 24px; height: 24px; font-size: 10px; }

  /* status pill (proyectos) */
  .pill-st { flex: 0 0 auto; font-size: 11px; font-weight: 600; padding: 4px 11px; border-radius: var(--radius-pill); border: 1px solid; white-space: nowrap; }
  .pill-st--active { color: var(--accent-gold); border-color: var(--accent-gold-line); background: var(--accent-gold-dim); }
  .pill-st--completed { color: var(--accent-teal); border-color: var(--accent-teal-line); background: var(--accent-teal-dim); }
  .pill-st--hold { color: var(--fg-subtle); border-color: var(--border-strong); background: var(--bg-elevated); }

  /* sparkline */
  .spark { display: block; width: 100%; height: 150px; }

  /* leads recientes compactos */
  .recent { display: flex; flex-direction: column; }
  .recent__row { display: flex; align-items: center; gap: var(--space-3); padding: 8px 6px; border-top: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: var(--text-sm); transition: background var(--duration-fast); }
  .recent__row:first-child { border-top: 0; }
  .recent__row:hover { background: var(--bg-elevated); }
  .recent__name { flex: 1; color: var(--fg-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .empty-inline { color: var(--fg-subtle); font-size: var(--text-sm); padding: var(--space-3) 0; }

  @media (max-width: 980px) {
    .kpis { grid-template-columns: repeat(2, 1fr); }
    .grid-2--chart, .grid-2--funnel { grid-template-columns: 1fr; }
  }

  /* ── Tira de conteo por estado (densidad en Leads) ── */
  .count-strip { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--space-3); margin-top: var(--space-4); }
  .count { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4); display: flex; flex-direction: column; gap: 4px; }
  .count__n { font-family: var(--font-display); font-weight: 700; font-size: var(--text-lg); line-height: 1; letter-spacing: var(--tracking-tight); color: var(--fg-primary); font-variant-numeric: tabular-nums; }
  .count__lbl { font-size: var(--text-xs); color: var(--fg-secondary); }
  .count--new { box-shadow: inset 3px 0 0 var(--accent-gold); }
  .count--contacted { box-shadow: inset 3px 0 0 var(--accent-teal); }
  .count--converted { box-shadow: inset 3px 0 0 var(--accent-teal); }
  .count--archived { box-shadow: inset 3px 0 0 var(--fg-subtle); }

  /* ── Tabla de leads ── */
  .table-wrap { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; margin-top: var(--space-4); }
  .c-cell { display: flex; align-items: center; gap: 10px; }
  .c-text { min-width: 0; }
  .table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
  .table th { text-align: left; font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-subtle); padding: 12px 14px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  .table td { padding: 12px 14px; border-bottom: 1px solid var(--border-subtle); vertical-align: middle; color: var(--fg-secondary); }
  .table tbody tr { transition: background var(--duration-fast); }
  .table tbody tr:hover td { background: var(--bg-elevated); }
  .table tr:last-child td { border-bottom: 0; }
  .mono { font-family: var(--font-mono); font-size: var(--text-xs); }
  .gold { color: var(--accent-gold); }
  .dim { color: var(--fg-subtle); white-space: nowrap; }
  .c-name { color: var(--fg-primary); }
  .c-sub { font-family: var(--font-mono); font-size: 11px; color: var(--fg-subtle); margin-top: 2px; }
  .msg { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .src { font-family: var(--font-mono); font-size: 9px; letter-spacing: .1em; text-transform: uppercase; padding: 3px 8px; border-radius: var(--radius-pill); border: 1px solid; }
  .src--chat { color: var(--accent-teal); border-color: var(--accent-teal-line); background: var(--accent-teal-dim); }
  .src--contact { color: var(--accent-gold); border-color: var(--accent-gold-line); background: var(--accent-gold-dim); }
  /* Estado como píldora tintada (Orbit) — sigue siendo un <select> editable */
  .status { appearance: none; -webkit-appearance: none; background: var(--accent-gold-dim); border: 1px solid var(--accent-gold-line); border-radius: var(--radius-pill); color: var(--accent-gold); padding: 5px 12px; font-size: 11px; font-weight: 600; letter-spacing: .02em; cursor: pointer; transition: filter var(--duration-fast), box-shadow var(--duration-fast); }
  .status:hover { filter: brightness(1.12); }
  .status:focus { outline: none; box-shadow: 0 0 0 3px var(--accent-gold-dim); }
  .status option { background: var(--bg-elevated); color: var(--fg-primary); }
  .status--contacted { background: var(--accent-teal-dim); border-color: var(--accent-teal-line); color: var(--accent-teal); }
  .status--converted { background: var(--accent-teal-dim); border-color: var(--accent-teal-line); color: var(--accent-teal); }
  .status--archived { background: var(--bg-elevated); border-color: var(--border-strong); color: var(--fg-subtle); }

  .empty { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-6); text-align: center; color: var(--fg-secondary); margin-top: var(--space-4); line-height: 1.55; }
  .empty.err { color: var(--color-error); }

  @media (max-width: 720px) {
    .shell { grid-template-columns: 1fr; }
    .sidebar { flex-direction: row; flex-wrap: wrap; align-items: center; }
    .nav { flex-direction: row; flex-wrap: wrap; }
    .nav__cap, .nav__soon, .sidebar__foot, .side-subs { display: none; }
    .count-strip { grid-template-columns: repeat(2, 1fr); }
    .kpis { grid-template-columns: repeat(2, 1fr); }
  }
</style>
