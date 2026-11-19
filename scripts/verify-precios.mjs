#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Vigila que ningún precio del sitio esté escrito a mano.
//
//   1) El archivo generado (src/i18n/catalogo.generado.ts) coincide con el
//      catálogo de Ventas. Si alguien tocó uno de los dos, falla.
//   2) En los archivos vigilados no queda ninguna cifra en dólares suelta.
//      Todo precio sale de `catalogo.generado.ts`.
//
// Correr: npm run check:precios
// ─────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'node:fs';
import { leerCatalogo, proyectarPublico, renderizar, DESTINO, CATALOGO_JSON } from './sync-catalogo.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..');

// Archivos donde un precio a mano es un error. Los artículos del blog NO entran:
// los lleva el chat de Contenido y se migran en su propio encargo.
const VIGILADOS = [
  'src/i18n/**/*.ts',
  'src/components/w/**/*.ts',
  'src/components/w/**/*.astro',
  'src/components/sections/**/*.astro',
  'src/pages/**/*.astro',
  'src/lib/chat-format.mjs',
  'public/llms.txt',
];

// Lo que NO es un precio nuestro, con su motivo. Cada entrada se justifica.
const PERDONADOS = [
  // El propio archivo generado ES la lista de precios.
  { patron: /^src\/i18n\/catalogo\.generado\.ts$/, motivo: 'es la lista generada' },
  // Cifras del mercado con fuente citada (no son precios de Marcyan).
  { texto: /\$\d[\d,]*\s*(?:a|-|–|to)\s*\$\d/, motivo: 'rango de mercado con fuente' },
  // Carta y pedido de la maqueta de restaurante: precios inventados de un
  // negocio de ejemplo dentro de una ilustración, no tarifas de Marcyan.
  { patron: /^src\/components\/w\/heroes\/HeroRestaurante\.astro$/, motivo: 'carta de la maqueta de ejemplo' },
];

// Un precio de verdad lleva al menos tres cifras ($150, $1,500). Los `$1`..`$99`
// sueltos son casi siempre grupos de una expresión regular o un céntimo de una
// maqueta, no una tarifa.
const RE_DOLAR = /\$\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?|\$\s?\d{3,}(?:\.\d+)?/g;

/** Comentario de código: explica, no se publica. */
function esComentario(linea) {
  const t = linea.trim();
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('<!--');
}

function listar() {
  const fuera = new Set();
  const archivos = new Set();
  for (const patron of VIGILADOS) {
    let encontrados = [];
    try {
      encontrados = globSync(patron, { cwd: RAIZ });
    } catch {
      fuera.add(patron);
      continue;
    }
    for (const f of encontrados) archivos.add(f.split('\\').join('/'));
  }
  return { archivos: [...archivos].sort(), fuera: [...fuera] };
}

function perdonado(rel, linea) {
  for (const p of PERDONADOS) {
    if (p.patron && p.patron.test(rel)) return p.motivo;
    if (p.texto && p.texto.test(linea)) return p.motivo;
  }
  return null;
}

function main() {
  const fallos = [];

  // 1 · el generado va al día con el catálogo
  if (!existsSync(DESTINO)) {
    fallos.push(`Falta ${relative(RAIZ, DESTINO)}. Corre: npm run sync:catalogo`);
  } else {
    let esperado;
    try {
      esperado = renderizar(proyectarPublico(leerCatalogo()));
    } catch (e) {
      fallos.push(`No pude leer el catálogo de Ventas: ${e.message}`);
    }
    if (esperado) {
      const actual = readFileSync(DESTINO, 'utf8');
      if (actual.replace(/\r\n/g, '\n') !== esperado.replace(/\r\n/g, '\n')) {
        fallos.push(
          `La lista del sitio no coincide con el catálogo de Ventas.\n` +
            `   Catálogo: ${CATALOGO_JSON}\n` +
            `   Si cambiaste un precio en el catálogo, corre: npm run sync:catalogo\n` +
            `   Si editaste la lista a mano, deshazlo: los precios se cambian en el catálogo.`,
        );
      }
    }
  }

  // 2 · ninguna cifra suelta en los vigilados
  const { archivos } = listar();
  const sueltas = [];
  for (const rel of archivos) {
    const txt = readFileSync(resolve(RAIZ, rel), 'utf8');
    txt.split('\n').forEach((linea, i) => {
      const m = linea.match(RE_DOLAR);
      if (!m) return;
      if (esComentario(linea)) return;
      if (perdonado(rel, linea)) return;
      sueltas.push(`${rel}:${i + 1}  ${m.join(' ')}   ${linea.trim().slice(0, 90)}`);
    });
  }
  if (sueltas.length) {
    fallos.push(
      `${sueltas.length} precio(s) escritos a mano. Tienen que salir de catalogo.generado.ts:\n` +
        sueltas.map((s) => '   ' + s).join('\n'),
    );
  }

  if (fallos.length) {
    console.error('check:precios FALLA\n');
    for (const f of fallos) console.error('• ' + f + '\n');
    process.exit(1);
  }
  console.log(`check:precios OK · ${archivos.length} archivos vigilados, 0 cifras a mano`);
}

main();
