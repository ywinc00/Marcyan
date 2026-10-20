<script>
  // Estado honesto de cada fuente (SEO-03, SEO-07): si funciona, cuándo fue
  // la última sincronización buena, hasta qué día hay datos y, si falló, qué
  // pasó y qué hacer. Se lee de sync_state (migración 014); sin ella, del
  // último resultado de esta sesión o de last_synced_at.
  import Card from '../ui/Card.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import Icon from '../ui/Icon.svelte';
  import { whenTxt, dayShort, SOURCE_LABEL } from './format.js';

  let {
    project,
    state = null,          // sync_state (persistido) o el del último intento de esta sesión
    configured = true,
    through = {},          // { gsc: 'YYYY-MM-DD', ga4: 'YYYY-MM-DD' } último día con datos
    syncing = false,
    onedit, onstatus,
  } = $props();

  const has = $derived({ gsc: Boolean(project?.gsc_site_url), ga4: Boolean(project?.ga4_property_id), indexation: Boolean(project?.gsc_site_url) });
  const keys = ['gsc', 'ga4', 'indexation'];

  // Cierra la frase sin duplicar el punto de 'a.m.'.
  const dot = (t) => (t.endsWith('.') ? t : t + '.');
  function view(k) {
    const s = state && state.sources ? state.sources[k] : null;
    const thr = through[k] && has[k] && configured ? ' · datos hasta el ' + dayShort(through[k]) : '';
    if (!has[k]) return { tone: 'neutral', chip: 'Sin configurar', line: k === 'ga4' ? 'Falta el ID de propiedad de Analytics.' : 'Falta la propiedad de Search Console.', fix: 'edit' };
    // Sin acceso configurado el motivo va UNA vez, en el aviso general de arriba.
    if (!configured) return { tone: 'warning', chip: 'Sin conexión', line: s && s.ok_at ? dot('Últimos datos traídos: ' + whenTxt(s.ok_at)) : '' };
    if (syncing) return { tone: 'info', chip: 'Actualizando', line: 'Consultando a Google…' };
    if (!s) {
      if (project?.last_synced_at) return { tone: 'neutral', chip: 'Sincronizado', line: 'Sincronizado ' + whenTxt(project.last_synced_at) + thr };
      return { tone: 'neutral', chip: 'Sin sincronizar', line: 'Todavía no se ha traído nada de Google.' };
    }
    const okTxt = s.ok_at ? dot('La última vez que fue bien: ' + whenTxt(s.ok_at)) : 'Nunca ha ido bien.';
    if (s.status === 'ok') return { tone: 'success', chip: 'Al día', line: 'Sincronizado ' + whenTxt(s.at) + thr };
    if (s.status === 'empty') return { tone: 'warning', chip: 'Sin datos', line: 'Revisado ' + whenTxt(s.at), err: s.error };
    if (s.status === 'off') return { tone: 'neutral', chip: 'Sin configurar', line: '', fix: 'edit' };
    const code = (s.error && s.error.code) || '';
    return {
      tone: 'error', chip: 'Falló', line: dot('Falló ' + whenTxt(s.at)) + ' ' + okTxt, err: s.error,
      fix: /forbidden|not_found|bad_id|not_configured|auth_failed/.test(code) ? 'status' : null,
    };
  }
  const views = $derived(Object.fromEntries(keys.map((k) => [k, view(k)])));
  const triggerTxt = $derived(state && state.trigger === 'cron' ? 'automático' : 'manual');
  const generalErr = $derived(state && state.error ? state.error : null);
</script>

<Card flush>
  <div class="src-head">
    <p class="src-head__t">
      {#if project?.active === false}Pausado: no entra en la sincronización automática.{:else}Se sincroniza solo cada madrugada.{/if}
      {#if state && state.at}Último intento: {whenTxt(state.at)} ({triggerTxt}).{/if}
    </p>
  </div>
  {#if generalErr && !syncing}
    <div class="src-general" role="alert">
      <span class="src-general__i"><Icon name="alert" size={18} /></span>
      <div><p class="src-err__t">{generalErr.title}</p><p class="src-err__a">{generalErr.action}</p></div>
    </div>
  {/if}
  <ul class="src">
    {#each keys as k (k)}
      {@const v = views[k]}
      <li class="src__item">
        <div class="src__top">
          <span class="src__name">{SOURCE_LABEL[k]}</span>
          <StatusChip tone={v.tone} label={v.chip} />
        </div>
        {#if v.line}<p class="src__line">{v.line}</p>{/if}
        {#if v.err && !syncing}
          <div class="src-err">
            <p class="src-err__t">{v.err.title}</p>
            <p class="src-err__a">{v.err.action}</p>
            {#if v.err.detail}
              <details class="src-err__more"><summary>Detalles técnicos</summary><p>{v.err.detail}</p></details>
            {/if}
          </div>
        {/if}
        {#if v.fix === 'edit'}
          <button type="button" class="b b--mini" onclick={onedit}>Editar proyecto</button>
        {:else if v.fix === 'status' && !syncing}
          <button type="button" class="b b--mini" onclick={onstatus}>Ver estado de Google</button>
        {/if}
      </li>
    {/each}
  </ul>
</Card>

<style>
  .src-head { padding: 14px 20px; border-bottom: 1px solid var(--border-subtle); }
  .src-head__t { margin: 0; font-size: var(--dash-small); color: var(--fg-secondary); }
  .src-general { display: flex; gap: 10px; align-items: flex-start; padding: 14px 20px; border-bottom: 1px solid var(--border-subtle); background: rgba(var(--color-error-rgb), .06); }
  .src-general__i { color: var(--color-error); display: inline-flex; margin-top: 1px; }
  .src { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .src__item { padding: 16px 20px; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; min-width: 0; }
  .src__item + .src__item { border-left: 1px solid var(--border-subtle); }
  .src__top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); width: 100%; }
  .src__name { font-size: var(--dash-body); font-weight: 600; color: var(--fg-primary); }
  .src__line { margin: 0; font-size: var(--dash-small); color: var(--fg-secondary); line-height: 1.45; }
  .src-err { margin-top: 2px; }
  .src-err__t { margin: 0; font-size: var(--dash-small); font-weight: 600; color: var(--fg-primary); line-height: 1.45; }
  .src-err__a { margin: 2px 0 0; font-size: var(--dash-small); color: var(--fg-secondary); line-height: 1.5; }
  .src-err__more { margin-top: 6px; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .src-err__more summary { cursor: pointer; }
  .src-err__more p { margin: 6px 0 0; font-family: var(--font-mono); overflow-wrap: anywhere; line-height: 1.5; }
  .src__item .b { margin-top: 4px; }
  @media (max-width: 899px) {
    .src { grid-template-columns: 1fr; }
    .src__item + .src__item { border-left: 0; border-top: 1px solid var(--border-subtle); }
  }
</style>
