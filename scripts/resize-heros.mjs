// Genera las variantes del hero "El Domo" (hubs de Houston) desde las fuentes
// pesadas de docs/galeria-src/ (gitignoradas; las exporta el dueño del proyecto
// Claude Design). Patrón de resize-galeria.mjs. One-off: se corre a mano y las
// variantes de public/ se comitean.
//
// Nitidez (queja del dueño, dos veces): la fuente PC mide 1672px y la móvil
// 941px; en pantallas de DPR alto el navegador las estiraba con resampling
// pobre y la foto se veía "de baja calidad". Los tramos 2200 (PC) y 1170
// (móvil) se REESCALAN AQUÍ con Lanczos3 + un pase de sharpen suave: mucho
// mejor que dejárselo al navegador. El presupuesto del tramo alto sube a
// propósito (regla del dueño: primero calidad; además la foto va lazy y fuera
// del camino crítico del LCP, medido en el gate PSI del encargo).
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = 'docs/galeria-src';
const OUT = 'public/assets/heros';

const JOBS = [
  // [fuente, ancho, base de salida, { q, budgetKB, upscale }]
  ['houston-domo.png', 1440, 'houston-domo-1440', { q: 92, budgetKB: 150 }],
  ['houston-domo.png', 1672, 'houston-domo-1672', { q: 92, budgetKB: 150 }],
  ['houston-domo.png', 2200, 'houston-domo-2200', { q: 90, budgetKB: 280, upscale: true }],
  ['houston-domo-movil-2.png', 941, 'houston-domo-movil-941', { q: 88, budgetKB: 120 }],
  ['houston-domo-movil-2.png', 1170, 'houston-domo-movil-1170', { q: 88, budgetKB: 170, upscale: true }],
];

const kb = (p) => (statSync(p).size / 1024).toFixed(0);

async function fit(src, width, out, { q, budgetKB, upscale }) {
  const budget = budgetKB * 1024;
  // Calidad descendente desde q hasta caber en el presupuesto del trabajo.
  const steps = [92, 90, 88, 84, 80, 75].filter((s) => s <= q);
  for (const quality of steps) {
    let img = sharp(join(SRC, src)).resize({
      width,
      kernel: 'lanczos3',
      withoutEnlargement: !upscale,
    });
    // sharpen SOLO en los tramos reescalados hacia arriba (recupera el borde
    // que difumina la ampliación; sigma bajo para no meter halos).
    if (upscale) img = img.sharpen({ sigma: 1.1, m1: 0.6, m2: 1.4 });
    await img.webp({ quality }).toFile(out);
    if (statSync(out).size <= budget) return { quality, size: kb(out) };
  }
  throw new Error(`${out} no cabe en ${budgetKB}KB ni a la calidad mínima`);
}

const missing = JOBS.map(([s]) => s).filter((s, i, a) => a.indexOf(s) === i && !existsSync(join(SRC, s)));
if (missing.length) {
  console.error(`FALTAN fuentes en ${SRC}: ${missing.join(', ')}\n(las exporta el dueño desde el proyecto Claude Design del domo)`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
for (const [src, width, base, opts] of JOBS) {
  const out = join(OUT, `${base}.webp`);
  const r = await fit(src, width, out, opts);
  console.log(`${out} · q${r.quality} · ${r.size}KB`);
}
console.log('variantes del domo listas');
