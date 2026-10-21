<script>
  // ════════════════════════════════════════════════════════════════
  //  BriefForm — brief corto público por pasos (B1, camino 2 "expediente
  //  por pasos", design/brief.md). Momento 'inicial' de lib/brief-schema.mjs.
  //
  //  · Cinco pasos con nombre: raíl a la izquierda (≥1024 px) o barra
  //    "Paso N de 6" con progreso segmentado en el teléfono.
  //  · Validación por paso con validate() del esquema: mensaje junto al
  //    campo, foco al primero, nada se borra. Avance SOLO con clic.
  //  · Guardado automático (lib/persist.js) y reanudación al volver.
  //  · Subidas dentro del paso de marca (lib/uploads.svelte.js).
  //  · Envío v2 a POST /api/brief (schema_version 2 + lang + archivos).
  //  · Atrás del navegador = paso anterior (#paso-N en la URL).
  // ════════════════════════════════════════════════════════════════
  import { onMount, tick, untrack } from 'svelte';
  import SchemaField from './SchemaField.svelte';
  import FileZone from './FileZone.svelte';
  import Btn from './Btn.svelte';
  import Exits from './Exits.svelte';
  import Ico from './Ico.svelte';
  import { strings, pick } from './lib/strings.js';
  import { STEPS, REVIEW_STEP, itemsForStep, isHidden, groupOf, validateStep, validateAll, errorsForStep, firstStepWithErrors, estimateMinutes } from './lib/steps.js';
  import { saveBrief, loadBrief, clearBrief, storageAvailable } from './lib/persist.js';
  import { Uploads } from './lib/uploads.svelte.js';
  import { fmtBytes } from './lib/sniff.js';
  import { labelFor, fieldByKey } from '../../../lib/brief-schema.mjs';
  import { track } from '../../lib/track.js';

  let { lang = 'es', phone = '+1 713-823-9144' } = $props();
  const t = $derived(strings(lang));
  const TOTAL = STEPS.length;

  let data = $state({ services: [] });
  let step = $state(0);
  let visited = $state(0);
  let errors = $state({});
  let fromReview = $state(false);
  let phase = $state('form');
  let sendState = $state('');
  let sendError = $state('');
  let failCount = $state(0);
  let result = $state(null);
  let resumedAt = $state(null);
  let resumedFiles = $state(false);
  let carried = 0;
  let askRestart = $state(false);
  let canStore = $state(true);
  let hydrated = $state(false);
  let hp = $state('');
  let card = $state();
  let okHead = $state();

  const uploads = new Uploads({ lang: untrack(() => lang), purpose: 'brief', onDraft: () => schedule(), onChange: () => schedule() });

  const services = $derived(Array.isArray(data.services) ? data.services : []);
  const items = $derived(itemsForStep(step, services));
  const minutes = $derived(estimateMinutes(services, data));
  const stepValid = $derived(STEPS.map((_, i) => i === REVIEW_STEP || Object.keys(validateStep(i, data)).length === 0));
  const svcField = fieldByKey('services');
  // Nombre del servicio que encabeza su bloque de preguntas (paso 2 y revisión).
  const svcName = (id) => { const o = svcField.options.find((x) => x.value === id); return o ? pick(o.label, lang) : id; };

  // ── Guardado automático ─────────────────────────────────────
  let timer = 0;
  // Solo se guarda (y se ofrece retomar) si hay algo escrito, elegido o subido:
  // abrir el formulario y salir no debe dejar un "Retomaste tu brief" vacío.
  const hasAnswers = (d) => Object.values(d || {}).some((v) =>
    Array.isArray(v) ? v.length > 0 : (v !== null && v !== undefined && v !== false && String(v).trim() !== ''));
  function schedule() {
    if (!hydrated || phase !== 'form') return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const files = $state.snapshot(uploads.files);
      if (!hasAnswers($state.snapshot(data)) && !(files && files.length) && !uploads.draft && !resumedFiles) { clearBrief(); return; }
      const ok = saveBrief({ data: $state.snapshot(data), step, lang, visited, files, draft: $state.snapshot(uploads.draft), carriedFiles: resumedFiles ? carried : 0 });
      canStore = ok;
    }, 300);
  }
  $effect(() => { JSON.stringify(data); step; visited; schedule(); });

  // ── Navegación ──────────────────────────────────────────────
  async function show(i, { push = true } = {}) {
    step = Math.max(0, Math.min(REVIEW_STEP, i));
    visited = Math.max(visited, step);
    if (push) {
      try { history.pushState({ paso: step }, '', `#paso-${step + 1}`); } catch { /* sin historial: no pasa nada */ }
    }
    await tick();
    if (card) {
      card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      const h = card.querySelector('[data-step-title]');
      if (h) h.focus({ preventScroll: true });
    }
  }
  async function focusFirstError() {
    await tick();
    const el = card && card.querySelector('[aria-invalid="true"], [data-invalid="true"]');
    if (!el) return;
    const target = el.matches('input,select,textarea') ? el : el.querySelector('input,select,textarea');
    (target || el).focus({ preventScroll: true });
    (target || el).scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function next() {
    const errs = validateStep(step, data);
    errors = errs;
    if (Object.keys(errs).length) { focusFirstError(); return; }
    const to = fromReview ? REVIEW_STEP : step + 1;
    if (to === REVIEW_STEP) fromReview = false;
    show(to);
  }
  function back() { fromReview = false; errors = {}; show(step - 1); }
  function goTo(i) { if (i <= visited && i !== step) { errors = {}; fromReview = false; show(i); } }
  function edit(i) { fromReview = true; errors = {}; show(i); }

  // Los errores se van solos cuando el campo se corrige (no aparecen antes de intentarlo).
  function revalidate() {
    if (!Object.keys(errors).length) return;
    const now = validateStep(step, data);
    const keep = {};
    for (const k of Object.keys(errors)) if (now[k]) keep[k] = now[k];
    errors = keep;
  }

  // ── Envío ───────────────────────────────────────────────────
  async function submit() {
    sendError = '';
    if (uploads.busy) { sendError = t.busyUploads; return; }
    const v = validateAll(data);
    if (!v.ok) {
      const first = firstStepWithErrors(v.errors);
      errors = errorsForStep(first, v.errors);
      fromReview = true;
      await show(first);
      focusFirstError();
      return;
    }
    sendState = 'sending';
    const draft = uploads.draft;
    const files = uploads.meta();
    const body = {
      ...v.data, schema_version: 2, lang, source: 'web', website_hp: hp,
      ...(draft && files.length ? { draftId: draft.draftId, secret: draft.secret, files } : {}),
    };
    // 30 s: /api/brief espera los correos (8 s cada uno) y la revisión de
    // archivos. Un corte antes que eso duplicaría el folio al reenviar.
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch('/api/brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      let json = null;
      try { json = await res.json(); } catch { /* sin cuerpo */ }
      if (!res.ok || !json || !json.ok) {
        if (json && json.fields && Object.keys(json.fields).length) {
          const first = firstStepWithErrors(json.fields);
          errors = errorsForStep(first, json.fields);
          sendState = '';
          fromReview = true;
          await show(first);
          focusFirstError();
          return;
        }
        failCount++;
        sendError = (json && json.error) || t.errNetwork;
        sendState = '';
        return;
      }
      result = { projectId: String(json.projectId || '').trim(), files: json.files || null, via: data.preferred_contact || null };
      sendState = 'done';
      clearBrief();
      try { track('brief_submitted', { v: 2, lang, services: services.length, files: files.length }); } catch { /* medición opcional */ }
      phase = 'sent';
      try { history.replaceState(null, '', location.pathname + location.search); } catch { /* nada */ }
      await tick();
      okHead && okHead.focus({ preventScroll: true });
      okHead && okHead.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      failCount++;
      sendError = err && err.name === 'AbortError' ? t.errSlow : t.errNetwork;
      sendState = '';
    } finally {
      clearTimeout(to);
    }
  }

  // ── Reanudación ─────────────────────────────────────────────
  function restart() {
    clearBrief();
    data = { services: [] };
    errors = {};
    uploads.files = [];
    uploads.draft = null;
    uploads.discarded = [];
    resumedAt = null; resumedFiles = false; carried = 0; askRestart = false; fromReview = false;
    visited = 0;
    show(0);
  }
  const fmtDay = (ms) => {
    try { return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-US', { day: 'numeric', month: 'long', timeZone: 'America/Chicago' }).format(new Date(ms)); } catch { return ''; }
  };

  onMount(() => {
    canStore = storageAvailable();
    let saved = loadBrief();
    // Un guardado sin respuestas ni archivos (de una visita anterior que no escribió nada) no se retoma.
    if (saved && !hasAnswers(saved.data) && !(saved.files && saved.files.length) && !(saved.filesCount > 0) && !saved.draft) { clearBrief(); saved = null; }
    if (saved) {
      data = { services: [], ...saved.data };
      visited = Math.max(0, Math.min(REVIEW_STEP, saved.visited || saved.step || 0));
      step = Math.max(0, Math.min(visited, saved.step || 0));
      if (saved.draft) uploads.draft = saved.draft;
      uploads.restore(saved.files);
      resumedAt = saved.savedAt;
      resumedFiles = saved.filesCount > 0 && !saved.files.length;
      carried = resumedFiles ? saved.filesCount : 0;
    }
    const m = /^#paso-(\d)$/.exec(location.hash);
    if (m) { const i = Number(m[1]) - 1; if (i >= 0 && i <= visited) step = i; }
    try { history.replaceState({ paso: step }, '', `#paso-${step + 1}`); } catch { /* nada */ }
    hydrated = true;
    const onPop = (e) => {
      if (phase !== 'form') return;
      const hm = /^#paso-(\d)$/.exec(location.hash);
      const i = e.state && Number.isInteger(e.state.paso) ? e.state.paso : (hm ? Number(hm[1]) - 1 : 0);
      if (i <= visited) { errors = {}; fromReview = false; show(i, { push: false }); }
    };
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  });

  const nextLabel = $derived(fromReview ? t.backToReview : (STEPS[step + 1] ? pick(STEPS[step + 1].label, lang) : ''));
  // Una casilla sin marcar no es una respuesta que repasar.
  const answer = (fd) => (data[fd.key] === false ? null : labelFor(fd, data[fd.key], lang));
  // En la revisión, el nombre del servicio solo encabeza si su bloque tiene respuestas.
  const groupAnswered = (fs, g) => fs.some((it) => groupOf(it.fd, services) === g && !isHidden(it.fd.key, data) && (it.fd.type === 'file' ? fileNames(it.fd.key).length : answer(it.fd)));
  // El servidor borra lo que el cliente quitó (B1-R04): lo enlazado es lo que llegó.
  const keptFiles = $derived(result && result.files ? Math.max(0, result.files.linked || 0) : 0);
  const fileNames = (key) =>uploads.files.filter((f) => f.field === key && !f.removed && f.status === 'done').map((f) => f.name);
</script>

{#if phase === 'sent' && result}
  <section class="ok" aria-labelledby="bf-ok-title">
    <div class="ok__mark" aria-hidden="true"><Ico name="check" size={22} /></div>
    <h2 class="ok__title" id="bf-ok-title" tabindex="-1" bind:this={okHead}>{t.okTitle}</h2>
    {#if result.projectId}<p class="ok__ref">{t.okRef(result.projectId)}</p>{/if}
    <h3 class="ok__sub">{t.okNextTitle}</h3>
    <ol class="ok__steps">
      <li><span class="ok__n">1</span><span>{t.okContact(result.via ? t.via[result.via] : '')}</span></li>
      <li><span class="ok__n">2</span><span>{t.okProposal}</span></li>
      <li><span class="ok__n">3</span><span>{t.okKit}</span></li>
    </ol>
    {#if keptFiles}
      <p class="ok__files">{t.okFiles(keptFiles)}{#if result.files.rejected} {t.okFilesRejected(result.files.rejected)}{/if}</p>
    {/if}
    <p class="ok__note">{t.okNoResend}</p>
    <div class="ok__talk">
      <span>{t.talkNow}</span>
      <Exits {lang} {phone} />
    </div>
  </section>
{:else}
  <div class="bf">
    <!-- Raíl (escritorio) -->
    <aside class="rail" aria-label={t.railTitle}>
      <span class="rail__title">{t.railTitle}</span>
      <span class="rail__time"><Ico name="clock" size={14} />{t.time(minutes)}</span>
      <ol class="rail__steps">
        {#each STEPS as s, i (s.key)}
          {@const done = i !== step && i <= visited && stepValid[i] && i !== REVIEW_STEP}
          <li class:now={i === step} class:done>
            <button type="button" onclick={() => goTo(i)} disabled={i > visited} aria-current={i === step ? 'step' : undefined}>
              <b>{#if done}<Ico name="check" size={12} />{:else}{i + 1}{/if}</b>
              <span>{pick(s.label, lang)}</span>
            </button>
          </li>
        {/each}
      </ol>
      <p class="rail__save" class:off={!canStore}><i aria-hidden="true"></i>{canStore ? t.autosave : t.noStorage}</p>
    </aside>

    <form class="card" novalidate bind:this={card} oninput={revalidate} onchange={revalidate} onsubmit={(e) => { e.preventDefault(); step === REVIEW_STEP ? submit() : next(); }}>
      <!-- Barra móvil -->
      <div class="mbar">
        <div class="mbar__row">
          <span class="mbar__k">{t.stepOf(step + 1, TOTAL, pick(STEPS[step].label, lang))}</span>
          <span class="mbar__t">{t.timeShort(minutes)}</span>
        </div>
        <div class="mbar__seg" role="progressbar" aria-valuemin="1" aria-valuemax={TOTAL} aria-valuenow={step + 1} aria-label={t.stepOf(step + 1, TOTAL, pick(STEPS[step].label, lang))}>
          {#each STEPS as _, i}<i class:on={i <= step}></i>{/each}
        </div>
      </div>

      {#if resumedAt}
        <div class="resume" role="status">
          {#if !askRestart}
            <span>{t.resumed(fmtDay(resumedAt))}{#if resumedFiles} {t.reupload}{/if}</span>
            <button type="button" class="linkbtn" onclick={() => (askRestart = true)}>{t.restart}</button>
          {:else}
            <span>{t.restartAsk}</span>
            <span class="resume__ask">
              <button type="button" class="linkbtn linkbtn--danger" onclick={restart}>{t.restartYes}</button>
              <button type="button" class="linkbtn" onclick={() => (askRestart = false)}>{t.restartNo}</button>
            </span>
          {/if}
        </div>
      {/if}

      <header class="card__head">
        <span class="card__k">{t.stepOf(step + 1, TOTAL, '').replace(/ · $/, '')}</span>
        <h2 class="card__title" tabindex="-1" data-step-title>{pick(STEPS[step].label, lang)}</h2>
        <p class="card__intro">{pick(STEPS[step].intro, lang)}</p>
      </header>

      <!-- Trampa para bots (oculta a personas y lectores) -->
      <input class="hp" type="text" name="website_hp" tabindex="-1" autocomplete="off" aria-hidden="true" bind:value={hp} />

      {#if step !== REVIEW_STEP}
        <div class="card__fields">
          {#each items as { fd, head } (fd.key)}
            {#if head}<h3 class="blk">{svcName(head)}</h3>{/if}
            {#if isHidden(fd.key, data)}
              <!-- depende de otra respuesta: oculto, sin borrar lo escrito -->
            {:else if fd.type === 'file'}
              {#if (fd.key === 'logo_files' && (['si', 'update'].includes(data.has_logo) || uploads.forField(fd.key).length))
                || (fd.key === 'photo_files' && (['si', 'pocas'].includes(data.has_photos) || uploads.forField(fd.key).length))
                || !['logo_files', 'photo_files'].includes(fd.key)}
                <FileZone {uploads} field={fd} {lang} quota={false} />
              {/if}
            {:else}
              <SchemaField field={fd} bind:value={data[fd.key]} {lang} {errors} />
            {/if}
            {#if fd.key === 'photo_files' && uploads.active.length}
              <p class="quota">{t.quota(uploads.active.length, fmtBytes(uploads.usedBytes, lang))}</p>
            {/if}
          {/each}
        </div>
      {:else}
        <div class="rev">
          {#each STEPS.slice(0, REVIEW_STEP) as s, i (s.key)}
            {@const fs = itemsForStep(i, services)}
            <section class="rev__sec" aria-labelledby={`rev-${s.key}`}>
              <div class="rev__head">
                <h3 id={`rev-${s.key}`}>{pick(s.label, lang)}</h3>
                <button type="button" class="linkbtn" onclick={() => edit(i)} aria-label={`${t.edit}: ${pick(s.label, lang)}`}><Ico name="edit" size={14} />{t.edit}</button>
              </div>
              <dl>
                {#each fs as { fd, head } (fd.key)}
                  {#if head && groupAnswered(fs, head)}<p class="rev__grp">{svcName(head)}</p>{/if}
                  {#if isHidden(fd.key, data)}
                    <!-- oculto: no se envía -->
                  {:else if fd.type === 'file'}
                    {#if fileNames(fd.key).length}<div class="rev__row"><dt>{t.revFiles[fd.kind] || pick(fd.label, lang)}</dt><dd>{fileNames(fd.key).join(', ')}</dd></div>{/if}
                  {:else if answer(fd)}
                    <div class="rev__row"><dt>{pick(fd.label, lang)}</dt><dd>{answer(fd)}</dd></div>
                  {:else if fd.required}
                    <div class="rev__row"><dt>{pick(fd.label, lang)}</dt><dd class="rev__empty">{t.notAnswered}</dd></div>
                  {/if}
                {/each}
              </dl>
            </section>
          {/each}
        </div>
        <p class="legal">
          <Ico name="lock" size={14} />
          <span>{t.privacyPre} <a href={t.privacyHref} target="_blank" rel="noopener">{t.privacyLink}</a>. {t.privacyPost}</span>
        </p>
      {/if}

      {#if Object.keys(errors).length}
        <p class="card__fix" role="alert"><Ico name="alert" size={16} />{t.fixFields}</p>
      {/if}

      <div class="actions">
        {#if step > 0}
          <Btn variant="ghost" onclick={back}><Ico name="left" size={16} />{t.back}</Btn>
        {/if}
        <span class="actions__sp"></span>
        {#if step < REVIEW_STEP}
          <Btn type="submit">
            <span class="desk">{fromReview ? t.backToReview : `${t.next}: ${nextLabel.charAt(0).toLowerCase()}${nextLabel.slice(1)}`}</span>
            <span class="mob">{fromReview ? t.backToReview : t.next}</span>
            <Ico name="right" size={16} />
          </Btn>
        {:else}
          <Btn type="submit" state={sendState} sending={t.sending} done={t.sent} track={null}>{t.send}</Btn>
        {/if}
      </div>
      {#if step === REVIEW_STEP}
        <p class="reassure">{t.reassure}</p>
      {/if}
      {#if sendError}
        <div class="senderr" role="alert">
          <p><Ico name="alert" size={16} />{sendError}</p>
          {#if failCount >= 2}<p class="senderr__more">{t.errAgain}</p><Exits {lang} {phone} />{/if}
        </div>
      {/if}
    </form>
  </div>
{/if}

<style>
  .bf { display: grid; gap: var(--space-5); align-items: start; }

  /* ── Raíl (solo escritorio) ── */
  .rail { display: none; }
  .rail__title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 600; color: var(--fg-primary); }
  .rail__time {
    display: inline-flex; align-items: center; gap: 6px; width: max-content;
    font-family: var(--font-mono); font-size: var(--text-xs); color: var(--fg-secondary);
    border: 1px solid var(--border); border-radius: var(--radius-pill); padding: 6px 10px;
  }
  .rail__steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  .rail__steps button {
    width: 100%; display: flex; align-items: center; gap: var(--space-3); min-height: var(--tap-min);
    padding: 6px var(--space-2); margin-left: calc(-1 * var(--space-2)); border-radius: var(--radius-md);
    background: transparent; color: var(--fg-secondary); font: 500 var(--text-sm) var(--font-body); text-align: left; cursor: pointer;
  }
  .rail__steps button:disabled { cursor: default; color: color-mix(in srgb, var(--fg-secondary) 70%, var(--bg-base)); }
  .rail__steps button:not(:disabled):hover { background: var(--bg-elevated); color: var(--fg-primary); }
  .rail__steps button:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 0; }
  .rail__steps b {
    flex: 0 0 auto; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center;
    border: 1px solid var(--border); font: 500 var(--text-xs) var(--font-mono); color: inherit;
  }
  .rail__steps li.done button { color: var(--fg-primary); }
  .rail__steps li.done b { background: var(--accent-teal-dim); border-color: var(--accent-teal-line); color: var(--accent-teal); }
  .rail__steps li.now button { color: var(--fg-primary); font-weight: 600; }
  .rail__steps li.now b { border-color: var(--accent-gold); color: var(--accent-gold); background: var(--accent-gold-dim); }
  .rail__save { display: flex; align-items: center; gap: var(--space-2); margin: 0; font-size: var(--text-sm); color: var(--fg-secondary); }
  .rail__save i { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-teal); box-shadow: 0 0 0 3px var(--accent-teal-dim); }
  .rail__save.off i { background: var(--fg-subtle); box-shadow: none; }

  /* ── Tarjeta del paso ── */
  .card {
    display: grid; gap: var(--space-5); min-width: 0; scroll-margin-top: calc(var(--nav-h) + var(--space-4));
    background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg);
    padding: var(--space-5) var(--space-4);
    box-shadow: var(--shadow-card);
  }
  .card__head { display: grid; gap: var(--space-2); }
  .card__k { display: none; font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: var(--tracking-wide); color: var(--accent-gold); }
  .card__title { font-family: var(--font-display); font-size: var(--fluid-h4); font-weight: 600; line-height: var(--leading-snug); color: var(--fg-primary); margin: 0; }
  .card__title:focus { outline: none; }
  .card__intro { margin: 0; color: var(--fg-secondary); font-size: var(--text-base); line-height: var(--leading-normal); max-width: 60ch; }
  .card__fields { display: grid; gap: var(--space-6); }
  /* Bloque de preguntas de un servicio elegido (paso 2): su nombre separa el grupo. */
  .blk { margin: 0 0 calc(-1 * var(--space-3)); padding-top: var(--space-5); border-top: 1px solid var(--border-subtle); font-family: var(--font-display); font-size: var(--text-md); font-weight: 600; color: var(--fg-primary); }
  .card__fix { display: flex; align-items: center; gap: var(--space-2); margin: 0; color: color-mix(in srgb, var(--color-error), white 22%); font-size: var(--text-sm); }

  /* Barra del teléfono */
  .mbar { display: grid; gap: var(--space-2); padding-bottom: var(--space-4); border-bottom: 1px solid var(--border-subtle); }
  .mbar__row { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
  .mbar__k { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: var(--tracking-wide); color: var(--accent-gold); }
  .mbar__t { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--fg-secondary); }
  .mbar__seg { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
  .mbar__seg i { height: 3px; border-radius: 3px; background: var(--bg-elevated); }
  .mbar__seg i.on { background: var(--accent-gold); }

  .resume {
    display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3);
    font-size: var(--text-sm); color: var(--fg-secondary);
  }
  .resume__ask { display: inline-flex; gap: var(--space-3); }
  .linkbtn {
    display: inline-flex; align-items: center; gap: 6px; min-height: var(--tap-min); padding: 0 var(--space-1);
    background: transparent; color: var(--fg-primary); font: 600 var(--text-sm) var(--font-body); cursor: pointer;
    text-decoration: underline; text-decoration-color: var(--accent-gold-line); text-underline-offset: 3px;
  }
  .linkbtn:hover { color: var(--accent-gold); }
  .linkbtn:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; border-radius: var(--radius-sm); }
  .linkbtn--danger { color: color-mix(in srgb, var(--color-error), white 22%); }

  .quota { margin: calc(-1 * var(--space-4)) 0 0; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--fg-secondary); }
  .hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }


  /* Revisión */
  .rev { display: grid; gap: var(--space-3); }
  .rev__sec { border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-2); padding: var(--space-3) var(--space-4) var(--space-4); }
  .rev__head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
  .rev__head h3 { margin: 0; font-family: var(--font-display); font-size: var(--text-md); font-weight: 600; color: var(--fg-primary); }
  .rev dl { margin: 0; display: grid; gap: var(--space-3); }
  .rev__row { display: grid; gap: 2px; }
  .rev__grp { margin: var(--space-2) 0 0; padding-top: var(--space-3); border-top: 1px solid var(--border-subtle); font-size: var(--text-sm); font-weight: 600; color: var(--fg-primary); }
  .rev dt { font-size: var(--text-sm); color: var(--fg-secondary); }
  .rev dd { margin: 0; font-size: var(--text-base); color: var(--fg-primary); white-space: pre-line; overflow-wrap: anywhere; }
  .rev__empty { color: color-mix(in srgb, var(--color-error), white 22%) !important; font-size: var(--text-sm) !important; }
  .legal { display: flex; gap: var(--space-2); align-items: flex-start; margin: 0; font-size: var(--text-sm); color: var(--fg-secondary); line-height: var(--leading-normal); }
  .legal :global(svg) { margin-top: 3px; color: var(--accent-teal); }
  .legal a { color: var(--fg-primary); text-decoration: underline; text-decoration-color: var(--accent-gold-line); text-underline-offset: 3px; }
  .legal a:hover { color: var(--accent-gold); }

  /* Acciones: una sola principal (oro) por pantalla */
  .actions { display: flex; flex-wrap: wrap-reverse; align-items: center; gap: var(--space-3); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle); }
  .actions__sp { flex: 1 1 auto; }
  .actions :global(.btn--primary) { flex: 1 1 auto; }
  .desk { display: none; }
  .reassure { margin: calc(-1 * var(--space-3)) 0 0; font-size: var(--text-xs); color: var(--fg-secondary); text-align: right; }
  .senderr { display: grid; gap: var(--space-3); padding: var(--space-4); border-radius: var(--radius-md);
    border: 1px solid color-mix(in srgb, var(--color-error) 35%, transparent); background: color-mix(in srgb, var(--color-error) 9%, transparent); }
  .senderr p { display: flex; gap: var(--space-2); align-items: flex-start; margin: 0; font-size: var(--text-sm); color: var(--fg-primary); line-height: var(--leading-normal); }
  .senderr > p :global(svg) { color: color-mix(in srgb, var(--color-error), white 22%); margin-top: 2px; }
  .senderr__more { color: var(--fg-secondary) !important; }

  /* Éxito */
  .ok {
    display: grid; gap: var(--space-4); max-width: 640px;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg);
    padding: var(--space-6) var(--space-5); box-shadow: var(--shadow-card);
  }
  .ok__mark { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: var(--accent-teal-dim); color: var(--accent-teal); box-shadow: inset 0 0 0 1px var(--accent-teal-line); }
  .ok__title { margin: 0; font-family: var(--font-display); font-size: var(--fluid-h3); font-weight: 600; color: var(--fg-primary); }
  .ok__title:focus { outline: none; }
  .ok__ref { margin: 0; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--accent-gold); }
  .ok__sub { margin: var(--space-2) 0 0; font-size: var(--text-base); font-weight: 600; color: var(--fg-primary); }
  .ok__steps { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
  .ok__steps li { display: grid; grid-template-columns: 28px 1fr; gap: var(--space-3); align-items: start; color: var(--fg-secondary); line-height: var(--leading-normal); }
  .ok__n { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; border: 1px solid var(--accent-gold-line); color: var(--accent-gold); font: 500 var(--text-xs) var(--font-mono); }
  .ok__files, .ok__note { margin: 0; font-size: var(--text-sm); color: var(--fg-secondary); }
  .ok__talk { display: grid; gap: var(--space-3); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle); font-size: var(--text-sm); color: var(--fg-secondary); }

  @media (--md) {
    .card { padding: var(--space-6); }
    .desk { display: inline; }
    .mob { display: none; }
    .actions :global(.btn--primary) { flex: 0 0 auto; }
    .ok { padding: var(--space-7); }
  }
  /* Raíl desde 900 px: el corte lo fija el gate validado (design/brief.md §2);
     no hay token de 900, por eso va escrito aquí. */
  @media (min-width: 900px) {
    .ok { margin-left: calc(216px + var(--space-7)); }
    .bf { grid-template-columns: 216px minmax(0, 1fr); gap: var(--space-7); }
    .rail { display: grid; gap: var(--space-4); position: sticky; top: calc(var(--nav-h) + var(--space-5)); align-content: start; padding-top: var(--space-2); }
    .mbar { display: none; }
    .card__k { display: block; }
  }
  @media (--lg) { .card { padding: var(--space-7); } }
</style>
