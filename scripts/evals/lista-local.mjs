// La lista privada de Ventas, si está en este equipo (_cerebro/ventas/catalogo.json, fuera
// del repo). Solo para la batería local: sus cifras nunca se escriben en el repo.
// MARCYAN_CATALOGO apunta a otro archivo. Devuelve null si no está.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function listaPrivada() {
  const env = process.env.MARCYAN_CATALOGO;
  const candidates = [];
  if (env) candidates.push(env);
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 12; i++) {
    candidates.push(path.join(dir, '_cerebro/ventas/catalogo.json'));
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  for (const f of candidates) {
    try { if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* sigue */ }
  }
  return null;
}
