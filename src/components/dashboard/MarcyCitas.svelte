<script>
  // Citas de Marcy (#/marcy?vista=citas): semana en hora de Houston con las
  // horas de atención sombreadas y las citas como bloques (referencias:
  // Mangomint y GlossGenius, design/orbit.md). Al pulsar una cita se abre su
  // ficha al lado con el contacto, lo que necesita y el enlace al lead.
  import { api, errorMessage, isSessionError } from './lib/api.js';
  import { toast } from './lib/toast.svelte.js';
  import { leadHref } from './lib/marcy.js';
  import { weekStart, addDays, houstonParts, dayLabel, timeLabel, CITA_STATUS } from './lib/citas.js';
  import StatusChip from './ui/StatusChip.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import Icon from './ui/Icon.svelte';
  import ConfirmDialog from './ui/ConfirmDialog.svelte';

  const START = 9 * 60;            // la rejilla empieza a las 9:00 (domingo)
  const END = 21 * 60;             // y acaba a las 9:00 pm
  const ROW = 28;                  // px por cada 30 min

  let monday = $state(weekStart(new Date()));
  let citas = $state([]);
  let horario = $state(null);
  let loading = $state(true);
  let error = $state('');
  let pending = $state(false);
  let sel = $state(null);
  let busy = $state(false);

  const days = $derived(Array.from({ length: 7 }, (_, i) => addDays(monday, i)));
  const hours = Array.from({ length: (END - START) / 60 + 1 }, (_, i) => START + i * 60);
  const todayKey = houstonParts(new Date()).key;

  async function load() {
    loading = true;
    try {
      const d = await api('/api/admin/citas?desde=' + monday.key + '&dias=7');
      citas = d.citas || []; horario = d.horario || null; error = ''; pending = false;
      if (sel) sel = citas.find((c) => c.id === sel.id) || null;
    } catch (e) {
      if (isSessionError(e)) return;
      if (e && e.data && e.data.code === 'migration_pending') pending = true;
      else error = errorMessage(e);
    } finally { loading = false; }
  }
  $effect(() => { monday.key; load(); });

  function move(n) { monday = addDays(monday, n * 7); sel = null; }
  function thisWeek() { monday = weekStart(new Date()); sel = null; }

  const inDay = (c, day) => houstonParts(new Date(c.starts_at)).key === day.key;
  function top(c) { const p = houstonParts(new Date(c.starts_at)); return ((p.minutes - START) / 30) * ROW; }
  function openBand(day) {
    if (!horario) return null;
    const [o, cl] = horario[day.wd] || [0, 0];
    return { top: ((o - START) / 30) * ROW, height: ((cl - o) / 30) * ROW };
  }

  // Borrar (pruebas o spam). Cancelar la deja en el historial; borrar la quita.
  let delOpen = $state(false);
  async function borrar() {
    if (!sel || busy) return;
    busy = true;
    try {
      await api('/api/admin/citas', { method: 'DELETE', body: { id: sel.id } });
      delOpen = false;
      toast('Cita borrada');
      sel = null;
      await load();
    } catch (e) { if (!isSessionError(e)) toast(errorMessage(e, 'No se pudo borrar.'), { tone: 'error' }); }
    finally { busy = false; }
  }

  async function setStatus(status) {
    if (!sel || busy) return;
    busy = true;
    try {
      await api('/api/admin/citas', { method: 'PATCH', body: { id: sel.id, status } });
      toast(status === 'cancelada' ? 'Cita cancelada' : 'Cita actualizada');
      await load();
    } catch (e) { if (!isSessionError(e)) toast(errorMessage(e), { tone: 'error' }); }
    finally { busy = false; }
  }
</script>

{#if pending}
  <EmptyState title="Falta preparar la base de datos" text="Las citas necesitan la migración 019 aplicada. En cuanto esté, aparecen aquí las que agende Marcy." />
{:else if error}
  <ErrorState message={error} onretry={load} />
{:else}
  <section class="cal card" aria-busy={loading}>
    <header class="cal__bar">
      <div class="cal__nav">
        <button type="button" class="btn btn--mini" onclick={() => move(-1)} aria-label="Semana anterior"><Icon name="back" size={16} /></button>
        <button type="button" class="btn btn--mini" onclick={thisWeek}>Esta semana</button>
        <button type="button" class="btn btn--mini flip" onclick={() => move(1)} aria-label="Semana siguiente"><Icon name="back" size={16} /></button>
      </div>
      <p class="cal__range">{dayLabel(days[0])} a {dayLabel(days[6])} · hora de Houston</p>
      <p class="cal__leg"><span class="lg lg--marcy"></span>Las agenda Marcy <span class="lg lg--open"></span>Horario de atención</p>
    </header>
    <div class="cal__body">
      <div class="grid" style="--row:{ROW}px">
        <div class="hours" aria-hidden="true">
          <div class="dayhead"></div>
          {#each hours as h (h)}<div class="hour" style="height:{ROW * 2}px">{timeLabel(h)}</div>{/each}
        </div>
        {#each days as day (day.key)}
          {@const band = openBand(day)}
          <div class="col" class:today={day.key === todayKey}>
            <div class="dayhead"><span>{day.wdLabel}</span><b>{day.d}</b></div>
            <div class="lane" style="height:{((END - START) / 30) * ROW}px">
              {#if band}<div class="open" style="top:{band.top}px;height:{band.height}px"></div>{/if}
              {#each citas.filter((c) => inDay(c, day)) as c (c.id)}
                {@const st = CITA_STATUS[c.status] || CITA_STATUS.pendiente}
                <button type="button" class="appt appt--{c.status}" class:marcy={c.source === 'marcy'} aria-pressed={sel && sel.id === c.id}
                  style="top:{top(c)}px;height:{(c.duration_min / 30) * ROW - 2}px" onclick={() => (sel = c)}
                  aria-label="{timeLabel(houstonParts(new Date(c.starts_at)).minutes)} {c.name || 'Sin nombre'} · {st.label}">
                  <b>{timeLabel(houstonParts(new Date(c.starts_at)).minutes)}</b> {c.name || 'Sin nombre'}
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </div>
      <aside class="detail" aria-label="Detalle de la cita">
        {#if sel}
          {@const st = CITA_STATUS[sel.status] || CITA_STATUS.pendiente}
          <p class="cap">Cita</p>
          <h3>{sel.name || 'Sin nombre'}</h3>
          <p class="when">{dayLabel(houstonParts(new Date(sel.starts_at)))} · {timeLabel(houstonParts(new Date(sel.starts_at)).minutes)} · {sel.duration_min} min</p>
          <StatusChip tone={st.tone} label={st.label} />
          <dl class="kv">
            {#if sel.phone}<dt>Teléfono</dt><dd><a href="tel:{sel.phone}">{sel.phone}</a></dd>{/if}
            {#if sel.email}<dt>Email</dt><dd><a href="mailto:{sel.email}">{sel.email}</a></dd>{/if}
            <dt>Idioma</dt><dd>{sel.lang === 'en' ? 'inglés' : 'español'}</dd>
            <dt>Origen</dt><dd>{sel.source === 'marcy' ? 'La agendó Marcy' : 'Manual'}</dd>
            {#if sel.lead_ref}<dt>Lead</dt><dd>{#if leadHref(sel.lead_ref)}<a href={leadHref(sel.lead_ref)}>{sel.lead_ref}</a>{:else}{sel.lead_ref}{/if}</dd>{/if}
            {#if sel.chat_sid}<dt>Conversación</dt><dd><a href="#/marcy/{sel.chat_sid}">Ver lo que habló con Marcy</a></dd>{/if}
          </dl>
          {#if sel.topic}<p class="cap">Lo que necesita</p><p class="topic">{sel.topic}</p>{/if}
          <div class="acts">
            {#if sel.status !== 'hecha'}<button type="button" class="btn" disabled={busy} onclick={() => setStatus('hecha')}><Icon name="check" size={16} />Hecha</button>{/if}
            {#if sel.status !== 'no_vino'}<button type="button" class="btn" disabled={busy} onclick={() => setStatus('no_vino')}>No contestó</button>{/if}
            {#if sel.status !== 'cancelada'}<button type="button" class="btn btn--danger" disabled={busy} onclick={() => setStatus('cancelada')}>Cancelar</button>{/if}
          </div>
          <div class="del">
            <button type="button" class="btn btn--mini" disabled={busy} onclick={() => (delOpen = true)}><Icon name="trash" size={14} />Borrar cita</button>
            <span class="muted">Para pruebas o spam.</span>
          </div>
          <ConfirmDialog bind:open={delOpen} title="Borrar cita" confirmLabel="Borrar para siempre" busy={busy} onconfirm={borrar}
            message={`Se borrará la cita${sel.name ? ' de ' + sel.name : ''} del ${dayLabel(houstonParts(new Date(sel.starts_at)))} a las ${timeLabel(houstonParts(new Date(sel.starts_at)).minutes)}. Si fue real, mejor cancélala: así queda en el historial. No se puede deshacer.`} />
        {:else if !loading && !citas.length}
          <EmptyState compact title="Sin citas esta semana" text="Cuando un cliente agende una llamada con Marcy, aparece aquí con su contacto y lo que necesita." />
        {:else}
          <p class="muted">Pulsa una cita para ver su contacto y lo que necesita.</p>
        {/if}
      </aside>
    </div>
  </section>
{/if}

<style>
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .cap { margin: 0 0 6px; font-size: var(--dash-caption); font-weight: 500; letter-spacing: .06em; text-transform: uppercase; color: var(--fg-subtle); }
  .muted { color: var(--fg-subtle); font-size: var(--dash-small); }
  .cal__bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); }
  .cal__nav { display: flex; gap: 6px; }
  .flip :global(svg) { transform: scaleX(-1); }
  .cal__range { margin: 0; font-weight: 600; font-size: var(--dash-small); }
  .cal__leg { margin: 0 0 0 auto; display: flex; align-items: center; gap: 6px; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .lg { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-left: 8px; }
  .lg--marcy { background: rgba(var(--accent-gold-rgb), .25); border-left: 2px solid var(--accent-gold); }
  .lg--open { background: var(--bg-card); border: 1px solid var(--border-strong); }
  .cal__body { display: grid; grid-template-columns: minmax(0, 1fr) 300px; }
  .grid { display: grid; grid-template-columns: 56px repeat(7, minmax(84px, 1fr)); overflow-x: auto; padding: 0 0 12px; }
  .dayhead { height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1px solid var(--border-subtle); font-size: var(--dash-caption); color: var(--fg-secondary); }
  .dayhead b { font-size: 17px; color: var(--fg-primary); font-weight: 600; }
  .col.today .dayhead b { color: var(--accent-gold); }
  .hours .hour { font-size: 11px; color: var(--fg-subtle); text-align: right; padding-right: 8px; transform: translateY(-7px); }
  .col { border-left: 1px solid var(--border-subtle); min-width: 0; }
  .lane { position: relative; background-color: rgba(0, 0, 0, .28); }
  .lane::after { content: ''; position: absolute; inset: 0; pointer-events: none; background-image: repeating-linear-gradient(to bottom, transparent 0, transparent calc(var(--row) * 2 - 1px), var(--border-subtle) calc(var(--row) * 2 - 1px), var(--border-subtle) calc(var(--row) * 2)); }
  .open { position: absolute; left: 0; right: 0; background: var(--bg-card); box-shadow: inset 0 1px 0 var(--border), inset 0 -1px 0 var(--border); }
  .appt { position: absolute; left: 3px; right: 3px; border: 0; border-left: 2px solid var(--accent-teal); border-radius: 6px; background: rgba(52, 211, 153, .12); color: var(--fg-primary); font: inherit; font-size: 12px; line-height: 1.3; text-align: left; padding: 5px 7px; z-index: 2; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; cursor: pointer; }
  .appt.marcy { border-left-color: var(--accent-gold); background: rgba(var(--accent-gold-rgb), .14); }
  .appt--cancelada { opacity: .45; text-decoration: line-through; }
  .appt--hecha { opacity: .7; }
  .appt[aria-pressed='true'] { box-shadow: 0 0 0 1px var(--fg-subtle); }
  .appt:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 1px; }
  .detail { border-left: 1px solid var(--border); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .detail h3 { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -.01em; }
  .when { margin: 0; color: var(--fg-secondary); font-size: var(--dash-small); }
  .kv { display: grid; grid-template-columns: 100px 1fr; gap: 7px 10px; margin: 6px 0; font-size: var(--dash-small); }
  .kv dt { color: var(--fg-subtle); } .kv dd { margin: 0; overflow-wrap: anywhere; } .kv a { color: var(--fg-primary); }
  .topic { margin: 0; font-size: var(--dash-small); line-height: 1.5; color: var(--fg-secondary); white-space: pre-wrap; }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  @media (max-width: 1100px) { .cal__body { grid-template-columns: 1fr; } .detail { border-left: 0; border-top: 1px solid var(--border); } }
  @media (max-width: 900px) { .cal__leg { margin-left: 0; } .btn { min-height: 44px; } }
  .del { display: flex; gap: 10px; align-items: center; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-subtle); font-size: var(--dash-caption); }
</style>
