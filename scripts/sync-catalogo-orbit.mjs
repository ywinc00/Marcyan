#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
//  scripts/sync-catalogo-orbit.mjs — Carga el catálogo de Ventas en la base, para Orbit.
//
//    node --env-file=.env.local scripts/sync-catalogo-orbit.mjs            (solo mira)
//    node --env-file=.env.local scripts/sync-catalogo-orbit.mjs --apply    (carga)
//
//  Orbit, Marcy y el Diagnóstico precian las propuestas con los precios INTERNOS del
//  catálogo (`_cerebro/ventas/catalogo.json`). Este repo es público, así que esos precios
//  no se copian a ningún archivo: van a la tabla privada `sales_catalog` (migración 029).
//  Se corre cada vez que Ventas cambia el catálogo. Escribe en la base de producción:
//  solo con OK del dueño. No imprime precios ni la cadena de conexión.
// ════════════════════════════════════════════════════════════════
import { db } from '@vercel/postgres';
import { leerCatalogo, CATALOGO_JSON } from './sync-catalogo.mjs';

const apply = process.argv.includes('--apply');
if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  console.error('Falta POSTGRES_URL (ejecuta con --env-file=.env.local).');
  process.exit(2);
}

const catalogo = leerCatalogo(CATALOGO_JSON);
const faltan = ['version', 'reglas', 'proyectos', 'planes', 'preciosPublicos'].filter((k) => !catalogo[k]);
if (faltan.length) {
  console.error('El catálogo no trae: ' + faltan.join(', '));
  process.exit(1);
}
const resumen = `versión ${catalogo.version} · ${Object.keys(catalogo.planes).length} planes · ${Object.keys(catalogo.proyectos).length} proyectos`;

const client = await db.connect();
try {
  const cur = await client.query('SELECT version, body FROM sales_catalog ORDER BY loaded_at DESC, version DESC LIMIT 1');
  const enBase = cur.rows[0] || null;
  // La base guarda el JSON con las claves en su propio orden: se compara con las claves ordenadas.
  const canon = (v) => (Array.isArray(v) ? v.map(canon)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
  const igual = enBase && JSON.stringify(canon(enBase.body)) === JSON.stringify(canon(catalogo));
  console.log(`Catálogo de Ventas: ${resumen}`);
  console.log(`En la base: ${enBase ? `versión ${enBase.version}${igual ? ' (igual)' : ' (distinta)'}` : 'ninguno'}`);
  if (igual) { console.log('Nada que cargar.'); process.exit(0); }
  if (!apply) { console.log('Solo mirado. Para cargarlo: añade --apply.'); process.exit(0); }
  await client.query(
    `INSERT INTO sales_catalog (version, body) VALUES ($1, $2::jsonb)
     ON CONFLICT (version) DO UPDATE SET body = EXCLUDED.body, loaded_at = NOW()`,
    [catalogo.version, JSON.stringify(catalogo)]);
  console.log(`Cargado: ${resumen}`);
} catch (err) {
  if (err && err.code === '42P01') console.error('Falta la tabla sales_catalog: aplica antes la migración 029.');
  else console.error('Fallo:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
}
