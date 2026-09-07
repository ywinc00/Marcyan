#!/usr/bin/env node
/**
 * Genera los 4 assets del avatar de Marcy desde un master transparente.
 *
 *   node scripts/build-marcy-avatar.mjs <master-transparente.png> [--dry]
 *
 * POR QUE EXISTE: el dueño exige que el ENCUADRE no cambie entre colorways
 * (negro 2026-06 → blanco 2026-09). Este script fija ese encuadre en código,
 * no en prosa, para que un render futuro caiga exactamente en el mismo sitio.
 *
 * COMO SE OBTUVO EL ENCUADRE (2026-09-07): se alineó por fuerza bruta el busto
 * NEGRO de `main` sobre el héroe NEGRO de `main` (mínimos cuadrados sobre el
 * canal alfa, rejilla 48×48, refinado a 1/4 px). Eso devuelve el rectángulo del
 * busto en coordenadas del héroe, que aquí se guarda relativo al bbox opaco del
 * cuerpo. Reproducirlo: scripts de la sesión, o repetir la alineación.
 *
 * El master NO se versiona (docs/galeria-src/ está en .gitignore): el render
 * original vive en las descargas del dueño y el recorte de fondo se hace con
 * `rembg` (modelo isnet-general-use, alpha matting). NO vale un recorte por
 * color: el visor, los cascos y las manos son negros y se destruirían.
 */
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const OUT = path.join(REPO, 'public/assets/bot');

// ── Encuadre canónico (NO tocar sin rehacer la alineación contra el negro) ──
// Todo es relativo al bbox opaco del CUERPO en el master (umbral alfa > 8).
const HERO = {
  // Aire alrededor del cuerpo: 7 px sobre un lienzo final de 364×512, medido en
  // el héroe negro, cuyo cuerpo ocupaba 350×498 dentro de ese lienzo.
  marginX: 7 / 350,   // fracción del ANCHO del cuerpo
  marginY: 7 / 498,   // fracción del ALTO del cuerpo
  width: 364, height: 512,
};
const MINI = {
  // Cuadrado que encierra anillo + cabeza + cascos + PLANETA DEL PECHO.
  left: 0.0007142857142857143,  // fracción del ANCHO del cuerpo
  top: 0.014056224899598393,    // fracción del ALTO del cuerpo
  side: 0.9885714285714285,     // fracción del ANCHO del cuerpo
  size: 256,
};
const ALPHA_THRESHOLD = 8;      // un píxel cuenta como cuerpo si alfa > 8

const WEBP = { quality: 84, alphaQuality: 100 };
const PNG = { compressionLevel: 9 };

const [master, ...flags] = process.argv.slice(2);
const dry = flags.includes('--dry');
if (!master || !existsSync(master)) {
  console.error('uso: node scripts/build-marcy-avatar.mjs <master-transparente.png> [--dry]');
  process.exit(1);
}
const sharp = (await import(pathToFileURL(path.join(REPO, 'node_modules/sharp/lib/index.js')))).default;

async function opaqueBox(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let l = info.width, t = info.height, r = -1, b = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > ALPHA_THRESHOLD) {
        if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y;
      }
    }
  }
  if (r < 0) throw new Error('el master no tiene ningún píxel opaco');
  return { left: l, top: t, width: r - l + 1, height: b - t + 1 };
}

// extract() exige enteros y no admite salirse del lienzo: recorta lo que pida y
// repone con transparencia lo que falte, para no desplazar el encuadre.
async function extractPadded(input, rect, canvas) {
  const safe = {
    left: Math.max(0, rect.left), top: Math.max(0, rect.top),
    width: Math.min(rect.width + Math.min(0, rect.left), canvas.width - Math.max(0, rect.left)),
    height: Math.min(rect.height + Math.min(0, rect.top), canvas.height - Math.max(0, rect.top)),
  };
  const buf = await sharp(input).extract(safe).png().toBuffer();
  const padLeft = safe.left - rect.left, padTop = safe.top - rect.top;
  const padRight = rect.width - safe.width - padLeft, padBottom = rect.height - safe.height - padTop;
  if (!padLeft && !padTop && !padRight && !padBottom) return buf;
  return sharp(buf).extend({
    left: padLeft, top: padTop, right: padRight, bottom: padBottom,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).png().toBuffer();
}

const meta = await sharp(master).metadata();
const body = await opaqueBox(master);
console.log(`master ${meta.width}×${meta.height} · bbox opaco del cuerpo ${JSON.stringify(body)}`);

// ── HÉROE ──────────────────────────────────────────────────────────────────
const mx = Math.round(body.width * HERO.marginX);
const my = Math.round(body.height * HERO.marginY);
const heroRect = {
  left: body.left - mx, top: body.top - my,
  width: body.width + 2 * mx, height: body.height + 2 * my,
};
const heroCrop = await extractPadded(master, heroRect, meta);
// Escalar por ALTO y cuadrar el ancho a 364 sin deformar (relleno simétrico).
const scaled = await sharp(heroCrop).resize({ height: HERO.height }).png().toBuffer();
const sm = await sharp(scaled).metadata();
const dx = HERO.width - sm.width;
const heroFinal = dx === 0 ? scaled : await sharp(scaled).extend({
  left: Math.floor(dx / 2), right: Math.ceil(dx / 2), top: 0, bottom: 0,
  background: { r: 0, g: 0, b: 0, alpha: 0 },
}).png().toBuffer();
console.log(`héroe: recorte ${JSON.stringify(heroRect)} → ${sm.width}×${sm.height} → ${HERO.width}×${HERO.height}`);

// ── BUSTO ──────────────────────────────────────────────────────────────────
const side = Math.round(MINI.side * body.width);
const miniRect = {
  left: Math.round(body.left + MINI.left * body.width),
  top: Math.round(body.top + MINI.top * body.height),
  width: side, height: side,
};
const miniCrop = await extractPadded(master, miniRect, meta);
console.log(`busto: recorte ${JSON.stringify(miniRect)} → ${MINI.size}×${MINI.size}`);

if (dry) { console.log('--dry: no se escribe nada'); process.exit(0); }

for (const [name, buf, size] of [
  ['marcy-hero', heroFinal, null],
  ['marcy-mini', miniCrop, MINI.size],
]) {
  let img = sharp(buf);
  if (size) img = img.resize(size, size, { fit: 'fill' });
  await img.clone().webp(WEBP).toFile(path.join(OUT, `${name}.webp`));
  await img.clone().png(PNG).toFile(path.join(OUT, `${name}.png`));
  const box = await opaqueBox(path.join(OUT, `${name}.png`));
  const m = await sharp(path.join(OUT, `${name}.png`)).metadata();
  console.log(`✓ ${name}: ${m.width}×${m.height} · bbox opaco ${JSON.stringify(box)}`);
}
console.log('\nSi cambian los tamaños, actualiza `dims` en src/components/chat/MarcyAvatar.astro.');
