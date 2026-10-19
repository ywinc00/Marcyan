<script>
  // Lista editable de hitos de un proyecto (OP-05, OP-25):
  //   · UN solo control de estado por hito (selector con forma de chip).
  //   · Renombrar en línea (clic en el nombre; Intro guarda, Escape cancela).
  //   · Fecha objetivo: poner, cambiar o quitar; vencida se marca en ámbar.
  //   · Reordenar con botones Subir/Bajar (teclado y táctil; sin arrastrar).
  //   · Borrar con confirmación que dice qué se pierde.
  //   · Añadir al final.
  // Cada cambio va a /api/admin/projects/:id/milestones; la respuesta trae la
  // lista y el avance actualizados y se los pasa al padre con onchange.
  // Errores siempre visibles (toast), nunca mudos (OP-27).
  import { tick } from 'svelte';
  import { api } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { fmtDay, dayISO, todayISO } from '../lib/dates.js';
  import Icon from '../ui/Icon.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import { M_STATUSES, mStatus, moveItem } from './format.js';

  let { projectId, milestones = [], onchange } = $props();

  const url = $derived('/api/admin/projects/' + encodeURIComponent(projectId) + '/milestones');

  let busyId = $state(null);          // hito con una escritura en curso
  let editLabel = $state(null);       // id del hito que se renombra
  let labelDraft = $state('');
  let editDate = $state(null);        // id del hito cuya fecha se edita
  let newLabel = $state('');
  let adding = $state(false);
  let addError = $state('');
  let toDelete = $state(null);
  let confirmOpen = $state(false);
  let deleting = $state(false);
  let listEl = $state(null);

  const today = todayISO();

  function apply(j) {
    onchange?.({ milestones: j.milestones || milestones, progress: j.progress || null });
  }

  async function patch(ms, body, fallback) {
    busyId = ms.id;
    try {
      const j = await api(url, { method: 'PATCH', body: { milestoneId: ms.id, ...body } });
      apply(j);
      return true;
    } catch (e) {
      toastError(e, fallback);
      return false;
    } finally { busyId = null; }
  }

  // ── Estado ────────────────────────────────────────────────
  async function setStatus(ms, status) {
    if (status === ms.status) return;
    const prev = milestones;
    // Optimista: el chip cambia ya; si falla, vuelve atrás con aviso.
    onchange?.({ milestones: milestones.map((m) => (m.id === ms.id ? { ...m, status } : m)), progress: null, optimistic: true });
    const ok = await patch(ms, { status }, 'No se pudo cambiar el estado del hito.');
    if (!ok) onchange?.({ milestones: prev, progress: null, optimistic: true });
  }

  // ── Nombre ────────────────────────────────────────────────
  async function startRename(ms) {
    editDate = null;
    editLabel = ms.id; labelDraft = ms.label;
    await tick();
    const el = listEl?.querySelector(`[data-rename="${ms.id}"]`);
    el?.focus(); el?.select();
  }
  async function commitRename(ms) {
    if (editLabel !== ms.id) return;
    const label = labelDraft.trim();
    if (!label || label === ms.label) { editLabel = null; return; }
    const ok = await patch(ms, { label }, 'No se pudo renombrar el hito.');
    if (ok) editLabel = null;
  }
  function renameKey(e, ms) {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(ms); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); editLabel = null; focusRow(ms.id, 'label'); }
  }

  // ── Fecha ─────────────────────────────────────────────────
  async function startDate(ms) {
    editLabel = null;
    editDate = ms.id;
    await tick();
    const el = listEl?.querySelector(`[data-date="${ms.id}"]`);
    el?.focus();
    try { el?.showPicker?.(); } catch (_) { /* algunos navegadores no lo permiten sin gesto: el campo ya tiene el foco */ }
  }
  async function saveDate(ms, value) {
    const v = value || '';
    if (v === dayISO(ms.due_date)) { editDate = null; return; }
    const ok = await patch(ms, { dueDate: v || null }, 'No se pudo guardar la fecha del hito.');
    if (ok) { editDate = null; toast(v ? 'Fecha guardada' : 'Fecha quitada'); }
  }
  function dateKey(e, ms) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); editDate = null; focusRow(ms.id, 'date'); }
    else if (e.key === 'Enter') { e.preventDefault(); saveDate(ms, e.currentTarget.value); }
  }

  // ── Orden ─────────────────────────────────────────────────
  async function move(i, dir) {
    // Durante otra escritura no se reordena (los botones siguen enfocables
    // para que el teclado no pierda el sitio).
    if (busyId != null) return;
    const j = i + dir;
    if (j < 0 || j >= milestones.length) return;
    const prev = milestones;
    const next = moveItem(milestones, i, j);
    const id = milestones[i].id;
    onchange?.({ milestones: next, progress: null, optimistic: true });
    await tick();
    // El foco sigue al hito movido (se puede seguir subiendo con el teclado).
    const btn = listEl?.querySelector(`[data-move="${id}:${dir < 0 ? 'up' : 'down'}"]`);
    if (btn && !btn.disabled) btn.focus(); else listEl?.querySelector(`[data-move="${id}:${dir < 0 ? 'down' : 'up'}"]`)?.focus();
    busyId = id;
    try {
      const r = await api(url, { method: 'PATCH', body: { order: next.map((m) => m.id) } });
      apply(r);
    } catch (e) {
      onchange?.({ milestones: prev, progress: null, optimistic: true });
      toastError(e, 'No se pudo cambiar el orden de los hitos.');
    } finally { busyId = null; }
  }

  // ── Borrar ────────────────────────────────────────────────
  function askDelete(ms) { toDelete = ms; confirmOpen = true; }
  async function doDelete() {
    if (!toDelete) return;
    deleting = true;
    try {
      const j = await api(url + '?milestoneId=' + encodeURIComponent(toDelete.id), { method: 'DELETE' });
      apply(j);
      toast('Hito borrado');
      confirmOpen = false;
    } catch (e) {
      toastError(e, 'No se pudo borrar el hito.');
    } finally { deleting = false; }
  }

  // ── Añadir ────────────────────────────────────────────────
  async function add(e) {
    e?.preventDefault?.();
    const label = newLabel.trim();
    if (!label) { addError = 'Escribe el nombre del hito.'; return; }
    adding = true; addError = '';
    try {
      const j = await api(url, { method: 'POST', body: { label } });
      apply(j);
      newLabel = '';
      toast('Hito añadido');
    } catch (err) {
      addError = err?.message || 'No se pudo añadir el hito.';
    } finally { adding = false; }
  }

  async function focusRow(id, what) {
    await tick();
    listEl?.querySelector(`[data-focus="${id}:${what}"]`)?.focus();
  }

  const overdue = (ms) => ms.due_date && ms.status !== 'done' && dayISO(ms.due_date) < today;
</script>

{#if milestones.length}
  <ol class="msl" bind:this={listEl}>
    {#each milestones as ms, i (ms.id)}
      {@const st = mStatus(ms.status)}
      <li class="msl__row" class:is-busy={busyId === ms.id} class:is-done={ms.status === 'done'}>
        <span class="msl__n" aria-hidden="true">{i + 1}</span>

        <label class="msl__status ui-chip ui-chip--{st.tone}">
          <span class="sr-only">Estado de {ms.label}</span>
          <select value={ms.status} disabled={busyId === ms.id} onchange={(e) => setStatus(ms, e.currentTarget.value)}>
            {#each M_STATUSES as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
          </select>
          <svg class="msl__caret" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </label>

        <div class="msl__label">
          {#if editLabel === ms.id}
            <input class="ui-input msl__rename" data-rename={ms.id} maxlength="120" aria-label="Nuevo nombre del hito"
                   bind:value={labelDraft} onkeydown={(e) => renameKey(e, ms)} onblur={() => commitRename(ms)} disabled={busyId === ms.id} />
          {:else}
            <button type="button" class="msl__name" data-focus="{ms.id}:label" title="Renombrar" onclick={() => startRename(ms)}>
              <span class="msl__name-txt">{ms.label}</span>
              <span class="msl__pencil"><Icon name="pencil" size={14} /></span>
            </button>
          {/if}
        </div>

        <div class="msl__due">
          {#if editDate === ms.id}
            <input class="ui-input msl__date" type="date" data-date={ms.id} value={dayISO(ms.due_date)} aria-label="Fecha objetivo de {ms.label}"
                   onchange={(e) => { if (e.currentTarget.value) saveDate(ms, e.currentTarget.value); }}
                   onkeydown={(e) => dateKey(e, ms)} onblur={() => setTimeout(() => { if (editDate === ms.id && busyId !== ms.id) editDate = null; }, 150)} />
            {#if ms.due_date}
              <button type="button" class="b b--mini b--ghost" onmousedown={(e) => e.preventDefault()} onclick={() => saveDate(ms, '')}>Quitar</button>
            {/if}
          {:else if ms.due_date}
            <button type="button" class="msl__date-btn" class:is-late={overdue(ms)} data-focus="{ms.id}:date" onclick={() => startDate(ms)}
                    title="Cambiar la fecha">
              <Icon name="calendar" size={14} />{overdue(ms) ? 'Venció ' : ''}{fmtDay(ms.due_date, { day: 'numeric', month: 'short' })}
            </button>
          {:else}
            <button type="button" class="msl__date-btn msl__date-btn--empty" data-focus="{ms.id}:date" onclick={() => startDate(ms)}>
              <Icon name="calendar" size={14} />Fecha
            </button>
          {/if}
        </div>

        <div class="msl__tools">
          <button type="button" class="ui-icon-btn ui-icon-btn--sm" data-move="{ms.id}:up" aria-label="Subir {ms.label}"
                  aria-disabled={busyId != null} disabled={i === 0} onclick={() => move(i, -1)}><Icon name="arrowUp" size={16} /></button>
          <button type="button" class="ui-icon-btn ui-icon-btn--sm" data-move="{ms.id}:down" aria-label="Bajar {ms.label}"
                  aria-disabled={busyId != null} disabled={i === milestones.length - 1} onclick={() => move(i, 1)}><Icon name="arrowDown" size={16} /></button>
          <button type="button" class="ui-icon-btn ui-icon-btn--sm msl__del" aria-label="Borrar {ms.label}"
                  disabled={busyId === ms.id} onclick={() => askDelete(ms)}><Icon name="trash" size={16} /></button>
        </div>
      </li>
    {/each}
  </ol>
{:else}
  <EmptyState compact title="Este proyecto no tiene hitos" text="Añade el primero para empezar a medir el avance." />
{/if}

<form class="msl__add" onsubmit={add} novalidate>
  <label class="sr-only" for="msl-new-{projectId}">Nombre del nuevo hito</label>
  <input id="msl-new-{projectId}" class="ui-input" type="text" maxlength="120" placeholder="Nuevo hito, por ejemplo Fotos del local"
         bind:value={newLabel} aria-invalid={!!addError} aria-describedby={addError ? 'msl-err-' + projectId : undefined}
         oninput={() => (addError = '')} />
  <button type="submit" class="b" disabled={adding}><Icon name="plus" size={16} />{adding ? 'Añadiendo…' : 'Añadir hito'}</button>
</form>
{#if addError}<p class="msl__err" id="msl-err-{projectId}" role="alert">{addError}</p>{/if}

<ConfirmDialog bind:open={confirmOpen} title="Borrar hito" confirmLabel="Borrar hito" busy={deleting}
  message={toDelete ? `Se borra «${toDelete.label}» y deja de contar en el avance del proyecto. No se puede deshacer.` : ''}
  onconfirm={doDelete} oncancel={() => (toDelete = null)} />

<style>
  .msl { list-style: none; margin: 0 0 var(--space-3); padding: 0; }
  .msl__row {
    display: grid; grid-template-columns: 22px auto minmax(0, 1fr) auto auto; align-items: center;
    gap: 10px; min-height: 52px; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);
    transition: opacity var(--duration-fast);
  }
  .msl__row:last-child { border-bottom: 0; }
  .msl__row.is-busy { opacity: .6; }
  .msl__n { font-size: var(--dash-caption); color: var(--fg-subtle); text-align: right; font-variant-numeric: tabular-nums; }

  /* Selector de estado con forma de chip: UN control (OP-25). */
  .msl__status { position: relative; padding: 0; cursor: pointer; }
  .msl__status select {
    appearance: none; -webkit-appearance: none; background: transparent; border: 0; color: inherit;
    font: inherit; font-size: var(--dash-caption); font-weight: 500; padding: 3px 26px 3px 10px; cursor: pointer;
    border-radius: var(--radius-pill); min-width: 92px;
  }
  .msl__status select:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .msl__status select option { color: var(--fg-primary); background: var(--bg-card); }
  .msl__caret { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); pointer-events: none; }

  .msl__label { min-width: 0; }
  .msl__name {
    display: inline-flex; align-items: center; gap: 6px; max-width: 100%; min-height: 32px;
    background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm);
    padding: 4px 6px; margin-left: -6px; color: var(--fg-primary); font: inherit; font-size: var(--dash-body); text-align: left; cursor: text;
  }
  .msl__name:hover { border-color: var(--border); background: var(--bg-elevated); }
  .msl__name-txt { min-width: 0; overflow-wrap: anywhere; }
  .is-done .msl__name-txt { color: var(--fg-secondary); }
  .msl__pencil { display: inline-flex; color: var(--fg-subtle); opacity: 0; transition: opacity var(--duration-fast); }
  .msl__name:hover .msl__pencil, .msl__name:focus-visible .msl__pencil { opacity: 1; }
  .msl__rename { min-height: 34px; padding: 5px 10px; }

  .msl__due { display: flex; align-items: center; gap: 6px; }
  .msl__date { min-height: 34px; padding: 4px 8px; width: 150px; color-scheme: dark; }
  .msl__date-btn {
    display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 4px 10px;
    background: transparent; border: 1px solid var(--border); border-radius: var(--radius-pill);
    color: var(--fg-secondary); font: inherit; font-size: var(--dash-caption); white-space: nowrap; cursor: pointer;
  }
  .msl__date-btn:hover { border-color: var(--border-strong); color: var(--fg-primary); background: var(--bg-elevated); }
  .msl__date-btn--empty { border-style: dashed; color: var(--fg-subtle); }
  .msl__date-btn.is-late { color: var(--color-warning); border-color: color-mix(in srgb, var(--color-warning) 40%, transparent); }

  .msl__tools { display: flex; align-items: center; gap: 2px; }
  .msl__tools :global(.ui-icon-btn:disabled) { opacity: .3; cursor: default; }
  .msl__tools :global(.ui-icon-btn:disabled:hover) { background: transparent; }
  .msl__del:hover:not(:disabled) { color: var(--color-error); }

  .msl__add { display: flex; gap: 8px; }
  .msl__add .ui-input { flex: 1; min-width: 0; }
  .msl__err { margin: 6px 0 0; font-size: var(--dash-caption); color: var(--color-error); }

  @media (pointer: coarse) { .msl__pencil { opacity: .7; } .msl__name, .msl__date-btn { min-height: 44px; } .msl__status select { min-height: 36px; } }

  /* Móvil: nombre arriba a lo ancho; estado, fecha y herramientas debajo. */
  @media (max-width: 600px) {
    .msl__row {
      grid-template-columns: 22px auto minmax(0, 1fr) auto;
      grid-template-areas: "n label label due" ". status tools tools";
      row-gap: 6px; padding: 10px 0;
    }
    .msl__n { grid-area: n; align-self: center; }
    .msl__label { grid-area: label; }
    .msl__status { grid-area: status; justify-self: start; }
    .msl__due { grid-area: due; justify-self: end; }
    .msl__tools { grid-area: tools; justify-self: end; }
    .msl__date { width: 124px; }
    /* Editando la fecha: ocupa el hueco de las herramientas en la 2.ª línea. */
    .msl__row:has(.msl__date) .msl__label { grid-column: 2 / -1; }
    .msl__due:has(.msl__date) { grid-column: 3 / -1; grid-row: 2; justify-self: end; }
    .msl__due:has(.msl__date) ~ .msl__tools { display: none; }
    .msl__add { flex-direction: column; }
  }
</style>
