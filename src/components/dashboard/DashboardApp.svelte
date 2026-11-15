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
  import MarcySection from './MarcySection.svelte';
  import BriefsSection from './BriefsSection.svelte';
  import FinanzasSection from './FinanzasSection.svelte';
  import ProgresoSection from './ProgresoSection.svelte';
  import SeoSection from './SeoSection.svelte';
  import NotificationsSection from './NotificationsSection.svelte';
  import AjustesSection from './AjustesSection.svelte';
  import Icon from './ui/Icon.svelte';
  import Toast from './ui/Toast.svelte';
  import { continueSkeletons } from './ui/LoadingState.svelte';
  import { textoCarga } from './lib/cargando.svelte.js';
  import { api, MSG, errorMessage, onUnauthorized, onMutation, onNetwork } from './lib/api.js';
  import { toast, pushLayer, popLayer } from './lib/toast.svelte.js';
  import { route, href, navigate, startRouter, parseHash } from './lib/router.svelte.js';
  import { rememberReturn, takeReturn } from './lib/return-hash.js';
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

  // Arranque (pieza E-09): mientras se comprueba la sesión se ve el armazón
  // del panel (o el de la entrada, si este dispositivo no tiene sesión
  // conocida), nunca una rueda en mitad de la pantalla. Solo pasados 300 ms,
  // para no destellar cuando la comprobación es rápida.
  const SESSION_HINT = 'orbit:sesion';
  function readHint() { try { return localStorage.getItem(SESSION_HINT) === '1'; } catch { return false; } }
  function writeHint(on) {
    hadSession = on;
    try { if (on) localStorage.setItem(SESSION_HINT, '1'); else localStorage.removeItem(SESSION_HINT); } catch { /* sin almacenamiento: da igual */ }
  }
  let hadSession = $state(readHint());
  let bootShown = $state(false);
  let bootShownAt = 0;
  let bootTimer = null;
  let retryBtn = $state(null);

  // Texto de la región de carga: se fija 150 ms después del último cambio, para que
  // varias secciones que empiezan a la vez no lo cambien dos veces seguidas.
  let avisoCarga = $state('');
  $effect(() => {
    const t = textoCarga();
    const id = setTimeout(() => { avisoCarga = t; }, 150);
    return () => clearTimeout(id);
  });
  const booting = $derived(phase === 'loading');

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
    { id: 'marcy',    label: 'Marcy' },
    { id: 'briefs',   label: 'Briefs' },
    { id: 'finanzas', label: 'Finanzas' },
    { id: 'progreso', label: 'Progreso' },
    { id: 'seo',      label: 'SEO' },
    { id: 'avisos',   label: 'Avisos' },
    { id: 'ajustes',  label: 'Ajustes' },
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
  // Barra lateral: dólares redondos ($120/año), el detalle exacto queda en el título y en Finanzas.
  function moneyShort(cents) { return '$' + Math.round((Number(cents) || 0) / 100).toLocaleString('en-US'); }
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
  // Sin sesión se recuerda la ficha pedida (enlace de un correo) y, al entrar
  // con el enlace mágico, se vuelve a ella en vez de caer en Inicio (CT-02).
  function restoreReturn() {
    const h = takeReturn(window.location.hash);
    if (!h) return;
    const r = parseHash(h);
    navigate(r.section, r.sub, r.query, { replace: true });
  }
  async function checkSession() {
    phase = 'loading';
    bootShown = false;
    clearTimeout(bootTimer);
    bootTimer = setTimeout(() => { bootShown = true; bootShownAt = performance.now(); }, 300);
    // Si el armazón ya se veía y lo que sigue NO es el panel (entrada o «sin
    // conexión»), se queda al menos 400 ms: sin destello. Hacia el panel no se
    // espera: el esqueleto de la sección sigue al instante y cumple su propio mínimo.
    const minimoArmazon = async () => {
      if (!bootShown) return;
      const falta = 400 - (performance.now() - bootShownAt);
      if (falta > 0) await new Promise((r) => setTimeout(r, falta));
    };
    try {
      const j = await api('/api/admin/me', { auth: false });
      if (j && j.email) {
        restoreReturn(); user = j.email; writeHint(true);
        // Las secciones siguen con su esqueleto sin pasar por un hueco en blanco.
        if (bootShown) continueSkeletons();
        phase = 'app'; loadAll(); return;
      }
      rememberReturn(window.location.hash);
      clearTimeout(bootTimer);
      // La pista se borra DESPUÉS del mínimo: si no, el armazón cambiaría de forma a mitad.
      await minimoArmazon();
      writeHint(false);
      phase = 'login';
    } catch (e) {
      clearTimeout(bootTimer);
      if (e && e.status === 401) { rememberReturn(window.location.hash); await minimoArmazon(); writeHint(false); phase = 'login'; return; }
      // Sin red o servidor caído: NO es "perdiste la sesión" (SH-16).
      unreachableMsg = errorMessage(e, MSG.network);
      await minimoArmazon();
      phase = 'unreachable';
      // Si se pulsó Reintentar y vuelve a fallar, el foco vuelve al botón.
      setTimeout(() => retryBtn?.focus(), 0);
    } finally {
      clearTimeout(bootTimer);
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
      writeHint(false);
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

  // Título de pestaña con los avisos sin leer (OP-13): "(3) Orbit · Leads".
  const unreadBadge = $derived(phase === 'app' ? badgeText(avisos.unread) : '');
  $effect(() => {
    if (typeof document !== 'undefined') document.title = (unreadBadge ? `(${unreadBadge}) ` : '') + 'Orbit · ' + sectionTitle;
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
      rememberReturn(window.location.hash);
      writeHint(false);
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
  <!-- Fase 3: la marca del panel como en la lámina original (ficha con el
       icono de Orbit + nombre en blanco), sin el naranja en cursiva. -->
  <span class="brand" class:brand--lg={large}>
    <span class="brand__tile" aria-hidden="true"><svg viewBox="0 0 512 512" width="26" height="26"><defs><radialGradient id="brandCore" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#fdba74"/><stop offset=".55" stop-color="#f97316"/><stop offset="1" stop-color="#9a3412"/></radialGradient><clipPath id="brandFront"><rect x="0" y="256" width="512" height="256" transform="rotate(-24 256 256)"/></clipPath></defs><g transform="rotate(-24 256 256)"><ellipse cx="256" cy="256" rx="196" ry="74" fill="none" stroke="#f97316" stroke-width="30" opacity=".55"/></g><circle cx="256" cy="256" r="98" fill="url(#brandCore)"/><g clip-path="url(#brandFront)"><g transform="rotate(-24 256 256)"><ellipse cx="256" cy="256" rx="196" ry="74" fill="none" stroke="#f97316" stroke-width="30"/></g></g><circle cx="424" cy="224" r="30" fill="#f4f4f5" stroke="#262626" stroke-width="8"/></svg></span>
    <span class="wordmark">Orbit</span>
  </span>
{/snippet}

{#snippet navList(items)}
  <!-- onclick cierra el menú móvil también al tocar la sección en la que ya
       se está (sin cambio de sección el efecto de ruta no lo cerraría). -->
  {#each items as item (item.id)}
    <a class="nav__item" class:active={section === item.id} href={href(item.id)} aria-current={section === item.id ? 'page' : undefined} onclick={() => (menuOpen = false)}>
      <Icon name={item.id} size={20} />
      <span>{item.label}</span>
      {#if item.id === 'avisos' && unreadBadge}
        <span class="nav__count"><span aria-hidden="true">{unreadBadge}</span><span class="sr-only">, {avisos.unread === 1 ? '1 sin leer' : `${unreadBadge} sin leer`}</span></span>
      {/if}
    </a>
  {/each}
{/snippet}

{#snippet subsBlock(list, showEmptyHint)}
  <div class="side-subs">
    <!-- El gasto mensual sube a la cabecera del bloque (antes era una tarjeta
         aparte con la cifra en naranja). -->
    <span class="nav__cap nav__cap--row"><span>Suscripciones</span>{#if activeSubs.length}<span class="nav__cap-num">{moneyShort(monthlyRunRate)}/mes</span>{/if}</span>
    {#if data.subsError && !data.subs.length}
      <p class="subs__hint subs__hint--err">No se pudieron cargar. <button class="inline-btn" onclick={refreshShell}>Reintentar</button></p>
    {:else if !data.subsLoaded}
      <div class="subs__skel" aria-hidden="true"><span class="ui-skel"></span><span class="ui-skel"></span><span class="ui-skel"></span></div>
    {:else if activeSubs.length}
      {#if list.length}
        <div class="subs">
          {#each list as s (s.id)}
            <div class="subs__row" title={`${s.name} · ${money(s.amount_cents)}/${s.cycle === 'yearly' ? 'año' : 'mes'}`}>
              <BrandLogo name={s.name} size={18} />
              <span class="subs__name">{s.name}</span>
              <span class="subs__amt">{s.billing === 'variable' ? '≈' : ''}{moneyShort(s.amount_cents)}{s.cycle === 'yearly' ? '/año' : ''}</span>
            </div>
          {/each}
        </div>
      {:else if showEmptyHint}
        <p class="subs__hint">Sin coincidencias.</p>
      {/if}
      <a class="subs__all" href={href('finanzas', ['registros'])} onclick={() => (menuOpen = false)}>Ver todas en Finanzas</a>
    {:else}
      <p class="subs__hint">Agrega tus suscripciones en <a href={href('finanzas')} onclick={() => (menuOpen = false)}>Finanzas</a>.</p>
    {/if}
  </div>
{/snippet}

<!-- Región ÚNICA de avisos de carga para el lector de pantalla (comprobación
     global c): el arranque y los esqueletos de las secciones escriben aquí, fuera
     de lo que está ocupado, y solo cuando el hueco ya se ve. -->
<span class="sr-only" role="status">{booting && bootShown ? 'Cargando el panel…' : avisoCarga}</span>

{#if booting && !hadSession}
  <!-- Sin sesión conocida en este dispositivo: el hueco tiene la forma de la
       entrada (lo más probable es que haya que entrar). -->
  <div class="center" class:boot-wait={!bootShown} aria-busy="true">
    <div class="login" aria-hidden="true">
      {@render brandMark(true)}
      <p class="login__tag">Panel de operaciones</p>
      <span class="ui-skel boot-login__lbl"></span>
      <span class="ui-skel boot-login__field"></span>
      <span class="ui-skel boot-login__field"></span>
    </div>
  </div>

{:else if phase === 'unreachable'}
  <div class="center">
    <div class="login">
      {@render brandMark(true)}
      <p class="login__tag">Panel de operaciones</p>
      <div class="state-msg" role="alert">
        <Icon name={browserOnline ? 'alert' : 'wifiOff'} size={20} />
        <p>{browserOnline ? unreachableMsg : 'Sin conexión. Cuando vuelva internet, el panel se recarga solo.'}</p>
      </div>
      <button type="button" class="b b--primary" bind:this={retryBtn} onclick={checkSession}><Icon name="refresh" size={16} />Reintentar</button>
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
  <!-- Mientras se comprueba la sesión, el mismo armazón con los huecos en su
       sitio: nada se puede pulsar y ninguna sección pide datos todavía. -->
  <div class="shell" class:boot-wait={booting && !bootShown} inert={booting} aria-busy={booting ? 'true' : undefined}>
    <!-- ═══ Escritorio: barra lateral ═══ -->
    <aside class="sidebar">
      {@render brandMark(false)}

      <div class="search">
        <span class="search__ico"><Icon name="search" size={18} /></span>
        <input bind:this={searchEl} type="search" placeholder="Buscar" aria-label="Buscar secciones y suscripciones"
          aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'} bind:value={navQuery} onkeydown={onNavSearchKey} />
        <kbd aria-hidden="true">{kbdLabel}</kbd>
      </div>

      <nav class="nav" aria-label="Secciones">
        <span class="nav__cap">Navegación</span>
        {#if filteredNav.length}
          {@render navList(filteredNav)}
        {:else}
          <p class="subs__hint">Ninguna sección se llama así.</p>
        {/if}
      </nav>

      {@render subsBlock(filteredSubs, true)}

      <div class="sidebar__foot" class:is-off={!online} role="status">
        {#if online}<span class="online" aria-hidden="true"></span>En línea
        {:else}<Icon name="wifiOff" size={14} />Sin conexión{/if}
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
          <span class="crumb"><Icon name={section} size={18} />{sectionTitle}</span>
          {#if section === 'inicio' && activeProjectCount > 0}
            <span class="crumb crumb--muted">{activeProjectCount} proyecto{activeProjectCount === 1 ? '' : 's'} activo{activeProjectCount === 1 ? '' : 's'}</span>
          {/if}
        </div>
        <div class="topbar__right">
          {#if section === 'inicio' && data.loadedAt}<span class="updated">Actualizado {fmtTime(data.loadedAt)}</span>{/if}
          {#if installPrompt}<button class="b b--ghost" onclick={doInstall}><Icon name="install" size={16} />Instalar app</button>{/if}
          {#if booting}
            <span class="ui-skel boot__me" aria-hidden="true"></span>
          {:else}
            <span class="me" title={user} aria-hidden="true">{userInitial}</span>
          {/if}
          <button class="b b--ghost" onclick={logout} disabled={loggingOut}>{loggingOut ? 'Saliendo…' : 'Salir'}</button>
        </div>
      </header>

      {#if booting}
        <!-- Huecos del contenido: el título siempre; las cifras y gráficos solo en
             Inicio, que es la única forma que se sabe de antemano. Al llegar la
             sesión, cada sección sigue con su propio esqueleto sin pasar por blanco. -->
        <div class="boot" aria-hidden="true">
          <div class="ui-page-head">
            <div class="ui-page-head__text"><span class="ui-skel boot__title"></span></div>
          </div>
          <!-- Solo Inicio tiene un armazón con forma fija; el resto de secciones
               abre con cabeceras distintas y su esqueleto llega justo después. -->
          {#if section === 'inicio'}
            <div class="ui-kpis" data-count="4">{#each [0, 1, 2, 3] as i (i)}<span class="ui-skel boot__kpi"></span>{/each}</div>
            <div class="boot__charts"><span class="ui-skel boot__chart"></span><span class="ui-skel boot__chart"></span></div>
          {/if}
        </div>
      {:else if !online}
        <div class="offline" role="status">
          <Icon name="wifiOff" size={16} />
          <span>Sin conexión. Lo que ves puede estar desactualizado y los cambios no se guardarán hasta que vuelva.</span>
        </div>
      {/if}

      {#if booting}
        <!-- Sin sesión comprobada ninguna sección se monta (pediría datos). -->
      {:else if section === 'inicio'}
        <InicioSection {user} />
      {:else if section === 'leads'}
        <LeadsSection />
      {:else if section === 'clientes'}
        <ClientesSection />
      {:else if section === 'marcy'}
        <MarcySection />
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
      {:else if section === 'ajustes'}
        <AjustesSection />
      {/if}
    </main>
  </div>
{/if}

<Toast />

<style>
  /* ── Layout base ── */
  .center { min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: calc(var(--space-5) + var(--safe-top)) var(--space-4) calc(var(--space-5) + var(--safe-bottom)); }

  /* ── Marca ── */
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand--lg { justify-content: center; margin-bottom: var(--space-2); }
  .brand__tile { width: 34px; height: 34px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; border-radius: 9px; background: #262626; border: 1px solid var(--border); }
  .brand__tile svg { display: block; }
  .brand--lg .brand__tile { width: 40px; height: 40px; }
  .wordmark { font-family: var(--font-display); font-weight: 500; letter-spacing: -0.01em; font-size: 17px; color: var(--fg-primary); }
  .brand--lg .wordmark { font-size: 20px; }
  /* El planeta suelto queda solo para la barra del móvil. */
  .planet { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--accent-gold); position: relative; flex: 0 0 auto; display: inline-block; }
  .planet::after { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: var(--accent-gold); }

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
    display: grid; grid-template-columns: 240px minmax(0, 1fr); min-height: 100vh;
    background: linear-gradient(90deg, var(--bg-2) 0 239px, var(--border) 239px 240px, transparent 240px);
  }
  /* Fase 3: barra lateral como la lámina original (marca, búsqueda, filete,
     rótulo mono, ítems de 40 px, activo en gris claro sin acento). */
  .sidebar {
    position: sticky; top: 0; align-self: start; height: 100vh; height: 100dvh; overflow-y: auto;
    background: var(--bg-2); border-right: 1px solid var(--border);
    padding: 18px 14px 14px; display: flex; flex-direction: column; gap: 18px;
  }
  .sidebar > .brand { padding: 0 2px; }
  .nav { display: flex; flex-direction: column; gap: 2px; padding-top: 16px; border-top: 1px solid var(--border); }
  .nav--m { padding-top: 0; border-top: 0; }
  .nav__cap { font-family: var(--font-mono); font-size: var(--dash-mono); font-weight: 400; letter-spacing: 0; color: var(--fg-subtle); padding: 0 10px 10px; }
  .nav__cap--row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .nav__cap-num { color: var(--fg-secondary); font-variant-numeric: tabular-nums; }
  .nav__item { display: flex; align-items: center; gap: 12px; min-height: 40px; padding: 8px 10px; border-radius: 10px; color: var(--fg-secondary); font-size: var(--dash-body); text-decoration: none; transition: background-color var(--duration-fast), color var(--duration-fast); }
  .nav__item :global(.ui-icon) { flex: 0 0 auto; color: var(--fg-subtle); transition: color var(--duration-fast); }
  .nav__item:hover { background: var(--bg-elevated); color: var(--fg-primary); }
  .nav__item:hover :global(.ui-icon) { color: var(--fg-primary); }
  .nav__count { margin-left: auto; min-width: 22px; padding: 1px 7px; border-radius: var(--radius-pill); background: var(--accent-gold-dim); border: 1px solid var(--accent-gold-line); color: var(--accent-gold); font-size: var(--dash-caption); font-weight: 600; line-height: 1.5; text-align: center; font-variant-numeric: tabular-nums; }
  /* Portátil de poco alto: la barra lateral se aprieta antes de desplazarse. */
  @media (max-height: 820px) {
    .sidebar { gap: 12px; padding-top: 14px; padding-bottom: 10px; scrollbar-width: none; }
    .sidebar::-webkit-scrollbar { display: none; }
    .nav { padding-top: 10px; gap: 0; }
    .nav__cap { padding-bottom: 6px; }
    .nav__item { min-height: 33px; padding: 5px 10px; }
    .subs__row { padding-top: 5px; padding-bottom: 5px; }
    .sidebar__foot { padding-top: 8px; }
  }
  .nav__item.active { background: var(--surface-3); color: var(--fg-primary); font-weight: 500; }
  .nav__item.active :global(.ui-icon) { color: var(--fg-primary); }
  .sidebar__foot { margin-top: auto; display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: var(--dash-mono); color: var(--fg-subtle); padding: 12px 10px 2px; border-top: 1px solid var(--border); }
  .sidebar__foot.is-off { color: var(--color-warning); }
  .online { width: 6px; height: 6px; border-radius: 50%; background: var(--delta-up); box-shadow: 0 0 0 3px color-mix(in srgb, var(--delta-up) 18%, transparent); }

  /* ── Suscripciones (barra lateral y menú móvil) ── */
  .side-subs { display: flex; flex-direction: column; gap: 2px; }
  .side-subs :global(.subs__name) { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.25; }
  .subs__amt { margin-left: auto; flex: 0 0 auto; font-family: var(--font-mono); font-size: var(--dash-mono); color: var(--fg-subtle); font-variant-numeric: tabular-nums; }
  .subs__all { display: block; margin: 4px 10px 0; font-size: var(--dash-caption); color: var(--fg-subtle); text-decoration: none; }
  .subs__all:hover { color: var(--fg-primary); }
  .subs__hint { margin: 4px 10px 0; font-size: var(--dash-caption); color: var(--fg-subtle); line-height: 1.5; }
  .subs__hint a { color: var(--fg-secondary); }
  .subs__hint--err { color: var(--fg-secondary); }
  .subs__skel { display: flex; flex-direction: column; gap: 8px; padding: 4px 10px; }
  .subs__skel .ui-skel { display: block; height: 22px; }
  .inline-btn { background: none; border: 0; padding: 0; color: var(--fg-primary); text-decoration: underline; cursor: pointer; font: inherit; }

  /* ── Búsqueda (Ctrl K / ⌘K) ── */
  .search { display: flex; align-items: center; gap: 10px; padding: 0 10px 0 12px; min-height: 40px; background: var(--bg-elevated); border: 1px solid transparent; border-radius: 10px; color: var(--fg-secondary); transition: border-color var(--duration-fast), box-shadow var(--duration-fast); }
  .search:focus-within { border-color: var(--accent-gold); box-shadow: 0 0 0 3px var(--accent-gold-dim); }
  .search__ico { display: inline-flex; color: var(--fg-subtle); }
  .search input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; font-family: inherit; font-size: var(--dash-small); color: var(--fg-primary); padding: 8px 0; }
  .search input::-webkit-search-cancel-button { display: none; }
  .search input:focus-visible { outline: none; }   /* el anillo lo pinta .search:focus-within */
  .search input { font-size: var(--dash-body); }
  .search input::placeholder { color: var(--fg-secondary); }
  .search kbd { font-family: var(--font-mono); font-size: 11px; color: var(--fg-subtle); background: transparent; padding: 0 2px; border: 0; white-space: nowrap; }

  /* ── Main ── */
  /* --chrome-y: lo que la carcasa ocupa en alto (relleno de arriba + cabecera +
     relleno de abajo). Inicio lo resta para caber en la pantalla. */
  .main { --chrome-y: 76px; padding: 12px 24px 20px; min-width: 0; }
  .main:focus { outline: none; }
  .topbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3) var(--space-4); flex-wrap: wrap; min-height: 44px; }
  .crumbs { display: flex; align-items: center; gap: 18px; min-width: 0; }
  .crumb { display: inline-flex; align-items: center; gap: 10px; font-weight: 500; font-size: var(--dash-body); color: var(--fg-primary); white-space: nowrap; }
  .crumb :global(.ui-icon) { color: var(--fg-secondary); }
  .crumb--muted { font-family: var(--font-mono); font-size: var(--dash-mono); color: var(--fg-subtle); font-weight: 400; }
  .topbar__right { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; justify-content: flex-end; }
  .updated { font-family: var(--font-mono); font-size: var(--dash-mono); color: var(--fg-subtle); white-space: nowrap; }
  .me { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex: 0 0 auto; border-radius: var(--radius-pill); background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--fg-primary); font-family: var(--font-display); font-weight: 600; font-size: 13px; line-height: 1; }
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
  /* Movimiento reducido (F-02): el menú aparece sin desplazarse. */
  @media (prefers-reduced-motion: reduce) { .mnav__panel { animation: mnav-fade var(--duration-fast) ease-out; } }
  @keyframes mnav-fade { from { opacity: 0; } to { opacity: 1; } }

  @media (pointer: coarse) {
    .nav__item { min-height: var(--tap-min); }
  }
  /* ── Arranque: armazón mientras se comprueba la sesión (pieza E-09). Las
     medidas copian las de la entrada y las de Inicio para que nada salte. ── */
  .boot-wait { visibility: hidden; }
  .boot-login__lbl { display: block; height: 19px; width: 34%; }
  .boot-login__field { display: block; height: var(--tap-min); }
  .boot__title { display: block; height: 32px; width: 300px; max-width: 70vw; }
  .boot__me { display: inline-block; width: 32px; height: 32px; border-radius: var(--radius-pill); flex: 0 0 auto; }
  .boot__kpi { display: block; height: 104px; border-radius: 12px; }
  .boot__charts { display: grid; gap: 14px; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); }
  .boot__chart { display: block; height: 300px; border-radius: var(--radius-lg); }
  @media (max-width: 719px) { .boot__kpi { height: 136px; } .boot__chart:first-child { height: 288px; } .boot__chart { height: 298px; } }
  @media (max-width: 1099px) { .boot__charts { grid-template-columns: minmax(0, 1fr); } }
</style>
