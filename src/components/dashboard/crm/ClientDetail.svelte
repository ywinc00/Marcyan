<script>
  // Ficha del cliente (#/clientes/<id>, CRM-03): datos de contacto editables,
  // lo facturado, cobrado y pendiente, sus proyectos, facturas, briefs y
  // leads de origen. ARCHIVAR en vez de borrar (CRM-13): el borrado
  // definitivo solo aparece con el cliente archivado, pide escribir su
  // nombre y dice exactamente qué se pierde.
  import { onMount } from 'svelte';
  import PageHeader from '../ui/PageHeader.svelte';
  import KpiGrid from '../ui/KpiGrid.svelte';
  import Kpi from '../ui/Kpi.svelte';
  import Card from '../ui/Card.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import Icon from '../ui/Icon.svelte';
  import ClientFields from './ClientFields.svelte';
  import DuplicateNotice from './DuplicateNotice.svelte';
  import { api, ApiError, errorMessage, isSessionError } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { href, route, setSub, navigate } from '../lib/router.svelte.js';
  import { fmtDate, fmtDay } from '../lib/dates.js';
  import {
    clientName, clientStatus, money, phoneHref, whatsappHref, deleteImpactText,
    PROJECT_STATUS, INVOICE_STATUS, BRIEF_STATUS, leadStatus, leadSource,
  } from './crm.js';

  let { clientId, onchanged } = $props();

  let client = $state(null);
  let related = $state(null);
  let loading = $state(true);
  let error = $state('');
  let values = $state({});
  let errors = $state({});
  let dupMatches = $state([]);
  let saving = $state(false);
  let confirmArchive = $state(false);
  let archiving = $state(false);
  let confirmDelete = $state(false);
  let deleting = $state(false);

  const FIELDS = ['business_name', 'owner_name', 'email', 'phone', 'city_state', 'notes', 'status'];
  const norm = (v) => (v == null ? '' : String(v).trim());
  const dirty = $derived(!!client && FIELDS.some((k) => norm(values[k]) !== norm(client[k])));
  const name = $derived(clientName(client));
  const archived = $derived(client?.status === 'archived');

  function resetForm(c) {
    values = Object.fromEntries(FIELDS.map((k) => [k, c[k] ?? '']));
    errors = {}; dupMatches = [];
  }

  async function load() {
    loading = true; error = '';
    try {
      const j = await api('/api/admin/clients/' + encodeURIComponent(clientId));
      client = j.client; related = j.related || null;
      resetForm(j.client);
    } catch (e) {
      if (!isSessionError(e)) error = e?.status === 404 || e?.status === 400 ? 'Este cliente no existe o ya se borró.' : errorMessage(e, 'No se pudo abrir el cliente.');
    } finally { loading = false; }
  }

  async function save(allowDuplicate = false) {
    if (!dirty || saving) return;
    errors = {};
    const body = {};
    for (const k of FIELDS) if (norm(values[k]) !== norm(client[k])) body[k] = values[k];
    if (allowDuplicate) body.allow_duplicate = true;
    saving = true;
    try {
      const j = await api('/api/admin/clients/' + encodeURIComponent(clientId), { method: 'PATCH', body });
      client = j.client; resetForm(j.client);
      toast('Cambios guardados');
      onchanged?.();
    } catch (e) {
      const d = e instanceof ApiError ? e.data : null;
      if (d?.reason === 'duplicate' && d.matches?.length) dupMatches = d.matches;
      else if (d?.fields) errors = d.fields;
      else toastError(e, 'No se pudieron guardar los cambios.');
    } finally { saving = false; }
  }

  async function setStatus(status) {
    archiving = true;
    try {
      const j = await api('/api/admin/clients/' + encodeURIComponent(clientId), { method: 'PATCH', body: { status } });
      client = j.client; resetForm(j.client);
      confirmArchive = false;
      toast(status === 'archived' ? `${name} archivado` : `${name} reactivado`);
      onchanged?.();
    } catch (e) {
      toastError(e, 'No se pudo cambiar el estado del cliente.');
    } finally { archiving = false; }
  }

  async function doDelete() {
    deleting = true;
    try {
      // La confirmación va en el cuerpo, no en la URL: así el nombre del
      // cliente no queda en los registros de acceso (A2-R4).
      await api('/api/admin/clients/' + encodeURIComponent(clientId), { method: 'DELETE', body: { confirm: name } });
      confirmDelete = false;
      toast(`${client.client_code} borrado definitivamente`);
      onchanged?.();
      setSub([], { keepQuery: true });
    } catch (e) {
      toastError(e, 'No se pudo borrar el cliente.');
    } finally { deleting = false; }
  }

  onMount(load);
</script>

<a class="back" href={href('clientes', [], route.query)}><span class="flip"><Icon name="chevron" size={16} /></span>Clientes</a>

{#if loading && !client}
  <LoadingState loading={true} label="Abriendo el cliente">
    {#snippet skeleton()}
      <div class="ui-skel" style="height:40px;width:40%"></div>
      <div class="ui-skel" style="height:110px"></div>
      <div class="sk-grid"><div class="ui-skel" style="height:300px"></div><div class="ui-skel" style="height:300px"></div></div>
    {/snippet}
  </LoadingState>
{:else if error}
  <PageHeader title="Cliente" />
  <ErrorState title="No se pudo abrir el cliente" message={error} onretry={load} />
{:else if client}
  <PageHeader title={name} subtitle={`${client.client_code} · Cliente desde el ${fmtDate(client.created_at)}`}>
    {#snippet badge()}<StatusChip tone={clientStatus(client.status).tone} label={clientStatus(client.status).label} />{/snippet}
    {#snippet actions()}
      {#if archived}
        <button type="button" class="b b--danger" onclick={() => (confirmDelete = true)}>Borrar definitivamente</button>
        <button type="button" class="b" disabled={archiving} onclick={() => setStatus('active')}>{archiving ? 'Un momento…' : 'Reactivar'}</button>
      {:else}
        <button type="button" class="b" onclick={() => (confirmArchive = true)}>Archivar</button>
      {/if}
    {/snippet}
  </PageHeader>

  {#if archived}
    <p class="banner"><Icon name="alert" size={16} /> Cliente archivado: no sale en la lista de Clientes ni al elegir cliente en ninguna sección. Sus proyectos, facturas y pagos se conservan.</p>
  {/if}

  {#if related}
    <KpiGrid count={3} label="Cuentas del cliente">
      <Kpi label="Facturado" value={money(related.totals.invoiced_cents)} note={related.totals.draft_cents ? `${money(related.totals.draft_cents)} en borradores aparte` : 'Facturas emitidas, sin anuladas'} />
      <Kpi label="Cobrado" value={money(related.totals.paid_cents)} tone="data" note="Pagos registrados" />
      <Kpi label="Saldo pendiente" value={money(related.totals.balance_cents)} note={related.totals.balance_cents > 0 ? 'Por cobrar' : 'Al día'} />
    </KpiGrid>
  {/if}

  <div class="grid">
    <div class="col">
      <Card title="Proyectos">
        {#snippet actions()}<a class="b b--mini" href={href('progreso')}>Ir a Progreso</a>{/snippet}
        {#if related?.projects?.length}
          <ul class="rows">
            {#each related.projects as p (p.id)}
              <li>
                <a class="rows__main" href={href('progreso', [p.project_code])}>
                  <span class="rows__t">{p.name || p.project_code}</span>
                  <span class="rows__s">{p.project_code}{p.started_at ? ' · desde el ' + fmtDay(p.started_at) : ''}</span>
                </a>
                <span class="rows__amt">{money(p.agreed_amount_cents)}</span>
                <StatusChip tone={(PROJECT_STATUS[p.status] || {}).tone || 'neutral'} label={(PROJECT_STATUS[p.status] || {}).label || 'Sin estado'} />
              </li>
            {/each}
          </ul>
        {:else}
          <EmptyState compact title="Sin proyectos" text="Cuando arranques un proyecto para este cliente aparecerá aquí." />
        {/if}
      </Card>

      <Card title="Facturas">
        {#snippet actions()}<a class="b b--mini" href={href('finanzas')}>Ir a Finanzas</a>{/snippet}
        {#if related?.invoices?.length}
          <ul class="rows">
            {#each related.invoices as i (i.id)}
              <li>
                <a class="rows__main" href={href('finanzas', ['facturas', i.invoice_number])}>
                  <span class="rows__t">{i.invoice_number}{i.description ? ' · ' + i.description : ''}</span>
                  <span class="rows__s">{i.issued_at ? 'Emitida el ' + fmtDay(i.issued_at) : 'Sin emitir'}{i.due_date ? ' · vence el ' + fmtDay(i.due_date) : ''}</span>
                </a>
                <span class="rows__amt">
                  {money(i.amount_cents)}
                  {#if i.status !== 'void' && i.status !== 'draft' && Number(i.balance_cents) > 0}<span class="rows__bal">saldo {money(i.balance_cents)}</span>{/if}
                </span>
                <StatusChip tone={(INVOICE_STATUS[i.status] || {}).tone || 'neutral'} label={(INVOICE_STATUS[i.status] || {}).label || 'Sin estado'} />
              </li>
            {/each}
          </ul>
        {:else}
          <EmptyState compact title="Sin facturas" text="Las facturas de este cliente se crean en Finanzas." />
        {/if}
      </Card>

      <Card title="Origen">
        {#if related?.briefs?.length || related?.leads?.length}
          <ul class="rows">
            {#each related.leads as l (l.ref_id)}
              <li>
                <a class="rows__main" href={href('leads', [l.ref_id])}>
                  <span class="rows__t">Lead {l.ref_id}{l.name ? ' · ' + l.name : ''}</span>
                  <span class="rows__s">Llegó por {leadSource(l.source).label} el {fmtDate(l.created_at)}</span>
                </a>
                <StatusChip tone={leadStatus(l.status).tone} label={leadStatus(l.status).label} />
              </li>
            {/each}
            {#each related.briefs as b (b.project_id)}
              <li>
                <a class="rows__main" href={href('briefs', [b.project_id])}>
                  <span class="rows__t">Brief {b.project_id}{b.business_name ? ' · ' + b.business_name : ''}</span>
                  <span class="rows__s">Recibido el {fmtDate(b.created_at)}</span>
                </a>
                <StatusChip tone={(BRIEF_STATUS[b.status] || {}).tone || 'neutral'} label={(BRIEF_STATUS[b.status] || {}).label || 'Sin estado'} />
              </li>
            {/each}
          </ul>
        {:else}
          <EmptyState compact title="Alta manual" text="Este cliente no viene de un lead ni de un brief." />
        {/if}
      </Card>
    </div>

    <aside class="col">
      <Card title="Datos de contacto">
        <form onsubmit={(e) => { e.preventDefault(); save(false); }}>
          <ClientFields bind:values {errors} status={!archived} idPrefix="cd" disabled={saving} />
          {#if dupMatches.length}
            <div class="dup"><DuplicateNotice matches={dupMatches} title="Ese correo o teléfono ya es de otro cliente" useLabel="Abrir ficha" archivedUsable
              onuse={(m) => navigate('clientes', [m.id])} onforce={() => save(true)} busy={saving} /></div>
          {/if}
          <div class="form-foot">
            {#if dirty}<button type="button" class="b b--ghost" disabled={saving} onclick={() => resetForm(client)}>Descartar</button>{/if}
            <button type="submit" class="b b--primary" disabled={!dirty || saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        </form>
        {#if client.email || phoneHref(client.phone)}
          <div class="quick">
            {#if phoneHref(client.phone)}<a class="b b--mini" href={'tel:' + phoneHref(client.phone)}>Llamar</a>{/if}
            {#if whatsappHref(client.phone)}<a class="b b--mini" href={whatsappHref(client.phone)} target="_blank" rel="noopener noreferrer">WhatsApp</a>{/if}
            {#if client.email}<a class="b b--mini" href={'mailto:' + client.email}>Escribir</a>{/if}
          </div>
        {/if}
      </Card>
    </aside>
  </div>

  <ConfirmDialog
    bind:open={confirmArchive}
    title={`Archivar ${name}`}
    message="Dejará de salir en la lista de Clientes y al elegir cliente en cualquier sección. Sus proyectos, facturas y pagos se conservan tal cual y puedes reactivarlo cuando quieras."
    confirmLabel="Archivar"
    danger={false}
    busy={archiving}
    onconfirm={() => setStatus('archived')}
  />
  <ConfirmDialog
    bind:open={confirmDelete}
    title={`Borrar ${name} para siempre`}
    message={`Se borrará la ficha de ${client.client_code}. ${deleteImpactText(related?.impact)} Sus briefs y leads de origen se conservan, sin el vínculo. No se puede deshacer.`}
    confirmLabel="Borrar definitivamente"
    requireText={name}
    busy={deleting}
    onconfirm={doDelete}
  />
{/if}

<style>
  .back { display: inline-flex; align-items: center; gap: 4px; margin-top: var(--space-4); color: var(--fg-secondary); font-size: var(--dash-small); text-decoration: none; min-height: 32px; }
  .back:hover { color: var(--fg-primary); }
  .flip { display: inline-flex; transform: rotate(180deg); }
  .banner { display: flex; align-items: center; gap: 8px; margin: 0 0 var(--space-5); padding: 10px 14px; border-radius: var(--radius-md); background: var(--bg-elevated); border: 1px solid var(--border); font-size: var(--dash-small); color: var(--fg-secondary); }
  .grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(320px, 1fr); gap: var(--space-5); align-items: start; }
  .col { display: flex; flex-direction: column; gap: var(--space-5); min-width: 0; }
  .sk-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: var(--space-5); }
  .rows { list-style: none; margin: 0; padding: 0; }
  .rows li { display: flex; align-items: center; gap: var(--space-3); padding: 10px 0; border-bottom: 1px solid var(--border-subtle); }
  .rows li:first-child { padding-top: 0; }
  .rows li:last-child { border-bottom: 0; padding-bottom: 0; }
  .rows__main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; color: inherit; text-decoration: none; }
  .rows__main:hover .rows__t { text-decoration: underline; text-underline-offset: 3px; }
  .rows__t { color: var(--fg-primary); font-size: var(--dash-body); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rows__s { color: var(--fg-subtle); font-size: var(--dash-caption); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rows__amt { flex: 0 0 auto; display: flex; flex-direction: column; align-items: flex-end; font-size: var(--dash-body); color: var(--fg-primary); font-variant-numeric: tabular-nums; }
  .rows__bal { font-size: var(--dash-caption); color: var(--fg-subtle); }
  .dup { margin-top: var(--space-3); }
  .form-foot { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-4); }
  .quick { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle); }
  @media (max-width: 1099px) {
    .grid, .sk-grid { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 719px) {
    .rows li { flex-wrap: wrap; }
    .rows__main { flex-basis: 100%; }
    .rows__amt { align-items: flex-start; margin-right: auto; }
  }
</style>
