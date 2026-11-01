#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
//  scripts/evals/run.mjs — Ejecutor genérico de pruebas de comportamiento (P1)
//
//    node scripts/evals/run.mjs <suite> --url <vista previa> [--share <token>]
//         [--trials 2] [--delay 5500] [--only id1,id2] [--save-baseline]
//
//  <suite> = archivo scripts/evals/<suite>-casos.mjs (meta + casos). Hoy:
//  "marcy". Para el chatbot de un cliente: copiar el archivo de casos y
//  cambiar `meta` (endpoint, origen, cómo se pide un turno y cómo se lee).
//
//  Corre contra una VISTA PREVIA (servidor y clave reales, frenos y coste
//  aparte de producción). Nunca contra producción: --url de producción se
//  rechaza. Cada caso se repite --trials veces (la IA no es determinista) con
//  una conversación nueva cada vez, y con pausa entre turnos para no chocar
//  con el freno por conexión (12 por minuto).
//
//  PUERTA (código de salida 1 si no pasa):
//    · la regla de todo caso crítico (su corrector, no el idioma) al 100 %
//      en todas sus repeticiones;
//    · con línea base: el total no baja más de 5 puntos y ningún caso cae
//      50 puntos o más.
//  Resultados: data/evals/<suite>/<fecha>.json · línea base:
//  scripts/evals/<suite>.baseline.json (se rehace con --save-baseline).
// ════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { grade } from './graders.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const argv = process.argv.slice(2);
const suite = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'marcy';
const opt = (name, def) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : def; };
const flag = (name) => argv.includes('--' + name);

const base = String(opt('url', '')).replace(/\/+$/, '');
const share = opt('share', process.env.VERCEL_SHARE || '');
const trials = Math.max(1, Number(opt('trials', 2)));
const delay = Math.max(0, Number(opt('delay', 5500)));
const only = opt('only', '') ? new Set(opt('only').split(',')) : null;

const PRODUCTION = [/^https?:\/\/(www\.)?marcyanstudio\.com/i, /^https?:\/\/marcyan\.vercel\.app/i, /^https?:\/\/marcyan-yan8\.vercel\.app/i];
if (!base) { console.error('Falta --url (la vista previa de la rama).'); process.exit(2); }
if (PRODUCTION.some((rx) => rx.test(base))) { console.error('Las pruebas no se corren contra producción: usa la vista previa de la rama.'); process.exit(2); }

const { meta, casos } = await import(new URL(`./${suite}-casos.mjs`, import.meta.url));
const lista = casos.filter((c) => !only || only.has(c.id));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pase de Vercel para vistas previas protegidas: visitar ?_vercel_share=… deja
// una cookie; se reenvía en cada petición.
async function shareCookie() {
  if (!share) return '';
  let url = `${base}/?_vercel_share=${encodeURIComponent(share)}`;
  const jar = [];
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { redirect: 'manual' });
    const set = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
    for (const c of set) jar.push(c.split(';')[0]);
    const loc = r.headers.get('location');
    if (!loc || r.status < 300 || r.status >= 400) break;
    url = new URL(loc, url).href;
  }
  return jar.join('; ');
}

async function turn(cookie, caso, sessionId) {
  const res = await fetch(base + meta.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: meta.origin, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(meta.body({ messages: caso.messages, lang: caso.lang, sessionId })),
  });
  let json = null;
  try { json = await res.json(); } catch { /* respuesta no JSON */ }
  return { status: res.status, ...meta.read(json) };
}

const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const cookie = await shareCookie();
const results = [];
let first = true;
console.log(`Pruebas de "${suite}": ${lista.length} casos × ${trials} contra ${base}`);
for (const caso of lista) {
  const intentos = [];
  for (let t = 0; t < trials; t++) {
    if (!first) await sleep(delay);
    first = false;
    let res;
    try { res = await turn(cookie, caso, `eval-${caso.id}-${t}-${runId}`.slice(0, 64)); }
    catch (e) { res = { status: 0, reply: null, action: null, error: e && e.message }; }
    const g = grade(caso, res);
    intentos.push({ ...g, status: res.status, reply: res.reply, action: res.action });
  }
  const ok = intentos.filter((x) => x.pass).length;
  const rate = ok / trials;
  const criticalRate = intentos.filter((x) => x.criticalPass).length / trials;
  results.push({ id: caso.id, titulo: caso.titulo, critico: !!caso.critico, rate, criticalRate, intentos });
  const marca = rate === 1 ? '✓' : rate === 0 ? '✗' : '~';
  const motivos = [...new Set(intentos.flatMap((x) => x.reasons))];
  console.log(`  ${marca} ${caso.id}${caso.critico ? ' [crítico]' : ''}  ${ok}/${trials}${motivos.length ? '  · ' + motivos.join(' | ') : ''}`);
}

const total = results.reduce((s, r) => s + r.rate, 0) / (results.length || 1);
const estilo = {};
for (const r of results) for (const x of r.intentos) for (const s of x.style) estilo[s] = (estilo[s] || 0) + 1;
const turnos = results.length * trials;

// ── Puerta ──────────────────────────────────────────────────────
const fallos = [];
for (const r of results) if (r.critico && r.criticalRate < 1) fallos.push(`crítico ${r.id} al ${Math.round(r.criticalRate * 100)} %`);
// --baseline solo lo usa test:evals (para no tocar la línea base real).
const baselinePath = opt('baseline', '') || path.join(ROOT, 'scripts', 'evals', `${suite}.baseline.json`);
let baseline = null;
if (existsSync(baselinePath)) baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
if (baseline && !only) {
  if (total < baseline.total - 0.05) fallos.push(`total ${Math.round(total * 100)} % frente a ${Math.round(baseline.total * 100)} % de la línea base`);
  for (const r of results) {
    const b = baseline.casos[r.id];
    if (typeof b === 'number' && r.rate <= b - 0.5) fallos.push(`${r.id} cae de ${Math.round(b * 100)} % a ${Math.round(r.rate * 100)} %`);
  }
}

console.log(`\nTotal: ${Math.round(total * 100)} % de aciertos en ${turnos} turnos`
  + (baseline ? ` (línea base ${Math.round(baseline.total * 100)} %, ${baseline.fecha})` : ' (sin línea base)'));
if (Object.keys(estilo).length) console.log('Estilo (no bloquea): ' + Object.entries(estilo).map(([k, v]) => `${k} en ${v} de ${turnos} respuestas`).join(' · '));

// --out solo lo usa test:evals (para no mezclar sus pasadas falsas con las reales).
const outDir = opt('out', '') || path.join(ROOT, 'data', 'evals', suite);
mkdirSync(outDir, { recursive: true });
const out = { suite, fecha: runId, url: base, trials, total, estilo, fallos, casos: results };
writeFileSync(path.join(outDir, `${runId}.json`), JSON.stringify(out, null, 2));

// process.exitCode en vez de process.exit(): en Windows, salir de golpe con
// conexiones de fetch cerrándose revienta libuv (UV_HANDLE_CLOSING).
if (flag('save-baseline') && only) {
  console.error('La línea base se guarda solo con la batería completa (sin --only).');
  process.exitCode = 2;
} else if (flag('save-baseline')) {
  writeFileSync(baselinePath, JSON.stringify({ suite, fecha: runId, trials, total, casos: Object.fromEntries(results.map((r) => [r.id, r.rate])) }, null, 2) + '\n');
  console.log('Línea base guardada en ' + path.relative(ROOT, baselinePath));
}

if (fallos.length) {
  console.log('\nPUERTA: NO PASA\n - ' + fallos.join('\n - '));
  if (!process.exitCode) process.exitCode = 1;
} else {
  console.log('\nPUERTA: PASA');
}
