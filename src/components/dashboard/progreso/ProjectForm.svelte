<script>
  // Formulario del proyecto: el mismo para crear (modal) y para editar la
  // ficha (OP-04). Campos: nombre, cliente, brief, servicio, monto y estado.
  //   · Cliente: selector simple con los clientes existentes (CRM-05, OP-10);
  //     al crear, la opción "auto" usa el cliente del brief o, sin brief, la
  //     cuenta genérica "Directo" (lo dice tal cual).
  //   · Brief: código MRC con sugerencias; se avisa junto al campo si no
  //     existe (OP-09), y el servidor lo vuelve a comprobar.
  //   · Monto: acepta "1500", "1,500", "1.500" o "$1,500.50"; vacío = $0 (MOCK-06).
  // onsubmit(payload) recibe solo lo que hay que mandar (en edición, solo lo
  // que cambió). serverError = error del último guardado (se pinta arriba).
  import Field from '../ui/Field.svelte';
  import Icon from '../ui/Icon.svelte';
  import { opts, loadOptions, clientLabel } from './options.svelte.js';
  import {
    P_STATUSES, SERVICE_TYPES, serviceLabel, parseMoneyToCents, centsToInput,
  } from './format.js';

  let {
    mode = 'create', project = null, busy = false, serverError = '',
    formId = 'project-form', onsubmit, ondirty, showSubmit = false, submitLabel = 'Guardar cambios',
  } = $props();

  const AUTO = '__auto';

  // ── Estado del formulario ─────────────────────────────────────
  let f = $state(blank());
  let errors = $state({});
  let lastKey = '';

  function blank() {
    return { name: '', clientId: '', briefId: '', serviceType: '', amount: '', status: 'active' };
  }
  function fromProject(p) {
    return {
      name: p?.name || '',
      clientId: p?.client_id != null ? String(p.client_id) : '',
      briefId: p?.brief_project_id || '',
      serviceType: p?.service_type || '',
      amount: centsToInput(p?.agreed_amount_cents),
      status: p?.status || 'active',
    };
  }
  // Reinicia al abrir otro proyecto o tras guardar (cambia updated_at).
  $effect(() => {
    const key = mode === 'edit' ? `${project?.id}|${project?.updated_at}` : 'create';
    if (key !== lastKey) {
      lastKey = key;
      f = mode === 'edit' ? fromProject(project) : blank();
      errors = {};
    }
  });

  $effect(() => { loadOptions(); });

  const initial = $derived(mode === 'edit' ? fromProject(project) : blank());
  const dirty = $derived(Object.keys(f).some((k) => String(f[k] ?? '').trim() !== String(initial[k] ?? '').trim()));
  $effect(() => { ondirty?.(dirty); });

  // Opciones de servicio: catálogo + el valor actual si es uno antiguo.
  const serviceOptions = $derived.by(() => {
    const cur = (f.serviceType || '').trim();
    const known = SERVICE_TYPES.some((s) => s.id === cur.toLowerCase());
    return cur && !known ? [...SERVICE_TYPES, { id: cur, label: serviceLabel(cur) }] : SERVICE_TYPES;
  });
  // Cliente actual aunque no venga en la lista (más de 200 clientes, o archivado).
  const clientMissing = $derived(
    mode === 'edit' && project?.client_id != null && !opts.clients.some((c) => String(c.id) === String(project.client_id)),
  );
  const briefTyped = $derived((f.briefId || '').trim().toUpperCase());
  const briefMatch = $derived(opts.briefs.find((b) => b.project_id === briefTyped) || null);

  function validate() {
    const e = {};
    if (!f.name.trim()) e.name = 'Escribe el nombre del proyecto.';
    if (mode === 'create' && !f.clientId) e.clientId = 'Elige el cliente del proyecto.';
    if (mode === 'edit' && !f.clientId) e.clientId = 'El proyecto necesita un cliente.';
    if (briefTyped) {
      if (!/^MRC-\d{1,6}$/.test(briefTyped)) e.briefId = 'Escribe el código completo, por ejemplo MRC-017.';
      else if (opts.loaded && !briefMatch && briefTyped !== (project?.brief_project_id || '')) e.briefId = `No encontramos el brief ${briefTyped}. Revisa el código.`;
    }
    const m = parseMoneyToCents(f.amount);
    if (m.error) e.amount = m.error;
    errors = e;
    return { ok: !Object.keys(e).length, cents: m.cents ?? 0 };
  }

  function submit(ev) {
    ev?.preventDefault?.();
    if (busy) return;
    const v = validate();
    if (!v.ok) {
      // Foco al primer campo con error.
      queueMicrotask(() => document.querySelector(`#${formId} [aria-invalid="true"]`)?.focus());
      return;
    }
    if (mode === 'create') {
      const payload = {
        name: f.name.trim(),
        briefProjectId: briefTyped || null,
        serviceType: f.serviceType || null,
        agreedAmountCents: v.cents,
        status: f.status,
      };
      if (f.clientId !== AUTO) payload.clientId = f.clientId;
      onsubmit?.(payload);
      return;
    }
    // Edición: solo lo que cambió.
    const p = {};
    const ini = initial;
    if (f.name.trim() !== ini.name.trim()) p.name = f.name.trim();
    if (f.clientId !== ini.clientId) p.clientId = f.clientId;
    if (briefTyped !== (ini.briefId || '').toUpperCase()) p.briefProjectId = briefTyped || null;
    if ((f.serviceType || '') !== (ini.serviceType || '')) p.serviceType = f.serviceType || null;
    if (String(v.cents) !== String(Number(project?.agreed_amount_cents) || 0)) p.agreedAmountCents = v.cents;
    if (f.status !== ini.status) p.status = f.status;
    onsubmit?.(p);
  }

  /** Vuelve a los valores guardados (botón Descartar del padre). */
  export function reset() { f = mode === 'edit' ? fromProject(project) : blank(); errors = {}; }
</script>

<form id={formId} class="pf" novalidate onsubmit={submit}>
  {#if serverError}<p class="pf__server" role="alert"><Icon name="alert" size={16} />{serverError}</p>{/if}

  <Field label="Nombre del proyecto" required error={errors.name}>
    {#snippet children(fl)}
      <input class="ui-input" id={fl.id} aria-describedby={fl.describedby} aria-invalid={fl.invalid}
             type="text" maxlength="160" autocomplete="off" placeholder="Sitio web de la taquería"
             bind:value={f.name} />
    {/snippet}
  </Field>

  <Field label="Cliente" required error={errors.clientId}
         hint={opts.error ? '' : (mode === 'create' && f.clientId === AUTO ? (briefTyped ? 'Se usa el cliente que ya tenga ese brief o se crea con sus datos.' : 'El proyecto queda en la cuenta genérica "Directo" hasta que lo asignes.') : '')}>
    {#snippet children(fl)}
      <select class="ui-input pf__select" id={fl.id} aria-describedby={fl.describedby} aria-invalid={fl.invalid}
              bind:value={f.clientId} disabled={opts.loading && !opts.loaded}>
        <option value="" disabled>{opts.loading && !opts.loaded ? 'Cargando clientes…' : 'Elige un cliente'}</option>
        {#if clientMissing}<option value={String(project.client_id)}>{project.client_name || 'Cliente actual'}{project.client_code ? ' · ' + project.client_code : ''}</option>{/if}
        {#each opts.clients as c (c.id)}<option value={String(c.id)}>{clientLabel(c)}</option>{/each}
        {#if mode === 'create'}
          <option value={AUTO}>{briefTyped ? 'El cliente del brief ' + briefTyped : 'Sin cliente formal (cuenta Directo)'}</option>
        {/if}
      </select>
    {/snippet}
  </Field>
  {#if opts.error}
    <p class="pf__opts-err" role="alert">{opts.error} <button type="button" class="b b--mini" onclick={() => loadOptions({ force: true })}>Reintentar</button></p>
  {/if}

  <Field label="Brief vinculado" error={errors.briefId}
         hint={briefMatch ? (briefMatch.business_name || 'Brief encontrado') : (mode === 'edit' ? 'Opcional, por ejemplo MRC-017. Vacío lo desvincula.' : 'Opcional, por ejemplo MRC-017.')}>
    {#snippet children(fl)}
      <input class="ui-input pf__code" id={fl.id} aria-describedby={fl.describedby} aria-invalid={fl.invalid}
             type="text" autocomplete="off" spellcheck="false" placeholder="Sin brief vinculado" list={formId + '-briefs'}
             bind:value={f.briefId} />
      <datalist id={formId + '-briefs'}>
        {#each opts.briefs as b (b.project_id)}<option value={b.project_id}>{b.business_name || ''}</option>{/each}
      </datalist>
    {/snippet}
  </Field>

  <div class="pf__row">
    <Field label="Servicio">
      {#snippet children(fl)}
        <select class="ui-input pf__select" id={fl.id} bind:value={f.serviceType}>
          <option value="">Sin especificar</option>
          {#each serviceOptions as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
        </select>
      {/snippet}
    </Field>
    <Field label="Monto acordado (USD)" error={errors.amount} hint="Vacío = $0">
      {#snippet children(fl)}
        <div class="pf__money">
          <span class="pf__money-sym" aria-hidden="true">$</span>
          <input class="ui-input" id={fl.id} aria-describedby={fl.describedby} aria-invalid={fl.invalid}
                 type="text" inputmode="decimal" autocomplete="off" placeholder="1,500" bind:value={f.amount} />
        </div>
      {/snippet}
    </Field>
  </div>

  <Field label={mode === 'create' ? 'Estado inicial' : 'Estado'}>
    {#snippet children(fl)}
      <select class="ui-input pf__select" id={fl.id} bind:value={f.status}>
        {#each P_STATUSES as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
      </select>
    {/snippet}
  </Field>

  {#if showSubmit}
    <div class="pf__actions">
      {#if dirty}<button type="button" class="b b--ghost" onclick={reset} disabled={busy}>Descartar</button>{/if}
      <button type="submit" class="b b--primary" disabled={busy || !dirty}>{busy ? 'Guardando…' : submitLabel}</button>
    </div>
  {/if}
</form>

<style>
  .pf { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
  .pf__row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-3); }
  .pf__select { appearance: none; -webkit-appearance: none; padding-right: 32px; cursor: pointer;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b8b95' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>");
    background-repeat: no-repeat; background-position: right 11px center; }
  .pf__code { text-transform: uppercase; letter-spacing: .02em; }
  .pf__code::placeholder { text-transform: none; }
  .pf__money { position: relative; }
  .pf__money-sym { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--fg-subtle); font-size: var(--dash-body); pointer-events: none; }
  .pf__money :global(.ui-input) { padding-left: 24px; font-variant-numeric: tabular-nums; }
  .pf__server { display: flex; align-items: flex-start; gap: 8px; margin: 0; padding: 10px 12px; border-radius: var(--radius-md);
    background: rgba(var(--color-error-rgb), .1); border: 1px solid rgba(var(--color-error-rgb), .32); color: var(--fg-primary); font-size: var(--dash-small); line-height: 1.45; }
  .pf__server :global(.ui-icon) { color: var(--color-error); margin-top: 1px; flex: 0 0 auto; }
  .pf__opts-err { margin: -4px 0 0; font-size: var(--dash-caption); color: var(--color-error); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .pf__actions { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: 4px; }
  @media (max-width: 420px) { .pf__row { grid-template-columns: 1fr; } }
</style>
