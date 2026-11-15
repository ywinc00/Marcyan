<script>
  // Ajustes del panel (fase 4 del plan). Ajustes reales y útiles, cada uno en
  // una fila con su explicación a la izquierda y su control a la derecha:
  //  · Perfil fiscal: forma del negocio (y socios), cómo declaras, método y
  //    sales tax de Texas. Alimenta el cálculo del trimestral de Finanzas.
  //  · Cuentas por donde entra y sale el dinero.
  //  · Agente contable: encendido, tope de gasto de IA, «Revisar ahora» y sus
  //    últimas pasadas (fase 2: solo propone; nada se aplica sin el dueño).
  //  · Avisos en este dispositivo.
  //  · Equipo: quién puede entrar (se cambia en Vercel, por seguridad).
  //  · Topes de seguridad de Marcy y formularios (solo lectura).
  //  · Datos: descargas para guardar o llevar al contador.
  import PageHeader from './ui/PageHeader.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import LoadingState from './ui/LoadingState.svelte';
  import Icon from './ui/Icon.svelte';
  import PushToggle from './PushToggle.svelte';
  import RecordsPanel from './finanzas/RecordsPanel.svelte';
  import { api, errorMessage, isSessionError } from './lib/api.js';
  import { toast } from './lib/toast.svelte.js';
  import { route, href } from './lib/router.svelte.js';
  import { fmtDateTime } from './lib/dates.js';
  import { formatUsd } from './finanzas/fin.js';

  const PARTS = [
    { id: 'fiscal', label: 'Perfil fiscal' },
    { id: 'cuentas', label: 'Cuentas' },
    { id: 'agente', label: 'Agente contable' },
    { id: 'avisos', label: 'Avisos' },
    { id: 'equipo', label: 'Equipo' },
    { id: 'topes', label: 'Topes de Marcy' },
    { id: 'datos', label: 'Datos' },
  ];
  const part = $derived(PARTS.find((p) => p.id === route.sub[0]) || PARTS[0]);

  let data = $state(null);
  let error = $state('');
  async function load() {
    error = '';
    try { data = await api('/api/admin/settings'); }
    catch (e) { if (!isSessionError(e)) error = errorMessage(e, 'No se pudieron cargar los ajustes.'); }
  }
  $effect(() => { load(); });

  // ── Perfil fiscal ──
  const year = new Date().getFullYear();
  let entity = $state({ type: 'undecided', from: `${year}-01-01`, partners: [{ name: '', share: 50 }, { name: '', share: 50 }] });
  let saving = $state('');
  let fieldError = $state({});
  $effect(() => {
    if (!data) return;
    const periods = data.finance['finance.entity']?.periods || [];
    const p = periods[periods.length - 1];
    if (p) entity = { type: p.type, from: p.from, partners: p.partners && p.partners.length ? p.partners.map((x) => ({ ...x })) : [{ name: '', share: 50 }, { name: '', share: 50 }] };
  });
  async function save(key, value, done) {
    saving = key; fieldError = { ...fieldError, [key]: '' };
    try {
      const j = await api('/api/admin/settings', { method: 'POST', body: { key, value } });
      data.finance = j.finance;
      toast(done || 'Guardado');
    } catch (e) {
      if (!isSessionError(e)) fieldError = { ...fieldError, [key]: errorMessage(e, 'No se pudo guardar.') };
    } finally { saving = ''; }
  }
  const totalShare = $derived(entity.partners.reduce((a, p) => a + (Number(p.share) || 0), 0));
  const ENTITY_HELP = {
    undecided: 'Mientras lo decides con tu contador, el trimestral se calcula como negocio de una persona.',
    individual: 'Declaras el negocio en tu declaración personal (Schedule C).',
    single_llc: 'LLC de un solo dueño: para impuestos federales cuenta como negocio de una persona (Schedule C).',
    partnership: 'Sociedad (Form 1065): cada socio paga por su parte; el trimestral se calcula para cada uno.',
  };

  // ── Agente contable ──
  let agent = $state(null);
  let agentError = $state('');
  let capInput = $state('');
  let running = $state(false);
  async function loadAgent() {
    agentError = '';
    try { agent = await api('/api/admin/finance/agent'); capInput = String(agent.settings.monthly_cap_usd); }
    catch (e) { if (!isSessionError(e)) agentError = errorMessage(e, 'No se pudo cargar el agente.'); }
  }
  $effect(() => { if (part.id === 'agente' && !agent) loadAgent(); });
  async function saveAgent(next, done) {
    await save('finance.agent', next, done);
    if (agent && data && data.finance['finance.agent']) agent.settings = { ...agent.settings, ...data.finance['finance.agent'] };
  }
  async function runNow() {
    running = true; fieldError = { ...fieldError, run: '' };
    try {
      const j = await api('/api/admin/finance/agent', { method: 'POST', body: { action: 'run' } });
      agent = j.state;
      const n = j.run.proposals;
      toast(n ? `Revisado: ${n} propuesta${n === 1 ? '' : 's'} en Finanzas` : 'Revisado: nada que proponer');
    } catch (e) {
      if (!isSessionError(e)) fieldError = { ...fieldError, run: errorMessage(e, 'No se pudo revisar.') };
    } finally { running = false; }
  }
  let forgetting = $state('');
  async function forget(m) {
    forgetting = m.path; fieldError = { ...fieldError, run: '' };
    try {
      agent = (await api('/api/admin/finance/agent', { method: 'POST', body: { action: 'forget', path: m.path } })).state;
      toast('Nota borrada');
    } catch (e) {
      if (!isSessionError(e)) fieldError = { ...fieldError, run: errorMessage(e, 'No se pudo borrar.') };
    } finally { forgetting = ''; }
  }
  const usd2 = (v) => formatUsd(Math.round(Number(v || 0) * 100));
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const RUN_WORDS = { nothing_new: 'Nada nuevo que revisar', skipped: 'No revisó', failed: 'Falló', running: 'Revisando' };
  function runLine(r) {
    if (r.status === 'done') {
      const what = r.events ? `Revisó ${plural(r.events, 'cosa nueva', 'cosas nuevas')}` : 'Revisó lo pendiente';
      return r.proposals ? `${what} y propuso ${r.proposals}` : `${what}, sin propuestas`;
    }
    const base = RUN_WORDS[r.status] || 'Revisión';
    return (r.status === 'skipped' || r.status === 'failed') && r.note ? `${base}: ${r.note.charAt(0).toLowerCase()}${r.note.slice(1)}` : base;
  }
</script>

<div class="aj">
  <PageHeader title="Ajustes" subtitle="Cómo funciona el panel para tu negocio." />

  <div class="aj-parts" role="group" aria-label="Partes de Ajustes">
    {#each PARTS as p (p.id)}
      <a class="aj-pill" href={href('ajustes', p.id === 'fiscal' ? [] : [p.id])} aria-current={part.id === p.id ? 'page' : undefined}>{p.label}</a>
    {/each}
  </div>

  {#if error}
    <ErrorState title="No se pudieron cargar los ajustes" message={error} onretry={load} />
  {:else}
    <LoadingState loading={!data} rows={4} height={72} gap={1} label="Cargando los ajustes">
      {#if data}
        {#if part.id === 'fiscal'}
          <section class="aj-card" aria-label="Perfil fiscal">
            <div class="aj-row aj-row--stack">
              <div class="aj-txt"><h3>Forma del negocio</h3><p>{ENTITY_HELP[entity.type]}</p></div>
              <div class="aj-ctl aj-ctl--wide">
                <div class="aj-seg" role="radiogroup" aria-label="Forma del negocio">
                  {#each [['undecided', 'Sin decidir'], ['individual', 'Persona'], ['single_llc', 'LLC de un dueño'], ['partnership', 'Sociedad']] as [id, lbl] (id)}
                    <button type="button" role="radio" aria-checked={entity.type === id} onclick={() => (entity.type = id)}>{lbl}</button>
                  {/each}
                </div>
                {#if entity.type === 'partnership'}
                  <div class="aj-partners">
                    {#each entity.partners as p, i (i)}
                      <div class="aj-partner">
                        <label><span class="sr-only">Socio {i + 1}</span><input class="ui-input" type="text" maxlength="80" placeholder={`Socio ${i + 1}`} bind:value={p.name} /></label>
                        <label class="aj-share"><span class="sr-only">Porcentaje del socio {i + 1}</span><input class="ui-input" type="number" min="1" max="100" step="1" inputmode="numeric" bind:value={p.share} /><span>%</span></label>
                        {#if entity.partners.length > 2}<button type="button" class="ui-icon-btn" aria-label={`Quitar al socio ${i + 1}`} onclick={() => entity.partners.splice(i, 1)}><Icon name="close" size={16} /></button>{/if}
                      </div>
                    {/each}
                    <div class="aj-pfoot">
                      <button type="button" class="b b--ghost b--mini" onclick={() => entity.partners.push({ name: '', share: 0 })}><Icon name="plus" size={14} />Otro socio</button>
                      <span class:aj-bad={Math.abs(totalShare - 100) > 0.01}>Suman {totalShare}%</span>
                    </div>
                  </div>
                {/if}
                <label class="aj-inline">Vale desde <input class="ui-input" type="date" bind:value={entity.from} /></label>
                <div class="aj-save">
                  <button type="button" class="b" disabled={saving === 'finance.entity'} onclick={() => save('finance.entity', { type: entity.type, from: entity.from, partners: entity.type === 'partnership' ? entity.partners : [] }, 'Forma del negocio guardada')}>{saving === 'finance.entity' ? 'Guardando…' : 'Guardar'}</button>
                  {#if fieldError['finance.entity']}<span class="aj-err" role="status">{fieldError['finance.entity']}</span>{/if}
                </div>
              </div>
            </div>
            <div class="aj-row">
              <div class="aj-txt"><h3>Cómo declaras</h3><p>Para la deducción y los tramos del trimestral.</p></div>
              <div class="aj-ctl">
                <select class="ui-input" value={data.finance['finance.filing']} disabled={saving === 'finance.filing'} onchange={(e) => save('finance.filing', e.currentTarget.value, 'Guardado')}>
                  <option value="single">Individual</option>
                  <option value="mfj">Conjunta con tu pareja</option>
                </select>
                {#if fieldError['finance.filing']}<span class="aj-err" role="status">{fieldError['finance.filing']}</span>{/if}
              </div>
            </div>
            <div class="aj-row">
              <div class="aj-txt"><h3>Método contable</h3><p>De caja: cuenta el dinero cuando entra o sale. Es el de casi todos los negocios pequeños.</p></div>
              <div class="aj-ctl">
                <select class="ui-input" value={data.finance['finance.method']} disabled={saving === 'finance.method'} onchange={(e) => save('finance.method', e.currentTarget.value, 'Guardado')}>
                  <option value="cash">De caja</option>
                  <option value="accrual">De devengo</option>
                </select>
              </div>
            </div>
            <div class="aj-row">
              <div class="aj-txt"><h3>Sales tax de Texas</h3><p>Si ya tienes permiso de ventas de Texas. Confírmalo con tu contador: el diseño web y el hosting pueden llevarlo.</p></div>
              <div class="aj-ctl">
                <label class="aj-switch"><input type="checkbox" checked={!!data.finance['finance.sales_tax_tx']?.registered} disabled={saving === 'finance.sales_tax_tx'}
                  onchange={(e) => save('finance.sales_tax_tx', { registered: e.currentTarget.checked }, 'Guardado')} /><span>{data.finance['finance.sales_tax_tx']?.registered ? 'Con permiso' : 'Sin permiso'}</span></label>
              </div>
            </div>
            <p class="aj-foot">Estos datos solo cambian los cálculos de Finanzas. Para revisión de tu contador, no es consejo fiscal.</p>
          </section>
        {:else if part.id === 'cuentas'}
          <RecordsPanel kind="accounts" />
        {:else if part.id === 'agente'}
          {#if agentError}
            <ErrorState title="No se pudo cargar el agente" message={agentError} onretry={loadAgent} />
          {:else}
            <LoadingState loading={!agent} rows={3} height={72} gap={1} label="Cargando el agente contable">
              {#if agent}
                {@const s = agent.settings}
                <section class="aj-card" aria-label="Agente contable">
                  <div class="aj-row">
                    <div class="aj-txt"><h3>Agente contable</h3><p>Cada mañana mira los correos de facturas, lo importado del banco y los meses por cerrar, y te deja propuestas en Finanzas. Solo propone: no paga, no mueve dinero ni presenta impuestos.</p></div>
                    <div class="aj-ctl">
                      <label class="aj-switch"><input type="checkbox" checked={s.enabled} disabled={saving === 'finance.agent'}
                        onchange={(e) => saveAgent({ enabled: e.currentTarget.checked, monthly_cap_usd: s.monthly_cap_usd }, e.currentTarget.checked ? 'Agente encendido' : 'Agente apagado')} /><span>{s.enabled ? 'Encendido' : 'Apagado'}</span></label>
                    </div>
                  </div>
                  <div class="aj-row">
                    <div class="aj-txt"><h3>Tope de gasto de IA al mes</h3><p>Este mes lleva {usd2(agent.month_spend_usd)} de {usd2(s.monthly_cap_usd)}. Solo gasta los días que hay algo nuevo; si llega al tope, para hasta el mes siguiente y te avisa.</p></div>
                    <div class="aj-ctl">
                      <div class="aj-save">
                        <label class="aj-inline"><span class="sr-only">Tope en dólares</span>$<input class="ui-input aj-cap" type="number" min="1" max="200" step="1" inputmode="numeric" bind:value={capInput} /></label>
                        <button type="button" class="b" disabled={saving === 'finance.agent' || Number(capInput) === s.monthly_cap_usd}
                          onclick={() => saveAgent({ enabled: s.enabled, monthly_cap_usd: Number(capInput) }, 'Tope guardado')}>Guardar</button>
                      </div>
                      {#if fieldError['finance.agent']}<span class="aj-err" role="status">{fieldError['finance.agent']}</span>{/if}
                    </div>
                  </div>
                  <div class="aj-row">
                    <div class="aj-txt"><h3>Revisar ahora</h3><p>Útil justo después de importar un extracto. Hasta 4 veces al día; la revisión de cada mañana sigue igual.</p></div>
                    <div class="aj-ctl">
                      <button type="button" class="b" disabled={running || !s.enabled} onclick={runNow}>{running ? 'Revisando…' : 'Revisar ahora'}</button>
                      {#if fieldError.run}<span class="aj-err" role="status">{fieldError.run}</span>{/if}
                    </div>
                  </div>
                  <div class="aj-row aj-row--stack">
                    <div class="aj-txt"><h3>Últimas revisiones</h3><p>{agent.proposals.length ? `Tienes ${plural(agent.proposals.length, 'propuesta esperando', 'propuestas esperando')} en Finanzas.` : 'No hay propuestas esperando.'}</p>
                      {#if agent.proposals.length}<a class="aj-link" href={href('finanzas')}>Ver en Finanzas</a>{/if}</div>
                    {#if agent.runs.length}
                      <ul class="aj-list aj-runs">
                        {#each agent.runs as r (r.id)}
                          <li><span><b>{fmtDateTime(r.started_at)}</b>{r.trigger === 'manual' ? ', a mano' : ''}<br />{runLine(r)}{#if r.status === 'done' && r.note}<span class="aj-note">{r.note}</span>{/if}</span><em>{usd2(r.cost_usd)}</em></li>
                        {/each}
                      </ul>
                    {:else}
                      <p class="aj-empty">Aún no ha revisado nada. La primera revisión es mañana temprano, o pulsa «Revisar ahora».</p>
                    {/if}
                  </div>
                  <div class="aj-row aj-row--stack">
                    <div class="aj-txt"><h3>Lo que ha aprendido</h3><p>Notas que guarda de lo que aplicas y descartas, para no preguntarte lo mismo. Si alguna no te cuadra, bórrala.</p></div>
                    {#if agent.memory && agent.memory.length}
                      <ul class="aj-list aj-mem">
                        {#each agent.memory as m (m.path)}
                          <li><span><b>{m.name}</b><span class="aj-note">{m.content}</span></span>
                            <button type="button" class="b b--ghost b--mini" disabled={forgetting === m.path} onclick={() => forget(m)}>Borrar</button></li>
                        {/each}
                      </ul>
                    {:else}
                      <p class="aj-empty">Aún no ha guardado nada.</p>
                    {/if}
                  </div>
                  <p class="aj-foot">Usa la IA de Anthropic. Los correos le llegan sin direcciones ni teléfonos, y lo que dicen se trata como datos, nunca como órdenes. Para revisión de tu contador, no es consejo fiscal.</p>
                </section>
              {/if}
            </LoadingState>
          {/if}
        {:else if part.id === 'avisos'}
          <section class="aj-card" aria-label="Avisos">
            <div class="aj-row">
              <div class="aj-txt"><h3>Avisos en este dispositivo</h3><p>Leads nuevos, conversaciones de Marcy que piden una persona, cierres de mes y plazos fiscales. Se activa en cada móvil u ordenador.</p></div>
              <div class="aj-ctl"><PushToggle /></div>
            </div>
            <div class="aj-row">
              <div class="aj-txt"><h3>Todos los avisos</h3><p>La lista completa, con lo que ya viste y lo pendiente.</p></div>
              <div class="aj-ctl"><a class="b" href={href('avisos')}>Ver avisos</a></div>
            </div>
          </section>
        {:else if part.id === 'equipo'}
          <section class="aj-card" aria-label="Equipo">
            <div class="aj-row aj-row--stack">
              <div class="aj-txt"><h3>Quién puede entrar</h3><p>Entra quien reciba el enlace de acceso en uno de estos correos. Por seguridad se cambia en Vercel, no desde aquí: dime a quién añadir o quitar.</p></div>
              <ul class="aj-list">
                {#each data.team as m (m)}<li>{m}{#if m === data.me}<span class="aj-tag">tú</span>{/if}</li>{/each}
              </ul>
            </div>
          </section>
        {:else if part.id === 'topes'}
          <section class="aj-card" aria-label="Topes de Marcy">
            <div class="aj-row aj-row--stack">
              <div class="aj-txt"><h3>Topes de seguridad</h3><p>Frenan el gasto de IA y el abuso de los formularios aunque alguien insista. Además está el límite mensual de la cuenta de Anthropic. Se cambian en el código para que nadie los suba por error: dime cuál tocar.</p></div>
              <ul class="aj-list aj-list--num">
                {#each data.limits as l (l.label)}<li><span>{l.label}</span><b>{l.value}</b></li>{/each}
              </ul>
            </div>
          </section>
        {:else if part.id === 'datos'}
          <section class="aj-card" aria-label="Datos">
            <div class="aj-row">
              <div class="aj-txt"><h3>Movimientos de {year} para el contador</h3><p>Cobros, devoluciones, ingresos y gastos con su línea del Schedule C, en un archivo que abre Excel.</p></div>
              <div class="aj-ctl"><a class="b" href={`/api/admin/finance/books?view=export&year=${year}`} download><Icon name="download" size={16} />Descargar</a></div>
            </div>
            <div class="aj-row">
              <div class="aj-txt"><h3>Leads</h3><p>Todos los leads con su origen y estado.</p></div>
              <div class="aj-ctl"><a class="b" href="/api/admin/export?type=leads" download><Icon name="download" size={16} />Descargar</a></div>
            </div>
            <div class="aj-row">
              <div class="aj-txt"><h3>Briefs</h3><p>Todos los briefs recibidos con sus respuestas.</p></div>
              <div class="aj-ctl"><a class="b" href="/api/admin/export" download><Icon name="download" size={16} />Descargar</a></div>
            </div>
            <p class="aj-foot">Lo de Finanzas no se borra solo. El IRS pide guardar los registros al menos tres años después de cada declaración, y más en algunos casos (por ejemplo, siete si declaras deudas incobrables): tu contador te dirá cuánto.</p>
          </section>
        {/if}
      {/if}
    </LoadingState>
  {/if}
</div>

<style>
  .aj { max-width: 980px; }
  /* Selects con el mismo caret que Finanzas (sin el aspecto nativo del sistema). */
  .aj :global(select.ui-input) {
    appearance: none; -webkit-appearance: none; padding-right: 32px; cursor: pointer;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b8b95' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>");
    background-repeat: no-repeat; background-position: right 11px center;
  }
  .aj-parts { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 var(--space-4); }
  .aj-pill { display: inline-flex; align-items: center; min-height: 32px; padding: 5px 12px; border-radius: var(--radius-pill); border: 1px solid var(--border);
    color: var(--fg-secondary); font: 500 var(--dash-small)/1.2 var(--font-body); text-decoration: none; }
  .aj-pill:hover { border-color: var(--border-strong); color: var(--fg-primary); }
  .aj-pill[aria-current='page'] { background: var(--surface-3); border-color: var(--border-strong); color: var(--fg-primary); }
  .aj-pill:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  @media (pointer: coarse) { .aj-pill { min-height: 40px; } }
  .aj-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; container-type: inline-size; }
  .aj-row { display: flex; gap: 16px 24px; align-items: center; justify-content: space-between; padding: 18px 20px; border-top: 1px solid var(--border-subtle); }
  .aj-row:first-child { border-top: 0; }
  .aj-row--stack { align-items: flex-start; }
  .aj-txt { flex: 1 1 320px; min-width: 0; }
  .aj-txt h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--fg-primary); }
  .aj-txt p { margin: 4px 0 0; color: var(--fg-subtle); font-size: var(--dash-small); max-width: 62ch; }
  .aj-ctl { flex: 0 1 auto; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
  .aj-ctl .ui-input { min-width: 220px; }
  .aj-ctl--wide { flex: 1 1 380px; align-items: stretch; }
  .aj-seg { display: flex; flex-wrap: wrap; gap: 4px; }
  .aj-seg button { min-height: 34px; padding: 6px 12px; border-radius: var(--radius-pill); border: 1px solid var(--border); background: transparent; color: var(--fg-secondary); font: 500 var(--dash-small)/1.2 var(--font-body); cursor: pointer; }
  .aj-seg button[aria-checked='true'] { background: var(--surface-3); border-color: var(--border-strong); color: var(--fg-primary); }
  .aj-seg button:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .aj-partners { display: grid; gap: 8px; }
  .aj-partner { display: grid; grid-template-columns: minmax(0, 1fr) 110px auto; gap: 8px; align-items: center; }
  .aj-share { display: flex; align-items: center; gap: 6px; color: var(--fg-secondary); }
  .aj-share .ui-input { min-width: 0; width: 80px; }
  .aj-pfoot { display: flex; justify-content: space-between; align-items: center; font-size: var(--dash-small); color: var(--fg-secondary); }
  .aj-bad { color: var(--color-error); }
  .aj-inline { display: flex; align-items: center; gap: 10px; color: var(--fg-secondary); font-size: var(--dash-small); }
  .aj-inline .ui-input { min-width: 0; width: auto; }
  .aj-save { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .aj-err { color: var(--color-error); font-size: var(--dash-small); }
  .aj-switch { display: inline-flex; align-items: center; gap: 8px; font-size: var(--dash-small); color: var(--fg-secondary); cursor: pointer; }
  .aj-switch input { width: 18px; height: 18px; accent-color: var(--accent-teal); }
  .aj-list { list-style: none; margin: 0; padding: 0; flex: 1 1 320px; display: grid; gap: 8px; }
  .aj-list li { display: flex; justify-content: space-between; gap: 12px; color: var(--fg-primary); overflow-wrap: anywhere; }
  .aj-list--num b { font-variant-numeric: tabular-nums; font-weight: 600; }
  .aj-list--num span { color: var(--fg-secondary); }
  .aj-tag { margin-left: 8px; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .aj-cap { min-width: 0 !important; width: 90px; }
  .aj-link { display: inline-block; margin-top: 6px; color: var(--fg-secondary); font-size: var(--dash-small); text-underline-offset: 3px; }
  .aj-link:hover { color: var(--fg-primary); }
  .aj-runs li { align-items: baseline; font-size: var(--dash-small); color: var(--fg-secondary); }
  .aj-runs b { font-weight: 500; color: var(--fg-primary); }
  .aj-runs em { font-style: normal; font-variant-numeric: tabular-nums; color: var(--fg-subtle); white-space: nowrap; }
  .aj-note { display: block; margin-top: 2px; color: var(--fg-subtle); white-space: pre-line; overflow-wrap: anywhere; }
  .aj-mem li { align-items: flex-start; font-size: var(--dash-small); }
  .aj-mem b { font-weight: 500; color: var(--fg-primary); }
  .aj-empty { flex: 1 1 320px; margin: 0; color: var(--fg-subtle); font-size: var(--dash-small); }
  .aj-foot { margin: 0; padding: 12px 20px; border-top: 1px solid var(--border-subtle); color: var(--fg-subtle); font-size: var(--dash-small); }
  @container (max-width: 560px) {
    .aj-row { flex-direction: column; align-items: stretch; }
    /* En columna, la base flexible sería ALTO: cada bloque mide lo que ocupa. */
    .aj-row > * { flex: 0 0 auto; }
    .aj-ctl { align-items: stretch; }
    .aj-ctl .ui-input { min-width: 0; width: 100%; }
    .aj-partner { grid-template-columns: minmax(0, 1fr) 96px auto; }
  }
</style>
