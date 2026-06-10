// ════════════════════════════════════════════════════════════════
//  scripts/verify-chat-kb.mjs  ·  npm run check:kb
//  Guarda de DRIFT: los precios y el NAP del bot (lib/chat-kb.mjs)
//  deben coincidir con la fuente de verdad del sitio (src/i18n/*.ts).
//  Sale != 0 si hay desincronización → protege la directiva de honestidad.
// ════════════════════════════════════════════════════════════════
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PRICES, NAP } from '../lib/chat-kb.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pricingSrc = await readFile(join(root, 'src/i18n/pricing.ts'), 'utf8');
const contentSrc = await readFile(join(root, 'src/i18n/content.ts'), 'utf8');

// id en pricing.ts → clave en PRICES de chat-kb.mjs
const ID_TO_KEY = {
  'diseno-web': 'web',
  'ia-conversacional': 'ia',
  ecommerce: 'ecommerce',
  'seo-local': 'seoLocal',
  branding: 'branding',
  mantenimiento: 'maintenance',
};

const errors = [];

// ── Precios: id + priceValue aparecen en orden dentro de cada item ──
const ids = [...pricingSrc.matchAll(/id:\s*'([\w-]+)'/g)].map((m) => m[1]);
const vals = [...pricingSrc.matchAll(/priceValue:\s*'(\d+)'/g)].map((m) => Number(m[1]));

if (ids.length !== 6 || vals.length !== 6) {
  errors.push(`Esperaba 6 servicios con precio en pricing.ts; encontré ${ids.length} ids y ${vals.length} priceValue.`);
} else {
  ids.forEach((id, i) => {
    const key = ID_TO_KEY[id];
    if (!key) { errors.push(`id no mapeado en pricing.ts: '${id}'`); return; }
    const got = PRICES[key] && PRICES[key].value;
    if (got !== vals[i]) errors.push(`Precio desincronizado '${id}': pricing.ts=${vals[i]} vs chat-kb=${got}`);
  });
}

// ── NAP (la 1ª aparición de cada campo es la del objeto nap, arriba del archivo) ──
const napFields = {
  email: /email:\s*'([^']+)'/,
  houston: /houston:\s*'([^']+)'/,
  miami: /miami:\s*'([^']+)'/,
};
for (const [k, rx] of Object.entries(napFields)) {
  const m = contentSrc.match(rx);
  if (!m) { errors.push(`No encontré nap.${k} en content.ts`); continue; }
  if (m[1] !== NAP[k]) errors.push(`NAP desincronizado '${k}': content.ts='${m[1]}' vs chat-kb='${NAP[k]}'`);
}

if (errors.length) {
  console.error('✗ KB del chatbot DESINCRONIZADA:\n - ' + errors.join('\n - '));
  process.exit(1);
}
console.log('✓ KB del chatbot sincronizada: 6 precios + NAP coinciden con src/i18n/*.ts');
