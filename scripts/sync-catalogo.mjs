#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Copia los precios del catálogo de Ventas al sitio.
//
//   Fuente (privada, fuera del repo):  _cerebro/ventas/catalogo.json
//   Destino (público, generado):       src/i18n/catalogo.generado.ts
//
// Nadie escribe un precio a mano en el sitio: se cambia en el catálogo y se
// corre `npm run sync:catalogo`. `npm run check:precios` falla si el archivo
// generado no coincide con el catálogo o si alguien dejó una cifra suelta.
//
// SOLO se copia el bloque `preciosPublicos`: los «desde» que el dueño decidió
// enseñar (2026-11-19). La lista interna (proyectos, planes, paquetes, añadidos
// y reglas) NO sale de _cerebro: este repo es público y lo que entra en el sitio
// acaba en el navegador.
// ─────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..');

/**
 * El catálogo vive en `Proyectos/_cerebro`, fuera del repo. La ruta relativa
 * no sirve: el sitio se trabaja desde la carpeta principal y también desde
 * copias de trabajo en `.claude/worktrees/`, que cuelgan tres niveles más
 * abajo. Se busca subiendo carpeta a carpeta hasta encontrarlo.
 */
function buscarCatalogo(desdeDir = RAIZ) {
  let dir = desdeDir;
  for (let i = 0; i < 12; i++) {
    const intento = resolve(dir, '_cerebro/ventas/catalogo.json');
    if (existsSync(intento)) return intento;
    const padre = dirname(dir);
    if (padre === dir) break;
    dir = padre;
  }
  return resolve(RAIZ, '../_cerebro/ventas/catalogo.json'); // para el mensaje de error
}

export const CATALOGO_JSON = process.env.MARCYAN_CATALOGO || buscarCatalogo();
export const DESTINO = resolve(RAIZ, 'src/i18n/catalogo.generado.ts');
// El mismo contenido en .mjs, para lo que corre en el servidor (la base de
// conocimiento de Marcy y sus guardas), que no pasa por TypeScript.
export const DESTINO_MJS = resolve(RAIZ, 'lib/catalogo.generado.mjs');

/** Lee el catálogo de Ventas. Lanza si no está donde debe. */
export function leerCatalogo(ruta = CATALOGO_JSON) {
  let crudo;
  try {
    crudo = readFileSync(ruta, 'utf8');
  } catch {
    throw new Error(
      `No encuentro el catálogo de Ventas en:\n  ${ruta}\n` +
        'Es la fuente única de precios y vive en _cerebro (fuera del repo).',
    );
  }
  const c = JSON.parse(crudo);
  for (const clave of ['version', 'moneda', 'preciosPublicos']) {
    if (!c[clave]) throw new Error(`El catálogo no trae "${clave}".`);
  }
  if (c.moneda !== 'USD') throw new Error(`Moneda inesperada: ${c.moneda}`);
  return c;
}

/** Las únicas claves que pueden salir del catálogo hacia el sitio. */
export const CLAVES_PUBLICAS = ['version', 'moneda', 'vigenteDesde', 'anclas', 'mensuales', 'desdePorCategoria'];

/**
 * Lo ÚNICO que sale a la web: el bloque `preciosPublicos` del catálogo.
 *
 * Decisión del dueño (2026-11-19): lo que se publica son anclas, el precio más
 * bajo que se acepta cobrar por cada servicio, siempre con «desde». La lista
 * interna (proyectos, planes, paquetes, añadidos y reglas) es para propuestas,
 * cotizaciones, Orbit y facturas: NO se copia aquí, porque este repo es público
 * y lo que entra en el sitio acaba en el navegador.
 */
export function proyectarPublico(c) {
  const pp = c.preciosPublicos;
  if (!pp || typeof pp.anclas !== 'object') throw new Error('El catálogo no trae "preciosPublicos.anclas".');

  const anclas = {};
  for (const [id, v] of Object.entries(pp.anclas)) {
    if (typeof v !== 'number' || !(v > 0)) throw new Error(`El precio público "${id}" no es un número válido.`);
    anclas[id] = v;
  }

  const mensuales = [...(pp.mensuales ?? [])];
  for (const id of mensuales) {
    if (!(id in anclas)) throw new Error(`"${id}" está en mensuales pero no en anclas.`);
  }

  const desdePorCategoria = (pp.desdePorCategoria ?? []).map((cat) => {
    if (!(cat.ref in anclas)) {
      throw new Error(`La categoría "${cat.categoria}" apunta a "${cat.ref}", que no es un precio público.`);
    }
    return {
      categoria: cat.categoria,
      ref: cat.ref,
      ...(typeof cat.desde === 'number' ? { desde: cat.desde } : {}),
      ...(typeof cat.desdeMensual === 'number' ? { desdeMensual: cat.desdeMensual } : {}),
    };
  });

  return {
    version: c.version,
    moneda: c.moneda,
    vigenteDesde: pp.vigenteDesde ?? null,
    anclas,
    mensuales,
    desdePorCategoria,
  };
}

/** El .ts generado, con el aviso de "no tocar a mano". */
export function renderizar(publico) {
  const json = JSON.stringify(publico, null, 2);
  return `// ⚠️ GENERADO — no lo edites a mano.
// Sale de _cerebro/ventas/catalogo.json (bloque preciosPublicos) con \`npm run sync:catalogo\`.
// Son los precios PÚBLICOS: el mínimo que se cobra por cada servicio, siempre con «desde».
// Para cambiar uno: se cambia en el catálogo de Ventas y se vuelve a correr.
// \`npm run check:precios\` falla si este archivo y el catálogo no coinciden.

export const CATALOGO = ${json} as const;

export type AnclaId = keyof typeof CATALOGO.anclas;

/** Precio público de un nivel. En el sitio se enseña siempre con «desde». */
export function desde(id: AnclaId): number {
  const v = CATALOGO.anclas[id];
  if (typeof v !== 'number') throw new Error(\`"\${id}" no es un precio público.\`);
  return v;
}

/** true si ese nivel se cobra mes a mes. */
export function esMensual(id: AnclaId): boolean {
  return (CATALOGO.mensuales as readonly string[]).includes(id);
}

/** "$1,500" a partir de 1500. */
export function usd(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

/** "$399/mes" (es) · "$399/mo" (en). */
export function usdMes(n: number, lang: 'es' | 'en' = 'es'): string {
  return usd(n) + (lang === 'en' ? '/mo' : '/mes');
}
`;
}

/** La misma lista, en JavaScript corriente, para el servidor. */
export function renderizarMjs(publico) {
  return `// ⚠️ GENERADO — no lo edites a mano.
// Sale de _cerebro/ventas/catalogo.json (bloque preciosPublicos) con \`npm run sync:catalogo\`.
// Gemelo de src/i18n/catalogo.generado.ts, para lo que corre en el servidor.

export const CATALOGO = ${JSON.stringify(publico, null, 2)};

/** Precio público de un nivel. Se enseña siempre con «desde». */
export function desde(id) {
  const v = CATALOGO.anclas[id];
  if (typeof v !== 'number') throw new Error(\`"\${id}" no es un precio público.\`);
  return v;
}

/** true si ese nivel se cobra mes a mes. */
export function esMensual(id) {
  return CATALOGO.mensuales.includes(id);
}

/** "$1,500" a partir de 1500. */
export function usd(n) {
  return '$' + n.toLocaleString('en-US');
}
`;
}

export function sincronizar() {
  const c = leerCatalogo();
  const publico = proyectarPublico(c);
  writeFileSync(DESTINO, renderizar(publico), 'utf8');
  writeFileSync(DESTINO_MJS, renderizarMjs(publico), 'utf8');
  return { version: c.version, destino: DESTINO, anclas: Object.keys(publico.anclas).length, categorias: publico.desdePorCategoria.length };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('sync-catalogo.mjs')) {
  try {
    const r = sincronizar();
    console.log(`OK → ${r.destino}`);
    console.log(`   catálogo ${r.version} · ${r.anclas} precios públicos · ${r.categorias} categorías`);
  } catch (e) {
    console.error('FALLO:', e.message);
    process.exit(1);
  }
}
