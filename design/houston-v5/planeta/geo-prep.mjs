// Prepara los mapas del planeta de Houston sin ejecutar código descargado: decodifica TopoJSON a mano.
// Uso: node geo-prep.mjs <land-50m.json> <land-10m.json> <states-10m.json> <salida geo-data.js>
import fs from 'node:fs';

const [, , f50, f10, fst, out, f110] = process.argv;

function decode(topo, objName, filter) {
  const { scale, translate } = topo.transform;
  const arcs = topo.arcs.map((a) => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * scale[0] + translate[0], y * scale[1] + translate[1]]; }); });
  const arc = (i) => (i >= 0 ? arcs[i] : arcs[~i].slice().reverse());
  const ring = (idx) => { const pts = []; idx.forEach((i, k) => { const a = arc(i); pts.push(...(k ? a.slice(1) : a)); }); return pts; };
  const polys = [];
  const take = (g) => {
    if (filter && !filter(g)) return;
    if (g.type === 'Polygon') polys.push(g.arcs.map(ring));
    else if (g.type === 'MultiPolygon') g.arcs.forEach((p) => polys.push(p.map(ring)));
    else if (g.type === 'GeometryCollection') g.geometries.forEach(take);
  };
  take(topo.objects[objName]);
  return polys;
}

// Recorte de un anillo contra un rectángulo lon/lat (Sutherland–Hodgman).
function clipRing(r, [x0, y0, x1, y1]) {
  const edges = [
    (p) => p[0] >= x0, (p) => p[0] <= x1, (p) => p[1] >= y0, (p) => p[1] <= y1,
  ];
  const inter = [
    (a, b) => [x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0])],
    (a, b) => [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])],
    (a, b) => [a[0] + (b[0] - a[0]) * (y0 - a[1]) / (b[1] - a[1]), y0],
    (a, b) => [a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1],
  ];
  let pts = r;
  for (let e = 0; e < 4 && pts.length; e++) {
    const res = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const ia = edges[e](a), ib = edges[e](b);
      if (ia) res.push(a);
      if (ia !== ib) res.push(inter[e](a, b));
    }
    pts = res;
  }
  return pts;
}

const round = (polys, d) => polys.map((p) => p.map((r) => {
  const k = 10 ** d; const outR = [];
  for (const [x, y] of r) { const q = [Math.round(x * k) / k, Math.round(y * k) / k]; const l = outR[outR.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) outR.push(q); }
  return outR;
}).filter((r) => r.length >= 4)).filter((p) => p.length);

// Simplificación Douglas–Peucker por anillo (tolerancia en grados)
function dp(pts, tol) {
  if (pts.length < 5) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-12;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
// anillo cerrado: se parte por el punto más lejano al inicio y se simplifica cada mitad
function dpRing(r, tol) {
  if (r.length < 8) return r;
  let m = 0, md = -1; for (let i = 1; i < r.length - 1; i++) { const d = Math.hypot(r[i][0] - r[0][0], r[i][1] - r[0][1]); if (d > md) { md = d; m = i; } }
  const a = dp(r.slice(0, m + 1), tol), b = dp(r.slice(m), tol);
  return a.concat(b.slice(1));
}
const simplify = (polys, tol) => polys.map((p) => p.map((r) => dpRing(r, tol)).filter((r) => r.length >= 4)).filter((p) => p.length);
const big = (p) => { const r = p[0]; let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const [x, y] of r) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); } return (b - a) > 0.5 || (d - c) > 0.5; };
const land50 = round(simplify(decode(JSON.parse(fs.readFileSync(f50, 'utf8')), 'land').filter(big), 0.05), 2);
const BBOX = [-100.5, 25.5, -89.5, 34];
const land10 = decode(JSON.parse(fs.readFileSync(f10, 'utf8')), 'land')
  .map((p) => p.map((r) => clipRing(r, BBOX)).filter((r) => r.length >= 3))
  .filter((p) => p.length && p[0].length >= 3);
const tx10 = round(simplify(land10, 0.004), 3);
const texas = round(decode(JSON.parse(fs.readFileSync(fst, 'utf8')), 'states', (g) => g.id === '48' || g.type === 'GeometryCollection'), 3);

const land110 = f110 ? round(decode(JSON.parse(fs.readFileSync(f110, 'utf8')), 'land'), 2) : [];
const data = { land50, land110, tx10, texas, bbox: BBOX };
fs.writeFileSync(out, 'window.GEO=' + JSON.stringify(data) + ';\n');
console.log('ok', out, Math.round(fs.statSync(out).size / 1024) + ' KB', 'land50 polys', land50.length, 'tx10 polys', tx10.length, 'texas polys', texas.length);
