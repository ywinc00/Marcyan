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
  function pctOf(part, whole) {
    const p = +part, w = +whole;
    if (!Number.isFinite(p) || !Number.isFinite(w) || w <= 0) return '0%';
    return (Math.round((p / w) * 1000) / 10) + '%';
  }
  // Mapea el estado de cobertura de GSC a una clase de pill (verde=ok, etc.).
  function idxStateClass(state) {
    const s = String(state || '').toLowerCase();
    if (s.includes('submitted and indexed') || s === 'pass' || s.includes('indexed, not submitted')) return 'ok';
    if (s.includes('excluded') || s.includes('not indexed') || s.includes('fail') || s.includes('error')) return 'err';
    if (s.includes('crawled') || s.includes('discovered') || s.includes('neutral')) return 'warn';
    return 'neutral';
  }

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

  // Delta por serie: compara la suma de la 2ª mitad vs la 1ª mitad del rango.
  // Devuelve { dir: 'up'|'down'|'flat', txt: '+12%' } o null si no hay base.
  // Para "posición media" un número MENOR es mejor → invertimos el signo (better).
  function trend(values, lowerIsBetter = false) {
    const v = (values || []).filter((x) => Number.isFinite(+x)).map((x) => +x);
    if (v.length < 4) return null;
    const mid = Math.floor(v.length / 2);
    const a = v.slice(0, mid).reduce((s, x) => s + x, 0);
    const b = v.slice(mid).reduce((s, x) => s + x, 0);
    if (a <= 0) return null;
    const change = ((b - a) / a) * 100;
    const rounded = Math.round(change * 10) / 10;
    if (Math.abs(rounded) < 0.1) return { dir: 'flat', txt: '0%', better: true };
    const better = lowerIsBetter ? rounded < 0 : rounded > 0;
    return { dir: rounded > 0 ? 'up' : 'down', txt: (rounded > 0 ? '+' : '') + rounded + '%', better };
  }
  const tClicks = $derived(trend(gscDaily.map((r) => r.clicks)));
  const tImpr   = $derived(trend(gscDaily.map((r) => r.impressions)));
  const tPos    = $derived(trend(gscDaily.filter((r) => r.position > 0).map((r) => r.position), true));
  const tSess   = $derived(trend(ga4Daily.map((r) => r.sessions)));

  const hasData = $derived(gscDaily.length > 0 || ga4Daily.length > 0);

  // Snapshot de indexación (objeto, no serie). El backend lo expone bajo
  // metrics.indexation: { indexed, not_indexed, total, checked_at, issues, pages }.
  const indexation = $derived(detail && detail.metrics ? (detail.metrics.indexation || null) : null);
  // Geometría del donut de indexación (circunferencia para stroke-dasharray).
  const DONUT_R = 34, DONUT_C = 2 * Math.PI * 34;
  const idxRatio = $derived(
    indexation && indexation.total ? Math.max(0, Math.min(1, indexation.indexed / indexation.total)) : 0
  );

  // ── Construcción de path de línea SVG (a mano, sin librerías) ──
  // points: array de números (la serie). Devuelve { line, area, pts } en
  // coordenadas del viewBox W×H con padding inferior para etiquetas.
  function linePath(values, W, H, padTop = 12, padBottom = 24, padX = 10) {
    const n = values.length;
    if (n === 0) return { line: '', area: '', pts: [], max: 1 };
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
  const VBW = 560, VBH = 200, PAD_BOTTOM = 24;
  // Líneas de cuadrícula horizontales (dashed): 4 niveles dentro del plot.
  const gridLines = [24, 64, 104, 144];
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
    const padX = 10, innerW = VBW - padX * 2;
    return n === 1 ? VBW / 2 : padX + (i * innerW) / (n - 1);
  }

  // ── Interactividad de los gráficos (hover → tip + guía + punto) ──
  // Guardamos el índice apuntado por cada gráfico. onmousemove encuentra el
  // punto más cercano en X dentro del viewBox (convertimos px → coord SVG).
  let hoverClicks = $state(-1);
  let hoverImpr = $state(-1);
  function nearestIndex(evt, pts) {
    if (!pts.length) return -1;
    const svg = evt.currentTarget;
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return -1;
    const xSvg = ((evt.clientX - rect.left) / rect.width) * VBW;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.abs(pts[i].x - xSvg);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
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
    // NO limpiamos `detail` por adelantado: si el fetch falla (404 transitorio,
    // red, etc.) queremos conservar el detalle anterior y mostrar el error, en
    // vez de colapsar al placeholder dejando solo el selector. Solo reemplazamos
    // `detail` en éxito. `detailLoading` sigue manejando el estado "Cargando…".
    selectedId = id; detailLoading = true; syncMsg = '';
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
        const total = res0 ? (res0.gsc.synced + res0.ga4.synced + ((res0.indexation && res0.indexation.synced) || 0)) : 0;
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

  {#if !detail && detailLoading}
    <!-- Solo bloqueamos toda la vista cuando aún no hay detalle previo. -->
    <div class="empty">Cargando datos…</div>
  {:else if detail}
    <div class="proj-meta mono" class:is-reloading={detailLoading}>
      {#if detail.project.domain}<span>{detail.project.domain}</span>{/if}
      {#if detail.project.gsc_site_url}<span>· GSC: {detail.project.gsc_site_url}</span>{/if}
      {#if detail.project.ga4_property_id}<span>· GA4: {detail.project.ga4_property_id}</span>{/if}
      {#if detail.project.last_synced_at}<span>· Última sync: {fmtDateTime(detail.project.last_synced_at)}</span>{:else}<span>· Sin sincronizar</span>{/if}
      {#if detailLoading}<span class="reloading">· Actualizando…</span>{/if}
    </div>
    {#if syncMsg}<div class="msg" class:ok={syncOk}>{syncMsg}</div>{/if}

    <!-- KPIs (Orbit: label + número grande + delta + arte 3D en la esquina) -->
    <div class="kpis">
      <!-- Clics -->
      <div class="kpi">
        <span class="kpi__lbl">Clics (GSC)</span>
        <div class="kpi__row">
          <span class="kpi__num gold">{nfmt(kpis.clicks)}</span>
          <div class="kpi__art" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <defs>
                <linearGradient id="seoArtClick" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#fb923c"/><stop offset="1" stop-color="#ea580c"/>
                </linearGradient>
                <radialGradient id="seoGlowGold" cx="50%" cy="40%" r="60%">
                  <stop offset="0" stop-color="#f97316" stop-opacity="0.5"/><stop offset="1" stop-color="#f97316" stop-opacity="0"/>
                </radialGradient>
              </defs>
              <ellipse cx="32" cy="50" rx="20" ry="6" fill="#000" opacity="0.35"/>
              <circle cx="32" cy="30" r="26" fill="url(#seoGlowGold)"/>
              <path d="M24 16l22 9-9 4 6 9-5 3-6-9-7 6z" fill="url(#seoArtClick)" stroke="#7c2d12" stroke-width="1"/>
              <path d="M24 16l22 9-9 4z" fill="#fff" opacity="0.22"/>
            </svg>
          </div>
        </div>
        {#if tClicks}
          <p class="kpi__delta"><span class={tClicks.better ? 'up' : 'down'}>{tClicks.txt} {tClicks.dir === 'down' ? '↓' : '↑'}</span> <span class="muted">vs período previo</span></p>
        {:else}
          <p class="kpi__delta"><span class="muted">últimos {gscDaily.length} días</span></p>
        {/if}
      </div>

      <!-- Impresiones -->
      <div class="kpi">
        <span class="kpi__lbl">Impresiones (GSC)</span>
        <div class="kpi__row">
          <span class="kpi__num">{nfmt(kpis.impressions)}</span>
          <div class="kpi__art" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <defs>
                <linearGradient id="seoArtEye" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#3a3a44"/><stop offset="1" stop-color="#1b1b20"/>
                </linearGradient>
                <radialGradient id="seoIris" cx="50%" cy="45%" r="55%">
                  <stop offset="0" stop-color="#fb923c"/><stop offset="1" stop-color="#c2410c"/>
                </radialGradient>
              </defs>
              <ellipse cx="32" cy="51" rx="19" ry="5" fill="#000" opacity="0.32"/>
              <path d="M8 32c8-13 40-13 48 0-8 13-40 13-48 0z" fill="url(#seoArtEye)" stroke="#4a4a55" stroke-width="1.2"/>
              <circle cx="32" cy="32" r="11" fill="url(#seoIris)"/>
              <circle cx="32" cy="32" r="5" fill="#1b1b20"/>
              <circle cx="29" cy="29" r="2.4" fill="#fff" opacity="0.85"/>
            </svg>
          </div>
        </div>
        {#if tImpr}
          <p class="kpi__delta"><span class={tImpr.better ? 'up' : 'down'}>{tImpr.txt} {tImpr.dir === 'down' ? '↓' : '↑'}</span> <span class="muted">vs período previo</span></p>
        {:else}
          <p class="kpi__delta"><span class="muted">últimos {gscDaily.length} días</span></p>
        {/if}
      </div>

      <!-- Posición media -->
      <div class="kpi">
        <span class="kpi__lbl">Posición media</span>
        <div class="kpi__row">
          <span class="kpi__num">{kpis.avgPos ? (Math.round(kpis.avgPos * 10) / 10) : '—'}</span>
          <div class="kpi__art" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <defs>
                <linearGradient id="seoArtMedal" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#d97706"/>
                </linearGradient>
                <radialGradient id="seoGlowMedal" cx="50%" cy="45%" r="60%">
                  <stop offset="0" stop-color="#f59e0b" stop-opacity="0.45"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/>
                </radialGradient>
              </defs>
              <ellipse cx="32" cy="52" rx="17" ry="5" fill="#000" opacity="0.32"/>
              <circle cx="32" cy="34" r="24" fill="url(#seoGlowMedal)"/>
              <path d="M22 10h6l4 8-7 4-7-4z" fill="#ea580c"/>
              <path d="M42 10h-6l-4 8 7 4 7-4z" fill="#fb923c"/>
              <circle cx="32" cy="38" r="15" fill="url(#seoArtMedal)" stroke="#92400e" stroke-width="1.2"/>
              <circle cx="32" cy="38" r="10" fill="none" stroke="#fff" stroke-width="1" opacity="0.4"/>
              <path d="M32 32l1.9 4 4.3.4-3.3 2.8 1 4.2-3.9-2.3-3.9 2.3 1-4.2-3.3-2.8 4.3-.4z" fill="#fffbeb"/>
              <ellipse cx="27" cy="32" rx="5" ry="3" fill="#fff" opacity="0.3"/>
            </svg>
          </div>
        </div>
        {#if tPos}
          <p class="kpi__delta"><span class={tPos.better ? 'up' : 'down'}>{tPos.txt} {tPos.dir === 'down' ? '↓' : '↑'}</span> <span class="muted">menor = mejor</span></p>
        {:else}
          <p class="kpi__delta"><span class="muted">promedio del rango</span></p>
        {/if}
      </div>

      <!-- Sesiones -->
      <div class="kpi">
        <span class="kpi__lbl">Sesiones (GA4)</span>
        <div class="kpi__row">
          <span class="kpi__num teal">{nfmt(kpis.sessions)}</span>
          <div class="kpi__art" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <defs>
                <linearGradient id="seoArtUser" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#6ee7b7"/><stop offset="1" stop-color="#059669"/>
                </linearGradient>
                <radialGradient id="seoGlowTeal" cx="50%" cy="40%" r="60%">
                  <stop offset="0" stop-color="#34d399" stop-opacity="0.45"/><stop offset="1" stop-color="#34d399" stop-opacity="0"/>
                </radialGradient>
              </defs>
              <ellipse cx="32" cy="53" rx="19" ry="5" fill="#000" opacity="0.32"/>
              <circle cx="32" cy="30" r="26" fill="url(#seoGlowTeal)"/>
              <circle cx="32" cy="24" r="11" fill="url(#seoArtUser)" stroke="#065f46" stroke-width="1"/>
              <path d="M14 52c0-11 8-16 18-16s18 5 18 16z" fill="url(#seoArtUser)" stroke="#065f46" stroke-width="1"/>
              <ellipse cx="28" cy="20" rx="4" ry="3" fill="#fff" opacity="0.35"/>
            </svg>
          </div>
        </div>
        {#if tSess}
          <p class="kpi__delta"><span class={tSess.better ? 'up' : 'down'}>{tSess.txt} {tSess.dir === 'down' ? '↓' : '↑'}</span> <span class="muted">vs período previo</span></p>
        {:else}
          <p class="kpi__delta"><span class="muted">últimos {gscDaily.length} días</span></p>
        {/if}
      </div>
    </div>

    <!-- Indexación (Orbit: donut + barra/leyenda + issues funnel + tabla) -->
    <div class="panel">
      <div class="panel__lbl">Indexación <span class="panel__sub">Search Console</span></div>
      {#if indexation}
        <div class="idx">
          <!-- Donut + ratio -->
          <div class="idx__donut-wrap">
            <svg class="idx__donut" viewBox="0 0 88 88" role="img" aria-label="{nfmt(indexation.indexed)} de {nfmt(indexation.total)} páginas indexadas">
              <defs>
                <linearGradient id="seoDonut" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#fb923c"/><stop offset="1" stop-color="#ea580c"/>
                </linearGradient>
              </defs>
              <circle cx="44" cy="44" r={DONUT_R} fill="none" stroke="var(--bg-elevated)" stroke-width="11" />
              <circle
                cx="44" cy="44" r={DONUT_R} fill="none" stroke="url(#seoDonut)" stroke-width="11"
                stroke-linecap="round"
                stroke-dasharray="{(idxRatio * DONUT_C).toFixed(1)} {DONUT_C.toFixed(1)}"
                transform="rotate(-90 44 44)"
                style="transition: stroke-dasharray var(--duration-base) var(--ease)"
              />
              <text x="44" y="41" text-anchor="middle" class="idx__donut-pct">{indexation.total ? pctOf(indexation.indexed, indexation.total) : '0%'}</text>
              <text x="44" y="55" text-anchor="middle" class="idx__donut-cap">indexado</text>
            </svg>
          </div>
          <!-- Bignum + barra + leyenda -->
          <div class="idx__body">
            <div class="idx__bignum">
              <span class="idx__ratio"><span class="gold">{nfmt(indexation.indexed)}</span> / {nfmt(indexation.total)}</span>
              <span class="idx__cap">páginas indexadas</span>
            </div>
            <div class="idx__bar" role="img" aria-label="{indexation.indexed} de {indexation.total} páginas indexadas">
              <div class="idx__fill" style="width:{indexation.total ? Math.round((indexation.indexed / indexation.total) * 100) : 0}%"></div>
            </div>
            <div class="idx__legend mono">
              <span><span class="dot dot--gold"></span>Indexadas {nfmt(indexation.indexed)}</span>
              <span><span class="dot dot--track"></span>Sin indexar {nfmt(indexation.not_indexed)}</span>
              {#if indexation.checked_at}<span class="dim">· revisado {fmtDateTime(indexation.checked_at)}</span>{/if}
            </div>
          </div>
        </div>

        {#if indexation.issues && indexation.issues.length}
          <div class="idx__issues-lbl">Motivos de exclusión</div>
          <ul class="issues">
            {#each indexation.issues as it}
              <li class="issue"><span class="issue__reason">{it.reason}</span><span class="issue__count mono">{nfmt(it.count)}</span></li>
            {/each}
          </ul>
        {/if}

        {#if indexation.pages && indexation.pages.length}
          <div class="table-wrap idx__pages">
            <table class="table">
              <thead><tr><th>URL</th><th>Estado</th><th>Último rastreo</th></tr></thead>
              <tbody>
                {#each indexation.pages as pg}
                  <tr>
                    <td class="t-name idx__url">{pg.url || '—'}</td>
                    <td><span class="pill pill--{idxStateClass(pg.state)}">{pg.state || 'Desconocido'}</span></td>
                    <td class="mono dim">{pg.last_crawl ? fmtDateTime(pg.last_crawl) : '—'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      {:else}
        <div class="muted-box">
          {#if connected}
            Sin datos de indexación todavía. Tocá <strong>↻ Actualizar ahora</strong> para consultar las páginas enviadas e indexadas en Search Console.
          {:else}
            Conectá Google para ver la indexación de las páginas.
          {/if}
        </div>
      {/if}
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
      <!-- Gráficos de línea INTERACTIVOS (clics e impresiones) -->
      <div class="charts">
        <!-- ── Clics (naranja) ── -->
        <div class="panel">
          <div class="panel__lbl">Clics en el tiempo <span class="panel__sub">últimos {gscDaily.length} días</span></div>
          {#if gscDaily.length}
            <div class="chart-box">
              {#if hoverClicks >= 0 && clicksChart.pts[hoverClicks]}
                <span class="chart-tip" style="left:{(clicksChart.pts[hoverClicks].x / VBW) * 100}%;top:{(clicksChart.pts[hoverClicks].y / VBH) * 100}%">
                  <strong>{nfmt(clicksChart.pts[hoverClicks].v)}</strong> clics
                  <span class="chart-tip__d">{shortDay(gscDaily[hoverClicks].date)}</span>
                </span>
              {/if}
              <svg
                class="chart" viewBox="0 0 {VBW} {VBH}" role="img" aria-label="Clics en el tiempo"
                onmousemove={(e) => hoverClicks = nearestIndex(e, clicksChart.pts)}
                onmouseleave={() => hoverClicks = -1}
              >
                <defs>
                  <linearGradient id="seoClicksFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="var(--accent-gold)" stop-opacity="0.30"/>
                    <stop offset="1" stop-color="var(--accent-gold)" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                {#each gridLines as gy}<line x1="0" y1={gy} x2={VBW} y2={gy} class="chart__grid" />{/each}
                <path d={clicksChart.area} fill="url(#seoClicksFill)" stroke="none" />
                <path d={clicksChart.line} fill="none" stroke="var(--accent-gold)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
                {#if hoverClicks >= 0 && clicksChart.pts[hoverClicks]}
                  <line x1={clicksChart.pts[hoverClicks].x} y1="6" x2={clicksChart.pts[hoverClicks].x} y2={VBH - PAD_BOTTOM} class="chart__guide" />
                  <circle cx={clicksChart.pts[hoverClicks].x} cy={clicksChart.pts[hoverClicks].y} r="5" fill="var(--accent-gold)" stroke="var(--bg-card)" stroke-width="2" />
                {:else}
                  <circle cx={clicksChart.pts[clicksChart.pts.length - 1].x} cy={clicksChart.pts[clicksChart.pts.length - 1].y} r="3.5" fill="var(--accent-gold)" />
                {/if}
                {#each xLabels as l}
                  <text x={labelX(l.i, gscDaily.length)} y={VBH - 6} text-anchor="middle" class="chart__lbl">{l.t}</text>
                {/each}
              </svg>
            </div>
          {:else}<div class="muted">Sin datos de GSC.</div>{/if}
        </div>

        <!-- ── Impresiones (verde) ── -->
        <div class="panel">
          <div class="panel__lbl">Impresiones en el tiempo <span class="panel__sub">últimos {gscDaily.length} días</span></div>
          {#if gscDaily.length}
            <div class="chart-box">
              {#if hoverImpr >= 0 && imprChart.pts[hoverImpr]}
                <span class="chart-tip" style="left:{(imprChart.pts[hoverImpr].x / VBW) * 100}%;top:{(imprChart.pts[hoverImpr].y / VBH) * 100}%">
                  <strong>{nfmt(imprChart.pts[hoverImpr].v)}</strong> impr.
                  <span class="chart-tip__d">{shortDay(gscDaily[hoverImpr].date)}</span>
                </span>
              {/if}
              <svg
                class="chart" viewBox="0 0 {VBW} {VBH}" role="img" aria-label="Impresiones en el tiempo"
                onmousemove={(e) => hoverImpr = nearestIndex(e, imprChart.pts)}
                onmouseleave={() => hoverImpr = -1}
              >
                <defs>
                  <linearGradient id="seoImprFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="var(--accent-teal)" stop-opacity="0.30"/>
                    <stop offset="1" stop-color="var(--accent-teal)" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                {#each gridLines as gy}<line x1="0" y1={gy} x2={VBW} y2={gy} class="chart__grid" />{/each}
                <path d={imprChart.area} fill="url(#seoImprFill)" stroke="none" />
                <path d={imprChart.line} fill="none" stroke="var(--accent-teal)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
                {#if hoverImpr >= 0 && imprChart.pts[hoverImpr]}
                  <line x1={imprChart.pts[hoverImpr].x} y1="6" x2={imprChart.pts[hoverImpr].x} y2={VBH - PAD_BOTTOM} class="chart__guide" />
                  <circle cx={imprChart.pts[hoverImpr].x} cy={imprChart.pts[hoverImpr].y} r="5" fill="var(--accent-teal)" stroke="var(--bg-card)" stroke-width="2" />
                {:else}
                  <circle cx={imprChart.pts[imprChart.pts.length - 1].x} cy={imprChart.pts[imprChart.pts.length - 1].y} r="3.5" fill="var(--accent-teal)" />
                {/if}
                {#each xLabels as l}
                  <text x={labelX(l.i, gscDaily.length)} y={VBH - 6} text-anchor="middle" class="chart__lbl">{l.t}</text>
                {/each}
              </svg>
            </div>
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
  <div class="backdrop" role="presentation" tabindex="-1"
       onclick={(e) => { if (e.target === e.currentTarget) showAdd = false; }}
       onkeydown={(e) => { if (e.key === 'Escape') showAdd = false; }}>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="seo-add-title">
      <h3 class="modal__t" id="seo-add-title">Nuevo proyecto SEO</h3>
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
  <div class="backdrop" role="presentation" tabindex="-1"
       onclick={(e) => { if (e.target === e.currentTarget) showDelete = false; }}
       onkeydown={(e) => { if (e.key === 'Escape') showDelete = false; }}>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="seo-del-title">
      <h3 class="modal__t" id="seo-del-title">Eliminar proyecto</h3>
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
  .picker__lbl { font-family: var(--font-body); font-weight: 500; font-size: var(--text-xs); letter-spacing: normal; text-transform: none; color: var(--fg-secondary); }
  .picker .inp { width: auto; min-width: 240px; flex: 1; max-width: 420px; }

  .proj-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 10px; color: var(--fg-subtle); text-transform: none; letter-spacing: .04em; margin-bottom: var(--space-3); transition: opacity var(--duration-fast); }
  .proj-meta.is-reloading { opacity: .65; }
  .reloading { color: var(--accent-gold); }

  /* ── KPIs (Orbit stat cards) ── */
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3); margin-bottom: var(--space-3); }
  .kpi { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-4) 14px; transition: border-color var(--duration-fast), box-shadow var(--duration-fast); }
  .kpi:hover { border-color: var(--border-strong); }
  .kpi__lbl { display: block; font-family: var(--font-body); font-weight: 500; font-size: var(--text-xs); letter-spacing: normal; text-transform: none; color: var(--fg-secondary); margin-bottom: 8px; }
  .kpi__row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
  .kpi__num { font-family: var(--font-display); font-weight: 700; font-size: var(--text-3xl, 30px); line-height: 1; letter-spacing: var(--tracking-tight); color: var(--fg-primary); }
  .kpi__num.gold { color: var(--accent-gold); }
  .kpi__num.teal { color: var(--accent-teal); }
  .kpi__art { width: 56px; height: 56px; flex: 0 0 auto; }
  .kpi__art svg { width: 100%; height: 100%; display: block; }
  .kpi__delta { margin: 12px 0 0; font-size: var(--text-xs); }
  .kpi__delta .up { color: var(--accent-teal); font-weight: 600; }
  .kpi__delta .down { color: var(--color-error); font-weight: 600; }
  .kpi__delta .muted { color: var(--fg-subtle); }

  /* ── Indexación ── */
  .idx { display: flex; align-items: center; gap: var(--space-5); flex-wrap: wrap; }
  .idx__donut-wrap { flex: 0 0 auto; }
  .idx__donut { width: 96px; height: 96px; display: block; }
  .idx__donut-pct { fill: var(--fg-primary); font-family: var(--font-display); font-weight: 700; font-size: 17px; letter-spacing: var(--tracking-tight); }
  .idx__donut-cap { fill: var(--fg-subtle); font-family: var(--font-mono); font-size: 8px; letter-spacing: .12em; text-transform: uppercase; }
  .idx__body { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: var(--space-3); }
  .idx__bignum { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .idx__ratio { font-family: var(--font-display); font-weight: 700; font-size: var(--text-2xl); line-height: 1; letter-spacing: var(--tracking-tight); color: var(--fg-primary); }
  .idx__cap { font-family: var(--font-mono); font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: var(--fg-subtle); }
  .idx__bar { height: 14px; background: var(--bg-elevated); border-radius: var(--radius-pill); overflow: hidden; }
  .idx__fill { height: 100%; background: linear-gradient(90deg, var(--accent-gold-hover), var(--accent-gold-deep)); border-radius: var(--radius-pill); min-width: 2px; transition: width var(--duration-base) var(--ease); }
  .idx__legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 10px; color: var(--fg-secondary); letter-spacing: .04em; }
  .idx__legend .dim { color: var(--fg-subtle); }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
  .dot--gold { background: var(--accent-gold); }
  .dot--track { background: var(--surface-3, var(--bg-elevated)); border: 1px solid var(--border-strong); }

  .idx__issues-lbl { font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-subtle); margin: var(--space-4) 0 8px; }
  .issues { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
  .issue { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: 9px 12px; background: var(--bg-base); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
  .issue__reason { font-size: var(--text-sm); color: var(--fg-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .issue__count { font-size: var(--text-xs); color: var(--color-warning); }
  .idx__pages { margin-top: var(--space-4); }
  .idx__url { max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .pill { font-family: var(--font-mono); font-size: 9px; letter-spacing: .08em; text-transform: uppercase; padding: 3px 8px; border-radius: var(--radius-pill); border: 1px solid; white-space: nowrap; }
  .pill--ok { color: var(--accent-teal); border-color: var(--accent-teal-line); background: var(--accent-teal-dim); }
  .pill--err { color: var(--color-error); border-color: rgba(var(--color-error-rgb),.4); background: rgba(var(--color-error-rgb),.1); }
  .pill--warn { color: var(--color-warning); border-color: var(--accent-gold-line); background: var(--accent-gold-dim); }
  .pill--neutral { color: var(--fg-subtle); border-color: var(--border-strong); background: var(--bg-elevated); }

  .muted-box { color: var(--fg-secondary); font-size: var(--text-sm); line-height: 1.55; text-align: center; padding: var(--space-5) var(--space-4); }
  .muted-box strong { color: var(--fg-primary); }

  .charts { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
  .panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5); margin-top: var(--space-3); }
  .panel__lbl { font-family: var(--font-body); font-weight: 600; font-size: var(--text-sm); letter-spacing: normal; color: var(--fg-secondary); margin-bottom: var(--space-4); }
  .panel__sub { color: var(--fg-subtle); margin-left: 6px; }

  /* Contenedor relativo para posicionar la .chart-tip con left/top en %. */
  .chart-box { position: relative; }
  .chart { width: 100%; height: auto; display: block; }
  .chart__lbl { fill: var(--fg-subtle); font-family: var(--font-mono); font-size: 11px; }
  .chart__grid { stroke: rgba(255, 255, 255, 0.06); stroke-dasharray: 3 4; }
  .chart__guide { stroke: rgba(255, 255, 255, 0.22); stroke-dasharray: 3 4; stroke-width: 1; }
  .chart-tip__d { display: block; font-weight: 400; color: var(--fg-subtle); font-size: 10px; margin-top: 2px; }
  .muted { color: var(--fg-subtle); font-size: var(--text-sm); font-style: normal; padding: var(--space-4) 0; }

  .table-wrap { background: var(--bg-base); border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; }
  .table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
  .table th { text-align: left; font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-subtle); padding: 10px 14px; border-bottom: 1px solid var(--border); }
  .table td { padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); color: var(--fg-secondary); }
  .table tbody tr { transition: background var(--duration-fast); }
  .table tbody tr:hover { background: var(--bg-elevated); }
  .table tr:last-child td { border-bottom: 0; }
  .table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .t-name { color: var(--fg-primary); }
  .mono { font-family: var(--font-mono); font-size: var(--text-xs); }
  .gold { color: var(--accent-gold); }
  .dim { color: var(--fg-subtle); }

  .proj-foot { margin-top: var(--space-5); display: flex; justify-content: flex-end; }

  .empty { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-6); text-align: center; color: var(--fg-secondary); margin-top: var(--space-3); line-height: 1.6; }
  .empty.err { color: var(--color-error); }
  .empty strong { color: var(--fg-primary); }

  .inp { width: 100%; padding: 9px 12px; background-color: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); font-family: var(--font-body); font-size: var(--text-sm); outline: none; transition: border-color var(--duration-fast), box-shadow var(--duration-fast); }
  .inp:focus { border-color: var(--accent-gold); box-shadow: 0 0 0 3px var(--accent-gold-dim); }
  /* Select del picker: misma piel de input. El caret (gris sutil) lo aplica
     la regla global select.inp en dashboard.css; aquí solo reservamos espacio. */
  select.inp { padding-right: 30px; cursor: pointer; }
  select.inp:hover { border-color: var(--border-strong); }
  .f-lbl { display: block; font-family: var(--font-body); font-weight: 500; font-size: var(--text-xs); letter-spacing: normal; text-transform: none; color: var(--fg-secondary); margin: var(--space-3) 0 4px; }

  /* La definición canónica de .b/.b--primary/.b--ghost/.b--danger
     vive en dashboard.css (global). */

  .msg { margin-top: 8px; font-family: var(--font-mono); font-size: 10px; color: var(--color-error); min-height: 12px; }
  .msg.ok { color: var(--accent-teal); }

  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: var(--space-4); }
  .modal { width: 100%; max-width: 460px; background: var(--bg-card); border: 1px solid var(--border-accent); border-radius: var(--radius-lg); padding: var(--space-5); max-height: 90vh; overflow-y: auto; }
  .modal__t { font-family: var(--font-display); font-weight: 700; font-size: var(--text-lg); color: var(--accent-gold); margin: 0 0 10px; }
  .modal__b { color: var(--fg-secondary); font-size: var(--text-sm); line-height: 1.55; margin: 0 0 10px; }
  .modal__b strong { color: var(--fg-primary); }
  .modal__act { display: flex; justify-content: flex-end; gap: 8px; margin-top: var(--space-4); }

  @media (max-width: 880px) { .charts { grid-template-columns: 1fr; } .idx { gap: var(--space-4); } }
</style>
