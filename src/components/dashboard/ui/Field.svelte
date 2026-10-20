<script>
  // Campo con su etiqueta, ayuda y error junto al control. El control va
  // en el snippet y recibe { id, describedby, invalid } para enlazarlos:
  //   <Field label="Monto" error={err}>{#snippet children(f)}<input class="ui-input" id={f.id} … />{/snippet}</Field>
  let { label, hint = '', error = '', required = false, id = '', children } = $props();
  const uid = 'f-' + Math.random().toString(36).slice(2, 9);
  const fid = $derived(id || uid);
  const describedby = $derived([hint ? fid + '-hint' : '', error ? fid + '-err' : ''].filter(Boolean).join(' ') || undefined);
</script>

<div class="ui-field" class:has-error={!!error}>
  <label class="ui-field__label" for={fid}>{label}{#if required}<span class="ui-field__req" aria-hidden="true"> *</span>{/if}</label>
  {@render children({ id: fid, describedby, invalid: !!error })}
  {#if hint && !error}<p class="ui-field__hint" id={fid + '-hint'}>{hint}</p>{/if}
  {#if error}<p class="ui-field__error" id={fid + '-err'} role="alert">{error}</p>{/if}
</div>
