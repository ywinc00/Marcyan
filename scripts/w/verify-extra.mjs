#!/usr/bin/env node
/**
 * verify-extra.mjs · Contratos que verify-landing-contracts NO cubre (rediseño WorkOS, §5 0.0 y §6.1)
 *
 * Corre sobre dist/ (tras `npm run build`) para las 48 URL de scripts/w/urls.json
 * (o las de --urls). Node puro, sin dependencias; para leer routes.ts usa el esbuild
 * que ya trae Vite (igual que el verificador de landings) y, si no está, salta esa
 * comprobación avisando.
 *
 * Por URL extrae:
 *   · número de <h1> y su texto (squash, etiquetas como espacios)
 *   · todos los bloques JSON-LD normalizados (claves ordenadas), como multiconjunto
 *   · canonical y hreflang (es / en / x-default)
 *   · lista de id, ids duplicados, lista de href="#…" y si su destino existe
 *   · href internos (/…) que no existen en dist/ (404)
 *   · data-track (cuántos de cada evento)
 *   · texto de FAQ (FAQPage del JSON-LD) y si está literal en el texto visible
 *   · trío de conversión (ctaband__act--form/wa/call con su data-track) y los tel: y wa.me
 *
 * Comprobaciones absolutas (fallan siempre): un solo <h1>; ids únicos; ningún href
 * interno a 404; cada href="#x" tiene su id en la página; canonical = sitio + ruta sin
 * barra; hreflang según routes.ts; FAQPage visible literal; en hubs de ciudad, trío 1/1/1.
 *
 * Modos:
 *   --snapshot <nombre>  escribe data/contract-snapshots/<nombre>.extra.json
 *   --compare <nombre>   compara contra ese snapshot. FALLA si: cambia el número o el
 *                        texto del <h1> (H1 congelados, §2.14); cambia cualquier bloque
 *                        JSON-LD (se compara sin orden: un bloque idéntico reubicado no
 *                        cuenta); cambia canonical o hreflang; desaparece un id que era
 *                        destino de un href="#…" en la base; desaparece un tipo de
 *                        data-track; cambia el texto de la FAQ; el trío 1 deja de ser 1;
 *                        cambian los tel: o wa.me. AVISA si se pierden otros id o cambia
 *                        el número de data-track.
 *   --urls /es,/en/houston   solo esas (también sin barra inicial, por Git Bash)
 *   --dist <dir>  carpeta de build (default dist)     --json  salida en una línea
 *
 * Exit: 0 PASA · 1 FALLA · 2 error de uso/entorno.
 */

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SITE = 'https://marcyanstudio.com';
const SNAP_DIR = path.join(REPO_ROOT, 'data', 'contract-snapshots');

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const has = (n) => argv.includes(n);
// Git Bash convierte "/es" en "C:/Program Files/Git/es": se deshace.
const normPath = (p) => { const s = ('/' + String(p || '').replace(/^[A-Za-z]:[\/]Program Files[\/]Git(?=[\/])/i, '')).replace(/^\/+/, '/').replace(/\/+$/, ''); return s === '' ? '/' : s; };
const DIST = path.resolve(REPO_ROOT, flag('--dist') || 'dist');
const ONLY = (flag('--urls') || '').split(',').map((s) => s.trim()).filter(Boolean).map(normPath);
const SNAPSHOT = flag('--snapshot');
const COMPARE = flag('--compare');
const JSON_OUT = has('--json');
const abs = (p) => (p === '/' ? `${SITE}/` : `${SITE}${p}`);

// ── Utilidades HTML ──────────────────────────────────────────────────────────
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => String(s)
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
  .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in ENT ? ENT[n.toLowerCase()] : m));
const squash = (s) => decode(String(s).replace(/<[^>]+>/g, ' ')).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
function stripHidden(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<template\b[\s\S]*?<\/template>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}
const visibleText = (html) => squash(stripHidden(html.replace(/^[\s\S]*?<body[^>]*>/i, '')));
function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z_:@][-a-zA-Z0-9_:.@]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) out[m[1].toLowerCase()] = decode(m[3] ?? m[4] ?? m[5] ?? '');
  return out;
}
const tags = (html, name) => Array.from(html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))).map((m) => attrs(m[0]));
// Ids que los componentes generan con Math.random() en cada build (Hero, LandingHero, logos):
// se reescriben a un nombre fijo para que dos builds iguales den la misma huella.
const uidNorm = (id) => id.replace(/^(hero|lh)[a-z0-9]{5}(?=-)/, '$1UID').replace(/^(mk|stk|wm)[a-z0-9]{6}(?=-)/, '$1UID');
const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys) : (v && typeof v === 'object') ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v;
function jsonLd(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { out.push(JSON.stringify(sortKeys(JSON.parse(m[1])))); } catch { out.push(`__INVALID__${m[1].slice(0, 80)}`); }
  }
  return out.sort();
}
function distFileFor(href) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return path.join(DIST, 'index.html');
  const parts = decodeURIComponent(clean).split('/').filter(Boolean);
  const direct = path.join(DIST, ...parts);
  if (/\.[a-z0-9]{2,5}$/i.test(clean)) return direct;
  return path.join(direct, 'index.html');
}

// ── routes.ts (opcional, vía esbuild de Vite) ────────────────────────────────
async function loadMirror() {
  try {
    const esbuild = await import('esbuild');
    const out = await esbuild.build({
      stdin: { contents: "export { mirrorPath } from './src/i18n/routes.ts';", resolveDir: REPO_ROOT, loader: 'ts', sourcefile: 'vx-entry.ts' },
      bundle: true, format: 'esm', platform: 'node', target: 'node20', write: false, logLevel: 'silent',
    });
    const tmp = path.join(os.tmpdir(), `marcyan-vx-${process.pid}-${Date.now()}.mjs`);
    await fs.writeFile(tmp, out.outputFiles[0].text);
    try { return (await import(pathToFileURL(tmp).href)).mirrorPath; } finally { fs.unlink(tmp).catch(() => {}); }
  } catch { return null; }
}

// ── Hechos y comprobaciones por URL ──────────────────────────────────────────
async function checkUrl(u, mirrorPath) {
  const p = normPath(u.path);
  const checks = [];
  const ok = (name, pass, detail) => checks.push({ name, pass: !!pass, detail });
  const facts = { path: p, grupo: u.grupo };
  let html;
  try { html = await fs.readFile(distFileFor(p), 'utf8'); }
  catch { ok('html', false, `no existe en ${path.relative(REPO_ROOT, DIST)} (¿falta npm run build?)`); return { facts, checks }; }
  const body = html.replace(/^[\s\S]*?<body[^>]*>/i, '');
  const bodyNoScript = stripHidden(body);

  // h1
  const h1s = Array.from(html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)).map((m) => squash(m[1]));
  facts.h1Count = h1s.length; facts.h1 = h1s[0] ?? null;
  ok('h1', h1s.length === 1, `${h1s.length} <h1>`);

  // JSON-LD
  facts.jsonLd = jsonLd(html);
  ok('jsonld-parse', !facts.jsonLd.some((b) => b.startsWith('__INVALID__')), `${facts.jsonLd.length} bloques`);

  // canonical + hreflang
  const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] || '';
  const links = tags(head, 'link');
  facts.canonical = links.find((l) => l.rel === 'canonical')?.href ?? null;
  ok('canonical', facts.canonical === abs(p), facts.canonical ?? 'sin canonical');
  facts.hreflang = {};
  for (const l of links) if (l.rel === 'alternate' && l.hreflang) facts.hreflang[l.hreflang] = l.href;
  if (mirrorPath) {
    const mirror = mirrorPath(p, u.lang);
    const exp = {};
    if (u.lang === 'es') { exp.es = abs(p); if (mirror) exp.en = abs(mirror); exp['x-default'] = abs(p); }
    else { exp.en = abs(p); if (mirror) { exp.es = abs(mirror); exp['x-default'] = abs(mirror); } else exp['x-default'] = abs(p); }
    const keys = new Set([...Object.keys(exp), ...Object.keys(facts.hreflang)]);
    const bad = [...keys].filter((k) => exp[k] !== facts.hreflang[k]);
    ok('hreflang-routes', bad.length === 0, bad.length ? bad.map((k) => `${k}: ${facts.hreflang[k] ?? '∅'} (esperado ${exp[k] ?? '∅'})`).join(' · ') : Object.entries(facts.hreflang).map(([k, v]) => `${k}→${v.replace(SITE, '')}`).join(' '));
  }

  // ids y anclas (en el cuerpo sin scripts/estilos/plantillas)
  const ids = Array.from(bodyNoScript.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)).map((m) => uidNorm(decode(m[1])));
  const count = ids.reduce((a, i) => (a[i] = (a[i] || 0) + 1, a), {});
  facts.ids = [...new Set(ids)].sort();
  const dup = Object.keys(count).filter((k) => count[k] > 1);
  ok('ids-unicos', dup.length === 0, dup.length ? `duplicados: ${dup.join(', ')}` : `${facts.ids.length} id`);
  const anchors = tags(bodyNoScript, 'a').concat(tags(bodyNoScript, 'area'));
  const hashHrefs = [...new Set(anchors.map((a) => a.href).filter((h) => h && /^#./.test(h)).map((h) => uidNorm(decodeURIComponent(h.slice(1)))))].sort();
  facts.hashHrefs = hashHrefs;
  // #top lo resuelve el navegador sin id (HTML: "top" = principio del documento)
  const brokenHash = hashHrefs.filter((h) => h.toLowerCase() !== 'top' && !facts.ids.includes(h));
  ok('anclas-existen', brokenHash.length === 0, brokenHash.length ? `sin destino: #${brokenHash.join(', #')}` : `${hashHrefs.length} anclas`);

  // href internos 404 (también los "/ruta#ancla" a esta misma página)
  const internal = [...new Set(anchors.map((a) => a.href).filter((h) => h && /^\/(?!\/)/.test(h)))];
  const dead = internal.filter((h) => !existsSync(distFileFor(h)));
  facts.internalLinks = internal.length; facts.dead = dead.sort();
  ok('href-internos', dead.length === 0, dead.length ? `404 en dist: ${dead.join(', ')}` : `${internal.length} enlaces internos`);

  // data-track (en todo el cuerpo; los scripts inline no cuentan)
  facts.tracks = {};
  for (const m of bodyNoScript.matchAll(/\sdata-track\s*=\s*["']([^"']+)["']/gi)) facts.tracks[m[1]] = (facts.tracks[m[1]] || 0) + 1;

  // FAQ
  const faq = facts.jsonLd.map((b) => JSON.parse(b.startsWith('__') ? '{}' : b)).find((b) => b['@type'] === 'FAQPage');
  facts.faq = faq ? (faq.mainEntity || []).map((e) => [squash(e.name || ''), squash(e.acceptedAnswer?.text || '')]) : null;
  if (facts.faq) {
    const text = visibleText(html);
    const miss = facts.faq.filter(([q, a]) => !text.includes(q) || !text.includes(a)).map(([q]) => q.slice(0, 40));
    ok('faq-visible', miss.length === 0, miss.length ? `no visibles: ${miss.join(' | ')}` : `${facts.faq.length} Q/A visibles`);
  }

  // trío + tel/wa
  const trio = { form: ['ctaband__act--form', 'proposal_requested'], wa: ['ctaband__act--wa', 'whatsapp_clicked'], call: ['ctaband__act--call', 'call_clicked'] };
  facts.trio = {};
  for (const [k, [cls, ev]] of Object.entries(trio)) facts.trio[k] = anchors.filter((a) => (a.class || '').split(/\s+/).includes(cls) && a['data-track'] === ev).length;
  if (u.grupo === 'hub-ciudad') for (const k of Object.keys(trio)) ok(`trio-${k}`, facts.trio[k] === 1, `${facts.trio[k]}`);
  facts.tel = [...new Set(anchors.map((a) => a.href).filter((h) => h && /^tel:/i.test(h)))].sort();
  facts.wa = [...new Set(anchors.map((a) => a.href).filter((h) => h && /wa\.me\//i.test(h)).map((h) => h.split('?')[0]))].sort();

  return { facts, checks };
}

// ── Comparación ──────────────────────────────────────────────────────────────
function compareFacts(before, now, push) {
  const fail = (w) => push('FAIL', w), warn = (w) => push('WARN', w);
  if (before.h1Count !== now.h1Count) fail(`número de <h1>: ${before.h1Count} → ${now.h1Count}`);
  if (before.h1 !== now.h1) fail(`texto del <h1> cambió: "${before.h1}" → "${now.h1}"`);
  const bj = before.jsonLd || [], nj = now.jsonLd || [];
  const gone = bj.filter((b) => !nj.includes(b)), added = nj.filter((b) => !bj.includes(b));
  if (gone.length || added.length) fail(`JSON-LD distinto: ${gone.length} bloque(s) quitado(s)/cambiado(s), ${added.length} nuevo(s) · ${gone.map((b) => b.slice(0, 90)).join(' ‖ ')}`);
  if (before.canonical !== now.canonical) fail(`canonical: ${before.canonical} → ${now.canonical}`);
  for (const k of new Set([...Object.keys(before.hreflang || {}), ...Object.keys(now.hreflang || {})]))
    if (before.hreflang?.[k] !== now.hreflang?.[k]) fail(`hreflang ${k}: ${before.hreflang?.[k]} → ${now.hreflang?.[k]}`);
  const targeted = new Set((before.hashHrefs || []).filter((h) => (before.ids || []).includes(h)));
  const lostIds = (before.ids || []).filter((i) => !(now.ids || []).includes(i));
  const lostTargets = lostIds.filter((i) => targeted.has(i));
  if (lostTargets.length) fail(`desaparecen anclas usadas: #${lostTargets.join(', #')}`);
  const lostOther = lostIds.filter((i) => !targeted.has(i));
  if (lostOther.length) warn(`ids que ya no están: ${lostOther.join(', ')}`);
  for (const t of Object.keys(before.tracks || {})) {
    if (!(now.tracks || {})[t]) fail(`data-track "${t}" desaparece`);
    else if (now.tracks[t] !== before.tracks[t]) warn(`data-track "${t}": ${before.tracks[t]} → ${now.tracks[t]}`);
  }
  if (JSON.stringify(before.faq) !== JSON.stringify(now.faq)) fail('el texto de la FAQ cambió');
  for (const k of Object.keys(before.trio || {})) if (before.trio[k] === 1 && now.trio?.[k] !== 1) fail(`trío ${k}: 1 → ${now.trio?.[k]}`);
  if (JSON.stringify(before.tel) !== JSON.stringify(now.tel)) fail(`tel: ${before.tel} → ${now.tel}`);
  if (JSON.stringify(before.wa) !== JSON.stringify(now.wa)) fail(`wa.me: ${before.wa} → ${now.wa}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const list = JSON.parse(await fs.readFile(path.join(__dirname, 'urls.json'), 'utf8')).urls;
  const scope = ONLY.length ? list.filter((u) => ONLY.includes(normPath(u.path))) : list;
  if (ONLY.length) { const unk = ONLY.filter((o) => !list.some((u) => normPath(u.path) === o)); if (unk.length) { console.error(`✗ rutas fuera de urls.json: ${unk.join(', ')}`); process.exit(2); } }
  if (!scope.length) { console.error('✗ alcance vacío'); process.exit(2); }
  const mirrorPath = await loadMirror();

  const results = [];
  for (const u of scope) results.push(await checkUrl(u, mirrorPath));
  let failures = 0, warnings = mirrorPath ? 0 : 1;
  const report = results.map((r) => { const f = r.checks.filter((c) => !c.pass); failures += f.length; return { path: r.facts.path, pass: !f.length, failed: f.map((c) => `${c.name}: ${c.detail}`) }; });

  let snapshotFile = null, compare = null;
  if (SNAPSHOT) {
    await fs.mkdir(SNAP_DIR, { recursive: true });
    const file = path.join(SNAP_DIR, `${SNAPSHOT}.extra.json`);
    const urls = Object.fromEntries(results.map((r) => [r.facts.path, r.facts]));
    await fs.writeFile(file, JSON.stringify({ name: SNAPSHOT, createdAt: new Date().toISOString(), tool: 'scripts/w/verify-extra.mjs', urls }, null, 1) + '\n');
    snapshotFile = path.relative(REPO_ROOT, file);
  }
  if (COMPARE) {
    const file = path.join(SNAP_DIR, `${COMPARE}.extra.json`);
    let snap; try { snap = JSON.parse(await fs.readFile(file, 'utf8')); } catch { console.error(`✗ no existe ${path.relative(REPO_ROOT, file)}`); process.exit(2); }
    compare = { name: COMPARE, createdAt: snap.createdAt, diffs: [] };
    for (const r of results) {
      const before = snap.urls?.[r.facts.path];
      const push = (level, what) => { compare.diffs.push({ path: r.facts.path, level, what }); if (level === 'FAIL') failures++; else warnings++; };
      if (!before) { push('WARN', 'URL no estaba en el snapshot'); continue; }
      compareFacts(before, r.facts, push);
    }
  }

  const summary = { scope: results.length, failures, warnings, pass: failures === 0, report, snapshotFile, compare };
  if (JSON_OUT) console.log(JSON.stringify(summary));
  else {
    console.log(`\nverify-extra · ${results.length} URL(s) · dist=${path.relative(REPO_ROOT, DIST)}${mirrorPath ? '' : ' · ⚠ sin esbuild: hreflang no se contrasta con routes.ts'}\n`);
    for (const r of report) { console.log(`${r.pass ? '✓ PASA ' : '✗ FALLA'}  ${r.path}`); for (const f of r.failed) console.log(`         · ${f}`); }
    if (snapshotFile) console.log(`\n📸 snapshot escrito: ${snapshotFile}`);
    if (compare) {
      console.log(`\n⇄ comparación contra "${compare.name}" (${compare.createdAt.slice(0, 10)}):`);
      if (!compare.diffs.length) console.log('   sin diferencias');
      for (const d of compare.diffs) console.log(`   ${d.level === 'FAIL' ? '✗' : '⚠'} ${d.path}: ${d.what}`);
    }
    console.log(`\n${failures === 0 ? '✓ TODO PASA' : `✗ ${failures} fallo(s)`}${warnings ? ` · ${warnings} aviso(s)` : ''}\n`);
  }
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error('✗', e?.stack || e); process.exit(2); });
