#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Vigila los precios que el sitio enseña.
//
//   1) Las dos listas generadas (src/i18n/catalogo.generado.ts y su gemela
//      lib/catalogo.generado.mjs) coinciden con el bloque `preciosPublicos`
//      del catálogo de Ventas. Si alguien tocó una de las tres, falla.
//   2) De ese catálogo solo sale lo público. Si la lista generada trae algo de
//      la lista interna (proyectos, planes, paquetes…), falla: el repo es
//      público y lo que entra en el sitio acaba en el navegador.
//   3) En los archivos vigilados no queda ninguna cifra en dólares suelta.
//      Todo precio sale de `catalogo.generado.ts`.
//   4) Regla del ancla: ninguna frase lidera con el nivel alto de un servicio
//      («desde» + sitio completo, asistente completo, tienda a medida o
//      identidad completa) sin haber dado antes su precio más bajo.
//
// Correr: npm run check:precios
// ─────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'node:fs';
import {
  leerCatalogo,
  proyectarPublico,
  renderizar,
  renderizarMjs,
  DESTINO,
  DESTINO_MJS,
  CATALOGO_JSON,
  CLAVES_PUBLICAS,
} from './sync-catalogo.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..');

// Archivos donde un precio a mano es un error.
const VIGILADOS = [
  'src/i18n/**/*.ts',
  'src/components/w/**/*.ts',
  'src/components/w/**/*.astro',
  'src/components/sections/**/*.astro',
  'src/pages/**/*.astro',
  'src/pages/**/*.ts',
  'src/lib/chat-format.mjs',
  // Lo que Marcy sabe de precios: tiene que salir de la misma lista pública.
  'lib/chat-kb.mjs',
  // El blog no puede interpolar: sus artículos no llevan cifras nuestras,
  // remiten a /es/precios. Las cifras de mercado con fuente sí pasan (abajo).
  'src/content/blog/**/*.md',
];

// Lo que NO es un precio nuestro, con su motivo. Cada entrada se justifica.
const PERDONADOS = [
  // El propio archivo generado ES la lista de precios.
  { patron: /^src\/i18n\/catalogo\.generado\.ts$/, motivo: 'es la lista generada' },
  // Cifras del mercado con fuente citada (no son precios de Marcyan).
  { texto: /\$\d[\d,]*\s*(?:a|-|–|to|y|hasta)\s*(?:más de\s*)?\$\d/, motivo: 'rango de mercado con fuente' },
  // Carta y pedido de la maqueta de restaurante: precios inventados de un
  // negocio de ejemplo dentro de una ilustración, no tarifas de Marcyan.
  { patron: /^src\/components\/w\/heroes\/HeroRestaurante\.astro$/, motivo: 'carta de la maqueta de ejemplo' },
  // Lo que vale el TRABAJO DEL CLIENTE (un tejado, una obra), no lo que
  // cobramos nosotros: va en el texto que explica por qué perder una llamada
  // le sale caro a un contratista.
  {
    texto: /\$[\d,]+(?:\s+(?:o|or)\s+\$[\d,]+)?\s+(?:job|trabajo|obra|presupuesto)|trabajo de \$|job worth|se te va|walks away/i,
    motivo: 'valor del trabajo del cliente',
  },
];

// En el blog una cifra solo es un fallo si la frase habla de NOSOTROS. Las del
// mercado (con su fuente) y las de terceros (Meta, apps por suscripción) se
// quedan: son el contenido del artículo.
const ES_BLOG = /^src\/content\/blog\//;
const HABLA_DE_NOSOTROS = /Marcyan|\bnosotros\b|\bnuestr[oa]s?\b|\bcobramos\b|\bpublicamos\b/i;

// Un precio de verdad lleva al menos tres cifras ($150, $1,500). Los `$1`..`$99`
// sueltos son casi siempre grupos de una expresión regular o un céntimo de una
// maqueta, no una tarifa.
const RE_DOLAR = /\$\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?|\$\s?\d{3,}(?:\.\d+)?/g;

// ── Regla del ancla ───────────────────────────────────────────
// Nivel alto de cada servicio → su precio más bajo, que tiene que ir antes.
const ALTO_BAJO = { web: 'webLanding', ia: 'iaBasic', ecommerce: 'ecommerceEssential', branding: 'brandingLogo' };
// «desde $X», «from $X», «empieza en $X»… con X = un nivel alto.
const RE_LIDERA_ALTO =
  /(?:desde|from|starting at|starts? at|empieza[n]? (?:en|desde|alrededor de)|a partir de)\s+(?:<em>)?\$\{usd\((?:PRICE_ANCHORS|A)\.(web|ia|ecommerce|branding)\)\}/gi;
// Sitios donde el nivel alto va junto a su nombre y no hay nada que anteponer.
const ANCLA_PERDONADA = [
  {
    patron: /^src\/components\/w\/proceso\/proceso\.ts$/,
    motivo: 'maqueta de una propuesta: el alcance ya dice «Sitio a medida»',
  },
  { texto: /^\s*slice:/, motivo: 'etiqueta del nivel alto, se pinta junto a su nombre y bajo la cifra baja' },
  { texto: /bottomRight=\{\{\s*label:/, motivo: 'esquina del nivel alto de la tarjeta: lleva su nombre al lado' },
];

/** Comentario de código: explica, no se publica. */
function esComentario(linea) {
  const t = linea.trim();
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('<!--');
}

function listar() {
  const archivos = new Set();
  for (const patron of VIGILADOS) {
    let encontrados = [];
    try {
      encontrados = globSync(patron, { cwd: RAIZ });
    } catch {
      continue;
    }
    for (const f of encontrados) archivos.add(f.split('\\').join('/'));
  }
  return [...archivos].sort();
}

function perdonado(rel, linea) {
  for (const p of PERDONADOS) {
    if (p.patron && p.patron.test(rel)) return p.motivo;
    if (p.texto && p.texto.test(linea)) return p.motivo;
  }
  return null;
}

/** Frases de un párrafo de Markdown (para mirar solo la que lleva la cifra). */
function frases(linea) {
  return linea.split(/(?<=[.!?])\s+/);
}

function main() {
  const fallos = [];

  // 1 · las listas generadas van al día con el catálogo
  let publico;
  try {
    publico = proyectarPublico(leerCatalogo());
  } catch (e) {
    fallos.push(`No pude leer el catálogo de Ventas: ${e.message}`);
  }
  if (publico) {
    const pares = [
      [DESTINO, renderizar(publico)],
      [DESTINO_MJS, renderizarMjs(publico)],
    ];
    for (const [ruta, esperado] of pares) {
      const rel = relative(RAIZ, ruta).split('\\').join('/');
      if (!existsSync(ruta)) {
        fallos.push(`Falta ${rel}. Corre: npm run sync:catalogo`);
        continue;
      }
      const actual = readFileSync(ruta, 'utf8');
      if (actual.replace(/\r\n/g, '\n') !== esperado.replace(/\r\n/g, '\n')) {
        fallos.push(
          `${rel} no coincide con los precios públicos del catálogo de Ventas.\n` +
            `   Catálogo: ${CATALOGO_JSON}\n` +
            `   Si cambiaste un precio en el catálogo, corre: npm run sync:catalogo\n` +
            `   Si editaste la lista a mano, deshazlo: los precios se cambian en el catálogo.`,
        );
      }
    }

    // 2 · del catálogo solo sale lo público
    const deMas = Object.keys(publico).filter((k) => !CLAVES_PUBLICAS.includes(k));
    if (deMas.length) {
      fallos.push(
        `La lista que sale al sitio trae datos que no son públicos: ${deMas.join(', ')}.\n` +
          `   Solo puede salir el bloque preciosPublicos. La lista interna de Ventas no se publica.`,
      );
    }
  }

  // 3 y 4 · ninguna cifra suelta, y el precio más bajo va primero
  const archivos = listar();
  const sueltas = [];
  const altos = [];
  for (const rel of archivos) {
    const txt = readFileSync(resolve(RAIZ, rel), 'utf8');
    const esBlog = ES_BLOG.test(rel);
    txt.split('\n').forEach((linea, i) => {
      if (esComentario(linea)) return;

      // 4 · regla del ancla
      if (!ANCLA_PERDONADA.some((p) => (p.patron && p.patron.test(rel)) || (p.texto && p.texto.test(linea)))) {
        RE_LIDERA_ALTO.lastIndex = 0;
        let m;
        while ((m = RE_LIDERA_ALTO.exec(linea))) {
          const bajo = ALTO_BAJO[m[1]];
          const antes = linea.slice(0, m.index);
          if (!antes.includes('.' + bajo + ')')) {
            altos.push(`${rel}:${i + 1}  lidera con «${m[1]}» sin dar antes «${bajo}»   ${linea.trim().slice(0, 80)}`);
          }
        }
      }

      // 3 · cifras a mano
      if (esBlog) {
        for (const frase of frases(linea)) {
          const m = frase.match(RE_DOLAR);
          if (!m || !HABLA_DE_NOSOTROS.test(frase) || perdonado(rel, frase)) continue;
          sueltas.push(`${rel}:${i + 1}  ${m.join(' ')}   ${frase.trim().slice(0, 90)}`);
        }
        return;
      }
      const m = linea.match(RE_DOLAR);
      if (!m) return;
      if (perdonado(rel, linea)) return;
      sueltas.push(`${rel}:${i + 1}  ${m.join(' ')}   ${linea.trim().slice(0, 90)}`);
    });
  }
  if (sueltas.length) {
    fallos.push(
      `${sueltas.length} precio(s) escritos a mano. Tienen que salir de catalogo.generado.ts\n` +
        `   (en el blog: sin cifra nuestra, con enlace a /es/precios):\n` +
        sueltas.map((s) => '   ' + s).join('\n'),
    );
  }
  if (altos.length) {
    fallos.push(
      `${altos.length} frase(s) anuncian el nivel alto como «desde». Va primero el precio más bajo\n` +
        `   del servicio (decisión del dueño, 2026-11-19); el nivel alto se nombra después:\n` +
        altos.map((s) => '   ' + s).join('\n'),
    );
  }

  if (fallos.length) {
    console.error('check:precios FALLA\n');
    for (const f of fallos) console.error('• ' + f + '\n');
    process.exit(1);
  }
  console.log(`check:precios OK · ${archivos.length} archivos vigilados, 0 cifras a mano, el precio más bajo va primero`);
}

main();
