#!/usr/bin/env node
/**
 * Daily GSC indexing-status check + "request indexing" queue builder. (Marcyan)
 * Replicado del sweep de MJA/TRR (playbook_daily_indexing_sweep).
 *
 * Fetches the LIVE sitemap (Astro lo genera en build → se lee de prod, no de
 * public/; soporta sitemap-index con hijos) → for each URL, queries the GSC
 * URL Inspection API → updates data/indexing-status.json with current
 * coverageState + history. Then identifies pending submissions (NOT indexed
 * AND (never requested OR last requested >= 7 days ago)) and writes the top N
 * to data/indexing-pending.json for the cron orchestrator to process via
 * Chrome MCP.
 *
 * Why the API and not the GSC "Not indexed" UI list: that report lags badly and
 * under-reports (visto en MJA). The URL Inspection API gives the true per-URL
 * state. Además el informe agregado mezcla variantes viejas con barra final
 * ("All known pages") que aquí ni existen: solo se inspecciona el sitemap real.
 *
 * Required env (in .env.local, same OAuth as MJA/TRR — cuenta ywinc00 con
 * permiso Full en sc-domain:marcyanstudio.com):
 *   GSC_OAUTH_CLIENT_ID, GSC_OAUTH_CLIENT_SECRET, GSC_OAUTH_REFRESH_TOKEN
 *
 * CLI flags:
 *   --dry-run       Don't write status/pending files; print summary
 *   --max N         Cap pending queue at N (default 8 — cuota real observada
 *                   en esta propiedad: ~8/día, no 10)
 *
 * Exit codes: 0 ok, 1 missing env, 2 auth failure, 3 API error, 4 unhandled.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// GSC property is a verified DOMAIN property → siteUrl is the sc-domain: form,
// NOT an https:// URL-prefix (misma forma que MJA).
const GSC_PROPERTY = 'sc-domain:marcyanstudio.com';
// Canonical host — used only for label-stripping and as the sitemap origin.
// OJO: el sitio canónico es SIN www y SIN barra final en rutas.
const SITE_URL = 'https://marcyanstudio.com/';
// Astro genera el sitemap en build; se lee el índice EN VIVO y sus hijos.
const SITEMAP_URL = 'https://marcyanstudio.com/sitemap-index.xml';

const STATUS_FILE = path.join(REPO_ROOT, 'data', 'indexing-status.json');
const PENDING_FILE = path.join(REPO_ROOT, 'data', 'indexing-pending.json');
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';

const MAX_PER_DAY = 8; // cuota real observada en esta propiedad (TANDA 1: paró en la 9ª)
const COOLDOWN_DAYS = 7;
const DELAY_BETWEEN_CALLS_MS = 250;

// GSC coverageState strings that mean the URL IS indexed (treated as done).
function isIndexed(state) {
  if (!state) return false;
  return /\bindexed\b/i.test(state) && !/not indexed/i.test(state);
}

// GSC coverageState strings where requesting indexing makes NO sense — Google
// intentionally excludes these (canonical conflicts, redirects, noindex tags).
// En Marcyan esto también protege la limpieza post-fix del trailing-slash:
// las "Alternate page with proper canonical tag" se resuelven solas al re-rastrear.
function shouldSkipRequest(state) {
  if (!state) return false;
  return /noindex/i.test(state)
    || /alternate page/i.test(state)
    || /\bredirect\b/i.test(state)
    || /duplicate/i.test(state)
    || /soft 404|404/i.test(state);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const maxFromCli = (() => { const i = args.indexOf('--max'); return i >= 0 ? Number(args[i + 1]) : NaN; })();
const maxPending = Number.isFinite(maxFromCli) && maxFromCli > 0 ? maxFromCli : MAX_PER_DAY;

const die = (code, msg) => { console.error('✗', msg); process.exit(code); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getAccessToken() {
  const cid = process.env.GSC_OAUTH_CLIENT_ID;
  const sec = process.env.GSC_OAUTH_CLIENT_SECRET;
  const rt = process.env.GSC_OAUTH_REFRESH_TOKEN;
  if (!cid || !sec || !rt) die(1, 'Missing OAuth env. Need GSC_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN in .env.local.');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: cid, client_secret: sec, refresh_token: rt, grant_type: 'refresh_token' }),
  });
  const data = await res.json();
  if (!data.access_token) die(2, `Token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function inspectUrl(token, url) {
  const res = await fetch(INSPECT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    // languageCode 'en' A PROPÓSITO: isIndexed()/shouldSkipRequest() hacen
    // regex sobre los coverageState en inglés. No cambiar a 'es'.
    body: JSON.stringify({ inspectionUrl: url, siteUrl: GSC_PROPERTY, languageCode: 'en' }),
  });
  const data = await res.json();
  if (data.error) return { error: data.error.message, code: data.error.code };
  const r = data?.inspectionResult?.indexStatusResult || {};
  return {
    coverageState: r.coverageState ?? 'unknown',
    verdict: r.verdict ?? 'unknown',
    lastCrawlTime: r.lastCrawlTime ?? null,
    indexingState: r.indexingState ?? null,
    robotsTxtState: r.robotsTxtState ?? null,
    pageFetchState: r.pageFetchState ?? null,
    googleCanonical: r.googleCanonical ?? null,
    userCanonical: r.userCanonical ?? null,
    inspectionResultLink: data?.inspectionResult?.inspectionResultLink ?? null,
  };
}

/* Business priority for the request-indexing queue. Lower = sooner.
   Espeja el plan de TANDAS 2-6 de la sesión de indexación:
   Tier 0: homes + hubs (es/en, houston/miami, servicios/precios y espejos EN).
   Tier 1: money pages Houston (servicio×ciudad) + landings de precios.
   Tier 2: Miami (servicio×ciudad y barrios).
   Tier 3: resto de landings (diagnóstico, herramientas, ia-para-pymes,
           industrias, barrios Houston…).
   Tier 4: blog.
   Tier 5: legales y utilitarias. */
function urlPriority(url) {
  /* SITE_URL termina en '/': replace() deja el path SIN su slash inicial
     (gotcha heredado de la auditoría de MJA 2026-07) — se re-añade. */
  const p = '/' + url.replace(SITE_URL, '');
  if (/^\/(es|en)$/.test(p))                                              return 0;
  if (/^\/(es\/(houston|miami|servicios|precios)|en\/(houston|miami|services|pricing))$/.test(p)) return 0;
  if (/^\/(es|en)\/houston\//.test(p))                                    return 1;
  if (/^\/(es\/precios|en\/pricing)\//.test(p))                           return 1;
  if (/^\/(es|en)\/miami\//.test(p))                                      return 2;
  if (/^\/(es|en)\/blog(\/|$)/.test(p))                                   return 4;
  if (/^\/(es|en)\/(privacidad|terminos|accesibilidad|privacy|terms|accessibility)/.test(p)) return 5;
  return 3;
}

// Lee el sitemap EN VIVO. Soporta sitemap-index: si un <loc> apunta a otro
// .xml del mismo host, se descarga y se recolectan sus URLs de página.
async function fetchLocs(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'marcyan-indexing-sweep' } });
  if (!res.ok) die(3, `Sitemap fetch failed: ${res.status} ${res.statusText} (${url})`);
  const xml = await res.text();
  const locs = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) locs.push(m[1].trim());
  return locs;
}

async function loadSitemap() {
  const top = await fetchLocs(SITEMAP_URL);
  const urls = new Set();
  for (const u of top) {
    if (/\.xml(\?|$)/i.test(u)) {
      for (const child of await fetchLocs(u)) {
        if (/\.xml(\?|$)/i.test(child)) continue; // no anidar más de 1 nivel
        if (child.includes('?')) continue;
        urls.add(child);
      }
    } else {
      if (u.includes('?')) continue;
      urls.add(u);
    }
  }
  if (urls.size === 0) die(3, 'Sitemap parsed but contained 0 page URLs.');
  return [...urls].sort();
}

async function loadStatus() {
  try { return JSON.parse(await fs.readFile(STATUS_FILE, 'utf8')); }
  catch { return { lastFullCheck: null, urls: {} }; }
}

async function main() {
  const token = await getAccessToken();
  const urls = await loadSitemap();
  const status = await loadStatus();
  const now = new Date().toISOString();

  console.log(`▶ Inspecting ${urls.length} URLs from sitemap (property: ${GSC_PROPERTY})`);

  for (const url of urls) {
    const label = url.replace(SITE_URL, '/');
    process.stdout.write(`  ? ${label.padEnd(52)} `);
    const r = await inspectUrl(token, url);
    const prev = status.urls[url] || {};
    if (r.error) {
      console.log(`error ${r.code}: ${r.error}`);
      status.urls[url] = {
        ...prev,
        lastChecked: now,
        lastError: { code: r.code, message: r.error, at: now },
      };
    } else {
      const justIndexed = !isIndexed(prev.coverageState) && isIndexed(r.coverageState);
      status.urls[url] = {
        ...prev,
        coverageState: r.coverageState,
        verdict: r.verdict,
        lastCrawlTime: r.lastCrawlTime,
        /* Diagnostic states the API already returns with every response —
           persisting them costs nothing and lets the sweep distinguish
           "Google can't fetch" from "Google chose not to index". */
        indexingState: r.indexingState,
        robotsTxtState: r.robotsTxtState,
        pageFetchState: r.pageFetchState,
        googleCanonical: r.googleCanonical,
        userCanonical: r.userCanonical,
        lastChecked: now,
        lastError: null,
        indexedAt: justIndexed ? now : (prev.indexedAt || (isIndexed(r.coverageState) ? now : null)),
      };
      console.log(r.coverageState);
    }
    await sleep(DELAY_BETWEEN_CALLS_MS);
  }
  status.lastFullCheck = now;

  // Build the pending queue.
  const cutoff = Date.now() - COOLDOWN_DAYS * 86_400_000;
  const candidates = [];
  for (const [url, s] of Object.entries(status.urls)) {
    if (isIndexed(s.coverageState)) continue;
    if (shouldSkipRequest(s.coverageState)) continue;
    const last = s.lastIndexRequestAt ? Date.parse(s.lastIndexRequestAt) : 0;
    if (last >= cutoff) continue;
    candidates.push({
      url,
      coverageState: s.coverageState,
      lastIndexRequestAt: s.lastIndexRequestAt || null,
      requestCount: (s.indexRequestHistory || []).length,
    });
  }
  // Priority: business tier first, then never-requested / oldest request,
  // then alphabetical as the stable tiebreaker.
  candidates.sort((a, b) => {
    const pa = urlPriority(a.url), pb = urlPriority(b.url);
    if (pa !== pb) return pa - pb;
    const ra = a.lastIndexRequestAt ? Date.parse(a.lastIndexRequestAt) : 0;
    const rb = b.lastIndexRequestAt ? Date.parse(b.lastIndexRequestAt) : 0;
    if (ra !== rb) return ra - rb;
    return a.url.localeCompare(b.url);
  });

  const pending = candidates.slice(0, maxPending);
  const totals = {
    total: urls.length,
    indexed: Object.values(status.urls).filter((s) => isIndexed(s.coverageState)).length,
    notIndexed: Object.values(status.urls).filter((s) => !isIndexed(s.coverageState) && !shouldSkipRequest(s.coverageState)).length,
    skipped: Object.values(status.urls).filter((s) => shouldSkipRequest(s.coverageState)).length,
  };
  const summary = {
    builtAt: now,
    property: GSC_PROPERTY,
    cooldownDays: COOLDOWN_DAYS,
    maxPerDay: maxPending,
    totals,
    candidates: candidates.length,
    pending,
  };

  if (dryRun) {
    console.log('\n--- DRY RUN (no files written) ---');
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  await fs.mkdir(path.dirname(STATUS_FILE), { recursive: true });
  await fs.writeFile(STATUS_FILE, JSON.stringify(status, null, 2) + '\n', 'utf8');
  await fs.writeFile(PENDING_FILE, JSON.stringify(summary, null, 2) + '\n', 'utf8');

  console.log(`\n✓ data/indexing-status.json   updated (${urls.length} URLs)`);
  console.log(`✓ data/indexing-pending.json  ${pending.length} queued · ${candidates.length} eligible total`);
  console.log(`  Indexed:     ${totals.indexed}/${urls.length}`);
  console.log(`  Not indexed: ${totals.notIndexed} (queueable)`);
  console.log(`  Skipped:     ${totals.skipped} (noindex/alternate/redirect/duplicate)`);
  if (pending.length) {
    console.log('\nNext to submit:');
    pending.forEach((p, i) => {
      const ago = p.lastIndexRequestAt
        ? `requested ${Math.round((Date.now() - Date.parse(p.lastIndexRequestAt)) / 86_400_000)}d ago`
        : 'never requested';
      console.log(`  ${i + 1}. [${p.coverageState}] ${p.url.replace(SITE_URL, '/')} — ${ago}`);
    });
  } else {
    console.log('\n✓ Nothing to submit today (all indexed, in cooldown, or excluded).');
  }
}

main().catch((err) => { console.error('✗ Unhandled:', err); process.exit(4); });
