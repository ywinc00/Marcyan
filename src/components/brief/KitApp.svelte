<script>
  // ════════════════════════════════════════════════════════════════
  //  KitApp — "Kit de arranque" privado (segundo momento del brief).
  //  /es/kit/<token> y /en/kit/<token> (en local también ?t=<token>).
  //
  //  · GET /api/kit/:token precarga lo que ya sabemos y lo guardado antes.
  //  · Lista de bloques (secciones del momento 'arranque') con estado
  //    (listo, a medias, pendiente, opcional) y progreso total. Si el brief
  //    no traía preguntas del brief corto (chat o formulario anterior), van
  //    primero en el bloque "Lo que nos falta de tu brief" (revisión R1).
  //  · Cada bloque abre su panel; se guarda por bloque (POST action 'save')
  //    y al final se envía todo (action 'submit').
  //  · Fotos por tomas guiadas (ShotUploads); el resto de archivos en su zona.
  //  · Enlace caducado o kit ya enviado: mensaje claro + llamar o WhatsApp.
  //  · El bloque abierto vive en la URL (#b-<bloque>): recargar y Atrás
  //    vuelven al mismo sitio.
  // ════════════════════════════════════════════════════════════════
  import { onMount, tick, untrack } from 'svelte';
  import SchemaField from './SchemaField.svelte';
  import FileZone from './FileZone.svelte';
  import ShotUploads from './ShotUploads.svelte';
  import Btn from './Btn.svelte';
  import Exits from './Exits.svelte';
  import Ico from './Ico.svelte';
  import { strings, pick } from './lib/strings.js';
  import { Uploads } from './lib/uploads.svelte.js';
  import { kitTokenFrom, kitBlocks, blockStatus, errorsForBlock, validateKit, blockData, visibleFields, shotsDone, SHOTS_TOTAL } from './lib/kit.js';
  import { loadKitLocal, saveKitLocal, clearKitLocal } from './lib/persist.js';
  import { fmtBytes } from './lib/sniff.js';

  let { lang = 'es', phone = '+1 713-823-9144' } = $props();
  const t = $derived(strings(lang));

  let phase = $state('loading');     // loading | ready | invalid | done | error | sent | notoken
  let loadError = $state('');
  let token = '';
  let meta = $state(null);
  let data = $state({});
  let saved = $state(new Set());
  let open = $state(null);            // clave del bloque, 'review' o null
  let errors = $state({});
  let saveState = $state('');
  let saveNote = $state('');
  let saveError = $state('');
  let sendState = $state('');
  let sendError = $state('');
  let uploads = $state(null);
  let panel = $state();

  const services = $derived(meta && Array.isArray(meta.services) ? meta.services : []);
  const blocks = $derived(meta ? kitBlocks(services, meta.sections, meta.catchup) : []);
  const files = $derived(uploads ? uploads.files : []);
  const statuses = $derived(Object.fromEntries(blocks.map((b) => [b.key, blockStatus(b, data, files, saved)])));
  const doneCount = $derived(blocks.filter((b) => statuses[b.key] && statuses[b.key].status === 'done').length);
  const current = $derived(blocks.find((b) => b.key === open) || null);
  const missing = $derived.by(() => {
    if (!meta) return [];
    const v = validateKit(collectAll(), services, false, blocks);
    const keys = new Set(Object.keys(v.errors).map((k) => k.split('.')[0]));
    return blocks.filter((b) => b.fields.some((f) => keys.has(f.key)));
  });

  function collectAll() {
    const out = {};
    for (const b of blocks) Object.assign(out, blockData(b, data));
    return out;
  }

  async function persistLocal() {
    if (!token) return;
    await saveKitLocal(token, { draft: uploads && uploads.draft ? $state.snapshot(uploads.draft) : null, saved: [...saved] });
  }

  // ── Guardado silencioso al salir de un bloque con cambios ──
  // Lo guardado por última vez de cada bloque (para saber si hay cambios).
  const lastSaved = {};
  // Sin los vacíos que crea la interfaz (filas en blanco): solo cuenta lo escrito.
  const snap = (b) => JSON.stringify(Object.entries(blockData(b, $state.snapshot(data)))
    .filter(([, v]) => !(v === null || v === '' || v === false || (Array.isArray(v) && !v.length))));
  function markSaved(b) { lastSaved[b.key] = snap(b); }
  async function saveQuietly(b) {
    if (!b || phase !== 'ready' || lastSaved[b.key] === snap(b)) return;
    const v = validateKit(data, services, true, blocks);
    if (Object.keys(errorsForBlock(b, v.errors)).length) return; // con errores no se guarda a ciegas
    try {
      // Con una subida en curso se guarda solo el texto, sin la lista de
      // archivos: una foto que termina mientras viaja este guardado no puede
      // darse por descartada en el servidor (DM-02). La lista va en el
      // siguiente guardado o en el envío.
      const { res, json } = await post('save', blockData(b, data), { withFiles: !(uploads && uploads.busy) });
      if (res.ok && json && json.ok) { markSaved(b); saved = new Set([...saved, b.key]); persistLocal(); }
    } catch { console.warn('[kit] no se pudo guardar el bloque al salir; queda en pantalla hasta guardarlo'); }
  }

  // ── Navegación entre lista y bloques (con la URL) ──────────
  async function openBlock(key, { push = true } = {}) {
    if (current && current.key !== key && saveState !== 'sending') saveQuietly(current);
    open = key;
    errors = {}; saveError = ''; saveNote = '';
    if (push) { try { history.pushState({ b: key }, '', key ? `#b-${key}` : location.pathname + location.search); } catch { /* nada */ } }
    await tick();
    if (panel && key) {
      const h = panel.querySelector('[data-block-title]');
      if (h) h.focus({ preventScroll: true });
      panel.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  }
  function readHash() {
    const m = /^#b-([a-z_]+)$/.exec(location.hash);
    if (!m) return null;
    return m[1] === 'review' || blocks.some((b) => b.key === m[1]) ? m[1] : null;
  }

  // ── Carga ──────────────────────────────────────────────────
  async function load() {
    phase = 'loading'; loadError = '';
    let res, json = null;
    try {
      res = await fetch(`/api/kit/${encodeURIComponent(token)}`, { headers: { accept: 'application/json' } });
      try { json = await res.json(); } catch { /* sin cuerpo */ }
    } catch {
      phase = 'error'; loadError = t.kitErrLoad; return;
    }
    if (res.status === 404) { phase = 'invalid'; return; }
    if (!res.ok || !json || !json.ok) { phase = 'error'; loadError = (json && json.error) || t.kitErrLoad; return; }
    if (json.kitStatus === 'submitted') { phase = 'done'; return; }
    meta = json;
    data = { ...(json.prefill || {}) };
    const local = await loadKitLocal(token);
    saved = new Set(local && Array.isArray(local.saved) ? local.saved : []);
    uploads = new Uploads({
      lang: untrack(() => lang), purpose: 'kit', kitToken: token, draft: local && local.draft,
      onDraft: () => persistLocal(), onChange: () => {},
    });
    if (json.uploads === false) uploads.unavailable = t.kitUploadsOff;
    // Lo ya recibido (también el logo y las fotos del brief) se ve en su zona.
    const MAP = { logo_files: 'brand_logo_files', photo_files: 'kit_photo_files' };
    uploads.restore((json.files || []).map((f) => {
      const field = MAP[(f.tags || {}).field] || (f.tags || {}).field || null;
      return { id: `s${f.id}`, kind: f.kind, name: f.originalName, size: f.size, field, tags: { ...(f.tags || {}), field, shot: (f.tags || {}).shot || (f.kind === 'photo' ? 'other' : undefined) } };
    }), { fromServer: true });
    for (const b of blocks) markSaved(b);
    phase = 'ready';
    const h = readHash();
    if (h) await openBlock(h, { push: false });
    else if (matchMedia('(min-width: 1024px)').matches && blocks.length) {
      const first = blocks.find((b) => statuses[b.key].status !== 'done') || blocks[0];
      open = first.key;
    }
  }

  // ── Guardar un bloque ──────────────────────────────────────
  async function post(action, payload, { withFiles = true } = {}) {
    const draft = withFiles && uploads && uploads.draft;
    const filesMeta = uploads ? uploads.meta() : [];
    const res = await fetch(`/api/kit/${encodeURIComponent(token)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data: payload, lang, ...(draft ? { draftId: draft.draftId, secret: draft.secret, files: filesMeta } : {}) }),
    });
    let json = null;
    try { json = await res.json(); } catch { /* sin cuerpo */ }
    return { res, json };
  }

  async function saveBlock() {
    if (!current) return;
    saveError = ''; saveNote = '';
    if (uploads && uploads.busy) { saveError = t.busyUploads; return; }
    const v = validateKit(data, services, true, blocks);
    const errs = errorsForBlock(current, v.errors);
    errors = errs;
    if (Object.keys(errs).length) { focusFirstError(); return; }
    saveState = 'sending';
    try {
      const { res, json } = await post('save', blockData(current, data));
      if (res.status === 409) { phase = 'done'; return; }
      if (res.status === 404) { phase = 'invalid'; return; }
      if (!res.ok || !json || !json.ok) {
        if (json && json.fields) { errors = errorsForBlock(current, json.fields); focusFirstError(); }
        saveError = (json && json.error) || t.errNetwork;
        saveState = '';
        return;
      }
      saved = new Set([...saved, current.key]);
      markSaved(current);
      persistLocal();
      saveState = 'done';
      saveNote = t.kitSavedNote;
      setTimeout(() => {
        saveState = '';
        const idx = blocks.findIndex((b) => b.key === current?.key);
        const nextB = blocks.slice(idx + 1).find((b) => statuses[b.key].status !== 'done');
        openBlock(nextB ? nextB.key : 'review');
      }, 700);
    } catch {
      saveError = t.errNetwork;
      saveState = '';
    }
  }

  async function focusFirstError() {
    await tick();
    const el = panel && panel.querySelector('[aria-invalid="true"], [data-invalid="true"]');
    if (!el) return;
    const target = el.matches('input,select,textarea') ? el : el.querySelector('input,select,textarea');
    (target || el).focus({ preventScroll: true });
    (target || el).scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── Enviar el kit ──────────────────────────────────────────
  async function submitKit() {
    sendError = '';
    if (uploads && uploads.busy) { sendError = t.busyUploads; return; }
    if (missing.length) { await openBlock(missing[0].key); const v = validateKit(collectAll(), services, false, blocks); errors = errorsForBlock(missing[0], v.errors); focusFirstError(); return; }
    sendState = 'sending';
    try {
      const { res, json } = await post('submit', collectAll());
      if (res.status === 409) { phase = 'done'; return; }
      if (res.status === 404) { phase = 'invalid'; return; }
      if (!res.ok || !json || !json.ok) {
        if (json && json.fields) {
          const first = blocks.find((b) => Object.keys(errorsForBlock(b, json.fields)).length);
          if (first) { await openBlock(first.key); errors = errorsForBlock(first, json.fields); focusFirstError(); }
        }
        sendError = (json && json.error) || t.errNetwork;
        sendState = '';
        return;
      }
      sendState = 'done';
      await clearKitLocal(token);
      phase = 'sent';
      try { history.replaceState(null, '', location.pathname + location.search); } catch { /* nada */ }
    } catch {
      sendError = t.errNetwork;
      sendState = '';
    }
  }

  onMount(() => {
    token = kitTokenFrom(location.pathname, location.search);
    if (!token) { phase = 'notoken'; return; }
    load();
    const onPop = () => { if (phase === 'ready') openBlock(readHash(), { push: false }); };
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  });

  const stLabel = (k) => {
    const s = statuses[k];
    if (!s) return '';
    if (k === 'fotos' && uploads) {
      const n = shotsDone(uploads.files);
      if (n) return t.kitShots(n, SHOTS_TOTAL);
    }
    if (s.status === 'partial') return t.kitCount(s.filled, s.total);
    return t.kitSt[s.status];
  };
</script>

{#if phase === 'loading'}
  <div class="state" role="status" aria-live="polite">
    <span class="spin" aria-hidden="true"></span>
    <p>{t.kitLoading}</p>
  </div>
{:else if phase === 'invalid' || phase === 'done' || phase === 'notoken'}
  <section class="state state--card" aria-labelledby="kit-st">
    <span class="state__icon" aria-hidden="true"><Ico name={phase === 'done' ? 'check' : 'lock'} size={22} /></span>
    <h2 id="kit-st">{phase === 'done' ? t.kitDoneTitle : t.kitInvalidTitle}</h2>
    <p>{phase === 'done' ? t.kitDoneBody : phase === 'notoken' ? t.kitNoToken : t.kitInvalidBody}</p>
    <Exits {lang} {phone} />
  </section>
{:else if phase === 'error'}
  <section class="state state--card" aria-labelledby="kit-err">
    <span class="state__icon state__icon--err" aria-hidden="true"><Ico name="alert" size={22} /></span>
    <h2 id="kit-err">{loadError}</h2>
    <div class="state__row">
      <Btn onclick={load}><Ico name="retry" size={16} />{t.kitRetry}</Btn>
    </div>
    <Exits {lang} {phone} />
  </section>
{:else if phase === 'sent'}
  <section class="state state--card" aria-labelledby="kit-ok">
    <span class="state__icon state__icon--ok" aria-hidden="true"><Ico name="check" size={22} /></span>
    <h2 id="kit-ok">{t.kitOkTitle}</h2>
    <p>{t.kitOkBody}</p>
    <Exits {lang} {phone} />
  </section>
{:else if phase === 'ready' && meta}
  <div class="kit" class:kit--open={!!open}>
    <header class="head">
      <span class="head__k">{t.kitKicker}{meta.projectId ? ` · ${meta.projectId}` : ''}</span>
      <h1 class="head__title">{t.kitTitle}</h1>
      <p class="head__intro">{meta.firstName ? `${t.kitHello(meta.firstName)} ` : ''}{t.kitIntro}</p>
      <div class="head__prog">
        <span>{t.kitProgress(doneCount, blocks.length)}</span>
        <span class="bar" role="progressbar" aria-valuemin="0" aria-valuemax={blocks.length} aria-valuenow={doneCount} aria-label={t.kitProgress(doneCount, blocks.length)}><i style:width={`${blocks.length ? (doneCount / blocks.length) * 100 : 0}%`}></i></span>
      </div>
    </header>

    <nav class="list" aria-label={t.kitKicker}>
      <ul>
        {#each blocks as b (b.key)}
          {@const st = statuses[b.key]}
          <li>
            <a href={`#b-${b.key}`} class="item" class:item--on={open === b.key} aria-current={open === b.key ? 'true' : undefined}
               onclick={(e) => { e.preventDefault(); openBlock(b.key); }}>
              <i class="dot dot--{st.status}" aria-hidden="true">{#if st.status === 'done'}<Ico name="check" size={12} />{/if}</i>
              <span class="item__name">{pick(b.label, lang)}</span>
              <span class="item__meta">{stLabel(b.key)}</span>
              <Ico name="right" size={16} />
            </a>
          </li>
        {/each}
        <li>
          <a href="#b-review" class="item item--review" class:item--on={open === 'review'} aria-current={open === 'review' ? 'true' : undefined}
             onclick={(e) => { e.preventDefault(); openBlock('review'); }}>
            <i class="dot dot--review" aria-hidden="true"><Ico name="upload" size={12} /></i>
            <span class="item__name">{t.kitReview}</span>
            <span class="item__meta"></span>
            <Ico name="right" size={16} />
          </a>
        </li>
      </ul>
    </nav>

    <section class="panel" bind:this={panel} aria-live="off">
      {#if current}
        <button type="button" class="back" onclick={() => openBlock(null)}><Ico name="left" size={16} />{t.kitBackList}</button>
        <h2 class="panel__title" tabindex="-1" data-block-title>{pick(current.label, lang)}</h2>
        {#if current.help}<p class="panel__help">{pick(current.help, lang)}</p>{/if}
        <form class="panel__fields" novalidate onsubmit={(e) => { e.preventDefault(); saveBlock(); }}>
          {#each visibleFields(current, data) as fd (fd.key)}
            {#if fd.type === 'file'}
              {#if fd.key === 'kit_photo_files'}
                <ShotUploads {uploads} field={fd} {lang} quota={false} />
              {:else}
                <FileZone {uploads} field={fd} {lang} idPrefix="kit" quota={false} />
              {/if}
            {:else}
              <SchemaField field={fd} bind:value={data[fd.key]} {lang} {errors} idPrefix="kit" />
            {/if}
          {/each}
          {#if current.fields.some((f) => f.type === 'file') && uploads.active.length}
            <p class="quota">{t.quota(uploads.active.length, fmtBytes(uploads.usedBytes, lang))}</p>
          {/if}
          {#if Object.keys(errors).length}<p class="fix" role="alert"><Ico name="alert" size={16} />{t.fixFields}</p>{/if}
          <div class="actions">
            <Btn type="submit" state={saveState} sending={t.kitSaving} done={t.kitSaved}>{t.kitSave}</Btn>
            {#if saveNote}<span class="note" role="status">{saveNote}</span>{/if}
          </div>
          {#if saveError}<p class="err" role="alert"><Ico name="alert" size={16} />{saveError}</p>{/if}
        </form>
      {:else if open === 'review'}
        <button type="button" class="back" onclick={() => openBlock(null)}><Ico name="left" size={16} />{t.kitBackList}</button>
        <h2 class="panel__title" tabindex="-1" data-block-title>{t.kitReview}</h2>
        <p class="panel__help">{t.kitReviewIntro}</p>
        <ul class="sum">
          {#each blocks as b (b.key)}
            {@const st = statuses[b.key]}
            <li>
              <i class="dot dot--{st.status}" aria-hidden="true">{#if st.status === 'done'}<Ico name="check" size={12} />{/if}</i>
              <span>{pick(b.label, lang)}</span>
              <button type="button" class="linkbtn" onclick={() => openBlock(b.key)}>{stLabel(b.key)}</button>
            </li>
          {/each}
        </ul>
        {#if missing.length}
          <p class="err" role="status"><Ico name="alert" size={16} />{t.kitMissing}: {missing.map((b) => pick(b.label, lang)).join(', ')}.</p>
        {/if}
        <div class="actions">
          <Btn onclick={submitKit} state={sendState} sending={t.sending} done={t.kitSent}>{t.kitSend}</Btn>
        </div>
        {#if sendError}<p class="err" role="alert"><Ico name="alert" size={16} />{sendError}</p>{/if}
        <p class="legal"><Ico name="lock" size={14} /><span>{t.privacyPre} <a href={t.privacyHref} target="_blank" rel="noopener">{t.privacyLink}</a>. {t.privacyPost}</span></p>
      {:else}
        <p class="panel__empty">{t.kitIntro}</p>
      {/if}
    </section>
  </div>
{/if}

<style>
  .state { display: grid; justify-items: start; gap: var(--space-4); padding: var(--space-6) 0; color: var(--fg-secondary); }
  .state p { margin: 0; line-height: var(--leading-normal); max-width: 52ch; }
  .state--card { max-width: 620px; padding: var(--space-6) var(--space-5); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); }
  .state h2 { margin: 0; font-family: var(--font-display); font-size: var(--fluid-h4); font-weight: 600; color: var(--fg-primary); line-height: var(--leading-snug); }
  .state__icon { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: var(--bg-elevated); color: var(--accent-gold); box-shadow: inset 0 0 0 1px var(--border-accent); }
  .state__icon--ok { background: var(--accent-teal-dim); color: var(--accent-teal); box-shadow: inset 0 0 0 1px var(--accent-teal-line); }
  .state__icon--err { color: color-mix(in srgb, var(--color-error), white 22%); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-error) 40%, transparent); }
  .state__row { display: flex; gap: var(--space-3); }
  .spin { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border); border-top-color: var(--accent-gold); animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .kit { display: grid; gap: var(--space-5); align-items: start; }
  .head { display: grid; gap: var(--space-3); }
  .head__k { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: var(--tracking-wide); color: var(--accent-gold); }
  .head__title { margin: 0; font-family: var(--font-display); font-size: var(--fluid-h3); font-weight: 700; line-height: var(--leading-tight); letter-spacing: var(--tracking-tight); color: var(--fg-primary); max-width: 22ch; }
  .head__intro { margin: 0; color: var(--fg-secondary); font-size: var(--fluid-lead); line-height: var(--leading-normal); max-width: 62ch; }
  .head__prog { display: grid; gap: var(--space-2); max-width: 520px; font-size: var(--text-sm); color: var(--fg-primary); }
  .bar { display: block; height: 6px; border-radius: 6px; background: var(--bg-elevated); overflow: hidden; box-shadow: inset 0 0 0 1px var(--border-subtle); }
  .bar i { display: block; height: 100%; background: var(--accent-teal); border-radius: 6px; transition: width var(--duration-slow) var(--ease-out-expo); }

  .list ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2); }
  .item {
    display: grid; grid-template-columns: 22px minmax(0, 1fr) auto 16px; align-items: center; gap: var(--space-3);
    min-height: 56px; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md);
    background: var(--bg-card); border: 1px solid var(--border); color: var(--fg-secondary); text-decoration: none;
    transition: border-color var(--duration-fast), background var(--duration-fast);
  }
  .item:hover { border-color: var(--border-accent); color: var(--fg-primary); }
  .item:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .item--on { border-color: var(--accent-gold); background: var(--bg-elevated); }
  .item__name { color: var(--fg-primary); font-size: var(--text-sm); font-weight: 600; line-height: var(--leading-snug); }
  .item__meta { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--fg-secondary); white-space: nowrap; }
  .item--review { border-style: dashed; border-color: var(--border-accent); }
  .dot { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; border: 1px solid var(--border); color: var(--accent-teal); }
  .dot--done { background: var(--accent-teal-dim); border-color: var(--accent-teal-line); }
  .dot--partial { border-color: var(--accent-gold); background: conic-gradient(var(--accent-gold-dim) 0 50%, transparent 50% 100%); }
  .dot--optional { border-style: dashed; }
  .dot--review { color: var(--accent-gold); border-color: var(--accent-gold-line); }

  .panel {
    display: grid; gap: var(--space-4); min-width: 0; scroll-margin-top: calc(var(--nav-h) + var(--space-4));
    background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg);
    padding: var(--space-5) var(--space-4); box-shadow: var(--shadow-card);
  }
  .panel__title { margin: 0; font-family: var(--font-display); font-size: var(--fluid-h4); font-weight: 600; color: var(--fg-primary); line-height: var(--leading-snug); }
  .panel__title:focus { outline: none; }
  .panel__help, .panel__empty { margin: 0; color: var(--fg-secondary); line-height: var(--leading-normal); max-width: 60ch; }
  .panel__fields { display: grid; gap: var(--space-6); }
  .back {
    justify-self: start; display: inline-flex; align-items: center; gap: 6px; min-height: var(--tap-min); padding: 0 var(--space-1);
    background: transparent; color: var(--fg-secondary); font: 600 var(--text-sm) var(--font-body); cursor: pointer;
  }
  .back:hover { color: var(--accent-gold); }
  .back:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; border-radius: var(--radius-sm); }
  .actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle); }
  .actions :global(.btn) { flex: 1 1 auto; }
  .quota { margin: calc(-1 * var(--space-4)) 0 0; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--fg-secondary); }
  .note { font-size: var(--text-sm); color: var(--accent-teal); }
  .fix, .err { display: flex; gap: var(--space-2); align-items: flex-start; margin: 0; font-size: var(--text-sm); color: color-mix(in srgb, var(--color-error), white 22%); line-height: var(--leading-normal); }
  .sum { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  .sum li { display: grid; grid-template-columns: 22px 1fr auto; gap: var(--space-3); align-items: center; padding: var(--space-1) 0; border-bottom: 1px solid var(--border-subtle); color: var(--fg-primary); font-size: var(--text-sm); }
  .linkbtn {
    min-height: var(--tap-min); padding: 0 var(--space-1); background: transparent; cursor: pointer;
    font: 500 var(--text-xs) var(--font-mono); color: var(--fg-secondary);
    text-decoration: underline; text-decoration-color: var(--accent-gold-line); text-underline-offset: 3px;
  }
  .linkbtn:hover { color: var(--accent-gold); }
  .linkbtn:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .legal { display: flex; gap: var(--space-2); align-items: flex-start; margin: 0; font-size: var(--text-sm); color: var(--fg-secondary); line-height: var(--leading-normal); }
  .legal :global(svg) { margin-top: 3px; color: var(--accent-teal); }
  .legal a { color: var(--fg-primary); text-decoration: underline; text-decoration-color: var(--accent-gold-line); text-underline-offset: 3px; }

  /* Teléfono: lista O bloque abierto (uno a la vez) */
  .kit--open .list, .kit--open .head { display: none; }
  .kit:not(.kit--open) .panel { display: none; }

  @media (--md) {
    .panel { padding: var(--space-6); }
    .actions :global(.btn) { flex: 0 0 auto; }
    .state--card { padding: var(--space-7); }
  }
  @media (--lg) {
    .kit { grid-template-columns: 340px minmax(0, 1fr); gap: var(--space-5) var(--space-7); }
    .head { grid-column: 1 / -1; }
    .kit--open .list, .kit--open .head { display: grid; }
    .kit:not(.kit--open) .panel { display: grid; }
    .list { position: sticky; top: calc(var(--nav-h) + var(--space-5)); }
    .back { display: none; }
    .panel { padding: var(--space-7); }
  }
  @media (--motion-reduce) { .spin { animation-duration: 3s; } .bar i, .item { transition: none; } }
</style>
