#!/usr/bin/env node
/**
 * Reporte SEO mensual de Marcyan — motor de datos.
 *
 * Réplica del script que ya corre para MJA y TRR (scripts/track-rankings.mjs en
 * esos repos), adaptado a Marcyan y ampliado con lo que solo nosotros podemos
 * medir: el embudo de conversión first-party (Neon) y la lectura de posición de
 * mercado. Lo lanza la rutina `marcyan-monthly-seo-report` el día 4 de cada mes a
 * las 08:12 local: Search Console publica con 2 o 3 días de retraso, así que el día 4
 * el mes anterior ya está completo. (El cron anterior, primer lunes con rango 1-7,
 * disparaba cada día del 1 al 7 y produjo dos reportes de agosto 2026.)
 *
 * Qué hace: baja Search Analytics del mes objetivo, lo cruza con el estado de
 * indexación del sweep diario y con los eventos/leads de la base, escribe
 * `docs/reports/YYYY-MM.md` y actualiza los CSV históricos de `data/`.
 *
 * Cero dependencias externas para la parte GSC (fetch nativo). La sección de
 * embudo importa @vercel/postgres de forma perezosa y se omite sola si no hay
 * base de datos disponible: el reporte nunca falla por eso.
 *
 * Auth: OAuth 2.0 con refresh token de una cuenta con permiso sobre la
 * propiedad (no service account; GSC tiene un bug viejo con service accounts en
 * propiedades de Dominio). Mismo OAuth que MJA/TRR.
 *
 * Env requerido (en .env.local, cargado con --env-file=.env.local):
 *   GSC_OAUTH_CLIENT_ID
 *   GSC_OAUTH_CLIENT_SECRET
 *   GSC_OAUTH_REFRESH_TOKEN
 * Env opcional:
 *   DATABASE_URL / POSTGRES_URL  → habilita la sección de embudo
 *
 * Flags:
 *   --month YYYY-MM   Mes objetivo (por defecto: el último mes COMPLETO)
 *   --dry-run         No escribe nada, imprime el reporte por stdout
 *   --no-db           Salta la sección de embudo aunque haya base
 *
 * Códigos de salida: 0 ok, 1 error de uso/env, 2 auth, 3 API, 4 escritura.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SC_API = 'https://www.googleapis.com/webmasters/v3';
const SITE_HOST = 'https://marcyanstudio.com';

const die = (code, msg) => { console.error(`✗ ${msg}`); process.exit(code); };

// ─── flags ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const noDb = args.includes('--no-db');
const monthArg = (() => { const i = args.indexOf('--month'); return i >= 0 ? args[i + 1] : null; })();

// ─── ventana temporal ───────────────────────────────────────────────────
/* GSC publica con ~2 días de retraso, así que el "hoy" útil es anteayer.
   Para un mes en curso recortamos el final a esa fecha y marcamos el reporte
   como parcial; para un mes cerrado el recorte no toca nada. */
const GSC_LAG_DAYS = 2;

function ymd(d) { return d.toISOString().split('T')[0]; }

function lastFullMonth(now = new Date()) {
  const d = new Date(now);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function monthBounds(year, month, now = new Date()) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));
  const lastUseful = new Date(now);
  lastUseful.setUTCDate(lastUseful.getUTCDate() - GSC_LAG_DAYS);
  const partial = monthEnd > lastUseful;
  const end = partial ? lastUseful : monthEnd;
  return {
    startDate: ymd(start),
    endDate: ymd(end),
    monthEndDate: ymd(monthEnd),
    partial,
    tag: `${year}-${String(month).padStart(2, '0')}`,
  };
}

let target;
if (monthArg) {
  const [y, m] = String(monthArg).split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) die(1, `--month inválido: ${monthArg}. Usa YYYY-MM.`);
  target = monthBounds(y, m);
} else {
  const { year, month } = lastFullMonth();
  target = monthBounds(year, month);
}
if (target.endDate < target.startDate) {
  die(1, `El mes ${target.tag} todavía no tiene ningún día publicado en GSC (hay ~${GSC_LAG_DAYS} días de retraso). Espera o usa --month con un mes anterior.`);
}

// ─── auth ───────────────────────────────────────────────────────────────
async function getAccessToken({ clientId, clientSecret, refreshToken }) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: refreshToken, grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    die(2, `Falló el refresh del token: ${JSON.stringify(data)}. Causa habitual: la app OAuth volvió a estado "Testing", lo que hace que Google caduque el refresh token cada 7 días. Arreglo: publicarla en https://console.cloud.google.com/auth/audience y volver a generar el token.`);
  }
  return data.access_token;
}

// ─── API ────────────────────────────────────────────────────────────────
async function gscQuery(token, siteUrl, body) {
  const url = `${SC_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) die(3, `API GSC: ${data.error.code} ${data.error.message}`);
  return data.rows ?? [];
}

// ─── normalización de rutas ─────────────────────────────────────────────
/* GSC devuelve como filas DISTINTAS la misma página con y sin barra final, y
   también las variantes con UTM. Sin normalizar, /es/miami/ecommerce aparece
   dos veces con la mitad de las impresiones cada una y la tabla miente.
   Devuelve siempre un path que empieza por "/" y no acaba en "/".

   ESTE ES EL ÚNICO NORMALIZADOR DEL SCRIPT. La tabla de páginas y la de
   cohortes tienen que colapsar exactamente igual: con dos normalizadores
   distintos, las dos tablas del mismo reporte dejan de cuadrar.

   Acepta URL absoluta CON protocolo (apex o www, http o https) o path que
   empiece por "/". Una URL sin protocolo o protocol relative no se defiende a
   propósito: GSC siempre devuelve absolutas con protocolo. */
function normalizePath(url) {
  let p = String(url ?? '').trim().toLowerCase();
  p = p.replace(/^https?:\/\/[^/]+/i, '');
  p = p.split(/[?#]/)[0];
  p = p.replace(/\/{2,}/g, '/');
  if (p !== '/') p = p.replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

/* Agrega filas de GSC por path canónico. Suma impresiones y clicks, promedia
   la posición ponderando por impresiones (una posición 3 con 1 impresión no
   pesa igual que una posición 40 con 200) y recalcula el CTR sobre el total. */
function aggregateByPath(rows) {
  const byPath = new Map();
  let collapsed = 0;
  for (const r of rows) {
    const key = normalizePath(r.keys[0]);
    if (!byPath.has(key)) byPath.set(key, { page: key, impressions: 0, clicks: 0, posWeighted: 0, variants: new Set() });
    else collapsed++;
    const e = byPath.get(key);
    e.impressions += r.impressions;
    e.clicks += r.clicks;
    e.posWeighted += r.position * r.impressions;
    e.variants.add(r.keys[0].replace(SITE_HOST, '') || '/');
  }
  const out = [...byPath.values()].map(e => ({
    page: e.page,
    impressions: e.impressions,
    clicks: e.clicks,
    ctr: e.impressions ? e.clicks / e.impressions : 0,
    position: e.impressions ? e.posWeighted / e.impressions : 0,
    variants: [...e.variants],
  }));
  out.sort((a, b) => b.impressions - a.impressions);
  return { pages: out, collapsed };
}

// ─── CSV ────────────────────────────────────────────────────────────────
function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function parseCsvLine(line) {
  const out = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuote = false;
      else cur += c;
    } else if (c === ',') { out.push(cur); cur = ''; }
    else if (c === '"' && cur === '') inQuote = true;
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function loadCsvRows(file) {
  try {
    const text = await fs.readFile(file, 'utf8');
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return [];
    const header = lines[0].split(',');
    return lines.slice(1).map(line => {
      const cells = parseCsvLine(line);
      const obj = {};
      header.forEach((h, i) => obj[h] = cells[i]);
      return obj;
    });
  } catch { return []; }
}

/* Escribe las filas del mes SUSTITUYENDO las que ya hubiera de ese mismo mes.
   El script de MJA solo hace append, así que re-ejecutarlo duplica el mes en
   el CSV. Aquí sí se puede re-ejecutar (lo hacemos: reportes parciales a
   mitad de mes que luego se rehacen con el mes cerrado). */
async function upsertCsvMonth(file, header, monthTag, rows) {
  const prior = await loadCsvRows(file);
  const kept = prior.filter(r => r.month !== monthTag);
  const lines = [header.join(',')];
  for (const r of kept) lines.push(header.map(h => csvEscape(r[h])).join(','));
  for (const r of rows) lines.push(r.map(csvEscape).join(','));
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, lines.join('\n') + '\n', 'utf8');
  return { replaced: prior.length - kept.length, total: kept.length + rows.length };
}

// ─── carga de config y estado ───────────────────────────────────────────
async function loadConfig() {
  const file = path.join(__dirname, 'tracked-keywords.json');
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (e) {
    die(1, `No pude leer scripts/tracked-keywords.json: ${e.message}`);
  }
}

async function loadIndexingStatus() {
  try {
    return JSON.parse(await fs.readFile(path.join(REPO_ROOT, 'data', 'indexing-status.json'), 'utf8'));
  } catch {
    return null; // best-effort: las secciones de indexación se degradan, no rompen
  }
}

// ─── formateo ───────────────────────────────────────────────────────────
function fmtPos(p) {
  if (p == null || p === '' || isNaN(Number(p))) return 'sin datos';
  return Number(p).toFixed(1);
}

function trendArrow(prev, curr) {
  if (prev == null || prev === '' || isNaN(Number(prev)) || Number(prev) <= 0) return '🆕';
  const a = Number(prev), b = Number(curr);
  if (!isFinite(a) || !isFinite(b) || b <= 0) return '·';
  const delta = a - b; // en GSC menos es mejor: delta positivo = subimos
  if (delta >= 3) return `🟢 +${delta.toFixed(1)}`;
  if (delta <= -3) return `🔴 ${delta.toFixed(1)}`;
  return '·';
}

/* Etiqueta de confianza por volumen. Evita decidir sobre ruido: una fila con
   1 impresión y 1 click no es "CTR 100%", es una anécdota. */
function confidence(impressions) {
  const n = Number(impressions) || 0;
  if (n >= 100) return 'alta';
  if (n >= 20) return 'media';
  if (n > 0) return 'baja';
  return '—';
}

/* Con base previa cercana a cero el porcentaje es correcto pero engañoso
   (de 6 a 2.270 impresiones son "37.733%"). Bajo 20 de base mostramos el
   cambio absoluto y ningún porcentaje. */
function fmtDelta(curr, prev, unit = '') {
  if (prev == null) return 'sin baseline';
  const d = curr - prev;
  const arrow = d > 0 ? '↑' : d < 0 ? '↓' : '·';
  if (prev < 20) {
    if (d === 0) return '· sin cambio';
    return `${arrow} de ${prev.toLocaleString('es')} a ${curr.toLocaleString('es')}${unit}`;
  }
  const pct = ((d / prev) * 100).toFixed(0);
  return `${arrow} ${d > 0 ? '+' : ''}${d.toLocaleString('es')}${unit} (${pct}%)`;
}

const pct = (v, dec = 1) => `${(Number(v) * 100).toFixed(dec)}%`;

// ═══════════════════════════════════════════════════════════════════════
// A TIRO DE PÁGINA 1 (striking distance)
// ═══════════════════════════════════════════════════════════════════════
/* La pregunta del dueño es "¿a qué landing le dedico más atención?". La
   respuesta honesta no es "la que más impresiones tiene" sino la que está
   cerca de página 1 Y ya demuestra demanda. Método estándar: quedarse con las
   consultas en posición 4-20 (ya rankean, todavía no cobran) y ordenar por
   impresiones. Todo sale de GSC, nada estimado.

   Las bandas se eligen así:
   · 4-10  = ya en página 1 pero bajo el pliegue, ganar 3 puestos multiplica CTR
   · 11-20 = página 2, el clásico "un empujón y entra"
   Por encima de 20 no es un empujón, es trabajo de fondo, y se trata aparte. */
/* IMPORTANTE: las métricas salen de queryRows (dimensión consulta sola), no de
   queryPageRows. La vista consulta+página cuenta una impresión por cada URL
   nuestra que aparece en la misma búsqueda, así que infla las impresiones y
   desplaza la posición ponderada. Con la vista inflada, "web para vender en
   miami" salía en 24.3 aquí y en 19.3 en la sección de mercado: dos números
   distintos para la misma consulta dentro del mismo reporte. queryPageRows se
   usa SOLO para saber qué página rankea. */
function buildStrikingDistance(queryRows, queryPageRows, { minImpressions = 3, limit = 15 } = {}) {
  const topPageByQuery = new Map();
  for (const r of queryPageRows) {
    const q = r.keys[0];
    const cur = topPageByQuery.get(q);
    if (!cur || r.impressions > cur.impressions) {
      topPageByQuery.set(q, { page: normalizePath(r.keys[1]), impressions: r.impressions });
    }
  }
  const rows = queryRows.map(r => {
    const position = r.position ?? 0;
    return {
      query: r.keys[0],
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.impressions ? r.clicks / r.impressions : 0,
      position,
      topPage: topPageByQuery.get(r.keys[0])?.page ?? '—',
      band: position < 4 ? 'top3' : position <= 10 ? 'p1-bajo' : position <= 20 ? 'p2' : 'fondo',
    };
  });
  const candidates = rows
    .filter(r => r.impressions >= minImpressions && r.position >= 4 && r.position <= 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, limit);
  return { candidates, all: rows };
}

function buildStrikingSection({ candidates, all }, minImpressions) {
  const lines = [];
  lines.push(`## 🎯 A tiro de página 1\n`);
  lines.push(`Consultas que YA rankean entre la posición 4 y la 20 con al menos ${minImpressions} impresiones. Son las que menos trabajo necesitan para empezar a traer clicks: la demanda ya está demostrada y la distancia es corta. Esta tabla es la respuesta a "¿a qué página le dedico el mes que viene?".\n`);
  if (candidates.length === 0) {
    const cerca = all.filter(r => r.position >= 4 && r.position <= 20).length;
    lines.push(`> Ninguna consulta cumple el umbral este período. Hay ${cerca} consultas entre la posición 4 y la 20, pero todas por debajo de ${minImpressions} impresiones: todavía es ruido, no señal. Volver a mirar cuando el volumen suba.\n`);
    return lines;
  }
  lines.push(`| Consulta | Posición | Impresiones | Clicks | Página que rankea | Banda |`);
  lines.push(`|---|---|---|---|---|---|`);
  const bandLabel = { 'p1-bajo': '🟢 página 1, bajo el pliegue', p2: '🟡 página 2' };
  for (const r of candidates) {
    lines.push(['', r.query, r.position.toFixed(1), r.impressions, r.clicks, `\`${r.topPage}\``, bandLabel[r.band] ?? r.band, ''].join('|'));
  }
  lines.push('');
  lines.push(`> **Cómo leerla:** las 🟢 necesitan mejor título y meta descripción, más entidad en el H1 y enlaces internos. Las 🟡 necesitan además contenido de fondo, la página todavía no convence a Google de subirla. Las consultas en posición 1 a 3 no aparecen aquí porque ya están ganadas, y las de posición 20+ tampoco porque no son un empujón sino un proyecto.\n`);
  return lines;
}

// ═══════════════════════════════════════════════════════════════════════
// INVENTARIO COMPLETO: TODAS LAS PÁGINAS Y TODAS LAS CONSULTAS
// ═══════════════════════════════════════════════════════════════════════
/* Sin tope. Un top 25 esconde justo lo que hay que ver: las páginas que están
   dentro del índice y no reciben ni una impresión. Esas filas en cero son el
   dato, no el relleno. */
function buildAllPagesSection({ pageRows, indexingUrls, lastFullCheck }) {
  const metrics = new Map(pageRows.map(p => [p.page, p]));
  const filas = [];
  const seen = new Set();

  for (const [url, info] of Object.entries(indexingUrls ?? {})) {
    const p = normalizePath(url);
    seen.add(p);
    const m = metrics.get(p);
    const { cohort, lang } = classifyCohort(p);
    filas.push({
      page: p,
      cohorte: COHORT_LABELS[cohort] ?? cohort,
      lang: lang.toUpperCase(),
      estado: coverageLabel(info?.coverageState || 'Sin estado registrado'),
      enSitemap: true,
      impressions: m?.impressions ?? 0,
      clicks: m?.clicks ?? 0,
      ctr: m?.ctr ?? 0,
      position: m?.position ?? null,
    });
  }
  /* Páginas con impresiones que NO están en el sitemap vivo: URLs viejas,
     variantes o rutas retiradas. Google las sigue mostrando y conviene verlas. */
  const fuera = [];
  for (const p of pageRows) {
    if (seen.has(p.page)) continue;
    const { cohort, lang } = classifyCohort(p.page);
    fuera.push({
      page: p.page,
      cohorte: COHORT_LABELS[cohort] ?? cohort,
      lang: lang.toUpperCase(),
      estado: 'fuera del sitemap',
      enSitemap: false,
      impressions: p.impressions, clicks: p.clicks, ctr: p.ctr, position: p.position,
    });
  }

  const orden = (a, b) => b.impressions - a.impressions || a.page.localeCompare(b.page);
  filas.sort(orden);
  fuera.sort(orden);

  const conImpr = filas.filter(f => f.impressions > 0).length;
  const sinImpr = filas.length - conImpr;

  const L = [];
  L.push(`## 📄 Todas las páginas, una por una\n`);
  L.push(`Las ${filas.length} URLs del sitemap con su estado en Google y sus cifras del período. Sin recortar: **${conImpr} recibieron al menos una impresión y ${sinImpr} ninguna**. Una página dentro del índice y con cero impresiones no está compitiendo, Google la conoce y no la considera para ninguna búsqueda. Esas filas son el trabajo pendiente.\n`);
  L.push(`| # | Página | Cohorte | Idioma | Estado en Google | Impresiones | Clicks | CTR | Posición |`);
  L.push(`|---|---|---|---|---|---|---|---|---|`);
  filas.forEach((f, i) => {
    L.push(['', i + 1, `\`${f.page}\``, f.cohorte, f.lang, f.estado, f.impressions, f.clicks,
      f.impressions ? pct(f.ctr) : '—', f.position == null ? '—' : f.position.toFixed(1), ''].join('|'));
  });
  L.push('');
  if (fuera.length) {
    L.push(`### Páginas con impresiones que no están en el sitemap\n`);
    L.push(`Google las muestra y el sitemap no las declara: rutas viejas, variantes o páginas retiradas. Vale revisar si deberían volver al sitemap o redirigirse.\n`);
    L.push(`| Página | Impresiones | Clicks | CTR | Posición |`);
    L.push(`|---|---|---|---|---|`);
    for (const f of fuera) {
      L.push(['', `\`${f.page}\``, f.impressions, f.clicks, pct(f.ctr), f.position.toFixed(1), ''].join('|'));
    }
    L.push('');
  }
  L.push(`> **Estado en Google** sale de \`data/indexing-status.json\`${lastFullCheck ? `, del barrido del ${String(lastFullCheck).split('T')[0]}` : ''}. *Variante canónica* significa que la página SÍ está indexada, bajo su URL con barra final: no es un fallo.`);
  L.push(`> **Posición "—"** quiere decir que Google no nos mostró ni una vez para ninguna búsqueda en el período, no que estemos en el puesto 100.`);
  L.push(`> Las cifras están agregadas por ruta canónica, así que la variante con barra final y la que no se suman en una sola fila.\n`);
  return L;
}

function buildAllQueriesSection({ queryRows, queryPageRows, config }) {
  const seguidas = new Set(config.keywords.map(k => k.query.toLowerCase()));
  const topPageByQuery = new Map();
  for (const r of queryPageRows) {
    const q = r.keys[0].toLowerCase();
    const cur = topPageByQuery.get(q);
    if (!cur || r.impressions > cur.impressions) topPageByQuery.set(q, normalizePath(r.keys[1]));
  }
  const filas = [...queryRows]
    .map(r => ({
      query: r.keys[0], impressions: r.impressions, clicks: r.clicks,
      ctr: r.ctr, position: r.position,
      seguida: seguidas.has(r.keys[0].toLowerCase()),
      page: topPageByQuery.get(r.keys[0].toLowerCase()) ?? '—',
    }))
    .sort((a, b) => b.impressions - a.impressions || a.query.localeCompare(b.query));

  const nuevas = filas.filter(f => !f.seguida).length;
  const L = [];
  L.push(`## 🔤 Todas las búsquedas en las que aparecemos\n`);
  L.push(`Las ${filas.length} consultas que Google reportó en el período, sin recortar, con la página nuestra que salió para cada una. ${nuevas} de ellas no están en \`scripts/tracked-keywords.json\`: son candidatas a entrar si se repiten.\n`);
  L.push(`| # | Búsqueda | Impresiones | Clicks | CTR | Posición | Banda | Página que sale | ¿La seguimos? |`);
  L.push(`|---|---|---|---|---|---|---|---|---|`);
  filas.forEach((f, i) => {
    L.push(['', i + 1, f.query, f.impressions, f.clicks, pct(f.ctr), fmtPos(f.position),
      bandOf(f.position)?.label ?? 'sin datos', `\`${f.page}\``, f.seguida ? 'sí' : '—', ''].join('|'));
  });
  L.push('');
  L.push(`> **Esta lista no es el mercado.** Google solo reporta las búsquedas donde ya salimos, y oculta las de bajo volumen. Una consulta enorme donde estamos en el puesto 89 aparece aquí con pocas impresiones o no aparece: el orden de la tabla es el orden de nuestra visibilidad, no el del tamaño de la demanda.`);
  L.push(`> Las impresiones y la posición salen de la dimensión de consulta sola, que es la cifra limpia. La columna de página viene de la vista consulta más página y solo dice cuál de nuestras URLs salió más veces para esa búsqueda.\n`);
  return L;
}

// ═══════════════════════════════════════════════════════════════════════
// GEOGRAFÍA Y DISPOSITIVO
// ═══════════════════════════════════════════════════════════════════════
/* Marcyan vende en Houston y Miami. Impresiones desde fuera de Estados Unidos
   no son una victoria, son una señal de que rankeamos con intención equivocada
   (páginas genéricas de "diseño web" que atraen a cualquier hispanohablante).
   Merece su propia tabla porque cambia decisiones de contenido. */
const COUNTRY_ES = {
  usa: 'Estados Unidos', esp: 'España', mex: 'México', arg: 'Argentina',
  col: 'Colombia', cri: 'Costa Rica', per: 'Perú', chl: 'Chile',
  ven: 'Venezuela', ecu: 'Ecuador', dom: 'Rep. Dominicana', can: 'Canadá',
  gtm: 'Guatemala', hnd: 'Honduras', slv: 'El Salvador', pan: 'Panamá',
  bol: 'Bolivia', ury: 'Uruguay', pry: 'Paraguay', nic: 'Nicaragua',
  cub: 'Cuba', pri: 'Puerto Rico', bra: 'Brasil', gbr: 'Reino Unido',
  ind: 'India', deu: 'Alemania', fra: 'Francia', ita: 'Italia',
};
const DEVICE_ES = { DESKTOP: 'Escritorio', MOBILE: 'Móvil', TABLET: 'Tableta' };

/* La tabla de países vive dentro de la sección de posición de mercado, que es
   donde tiene sentido de negocio. Aquí solo queda el dispositivo. */
function buildDeviceLines(devices) {
  if (!devices?.length) return [];
  const L = [];
  L.push(`| Dispositivo | Impresiones | Clicks | CTR | Posición |`);
  L.push(`|---|---|---|---|---|`);
  for (const d of devices) {
    L.push(['', DEVICE_ES[d.keys[0]] ?? d.keys[0], d.impressions, d.clicks, pct(d.ctr), d.position.toFixed(1), ''].join('|'));
  }
  L.push('');
  return L;
}

// ═══════════════════════════════════════════════════════════════════════
// MÓDULOS DE DISEÑO
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// COHORTES DE URL
// ═══════════════════════════════════════════════════════════════════════
/* Por qué existe: mirar el sitio como un bloque de 84 URLs no dice dónde
   invertir. Agrupado por cohorte se ve qué familia de páginas indexa y rinde
   y cuál está estancada. Mismo enfoque que en MJA, con dos diferencias
   estructurales de Marcyan:

   1) Marcyan NO usa un prefijo de idioma sobre el mismo path: los slugs están
      TRADUCIDOS (/es/servicios ↔ /en/services, /es/houston/diseno-web ↔
      /en/houston/web-design, /es/diagnostico ↔ /en/checkup). Por eso la
      clasificación no se resuelve con una regex sobre el path, hace falta un
      diccionario slug → cohorte que meta el par ES/EN en la MISMA cohorte con
      `lang` distinto. Ese es el objetivo entero de la sección: comparar el
      rendimiento ES contra EN de la misma página.
   2) Las páginas legales en español viven en la RAÍZ (/privacidad, /terminos),
      sin prefijo /es. La detección de idioma no puede ser "sin prefijo =
      inglés" como en MJA: aquí sin prefijo es español, porque / hace 308 a
      /es/ y las rutas legado de raíz son las españolas. */

/** Ciudades con hub propio. El slug de ciudad no se traduce. */
const COHORT_CITIES = new Set(['houston', 'miami']);

/* Segundo nivel bajo /{idioma}/{ciudad}/ → tipo de landing. Se listan los
   slugs ES y EN del MISMO landing para que el par caiga junto.
   MANTENIMIENTO: al publicar un landing de ciudad nuevo hay que añadir su slug
   aquí, igual que se añade su par a ROUTE_PAIRS en src/i18n/routes.ts. Si se
   olvida, la URL cae en 'otras' y el reporte la lista por nombre: falla
   ruidosa, nunca una clasificación silenciosa e incorrecta. */
const COHORT_CITY_CHILD = new Map([
  // Servicios por ciudad (ES)
  ['diseno-web', 'servicio-ciudad'],
  ['seo-local', 'servicio-ciudad'],
  ['ia-conversacional', 'servicio-ciudad'],
  ['seo-para-ia', 'servicio-ciudad'],
  ['diseno-web-bilingue', 'servicio-ciudad'],
  // Servicios por ciudad (EN)
  ['web-design', 'servicio-ciudad'],
  ['local-seo', 'servicio-ciudad'],
  ['conversational-ai', 'servicio-ciudad'],
  ['ai-seo', 'servicio-ciudad'],
  ['bilingual-web-design', 'servicio-ciudad'],
  // Servicios con slug idéntico en los dos idiomas
  ['ecommerce', 'servicio-ciudad'],
  ['branding', 'servicio-ciudad'],
  // Industrias por ciudad (ES)
  ['abogados-inmigracion', 'industria-ciudad'],
  ['bienes-raices', 'industria-ciudad'],
  ['restaurantes', 'industria-ciudad'],
  ['contratistas', 'industria-ciudad'],
  ['talleres-mecanicos', 'industria-ciudad'],
  ['salon-belleza', 'industria-ciudad'],
  ['clinicas-dentales', 'industria-ciudad'],
  // Industrias por ciudad (EN)
  ['immigration-lawyers', 'industria-ciudad'],
  ['real-estate', 'industria-ciudad'],
  ['restaurants', 'industria-ciudad'],
  ['contractors', 'industria-ciudad'],
  ['auto-repair', 'industria-ciudad'],
  ['beauty-salons', 'industria-ciudad'],
  ['dental-clinics', 'industria-ciudad'],
  // Suburbios (slug idéntico en los dos idiomas)
  ['katy', 'subciudad'],
  ['sugar-land', 'subciudad'],
  ['doral', 'subciudad'],
  ['hialeah', 'subciudad'],
]);

/* Primer nivel bajo /es, /en o la raíz → cohorte. Clave = slug tal cual
   aparece en la URL; el par ES/EN apunta a la misma cohorte. */
const COHORT_TOP_LEVEL = new Map([
  // Marca y hubs de navegación
  ['servicios', 'core'], ['services', 'core'],
  ['ciudades', 'core'], ['cities', 'core'],
  ['portafolio', 'core'], ['portfolio', 'core'],
  ['sobre-nosotros', 'core'], ['about', 'core'],
  ['ia-para-pymes', 'core'], ['ai-for-small-business', 'core'],
  // Dinero: hub de precios y guías "cuánto cuesta"
  ['precios', 'precios'], ['pricing', 'precios'],
  // Contenido
  ['blog', 'blog'],
  // Captación con herramienta propia
  ['diagnostico', 'herramientas'], ['checkup', 'herramientas'],
  ['herramientas', 'herramientas'], ['tools', 'herramientas'],
  // Legales
  ['privacidad', 'legal'], ['terminos', 'legal'],
  ['privacy', 'legal'], ['terms', 'legal'],
  /* Funcionales fuera del sitemap (llevan noindex). No suman URLs al
     denominador porque no están en indexing-status.json, pero GSC sí puede
     reportarlas con impresiones residuales: se clasifican aparte para no
     ensuciar 'otras' ni inflar una cohorte de negocio. */
  ['formulario', 'utilidad'], ['kit', 'utilidad'], ['dashboard', 'utilidad'],
]);

/** Etiquetas legibles para la tabla del reporte. */
const COHORT_LABELS = {
  'core': 'Marca y hubs',
  'ciudad-hub': 'Hubs de ciudad',
  'servicio-ciudad': 'Servicio por ciudad',
  'industria-ciudad': 'Industria por ciudad',
  'subciudad': 'Suburbios',
  'precios': 'Precios',
  'blog': 'Blog',
  'herramientas': 'Diagnóstico y calculadoras',
  'legal': 'Legales',
  'utilidad': 'Funcionales, fuera del sitemap',
  'otras': 'Sin clasificar',
};

/** Orden de presentación: primero lo que más pesa en el negocio. */
const COHORT_ORDER = [
  'core', 'ciudad-hub', 'servicio-ciudad', 'industria-ciudad', 'subciudad',
  'precios', 'blog', 'herramientas', 'legal', 'utilidad', 'otras',
];

/**
 * Clasifica una URL del sitio en {cohort, lang}. Función pura y testeable.
 * Consume normalizePath, no normaliza por su cuenta: si tuviera su propio
 * normalizador, la tabla de cohortes y la de páginas colapsarían distinto y
 * los totales del mismo reporte no cuadrarían.
 */
function classifyCohort(url) {
  const segs = normalizePath(url).split('/').filter(Boolean);

  /* Idioma. Sin prefijo es español: / hace 308 a /es/ y las rutas legado de
     raíz (/privacidad, /terminos, /formulario) son las españolas. */
  let lang = 'es';
  if (segs[0] === 'es' || segs[0] === 'en') {
    lang = segs[0];
    segs.shift();
  }

  if (segs.length === 0) return { cohort: 'core', lang }; // home de cada idioma

  const [first, second] = segs;

  // Rama de ciudad: /{idioma}/{ciudad}[/{hijo}]
  if (COHORT_CITIES.has(first)) {
    if (segs.length === 1) return { cohort: 'ciudad-hub', lang };
    if (segs.length === 2) return { cohort: COHORT_CITY_CHILD.get(second) ?? 'otras', lang };
    return { cohort: 'otras', lang };
  }

  /* Resto del primer nivel. 'blog' y 'precios' agrupan hub e hijos; las demás
     son páginas sueltas, así que un hijo inesperado cae en 'otras' en vez de
     colarse en una cohorte de negocio. */
  const top = COHORT_TOP_LEVEL.get(first);
  if (top === 'blog' || top === 'precios') return { cohort: top, lang };
  if (top && segs.length === 1) return { cohort: top, lang };

  return { cohort: 'otras', lang };
}

/* Estados de cobertura de la API de GSC, con etiqueta en español y orden de
   presentación. La clave es el literal EXACTO que devuelve Google, que no se
   traduce ni se toca. Ojo: esta tabla NO es la lista cerrada de estados. Los
   estados se derivan de los datos en tiempo de ejecución, y uno que Google
   invente mañana aparece como columna propia con su literal, en vez de caer
   callado en un cajón equivocado (que fue justo lo que detectó la revisión:
   una URL "unknown" absorbida dentro de "indexadas"). */
const COVERAGE_META = [
  { state: 'Submitted and indexed', label: 'Indexadas', one: 'indexada', many: 'indexadas', gloss: 'están dentro del índice' },
  { state: 'Alternate page with proper canonical tag', label: 'Variante canónica', one: 'servida bajo su variante canónica', many: 'servidas bajo su variante canónica', gloss: 'Google la trata como variante de otra URL, típicamente la versión con barra final que declara el canonical. Ni es error ni cuenta como página aparte: la página SÍ está indexada bajo su canónica y puede traer impresiones' },
  { state: 'Discovered - currently not indexed', label: 'Descubierta', one: 'descubierta sin rastrear', many: 'descubiertas sin rastrear', gloss: 'Google sabe que existe y todavía no la ha rastreado' },
  { state: 'Crawled - currently not indexed', label: 'Rastreada sin indexar', one: 'rastreada y descartada', many: 'rastreadas y descartadas', gloss: 'la rastreó y decidió no indexarla. Este es el aviso serio' },
  { state: 'URL is unknown to Google', label: 'Desconocida', one: 'desconocida para Google', many: 'desconocidas para Google', gloss: 'está en el sitemap y Google declara no conocerla. El peor estado' },
];
const COVERAGE_ORDER = COVERAGE_META.map(m => m.state);
const coverageLabel = s => COVERAGE_META.find(m => m.state === s)?.label ?? s;
const coverageCount = (s, n) => {
  const m = COVERAGE_META.find(x => x.state === s);
  if (!m) return `en estado "${s}"`;
  return n === 1 ? m.one : m.many;
};

/** Estados que significan "esta página puede aparecer en Google hoy". */
const COVERAGE_LIVE = new Set(['Submitted and indexed', 'Alternate page with proper canonical tag']);

/* Cruza el estado de indexación (data/indexing-status.json, del sweep diario)
   con las métricas GSC ya descargadas. Sin llamadas extra a la API. */
function buildCohortStats({ indexingUrls, pageRows }) {
  const mk = () => ({ urls: 0, byState: {}, impressions: 0, clicks: 0, posWeighted: 0, unclassified: [] });
  const stats = new Map();
  const statesSeen = new Set();
  const bump = (cohort, lang) => {
    const key = `${cohort}|${lang}`;
    if (!stats.has(key)) stats.set(key, mk());
    return stats.get(key);
  };
  for (const [url, info] of Object.entries(indexingUrls ?? {})) {
    const { cohort, lang } = classifyCohort(url);
    const s = bump(cohort, lang);
    s.urls++;
    if (cohort === 'otras') s.unclassified.push(normalizePath(url));
    const cs = info?.coverageState || 'Sin estado registrado';
    statesSeen.add(cs);
    s.byState[cs] = (s.byState[cs] ?? 0) + 1;
  }
  for (const r of pageRows ?? []) {
    const { cohort, lang } = classifyCohort(r.page);
    const s = bump(cohort, lang);
    s.impressions += r.impressions;
    s.clicks += r.clicks;
    s.posWeighted += r.position * r.impressions;
  }
  /* Columnas: los estados conocidos que de verdad aparecen, en orden de
     gravedad, y detrás cualquier estado nuevo por orden alfabético. */
  const known = COVERAGE_ORDER.filter(s => statesSeen.has(s));
  const unknown = [...statesSeen].filter(s => !COVERAGE_ORDER.includes(s)).sort();
  return { stats, states: [...known, ...unknown] };
}

function buildCohortSection({ stats, states, lastFullCheck, hasIndexData, totalUrls }) {
  const get = (c, l) => stats.get(`${c}|${l}`);
  const zero = () => ({ urls: 0, byState: {}, impressions: 0, clicks: 0, posWeighted: 0, unclassified: [] });
  const add = (a, b) => {
    if (!b) return a;
    a.urls += b.urls; a.impressions += b.impressions; a.clicks += b.clicks; a.posWeighted += b.posWeighted;
    a.unclassified = [...a.unclassified, ...b.unclassified];
    for (const [k, v] of Object.entries(b.byState)) a.byState[k] = (a.byState[k] ?? 0) + v;
    return a;
  };
  const urlTotal = [...stats.values()].reduce((a, s) => a + s.urls, 0) || totalUrls || 0;

  const L = [];
  L.push(`## 🧩 Cohortes: indexación y rendimiento por familia de páginas\n`);
  L.push(`Las ${urlTotal} URLs del sitemap agrupadas por el tipo de página que son. Así se ve qué familia indexa y rinde y cuál está estancada, en vez de mirar el sitio como un bloque. La versión en español y la versión en inglés de la misma página caen en la MISMA cohorte, para poder compararlas.\n`);
  L.push(`Estado de indexación según \`data/indexing-status.json\`${lastFullCheck ? `, verificado el ${String(lastFullCheck).split('T')[0]}` : ''}. Impresiones, clicks y posición son del mismo período que el resto del reporte.\n`);
  if (!hasIndexData) L.push(`> ⚠️ No encontré \`data/indexing-status.json\`, las columnas de indexación quedan en cero este período.\n`);

  L.push(['', 'Cohorte', 'Idioma', 'URLs', ...states.map(coverageLabel), 'Impresiones', 'Clicks', 'Posición', ''].join('|'));
  L.push(['', ...Array(4 + states.length + 2).fill('---'), ''].join('|'));
  const row = (label, langLabel, s, bold = false) => {
    const b = v => (bold ? `**${v}**` : String(v));
    const pos = s.impressions > 0 ? (s.posWeighted / s.impressions).toFixed(1) : 'sin datos';
    return ['', b(label), b(langLabel), b(s.urls), ...states.map(st => b(s.byState[st] ?? 0)), b(s.impressions), b(s.clicks), b(pos), ''].join('|');
  };
  const unclassified = [];
  let checkSum = 0;
  for (const cohort of COHORT_ORDER) {
    const es = get(cohort, 'es');
    const en = get(cohort, 'en');
    if (!es && !en) continue; // una cohorte vacía no se dibuja
    const label = COHORT_LABELS[cohort] ?? cohort;
    if (es) L.push(row(label, 'ES', es));
    if (en) L.push(row(label, 'EN', en));
    const tot = add(add(zero(), es), en);
    L.push(row(label, 'Total', tot, true));
    unclassified.push(...tot.unclassified);
    checkSum += Object.values(tot.byState).reduce((a, v) => a + v, 0);
  }
  L.push('');

  /* Comprobación propia: si la suma de las columnas de estado no iguala el
     total de URLs, alguna se está perdiendo y hay que verlo, no tragárselo. */
  if (hasIndexData && checkSum !== urlTotal) {
    L.push(`> ⚠️ **Descuadre interno.** Las columnas de estado suman ${checkSum} y el sitemap tiene ${urlTotal} URLs. Hay un estado que no se está contando, revisar \`buildCohortStats\` en \`scripts/track-rankings.mjs\`.\n`);
  }
  if (unclassified.length) {
    L.push(`> ⚠️ **Cohorte sin clasificar con contenido.** Estas URLs no encajan en ningún patrón conocido. Hay que dar de alta su slug en el diccionario de \`scripts/track-rankings.mjs\`, igual que se da de alta su par en \`src/i18n/routes.ts\`:`);
    for (const u of unclassified) L.push(`> - \`${u}\``);
    L.push('');
  }
  L.push(`> **Qué significa cada estado.** ${states.map(s => { const m = COVERAGE_META.find(x => x.state === s); return m ? `*${m.label}*: ${m.gloss}.` : `*${s}*: estado nuevo de Google, sin glosa todavía.`; }).join(' ')}`);
  L.push(`> **Métricas.** Agregadas por ruta canónica: las variantes con barra final o con parámetros UTM se suman a su ruta. La posición es el promedio ponderado por impresiones y sale "sin datos" con cero impresiones.`);
  L.push(`> **Cuidado con el volumen.** Con pocas impresiones repartidas entre muchas cohortes, la mayoría de celdas no sostienen una decisión por sí solas. Mirar primero la columna de indexadas y solo después la de posición.\n`);
  return L;
}

// ═══════════════════════════════════════════════════════════════════════
// POSICIÓN DE MERCADO
// ═══════════════════════════════════════════════════════════════════════
/* LA VERDAD TÉCNICA, verificada contra la documentación oficial (ago-2026):
   Search Console NO expone ningún dato de otros sitios.
   · searchAnalytics.query admite las dimensiones country, device, page, query,
     searchAppearance y date/hour, y devuelve clicks, impressions, ctr y
     position SIEMPRE de la propiedad verificada.
   · urlInspection.index.inspect exige que la URL esté "under the property
     specified in siteUrl". No puede mirar dominios ajenos.
   · No hay dimensión de SERP completa, ni de competidores, ni de cuota.

   Por lo tanto esta sección NO mide competidores y no finge hacerlo. Mide
   NUESTRA profundidad en el mercado y cierra con la lista explícita de lo que
   queda sin medir.

   Corolario que hay que tener presente: la posición media TAMPOCO es un
   recuento de competidores. Google la define como la posición más alta que
   ocupa un enlace nuestro, promediada, y cada bloque del resultado (mapa
   local, imágenes, respuesta de IA, carrusel) ocupa una sola posición. Estar
   en la 41.9 no significa "41 competidores por delante", significa "salimos
   muy por debajo de la primera pantalla". Vender lo primero sería justo el
   tipo de métrica inventada que este reporte no admite. */

const MARKET_CONFIG = {
  brandPattern: 'marc\\s*yan|marcyanstudio',
  serviceCountries: ['usa'],
  markets: [
    { id: 'houston', label: 'Houston', slugs: ['houston'], queryPattern: 'houston|katy|sugar\\s*land' },
    { id: 'miami', label: 'Miami', slugs: ['miami'], queryPattern: 'miami|doral|hialeah' },
  ],
  topQueries: 12,
};

/* Bandas de profundidad. Los cortes llevan .5 porque la posición de GSC es un
   promedio, no un entero. */
const BANDS = [
  { id: 'p1', max: 10.5, label: 'Primera página (1 a 10)' },
  { id: 'p2', max: 20.5, label: 'Segunda página (11 a 20), a tiro' },
  { id: 'p35', max: 50.5, label: 'Páginas 3 a 5 (21 a 50)' },
  { id: 'deep', max: Infinity, label: 'Más allá de la página 5 (51 o peor)' },
];
const bandOf = p => (p == null || !isFinite(p) ? null : BANDS.find(b => p <= b.max) ?? BANDS.at(-1));

const mpNum = v => { const n = Number(v); return isFinite(n) ? n : 0; };
const share = (part, whole) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : 'sin base');

/** Primer segmento del path ignorando el prefijo de idioma. */
function firstSegment(path) {
  const segs = normalizePath(path).split('/').filter(Boolean);
  if (segs[0] === 'es' || segs[0] === 'en') segs.shift();
  return segs[0] ?? '';
}

function aggregateQueries(rows) {
  const map = new Map();
  for (const r of rows ?? []) {
    const q = Array.isArray(r?.keys) ? r.keys[0] : r?.query;
    if (!q) continue;
    const impressions = mpNum(r.impressions);
    const cur = map.get(q) ?? { query: q, impressions: 0, clicks: 0, posWeighted: 0 };
    cur.impressions += impressions;
    cur.clicks += mpNum(r.clicks);
    cur.posWeighted += mpNum(r.position) * impressions;
    map.set(q, cur);
  }
  return [...map.values()]
    .map(q => ({ ...q, position: q.impressions > 0 ? q.posWeighted / q.impressions : null }))
    .sort((a, b) => b.impressions - a.impressions || a.query.localeCompare(b.query));
}

/* Agrupa el sitemap por ruta sin barra final. Una URL marcada "Alternate page
   with proper canonical tag" cuyo canónico de Google es la MISMA ruta salvo la
   barra final NO es una página perdida: es la misma página, indexada bajo la
   otra forma de URL. Contarla como fallo hundiría el denominador y mentiría.
   En Marcyan son 17 de 84 URLs, o sea que el índice real es 71 y no 54. */
function indexGroups(indexingUrls) {
  const groups = new Map();
  for (const [url, info] of Object.entries(indexingUrls ?? {})) {
    const p = normalizePath(url);
    const state = info?.coverageState ?? '';
    const canonical = normalizePath(info?.googleCanonical ?? '');
    const g = groups.get(p) ?? { path: p, inIndex: false };
    if (state === 'Submitted and indexed') g.inIndex = true;
    else if (state === 'Alternate page with proper canonical tag' && canonical === p) g.inIndex = true;
    groups.set(p, g);
  }
  return groups;
}

function buildMarketSection({ queryRows, pageRows, countries, devices, totals, indexingUrls, lastFullCheck }) {
  try {
    const cfg = MARKET_CONFIG;
    const queries = aggregateQueries(queryRows);
    const pages = new Map(pageRows.map(p => [p.page, p]));
    const groups = indexGroups(indexingUrls);
    const ctry = (countries ?? [])
      .map(r => ({ code: String(r.keys?.[0] ?? '').toLowerCase(), impressions: mpNum(r.impressions), clicks: mpNum(r.clicks) }))
      .filter(c => c.code)
      .sort((a, b) => b.impressions - a.impressions);

    const queryImpr = queries.reduce((a, q) => a + q.impressions, 0);
    const siteImpr = mpNum(totals?.impressions) || queryImpr;
    const L = [];

    // ── alcance ──
    L.push(`## 🧭 Posición de mercado\n`);
    L.push(`**Qué mide esta sección y qué no.** Search Console solo devuelve datos de nuestra propia propiedad: la API de rendimiento admite las dimensiones consulta, página, país, dispositivo, aspecto en el resultado y fecha, todas referidas a este dominio, y la de inspección exige que la URL esté dentro de la propiedad verificada. **No hay un solo dato de competidores en la fuente.** Por eso aquí no se nombra a ningún rival, no se calcula cuota de mercado y no se compara con nadie. Lo que sí se mide es nuestra profundidad: a qué distancia estamos de la primera página, en qué ciudad, con qué reparto entre marca y demanda genérica y con cuánta superficie publicada. La lista de lo que queda sin medir está al final de la sección.\n`);
    L.push(`> **Cobertura de la muestra de consultas:** ${queryImpr.toLocaleString('es')} de ${siteImpr.toLocaleString('es')} impresiones del sitio (${share(queryImpr, siteImpr)}) llegan con la consulta visible. El resto son consultas que Google anonimiza por bajo volumen y no se pueden clasificar. Todos los porcentajes por consulta de esta sección van sobre esa muestra, no sobre el total del sitio.\n`);

    // ── profundidad ──
    L.push(`### Profundidad: en qué parte del resultado caemos\n`);
    if (!queries.length) {
      L.push(`> Sin consultas con datos este período. Bloque no calculado.\n`);
    } else {
      const buckets = new Map(BANDS.map(b => [b.id, { band: b, queries: 0, impressions: 0, clicks: 0, posWeighted: 0 }]));
      for (const q of queries) {
        const b = bandOf(q.position);
        if (!b) continue;
        const acc = buckets.get(b.id);
        acc.queries++; acc.impressions += q.impressions; acc.clicks += q.clicks;
        acc.posWeighted += (q.position ?? 0) * q.impressions;
      }
      L.push(`| Banda | Consultas | Impresiones | Cuota de la muestra | Posición media |`);
      L.push(`|---|---|---|---|---|`);
      for (const b of BANDS) {
        const acc = buckets.get(b.id);
        if (!acc || acc.queries === 0) continue;
        const pos = acc.impressions > 0 ? acc.posWeighted / acc.impressions : null;
        L.push(['', b.label, acc.queries, acc.impressions.toLocaleString('es'), share(acc.impressions, queryImpr), fmtPos(pos), ''].join('|'));
      }
      L.push('');
      L.push(`> La posición de Search Console es la más alta que ocupa una página nuestra en cada búsqueda, promediada. Google cuenta como una posición cada bloque del resultado (mapa, imágenes, respuesta de IA), así que la banda es una aproximación de dónde aparecemos, **no** un recuento de cuántos competidores tenemos delante.\n`);

      if (queries.every(q => q.impressions < 100)) {
        L.push(`> Con ${siteImpr.toLocaleString('es')} impresiones en el período ninguna consulta alcanza confianza alta. Es una foto de arranque, no una base para decidir contenido. El detalle consulta por consulta está en la sección "Todas las búsquedas en las que aparecemos".\n`);
      }
    }

    // ── marca contra genérica ──
    L.push(`### Marca contra demanda genérica\n`);
    const brandRe = new RegExp(cfg.brandPattern, 'i');
    const split = { brand: { q: 0, impressions: 0, clicks: 0 }, generic: { q: 0, impressions: 0, clicks: 0 } };
    for (const q of queries) {
      const b = brandRe.test(q.query) ? split.brand : split.generic;
      b.q++; b.impressions += q.impressions; b.clicks += q.clicks;
    }
    const brandTotal = split.brand.impressions + split.generic.impressions;
    if (brandTotal === 0) {
      L.push(`> Sin consultas visibles este período. Bloque no calculado.\n`);
    } else {
      L.push(`| Tipo de demanda | Consultas | Impresiones | Cuota de la muestra | Clicks |`);
      L.push(`|---|---|---|---|---|`);
      L.push(['', 'Marca (nos buscan por el nombre)', split.brand.q, split.brand.impressions, share(split.brand.impressions, brandTotal), split.brand.clicks, ''].join('|'));
      L.push(['', 'Genérica (compiten todos)', split.generic.q, split.generic.impressions, share(split.generic.impressions, brandTotal), split.generic.clicks, ''].join('|'));
      L.push('');
      L.push(`> Cuanto más pesa la columna genérica, más competimos en abierto y menos vivimos de una marca ya conocida. En un sitio nuevo es lo normal. Cuando la marca empiece a crecer se verá aquí antes que en ningún otro sitio.\n`);
    }

    // ── frentes por ciudad ──
    L.push(`### Frentes por ciudad: superficie publicada contra visibilidad obtenida\n`);
    if (!groups.size && !pages.size) {
      L.push(`> Sin sitemap ni datos por página. Bloque no calculado.\n`);
    } else {
      const rows = [];
      const claimed = new Set();
      const marketSlugs = new Set(cfg.markets.flatMap(m => m.slugs));
      for (const m of cfg.markets) {
        const slugs = new Set(m.slugs);
        let urls = 0, inIndex = 0, impressions = 0, clicks = 0;
        for (const [p, g] of groups) {
          if (!slugs.has(firstSegment(p))) continue;
          urls++; if (g.inIndex) inIndex++; claimed.add(p);
        }
        for (const [p, row] of pages) {
          if (!slugs.has(firstSegment(p))) continue;
          impressions += row.impressions; clicks += row.clicks;
        }
        const qre = new RegExp(m.queryPattern, 'i');
        let qImpr = 0, qCount = 0, qPosW = 0;
        for (const q of queries) {
          if (!qre.test(q.query)) continue;
          qCount++; qImpr += q.impressions; qPosW += (q.position ?? 0) * q.impressions;
        }
        rows.push({
          label: m.label, urls, inIndex, impressions, clicks,
          perUrl: urls > 0 ? impressions / urls : null,
          qCount, qImpr, qPos: qImpr > 0 ? qPosW / qImpr : null,
        });
      }
      let rUrls = 0, rIndex = 0, rImpr = 0, rClicks = 0;
      for (const [p, g] of groups) if (!claimed.has(p)) { rUrls++; if (g.inIndex) rIndex++; }
      for (const [p, row] of pages) if (!marketSlugs.has(firstSegment(p))) { rImpr += row.impressions; rClicks += row.clicks; }
      rows.push({ label: 'Resto del sitio', urls: rUrls, inIndex: rIndex, impressions: rImpr, clicks: rClicks, perUrl: rUrls > 0 ? rImpr / rUrls : null, qCount: null, qImpr: null, qPos: null });

      const totalPageImpr = [...pages.values()].reduce((a, p) => a + p.impressions, 0);
      L.push(`| Frente | Páginas publicadas | En el índice | Impresiones | Cuota | Impresiones por página | Posición media en consultas de la ciudad |`);
      L.push(`|---|---|---|---|---|---|---|`);
      for (const r of rows) {
        L.push(['', r.label, r.urls, r.inIndex, r.impressions.toLocaleString('es'), share(r.impressions, totalPageImpr),
          r.perUrl == null ? 'sin base' : r.perUrl.toFixed(1),
          r.qPos == null ? 'sin datos' : `${fmtPos(r.qPos)} (${r.qImpr} impr en ${r.qCount} consultas)`, ''].join('|'));
      }
      L.push('');
      L.push(`> **Páginas publicadas** salen del sitemap vivo, **En el índice** del último barrido de inspección${lastFullCheck ? ` (${String(lastFullCheck).split('T')[0]})` : ''}. Las impresiones se agregan por ruta, sumando la variante con barra final y la que no. La cuota va sobre la suma de filas por página, que puede superar el total del sitio porque Search Console deduplica a nivel de sitio pero no a nivel de página.\n`);

      /* Lectura: solo aritmética sobre las filas de arriba, sin causas ni
         juicios. La comparación entre frentes es el hallazgo de mercado más
         fuerte que la fuente permite, y hay que dejar claro que es una
         comparación, no una recomendación. */
      const cityRows = rows.filter(r => r.label !== 'Resto del sitio' && r.urls > 0 && r.impressions > 0);
      if (cityRows.length >= 2) {
        const byYield = [...cityRows].sort((a, b) => (b.perUrl ?? 0) - (a.perUrl ?? 0));
        const byPos = [...cityRows].filter(r => r.qPos != null).sort((a, b) => a.qPos - b.qPos);
        const best = byYield[0], worst = byYield.at(-1);
        const ratio = worst.perUrl > 0 ? best.perUrl / worst.perUrl : null;
        L.push(`**Lectura de los números de arriba.** ${best.label} rinde **${best.perUrl.toFixed(1)}** impresiones por página publicada${ratio ? `, ${ratio.toFixed(1)} veces lo que rinde ${worst.label} (${worst.perUrl.toFixed(1)})` : ''}, y eso con **${best.urls}** páginas frente a las **${worst.urls}** de ${worst.label}.`);
        if (byPos.length >= 2 && byPos[0].label !== best.label) {
          L.push(`Al mismo tiempo, el frente donde estamos más cerca de la primera página es **${byPos[0].label}** (posición media ${fmtPos(byPos[0].qPos)} frente a ${fmtPos(byPos.at(-1).qPos)}).`);
          L.push(`O sea que un frente da mucha visibilidad pero lejos de la primera página y el otro da poca visibilidad pero más cerca. Cuál empujar es una decisión de negocio: esta fuente mide el reparto, no dice cuál conviene.`);
        }
        L.push('');
      }
      /* Alarma anti pudrición: un tramo del sitio con páginas propias que
         además aparece nombrado en consultas reales y no está configurado
         como mercado. Sin esto, una ciudad nueva pasa desapercibida. */
      /* Se excluyen los slugs que YA son un tipo de página conocido (blog,
         precios, servicios, legales…): son familias de contenido, no
         ciudades. Sin este filtro, una consulta como "smart chat assistant
         pricing" hacía que `/en/pricing` se propusiera como mercado nuevo. */
      const known = new Set(['', ...marketSlugs, ...COHORT_TOP_LEVEL.keys()]);
      const candidates = new Map();
      for (const [p] of groups) {
        const seg = firstSegment(p);
        if (!seg || known.has(seg)) continue;
        candidates.set(seg, (candidates.get(seg) ?? 0) + 1);
      }
      const flagged = [...candidates.entries()]
        .filter(([seg, n]) => n >= 2 && queries.some(q => q.impressions > 0 && q.query.toLowerCase().includes(seg.toLowerCase())))
        .map(([seg, n]) => `\`${seg}\` (${n} páginas)`);
      if (flagged.length) {
        L.push(`> 💡 Tramos con páginas propias que ya aparecen nombrados en consultas reales y no están configurados como frente: ${flagged.join(', ')}. Revisar si son mercados nuevos.\n`);
      }
    }

    // ── geografía y dispositivo ──
    L.push(`### Relevancia geográfica de la visibilidad\n`);
    if (!ctry.length) {
      L.push(`> Sin datos por país este período. Bloque no calculado.\n`);
    } else {
      const service = new Set(cfg.serviceCountries);
      let inMarket = 0, outMarket = 0;
      for (const c of ctry) { if (service.has(c.code)) inMarket += c.impressions; else outMarket += c.impressions; }
      const tot = inMarket + outMarket;
      L.push(`| País | Impresiones | Cuota | Clicks | ¿Lo atendemos? |`);
      L.push(`|---|---|---|---|---|`);
      for (const c of ctry.slice(0, 8)) {
        L.push(['', COUNTRY_ES[c.code] ?? c.code.toUpperCase(), c.impressions.toLocaleString('es'), share(c.impressions, tot), c.clicks, service.has(c.code) ? 'sí' : 'no', ''].join('|'));
      }
      L.push('');
      L.push(`- Visibilidad en mercado atendido: **${inMarket.toLocaleString('es')}** impresiones (${share(inMarket, tot)}).`);
      L.push(`- Visibilidad fuera de mercado: **${outMarket.toLocaleString('es')}** impresiones (${share(outMarket, tot)}), que no puede convertir aunque mejore de posición.\n`);
      L.push(`> Cuando una parte del contenido en español encaja con búsquedas de países que no atendemos, esta tabla lo confirma. Por qué pasa es una hipótesis, no un dato: la fuente solo puede decir cuánto ocurre, no la causa.\n`);
    }
    const dev = buildDeviceLines(devices);
    if (dev.length) { L.push(`#### Por dispositivo\n`); L.push(...dev); }

    // ── superficie que compite ──
    L.push(`### Cuánta de nuestra superficie compite de verdad\n`);
    if (!groups.size) {
      L.push(`> Sin \`data/indexing-status.json\`. Bloque no calculado.\n`);
    } else {
      const total = groups.size;
      const inIndex = [...groups.values()].filter(g => g.inIndex).length;
      const paths = [...pages.keys()];
      const offSitemap = paths.filter(p => !groups.has(p)).length;
      const onSitemap = paths.length - offSitemap;
      L.push(`- Páginas en el sitemap: **${total}**`);
      L.push(`- En el índice de Google: **${inIndex}** (${share(inIndex, total)})`);
      L.push(`- Con al menos una impresión este período: **${paths.length}**, de las cuales **${onSitemap}** están en el sitemap (${share(onSitemap, inIndex)} de las indexadas)`);
      L.push(`- Indexadas y sin ninguna impresión: **${Math.max(inIndex - onSitemap, 0)}**`);
      if (offSitemap > 0) L.push(`- De las que reciben impresiones, **${offSitemap}** no están en el sitemap vivo (URLs viejas, con parámetros o con otra forma de ruta). Vale revisarlas.`);
      L.push('');
      L.push(`> Una página indexada que no recibe ni una impresión no está compitiendo: Google la conoce y no la considera para ninguna búsqueda. Este es el cuello de botella que sí podemos mover sin datos de terceros.\n`);
    }

    // ── lo que no se mide ──
    L.push(`### Lo que esta sección NO mide\n`);
    L.push(`Search Console no lo entrega y no se estima:\n`);
    L.push(`- **Quién está por delante.** Ni nombres, ni dominios, ni cuántos son. La posición media no es un recuento de competidores.`);
    L.push(`- **Cuota de mercado.** Haría falta el resultado de búsqueda completo por consulta, que la fuente no da.`);
    L.push(`- **Volumen de búsqueda real de cada consulta.** Las impresiones son las veces que Google nos mostró, y eso depende de nuestra propia posición: una consulta enorme donde estamos en el puesto 89 aparece aquí como pocas impresiones. El orden de la tabla no es el orden de tamaño del mercado.`);
    L.push(`- **Por qué nos ganan.** Contenido, antigüedad, enlaces o reseñas: nada de eso está en la fuente.`);
    L.push(`- **Apariciones en respuestas de IA.** Search Console no ofrece una dimensión para separarlas, así que no se reporta.`);
    L.push(`- **Las consultas anonimizadas.** Google oculta las de bajo volumen, así que la muestra por consulta nunca cubre el total del sitio.\n`);
    L.push(`> El análisis cualitativo de competidores vive en un documento aparte y se revalida a mano cada trimestre. Este reporte no lo actualiza y no lo sustituye. Para medir competencia de verdad hace falta una fuente de pago de resultados de búsqueda: la decisión, con su condición de disparo, está documentada en \`docs/reports/README.md\`.\n`);

    return L;
  } catch (err) {
    return [
      `## 🧭 Posición de mercado\n`,
      `> ⚠️ Sección no generada por un error interno: ${String(err?.message ?? err)}. El resto del reporte no se ve afectado.\n`,
    ];
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EMBUDO Y CONVERSIÓN (datos propios, Neon)
// ═══════════════════════════════════════════════════════════════════════
/* Responde UNA pregunta: de las impresiones que Google nos da, cuántas se
   vuelven visitante que hace algo y cuántas se vuelven lead. Esto es lo que
   Marcyan puede medir y los sitios de cliente no, porque la base es nuestra.

   Reglas que se respetan aquí:
   · La base nunca rompe el reporte. Todo error se captura, el loader devuelve
     null y la sección se imprime con una nota de degradación.
   · Nada inventado: si una etapa no se puede medir, se imprime "s/d" y se
     explica por qué.
   · El reporte se comitea al repo, así que no se escribe ni PII (nombres,
     emails, URLs de clientes) ni IPs, ni nada derivado de una IP. */

/* Etapas del embudo. Viven en JS para tener una sola definición, que además
   se imprime como leyenda debajo de la tabla.

   `proposal_requested` NO está en FUNNEL_SIGNAL a propósito: se dispara desde
   el botón "Propuesta gratis" de la barra de navegación (SiteNav.astro, 3 de
   sus 4 puntos de disparo), que está en TODAS las páginas y solo hace scroll
   al ancla #contacto. Es un clic de navegación, no una señal de contacto.
   Contarlo aquí inflaría la etapa 6 con gente que solo pasó por la barra.

   `diagnostic_step` tampoco pertenece a ninguna etapa: se dispara una vez por
   paso del asistente, así que mide profundidad dentro de una herramienta, no
   avance por el embudo. Se ve igual en la tabla de instrumentación. */
const FUNNEL_INTENT = ['diagnostic_started', 'calculator_started', 'tool_cta_clicked', 'growth_teaser_clicked'];
const FUNNEL_TOOL = ['diagnostic_completed_preview', 'calculator_completed'];
const FUNNEL_SIGNAL = ['diagnostic_claimed', 'whatsapp_clicked', 'call_clicked'];
const FUNNEL_NAVCTA = ['proposal_requested'];

/* Umbrales del índice de salud. Por debajo NO se calcula. Son metas internas
   nuestras, no benchmarks de industria: no tenemos fuente de benchmark para
   este nicho y no la vamos a inventar. */
const HEALTH = {
  minClicks: 100,
  minBrowsers: 50,        // navegadores externos con evento, no "sesiones"
  targetCtr: 0.02,
  targetActivation: 0.25,
  targetConversion: 0.03, // leads / navegadores externos
};

/* Base mínima para imprimir un porcentaje. Por debajo se imprime el conteo
   crudo ("0 de 2"): un porcentaje sobre 2 clicks es ruido con formato de
   dato. Es más exigente que el umbral de 20 de fmtDelta a propósito, porque
   aquí el denominador son navegadores y ya viene inflado de por sí. */
const MIN_BASE_PCT = 30;

const FUNNEL_SQL = {
  // $1 inicio · $2 fin · $3 IPs internas · $4 session_id internos
  eventos: `
SELECT e.event_name,
  COUNT(*) FILTER (WHERE e.created_at >= ($1::date) AT TIME ZONE 'UTC'
                     AND e.created_at <  (($2::date) + 1) AT TIME ZONE 'UTC')::int AS eventos_mes,
  COUNT(DISTINCT e.session_id) FILTER (WHERE e.created_at >= ($1::date) AT TIME ZONE 'UTC'
                     AND e.created_at <  (($2::date) + 1) AT TIME ZONE 'UTC')::int AS navegadores_mes,
  COUNT(*)::int AS eventos_historico,
  MAX(e.created_at) AS ultimo
FROM events e
WHERE NOT (COALESCE(e.ip_address, '') = ANY ($3::text[]))
  AND NOT (COALESCE(e.session_id, '') = ANY ($4::text[]))
  AND COALESCE(e.properties ->> 'internal', '') <> 'true'
GROUP BY e.event_name
ORDER BY eventos_mes DESC, eventos_historico DESC, e.event_name`,

  // $5/$6/$7/$8 = listas de eventos por etapa
  embudo: `
WITH nav AS (
  SELECT COALESCE(e.session_id, '') AS session_id,
         COUNT(*)::int AS eventos,
         BOOL_OR(e.event_name = ANY ($5::text[])) AS intencion,
         BOOL_OR(e.event_name = ANY ($6::text[])) AS herramienta,
         BOOL_OR(e.event_name = ANY ($7::text[])) AS senal_contacto,
         BOOL_OR(e.event_name = ANY ($8::text[])) AS cta_nav
  FROM events e
  WHERE e.created_at >= ($1::date) AT TIME ZONE 'UTC'
    AND e.created_at <  (($2::date) + 1) AT TIME ZONE 'UTC'
    AND NOT (COALESCE(e.ip_address, '') = ANY ($3::text[]))
    AND NOT (COALESCE(e.session_id, '') = ANY ($4::text[]))
    AND COALESCE(e.properties ->> 'internal', '') <> 'true'
  GROUP BY 1
)
SELECT COUNT(*)::int AS navegadores,
       COALESCE(SUM(eventos), 0)::int AS eventos,
       COUNT(*) FILTER (WHERE intencion)::int AS con_intencion,
       COUNT(*) FILTER (WHERE herramienta)::int AS con_herramienta,
       COUNT(*) FILTER (WHERE senal_contacto)::int AS con_senal,
       COUNT(*) FILTER (WHERE cta_nav)::int AS con_cta_nav,
       COUNT(*) FILTER (WHERE session_id IN ('', 'anon'))::int AS sin_id
FROM nav`,

  /* Se devuelve la página CRUDA: la normalización la hace normalizePath en JS,
     que es el único normalizador del script. Un regexp_replace aquí sería un
     segundo normalizador con otro comportamiento (no baja a minúsculas ni
     colapsa barras dobles) y las tablas del reporte dejarían de cuadrar. */
  paginas: `
SELECT COALESCE(e.page, '') AS pagina,
       COUNT(*)::int AS eventos,
       COUNT(DISTINCT e.session_id)::int AS navegadores
FROM events e
WHERE e.created_at >= ($1::date) AT TIME ZONE 'UTC'
  AND e.created_at <  (($2::date) + 1) AT TIME ZONE 'UTC'
  AND NOT (COALESCE(e.ip_address, '') = ANY ($3::text[]))
  AND NOT (COALESCE(e.session_id, '') = ANY ($4::text[]))
  AND COALESCE(e.properties ->> 'internal', '') <> 'true'
GROUP BY 1
ORDER BY eventos DESC, pagina`,

  /* Orígenes distintos, SIN excluir internos, para poder decidir cuáles son
     nuestros. La IP se selecciona porque `--mostrar-ips` la imprime por
     consola, pero NUNCA se escribe en el Markdown ni se deriva de ella ningún
     identificador que sí se escriba: el reporte se comitea. */
  origenes: `
SELECT COUNT(*)::int AS eventos,
       COUNT(DISTINCT e.session_id)::int AS navegadores,
       COUNT(DISTINCT DATE(e.created_at AT TIME ZONE 'UTC'))::int AS dias_activos,
       MIN(e.created_at) AS primero,
       MAX(e.created_at) AS ultimo,
       MAX(COALESCE(e.ip_address, '')) AS ip_cruda
FROM events e
WHERE e.created_at >= ($1::date) AT TIME ZONE 'UTC'
  AND e.created_at <  (($2::date) + 1) AT TIME ZONE 'UTC'
GROUP BY COALESCE(e.ip_address, 'sin-ip')
ORDER BY eventos DESC
LIMIT 8`,

  leads: `
SELECT l.source,
  COUNT(*) FILTER (WHERE l.created_at >= ($1::date) AT TIME ZONE 'UTC'
                     AND l.created_at <  (($2::date) + 1) AT TIME ZONE 'UTC')::int AS mes,
  COUNT(*)::int AS historico,
  COUNT(*) FILTER (WHERE l.status <> 'archived')::int AS historico_activos,
  MAX(l.created_at) AS ultimo
FROM leads l
WHERE NOT (COALESCE(l.ip_address, '') = ANY ($3::text[]))
GROUP BY l.source
ORDER BY mes DESC, historico DESC, l.source`,

  diagnosticos: `
SELECT
  COUNT(*) FILTER (WHERE d.created_at >= ($1::date) AT TIME ZONE 'UTC'
                     AND d.created_at <  (($2::date) + 1) AT TIME ZONE 'UTC')::int AS mes,
  COUNT(*) FILTER (WHERE d.created_at >= ($1::date) AT TIME ZONE 'UTC'
                     AND d.created_at <  (($2::date) + 1) AT TIME ZONE 'UTC'
                     AND d.lead_ref IS NOT NULL)::int AS mes_reclamados,
  COUNT(*)::int AS historico,
  COUNT(*) FILTER (WHERE d.lead_ref IS NOT NULL)::int AS historico_reclamados,
  MAX(d.created_at) AS ultimo
FROM diagnostics d
WHERE NOT (COALESCE(d.ip_address, '') = ANY ($3::text[]))`,

  briefs: `
SELECT
  COUNT(*) FILTER (WHERE b.created_at >= ($1::date) AT TIME ZONE 'UTC'
                     AND b.created_at <  (($2::date) + 1) AT TIME ZONE 'UTC')::int AS mes,
  COUNT(*)::int AS historico,
  MAX(b.created_at) AS ultimo
FROM briefs b`,

  cadena: `
SELECT d.ref_id, d.created_at, d.lead_ref, l.status AS lead_status
FROM diagnostics d
LEFT JOIN leads l ON l.ref_id = d.lead_ref
WHERE d.lead_ref IS NOT NULL
  AND NOT (COALESCE(d.ip_address, '') = ANY ($3::text[]))
  AND d.created_at >= ($1::date) AT TIME ZONE 'UTC'
  AND d.created_at <  (($2::date) + 1) AT TIME ZONE 'UTC'
ORDER BY d.created_at`,
};

const envList = raw => String(raw || '').split(',').map(s => s.trim()).filter(Boolean);

/* Allowlist real de eventos, leído del código en cada run. Así el bloque de
   cobertura no se pudre cuando se agregue un evento nuevo. */
async function loadEventAllowlist() {
  try {
    const src = await fs.readFile(path.join(REPO_ROOT, 'api', 'events.mjs'), 'utf8');
    const block = src.match(/const EVENTS = new Set\(\[([\s\S]*?)\]\)/);
    if (!block) return null;
    const names = [...block[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
    return names.length ? names : null;
  } catch { return null; }
}

/* Cuenta en cuántos controles del sitio está cableado cada evento, leyendo
   src/ en cada run. Sin esto, un evento en cero es ambiguo y el reporte manda
   a "revisar el marcado" aunque el marcado esté perfecto. Con esto la
   distinción es un dato: cableado en 11 sitios y cero clics significa que
   nadie hizo clic; cableado en 0 significa que no se puede medir. */
async function countEventWiring() {
  const wiring = new Map();
  const walk = async (dir) => {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) { await walk(full); continue; }
      if (!/\.(astro|ts|js|svelte|mjs)$/.test(ent.name)) continue;
      let src;
      try { src = await fs.readFile(full, 'utf8'); } catch { continue; }
      for (const m of src.matchAll(/data-track=["']([a-z_]+)["']|\btrack\(\s*['"]([a-z_]+)['"]/g)) {
        const name = m[1] ?? m[2];
        wiring.set(name, (wiring.get(name) ?? 0) + 1);
      }
    }
  };
  try { await walk(path.join(REPO_ROOT, 'src')); } catch { return null; }
  return wiring.size ? wiring : null;
}

/* Devuelve los datos del embudo o null. NUNCA lanza: si Neon no responde, si
   falta la env o si falta una tabla, el reporte sigue sin esta sección. Cada
   consulta falla sola: si `briefs` no existiera, el resto se imprime igual. */
async function loadFunnelData({ startDate, endDate }) {
  const conn = process.env.POSTGRES_URL || process.env.DATABASE_URL
    || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL_UNPOOLED || '';
  if (!conn) {
    console.warn('• Embudo omitido: no hay POSTGRES_URL ni DATABASE_URL en el entorno.');
    return null;
  }
  let pool = null;
  try {
    const { createPool } = await import('@vercel/postgres'); // carga perezosa
    pool = createPool({ connectionString: conn });
    const ips = envList(process.env.MARCYAN_INTERNAL_IPS);
    const sids = envList(process.env.MARCYAN_INTERNAL_SIDS);
    const base = [startDate, endDate, ips, sids];
    const fallos = [];
    const run = async (nombre, texto, params) => {
      try { return (await pool.query(texto, params)).rows; }
      catch (e) { fallos.push(`${nombre}: ${e.message}`); return null; }
    };

    const eventos = await run('eventos', FUNNEL_SQL.eventos, base);
    const embudo = await run('embudo', FUNNEL_SQL.embudo, [...base, FUNNEL_INTENT, FUNNEL_TOOL, FUNNEL_SIGNAL, FUNNEL_NAVCTA]);
    const paginasRaw = await run('paginas', FUNNEL_SQL.paginas, base);
    const origenes = await run('origenes', FUNNEL_SQL.origenes, [startDate, endDate]);
    const leads = await run('leads', FUNNEL_SQL.leads, [startDate, endDate, ips]);
    const diagnosticos = await run('diagnosticos', FUNNEL_SQL.diagnosticos, [startDate, endDate, ips]);
    const briefs = await run('briefs', FUNNEL_SQL.briefs, [startDate, endDate]);
    const cadena = await run('cadena', FUNNEL_SQL.cadena, [startDate, endDate, ips]);

    if (fallos.length) console.warn(`⚠ Embudo: ${fallos.length} consulta(s) fallaron y su bloque se degrada. ${fallos.join(' · ')}`);
    if (![eventos, embudo, paginasRaw, origenes, leads, diagnosticos, briefs, cadena].some(Boolean)) return null;

    /* Normalización de las páginas en JS con el único normalizador del
       script, para que esta tabla colapse igual que la de Google. */
    let paginas = null;
    if (paginasRaw) {
      const byPath = new Map();
      for (const r of paginasRaw) {
        const p = normalizePath(r.pagina);
        const cur = byPath.get(p) ?? { pagina: p, eventos: 0, navegadores: 0 };
        cur.eventos += r.eventos;
        cur.navegadores += r.navegadores; // puede sobrecontar si un navegador toca las dos variantes
        byPath.set(p, cur);
      }
      paginas = [...byPath.values()].sort((a, b) => b.eventos - a.eventos).slice(0, 15);
    }

    return {
      eventos, paginas, origenes, leads, cadena,
      embudo: embudo?.[0] ?? null,
      diagnosticos: diagnosticos?.[0] ?? null,
      briefs: briefs?.[0] ?? null,
      exclusion: { ips: ips.length, sids: sids.length },
      allowlist: await loadEventAllowlist(),
      wiring: await countEventWiring(),
      fallos,
    };
  } catch (err) {
    console.warn(`⚠ Sección de embudo omitida (Neon no respondió): ${err.message}`);
    return null;
  } finally {
    try { await pool?.end(); } catch { /* cerrar el pool jamás rompe el run */ }
  }
}

/* Ayuda para identificar el tráfico interno. Las IPs salen SOLO por consola y
   solo con --mostrar-ips: el reporte se comitea, así que nunca entran ahí. */
function printInternalIpHints(funnel, mostrar) {
  if (!funnel?.origenes?.length) return;
  if (!mostrar) {
    console.log('• Para ver las IPs detrás de los orígenes del embudo: volver a correr con --mostrar-ips (no se escriben en el reporte).');
    return;
  }
  console.log('\nOrígenes del período (NO se escriben en el reporte):');
  funnel.origenes.forEach((o, i) => {
    console.log(`  Origen ${i + 1}  ${o.ip_cruda || 'sin ip'}  ${o.eventos} eventos · ${o.navegadores} navegadores · ${o.dias_activos} días`);
  });
  console.log('  Pegar las propias en MARCYAN_INTERNAL_IPS de .env.local, separadas por coma.\n');
}

const nfmt = v => Number(v ?? 0).toLocaleString('es');
const sd = v => (v == null ? 's/d' : nfmt(v));
const dia = v => (v ? new Date(v).toISOString().slice(0, 10) : 's/d');
const plural = (k, uno, varios) => `${nfmt(k)} ${Number(k) === 1 ? uno : varios}`;

/* Tasa honesta: sin base devuelve "sin base"; con base chica devuelve el
   conteo crudo en vez de un porcentaje que aparenta precisión. */
function tasa(num, den, minBase = MIN_BASE_PCT) {
  if (num == null || den == null) return 's/d';
  if (den === 0) return 'sin base';
  if (den < minBase) return `${nfmt(num)} de ${nfmt(den)}`;
  return `${((num / den) * 100).toFixed(2)}%`;
}

/* Regla de tres: con 0 éxitos en n intentos, el techo del intervalo de
   confianza al 95% es 3/n. Solo aplica con cero éxitos. */
function techo95(exitos, intentos) {
  if (!intentos || exitos > 0) return null;
  return Math.min(1, 3 / intentos);
}

/** Resumen de una línea del embudo, para el TL;DR. */
function funnelHeadline(funnel) {
  if (!funnel) return null;
  const e = funnel.embudo;
  const leadsMes = funnel.leads ? funnel.leads.reduce((a, r) => a + r.mes, 0) : null;
  const partes = [];
  if (e) partes.push(`${plural(e.navegadores, 'navegador con actividad', 'navegadores con actividad')} y ${plural(e.eventos, 'evento', 'eventos')}`);
  if (funnel.diagnosticos) partes.push(plural(funnel.diagnosticos.mes, 'diagnóstico', 'diagnósticos'));
  if (leadsMes != null) partes.push(plural(leadsMes, 'lead', 'leads'));
  const aviso = (funnel.exclusion.ips + funnel.exclusion.sids) === 0 ? ', sin excluir tráfico propio' : '';
  return partes.length ? `${partes.join(', ')}${aviso}` : null;
}

function buildFunnelSection({ funnel, gsc, range, mesTag }) {
  const L = [];
  L.push(`## 🔻 Embudo y conversión (datos propios)\n`);
  L.push(`Una sola pregunta: de las impresiones que Google nos da, cuántas se vuelven visitante que hace algo y cuántas se vuelven lead. Las etapas 3 a 8 salen de nuestra propia base en Neon (tablas \`events\`, \`diagnostics\`, \`leads\` y \`briefs\`), no de una herramienta de terceros.\n`);

  if (!funnel) {
    L.push(`> ⚠️ **Sección degradada.** No se pudo leer la base en este run (falta \`POSTGRES_URL\` o Neon no respondió). El resto del reporte no depende de esto. Sin la base solo tenemos el lado de Google: ${sd(gsc?.impressions)} impresiones y ${sd(gsc?.clicks)} clicks, sin saber en qué terminaron.\n`);
    return L;
  }

  const e = funnel.embudo;
  const navs = e?.navegadores ?? null;
  const leadsMes = funnel.leads ? funnel.leads.reduce((a, r) => a + r.mes, 0) : null;
  const leadsHist = funnel.leads ? funnel.leads.reduce((a, r) => a + r.historico, 0) : null;
  const briefsMes = funnel.briefs?.mes ?? null;

  L.push(`**Ventana:** ${range.startDate} a ${range.endDate} en los dos lados. Search Console publica con unos días de atraso, así que la consulta a Neon se recorta al mismo rango que Google alcanza a cubrir. Si no, se compararían menos días de búsqueda contra más días de base y el embudo se vería mejor de lo que es. Google cierra sus días en hora del Pacífico y nosotros en UTC, así que los bordes pueden moverse un día: se documenta, no se corrige.`);
  L.push(funnel.exclusion.ips || funnel.exclusion.sids
    ? `**Exclusión de tráfico interno:** activa (${funnel.exclusion.ips} IP y ${funnel.exclusion.sids} sesión en la lista). Aplica a \`events\`, \`leads\` y \`diagnostics\` (\`briefs\` no guarda IP).`
    : `**Exclusión de tráfico interno:** NO ACTIVA. No hay ninguna IP ni sesión en la lista, así que todo lo de abajo incluye nuestras propias visitas de desarrollo y prueba.`);
  L.push('');

  L.push(`### El embudo del período\n`);
  L.push(`| # | Etapa | Fuente | ${mesTag} | Sobre la etapa 3 |`);
  L.push(`|---|---|---|---|---|`);
  L.push(`|1|Impresiones en Google|GSC|${sd(gsc?.impressions)}|base|`);
  L.push(`|2|Clicks al sitio|GSC|${sd(gsc?.clicks)}|${tasa(gsc?.clicks, gsc?.impressions)} de las impresiones|`);
  L.push(`|3|Navegadores con al menos un evento|\`events\`|${sd(navs)}|no encadenable con la 2, ver abajo|`);
  L.push(`|4|Navegadores que abrieron una herramienta|\`events\`|${sd(e?.con_intencion)}|${tasa(e?.con_intencion, navs)}|`);
  L.push(`|5|Navegadores que completaron una herramienta|\`events\`|${sd(e?.con_herramienta)}|${tasa(e?.con_herramienta, navs)}|`);
  L.push(`|6|Navegadores con señal de contacto|\`events\`|${sd(e?.con_senal)}|${tasa(e?.con_senal, navs)}|`);
  L.push(`|6b|Navegadores que clicaron el CTA de la barra|\`events\`|${sd(e?.con_cta_nav)}|${tasa(e?.con_cta_nav, navs)}|`);
  L.push(`|7|Leads creados|\`leads\`|${sd(leadsMes)}|no atribuible|`);
  L.push(`|8|Briefs de proyecto|\`briefs\`|${sd(briefsMes)}|no atribuible|`);
  L.push('');
  L.push(`> **Qué contamos como "navegador".** Es el \`mrc_sid\`: un UUID que \`src/lib/track.js\` guarda en localStorage la primera vez y que no caduca nunca. No es una sesión ni una visita. Un mismo navegador que vuelve diez veces en el período cuenta una. Eso lo convierte a la vez en un piso (el cubo vacío y \`anon\` juntan a varias personas en una fila) y en un denominador optimista: menos "navegadores" con los mismos leads da un porcentaje de conversión más alto del real.`);
  L.push(`> **Las etapas 4, 5 y 6 no están anidadas.** Son banderas independientes por navegador: uno puede dar señal de contacto sin haber tocado ninguna herramienta. Por eso la 6 puede salir mayor que la 5, y por eso cada tasa se calcula contra la etapa 3 y no contra la fila de arriba.`);
  L.push(`> **Etapa 4** = ${FUNNEL_INTENT.map(x => `\`${x}\``).join(', ')}. **Etapa 5** = ${FUNNEL_TOOL.map(x => `\`${x}\``).join(', ')}. **Etapa 6** = ${FUNNEL_SIGNAL.map(x => `\`${x}\``).join(', ')}. **Etapa 6b** = ${FUNNEL_NAVCTA.map(x => `\`${x}\``).join(', ')}, que va aparte porque se dispara desde el botón "Propuesta gratis" de la barra de navegación, presente en todas las páginas, y solo hace scroll al ancla de contacto. Es un clic de navegación, no una señal de contacto: sumarlo a la etapa 6 la inflaría con gente que solo pasó por la barra.`);
  L.push(`> **Etapas 7 y 8 sin tasa.** \`leads\` y \`briefs\` no guardan el identificador del navegador, así que un lead no se puede atribuir a la actividad que lo produjo. Poner un porcentaje ahí sería construir una atribución que no existe.`);
  L.push(`> \`diagnostic_step\` no pertenece a ninguna etapa: mide profundidad dentro del asistente, no avance por el embudo. Aparece en la tabla de instrumentación de abajo.`);
  L.push(`> Las tasas solo se imprimen como porcentaje cuando la base pasa de ${MIN_BASE_PCT}. Con base menor se muestra el conteo crudo ("0 de 6"): un porcentaje sobre 2 clicks es ruido con formato de dato.`);
  if (e?.sin_id) {
    L.push(`> ⚠️ ${plural(e.sin_id, 'navegador cayó', 'navegadores cayeron')} en el cubo vacío o \`anon\` (\`src/lib/track.js\` usa \`anon\` cuando localStorage está bloqueado). Ese cubo junta a varias personas en una sola fila.`);
  }
  L.push('');

  L.push(`### ⚠️ El puente entre la etapa 2 y la 3 no está medido\n`);
  if (gsc?.clicks != null && navs != null) {
    L.push(navs > gsc.clicks
      ? `Google reportó ${nfmt(gsc.clicks)} clicks y nosotros registramos ${nfmt(navs)} navegadores con actividad. La aritmética sola ya dice que la mayoría de esa actividad no llegó por búsqueda.\n`
      : `Google reportó ${nfmt(gsc.clicks)} clicks y registramos ${nfmt(navs)} navegadores con actividad. Aun así las dos cifras no se pueden encadenar.\n`);
  }
  L.push(`Tres razones concretas, todas del diseño actual del tracking:\n`);
  L.push(`1. \`events\` no guarda referrer ni parámetros de campaña. Un navegador no sabe de dónde vino, así que su actividad no se puede atribuir a un click de Google. Arreglo conocido y barato: \`events.properties\` ya es JSONB, así que \`src/lib/track.js\` podría mandar \`props.ref = document.referrer\` sin migración ninguna.`);
  L.push(`2. No existe evento de vista de página. El allowlist de \`api/events.mjs\` solo acepta interacciones, así que "navegadores con evento" no es "visitantes": quien entró y se fue sin tocar nada no aparece en esta tabla. **El total de visitantes no está medido en este reporte.** La única fuente que lo tiene es GA4 y este script no la consulta.`);
  L.push(`3. \`leads\` no guarda el identificador del navegador, así que un lead tampoco se puede atribuir a la actividad que lo produjo.\n`);
  L.push(`Lo único atribuible de punta a punta que existe hoy en la base es la cadena diagnóstico a lead: \`diagnostics.lead_ref\` apunta al \`LEAD-XXX\` que se creó al reclamar el reporte.\n`);

  if (funnel.paginas?.length) {
    L.push(`### Dónde pasó (páginas con actividad)\n`);
    L.push(`| Página | Eventos | Navegadores |`);
    L.push(`|---|---|---|`);
    for (const p of funnel.paginas) L.push(`|\`${p.pagina}\`|${nfmt(p.eventos)}|${nfmt(p.navegadores)}|`);
    if (e) L.push(`|**Total**|**${nfmt(e.eventos)}**|**${nfmt(e.navegadores)}**|`);
    L.push('');
    L.push(`> Las rutas se agrupan con el mismo normalizador que la tabla de páginas de Google, así que la barra final y los parámetros colapsan igual en las dos. La suma de la columna de navegadores puede superar el total: uno que toca dos páginas cuenta en las dos.\n`);
  }

  if (funnel.eventos) {
    const vistos = new Map(funnel.eventos.map(r => [r.event_name, r]));
    const nombres = funnel.allowlist ? [...new Set([...funnel.allowlist, ...vistos.keys()])] : [...vistos.keys()];
    L.push(`### Cobertura de instrumentación\n`);
    L.push(funnel.allowlist
      ? `El allowlist de \`api/events.mjs\` se lee del código en cada run, no se copia a mano.${funnel.wiring ? ' La columna "Controles" cuenta en cuántos sitios de `src/` está cableado cada evento, también leyendo el código: así un cero deja de ser ambiguo.' : ''}\n`
      : `> ⚠️ No se pudo leer el allowlist de \`api/events.mjs\`. Abajo solo aparecen los eventos que sí llegaron a la base, sin poder marcar los que faltan.\n`);
    const wcol = funnel.wiring ? ' Controles |' : '';
    L.push(`| Evento | ${mesTag} | Histórico | Último |${wcol} Estado |`);
    L.push(`|---|---|---|---|${funnel.wiring ? '---|' : ''}---|`);
    let totalMes = 0, totalHist = 0;
    const orden = [...nombres].sort((a, b) => (vistos.get(b)?.eventos_historico ?? 0) - (vistos.get(a)?.eventos_historico ?? 0));
    for (const nombre of orden) {
      const r = vistos.get(nombre);
      const enAllowlist = !funnel.allowlist || funnel.allowlist.includes(nombre);
      const cableado = funnel.wiring?.get(nombre) ?? 0;
      totalMes += r?.eventos_mes ?? 0;
      totalHist += r?.eventos_historico ?? 0;
      let estado;
      if (!enAllowlist) estado = '⚠️ fuera del allowlist actual';
      else if (r) estado = 'activo';
      else if (funnel.wiring && cableado === 0) estado = '🔴 **sin cablear**';
      else estado = 'cableado, sin registros';
      const wcell = funnel.wiring ? `${cableado}|` : '';
      L.push(`|\`${nombre}\`|${nfmt(r?.eventos_mes ?? 0)}|${nfmt(r?.eventos_historico ?? 0)}|${dia(r?.ultimo)}|${wcell}${estado}|`);
    }
    L.push(`|**Total**|**${nfmt(totalMes)}**|**${nfmt(totalHist)}**||${funnel.wiring ? '|' : ''}|`);
    L.push('');
    const mudos = orden.filter(x => !vistos.has(x));
    if (mudos.length) {
      const sinCablear = funnel.wiring ? mudos.filter(x => (funnel.wiring.get(x) ?? 0) === 0) : [];
      const cableados = mudos.filter(x => !sinCablear.includes(x));
      if (cableados.length) {
        L.push(`> ${cableados.map(x => `\`${x}\``).join(', ')} ${cableados.length === 1 ? 'está cableado' : 'están cableados'} en el sitio (${cableados.map(x => `${x}: ${funnel.wiring?.get(x) ?? '?'}`).join(', ')} controles) y aun así ${cableados.length === 1 ? 'no tiene' : 'no tienen'} ni un registro. Con este volumen de clicks orgánicos, cero es el resultado esperable: significa que nadie hizo clic, no que falte marcado.`);
      }
      if (sinCablear.length) {
        L.push(`> 🔴 ${sinCablear.map(x => `\`${x}\``).join(', ')} ${sinCablear.length === 1 ? 'está en el allowlist y no aparece cableado' : 'están en el allowlist y no aparecen cableados'} en ningún control de \`src/\`. Eso no se puede medir hasta que se cablee.`);
      }
      L.push('');
    }
  }

  L.push(`### Tráfico interno: hoy no se excluye\n`);
  if (funnel.origenes?.length) {
    L.push(`| Origen | Eventos | Navegadores | Días activos | Primero | Último |`);
    L.push(`|---|---|---|---|---|---|`);
    funnel.origenes.forEach((o, i) => {
      L.push(`|Origen ${i + 1}|${nfmt(o.eventos)}|${nfmt(o.navegadores)}|${nfmt(o.dias_activos)}|${dia(o.primero)}|${dia(o.ultimo)}|`);
    });
    L.push('');
    L.push(`> Los orígenes van numerados por volumen dentro de este reporte y nada más: no llevan IP ni ningún identificador derivado de ella, porque este archivo se comitea. La numeración no se conserva entre meses. Para ver qué IP hay detrás de cada uno, correr el script con \`--mostrar-ips\`: sale solo por consola.\n`);
  }
  L.push(`Un origen con muchos días activos y muchos eventos por navegador es, casi seguro, nuestro. Cómo excluirlo de verdad, en orden de esfuerzo:\n`);
  L.push(`1. **Ahora, sin tocar el sitio:** poner nuestras IPs en \`MARCYAN_INTERNAL_IPS\` de \`.env.local\`, separadas por coma. El reporte las descuenta de \`events\` en el próximo run. Límite honesto: la IP residencial rota, así que esta lista se desactualiza sola y hay que revisarla.`);
  L.push(`2. **Estable, con un cambio chico en el sitio:** marcar el navegador una vez con \`?mrc_internal=1\`, guardar la marca en localStorage junto al \`mrc_sid\` y que \`src/lib/track.js\` mande \`props.internal = true\`. No hace falta migración: \`events.properties\` ya es JSONB y las consultas de esta sección ya filtran por ahí. Sobrevive al cambio de IP y de red.`);
  L.push(`3. **Complemento:** fijar los \`mrc_sid\` de nuestros navegadores habituales en \`MARCYAN_INTERNAL_SIDS\`. Barato, pero se pierde al limpiar el navegador.\n`);
  L.push(`Hasta que 1 o 2 estén activos, las cifras de las etapas 3 a 6 incluyen nuestro propio uso y no sirven para decidir nada.\n`);

  L.push(`### Contexto histórico\n`);
  L.push(`| Tabla | ${mesTag} | Histórico | Último registro |`);
  L.push(`|---|---|---|---|`);
  if (e) {
    const histEventos = funnel.eventos?.reduce((a, r) => a + r.eventos_historico, 0);
    const ultimoEvento = funnel.eventos?.reduce((mx, r) => (!mx || r.ultimo > mx ? r.ultimo : mx), null);
    L.push(`|\`events\`|${nfmt(e.eventos)} eventos y ${nfmt(e.navegadores)} navegadores|${sd(histEventos)} eventos|${dia(ultimoEvento)}|`);
  }
  if (funnel.diagnosticos) {
    L.push(`|\`diagnostics\`|${nfmt(funnel.diagnosticos.mes)} (${plural(funnel.diagnosticos.mes_reclamados, 'reclamado', 'reclamados')})|${nfmt(funnel.diagnosticos.historico)} (${plural(funnel.diagnosticos.historico_reclamados, 'reclamado', 'reclamados')})|${dia(funnel.diagnosticos.ultimo)}|`);
  }
  if (funnel.leads) {
    const detalle = funnel.leads.map(r => `${nfmt(r.historico)} ${r.source}`).join(', ');
    const activos = funnel.leads.reduce((a, r) => a + r.historico_activos, 0);
    const ultimo = funnel.leads.reduce((mx, r) => (!mx || r.ultimo > mx ? r.ultimo : mx), null);
    L.push(`|\`leads\`|${nfmt(leadsMes)}|${nfmt(leadsHist)} (${detalle}) y ${nfmt(activos)} sin archivar|${dia(ultimo)}|`);
  }
  if (funnel.briefs) L.push(`|\`briefs\`|${nfmt(funnel.briefs.mes)}|${nfmt(funnel.briefs.historico)}|${dia(funnel.briefs.ultimo)}|`);
  L.push('');
  if (funnel.cadena) {
    L.push(funnel.cadena.length
      ? `Cadena diagnóstico a lead en el período: ${funnel.cadena.map(c => `\`${c.ref_id}\` → \`${c.lead_ref}\` (${c.lead_status ?? 'lead no encontrado'})`).join(' · ')}.\n`
      : `Cadena diagnóstico a lead en el período: ninguna. Nadie reclamó su reporte.\n`);
  }

  L.push(`### Índice de salud del embudo\n`);
  const clicks = gsc?.clicks ?? 0;
  const suficiente = clicks >= HEALTH.minClicks && (navs ?? 0) >= HEALTH.minBrowsers && (funnel.exclusion.ips + funnel.exclusion.sids) > 0;
  if (!suficiente) {
    L.push(`**No se calcula.** Con ${nfmt(clicks)} clicks y ${sd(navs)} navegadores cualquier índice sería una opinión con dos decimales.\n`);
    const techo = techo95(leadsMes ?? 0, navs ?? 0);
    if (techo != null) {
      L.push(`Cuánto de ruido hay: con ${nfmt(navs)} navegadores y ningún lead, la regla de tres (3/n, el techo del intervalo de confianza al 95% cuando no hubo ningún éxito) dice que lo único afirmable es que la tasa real de conversión está por debajo de ${(techo * 100).toFixed(0)}%. Eso no distingue un embudo excelente de uno roto.\n`);
    }
    L.push(`Umbral para empezar a calcularlo, los tres a la vez y dos meses seguidos (uno para el valor, otro para la tendencia):`);
    L.push(`- ${HEALTH.minClicks} clicks orgánicos en el mes. Hoy: ${nfmt(clicks)}.`);
    L.push(`- ${HEALTH.minBrowsers} navegadores externos con evento en el mes. Hoy: ${sd(navs)}${(funnel.exclusion.ips + funnel.exclusion.sids) === 0 ? ', sin excluir tráfico interno' : ''}.`);
    L.push(`- Exclusión de tráfico interno activa. Hoy: ${(funnel.exclusion.ips + funnel.exclusion.sids) > 0 ? 'sí' : 'no'}.\n`);
    L.push(`Fórmula que se activará cuando se llegue, escrita ahora para que no se invente después:`);
    L.push(`- CTR orgánico = clicks / impresiones, meta ${(HEALTH.targetCtr * 100).toFixed(0)}%`);
    L.push(`- Activación = navegadores con intención / clicks, meta ${(HEALTH.targetActivation * 100).toFixed(0)}%`);
    L.push(`- Conversión = leads / navegadores externos, meta ${(HEALTH.targetConversion * 100).toFixed(0)}%`);
    L.push(`- Índice = el MENOR de los tres, cada uno normalizado como min(100, 100 × valor / meta). Se toma el menor y no el promedio porque un embudo vale lo que vale su tramo más débil, y un promedio esconde un cero.`);
    L.push(`- Las tres metas son objetivos internos nuestros, no benchmarks de industria. No tenemos una fuente de benchmark para este nicho y no la vamos a inventar.\n`);
  } else {
    const partes = [
      { k: 'CTR orgánico', v: clicks / gsc.impressions, meta: HEALTH.targetCtr },
      { k: 'Activación', v: (e?.con_intencion ?? 0) / clicks, meta: HEALTH.targetActivation },
      { k: 'Conversión', v: (leadsMes ?? 0) / navs, meta: HEALTH.targetConversion },
    ].map(p => ({ ...p, score: Math.min(100, Math.round((p.v / p.meta) * 100)) }));
    const indice = Math.min(...partes.map(p => p.score));
    L.push(`**${indice} / 100** (el menor de los tres tramos, no el promedio).\n`);
    L.push(`| Tramo | Valor | Meta interna | Puntaje |`);
    L.push(`|---|---|---|---|`);
    for (const p of partes) L.push(`|${p.k}|${(p.v * 100).toFixed(2)}%|${(p.meta * 100).toFixed(0)}%|${p.score}|`);
    L.push('');
    L.push(`> Las metas son objetivos internos nuestros, no benchmarks de industria.\n`);
  }

  if (funnel.fallos?.length) {
    L.push(`> ⚠️ ${funnel.fallos.length} consulta(s) de esta sección fallaron y su bloque quedó incompleto: ${funnel.fallos.map(f => `\`${f}\``).join(' · ')}.\n`);
  }
  return L;
}

// ═══════════════════════════════════════════════════════════════════════
// ENSAMBLADO DEL REPORTE
// ═══════════════════════════════════════════════════════════════════════
function buildReport(ctx) {
  const {
    tag, range, keywordRows, priorMonthRows, pageRows, summary, alerts,
    cohorts, striking, market, funnelSection, hasFunnel, config, allPages, allQueries,
  } = ctx;
  const priorByQuery = Object.fromEntries(priorMonthRows.map(r => [r.query, r]));
  const L = [];

  L.push(`# 📊 Reporte SEO Mensual — ${tag}${range.partial ? ' (parcial)' : ''}\n`);
  L.push(`**Período:** ${range.startDate} → ${range.endDate}${range.partial ? ` · **mes en curso**, el mes cierra el ${range.monthEndDate}` : ''}`);
  L.push(`**Sitio:** ${SITE_HOST}`);
  L.push(`**Fuente:** Google Search Console API (datos oficiales de Google)${hasFunnel ? ' más la base de datos propia (Neon)' : ''}`);
  L.push(`**Generado:** ${new Date().toISOString()} · rutina \`marcyan-monthly-seo-report\`\n`);
  if (range.partial) {
    L.push(`> ⚠️ **Reporte parcial.** Cubre ${summary.daysWithData} días del mes, no el mes entero. Search Console publica con unos 2 días de retraso, así que el último día disponible es ${summary.lastDayWithData ?? range.endDate}. Las cifras NO son comparables con un mes completo. El reporte definitivo de ${tag} se regenera solo el día 4 del mes siguiente y sustituye a este.\n`);
  }
  L.push(`---\n`);

  // ── TL;DR ──
  L.push(`## 🎯 TL;DR\n`);
  L.push(`- **${summary.impressions.toLocaleString('es')} impresiones** (${summary.deltaImpressions})`);
  L.push(`- **${summary.clicks.toLocaleString('es')} clicks** (${summary.deltaClicks})`);
  L.push(`- **CTR:** ${pct(summary.ctr, 2)} (${summary.deltaCtr})`);
  L.push(`- **Posición promedio:** ${summary.position.toFixed(1)} (${summary.deltaPosition})`);
  L.push(`- **Páginas con impresiones:** ${summary.pagesWithImpr}${summary.sitemapTotal ? ` de ${summary.sitemapTotal} en el sitemap` : ''}`);
  L.push(`- **Consultas distintas:** ${summary.queryCount}`);
  if (summary.brandSplit) {
    const b = summary.brandSplit.brand, n = summary.brandSplit.nonBrand;
    L.push(`- **Marca contra no marca:** marca ${b.impressions.toLocaleString('es')} impresiones y ${b.clicks} clicks, no marca ${n.impressions.toLocaleString('es')} impresiones y ${n.clicks} clicks`);
  }
  if (summary.strikingCount) {
    L.push(`- **A tiro de página 1:** ${summary.strikingCount} consultas entre la posición 4 y la 20 con volumen suficiente`);
  }
  if (summary.funnelHeadline) {
    L.push(`- **Embudo propio:** ${summary.funnelHeadline}`);
  }
  L.push(alerts.length === 0 ? `- Sin alertas críticas ✅\n` : `- **${alerts.length} alertas** — ver la sección de abajo\n`);
  L.push(`---\n`);

  // ── keywords trackeadas ──
  L.push(`## 📈 Posicionamiento de las palabras clave que seguimos\n`);
  L.push(`${config.keywords.length} consultas objetivo definidas en \`scripts/tracked-keywords.json\`, agrupadas por dificultad. "Sin datos" quiere decir que Google no nos mostró ni una vez para esa consulta en el período, no que estemos en el puesto 100.\n`);
  const TIERS = {
    P0: '🟢 P0 — alcanzables en 60 a 90 días (long tail, hispano local, nicho)',
    P1: '🟡 P1 — competitivas, alcanzables en 90 a 180 días',
    P2: '🔴 P2 — aspiracionales contra agencias establecidas y directorios',
  };
  for (const tier of ['P0', 'P1', 'P2']) {
    const rows = keywordRows.filter(r => r.tier === tier);
    if (!rows.length) continue;
    L.push(`### ${TIERS[tier]}\n`);
    L.push(`| Palabra clave | Mes anterior | Este período | Δ | Impr | Clicks | CTR | Confianza | Página real | Página esperada |`);
    L.push(`|---|---|---|---|---|---|---|---|---|---|`);
    const sorted = [...rows].sort((a, b) => b.impressions - a.impressions);
    for (const r of sorted) {
      const prior = priorByQuery[r.query]?.position;
      /* Marca la landing que Google todavía no puede mostrar. Sin esto, la
         fila se lee como "no posicionamos" cuando en realidad la página ni
         siquiera está en el índice: son dos problemas distintos con dos
         arreglos distintos. */
      const expected = r._expectedLive === false ? `\`${r.expectedPath}\` ⛔` : `\`${r.expectedPath}\``;
      L.push(['', r.query, fmtPos(prior), fmtPos(r.position), trendArrow(prior, r.position),
        r.impressions, r.clicks, pct(r.ctr), confidence(r.impressions),
        r.topPage ? `\`${normalizePath(r.topPage)}\`` : '—', expected, ''].join('|'));
    }
    L.push('');
  }
  L.push(`> **Confianza** = volumen de impresiones que respalda la fila: baja (menos de 20), media (20 a 99), alta (100 o más). No tomar decisiones de contenido sobre filas de confianza baja.`);
  L.push(`> **Página real contra esperada.** Si no coinciden, Google eligió otra página nuestra para esa consulta. No siempre es malo, pero conviene revisar si la página que queríamos tiene un problema de relevancia o de enlazado interno.`);
  L.push(`> **El símbolo ⛔** marca una página esperada que Google todavía no puede mostrar (descubierta sin rastrear, rastreada sin indexar o desconocida). Esas filas salen sin posición por un problema de INDEXACIÓN, no de posicionamiento. No se arreglan escribiendo mejor contenido, se arreglan consiguiendo que Google entre.\n`);

  // ── striking distance ──
  if (striking) L.push(...striking);

  // ── inventario completo de páginas ──
  if (allPages) L.push(...allPages);
  L.push(`> **Nota metodológica de las dos tablas de arriba.** Las filas están agregadas por ruta canónica: Search Console devuelve por separado la misma página con y sin barra final y con parámetros UTM, y aquí se suman${summary.collapsedVariants ? ` (este período se fusionaron ${summary.collapsedVariants} variantes)` : ''}. La posición es el promedio ponderado por impresiones.`);
  L.push(`> La suma de impresiones por página puede superar el total del TL;DR y eso NO es un error: la API deduplica a nivel de sitio (una búsqueda donde salen dos URLs nuestras cuenta como una impresión de sitio) pero cuenta una por cada URL en la vista por página. Comportamiento documentado de Search Console.\n`);

  // ── inventario completo de consultas ──
  if (allQueries) L.push(...allQueries);

  // ── cohortes ──
  if (cohorts) L.push(...cohorts);

  // ── mercado ──
  if (market) L.push(...market);

  // ── embudo ──
  if (funnelSection) L.push(...funnelSection);

  // ── alertas ──
  L.push(`## ⚠️ Alertas y contexto\n`);
  if (alerts.length === 0) {
    L.push(`Sin alertas este período.\n`);
  } else {
    for (const a of alerts) L.push(`- **${a.severity}** ${a.text}`);
    L.push('');
    L.push(`> 🔴 requiere acción · 🟡 vigilar · 🔵 informativo · 💡 oportunidad detectada\n`);
  }

  // ── datos brutos ──
  L.push(`## 📁 Datos brutos y metodología\n`);
  L.push('- `data/rank-tracking.csv` — histórico de posiciones por palabra clave y mes');
  L.push('- `data/page-impressions.csv` — histórico de impresiones y clicks por página y mes');
  L.push('- `data/indexing-status.json` — estado de indexación por URL, del sweep diario');
  L.push('- `scripts/tracked-keywords.json` — las palabras clave objetivo, se edita a mano\n');
  L.push(`**Qué NO mide este reporte.** Search Console solo ve nuestro propio sitio. No hay datos de competidores, de volumen de búsqueda absoluto ni de quién ocupa los puestos por delante nuestro. Lo que aparece como "mercado" son inferencias sobre nuestra propia posición, señaladas como tales.\n`);
  L.push(`---\n`);
  L.push(`> Generado por \`scripts/track-rankings.mjs\` desde la rutina \`marcyan-monthly-seo-report\`.`);
  L.push(`> Próximo reporte automático: día 4 del mes siguiente, 08:12 local.`);

  return L.join('\n') + '\n';
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════
async function main() {
  const clientId = process.env.GSC_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    die(1, 'Faltan variables OAuth. Se necesitan GSC_OAUTH_CLIENT_ID, GSC_OAUTH_CLIENT_SECRET y GSC_OAUTH_REFRESH_TOKEN en .env.local (mismo OAuth que MJA y TRR).');
  }

  const config = await loadConfig();
  const SITE = config.siteUrl;

  console.log(`▶ Search Console: ${SITE}`);
  console.log(`  Ventana: ${target.startDate} → ${target.endDate}${target.partial ? ' (mes en curso, parcial)' : ''}`);

  const token = await getAccessToken({ clientId, clientSecret, refreshToken });
  console.log('✓ Auth OK');

  const base = { startDate: target.startDate, endDate: target.endDate };

  // Consulta + página: alimenta keywords, striking distance y marca/no marca.
  const queryPageRows = await gscQuery(token, SITE, { ...base, dimensions: ['query', 'page'], rowLimit: 25000 });
  // Solo consulta: el conteo honesto de consultas distintas (la vista
  // consulta+página infla el conteo cuando dos URLs salen para lo mismo).
  const queryRows = await gscQuery(token, SITE, { ...base, dimensions: ['query'], rowLimit: 25000 });
  const rawPageRows = await gscQuery(token, SITE, { ...base, dimensions: ['page'], rowLimit: 5000 });
  const totalsRow = await gscQuery(token, SITE, { ...base, dimensions: [], rowLimit: 1 });
  const dateRows = await gscQuery(token, SITE, { ...base, dimensions: ['date'], rowLimit: 400 });
  const countries = await gscQuery(token, SITE, { ...base, dimensions: ['country'], rowLimit: 50 });
  const devices = await gscQuery(token, SITE, { ...base, dimensions: ['device'], rowLimit: 10 });
  console.log(`✓ ${queryPageRows.length} filas consulta+página · ${rawPageRows.length} filas página · ${dateRows.length} días con datos`);

  const totals = totalsRow[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  /* Baseline del mes anterior directo de la API, no del CSV. El CSV solo
     cubre las palabras clave que seguimos, así que compararlo con el total
     del sitio fabricaba subidas de fantasía (le pasó a MJA). GSC guarda 16
     meses: la comparación honesta cuesta una llamada más y no guarda estado.
     Para un mes parcial comparamos contra los MISMOS días del mes anterior,
     que si no comparamos 17 días contra 31. */
  const [ty, tm] = target.tag.split('-').map(Number);
  const prevY = tm === 1 ? ty - 1 : ty;
  const prevM = tm === 1 ? 12 : tm - 1;
  const prevMonthLastDay = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate();
  const prevStart = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
  const daysCovered = Number(target.endDate.split('-')[2]);
  const prevEndDay = target.partial ? Math.min(daysCovered, prevMonthLastDay) : prevMonthLastDay;
  const prevEnd = `${prevY}-${String(prevM).padStart(2, '0')}-${String(prevEndDay).padStart(2, '0')}`;
  const prevTotalsRow = await gscQuery(token, SITE, { startDate: prevStart, endDate: prevEnd, dimensions: [], rowLimit: 1 });
  const prevSiteTotals = prevTotalsRow[0] && prevTotalsRow[0].impressions > 0 ? prevTotalsRow[0] : null;

  /* Palabras clave objetivo. Métricas de queryRows (dimensión consulta sola,
     que es la cifra real) y página de queryPageRows. Sumar las filas de
     consulta+página aquí inflaría impresiones y posición respecto de la
     sección de mercado, que sí usa la vista limpia. */
  const queryByName = new Map(queryRows.map(r => [r.keys[0].toLowerCase(), r]));
  const topPageByQuery = new Map();
  for (const r of queryPageRows) {
    const q = r.keys[0].toLowerCase();
    const cur = topPageByQuery.get(q);
    if (!cur || r.impressions > cur.impressions) topPageByQuery.set(q, { page: r.keys[1], impressions: r.impressions });
  }
  const keywordRows = config.keywords.map(k => {
    const key = k.query.toLowerCase();
    const r = queryByName.get(key);
    if (!r) return { ...k, impressions: 0, clicks: 0, ctr: 0, position: null, topPage: null };
    return {
      ...k,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.impressions ? r.clicks / r.impressions : 0,
      position: r.position,
      topPage: topPageByQuery.get(key)?.page ?? null,
    };
  });

  // ── páginas agregadas por ruta canónica ──
  const { pages: topPages, collapsed } = aggregateByPath(rawPageRows);

  // ── striking distance ──
  const MIN_STRIKING_IMPR = 3;
  const strikingData = buildStrikingDistance(queryRows, queryPageRows, { minImpressions: MIN_STRIKING_IMPR, limit: 15 });

  // ── marca vs no marca ──
  const BRAND_RE = /marcyan|marcy\s*an|marcyanstudio/i;
  const brandSplit = { brand: { impressions: 0, clicks: 0 }, nonBrand: { impressions: 0, clicks: 0 } };
  for (const r of queryRows) {
    const b = BRAND_RE.test(r.keys[0]) ? brandSplit.brand : brandSplit.nonBrand;
    b.impressions += r.impressions;
    b.clicks += r.clicks;
  }

  // ── histórico para deltas por palabra clave ──
  const priorRows = await loadCsvRows(path.join(REPO_ROOT, 'data', 'rank-tracking.csv'));
  const otherMonths = priorRows.filter(r => r.month !== target.tag);
  const lastMonthTag = otherMonths.length ? otherMonths.reduce((mx, r) => (r.month > mx ? r.month : mx), '0000-00') : null;
  const priorMonthRows = lastMonthTag ? otherMonths.filter(r => r.month === lastMonthTag) : [];

  /* Posición previa por palabra clave, solo cuando existe de verdad. El CSV
     guarda '' cuando no hubo dato y Number('') es 0, lo que fabricaba caídas
     falsas del tipo "cayó 63,6 posiciones (0 → 63,6)". Una palabra clave sin
     baseline es nueva, no una caída. */
  const priorPosByQuery = Object.fromEntries(
    priorMonthRows
      .filter(r => r.position !== '' && !isNaN(Number(r.position)) && Number(r.position) > 0)
      .map(r => [r.query, Number(r.position)]),
  );
  for (const k of keywordRows) k._priorPosition = priorPosByQuery[k.query] ?? null;

  // ── indexación ──
  const indexingStatus = await loadIndexingStatus();
  const sitemapTotal = indexingStatus ? (Object.keys(indexingStatus.urls ?? {}).length || null) : null;

  /* Estado de indexación de cada página esperada. Sirve para no leer mal la
     tabla: una palabra clave sin posición cuya landing Google todavía no ha
     indexado NO es un fallo de posicionamiento, es un fallo de indexación, y
     se arregla de otra manera. */
  const coverageByPath = new Map(
    Object.entries(indexingStatus?.urls ?? {}).map(([u, i]) => [normalizePath(u), i?.coverageState ?? null]),
  );
  for (const k of keywordRows) {
    const state = coverageByPath.get(normalizePath(k.expectedPath)) ?? null;
    k._expectedCoverage = state;
    k._expectedLive = state == null ? null : COVERAGE_LIVE.has(state);
  }

  const summary = {
    impressions: totals.impressions,
    clicks: totals.clicks,
    ctr: totals.ctr,
    position: totals.position,
    pagesWithImpr: topPages.length,
    queryCount: queryRows.length,
    collapsedVariants: collapsed,
    daysWithData: dateRows.length,
    lastDayWithData: dateRows.length ? dateRows[dateRows.length - 1].keys[0] : null,
    sitemapTotal,
    strikingCount: strikingData.candidates.length,
    brandSplit,
    deltaImpressions: prevSiteTotals ? fmtDelta(totals.impressions, prevSiteTotals.impressions) : 'mes cero, sin baseline',
    deltaClicks: prevSiteTotals ? fmtDelta(totals.clicks, prevSiteTotals.clicks) : 'mes cero, sin baseline',
    deltaCtr: prevSiteTotals ? `período anterior ${pct(prevSiteTotals.ctr, 2)} → ${pct(totals.ctr, 2)}` : 'hace falta un período anterior para comparar',
    deltaPosition: prevSiteTotals
      ? `período anterior ${prevSiteTotals.position.toFixed(1)} → ${totals.position.toFixed(1)}${totals.position < prevSiteTotals.position ? ' · mejora ✅' : totals.position > prevSiteTotals.position ? ' · retrocede ⚠️' : ''}`
      : 'hace falta un período anterior para comparar',
    prevComparisonRange: prevSiteTotals ? `${prevStart} → ${prevEnd}` : null,
  };

  // ── secciones modulares ──
  const cohorts = indexingStatus || topPages.length
    ? buildCohortSection({
        ...buildCohortStats({ indexingUrls: indexingStatus?.urls ?? {}, pageRows: topPages }),
        lastFullCheck: indexingStatus?.lastFullCheck ?? null,
        hasIndexData: !!indexingStatus,
        totalUrls: sitemapTotal ?? 0,
      })
    : null;

  const striking = buildStrikingSection(strikingData, MIN_STRIKING_IMPR);
  const market = buildMarketSection({
    queryRows, pageRows: topPages, countries, devices, totals,
    indexingUrls: indexingStatus?.urls ?? {},
    lastFullCheck: indexingStatus?.lastFullCheck ?? null,
  });

  const funnelData = noDb ? null : await loadFunnelData({ startDate: target.startDate, endDate: target.endDate });
  if (!noDb) printInternalIpHints(funnelData, args.includes('--mostrar-ips'));
  const funnelSection = buildFunnelSection({ funnel: funnelData, gsc: totals, range: target, mesTag: target.tag });
  summary.funnelHeadline = funnelHeadline(funnelData);

  // ── alertas (después del embudo: alguna depende de él) ──
  const alerts = buildAlerts({ totals, keywordRows, countries, indexingStatus, queryPageRows, config, funnel: funnelData });

  const report = buildReport({
    tag: target.tag, range: target, keywordRows, priorMonthRows, pageRows: topPages,
    summary, alerts, cohorts, striking, market, funnelSection, hasFunnel: !!funnelData, config,
    allPages: buildAllPagesSection({
      pageRows: topPages,
      indexingUrls: indexingStatus?.urls ?? {},
      lastFullCheck: indexingStatus?.lastFullCheck ?? null,
    }),
    allQueries: buildAllQueriesSection({ queryRows, queryPageRows, config }),
  });

  if (dryRun) {
    console.log('\n--- DRY RUN, esto se escribiría ---\n');
    console.log(report);
    return;
  }

  const trackingRows = keywordRows.map(k => [
    target.tag, k.tier, k.query, k.impressions, k.clicks, k.ctr, k.position ?? '',
    k.topPage ? normalizePath(k.topPage) : '', k.expectedPath,
  ]);
  const t1 = await upsertCsvMonth(
    path.join(REPO_ROOT, 'data', 'rank-tracking.csv'),
    ['month', 'tier', 'query', 'impressions', 'clicks', 'ctr', 'position', 'topPage', 'expectedPath'],
    target.tag, trackingRows,
  );

  const pageCsvRows = topPages.map(p => [target.tag, p.page, p.impressions, p.clicks, p.ctr, p.position]);
  const t2 = await upsertCsvMonth(
    path.join(REPO_ROOT, 'data', 'page-impressions.csv'),
    ['month', 'page', 'impressions', 'clicks', 'ctr', 'position'],
    target.tag, pageCsvRows,
  );

  const reportPath = path.join(REPO_ROOT, 'docs', 'reports', `${target.tag}.md`);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, report, 'utf8');

  console.log(`\n✓ Escrito ${path.relative(REPO_ROOT, reportPath)}`);
  console.log(`✓ data/rank-tracking.csv → ${trackingRows.length} filas del mes${t1.replaced ? ` (sustituyeron a ${t1.replaced} previas)` : ''}, ${t1.total} en total`);
  console.log(`✓ data/page-impressions.csv → ${pageCsvRows.length} filas del mes${t2.replaced ? ` (sustituyeron a ${t2.replaced} previas)` : ''}, ${t2.total} en total`);
  if (target.partial) console.log(`\n⚠ Reporte PARCIAL (${summary.daysWithData} días). Se regenera solo al cerrar el mes.`);
}

// ═══════════════════════════════════════════════════════════════════════
// ALERTAS
// ═══════════════════════════════════════════════════════════════════════
function buildAlerts({ totals, keywordRows, countries, indexingStatus, queryPageRows, config, funnel }) {
  const alerts = [];
  const trackedSet = new Set(config.keywords.map(k => k.query.toLowerCase()));

  if (totals.impressions < 500) {
    alerts.push({ severity: '🟡', text: `Volumen bajo (${totals.impressions} impresiones). Normal en los primeros meses tras entrar al índice. Con estos números, las conclusiones por página son indicativas, no concluyentes.` });
  }
  if (totals.impressions > 0 && totals.clicks === 0) {
    alerts.push({ severity: '🔴', text: `Cero clicks con ${totals.impressions} impresiones. Con posición promedio ${totals.position.toFixed(1)} es lo esperable, casi nadie llega a esa altura del resultado. El problema no es el CTR, es la posición.` });
  }

  /* Indexación. Se cuenta con el MISMO criterio que la sección de posición de
     mercado: una "Alternate page" cuyo canónico de Google es la misma ruta con
     barra final SÍ está visible en Google. Contarla como fallo daría dos
     números distintos para lo mismo dentro del mismo reporte. */
  if (indexingStatus?.urls) {
    const states = {};
    for (const info of Object.values(indexingStatus.urls)) {
      const s = info?.coverageState || 'Sin estado registrado';
      states[s] = (states[s] ?? 0) + 1;
    }
    const total = Object.keys(indexingStatus.urls).length;
    const groups = indexGroups(indexingStatus.urls);
    const visibles = [...groups.values()].filter(g => g.inIndex).length;
    const fuera = total - visibles;
    const alternate = states['Alternate page with proper canonical tag'] ?? 0;
    if (fuera > 0) {
      const detalle = Object.entries(states)
        .filter(([s]) => s !== 'Submitted and indexed' && s !== 'Alternate page with proper canonical tag')
        .map(([s, n]) => `${n} ${coverageCount(s, n)}`)
        .join(', ');
      alerts.push({
        severity: '🟡',
        text: `${fuera} de ${total} URLs del sitemap no pueden aparecer todavía en Google (${detalle}). Las otras ${visibles} sí están visibles: ${states['Submitted and indexed'] ?? 0} indexadas directas más ${alternate} que Google sirve bajo su variante canónica. El sweep diario está enviando las que faltan, hasta 8 por día.`,
      });
    }
    if (alternate > 0) {
      alerts.push({ severity: '🔵', text: `${alternate} URLs marcadas como "Alternate page with proper canonical tag". Son restos de la limpieza de la barra final: la página está indexada bajo la otra forma de URL y se resuelven solas al re-rastrear. No hay que pelearse con ellas.` });
    }
  }

  /* Palabras clave bloqueadas por indexación, no por posicionamiento. Se
     agrupan en una sola alerta porque listarlas una a una ahoga el resto. */
  const blocked = keywordRows.filter(k => k._expectedLive === false);
  if (blocked.length) {
    const byState = {};
    for (const k of blocked) (byState[k._expectedCoverage] ??= new Set()).add(k.expectedPath);
    const detalle = Object.entries(byState)
      .map(([state, paths]) => `${coverageLabel(state)}: ${[...paths].map(p => `\`${p}\``).join(', ')}`)
      .join(' · ');
    alerts.push({
      severity: '🔴',
      text: `${blocked.length} palabras clave apuntan a páginas que Google todavía no puede mostrar. No es un problema de posicionamiento, es de indexación. ${detalle}. El sweep diario ya las está enviando; si en dos semanas siguen igual, revisar enlazado interno hacia ellas.`,
    });
  }
  const unknown = keywordRows.filter(k => k._expectedCoverage === 'URL is unknown to Google');
  if (unknown.length) {
    const paths = [...new Set(unknown.map(k => k.expectedPath))];
    alerts.push({
      severity: '🔴',
      text: `${paths.length === 1 ? 'Esta página está' : 'Estas páginas están'} en el sitemap y Google declara no conocerla: ${paths.map(p => `\`${p}\``).join(', ')}. Es el peor estado posible. Comprobar que el sitemap en vivo la incluye y que hay al menos un enlace interno apuntándola desde una página ya indexada.`,
    });
  }

  /* Página real distinta de la esperada. Se agrupan en UNA alerta: con una
     por palabra clave, ocho líneas iguales tapan el resto de las alertas. */
  const desviadas = keywordRows.filter(k => k.topPage && k.expectedPath
    && normalizePath(k.topPage) !== normalizePath(k.expectedPath));
  if (desviadas.length) {
    const lista = desviadas.map(k => `\`${k.query}\` → \`${normalizePath(k.topPage)}\` (esperábamos \`${k.expectedPath}\`)`).join(' · ');
    alerts.push({
      severity: '🔵',
      text: `${desviadas.length} de las palabras clave con datos rankean con una página distinta de la esperada. Google eligió otra página nuestra: ${lista}. Cuando la que gana es el hub de la ciudad, suele significar que la landing específica no tiene suficiente señal propia ni enlaces internos apuntándola.`,
    });
  }

  // Tráfico fuera de mercado
  const offMarket = countries.filter(c => c.keys[0] !== 'usa').reduce((a, c) => a + c.impressions, 0);
  const offShare = totals.impressions ? offMarket / totals.impressions : 0;
  if (offShare >= 0.15) {
    const top = countries.filter(c => c.keys[0] !== 'usa').sort((a, b) => b.impressions - a.impressions)[0];
    alerts.push({ severity: '🟡', text: `${pct(offShare)} de las impresiones vienen de fuera de Estados Unidos${top ? `, sobre todo de ${COUNTRY_ES[top.keys[0]] ?? top.keys[0].toUpperCase()} (${top.impressions})` : ''}. No compran. Señal de que las páginas genéricas rankean sin señal local suficiente: falta ciudad en el título, en el H1 y en el schema.` });
  }

  // Oportunidades no anticipadas
  const surprises = queryPageRows
    .filter(r => !trackedSet.has(r.keys[0].toLowerCase()) && r.impressions >= Math.max(5, Math.round(totals.impressions * 0.02)))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 5);
  for (const s of surprises) {
    alerts.push({ severity: '💡', text: `Consulta no anticipada con ${s.impressions} impresiones: \`${s.keys[0]}\` (página \`${normalizePath(s.keys[1])}\`, posición ${s.position.toFixed(1)}). Candidata a entrar en \`tracked-keywords.json\`.` });
  }

  /* Eventos de conversión que nunca se dispararon. Con volumen bajo puede ser
     que nadie los tocara, pero si el evento no está cableado nunca se sabrá:
     hay que descartar lo segundo antes de concluir lo primero. */
  /* Solo se alerta de eventos que están en el allowlist y NO aparecen
     cableados en ningún control: esos sí son un agujero de medición. Un
     evento cableado y en cero no es una alerta, es que nadie hizo clic. */
  if (funnel?.allowlist && funnel.wiring) {
    const sinCablear = funnel.allowlist.filter(x => (funnel.wiring.get(x) ?? 0) === 0);
    if (sinCablear.length) {
      alerts.push({
        severity: '🔴',
        text: `${sinCablear.length === 1 ? 'Un evento del allowlist no está cableado' : `${sinCablear.length} eventos del allowlist no están cableados`} en ningún control de \`src/\`: ${sinCablear.map(x => `\`${x}\``).join(', ')}. Mientras siga así, ese comportamiento no se puede medir y su cero en el reporte no significa nada.`,
      });
    }
  }
  if (funnel && funnel.exclusion.ips + funnel.exclusion.sids === 0 && (funnel.embudo?.navegadores ?? 0) > 0) {
    alerts.push({
      severity: '🟡',
      text: `El embudo no excluye tráfico interno: no hay ninguna IP ni sesión configurada. Las cifras de navegadores y eventos incluyen nuestro propio uso del sitio, así que no sirven todavía para medir conversión real. Ver la sección de embudo para las dos formas de arreglarlo.`,
    });
  }

  // Caídas fuertes
  for (const k of keywordRows) {
    if (k._priorPosition != null && k.position != null && k.position - k._priorPosition >= 10) {
      alerts.push({ severity: '🔴', text: `\`${k.query}\` cayó ${(k.position - k._priorPosition).toFixed(1)} posiciones (${k._priorPosition.toFixed(1)} → ${k.position.toFixed(1)}). Investigar.` });
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════════════
export {
  normalizePath, aggregateByPath, monthBounds, confidence, trendArrow, fmtDelta,
  buildStrikingDistance,
};

main().catch(err => {
  console.error('✗ Error no controlado:', err);
  process.exit(4);
});
