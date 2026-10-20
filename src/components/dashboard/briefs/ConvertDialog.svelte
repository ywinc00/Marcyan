<script>
  // Brief → cliente (CRM-04) sin teclear IDs: crear un cliente nuevo con los
  // datos del brief o vincularlo a uno que ya existe buscándolo por nombre.
  // NOTA de integración: es una búsqueda mínima propia de Briefs. Al
  // integrar la ola 2 se sustituye por el ClientPicker de Clientes (A2).
  import { untrack } from 'svelte';
  import Modal from '../ui/Modal.svelte';
  import Icon from '../ui/Icon.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import { api } from '../lib/api.js';

  let { open = $bindable(false), pid, data = {}, onconverted } = $props();

  let mode = $state('new');          // 'new' | 'existing'
  let query = $state('');
  let results = $state([]);
  let searching = $state(false);
  let searchError = $state('');
  let searched = $state(false);
  let picked = $state(null);
  let busy = $state(false);
  let error = $state('');
  let timer;
  let seq = 0;

  $effect(() => {
    if (open) untrack(() => {
      mode = 'new'; picked = null; error = ''; busy = false; searchError = ''; searched = false;
      query = data.business_name || ''; results = [];
    });
  });

  async function search(q) {
    const my = ++seq;
    searching = true; searchError = '';
    try {
      const p = new URLSearchParams({ limit: '8' });
      if (q.trim()) p.set('search', q.trim());
      const j = await api('/api/admin/clients?' + p.toString());
      if (my !== seq) return;
      results = j.rows || []; searched = true;
      if (picked && !results.some((c) => String(c.id) === String(picked.id))) picked = null;
    } catch (e) { if (my === seq) searchError = e.message; }
    finally { if (my === seq) searching = false; }
  }
  function onQuery(e) {
    query = e.currentTarget.value;
    clearTimeout(timer);
    timer = setTimeout(() => search(query), 250);
  }
  function chooseExisting() { mode = 'existing'; error = ''; if (!searched) search(query); }

  async function confirm() {
    if (busy) return;
    if (mode === 'existing' && !picked) { error = 'Elige un cliente de la lista.'; return; }
    busy = true; error = '';
    try {
      const body = { action: 'convert_to_client', ...(mode === 'existing' ? { client_id: Number(picked.id) } : {}) };
      const j = await api('/api/admin/briefs/' + encodeURIComponent(pid), { method: 'POST', body });
      onconverted?.(j);
      open = false;
    } catch (e) { error = e.message; }
    finally { busy = false; }
  }
</script>

<Modal bind:open title="Convertir en cliente">
  <div class="modes" role="radiogroup" aria-label="Cómo convertir">
    <label class="mode" class:on={mode === 'new'}>
      <input type="radio" name="convert-mode" value="new" checked={mode === 'new'} onchange={() => { mode = 'new'; error = ''; }} />
      <span class="mode__t">Crear un cliente nuevo</span>
      <span class="mode__d">Con los datos de este brief.</span>
    </label>
    <label class="mode" class:on={mode === 'existing'}>
      <input type="radio" name="convert-mode" value="existing" checked={mode === 'existing'} onchange={chooseExisting} />
      <span class="mode__t">Vincular a un cliente que ya existe</span>
      <span class="mode__d">Por ejemplo, un cliente que pide un segundo proyecto.</span>
    </label>
  </div>

  {#if mode === 'new'}
    <dl class="preview">
      <div><dt>Negocio</dt><dd>{data.business_name || 'Sin nombre'}</dd></div>
      <div><dt>Propietario</dt><dd>{data.owner_name || 'Sin dato'}</dd></div>
      <div><dt>Correo</dt><dd>{data.email || 'Sin dato'}</dd></div>
      <div><dt>Teléfono</dt><dd>{data.phone || 'Sin dato'}</dd></div>
      <div><dt>Ciudad</dt><dd>{data.city_state || 'Sin dato'}</dd></div>
    </dl>
  {:else}
    <label class="ui-field">
      <span class="ui-field__label">Buscar cliente</span>
      <input class="ui-input" type="search" placeholder="Nombre, persona, correo, teléfono o CLI" value={query} oninput={onQuery} />
    </label>
    {#if searchError}
      <p class="err" role="alert">{searchError} <button type="button" class="b b--mini" onclick={() => search(query)}>Reintentar</button></p>
    {:else if searching && !results.length}
      <p class="soft" role="status">Buscando…</p>
    {:else if searched && !results.length}
      <p class="soft">Ningún cliente coincide con "{query}". Prueba con otro nombre o crea uno nuevo.</p>
    {:else if results.length}
      <!-- Lista de botones con aria-pressed (no listbox): cada cliente es un
           botón normal que se marca al elegirlo (revisión A3-10). -->
      <ul class="results" aria-label="Clientes encontrados">
        {#each results as c (c.id)}
          <li>
            <button type="button" class="res" aria-pressed={!!picked && String(picked.id) === String(c.id)} onclick={() => { picked = c; error = ''; }}>
              <span class="res__main">
                <span class="res__name">{c.business_name || 'Sin nombre'}</span>
                <span class="res__sub">{[c.client_code, c.owner_name, c.email || c.phone].filter(Boolean).join(' · ')}</span>
              </span>
              {#if c.status === 'archived'}<StatusChip tone="neutral" label="Archivado" />{/if}
              {#if picked && String(picked.id) === String(c.id)}<Icon name="check" size={18} />{/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
  {#if error}<p class="err" role="alert">{error}</p>{/if}

  {#snippet footer()}
    <button type="button" class="b" onclick={() => (open = false)} disabled={busy}>Cancelar</button>
    <button type="button" class="b b--primary" onclick={confirm} disabled={busy || (mode === 'existing' && !picked)}>
      <Icon name="user" size={16} />{busy ? 'Un momento…' : mode === 'new' ? 'Crear cliente' : 'Vincular'}
    </button>
  {/snippet}
</Modal>

<style>
  .modes { display: grid; gap: 8px; }
  .mode { display: grid; grid-template-columns: auto 1fr; column-gap: 10px; row-gap: 2px; align-items: center; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-elevated); cursor: pointer; transition: border-color var(--duration-fast); }
  .mode:hover { border-color: var(--border-strong); }
  .mode.on { border-color: var(--accent-gold-line); }
  .mode input { grid-row: span 2; width: 18px; height: 18px; accent-color: var(--accent-gold); }
  .mode__t { font-size: var(--dash-body); font-weight: 500; color: var(--fg-primary); }
  .mode__d { font-size: var(--dash-small); color: var(--fg-subtle); }
  .preview { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; padding: 12px 14px; border-radius: var(--radius-md); background: var(--bg-2); border: 1px solid var(--border-subtle); }
  .preview div { min-width: 0; }
  .preview dt { font-size: var(--dash-caption); color: var(--fg-subtle); }
  .preview dd { margin: 2px 0 0; font-size: var(--dash-small); color: var(--fg-primary); overflow-wrap: anywhere; }
  .results { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; max-height: 300px; overflow-y: auto; }
  .res { width: 100%; display: flex; align-items: center; gap: 10px; text-align: left; padding: 10px 12px; min-height: 52px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-elevated); color: inherit; font: inherit; cursor: pointer; }
  .res:hover { border-color: var(--border-strong); }
  .res[aria-pressed="true"] { border-color: var(--accent-teal-line); background: var(--accent-teal-dim); }
  .res[aria-pressed="true"] :global(.ui-icon) { color: var(--accent-teal); }
  .res__main { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .res__name { font-size: var(--dash-body); font-weight: 500; color: var(--fg-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .res__sub { font-size: var(--dash-caption); color: var(--fg-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .soft { margin: 0; font-size: var(--dash-small); color: var(--fg-subtle); }
  .err { margin: 0; font-size: var(--dash-small); color: var(--color-error); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  @media (max-width: 479px) { .preview { grid-template-columns: 1fr; } }
</style>
