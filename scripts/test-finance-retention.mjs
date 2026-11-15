// Los libros se guardan 7 años (encargo legal de Orbit, 2026-11-15, §4a).
// Ninguna tarea automática (api/cron) puede borrar nada de Finanzas: esta prueba lee
// cada función que importan las tareas y falla si alguna borra en una tabla de los libros.
// Uso: npm run test:finance-retention
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIBROS = ['invoices', 'payments', 'company_expenses', 'subscriptions', 'refunds', 'income_entries',
  'finance_accounts', 'finance_vendors', 'finance_months', 'tax_estimated_payments', 'mileage_trips',
  'finance_imports', 'clients', 'projects'];
const BORRA = new RegExp(`(DELETE\\s+FROM|TRUNCATE(\\s+TABLE)?)\\s+(${LIBROS.join('|')})\\b`, 'i');

/** Texto de una función exportada (hasta la siguiente exportación de nivel superior). */
function cuerpo(src, nombre) {
  const m = new RegExp(`export\\s+(async\\s+)?function\\s+${nombre}\\s*\\(`).exec(src);
  if (!m) return null;
  const resto = src.slice(m.index + 1);
  const fin = resto.search(/\nexport\s/);
  return fin < 0 ? resto : resto.slice(0, fin);
}

const fallos = [];
let revisadas = 0;
const cronDir = path.join(root, 'api', 'cron');
for (const f of fs.readdirSync(cronDir).filter((x) => x.endsWith('.mjs'))) {
  const src = fs.readFileSync(path.join(cronDir, f), 'utf8');
  if (BORRA.test(src)) fallos.push(`${f}: borra en los libros directamente`);
  for (const [, nombres, mod] of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'([^']+)'/g)) {
    if (!mod.startsWith('.')) continue;
    const lib = fs.readFileSync(path.resolve(cronDir, mod), 'utf8');
    for (const n of nombres.split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
      const c = cuerpo(lib, n);
      if (c == null) continue; // constante o función no exportada como tal
      revisadas++;
      if (BORRA.test(c)) fallos.push(`${f} → ${n} (${mod}) borra en los libros`);
    }
  }
}

if (fallos.length) {
  console.error(`✗ Una tarea automática puede borrar Finanzas:\n - ${fallos.join('\n - ')}`);
  process.exit(1);
}
console.log(`✓ Ninguna tarea automática borra Finanzas (${revisadas} funciones revisadas).`);
