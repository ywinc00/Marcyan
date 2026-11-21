<script>
  // La propuesta de un contacto en su ficha (Ventas §1): primero sus seguimientos (días 2, 5
  // y 10 desde que se envió), después la propuesta con sus opciones (D-02: la recomendada
  // marcada, el precio real y lo mensual, en cuántos trabajos se paga) y lo que se puede hacer
  // según su estado: un borrador se marca como enviado; una enviada o vencida se decide
  // (eligió una opción o la rechazó). Aceptar no convierte en cliente: eso es «Ganado».
  import Card from '../ui/Card.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import Icon from '../ui/Icon.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import { api } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { money, dayLabel, daysBetween, houstonToday, whatsappHref, PROPOSAL_AUTHOR } from './crm.js';

  let { proposal, lead, events = [], converted = false, onchanged, onnew } = $props();
  // Cuándo se hizo cada seguimiento (del historial del contacto).
  const doneOn = $derived(Object.fromEntries(events.filter((e) => e.event_type === 'follow_up_done' && e.data?.proposal === proposal.ref_id)
    .map((e) => [e.data.step, new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(e.created_at))])));

  const FOLLOW_UP_DAYS = [2, 5, 10];   // los del catálogo (reglas.seguimientoDias)
  const today = houstonToday();
  const p = $derived(proposal);
  const eff = $derived(p.effective_status || p.status);
  const open = $derived(eff === 'sent' || eff === 'expired');
  const left = $derived(p.expires_on ? daysBetween(today, p.expires_on) : null);
  const chip = $derived(
    eff === 'draft' ? { tone: 'neutral', label: 'Borrador' }
    : eff === 'expired' ? { tone: 'error', label: `Venció el ${dayLabel(p.expires_on)}` }
    : eff === 'accepted' ? { tone: 'success', label: 'Aceptada' }
    : eff === 'rejected' ? { tone: 'neutral', label: 'Rechazada' }
    : { tone: 'warning', label: left === 0 ? 'Vence hoy' : `Vale ${left} ${left === 1 ? 'día' : 'días'} más` });
  const steps = $derived(eff === 'sent' && p.sent_on ? FOLLOW_UP_DAYS.map((d, i) => {
    const day = new Date(Date.UTC(...p.sent_on.split('-').map((n, k) => (k === 1 ? n - 1 : +n))) + d * 86400000).toISOString().slice(0, 10);
    const state = i < p.follow_ups_done ? 'done' : i === p.follow_ups_done ? (day < today ? 'late' : day === today ? 'today' : 'next') : 'later';
    return { d, day, state };
  }) : []);
  const wa = $derived(whatsappHref(lead?.phone));

  let busy = $state('');
  async function act(body, msg, key) {
    busy = key;
    try {
      await api('/api/admin/proposals/' + encodeURIComponent(p.ref_id), { method: 'PATCH', body });
      toast(msg);
      onchanged?.();
    } catch (e) {
      toastError(e, 'No se pudo guardar. Inténtalo de nuevo.');
    } finally { busy = ''; }
  }
  let askReject = $state(false);
</script>

{#if steps.length}
  <Card title="Seguimientos">
    <ol class="fu">
      {#each steps as s (s.d)}
        <li class="fu__i fu__i--{s.state}">
          <span class="fu__ico" aria-hidden="true">{#if s.state === 'done'}<Icon name="check" size={14} />{:else if s.state === 'late' || s.state === 'today'}!{/if}</span>
          <span class="fu__t">
            <b>Día {s.d}</b>
            <span class="fu__d">{s.state === 'done' ? (doneOn[FOLLOW_UP_DAYS.indexOf(s.d) + 1] ? `hecho el ${dayLabel(doneOn[FOLLOW_UP_DAYS.indexOf(s.d) + 1])}` : 'hecho') : s.state === 'today' ? 'hoy' : s.state === 'late' ? `tocaba el ${dayLabel(s.day)}` : dayLabel(s.day)}</span>
          </span>
          {#if s.state === 'late' || s.state === 'today'}
            <span class="fu__acts">
              {#if wa}<a class="b b--mini" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>{/if}
              <button type="button" class="b b--mini" disabled={!!busy} aria-busy={busy === 'fu'}
                onclick={() => act({ action: 'follow_up' }, `Seguimiento del día ${s.d} hecho`, 'fu')}>{busy === 'fu' ? 'Guardando…' : 'Hecho'}</button>
            </span>
          {/if}
        </li>
      {/each}
    </ol>
  </Card>
{/if}

<Card title={`Propuesta del ${dayLabel((p.sent_on || String(p.created_at).slice(0, 10)))}`}>
  {#snippet actions()}
    <StatusChip tone={chip.tone} label={chip.label} />
    {#if !open && eff !== 'draft' && onnew}<button type="button" class="b b--mini" onclick={onnew}>Nueva propuesta</button>{/if}
  {/snippet}
  {#if eff === 'expired'}
    <p class="note note--err"><Icon name="alert" size={16} /> Venció el {dayLabel(p.expires_on)} sin respuesta. Sigue en «Propuesta enviada»: decide si la eligió, la rechazó o si haces otra.</p>
  {/if}
  <div class="opts-box">
  <ul class="opts" style="--n:{p.options.length}">
    {#each p.options as o, i (i)}
      {@const isRec = p.recommended_option === i && p.options.length > 1}
      {@const isChosen = p.chosen_option === i}
      <li class="opt" class:opt--rec={isRec} class:opt--chosen={isChosen}>
        <div class="opt__top">
          <span class="opt__plan">{o.plan?.name || o.projects?.[0]?.name || `Opción ${i + 1}`}</span>
          {#if isChosen}<StatusChip tone="success" label="La eligió" />{:else if isRec}<span class="opt__tag">recomendada</span>{/if}
        </div>
        {#if o.plan && o.projects?.length}<span class="opt__with">+ {o.projects.map((x) => x.name).join(' + ')}</span>{/if}
        <span class="opt__price num">{money(o.project_cents)}</span>
        <span class="opt__sub">{o.monthly_cents ? `+ ${money(o.monthly_cents)}/mes` : 'sin mensualidad'}{o.pays_back_jobs ? ` · se paga con ${o.pays_back_jobs} ${o.pays_back_jobs === 1 ? 'cliente nuevo' : 'clientes nuevos'} al mes` : ''}</span>
        {#if open}
          <button type="button" class="b b--mini opt__pick" disabled={!!busy}
            onclick={() => act({ action: 'decide', status: 'accepted', chosen_option: i }, `Eligió ${o.plan?.name || 'la opción ' + (i + 1)}`, 'pick' + i)}>{busy === 'pick' + i ? 'Guardando…' : 'Eligió esta'}</button>
        {/if}
      </li>
    {/each}
  </ul>
  </div>
  {#if p.client_value_cents}
    <p class="value">Le vale <b class="num">{money(p.client_value_cents)}</b> cada cliente nuevo.</p>
  {/if}
  {#if eff === 'accepted' && !converted}
    <p class="note">La aceptó. Para empezar, pásalo a cliente con «Ganado: pasar a cliente».</p>
  {/if}
  <div class="foot">
    <span class="who">La preparó {PROPOSAL_AUTHOR[p.created_by] || 'Orbit'}{p.sent_on ? `; enviada el ${dayLabel(p.sent_on)}` : ''}.</span>
    {#if eff === 'draft'}
      <button type="button" class="b b--mini" disabled={!!busy} onclick={() => act({ action: 'send' }, 'Propuesta marcada como enviada', 'send')}>{busy === 'send' ? 'Guardando…' : 'Marcar como enviada'}</button>
    {:else if open}
      <button type="button" class="b b--mini b--ghost" disabled={!!busy} onclick={() => (askReject = true)}>La rechazó</button>
    {/if}
  </div>
</Card>

<ConfirmDialog bind:open={askReject} title="¿La rechazó?" danger={false} confirmLabel="Sí, la rechazó" busy={busy === 'rej'}
  message="La propuesta queda como rechazada y deja de pedir seguimientos. El contacto sigue en su etapa: si ya no sigue, márcalo como perdido."
  onconfirm={async () => { await act({ action: 'decide', status: 'rejected' }, 'Propuesta rechazada', 'rej'); askReject = false; }} />

<style>
  .fu { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .fu__i { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); min-height: 44px; border-bottom: 1px solid var(--border-subtle); }
  .fu__i:last-child { border-bottom: 0; }
  /* Teléfono: los botones bajan a su línea, alineados con el texto (detrás del icono). */
  @media (max-width: 719px) {
    .fu__i { padding-block: var(--space-2); }
    .fu__i--late .fu__acts, .fu__i--today .fu__acts { flex-basis: 100%; margin-left: 32px; }
  }
  .fu__ico { width: 20px; height: 20px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-pill); border: 1px solid var(--border-strong); font-size: var(--dash-caption); font-weight: 700; color: var(--fg-subtle); }
  .fu__i--done .fu__ico { border-color: transparent; color: var(--delta-up); }
  .fu__i--today .fu__ico { border-color: var(--color-warning); color: var(--color-warning); }
  .fu__i--late .fu__ico { border-color: var(--delta-down); color: var(--delta-down); }
  .fu__t { flex: 1 1 auto; display: flex; gap: var(--space-2); align-items: baseline; flex-wrap: wrap; }
  .fu__t b { font-weight: 600; color: var(--fg-primary); }
  .fu__d { color: var(--fg-subtle); font-size: var(--dash-small); white-space: nowrap; }
  .fu__acts { display: inline-flex; gap: var(--space-2); margin-left: auto; }
  .fu__i--later .fu__t, .fu__i--next .fu__t { opacity: .8; }

  .note { margin: 0 0 var(--space-3); display: flex; gap: var(--space-2); align-items: flex-start; font-size: var(--dash-small); color: var(--fg-secondary); line-height: 1.5; }
  .note--err :global(.ui-icon) { color: var(--delta-down); flex: 0 0 auto; margin-top: 1px; }
  /* Las opciones, una al lado de otra si el hueco de la tarjeta lo permite (no la pantalla). */
  .opts-box { container-type: inline-size; }
  .opts { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); }
  @container (min-width: 600px) { .opts { grid-template-columns: repeat(var(--n), minmax(0, 1fr)); } }
  /* Tarjeta estrecha (teléfono): cada opción en tres líneas cortas y «Eligió esta» a la derecha.
     Con «.opts» delante para ganar a las reglas de base, que van después. */
  @container (max-width: 599px) {
    .opts .opt { display: block; position: relative; padding: var(--space-3) var(--space-4); }
    .opts .opt:has(.opt__pick) { padding-right: 112px; }
    .opts .opt__with { display: block; }
    .opts .opt__price { display: inline; font-size: var(--dash-card-title); font-weight: 600; margin: 0; letter-spacing: 0; }
    .opts .opt__sub { display: inline; margin: 0 0 0 var(--space-1); }
    .opts .opt__pick { position: absolute; right: var(--space-3); top: 50%; transform: translateY(-50%); margin: 0; }
  }
  .opt { display: flex; flex-direction: column; gap: 4px; padding: var(--space-3) var(--space-4); border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-elevated); min-width: 0; }
  .opt--rec { border-color: var(--border-strong); background: var(--surface-3); }
  .opt--chosen { border-color: var(--delta-up); }
  .opt__top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--space-1) var(--space-2); min-height: 24px; }
  .opt__plan { font-weight: 600; color: var(--fg-primary); }
  .opt__tag { font-size: var(--dash-caption); color: var(--fg-primary); border: 1px solid var(--border-strong); border-radius: var(--radius-pill); padding: 1px 8px; white-space: nowrap; }
  .opt__with { font-size: var(--dash-small); color: var(--fg-secondary); }
  .opt__price { font-size: var(--dash-title); font-weight: 650; color: var(--fg-primary); margin-top: var(--space-1); letter-spacing: -.01em; }
  .opt__sub { font-size: var(--dash-caption); color: var(--fg-subtle); line-height: 1.45; }
  .opt__pick { align-self: flex-start; margin-top: auto; }
  .opt__sub { margin-bottom: var(--space-2); }
  .value { margin: var(--space-3) 0 0; font-size: var(--dash-small); color: var(--fg-secondary); }
  .value b { color: var(--fg-primary); font-weight: 600; }
  .foot { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--border-subtle); }
  .who { font-size: var(--dash-small); color: var(--fg-subtle); }
</style>
