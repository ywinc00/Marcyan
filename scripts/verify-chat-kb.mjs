// ════════════════════════════════════════════════════════════════
//  scripts/verify-chat-kb.mjs  ·  npm run check:kb
//  Guarda de DRIFT: las anclas de precio del bot (lib/chat-kb.mjs → PRICES)
//  y las del sitio (src/i18n/pricing.ts → PRICE_ANCHORS) deben ser EXACTAMENTE
//  los precios públicos del catálogo de Ventas, y el NAP el de src/i18n/content.ts.
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

// ── Precios: precios públicos del catálogo ⇄ sitio ⇄ PRICES (chat-kb.mjs) ──
// El sitio y Marcy leen la MISMA lista: el bloque preciosPublicos del catálogo
// de Ventas (lib/catalogo.generado.mjs). Aquí se comprueba que ninguno de los
// dos se haya salido de ella.
const { CATALOGO } = await import('../lib/catalogo.generado.mjs');
const anchors = CATALOGO.anclas;

// 1 · El sitio no define precios propios: PRICE_ANCHORS ES la lista pública.
if (!/export const PRICE_ANCHORS\s*=\s*CATALOGO\.anclas\s*;/.test(pricingSrc)) {
  errors.push('src/i18n/pricing.ts ya no dice `export const PRICE_ANCHORS = CATALOGO.anclas;`. Los precios del sitio tienen que salir de la lista pública, sin cifras propias.');
}

// 2 · Marcy y el sitio no pueden ver nada de la lista interna.
for (const clave of Object.keys(CATALOGO)) {
  if (!['version', 'moneda', 'vigenteDesde', 'anclas', 'mensuales', 'desdePorCategoria'].includes(clave)) {
    errors.push(`La lista generada trae "${clave}", que no es un dato público. Solo sale preciosPublicos.`);
  }
}

if (Object.keys(anchors).length === 0) errors.push('La lista de precios públicos está vacía.');

// 3 · Toda ancla pública debe existir en el bot con el MISMO valor y la misma periodicidad.
for (const [key, val] of Object.entries(anchors)) {
  const got = PRICES[key];
  if (!got) errors.push(`Falta en chat-kb PRICES la clave '${key}' (público=${val}).`);
  else {
    if (got.value !== val) errors.push(`Precio desincronizado '${key}': público=${val} vs chat-kb=${got.value}.`);
    if (Boolean(got.monthly) !== CATALOGO.mensuales.includes(key)) errors.push(`'${key}': el bot y la lista pública no coinciden en si es mensual.`);
  }
}
// 4 · Todo precio del bot debe estar respaldado por un precio público.
for (const key of Object.keys(PRICES)) {
  if (!(key in anchors)) errors.push(`chat-kb PRICES tiene '${key}', que no es un precio público.`);
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
