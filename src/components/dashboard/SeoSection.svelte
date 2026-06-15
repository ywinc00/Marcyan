<script>
  import { onMount } from 'svelte';

  // ── Helpers (autosuficiente, mismo patrón que BriefsSection) ──
  async function api(url, opts = {}) {
    return fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
  }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : ''; }
  function fmtDateTime(d) { return d ? new Date(d).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : ''; }
  function shortDay(d) {
    if (!d) return '';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
  }
  function nfmt(n) {
    if (n == null || !Number.isFinite(+n)) return '0';
    return new Intl.NumberFormat('es-ES').format(Math.round(+n));
  }
  function pct(n) { return (n == null || !Number.isFinite(+n)) ? '0%' : (Math.round(+n * 1000) / 10) + '%'; }

  // ── Estado ───────────────────────────────────────────────────
  let projects = $state([]);
  let connected = $state(true);   // ¿WIF configurado (GOOGLE_WIF_AUDIENCE + GOOGLE_SA_EMAIL)?
  let loading = $state(false);
  let error = $state('');

  let selectedId = $state(null);
  let detail = $state(null);      // { project, metrics, range }
  let detailLoading = $state(false);
  let syncing = $state(false);
  let syncMsg = $state('');
  let syncOk = $state(false);

  // Alta de proyecto
  let showAdd = $state(false);
  let form = $state({ name: '', client_name: '', ga4_property_id: '', gsc_site_url: '', domain: '' });
  let saving = $state(false);
  let addMsg = $state('');

  // Eliminar
  let showDelete = $state(false);
  let deleting = $state(false);

  // ── Derivados de métricas ────────────────────────────────────
  const gscDaily = $derived(
    detail && detail.metrics && detail.metrics.gsc
      ? detail.metrics.gsc
          .filter((r) => r.kind !== 'top_queries' && r.clicks != null)
          .map((r) => ({ date: r.date, clicks: +r.clicks || 0, impressions: +r.impressions || 0, ctr: +r.ctr || 0, position: +r.position || 0 }))
          .sort((a, b) => new Date(a.date) - new Date(b.date))
      : []
  );
  const topQueries = $derived.by(() => {
    if (!detail || !detail.metrics || !detail.metrics.gsc) return [];
    const snap = detail.metrics.gsc.find((r) => r.kind === 'top_queries');
    return snap && Array.isArray(snap.queries) ? snap.queries : [];
  });
  const ga4Daily = $derived(
    detail && detail.metrics && detail.metrics.ga4
      ? detail.metrics.ga4
          .map((r) => ({ date: r.date, sessions: +r.sessions || 0, totalUsers: +r.totalUsers || 0, engagementRate: +r.engagementRate || 0, conversions: +r.conversions || 0 }))
          .sort((a, b) => new Date(a.date) - new Date(b.date))
      : []
  );

  const kpis = $derived.by(() => {
    const clicks = gscDaily.reduce((s, r) => s + r.clicks, 0);
    const impressions = gscDaily.reduce((s, r) => s + r.impressions, 0);
    const posRows = gscDaily.filter((r) => r.position > 0);
    const avgPos = posRows.length ? posRows.reduce((s, r) => s + r.position, 0) / posRows.length : 0;
    const sessions = ga4Daily.reduce((s, r) => s + r.sessions, 0);
    const conversions = ga4Daily.reduce((s, r) => s + r.conversions, 0);
    return { clicks, impressions, avgPos, sessions, conversions };
  });

  const hasData = $derived(gscDaily.length > 0 || ga4Daily.length > 0);

  // ── Construcción de path de línea SVG (a mano, sin librerías) ──
  // points: array de números (la serie). Devuelve { line, area, pts } en
  // coordenadas del viewBox W×H con padding inferior para etiquetas.
  function linePath(values, W, H, padTop = 8, padBottom = 22, padX = 6) {
    const n = values.length;
    if (n === 0) return { line: '', area: '', pts: [] };
    const max = Math.max(1, ...values);
    const innerW = W - padX * 2;
    const innerH = H - padTop - padBottom;
    const x = (i) => (n === 1 ? W / 2 : padX + (i * innerW) / (n - 1));
    const y = (v) => padTop + innerH - (v / max) * innerH;
    const pts = values.map((v, i) => ({ x: x(i), y: y(v), v }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${(padTop + innerH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padTop + innerH).toFixed(1)} Z`;
    return { line, area, pts, max };
  }
  const VBW = 560, VBH = 180;
  const clicksChart = $derived(linePath(gscDaily.map((r) => r.clicks), VBW, VBH));
  const imprChart   = $derived(linePath(gscDaily.map((r) => r.impressions), VBW, VBH));
  // Etiquetas X: primera, media, última (para no saturar)
  function axisLabels(rows) {
    if (!rows.length) return [];
    if (rows.length === 1) return [{ i: 0, t: shortDay(rows[0].date) }];
    const mid = Math.floor((rows.length - 1) / 2);
    return [
      { i: 0, t: shortDay(rows[0].date) },
      { i: mid, t: shortDay(rows[mid].date) },
      { i: rows.length - 1, t: shortDay(rows[rows.length - 1].date) },
    ];
  }
  const xLabels = $derived(axisLabels(gscDaily));
  function labelX(i, n) {
    const padX = 6, innerW = VBW - padX * 2;
    return n === 1 ? VBW / 2 : padX + (i * innerW) / (n - 1);
  }

  // ── Carga de proyectos ───────────────────────────────────────
  async function loadProjects(selectFirst = false) {
    loading = true; error = '';
    try {
      const r = await api('/api/admin/seo/projects');
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      projects = j.projects || [];
      connected = j.connected !== false;
      if (selectFirst && projects.length && selectedId == null) {
        selectProject(projects[0].id);
      } else if (selectedId != null && !projects.some((p) => String(p.id) === String(selectedId))) {
        selectedId = null; detail = null;
      }
    } catch (e) { error = e.message || 'Error al cargar'; }
    finally { loading = false; }
  }

  async function selectProject(id) {
    selectedId = id; detail = null; detailLoading = true; syncMsg = '';
    try {
      const r = await api('/api/admin/seo/projects/' + encodeURIComponent(id) + '?days=28');
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      detail = { project: j.project, metrics: j.metrics, range: j.range };
      connected = j.connected !== false;
    } catch (e) { syncMsg = e.message || 'Error al cargar el proyecto'; syncOk = false; }
    finally { detailLoading = false; }
  }

  function onSelectChange(e) {
    const v = e.currentTarget.value;
    // Los IDs vienen como string (columna BIGINT de Postgres); NO usar parseInt
    // o el value del <select> (número) no matchea las <option value> (string)
    // y deja de verse el proyecto seleccionado.
    if (v) selectProject(v);
  }

  // ── Sincronizar ──────────────────────────────────────────────
  async function syncNow() {
    if (!selectedId) return;
    syncing = true; syncMsg = 'Sincronizando con Google…'; syncOk = false;
    let okFlag = false, msg = '';
    try {
      const r = await api('/api/admin/seo/sync', { method: 'POST', body: JSON.stringify({ id: selectedId, days: 28 }) });
      const j = await r.json();
      if (j.configured === false) {
        msg = 'Conectá Google (Workload Identity Federation) para sincronizar datos reales.';
      } else if (!j.ok) {
        const res0 = j.results && j.results[0];
        const detailErr = res0 ? [res0.gsc?.error, res0.ga4?.error].filter(Boolean).join(' · ') : '';
        msg = 'Sincronización parcial: ' + (detailErr || j.error || 'revisá la conexión');
      } else {
        const res0 = j.results && j.results[0];
        const total = res0 ? (res0.gsc.synced + res0.ga4.synced) : 0;
        okFlag = true; msg = `✓ ${total} registro(s) actualizados`;
      }
      // Refrescar datos ANTES de fijar el mensaje: selectProject() resetea syncMsg,
      // así que si lo seteáramos antes, se borraría y el usuario no vería nada
      // (era el bug de "clic y no pasa nada").
      await selectProject(selectedId);
      await loadProjects();
    } catch (e) { okFlag = false; msg = e.message || 'Error al sincronizar'; }
    finally { syncing = false; syncMsg = msg; syncOk = okFlag; }
  }

  // ── Alta de proyecto ─────────────────────────────────────────
  function openAdd() { showAdd = true; addMsg = ''; form = { name: '', client_name: '', ga4_property_id: '', gsc_site_url: '', domain: '' }; }
  async function createProject() {
    if (!form.name.trim()) { addMsg = 'El nombre es obligatorio'; return; }
    saving = true; addMsg = '';
    try {
      const r = await api('/api/admin/seo/projects', { method: 'POST', body: JSON.stringify(form) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      showAdd = false;
      await loadProjects();
      selectProject(j.project.id);
    } catch (e) { addMsg = e.message || 'Error al crear'; }
    finally { saving = false; }
  }

  // ── Eliminar proyecto ────────────────────────────────────────
  async function doDelete() {
    if (!selectedId) return;
    deleting = true;
    try {
      const r = await api('/api/admin/seo/projects/' + encodeURIComponent(selectedId), { method: 'DELETE' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      showDelete = false; selectedId = null; detail = null;
      await loadProjects();
    } catch (e) { syncOk = false; syncMsg = e.message || 'Error al eliminar'; showDelete = false; }
    finally { deleting = false; }
  }

  onMount(() => { loadProjects(true); });
</script>

<div class="sec-head">
  <h1 class="greet">SEO</h1>
  <div class="head-actions">
    {#if !connected}
      <span class="conn conn--off" title="Falta configurar Workload Identity Federation">● Google no conectado</span>
    {:else}
      <span class="conn conn--on">● Google conectado</span>
    {/if}
    <button class="b b--primary" onclick={openAdd}>+ Proyecto</button>
  </div>
</div>

{#if !connected}
  <div class="notice">
    <strong>Conectá Google para ver datos.</strong>
    Falta configurar el acceso a Google sin clave (<code>Workload Identity Federation</code>: envs
    <code>GOOGLE_WIF_AUDIENCE</code> + <code>GOOGLE_SA_EMAIL</code> y OIDC habilitado en Vercel). Podés crear
    proyectos y guardar sus IDs de GA4 / Search Console ahora; en cuanto se den los permisos por cliente,
    el botón "Actualizar ahora" traerá las métricas reales.
  </div>
{/if}

{#if loading}
  <div class="empty">Cargando proyectos…</div>
{:else if error}
  <div class="empty err">{error}</div>
{:else if projects.length === 0}
  <div class="empty">
    Sin proyectos SEO todavía. Creá el primero con el botón <strong>+ Proyecto</strong> y guardá su
    ID de propiedad GA4 y su URL de Search Console.
  </div>
{:else}
  <!-- Selector de proyecto -->
  <div class="picker">
    <label class="picker__lbl" for="seo-project">Proyecto</label>
    <select id="seo-project" class="inp" value={selectedId ?? ''} onchange={onSelectChange}>
      <option value="" disabled>Elegí un proyecto…</option>
      {#each projects as p (p.id)}
        <option value={p.id}>{p.name}{p.client_name ? ` — ${p.client_name}` : ''}{p.active ? '' : ' (inactivo)'}</option>
      {/each}
    </select>
    {#if detail}
      <button class="b b--ghost" onclick={syncNow} disabled={syncing}>{syncing ? 'Sincronizando…' : '↻ Actualizar ahora'}</button>
    {/if}
  </div>

  {#if detailLoading}
    <div class="empty">Cargando datos…</div>
  {:else if detail}
    <div class="proj-meta mono">
      {#if detail.project.domain}<span>{detail.project.domain}</span>{/if}
      {#if detail.project.gsc_site_url}<span>· GSC: {detail.project.gsc_site_url}</span>{/if}
      {#if detail.project.ga4_property_id}<span>· GA4: {detail.project.ga4_property_id}</span>{/if}
      {#if detail.project.last_synced_at}<span>· Última sync: {fmtDateTime(detail.project.last_synced_at)}</span>{:else}<span>· Sin sincronizar</span>{/if}
    </div>
    {#if syncMsg}<div class="msg" class:ok={syncOk}>{syncMsg}</div>{/if}

    <!-- KPIs -->
    <div class="kpis">
      <div class="kpi"><span class="kpi__lbl">Clics (GSC)</span><span class="kpi__num gold">{nfmt(kpis.clicks)}</span></div>
      <div class="kpi"><span class="kpi__lbl">Impresiones (GSC)</span><span class="kpi__num">{nfmt(kpis.impressions)}</span></div>
      <div class="kpi"><span class="kpi__lbl">Posición media</span><span class="kpi__num">{kpis.avgPos ? (Math.round(kpis.avgPos * 10) / 10) : '—'}</span></div>
      <div class="kpi"><span class="kpi__lbl">Sesiones (GA4)</span><span class="kpi__num teal">{nfmt(kpis.sessions)}</span></div>
    </div>

    {#if !hasData}
      <div class="empty">
        {#if connected}
          Sin datos cacheados todavía. Tocá <strong>↻ Actualizar ahora</strong> para traer las métricas de los últimos 28 días.
        {:else}
          Conectá Google para ver datos. Una vez configurada la cuenta de servicio, sincronizá para poblar los gráficos.
        {/if}
      </div>
    {:else}
      <!-- Gráficos de línea (clics e impresiones) -->
      <div class="charts">
        <div class="panel">
          <div class="panel__lbl">Clics en el tiempo <span class="panel__sub">últimos {gscDaily.length} días</span></div>
          {#if gscDaily.length}
            <svg class="chart" viewBox="0 0 {VBW} {VBH}" role="img" aria-label="Clics en el tiempo">
              <path d={clicksChart.area} fill="var(--accent-gold-dim)" stroke="none" />
              <path d={clicksChart.line} fill="none" stroke="var(--accent-gold)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
              {#each clicksChart.pts as p, i}
                {#if i === clicksChart.pts.length - 1}
                  <circle cx={p.x} cy={p.y} r="3.5" fill="var(--accent-gold)" />
                {/if}
              {/each}
              {#each xLabels as l}
                <text x={labelX(l.i, gscDaily.length)} y={VBH - 6} text-anchor="middle" class="chart__lbl">{l.t}</text>
              {/each}
            </svg>
          {:else}<div class="muted">Sin datos de GSC.</div>{/if}
        </div>

        <div class="panel">
          <div class="panel__lbl">Impresiones en el tiempo <span class="panel__sub">últimos {gscDaily.length} días</span></div>
          {#if gscDaily.length}
            <svg class="chart" viewBox="0 0 {VBW} {VBH}" role="img" aria-label="Impresiones en el tiempo">
              <path d={imprChart.area} fill="var(--accent-teal-dim)" stroke="none" />
              <path d={imprChart.line} fill="none" stroke="var(--accent-teal)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
              {#each imprChart.pts as p, i}
                {#if i === imprChart.pts.length - 1}
                  <circle cx={p.x} cy={p.y} r="3.5" fill="var(--accent-teal)" />
                {/if}
              {/each}
              {#each xLabels as l}
                <text x={labelX(l.i, gscDaily.length)} y={VBH - 6} text-anchor="middle" class="chart__lbl">{l.t}</text>
              {/each}
            </svg>
          {:else}<div class="muted">Sin datos de GSC.</div>{/if}
        </div>
      </div>

      <!-- Top queries -->
      <div class="panel">
        <div class="panel__lbl">Top búsquedas <span class="panel__sub">Search Console</span></div>
        {#if topQueries.length}
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Consulta</th><th class="num">Clics</th><th class="num">Impr.</th><th class="num">CTR</th><th class="num">Pos.</th></tr></thead>
              <tbody>
                {#each topQueries as q}
                  <tr>
                    <td class="t-name">{q.query || '—'}</td>
                    <td class="num mono gold">{nfmt(q.clicks)}</td>
                    <td class="num mono">{nfmt(q.impressions)}</td>
                    <td class="num mono dim">{pct(q.ctr)}</td>
                    <td class="num mono dim">{q.position ? (Math.round(q.position * 10) / 10) : '—'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}<div class="muted">Sin búsquedas registradas en el rango.</div>{/if}
      </div>
    {/if}

    <div class="proj-foot">
      <button class="b b--danger" onclick={() => showDelete = true}>🗑 Eliminar proyecto</button>
    </div>
  {/if}
{/if}

<!-- Modal: alta de proyecto -->
{#if showAdd}
  <div class="backdrop" onclick={(e) => { if (e.target === e.currentTarget) showAdd = false; }}>
    <div class="modal">
      <h3 class="modal__t">Nuevo proyecto SEO</h3>
      <p class="modal__b">Guardá el nombre del proyecto y los identificadores de Google. Los datos se sincronizan después.</p>
      <label class="f-lbl" for="np-name">Nombre del proyecto *</label>
      <input id="np-name" class="inp" type="text" bind:value={form.name} placeholder="Sitio principal" />
      <label class="f-lbl" for="np-client">Cliente</label>
      <input id="np-client" class="inp" type="text" bind:value={form.client_name} placeholder="(opcional)" />
      <label class="f-lbl" for="np-domain">Dominio</label>
      <input id="np-domain" class="inp" type="text" bind:value={form.domain} placeholder="ejemplo.com" />
      <label class="f-lbl" for="np-ga4">ID de propiedad GA4</label>
      <input id="np-ga4" class="inp" type="text" bind:value={form.ga4_property_id} placeholder="123456789" inputmode="numeric" />
      <label class="f-lbl" for="np-gsc">URL de Search Console</label>
      <input id="np-gsc" class="inp" type="text" bind:value={form.gsc_site_url} placeholder="https://ejemplo.com/ o sc-domain:ejemplo.com" />
      {#if addMsg}<div class="msg">{addMsg}</div>{/if}
      <div class="modal__act">
        <button class="b b--ghost" onclick={() => showAdd = false}>Cancelar</button>
        <button class="b b--primary" disabled={saving || !form.name.trim()} onclick={createProject}>{saving ? 'Creando…' : 'Crear proyecto'}</button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal: eliminar -->
{#if showDelete && detail}
  <div class="backdrop" onclick={(e) => { if (e.target === e.currentTarget) showDelete = false; }}>
    <div class="modal">
      <h3 class="modal__t">Eliminar proyecto</h3>
      <p class="modal__b">Se borra <strong>{detail.project.name}</strong> y todas sus métricas cacheadas. Esta acción es <strong>irreversible</strong>.</p>
      <div class="modal__act">
        <button class="b b--ghost" onclick={() => showDelete = false}>Cancelar</button>
        <button class="b b--danger" disabled={deleting} onclick={doDelete}>{deleting ? 'Eliminando…' : 'Eliminar'}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sec-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; }
  .greet { font-family: var(--font-display); font-weight: 700; font-size: var(--text-xl); letter-spacing: var(--tracking-tight); margin: var(--space-5) 0 var(--space-4); }
  .head-actions { display: flex; align-items: center; gap: var(--space-3); }
  .conn { font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; }
  .conn--on { color: var(--accent-teal); }
  .conn--off { color: var(--color-warning); }

  .notice { background: var(--accent-gold-dim); border: 1px solid var(--accent-gold-line); border-radius: var(--radius-lg); padding: var(--space-4); color: var(--fg-secondary); font-size: var(--text-sm); line-height: 1.55; margin-bottom: var(--space-4); }
  .notice strong { color: var(--fg-primary); display: inline; }
  .notice code, code { font-family: var(--font-mono); font-size: 12px; color: var(--accent-gold); background: rgba(255,255,255,.04); padding: 1px 5px; border-radius: var(--radius-sm); }

  .picker { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-3); }
  .picker__lbl { font-family: var(--font-mono); font-size: 10px; letter-spacing: .15em; text-transform: uppercase; color: var(--accent-gold); }
  .picker .inp { width: auto; min-width: 240px; flex: 1; max-width: 420px; }

  .proj-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 10px; color: var(--fg-subtle); text-transform: none; letter-spacing: .04em; margin-bottom: var(--space-3); }

  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-3); margin-bottom: var(--space-3); }
  .kpi { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4); display: flex; flex-direction: column; gap: 4px; }
  .kpi__lbl { font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-secondary); }
  .kpi__num { font-family: var(--font-display); font-weight: 700; font-size: var(--text-2xl); line-height: 1; letter-spacing: var(--tracking-tight); color: var(--fg-primary); }
  .kpi__num.gold { color: var(--accent-gold); }
  .kpi__num.teal { color: var(--accent-teal); }

  .charts { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
  .panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5); margin-top: var(--space-3); }
  .panel__lbl { font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-secondary); margin-bottom: var(--space-4); }
  .panel__sub { color: var(--fg-subtle); margin-left: 6px; }
  .chart { width: 100%; height: auto; display: block; }
  .chart__lbl { fill: var(--fg-subtle); font-family: var(--font-mono); font-size: 11px; }
  .muted { color: var(--fg-subtle); font-size: var(--text-sm); font-style: italic; padding: var(--space-4) 0; }

  .table-wrap { background: var(--bg-base); border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; }
  .table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
  .table th { text-align: left; font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-subtle); padding: 10px 14px; border-bottom: 1px solid var(--border); }
  .table td { padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); color: var(--fg-secondary); }
  .table tr:last-child td { border-bottom: 0; }
  .table .num { text-align: right; white-space: nowrap; }
  .t-name { color: var(--fg-primary); }
  .mono { font-family: var(--font-mono); font-size: var(--text-xs); }
  .gold { color: var(--accent-gold); }
  .dim { color: var(--fg-subtle); }

  .proj-foot { margin-top: var(--space-5); display: flex; justify-content: flex-end; }

  .empty { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-6); text-align: center; color: var(--fg-secondary); font-style: italic; margin-top: var(--space-3); line-height: 1.6; }
  .empty.err { color: var(--color-error); font-style: normal; }
  .empty strong { color: var(--fg-primary); font-style: normal; }

  .inp { width: 100%; padding: 9px 12px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); font-family: var(--font-body); font-size: var(--text-sm); outline: none; }
  .inp:focus { border-color: var(--accent-gold); }
  .f-lbl { display: block; font-family: var(--font-mono); font-size: 9px; letter-spacing: .15em; text-transform: uppercase; color: var(--accent-gold); margin: var(--space-3) 0 4px; }

  .b { display: inline-flex; align-items: center; justify-content: center; gap: 5px; border-radius: var(--radius-md); padding: 9px 14px; font-family: var(--font-mono); font-size: 9px; letter-spacing: .12em; text-transform: uppercase; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--fg-secondary); transition: all var(--duration-fast); }
  .b:hover:not(:disabled) { border-color: var(--accent-gold); color: var(--fg-primary); }
  .b--primary { background: var(--accent-gold); border-color: var(--accent-gold); color: var(--fg-inverse); font-weight: 700; }
  .b--primary:hover:not(:disabled) { background: #dabd86; }
  .b--danger { color: var(--color-error); border-color: rgba(224,92,92,.4); }
  .b--danger:hover:not(:disabled) { background: rgba(224,92,92,.1); border-color: var(--color-error); }
  .b:disabled { opacity: .5; cursor: not-allowed; }

  .msg { margin-top: 8px; font-family: var(--font-mono); font-size: 10px; color: var(--color-error); min-height: 12px; }
  .msg.ok { color: var(--accent-teal); }

  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: var(--space-4); }
  .modal { width: 100%; max-width: 460px; background: var(--bg-card); border: 1px solid var(--border-accent); border-radius: var(--radius-lg); padding: var(--space-5); max-height: 90vh; overflow-y: auto; }
  .modal__t { font-family: var(--font-display); font-weight: 700; font-size: var(--text-lg); color: var(--accent-gold); margin: 0 0 10px; }
  .modal__b { color: var(--fg-secondary); font-size: var(--text-sm); line-height: 1.55; margin: 0 0 10px; }
  .modal__b strong { color: var(--fg-primary); }
  .modal__act { display: flex; justify-content: flex-end; gap: 8px; margin-top: var(--space-4); }

  @media (max-width: 880px) { .charts { grid-template-columns: 1fr; } }
</style>
