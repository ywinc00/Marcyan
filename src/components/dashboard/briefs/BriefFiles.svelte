<script>
  // Archivos del brief (B3): rejilla por tipo con sus etiquetas y descarga
  // individual. Solo se pintan en línea JPG/PNG/WebP VERIFICADOS (lo dice el
  // servidor con `inline`); un SVG nunca se pinta: miniatura genérica y
  // descarga. Los documentos legales van aparte: no viajan en el kit.
  // Plazo de conservación: 12 meses después de terminar el proyecto (o de
  // archivarlo, si no llegó a ser proyecto: retention.cause) los archivos
  // se borran solos ("Se borrarán el…", aviso 30 días antes) y, si el
  // cliente lo pide, "Borrar archivos" los borra antes.
  import { untrack } from 'svelte';
  import { api } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { fmtDate, fmtDay } from '../lib/dates.js';
  import Icon from '../ui/Icon.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import {
    groupFiles, fileTypeLabel, fmtSize, fileTags, fileCheck,
    retentionView, retentionPhrases, purgedText, purgeConfirmMessage,
  } from './brief-panel.js';

  let { pid, onloaded, onpurged } = $props();

  let files = $state([]);
  let available = $state(true);
  let loading = $state(true);
  let error = $state('');
  let broken = $state({});   // miniaturas que no cargaron → genérica
  let retention = $state(null);

  async function load() {
    loading = true; error = '';
    try {
      const j = await api('/api/admin/briefs/' + encodeURIComponent(pid) + '/files');
      files = j.files || [];
      available = j.available !== false;
      retention = j.retention || null;
      onloaded?.(files);
    } catch (e) { error = e.message; }
    finally { loading = false; }
  }
  $effect(() => { if (pid) untrack(load); });

  const groups = $derived(groupFiles(files));
  const pending = $derived(files.filter((f) => f.verified === null || f.verified === undefined).length);
  const keep = $derived(retentionView(retention, files));
  const keepWhy = $derived(retentionPhrases(keep?.cause));

  // ── Borrar archivos (a petición del cliente) ─────────────────
  let purgeOpen = $state(false);
  let purging = $state(false);
  async function doPurge() {
    purging = true;
    try {
      const j = await api('/api/admin/briefs/' + encodeURIComponent(pid) + '/files', { method: 'DELETE' });
      purgeOpen = false;
      const n = Number(j.files) || 0;
      toast(n ? (n === 1 ? '1 archivo borrado' : `${n} archivos borrados`) : 'Este brief ya no tenía archivos');
      await load();
      onpurged?.();
    } catch (e) { toastError(e, 'No se pudieron borrar los archivos.'); }
    finally { purging = false; }
  }

  const iconFor = (f) => (f.kind === 'video' ? 'video' : f.kind === 'photo' || f.kind === 'logo' ? 'image' : 'file');
</script>

<section class="ui-card files" aria-labelledby="files-title">
  <header class="files__head">
    <h2 class="files__title" id="files-title">Archivos</h2>
    {#if files.length}
      <span class="files__tools">
        <span class="files__count">{files.length} {files.length === 1 ? 'archivo' : 'archivos'}</span>
        <button class="b b--mini b--danger" type="button" onclick={() => (purgeOpen = true)}><Icon name="trash" size={14} />Borrar archivos</button>
      </span>
    {/if}
  </header>

  {#if error}
    <ErrorState title="No se pudieron cargar los archivos" message={error} onretry={load} compact />
  {:else if loading}
    <LoadingState loading={true} label="Cargando archivos">
      {#snippet skeleton()}<div class="tiles">{#each Array(4) as _, i (i)}<div class="ui-skel skel-tile"></div>{/each}</div>{/snippet}
    </LoadingState>
  {:else if !available}
    <EmptyState compact title="Los archivos aún no están activados"
      text="Falta aplicar la actualización 010 de la base de datos. El brief y el kit funcionan igual, sin archivos." />
  {:else if !files.length && keep?.kind === 'purged'}
    <EmptyState compact title={`Archivos borrados el ${fmtDate(keep.at)}`} text={purgedText(keep)} />
  {:else if !files.length}
    <EmptyState compact title="Sin archivos"
      text="El cliente no subió logo ni fotos con el brief. Puedes pedírselos con el kit de arranque." />
  {:else}
    {#if keep?.kind === 'scheduled'}
      {#if keep.soon}
        <p class="notice" role="status"><Icon name="alert" size={16} />
          <span>{keep.overdue ? `Ya se cumplieron ${keepWhy.since}: se borrarán en la próxima limpieza diaria.` : `Se borrarán el ${fmtDay(keep.day)}, ${keepWhy.after}.`}
          Si quieres conservarlos, descarga el kit antes{keep.legal ? '; los documentos legales se descargan uno a uno' : ''}.</span></p>
      {:else}
        <p class="keep"><Icon name="calendar" size={15} />Se borrarán el {fmtDay(keep.day)}, {keepWhy.after}.</p>
      {/if}
    {/if}
    {#if pending}
      <p class="notice" role="status"><Icon name="alert" size={16} />
        {pending === 1 ? 'Un archivo aún no se ha verificado' : `${pending} archivos aún no se han verificado`}: se pueden descargar, pero no se muestran hasta comprobar que su contenido es lo que dice ser.</p>
    {/if}
    {#each groups as g (g.kind)}
      <div class="group" class:group--legal={g.kind === 'legal'}>
        <h3 class="group__title">
          {#if g.kind === 'legal'}<Icon name="lock" size={15} />{/if}{g.title}
          <span class="group__n">{g.files.length}</span>
        </h3>
        {#if g.kind === 'legal'}<p class="group__note">Confidenciales: no van en el kit de diseño. Se descargan aparte.</p>{/if}
        <ul class="tiles">
          {#each g.files as f (f.id)}
            {@const check = fileCheck(f)}
            <li class="tile" class:tile--off={check.id === 'rejected'}>
              <div class="thumb">
                {#if f.inline && !broken[f.id]}
                  <img src={f.url} alt={f.originalName || 'Archivo del cliente'} loading="lazy" decoding="async"
                    onerror={() => (broken = { ...broken, [f.id]: true })} />
                {:else}
                  <span class="thumb__generic"><Icon name={iconFor(f)} size={26} /><span class="thumb__type">{fileTypeLabel(f)}</span></span>
                {/if}
              </div>
              <div class="tile__body">
                <p class="tile__name" title={f.originalName}>{f.originalName || 'Sin nombre'}</p>
                <p class="tile__meta">{fileTypeLabel(f)}{fmtSize(f.size) ? ' · ' + fmtSize(f.size) : ''}{f.moment === 'arranque' ? ' · Kit de arranque' : ''}</p>
                {#if fileTags(f).length}<p class="tile__tags" title={fileTags(f).join(' · ')}>{fileTags(f).join(' · ')}</p>{/if}
                <div class="tile__foot">
                  {#if check.label}<StatusChip tone={check.tone} label={check.label} />{/if}
                  {#if check.id === 'rejected'}
                    <span class="tile__why">Su contenido no coincidía con su tipo y se borró.</span>
                  {:else}
                    <a class="b b--mini" href={f.url + '?download=1'} download={f.originalName || ''}><Icon name="download" size={14} />Descargar</a>
                  {/if}
                </div>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  {/if}
</section>

<ConfirmDialog bind:open={purgeOpen} title="¿Borrar los archivos?" confirmLabel="Borrar archivos"
  message={purgeConfirmMessage(files)} busy={purging} onconfirm={doPurge} />

<style>
  .files { margin-bottom: 14px; }
  .files__head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); }
  .files__title { margin: 0; font-size: var(--dash-card-title); font-weight: 600; color: var(--fg-primary); letter-spacing: -0.01em; }
  .files__count { font-size: var(--dash-small); color: var(--fg-subtle); }
  .files__tools { display: inline-flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; justify-content: flex-end; }
  .keep { display: flex; gap: 8px; align-items: flex-start; margin: calc(-1 * var(--space-2)) 0 var(--space-4); font-size: var(--dash-small); line-height: 1.45; color: var(--fg-secondary); }
  .keep :global(.ui-icon) { color: var(--fg-subtle); flex: 0 0 auto; margin-top: 2px; }
  .notice { display: flex; gap: 8px; align-items: flex-start; margin: 0 0 var(--space-4); padding: 10px 12px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-warning) 9%, transparent); border: 1px solid color-mix(in srgb, var(--color-warning) 28%, transparent); font-size: var(--dash-small); line-height: 1.45; color: var(--fg-secondary); }
  .notice :global(.ui-icon) { color: var(--color-warning); flex: 0 0 auto; margin-top: 1px; }

  .group + .group { margin-top: var(--space-5); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle); }
  .group__title { display: flex; align-items: center; gap: 6px; margin: 0 0 var(--space-3); font-size: var(--dash-small); font-weight: 600; color: var(--fg-secondary); }
  .group__n { font-weight: 500; color: var(--fg-subtle); font-variant-numeric: tabular-nums; }
  .group__note { margin: -6px 0 var(--space-3); font-size: var(--dash-caption); color: var(--fg-subtle); }

  .tiles { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
  .skel-tile { height: 200px; border-radius: var(--radius-md); }
  .tile { display: flex; flex-direction: column; min-width: 0; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; }
  .tile--off { opacity: .7; }
  .thumb { aspect-ratio: 4 / 3; background: var(--bg-2); display: flex; align-items: center; justify-content: center; border-bottom: 1px solid var(--border-subtle); overflow: hidden; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .thumb__generic { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--fg-subtle); }
  .thumb__type { font-family: var(--font-mono); font-size: var(--dash-caption); letter-spacing: .04em; }
  .tile__body { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px 12px; flex: 1; min-width: 0; }
  .tile__name { margin: 0; font-size: var(--dash-small); font-weight: 500; color: var(--fg-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tile__meta { margin: 0; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .tile__tags { margin: 0; font-size: var(--dash-caption); line-height: 1.45; color: var(--fg-secondary); display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .tile__foot { margin-top: auto; padding-top: 4px; display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: wrap; }
  .tile__why { font-size: var(--dash-caption); color: var(--fg-subtle); line-height: 1.4; }
  @media (max-width: 719px) {
    .files { padding: 16px; }
    .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  }
</style>
