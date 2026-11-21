#!/usr/bin/env node
// ───────────────────────────────────────────────────────────
// Copia al sitio el NOMBRE y la FRASE de los planes que el diagnóstico puede
// recomendar (Ventas §5, aprobado por el dueño el 2026-11-18 y 2026-11-20).
//
//   Fuente (privada, fuera del repo):  _cerebro/ventas/catalogo.json
//   Destino (público, generado):       lib/planes.generado.mjs
//
// Solo salen las claves de texto de los planes con `enPropuestas`: nombre,
// nombre en inglés y frase. Nada de cifras: los precios de los planes, los
// paquetes y sus proyectos son internos y se leen de la base (`sales_catalog`)
// cuando hace falta, nunca de este repo, que es público.
//
//   npm run sync:planes          → reescribe el archivo
//   npm run sync:planes -- --check → falla si no coincide con el catálogo
// ───────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCatalogo } from './sync-catalogo.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DESTINO_PLANES = resolve(RAIZ, 'lib/planes.generado.mjs');

// `fraseEn` (frase en inglés) todavía no: es propuesta de Ventas a falta del OK del dueño.
// Cuando Bases y Estructura la confirme, se añade aquí y planText() la usa sola.
const CAMPOS = ['nombre', 'en', 'frase'];

/** Planes recomendables, ordenados por nivel, solo con sus textos. */
export function proyectarPlanes(c) {
  const planes = c && c.planes;
  if (!planes || typeof planes !== 'object') throw new Error('El catálogo no trae "planes".');
  const out = {};
  for (const [clave, p] of Object.entries(planes).sort((a, b) => (a[1].nivel || 0) - (b[1].nivel || 0))) {
    if (!p || p.enPropuestas !== true) continue;
    const t = {};
    for (const k of CAMPOS) if (typeof p[k] === 'string' && p[k].trim()) t[k] = p[k].trim();
    if (!t.nombre || !t.en || !t.frase) throw new Error(`El plan "${clave}" no trae nombre, nombre en inglés y frase.`);
    for (const v of Object.values(t)) {
      if (/\d/.test(v)) throw new Error(`El texto del plan "${clave}" lleva cifras: "${v}". Aquí no puede salir ningún número.`);
    }
    out[clave] = t;
  }
  if (!Object.keys(out).length) throw new Error('Ningún plan con enPropuestas en el catálogo.');
  return out;
}

export function renderizarPlanes(planes, version) {
  return `// ARCHIVO GENERADO por scripts/sync-planes.mjs desde el catálogo de Ventas
// (versión ${version}). No se edita a mano: se cambia el catálogo y se corre
// \`npm run sync:planes\`. Solo textos de los planes que el diagnóstico puede
// recomendar; ningún precio (los precios viven en la base, tabla sales_catalog).
export const PLANES = ${JSON.stringify(planes, null, 2)};
`;
}

export function sincronizarPlanes({ check = false } = {}) {
  const c = leerCatalogo();
  const texto = renderizarPlanes(proyectarPlanes(c), c.version);
  if (check) {
    let actual = '';
    try { actual = readFileSync(DESTINO_PLANES, 'utf8'); } catch { /* falta */ }
    const norm = (s) => s.replace(/\r\n/g, '\n');
    if (norm(actual) !== norm(texto)) throw new Error('lib/planes.generado.mjs no coincide con el catálogo: corre `npm run sync:planes`.');
    return { version: c.version, ok: true };
  }
  writeFileSync(DESTINO_PLANES, texto, 'utf8');
  return { version: c.version, ok: true };
}

if (process.argv[1]?.endsWith('sync-planes.mjs')) {
  const check = process.argv.includes('--check');
  try {
    const r = sincronizarPlanes({ check });
    console.log(check ? `✓ planes al día con el catálogo ${r.version}` : `OK → ${DESTINO_PLANES} (catálogo ${r.version})`);
  } catch (e) {
    console.error('FALLO:', e.message);
    process.exit(1);
  }
}
