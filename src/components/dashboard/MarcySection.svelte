<script>
  // Marcy (#/marcy): ver a la asistente trabajar y saber dónde se cae la venta.
  // Dirección elegida por el dueño (2026-11-07): consola en vivo (A) con el
  // embudo del mes arriba (B). Registro y referencias en design/orbit.md.
  //   #/marcy                 bandeja + primera conversación
  //   #/marcy/<sid>           conversación abierta (en el móvil, a pantalla entera)
  //   ?f=en_vivo|cerrada|…    pastillas · ?paso=precio|… embudo · ?motivo=… dónde se van
  //   ?vista=gasto            gasto del mes
  // En vivo: se refresca cada 5 s solo con la pestaña visible.
  import { onDestroy, untrack, tick } from 'svelte';
  import { api, errorMessage, isSessionError } from './lib/api.js';
  import { fmtTime, rel, fmtDateTime } from './lib/dates.js';
  import { route, setSub, setQuery } from './lib/router.svelte.js';
  import {
    outcomeMeta, motivoLabel, toolLabel, actionLabel, FILTERS, applyFilter, funnelSteps,
    motivosOrdenados, recorrido, usd, CHANNELS, LANGS, leadHref,
  } from './lib/marcy.js';
  import PageHeader from './ui/PageHeader.svelte';
  import StatusChip from './ui/StatusChip.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import LoadingState from './ui/LoadingState.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import Icon from './ui/Icon.svelte';
  import MarcyCitas from './MarcyCitas.svelte';
  import { toast } from './lib/toast.svelte.js';
  import MarcyCorreo from './MarcyCorreo.svelte';

  const POLL_MS = 5000;

  let rows = $state([]);
  let embudo = $state(null);
  let gasto = $state(null);
  let loading = $state(true);
  let loaded = $state(false);
  let error = $state('');
  let pending = $state(false);       // migración sin aplicar

  let conv = $state(null);
  let convLoading = $state(false);
  let convError = $state('');

  const q = $derived(route.query || {});
  const vista = $derived(q.vista === 'gasto' || q.vista === 'citas' || q.vista === 'correo' ? q.vista : 'conversaciones');
  const selectedSid = $derived(route.sub && route.sub[0] ? String(route.sub[0]) : '');
  const visible = $derived(applyFilter(rows, { f: q.f || '', paso: q.paso || '', motivo: q.motivo || '' }));
  const liveCount = $derived(rows.filter((r) => r.outcome === 'en_vivo').length);
  const steps = $derived(funnelSteps(embudo));
  const motivos = $derived(motivosOrdenados(embudo));
  const pasos = $derived(conv ? recorrido(conv) : []);

  async function loadList({ quiet = false } = {}) {
    if (!quiet) loading = true;
    try {
      const d = await api('/api/admin/marcy?limit=200&days=30');
      rows = d.rows || [];
      embudo = d.embudo || null;
      gasto = d.gasto || null;
      error = ''; pending = false; loaded = true;
    } catch (e) {
      if (isSessionError(e)) return;
      if (e && e.data && e.data.code === 'migration_pending') pending = true;
      else if (!quiet) error = errorMessage(e);
    } finally {
      if (!quiet) loading = false;
    }
  }

  async function loadConv(sid, { quiet = false } = {}) {
    if (!sid) { conv = null; return; }
    if (!quiet) { convLoading = true; convError = ''; }
    try {
      const d = await api('/api/admin/marcy?sid=' + encodeURIComponent(sid));
      if (shownSid === sid) {
        const grew = !conv || conv.sid !== sid || (d.conversation.turnos || []).length !== (conv.turnos || []).length;
        conv = d.conversation;
        // Si la llevas tú, la conversación baja sola al último mensaje.
        if (conv.takeover_at && grew) tick().then(() => { const f = document.querySelector('.feed'); if (f) f.scrollTop = f.scrollHeight; });
      }
    } catch (e) {
      if (isSessionError(e)) return;
      if (!quiet) convError = errorMessage(e);
    } finally {
      if (!quiet) convLoading = false;
    }
  }

  // Primera carga.
  loadList();

  // Conversación mostrada: la de la URL o, en escritorio, la primera de la lista
  // (sin tocar la URL, para no meter pasos en el historial de Atrás).
  const wideMq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(min-width: 901px)') : null;
  let wide = $state(wideMq ? wideMq.matches : true);
  if (wideMq) wideMq.addEventListener('change', (e) => { wide = e.matches; });
  const shownSid = $derived(selectedSid || (wide && visible[0] ? visible[0].sid : ''));
  $effect(() => {
    const sid = shownSid;
    untrack(() => {
      if (sid && (!conv || conv.sid !== sid)) loadConv(sid);
      else if (!sid) conv = null;
    });
  });

  // En vivo: refresco ligero con la pestaña visible.
  let timer = null;
  function tickLive() {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    loadList({ quiet: true });
    if (shownSid && conv && (conv.takeover_at || ['en_vivo', 'abierta'].includes(conv.outcome))) loadConv(shownSid, { quiet: true });
  }
  timer = setInterval(tickLive, POLL_MS);
  onDestroy(() => clearInterval(timer));

  // "Tomo yo" (migración 022): tomar, escribir y devolver la conversación.
  let draft = $state('');
  let tomoBusy = $state(false);
  async function tomo(action) {
    if (!conv || tomoBusy) return;
    tomoBusy = true;
    try {
      await api('/api/admin/marcy', { method: 'POST', body: { sid: conv.sid, action } });
      toast(action === 'tomar' ? 'La llevas tú. Marcy no contesta en esta conversación.' : 'Devuelta a Marcy');
      await loadConv(conv.sid, { quiet: true });
    } catch (e) { if (!isSessionError(e)) toast(errorMessage(e), { tone: 'error' }); }
    finally { tomoBusy = false; }
  }
  async function enviar() {
    const text = draft.trim();
    if (!conv || !text || tomoBusy) return;
    tomoBusy = true;
    try {
      await api('/api/admin/marcy', { method: 'POST', body: { sid: conv.sid, action: 'enviar', text } });
      draft = '';
      await loadConv(conv.sid, { quiet: true });
    } catch (e) { if (!isSessionError(e)) toast(errorMessage(e), { tone: 'error' }); }
    finally { tomoBusy = false; }
  }

  function pickFilter(id) { setQuery({ ...q, f: id || '', paso: '', motivo: '' }); }
  function pickStep(id) { setQuery({ ...q, paso: q.paso === id ? '' : id, f: '', motivo: '' }); }
  function pickMotivo(id) { setQuery({ ...q, motivo: q.motivo === id ? '' : id, f: '', paso: '' }); }
  function setVista(v) { setQuery({ vista: v === 'conversaciones' ? '' : v }); }
  let consoleEl = $state(null);
  // En el móvil la conversación sustituye a la lista: se lleva arriba para leerla desde el principio.
  function open(sid) {
    setSub([sid]);
    if (!wide && consoleEl) requestAnimationFrame(() => consoleEl.scrollIntoView({ block: 'start' }));
  }
  function back() { setSub([]); }

  const title = (r) => (r.first_user || 'Conversación sin texto').replace(/\s+/g, ' ').trim();
  const meta = (r) => [CHANNELS[r.channel] || 'Web', LANGS[r.lang] || r.lang, r.turns + (r.turns === 1 ? ' mensaje' : ' mensajes')].join(' · ');

  // Turno (1-based) donde se fue: para pintar el aviso ámbar tras él.
  const failTurn = $derived(conv && conv.fallo ? conv.fallo.turno : 0);
</script>

<PageHeader title="Marcy" subtitle="Lo que hablan Marcy y tus clientes, en vivo y con el resultado de cada conversación.">
  {#snippet actions()}
    <div class="seg" role="tablist" aria-label="Vista">
      <button type="button" role="tab" aria-selected={vista === 'conversaciones'} onclick={() => setVista('conversaciones')}>
        Conversaciones{#if liveCount}<span class="seg__live" aria-label="{liveCount} en vivo">{liveCount}</span>{/if}
      </button>
      <button type="button" role="tab" aria-selected={vista === 'correo'} onclick={() => setVista('correo')}>Correo</button>
      <button type="button" role="tab" aria-selected={vista === 'citas'} onclick={() => setVista('citas')}>Citas</button>
      <button type="button" role="tab" aria-selected={vista === 'gasto'} onclick={() => setVista('gasto')}>Gasto</button>
    </div>
  {/snippet}
</PageHeader>

{#if pending}
  <EmptyState title="Falta preparar la base de datos" text="La sección necesita la migración 018 aplicada en la base. En cuanto esté, aparecen aquí las conversaciones nuevas." />
{:else if error && !loaded}
  <ErrorState message={error} onretry={() => loadList()} />
{:else if vista === 'correo'}
  <MarcyCorreo />
{:else if vista === 'citas'}
  <MarcyCitas />
{:else if vista === 'gasto'}
  <!-- ── Gasto del mes (Rox / Steel: barra frente al tope) ── -->
  <section class="spend card">
    <p class="cap">Gasto de Marcy · {gasto ? gasto.mes : ''}</p>
    {#if gasto}
      <p class="spend__big">${gasto.usd.toFixed(2)}{#if gasto.tope_usd}<span> de ${gasto.tope_usd}</span>{/if}</p>
      {#if gasto.tope_usd}
        {@const pct = Math.min(100, Math.round((gasto.usd / gasto.tope_usd) * 100))}
        <div class="meter" role="meter" aria-valuemin="0" aria-valuemax={gasto.tope_usd} aria-valuenow={gasto.usd} aria-label="Gasto frente al tope">
          <i style="width:{pct}%" class:warn={pct >= 80}></i><u></u>
        </div>
        <p class="muted">{pct} % del tope. Aviso al 80 %.</p>
      {:else}
        <p class="muted">Sin tope definido todavía.</p>
      {/if}
      <dl class="kv">
        <dt>Conversaciones</dt><dd>{gasto.conversaciones}</dd>
        <dt>Mensajes respondidos</dt><dd>{gasto.turnos}</dd>
        <dt>Coste medio por mensaje</dt><dd>{gasto.turnos ? '$' + (gasto.usd / gasto.turnos).toFixed(3) : '—'}</dd>
      </dl>
      {#if gasto.por_canal && gasto.por_canal.length > 1}
        <p class="cap">Por canal</p>
        <dl class="kv">
          {#each gasto.por_canal as c (c.canal)}<dt>{CHANNELS[c.canal] || c.canal}</dt><dd>${c.usd.toFixed(2)} · {c.conversaciones} conv.{#if c.canal === 'telefono' && gasto.tope_telefono_usd} · tope ${gasto.tope_telefono_usd}{/if}</dd>{/each}
        </dl>
      {/if}
      {#if gasto.por_dia && gasto.por_dia.length}
        {@const maxDia = Math.max(0.01, ...gasto.por_dia.map((d) => d.usd))}
        <p class="cap" style="margin-top:18px">Por día</p>
        <div class="days" role="img" aria-label="Gasto por día del mes">
          {#each gasto.por_dia as d (d.dia)}
            <span class="day" title="{d.dia}: ${d.usd.toFixed(2)}"><i style="height:{Math.max(4, Math.round((d.usd / maxDia) * 100))}%"></i><small>{d.dia.slice(8)}</small></span>
          {/each}
        </div>
      {/if}
      <p class="muted small">Sale de nuestro propio registro de cada respuesta con los precios oficiales por uso. Teléfono y ficha de Google se sumarán cuando se midan.</p>
    {:else}
      <p class="muted">Todavía no hay gasto registrado este mes.</p>
    {/if}
  </section>
{:else}
  <!-- ── Embudo del mes (B) ── -->
  <section class="top">
    <div class="funnel card" role="group" aria-label="Embudo del mes">
      {#each steps as s, i (s.label)}
        <button type="button" class="step" aria-pressed={i === 0 ? !q.paso && !q.f && !q.motivo : q.paso === s.id} onclick={() => pickStep(s.id)}>
          <span class="step__label">{s.label}</span>
          <span class="step__n">{s.n}{#if s.drop}<em>−{s.drop}</em>{/if}</span>
          <span class="step__bar"><i style="width:{s.pct}%"></i></span>
        </button>
      {/each}
      <button type="button" class="step step--side" aria-pressed={q.paso === 'pasadas'} onclick={() => pickStep('pasadas')}>
        <span class="step__label">Pasadas a ti</span>
        <span class="step__n">{embudo ? embudo.pasadas : 0}</span>
      </button>
    </div>
    <div class="why card">
      <p class="cap">Dónde se van este mes</p>
      {#if motivos.length}
        <ul>
          {#each motivos as m (m.id)}
            <li><button type="button" aria-pressed={q.motivo === m.id} onclick={() => pickMotivo(m.id)}>
              <span class="why__t">{m.label}</span><span class="why__bar"><i style="width:{m.pct}%"></i></span><b>{m.n}</b>
            </button></li>
          {/each}
        </ul>
      {:else}
        <p class="muted small">Aún no hay conversaciones terminadas sin cierre este mes.</p>
      {/if}
    </div>
  </section>

  <!-- ── Consola (A) ── -->
  <section class="console card" class:has-open={!!selectedSid} bind:this={consoleEl}>
    <div class="inbox">
      <div class="pills" role="group" aria-label="Filtrar conversaciones">
        {#each FILTERS as f (f.id)}
          <button type="button" class="pill" aria-pressed={(q.f || '') === f.id && !q.paso && !q.motivo} onclick={() => pickFilter(f.id)}>
            {f.label}{#if f.id === 'en_vivo' && liveCount}<span class="pill__n">{liveCount}</span>{/if}
          </button>
        {/each}
      </div>
      {#if q.paso || q.motivo}
        <p class="active-filter">{q.motivo ? motivoLabel(q.motivo) : steps.find((s) => s.id === q.paso)?.label || 'Pasadas a ti'} · <button type="button" onclick={() => pickFilter('')}>quitar filtro</button></p>
      {/if}
      <LoadingState loading={loading && !loaded} rows={6} height={72}>
        {#if !visible.length}
          <EmptyState compact title={rows.length ? 'Nada con este filtro' : 'Sin conversaciones todavía'} text={rows.length ? 'Prueba con Todas.' : 'Cuando alguien hable con Marcy en la web, aparece aquí al momento.'} />
        {:else}
          <ul class="list">
            {#each visible as r (r.sid)}
              {@const om = outcomeMeta(r.outcome)}
              <li>
                <button type="button" class="item" aria-current={shownSid === r.sid ? 'true' : undefined} onclick={() => open(r.sid)}>
                  <span class="item__r1"><b class="item__t">{title(r)}</b><StatusChip tone={om.tone} label={om.label} /></span>
                  <span class="item__q">{r.last_reply || ''}</span>
                  <span class="item__m">
                    <span class:fail-txt={!!r.fallo}>{#if r.fallo}{motivoLabel(r.fallo.motivo)} · mensaje {r.fallo.turno}{:else if r.lead_ref}{r.lead_ref}{:else}{meta(r)}{/if}</span>
                    <span class="item__when">{rel(r.last_at)}</span>
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </LoadingState>
    </div>

    <div class="thread">
      {#if !shownSid}
        <EmptyState compact title="Elige una conversación" text="Verás lo que escribió el cliente, lo que contestó Marcy y lo que hizo en cada paso." />
      {:else if convError}
        <ErrorState compact message={convError} onretry={() => loadConv(shownSid)} />
      {:else if !conv}
        <LoadingState loading={convLoading} rows={5} height={56}><span></span></LoadingState>
      {:else}
        {@const om = outcomeMeta(conv.outcome)}
        <header class="thread__head">
          <button type="button" class="back" onclick={back} aria-label="Volver a la lista"><Icon name="back" size={18} /></button>
          <div>
            <b>{CHANNELS[conv.channel] || 'Web'} · {LANGS[conv.lang] || conv.lang}</b>
            <span class="muted small"> · empezó {fmtDateTime(conv.started_at)}</span>
          </div>
          {#if conv.takeover_at}<StatusChip tone="accent" label="La llevas tú" />{:else}<StatusChip tone={om.tone} label={conv.outcome === 'en_vivo' ? 'En vivo' : om.label} />{/if}
        </header>
        <ol class="feed" aria-live={conv.outcome === 'en_vivo' ? 'polite' : 'off'}>
          {#each conv.turnos as t, i (t.id)}
            {#if t.action_type === 'dueno'}
              <li class="msg msg--o"><span class="who">Tú · {fmtTime(t.created_at)}</span>{t.reply}</li>
            {:else if t.action_type === 'espera'}
              <li class="msg msg--u"><span class="who">Cliente · {fmtTime(t.created_at)}</span>{t.user_text}</li>
            {:else}
            <li class="msg msg--u"><span class="who">Cliente</span>{t.user_text}</li>
            {#if t.tool}<li class="toolcard"><Icon name="check" size={14} />{toolLabel(t.tool)}</li>{/if}
            <li class="msg msg--m" class:msg--fb={t.fallback}><span class="who">Marcy · {fmtTime(t.created_at)}</span>{t.reply}</li>
            {#if t.action_type}<li class="ev">{actionLabel(t.action_type, t.action_destino)}</li>{/if}
            {/if}
            {#if t.cortadas}<li class="ev ev--warn">El filtro de precios cortó {t.cortadas} y mostró una respuesta genérica</li>{/if}
            {#if failTurn === i + 1}<li class="failbox">Aquí se fue: {motivoLabel(conv.fallo.motivo).toLowerCase()}.</li>{/if}
          {/each}
          {#if conv.takeover_at}<li class="ev ev--live">{String(conv.takeover_by || '').startsWith('app-') ? 'Contestaste desde la app del teléfono · Marcy vuelve sola a las 12 h o cuando se la devuelvas' : 'La llevas tú · Marcy no contesta hasta que se la devuelvas'}</li>
          {:else if conv.outcome === 'en_vivo'}<li class="ev ev--live">Conversación en curso · se actualiza sola</li>{/if}
        </ol>
        {#if !conv.channel || ['web', 'whatsapp', 'instagram'].includes(conv.channel)}
          {#if conv.takeover_at}
            <form class="composer" onsubmit={(e) => { e.preventDefault(); enviar(); }}>
              <label class="sr" for="tomo-msg">Tu mensaje al cliente</label>
              <textarea id="tomo-msg" rows="2" maxlength="2000" bind:value={draft} placeholder={conv.channel === 'whatsapp' ? 'Escribe al cliente. Le llega a su WhatsApp.' : conv.channel === 'instagram' ? 'Escribe al cliente. Le llega por Instagram.' : 'Escribe al cliente. Le aparece en el chat de la web.'}
                onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}></textarea>
              <div class="composer__acts">
                <button type="button" class="btn" disabled={tomoBusy} onclick={() => tomo('devolver')}>Devolver a Marcy</button>
                <button type="submit" class="btn btn--primary" disabled={tomoBusy || !draft.trim()}><Icon name="send" size={16} />Enviar</button>
              </div>
            </form>
          {:else}
            <div class="composer composer--off">
              <span class="muted small">Si quieres contestar tú, Marcy se calla en esta conversación hasta que se la devuelvas.</span>
              <button type="button" class="btn btn--primary" disabled={tomoBusy} onclick={() => tomo('tomar')}>Tomo yo</button>
            </div>
          {/if}
        {/if}
      {/if}
    </div>

    <aside class="rail" aria-label="Ficha de la conversación">
      {#if conv && shownSid}
        {@const om = outcomeMeta(conv.outcome)}
        <div><p class="cap">Resultado</p><StatusChip tone={om.tone} label={om.label} /></div>
        {#if conv.fallo}
          <div class="failbox failbox--rail"><b>{motivoLabel(conv.fallo.motivo)}</b><span>en el mensaje {conv.fallo.turno} de {conv.turnos.length}</span></div>
        {/if}
        <div>
          <p class="cap">Recorrido de venta</p>
          <ol class="steps">
            {#each pasos as p (p.label)}
              <li class:done={p.done}><i aria-hidden="true"></i>{p.label}</li>
            {/each}
          </ol>
        </div>
        <div>
          <p class="cap">Datos</p>
          <dl class="kv">
            <dt>Canal</dt><dd>{CHANNELS[conv.channel] || 'Web'}</dd>
            {#if conv.contact}<dt>Contacto</dt><dd>{#if conv.contact_name}{conv.contact_name} · {/if}{#if conv.channel === 'whatsapp' || conv.channel === 'telefono'}<a href={'tel:' + conv.contact}>{conv.contact}</a>{:else}{conv.contact}{/if}</dd>{/if}
            <dt>Idioma</dt><dd>{LANGS[conv.lang] || conv.lang}</dd>
            <dt>Mensajes</dt><dd>{conv.turnos.length}</dd>
            <dt>Último</dt><dd>{rel(conv.last_at)}</dd>
            <dt>Coste</dt><dd>{usd(conv.cost_micro_usd, 3)}</dd>
            {#if conv.lead_ref}<dt>Registro</dt><dd>{#if leadHref(conv.lead_ref)}<a href={leadHref(conv.lead_ref)}>{conv.lead_ref}</a>{:else}{conv.lead_ref}{/if}</dd>{/if}
          </dl>
        </div>
      {/if}
    </aside>
  </section>
{/if}

<style>
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .cap { margin: 0 0 8px; font-size: var(--dash-caption); font-weight: 500; letter-spacing: .06em; text-transform: uppercase; color: var(--fg-subtle); }
  .muted { color: var(--fg-subtle); }
  .small { font-size: var(--dash-caption); line-height: 1.5; }

  /* Pestañas de vista (I-06): pastilla segmentada neutra. */
  .seg { display: inline-flex; padding: 3px; gap: 2px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); }
  .seg button { min-height: 32px; padding: 5px 12px; border: 0; border-radius: 7px; background: transparent; color: var(--fg-secondary); font: inherit; font-size: var(--dash-small); font-weight: 500; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
  .seg button:hover { color: var(--fg-primary); }
  .seg button[aria-selected='true'] { background: var(--surface-3); color: var(--fg-primary); }
  .seg button:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .seg__live { min-width: 18px; padding: 0 6px; border-radius: var(--radius-pill); background: var(--accent-teal-dim); color: var(--accent-teal); font-size: var(--dash-caption); font-weight: 600; }

  /* ── Embudo + dónde se van ── */
  .top { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: var(--space-4); margin-bottom: var(--space-4); }
  .funnel { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)) 150px; overflow: hidden; }
  .step { display: flex; flex-direction: column; gap: 6px; padding: 16px 18px; border: 0; border-right: 1px solid var(--border-subtle); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .step:last-child { border-right: 0; }
  .step:hover { background: var(--bg-elevated); }
  .step:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: -2px; }
  .step[aria-pressed='true'] { background: var(--bg-elevated); box-shadow: inset 0 -2px 0 var(--accent-gold); }
  .step__label { font-size: var(--dash-small); color: var(--fg-secondary); }
  .step__n { font-size: 26px; font-weight: 650; font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
  .step__n em { font-style: normal; font-size: var(--dash-caption); font-weight: 600; color: var(--color-warning, #f5b338); margin-left: 6px; }
  .step__bar { height: 4px; border-radius: 4px; background: var(--bg-elevated); overflow: hidden; margin-top: auto; }
  .step__bar i { display: block; height: 100%; background: var(--accent-teal); border-radius: 4px; }
  .step--side { background: rgba(96, 165, 250, .04); }
  .why { padding: 14px 18px 10px; }
  .why ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0; }
  .why button { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) 90px 26px; align-items: center; gap: 10px; padding: 6px 8px; margin: 0 -8px; border: 0; border-radius: var(--radius-sm); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .why button:hover, .why button[aria-pressed='true'] { background: var(--bg-elevated); }
  .why button:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 1px; }
  .why__t { font-size: var(--dash-small); color: var(--fg-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .why b { text-align: right; font-variant-numeric: tabular-nums; }
  .why__bar { height: 6px; border-radius: 4px; background: var(--bg-elevated); overflow: hidden; }
  .why__bar i { display: block; height: 100%; background: var(--color-warning, #f5b338); border-radius: 4px; }

  /* ── Consola de tres columnas ── */
  .console { scroll-margin-top: 72px; display: grid; grid-template-columns: 320px minmax(0, 1fr) 280px; height: min(74vh, 760px); min-height: 520px; overflow: hidden; }
  .inbox { border-right: 1px solid var(--border); display: flex; flex-direction: column; min-height: 0; min-width: 0; }
  .pills { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 14px; border-bottom: 1px solid var(--border-subtle); }
  .pill { display: inline-flex; align-items: center; gap: 6px; min-height: 30px; padding: 4px 11px; border: 1px solid var(--border); border-radius: var(--radius-pill); background: transparent; color: var(--fg-secondary); font: inherit; font-size: var(--dash-small); font-weight: 500; cursor: pointer; }
  .pill:hover { border-color: var(--border-strong); color: var(--fg-primary); }
  .pill:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .pill[aria-pressed='true'] { background: var(--surface-3); border-color: var(--fg-subtle); color: var(--fg-primary); font-weight: 600; }
  .pill__n { min-width: 18px; padding: 0 6px; border-radius: var(--radius-pill); background: var(--accent-teal-dim); color: var(--accent-teal); font-size: var(--dash-caption); font-weight: 600; text-align: center; }
  .active-filter { margin: 0; padding: 8px 14px; font-size: var(--dash-caption); color: var(--fg-secondary); border-bottom: 1px solid var(--border-subtle); }
  .active-filter button { border: 0; background: none; padding: 0; color: var(--fg-primary); text-decoration: underline; font: inherit; cursor: pointer; }
  .list { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; }
  .item { width: 100%; display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border: 0; border-bottom: 1px solid var(--border-subtle); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .item:hover { background: var(--bg-elevated); }
  .item:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: -2px; }
  .item[aria-current='true'] { background: var(--bg-elevated); box-shadow: inset 2px 0 0 var(--accent-gold); }
  .item__r1 { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .item__t { min-width: 0; font-weight: 600; font-size: var(--dash-small); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .item__q { color: var(--fg-secondary); font-size: var(--dash-small); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .item__m { display: flex; justify-content: space-between; gap: 8px; font-size: var(--dash-caption); color: var(--fg-subtle); min-width: 0; }
  .item__m > :first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item { min-width: 0; }
  .item__when { white-space: nowrap; }
  .fail-txt { color: var(--color-warning, #f5b338); }

  .thread { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
  .thread__head { display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-bottom: 1px solid var(--border-subtle); }
  .thread__head > div { flex: 1; min-width: 0; }
  .back { display: none; width: 36px; height: 36px; border: 1px solid var(--border); border-radius: var(--radius-md); background: transparent; color: var(--fg-secondary); cursor: pointer; place-items: center; }
  .feed { list-style: none; margin: 0; padding: 18px 22px 28px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; flex: 1; }
  .msg { max-width: min(72%, 560px); padding: 9px 12px; border-radius: 12px; line-height: 1.5; font-size: var(--dash-body); white-space: pre-wrap; overflow-wrap: anywhere; }
  .who { display: block; font-size: 11px; color: var(--fg-subtle); margin-bottom: 3px; }
  .msg--u { align-self: flex-start; background: var(--surface-3); }
  .msg--m { align-self: flex-end; background: rgba(var(--accent-gold-rgb), .07); border: 1px solid rgba(var(--accent-gold-rgb), .18); }
  .msg--o { align-self: flex-end; background: rgba(52, 211, 153, .08); border: 1px solid rgba(52, 211, 153, .25); }
  .composer { display: flex; flex-direction: column; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border); }
  .composer--off { flex-direction: row; align-items: center; justify-content: space-between; gap: 12px; }
  .composer textarea { width: 100%; resize: vertical; min-height: 56px; padding: 10px 12px; border: 1px solid var(--border-strong); border-radius: var(--radius-md); background: var(--bg-base); color: var(--fg-primary); font: inherit; font-size: var(--dash-body); line-height: 1.5; }
  .composer textarea:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 1px; }
  .composer__acts { display: flex; justify-content: flex-end; gap: 8px; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .msg--fb { border-color: rgba(245, 179, 56, .5); }
  .toolcard { align-self: flex-end; display: inline-flex; gap: 6px; align-items: center; padding: 5px 10px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-elevated); color: var(--fg-secondary); font-size: var(--dash-caption); }
  .ev { align-self: flex-end; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .ev--warn { color: var(--color-warning, #f5b338); }
  .ev--live { align-self: center; color: var(--accent-teal); }
  .failbox { align-self: stretch; padding: 9px 12px; border: 1px solid rgba(245, 179, 56, .45); border-radius: 10px; background: rgba(245, 179, 56, .06); color: var(--color-warning, #f5b338); font-size: var(--dash-small); }
  .failbox--rail { display: flex; flex-direction: column; gap: 2px; }
  .failbox--rail span { color: var(--fg-secondary); font-size: var(--dash-caption); }

  .rail { border-left: 1px solid var(--border); padding: 16px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; }
  .steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; font-size: var(--dash-small); color: var(--fg-subtle); }
  .steps li { display: flex; align-items: center; gap: 8px; }
  .steps i { width: 9px; height: 9px; border-radius: 50%; border: 1px solid var(--fg-faint); flex: none; }
  .steps li.done { color: var(--fg-primary); }
  .steps li.done i { background: var(--accent-teal); border-color: var(--accent-teal); }
  .kv { display: grid; grid-template-columns: 110px 1fr; gap: 7px 10px; margin: 0; font-size: var(--dash-small); }
  .kv dt { color: var(--fg-subtle); }
  .kv dd { margin: 0; overflow-wrap: anywhere; }
  .kv a { color: var(--fg-primary); }

  /* ── Gasto ── */
  .spend { padding: 22px 24px; max-width: 640px; }
  .spend__big { margin: 4px 0 0; font-size: 34px; font-weight: 650; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .spend__big span { font-size: var(--dash-body); font-weight: 400; color: var(--fg-subtle); margin-left: 6px; }
  .meter { position: relative; height: 10px; border-radius: 6px; background: var(--bg-elevated); margin: 14px 0 8px; overflow: hidden; }
  .meter i { position: absolute; inset: 0 auto 0 0; background: var(--accent-teal); border-radius: 6px; }
  .meter i.warn { background: var(--color-warning, #f5b338); }
  .meter u { position: absolute; top: 0; bottom: 0; left: 80%; width: 2px; background: var(--color-warning, #f5b338); }
  .spend .kv { margin: 18px 0 14px; grid-template-columns: 200px 1fr; }
  .days { display: flex; align-items: flex-end; gap: 4px; height: 110px; margin-bottom: 14px; }
  .day { flex: 1; max-width: 28px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 4px; }
  .day i { width: 100%; background: var(--accent-teal); border-radius: 3px 3px 0 0; opacity: .85; }
  .day small { font-size: 10px; color: var(--fg-subtle); }

  /* ── Tamaños intermedios: la ficha baja bajo la conversación ── */
  @media (max-width: 1360px) {
    .console { grid-template-columns: 290px minmax(0, 1fr) 240px; }
  }
  @media (max-width: 1100px) {
    .console { grid-template-columns: 280px minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; }
    .inbox { grid-row: 1 / 3; }
    .rail { border-left: 0; border-top: 1px solid var(--border); flex-direction: row; flex-wrap: wrap; gap: 16px 28px; max-height: 220px; }
  }
  @media (max-width: 1180px) {
    .top { grid-template-columns: 1fr; }
  }
  /* ── Móvil: lista o conversación a pantalla entera (nunca las dos) ── */
  @media (max-width: 900px) {
    .funnel { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .step { border-bottom: 1px solid var(--border-subtle); }
    .step--side { grid-column: 1 / -1; }
    .console { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto; height: auto; min-height: 0; }
    .why button { grid-template-columns: minmax(0, 1fr) 56px 24px; }
    .inbox { border-right: 0; grid-row: auto; }
    .console .rail { display: none; }
    .console.has-open .rail { display: flex; max-height: none; }
    .list { max-height: none; }
    .console .thread { display: none; }
    .console.has-open .inbox { display: none; }
    .console.has-open .thread { display: flex; min-height: 70vh; }
    .back { display: grid; }
    .msg { max-width: 88%; }
    .pill { min-height: 44px; }
    .item { padding: 14px; }
  }
</style>
