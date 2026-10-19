<script>
  // ─────────────────────────────────────────────────────────────
  // Selector de cliente COMPARTIDO (A2; lo reutilizan Briefs, Finanzas y
  // Progreso): combobox con búsqueda, sin teclear IDs.
  //
  //   <ClientPicker bind:value label="Cliente" />
  //   <ClientPicker clientId={project.client_id} onchange={(c) => …} />
  //   <ClientPicker bind:value allowCreate oncreate={(texto) => abrirAlta(texto)} />
  //
  // Props:
  //   value       (bindable) cliente elegido { id, client_code, business_name,
  //               owner_name, email, phone, status } o null
  //   clientId    id inicial si solo se tiene el número: se completa con
  //               GET /api/admin/clients/:id?lite=1
  //   label, hint, error, required, disabled, placeholder
  //   includeArchived  (false) los archivados no se ofrecen
  //   allowCreate      muestra "Crear cliente «texto»" al final (llama a oncreate)
  //   onchange(client|null)
  // Datos: GET /api/admin/clients?search=<texto>&limit=8&active=1
  // Teclado: ↑ ↓ para moverse, Enter elige, Escape cierra. Patrón ARIA combobox.
  // ─────────────────────────────────────────────────────────────
  import { onDestroy, untrack } from 'svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import Icon from '../ui/Icon.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import { clientName, clientStatus } from './crm.js';

  let {
    value = $bindable(null), clientId = null, label = 'Cliente', hint = '', error = '',
    required = false, disabled = false, placeholder = 'Busca por negocio, persona, correo o código',
    includeArchived = false, allowCreate = false, oncreate, onchange, id = '',
  } = $props();

  const uid = id || 'cp-' + Math.random().toString(36).slice(2, 9);
  const listId = uid + '-list';
  let text = $state('');
  let open = $state(false);
  let loading = $state(false);
  let loadError = $state('');
  let results = $state([]);
  let active = $state(-1);
  let inputEl = $state(null);
  let timer = null;
  let seq = 0;

  // Hidratar desde clientId (solo número) una vez.
  $effect(() => {
    const cid = clientId;
    if (cid == null || cid === '' || untrack(() => value && String(value.id) === String(cid))) return;
    let alive = true;
    api('/api/admin/clients/' + encodeURIComponent(cid) + '?lite=1')
      .then((j) => { if (alive && j.client) value = j.client; })
      .catch((e) => { if (alive && !isSessionError(e)) loadError = errorMessage(e, 'No se pudo cargar el cliente.'); });
    return () => { alive = false; };
  });

  const options = $derived([
    ...results.map((c) => ({ kind: 'client', c })),
    ...(allowCreate && text.trim() ? [{ kind: 'create' }] : []),
  ]);

  async function search(q) {
    const my = ++seq;
    loading = true; loadError = '';
    try {
      const p = new URLSearchParams({ limit: '8' });
      if (q) p.set('search', q);
      if (!includeArchived) p.set('active', '1');
      const j = await api('/api/admin/clients?' + p.toString());
      if (my !== seq) return;
      results = j.rows || [];
      active = results.length ? 0 : (allowCreate && q ? 0 : -1);
    } catch (e) {
      if (my !== seq) return;
      results = [];
      loadError = isSessionError(e) ? '' : errorMessage(e, 'No se pudo buscar.');
    } finally {
      if (my === seq) loading = false;
    }
  }

  function onInput(e) {
    text = e.currentTarget.value;
    open = true;
    clearTimeout(timer);
    timer = setTimeout(() => search(text.trim()), 220);
  }
  function onFocus() {
    if (!open) { open = true; search(text.trim()); }
  }
  function close() { open = false; active = -1; }
  function choose(opt) {
    if (!opt) return;
    if (opt.kind === 'create') { const t = text.trim(); close(); oncreate?.(t); return; }
    value = opt.c;
    text = '';
    close();
    onchange?.(opt.c);
  }
  function clear() {
    value = null;
    onchange?.(null);
    queueMicrotask(() => inputEl?.focus());
  }
  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) { open = true; search(text.trim()); return; } active = Math.min(options.length - 1, active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); }
    else if (e.key === 'Enter') { if (open && active >= 0) { e.preventDefault(); choose(options[active]); } }
    else if (e.key === 'Escape') { if (open) { e.preventDefault(); e.stopPropagation(); close(); } }
  }
  function onBlur(e) {
    // Cerrar al salir del componente (no al pulsar una opción).
    const to = e.relatedTarget;
    if (to && e.currentTarget.closest('.cp')?.contains(to)) return;
    setTimeout(close, 120);
  }
  onDestroy(() => clearTimeout(timer));
</script>

<div class="ui-field cp" class:has-error={!!error}>
  <label class="ui-field__label" for={uid}>{label}{#if required}<span class="ui-field__req" aria-hidden="true"> *</span>{/if}</label>

  {#if value}
    <div class="cp__chosen">
      <div class="cp__who">
        <span class="cp__name">{clientName(value)}</span>
        <span class="cp__sub">{value.client_code}{value.email ? ' · ' + value.email : value.phone ? ' · ' + value.phone : ''}</span>
      </div>
      {#if value.status && value.status !== 'active'}<StatusChip tone="neutral" label={clientStatus(value.status).label} />{/if}
      {#if !disabled}<button type="button" class="b b--mini" onclick={clear} aria-label={'Cambiar el cliente ' + clientName(value)}>Cambiar</button>{/if}
    </div>
  {:else}
    <div class="cp__box">
      <span class="cp__icon"><Icon name="search" size={16} /></span>
      <input
        bind:this={inputEl}
        id={uid}
        class="ui-input cp__input"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${uid}-opt-${active}` : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? uid + '-err' : hint ? uid + '-hint' : undefined}
        {placeholder}
        {disabled}
        value={text}
        oninput={onInput}
        onfocus={onFocus}
        onkeydown={onKey}
        onblur={onBlur}
      />
      {#if open}
        <ul class="cp__list" id={listId} role="listbox" aria-label="Clientes">
          {#if loading && !results.length}
            <li class="cp__msg" role="presentation">Buscando…</li>
          {:else if loadError}
            <li class="cp__msg cp__msg--err" role="presentation">
              {loadError}
              <button type="button" class="b b--mini" onmousedown={(e) => e.preventDefault()} onclick={() => search(text.trim())}>Reintentar</button>
            </li>
          {:else if !results.length && !(allowCreate && text.trim())}
            <li class="cp__msg" role="presentation">{text.trim() ? `Ningún cliente coincide con «${text.trim()}».` : 'Aún no hay clientes.'}</li>
          {/if}
          {#each options as opt, i (opt.kind === 'client' ? opt.c.id : 'create')}
            <li id={`${uid}-opt-${i}`} role="option" aria-selected={i === active} class="cp__opt" class:is-active={i === active}
              onmousedown={(e) => e.preventDefault()} onclick={() => choose(opt)} onmousemove={() => (active = i)}>
              {#if opt.kind === 'client'}
                <span class="cp__name">{clientName(opt.c)}</span>
                <span class="cp__sub">{opt.c.client_code}{opt.c.email ? ' · ' + opt.c.email : opt.c.phone ? ' · ' + opt.c.phone : ''}{opt.c.status && opt.c.status !== 'active' ? ' · ' + clientStatus(opt.c.status).label : ''}</span>
              {:else}
                <span class="cp__name">Crear cliente «{text.trim()}»</span>
                <span class="cp__sub">Alta nueva con este nombre</span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}

  {#if hint && !error}<p class="ui-field__hint" id={uid + '-hint'}>{hint}</p>{/if}
  {#if error}<p class="ui-field__error" id={uid + '-err'} role="alert">{error}</p>{/if}
</div>

<style>
  .cp { position: relative; }
  .cp__box { position: relative; }
  .cp__icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); display: inline-flex; color: var(--fg-subtle); pointer-events: none; }
  .cp__input { padding-left: 34px; }
  .cp__list {
    position: absolute; z-index: 20; left: 0; right: 0; top: calc(100% + 4px);
    margin: 0; padding: 4px; list-style: none;
    max-height: 288px; overflow-y: auto;
    background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: var(--radius-md);
    box-shadow: var(--shadow-modal);
  }
  .cp__opt { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: var(--radius-sm); cursor: pointer; min-height: 44px; justify-content: center; }
  .cp__opt.is-active { background: var(--bg-elevated); outline: 1px solid var(--border-strong); }
  .cp__name { color: var(--fg-primary); font-size: var(--dash-body); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cp__sub { color: var(--fg-subtle); font-size: var(--dash-caption); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cp__msg { padding: 10px; font-size: var(--dash-small); color: var(--fg-secondary); display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
  .cp__msg--err { color: var(--fg-primary); }
  .cp__chosen {
    display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;
    min-height: 38px; padding: 6px 6px 6px 12px;
    background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md);
  }
  .cp__who { flex: 1 1 160px; min-width: 0; display: flex; flex-direction: column; }
</style>
