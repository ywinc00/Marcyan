<script>
  // Camino de etapas en la ficha del contacto (Ventas §1): nuevo, contactado, diagnóstico
  // hecho, propuesta enviada y ganado o perdido, con la fecha en que entró en cada una (del
  // historial). La actual va subrayada; la que se saltó lo dice. Solo para contactos del
  // embudo (no para archivados, pruebas ni spam).
  import { dayLabel, lostReason } from './crm.js';

  let { lead, events = [], proposal = null } = $props();
  const ORDER = ['new', 'contacted', 'diagnosed', 'proposal'];
  const SKIPPED = { contacted: 'saltada', diagnosed: 'saltada', proposal: 'saltada' };
  const day = (iso) => (iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(iso)) : '');
  const entered = $derived.by(() => {
    const m = { new: day(lead.created_at) };
    for (const ev of [...events].reverse()) {
      if (ev.event_type === 'status_changed' && ev.data?.to) m[ev.data.to] = day(ev.created_at);
    }
    return m;
  });
  const at = $derived(lead.status === 'converted' || lead.status === 'lost' ? 4 : ORDER.indexOf(lead.status));
  const steps = $derived([
    { k: 'new', t: 'Nuevo', s: entered.new ? dayLabel(entered.new) : '' },
    { k: 'contacted', t: 'Contactado', s: entered.contacted ? dayLabel(entered.contacted) : '' },
    { k: 'diagnosed', t: 'Diagnóstico hecho', s: entered.diagnosed ? dayLabel(entered.diagnosed) : '' },
    // Sin el evento (cambio de etapa antiguo), la fecha sale del envío de la propuesta.
    { k: 'proposal', t: 'Propuesta enviada', s: (entered.proposal || proposal?.sent_on) ? dayLabel(entered.proposal || proposal.sent_on) + (proposal?.expires_on && proposal.status === 'sent' ? ` · vale hasta el ${dayLabel(proposal.expires_on)}` : '') : '' },
    lead.status === 'converted' ? { k: 'converted', t: 'Ganado', s: entered.converted ? dayLabel(entered.converted) : '' }
      : lead.status === 'lost' ? { k: 'lost', t: 'Perdido', s: lostReason(lead.lost_reason)?.label || '' }
      : { k: 'end', t: 'Ganado o perdido', s: 'cuando decida' },
  ].map((st, i) => ({ ...st, state: i < at ? 'done' : i === at ? 'now' : 'next', s: st.s || (i < at ? (SKIPPED[st.k] || '') : st.s) })));
  const nowStep = $derived(steps.find((st) => st.state === 'now'));
  const nowNote = $derived(nowStep?.k === 'proposal' && proposal?.expires_on && proposal.status === 'sent' ? `vale hasta el ${dayLabel(proposal.expires_on)}` : nowStep?.s || '');
</script>

<!-- Tableta estrecha y teléfono: una línea con la etapa actual; el camino entero, al desplegar. -->
<details class="steps-mob">
  <summary><span class="sm__k">Etapa</span> <b>{nowStep?.t}</b>{#if nowNote}<span class="sm__s">{nowNote}</span>{/if}</summary>
  <ol class="steps steps--in" aria-label="Etapas del contacto">
    {#each steps as st (st.k)}
      <li class="st st--{st.state}" aria-current={st.state === 'now' ? 'step' : undefined}><b>{st.t}</b>{#if st.s}<small>{st.s}</small>{/if}</li>
    {/each}
  </ol>
</details>
<ol class="steps steps--desk" aria-label="Etapas del contacto">
  {#each steps as st (st.k)}
    <li class="st st--{st.state}" aria-current={st.state === 'now' ? 'step' : undefined}>
      <b>{st.t}</b>{#if st.s}<small>{st.s}</small>{/if}
    </li>
  {/each}
</ol>

<style>
  .steps-mob { display: none; }
  .steps-mob summary { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-2); min-height: 44px; padding: var(--space-2) var(--space-4); cursor: pointer; list-style: none; font-size: var(--dash-small); color: var(--fg-secondary); }
  .steps-mob summary::-webkit-details-marker { display: none; }
  .steps-mob summary::after { content: '›'; margin-left: auto; color: var(--fg-subtle); transition: transform var(--duration-fast); }
  .steps-mob[open] summary::after { transform: rotate(90deg); }
  .steps-mob summary:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: -2px; border-radius: var(--radius-lg); }
  .sm__k { color: var(--fg-subtle); }
  .steps-mob summary b { color: var(--fg-primary); font-weight: 600; }
  .steps-mob summary b { white-space: nowrap; flex: none; }
  /* La fecha nunca se corta: si no cabe en la línea, baja entera a la siguiente. */
  .sm__s { color: var(--fg-subtle); white-space: nowrap; }
  .sm__s::before { content: '· '; }
  /* Teléfono: la nota siempre en su propia línea, sin el punto; la flecha, a la derecha. */
  @media (max-width: 719px) {
    .steps-mob summary { position: relative; padding-right: var(--space-7); }
    .steps-mob summary::after { position: absolute; right: var(--space-4); top: 50%; transform: translateY(-50%); }
    .steps-mob[open] summary::after { transform: translateY(-50%) rotate(90deg); }
    .sm__s { flex-basis: 100%; }
    .sm__s::before { content: none; }
  }
  .steps.steps--in { margin: 0; border: 0; border-top: 1px solid var(--border-subtle); border-radius: 0; }
  .steps { list-style: none; margin: 0 0 var(--space-5); padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-card); overflow: hidden; }
  .st { display: flex; flex-direction: column; gap: 2px; padding: var(--space-3) var(--space-4); border-right: 1px solid var(--border-subtle); min-width: 0; }
  .st:last-child { border-right: 0; }
  .st b { font-size: var(--dash-small); font-weight: 600; color: var(--fg-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .st small { font-size: var(--dash-caption); color: var(--fg-subtle); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .st--done b { color: var(--fg-primary); font-weight: 500; }
  /* La actual, subrayada en blanco (como una pestaña activa). */
  .st--now { background: var(--bg-elevated) linear-gradient(var(--fg-primary), var(--fg-primary)) bottom / 100% 2px no-repeat; }
  .st--now b { color: var(--fg-primary); }
  .st--next b { color: var(--fg-subtle); font-weight: 500; }
  /* Portátil estrecho y tableta ancha: el nombre de la etapa en dos líneas antes que cortado. */
  @media (min-width: 1100px) and (max-width: 1279px) {
    .st b, .st small { white-space: normal; overflow: visible; }
  }
  /* Teléfono y tableta estrecha: las cinco etapas en dos filas no caben; se apilan. */
  /* Por debajo de 1100 (donde la ficha va a una columna): una línea plegable. */
  @media (max-width: 1099px) {
    .steps--desk { display: none; }
    .steps-mob { display: block; margin: 0 0 var(--space-5); border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-card); overflow: hidden; }
    .steps { grid-template-columns: minmax(0, 1fr); }
    .st { flex-direction: row; justify-content: space-between; align-items: baseline; gap: var(--space-3); border-right: 0; border-bottom: 1px solid var(--border-subtle); min-height: 44px; align-items: center; }
    .st:last-child { border-bottom: 0; }
    .st--now { background: var(--bg-elevated) linear-gradient(var(--fg-primary), var(--fg-primary)) left / 2px 100% no-repeat; }
  }
</style>
