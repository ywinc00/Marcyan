<script>
  // ════════════════════════════════════════════════════════════════
  //  ShotUploads — pieza nueva "subida guiada por tomas" (Kit de arranque).
  //  Cada toma que necesitamos tiene su casilla, su subida y sus etiquetas:
  //  servicio, barrio, mes, propio o inspiración (y antes/después en la
  //  toma de pares). Así llega exactamente lo que hace falta para construir,
  //  con el contexto que en proyectos reales se perseguía por WhatsApp.
  // ════════════════════════════════════════════════════════════════
  import FileRow from './FileRow.svelte';
  import Ico from './Ico.svelte';
  import { strings, pick } from './lib/strings.js';
  import { acceptFor } from './lib/uploads.svelte.js';
  import { fmtBytes } from './lib/sniff.js';

  let { uploads, field, lang = 'es', quota = true } = $props();
  const t = $derived(strings(lang));
  const shots = $derived(field.shots || []);
  const inputs = $state({});
  const rowsFor = (shot) => uploads.files.filter((f) => f.field === field.key && !f.removed && ((f.tags && f.tags.shot) || 'other') === shot);
  const has = (shot) => rowsFor(shot).some((f) => f.status === 'done');
  const removed = $derived(uploads.removedCount(field.key));
  // Mes escrito en un formato que no entendemos: se avisa junto al campo y
  // se conserva lo último guardado (antes se borraba sin decir nada).
  const monthBad = $state({});
  function setMonth(id, raw) {
    const v = String(raw || '').trim();
    const m = parseMonth(v);
    if (v && !m) { monthBad[id] = true; return; }
    monthBad[id] = false;
    uploads.setTag(id, 'month', m);
  }

  // Mes de la foto: se escribe como 08/2026 (o 2026-08) y se guarda AAAA-MM.
  function parseMonth(v) {
    const s = String(v || '').trim();
    let m = /^(\d{1,2})\s*[/.-]\s*(\d{4})$/.exec(s);
    if (m && +m[1] >= 1 && +m[1] <= 12) return `${m[2]}-${String(m[1]).padStart(2, '0')}`;
    m = /^(\d{4})-(\d{1,2})$/.exec(s);
    if (m && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}-${String(m[2]).padStart(2, '0')}`;
    return null;
  }
  const showMonth = (v) => { const m = /^(\d{4})-(\d{2})$/.exec(v || ''); return m ? `${m[2]}/${m[1]}` : ''; };

  function take(shot, list) {
    if (!list || !list.length) return;
    uploads.add(list, { field: field.key, kind: 'photo', maxFiles: field.maxFiles || 50, tags: { shot } });
  }
</script>

<div class="shots" data-field={field.key}>
  <div class="shots__head">
    <span class="shots__label">{pick(field.label, lang)}</span>
    <span class="shots__help">{t.shotsIntro}</span>
  </div>
  <ul class="shots__list">
    {#each shots as s (s.value)}
      {@const rows = rowsFor(s.value)}
      {@const ok = has(s.value)}
      <li class="shot" class:shot--ok={ok}>
        <div class="shot__top">
          <span class="shot__box" aria-hidden="true">{#if ok}<Ico name="check" size={14} />{/if}</span>
          <span class="shot__name" id={`shot-${s.value}`}>{pick(s.label, lang)}</span>
          <button
            type="button"
            class="shot__btn"
            aria-describedby={`shot-${s.value}`}
            disabled={!!uploads.unavailable}
            onclick={() => inputs[s.value] && inputs[s.value].click()}
          >
            <Ico name="camera" size={16} />{rows.length ? t.shotMore : t.shotUpload}
          </button>
          <input
            bind:this={inputs[s.value]}
            class="shot__input"
            type="file"
            multiple
            accept={acceptFor('photo')}
            tabindex="-1"
            aria-hidden="true"
            onchange={(e) => { take(s.value, e.currentTarget.files); e.currentTarget.value = ''; }}
          />
        </div>
        {#if rows.length}
          <ul class="shot__rows">
            {#each rows as row (row.id)}
              <FileRow {row} {uploads} {lang}>
                {#if !row.fromServer}
                  <div class="tags">
                    <label class="tag"><span>{t.shotService}</span>
                      <input type="text" maxlength="120" value={row.tags.service || ''} onchange={(e) => uploads.setTag(row.id, 'service', e.currentTarget.value.trim())} />
                    </label>
                    <label class="tag"><span>{t.shotPlace}</span>
                      <input type="text" maxlength="120" value={row.tags.neighborhood || ''} onchange={(e) => uploads.setTag(row.id, 'neighborhood', e.currentTarget.value.trim())} />
                    </label>
                    <label class="tag"><span>{t.shotMonth}</span>
                      <input
                        type="text" inputmode="numeric" maxlength="7" placeholder="08/2026" value={showMonth(row.tags.month)}
                        aria-invalid={monthBad[row.id] ? 'true' : undefined}
                        aria-describedby={monthBad[row.id] ? `m-${row.id}` : undefined}
                        onchange={(e) => setMonth(row.id, e.currentTarget.value)}
                      />
                      {#if monthBad[row.id]}<span class="tag__err" id={`m-${row.id}`}>{t.shotMonthErr}</span>{/if}
                    </label>
                    <fieldset class="tag tag--set">
                      <legend>{t.shotOrigin}</legend>
                      <div class="seg">
                        {#each [['own', t.shotOwn], ['inspiration', t.shotInspo]] as [v, l] (v)}
                          <label class="seg__o"><input type="radio" name={`o-${row.id}`} checked={row.tags.origin === v} onchange={() => uploads.setTag(row.id, 'origin', v)} /><span>{l}</span></label>
                        {/each}
                      </div>
                    </fieldset>
                    {#if s.value === 'before_after'}
                      <fieldset class="tag tag--set">
                        <legend>{t.shotStage}</legend>
                        <div class="seg">
                          {#each [['before', t.shotBefore], ['after', t.shotAfter]] as [v, l] (v)}
                            <label class="seg__o"><input type="radio" name={`s-${row.id}`} checked={row.tags.stage === v} onchange={() => uploads.setTag(row.id, 'stage', v)} /><span>{l}</span></label>
                          {/each}
                        </div>
                      </fieldset>
                    {/if}
                  </div>
                {/if}
              </FileRow>
            {/each}
          </ul>
        {/if}
      </li>
    {/each}
  </ul>
  {#if removed}<p class="shots__off" role="status">{t.removedNote(removed)}</p>{/if}
  {#if uploads.unavailable}
    <p class="shots__off" role="status">{uploads.unavailable}</p>
  {:else if quota && uploads.active.length}
    <p class="shots__quota">{t.quota(uploads.active.length, fmtBytes(uploads.usedBytes, lang))}</p>
  {/if}
</div>

<style>
  .shots { display: grid; gap: var(--space-3); min-width: 0; }
  .shots__head { display: grid; gap: var(--space-1); }
  .shots__label { font-size: var(--text-base); font-weight: 600; color: var(--fg-primary); }
  .shots__help { font-size: var(--text-sm); color: var(--fg-secondary); line-height: var(--leading-normal); }
  .shots__list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2); }
  .shot { display: grid; gap: var(--space-3); padding: var(--space-3) var(--space-4); border: 1px dashed var(--border-accent); border-radius: var(--radius-md); background: var(--bg-2); }
  .shot--ok { border-style: solid; border-color: var(--accent-teal-line); }
  .shot__top { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
  .shot__box {
    flex: 0 0 auto; width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center;
    border: 1px solid var(--border); color: var(--accent-teal);
  }
  .shot--ok .shot__box { background: var(--accent-teal-dim); border-color: var(--accent-teal-line); }
  .shot__name { flex: 1 1 auto; min-width: 0; font-size: var(--text-sm); color: var(--fg-primary); line-height: var(--leading-snug); }
  .shot__btn {
    flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; min-height: var(--tap-min); padding: 0 var(--space-4);
    border: 1px solid var(--border-accent); border-radius: var(--radius-md); background: transparent;
    color: var(--fg-primary); font: 600 var(--text-sm) var(--font-body); cursor: pointer;
  }
  .shot__btn:hover { border-color: var(--accent-gold); color: var(--accent-gold); }
  .shot__btn:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .shot__btn:disabled { opacity: .55; cursor: not-allowed; }
  .shot__input { display: none; }
  .shot__rows { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2); }
  .tags { display: grid; grid-template-columns: 1fr; gap: var(--space-2); }
  .tag { display: grid; gap: 4px; min-width: 0; font-size: var(--text-xs); color: var(--fg-secondary); border: 0; padding: 0; margin: 0; }
  .tag input[type='text'] {
    width: 100%; min-width: 0; min-height: var(--tap-min); padding: 6px 10px; border-radius: var(--radius-sm);
    border: 1px solid var(--border); background: var(--bg-base); color: var(--fg-primary); font: var(--text-base) var(--font-body);
  }
  .tag input[aria-invalid='true'] { border-color: var(--color-error); }
  .tag__err { font-size: var(--text-xs); color: color-mix(in srgb, var(--color-error), white 22%); }
  .tag input:focus { outline: none; border-color: var(--accent-gold); box-shadow: 0 0 0 3px var(--accent-gold-dim); }
  .tag legend { padding: 0; margin-bottom: 4px; }
  .seg { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .seg__o {
    position: relative; display: inline-flex; align-items: center; min-height: var(--tap-min); padding: 0 var(--space-3);
    border: 1px solid var(--border); border-radius: var(--radius-pill); background: var(--bg-elevated);
    color: var(--fg-secondary); font-size: var(--text-sm); cursor: pointer;
  }
  .seg__o input { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
  .seg__o:has(input:checked) { border-color: var(--accent-gold); background: var(--accent-gold-dim); color: var(--fg-primary); }
  .seg__o:has(input:focus-visible) { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .shots__quota { margin: 0; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--fg-secondary); }
  .shots__off { margin: 0; font-size: var(--text-sm); color: var(--fg-secondary); line-height: var(--leading-normal); }
  @media (--sm) { .tags { grid-template-columns: 1fr 1fr; } }
  @media (--md) { .tags { grid-template-columns: 1fr 1fr 1fr; } }
  .tag--set { grid-column: 1 / -1; }
</style>
