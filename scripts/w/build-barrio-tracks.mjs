// ─────────────────────────────────────────────────────────────
// Calles reales de los barrios para el chip del hero (design/rediseno-workos.md §3.6,
// §4.20, §10.3 · E-49/E-53). Node puro, sin dependencias.
//
// Fuente: TIGER/Line 2024 "Primary and Secondary Roads" del Censo de EE. UU. (dominio
// público), los mismos archivos de los que salen public/geo/{houston,miami}-mapa.json
// (ya descargados en las sesiones de los hubs; este script NO descarga nada):
//   tl_2024_48_prisecroads (Texas) · tl_2024_12_prisecroads (Florida)
//
// Qué hace, por barrio: toma las vías con nombre de la lista (las 2-3 por las que la
// gente reconoce el barrio), las proyecta a un lienzo de 600×300 con el chip en (300,150),
// las une en cadenas, las simplifica como un cartógrafo (Douglas-Peucker a 1,6 px; a esta
// escala son vías casi rectas y no hay rasgo que exagerar, E-53) y las parte en "brazos"
// que terminan en el chip: los pulsos del hero recorren cada brazo HACIA el chip (clientes
// que llegan). Una vía que pasa junto al chip sin cruzarlo sigue, desde su cruce real, por
// la vía principal hasta el chip.
//
// Salida: src/components/w/objetos/barrios/<barrio>.svg.ts con
//   export default { tracks: { d, name?, at? }[] }  (máx. 8 brazos; `name` va en un
//   brazo de cada vía y se rotula FUERA del chip en letra de texto ≥ 13 px, E-40).
//
// Uso:
//   node scripts/w/build-barrio-tracks.mjs --tx <carpeta tl_2024_48_prisecroads> --fl <carpeta tl_2024_12_prisecroads>
//   … --list            nombres de las vías dentro de cada ventana
//   … --only <barrio>   un solo barrio
// ─────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const next = argv[i + 1];
  args[argv[i].slice(2)] = next === undefined || next.startsWith('--') ? true : next;
}
const OUT = path.resolve('src/components/w/objetos/barrios');

// Lienzo de ChipBarrio: 600×300, chip de 164 centrado. En móvil (390) se ve ~x 105-495.
const W = 600, H = 300, CX = 300, CY = 150;

/**
 * Barrios. `km` = ancho real de la ventana. `roads`: vías por FULLNAME exacto de TIGER
 * (`match`), con el rótulo que se pinta (`label`, como la llama la gente; null = sin
 * rótulo), el extremo que lo lleva (`labelArm`: 0 o 1) y su posición (`at`, colocada a
 * mano tras mirar la captura). `arms` = qué brazos se pintan (por defecto los dos). `via` = índice de la vía por la que sigue hasta el chip
 * si esta no pasa por debajo de él.
 */
const BARRIOS = {
  katy: {
    state: 'tx', center: [-95.824, 29.786], km: 26,
    roads: [
      { match: ['I- 10', 'Katy Fwy'], label: 'I-10', at: [124, 196] },
      { match: ['State Hwy 99', 'Grand Pkwy'], label: 'Grand Pkwy', labelArm: 0, at: [412, 112], via: 0 },
      // US 90 (la vía del viejo pueblo): solo el brazo oeste; al este va pegada a la I-10.
      { match: ['US Hwy 90'], label: null, arms: [1] },
    ],
  },
  'sugar-land': {
    state: 'tx', center: [-95.635, 29.620], km: 22,
    roads: [
      { match: ['US Hwy 59', 'I- 69', 'Southwest Fwy'], label: 'US 59', labelArm: 1, at: [446, 112] },
      { match: ['State Hwy 6'], label: 'Hwy 6', labelArm: 0, at: [276, 52] },
      { match: ['US Hwy 90 Alt', 'E Hwy 90A'], label: null },
    ],
  },
  doral: {
    // Doral no tiene autopista por dentro: lo encierran el Turnpike (O), el Palmetto (E),
    // la 836 (S) y Okeechobee (N). El chip queda dentro de ese marco real.
    // Centro algo al sur del rótulo del hub (25.8195) para que la 836 quede a la vista bajo
    // el chip y no en la franja que se funde; el chip es "tu negocio en Doral", no una dirección.
    state: 'fl', center: [-80.3553, 25.808], km: 20,
    roads: [
      { match: ['Palmetto Expy', 'State Hwy 826'], label: 'Palmetto', at: [410, 110] },
      { match: ['Florida Tpke Exd', "Homestead Extension of Florida's Tpke", 'State Hwy 821'], label: 'Turnpike', at: [140, 110] },
      { match: ['Dolphin Expy', 'State Rte 836'], label: '836', labelArm: 1, at: [462, 216] },
    ],
  },
  hialeah: {
    state: 'fl', center: [-80.2781, 25.8576], km: 20,
    roads: [
      { match: ['Okeechobee Rd', 'W Okeechobee Rd', 'E Okeechobee Rd', 'N Okeechobee Rd', 'S Okeechobee Rd'], label: 'Okeechobee', labelArm: 0, at: [278, 252] },
      { match: ['W 49th St', 'E 49th St'], label: null },
      { match: ['Palmetto Expy', 'State Hwy 826'], label: 'Palmetto', at: [110, 236] },
    ],
  },
};

// ── Lectura de shapefile (polilíneas, tipo 3) y dbf, sin dependencias ──
function readShp(dir) {
  const base = path.join(dir, path.basename(dir));
  const shp = fs.readFileSync(base + '.shp');
  const dbf = fs.readFileSync(base + '.dbf');
  const nRec = dbf.readUInt32LE(4), hLen = dbf.readUInt16LE(8), rLen = dbf.readUInt16LE(10);
  const fields = [];
  for (let o = 32; dbf[o] !== 0x0d; o += 32) {
    fields.push({ name: dbf.toString('latin1', o, o + 11).replace(/\0.*$/, ''), len: dbf[o + 16] });
  }
  const recs = [];
  for (let r = 0; r < nRec; r++) {
    let o = hLen + r * rLen + 1; const rec = {};
    for (const f of fields) { rec[f.name] = dbf.toString('latin1', o, o + f.len).trim(); o += f.len; }
    recs.push(rec);
  }
  const feats = []; let o = 100, i = 0;
  while (o < shp.length) {
    const len = shp.readInt32BE(o + 4) * 2; const c = o + 8; const type = shp.readInt32LE(c);
    if (type === 3) {
      const box = [shp.readDoubleLE(c + 4), shp.readDoubleLE(c + 12), shp.readDoubleLE(c + 20), shp.readDoubleLE(c + 28)];
      const nP = shp.readInt32LE(c + 36), nPt = shp.readInt32LE(c + 40);
      const parts = []; for (let k = 0; k < nP; k++) parts.push(shp.readInt32LE(c + 44 + k * 4));
      const pts = c + 44 + nP * 4; const lines = [];
      for (let k = 0; k < nP; k++) {
        const a = parts[k], b = k + 1 < nP ? parts[k + 1] : nPt; const line = [];
        for (let p = a; p < b; p++) line.push([shp.readDoubleLE(pts + p * 16), shp.readDoubleLE(pts + p * 16 + 8)]);
        lines.push(line);
      }
      feats.push({ box, lines, ...recs[i] });
    }
    o = c + len; i++;
  }
  return feats;
}

// ── Geometría ──
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lenOf = (c) => c.slice(1).reduce((t, p, i) => t + dist(p, c[i]), 0);
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  let max = 0, idx = 0; const a = pts[0], b = pts[pts.length - 1];
  const L = dist(a, b) || 1e-9;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((b[0] - a[0]) * (a[1] - pts[i][1]) - (a[0] - pts[i][0]) * (b[1] - a[1])) / L;
    if (d > max) { max = d; idx = i; }
  }
  return max > tol ? [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)] : [a, b];
}
/**
 * Línea única de una vía a partir de sus tramos. Las autopistas vienen en dos calzadas
 * y con huecos en los enlaces, así que no se "encadenan" tramos a ciegas (se doblaban
 * sobre sí mismos): se arma un grafo (extremos unidos a ≤ 4 px, huecos de ≤ 30 px
 * puenteados con coste triple) y se toma el camino más corto entre los dos extremos
 * sueltos más lejanos. Sale una sola línea de borde a borde, por una calzada.
 */
function centerline(segs) {
  const nodes = []; const node = (p) => {
    let i = nodes.findIndex((q) => dist(p, q) <= 4);
    if (i < 0) { nodes.push(p); i = nodes.length - 1; }
    return i;
  };
  const edges = []; // [a, b, pts, coste]
  for (const sg of segs) edges.push([node(sg[0]), node(sg[sg.length - 1]), sg, lenOf(sg)]);
  const deg = nodes.map((_, i) => edges.filter((e) => e[0] === i || e[1] === i).length);
  const ends = nodes.map((_, i) => i).filter((i) => deg[i] === 1);
  for (let x = 0; x < ends.length; x++) for (let y = x + 1; y < ends.length; y++) {
    const d = dist(nodes[ends[x]], nodes[ends[y]]);
    if (d <= 30) edges.push([ends[x], ends[y], [nodes[ends[x]], nodes[ends[y]]], d * 3]);
  }
  // Extremos candidatos: sueltos o fuera del lienzo visible (donde las dos calzadas se juntan
  // al recortar, el nudo tiene grado 2 y no cuenta como suelto).
  const out0 = ([x, y]) => x < 0 || x > W || y < 0 || y > H;
  const cand = nodes.map((_, i) => i).filter((i) => deg[i] === 1 || out0(nodes[i]));
  let A = -1, B = -1, far = -1;
  for (const x of cand) for (const y of cand) { const d = dist(nodes[x], nodes[y]); if (x !== y && d > far) { far = d; A = x; B = y; } }
  if (A < 0 || B < 0) return segs.sort((p, q) => lenOf(q) - lenOf(p))[0];
  // Dijkstra
  const D = nodes.map(() => Infinity), prev = nodes.map(() => null); D[A] = 0; const done = new Set();
  while (done.size < nodes.length) {
    let u = -1; for (let i = 0; i < nodes.length; i++) if (!done.has(i) && (u < 0 || D[i] < D[u])) u = i;
    if (u < 0 || D[u] === Infinity) break; done.add(u); if (u === B) break;
    for (const e of edges) {
      const v = e[0] === u ? e[1] : e[1] === u ? e[0] : -1; if (v < 0) continue;
      if (D[u] + e[3] < D[v]) { D[v] = D[u] + e[3]; prev[v] = [u, e]; }
    }
  }
  if (D[B] === Infinity) return segs.sort((p, q) => lenOf(q) - lenOf(p))[0];
  const parts = []; let v = B;
  while (prev[v]) { const [u, e] = prev[v]; parts.unshift(e[0] === u ? e[2] : e[2].slice().reverse()); v = u; }
  const out = [...parts[0]];
  for (const pt of parts.slice(1)) out.push(...pt.slice(1));
  return out;
}
/** Recorta una polilínea al lienzo ampliado (deja los trozos de dentro). */
function clip(line, m = 40) {
  const inside = ([x, y]) => x >= -m && x <= W + m && y >= -m && y <= H + m;
  const out = []; let cur = [];
  for (const p of line) { if (inside(p)) cur.push(p); else if (cur.length) { cur.push(p); out.push(cur); cur = []; } }
  if (cur.length) out.push(cur);
  return out.filter((c) => c.length > 1);
}
const fmt = (pts) => 'M' + pts.map((p) => p.map((v) => Math.round(v * 10) / 10).join(' ')).join(' L');
const nearestIdx = (pts, q) => pts.reduce((bi, p, i) => (dist(p, q) < dist(pts[bi], q) ? i : bi), 0);
/** Mete en la polilínea su punto más cercano a q (proyección sobre el tramo), para partirla ahí. */
function withFoot(pts, q) {
  let best = Infinity, at = 0, foot = pts[0];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]]; const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const f = [a[0] + t * dx, a[1] + t * dy]; const d = dist(f, q);
    if (d < best) { best = d; at = i; foot = f; }
  }
  if (dist(foot, pts[at]) < 0.5) return pts;
  if (dist(foot, pts[at + 1]) < 0.5) return pts;
  return [...pts.slice(0, at + 1), foot, ...pts.slice(at + 1)];
}

function build(name, cfg, feats) {
  const [lon, lat] = cfg.center;
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180), ky = 110.57, s = W / cfg.km;
  const P = ([x, y]) => [CX + (x - lon) * kx * s, CY - (y - lat) * ky * s];
  const dLon = (cfg.km / 2 + 3) / kx, dLat = (cfg.km / 4 + 3) / ky;
  const win = feats.filter((f) => f.box[2] >= lon - dLon && f.box[0] <= lon + dLon && f.box[3] >= lat - dLat && f.box[1] <= lat + dLat);
  if (args.list) {
    const names = {};
    for (const f of win) { const k = `${f.MTFCC} ${f.FULLNAME}`; names[k] = (names[k] || 0) + 1; }
    console.log(`\n${name}:`); Object.entries(names).sort().forEach(([k, n]) => console.log('  ', k, n));
    return;
  }
  // Una cadena por vía: la más larga dentro del lienzo.
  const roads = cfg.roads.map((r) => {
    // TIGER repite el mismo tramo con cada nombre de la vía (p. ej. "I- 10" y "Katy Fwy"):
    // se quitan los duplicados antes de unir, o la cadena se dobla sobre sí misma.
    const seen = new Set();
    const segs = win.filter((f) => r.match.includes(f.FULLNAME)).flatMap((f) => f.lines)
      .filter((l) => { const k = [l[0], l[l.length - 1]].map((p) => p.map((v) => v.toFixed(4)).join(',')).sort().join('|') + ':' + l.length; if (seen.has(k)) return false; seen.add(k); return true; })
      .map((l) => l.map(P)).flatMap((l) => clip(l));
    if (!segs.length) throw new Error(`${name}: no hay tramos de ${r.match.join(' / ')}`);
    const line = dp(centerline(segs), 1.6);
    if (args.debug) console.log(name, r.match[0], segs.length, 'tramos →', Math.round(lenOf(line)) + 'px', line[0].map(Math.round), '→', line[line.length - 1].map(Math.round));
    return { ...r, pts: withFoot(line, [CX, CY]) };
  });
  const C = [CX, CY]; const tracks = [];
  roads.forEach((r) => {
    const k = nearestIdx(r.pts, C);
    let arms;
    // ¿Se cruza de verdad con la vía principal? (≤ 6 px en el lienzo)
    let j = 0, jm = 0, best = Infinity;
    const main = r.via === undefined ? null : roads[r.via].pts;
    if (main) r.pts.forEach((p, a) => main.forEach((q, b) => { const d = dist(p, q); if (d < best) { best = d; j = a; jm = b; } }));
    if (dist(r.pts[k], C) < 70 || !main || best > 6) {
      // Pasa bajo el chip (o no cruza otra vía de la lista): dos brazos que terminan en su
      // punto más cercano al centro. En Doral ninguna vía principal cruza el barrio: las
      // autopistas lo rodean y los pulsos llegan hasta el borde del chip, no dentro.
      arms = [r.pts.slice(0, k + 1), r.pts.slice(k).reverse()];
    } else {
      // Pasa junto al chip: hasta el cruce real con la vía principal y por ella al chip.
      const kMain = nearestIdx(main, C);
      const toChip = jm <= kMain ? main.slice(jm, kMain + 1) : main.slice(kMain, jm + 1).reverse();
      arms = [[...r.pts.slice(0, j + 1), ...toChip], [...r.pts.slice(j).reverse(), ...toChip]];
    }
    arms.forEach((a, ai) => {
      if (r.arms && !r.arms.includes(ai)) return;
      if (a.length < 2 || dist(a[0], a[a.length - 1]) < 60) return;
      const labelled = r.label && ai === (r.labelArm ?? 0);
      let at = r.at;
      if (labelled && !at && r.labelT !== undefined) {
        // Punto a la fracción labelT del brazo, desplazado `labelOff` px en perpendicular.
        const total = lenOf(a); let acc = 0;
        for (let i = 0; i < a.length - 1; i++) {
          const L = dist(a[i], a[i + 1]);
          if (acc + L >= total * r.labelT) {
            const t = (total * r.labelT - acc) / L; const dx = (a[i + 1][0] - a[i][0]) / L, dy = (a[i + 1][1] - a[i][1]) / L;
            const off = r.labelOff ?? 12;
            at = [Math.round(a[i][0] + t * (a[i + 1][0] - a[i][0]) - dy * off), Math.round(a[i][1] + t * (a[i + 1][1] - a[i][1]) + dx * off)];
            break;
          }
          acc += L;
        }
      }
      tracks.push({ d: fmt(a), ...(labelled ? { name: r.label, ...(at ? { at } : {}) } : {}) });
    });
  });
  const file = path.join(OUT, `${name}.svg.ts`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(file,
    `// GENERADO por scripts/w/build-barrio-tracks.mjs: no editar a mano.\n` +
    `// Vías reales de ${name}: TIGER/Line 2024 Primary and Secondary Roads (Censo de EE. UU., dominio público).\n` +
    `// Ventana de ${cfg.km} km de ancho; lienzo 600×300 con el chip en (300,150); cada brazo termina en el chip.\n` +
    `const data: { tracks: { d: string; name?: string; at?: [number, number] }[] } = ${JSON.stringify({ tracks: tracks.slice(0, 8) }, null, 2)};\n` +
    `export default data;\n`);
  console.log(name, Math.min(8, tracks.length), 'brazos →', path.relative(process.cwd(), file));
}

const sources = { tx: args.tx, fl: args.fl };
const cache = {};
for (const [name, cfg] of Object.entries(BARRIOS)) {
  if (args.only && args.only !== name) continue;
  const dir = sources[cfg.state];
  if (!dir || dir === true) throw new Error(`Falta --${cfg.state} <carpeta del shapefile>`);
  cache[cfg.state] ??= readShp(dir);
  if (!cfg.roads.length && !args.list) { console.log(name, 'sin vías configuradas'); continue; }
  build(name, cfg, cache[cfg.state]);
}
