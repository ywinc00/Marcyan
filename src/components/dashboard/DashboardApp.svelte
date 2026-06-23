<script>
  import { onMount } from 'svelte';
  import BrandLogo from './BrandLogo.svelte';
  import KpiArt from './KpiArt.svelte';
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

  // Búsqueda ⌘K de la barra lateral + sello "Actualizado".
  let navQuery = $state('');
  let loadedAt = $state(null);

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

  // ── Suscripciones activas → sidebar + run-rate mensual ───────
  const activeSubs = $derived(subs.filter((s) => s.active).slice(0, 6));
  const monthlyRunRate = $derived(subs
    .filter((s) => s.active)
    .reduce((sum, s) => { const c = Number(s.amount_cents) || 0; return sum + (s.cycle === 'yearly' ? Math.round(c / 12) : c); }, 0));
  // OJO: amount_cents es BIGINT → @vercel/postgres lo da como STRING; hay que
  // coercer a Number ANTES de sumar (si no, sum + "1791" concatena strings).
  function money(cents) {
    return '$' + ((Number(cents) || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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
  const userInitial = $derived((user || '?').trim().charAt(0).toUpperCase() || '?');

  // ── Búsqueda ⌘K: filtra el nav (y las suscripciones) por etiqueta ──
  const navMatch = $derived(navQuery.trim().toLowerCase());
  const filteredNav = $derived(
    navMatch ? NAV.filter((n) => n.label.toLowerCase().includes(navMatch)) : NAV
  );
  const filteredSubs = $derived(
    navMatch ? activeSubs.filter((s) => (s.name || '').toLowerCase().includes(navMatch)) : activeSubs
  );
  // Enter con exactamente un nav coincidente → lo selecciona.
  function onNavSearchKey(e) {
    if (e.key !== 'Enter') return;
    const hits = filteredNav.filter((n) => n.live);
    if (hits.length === 1) { section = hits[0].id; navQuery = ''; }
  }

  // ── Saludo según la hora del día ────────────────────────────
  const greeting = $derived.by(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 20) return 'Buenas tardes';
    return 'Buenas noches';
  });

  // Proyectos activos reales para el segundo crumb del dashboard.
  const activeProjectCount = $derived(projects.filter((p) => p.status === 'active').length);

  function fmtClock(d) {
    return d ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
  }

  // ── Exportar leads a CSV (cliente) ──────────────────────────
  function csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function exportLeads() {
    const cols = ['ref_id', 'name', 'email', 'phone', 'source', 'status', 'created_at'];
    const head = cols.join(',');
    const body = (leads || []).map((l) => cols.map((c) => csvCell(l[c])).join(',')).join('\n');
    const blob = new Blob([head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

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
      if (j.ok) { home = j; loadedAt = new Date(); }
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

      <div class="search">
        <svg class="search__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        <input type="text" placeholder="Buscar" aria-label="Buscar en el panel" bind:value={navQuery} onkeydown={onNavSearchKey} />
        <kbd>⌘K</kbd>
      </div>

      <nav class="nav">
        <span class="nav__cap">Operación</span>
        {#each filteredNav as item}
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
          {#if filteredSubs.length}
            <div class="subs">
              {#each filteredSubs as s (s.id)}
                <div class="subs__row" title={`${s.name} · ${money(s.amount_cents)}/${s.cycle === 'yearly' ? 'año' : 'mes'}`}>
                  <BrandLogo name={s.name} size={22} />
                  <span class="subs__name">{s.name}</span>
                  <span class="subs__tag">{s.category}</span>
                </div>
              {/each}
            </div>
          {:else}
            <p class="subs__hint">Sin coincidencias.</p>
          {/if}
          <div class="runrate">
            <span class="runrate__cap">Gasto / mes</span>
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
        <div class="crumbs">
          <span class="crumb">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
            {sectionTitle}
          </span>
          {#if section === 'dashboard' && activeProjectCount > 0}
            <span class="crumb crumb--muted">· {activeProjectCount} proyecto{activeProjectCount === 1 ? '' : 's'} activo{activeProjectCount === 1 ? '' : 's'}</span>
          {/if}
        </div>
        <div class="topbar__right">
          {#if loadedAt}<span class="updated">Actualizado {fmtClock(loadedAt)}</span>{/if}
          {#if installPrompt}<button class="install" onclick={doInstall}>⤓ Instalar app</button>{/if}
          <span class="me" title={user} aria-hidden="true">{userInitial}</span>
          <button class="b b--ghost" onclick={logout}>Salir</button>
        </div>
      </header>

      {#if section === 'dashboard'}
        <div class="greet-row">
          <h1 class="greet">{greeting}, {firstName}</h1>
          <button class="b" onclick={exportLeads} disabled={!leads.length} title={leads.length ? '' : 'No hay leads para exportar'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4M8 8l4-4 4 4M12 4v12" /></svg>
            Exportar leads
          </button>
        </div>

        <!-- ── KPIs: número grande + delta + arte de esquina glossy (KpiArt) ── -->
        <div class="kpis">
          <article class="kpi">
            <p class="kpi__lbl">Leads nuevos</p>
            <div class="kpi__row">
              <span class="kpi__num gold">{home?.kpis ? home.kpis.new_leads : '–'}</span>
              <KpiArt kind="inbox" size={46} />
            </div>
            <p class="kpi__delta">
              {#if home?.kpis?.new_leads}<span class="up">+{home.kpis.new_leads}</span> <span class="muted">este mes</span>
              {:else}<span class="muted">aún sin leads este mes</span>{/if}
            </p>
          </article>

          <article class="kpi">
            <p class="kpi__lbl">Briefs pendientes</p>
            <div class="kpi__row">
              <span class="kpi__num">{home?.kpis ? home.kpis.pending_briefs : '–'}</span>
              <KpiArt kind="docs" size={46} />
            </div>
            <p class="kpi__delta"><span class="muted">en cola de revisión</span></p>
          </article>

          <article class="kpi">
            <p class="kpi__lbl">En curso (mes)</p>
            <div class="kpi__row">
              <span class="kpi__num">{home?.kpis ? home.kpis.projects_this_month : '–'}</span>
              <KpiArt kind="clock" size={46} />
            </div>
            <p class="kpi__delta"><span class="muted">proyectos activos</span></p>
          </article>

          <article class="kpi">
            <p class="kpi__lbl">Cobrado (mes)</p>
            <div class="kpi__row">
              <span class="kpi__num teal">{home?.kpis && home.kpis.revenue_this_month != null ? home.kpis.revenue_this_month : '—'}</span>
              <KpiArt kind="coins" size={46} />
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
                <h3 class="card__amount">{activeBar >= 0 ? (activity[activeBar]?.total ?? 0) : 0} <span class="muted">{activeBar >= 0 ? monthLabel(activity[activeBar]?.month) : ''}</span></h3>
              </div>
              <span class="chip">leads + briefs</span>
            </header>

            {#if !home}
              <div class="chart-skeleton" aria-hidden="true"></div>
            {:else if activity.length === 0}
              <div class="empty-block">
                <KpiArt kind="chart-up" size={40} />
                <p>Sin actividad todavía.<br />Aparecerá aquí cuando lleguen leads o briefs.</p>
              </div>
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
                      <stop offset="0" stop-color="#fb923c"/><stop offset="1" stop-color="#ea580c"/>
                    </linearGradient>
                    <linearGradient id="barIdle" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stop-color="#2a2a2f"/><stop offset="1" stop-color="#1b1b20"/>
                    </linearGradient>
                    <filter id="barGlow" x="-60%" y="-60%" width="220%" height="220%">
                      <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="rgb(249, 115, 22)" flood-opacity="0.5" />
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

          <article class="card">
            <header class="card__head card__head--row">
              <h3 class="card__title">Proyectos recientes</h3>
            </header>
            {#if recentProjects.length}
              <div class="ptable">
                <div class="ptable__head">
                  <span>Proyecto</span>
                  <span>Estado</span>
                </div>
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
            {:else}
              <div class="empty-block">
                <KpiArt kind="folder" size={40} />
                <p>Sin proyectos todavía.</p>
                <button class="b b--mini" onclick={() => (section = 'progreso')}>Crear el primero</button>
              </div>
            {/if}
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
            {#if !home}
              <div class="funnel-skeleton" aria-hidden="true"></div>
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

          <article class="card">
            <header class="card__head">
              <div>
                <p class="card__lbl">Actividad acumulada</p>
                <h3 class="card__amount big">{sparkTotal} <span class="muted">en 6 meses</span></h3>
              </div>
              <span class="chip chip--up">↑ tendencia</span>
            </header>
            {#if !home}
              <div class="spark-skeleton" aria-hidden="true"></div>
            {:else if sparkPath.line}
              <div class="spark-wrap">
                <svg class="spark" viewBox="0 0 {SPARK_W} {SPARK_H}" preserveAspectRatio="none" role="img" aria-label="Actividad acumulada">
                  <defs>
                    <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stop-color="#f97316" stop-opacity="0.42"/>
                      <stop offset="1" stop-color="#f97316" stop-opacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d={sparkPath.area} fill="url(#sparkFill)" />
                  <path d={sparkPath.line} fill="none" stroke="#f97316" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
                </svg>
                <!-- Dot final como overlay HTML (no se deforma por preserveAspectRatio=none) -->
                {#if sparkPath.dot}
                  <span class="spark-dot" style="left:{sparkPath.dot.x / SPARK_W * 100}%;top:{sparkPath.dot.y / SPARK_H * 100}%"></span>
                {/if}
              </div>
            {:else}
              <div class="empty-block">
                <KpiArt kind="chart-up" size={40} />
                <p>La tendencia aparece con el primer mes de datos.</p>
              </div>
            {/if}
          </article>
        </div>

        <!-- ── Leads recientes (compacto) ── -->
        <article class="card card--spaced">
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
                    <td class="msg">
                      {#if lead.interest || lead.message}
                        {@const full = lead.interest || lead.message}
                        {#if full.length > 80 || full.includes('\n')}
                          <details class="msg-det">
                            <summary class="msg-sum" title={full}>{full}</summary>
                            <div class="msg-full">{full}</div>
                          </details>
                        {:else}
                          <span class="msg-line" title={full}>{full}</span>
                        {/if}
                      {:else}
                        —
                      {/if}
                    </td>
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
  .nav__cap { font-family: var(--font-mono); font-size: 11px; letter-spacing: var(--tracking-wider); text-transform: uppercase; color: var(--fg-subtle); padding: 0 10px var(--space-2); }
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
  .runrate { display: flex; flex-direction: column; gap: 5px; margin: 8px 0 0; padding: 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; }
  .runrate__cap { font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-wider); text-transform: uppercase; color: var(--fg-subtle); }
  .runrate__num { font-family: var(--font-display); font-weight: 700; font-size: 22px; line-height: 1; letter-spacing: var(--tracking-tight); color: var(--accent-gold); font-variant-numeric: tabular-nums; }

  /* ── Main ── */
  .main { padding: var(--space-5) var(--space-6); min-width: 0; }
  .topbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding-bottom: var(--space-4); border-bottom: 1px solid var(--border); }
  .crumbs { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .crumb { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-body); font-weight: 600; font-size: var(--text-sm); letter-spacing: normal; color: var(--fg-primary); }
  .crumb svg { width: 16px; height: 16px; color: var(--fg-secondary); flex: 0 0 auto; }
  .crumb--muted { color: var(--fg-subtle); font-weight: 400; white-space: nowrap; }
  .topbar__right { display: flex; align-items: center; gap: var(--space-4); }
  .updated { font-size: 13px; color: var(--fg-subtle); white-space: nowrap; }
  .install { font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--accent-gold); background: transparent; border: 1px solid var(--accent-gold-line); border-radius: var(--radius-sm); padding: 5px 9px; cursor: pointer; transition: all var(--duration-fast); }
  .install:hover { background: var(--accent-gold-dim); border-color: var(--accent-gold); }
  .me { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex: 0 0 auto; border-radius: var(--radius-pill); background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; font-family: var(--font-display); font-weight: 700; font-size: 13px; line-height: 1; box-shadow: 0 0 0 2px var(--bg-base); }

  /* ── Búsqueda ⌘K del sidebar (Orbit) ── */
  .search { display: flex; align-items: center; gap: 8px; padding: 9px 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; color: var(--fg-secondary); }
  .search__ico { width: 16px; height: 16px; flex: 0 0 auto; color: var(--fg-subtle); }
  .search input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; font-family: inherit; font-size: 13.5px; color: var(--fg-primary); }
  .search input::placeholder { color: var(--fg-subtle); }
  .search kbd { font-family: inherit; font-size: 11px; color: var(--fg-subtle); background: var(--bg-elevated); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border); }

  .greet-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); margin: var(--space-1) 0 0; }
  .greet { font-family: var(--font-display); font-weight: 700; font-size: 28px; line-height: 1.1; letter-spacing: -0.025em; margin: 0; }
  .sec-head { display: flex; align-items: center; justify-content: space-between; }

  /* ── KPI cards: número grande + delta + arte de esquina (Orbit .stat) ── */
  .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }
  .kpi { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px 16px 14px; }
  .kpi__lbl { margin: 0 0 10px; font-weight: 500; font-size: 13px; color: var(--fg-secondary); }
  .kpi__row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); min-height: 52px; }
  .kpi__num { font-family: var(--font-display); font-weight: 700; font-size: 36px; line-height: 1; letter-spacing: var(--tracking-tight); color: var(--fg-primary); }
  .kpi__num.gold { color: var(--accent-gold); }
  .kpi__num.teal { color: var(--accent-teal); }
  .kpi__delta { margin: 12px 0 0; font-size: 13px; color: var(--fg-subtle); }
  .kpi__delta .up { color: var(--accent-teal); font-weight: 600; }

  /* ── Grids densos de cards (proporciones exactas Orbit) ── */
  .grid-2 { display: grid; gap: 14px; margin-top: 18px; }
  .grid-2--chart { grid-template-columns: 1.4fr 1fr; }
  .grid-2--funnel { grid-template-columns: 1fr 1.6fr; }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 18px 20px; }
  .card--spaced { margin-top: 18px; }
  .card__head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); margin-bottom: 18px; }
  .card__head--row { align-items: center; margin-bottom: var(--space-2); }
  .card__lbl { margin: 0 0 6px; color: var(--fg-secondary); font-size: 13px; font-weight: 500; }
  .card__title { margin: 0; font-size: 14px; font-weight: 600; color: var(--fg-primary); }
  .card__amount { margin: 0; font-family: var(--font-display); font-size: 28px; font-weight: 700; letter-spacing: var(--tracking-tight); line-height: 1; }
  .card__amount.big { font-size: 30px; }
  .card__amount .muted { font-size: 13px; font-weight: 400; letter-spacing: 0; }
  .chip { font-size: 11px; font-weight: 500; color: var(--fg-secondary); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-pill); padding: 5px 11px; white-space: nowrap; }
  .chip--up { color: var(--accent-teal); border-color: var(--accent-teal-line); background: var(--accent-teal-dim); }
  .link-btn { background: transparent; border: 0; color: var(--fg-secondary); font-size: var(--text-sm); cursor: pointer; padding: 4px 6px; border-radius: var(--radius-sm); transition: color var(--duration-fast); }
  .link-btn:hover { color: var(--accent-gold); }
  .muted { color: var(--fg-subtle); font-size: var(--text-sm); padding: var(--space-4) 0; }

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

  /* ── Estados vacíos / cargando (densos, intencionales) ── */
  .empty-block {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; text-align: center; min-height: 168px; padding: var(--space-4);
    color: var(--fg-subtle); font-size: var(--text-sm); line-height: 1.5;
  }
  .empty-block p { margin: 0; }
  .empty-block .b { margin-top: 2px; }
  .chart-skeleton, .funnel-skeleton, .spark-skeleton {
    border-radius: var(--radius-md);
    background: linear-gradient(100deg, var(--bg-elevated) 30%, rgba(255,255,255,0.04) 50%, var(--bg-elevated) 70%);
    background-size: 200% 100%;
    animation: shimmer 1.3s ease-in-out infinite;
  }
  .chart-skeleton { height: 196px; }
  .spark-skeleton { height: 150px; }
  .funnel-skeleton { height: 168px; }
  @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

  /* ── Tabla de proyectos (Orbit) ── */
  .ptable { display: flex; flex-direction: column; }
  .ptable__head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: 0 8px 7px; font-family: var(--font-mono); font-size: 11px; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-subtle); }
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
  .spark-wrap { position: relative; }
  .spark { display: block; width: 100%; height: 150px; }
  .spark-dot {
    position: absolute; width: 11px; height: 11px; border-radius: 50%;
    background: #f97316; border: 3px solid var(--bg-card);
    transform: translate(-50%, -50%); pointer-events: none;
    box-shadow: 0 0 0 1px var(--accent-gold-line), 0 4px 12px -2px var(--accent-gold-glow);
  }

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
  .msg { max-width: 320px; vertical-align: top; }
  /* Texto corto: una línea con elipsis + tooltip nativo (title). */
  .msg-line { display: block; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* Texto largo / multilínea: <details> expandible por fila (transcript del chat). */
  .msg-det { max-width: 320px; }
  .msg-sum { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; list-style: none; color: var(--fg-secondary); transition: color var(--duration-fast); }
  .msg-sum::-webkit-details-marker { display: none; }
  .msg-sum:hover { color: var(--fg-primary); }
  /* Caret a la izquierda que rota al abrir. */
  .msg-sum::before { content: '▸'; display: inline-block; margin-right: 6px; color: var(--fg-subtle); transition: transform var(--duration-fast); }
  .msg-det[open] .msg-sum { white-space: normal; color: var(--accent-gold); }
  .msg-det[open] .msg-sum::before { transform: rotate(90deg); }
  .msg-full { margin-top: 8px; padding: 10px 12px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); white-space: pre-wrap; word-break: break-word; line-height: 1.5; color: var(--fg-primary); max-height: 280px; overflow-y: auto; }
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
