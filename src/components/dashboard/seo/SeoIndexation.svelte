<script>
  // Indexación de Search Console (donut + barra + motivos + página de inicio).
  // SEO-08: si no hay datos se dice POR QUÉ (sin permiso, sin sitemaps…).
  // SEO-09: sin sitemaps enviados no hay donut "0 %" que parezca una alarma.
  import Card from '../ui/Card.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import StatusChip from '../ui/StatusChip.svelte';
  import DataTable from '../ui/DataTable.svelte';
  import { nfmt, fmtDateTime, coverageState, issueLabel } from './format.js';

  let {
    indexation = null,      // foto guardada (metrics.indexation) o null
    hasGsc = false,         // ¿el proyecto tiene propiedad de Search Console?
    state = null,           // sync_state.sources.indexation (estado del último intento)
    syncing = false,
    gscFailed = false,      // Search Console falló en la última sincronización (el motivo ya se ve arriba)
    onsync, onedit, onstatus,
  } = $props();

  const DONUT_R = 34, DONUT_C = 2 * Math.PI * 34;
  const total = $derived(indexation ? Number(indexation.total) || 0 : 0);
  const indexed = $derived(indexation ? Number(indexation.indexed) || 0 : 0);
  const noSitemaps = $derived(Boolean(indexation) && (indexation.no_sitemaps === true || total === 0));
  const ratio = $derived(total ? Math.max(0, Math.min(1, indexed / total)) : 0);
  const pctTxt = $derived(total ? (Math.round(ratio * 1000) / 10).toLocaleString('es-US', { maximumFractionDigits: 1 }) + ' %' : '');
  const reason = $derived(state && state.error ? state.error : null);
  const forbidden = $derived(reason && /forbidden|not_configured|auth_failed/.test(reason.code || ''));

  const pageCols = [
    { key: 'url', label: 'Página', primary: true },
    { key: 'state', label: 'Estado' },
    { key: 'last_crawl', label: 'Último rastreo', align: 'end' },
  ];
</script>

<Card title="Indexación" caption="Search Console">
  {#snippet actions()}
    {#if indexation && indexation.checked_at}<span class="ix-when">Revisado {fmtDateTime(indexation.checked_at)}</span>{/if}
  {/snippet}

  {#if !hasGsc}
    <EmptyState compact title="Search Console sin configurar" text="Añade la propiedad de Search Console del sitio para ver qué páginas tiene Google.">
      {#snippet action()}<button type="button" class="b" onclick={onedit}>Editar proyecto</button>{/snippet}
    </EmptyState>
  {:else if !indexation}
    {#if gscFailed}
      <EmptyState compact title="Sin datos de indexación" text="Search Console falló en la última sincronización. El motivo y qué hacer están arriba." />
    {:else if reason}
      <EmptyState compact title={reason.title} text={reason.action}>
        {#snippet action()}
          {#if forbidden}<button type="button" class="b" onclick={onstatus}>Ver estado de Google</button>{/if}
          <button type="button" class="b" onclick={onsync} disabled={syncing}>{syncing ? 'Actualizando…' : 'Volver a intentar'}</button>
        {/snippet}
      </EmptyState>
    {:else}
      <EmptyState compact title="Aún no hay datos de indexación" text="Se consultan en cada sincronización: las URLs enviadas en los sitemaps y el estado de la página de inicio.">
        {#snippet action()}<button type="button" class="b" onclick={onsync} disabled={syncing}>{syncing ? 'Actualizando…' : 'Actualizar ahora'}</button>{/snippet}
      </EmptyState>
    {/if}
  {:else}
    {#if noSitemaps}
      <div class="ix-note" role="note">
        <p class="ix-note__t">No hay sitemaps enviados en Search Console</p>
        <p class="ix-note__a">Sin sitemap no hay un total de páginas con el que comparar. Envíalo en Search Console, Sitemaps. Mientras tanto se revisa solo la página de inicio.</p>
      </div>
    {:else}
      <div class="ix">
        <svg class="ix__donut" viewBox="0 0 88 88" role="img" aria-label="{nfmt(indexed)} de {nfmt(total)} URLs del sitemap indexadas">
          <defs>
            <linearGradient id="seoIdxDonut" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="var(--accent-gold-hover)" /><stop offset="1" stop-color="var(--accent-gold-deep)" />
            </linearGradient>
          </defs>
          <circle cx="44" cy="44" r={DONUT_R} fill="none" stroke="var(--bg-elevated)" stroke-width="11" />
          <circle cx="44" cy="44" r={DONUT_R} fill="none" stroke="url(#seoIdxDonut)" stroke-width="11" stroke-linecap="round"
            stroke-dasharray="{(ratio * DONUT_C).toFixed(1)} {DONUT_C.toFixed(1)}" transform="rotate(-90 44 44)"
            style="transition: stroke-dasharray var(--duration-base) var(--ease)" />
          <text x="44" y="48" text-anchor="middle" class="ix__pct">{pctTxt}</text>
        </svg>
        <div class="ix__body">
          <p class="ix__ratio"><span class="ix__num">{nfmt(indexed)}</span> <span class="ix__of">de {nfmt(total)}</span></p>
          <p class="ix__cap">URLs del sitemap indexadas</p>
          <div class="ix__bar" role="img" aria-label="{nfmt(indexed)} de {nfmt(total)} URLs indexadas">
            <div class="ix__fill" style="width:{Math.round(ratio * 100)}%"></div>
          </div>
          <div class="ix__legend">
            <span><span class="dot dot--on"></span>Indexadas {nfmt(indexed)}</span>
            <span><span class="dot"></span>Sin indexar {nfmt(indexation.not_indexed)}</span>
          </div>
        </div>
      </div>
    {/if}

    {#if reason && !noSitemaps && reason.code !== 'not_configured'}
      <p class="ix-warn">{reason.title}. {reason.action}</p>
    {/if}

    {#if indexation.issues && indexation.issues.length}
      <h3 class="ix__sub">Avisos de Search Console</h3>
      <ul class="ix__issues">
        {#each indexation.issues as it, i (i)}
          <li class="ix__issue"><span class="ix__reason">{issueLabel(it.reason)}</span><span class="ix__count">{nfmt(it.count)}</span></li>
        {/each}
      </ul>
    {/if}

    {#if indexation.pages && indexation.pages.length}
      <h3 class="ix__sub">Página de inicio</h3>
      <DataTable columns={pageCols} rows={indexation.pages} rowKey="url" caption="Estado de la página de inicio en Google">
        {#snippet cell(row, col)}
          {#if col.key === 'url'}<span class="ix__url" title={row.url}>{row.url || '—'}</span>
          {:else if col.key === 'state'}{@const s = coverageState(row.state)}<StatusChip tone={s.tone} label={s.label} />
          {:else}<span class="ix__date">{row.last_crawl ? fmtDateTime(row.last_crawl) : 'Sin rastrear'}</span>{/if}
        {/snippet}
      </DataTable>
    {/if}
  {/if}
</Card>

<style>
  .ix-when { font-size: var(--dash-caption); color: var(--fg-subtle); white-space: nowrap; }
  .ix { display: flex; align-items: center; gap: var(--space-5); flex-wrap: wrap; }
  .ix__donut { width: 96px; height: 96px; flex: 0 0 auto; display: block; }
  .ix__pct { fill: var(--fg-primary); font-weight: 650; font-size: 15px; letter-spacing: -0.02em; }
  .ix__body { flex: 1 1 260px; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  .ix__ratio { margin: 0; display: flex; align-items: baseline; gap: 6px; }
  .ix__num { font-size: 30px; font-weight: 650; letter-spacing: -0.025em; line-height: 1; color: var(--fg-primary); }
  .ix__of { font-size: var(--dash-body); color: var(--fg-secondary); }
  .ix__cap { margin: 0; font-size: var(--dash-caption); color: var(--fg-subtle); }
  .ix__bar { height: 10px; background: var(--bg-elevated); border-radius: var(--radius-pill); overflow: hidden; margin-top: 4px; }
  .ix__fill { height: 100%; background: linear-gradient(90deg, var(--accent-gold-hover), var(--accent-gold-deep)); border-radius: var(--radius-pill); min-width: 2px; transition: width var(--duration-base) var(--ease); }
  .ix__legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: var(--dash-caption); color: var(--fg-secondary); }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; vertical-align: middle; background: var(--surface-3); border: 1px solid var(--border-strong); }
  .dot--on { background: var(--accent-gold); border-color: var(--accent-gold); }

  .ix-note { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px 16px; }
  .ix-note__t { margin: 0; font-size: var(--dash-body); font-weight: 600; color: var(--fg-primary); }
  .ix-note__a { margin: 4px 0 0; font-size: var(--dash-small); color: var(--fg-secondary); line-height: 1.5; }
  .ix-warn { margin: var(--space-4) 0 0; font-size: var(--dash-small); color: var(--color-warning); line-height: 1.5; }

  .ix__sub { margin: var(--space-5) 0 10px; font-size: var(--dash-caption); font-weight: 500; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-subtle); }
  .ix__issues { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 8px; }
  .ix__issue { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: 10px 12px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
  .ix__reason { font-size: var(--dash-small); color: var(--fg-secondary); min-width: 0; overflow-wrap: anywhere; }
  .ix__count { font-family: var(--font-mono); font-size: var(--dash-caption); color: var(--color-warning); flex: 0 0 auto; }
  .ix__url { display: block; max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--fg-primary); }
  .ix__date { font-variant-numeric: tabular-nums; color: var(--fg-secondary); }
  @media (max-width: 719px) { .ix__url { max-width: 100%; white-space: normal; overflow-wrap: anywhere; } }
</style>
