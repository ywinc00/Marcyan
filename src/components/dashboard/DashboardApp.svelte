<script>
  import { onMount } from 'svelte';
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
  let installPrompt = $state(null);

  const MONTH_LABELS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  function monthLabel(m) { return MONTH_LABELS[parseInt(m.slice(5, 7), 10) - 1] || m; }
  const activity = $derived(home ? home.activity : []);
  const chartMax = $derived(Math.max(1, ...activity.map((a) => a.total)));
  const funnelRows = $derived(home ? [
    { name: 'Nuevos',      n: home.funnel.new,       cls: 'g'  },
    { name: 'Contactados', n: home.funnel.contacted, cls: 'g2' },
    { name: 'Convertidos', n: home.funnel.converted, cls: 't'  },
    { name: 'Archivados',  n: home.funnel.archived,  cls: 'd'  },
  ] : []);
  const funnelMax = $derived(home
    ? Math.max(1, home.funnel.new, home.funnel.contacted, home.funnel.converted, home.funnel.archived)
    : 1);

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

  // ── Sesión ───────────────────────────────────────────────────
  async function checkSession() {
    try {
      const res = await api('/api/admin/me');
      if (res.ok) {
        const j = await res.json();
        if (j && j.email) { user = j.email; phase = 'app'; loadHome(); loadLeads(); return; }
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
      <button type="submit" class="btn btn--primary" disabled={loginSending}>
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
          <button class="btn btn--ghost" onclick={logout}>Salir</button>
        </div>
      </header>

      {#if section === 'dashboard'}
        <h1 class="greet">Hola, {firstName}</h1>

        <div class="kpis">
          <div class="kpi">
            <div class="kpi__txt"><span class="kpi__lbl">Leads nuevos</span><span class="kpi__num gold">{home?.kpis ? home.kpis.new_leads : '–'}</span></div>
            <svg class="kpi__art" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8l9 6 9-6M3 8v10h18V8M3 8l9-5 9 5" /></svg>
          </div>
          <div class="kpi">
            <div class="kpi__txt"><span class="kpi__lbl">Briefs pendientes</span><span class="kpi__num">{home?.kpis ? home.kpis.pending_briefs : '–'}</span></div>
            <svg class="kpi__art" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6zM14 3v6h6" /></svg>
          </div>
          <div class="kpi">
            <div class="kpi__txt"><span class="kpi__lbl">En curso (mes)</span><span class="kpi__num">{home?.kpis ? home.kpis.projects_this_month : '–'}</span></div>
            <svg class="kpi__art" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div class="kpi">
            <div class="kpi__txt"><span class="kpi__lbl">Cobrado (mes)</span><span class="kpi__num teal">{home?.kpis && home.kpis.revenue_this_month != null ? home.kpis.revenue_this_month : '—'}</span></div>
            <svg class="kpi__art" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h18v10H3zM3 7l9 6 9-6" /></svg>
          </div>
        </div>

        <div class="home-split">
          <div class="panel">
            <div class="panel__lbl">Actividad por mes <span class="panel__sub">leads + briefs</span></div>
            {#if home}
              <svg class="chart" viewBox="0 0 560 196" role="img" aria-label="Actividad por mes">
                <defs>
                  <filter id="barGlow" x="-60%" y="-60%" width="220%" height="220%">
                    <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="rgb(249, 115, 22)" flood-opacity="0.5" />
                  </filter>
                </defs>
                <line x1="0" y1="44" x2="560" y2="44" class="chart__grid" />
                <line x1="0" y1="82" x2="560" y2="82" class="chart__grid" />
                <line x1="0" y1="120" x2="560" y2="120" class="chart__grid" />
                <line x1="0" y1="158" x2="560" y2="158" class="chart__base" />
                {#each activity as a, i}
                  <rect
                    x={i * (560 / activity.length) + (560 / activity.length) * 0.25}
                    y={158 - (a.total / chartMax) * 118}
                    width={(560 / activity.length) * 0.5}
                    height={(a.total / chartMax) * 118}
                    rx="5"
                    fill={i === activity.length - 1 ? 'var(--accent-gold)' : '#2b2b33'}
                    filter={i === activity.length - 1 ? 'url(#barGlow)' : undefined} />
                  <text x={i * (560 / activity.length) + (560 / activity.length) / 2} y="180" text-anchor="middle" class="chart__lbl" class:is-active={i === activity.length - 1}>{monthLabel(a.month)}</text>
                  {#if i === activity.length - 1}
                    <circle cx={i * (560 / activity.length) + (560 / activity.length) / 2} cy={158 - (a.total / chartMax) * 118} r="3.5" fill="var(--accent-gold)" />
                    <rect x={i * (560 / activity.length) + (560 / activity.length) / 2 - 16} y={158 - (a.total / chartMax) * 118 - 26} width="32" height="18" rx="5" fill="var(--accent-gold)" />
                    <text x={i * (560 / activity.length) + (560 / activity.length) / 2} y={158 - (a.total / chartMax) * 118 - 13} text-anchor="middle" class="chart__tip">{a.total}</text>
                  {:else if a.total > 0}
                    <text x={i * (560 / activity.length) + (560 / activity.length) / 2} y={158 - (a.total / chartMax) * 118 - 6} text-anchor="middle" class="chart__val">{a.total}</text>
                  {/if}
                {/each}
              </svg>
            {:else}<div class="muted">Cargando…</div>{/if}
          </div>

          <div class="panel">
            <div class="panel__lbl">Leads por estado</div>
            {#if home}
              <div class="funnel">
                {#each funnelRows as row}
                  <div class="funnel__row">
                    <span class="funnel__name">{row.name}</span>
                    <div class="funnel__track"><div class="funnel__bar funnel__bar--{row.cls}" style="width:{Math.round((row.n / funnelMax) * 100)}%"></div></div>
                    <span class="funnel__n">{row.n}</span>
                  </div>
                {/each}
              </div>
            {:else}<div class="muted">Cargando…</div>{/if}
          </div>
        </div>

        <div class="panel">
          <div class="panel__lbl">Leads recientes</div>
          {#if leads.length}
            <div class="recent">
              {#each leads.slice(0, 6) as lead (lead.ref_id)}
                <div class="recent__row">
                  <span class="mono gold">{lead.ref_id}</span>
                  <span class="recent__name">{lead.name || lead.email || lead.phone || '—'}</span>
                  <span class="src src--{lead.source}">{lead.source === 'chat' ? 'chatbot' : 'contacto'}</span>
                  <span class="mono dim">{fmtDate(lead.created_at)}</span>
                </div>
              {/each}
            </div>
          {:else}<div class="muted">Sin leads todavía.</div>{/if}
        </div>

      {:else if section === 'leads'}
        <div class="sec-head">
          <h1 class="greet">Leads</h1>
          <button class="btn btn--ghost" onclick={loadLeads}>Actualizar</button>
        </div>

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
                <tr><th>Ref</th><th>Contacto</th><th>Origen</th><th>Mensaje</th><th>Fecha</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {#each leads as lead (lead.ref_id)}
                  <tr>
                    <td class="mono gold">{lead.ref_id}</td>
                    <td>
                      <div class="c-name">{lead.name || '—'}</div>
                      <div class="c-sub">{lead.email || lead.phone || ''}</div>
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
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: var(--radius-md); padding: 10px 16px; font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: var(--tracking-wide); text-transform: uppercase; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--fg-secondary); transition: all var(--duration-fast); min-height: var(--tap-min); }
  .btn--primary { background: var(--accent-gold); border-color: var(--accent-gold); color: var(--fg-inverse); font-weight: 700; }
  .btn--primary:hover:not(:disabled) { background: var(--accent-gold-hover); }
  .btn--ghost:hover { border-color: var(--accent-gold); color: var(--fg-primary); }
  .btn:disabled { opacity: .55; cursor: not-allowed; }

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

  /* ── Main ── */
  .main { padding: var(--space-5) var(--space-6); min-width: 0; }
  .topbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding-bottom: var(--space-4); border-bottom: 1px solid var(--border); }
  .crumb { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-secondary); }
  .topbar__right { display: flex; align-items: center; gap: var(--space-4); }
  .install { font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--accent-gold); background: transparent; border: 1px solid var(--accent-gold-line); border-radius: var(--radius-sm); padding: 5px 9px; cursor: pointer; transition: all var(--duration-fast); }
  .install:hover { background: var(--accent-gold-dim); border-color: var(--accent-gold); }
  .user { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--fg-secondary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .greet { font-family: var(--font-display); font-weight: 700; font-size: var(--text-xl); letter-spacing: var(--tracking-tight); margin: var(--space-5) 0 var(--space-4); }
  .sec-head { display: flex; align-items: center; justify-content: space-between; }

  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-3); }
  .kpi { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4); display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
  .kpi__txt { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .kpi__art { width: 38px; height: 38px; flex: 0 0 auto; color: var(--accent-gold); opacity: 0.32; }
  .kpi__lbl { font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-secondary); }
  .kpi__num { font-family: var(--font-display); font-weight: 700; font-size: var(--text-2xl); line-height: 1; letter-spacing: var(--tracking-tight); }
  .kpi__num.gold { color: var(--accent-gold); }
  .kpi__num.teal { color: var(--accent-teal); }
  /* ── Home: paneles, gráfico, embudo, recientes ── */
  .home-split { display: grid; grid-template-columns: 1.5fr 1fr; gap: var(--space-3); margin-top: var(--space-3); }
  .panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5); margin-top: var(--space-3); }
  .panel__lbl { font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-secondary); margin-bottom: var(--space-4); }
  .panel__sub { color: var(--fg-subtle); margin-left: 6px; }
  .muted { color: var(--fg-subtle); font-size: var(--text-sm); font-style: italic; padding: var(--space-4) 0; }

  .chart { width: 100%; height: auto; display: block; }
  .chart__lbl { fill: var(--fg-subtle); font-family: var(--font-mono); font-size: 11px; }
  .chart__lbl.is-active { fill: var(--accent-gold); font-weight: 700; }
  .chart__val { fill: var(--fg-secondary); font-family: var(--font-mono); font-size: 11px; }
  .chart__grid { stroke: rgba(255, 255, 255, 0.06); stroke-dasharray: 3 4; }
  .chart__base { stroke: rgba(255, 255, 255, 0.12); }
  .chart__tip { fill: var(--fg-inverse); font-family: var(--font-mono); font-size: 10px; font-weight: 700; }

  .funnel { display: flex; flex-direction: column; gap: var(--space-3); }
  .funnel__row { display: flex; align-items: center; gap: var(--space-3); }
  .funnel__name { width: 90px; flex: 0 0 auto; font-size: var(--text-xs); color: var(--fg-secondary); }
  .funnel__track { flex: 1; height: 14px; background: var(--bg-elevated); border-radius: var(--radius-pill); overflow: hidden; }
  .funnel__bar { height: 100%; border-radius: var(--radius-pill); min-width: 2px; transition: width var(--duration-base) var(--ease); }
  .funnel__bar--g  { background: rgba(var(--accent-teal-rgb), .85); }
  .funnel__bar--g2 { background: rgba(var(--accent-teal-rgb), .55); }
  .funnel__bar--t  { background: var(--accent-teal); }
  .funnel__bar--d  { background: rgba(var(--accent-gold-rgb), .5); }
  .funnel__n { width: 28px; flex: 0 0 auto; text-align: right; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--fg-secondary); }

  .recent { display: flex; flex-direction: column; }
  .recent__row { display: flex; align-items: center; gap: var(--space-3); padding: 8px 0; border-bottom: 1px solid var(--border-subtle); font-size: var(--text-sm); }
  .recent__row:last-child { border-bottom: 0; }
  .recent__name { flex: 1; color: var(--fg-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  @media (max-width: 720px) { .home-split { grid-template-columns: 1fr; } }

  /* ── Tabla de leads ── */
  .table-wrap { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; margin-top: var(--space-4); }
  .table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
  .table th { text-align: left; font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-subtle); padding: 12px 14px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  .table td { padding: 12px 14px; border-bottom: 1px solid var(--border-subtle); vertical-align: middle; color: var(--fg-secondary); }
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
  .status { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); padding: 6px 8px; font-size: var(--text-xs); cursor: pointer; }
  .status:focus { outline: none; border-color: var(--accent-gold); }
  .status--converted { color: var(--accent-teal); }
  .status--archived { color: var(--fg-subtle); }

  .empty { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-7); text-align: center; color: var(--fg-secondary); font-style: italic; margin-top: var(--space-4); }
  .empty.err { color: var(--color-error); font-style: normal; }

  @media (max-width: 720px) {
    .shell { grid-template-columns: 1fr; }
    .sidebar { flex-direction: row; flex-wrap: wrap; align-items: center; }
    .nav { flex-direction: row; flex-wrap: wrap; }
    .nav__cap, .nav__soon, .sidebar__foot { display: none; }
  }
</style>
