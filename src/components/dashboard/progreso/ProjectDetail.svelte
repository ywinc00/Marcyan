<script>
  // Ficha de proyecto: #/progreso/PRJ-003 (enlace profundo; recargar y Atrás
  // conservan la vista). Columna principal: avance (barra + stepper) e hitos
  // editables. Lateral: datos del proyecto editables (OP-04), resumen con
  // enlaces al cliente, al brief y a las facturas, y borrar con un aviso que
  // dice qué se pierde y qué queda suelto (OP-29).
  import { api } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { href, setSub, route } from '../lib/router.svelte.js';
  import { fmtDay, fmtDateTime } from '../lib/dates.js';
  import PageHeader from '../ui/PageHeader.svelte';
  import Card from '../ui/Card.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import Icon from '../ui/Icon.svelte';
  import Stepper from './Stepper.svelte';
  import MilestoneList from './MilestoneList.svelte';
  import ProjectForm from './ProjectForm.svelte';
  import { pStatus, serviceLabel, fmtMoney, monoColor, initials, TONE_COLOR } from './format.js';

  let { ref } = $props();
  const DAY = { day: 'numeric', month: 'short', year: 'numeric' };

  let project = $state(null);
  let milestones = $state([]);
  let progress = $state(null);
  let loading = $state(true);
  let error = $state('');
  let notFound = $state(false);

  let saving = $state(false);
  let saveError = $state('');
  let confirmOpen = $state(false);
  let deleting = $state(false);

  const backHref = $derived(href('progreso', [], route.query));
  const percent = $derived(progress ? progress.percent : 0);
  const st = $derived(project ? pStatus(project.status) : null);
  const barTone = $derived(percent >= 100 ? 'success' : (st?.tone || 'neutral'));

  async function load() {
    loading = true; error = ''; notFound = false;
    try {
      const j = await api('/api/admin/projects/' + encodeURIComponent(ref));
      project = j.project; milestones = j.milestones || []; progress = j.progress || null;
    } catch (e) {
      if (e?.status === 404) notFound = true;
      else error = e?.message || 'No se pudo abrir el proyecto.';
    } finally { loading = false; }
  }

  // Recarga al cambiar de proyecto (enlace profundo, Atrás/Adelante).
  let loadedRef = '';
  $effect(() => {
    if (ref && ref !== loadedRef) { loadedRef = ref; project = null; load(); }
  });

  function onMilestones({ milestones: ms, progress: pr }) {
    milestones = ms;
    if (pr) progress = pr;
  }

  async function save(payload) {
    if (!Object.keys(payload).length) return;
    saving = true; saveError = '';
    try {
      const j = await api('/api/admin/projects/' + encodeURIComponent(project.id), { method: 'PATCH', body: payload });
      project = j.project; milestones = j.milestones || milestones; progress = j.progress || progress;
      toast('Cambios guardados');
    } catch (e) {
      saveError = e?.message || 'No se pudieron guardar los cambios.';
    } finally { saving = false; }
  }

  async function doDelete() {
    deleting = true;
    try {
      await api('/api/admin/projects/' + encodeURIComponent(project.id), { method: 'DELETE' });
      confirmOpen = false;
      toast(`Proyecto ${project.project_code} eliminado`);
      setSub([]);
    } catch (e) {
      toastError(e, 'No se pudo eliminar el proyecto.');
    } finally { deleting = false; }
  }

  const deleteMessage = $derived.by(() => {
    if (!project) return '';
    const n = Number(project.invoices_count) || 0;
    const inv = n === 0 ? 'No tiene facturas vinculadas.'
      : n === 1 ? 'Su factura queda sin proyecto (no se borra).'
      : `Sus ${n} facturas quedan sin proyecto (no se borran).`;
    return `Se borran ${project.project_code} y sus ${milestones.length} hitos. ${inv} Si solo se detuvo, mejor cámbialo a Cancelado y conservas el historial. No se puede deshacer.`;
  });
</script>

<a class="pd-back" href={backHref}><Icon name="back" size={16} />Proyectos</a>

<LoadingState {loading} rows={3} height={96}>
  {#if notFound}
    <div class="pd-gap"></div>
    <ErrorState title="No encontramos ese proyecto"
      message={`No hay ningún proyecto ${ref}. Puede que se haya borrado o que el enlace esté mal escrito.`} />
  {:else if error}
    <div class="pd-gap"></div>
    <ErrorState title="No se pudo abrir el proyecto" message={error} onretry={load} />
  {:else if project}
    <PageHeader title={project.name || 'Proyecto sin nombre'}>
      {#snippet badge()}<span class="pd-chip"><StatusChip tone={st.tone} label={st.label} /></span>{/snippet}
    </PageHeader>
    <div class="pd-meta">
      <span class="pd-mono" style={`background:${monoColor(project.client_name || project.name || project.project_code)}`} aria-hidden="true">{initials(project.client_name || project.name)}</span>
      <span class="pd-code">{project.project_code}</span>
      <span class="pd-dot" aria-hidden="true">·</span>
      <span>{project.client_name || 'Sin cliente'}</span>
      {#if project.service_type}<span class="pd-dot" aria-hidden="true">·</span><span>{serviceLabel(project.service_type)}</span>{/if}
      <span class="pd-dot" aria-hidden="true">·</span><span class="pd-money">{fmtMoney(project.agreed_amount_cents)}</span>
    </div>

    <div class="pd-grid">
      <div class="pd-main">
        <Card title="Avance">
          {#snippet actions()}<span class="pd-count">{progress ? progress.done : 0} de {progress ? progress.total : 0} hechos</span>{/snippet}
          <div class="pd-prog">
            <div class="pd-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent} aria-label="Avance del proyecto">
              <span style={`width:${Math.max(percent, percent ? 2 : 0)}%;background:${TONE_COLOR[barTone]}`}></span>
            </div>
            <span class="pd-pct" style={`color:${TONE_COLOR[barTone]}`}>{percent}%</span>
          </div>
          {#if milestones.length}<Stepper {milestones} />{/if}
        </Card>

        <Card title="Hitos">
          <MilestoneList projectId={project.id} {milestones} onchange={onMilestones} />
        </Card>
      </div>

      <aside class="pd-aside">
        <Card title="Datos del proyecto">
          <ProjectForm mode="edit" {project} busy={saving} serverError={saveError} formId="pd-form"
                       showSubmit onsubmit={save} />
        </Card>

        <Card title="Resumen">
          <dl class="pd-kv">
            <div><dt>Cliente</dt><dd>
              {#if project.client_id}<a href={href('clientes', [project.client_id])}>{project.client_name || 'Ver cliente'}</a>{:else}—{/if}
            </dd></div>
            <div><dt>Brief</dt><dd>
              {#if project.brief_project_id}<a href={href('briefs', [project.brief_project_id])}>{project.brief_project_id}</a>{:else}Sin brief{/if}
            </dd></div>
            <div><dt>Facturas</dt><dd>
              {#if Number(project.invoices_count)}<a href={href('finanzas', [], { proyecto: project.id })}>{project.invoices_count} vinculada{Number(project.invoices_count) === 1 ? '' : 's'}</a>{:else}Ninguna{/if}
            </dd></div>
            <div><dt>Inicio</dt><dd>{project.started_at ? fmtDay(project.started_at, DAY) : 'Aún no empieza'}</dd></div>
            {#if project.completed_at}<div><dt>Entregado</dt><dd>{fmtDay(project.completed_at, DAY)}</dd></div>{/if}
            <div><dt>Creado</dt><dd>{fmtDateTime(project.created_at)}</dd></div>
          </dl>
        </Card>

        <div class="pd-danger">
          <button type="button" class="b b--danger" onclick={() => (confirmOpen = true)}><Icon name="trash" size={16} />Eliminar proyecto</button>
          <p>Borra el proyecto y sus hitos. Para pararlo sin perder nada, cambia su estado a Cancelado.</p>
        </div>
      </aside>
    </div>

    <ConfirmDialog bind:open={confirmOpen} title="Eliminar {project.project_code}" confirmLabel="Eliminar proyecto"
      busy={deleting} message={deleteMessage} onconfirm={doDelete} />
  {/if}
</LoadingState>

<style>
  .pd-back {
    display: inline-flex; align-items: center; gap: 6px; margin-top: var(--space-4);
    min-height: 32px; padding: 4px 8px 4px 4px; margin-left: -4px; border-radius: var(--radius-sm);
    color: var(--fg-secondary); font-size: var(--dash-small); text-decoration: none;
  }
  .pd-back:hover { color: var(--fg-primary); background: var(--bg-elevated); }
  .pd-gap { height: var(--space-3); }
  .pd-chip { display: inline-flex; vertical-align: middle; margin-left: 12px; position: relative; top: -3px; }
  .pd-meta {
    display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px;
    margin: calc(-1 * var(--space-3)) 0 var(--space-5); font-size: var(--dash-small); color: var(--fg-secondary);
  }
  .pd-mono {
    width: 24px; height: 24px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
    border-radius: 7px; color: #fff; font-weight: 700; font-size: 10px; box-shadow: inset 0 1px 0 rgba(255,255,255,.18);
  }
  .pd-code { color: var(--fg-primary); font-weight: 600; font-variant-numeric: tabular-nums; }
  .pd-dot { color: var(--fg-subtle); }
  .pd-money { color: var(--accent-teal); font-weight: 600; font-variant-numeric: tabular-nums; }

  .pd-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: var(--space-5); align-items: start; }
  .pd-main, .pd-aside { display: flex; flex-direction: column; gap: var(--space-5); min-width: 0; }

  .pd-count { font-size: var(--dash-small); color: var(--fg-secondary); font-variant-numeric: tabular-nums; }
  .pd-prog { display: flex; align-items: center; gap: 12px; margin-bottom: var(--space-4); }
  .pd-bar { flex: 1; height: 8px; border-radius: var(--radius-pill); background: var(--bg-elevated); overflow: hidden; }
  .pd-bar span { display: block; height: 100%; border-radius: inherit; transition: width var(--duration-base) ease-out; }
  .pd-pct { font-size: var(--dash-body); font-weight: 600; font-variant-numeric: tabular-nums; min-width: 40px; text-align: right; }

  .pd-kv { margin: 0; display: flex; flex-direction: column; }
  .pd-kv > div { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border-subtle); }
  .pd-kv > div:last-child { border-bottom: 0; padding-bottom: 0; }
  .pd-kv > div:first-child { padding-top: 0; }
  .pd-kv dt { font-size: var(--dash-small); color: var(--fg-secondary); }
  .pd-kv dd { margin: 0; font-size: var(--dash-body); color: var(--fg-primary); text-align: right; min-width: 0; overflow-wrap: anywhere; }
  .pd-kv a { color: var(--fg-primary); text-decoration: none; border-bottom: 1px dashed var(--border-strong); }
  .pd-kv a:hover { border-bottom-color: var(--fg-secondary); }

  .pd-danger { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 0 4px; }
  .pd-danger p { margin: 0; font-size: var(--dash-caption); color: var(--fg-subtle); line-height: 1.45; }

  @media (max-width: 1100px) { .pd-grid { grid-template-columns: 1fr; } }
</style>
