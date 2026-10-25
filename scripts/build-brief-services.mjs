// ════════════════════════════════════════════════════════════════
//  scripts/build-brief-services.mjs  ·  npm run gen:brief-services
//  Genera lib/brief-services.generated.mjs a partir del CATÁLOGO del sitio
//  (src/i18n/pricing.ts + src/i18n/pricing.en.ts). El esquema del brief
//  (lib/brief-schema.mjs) lo importa para el campo "services" y las
//  condiciones por servicio, SIN copiar precios a mano.
//
//  Por qué un generador: las funciones de Vercel (.mjs) no pueden importar
//  .ts en tiempo de ejecución. Aquí, en local, Node 22.18+/24 quita los tipos
//  de pricing.ts al importarlo. El inglés (pricing.en.ts) importa './pricing'
//  sin extensión, así que se copia a un temporal con la ruta resuelta.
//
//  --check  → no escribe; sale con código 1 si el archivo generado está
//             desfasado del catálogo (lo usa scripts/test-brief-v2.mjs).
// ════════════════════════════════════════════════════════════════
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import crypto from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PRICING_ES = join(root, 'src/i18n/pricing.ts');
const PRICING_EN = join(root, 'src/i18n/pricing.en.ts');
export const OUT_FILE = join(root, 'lib/brief-services.generated.mjs');

async function loadCatalogs() {
  const es = await import(pathToFileURL(PRICING_ES).href);
  // pricing.en.ts → temporal con el import de './pricing' apuntando al archivo real.
  const enSrc = (await readFile(PRICING_EN, 'utf8'))
    .replace(/from\s+'\.\/pricing'/g, `from '${pathToFileURL(PRICING_ES).href}'`)
    .replace(/from\s+'\.\.\/lib\/schema'/g, `from '${pathToFileURL(join(root, 'src/lib/schema.ts')).href}'`);
  const tmp = join(tmpdir(), `mrc-pricing-en-${crypto.randomBytes(6).toString('hex')}.ts`);
  await writeFile(tmp, enSrc, 'utf8');
  try {
    const en = await import(pathToFileURL(tmp).href);
    return { es, en };
  } finally {
    await unlink(tmp).catch(() => {});
  }
}

// Forma estable (solo lo que el brief necesita: ids, nombres, unidad y niveles).
export async function buildServices() {
  const { es, en } = await loadCatalogs();
  const enById = new Map(en.catalog.map((p) => [p.id, p]));
  return es.catalog.map((p) => {
    const pe = enById.get(p.id);
    if (!pe) throw new Error(`pricing.en.ts no tiene el producto '${p.id}'`);
    const enTiers = new Map(pe.tiers.map((t) => [t.key, t]));
    return {
      id: p.id,
      name: { es: p.name, en: pe.name },
      unit: { es: p.anchorUnit, en: pe.anchorUnit },
      tiers: p.tiers.map((t) => {
        const te = enTiers.get(t.key);
        if (!te) throw new Error(`pricing.en.ts no tiene el nivel '${t.key}' de '${p.id}'`);
        return {
          key: t.key,
          name: { es: t.name, en: te.name },
          value: t.value,                 // USD; null = gratis
          monthly: Boolean(t.monthly),
          display: { es: t.display, en: te.display },
        };
      }),
    };
  });
}

export async function buildSource() {
  const services = await buildServices();
  return [
    '// ════════════════════════════════════════════════════════════════',
    '//  lib/brief-services.generated.mjs · ARCHIVO GENERADO, NO EDITAR A MANO',
    '//  Fuente: src/i18n/pricing.ts (+ pricing.en.ts). Regenerar con:',
    '//    npm run gen:brief-services',
    '//  npm run test:brief falla si este archivo se desfasa del catálogo.',
    '// ════════════════════════════════════════════════════════════════',
    `export const BRIEF_SERVICES = Object.freeze(${JSON.stringify(services, null, 2)});`,
    '',
  ].join('\n');
}

// Devuelve { ok, expected, actual } sin escribir.
export async function checkGenerated() {
  const expected = await buildSource();
  const actual = await readFile(OUT_FILE, 'utf8').catch(() => '');
  return { ok: actual.replace(/\r\n/g, '\n') === expected, expected, actual };
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  if (process.argv.includes('--check')) {
    const r = await checkGenerated();
    if (!r.ok) {
      console.error('✗ lib/brief-services.generated.mjs está desfasado del catálogo. Corre: npm run gen:brief-services');
      process.exit(1);
    }
    console.log('✓ Servicios del brief sincronizados con src/i18n/pricing.ts');
  } else {
    await writeFile(OUT_FILE, await buildSource(), 'utf8');
    console.log('✓ Generado lib/brief-services.generated.mjs');
  }
}
