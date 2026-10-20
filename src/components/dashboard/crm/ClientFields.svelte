<script>
  // Campos de contacto de un cliente (alta, ficha y conversión de un lead).
  // values es bindable; errors = { campo: 'mensaje' } que devuelve el servidor
  // (400 con fields): cada error sale junto a su campo.
  import Field from '../ui/Field.svelte';
  let { values = $bindable({}), errors = {}, notes = true, status = false, disabled = false, idPrefix = 'cf' } = $props();
</script>

<div class="cf-wrap"><div class="cf">
  <Field label="Negocio" error={errors.business_name} hint="Nombre del negocio, o de la persona si no tiene" id={idPrefix + '-biz'}>
    {#snippet children(f)}<input class="ui-input" id={f.id} aria-describedby={f.describedby} aria-invalid={f.invalid} bind:value={values.business_name} {disabled} autocomplete="organization" maxlength="200" />{/snippet}
  </Field>
  <Field label="Responsable" error={errors.owner_name} id={idPrefix + '-own'}>
    {#snippet children(f)}<input class="ui-input" id={f.id} aria-describedby={f.describedby} aria-invalid={f.invalid} bind:value={values.owner_name} {disabled} autocomplete="name" maxlength="200" />{/snippet}
  </Field>
  <Field label="Correo" error={errors.email} id={idPrefix + '-mail'}>
    {#snippet children(f)}<input class="ui-input" id={f.id} type="email" inputmode="email" aria-describedby={f.describedby} aria-invalid={f.invalid} bind:value={values.email} {disabled} autocomplete="email" maxlength="200" />{/snippet}
  </Field>
  <Field label="Teléfono" error={errors.phone} id={idPrefix + '-tel'}>
    {#snippet children(f)}<input class="ui-input" id={f.id} type="tel" inputmode="tel" aria-describedby={f.describedby} aria-invalid={f.invalid} bind:value={values.phone} {disabled} autocomplete="tel" maxlength="50" />{/snippet}
  </Field>
  <Field label="Ciudad" error={errors.city_state} id={idPrefix + '-city'}>
    {#snippet children(f)}<input class="ui-input" id={f.id} aria-describedby={f.describedby} aria-invalid={f.invalid} bind:value={values.city_state} {disabled} placeholder="Houston, TX" maxlength="200" />{/snippet}
  </Field>
  {#if status}
    <Field label="Estado" error={errors.status} id={idPrefix + '-st'}>
      {#snippet children(f)}
        <select class="ui-input sel" id={f.id} aria-describedby={f.describedby} bind:value={values.status} {disabled}>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
          {#if values.status === 'archived'}<option value="archived">Archivado</option>{/if}
        </select>
      {/snippet}
    </Field>
  {/if}
  {#if notes}
    <div class="cf__wide">
      <Field label="Notas internas" error={errors.notes} hint="Solo las ves tú" id={idPrefix + '-notes'}>
        {#snippet children(f)}<textarea class="ui-input" id={f.id} aria-describedby={f.describedby} rows="3" bind:value={values.notes} {disabled} maxlength="5000"></textarea>{/snippet}
      </Field>
    </div>
  {/if}
</div></div>

<style>
  .cf-wrap { container-type: inline-size; }
  .cf { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3) var(--space-4); }
  .cf__wide { grid-column: 1 / -1; }
  .cf :global(textarea.ui-input) { resize: vertical; min-height: 84px; line-height: 1.5; }
  .sel {
    appearance: none; -webkit-appearance: none; padding-right: 30px; cursor: pointer;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b8b95' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>");
    background-repeat: no-repeat; background-position: right 11px center;
  }
  @container (max-width: 480px) { .cf { grid-template-columns: minmax(0, 1fr); } }
</style>
