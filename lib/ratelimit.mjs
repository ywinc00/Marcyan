// ════════════════════════════════════════════════════════════════
//  lib/ratelimit.mjs — Límite de envíos PERSISTENTE (ventana fija en Neon)
//
//  El patrón anterior (Map en memoria por instancia, p. ej. el de
//  api/admin/login.mjs) no es global en serverless: cada instancia lleva su
//  propia cuenta. Aquí la cuenta vive en la tabla rate_limit_hits
//  (db/migrations/010_brief_v2.sql), compartida por todas las instancias.
//
//  Privacidad: la IP NUNCA se guarda en claro. La clave es un HMAC-SHA256
//  de "bucket|ip" con RATE_LIMIT_SALT (si falta, una sal fija: sigue sin
//  guardar la IP, pero conviene configurar la variable).
//
//  Degradación: si la tabla aún no existe (migración 010 sin aplicar) o Neon
//  falla, se cae a un contador en memoria por instancia (el comportamiento
//  de antes) con un log breve. Nunca rompe el endpoint que lo llama.
//
//  Uso:
//    const rl = await rateLimit({ bucket: 'brief', key: clientIp(req),
//      limits: [{ limit: 5, windowSec: 600 }, { limit: 20, windowSec: 86400 }] });
//    if (!rl.ok) { res.setHeader('Retry-After', rl.retryAfter); return res.status(429)... }
// ════════════════════════════════════════════════════════════════
import crypto from 'node:crypto';

const SALT = process.env.RATE_LIMIT_SALT || 'marcyan-rl-v1';

export function hashKey(bucket, key) {
  return crypto.createHmac('sha256', SALT).update(`${bucket}|${String(key ?? '')}`).digest('hex');
}

// Inicio de la ventana fija que contiene `nowMs`.
export function windowStart(nowMs, windowSec) {
  const w = windowSec * 1000;
  return new Date(Math.floor(nowMs / w) * w);
}

// ── Almacén Neon (por defecto) ────────────────────────────────
// Un solo INSERT … ON CONFLICT atómico por ventana: devuelve la cuenta nueva.
export const neonStore = {
  async incr(bucket, keyHash, start) {
    const { sql } = await import('@vercel/postgres');
    const r = await sql`
      INSERT INTO rate_limit_hits (bucket, key_hash, window_start, count)
      VALUES (${bucket}, ${keyHash}, ${start.toISOString()}, 1)
      ON CONFLICT (bucket, key_hash, window_start)
      DO UPDATE SET count = rate_limit_hits.count + 1
      RETURNING count
    `;
    return Number(r.rows[0].count);
  },
};

// ── Almacén en memoria (respaldo por instancia) ───────────────
export function memoryStore() {
  const map = new Map();
  return {
    async incr(bucket, keyHash, start) {
      const k = `${bucket}|${keyHash}|${start.getTime()}`;
      const n = (map.get(k) || 0) + 1;
      map.set(k, n);
      if (map.size > 5000) { // poda simple: las ventanas viejas no se consultan más
        const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
        for (const key of map.keys()) if (Number(key.split('|')[2]) < cutoff) map.delete(key);
      }
      return n;
    },
  };
}
const fallbackStore = memoryStore();
let warned = false;

// rateLimit({ bucket, key, limits, store?, now? })
// → { ok, retryAfter (s), degraded, counts:[{limit, windowSec, count}] }
// Cada llamada cuenta un intento en TODAS las ventanas (aunque una ya esté
// llena): así un bot insistente no reinicia su cuenta.
export async function rateLimit({ bucket, key, limits, store = neonStore, now = Date.now() }) {
  if (!key) return { ok: true, retryAfter: 0, degraded: false, counts: [] };
  const keyHash = hashKey(bucket, key);
  let degraded = false;
  const counts = [];
  for (const { limit, windowSec } of limits) {
    const start = windowStart(now, windowSec);
    let count;
    try {
      count = await (degraded ? fallbackStore : store).incr(bucket, keyHash, start);
    } catch (err) {
      if (!warned) {
        console.warn(`[ratelimit] sin Neon (${err && (err.code || err.message)}); uso el contador en memoria`);
        warned = true;
      }
      degraded = true;
      count = await fallbackStore.incr(bucket, keyHash, start);
    }
    counts.push({ limit, windowSec, count, resetAt: start.getTime() + windowSec * 1000 });
  }
  const over = counts.filter((c) => c.count > c.limit);
  const retryAfter = over.length
    ? Math.max(1, Math.ceil((Math.max(...over.map((c) => c.resetAt)) - now) / 1000))
    : 0;
  return { ok: over.length === 0, retryAfter, degraded, counts };
}

// Limpieza (la llama el cron diario): borra ventanas de más de 2 días.
export async function purgeOldHits() {
  const { sql } = await import('@vercel/postgres');
  const r = await sql`DELETE FROM rate_limit_hits WHERE window_start < NOW() - INTERVAL '2 days'`;
  return r.rowCount || 0;
}

// Límites compartidos por endpoint (en un solo sitio para ajustarlos).
export const LIMITS = Object.freeze({
  brief:        [{ limit: 5, windowSec: 600 }, { limit: 20, windowSec: 86400 }],
  contact:      [{ limit: 5, windowSec: 600 }, { limit: 30, windowSec: 86400 }],
  login:        [{ limit: 5, windowSec: 900 }],
  draft:        [{ limit: 5, windowSec: 3600 }, { limit: 15, windowSec: 86400 }],
  upload:       [{ limit: 120, windowSec: 600 }],
  kit:          [{ limit: 60, windowSec: 600 }],
  // Confirmación al cliente: una por correo cada 24 h (B-03).
  confirmEmail: [{ limit: 1, windowSec: 86400 }],
});
