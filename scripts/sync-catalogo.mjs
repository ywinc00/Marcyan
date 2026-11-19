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
// SOLO se copia lo que la web enseña (nombres y precios). Las reglas internas
// del catálogo (piso sobre base, descuentos, cupos, cobro) NO salen de
// _cerebro: este repo puede ser público.
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
  for (const clave of ['version', 'moneda', 'proyectos', 'planes']) {
    if (!c[clave]) throw new Error(`El catálogo no trae "${clave}".`);
  }
  if (c.moneda !== 'USD') throw new Error(`Moneda inesperada: ${c.moneda}`);
  return c;
}

/** Lo que SÍ sale a la web: nombres y precios. Nada de reglas internas. */
export function proyectarPublico(c) {
  const proyectos = {};
  for (const [id, p] of Object.entries(c.proyectos)) {
    const fila = { nombre: p.nombre };
    if (typeof p.precio === 'number') fila.precio = p.precio;
    if (typeof p.desde === 'number') fila.desde = p.desde;
    if (typeof p.mensual === 'number') fila.mensual = p.mensual;
    if (typeof p.segundoIdioma === 'number') fila.segundoIdioma = p.segundoIdioma;
    proyectos[id] = fila;
  }

  const planes = {};
  for (const [id, p] of Object.entries(c.planes)) {
    planes[id] = {
      nivel: p.nivel,
      nombre: p.nombre,
      en: p.en,
      mensual: p.mensual,
      frase: p.frase,
      ...(p.recomendado ? { recomendado: true } : {}),
    };
  }

  const anadidos = {};
  for (const [id, a] of Object.entries(c.anadidosMensuales ?? {})) {
    anadidos[id] = { nombre: a.nombre, mensual: a.mensual };
  }

  const paquetes = (c.paquetes ?? []).map((p) => ({
    plan: p.plan,
    proyecto: p.proyecto,
    orden: p.orden,
    papel: p.papel,
  }));

  // El precio de entrada que el dueño quiere ver por servicio en la web, las
  // fichas y los perfiles. Es lo que manda sobre el «desde» de cada página.
  const desdePorServicio = (c.desdePorServicio?.servicios ?? []).map((s) => ({
    servicio: s.servicio,
    ref: s.ref,
    ...(typeof s.desde === 'number' ? { desde: s.desde } : {}),
    ...(typeof s.desdeMensual === 'number' ? { desdeMensual: s.desdeMensual } : {}),
    ...(typeof s.cuotaMensual === 'number' ? { cuotaMensual: s.cuotaMensual } : {}),
    ...(s.mensual ? { mensual: s.mensual } : {}),
  }));

  return { version: c.version, moneda: c.moneda, proyectos, planes, anadidos, paquetes, desdePorServicio };
}

/** El .ts generado, con el aviso de "no tocar a mano". */
export function renderizar(publico) {
  const json = JSON.stringify(publico, null, 2).replace(/\n/g, '\n');
  return `// ⚠️ GENERADO — no lo edites a mano.
// Sale de _cerebro/ventas/catalogo.json con \`npm run sync:catalogo\`.
// Para cambiar un precio: se cambia en el catálogo de Ventas y se vuelve a correr.
// \`npm run check:precios\` falla si este archivo y el catálogo no coinciden.

export const CATALOGO = ${json} as const;

export type ProyectoId = keyof typeof CATALOGO.proyectos;
export type PlanId = keyof typeof CATALOGO.planes;

/** Precio de arranque de un proyecto: su \`desde\` si lo tiene, si no su \`precio\`. */
export function desde(id: ProyectoId): number {
  const p = CATALOGO.proyectos[id] as { precio?: number; desde?: number };
  const v = p.desde ?? p.precio;
  if (typeof v !== 'number') throw new Error(\`El proyecto "\${id}" no tiene precio.\`);
  return v;
}

/** Cuota mensual de un proyecto (los que la tienen). */
export function mensualDe(id: ProyectoId): number {
  const p = CATALOGO.proyectos[id] as { mensual?: number };
  if (typeof p.mensual !== 'number') throw new Error(\`El proyecto "\${id}" no tiene mensualidad.\`);
  return p.mensual;
}

/** Cuota mensual de un plan. */
export function mensualPlan(id: PlanId): number {
  return CATALOGO.planes[id].mensual;
}

/** "$1,950" a partir de 1950. */
export function usd(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

/** "$199/mes" (es) · "$199/mo" (en). */
export function usdMes(n: number, lang: 'es' | 'en' = 'es'): string {
  return usd(n) + (lang === 'en' ? '/mo' : '/mes');
}
`;
}

/** La misma lista, en JavaScript corriente, para el servidor. */
export function renderizarMjs(publico) {
  return `// ⚠️ GENERADO — no lo edites a mano.
// Sale de _cerebro/ventas/catalogo.json con \`npm run sync:catalogo\`.
// Gemelo de src/i18n/catalogo.generado.ts, para lo que corre en el servidor.

export const CATALOGO = ${JSON.stringify(publico, null, 2)};

/** Precio de arranque de un proyecto: su \`desde\` si lo tiene, si no su \`precio\`. */
export function desde(id) {
  const p = CATALOGO.proyectos[id];
  const v = p && (p.desde ?? p.precio);
  if (typeof v !== 'number') throw new Error(\`El proyecto "\${id}" no tiene precio.\`);
  return v;
}

/** "$1,950" a partir de 1950. */
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
  return { version: c.version, destino: DESTINO, proyectos: Object.keys(publico.proyectos).length, planes: Object.keys(publico.planes).length };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('sync-catalogo.mjs')) {
  try {
    const r = sincronizar();
    console.log(`OK → ${r.destino}`);
    console.log(`   catálogo ${r.version} · ${r.proyectos} proyectos · ${r.planes} planes`);
  } catch (e) {
    console.error('FALLO:', e.message);
    process.exit(1);
  }
}
