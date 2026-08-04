// Genera variantes responsive de las capturas de /public/Galeria.
// One-off: se corre a mano y las variantes se comitean. No toca los originales.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const DIR = 'public/Galeria';
for (const f of readdirSync(DIR)) {
  if (f.endsWith('-pc.webp') && !f.includes('-pc-')) {
    await sharp(join(DIR, f)).resize({ width: 900 }).webp({ quality: 80 })
      .toFile(join(DIR, f.replace('-pc.webp', '-pc-900.webp')));
  }
  if (f.endsWith('-movil.webp') && !f.includes('-movil-')) {
    await sharp(join(DIR, f)).resize({ width: 520 }).webp({ quality: 80 })
      .toFile(join(DIR, f.replace('-movil.webp', '-movil-520.webp')));
  }
}
console.log('variantes listas');
