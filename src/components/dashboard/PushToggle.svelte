<script>
  // Avisos en este dispositivo (Web Push). Vive en la cabecera de Avisos:
  // es su anfitrión natural (E-19). Activar pide permiso al navegador y
  // guarda la suscripción; "Probar" manda un aviso a todos tus dispositivos.
  // iPhone: los avisos web solo funcionan con Orbit instalado en la pantalla
  // de inicio, así que en Safari sin instalar se explica cómo hacerlo.
  import { api, errorMessage, isSessionError } from './lib/api.js';
  import { toast, toastError } from './lib/toast.svelte.js';
  import Icon from './ui/Icon.svelte';

  let state = $state('cargando');   // cargando | sin-soporte | ios-instalar | bloqueado | apagado | activo | sin-llave | sin-base
  let busy = $state(false);
  let publicKey = '';

  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true);

  function keyBytes(b64) {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  }
  function deviceName() {
    const ua = navigator.userAgent;
    const os = /iphone/i.test(ua) ? 'iPhone' : /ipad/i.test(ua) ? 'iPad' : /android/i.test(ua) ? 'Android' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'Mac' : 'Otro';
    return `${os}${standalone ? ' · app' : ' · navegador'}`;
  }

  async function check() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      state = isIOS && !standalone ? 'ios-instalar' : 'sin-soporte'; return;
    }
    try {
      const d = await api('/api/admin/push');
      publicKey = d.publicKey;
      if (!d.configurado) { state = 'sin-llave'; return; }
    } catch (e) {
      if (isSessionError(e)) return;
      state = e && e.data && e.data.code === 'migration_pending' ? 'sin-base' : 'sin-soporte'; return;
    }
    if (Notification.permission === 'denied') { state = 'bloqueado'; return; }
    const reg = await navigator.serviceWorker.getRegistration('/dashboard');
    const sub = reg && await reg.pushManager.getSubscription();
    state = sub ? 'activo' : 'apagado';
  }
  $effect(() => { check(); });

  async function activar() {
    busy = true;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { state = perm === 'denied' ? 'bloqueado' : 'apagado'; return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      await api('/api/admin/push', { method: 'POST', body: { subscription: sub.toJSON(), device: deviceName() } });
      state = 'activo';
      toast('Avisos activados en este dispositivo');
    } catch (e) { if (!isSessionError(e)) toastError(errorMessage(e)); }
    finally { busy = false; }
  }

  async function apagar() {
    busy = true;
    try {
      const reg = await navigator.serviceWorker.getRegistration('/dashboard');
      const sub = reg && await reg.pushManager.getSubscription();
      if (sub) { await api('/api/admin/push', { method: 'DELETE', body: { endpoint: sub.endpoint } }); await sub.unsubscribe(); }
      state = 'apagado';
      toast('Avisos apagados en este dispositivo');
    } catch (e) { if (!isSessionError(e)) toastError(errorMessage(e)); }
    finally { busy = false; }
  }

  async function probar() {
    busy = true;
    try {
      const r = await api('/api/admin/push', { method: 'POST', body: { test: true } });
      toast(r.sent ? `Aviso de prueba enviado a ${r.sent} dispositivo${r.sent === 1 ? '' : 's'}` : 'No hay dispositivos que lo reciban');
    } catch (e) { if (!isSessionError(e)) toastError(errorMessage(e)); }
    finally { busy = false; }
  }

  const NOTE = {
    'sin-soporte': 'Este navegador no admite avisos.',
    'ios-instalar': 'En iPhone, instala Orbit primero: Compartir y luego "Añadir a pantalla de inicio". Ábrelo desde ahí y activa los avisos.',
    bloqueado: 'Los avisos están bloqueados para este sitio. Permítelos en los ajustes del navegador y vuelve aquí.',
    'sin-llave': 'Falta la llave de avisos en Vercel.',
    'sin-base': 'Falta preparar la base de datos de los avisos.',
  };
</script>

{#if state === 'activo'}
  <button type="button" class="b b--ghost" disabled={busy} onclick={probar}><Icon name="avisos" size={16} />Probar aviso</button>
  <button type="button" class="b b--ghost" disabled={busy} onclick={apagar}>Apagar en este dispositivo</button>
{:else if state === 'apagado'}
  <button type="button" class="b b--ghost" disabled={busy} onclick={activar}><Icon name="avisos" size={16} />Avisos en este dispositivo</button>
{:else if NOTE[state]}
  <p class="push-note">{NOTE[state]}</p>
{/if}

<style>
  .push-note { margin: 0; max-width: 340px; font-size: var(--dash-caption); line-height: 1.4; color: var(--fg-subtle); }
</style>
