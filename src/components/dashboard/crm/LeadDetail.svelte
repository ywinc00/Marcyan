<script>
  // Ficha del lead (#/leads/<ref>, CRM-07): todo lo guardado (mensaje
  // completo e interés por separado, CRM-01), contacto clicable (llamar,
  // WhatsApp, correo), estado sin parpadeo, notas internas, historial,
  // a qué cliente y brief se convirtió, convertir y borrar con confirmación.
  import { onMount } from 'svelte';
  import PageHeader from '../ui/PageHeader.svelte';
  import Card from '../ui/Card.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import Icon from '../ui/Icon.svelte';
  import LeadStatusSelect from './LeadStatusSelect.svelte';
  import ConvertLeadDialog from './ConvertLeadDialog.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { href, route, setSub } from '../lib/router.svelte.js';
  import { fmtDateTime } from '../lib/dates.js';
  import {
    leadStatus, leadSource, phoneHref, whatsappHref, leadEventText, clientName, BRIEF_STATUS, clientStatus,
  } from './crm.js';

  let { refId, autoConvert = false, onchanged } = $props();

  let detail = $state(null);
  let loading = $state(true);
  let error = $state('');
  let notes = $state('');
  let savingNotes = $state(false);
  let convertOpen = $state(false);
  let confirmDelete = $state(false);
  let deleting = $state(false);
  let autoDone = false;   // "Convertido" elegido en la lista: abre la conversión una sola vez

  const lead = $derived(detail?.lead || null);
  const crmReady = $derived(!!detail?.crm_ready);
  const name = $derived(lead ? (lead.name || lead.business_name || lead.email || lead.phone || 'Sin nombre') : '');
  const notesDirty = $derived(lead ? (notes.trim() !== (lead.notes || '').trim()) : false);
  const fullyConverted = $derived(!!(lead?.converted_client_id && lead?.converted_brief_id));

  async function load() {
    loading = true; error = '';
    try {
      const j = await api('/api/admin/leads/' + encodeURIComponent(refId));
      detail = j;
      notes = j.lead?.notes || '';
      if (autoConvert && !autoDone && j.crm_ready) { autoDone = true; convertOpen = true; }
    } catch (e) {
      if (!isSessionError(e)) error = e?.status === 404 ? 'Este lead no existe o ya se borró.' : errorMessage(e, 'No se pudo abrir el lead.');
    } finally { loading = false; }
  }

  function backToList() { setSub([], { keepQuery: true }); }

  function onStatusSaved(l) {
    detail = { ...detail, lead: { ...detail.lead, ...l } };
    // El historial lo escribe el servidor: se recarga en silencio.
    api('/api/admin/leads/' + encodeURIComponent(refId))
      .then((j) => { detail = { ...detail, events: j.events }; })
      .catch((e) => console.warn('[leads] historial', e?.message));
    onchanged?.();
  }

  async function saveNotes() {
    if (!notesDirty || savingNotes) return;
    savingNotes = true;
    try {
      const j = await api('/api/admin/leads/' + encodeURIComponent(refId), { method: 'PATCH', body: { notes } });
      detail = { ...detail, lead: { ...detail.lead, ...j.lead } };
      notes = j.lead?.notes || '';
      toast('Notas guardadas');
      onStatusSaved(j.lead);
    } catch (e) {
      toastError(e, 'No se pudieron guardar las notas.');
    } finally { savingNotes = false; }
  }

  async function doDelete() {
    deleting = true;
    try {
      await api('/api/admin/leads/' + encodeURIComponent(refId), { method: 'DELETE' });
      confirmDelete = false;
      toast(`${refId} borrado`);
      onchanged?.();
      backToList();
    } catch (e) {
      toastError(e, 'No se pudo borrar el lead.');
    } finally { deleting = false; }
  }

  function onConverted() { onchanged?.(); load(); }

  onMount(load);
</script>

<a class="back" href={href('leads', [], route.query)}><span class="flip"><Icon name="chevron" size={16} /></span>Leads</a>

{#if loading && !detail}
  <LoadingState loading={true} label="Abriendo el lead">
    {#snippet skeleton()}
      <div class="ui-skel" style="height:40px;width:40%"></div>
      <div class="sk-grid"><div class="ui-skel" style="height:260px"></div><div class="ui-skel" style="height:260px"></div></div>
    {/snippet}
  </LoadingState>
{:else if error}
  <PageHeader title={refId} />
  <ErrorState title="No se pudo abrir el lead" message={error} onretry={load} />
{:else if lead}
  <PageHeader title={name} subtitle={`${lead.ref_id} · Recibido el ${fmtDateTime(lead.created_at)}`}>
    {#snippet badge()}<StatusChip tone={leadStatus(lead.status).tone} label={leadStatus(lead.status).label} />{/snippet}
    {#snippet actions()}
      <button type="button" class="b b--danger" onclick={() => (confirmDelete = true)}>Borrar</button>
      {#if !fullyConverted}
        <button type="button" class="b b--primary" disabled={!crmReady} title={crmReady ? '' : 'Necesita la actualización de la base de datos'} onclick={() => (convertOpen = true)}>
          {lead.converted_client_id || lead.converted_brief_id ? 'Completar conversión' : 'Convertir'}
        </button>
      {/if}
    {/snippet}
  </PageHeader>

  <div class="grid">
    <div class="col">
      <Card title="Mensaje">
        {#if lead.interest}
          <p class="cap">Interés</p>
          <p class="interest">{lead.interest}</p>
        {/if}
        {#if lead.message}
          {#if lead.interest}<p class="cap cap--gap">Lo que escribió</p>{/if}
          <div class="msg">{lead.message}</div>
        {:else if !lead.interest}
          <EmptyState compact title="Sin mensaje" text="Este lead dejó solo sus datos de contacto." />
        {:else}
          <p class="muted">No dejó un mensaje aparte del interés.</p>
        {/if}
      </Card>

      <Card title="Conversión">
        {#if detail.client || detail.brief || lead.converted_brief_id}
          <ul class="links">
            {#if detail.client}
              <li>
                <span class="links__k">Cliente</span>
                <a class="links__v" href={href('clientes', [detail.client.id])}>{detail.client.client_code} · {clientName(detail.client)}</a>
                {#if detail.client.status !== 'active'}<StatusChip tone="neutral" label={clientStatus(detail.client.status).label} />{/if}
              </li>
            {/if}
            {#if lead.converted_brief_id}
              <li>
                <span class="links__k">Brief</span>
                <a class="links__v" href={href('briefs', [lead.converted_brief_id])}>{lead.converted_brief_id}{detail.brief?.business_name ? ' · ' + detail.brief.business_name : ''}</a>
                {#if detail.brief}<StatusChip tone={(BRIEF_STATUS[detail.brief.status] || {}).tone || 'neutral'} label={(BRIEF_STATUS[detail.brief.status] || {}).label || 'Sin estado'} />{/if}
              </li>
            {/if}
          </ul>
          {#if lead.converted_at}<p class="muted small">Convertido el {fmtDateTime(lead.converted_at)}</p>{/if}
        {:else if !crmReady}
          <p class="muted">Convertir en cliente o brief estará disponible cuando se aplique la actualización de la base de datos.</p>
        {:else}
          <p class="muted">Aún no es cliente ni tiene brief. Usa <strong>Convertir</strong> para crear el cliente, el brief o los dos de una vez.</p>
          {#if detail.client_matches?.length}
            <p class="hint-dup"><Icon name="alert" size={16} /> Su correo o teléfono ya es de {detail.client_matches.length === 1 ? 'un cliente' : 'clientes'}: {detail.client_matches.map((m) => m.client_code + ' ' + clientName(m)).join(', ')}.</p>
          {/if}
        {/if}
      </Card>

      <Card title="Notas internas">
        {#if crmReady}
          <label class="sr-only" for="lead-notes">Notas internas</label>
          <textarea id="lead-notes" class="ui-input notes" rows="4" bind:value={notes} maxlength="10000" placeholder="Qué hablaste, cuándo volver a llamar…" disabled={savingNotes}></textarea>
          <div class="row-end">
            <span class="muted small">Solo las ves tú.</span>
            <button type="button" class="b" disabled={!notesDirty || savingNotes} onclick={saveNotes}>{savingNotes ? 'Guardando…' : 'Guardar notas'}</button>
          </div>
        {:else}
          <p class="muted">Las notas estarán disponibles cuando se aplique la actualización de la base de datos.</p>
        {/if}
      </Card>

      <Card title="Historial">
        <ol class="hist">
          {#each detail.events || [] as ev (ev.id)}
            <li><span class="hist__t">{leadEventText(ev)}</span><span class="hist__d">{fmtDateTime(ev.created_at)}</span></li>
          {/each}
          <li><span class="hist__t">Llegó por {leadSource(lead.source).label}</span><span class="hist__d">{fmtDateTime(lead.created_at)}</span></li>
        </ol>
      </Card>
    </div>

    <aside class="col">
      <Card title="Contacto">
        <dl class="dl">
          <div><dt>Nombre</dt><dd>{lead.name || 'Sin nombre'}</dd></div>
          <div><dt>Negocio</dt><dd>{lead.business_name || 'Sin dato'}</dd></div>
          <div><dt>Correo</dt><dd>{#if lead.email}<a href={'mailto:' + lead.email}>{lead.email}</a>{:else}Sin dato{/if}</dd></div>
          <div><dt>Teléfono</dt><dd>{#if phoneHref(lead.phone)}<a href={'tel:' + phoneHref(lead.phone)}>{lead.phone}</a>{:else}{lead.phone || 'Sin dato'}{/if}</dd></div>
          <div><dt>Ciudad</dt><dd>{lead.city || 'Sin dato'}</dd></div>
          <div><dt>Origen</dt><dd><StatusChip tone={leadSource(lead.source).tone} label={leadSource(lead.source).label} /></dd></div>
          {#if lead.page_url}<div><dt>Página de origen</dt><dd><a href={lead.page_url} target="_blank" rel="noopener noreferrer">{lead.page_url.replace(/^https?:\/\//, '')}</a></dd></div>{/if}
          <div><dt>Actualizado</dt><dd>{fmtDateTime(lead.updated_at)}</dd></div>
          <div class="dl__st"><dt>Estado</dt><dd><LeadStatusSelect {lead} {crmReady} onsaved={onStatusSaved} onconvert={() => (convertOpen = true)} label="Estado del lead" /></dd></div>
        </dl>
        {#if lead.email || phoneHref(lead.phone)}
          <div class="quick">
            {#if phoneHref(lead.phone)}<a class="b b--mini" href={'tel:' + phoneHref(lead.phone)}>Llamar</a>{/if}
            {#if whatsappHref(lead.phone)}<a class="b b--mini" href={whatsappHref(lead.phone)} target="_blank" rel="noopener noreferrer">WhatsApp</a>{/if}
            {#if lead.email}<a class="b b--mini" href={'mailto:' + lead.email}>Escribir</a>{/if}
          </div>
        {/if}
        {#if lead.ip_address || lead.user_agent}
          <details class="tech">
            <summary>Datos técnicos del envío</summary>
            <dl class="dl dl--tight">
              {#if lead.ip_address}<div><dt>Dirección IP</dt><dd>{lead.ip_address}</dd></div>{/if}
              {#if lead.user_agent}<div><dt>Navegador</dt><dd class="wrap">{lead.user_agent}</dd></div>{/if}
            </dl>
          </details>
        {/if}
      </Card>
    </aside>
  </div>

  <ConvertLeadDialog bind:open={convertOpen} {detail} onconverted={onConverted} />
  <ConfirmDialog
    bind:open={confirmDelete}
    title={`Borrar ${lead.ref_id}`}
    message={`Se borrará el lead de ${name} con su mensaje, sus notas y su historial. No se puede deshacer.${lead.converted_client_id || lead.converted_brief_id ? ' El cliente y el brief que se crearon a partir de él se conservan.' : ''}`}
    confirmLabel="Borrar lead"
    busy={deleting}
    onconfirm={doDelete}
  />
{/if}

<style>
  .back { display: inline-flex; align-items: center; gap: 4px; margin-top: var(--space-4); color: var(--fg-secondary); font-size: var(--dash-small); text-decoration: none; min-height: 32px; }
  .back:hover { color: var(--fg-primary); }
  .flip { display: inline-flex; transform: rotate(180deg); }
  .grid { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(300px, 1fr); gap: var(--space-5); align-items: start; }
  .col { display: flex; flex-direction: column; gap: var(--space-5); min-width: 0; }
  .sk-grid { display: grid; grid-template-columns: 1.65fr 1fr; gap: var(--space-5); margin-top: var(--space-5); }
  .cap { margin: 0 0 4px; font-size: var(--dash-caption); font-weight: 500; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-subtle); }
  .cap--gap { margin-top: var(--space-4); }
  .interest { margin: 0; font-size: var(--dash-body); color: var(--fg-primary); line-height: 1.5; }
  .msg { white-space: pre-wrap; word-break: break-word; line-height: 1.6; color: var(--fg-primary); font-size: var(--dash-body); padding: 12px 14px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); max-height: 420px; overflow-y: auto; }
  .muted { margin: 0; color: var(--fg-secondary); font-size: var(--dash-body); line-height: 1.5; }
  .small { font-size: var(--dash-small); color: var(--fg-subtle); margin-top: var(--space-3); }
  .links { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .links li { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
  .links__k { width: 56px; flex: 0 0 auto; font-size: var(--dash-caption); text-transform: uppercase; letter-spacing: var(--tracking-wide); color: var(--fg-subtle); }
  .links__v { color: var(--fg-primary); font-weight: 500; text-decoration: none; }
  .links__v:hover { text-decoration: underline; }
  .hint-dup { display: flex; gap: 8px; align-items: flex-start; margin: var(--space-3) 0 0; font-size: var(--dash-small); color: var(--fg-secondary); line-height: 1.45; }
  .hint-dup :global(.ui-icon) { color: var(--color-warning); flex: 0 0 auto; margin-top: 1px; }
  .notes { resize: vertical; min-height: 96px; line-height: 1.5; }
  .row-end { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-top: var(--space-3); }
  .row-end .small { margin: 0; }
  .hist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .hist li { display: flex; justify-content: space-between; gap: var(--space-3); padding: 10px 0; border-bottom: 1px solid var(--border-subtle); font-size: var(--dash-small); }
  .hist li:last-child { border-bottom: 0; padding-bottom: 0; }
  .hist li:first-child { padding-top: 0; }
  .hist__t { color: var(--fg-primary); }
  .hist__d { color: var(--fg-subtle); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .dl { margin: 0; display: flex; flex-direction: column; }
  .dl > div { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: var(--space-3); align-items: center; padding: 9px 0; border-bottom: 1px solid var(--border-subtle); }
  .dl > div:first-child { padding-top: 0; }
  .dl > div:last-child { border-bottom: 0; }
  .dl dt { font-size: var(--dash-small); color: var(--fg-subtle); }
  .dl dd { margin: 0; font-size: var(--dash-body); color: var(--fg-primary); min-width: 0; overflow-wrap: anywhere; }
  .dl dd a { color: var(--fg-primary); text-decoration: underline; text-decoration-color: var(--border-strong); text-underline-offset: 3px; }
  .dl dd a:hover { text-decoration-color: currentColor; }
  .dl--tight > div { padding: 6px 0; }
  .wrap { font-size: var(--dash-caption) !important; color: var(--fg-secondary) !important; }
  .quick { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-4); }
  .tech { margin-top: var(--space-4); border-top: 1px solid var(--border-subtle); padding-top: var(--space-3); }
  .tech summary { cursor: pointer; font-size: var(--dash-small); color: var(--fg-secondary); min-height: 32px; display: flex; align-items: center; }
  .tech summary:hover { color: var(--fg-primary); }
  @media (max-width: 1099px) {
    .grid, .sk-grid { grid-template-columns: minmax(0, 1fr); }
    aside.col { order: -1; }
  }
  @media (max-width: 719px) {
    .dl > div { grid-template-columns: 96px minmax(0, 1fr); }
    .row-end { flex-wrap: wrap; }
  }
</style>
