<script>
  // "Estado de Google" (SEO-01, SEO-17): vive en el indicador de la cabecera
  // (el anfitrión que ya existía, E-19). Al abrirse revisa el acceso real de
  // la cuenta de servicio (GET /api/admin/seo/diag) y explica, por proyecto,
  // qué falla y qué hacer; ofrece "Usar esta propiedad" cuando la cuenta ve
  // la misma web con otra propiedad (dominio o prefijo). Desde aquí también
  // se sincronizan todos los proyectos activos, uno a uno, con su progreso.
  import Modal from '../ui/Modal.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import Icon from '../ui/Icon.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { projectHealth } from '../../../../lib/seo-core.mjs';
  import { fmtDateTime } from './format.js';

  let {
    open = $bindable(false),
    projects = [],
    configured = true,
    days = 28,
    onchanged,            // () => void: recargar lista y detalle
    onopenproject,        // (id) => void
  } = $props();

  let diag = $state(null);
  let loading = $state(false);
  let error = $state('');
  let copied = $state(false);
  let fixing = $state('');
  // Sincronizar todos: { [id]: 'queued' | 'running' | 'ok' | 'partial' | 'error' }
  let bulk = $state({});
  let bulkRunning = $state(false);
  let bulkDone = $state(0);

  const active = $derived(projects.filter((p) => p.active !== false));
  const byId = $derived(Object.fromEntries((diag?.projects || []).map((p) => [String(p.id), p])));

  async function runDiag() {
    loading = true; error = '';
    try { diag = await api('/api/admin/seo/diag', { timeout: 60000 }); }
    catch (e) { if (!isSessionError(e)) error = errorMessage(e, 'No se pudo revisar el acceso a Google.'); }
    finally { loading = false; }
  }
  $effect(() => { if (open) { diag = null; copied = false; runDiag(); } });

  async function copySa() {
    if (!diag?.sa_email) return;
    try { await navigator.clipboard.writeText(diag.sa_email); copied = true; setTimeout(() => (copied = false), 2500); }
    catch (_) { toast('No se pudo copiar. Selecciona el correo y cópialo a mano.', { tone: 'info' }); }
  }

  async function useProperty(p, siteUrl) {
    fixing = String(p.id);
    try {
      await api('/api/admin/seo/projects/' + encodeURIComponent(p.id), { method: 'PATCH', body: { gsc_site_url: siteUrl } });
      toast('Propiedad cambiada. Trayendo los datos de la nueva…');
      await api('/api/admin/seo/sync', { method: 'POST', body: { id: p.id, days }, acceptErrors: true, timeout: 120000 });
      onchanged?.();
      await runDiag();
    } catch (e) { toastError(e, 'No se pudo cambiar la propiedad.'); }
    finally { fixing = ''; }
  }

  async function syncAll() {
    if (bulkRunning || !active.length) return;
    bulkRunning = true; bulkDone = 0;
    bulk = Object.fromEntries(active.map((p) => [String(p.id), 'queued']));
    let bad = 0;
    // Uno a uno: cada petición cabe de sobra en el tiempo de la función y el
    // progreso es real (no una barra inventada).
    for (const p of active) {
      const id = String(p.id);
      bulk[id] = 'running';
      try {
        const j = await api('/api/admin/seo/sync', { method: 'POST', body: { id, days }, acceptErrors: true, timeout: 120000 });
        const r = j.results && j.results[0];
        bulk[id] = r ? r.status : 'error';
        if (!r || r.status !== 'ok') bad++;
      } catch (e) {
        bulk[id] = 'error'; bad++;
        if (isSessionError(e)) break;
      }
      bulkDone++;
    }
    bulkRunning = false;
    onchanged?.();
    if (bad) toast(`Sincronización terminada: ${bad} de ${active.length} con fallos.`, { tone: 'info', timeout: 6000 });
    else toast('Todos los proyectos están al día.');
  }

  const BULK_LABEL = { queued: ['neutral', 'En cola'], running: ['info', 'Sincronizando…'], ok: ['success', 'Al día'], partial: ['warning', 'Con fallos'], error: ['error', 'Falló'] };
  const LEVEL_ICON = { ok: 'check', error: 'alert', warn: 'alert', off: 'alert' };
</script>

<Modal bind:open title="Estado de Google" size="lg">
  <div class="st">
    <section class="st__conn">
      {#if !configured}
        <p class="st__lead"><StatusChip tone="warning" label="Sin configurar" /> El servidor no tiene configurado el acceso a Google. Hasta que se active, no se puede traer ningún dato.</p>
      {:else}
        <p class="st__lead">El panel lee Google con una cuenta de servicio de solo lectura. Para que vea un sitio, su correo tiene que estar añadido como usuario en Search Console y como Lector en Analytics.</p>
        {#if diag?.sa_email}
          <div class="st__sa">
            <code class="st__email">{diag.sa_email}</code>
            <button type="button" class="b b--mini" onclick={copySa}>{copied ? 'Copiado' : 'Copiar correo'}</button>
          </div>
        {/if}
      {/if}
      {#if diag?.access_error}
        <div class="st__alert" role="alert"><Icon name="alert" size={18} /><div><p class="st__ft">{diag.access_error.title}</p><p class="st__fa">{diag.access_error.action}</p></div></div>
      {/if}
    </section>

    {#if error}
      <ErrorState title="No se pudo revisar el acceso" message={error} onretry={runDiag} compact />
    {/if}

    {#if !active.length && !projects.length}
      <EmptyState compact title="No hay proyectos de SEO" text="Crea un proyecto para revisar su acceso a Google." />
    {:else}
      <ul class="st__list">
        {#each projects as p (p.id)}
          {@const h = projectHealth(p, { configured })}
          {@const d = byId[String(p.id)]}
          {@const b = bulk[String(p.id)]}
          <li class="st__row">
            <div class="st__rowhead">
              <div class="st__who">
                <button type="button" class="st__name" onclick={() => { open = false; onopenproject?.(p.id); }}>{p.name}</button>
                <span class="st__meta">{p.domain || p.gsc_site_url || 'Sin dominio'}{p.active === false ? ' · fuera de la sincronización automática' : ''}</span>
              </div>
              {#if b}
                <StatusChip tone={BULK_LABEL[b][0]} label={BULK_LABEL[b][1]} />
              {:else}
                <StatusChip tone={h.tone} label={h.label} />
              {/if}
            </div>
            <p class="st__when">{p.last_attempt_at ? 'Último intento: ' + fmtDateTime(p.last_attempt_at) : p.last_synced_at ? 'Última sincronización: ' + fmtDateTime(p.last_synced_at) : 'Nunca sincronizado'}</p>
            <LoadingState loading={loading && !d} rows={1} height={36} label="Revisando acceso…">
              {#if d && d.findings}
                <ul class="st__findings">
                  {#each d.findings as f, i (i)}
                    <li class="st__f st__f--{f.level}">
                      <span class="st__fi"><Icon name={LEVEL_ICON[f.level] || 'alert'} size={16} /></span>
                      <div class="st__fb">
                        <p class="st__ft">{f.title}</p>
                        {#if f.action}<p class="st__fa">{f.action}</p>{/if}
                        {#if f.suggestion && f.suggestion.gsc_site_url}
                          <button type="button" class="b b--mini" disabled={fixing === String(p.id)} onclick={() => useProperty(p, f.suggestion.gsc_site_url)}>
                            {fixing === String(p.id) ? 'Cambiando…' : 'Usar ' + f.suggestion.gsc_site_url}
                          </button>
                        {/if}
                      </div>
                    </li>
                  {/each}
                </ul>
              {/if}
            </LoadingState>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  {#snippet footer()}
    {#if bulkRunning}<span class="st__progress" role="status">Sincronizando {Math.min(bulkDone + 1, active.length)} de {active.length}…</span>{/if}
    <button type="button" class="b" onclick={runDiag} disabled={loading || !configured}><Icon name="refresh" size={16} />{loading ? 'Revisando…' : 'Revisar otra vez'}</button>
    <button type="button" class="b b--primary" onclick={syncAll} disabled={bulkRunning || !active.length || !configured}>
      {bulkRunning ? 'Sincronizando…' : 'Sincronizar todos'}
    </button>
  {/snippet}
</Modal>

<style>
  .st { display: flex; flex-direction: column; gap: var(--space-4); }
  .st__conn { display: flex; flex-direction: column; gap: 10px; }
  .st__lead { margin: 0; font-size: var(--dash-small); color: var(--fg-secondary); line-height: 1.55; }
  .st__sa { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
  .st__email { font-family: var(--font-mono); font-size: var(--dash-caption); color: var(--fg-primary); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 8px; overflow-wrap: anywhere; user-select: all; }
  .st__alert { display: flex; gap: 10px; align-items: flex-start; color: var(--color-error); background: rgba(var(--color-error-rgb), .07); border: 1px solid rgba(var(--color-error-rgb), .25); border-radius: var(--radius-md); padding: 12px 14px; }
  .st__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .st__row { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
  .st__rowhead { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
  .st__who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .st__name { all: unset; cursor: pointer; font-size: var(--dash-body); font-weight: 600; color: var(--fg-primary); }
  .st__name:hover { text-decoration: underline; text-underline-offset: 3px; }
  .st__name:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; border-radius: 4px; }
  .st__meta { font-size: var(--dash-caption); color: var(--fg-subtle); overflow-wrap: anywhere; }
  .st__when { margin: 0; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .st__findings { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .st__f { display: flex; gap: 10px; align-items: flex-start; }
  .st__fi { display: inline-flex; margin-top: 2px; flex: 0 0 auto; }
  .st__f--ok .st__fi { color: var(--accent-teal); }
  .st__f--error .st__fi { color: var(--color-error); }
  .st__f--warn .st__fi, .st__f--off .st__fi { color: var(--fg-subtle); }
  .st__fb { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0; }
  .st__ft { margin: 0; font-size: var(--dash-small); font-weight: 600; color: var(--fg-primary); line-height: 1.45; }
  .st__fa { margin: 0; font-size: var(--dash-small); color: var(--fg-secondary); line-height: 1.5; overflow-wrap: anywhere; }
  .st__progress { margin-right: auto; align-self: center; font-size: var(--dash-small); color: var(--fg-secondary); }
</style>
