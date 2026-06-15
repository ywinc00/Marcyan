<script>
  import { onMount } from 'svelte';

  // ── Helpers (autosuficiente, igual que BriefsSection) ─────────
  // api() con timeout vía AbortController: si una Function se cuelga
  // (cold-start lento, deploy a medias), abortamos a los ~12s para que
  // la UI muestre el estado de error en vez de un "Cargando…" infinito.
  async function api(url, opts = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    try {
      return await fetch(url, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        ...opts,
      });
    } finally {
      clearTimeout(t);
    }
  }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : ''; }
  function fmtDateTime(d) { return d ? new Date(d).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : ''; }
  function rel(d) {
    if (!d) return '';
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return 'ahora';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + 'd';
    return fmtDate(d);
  }

  // Traduce fallos de red/timeout (AbortError, TypeError "Failed to fetch")
  // a un mensaje en español accionable. Cualquier otro error conserva su texto.
  function friendlyError(e) {
    if (e && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
      return 'La conexión tardó demasiado. Pulsa Actualizar para reintentar.';
    }
    if (e instanceof TypeError) {
      return 'No se pudo conectar. Revisa tu conexión y pulsa Actualizar.';
    }
    return (e && e.message) || 'Error al cargar';
  }

  // type → etiqueta + glifo + clase de color
  const TYPES = {
    new_lead:     { label: 'Nuevo lead',  glyph: '✉', cls: 'lead' },
    new_brief:    { label: 'Nuevo brief', glyph: '▣', cls: 'brief' },
    chat_handoff: { label: 'Handoff',     glyph: '☎', cls: 'handoff' },
    system:       { label: 'Sistema',     glyph: '◆', cls: 'system' },
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

  // ── Carga ────────────────────────────────────────────────────
  async function load() {
    loading = true; error = '';
    const p = new URLSearchParams();
    p.set('limit', LIMIT);
    if (onlyUnread) p.set('unreadOnly', 'true');
    try {
      const r = await api('/api/admin/notifications?' + p.toString());
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
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
      const r = await api('/api/admin/notifications/' + encodeURIComponent(n.id), { method: 'PATCH' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      rows = rows.map((x) => (x.id === n.id ? j.notification : x));
      unread = j.unread ?? Math.max(0, unread - 1);
      if (onlyUnread) rows = rows.filter((x) => !x.read_at);
    } catch (e) { error = friendlyError(e); }
  }

  async function markAll() {
    if (busyAll || unread === 0) return;
    busyAll = true;
    try {
      const r = await api('/api/admin/notifications', { method: 'PATCH' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      unread = j.unread ?? 0;
      await load();
    } catch (e) { error = friendlyError(e); }
    finally { busyAll = false; }
  }

  onMount(load);
</script>

<div class="sec-head">
  <h1 class="greet">Avisos {#if unread}<span class="hcount">{unread}</span>{/if}</h1>
  <span class="head-act">
    <button class="b b--ghost" onclick={load}>↻ Actualizar</button>
    <button class="b b--primary" disabled={busyAll || unread === 0} onclick={markAll}>
      {busyAll ? 'Marcando…' : '✓ Marcar todas'}
    </button>
  </span>
</div>

<div class="chips">
  <button class="chip" class:on={!onlyUnread} onclick={() => setFilter(false)}>Todos</button>
  <button class="chip" class:on={onlyUnread} onclick={() => setFilter(true)}>
    No leídos <span class="chip__n">{unread}</span>
  </button>
</div>

{#if error}
  <div class="empty empty--err" role="alert">
    <p class="empty__msg">{error}</p>
    <button class="b b--primary" onclick={load}>↻ Actualizar</button>
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
        <span class="note__icon note__icon--{tm.cls}" aria-hidden="true">{tm.glyph}</span>
        <div class="note__body">
          <div class="note__top">
            <span class="note__type">{tm.label}</span>
            {#if n.ref}<span class="note__ref mono gold">{n.ref}</span>{/if}
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
  .sec-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; }
  .greet { font-family: var(--font-display); font-weight: 700; font-size: var(--text-xl); letter-spacing: var(--tracking-tight); margin: var(--space-5) 0 var(--space-4); display: inline-flex; align-items: center; gap: 10px; }
  /* Pill Orbit: el conteo de no-leídos junto al título usa el acento (naranja)
     para llamar la atención, igual que el borde de las tarjetas no leídas. */
  .hcount { font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: .08em; color: var(--accent-gold); background: var(--accent-gold-dim); border: 1px solid var(--accent-gold-line); border-radius: var(--radius-pill); padding: 2px 9px; }
  .head-act { display: inline-flex; gap: 6px; }

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

  .feed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }

  .note { position: relative; display: flex; gap: var(--space-3); padding: var(--space-4); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); transition: border-color var(--duration-fast), background var(--duration-fast); }
  .note:hover { border-color: var(--border-accent); }
  .note.unread { background: var(--bg-elevated); border-left: 3px solid var(--accent-gold); }
  .note--handoff.unread { border-left-color: var(--accent-teal); }

  .note__icon { flex: 0 0 auto; width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 15px; color: var(--fg-secondary); }
  .note__icon--lead { color: var(--accent-gold); border-color: var(--accent-gold-line); background: var(--accent-gold-dim); }
  .note__icon--brief { color: var(--accent-gold); border-color: var(--accent-gold-line); background: var(--accent-gold-dim); }
  .note__icon--handoff { color: var(--accent-teal); border-color: var(--accent-teal-line); background: var(--accent-teal-dim); }
  .note__icon--system { color: var(--fg-secondary); }

  .note__body { min-width: 0; flex: 1 1 auto; }
  .note__top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
  /* La etiqueta de tipo hereda el color de su categoría (igual que el icono):
     lead/brief naranja, handoff verde, sistema neutro. */
  .note__type { font-family: var(--font-body); font-size: var(--text-xs); font-weight: 600; letter-spacing: normal; text-transform: none; color: var(--accent-gold); }
  .note--handoff .note__type { color: var(--accent-teal); }
  .note--system .note__type { color: var(--fg-subtle); }
  .note__ref { font-size: var(--text-xs); }
  .note__when { font-size: 10px; margin-left: auto; }

  .note__title { font-size: var(--text-sm); color: var(--fg-primary); line-height: 1.5; font-weight: 500; }
  .note__text { font-size: var(--text-sm); color: var(--fg-secondary); line-height: 1.55; margin-top: 3px; white-space: pre-wrap; word-break: break-word; }

  .note__foot { display: flex; align-items: center; gap: var(--space-4); margin-top: 8px; }
  .note__link { font-family: var(--font-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--accent-teal); text-decoration: none; }
  .note__link:hover { color: var(--accent-gold); }
  .note__mark { background: transparent; border: 0; padding: 0; cursor: pointer; font-family: var(--font-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--fg-subtle); }
  .note__mark:hover { color: var(--accent-gold); }
  .note__read { font-size: 10px; }

  .note__dot { position: absolute; top: 14px; right: 14px; width: 7px; height: 7px; border-radius: 50%; background: var(--accent-gold); box-shadow: var(--shadow-gold); }
  .note--handoff .note__dot { background: var(--accent-teal); box-shadow: var(--shadow-teal); }

  .mono { font-family: var(--font-mono); }
  .gold { color: var(--accent-gold); }
  .dim { color: var(--fg-subtle); white-space: nowrap; }

  /* La definición canónica de .b/.b--primary/.b--ghost vive en dashboard.css (global). */
</style>
