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
 * (`match`), con el rótulo que se pinta (`label`, como la llama la gente) y el brazo que
 * lo lleva (`labelArm`: 0 o 1). TODA vía dibujada lleva nombre (revisión 1, I4: una vía sin
 * nombre junto a otra se leía como línea duplicada); el sitio del rótulo lo busca el script
 * (`placeLabel`) con ≥ 8 px de aire hasta cualquier trazo. `arms` = qué brazos se pintan
 * (por defecto los dos). `via` = índice de la vía por la que sigue hasta el chip si esta no
 * pasa por debajo de él.
 * Encuadre (revisión 1, I4): `centerOn: [a, b]` centra el chip en el cruce real de las vías
 * a y b, y `shift: [km E, km N]` lo desplaza desde ahí; se elige para que las vías pasen
 * POR DEBAJO del chip y los brazos lleguen a él desde varios lados (el chip ES el barrio).
 */
const BARRIOS = {
  katy: {
    // El chip en la I-10, al oeste del Grand Parkway (el Katy de verdad): la I-10 y la US 90
    // pasan por debajo; el Grand Parkway se ve entero a la derecha y llega por la I-10.
    state: 'tx', center: [-95.776, 29.786], km: 30, centerOn: [0, 1], shift: [-5.5, 0],
    roads: [
      { match: ['I- 10', 'Katy Fwy'], label: 'I-10', labelArm: 1 },
      { match: ['State Hwy 99', 'Grand Pkwy'], label: 'Grand Pkwy', labelArm: 0, via: 0 },
      { match: ['US Hwy 90'], label: 'US 90', labelArm: 1 },
    ],
  },
  'sugar-land': {
    // El chip en el cruce de la US 59 con la Hwy 6 (First Colony y Town Square), con la
    // US 90A (la vía del viejo Sugar Land) pasando por debajo.
    state: 'tx', center: [-95.604, 29.617], km: 30, centerOn: [0, 1],
    roads: [
      { match: ['US Hwy 59', 'I- 69', 'Southwest Fwy'], label: 'US 59', labelArm: 0 },
      { match: ['State Hwy 6'], label: 'Hwy 6', labelArm: 0 },
      { match: ['US Hwy 90 Alt', 'E Hwy 90A'], label: 'US 90A', labelArm: 1 },
    ],
  },
  doral: {
    // Doral no tiene autopista por dentro: lo encierran el Turnpike (O), el Palmetto (E) y
    // la 836 (S). El chip va entre el Turnpike y el Palmetto, justo encima de la 836: la 836
    // pasa por debajo y las dos autopistas, enteras a los lados, llegan al chip por ella.
    state: 'fl', center: [-80.3541, 25.792], km: 18,
    roads: [
      { match: ['Dolphin Expy', 'State Rte 836'], label: '836', labelArm: 1 },
      { match: ['Florida Tpke Exd', "Homestead Extension of Florida's Tpke", 'State Hwy 821'], label: 'Turnpike', labelArm: 0, via: 0 },
      { match: ['Palmetto Expy', 'State Hwy 826'], label: 'Palmetto', labelArm: 0, via: 0 },
    ],
  },
  hialeah: {
    // El chip en la W 49th St, entre el Palmetto y Le Jeune: la 49 pasa por debajo, las dos
    // avenidas se ven enteras a los lados y llegan por ella; Okeechobee cruza en diagonal.
    state: 'fl', center: [-80.2956, 25.8685], km: 16,
    roads: [
      { match: ['W 49th St', 'E 49th St', 'NW 103rd St'], label: 'W 49th St', labelArm: 1 },
      { match: ['Palmetto Expy', 'State Hwy 826'], label: 'Palmetto', labelArm: 0, via: 0 },
      { match: ['NW 42nd Ave', 'State Hwy 953', 'N Le Jeune Rd', 'Lejeune Rd', 'S Le Jeune Rd'], label: 'Le Jeune', labelArm: 0, via: 0 },
      { match: ['Okeechobee Rd', 'W Okeechobee Rd', 'E Okeechobee Rd', 'N Okeechobee Rd', 'S Okeechobee Rd'], label: 'Okeechobee', labelArm: 0, via: 0 },
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
/** Punto del tramo a-b más cercano a q. */
const footOnSeg = (a, b, q) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return [a[0] + t * dx, a[1] + t * dy];
};
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

// ── Rótulos (revisión 1, I4) ──
// Letra de ChipBarrio: 13 px, peso 500. Ancho por carácter medido con holgura; caja desde
// 11 px sobre la línea base hasta 4 px por debajo.
const CHAR = 7.4, ASC = 11, DESC = 4;
// Banda que se ve en todos los tamaños (en móvil, 390 px, se ve x ≈ 105-495; arriba y abajo
// el 14 % (42 px) se funde) y caja del chip (164, centrado) con margen.
const BAND = { x0: 112, x1: 488, y0: 42, y1: 258 };
const CHIP = { x0: CX - 82 - 8, x1: CX + 82 + 8, y0: CY - 82 - 6, y1: CY + 82 + 6 };
const GAP = 8 + 1.25; // 8 px de aire desde el borde del trazo (2,5 px de grosor)
function segBoxDist(a, b, bx) {
  // Distancia mínima entre un segmento y una caja (muestreo fino: los tramos son cortos).
  const n = Math.max(2, Math.ceil(dist(a, b) / 2)); let m = Infinity;
  for (let i = 0; i <= n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n, y = a[1] + ((b[1] - a[1]) * i) / n;
    const dx = Math.max(bx.x0 - x, 0, x - bx.x1), dy = Math.max(bx.y0 - y, 0, y - bx.y1);
    m = Math.min(m, Math.hypot(dx, dy));
  }
  return m;
}
const lineBoxDist = (pts, bx) => pts.slice(1).reduce((m, p, i) => Math.min(m, segBoxDist(pts[i], p, bx)), Infinity);
const boxGap = (a, b) => Math.hypot(Math.max(a.x0 - b.x1, 0, b.x0 - a.x1), Math.max(a.y0 - b.y1, 0, b.y0 - a.y1));
const overlaps = (a, b) => a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1;
/** Busca el sitio del rótulo junto a su brazo: dentro de la banda visible, fuera del chip,
 *  a 8-14 px de su trazo, ≥ 8 px de cualquier otro trazo y ≥ 12 px de otros rótulos. */
function placeLabel(text, arm, all, placed) {
  const w = text.length * CHAR, h = ASC + DESC;
  const total = lenOf(arm); let best = null;
  for (let f = 0.04; f <= 0.96; f += 0.01) {
    let acc = 0, foot = null, dir = null;
    for (let i = 0; i < arm.length - 1; i++) {
      const L = dist(arm[i], arm[i + 1]);
      if (acc + L >= total * f) {
        const t = (total * f - acc) / L;
        foot = [arm[i][0] + t * (arm[i + 1][0] - arm[i][0]), arm[i][1] + t * (arm[i + 1][1] - arm[i][1])];
        dir = [(arm[i + 1][0] - arm[i][0]) / L, (arm[i + 1][1] - arm[i][1]) / L];
        break;
      }
      acc += L;
    }
    if (!foot) continue;
    for (const side of [1, -1]) {
      const nx = -dir[1] * side, ny = dir[0] * side;
      const half = (Math.abs(nx) * w) / 2 + (Math.abs(ny) * h) / 2;
      for (let off = GAP; off <= GAP + 6; off += 1) {
        const cx = foot[0] + nx * (off + half), cy = foot[1] + ny * (off + half);
        const bx = { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
        if (bx.x0 < BAND.x0 || bx.x1 > BAND.x1 || bx.y0 < BAND.y0 || bx.y1 > BAND.y1) continue;
        if (overlaps(bx, CHIP)) continue;
        const own = lineBoxDist(arm, bx);
        if (own < GAP - 0.01) continue;
        const others = Math.min(Infinity, ...all.filter((o) => o !== arm).map((o) => lineBoxDist(o, bx)));
        if (others < GAP) continue;
        if (placed.some((p) => boxGap(p, bx) < 12)) continue;
        // Mejor: pegado a su trazo, lejos de los demás y cerca del chip (donde se mira).
        const score = Math.min(others, 40) - (own - GAP) * 3 - Math.hypot(cx - CX, cy - CY) / 25;
        if (!best || score > best.score) best = { score, bx, at: [Math.round(bx.x0), Math.round(bx.y0 + ASC)], own, others };
      }
    }
  }
  return best;
}

function build(name, cfg, feats) {
  const roadsAt = ([lon, lat]) => {
    const kx = 111.32 * Math.cos((lat * Math.PI) / 180), ky = 110.57, s = W / cfg.km;
    const P = ([x, y]) => [CX + (x - lon) * kx * s, CY - (y - lat) * ky * s];
    const inv = ([x, y]) => [lon + (x - CX) / (kx * s), lat - (y - CY) / (ky * s)];
    const dLon = (cfg.km / 2 + 3) / kx, dLat = (cfg.km / 4 + 3) / ky;
    const win = feats.filter((f) => f.box[2] >= lon - dLon && f.box[0] <= lon + dLon && f.box[3] >= lat - dLat && f.box[1] <= lat + dLat);
    const roads = args.list ? [] : cfg.roads.map((r) => {
      // TIGER repite el mismo tramo con cada nombre de la vía (p. ej. "I- 10" y "Katy Fwy"):
      // se quitan los duplicados antes de unir, o la cadena se dobla sobre sí misma.
      const seen = new Set();
      const segs = win.filter((f) => r.match.includes(f.FULLNAME)).flatMap((f) => f.lines)
        .filter((l) => { const k = [l[0], l[l.length - 1]].map((p) => p.map((v) => v.toFixed(4)).join(',')).sort().join('|') + ':' + l.length; if (seen.has(k)) return false; seen.add(k); return true; })
        .map((l) => l.map(P)).flatMap((l) => clip(l));
      if (!segs.length) throw new Error(`${name}: no hay tramos de ${r.match.join(' / ')}`);
      const line = dp(centerline(segs), 1.6);
      if (args.debug) console.log(name, r.match[0], segs.length, 'tramos →', Math.round(lenOf(line)) + 'px', line[0].map(Math.round), '→', line[line.length - 1].map(Math.round));
      return { ...r, pts: line };
    });
    return { win, inv, roads };
  };
  let center = cfg.center;
  let { win, roads, inv } = roadsAt(center);
  if (cfg.centerOn && !args.list) {
    // Cruce real de dos vías: el par de puntos más cercano entre sus líneas (muestreo fino).
    const sample = (pts) => pts.slice(1).flatMap((p, i) => { const a = pts[i], n = Math.max(1, Math.ceil(dist(a, p))); return Array.from({ length: n }, (_, k) => [a[0] + ((p[0] - a[0]) * k) / n, a[1] + ((p[1] - a[1]) * k) / n]); });
    const [A, B] = cfg.centerOn.map((i) => sample(roads[i].pts)); let best = Infinity, q = null;
    for (const p of A) for (const r of B) { const d = dist(p, r); if (d < best) { best = d; q = [(p[0] + r[0]) / 2, (p[1] + r[1]) / 2]; } }
    const [lon0, lat0] = inv(q);
    const [sx, sy] = cfg.shift ?? [0, 0];
    center = [lon0 + sx / (111.32 * Math.cos((lat0 * Math.PI) / 180)), lat0 + sy / 110.57];
    ({ win, roads } = roadsAt(center));
  }
  if (args.list) {
    const names = {};
    for (const f of win) { const k = `${f.MTFCC} ${f.FULLNAME}`; names[k] = (names[k] || 0) + 1; }
    console.log(`\n${name}:`); Object.entries(names).sort().forEach(([k, n]) => console.log('  ', k, n));
    return;
  }
  roads.forEach((r) => { r.pts = withFoot(r.pts, [CX, CY]); });
  const C = [CX, CY]; const arms = [];
  const under = (p) => Math.abs(p[0] - CX) < 82 && Math.abs(p[1] - CY) < 82;
  roads.forEach((r) => {
    const k = nearestIdx(r.pts, C);
    let two;
    // ¿Se cruza de verdad con la vía principal? Cruce por TRAMOS, no por vértices (las líneas
    // simplificadas tienen pocos vértices): ≤ 14 px en el lienzo, porque en los enlaces de
    // autopista las dos líneas simplificadas no llegan a tocarse.
    const main = r.via === undefined ? null : roads[r.via].pts;
    let cross = null;
    if (main) {
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1], n = Math.max(1, Math.ceil(dist(a, b)));
        for (let t = 0; t <= n; t++) {
          const p = [a[0] + ((b[0] - a[0]) * t) / n, a[1] + ((b[1] - a[1]) * t) / n];
          for (let m = 0; m < main.length - 1; m++) {
            const q = footOnSeg(main[m], main[m + 1], p);
            const d = dist(p, q);
            if (!cross || d < cross.d) cross = { d, i, m, p, q };
          }
        }
      }
    }
    if (under(r.pts[k]) || !cross || cross.d > 14) {
      // Pasa bajo el chip (o no cruza otra vía de la lista): dos brazos que terminan en su
      // punto más cercano al centro.
      if (!under(r.pts[k])) console.warn(`${name}: ${r.label} no pasa por debajo del chip ni cruza su vía (${r.pts[k].map(Math.round)})`);
      two = [r.pts.slice(0, k + 1), r.pts.slice(k).reverse()];
    } else {
      // Pasa lejos del chip: hasta el cruce real con la vía principal y por ella al chip.
      const rp = [...r.pts.slice(0, cross.i + 1), cross.p, ...r.pts.slice(cross.i + 1)];
      const mp = [...main.slice(0, cross.m + 1), cross.q, ...main.slice(cross.m + 1)];
      const j = cross.i + 1, jm = cross.m + 1, kMain = nearestIdx(mp, C);
      const toChip = jm <= kMain ? mp.slice(jm, kMain + 1) : mp.slice(kMain, jm + 1).reverse();
      two = [[...rp.slice(0, j + 1), ...toChip], [...rp.slice(j).reverse(), ...toChip]];
    }
    two.forEach((a, ai) => {
      if (r.arms && !r.arms.includes(ai)) return;
      if (a.length < 2 || dist(a[0], a[a.length - 1]) < 60) return;
      arms.push({ road: r, ai, pts: a });
    });
  });
  // Cada vía con nombre: en su brazo `labelArm` o, si no hay sitio, en el otro. Una vía
  // sin sitio para su nombre NO se dibuja (revisión 1, I4).
  const placed = [];
  for (const r of roads) {
    const pref = r.labelArm ?? 0;
    const mine = arms.filter((a) => a.road === r).sort((p, q) => (p.ai === pref ? 0 : 1) - (q.ai === pref ? 0 : 1));
    if (!mine.length) continue;
    let hit = null, arm = null;
    for (const a of mine) { hit = placeLabel(r.label, a.pts, arms.map((x) => x.pts), placed); if (hit) { arm = a; break; } }
    if (!hit) {
      console.warn(`${name}: sin sitio para "${r.label}": la vía no se dibuja`);
      for (const a of mine) arms.splice(arms.indexOf(a), 1);
      continue;
    }
    placed.push(hit.bx);
    if (args.debug) console.log(`  ${r.label} @${hit.at} a ${hit.own.toFixed(1)} px de su trazo, ${hit.others.toFixed(1)} px del resto`);
    arm.name = r.label; arm.at = hit.at;
  }
  const out = arms.map((a) => ({ d: fmt(a.pts), ...(a.name ? { name: a.name, at: a.at } : {}) }));
  const file = path.join(OUT, `${name}.svg.ts`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(file,
    `// GENERADO por scripts/w/build-barrio-tracks.mjs: no editar a mano.\n` +
    `// Vías reales de ${name}: TIGER/Line 2024 Primary and Secondary Roads (Censo de EE. UU., dominio público).\n` +
    `// Ventana de ${cfg.km} km de ancho centrada en ${center.map((v) => v.toFixed(4)).join(', ')}; lienzo 600×300 con el\n` +
    `// chip en (300,150); cada brazo termina en el chip; toda vía lleva su nombre.\n` +
    `const data: { tracks: { d: string; name?: string; at?: [number, number] }[] } = ${JSON.stringify({ tracks: out.slice(0, 8) }, null, 2)};\n` +
    `export default data;\n`);
  if (out.length > 8) console.warn(`${name}: ${out.length} brazos, se quedan 8`);
  console.log(name, Math.min(8, out.length), 'brazos →', path.relative(process.cwd(), file));
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
