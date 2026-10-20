<script>
  // ─────────────────────────────────────────────────────────────
  // Carcasa del panel Orbit: login y sesión, barra lateral (escritorio),
  // barra compacta + menú en <dialog> (móvil, < 900 px), barra superior y
  // enrutado por hash. Las vistas viven en *Section.svelte; los datos
  // compartidos en lib/store.svelte.js; el HTTP en lib/api.js.
  // ─────────────────────────────────────────────────────────────
  import { onMount } from 'svelte';
  import BrandLogo from './BrandLogo.svelte';
  import InicioSection from './InicioSection.svelte';
  import LeadsSection from './LeadsSection.svelte';
  import ClientesSection from './ClientesSection.svelte';
  import BriefsSection from './BriefsSection.svelte';
  import FinanzasSection from './FinanzasSection.svelte';
  import ProgresoSection from './ProgresoSection.svelte';
  import SeoSection from './SeoSection.svelte';
  import NotificationsSection from './NotificationsSection.svelte';
  import Icon from './ui/Icon.svelte';
  import Toast from './ui/Toast.svelte';
  import { api, MSG, errorMessage, onUnauthorized, onMutation, onNetwork } from './lib/api.js';
  import { toast, pushLayer, popLayer } from './lib/toast.svelte.js';
  import { route, href, navigate, startRouter } from './lib/router.svelte.js';
  import { data, loadAll, loadHome, loadLeads, refreshShell, clearData } from './lib/store.svelte.js';
  import { fmtTime } from './lib/dates.js';
  import { avisos, startUnreadPolling, badgeText } from './lib/avisos.svelte.js';

  // ── Estado ───────────────────────────────────────────────────
  let phase = $state('loading');      // loading | login | unreachable | app
  let user = $state('');
  let emailInput = $state('');
  let loginMsg = $state('');
  let loginTone = $state('ok');       // ok | error | info
  let loginSending = $state(false);
  let unreachableMsg = $state('');
  let loggingOut = $state(false);
  let installPrompt = $state(null);

  // Búsqueda (Ctrl K / ⌘K) de la barra lateral.
  let navQuery = $state('');
  let searchEl = $state(null);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
  const kbdLabel = isMac ? '⌘K' : 'Ctrl K';

  // Menú móvil (<dialog>).
  let menuEl = $state(null);
  let menuOpen = $state(false);

  // Conexión REAL: el navegador dice que hay red Y la última llamada llegó.
  let browserOnline = $state(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
  let lastCallOk = $state(true);
  const online = $derived(browserOnline && lastCallOk);

  let mainEl = $state(null);

  const NAV = [
    { id: 'inicio',   label: 'Inicio' },
    { id: 'leads',    label: 'Leads' },
    { id: 'clientes', label: 'Clientes' },
    { id: 'briefs',   label: 'Briefs' },
    { id: 'finanzas', label: 'Finanzas' },
    { id: 'progreso', label: 'Progreso' },
    { id: 'seo',      label: 'SEO' },
    { id: 'avisos',   label: 'Avisos' },
  ];

  const section = $derived(route.section);
  const sectionTitle = $derived((NAV.find((n) => n.id === section) || NAV[0]).label);
  const userInitial = $derived((user || '?').trim().charAt(0).toUpperCase() || '?');

  // ── Suscripciones activas → barra lateral + gasto mensual ────
  const activeSubs = $derived(data.subs.filter((s) => s.active).slice(0, 6));
  // OJO: amount_cents es BIGINT → @vercel/postgres lo da como STRING; hay que
  // coercer a Number ANTES de sumar (si no, sum + "1791" concatena strings).
  const monthlyRunRate = $derived(data.subs
    .filter((s) => s.active)
    .reduce((sum, s) => { const c = Number(s.amount_cents) || 0; return sum + (s.cycle === 'yearly' ? Math.round(c / 12) : c); }, 0));
  function money(cents) {
    return '$' + ((Number(cents) || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  // Proyectos activos reales para el segundo crumb del inicio.
  const activeProjectCount = $derived(data.projects.filter((p) => p.status === 'active').length);

  // ── Búsqueda: secciones y suscripciones por nombre (SH-15) ───
  const navMatch = $derived(navQuery.trim().toLowerCase());
  const filteredNav = $derived(navMatch ? NAV.filter((n) => n.label.toLowerCase().includes(navMatch)) : NAV);
  const filteredSubs = $derived(
    navMatch ? activeSubs.filter((s) => `${s.name || ''} ${s.category || ''}`.toLowerCase().includes(navMatch)) : activeSubs
  );
  // Enter: una sección coincidente → se abre; si solo coinciden
  // suscripciones → Finanzas, que es donde se gestionan. Escape limpia.
  function onNavSearchKey(e) {
    if (e.key === 'Escape') { navQuery = ''; e.currentTarget.blur(); return; }
    if (e.key !== 'Enter') return;
    if (filteredNav.length === 1) { navigate(filteredNav[0].id); navQuery = ''; e.currentTarget.blur(); }
    else if (!filteredNav.length && filteredSubs.length) { navigate('finanzas'); navQuery = ''; e.currentTarget.blur(); }
  }
  function onGlobalKey(e) {
    if (phase !== 'app') return;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      // En escritorio enfoca el buscador; en móvil (sin barra lateral) abre el menú.
      if (searchEl && searchEl.offsetParent !== null) { searchEl.focus(); searchEl.select(); }
      else menuOpen = true;
    }
  }

  // ── Sesión ───────────────────────────────────────────────────
  async function checkSession() {
    phase = 'loading';
    try {
      const j = await api('/api/admin/me', { auth: false });
      if (j && j.email) { user = j.email; phase = 'app'; loadAll(); return; }
      phase = 'login';
    } catch (e) {
      if (e && e.status === 401) { phase = 'login'; return; }
      // Sin red o servidor caído: NO es "perdiste la sesión" (SH-16).
      unreachableMsg = errorMessage(e, MSG.network);
      phase = 'unreachable';
    }
  }

  // Login: el mensaje neutro ("si tu correo está autorizado…") SOLO con 200,
  // para no revelar qué correos valen. Errores reales a la vista (SH-02).
  async function doLogin(e) {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) return;
    loginSending = true;
    loginMsg = '';
    try {
      await api('/api/admin/login', { method: 'POST', body: { email }, auth: false });
      loginTone = 'ok';
      loginMsg = 'Si tu correo está autorizado, te enviamos un enlace de acceso. Ábrelo en este mismo dispositivo; caduca en 15 minutos.';
    } catch (err) {
      loginTone = 'error';
      loginMsg = errorMessage(err, MSG.generic);
    } finally {
      loginSending = false;
    }
  }

  // Salir: si el servidor no confirma, la cookie sigue viva → se avisa y
  // no se finge el cierre. Si confirma, se recarga limpio (SH-27).
  async function logout() {
    if (loggingOut) return;
    loggingOut = true;
    try {
      await api('/api/admin/logout', { method: 'POST', auth: false });
      clearData();
      user = '';
      window.location.replace('/dashboard');
    } catch (err) {
      loggingOut = false;
      toast('No se pudo cerrar la sesión. ' + errorMessage(err), { tone: 'error', timeout: 7000 });
    }
  }

  // ── PWA install ──────────────────────────────────────────────
  async function doInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    try { await installPrompt.userChoice; } catch (_) { /* el usuario cerró el diálogo: nada que hacer */ }
    installPrompt = null;
  }

  // ── Menú móvil ───────────────────────────────────────────────
  $effect(() => {
    // Sin menú (la carcasa se desmontó, p. ej. sesión caducada con el menú
    // abierto) su capa de avisos no puede quedarse en la pila.
    if (!menuEl) { popLayer('menu'); return; }
    if (menuOpen && !menuEl.open) { menuEl.showModal(); pushLayer('menu'); }
    else if (!menuOpen && menuEl.open) menuEl.close();
  });
  function onMenuBackdrop(e) { if (e.target === menuEl) menuOpen = false; }

  // Cambio de vista: arriba del todo, foco al contenido y título de pestaña.
  let firstRoute = true;
  $effect(() => {
    const s = section;   // dependencia
    if (firstRoute) { firstRoute = false; return; }
    menuOpen = false;
    window.scrollTo(0, 0);
    if (mainEl && s) mainEl.focus({ preventScroll: true });
  });

  // Título de pestaña con los avisos sin leer (OP-13): "(3) Marcyan · Leads".
  const unreadBadge = $derived(phase === 'app' ? badgeText(avisos.unread) : '');
  $effect(() => {
    if (typeof document !== 'undefined') document.title = (unreadBadge ? `(${unreadBadge}) ` : '') + 'Marcyan · ' + sectionTitle;
  });
  // Contador de Avisos: solo con sesión, cada 60 s con la pestaña visible y
  // al volver a ella (lib/avisos.svelte.js).
  $effect(() => {
    if (phase !== 'app') return;
    return startUnreadPolling();
  });

  onMount(() => {
    const stopRouter = startRouter();

    // ?error=invalid → el enlace mágico caducó o ya se usó (SH-09).
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'invalid') {
      loginTone = 'error';
      loginMsg = 'El enlace caducó o ya se usó. Pide uno nuevo.';
      params.delete('error');
      const qs = params.toString();
      history.replaceState(history.state, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
    }

    // Sesión caducada a mitad de uso → login con su motivo.
    const stopUnauth = onUnauthorized(() => {
      if (phase !== 'app') return;
      clearData();
      user = '';
      menuOpen = false;
      loginTone = 'info';
      loginMsg = MSG.session;
      phase = 'login';
    });

    // Tras cualquier cambio en una sección, la carcasa se pone al día (SH-08).
    let refreshTimer = null;
    let lastRefresh = Date.now();
    const stopMutation = onMutation(() => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { lastRefresh = Date.now(); refreshShell(); }, 400);
    });
    // …y al volver a la pestaña tras un rato.
    function onVisible() {
      if (document.visibilityState !== 'visible' || phase !== 'app') return;
      if (Date.now() - lastRefresh < 60000) return;
      lastRefresh = Date.now();
      refreshShell();
      if (route.section === 'inicio') { loadHome(); loadLeads(); }
    }
    document.addEventListener('visibilitychange', onVisible);

    const stopNet = onNetwork((s) => { lastCallOk = s === 'up'; });
    function onOnline() {
      browserOnline = true;
      if (phase === 'unreachable') checkSession();
      else if (phase === 'app') refreshShell();
    }
    function onOffline() { browserOnline = false; }
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    function onInstallPrompt(e) { e.preventDefault(); installPrompt = e; }
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('keydown', onGlobalKey);

    checkSession();

    return () => {
      stopRouter(); stopUnauth(); stopMutation(); stopNet();
      clearTimeout(refreshTimer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('keydown', onGlobalKey);
    };
  });
</script>

{#snippet brandMark(large)}
  <span class="brand" class:brand--lg={large}>
    <span class="planet" aria-hidden="true"></span>
    <span class="wordmark">MAR<em>CYAN</em></span>
  </span>
{/snippet}

{#snippet navList(items)}
  <!-- onclick cierra el menú móvil también al tocar la sección en la que ya
       se está (sin cambio de sección el efecto de ruta no lo cerraría). -->
  {#each items as item (item.id)}
    <a class="nav__item" class:active={section === item.id} href={href(item.id)} aria-current={section === item.id ? 'page' : undefined} onclick={() => (menuOpen = false)}>
      <Icon name={item.id} size={18} />
      <span>{item.label}</span>
      {#if item.id === 'avisos' && unreadBadge}
        <span class="nav__count"><span aria-hidden="true">{unreadBadge}</span><span class="sr-only">, {avisos.unread === 1 ? '1 sin leer' : `${unreadBadge} sin leer`}</span></span>
      {/if}
    </a>
  {/each}
{/snippet}

{#snippet subsBlock(list, showEmptyHint)}
  <div class="side-subs">
    <span class="nav__cap">Suscripciones</span>
    {#if data.subsError && !data.subs.length}
      <p class="subs__hint subs__hint--err">No se pudieron cargar. <button class="inline-btn" onclick={refreshShell}>Reintentar</button></p>
    {:else if !data.subsLoaded}
      <div class="subs__skel" aria-hidden="true"><span class="ui-skel"></span><span class="ui-skel"></span><span class="ui-skel"></span></div>
    {:else if activeSubs.length}
      {#if list.length}
        <div class="subs">
          {#each list as s (s.id)}
            <div class="subs__row" title={`${s.name} · ${money(s.amount_cents)}/${s.cycle === 'yearly' ? 'año' : 'mes'}`}>
              <BrandLogo name={s.name} size={22} />
              <span class="subs__name">{s.name}</span>
              <span class="subs__tag">{s.category}</span>
            </div>
          {/each}
        </div>
      {:else if showEmptyHint}
        <p class="subs__hint">Sin coincidencias.</p>
      {/if}
      <div class="runrate">
        <span class="runrate__cap">Gasto / mes</span>
        <span class="runrate__num">{money(monthlyRunRate)}</span>
      </div>
    {:else}
      <p class="subs__hint">Agrega tus suscripciones en <a href={href('finanzas')} onclick={() => (menuOpen = false)}>Finanzas</a>.</p>
    {/if}
  </div>
{/snippet}

{#if phase === 'loading'}
  <div class="center" role="status" aria-live="polite"><span class="ui-spinner"></span><span class="sr-only">Cargando el panel…</span></div>

{:else if phase === 'unreachable'}
  <div class="center">
    <div class="login">
      {@render brandMark(true)}
      <p class="login__tag">Panel de operaciones</p>
      <div class="state-msg" role="alert">
        <Icon name={browserOnline ? 'alert' : 'wifiOff'} size={20} />
        <p>{browserOnline ? unreachableMsg : 'Sin conexión. Cuando vuelva internet, el panel se recarga solo.'}</p>
      </div>
      <button type="button" class="b b--primary" onclick={checkSession}><Icon name="refresh" size={16} />Reintentar</button>
    </div>
  </div>

{:else if phase === 'login'}
  <div class="center">
    <form class="login" onsubmit={doLogin}>
      {@render brandMark(true)}
      <p class="login__tag">Panel de operaciones</p>
      <label class="login__lbl" for="login-email">Tu correo</label>
      <input id="login-email" class="ui-input" type="email" bind:value={emailInput} placeholder="tu@marcyanstudio.com" autocomplete="email" required
        aria-describedby={loginMsg ? 'login-msg' : undefined} />
      <button type="submit" class="b b--primary login__submit" disabled={loginSending}>
        {loginSending ? 'Enviando…' : 'Enviar enlace de acceso'}
      </button>
      <p id="login-msg" class="login__msg login__msg--{loginTone}" aria-live="polite" role={loginTone === 'error' ? 'alert' : 'status'}>{loginMsg}</p>
    </form>
  </div>

{:else}
  <div class="shell">
    <!-- ═══ Escritorio: barra lateral ═══ -->
    <aside class="sidebar">
      {@render brandMark(false)}

      <div class="search">
        <span class="search__ico"><Icon name="search" size={16} /></span>
        <input bind:this={searchEl} type="search" placeholder="Buscar" aria-label="Buscar secciones y suscripciones"
          aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'} bind:value={navQuery} onkeydown={onNavSearchKey} />
        <kbd aria-hidden="true">{kbdLabel}</kbd>
      </div>

      <nav class="nav" aria-label="Secciones">
        <span class="nav__cap">Operación</span>
        {#if filteredNav.length}
          {@render navList(filteredNav)}
        {:else}
          <p class="subs__hint">Ninguna sección se llama así.</p>
        {/if}
      </nav>

      {@render subsBlock(filteredSubs, true)}

      <div class="sidebar__foot" class:is-off={!online} role="status">
        {#if online}<span class="online" aria-hidden="true"></span> En línea
        {:else}<Icon name="wifiOff" size={14} /> Sin conexión{/if}
      </div>
    </aside>

    <!-- ═══ Móvil: barra compacta (marca, título, menú) ═══ -->
    <header class="mobilebar">
      <a class="mobilebar__brand" href={href('inicio')} aria-label="Marcyan, ir al inicio"><span class="planet" aria-hidden="true"></span></a>
      <span class="mobilebar__title"><Icon name={section} size={18} />{sectionTitle}</span>
      {#if !online}<span class="mobilebar__off" title="Sin conexión"><Icon name="wifiOff" size={18} label="Sin conexión" /></span>{/if}
      <button type="button" class="mobilebar__menu" aria-label="Abrir menú" aria-haspopup="dialog" aria-expanded={menuOpen} onclick={() => (menuOpen = true)}>
        <Icon name="menu" size={22} />
      </button>
    </header>

    <dialog bind:this={menuEl} class="mnav" aria-label="Menú" onclose={() => { menuOpen = false; popLayer('menu'); }} onclick={onMenuBackdrop}>
      <div class="mnav__panel">
        <div class="mnav__head">
          {@render brandMark(false)}
          <button type="button" class="ui-icon-btn" aria-label="Cerrar menú" onclick={() => (menuOpen = false)}><Icon name="close" size={20} /></button>
        </div>
        <nav class="nav nav--m" aria-label="Secciones">
          {@render navList(NAV)}
        </nav>
        {@render subsBlock(activeSubs, false)}
        <div class="mnav__foot">
          <span class="me" aria-hidden="true">{userInitial}</span>
          <span class="mnav__user">{user}</span>
          {#if installPrompt}<button class="b b--ghost" onclick={doInstall}><Icon name="install" size={16} />Instalar app</button>{/if}
          <button class="b b--ghost" onclick={logout} disabled={loggingOut}><Icon name="logout" size={16} />{loggingOut ? 'Saliendo…' : 'Salir'}</button>
        </div>
      </div>
      <!-- Avisos mientras el menú está abierto (fuera quedarían tapados e inertes). -->
      <Toast layer="menu" />
    </dialog>

    <main class="main" bind:this={mainEl} tabindex="-1">
      <!-- ═══ Escritorio: barra superior ═══ -->
      <header class="topbar">
        <div class="crumbs">
          <span class="crumb"><Icon name={section} size={16} />{sectionTitle}</span>
          {#if section === 'inicio' && activeProjectCount > 0}
            <span class="crumb crumb--muted">· {activeProjectCount} proyecto{activeProjectCount === 1 ? '' : 's'} activo{activeProjectCount === 1 ? '' : 's'}</span>
          {/if}
        </div>
        <div class="topbar__right">
          {#if section === 'inicio' && data.loadedAt}<span class="updated">Actualizado {fmtTime(data.loadedAt)}</span>{/if}
          {#if installPrompt}<button class="b b--ghost" onclick={doInstall}><Icon name="install" size={16} />Instalar app</button>{/if}
          <span class="me" title={user} aria-hidden="true">{userInitial}</span>
          <button class="b b--ghost" onclick={logout} disabled={loggingOut}>{loggingOut ? 'Saliendo…' : 'Salir'}</button>
        </div>
      </header>

      {#if !online}
        <div class="offline" role="status">
          <Icon name="wifiOff" size={16} />
          <span>Sin conexión. Lo que ves puede estar desactualizado y los cambios no se guardarán hasta que vuelva.</span>
        </div>
      {/if}

      {#if section === 'inicio'}
        <InicioSection {user} />
      {:else if section === 'leads'}
        <LeadsSection />
      {:else if section === 'clientes'}
        <ClientesSection />
      {:else if section === 'briefs'}
        <BriefsSection />
      {:else if section === 'finanzas'}
        <FinanzasSection />
      {:else if section === 'progreso'}
        <ProgresoSection />
      {:else if section === 'seo'}
        <SeoSection />
      {:else if section === 'avisos'}
        <NotificationsSection />
      {/if}
    </main>
  </div>
{/if}

<Toast />

<style>
  /* ── Layout base ── */
  .center { min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: calc(var(--space-5) + var(--safe-top)) var(--space-4) calc(var(--space-5) + var(--safe-bottom)); }

  /* ── Marca ── */
  .brand { display: flex; align-items: center; gap: var(--space-3); }
  .brand--lg { justify-content: center; margin-bottom: var(--space-2); }
  .planet { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--accent-gold); position: relative; flex: 0 0 auto; display: inline-block; }
  .planet::after { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: var(--accent-gold); }
  .wordmark { font-family: var(--font-display); font-weight: 700; letter-spacing: .14em; font-size: 15px; color: var(--accent-gold); }
  .wordmark em { font-style: italic; font-weight: 400; color: var(--accent-gold); opacity: .85; }

  /* ── Login ── */
  .login { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: var(--space-3); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-7) var(--space-6); }
  .login__tag { text-align: center; font-size: var(--dash-caption); font-weight: 500; letter-spacing: var(--tracking-widest); text-transform: uppercase; color: var(--fg-secondary); margin: 0 0 var(--space-3); }
  .login__lbl { font-size: var(--dash-small); font-weight: 500; color: var(--fg-secondary); }
  .login :global(.ui-input) { min-height: var(--tap-min); font-size: 16px; }
  .login__submit { min-height: var(--tap-min); }
  .login__msg { font-size: var(--dash-small); line-height: 1.5; margin: var(--space-1) 0 0; min-height: 0; }
  .login__msg:empty { display: none; }
  .login__msg--ok { color: var(--accent-teal); }
  .login__msg--info { color: var(--fg-primary); }
  .login__msg--error { color: var(--color-error); }
  .state-msg { display: flex; align-items: flex-start; gap: 10px; color: var(--fg-primary); font-size: var(--dash-body); line-height: 1.5; }
  .state-msg :global(.ui-icon) { color: var(--color-warning); flex: 0 0 auto; margin-top: 1px; }
  .state-msg p { margin: 0; }

  /* ── Shell ── */
  /* La columna de la barra lateral se pinta en la carcasa para que el fondo
     siga aunque el contenido sea más largo que la pantalla. */
  .shell {
    display: grid; grid-template-columns: 220px minmax(0, 1fr); min-height: 100vh;
    background: linear-gradient(90deg, var(--bg-2) 0 219px, var(--border) 219px 220px, transparent 220px);
  }
  .sidebar {
    position: sticky; top: 0; align-self: start; height: 100vh; overflow-y: auto;
    background: var(--bg-2); border-right: 1px solid var(--border);
    padding: var(--space-5) var(--space-4); display: flex; flex-direction: column; gap: var(--space-5);
  }
  .nav { display: flex; flex-direction: column; gap: 3px; }
  .nav__cap { font-size: var(--dash-caption); font-weight: 500; letter-spacing: var(--tracking-wider); text-transform: uppercase; color: var(--fg-subtle); padding: 0 10px var(--space-2); }
  .nav__item { display: flex; align-items: center; gap: 10px; min-height: 38px; padding: 8px 10px; border-radius: var(--radius-md); color: var(--fg-secondary); font-size: var(--dash-body); text-decoration: none; transition: background-color var(--duration-fast), color var(--duration-fast); }
  .nav__item:hover { background: var(--bg-elevated); color: var(--fg-primary); }
  .nav__count { margin-left: auto; min-width: 22px; padding: 1px 7px; border-radius: var(--radius-pill); background: var(--accent-gold-dim); border: 1px solid var(--accent-gold-line); color: var(--accent-gold); font-size: var(--dash-caption); font-weight: 600; line-height: 1.5; text-align: center; font-variant-numeric: tabular-nums; }
  .nav__item.active { background: var(--bg-elevated); color: var(--accent-gold); box-shadow: inset 2px 0 0 var(--accent-gold), 0 0 0 1px var(--border); font-weight: 600; }
  .sidebar__foot { margin-top: auto; display: flex; align-items: center; gap: 7px; font-size: var(--dash-caption); color: var(--accent-teal); padding: 8px 10px; border: 1px solid var(--accent-teal-line); border-radius: var(--radius-md); }
  .sidebar__foot.is-off { color: var(--color-warning); border-color: color-mix(in srgb, var(--color-warning) 32%, transparent); }
  .online { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-teal); }

  /* ── Suscripciones (barra lateral y menú móvil) ── */
  .side-subs { display: flex; flex-direction: column; gap: 4px; }
  .subs__hint { margin: 4px 10px 0; font-size: var(--dash-caption); color: var(--fg-subtle); line-height: 1.5; }
  .subs__hint a { color: var(--fg-secondary); }
  .subs__hint--err { color: var(--fg-secondary); }
  .subs__skel { display: flex; flex-direction: column; gap: 8px; padding: 4px 10px; }
  .subs__skel .ui-skel { display: block; height: 22px; }
  .inline-btn { background: none; border: 0; padding: 0; color: var(--fg-primary); text-decoration: underline; cursor: pointer; font: inherit; }
  .runrate { display: flex; flex-direction: column; gap: 5px; margin: 8px 0 0; padding: 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; }
  .runrate__cap { font-size: 11px; font-weight: 500; letter-spacing: var(--tracking-wider); text-transform: uppercase; color: var(--fg-subtle); }
  .runrate__num { font-family: var(--font-display); font-weight: 700; font-size: 22px; line-height: 1; letter-spacing: var(--tracking-tight); color: var(--accent-gold); font-variant-numeric: tabular-nums; }

  /* ── Búsqueda (Ctrl K / ⌘K) ── */
  .search { display: flex; align-items: center; gap: 8px; padding: 0 10px 0 12px; min-height: 38px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; color: var(--fg-secondary); transition: border-color var(--duration-fast), box-shadow var(--duration-fast); }
  .search:focus-within { border-color: var(--accent-gold); box-shadow: 0 0 0 3px var(--accent-gold-dim); }
  .search__ico { display: inline-flex; color: var(--fg-subtle); }
  .search input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; font-family: inherit; font-size: var(--dash-small); color: var(--fg-primary); padding: 8px 0; }
  .search input::-webkit-search-cancel-button { display: none; }
  .search input:focus-visible { outline: none; }   /* el anillo lo pinta .search:focus-within */
  .search kbd { font-family: inherit; font-size: 11px; color: var(--fg-subtle); background: var(--bg-elevated); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border); white-space: nowrap; }

  /* ── Main ── */
  .main { padding: var(--space-5) var(--space-6) var(--space-7); min-width: 0; }
  .main:focus { outline: none; }
  .topbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3) var(--space-4); flex-wrap: wrap; padding-bottom: var(--space-4); border-bottom: 1px solid var(--border); }
  .crumbs { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .crumb { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: var(--dash-body); color: var(--fg-primary); white-space: nowrap; }
  .crumb :global(.ui-icon) { color: var(--fg-secondary); }
  .crumb--muted { color: var(--fg-subtle); font-weight: 400; }
  .topbar__right { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; justify-content: flex-end; }
  .updated { font-size: var(--dash-small); color: var(--fg-subtle); white-space: nowrap; }
  .me { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex: 0 0 auto; border-radius: var(--radius-pill); background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-deep)); color: var(--fg-inverse); font-family: var(--font-display); font-weight: 700; font-size: 13px; line-height: 1; box-shadow: 0 0 0 2px var(--bg-base); }
  .offline { display: flex; align-items: center; gap: 10px; margin-top: var(--space-4); padding: 10px 14px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-warning) 10%, transparent); border: 1px solid color-mix(in srgb, var(--color-warning) 32%, transparent); color: var(--fg-primary); font-size: var(--dash-small); }
  .offline :global(.ui-icon) { color: var(--color-warning); flex: 0 0 auto; }

  /* ── Móvil: barra compacta + menú en <dialog> (oculto en escritorio) ── */
  .mobilebar { display: none; }
  .mnav { display: none; }

  @media (max-width: 899px) {
    .shell { display: block; background: none; }
    .sidebar, .topbar { display: none; }
    .main { padding: var(--space-4) calc(var(--space-4) + var(--safe-right)) calc(var(--space-7) + var(--safe-bottom)) calc(var(--space-4) + var(--safe-left)); }
    .offline { margin-top: 0; margin-bottom: var(--space-3); }

    .mobilebar {
      position: sticky; top: 0; z-index: var(--z-nav);
      display: flex; align-items: center; gap: 12px;
      min-height: calc(var(--mobilebar-h) + var(--safe-top));
      padding: var(--safe-top) calc(6px + var(--safe-right)) 0 calc(var(--space-4) + var(--safe-left));
      background: var(--bg-2); border-bottom: 1px solid var(--border);
    }
    .mobilebar__brand { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: var(--tap-min); margin-left: -5px; }
    .mobilebar__title { flex: 1; min-width: 0; display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 16px; color: var(--fg-primary); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .mobilebar__title :global(.ui-icon) { color: var(--fg-secondary); flex: 0 0 auto; }
    .mobilebar__off { display: inline-flex; color: var(--color-warning); }
    .mobilebar__menu { display: inline-flex; align-items: center; justify-content: center; width: var(--tap-min); height: var(--tap-min); border-radius: var(--radius-md); border: 0; background: transparent; color: var(--fg-primary); cursor: pointer; }
    .mobilebar__menu:hover, .mobilebar__menu:active { background: var(--bg-elevated); }

    /* Menú: panel lateral en <dialog> (top layer, fondo inerte, Escape).
       Ceremonia mínima: aparece sin escalonado (E-03). */
    .mnav[open] {
      display: block;
      margin: 0; padding: 0; border: 0; background: transparent; color: var(--fg-primary);
      width: min(320px, 86vw); max-width: none; height: 100%; max-height: none;
    }
    .mnav::backdrop { background: var(--bg-overlay); }
    .mnav__panel {
      height: 100%; overflow-y: auto; overscroll-behavior: contain;
      display: flex; flex-direction: column; gap: var(--space-5);
      background: var(--bg-2); border-right: 1px solid var(--border);
      padding: calc(var(--space-3) + var(--safe-top)) var(--space-4) calc(var(--space-4) + var(--safe-bottom)) calc(var(--space-4) + var(--safe-left));
      animation: mnav-in var(--duration-base) ease-out;
    }
    .mnav__head { display: flex; align-items: center; justify-content: space-between; min-height: var(--tap-min); }
    .nav--m .nav__item { min-height: 48px; font-size: 15px; }
    .mnav__foot { margin-top: auto; display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; padding-top: var(--space-4); border-top: 1px solid var(--border); }
    .mnav__user { flex: 1 1 140px; min-width: 0; font-size: var(--dash-small); color: var(--fg-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mnav__foot .b { min-height: var(--tap-min); }
  }
  @keyframes mnav-in { from { transform: translateX(-12px); opacity: 0; } to { transform: none; opacity: 1; } }

  @media (pointer: coarse) {
    .nav__item { min-height: var(--tap-min); }
  }
</style>
