// Sistema de imágenes del hero "El Domo" (hubs de Houston).
//
// Masters REALES en docs/galeria-src/ (gitignorada; los exporta el dueño):
//   houston-domo.png          → master DESKTOP (composición horizontal)
//   houston-domo-movil-2.png  → master MÓVIL (composición vertical propia)
//
// Emite en public/hero/ la escalera responsive en AVIF (principal) + WebP
// (fallback): desktop [1440, 1920, 2560, 3200, 3840] y móvil [828, 1170, 1290].
// REGLA DURA: jamás se emite un tramo por ENCIMA del ancho del master (upscale
// = cero detalle real, prohibido por el dueño). Si el master crece (p.ej. un
// export 4K real con el mismo nombre), la escalera se completa sola al volver
// a correr el script. El ancho nativo del master se emite siempre como techo.
//
// Además escribe src/data/hero-domo.json (manifiesto) que DomoHero.astro y los
// preloads de las 2 páginas consumen en build: añadir tramos NO toca código.
//
// Calidad: la foto es la pieza visual del hub (regla del dueño: primero
// calidad). AVIF q80 / WebP q94 con presupuestos holgados por tramo; solo se
// baja calidad si un tramo se sale de su presupuesto.
import { existsSync, mkdirSync, statSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = 'docs/galeria-src';
const OUT = 'public/hero';
const MANIFEST = 'src/data/hero-domo.json';

const SETS = [
  {
    kind: 'desktop', master: 'houston-domo.png', base: 'houston-desktop',
    ladder: [1440, 1920, 2560, 3200, 3840],
    // presupuesto por ancho (KB): holgado a propósito; la nitidez manda.
    budgetKB: (w) => (w >= 3200 ? 1500 : w >= 2560 ? 1100 : 900),
  },
  {
    kind: 'mobile', master: 'houston-domo-movil-2.png', base: 'houston-mobile',
    ladder: [828, 1170, 1290],
    budgetKB: () => 500,
  },
];

const kb = (p) => Math.round(statSync(p).size / 1024);

async function emit(masterPath, width, outBase, budget) {
  const files = {};
  for (const [fmt, qs] of [['avif', [87, 80, 72, 64]], ['webp', [94, 90, 86, 80]]]) {
    const out = join(OUT, `${outBase}.${fmt}`);
    let done = false;
    for (const quality of qs) {
      const img = sharp(masterPath).resize({ width, kernel: 'lanczos3', withoutEnlargement: true });
      if (fmt === 'avif') await img.avif({ quality, effort: 6 }).toFile(out);
      else await img.webp({ quality }).toFile(out);
      if (kb(out) <= budget) { done = true; files[fmt] = { q: quality, kb: kb(out) }; break; }
    }
    if (!done) throw new Error(`${out} no cabe en ${budget}KB ni a la calidad mínima`);
  }
  return files;
}

const missing = SETS.filter((s) => !existsSync(join(SRC, s.master))).map((s) => s.master);
if (missing.length) {
  console.error(`FALTAN masters en ${SRC}: ${missing.join(', ')}`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
// limpia variantes viejas del domo antes de re-emitir (evita huérfanos)
for (const f of readdirSync(OUT)) if (/^houston-(desktop|mobile)-\d+\./.test(f)) rmSync(join(OUT, f));

const manifest = { note: 'GENERADO por scripts/resize-heros.mjs — no editar a mano', desktop: [], mobile: [] };
for (const set of SETS) {
  const masterPath = join(SRC, set.master);
  const meta = await sharp(masterPath).metadata();
  const widths = [...new Set(set.ladder.filter((w) => w <= meta.width).concat(meta.width))].sort((a, b) => a - b);
  const skipped = set.ladder.filter((w) => w > meta.width);
  for (const w of widths) {
    const h = Math.round((meta.height / meta.width) * w);
    const outBase = `${set.base}-${w}`;
    const files = await emit(masterPath, w, outBase, set.budgetKB(w) );
    manifest[set.kind].push({ w, h, avif: `/hero/${outBase}.avif`, webp: `/hero/${outBase}.webp` });
    console.log(`${outBase}: avif q${files.avif.q} ${files.avif.kb}KB · webp q${files.webp.q} ${files.webp.kb}KB`);
  }
  if (skipped.length) {
    console.log(`⚠ ${set.kind}: master ${set.master} mide ${meta.width}px — tramos ${skipped.join('/')} OMITIDOS.`);
    console.log(`  Para desbloquearlos: exportar un master real de ≥${skipped[0]}px con el mismo nombre y re-correr este script.`);
  }
}

// Cadenas listas para consumir (componente y preloads leen esto tal cual;
// así añadir tramos nunca toca código).
const srcsetOf = (arr, fmt) => arr.map((v) => `${v[fmt]} ${v.w}w`).join(', ');
const fb = manifest.desktop.find((v) => v.w >= 1440) ?? manifest.desktop[manifest.desktop.length - 1];
manifest.srcset = {
  desktopAvif: srcsetOf(manifest.desktop, 'avif'),
  desktopWebp: srcsetOf(manifest.desktop, 'webp'),
  mobileAvif: srcsetOf(manifest.mobile, 'avif'),
  mobileWebp: srcsetOf(manifest.mobile, 'webp'),
};
manifest.fallback = { src: fb.webp, w: fb.w, h: fb.h };

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifiesto → ${MANIFEST}`);
