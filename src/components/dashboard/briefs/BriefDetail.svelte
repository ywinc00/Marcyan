<script>
  // Ficha del brief (#/briefs/<MRC>). Una sola acción principal: "Descargar
  // kit" (el .zip para arrancar el proyecto). "Ver ficha" y "Descargar ficha"
  // (el documento HTML) quedan como secundarias. Las dos descargas pasan por
  // download.js para que un fallo nunca quede mudo. Columna de trabajo: archivos y el brief por
  // secciones del esquema único; columna lateral: estado, kit de arranque,
  // cliente, correo e historial con notas. En móvil lo operativo va ARRIBA
  // (estado, kit, cliente) y la comunicación al final (CRM-21).
  import { untrack, onDestroy } from 'svelte';
  import { api } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { fmtDate, fmtDateTime, rel } from '../lib/dates.js';
  import { route, href, navigate } from '../lib/router.svelte.js';
  import PageHeader from '../ui/PageHeader.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import Field from '../ui/Field.svelte';
  import Icon from '../ui/Icon.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import BriefFields from './BriefFields.svelte';
  import BriefFiles from './BriefFiles.svelte';
  import BriefHistory from './BriefHistory.svelte';
  import KitDialog from './KitDialog.svelte';
  import ConvertDialog from './ConvertDialog.svelte';
  import { initials, avatarColor } from './avatar.js';
  import {
    STATUSES, statusLabel, statusTone, SOURCE_LABEL, LANG_LABEL,
    viewSections, editDraft, changedFields, contactLinks, kitState,
    valuePills, FIELDS, kitReceived, fmtSize, isLegacyBrief,
  } from './brief-panel.js';
  import { downloadFile } from './download.js';

  let { pid } = $props();

  // ── Carga ────────────────────────────────────────────────────
  let brief = $state(null);
  let data = $state({});
  let client = $state(null);
  let loading = $state(true);
  let error = $state('');
  let notFound = $state(false);
  let history = $state(null);
  let fileCount = $state(0);

  async function load() {
    loading = true; error = ''; notFound = false;
    try {
      const j = await api('/api/admin/briefs/' + encodeURIComponent(pid));
      apply(j, { keepStatus: false });
    } catch (e) {
      notFound = e.status === 404;
      error = e.message;
    } finally { loading = false; }
  }
  // keepStatus: tras guardar campos, lo que el usuario había tocado en
  // Estado y Resumen sin guardar se conserva (revisión A3-08).
  function apply(j, { keepStatus = statusDirty } = {}) {
    if (!brief) { const saved = readSavedDraft(); if (saved && saved.changes && Object.keys(saved.changes).length) recovered = saved; }
    brief = j.brief;
    data = j.data || j.brief || {};
    if ('client' in j) client = j.client || null;
    if (!keepStatus) {
      statusSel = j.brief.status;
      summaryVal = j.brief.summary || '';
    }
  }
  $effect(() => { if (pid) untrack(load); });

  const kit = $derived(kitState(brief));
  const links = $derived(contactLinks(data));
  const services = $derived(Array.isArray(data.services) ? data.services : []);
  const lang = $derived(brief?.lang || (data.language === 'en' ? 'en' : 'es'));
  const listHref = $derived(href('briefs', [], route.query));
  const docUrl = $derived('/api/admin/briefs/' + encodeURIComponent(pid) + '/document');
  const kitUrl = $derived('/api/admin/briefs/' + encodeURIComponent(pid) + '/kit');

  // ── Edición: solo lo que cambia (CRM-09) ────────────────────
  let edit = $state(false);
  let draft = $state({});
  let original = {};
  let fieldErrors = $state({});
  let saving = $state(false);
  // Origen honesto de cada dato (revisión A3-01): lo del formulario anterior
  // o del chat no se presenta como kit de arranque.
  const fromKit = $derived(kitReceived(brief));
  const sections = $derived(viewSections(data, { edit, kitReceived: fromKit, legacy: isLegacyBrief(brief) }));
  const inicial = $derived(sections.filter((s) => s.moment === 'inicial'));
  const anterior = $derived(sections.filter((s) => s.moment === 'anterior'));
  const arranque = $derived(sections.filter((s) => s.moment === 'arranque'));
  const anteriorNote = $derived(brief?.source === 'chat' ? 'lo que contó el cliente en el chat del sitio' : 'lo que contó el cliente en el formulario');
  const changes = $derived(edit ? changedFields(original, draft) : {});
  const changeCount = $derived(Object.keys(changes).length);
  const dirty = $derived(edit && changeCount > 0);

  function startEdit() {
    original = { ...data };
    draft = editDraft(data, viewSections(data, { edit: true, kitReceived: fromKit }));
    fieldErrors = {};
    edit = true;
  }
  function stopEdit() { edit = false; draft = {}; fieldErrors = {}; }
  function cancelEdit() {
    if (dirty) { pendingLeave = null; leaveOpen = true; return; }
    stopEdit();
  }
  async function saveEdit() {
    if (!changeCount || saving) { if (!changeCount) stopEdit(); return; }
    saving = true; fieldErrors = {};
    try {
      const j = await api('/api/admin/briefs/' + encodeURIComponent(pid), { method: 'PATCH', body: { fields: changes } });
      apply(j);
      clearSavedDraft();
      const n = (j.changes && j.changes.fields || []).length;
      stopEdit();
      toast(n ? `${n} ${n === 1 ? 'campo guardado' : 'campos guardados'}` : 'No había cambios que guardar');
      history?.reload();
    } catch (e) {
      if (e.data && e.data.errors) {
        fieldErrors = e.data.errors;
        toast('Revisa los campos marcados.', { tone: 'error' });
      } else toastError(e, 'No se pudieron guardar los cambios.');
    } finally { saving = false; }
  }

  // ── Aviso de cambios sin guardar ─────────────────────────────
  // · Cerrar o recargar la pestaña: aviso del navegador (beforeunload).
  // · Cualquier enlace del panel (menú, "Briefs", avisos): se intercepta el
  //   clic antes de que cambie la URL y se pregunta.
  // · Atrás del navegador o un cambio de URL que no pasa por un enlace: no
  //   se puede frenar sin pelear con el enrutador, así que los cambios se
  //   guardan como borrador en esta pestaña y al volver se ofrece recuperarlos.
  let leaveOpen = $state(false);
  let pendingLeave = null;     // hash al que se quería ir (null = solo salir de edición)
  const DRAFT_KEY = () => 'orbit:brief-draft:' + pid;
  function onBeforeUnload(e) { e.preventDefault(); e.returnValue = ''; }
  function onDocClick(e) {
    if (!dirty || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const raw = a.getAttribute('href') || '';
    if (!raw.startsWith('#') || raw === window.location.hash) return;
    e.preventDefault();
    e.stopPropagation();
    pendingLeave = raw;
    leaveOpen = true;
  }
  $effect(() => {
    if (!dirty) return;
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onDocClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onDocClick, true);
    };
  });

  // Borrador de respaldo (solo esta pestaña; si el almacenamiento falla, no pasa nada).
  let recovered = $state(null);   // { changes, at } guardado al salir sin guardar
  function readSavedDraft() {
    try { const v = sessionStorage.getItem(DRAFT_KEY()); return v ? JSON.parse(v) : null; } catch (_) { return null; }
  }
  function clearSavedDraft() { try { sessionStorage.removeItem(DRAFT_KEY()); } catch (_) { /* sin almacenamiento: nada que limpiar */ } }
  function recoverDraft() {
    const saved = recovered;
    recovered = null;
    clearSavedDraft();
    if (!saved || !saved.changes) return;
    startEdit();
    for (const [k, v] of Object.entries(saved.changes)) if (k in draft) draft[k] = v;
  }
  function dropDraft() { recovered = null; clearSavedDraft(); }

  function discardAndLeave() {
    const target = pendingLeave;
    leaveOpen = false;
    stopEdit();
    pendingLeave = null;
    if (target) queueMicrotask(() => { window.location.hash = target; });
  }

  // ── Estado y resumen ─────────────────────────────────────────
  let statusSel = $state('');
  let summaryVal = $state('');
  let savingStatus = $state(false);
  const statusDirty = $derived(!!brief && (statusSel !== brief.status || summaryVal !== (brief.summary || '')));
  async function saveStatus() {
    if (!statusDirty || savingStatus) return;
    savingStatus = true;
    try {
      const j = await api('/api/admin/briefs/' + encodeURIComponent(pid), { method: 'PATCH', body: { status: statusSel, summary: summaryVal } });
      apply(j, { keepStatus: false });
      // Al completar, el servidor crea o vincula el cliente solo (changes.client).
      const auto = j.changes && j.changes.client;
      if (auto && auto.client) {
        client = auto.client;
        toast(`Estado guardado. ${auto.created ? 'Ya es cliente' : 'Vinculado al cliente'} ${auto.client.client_code || ''}`.trim());
      } else {
        toast('Estado guardado');
      }
      history?.reload();
    } catch (e) { toastError(e, 'No se pudo guardar el estado.'); }
    finally { savingStatus = false; }
  }

  // ── Kit de arranque y cliente ────────────────────────────────
  let kitOpen = $state(false);
  let convertOpen = $state(false);
  function onKitIssued(j) {
    if (brief) brief = { ...brief, kit_status: j.kitStatus || brief.kit_status, kit_sent_at: new Date().toISOString() };
    history?.reload();
  }
  function onConverted(j) {
    client = j.client || client;
    toast(j.already ? `Este brief ya era el cliente ${j.client?.client_code || ''}`.trim()
      : j.created ? `Cliente ${j.client?.client_code || ''} creado`.replace('  ', ' ') : `Vinculado a ${j.client?.client_code || 'el cliente'}`);
    history?.reload();
  }
  function openDocument() { window.open(docUrl, '_blank', 'noopener'); }

  // ── Descargas (kit .zip y ficha .html) ───────────────────────
  // Se piden con fetch: si fallan (sesión caducada, brief borrado, error del
  // servidor o red cortada) el panel lo dice y el botón queda para reintentar.
  let downloading = $state('');   // '' | 'kit' | 'doc'
  let downloaded = $state(0);     // bytes recibidos (para el texto del botón)
  async function download(kind) {
    if (downloading) return;
    downloading = kind; downloaded = 0;
    try {
      if (kind === 'kit') {
        await downloadFile(kitUrl, { fallbackName: `kit-${pid}.zip`, onprogress: (n) => (downloaded = n) });
        toast('Kit descargado');
        history?.reload();
      } else {
        await downloadFile(docUrl + '?download=1', { fallbackName: `brief-${pid}.html` });
        toast('Ficha descargada');
      }
    } catch (e) {
      toastError(e, kind === 'kit' ? 'No se pudo descargar el kit. Inténtalo de nuevo.' : 'No se pudo descargar la ficha. Inténtalo de nuevo.');
    } finally { downloading = ''; }
  }
  const kitLabel = $derived(downloading !== 'kit' ? 'Descargar kit'
    : downloaded ? `Descargando ${fmtSize(downloaded)}…` : 'Preparando el kit…');

  // ── Correo al cliente ────────────────────────────────────────
  let emailSubject = $state('');
  let emailBody = $state('');
  let emailConfirm = $state(false);
  let sendingEmail = $state(false);
  function askSend() {
    if (!emailSubject.trim() || !emailBody.trim()) { toast('Escribe el asunto y el mensaje.', { tone: 'error' }); return; }
    emailConfirm = true;
  }
  async function sendEmail() {
    sendingEmail = true;
    try {
      await api('/api/admin/briefs/' + encodeURIComponent(pid) + '/email', { method: 'POST', body: { subject: emailSubject, body: emailBody } });
      emailConfirm = false; emailSubject = ''; emailBody = '';
      toast('Correo enviado');
      history?.reload();
    } catch (e) { toastError(e, 'No se pudo enviar el correo.'); }
    finally { sendingEmail = false; }
  }

  // ── Eliminar ─────────────────────────────────────────────────
  let deleteOpen = $state(false);
  let deleting = $state(false);
  async function doDelete() {
    deleting = true;
    try {
      await api('/api/admin/briefs/' + encodeURIComponent(pid), { method: 'DELETE' });
      deleteOpen = false;
      toast(`Brief ${pid} eliminado`);
      navigate('briefs', [], route.query);
    } catch (e) { toastError(e, 'No se pudo eliminar el brief.'); }
    finally { deleting = false; }
  }
  const deleteMessage = $derived(
    `Se borran el brief ${pid}, todo su historial y ${fileCount ? (fileCount === 1 ? 'su archivo' : `sus ${fileCount} archivos`) : 'sus archivos'}. `
    + (client ? `El cliente ${client.client_code || ''} no se borra, pero deja de tener este brief vinculado. `.replace('  ', ' ') : '')
    + 'No se puede deshacer.');

  onDestroy(() => {
    window.removeEventListener('beforeunload', onBeforeUnload);
    document.removeEventListener('click', onDocClick, true);
    if (dirty) {
      try { sessionStorage.setItem(DRAFT_KEY(), JSON.stringify({ changes: $state.snapshot(changes), at: Date.now() })); }
      catch (_) { /* sin almacenamiento: el aviso de salida ya avisó */ }
    }
  });
</script>

<a class="back" href={listHref}><Icon name="back" size={16} />Briefs</a>

{#if loading && !brief}
  <LoadingState loading={true} label="Abriendo el brief">
    {#snippet skeleton()}
      <div class="ui-skel" style="height:64px;max-width:520px"></div>
      <div class="layout"><div class="ui-skel" style="height:420px"></div><div class="ui-skel" style="height:300px"></div></div>
    {/snippet}
  </LoadingState>
{:else if error && !brief}
  {#if notFound}
    <div class="ui-card">
      <EmptyState title="Este brief no existe" text={`No encontramos ${pid}. Puede que se haya eliminado o que el enlace esté mal escrito.`}>
        {#snippet action()}<a class="b" href={listHref}>Ver todos los briefs</a>{/snippet}
      </EmptyState>
    </div>
  {:else}
    <ErrorState title="No se pudo abrir el brief" message={error} onretry={load} />
  {/if}
{:else if brief}
  <div class="head">
  <PageHeader title={data.business_name || 'Sin nombre de negocio'}>
    {#snippet badge()}<StatusChip tone={statusTone(brief.status)} label={statusLabel(brief.status)} />{/snippet}
    {#snippet actions()}
      <button class="b" type="button" onclick={openDocument}><Icon name="eye" size={16} />Ver ficha</button>
      <button class="b" type="button" onclick={() => download('doc')} disabled={downloading === 'doc'} aria-busy={downloading === 'doc'} title="Descarga el documento .html"><Icon name="download" size={16} />{downloading === 'doc' ? 'Descargando…' : 'Descargar ficha'}</button>
      {#if !edit}<button class="b" type="button" onclick={startEdit}><Icon name="edit" size={16} />Editar</button>{/if}
      <button class="b b--danger" type="button" onclick={() => (deleteOpen = true)} aria-label="Eliminar brief"><Icon name="trash" size={16} />Eliminar</button>
      <button class="b kitbtn" class:b--primary={!edit} type="button" onclick={() => download('kit')} disabled={downloading === 'kit'} aria-busy={downloading === 'kit'}><Icon name="download" size={16} />{kitLabel}</button>
    {/snippet}
  </PageHeader>
  </div>

  <div class="idrow">
    <span class="avatar" style="background:{avatarColor(data.business_name)}" aria-hidden="true">{initials(data.business_name)}</span>
    <div class="idrow__txt">
      <p class="idrow__main"><span class="mono">{brief.project_id}</span>
        {#if data.owner_name}<span>{data.owner_name}</span>{/if}
        <span class="soft" title={fmtDateTime(brief.created_at)}>Recibido {rel(brief.created_at)}</span>
      </p>
      <p class="idrow__chips">
        <span class="meta">{SOURCE_LABEL[brief.source] || 'Formulario'}</span>
        {#if brief.lang}<span class="meta">En {LANG_LABEL[brief.lang].toLowerCase()}</span>{/if}
        {#if brief.contacted_at}<span class="meta meta--soft">Contactado {fmtDate(brief.contacted_at)}</span>{/if}
        {#if brief.completed_at}<span class="meta meta--soft">Completado {fmtDate(brief.completed_at)}</span>{/if}
      </p>
    </div>
  </div>

  {#if links.length}
    <ul class="contacts" aria-label="Contactar">
      {#each links as l (l.kind)}
        <li><a class="contact" href={l.href} target={l.external ? '_blank' : undefined} rel={l.external ? 'noopener noreferrer' : undefined}>
          <Icon name={l.icon} size={16} /><span class="contact__l">{l.label}</span><span class="contact__d">{l.detail}</span>
        </a></li>
      {/each}
    </ul>
  {/if}

  {#if services.length}
    <p class="services"><span class="services__l">Servicios</span>{#each valuePills(FIELDS.get('services'), services) as s, i (i)}<span class="tag">{s}</span>{/each}</p>
  {/if}

  <div class="layout">
    <!-- Operación: estado, kit de arranque, cliente -->
    <div class="ops">
      <section class="ui-card side" aria-labelledby="st-title">
        <h2 class="side__title" id="st-title">Estado</h2>
        <Field label="Estado del brief">
          {#snippet children(f)}
            <select class="ui-input" id={f.id} bind:value={statusSel}>
              {#each STATUSES as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
            </select>
          {/snippet}
        </Field>
        <Field label="Resumen del proyecto" hint="Qué se hizo o se acordó. Sale en la ficha.">
          {#snippet children(f)}
            <textarea class="ui-input area" id={f.id} rows="3" aria-describedby={f.describedby} bind:value={summaryVal}></textarea>
          {/snippet}
        </Field>
        <button class="b full" type="button" disabled={!statusDirty || savingStatus} onclick={saveStatus}>{savingStatus ? 'Guardando…' : 'Guardar estado'}</button>
      </section>

      <section class="ui-card side" aria-labelledby="kit-title">
        <div class="side__head">
          <h2 class="side__title" id="kit-title">Kit de arranque</h2>
          <StatusChip tone={kit.tone} label={kit.label} />
        </div>
        <p class="side__text">{kit.text}</p>
        {#if kit.sentAt || kit.submittedAt}
          <p class="side__meta">{[kit.sentAt && `Enlace enviado el ${fmtDate(kit.sentAt)}`, kit.submittedAt && `recibido el ${fmtDate(kit.submittedAt)}`].filter(Boolean).join(', ')}</p>
        {/if}
        {#if kit.available}
          <button class="b full" type="button" onclick={() => (kitOpen = true)}><Icon name="send" size={16} />{kit.id === 'none' ? 'Enviar kit de arranque al cliente' : kit.id === 'submitted' ? 'Reabrir o reenviar el kit' : 'Reenviar el enlace del kit'}</button>
        {:else}
          <p class="side__meta">Para enviarlo falta aplicar la actualización 010 de la base de datos.</p>
        {/if}
      </section>

      <section class="ui-card side" aria-labelledby="cli-title">
        <h2 class="side__title" id="cli-title">Cliente</h2>
        {#if client}
          <!-- Clientes (A2) abre la ficha por su id numérico: #/clientes/<id>. -->
          <a class="clientlink" href={href('clientes', [client.id])}>
            <Icon name="user" size={16} />
            <span class="clientlink__t"><span class="mono">{client.client_code}</span> {client.business_name || ''}</span>
            <Icon name="chevron" size={16} />
          </a>
        {:else}
          <p class="side__text">Cuando contrate, conviértelo en cliente para facturarle y seguir su proyecto.</p>
          <button class="b full" type="button" onclick={() => (convertOpen = true)}><Icon name="user" size={16} />Convertir en cliente</button>
        {/if}
      </section>
    </div>

    <!-- Trabajo: archivos y el brief por secciones -->
    <div class="main">
      {#if edit}
        <div class="editbar" role="region" aria-label="Edición del brief">
          <span class="editbar__t"><Icon name="edit" size={16} />{changeCount ? `${changeCount} ${changeCount === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}` : 'Editando el brief'}</span>
          <span class="editbar__a">
            <button class="b" type="button" onclick={cancelEdit} disabled={saving}>Cancelar</button>
            <button class="b b--primary" type="button" onclick={saveEdit} disabled={saving || !changeCount}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
          </span>
        </div>
      {/if}

      {#if recovered && !edit}
        <div class="recover" role="status">
          <span><Icon name="alert" size={16} />Dejaste {Object.keys(recovered.changes).length === 1 ? 'un cambio' : `${Object.keys(recovered.changes).length} cambios`} sin guardar en este brief.</span>
          <span class="recover__a">
            <button class="b b--mini" type="button" onclick={dropDraft}>Descartar</button>
            <button class="b b--mini" type="button" onclick={recoverDraft}>Recuperar</button>
          </span>
        </div>
      {/if}

      <BriefFields sections={inicial} {edit} bind:draft errors={fieldErrors} />

      <BriefFiles {pid} onloaded={(f) => (fileCount = f.length)} onpurged={() => history?.reload()} />

      {#if anterior.length}
        <h2 class="part">Más datos del brief <span class="part__s">{anteriorNote}</span></h2>
        <BriefFields sections={anterior} {edit} bind:draft errors={fieldErrors} />
      {/if}

      {#if arranque.length}
        <h2 class="part">Kit de arranque <span class="part__s">lo que completó el cliente al contratar</span></h2>
        <BriefFields sections={arranque} {edit} bind:draft errors={fieldErrors} />
      {/if}
    </div>

    <!-- Comunicación: correo e historial -->
    <div class="comms">
      <section class="ui-card side" aria-labelledby="mail-title">
        <h2 class="side__title" id="mail-title">Correo al cliente</h2>
        {#if data.email}
          <label class="ui-field"><span class="ui-field__label">Asunto</span>
            <input class="ui-input" type="text" maxlength="200" bind:value={emailSubject} /></label>
          <label class="ui-field"><span class="ui-field__label">Mensaje</span>
            <textarea class="ui-input area" rows="4" maxlength="10000" bind:value={emailBody}></textarea></label>
          <button class="b full" type="button" onclick={askSend} disabled={sendingEmail}><Icon name="mail" size={16} />Enviar a {data.email}</button>
        {:else}
          <p class="side__text">Este brief no tiene correo. Usa el teléfono o WhatsApp de arriba.</p>
        {/if}
      </section>
      <BriefHistory {pid} bind:this={history} />
    </div>
  </div>

  <KitDialog bind:open={kitOpen} {pid} email={data.email || ''} {lang} {kit} onissued={onKitIssued} />
  <ConvertDialog bind:open={convertOpen} {pid} {data} onconverted={onConverted} />
  <ConfirmDialog bind:open={emailConfirm} title="¿Enviar el correo?" danger={false} confirmLabel="Enviar"
    message={`Se envía "${emailSubject.trim()}" a ${data.email || 'el cliente'}. Queda guardado en el historial.`}
    busy={sendingEmail} onconfirm={sendEmail} />
  <ConfirmDialog bind:open={deleteOpen} title="Eliminar brief" confirmLabel="Eliminar para siempre"
    message={deleteMessage} requireText={pid} busy={deleting} onconfirm={doDelete} />
  <ConfirmDialog bind:open={leaveOpen} title="¿Salir sin guardar?" confirmLabel="Descartar cambios"
    message={`Tienes ${changeCount} ${changeCount === 1 ? 'cambio sin guardar' : 'cambios sin guardar'} en este brief. Si sales, se pierden.`}
    onconfirm={discardAndLeave} oncancel={() => (pendingLeave = null)} />
{/if}

<style>
  .back { display: inline-flex; align-items: center; gap: 4px; margin: var(--space-4) 0 0; padding: 6px 0; min-height: 32px; color: var(--fg-secondary); font-size: var(--dash-small); font-weight: 500; text-decoration: none; }
  .back:hover { color: var(--fg-primary); }
  @media (pointer: coarse) { .back { min-height: var(--tap-min); } }

  .idrow { display: flex; align-items: center; gap: 12px; margin: calc(-1 * var(--space-2)) 0 var(--space-4); }
  .avatar { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; flex-shrink: 0; border-radius: var(--radius-md); color: #fff; font-family: var(--font-display); font-weight: 700; font-size: 15px; }
  .idrow__txt { min-width: 0; }
  .idrow__main { margin: 0; display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: var(--dash-body); color: var(--fg-primary); }
  .idrow__chips { margin: 6px 0 0; display: flex; flex-wrap: wrap; gap: 6px; }
  .mono { font-family: var(--font-mono); font-size: var(--dash-small); font-variant-numeric: tabular-nums; color: var(--fg-secondary); }
  .soft { color: var(--fg-subtle); }
  .meta { display: inline-flex; align-items: center; padding: 2px 9px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-pill); font-size: var(--dash-caption); color: var(--fg-secondary); }
  .meta--soft { background: transparent; color: var(--fg-subtle); }

  .contacts { list-style: none; margin: 0 0 var(--space-3); padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
  .contact { display: inline-flex; align-items: center; gap: 8px; min-height: 36px; padding: 6px 12px; max-width: 100%; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-card); color: var(--fg-primary); text-decoration: none; font-size: var(--dash-small); transition: border-color var(--duration-fast), background-color var(--duration-fast); }
  .contact:hover { border-color: var(--border-strong); background: var(--bg-elevated); }
  .contact :global(.ui-icon) { color: var(--accent-teal); flex: 0 0 auto; }
  .contact__l { font-weight: 500; }
  .contact__d { color: var(--fg-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  @media (pointer: coarse) { .contact { min-height: var(--tap-min); } }
  .services { margin: 0 0 var(--space-4); display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .services__l { font-size: var(--dash-small); color: var(--fg-subtle); margin-right: 4px; }
  .tag { padding: 2px 9px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-pill); font-size: var(--dash-caption); color: var(--fg-secondary); }

  /* Escritorio: trabajo a la izquierda; operación arriba y comunicación
     debajo a la derecha. */
  .layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; grid-template-areas: "main ops" "main comms"; grid-template-rows: auto 1fr; gap: 14px var(--space-5); align-items: start; margin-top: var(--space-2); }
  .ops { grid-area: ops; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  .main { grid-area: main; min-width: 0; }
  .comms { grid-area: comms; display: flex; flex-direction: column; gap: 14px; min-width: 0; }

  .side { display: flex; flex-direction: column; gap: var(--space-3); }
  .side__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .side__title { margin: 0; font-size: var(--dash-card-title); font-weight: 600; color: var(--fg-primary); letter-spacing: -0.01em; }
  .side__text { margin: 0; font-size: var(--dash-small); color: var(--fg-secondary); line-height: 1.5; }
  .side__meta { margin: 0; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .area { resize: vertical; min-height: 76px; line-height: 1.5; }
  .b.full { white-space: normal; text-align: center; }
  .clientlink { display: flex; align-items: center; gap: 10px; padding: 10px 12px; min-height: 44px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-elevated); color: var(--fg-primary); text-decoration: none; font-size: var(--dash-small); }
  .clientlink:hover { border-color: var(--border-strong); }
  .clientlink :global(.ui-icon) { color: var(--fg-subtle); flex: 0 0 auto; }
  .clientlink__t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .editbar { position: sticky; top: 8px; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 10px 12px 10px 14px; margin-bottom: 14px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: var(--radius-md); box-shadow: var(--shadow-modal); }
  .editbar__t { display: inline-flex; align-items: center; gap: 8px; font-size: var(--dash-small); font-weight: 500; color: var(--fg-primary); }
  .editbar__a { display: flex; gap: 8px; }

  .recover { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 10px 12px 10px 14px; margin-bottom: 14px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-warning) 9%, transparent); border: 1px solid color-mix(in srgb, var(--color-warning) 28%, transparent); font-size: var(--dash-small); color: var(--fg-primary); }
  .recover > span:first-child { display: inline-flex; align-items: center; gap: 8px; }
  .recover :global(.ui-icon) { color: var(--color-warning); }
  .recover__a { display: flex; gap: 6px; }
  .part { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; margin: var(--space-5) 0 var(--space-3); font-size: var(--dash-small); font-weight: 600; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-subtle); }
  .part__s { font-weight: 400; letter-spacing: 0; text-transform: none; }

  @media (max-width: 1099px) {
    .layout { grid-template-columns: minmax(0, 1fr) 300px; }
  }
  /* Móvil y tableta: lo operativo primero, el brief después, y al final
     correo e historial (CRM-21: nada importante al fondo de 8 secciones). */
  @media (max-width: 879px) {
    .layout { grid-template-columns: minmax(0, 1fr); grid-template-areas: "ops" "main" "comms"; grid-template-rows: none; }
  }
  /* Con la barra superior móvil (< 900 px) la barra de edición queda debajo de ella. */
  @media (max-width: 899px) {
    .editbar { top: calc(var(--mobilebar-h, 56px) + var(--safe-top, 0px) + 8px); }
  }
  @media (max-width: 719px) {
    .side { padding: 16px; }
    /* Móvil: la acción principal arriba y a lo ancho; las secundarias debajo
       en dos columnas (ficha: ver y descargar; luego editar y eliminar). */
    .head :global(.ui-page-head__actions) { display: grid; grid-template-columns: 1fr 1fr; width: 100%; }
    .head :global(.kitbtn) { grid-column: 1 / -1; order: -1; }
    .editbar__a { flex: 1; }
    .editbar__a .b--primary { flex: 1; }
    /* Contactos: botones compactos en dos columnas (el dato ya está en la ficha). */
    .contacts { display: grid; grid-template-columns: 1fr 1fr; }
    .contact { justify-content: center; width: 100%; }
    .contact__d { display: none; }
  }
</style>
