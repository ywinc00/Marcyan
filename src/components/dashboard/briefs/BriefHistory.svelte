<script>
  // Historial del brief + notas internas (CRM-18). Cada evento dice qué pasó
  // en llano; las ediciones enseñan el valor anterior y el nuevo (CRM-09) y
  // los correos y notas se pueden releer.
  import { untrack } from 'svelte';
  import { api } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { fmtDateTime } from '../lib/dates.js';
  import Icon from '../ui/Icon.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import { describeEvent } from './brief-panel.js';

  let { pid } = $props();

  const NOTE_MAX = 2000;
  let events = $state([]);
  let loading = $state(true);
  let error = $state('');
  let note = $state('');
  let saving = $state(false);

  export async function reload() {
    error = '';
    try {
      const j = await api('/api/admin/briefs/' + encodeURIComponent(pid) + '/events');
      events = j.events || [];
    } catch (e) { error = e.message; }
    finally { loading = false; }
  }
  $effect(() => { if (pid) untrack(reload); });

  async function addNote(e) {
    e?.preventDefault();
    const text = note.trim();
    if (!text || saving) return;
    saving = true;
    try {
      const j = await api('/api/admin/briefs/' + encodeURIComponent(pid) + '/events', { method: 'POST', body: { type: 'note', text } });
      note = '';
      if (j.event) events = [j.event, ...events]; else await reload();
      toast('Nota guardada');
    } catch (err) { toastError(err, 'No se pudo guardar la nota.'); }
    finally { saving = false; }
  }
  function onKey(e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(e); }
</script>

<section class="ui-card hist" aria-labelledby="hist-title">
  <h2 class="hist__title" id="hist-title">Historial y notas</h2>

  <form class="note" onsubmit={addNote}>
    <label class="sr-only" for="brief-note">Nota interna</label>
    <textarea id="brief-note" class="ui-input note__input" rows="2" maxlength={NOTE_MAX}
      placeholder="Apunta una llamada, un acuerdo o un seguimiento" bind:value={note} onkeydown={onKey}></textarea>
    <div class="note__foot">
      <span class="note__hint">{note.length > NOTE_MAX - 200 ? `${NOTE_MAX - note.length} caracteres disponibles` : 'Solo la ve el equipo.'}</span>
      <button class="b b--mini" type="submit" disabled={!note.trim() || saving}><Icon name="note" size={14} />{saving ? 'Guardando…' : 'Guardar nota'}</button>
    </div>
  </form>

  {#if error}
    <ErrorState title="No se pudo cargar el historial" message={error} onretry={reload} compact />
  {:else if loading}
    <LoadingState loading={true} rows={3} height={44} label="Cargando historial" />
  {:else if !events.length}
    <EmptyState compact text="Todavía no hay actividad registrada en este brief." />
  {:else}
    <ol class="evs">
      {#each events as ev (ev.id)}
        {@const d = describeEvent(ev)}
        <li class="ev" class:ev--note={d.kind === 'note'}>
          <span class="ev__dot" aria-hidden="true"></span>
          <div class="ev__body">
            <p class="ev__t">{d.title}</p>
            {#if d.detail}<p class="ev__d">{d.detail}</p>{/if}
            {#if d.kind === 'note' && d.body}<p class="ev__text">{d.body}</p>{/if}
            {#if d.kind === 'edit' && d.changes?.length}
              <details class="ev__more">
                <summary>Ver cambios</summary>
                <ul class="chg">
                  {#each d.changes as c, i (i)}
                    <li><span class="chg__k">{c.label}</span><span class="chg__v"><s>{c.from}</s> → {c.to}</span></li>
                  {/each}
                </ul>
              </details>
            {/if}
            {#if d.kind === 'email' && d.body}
              <details class="ev__more"><summary>Ver mensaje</summary><p class="ev__text">{d.body}</p></details>
            {/if}
            <p class="ev__m">{ev.actor_email || 'Sistema'} · {fmtDateTime(ev.created_at)}</p>
          </div>
        </li>
      {/each}
    </ol>
  {/if}
</section>

<style>
  .hist__title { margin: 0 0 var(--space-3); font-size: var(--dash-card-title); font-weight: 600; color: var(--fg-primary); letter-spacing: -0.01em; }
  .note { display: flex; flex-direction: column; gap: 8px; margin-bottom: var(--space-4); padding-bottom: var(--space-4); border-bottom: 1px solid var(--border-subtle); }
  .note__input { resize: vertical; min-height: 60px; line-height: 1.5; }
  .note__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .note__hint { font-size: var(--dash-caption); color: var(--fg-subtle); }

  .evs { list-style: none; margin: 0; padding: 0; }
  .ev { display: flex; gap: 11px; padding: 10px 0; border-bottom: 1px solid var(--border-subtle); }
  .ev:last-child { border-bottom: 0; padding-bottom: 0; }
  .ev__dot { flex-shrink: 0; width: 7px; height: 7px; margin-top: 6px; border-radius: 999px; background: var(--fg-subtle); }
  .ev--note .ev__dot { background: var(--accent-teal); }
  .ev__body { min-width: 0; flex: 1; }
  .ev__t { margin: 0; font-size: var(--dash-small); font-weight: 600; color: var(--fg-primary); }
  .ev__d { margin: 2px 0 0; font-size: var(--dash-small); color: var(--fg-secondary); overflow-wrap: anywhere; }
  .ev__text { margin: 6px 0 0; padding: 8px 10px; border-radius: var(--radius-md); background: var(--bg-elevated); font-size: var(--dash-small); line-height: 1.5; color: var(--fg-primary); white-space: pre-wrap; overflow-wrap: anywhere; }
  .ev__m { margin: 4px 0 0; font-size: var(--dash-caption); color: var(--fg-subtle); overflow-wrap: anywhere; }
  .ev__more { margin-top: 4px; }
  .ev__more summary { cursor: pointer; font-size: var(--dash-caption); color: var(--fg-secondary); width: fit-content; }
  .ev__more summary:hover { color: var(--fg-primary); }
  .chg { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .chg li { display: flex; flex-direction: column; font-size: var(--dash-caption); line-height: 1.45; }
  .chg__k { color: var(--fg-subtle); }
  .chg__v { color: var(--fg-primary); overflow-wrap: anywhere; }
  .chg__v s { color: var(--fg-subtle); }
</style>
