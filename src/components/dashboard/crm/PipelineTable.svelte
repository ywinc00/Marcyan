<script>
  // Contactos «En curso» (Ventas §1, fusión de las formas 1 y 2, validada el 2026-11-20):
  // la tabla de Leads agrupada en secciones con su recuento, con lo propuesto en una
  // columna compacta. view='stages' agrupa por etapa; view='today' reordena las MISMAS
  // filas por lo que toca (atrasado y hoy abiertos; esta semana y sin siguiente paso,
  // plegados) y pasa el siguiente paso a segunda columna. Sin tarjetas ni panel lateral:
  // la fila lleva a la ficha. En el teléfono cada fila queda en dos líneas con su plazo.
  import StatusChip from '../ui/StatusChip.svelte';
  import Icon from '../ui/Icon.svelte';
  import LeadStatusSelect from './LeadStatusSelect.svelte';
  import { href, route } from '../lib/router.svelte.js';
  import { rel, fmtDate, fmtDateTime } from '../lib/dates.js';
  import {
    stageGroups, todayGroups, nextStepText, leadSource, leadStatus, optionPrice, dayLabel, initials, monoColor,
  } from './crm.js';

  let { rows = [], view = 'stages', crmReady = true, onsaved, onconvert } = $props();

  const groups = $derived(view === 'today' ? todayGroups(rows) : stageGroups(rows));
  const cols = $derived(view === 'today'
    ? ['contact', 'next', 'source', 'message', 'proposed', 'stage']
    : ['contact', 'source', 'message', 'proposed', 'next', 'stage']);
  const LABEL = { contact: 'Contacto', source: 'Origen', message: 'Mensaje', proposed: 'Propuesto', next: 'Siguiente paso', stage: 'Etapa' };

  // Plegado: cada sección recuerda si el dueño la abrió (por clave, mientras dure la vista).
  let opened = $state({});
  const isOpen = (g) => !g.folded || !!opened[g.key];
  const toggle = (g) => { opened = { ...opened, [g.key]: !isOpen(g) }; };

  const now = new Date();
  // Cuándo llegó, en palabras: «hace 4 min», «hace 3 h», «hace 2 días»; de más de una semana,
  // «31 oct» (con el año solo si no es el actual).
  const dayFmt = new Intl.DateTimeFormat('es-US', { timeZone: 'America/Chicago', day: 'numeric', month: 'short' });
  const yearOf = (d) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric' }).format(d);
  function arrival(v) {
    const r = rel(v, now.getTime());
    const m = /^(\d+)([mhd])$/.exec(r);
    if (m) return m[2] === 'm' ? `hace ${m[1]} min` : m[2] === 'h' ? `hace ${m[1]} h` : `hace ${m[1]} ${m[1] === '1' ? 'día' : 'días'}`;
    if (r === 'ahora') return 'ahora';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const label = dayFmt.format(d).replace('.', '');
    return yearOf(d) === yearOf(now) ? label : `${label} ${yearOf(d)}`;
  }
  const who = (l) => l.name || l.business_name || l.email || l.phone || '';
</script>

<!-- Misma piel que .ui-table, pero propia: en el teléfono no pasa a tarjetas sino a filas de dos líneas. -->
<div class="pipe-wrap">
  <table class="pipe">
    <caption class="sr-only">{view === 'today' ? 'Contactos en curso, por lo que toca hacer' : 'Contactos en curso, por etapa'}</caption>
    <thead>
      <tr>{#each cols as c (c)}<th scope="col" class="h-{c}">{LABEL[c]}</th>{/each}</tr>
    </thead>
    {#each groups as g (g.key)}
      <tbody>
        <tr class="grp" class:grp--err={g.tone === 'error'}>
          <th scope="rowgroup" colspan={cols.length}>
            {#if g.folded}
              <button type="button" class="grp__btn" aria-expanded={isOpen(g)} onclick={() => toggle(g)}>
                <span class="grp__chev" class:is-open={isOpen(g)} aria-hidden="true"><Icon name="chevron" size={14} /></span>
                <span class="grp__t">{g.label}</span><span class="grp__n">{' · '}{g.items.length}</span>
              </button>
            {:else}
              <span class="grp__t">{g.label}</span><span class="grp__n">{' · '}{g.items.length}</span>{#if g.note}<span class="grp__note">{' · '}{g.note}</span>{/if}
            {/if}
          </th>
        </tr>
        {#if isOpen(g)}
          {#each g.items as lead (lead.ref_id)}
            {@const nt = nextStepText(lead.next, { now })}
            {@const mobWhat = lead.next?.kind === 'follow_up' && lead.next.step ? `Día ${lead.next.step}` : nt.what}
            {@const mobTail = lead.proposal ? optionPrice(lead.proposal.project_cents ? { ...lead.proposal, monthly_cents: 0 } : lead.proposal) : view === 'today' ? leadStatus(lead.status).label : ''}
            {@const mobMonthly = lead.proposal?.project_cents && lead.proposal.monthly_cents ? `+ ${optionPrice({ project_cents: 0, monthly_cents: lead.proposal.monthly_cents })}` : ''}
            {@const src = leadSource(lead.source)}
            <tr>
              {#each cols as c (c)}
                <td class="c-{c}">
                  {#if c === 'contact'}
                    <a class="c-cell" href={href('leads', [lead.ref_id], route.query)}>
                      {#if who(lead)}
                        <span class="mono-av" style="background:{monoColor(lead.ref_id, who(lead))}" aria-hidden="true">{initials(who(lead))}</span>
                      {:else}
                        <span class="mono-av mono-av--anon" aria-hidden="true"><Icon name="clientes" size={14} /></span>
                      {/if}
                      <span class="c-text">
                        <span class="c-name">{lead.name || lead.business_name || 'Sin nombre'}{#if lead.business_name && lead.business_name !== lead.name}<span class="c-biz">{' · '}{lead.business_name}</span>{/if}</span>
                        <span class="c-sub">{[lead.business_name !== lead.name ? lead.business_name : '', lead.email || lead.phone].filter(Boolean).join(' · ') || lead.ref_id}</span>
                        <!-- Tableta y portátil estrecho: interés, origen y llegada, bajo el contacto (el correo, en la ficha). -->
                        <span class="c-src">{[lead.interest, src.label, arrival(lead.created_at)].filter(Boolean).join(' · ')}</span>
                        <!-- Teléfono: qué toca y en qué etapa, bajo el nombre. -->
                        <!-- La cifra del proyecto nunca se corta: primero se acorta el paso y, si aun así no cabe, el mensual se queda en la ficha. -->
                        <span class="c-mob"><span class="c-mob__what">{mobWhat}</span>{#if mobWhat && mobTail}<span class="c-mob__sep" aria-hidden="true">·</span>{/if}{#if mobTail}<span class="c-mob__tail">{mobTail}</span>{/if}{#if mobMonthly}<span class="c-mob__mo">{mobMonthly}</span>{/if}</span>
                      </span>
                    </a>
                  {:else if c === 'source'}
                    <span class="src"><StatusChip tone={src.tone} label={src.label} /><span class="dim" title={fmtDateTime(lead.created_at)}>{arrival(lead.created_at)}</span></span>
                  {:else if c === 'message'}
                    {#if lead.interest || lead.message}
                      <span class="msg">
                        {#if lead.interest}<span class="msg__interest" title={lead.interest}>{lead.interest}</span>{/if}
                        {#if lead.message}<span class="msg__text" title={lead.message}>{lead.message}</span>{/if}
                      </span>
                    {:else}<span class="none">Sin mensaje</span>{/if}
                  {:else if c === 'proposed'}
                    {#if lead.proposal}
                      <span class="prop">
                        <span class="prop__v">{optionPrice(lead.proposal)}</span>
                        <span class="dim">{lead.proposal.sent_on ? `enviada el ${dayLabel(lead.proposal.sent_on)}` : lead.proposal.pending_price ? 'borrador, precio por confirmar' : 'en borrador'}</span>
                      </span>
                    {:else}<span class="none" aria-label="Sin propuesta">—</span>{/if}
                  {:else if c === 'next'}
                    {#if nt.tone}
                      <span class="nx-long"><StatusChip tone={nt.tone} label={nt.long} /></span>
                      <span class="nx-short"><StatusChip tone={nt.tone} label={nt.short} /></span>
                    {:else}
                      <span class="nx-long nx-plain">{nt.long}</span>
                      <span class="nx-short nx-plain">{nt.short}</span>
                    {/if}
                  {:else if c === 'stage'}
                    <LeadStatusSelect {lead} {crmReady} {onsaved} {onconvert} />
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        {/if}
      </tbody>
    {/each}
  </table>
</div>

<style>
  /* La piel de .ui-table (dashboard.css), con un poco menos de aire lateral: seis columnas en 1366. */
  .pipe-wrap { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow-x: auto; overflow-y: hidden; }
  .pipe { width: 100%; border-collapse: collapse; font-size: var(--dash-body); }
  .pipe th[scope='col'] { text-align: left; padding: var(--space-3); border-bottom: 1px solid var(--border); white-space: nowrap; font-family: var(--font-mono); font-size: var(--dash-mono); font-weight: 400; color: var(--fg-subtle); }
  .pipe td { height: 46px; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--border-subtle); vertical-align: middle; color: var(--fg-secondary); }
  .pipe tbody tr:not(.grp) { transition: background-color var(--duration-fast); }
  .pipe tbody tr:not(.grp):hover td { background: var(--bg-elevated); }
  .pipe tbody:last-child tr:last-child td { border-bottom: 0; }
  .grp th { height: 36px; padding: 0 16px; background: var(--bg-elevated); text-align: left; font-family: var(--font-body); font-size: var(--dash-small); font-weight: 400; color: var(--fg-secondary); border-bottom: 1px solid var(--border-subtle); letter-spacing: 0; text-transform: none; }
  .grp__t { color: var(--fg-primary); font-weight: 600; }
  .grp--err .grp__t { color: var(--delta-down); }
  .grp__btn { display: inline-flex; align-items: center; gap: var(--space-2); min-height: 36px; padding: 0; border: 0; background: none; font: inherit; color: inherit; cursor: pointer; }
  .grp__btn:hover .grp__t { text-decoration: underline; text-underline-offset: 3px; }
  .grp__btn:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; border-radius: var(--radius-sm); }
  .grp__chev { display: inline-flex; color: var(--fg-subtle); transition: transform var(--duration-fast); }
  .grp__chev.is-open { transform: rotate(90deg); }
  .grp:hover th { background: var(--bg-elevated); }

  .c-cell { display: flex; align-items: center; gap: var(--space-2); min-width: 0; color: inherit; text-decoration: none; border-radius: var(--radius-sm); }
  .c-cell:hover .c-name { text-decoration: underline; text-underline-offset: 3px; }
  .c-cell:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .c-text { min-width: 0; display: flex; flex-direction: column; }
  .c-name { color: var(--fg-primary); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .c-sub { font-size: var(--dash-caption); color: var(--fg-subtle); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: clamp(120px, 10vw, 220px); }
  .c-mob, .c-src, .c-biz { display: none; }
  .c-biz { font-weight: 400; color: var(--fg-subtle); }
  .mono-av { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: 0 0 auto; border-radius: var(--radius-pill); color: #fff; font-family: var(--font-display); font-size: 11px; font-weight: 700; line-height: 1; } /* auditoria-ignorar: blanco y 11 px del monograma, como en la lista de siempre */
  .mono-av--anon { background: var(--bg-elevated); color: var(--fg-secondary); border: 1px solid var(--border-strong); }
  .src, .prop { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
  .prop__v { color: var(--fg-primary); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .dim { color: var(--fg-subtle); white-space: nowrap; font-size: var(--dash-caption); font-variant-numeric: tabular-nums; }
  .none { color: var(--fg-subtle); }
  .msg { display: flex; flex-direction: column; gap: 2px; max-width: clamp(140px, 12vw, 300px); min-width: 0; }
  .msg__interest { color: var(--fg-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .msg__text { font-size: var(--dash-caption); color: var(--fg-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nx-short { display: none; }
  .nx-plain { color: var(--fg-secondary); font-size: var(--dash-small); }
  .c-stage { white-space: nowrap; width: 1%; }
  .c-stage :global(select) { max-width: 160px; text-overflow: ellipsis; }

  /* Pantallas anchas: los textos usan el sitio que hay en vez de cortarse con hueco al lado. */
  @media (min-width: 1600px) {
    .c-sub { max-width: clamp(220px, 14vw, 400px); }
    .msg { max-width: clamp(300px, 20vw, 560px); }
  }
  /* Debajo de 1366 el contacto ocupa dos líneas: «Nombre · Negocio» y «Interés · Origen ·
     hace 2 días» (el correo, en la ficha), y la columna Origen se pliega ahí. Por debajo de
     1280 el mensaje se pliega también (sigue en la ficha) y el siguiente paso va en corto:
     así la etapa se ve entera sin desplazar la tabla. */
  @media (min-width: 720px) and (max-width: 1365px) {
    .h-source, .c-source, .c-sub { display: none; }
    .c-biz { display: inline; }
    .c-name { max-width: clamp(160px, 18vw, 260px); }
    .c-src { display: block; font-size: var(--dash-caption); color: var(--fg-subtle); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: clamp(160px, 18vw, 260px); }
  }
  @media (min-width: 720px) and (max-width: 1279px) {
    .nx-long { display: none; }
    .nx-short { display: inline; }
  }
  @media (min-width: 720px) and (max-width: 1279px) {
    .h-message, .c-message { display: none; }
  }

  /* Teléfono: cada fila en dos líneas (contacto y qué toca, con su plazo a la derecha). */
  @media (max-width: 719px) {
    .pipe-wrap { overflow: hidden; }
    .pipe, .pipe tbody, .pipe tr { display: block; }
    .pipe thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    .pipe tr:not(.grp) { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--border-subtle); }
    .pipe tbody:last-child tr:last-child { border-bottom: 0; }
    .pipe td { display: none; padding: 0; height: auto; border: 0; }
    .pipe td.c-contact { display: block; flex: 1 1 auto; min-width: 0; }
    .pipe td.c-next { display: block; flex: 0 0 auto; }
    .grp { display: block; }
    .grp th { display: block; height: auto; min-height: 36px; padding: var(--space-2) var(--space-4); font-family: var(--font-mono); font-size: var(--dash-mono); }
    .grp__btn { min-height: 28px; }
    .grp__note { display: none; }
    .c-sub { display: none; }
    /* Una sola línea: el paso se acorta hasta unas 3 letras; si aun así no cabe el mensual, baja a una
       segunda línea que no se ve (sigue en la ficha y en «Propuesto»). La cifra del proyecto nunca se corta,
       y el paso no crece más que su texto (sin huecos). */
    .c-mob { display: flex; flex-wrap: wrap; min-width: 0; font-size: var(--dash-caption); line-height: 1.45; max-height: 1.45em; overflow: hidden; color: var(--fg-subtle); margin-top: 2px; white-space: nowrap; }
    .c-mob__what { flex: 1 1 3em; min-width: 0; max-width: max-content; overflow: hidden; text-overflow: ellipsis; }
    .c-mob__sep { flex: 0 0 auto; padding-inline: var(--space-1); }
    .c-mob__tail, .c-mob__mo { flex: 0 0 auto; }
    .c-mob__mo { padding-left: var(--space-1); }
    .nx-long { display: none; }
    .nx-short { display: inline; }
  }
</style>
