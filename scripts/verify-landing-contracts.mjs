#!/usr/bin/env node
/**
 * verify-landing-contracts.mjs — Verificador de contratos post-build (plan maestro, Fase 0.4)
 *
 * Corre sobre `dist/` (tras `npm run build`) y, para cada landing de cluster, asserta
 * los contratos que un rediseño creativo puede romper sin que nada más falle:
 *
 *   1. Exactamente UN <h1>.
 *   2. JSON-LD: Service + FAQPage + BreadcrumbList (por página) + el @graph del Layout.
 *      Además, el FAQPage cita VERBATIM las preguntas/respuestas del slice.
 *   3. Canonical = https://marcyanstudio.com + ruta, SIN barra final.
 *   4. hreflang es + x-default (= la versión ES) y en cuando hay espejo (routes.ts);
 *      ningún alternate con barra final.
 *   5. Trío de conversión anclado al marcado del PROPIO CtaBand: pares clase+atributo
 *      `ctaband__act--form`+proposal_requested · `--wa`+whatsapp_clicked ·
 *      `--call`+call_clicked, exactamente uno de cada. (La mera presencia de los
 *      nombres de evento NO vale: SiteNav, footer, Contact y ChatWidget también los emiten.)
 *   6. Paridad de texto server-renderizado: answer.q/a, cada faq.q/a y los párrafos de
 *      `local` aparecen literalmente en el HTML VISIBLE de dist/ (fuera de <script>,
 *      <style> y <template>), no solo dentro del JSON-LD.
 *
 * Snapshots (estado de indexación + contratos) para las migraciones:
 *   --snapshot <nombre>   Guarda data/contract-snapshots/<nombre>.json con los contratos
 *                         de cada URL en alcance y su coverageState actual de
 *                         data/indexing-status.json (tomar el día del merge, o ANTES de
 *                         la migración como base).
 *   --compare <nombre>    Compara dist/ + indexing-status.json actuales contra ese snapshot:
 *                         FALLA si canonical/hreflang/trío/paridad/JSON-LD empeoraron o si el
 *                         estado de indexación de alguna URL bajó de escalón; AVISA si cambió
 *                         el texto del h1. Recomprobar a los 14 y 28 días (el script imprime
 *                         las fechas).
 *
 * Alcance: por defecto TODAS las landings de `clusters` (ES) y `clustersEn` (EN).
 *   --urls /es/houston/diseno-web,/en/houston/web-design   Solo esas rutas (las migradas).
 *   --dist <dir>   Carpeta de build (default: dist)     --json   Salida máquina (una línea)
 *
 * Cómo lee los slices TS sin toolchain extra: los bundlea en memoria con el esbuild que
 * ya trae Vite (dependencia de Astro). Cero dependencias nuevas.
 *
 * Exit: 0 PASA · 1 FALLA · 2 error de uso/entorno.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SITE = 'https://marcyanstudio.com';
const STATUS_FILE = path.join(REPO_ROOT, 'data', 'indexing-status.json');
const SNAP_DIR = path.join(REPO_ROOT, 'data', 'contract-snapshots');

// ── CLI ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const has = (name) => argv.includes(name);
const DIST = path.resolve(REPO_ROOT, flag('--dist') || 'dist');
const ONLY = (flag('--urls') || '').split(',').map((s) => s.trim()).filter(Boolean).map(normPath);
const SNAPSHOT = flag('--snapshot');
const COMPARE = flag('--compare');
const JSON_OUT = has('--json');

function normPath(p) {
  // Acepta rutas sin barra inicial: Git Bash en Windows convierte "/es/x" en una ruta
  // del sistema al pasarla como argumento; con `es/x` no ocurre.
  const s = ('/' + String(p || '')).replace(/^\/+/, '/').replace(/\/+$/, '');
  return s === '' ? '/' : s;
}
const abs = (p) => (p === '/' ? `${SITE}/` : `${SITE}${p}`);

// ── Slices TS → módulo ESM en memoria (esbuild de Vite) ──────────────────────
async function loadSlices() {
  let esbuild;
  try { esbuild = await import('esbuild'); }
  catch { throw new Error('esbuild no disponible (lo trae Vite/Astro: ¿falta npm install?)'); }
  const entry = [
    "export { clusters } from './src/i18n/clusters.ts';",
    "export { clustersEn } from './src/i18n/clusters.en.ts';",
    "export { mirrorPath } from './src/i18n/routes.ts';",
  ].join('\n');
  const out = await esbuild.build({
    stdin: { contents: entry, resolveDir: REPO_ROOT, loader: 'ts', sourcefile: 'verify-entry.ts' },
    bundle: true, format: 'esm', platform: 'node', target: 'node20', write: false, logLevel: 'silent',
  });
  const tmp = path.join(os.tmpdir(), `marcyan-slices-${process.pid}-${Date.now()}.mjs`);
  await fs.writeFile(tmp, out.outputFiles[0].text);
  try { return await import(pathToFileURL(tmp).href); }
  finally { fs.unlink(tmp).catch(() => {}); }
}

// ── Utilidades HTML (sin dependencias) ───────────────────────────────────────
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decode(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in ENT ? ENT[n.toLowerCase()] : m));
}
const stripTags = (s) => String(s).replace(/<[^>]+>/g, ' ');
const squash = (s) => decode(stripTags(s)).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
/** Texto VISIBLE del documento: fuera de script/style/template/head. */
function visibleText(html) {
  const body = html.replace(/^[\s\S]*?<body[^>]*>/i, '');
  const noHidden = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<template\b[\s\S]*?<\/template>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  return squash(noHidden);
}
function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    out[m[1].toLowerCase()] = decode(m[3] ?? m[4] ?? m[5] ?? '');
  }
  return out;
}
function jsonLdBlocks(html) {
  const blocks = [];
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { blocks.push(JSON.parse(m[1])); } catch { blocks.push({ __invalid: true, raw: m[1].slice(0, 120) }); }
  }
  return blocks;
}
function linkTags(html) {
  const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] || html;
  return Array.from(head.matchAll(/<link\b[^>]*>/gi)).map((m) => attrs(m[0]));
}

// ── Escalera de estados de indexación (más alto = mejor) ─────────────────────
function indexRank(state) {
  const s = String(state || '').toLowerCase();
  if (!s || /unknown to google/.test(s)) return 0;
  if (/\bindexed\b/.test(s) && !/not indexed/.test(s)) return 3;
  if (/crawled/.test(s)) return 2;
  if (/discovered/.test(s)) return 1;
  return 0; // errores, excluidas, redirecciones…
}

// ── Contratos por URL ────────────────────────────────────────────────────────
async function checkUrl(cluster, lang, mirrorPath, indexing) {
  const p = normPath(cluster.path);
  const file = path.join(DIST, ...p.split('/').filter(Boolean), 'index.html');
  const checks = [];
  const ok = (name, pass, detail) => checks.push({ name, pass: !!pass, detail });
  const facts = { path: p, lang, h1: null, canonical: null, hreflang: {}, jsonLdTypes: [], trio: {}, parity: null };

  let html;
  try { html = await fs.readFile(file, 'utf8'); }
  catch { ok('html', false, `no existe ${path.relative(REPO_ROOT, file)} (¿falta npm run build?)`); return { facts, checks }; }

  // 1 · un solo h1
  const h1s = Array.from(html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)).map((m) => squash(m[1]));
  facts.h1 = h1s[0] ?? null;
  ok('h1', h1s.length === 1, `${h1s.length} <h1>`);

  // 2 · JSON-LD
  const blocks = jsonLdBlocks(html);
  const types = new Set();
  let graph = false;
  for (const b of blocks) {
    if (b.__invalid) { ok('jsonld-parse', false, `JSON-LD inválido: ${b.raw}…`); continue; }
    if (Array.isArray(b['@graph'])) graph = true;
    for (const t of [].concat(b['@type'] || [])) types.add(t);
  }
  facts.jsonLdTypes = [...types].sort();
  for (const t of ['Service', 'FAQPage', 'BreadcrumbList']) ok(`jsonld-${t}`, types.has(t), types.has(t) ? 'presente' : 'AUSENTE');
  ok('jsonld-graph', graph, graph ? '@graph del Layout presente' : '@graph AUSENTE');
  const faqLd = blocks.find((b) => b['@type'] === 'FAQPage');
  if (faqLd) {
    const qa = new Map((faqLd.mainEntity || []).map((e) => [squash(e.name || ''), squash(e.acceptedAnswer?.text || '')]));
    const bad = cluster.faq.items.filter((it) => qa.get(squash(it.q)) !== squash(it.a));
    ok('jsonld-faq-verbatim', bad.length === 0, bad.length ? `FAQPage ≠ slice en: ${bad.map((b) => `"${b.q.slice(0, 40)}…"`).join(', ')}` : `${cluster.faq.items.length} Q/A idénticas`);
  }

  // 3 · canonical
  const links = linkTags(html);
  const canon = links.find((l) => l.rel === 'canonical')?.href ?? null;
  facts.canonical = canon;
  ok('canonical', canon === abs(p), canon ? canon : 'sin canonical');
  ok('canonical-sin-barra', !!canon && !/\/$/.test(canon), canon);

  // 4 · hreflang
  const alts = {};
  for (const l of links) if (l.rel === 'alternate' && l.hreflang) alts[l.hreflang] = l.href;
  facts.hreflang = alts;
  const mirror = mirrorPath(p, lang);
  const esHref = lang === 'es' ? abs(p) : mirror ? abs(mirror) : null;
  const enHref = lang === 'en' ? abs(p) : mirror ? abs(mirror) : null;
  ok('hreflang-es', esHref ? alts.es === esHref : !!alts.es, `es → ${alts.es ?? 'AUSENTE'}`);
  ok('hreflang-x-default', alts['x-default'] === alts.es && !!alts.es, `x-default → ${alts['x-default'] ?? 'AUSENTE'}`);
  if (enHref) ok('hreflang-en', alts.en === enHref, `en → ${alts.en ?? 'AUSENTE'} (esperado ${enHref})`);
  else ok('hreflang-en', !alts.en, alts.en ? `en → ${alts.en} pero NO hay espejo en routes.ts` : 'sin espejo, sin en (correcto)');
  ok('hreflang-sin-barra', Object.values(alts).every((h) => !/[^/]\/$/.test(h) || h === `${SITE}/`), Object.values(alts).join(' · '));

  // 5 · trío de conversión anclado al CtaBand
  const trio = { form: ['ctaband__act--form', 'proposal_requested'], wa: ['ctaband__act--wa', 'whatsapp_clicked'], call: ['ctaband__act--call', 'call_clicked'] };
  const anchors = Array.from(html.matchAll(/<a\b[^>]*>/gi)).map((m) => attrs(m[0]));
  for (const [k, [cls, ev]] of Object.entries(trio)) {
    const n = anchors.filter((a) => (a.class || '').split(/\s+/).includes(cls) && a['data-track'] === ev).length;
    facts.trio[k] = n;
    ok(`ctaband-${k}`, n === 1, `${n} <a class~="${cls}" data-track="${ev}">`);
  }

  // 6 · paridad de texto visible
  const text = visibleText(html);
  const expected = [
    ['answer.q', cluster.answer.q], ['answer.a', cluster.answer.a],
    ...cluster.faq.items.flatMap((it, i) => [[`faq[${i}].q`, it.q], [`faq[${i}].a`, it.a]]),
    ...cluster.local.paragraphs.map((s, i) => [`local[${i}]`, s]),
  ];
  const missing = expected.filter(([, s]) => !text.includes(squash(s))).map(([k]) => k);
  facts.parity = missing.length === 0;
  ok('paridad-texto-visible', missing.length === 0, missing.length ? `faltan literalmente en el HTML visible: ${missing.join(', ')}` : `${expected.length} strings presentes`);

  // Indexación (solo informativo aquí; el gate está en --compare)
  const st = indexing?.urls?.[abs(p)] ?? indexing?.urls?.[abs(p).replace(/\/$/, '')];
  facts.indexing = st ? { coverageState: st.coverageState, lastChecked: st.lastChecked } : null;

  return { facts, checks };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { clusters, clustersEn, mirrorPath } = await loadSlices();
  let indexing = null;
  try { indexing = JSON.parse(await fs.readFile(STATUS_FILE, 'utf8')); } catch {}

  const all = [
    ...Object.values(clusters).map((c) => ({ c, lang: 'es' })),
    ...Object.values(clustersEn).map((c) => ({ c, lang: 'en' })),
  ];
  const scope = ONLY.length ? all.filter(({ c }) => ONLY.includes(normPath(c.path))) : all;
  if (ONLY.length) {
    const known = new Set(all.map(({ c }) => normPath(c.path)));
    const unknown = ONLY.filter((u) => !known.has(u));
    if (unknown.length) { console.error(`✗ rutas sin slice de cluster: ${unknown.join(', ')}`); process.exit(2); }
  }
  if (!scope.length) { console.error('✗ alcance vacío'); process.exit(2); }

  const results = [];
  for (const { c, lang } of scope) results.push(await checkUrl(c, lang, mirrorPath, indexing));

  let failures = 0, warnings = 0;
  const report = [];

  for (const r of results) {
    const failed = r.checks.filter((k) => !k.pass);
    failures += failed.length;
    report.push({ path: r.facts.path, pass: failed.length === 0, failed: failed.map((k) => `${k.name}: ${k.detail}`), indexing: r.facts.indexing?.coverageState ?? null });
  }

  // ── Snapshot / compare ──
  let compare = null;
  if (SNAPSHOT) {
    await fs.mkdir(SNAP_DIR, { recursive: true });
    const file = path.join(SNAP_DIR, `${SNAPSHOT}.json`);
    const urls = {};
    for (const r of results) urls[r.facts.path] = r.facts;
    await fs.writeFile(file, JSON.stringify({ name: SNAPSHOT, createdAt: new Date().toISOString(), indexingCheckedAt: indexing?.lastFullCheck ?? null, urls }, null, 2) + '\n');
    report.snapshotFile = path.relative(REPO_ROOT, file);
  }
  if (COMPARE) {
    const file = path.join(SNAP_DIR, `${COMPARE}.json`);
    let snap;
    try { snap = JSON.parse(await fs.readFile(file, 'utf8')); }
    catch { console.error(`✗ no existe el snapshot ${path.relative(REPO_ROOT, file)}`); process.exit(2); }
    compare = { name: COMPARE, createdAt: snap.createdAt, diffs: [] };
    for (const r of results) {
      const before = snap.urls?.[r.facts.path];
      if (!before) { compare.diffs.push({ path: r.facts.path, level: 'WARN', what: 'URL no estaba en el snapshot' }); warnings++; continue; }
      const now = r.facts;
      const fail = (what) => { compare.diffs.push({ path: now.path, level: 'FAIL', what }); failures++; };
      const warn = (what) => { compare.diffs.push({ path: now.path, level: 'WARN', what }); warnings++; };
      if (before.canonical !== now.canonical) fail(`canonical cambió: ${before.canonical} → ${now.canonical}`);
      for (const k of new Set([...Object.keys(before.hreflang || {}), ...Object.keys(now.hreflang || {})]))
        if (before.hreflang?.[k] !== now.hreflang?.[k]) fail(`hreflang ${k} cambió: ${before.hreflang?.[k]} → ${now.hreflang?.[k]}`);
      for (const t of before.jsonLdTypes || []) if (!now.jsonLdTypes.includes(t)) fail(`JSON-LD ${t} desapareció`);
      for (const k of Object.keys(before.trio || {})) if (before.trio[k] === 1 && now.trio[k] !== 1) fail(`trío CtaBand ${k}: ${before.trio[k]} → ${now.trio[k]}`);
      if (before.parity && !now.parity) fail('paridad de texto visible perdida');
      if (before.h1 !== now.h1) warn(`h1 cambió: "${before.h1}" → "${now.h1}"`);
      const rb = indexRank(before.indexing?.coverageState), rn = indexRank(now.indexing?.coverageState);
      if (before.indexing && !now.indexing) warn('sin estado de indexación actual (data/indexing-status.json)');
      else if (rn < rb) fail(`indexación EMPEORÓ: "${before.indexing?.coverageState}" → "${now.indexing?.coverageState}"`);
    }
    const t0 = new Date(snap.createdAt);
    const plus = (d) => new Date(t0.getTime() + d * 86400000).toISOString().slice(0, 10);
    compare.recheck = { day14: plus(14), day28: plus(28) };
  }

  // ── Salida ──
  const summary = { scope: results.length, failures, warnings, pass: failures === 0, report, compare };
  if (JSON_OUT) { console.log(JSON.stringify(summary)); }
  else {
    console.log(`\nverify-landing-contracts · ${results.length} URL(s) · dist=${path.relative(REPO_ROOT, DIST)}\n`);
    for (const r of report) {
      console.log(`${r.pass ? '✓ PASA ' : '✗ FALLA'}  ${r.path}${r.indexing ? `   [${r.indexing}]` : ''}`);
      for (const f of r.failed) console.log(`         · ${f}`);
    }
    if (report.snapshotFile) console.log(`\n📸 snapshot escrito: ${report.snapshotFile}`);
    if (compare) {
      console.log(`\n⇄ comparación contra "${compare.name}" (${compare.createdAt.slice(0, 10)}):`);
      if (!compare.diffs.length) console.log('   sin diferencias: contratos e indexación intactos');
      for (const d of compare.diffs) console.log(`   ${d.level === 'FAIL' ? '✗' : '⚠'} ${d.path}: ${d.what}`);
      console.log(`   recomprobar: ${compare.recheck.day14} (día 14) y ${compare.recheck.day28} (día 28)`);
    }
    console.log(`\n${failures === 0 ? '✓ TODO PASA' : `✗ ${failures} fallo(s)`}${warnings ? ` · ${warnings} aviso(s)` : ''}\n`);
  }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('✗', e?.stack || e); process.exit(2); });
