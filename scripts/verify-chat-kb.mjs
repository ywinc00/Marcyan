// ════════════════════════════════════════════════════════════════
//  scripts/verify-chat-kb.mjs  ·  npm run check:kb
//  Guarda de DRIFT: las anclas de precio del bot (lib/chat-kb.mjs → PRICES)
//  deben coincidir EXACTAMENTE con la fuente de verdad del sitio
//  (src/i18n/pricing.ts → PRICE_ANCHORS), y el NAP con src/i18n/content.ts.
//  Sale != 0 si hay desincronización → protege la directiva de honestidad
//  (el bot solo cita precios que el sitio publica, y viceversa).
// ════════════════════════════════════════════════════════════════
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PRICES, NAP } from '../lib/chat-kb.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pricingSrc = await readFile(join(root, 'src/i18n/pricing.ts'), 'utf8');
const contentSrc = await readFile(join(root, 'src/i18n/content.ts'), 'utf8');

const errors = [];

// ── Precios: PRICE_ANCHORS (pricing.ts) ⇄ PRICES (chat-kb.mjs) ──
// Parsea el bloque `export const PRICE_ANCHORS = { ... } as const;`.
const block = pricingSrc.match(/export const PRICE_ANCHORS\s*=\s*\{([\s\S]*?)\}\s*as const/);
if (!block) {
  errors.push('No encontré el bloque `export const PRICE_ANCHORS = { ... } as const` en src/i18n/pricing.ts.');
} else {
  const anchors = {};
  for (const m of block[1].matchAll(/(\w+):\s*(\d+)/g)) anchors[m[1]] = Number(m[2]);

  const anchorKeys = Object.keys(anchors);
  if (anchorKeys.length === 0) errors.push('PRICE_ANCHORS está vacío o no se pudo parsear.');

  // Toda ancla del sitio debe existir en el bot con el MISMO valor.
  for (const [key, val] of Object.entries(anchors)) {
    const got = PRICES[key] && PRICES[key].value;
    if (got === undefined) errors.push(`Falta en chat-kb PRICES la clave '${key}' (pricing.ts=${val}).`);
    else if (got !== val) errors.push(`Precio desincronizado '${key}': pricing.ts=${val} vs chat-kb=${got}.`);
  }
  // Todo precio del bot debe estar respaldado por una ancla del sitio.
  for (const key of Object.keys(PRICES)) {
    if (!(key in anchors)) errors.push(`chat-kb PRICES tiene '${key}' sin ancla en pricing.ts (precio no respaldado).`);
  }
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
console.log(`✓ KB del chatbot sincronizada: ${Object.keys(PRICES).length} anclas de precio + NAP coinciden con src/i18n/*.ts`);
