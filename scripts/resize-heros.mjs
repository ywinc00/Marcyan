// Genera las variantes del hero "El Domo" (LCP de los hubs de Houston) desde
// las fuentes pesadas de docs/galeria-src/ (gitignoradas; las exporta el dueño
// del proyecto Claude Design). Patrón de resize-galeria.mjs + presupuesto PSI:
// cada variante servida above-the-fold debe pesar ≤150KB (spec del hero); el
// script BAJA la calidad hasta cumplir y falla en voz alta si no puede.
// One-off: se corre a mano y las variantes de public/ se comitean.
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = 'docs/galeria-src';
const OUT = 'public/assets/heros';
const BUDGET = 150 * 1024;

const JOBS = [
  // [fuente, ancho de salida, nombre base de salida]
  // La spec pedía un tramo 2200, pero la fuente real mide 1672px de ancho:
  // agrandarla serviría un archivo más pesado y más borroso. El tramo grande
  // se sirve al ancho NATIVO (1672) y withoutEnlargement lo garantiza.
  ['houston-domo.png', 1440, 'houston-domo-1440'],
  ['houston-domo.png', 1672, 'houston-domo-1672'],
  ['houston-domo-movil-2.png', 941, 'houston-domo-movil-941', 84],
];

const kb = (p) => (statSync(p).size / 1024).toFixed(0);

async function fit(src, width, out, fmt, qMax) {
  // Calidad descendente hasta caber en presupuesto (la foto es oscura: sobra margen).
  // Calidad ALTA primero: a q78 la foto oscura mostraba banding y pixelado
  // (queja del dueno). El presupuesto es 150KB, no 25: usarlo.
  let steps = fmt === 'avif' ? [75, 68, 60, 52] : [92, 88, 84, 80, 75];
  // qMax por trabajo: la móvil (390px CSS) no necesita q92 y pesa un tercio menos
  if (qMax) steps = steps.filter((s) => s <= qMax);
  for (const quality of steps) {
    const img = sharp(join(SRC, src)).resize({ width, withoutEnlargement: true });
    if (fmt === 'avif') await img.avif({ quality }).toFile(out);
    else await img.webp({ quality }).toFile(out);
    if (statSync(out).size <= BUDGET) return { quality, size: kb(out) };
  }
  throw new Error(`${out} no cabe en ${BUDGET / 1024}KB ni a la calidad mínima`);
}

const missing = JOBS.map(([s]) => s).filter((s, i, a) => a.indexOf(s) === i && !existsSync(join(SRC, s)));
if (missing.length) {
  console.error(`FALTAN fuentes en ${SRC}: ${missing.join(', ')}\n(las exporta el dueño desde el proyecto Claude Design del domo)`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
for (const [src, width, base, qMax] of JOBS) {
  for (const fmt of ['webp']) {
    const out = join(OUT, `${base}.${fmt}`);
    const r = await fit(src, width, out, fmt, qMax);
    console.log(`${out} · q${r.quality} · ${r.size}KB`);
  }
}
console.log('variantes del domo listas (presupuesto ≤150KB cumplido)');
