// Prepara los mapas del planeta de Houston sin ejecutar código descargado: decodifica TopoJSON a mano.
// Uso: node geo-prep.mjs <land-50m.json> <land-10m.json> <states-10m.json> <salida geo-data.js>
import fs from 'node:fs';

const [, , f50, f10, fst, out] = process.argv;

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

const big = (p) => { const r = p[0]; let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const [x, y] of r) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); } return (b - a) > 0.3 || (d - c) > 0.3; };
const land50 = round(decode(JSON.parse(fs.readFileSync(f50, 'utf8')), 'land').filter(big), 1);
const BBOX = [-100.5, 25.5, -89.5, 34];
const land10 = decode(JSON.parse(fs.readFileSync(f10, 'utf8')), 'land')
  .map((p) => p.map((r) => clipRing(r, BBOX)).filter((r) => r.length >= 3))
  .filter((p) => p.length && p[0].length >= 3);
const tx10 = round(land10, 3);
const texas = round(decode(JSON.parse(fs.readFileSync(fst, 'utf8')), 'states', (g) => g.id === '48' || g.type === 'GeometryCollection'), 3);

const data = { land50, tx10, texas, bbox: BBOX };
fs.writeFileSync(out, 'window.GEO=' + JSON.stringify(data) + ';\n');
console.log('ok', out, Math.round(fs.statSync(out).size / 1024) + ' KB', 'land50 polys', land50.length, 'tx10 polys', tx10.length, 'texas polys', texas.length);
