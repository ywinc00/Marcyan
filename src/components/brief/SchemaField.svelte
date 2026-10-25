<script>
  // ════════════════════════════════════════════════════════════════
  //  SchemaField — pinta UN campo de lib/brief-schema.mjs (brief y kit).
  //  Tipos: text, textarea, email, tel, url, number, radio, select,
  //  checkbox (con o sin opciones), services, date-month, hours, zones y
  //  repeater (se llama a sí mismo para sus subcampos). Los campos 'file' los
  //  pinta el padre (FileZone / ShotUploads).
  //  Accesibilidad (B-14): etiqueta legible en tamaño normal, obligatorio
  //  marcado, ayuda y error ligados con aria-describedby, aria-invalid.
  //  Las opciones únicas que no son obligatorias se desmarcan con otro clic (B-19).
  // ════════════════════════════════════════════════════════════════
  import SchemaField from './SchemaField.svelte';
  import { strings, pick } from './lib/strings.js';
  import { DAYS } from '../../../lib/brief-schema.mjs';

  let { field, value = $bindable(), lang = 'es', errors = {}, path = field.key, idPrefix = 'bf', compact = false } = $props();

  const t = $derived(strings(lang));
  const id = $derived(`${idPrefix}-${path.replace(/\./g, '-')}`);
  const error = $derived(errors[path] ? pick(errors[path], lang) : '');
  const label = $derived(pick(field.label, lang));
  const help = $derived(field.help ? pick(field.help, lang) : '');
  const described = $derived([help && `${id}-help`, error && `${id}-err`].filter(Boolean).join(' ') || undefined);

  const AUTO = {
    business_name: 'organization', owner_name: 'name', email: 'email', phone: 'tel', city_state: 'address-level2',
    current_website: 'url', leads_email: 'email', public_email: 'email', public_phone: 'tel', address: 'street-address',
  };
  const INPUT_TYPE = { email: 'email', tel: 'tel', url: 'url', text: 'text' };
  const INPUT_MODE = { email: 'email', tel: 'tel', url: 'url', number: 'decimal' };

  // Opción única que se puede desmarcar si no es obligatoria.
  function pickOne(v) { value = value === v && !field.required ? null : v; }
  function toggleMany(v) {
    const arr = Array.isArray(value) ? [...value] : [];
    const i = arr.indexOf(v);
    if (i >= 0) arr.splice(i, 1); else arr.push(v);
    value = arr;
  }

  // date-month: dos selectores (Safari de escritorio no tiene <input type=month>).
  const MONTHS = {
    es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  };
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear + 2 - 1950 }, (_, i) => thisYear + 1 - i);
  const ym = $derived(/^(\d{4})-(\d{2})$/.exec(value || '') || [null, '', '']);
  let mPart = $state('');
  let yPart = $state('');
  $effect(() => { if (ym[1]) { yPart = ym[1]; mPart = ym[2]; } });
  function setMonth(y, m) {
    yPart = y; mPart = m;
    value = y && m ? `${y}-${m}` : null;
  }

  // hours / zones / repeater
  function ensureHours() {
    if (!value || typeof value !== 'object' || Array.isArray(value)) value = {};
    for (const d of DAYS) if (!value[d]) value[d] = { closed: false, open: '', close: '' };
  }
  const DAY_NAME = {
    es: { mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes', sat: 'Sábado', sun: 'Domingo' },
    en: { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' },
  };
  const maxItems = $derived((field.validation && field.validation.maxItems) || 20);
  function addRow(blank) {
    const arr = Array.isArray(value) ? value : [];
    if (arr.length >= maxItems) return;
    value = [...arr, blank];
  }
  function removeRow(i) { value = (Array.isArray(value) ? value : []).filter((_, j) => j !== i); }
  const blankRow = () => Object.fromEntries((field.item ? field.item.fields : []).map((s) => [s.key, s.type === 'checkbox' && s.options ? [] : (s.type === 'checkbox' ? false : '')]));

  $effect(() => {
    if (field.type === 'hours') ensureHours();
    if ((field.type === 'repeater' || field.type === 'zones') && (!Array.isArray(value) || value.length === 0)) {
      value = [field.type === 'zones' ? { place: '', zip: '', frequency: null } : blankRow()];
    }
  });
</script>

{#snippet head(forId)}
  <span class="sf__label">
    {#if forId}<label for={forId}>{label}</label>{:else}{label}{/if}
    {#if field.required}<span class="sf__req">{t.required}</span>{/if}
  </span>
  {#if help}<span class="sf__help" id={`${id}-help`}>{help}</span>{/if}
{/snippet}

{#snippet err()}
  {#if error}
    <p class="sf__err" id={`${id}-err`} role="alert">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5h.01" /></svg>
      {error}
    </p>
  {/if}
{/snippet}

{#if ['text', 'email', 'tel', 'url', 'number'].includes(field.type)}
  <div class="sf" class:sf--compact={compact} data-field={path}>
    {@render head(id)}
    <input
      {id}
      class="sf__in"
      type={INPUT_TYPE[field.type] || 'text'}
      inputmode={INPUT_MODE[field.type]}
      autocomplete={AUTO[field.key] || 'off'}
      maxlength={field.validation && field.validation.max ? field.validation.max : undefined}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={described}
      aria-required={field.required ? 'true' : undefined}
      value={value ?? ''}
      oninput={(e) => (value = e.currentTarget.value)}
    />
    {@render err()}
  </div>
{:else if field.type === 'textarea'}
  <div class="sf" class:sf--compact={compact} data-field={path}>
    {@render head(id)}
    <textarea
      {id}
      class="sf__in sf__ta"
      rows={compact ? 3 : 4}
      maxlength={field.validation && field.validation.max ? field.validation.max : undefined}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={described}
      aria-required={field.required ? 'true' : undefined}
      value={value ?? ''}
      oninput={(e) => (value = e.currentTarget.value)}
    ></textarea>
    {@render err()}
  </div>
{:else if field.type === 'select'}
  <div class="sf" class:sf--compact={compact} data-field={path}>
    {@render head(id)}
    <select
      {id}
      class="sf__in sf__sel"
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={described}
      value={value ?? ''}
      onchange={(e) => (value = e.currentTarget.value || null)}
    >
      <option value="">{t.pick}</option>
      {#each field.options as o (o.value)}<option value={o.value}>{pick(o.label, lang)}</option>{/each}
    </select>
    {@render err()}
  </div>
{:else if field.type === 'radio'}
  <fieldset class="sf sf--set" class:sf--compact={compact} data-field={path} data-invalid={error ? 'true' : undefined} aria-describedby={described}>
    <legend class="sf__legend">{@render head(null)}</legend>
    <div class="sf__pills" role="radiogroup" aria-invalid={error ? 'true' : undefined}>
      {#each field.options as o, i (o.value)}
        <label class="pill">
          <input
            type="radio"
            name={id}
            id={i === 0 ? id : undefined}
            value={o.value}
            checked={value === o.value}
            onclick={() => pickOne(o.value)}
            onchange={() => (value = o.value)}
          />
          <span>{pick(o.label, lang)}</span>
        </label>
      {/each}
    </div>
    {@render err()}
  </fieldset>
{:else if field.type === 'checkbox' && field.options}
  <fieldset class="sf sf--set" class:sf--compact={compact} data-field={path} aria-describedby={described}>
    <legend class="sf__legend">{@render head(null)}</legend>
    <div class="sf__checks">
      {#each field.options as o, i (o.value)}
        <label class="chk">
          <input type="checkbox" id={i === 0 ? id : undefined} checked={Array.isArray(value) && value.includes(o.value)} onchange={() => toggleMany(o.value)} />
          <span>{pick(o.label, lang)}</span>
        </label>
      {/each}
    </div>
    {@render err()}
  </fieldset>
{:else if field.type === 'checkbox'}
  <div class="sf" class:sf--compact={compact} data-field={path}>
    <label class="chk chk--solo">
      <input {id} type="checkbox" checked={value === true} onchange={(e) => (value = e.currentTarget.checked)} aria-describedby={described} />
      <span>{label}</span>
    </label>
    {#if help}<p class="sf__help" id={`${id}-help`}>{help}</p>{/if}
    {@render err()}
  </div>
{:else if field.type === 'services'}
  <fieldset class="sf sf--set" data-field={path} data-invalid={error ? 'true' : undefined} aria-describedby={described}>
    <legend class="sf__legend">{@render head(null)}</legend>
    <div class="svc">
      {#each field.options as o, i (o.value)}
        <label class="svc__opt">
          <input type="checkbox" id={i === 0 ? id : undefined} checked={Array.isArray(value) && value.includes(o.value)} onchange={() => toggleMany(o.value)} />
          <span class="svc__name">{pick(o.label, lang)}</span>
          {#if o.hint}<span class="svc__from">{pick(o.hint, lang)}</span>{/if}
          <svg class="svc__tick" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        </label>
      {/each}
    </div>
    {@render err()}
  </fieldset>
{:else if field.type === 'date-month'}
  <fieldset class="sf sf--set" class:sf--compact={compact} data-field={path} aria-describedby={described}>
    <legend class="sf__legend">{@render head(null)}</legend>
    <div class="sf__row2">
      <label class="sf__sub"><span>{t.month}</span>
        <select {id} class="sf__in sf__sel" value={mPart} onchange={(e) => setMonth(yPart, e.currentTarget.value)} aria-invalid={error ? 'true' : undefined}>
          <option value="">{t.pick}</option>
          {#each MONTHS[lang === 'en' ? 'en' : 'es'] as m, i}<option value={String(i + 1).padStart(2, '0')}>{m}</option>{/each}
        </select>
      </label>
      <label class="sf__sub"><span>{t.year}</span>
        <select class="sf__in sf__sel" value={yPart} onchange={(e) => setMonth(e.currentTarget.value, mPart)} aria-invalid={error ? 'true' : undefined}>
          <option value="">{t.pick}</option>
          {#each years as y}<option value={String(y)}>{y}</option>{/each}
        </select>
      </label>
    </div>
    {@render err()}
  </fieldset>
{:else if field.type === 'hours'}
  <fieldset class="sf sf--set" data-field={path} aria-describedby={described}>
    <legend class="sf__legend">{@render head(null)}</legend>
    {#if value && typeof value === 'object'}
      <div class="hrs">
        {#each DAYS as d (d)}
          {#if value[d]}
            <div class="hrs__row">
              <span class="hrs__day">{DAY_NAME[lang === 'en' ? 'en' : 'es'][d]}</span>
              <label class="chk chk--inline"><input type="checkbox" bind:checked={value[d].closed} /><span>{t.closed}</span></label>
              {#if !value[d].closed}
                <label class="sf__sub sf__sub--time"><span class="sr-only">{t.opens} {DAY_NAME[lang === 'en' ? 'en' : 'es'][d]}</span><input class="sf__in" type="time" bind:value={value[d].open} /></label>
                <span class="hrs__to" aria-hidden="true">·</span>
                <label class="sf__sub sf__sub--time"><span class="sr-only">{t.closes} {DAY_NAME[lang === 'en' ? 'en' : 'es'][d]}</span><input class="sf__in" type="time" bind:value={value[d].close} /></label>
              {/if}
            </div>
          {/if}
        {/each}
        <label class="sf__sub"><span>{t.hoursNote}</span><input class="sf__in" type="text" maxlength="300" bind:value={value.note} /></label>
      </div>
    {/if}
    {@render err()}
  </fieldset>
{:else if field.type === 'zones'}
  <fieldset class="sf sf--set" data-field={path} aria-describedby={described}>
    <legend class="sf__legend">{@render head(null)}</legend>
    {#if Array.isArray(value)}
      <div class="rep">
        {#each value as z, i (i)}
          <div class="rep__row rep__row--zone">
            <label class="sf__sub"><span>{t.zonePlace}</span><input class="sf__in" type="text" maxlength="120" bind:value={z.place} /></label>
            <label class="sf__sub"><span>{t.zoneZip}</span><input class="sf__in" type="text" inputmode="numeric" maxlength="60" bind:value={z.zip} /></label>
            <label class="sf__sub"><span>{t.zoneFreq}</span>
              <select class="sf__in sf__sel" value={z.frequency || ''} onchange={(e) => (z.frequency = e.currentTarget.value || null)}>
                <option value="">{t.pick}</option><option value="often">{t.zoneOften}</option><option value="sometimes">{t.zoneSometimes}</option>
              </select>
            </label>
            {#if value.length > 1}<button type="button" class="rep__rm" onclick={() => removeRow(i)}>{t.removeRow}</button>{/if}
          </div>
        {/each}
        {#if value.length < maxItems}
          <button type="button" class="rep__add" onclick={() => addRow({ place: '', zip: '', frequency: null })}>+ {t.addRow}</button>
        {/if}
      </div>
    {/if}
    {@render err()}
  </fieldset>
{:else if field.type === 'repeater'}
  <fieldset class="sf sf--set" data-field={path} aria-describedby={described}>
    <legend class="sf__legend">{@render head(null)}</legend>
    {#if Array.isArray(value)}
      <div class="rep">
        {#each value as row, i (i)}
          <div class="rep__row" class:rep__row--pair={field.key === 'brand_color_list'}>
            {#each field.item.fields as sub (sub.key)}
              <SchemaField field={sub} bind:value={row[sub.key]} {lang} {errors} path={`${path}.${i}.${sub.key}`} {idPrefix} compact />
            {/each}
            {#if value.length > 1}<button type="button" class="rep__rm" onclick={() => removeRow(i)}>{t.removeRow}</button>{/if}
          </div>
        {/each}
        {#if value.length < maxItems}
          <button type="button" class="rep__add" onclick={() => addRow(blankRow())}>+ {t.addRow}</button>
        {/if}
      </div>
    {/if}
    {@render err()}
  </fieldset>
{/if}

<style>
  .sf { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; border: 0; padding: 0; margin: 0; }
  .sf--set { gap: var(--space-3); }
  .sf__legend { padding: 0; margin: 0; width: 100%; display: flex; flex-direction: column; gap: var(--space-2); }
  .sf__label {
    display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-2);
    font-family: var(--font-body); font-size: var(--text-base); font-weight: 600; line-height: var(--leading-snug);
    color: var(--fg-primary);
  }
  .sf--compact .sf__label { font-size: var(--text-sm); }
  .sf__req {
    font-size: var(--text-xs); font-weight: 500; color: var(--accent-gold);
    border: 1px solid var(--accent-gold-line); border-radius: var(--radius-pill); padding: 1px 8px;
  }
  .sf__help { display: block; margin: 0; font-weight: 400; color: var(--fg-secondary); font-size: var(--text-sm); line-height: var(--leading-normal); }

  /* Campo hundido sobre la tarjeta: --bg-base con borde, 16 px (sin zoom de iOS), 44 px de alto. */
  .sf__in {
    width: 100%; min-width: 0; min-height: var(--tap-min);
    background: var(--bg-base); border: 1px solid var(--border); border-radius: var(--radius-md);
    color: var(--fg-primary); font-family: var(--font-body); font-size: var(--text-base);
    padding: 10px 14px; transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
  }
  .sf__ta { resize: vertical; min-height: 104px; line-height: var(--leading-normal); }
  .sf__sel { appearance: none; padding-right: 40px; cursor: pointer;
    background-image: linear-gradient(45deg, transparent 50%, var(--fg-secondary) 50%), linear-gradient(135deg, var(--fg-secondary) 50%, transparent 50%);
    background-position: calc(100% - 20px) 50%, calc(100% - 15px) 50%; background-size: 5px 5px; background-repeat: no-repeat; }
  .sf__in:hover { border-color: var(--border-accent); }
  .sf__in:focus { outline: none; border-color: var(--accent-gold); box-shadow: 0 0 0 3px var(--accent-gold-dim); }
  .sf__in[aria-invalid='true'] { border-color: var(--color-error); }
  .sf__in[aria-invalid='true']:focus { box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error) 22%, transparent); }

  .sf__err {
    display: flex; align-items: flex-start; gap: var(--space-2); margin: 0;
    color: color-mix(in srgb, var(--color-error), white 22%); font-size: var(--text-sm); line-height: var(--leading-normal);
  }
  .sf__err svg { flex: 0 0 auto; margin-top: 2px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; }

  /* Opciones únicas en píldora (como el formulario anterior) */
  .sf__pills { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .pill {
    position: relative; display: inline-flex; align-items: center; min-height: var(--tap-min);
    padding: var(--space-2) var(--space-4); border: 1px solid var(--border); border-radius: var(--radius-pill);
    background: var(--bg-elevated); color: var(--fg-secondary); font-size: var(--text-sm);
    cursor: pointer; transition: border-color var(--duration-fast), background var(--duration-fast), color var(--duration-fast);
  }
  .pill input { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
  .pill:hover { border-color: var(--border-accent); color: var(--fg-primary); }
  .pill:has(input:checked) { border-color: var(--accent-gold); background: var(--accent-gold-dim); color: var(--fg-primary); }
  .pill:has(input:focus-visible) { outline: 2px solid var(--accent-gold); outline-offset: 2px; }

  .sf__checks { display: grid; grid-template-columns: 1fr; gap: var(--space-2); }
  .chk {
    display: flex; align-items: center; gap: var(--space-3); min-height: var(--tap-min);
    padding: var(--space-2) var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-md);
    background: var(--bg-elevated); color: var(--fg-secondary); font-size: var(--text-sm); cursor: pointer;
    transition: border-color var(--duration-fast), background var(--duration-fast), color var(--duration-fast);
  }
  .chk input { flex: 0 0 auto; width: 18px; height: 18px; accent-color: var(--accent-gold); cursor: pointer; margin: 0; }
  .chk:hover { border-color: var(--border-accent); color: var(--fg-primary); }
  .chk:has(input:checked) { border-color: var(--accent-gold-line); background: var(--accent-gold-dim); color: var(--fg-primary); }
  .chk:has(input:focus-visible) { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .chk--solo { font-size: var(--text-base); color: var(--fg-primary); }
  .chk--inline { padding-block: 0; }

  /* Servicios: tarjetas seleccionables con su "desde" en mono */
  .svc { display: grid; grid-template-columns: 1fr; gap: var(--space-2); }
  .svc__opt {
    position: relative; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 2px var(--space-3);
    min-height: 60px; padding: var(--space-3) var(--space-4); padding-right: 44px;
    border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-elevated); cursor: pointer;
    transition: border-color var(--duration-fast), background var(--duration-fast);
  }
  .svc__opt input { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
  .svc__name { color: var(--fg-primary); font-weight: 600; font-size: var(--text-base); grid-column: 1; }
  .svc__from { grid-column: 1; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--fg-secondary); }
  .svc__tick { position: absolute; right: 14px; top: 50%; translate: 0 -50%; fill: none; stroke: var(--accent-gold); stroke-width: 2.25; stroke-linecap: round; stroke-linejoin: round; opacity: 0; transition: opacity var(--duration-fast); }
  .svc__opt:hover { border-color: var(--border-accent); }
  .svc__opt:has(input:checked) { border-color: var(--accent-gold); background: var(--accent-gold-dim); }
  .svc__opt:has(input:checked) .svc__from { color: var(--accent-gold); }
  .svc__opt:has(input:checked) .svc__tick { opacity: 1; }
  .svc__opt:has(input:focus-visible) { outline: 2px solid var(--accent-gold); outline-offset: 2px; }

  .sf__row2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
  .sf__sub { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; font-size: var(--text-sm); color: var(--fg-secondary); }

  .hrs { display: grid; gap: var(--space-2); }
  .hrs__row { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: var(--space-2); }
  .hrs__day { color: var(--fg-primary); font-size: var(--text-sm); font-weight: 600; }
  .hrs__to { display: none; }
  .sf__sub--time { grid-column: span 1; }

  .rep { display: grid; gap: var(--space-3); }
  .rep__row {
    display: grid; gap: var(--space-3); padding: var(--space-4);
    border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-2);
  }
  .rep__add, .rep__rm {
    justify-self: start; min-height: var(--tap-min); padding: 0 var(--space-4);
    border: 1px solid var(--border-accent); border-radius: var(--radius-md); background: transparent;
    color: var(--fg-primary); font: 600 var(--text-sm) var(--font-body); cursor: pointer;
  }
  .rep__rm { border-color: var(--border); color: var(--fg-secondary); }
  .rep__add:hover { border-color: var(--accent-gold); color: var(--accent-gold); }
  .rep__rm:hover { color: var(--fg-primary); border-color: var(--border-accent); }
  .rep__add:focus-visible, .rep__rm:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }

  @media (--sm) {
    .sf__checks { grid-template-columns: 1fr 1fr; }
    .svc { grid-template-columns: 1fr 1fr; }
    .rep__row--zone { grid-template-columns: minmax(0, 1.3fr) minmax(0, .8fr) minmax(0, 1.3fr); align-items: end; }
    .rep__row--zone .rep__rm { grid-column: 1 / -1; }
    /* Colores de marca: nombre y código en una línea, Quitar al final. */
    .rep__row--pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; align-items: end; }
  }
  @media (--md) {
    .hrs__row { grid-template-columns: 120px auto 1fr auto 1fr; }
    .hrs__to { display: inline; color: var(--fg-subtle); }
  }
  @media (--motion-reduce) {
    .sf__in, .pill, .chk, .svc__opt, .svc__tick { transition: none; }
  }
</style>
