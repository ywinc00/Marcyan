<script>
  // Zona de subida de un campo 'file' del esquema (logo, documentos, video).
  // Borde discontinuo, filas con miniatura y progreso, arrastrar y soltar en
  // escritorio, botón en el teléfono. Los topes del servidor se ven aquí.
  import FileRow from './FileRow.svelte';
  import Ico from './Ico.svelte';
  import { strings, pick } from './lib/strings.js';
  import { acceptFor } from './lib/uploads.svelte.js';
  import { fmtBytes } from './lib/sniff.js';
  import { FILE_TAG_DEFS } from '../../../lib/brief-schema.mjs';

  let { uploads, field, lang = 'es', idPrefix = 'bf', quota = true } = $props();
  const t = $derived(strings(lang));
  const id = $derived(`${idPrefix}-${field.key}`);
  const rows = $derived(uploads.files.filter((f) => f.field === field.key && !f.removed));
  const removed = $derived(uploads.removedCount(field.key));
  const kind = $derived(field.kind);
  const hint = $derived(kind === 'photo' ? t.photoHint : kind === 'logo' ? t.logoHint : kind === 'legal' ? t.legalHint : kind === 'video' ? t.videoHint : t.docHint);
  const btn = $derived(kind === 'logo' ? t.chooseLogo : kind === 'photo' ? t.choosePhotos : t.chooseFiles);
  const tagDef = $derived(kind === 'logo' ? { key: 'variant', label: t.variant, options: field.variants || [] }
    : kind === 'legal' ? { key: 'doc_type', label: t.docType, options: (FILE_TAG_DEFS.legal.find((d) => d.key === 'doc_type') || {}).options || [] }
    : null);
  let input = $state();
  let over = $state(false);

  function take(list) {
    if (!list || !list.length) return;
    uploads.add(list, { field: field.key, kind, maxFiles: field.maxFiles || 20 });
  }
  function onDrop(e) {
    e.preventDefault();
    over = false;
    take(e.dataTransfer && e.dataTransfer.files);
  }
</script>

<div class="fz" data-field={field.key}>
  <div class="fz__head">
    <span class="fz__label" id={`${id}-lbl`}>{pick(field.label, lang)}</span>
    {#if field.help}<span class="fz__help">{pick(field.help, lang)}</span>{/if}
  </div>
  <div
    class="fz__box"
    class:fz__box--over={over}
    role="group"
    aria-labelledby={`${id}-lbl`}
    ondragover={(e) => { e.preventDefault(); over = true; }}
    ondragleave={() => (over = false)}
    ondrop={onDrop}
  >
    {#if rows.length}
      <ul class="fz__list">
        {#each rows as row (row.id)}
          <FileRow {row} {uploads} {lang}>
            {#if tagDef && tagDef.options.length && (row.status === 'done' || row.fromServer || row.status === 'uploading' || row.status === 'queued')}
              <label class="fz__tag">
                <span>{tagDef.label}</span>
                <select
                  value={row.tags[tagDef.key] || ''}
                  disabled={row.fromServer}
                  onchange={(e) => uploads.setTag(row.id, tagDef.key, e.currentTarget.value || null)}
                >
                  <option value="">{t.pick}</option>
                  {#each tagDef.options as o (o.value)}<option value={o.value}>{pick(o.label, lang)}</option>{/each}
                </select>
              </label>
            {/if}
          </FileRow>
        {/each}
      </ul>
    {/if}
    <div class="fz__drop">
      <Ico name="upload" size={20} />
      <span class="fz__or">{t.dropOr}</span>
      <button type="button" class="fz__btn" onclick={() => input && input.click()} disabled={!!uploads.unavailable}>{btn}</button>
      <span class="fz__hint">{hint}</span>
    </div>
    <input
      bind:this={input}
      class="fz__input"
      type="file"
      multiple
      accept={acceptFor(kind)}
      tabindex="-1"
      aria-hidden="true"
      onchange={(e) => { take(e.currentTarget.files); e.currentTarget.value = ''; }}
    />
  </div>
  {#if removed}<p class="fz__removed" role="status">{t.removedNote(removed, uploads.purpose === 'kit')}</p>{/if}
  {#if uploads.unavailable}
    <p class="fz__off" role="status">{uploads.unavailable}</p>
  {:else if quota && uploads.active.length}
    <p class="fz__quota">{t.quota(uploads.active.length, fmtBytes(uploads.usedBytes, lang))}</p>
  {/if}
</div>

<style>
  .fz { display: grid; gap: var(--space-2); min-width: 0; }
  .fz__head { display: grid; gap: var(--space-1); }
  .fz__label { font-size: var(--text-base); font-weight: 600; color: var(--fg-primary); }
  .fz__help { font-size: var(--text-sm); color: var(--fg-secondary); line-height: var(--leading-normal); }
  .fz__box {
    display: grid; gap: var(--space-3); padding: var(--space-3);
    border: 1px dashed var(--border-accent); border-radius: var(--radius-lg); background: var(--bg-2);
    transition: border-color var(--duration-fast), background var(--duration-fast);
  }
  .fz__box--over { border-color: var(--accent-gold); background: var(--accent-gold-dim); }
  .fz__list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2); }
  .fz__drop { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); color: var(--fg-secondary); font-size: var(--text-sm); }
  .fz__or { display: none; }
  .fz__btn {
    min-height: var(--tap-min); padding: 0 var(--space-5); border-radius: var(--radius-md);
    background: transparent; border: 1px solid var(--border-accent); color: var(--fg-primary);
    font: 600 var(--text-sm) var(--font-body); cursor: pointer;
    transition: border-color var(--duration-fast), color var(--duration-fast);
  }
  .fz__btn:hover { border-color: var(--accent-gold); color: var(--accent-gold); }
  .fz__btn:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .fz__btn:disabled { opacity: .55; cursor: not-allowed; }
  .fz__hint { flex: 1 1 100%; font-size: var(--text-xs); color: var(--fg-secondary); }
  .fz__input { display: none; }
  .fz__quota { margin: 0; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--fg-secondary); }
  .fz__off, .fz__removed { margin: 0; font-size: var(--text-sm); color: var(--fg-secondary); line-height: var(--leading-normal); }
  .fz__tag { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-2); min-width: 0; font-size: var(--text-xs); color: var(--fg-secondary); }
  .fz__tag select {
    min-height: var(--tap-min); padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-base); color: var(--fg-primary); font: var(--text-base) var(--font-body); flex: 1 1 200px; min-width: 0; max-width: 100%;
  }
  .fz__tag select:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 1px; }
  @media (--sm) { .fz__box { padding: var(--space-4); } }
  @media (--hover-fine) {
    .fz__or { display: inline; }
    .fz__hint { flex: 0 1 auto; margin-left: auto; }
  }
  @media (--motion-reduce) { .fz__box, .fz__btn { transition: none; } }
</style>
