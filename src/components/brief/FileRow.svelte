<script>
  // Una fila de archivo: miniatura 34 px, nombre, barra de 3 px (oro subiendo,
  // teal listo), estado legible y acciones (cancelar, reintentar, quitar).
  // `children` (opcional) pinta las etiquetas propias de la fila.
  import Ico from './Ico.svelte';
  import { strings } from './lib/strings.js';
  import { fmtBytes } from './lib/sniff.js';

  let { row, uploads, lang = 'es', children } = $props();
  const t = $derived(strings(lang));
  const icon = $derived(row.kind === 'logo' ? 'pen' : row.kind === 'photo' ? 'image' : row.kind === 'video' ? 'video' : 'file');
  const moving = $derived(['checking', 'preparing', 'queued', 'uploading'].includes(row.status));
  const statusText = $derived(
    row.fromServer ? t.received
      : row.status === 'uploading' ? `${t.st.uploading} ${row.progress} %`
      : row.status === 'error' ? (row.error ? '' : t.st.error)
      : t.st[row.status] || ''
  );
  const detail = $derived(
    row.status === 'error' ? ''
      : row.convertedFrom && row.convertedFrom.includes('hei') ? t.converted
      : row.kind === 'photo' && row.status === 'done' && !row.fromServer ? t.reduced
      : ''
  );
</script>

<li class="fr" data-status={row.status} class:fr--err={row.status === 'error'}>
  <span class="fr__thumb">
    {#if row.thumb}<img src={row.thumb} alt="" width="34" height="34" />{:else}<Ico name={icon} size={18} />{/if}
  </span>
  <div class="fr__main">
    <div class="fr__top">
      <span class="fr__name" title={row.name}>{row.name}</span>
      <span class="fr__st" class:fr__st--ok={row.status === 'done'} aria-live="polite">
        {#if row.status === 'done'}<Ico name="check" size={14} />{/if}{statusText}
      </span>
    </div>
    {#if !row.fromServer && row.status !== 'error'}
      <span class="fr__bar" aria-hidden="true"><i style:width={`${row.status === 'done' ? 100 : row.progress}%`} class:ok={row.status === 'done'}></i></span>
    {/if}
    {#if row.status !== 'error'}
      <span class="fr__meta">{#if row.size}{fmtBytes(row.size, lang)}{/if}{#if detail}{row.size ? ' · ' : ''}{detail}{/if}</span>
    {/if}
  </div>
  <div class="fr__act">
    {#if moving}
      <button type="button" class="fr__btn" onclick={() => uploads.cancel(row.id)} aria-label={t.cancelName(row.name)} title={t.cancel}><Ico name="x" /></button>
    {/if}
    {#if (row.status === 'error' && row.retryable) || row.status === 'canceled'}
      <button type="button" class="fr__btn fr__btn--txt" onclick={() => uploads.retry(row.id)} aria-label={t.retryName(row.name)}><Ico name="retry" size={16} /><span>{t.retry}</span></button>
    {/if}
    {#if !moving && !row.fromServer}
      <button type="button" class="fr__btn" onclick={() => uploads.remove(row.id)} aria-label={t.removeName(row.name)} title={t.remove}><Ico name="trash" /></button>
    {/if}
  </div>
  {#if row.status === 'error' && row.error}<p class="fr__errmsg" role="alert">{row.error}</p>{/if}
  {#if children && row.status !== 'error'}<div class="fr__tags">{@render children()}</div>{/if}
</li>

<style>
  .fr {
    display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: var(--space-3); align-items: start;
    padding: var(--space-3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-card);
  }
  .fr--err { border-color: color-mix(in srgb, var(--color-error) 40%, var(--border)); }
  .fr__thumb {
    width: 34px; height: 34px; border-radius: 6px; overflow: hidden; display: grid; place-items: center;
    background: var(--bg-elevated); color: var(--fg-secondary); margin-top: 2px;
  }
  .fr__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .fr__main { display: grid; gap: 6px; min-width: 0; }
  .fr__top { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); min-width: 0; }
  .fr__name { font-size: var(--text-sm); color: var(--fg-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .fr__st { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--fg-secondary); }
  .fr__st--ok { color: var(--accent-teal); }
  .fr__bar { display: block; height: 3px; border-radius: 3px; background: var(--bg-elevated); overflow: hidden; }
  .fr__bar i { display: block; height: 100%; background: var(--accent-gold); transition: width var(--duration-base) linear; }
  .fr__bar i.ok { background: var(--accent-teal); }
  .fr__meta { font-size: var(--text-xs); color: var(--fg-secondary); line-height: var(--leading-normal); }
  .fr__errmsg { grid-column: 1 / -1; margin: 0; color: color-mix(in srgb, var(--color-error), white 22%); font-size: var(--text-sm); line-height: var(--leading-normal); }
  .fr--err .fr__top { min-height: 34px; align-items: center; }
  .fr__tags { grid-column: 1 / -1; display: grid; gap: var(--space-2); min-width: 0; }
  .fr__tags:empty { display: none; }
  .fr__act { display: flex; align-items: center; gap: 2px; }
  .fr__btn {
    display: inline-grid; place-items: center; min-width: var(--tap-min); min-height: var(--tap-min);
    margin: -6px -6px -6px 0; border-radius: var(--radius-md); background: transparent; color: var(--fg-secondary); cursor: pointer;
  }
  .fr__btn--txt { display: inline-flex; gap: 6px; padding: 0 var(--space-3); font: 600 var(--text-sm) var(--font-body); color: var(--fg-primary); }
  .fr__btn--txt span { display: none; }
  @media (--sm) { .fr__btn--txt span { display: inline; } }
  .fr__btn:hover { color: var(--accent-gold); background: var(--bg-elevated); }
  .fr__btn:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 0; }
  @media (--motion-reduce) { .fr__bar i { transition: none; } }
</style>
