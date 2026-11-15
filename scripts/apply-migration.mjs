#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
//  scripts/apply-migration.mjs — Aplica UNA migración de db/migrations a Neon.
//  Las migraciones se aplican a mano y solo con el OK del dueño (memoria del
//  proyecto). Este script no imprime nunca la cadena de conexión ni secretos.
//
//    node --env-file=.env.local scripts/apply-migration.mjs 025_finance_books.sql            (solo mira)
//    node --env-file=.env.local scripts/apply-migration.mjs 025_finance_books.sql --apply    (aplica)
//
//  Aplica el archivo entero dentro de una transacción: si algo falla, no queda
//  nada a medias. Antes y después enseña qué tablas y columnas de la migración
//  existen, para comprobar el resultado.
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '@vercel/postgres';

const [file, flag] = process.argv.slice(2);
if (!file || !/^\d{3}_[a-z0-9_]+\.sql$/.test(file)) {
  console.error('Uso: node --env-file=.env.local scripts/apply-migration.mjs 025_nombre.sql [--apply]');
  process.exit(2);
}
if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  console.error('Falta POSTGRES_URL (ejecuta con --env-file=.env.local).');
  process.exit(2);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const sqlText = fs.readFileSync(path.join(here, '..', 'db', 'migrations', file), 'utf8');

// Tablas que crea y columnas que añade la migración (para el antes y el después).
const tables = [...sqlText.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-z_]+)/gi)].map((m) => m[1]);
const columns = [...sqlText.matchAll(/ALTER TABLE\s+([a-z_]+)\s+ADD COLUMN IF NOT EXISTS\s+([a-z_]+)/gi)].map((m) => `${m[1]}.${m[2]}`);

async function state(client) {
  const t = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])`, [tables]);
  const c = await client.query(
    `SELECT table_name || '.' || column_name AS k FROM information_schema.columns WHERE table_schema = 'public' AND (table_name || '.' || column_name) = ANY($1::text[])`,
    [columns]);
  return { tables: new Set(t.rows.map((r) => r.table_name)), columns: new Set(c.rows.map((r) => r.k)) };
}
function report(s, label) {
  const missT = tables.filter((x) => !s.tables.has(x));
  const missC = columns.filter((x) => !s.columns.has(x));
  console.log(`${label}: tablas ${tables.length - missT.length}/${tables.length}, columnas ${columns.length - missC.length}/${columns.length}`);
  if (missT.length) console.log('  faltan tablas: ' + missT.join(', '));
  if (missC.length) console.log('  faltan columnas: ' + missC.join(', '));
  return missT.length + missC.length;
}

const client = await db.connect();
try {
  const before = await state(client);
  const pending = report(before, 'Antes');
  if (flag !== '--apply') {
    console.log(pending ? 'Solo mirado. Para aplicar: añade --apply.' : 'Ya estaba aplicada.');
    process.exit(0);
  }
  await client.query('BEGIN');
  try {
    await client.query(sqlText);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Falló y se deshizo todo: ' + (err && err.message ? err.message : err));
    process.exit(1);
  }
  const after = await state(client);
  const left = report(after, 'Después');
  console.log(left ? 'Atención: falta algo tras aplicar.' : `Aplicada: ${file}`);
  process.exit(left ? 1 : 0);
} finally {
  client.release();
}
