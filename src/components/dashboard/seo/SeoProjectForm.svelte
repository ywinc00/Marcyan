<script>
  // Alta y edición de un proyecto SEO en el modal del panel.
  // SEO-16: los identificadores de Google se validan al salir del campo y al
  // guardar (las mismas reglas que el servidor, lib/seo-core.mjs), con el
  // error junto al campo. SEO-06: si cambia una propiedad, se avisa de que
  // se borran los datos guardados de esa fuente y el botón lo dice.
  import Modal from '../ui/Modal.svelte';
  import Field from '../ui/Field.svelte';
  import { api, ApiError } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { validateProjectFields, sameField } from '../../../../lib/seo-core.mjs';

  let {
    open = $bindable(false),
    project = null,        // null = alta; objeto = edición
    configured = true,
    onsaved,               // (project, { cleared, created, syncNow }) => void
  } = $props();

  const isEdit = $derived(Boolean(project));
  const blank = () => ({ name: '', client_name: '', domain: '', ga4_property_id: '', gsc_site_url: '', active: true });
  let form = $state(blank());
  let errors = $state({});
  let touched = $state({});
  let saving = $state(false);

  // Rellenar al abrir.
  $effect(() => {
    if (!open) return;
    const p = project;
    form = p ? {
      name: p.name || '', client_name: p.client_name || '', domain: p.domain || '',
      ga4_property_id: p.ga4_property_id || '', gsc_site_url: p.gsc_site_url || '', active: p.active !== false,
    } : blank();
    errors = {}; touched = {};
  });

  const norm = (v) => String(v ?? '').trim();
  // A6-R7: se compara normalizado en los dos lados, igual que el servidor:
  // 'https://www.x.com' guardado y 'https://www.x.com/' son la misma propiedad.
  const gscChanged = $derived(isEdit && !sameField('gsc_site_url', form.gsc_site_url, project?.gsc_site_url));
  const ga4Changed = $derived(isEdit && !sameField('ga4_property_id', form.ga4_property_id, project?.ga4_property_id));
  const hadGsc = $derived(isEdit && Boolean(project?.gsc_site_url));
  const hadGa4 = $derived(isEdit && Boolean(project?.ga4_property_id));
  const willHaveIds = $derived(Boolean(norm(form.gsc_site_url) || norm(form.ga4_property_id)));
  // Traer datos al guardar: alta con identificadores, o edición que los cambia.
  const syncAfter = $derived(configured && willHaveIds && (!isEdit || gscChanged || ga4Changed));
  const submitLabel = $derived(saving ? 'Guardando…' : isEdit ? (syncAfter ? 'Guardar y actualizar datos' : 'Guardar cambios') : (syncAfter ? 'Crear y traer datos' : 'Crear proyecto'));

  function validateField(k) {
    touched[k] = true;
    const v = validateProjectFields({ [k]: form[k] }, { partial: true });
    errors = { ...errors, [k]: v.errors[k] || '' };
    // Se enseña el valor normalizado (barra final, minúsculas…).
    if (!v.errors[k] && k in v.values && typeof v.values[k] === 'string') form[k] = v.values[k];
  }

  async function submit(e) {
    e?.preventDefault?.();
    const v = validateProjectFields(form, { partial: false });
    errors = v.errors;
    if (!v.ok) return;
    saving = true;
    try {
      const body = { ...v.values, active: form.active };
      let res;
      if (isEdit) {
        // A6-R7: en la edición solo viajan los campos que cambiaron de verdad;
        // un identificador antiguo sin tocar no se reescribe ni borra datos.
        const changed = {};
        for (const k of Object.keys(body)) {
          if (k === 'active') { if (body.active !== (project.active !== false)) changed.active = body.active; continue; }
          if (!sameField(k, body[k], project[k])) changed[k] = body[k];
        }
        res = await api('/api/admin/seo/projects/' + encodeURIComponent(project.id), { method: 'PATCH', body: changed });
      } else {
        res = await api('/api/admin/seo/projects', { method: 'POST', body });
      }
      const cleared = res.cleared || [];
      open = false;
      toast(isEdit ? (cleared.length ? 'Guardado. Se borraron los datos de la propiedad anterior.' : 'Proyecto guardado.') : 'Proyecto creado.');
      onsaved?.(res.project, { cleared, created: !isEdit, syncNow: syncAfter });
    } catch (err) {
      if (err instanceof ApiError && err.data && err.data.fields) errors = err.data.fields;
      else toastError(err, 'No se pudo guardar el proyecto.');
    } finally { saving = false; }
  }
</script>

<Modal bind:open title={isEdit ? 'Editar proyecto de SEO' : 'Nuevo proyecto de SEO'}>
  <form id="seo-project-form" class="pf" onsubmit={submit} novalidate>
    <Field label="Nombre del proyecto" required error={errors.name}>
      {#snippet children(f)}
        <input class="ui-input" id={f.id} aria-describedby={f.describedby} aria-invalid={f.invalid} bind:value={form.name}
          placeholder="Sitio principal" autocomplete="off" onblur={() => validateField('name')} />
      {/snippet}
    </Field>
    <div class="pf__row">
      <Field label="Cliente" error={errors.client_name}>
        {#snippet children(f)}
          <input class="ui-input" id={f.id} aria-describedby={f.describedby} aria-invalid={f.invalid} bind:value={form.client_name} placeholder="Opcional" autocomplete="off" />
        {/snippet}
      </Field>
      <Field label="Dominio" error={errors.domain} hint="Ejemplo: tudominio.com">
        {#snippet children(f)}
          <input class="ui-input" id={f.id} aria-describedby={f.describedby} aria-invalid={f.invalid} bind:value={form.domain}
            placeholder="tudominio.com" autocomplete="off" spellcheck="false" onblur={() => validateField('domain')} />
        {/snippet}
      </Field>
    </div>
    <Field label="Propiedad de Search Console" error={errors.gsc_site_url}
      hint={gscChanged && hadGsc ? 'Al guardar se borran los datos guardados de la propiedad anterior (Search Console e indexación).' : 'Tal como aparece en Search Console: sc-domain:tudominio.com (dominio) o https://www.tudominio.com/ (prefijo).'}>
      {#snippet children(f)}
        <input class="ui-input" id={f.id} aria-describedby={f.describedby} aria-invalid={f.invalid} bind:value={form.gsc_site_url}
          placeholder="sc-domain:tudominio.com" autocomplete="off" spellcheck="false" onblur={() => validateField('gsc_site_url')} />
      {/snippet}
    </Field>
    <Field label="ID de propiedad de Analytics" error={errors.ga4_property_id}
      hint={ga4Changed && hadGa4 ? 'Al guardar se borran los datos guardados de la propiedad anterior de Analytics.' : 'Solo números. Está en Analytics, Administrar, Detalles de la propiedad. No es el ID que empieza por G-.'}>
      {#snippet children(f)}
        <input class="ui-input" id={f.id} aria-describedby={f.describedby} aria-invalid={f.invalid} bind:value={form.ga4_property_id}
          placeholder="412345678" inputmode="numeric" autocomplete="off" spellcheck="false" onblur={() => validateField('ga4_property_id')} />
      {/snippet}
    </Field>
    {#if isEdit}
      <label class="pf__check">
        <input type="checkbox" bind:checked={form.active} />
        <span>Incluir en la sincronización automática de cada madrugada</span>
      </label>
    {/if}
  </form>
  {#snippet footer()}
    <button type="button" class="b" onclick={() => (open = false)} disabled={saving}>Cancelar</button>
    <button type="submit" form="seo-project-form" class="b b--primary" disabled={saving}>{submitLabel}</button>
  {/snippet}
</Modal>

<style>
  .pf { display: flex; flex-direction: column; gap: var(--space-4); }
  .pf__row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
  .pf__check { display: flex; align-items: center; gap: 10px; font-size: var(--dash-small); color: var(--fg-secondary); cursor: pointer; min-height: 36px; }
  .pf__check input { accent-color: var(--accent-gold); width: 16px; height: 16px; flex: 0 0 auto; }
  @media (max-width: 560px) { .pf__row { grid-template-columns: 1fr; } }
</style>
