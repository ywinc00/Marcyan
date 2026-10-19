<script>
  import { onMount } from 'svelte';
  import KpiArt from './KpiArt.svelte';

  import { api } from './lib/api.js';
  import { fmtDateTime, rel } from './lib/dates.js';
  import PageHeader from './ui/PageHeader.svelte';
  import Icon from './ui/Icon.svelte';

  // ── Helpers ──────────────────────────────────────────────────
  // HTTP (timeout de 15 s, errores en español legibles, sesión caducada) y
  // fechas en hora de Houston vienen de lib/ (A0).
  function friendlyError(e) { return (e && e.message) || 'No se pudieron cargar los avisos.'; }

  // type → etiqueta + clase de color. El glifo se dibuja como un pequeño
  // objeto SVG en capas (depth + glow) por tipo, no como un icono plano.
  const TYPES = {
    new_lead:     { label: 'Nuevo lead',  cls: 'lead' },
    new_brief:    { label: 'Nuevo brief', cls: 'brief' },
    chat_handoff: { label: 'Handoff',     cls: 'handoff' },
    system:       { label: 'Sistema',     cls: 'system' },
  };
  function typeMeta(t) { return TYPES[t] || TYPES.system; }

  // ── Estado ───────────────────────────────────────────────────
  let rows = $state([]);
  let unread = $state(0);
  let onlyUnread = $state(false);
  let loading = $state(false);
  let error = $state('');
  let busyAll = $state(false);
  const LIMIT = 50;

  // Conteos por tipo para el desglose del strip superior (solo lectura,
  // derivado de las filas ya cargadas — no toca los endpoints).
  const counts = $derived.by(() => {
    const c = { new_lead: 0, new_brief: 0, chat_handoff: 0, system: 0 };
    for (const n of rows) { if (c[n.type] != null) c[n.type]++; else c.system++; }
    return c;
  });

  // ── Carga ────────────────────────────────────────────────────
  async function load() {
    loading = true; error = '';
    const p = new URLSearchParams();
    p.set('limit', LIMIT);
    if (onlyUnread) p.set('unreadOnly', 'true');
    try {
      const j = await api('/api/admin/notifications?' + p.toString());
      rows = j.rows || [];
      unread = j.unread || 0;
    } catch (e) { error = friendlyError(e); }
    finally { loading = false; }
  }

  function setFilter(v) { onlyUnread = v; load(); }

  // ── Mutaciones ───────────────────────────────────────────────
  async function markOne(n) {
    if (n.read_at) return;
    try {
      const j = await api('/api/admin/notifications/' + encodeURIComponent(n.id), { method: 'PATCH' });
      rows = rows.map((x) => (x.id === n.id ? j.notification : x));
      unread = j.unread ?? Math.max(0, unread - 1);
      if (onlyUnread) rows = rows.filter((x) => !x.read_at);
    } catch (e) { error = friendlyError(e); }
  }

  async function markAll() {
    if (busyAll || unread === 0) return;
    busyAll = true;
    try {
      const j = await api('/api/admin/notifications', { method: 'PATCH' });
      unread = j.unread ?? 0;
      await load();
    } catch (e) { error = friendlyError(e); }
    finally { busyAll = false; }
  }

  onMount(load);
</script>

<PageHeader title="Avisos">
  {#snippet badge()}{#if unread}<span class="hcount">{unread}</span>{/if}{/snippet}
  {#snippet actions()}
    <button class="b b--ghost" onclick={load}><Icon name="refresh" size={16} />Actualizar</button>
    <button class="b b--primary" disabled={busyAll || unread === 0} onclick={markAll}>
      <Icon name="check" size={16} />{busyAll ? 'Marcando…' : 'Marcar todas'}
    </button>
  {/snippet}
</PageHeader>

<!-- Strip superior denso: KPI de no-leídos (con ilustración esquinera) +
     desglose por tipo, en una fila de 4 tarjetas estilo Orbit "stats".
     La ilustración esquinera usa <KpiArt> compartido (mismo lenguaje
     glossy en todas las secciones). Mapas semánticos:
       sin leer → bell · leads → inbox · briefs → docs · handoffs → users. -->
<section class="strip">
  <article class="kcard kcard--accent">
    <p class="kcard__label">Sin leer</p>
    <div class="kcard__row">
      <span class="kcard__num">{String(unread).padStart(2, '0')}</span>
      <KpiArt kind="bell" size={48} />
    </div>
    <p class="kcard__delta">
      {#if unread}<span class="warn">{unread} {unread === 1 ? 'aviso pendiente' : 'avisos pendientes'}</span>
      {:else}<span class="ok">Todo al día</span>{/if}
    </p>
  </article>

  <article class="kcard">
    <p class="kcard__label">Leads</p>
    <div class="kcard__row">
      <span class="kcard__num">{counts.new_lead}</span>
      <KpiArt kind="inbox" size={48} />
    </div>
    <p class="kcard__delta"><span class="muted">en este feed</span></p>
  </article>

  <article class="kcard">
    <p class="kcard__label">Briefs</p>
    <div class="kcard__row">
      <span class="kcard__num">{counts.new_brief}</span>
      <KpiArt kind="docs" size={48} />
    </div>
    <p class="kcard__delta"><span class="muted">en este feed</span></p>
  </article>

  <article class="kcard">
    <p class="kcard__label">Handoffs</p>
    <div class="kcard__row">
      <span class="kcard__num">{counts.chat_handoff}</span>
      <KpiArt kind="users" size={48} />
    </div>
    <p class="kcard__delta"><span class="muted">pidieron persona</span></p>
  </article>
</section>

<div class="chips">
  <button class="chip" class:on={!onlyUnread} onclick={() => setFilter(false)}>Todos</button>
  <button class="chip" class:on={onlyUnread} onclick={() => setFilter(true)}>
    No leídos <span class="chip__n">{unread}</span>
  </button>
</div>

{#if error}
  <div class="empty empty--err" role="alert">
    <p class="empty__msg">{error}</p>
    <button class="b b--primary" onclick={load}><Icon name="refresh" size={16} />Reintentar</button>
  </div>
{:else if loading}
  <div class="empty"><span class="spin" aria-hidden="true"></span>Cargando…</div>
{:else if rows.length === 0}
  <div class="empty">
    {onlyUnread ? 'No tienes avisos sin leer.' : 'Sin avisos todavía. Cuando llegue un lead, un brief o alguien pida hablar con una persona, aparecerá aquí.'}
  </div>
{:else}
  <ul class="feed">
    {#each rows as n (n.id)}
      {@const tm = typeMeta(n.type)}
      <li class="note note--{tm.cls}" class:unread={!n.read_at}>
        <span class="note__icon note__icon--{tm.cls}" aria-hidden="true">
          {#if tm.cls === 'lead'}
            <svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="6" width="17" height="12" rx="2" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.4"/><path d="M4.5 7.5L12 13l7.5-5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {:else if tm.cls === 'brief'}
            <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3.5" width="14" height="17" rx="2" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.4"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          {:else if tm.cls === 'handoff'}
            <svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 17h-9l-5 4v-4H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 6z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="9" cy="11.5" r="1" fill="currentColor"/><circle cx="12" cy="11.5" r="1" fill="currentColor"/><circle cx="15" cy="11.5" r="1" fill="currentColor"/></svg>
          {:else}
            <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.4"/><path d="M12 8v4.5M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          {/if}
        </span>
        <div class="note__body">
          <div class="note__top">
            <span class="note__pill note__pill--{tm.cls}">{tm.label}</span>
            {#if n.ref}<span class="note__ref mono">{n.ref}</span>{/if}
            <span class="note__when mono dim" title={fmtDateTime(n.created_at)}>{rel(n.created_at)}</span>
          </div>
          <div class="note__title">{n.title}</div>
          {#if n.body}<div class="note__text">{n.body}</div>{/if}
          <div class="note__foot">
            {#if n.url}<a class="note__link" href={n.url}>Abrir →</a>{/if}
            {#if !n.read_at}
              <button class="note__mark" onclick={() => markOne(n)}>Marcar leída</button>
            {:else}
              <span class="note__read mono dim">leída {rel(n.read_at)}</span>
            {/if}
          </div>
        </div>
        {#if !n.read_at}<span class="note__dot" aria-hidden="true"></span>{/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  /* Pill Orbit: el conteo de no-leídos junto al título usa el acento (naranja)
     para llamar la atención, igual que el borde de las tarjetas no leídas. */
  .hcount { font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: .08em; color: var(--accent-gold); background: var(--accent-gold-dim); border: 1px solid var(--accent-gold-line); border-radius: var(--radius-pill); padding: 2px 9px; }

  /* ── Strip superior: 4 KPI cards (Orbit "stats", proporciones exactas) ──
     Orbit: padding 16 16 14, radio 14, hairline; label 13px peso 500
     mb 10; número 36px peso 700 tracking -0.025em; arte esquinero ~44-48
     con leve opacidad; delta 13px mt 12; grid de 4 col gap 14.
     La primera resalta los no-leídos con borde de acento + glow; el resto
     desglosa el feed por tipo. El arte usa <KpiArt> compartido (glossy 3D). */
  .strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: var(--space-4); }
  .kcard { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px 16px 14px; transition: border-color var(--duration-fast); }
  .kcard:hover { border-color: var(--border-strong); }
  .kcard--accent { border-color: var(--accent-gold-line); box-shadow: var(--shadow-gold); background: linear-gradient(180deg, rgba(var(--accent-gold-rgb), .07), transparent 60%), var(--bg-card); }
  .kcard__label { margin: 0 0 10px; color: var(--fg-secondary); font-size: 13px; font-weight: 500; }
  .kcard__row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 48px; }
  .kcard__num { font-family: var(--font-display); font-weight: 700; font-size: 36px; line-height: 1; letter-spacing: -0.025em; color: var(--fg-primary); font-variant-numeric: tabular-nums; }
  /* El arte esquinero respira ligeramente atenuado, como en Orbit. */
  .kcard__row :global(.kpi-art) { opacity: 0.92; }
  .kcard__delta { margin: 12px 0 0; font-size: 13px; }
  .kcard__delta .warn { color: var(--accent-gold); font-weight: 600; }
  .kcard__delta .ok { color: var(--accent-teal); font-weight: 600; }
  .kcard__delta .muted { color: var(--fg-subtle); }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: var(--space-4); }
  .chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--border); border-radius: var(--radius-pill); background: transparent; color: var(--fg-secondary); font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: all var(--duration-fast); }
  .chip:hover { border-color: var(--accent-gold); color: var(--fg-primary); }
  .chip.on { background: var(--accent-gold-dim); border-color: var(--accent-gold); color: var(--accent-gold); }
  .chip__n { padding: 1px 6px; min-width: 16px; text-align: center; background: var(--surface-3); border-radius: var(--radius-pill); font-size: 9px; color: var(--fg-secondary); }
  .chip.on .chip__n { background: var(--accent-gold); color: var(--fg-inverse); }

  .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-3); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-6); text-align: center; color: var(--fg-secondary); line-height: 1.55; }
  .empty--err { border-color: var(--border-accent); }
  .empty__msg { margin: 0; color: var(--fg-primary); font-size: var(--text-sm); line-height: 1.55; max-width: 38ch; }
  .spin { width: 16px; height: 16px; border: 2px solid var(--accent-gold-line); border-top-color: var(--accent-gold); border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Feed denso: el orden es importante, así que mantenemos una columna
     pero con tarjetas compactas y de alta densidad de información. */
  .feed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }

  .note { position: relative; display: flex; gap: var(--space-3); padding: 12px var(--space-4) 12px 13px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); transition: border-color var(--duration-fast), background var(--duration-fast); }
  .note:hover { border-color: var(--border-accent); background: var(--bg-elevated); }
  .note.unread { background: var(--bg-elevated); border-left: 3px solid var(--accent-gold); padding-left: 11px; }
  .note--handoff.unread { border-left-color: var(--accent-teal); }

  /* Icono = glifo SVG nítido en un tile redondeado teñido por tipo. */
  .note__icon { flex: 0 0 auto; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-md); border: 1px solid var(--border); color: var(--fg-secondary); }
  .note__icon svg { width: 20px; height: 20px; }
  .note__icon--lead, .note__icon--brief { color: var(--accent-gold); border-color: var(--accent-gold-line); background: var(--accent-gold-dim); }
  .note__icon--handoff { color: var(--accent-teal); border-color: var(--accent-teal-line); background: var(--accent-teal-dim); }
  .note__icon--system { color: var(--fg-subtle); background: var(--surface-3); }

  .note__body { min-width: 0; flex: 1 1 auto; }
  .note__top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 3px; }
  /* Etiqueta de tipo como PILL teñida (no texto suelto): lead/brief
     naranja, handoff verde, sistema neutro. */
  .note__pill { font-family: var(--font-mono); font-size: 9.5px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; border-radius: var(--radius-pill); padding: 2px 8px; border: 1px solid transparent; }
  .note__pill--lead, .note__pill--brief { color: var(--accent-gold); background: var(--accent-gold-dim); border-color: var(--accent-gold-line); }
  .note__pill--handoff { color: var(--accent-teal); background: var(--accent-teal-dim); border-color: var(--accent-teal-line); }
  .note__pill--system { color: var(--fg-subtle); background: var(--surface-3); border-color: var(--border); }
  .note__ref { font-size: 10px; color: var(--accent-gold); letter-spacing: .04em; }
  .note__when { font-size: 10px; margin-left: auto; }

  .note__title { font-size: 13.5px; color: var(--fg-primary); line-height: 1.45; font-weight: 500; }
  .note__text { font-size: 12.5px; color: var(--fg-secondary); line-height: 1.5; margin-top: 2px; white-space: pre-wrap; word-break: break-word; }

  .note__foot { display: flex; align-items: center; gap: var(--space-4); margin-top: 7px; }
  .note__link { font-family: var(--font-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--accent-teal); text-decoration: none; }
  .note__link:hover { color: var(--accent-gold); }
  .note__mark { background: transparent; border: 0; padding: 0; cursor: pointer; font-family: var(--font-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--fg-subtle); }
  .note__mark:hover { color: var(--accent-gold); }
  .note__read { font-size: 10px; }

  .note__dot { position: absolute; top: 13px; right: 13px; width: 7px; height: 7px; border-radius: 50%; background: var(--accent-gold); box-shadow: var(--shadow-gold); }
  .note--handoff .note__dot { background: var(--accent-teal); box-shadow: var(--shadow-teal); }

  .mono { font-family: var(--font-mono); }
  .dim { color: var(--fg-subtle); white-space: nowrap; }

  /* Responsive: el strip colapsa a 2 columnas en pantallas estrechas. */
  @media (max-width: 720px) {
    .strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  /* La definición canónica de .b/.b--primary/.b--ghost vive en dashboard.css (global). */
</style>
