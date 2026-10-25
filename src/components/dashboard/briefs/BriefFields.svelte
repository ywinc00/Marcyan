<script>
  // Secciones del brief (lectura o edición) generadas desde el esquema único.
  // En edición cada campo usa el control de su tipo (B-22): las opciones se
  // eligen de su lista y un valor antiguo fuera de la lista se conserva como
  // "respuesta libre" para no perderlo.
  import Field from '../ui/Field.svelte';
  import { fieldOptions, valueText, valuePills } from './brief-panel.js';

  let { sections = [], edit = false, draft = $bindable({}), errors = {} } = $props();

  function extraOptions(row) {
    const known = new Set(fieldOptions(row.fd).map((o) => o.value));
    const v = draft[row.key];
    if (Array.isArray(v)) return v.filter((x) => !known.has(x));
    return v && !known.has(v) ? [v] : [];
  }
  function toggle(key, value) {
    const cur = Array.isArray(draft[key]) ? draft[key] : [];
    draft[key] = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
  }
  const inputType = (t) => ({ email: 'email', tel: 'tel', url: 'url', 'date-month': 'month' })[t] || 'text';
</script>

{#each sections as s (s.key)}
  <section class="ui-card sec" aria-labelledby="sec-{s.key}">
    <h2 class="sec__title" id="sec-{s.key}">{s.title}</h2>
    <svelte:element this={edit ? 'div' : 'dl'} class="grid">
      {#each s.rows as row (row.key)}
        <div class="cell" class:span={row.span}>
          {#if edit && row.editable}
            {#if row.fd.type === 'services' || (row.fd.type === 'checkbox' && row.fd.options)}
              <fieldset class="ui-field pills-field">
                <legend class="ui-field__label">{row.label}</legend>
                <div class="pills" role="group">
                  {#each fieldOptions(row.fd) as o (o.value)}
                    <button type="button" class="opt" aria-pressed={(draft[row.key] || []).includes(o.value)} onclick={() => toggle(row.key, o.value)}>{o.label}</button>
                  {/each}
                  {#each extraOptions(row) as x (x)}
                    <button type="button" class="opt opt--free" aria-pressed="true" title="Respuesta libre que ya tenía el brief" onclick={() => toggle(row.key, x)}>{x}</button>
                  {/each}
                </div>
                {#if errors[row.key]}<p class="ui-field__error" role="alert">{errors[row.key]}</p>{/if}
              </fieldset>
            {:else}
              <Field label={row.label} error={errors[row.key] || ''}>
                {#snippet children(f)}
                  {#if row.fd.type === 'textarea'}
                    <textarea class="ui-input area" id={f.id} rows="3" aria-describedby={f.describedby} aria-invalid={f.invalid} bind:value={draft[row.key]}></textarea>
                  {:else if row.fd.type === 'radio' || row.fd.type === 'select'}
                    <select class="ui-input" id={f.id} aria-describedby={f.describedby} aria-invalid={f.invalid} bind:value={draft[row.key]}>
                      <option value="">Sin respuesta</option>
                      {#each fieldOptions(row.fd) as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
                      {#each extraOptions(row) as x (x)}<option value={x}>{x} (respuesta libre)</option>{/each}
                    </select>
                  {:else if row.fd.type === 'checkbox'}
                    <label class="check" for={f.id}><input id={f.id} type="checkbox" bind:checked={draft[row.key]} /> Sí</label>
                  {:else if row.fd.type === 'number'}
                    <input class="ui-input" id={f.id} type="text" inputmode="decimal" aria-describedby={f.describedby} aria-invalid={f.invalid} bind:value={draft[row.key]} />
                  {:else}
                    <input class="ui-input" id={f.id} type={inputType(row.fd.type)} aria-describedby={f.describedby} aria-invalid={f.invalid} bind:value={draft[row.key]} />
                  {/if}
                {/snippet}
              </Field>
            {/if}
          {:else}
            <svelte:element this={edit ? 'p' : 'dt'} class="lbl">{row.label}</svelte:element>
            <svelte:element this={edit ? 'div' : 'dd'} class="val">
              {#if row.value === null}
                <span class="none">Sin dato</span>
              {:else if row.pills}
                <span class="tags">{#each valuePills(row.fd, row.value) as t, i (i)}<span class="tag">{t}</span>{/each}</span>
              {:else}
                <span class="txt" class:pre={row.span}>{valueText(row.fd, row.value)}</span>
              {/if}
              {#if edit && !row.editable}<span class="ro">Lo completa el cliente en el kit de arranque.</span>{/if}
            </svelte:element>
          {/if}
        </div>
      {/each}
    </svelte:element>
  </section>
{/each}

<style>
  .sec { margin-bottom: 14px; }
  .sec__title { margin: 0 0 var(--space-4); font-size: var(--dash-card-title); font-weight: 600; color: var(--fg-primary); letter-spacing: -0.01em; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4) var(--space-5); margin: 0; }
  .cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .cell.span { grid-column: 1 / -1; }
  .lbl { margin: 0; font-size: var(--dash-small); font-weight: 500; color: var(--fg-subtle); }
  .val { margin: 0; font-size: var(--dash-body); color: var(--fg-primary); line-height: 1.5; overflow-wrap: anywhere; }
  .txt.pre { white-space: pre-wrap; }
  .none { color: var(--fg-subtle); }
  .ro { display: block; margin-top: 4px; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .tags { display: flex; flex-wrap: wrap; gap: 5px; }
  .tag { padding: 2px 9px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-pill); font-size: var(--dash-caption); color: var(--fg-secondary); }
  .area { resize: vertical; min-height: 76px; line-height: 1.5; }

  .pills-field { border: 0; margin: 0; padding: 0; min-width: 0; }
  .pills-field legend { padding: 0; margin-bottom: 6px; }
  .pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .opt {
    min-height: 32px; padding: 5px 11px; border-radius: var(--radius-pill);
    border: 1px solid var(--border); background: var(--bg-elevated); color: var(--fg-secondary);
    font-family: var(--font-body); font-size: var(--dash-small); cursor: pointer;
    transition: border-color var(--duration-fast), color var(--duration-fast), background-color var(--duration-fast);
  }
  .opt:hover { border-color: var(--border-strong); color: var(--fg-primary); }
  .opt[aria-pressed="true"] { border-color: var(--accent-teal-line); background: var(--accent-teal-dim); color: var(--fg-primary); }
  .opt--free { font-style: italic; }
  @media (pointer: coarse) { .opt { min-height: var(--tap-min); } }
  .check { display: inline-flex; align-items: center; gap: 8px; min-height: 38px; font-size: var(--dash-body); color: var(--fg-primary); cursor: pointer; }
  .check input { width: 18px; height: 18px; accent-color: var(--accent-gold); }
  @media (max-width: 719px) {
    .sec { padding: 16px; }
    .grid { grid-template-columns: 1fr; gap: var(--space-3); }
  }
</style>
