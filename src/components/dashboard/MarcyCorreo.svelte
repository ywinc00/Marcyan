<script>
  // Correo de Marcy (#/marcy?vista=correo): la bandeja que Marcy clasificó.
  // Filas de una línea agrupadas por día con la categoría, el resumen de Marcy
  // y si dejó borrador o mandó acuse (referencias: Jace y Missive, design/orbit.md).
  // Al pulsar una fila se abre su ficha al lado con "Abrir en Gmail" y el estado.
  import { api, errorMessage, isSessionError } from './lib/api.js';
  import { toast } from './lib/toast.svelte.js';
  import { leadHref } from './lib/marcy.js';
  import { CATS, FILTERS, STATUS_LABEL, matches, counts, groupByDay, timeOf, gmailHref } from './lib/correo.js';
  import StatusChip from './ui/StatusChip.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import Icon from './ui/Icon.svelte';

  let correos = $state([]);
  let estado = $state([]);
  let acuse = $state(false);
  let loading = $state(true);
  let error = $state('');
  let pending = $state(false);
  let filtro = $state('hoy');
  let sel = $state(null);
  let busy = $state(false);
  let first = true;

  const n = $derived(counts(correos));
  const shown = $derived(correos.filter((c) => matches(c, filtro)));
  const groups = $derived(groupByDay(shown));
  // Sin elegir nada, la ficha enseña el primero de la lista (sin marcarlo como visto).
  const cur = $derived(sel || shown[0] || null);
  const FLABEL = { hoy: 'Responder hoy', todos: 'Todos' };

  async function load() {
    loading = true;
    try {
      const d = await api('/api/admin/correo?dias=14');
      correos = d.correos || []; estado = d.estado || []; acuse = !!d.acuse_activo; error = ''; pending = false;
      if (sel) sel = correos.find((c) => c.id === sel.id) || null;
      if (first && filtro === 'hoy' && !counts(correos).hoy) filtro = 'todos';
      first = false;
    } catch (e) {
      if (isSessionError(e)) return;
      if (e && e.data && e.data.code === 'migration_pending') pending = true;
      else error = errorMessage(e);
    } finally { loading = false; }
  }
  $effect(() => { load(); });

  async function setStatus(status) {
    if (!cur || busy) return;
    busy = true;
    try {
      await api('/api/admin/correo', { method: 'PATCH', body: { id: cur.id, status } });
      sel = cur;
      toast(status === 'archivado' ? 'Archivado en Orbit' : 'Correo actualizado');
      await load();
    } catch (e) { if (!isSessionError(e)) toast(errorMessage(e), { tone: 'error' }); }
    finally { busy = false; }
  }

  function open(c) {
    sel = c;
    if (c.status === 'nuevo') { c.status = 'visto'; api('/api/admin/correo', { method: 'PATCH', body: { id: c.id, status: 'visto' } }).catch(() => {}); }
  }

  const ultima = $derived(estado[0] && estado[0].updated_at ? timeOf(estado[0].updated_at) : '');
</script>

{#if pending}
  <EmptyState title="Falta preparar la base de datos" text="La bandeja necesita la migración 020 aplicada. En cuanto esté, aparecen aquí los correos que clasifique Marcy." />
{:else if error}
  <ErrorState message={error} onretry={load} />
{:else}
  <section class="mail card" aria-busy={loading}>
    <header class="mail__bar">
      <div class="pills" role="tablist" aria-label="Filtrar correos">
        {#each FILTERS as f (f)}
          <button type="button" role="tab" class="pill" class:pill--hoy={f === 'hoy'} aria-selected={filtro === f} onclick={() => { filtro = f; sel = null; }}>
            {FLABEL[f] || CATS[f].label}<span class="num">{n[f]}</span>
          </button>
        {/each}
      </div>
      <p class="meta">{MAILBOX_LABEL}{#if ultima} · revisado a las {ultima}{/if}{#if !acuse} · acuse automático apagado{/if}</p>
    </header>
    <div class="mail__body">
      <div class="list">
        {#each groups as g (g.key)}
          <p class="day">{g.label}</p>
          <ul>
            {#each g.items as c (c.id)}
              {@const cat = CATS[c.category] || CATS.importante}
              <li>
                <button type="button" class="row" class:row--new={c.status === 'nuevo'} class:row--done={c.status === 'respondido' || c.status === 'archivado'}
                  aria-pressed={cur && cur.id === c.id} onclick={() => open(c)}>
                  <span class="dot" class:dot--hoy={c.urgent} aria-hidden="true"></span>
                  <span class="from">{c.from_name || c.from_email}</span>
                  <span class="txt"><b>{c.subject || '(sin asunto)'}</b><span class="sum">{c.summary}</span></span>
                  <span class="tags">
                    <StatusChip tone={cat.tone} label={cat.label} />
                    {#if c.has_draft}<span class="tag">borrador</span>{/if}
                    {#if c.acked_at}<span class="tag">acuse</span>{/if}
                  </span>
                  <span class="time">{timeOf(c.received_at)}</span>
                </button>
              </li>
            {/each}
          </ul>
        {:else}
          {#if !loading}
            <EmptyState compact title={filtro === 'hoy' ? 'Nada pendiente para hoy' : 'Sin correos aquí'} text="Marcy revisa el buzón cada 10 minutos. Lo que llegue y encaje en este filtro aparece aquí." />
          {/if}
        {/each}
      </div>
      <aside class="detail" aria-label="Detalle del correo">
        {#if cur}
          {@const cat = CATS[cur.category] || CATS.importante}
          <p class="cap">Correo · {timeOf(cur.received_at)}</p>
          <h3>{cur.subject || '(sin asunto)'}</h3>
          <p class="who">{cur.from_name ? cur.from_name + ' · ' : ''}{cur.from_email}</p>
          <div class="chips"><StatusChip tone={cat.tone} label={cat.label} />{#if cur.urgent}<StatusChip tone="warning" label="Responder hoy" />{/if}</div>
          <p class="cap">Lo que dice, según Marcy</p>
          <p class="summary">{cur.summary}</p>
          <dl class="kv">
            <dt>Respuesta</dt><dd>{cur.has_draft ? 'Borrador listo en Gmail, revísalo y envíalo' : 'Sin borrador'}</dd>
            <dt>Acuse</dt><dd>{cur.acked_at ? 'Enviado, ya sabe que respondes en 1 hora hábil' : 'No enviado'}</dd>
            <dt>Idioma</dt><dd>{cur.lang === 'en' ? 'inglés' : 'español'}</dd>
            <dt>Estado</dt><dd>{STATUS_LABEL[cur.status] || cur.status}</dd>
            {#if cur.lead_ref}<dt>Ficha</dt><dd>{#if leadHref(cur.lead_ref)}<a href={leadHref(cur.lead_ref)}>{cur.lead_ref}</a>{:else}{cur.lead_ref}{/if}</dd>{/if}
          </dl>
          <div class="acts">
            <a class="btn btn--primary" href={gmailHref(cur.thread_id)} target="_blank" rel="noopener">Abrir en Gmail</a>
            {#if cur.status !== 'respondido'}<button type="button" class="btn" disabled={busy} onclick={() => setStatus('respondido')}><Icon name="check" size={16} />Respondido</button>{/if}
            {#if cur.status !== 'archivado'}<button type="button" class="btn" disabled={busy} onclick={() => setStatus('archivado')}>Archivar</button>{/if}
          </div>
        {:else if !loading && correos.length}
          <p class="muted">Pulsa un correo para ver lo que dice y abrirlo en Gmail.</p>
        {/if}
      </aside>
    </div>
  </section>
{/if}

<script module>
  const MAILBOX_LABEL = 'yan99@marcyanstudio.com';
</script>

<style>
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .cap { margin: 0 0 6px; font-size: var(--dash-caption); font-weight: 500; letter-spacing: .06em; text-transform: uppercase; color: var(--fg-subtle); }
  .muted { color: var(--fg-subtle); font-size: var(--dash-small); margin: 0; }
  .mail__bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); }
  .pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .pill { display: inline-flex; align-items: center; gap: 7px; min-height: 32px; padding: 0 11px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--fg-secondary); font: inherit; font-size: var(--dash-small); cursor: pointer; }
  .pill:hover { color: var(--fg-primary); border-color: var(--border-strong); }
  .pill[aria-selected='true'] { color: var(--fg-primary); background: var(--bg-elevated, rgba(255,255,255,.06)); border-color: var(--border-strong); }
  .pill--hoy[aria-selected='true'] { border-color: var(--accent-gold); }
  .pill:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .num { font-size: 11px; color: var(--fg-subtle); font-variant-numeric: tabular-nums; }
  .meta { margin: 0 0 0 auto; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .mail__body { display: grid; grid-template-columns: minmax(0, 1fr) 320px; min-height: 420px; }
  .list { min-width: 0; padding: 4px 0 12px; }
  .day { margin: 0; padding: 14px 16px 6px; font-size: var(--dash-caption); font-weight: 500; letter-spacing: .06em; text-transform: uppercase; color: var(--fg-subtle); }
  ul { list-style: none; margin: 0; padding: 0; }
  .row { width: 100%; display: grid; grid-template-columns: 10px 150px minmax(0, 1fr) 210px 64px; align-items: center; gap: 12px; padding: 10px 16px; border: 0; border-left: 2px solid transparent; border-top: 1px solid var(--border-subtle); background: transparent; color: var(--fg-secondary); font: inherit; font-size: var(--dash-small); text-align: left; cursor: pointer; }
  li:first-child .row { border-top: 0; }
  .row:hover { background: rgba(255, 255, 255, .03); }
  .row[aria-pressed='true'] { background: rgba(var(--accent-gold-rgb), .06); border-left-color: var(--accent-gold); }
  .row:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: -2px; }
  .row--new .from, .row--new .txt b { color: var(--fg-primary); font-weight: 600; }
  .row--done { opacity: .55; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: transparent; }
  .dot--hoy { background: var(--accent-gold); }
  .from { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--fg-primary); }
  .txt { display: flex; gap: 8px; min-width: 0; white-space: nowrap; overflow: hidden; }
  .txt b { font-weight: 500; color: var(--fg-primary); flex: none; max-width: 38%; overflow: hidden; text-overflow: ellipsis; }
  .sum { overflow: hidden; text-overflow: ellipsis; color: var(--fg-subtle); }
  .tags { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
  .tag { font-size: 11px; padding: 2px 7px; border-radius: 999px; border: 1px solid var(--border); color: var(--fg-secondary); }
  .time { text-align: right; font-size: 12px; color: var(--fg-subtle); font-variant-numeric: tabular-nums; }
  .detail { border-left: 1px solid var(--border); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .detail h3 { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -.01em; overflow-wrap: anywhere; }
  .who { margin: 0; color: var(--fg-secondary); font-size: var(--dash-small); overflow-wrap: anywhere; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .summary { margin: 0; font-size: var(--dash-body, 15px); line-height: 1.5; color: var(--fg-primary); }
  .kv { display: grid; grid-template-columns: 90px 1fr; gap: 7px 10px; margin: 4px 0; font-size: var(--dash-small); }
  .kv dt { color: var(--fg-subtle); } .kv dd { margin: 0; overflow-wrap: anywhere; color: var(--fg-secondary); } .kv a { color: var(--fg-primary); }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  @media (max-width: 1100px) {
    .mail__body { grid-template-columns: 1fr; }
    .detail { border-left: 0; border-top: 1px solid var(--border); }
    .row { grid-template-columns: 10px minmax(0, 1fr) 56px; grid-template-areas: 'd f t' 'd x x' 'd g g'; row-gap: 4px; }
    .dot { grid-area: d; align-self: start; margin-top: 6px; } .from { grid-area: f; } .time { grid-area: t; }
    .txt { grid-area: x; flex-direction: column; gap: 2px; white-space: normal; } .txt b { max-width: none; white-space: nowrap; }
    .sum { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .tags { grid-area: g; justify-content: flex-start; }
  }
  @media (max-width: 900px) { .meta { margin-left: 0; } .btn { min-height: 44px; } .pill { min-height: 40px; } }
</style>
