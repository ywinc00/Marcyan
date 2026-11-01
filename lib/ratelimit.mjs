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
//  de antes) con un log breve y un aviso 'system' al panel (uno al día).
//  Nunca rompe el endpoint que lo llama.
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

// Clave de fila de una ventana: el hash de bucket|clave más el largo de la
// ventana (ver rateLimit). Exportada para las pruebas.
export function windowKeyHash(keyHash, windowSec) {
  return `${keyHash}:${windowSec}`;
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

// Aviso al panel cuando el freno guardado falla y cae a memoria (puerta
// técnica, 2026-10-31). Caso típico: la tabla rate_limit_hits no existe en
// esa base (migración 010 sin aplicar) y nadie se entera, porque el endpoint
// sigue funcionando con un freno que se borra en cada arranque. Un aviso por
// instancia y, en la base, uno cada 24 h (clave fija). Import dinámico: este
// módulo no arrastra notifications.mjs a quien solo necesita contar (el chat).
// Si Neon entero está caído, el aviso tampoco se guarda: queda el log.
let alerted = false;
export const DEGRADED_NOTICE = Object.freeze({
  key: 'ratelimit-memoria',
  title: 'El freno contra abusos de los formularios y del chat está funcionando a medias',
  body: 'No pudo guardar la cuenta de envíos en la base de datos y está usando un contador temporal que se borra solo. El sitio sigue funcionando, pero el freno es más débil. Hay que revisar la base de datos.',
});
async function alertDegraded() {
  if (alerted) return;
  alerted = true;
  try {
    const { notifySystem } = await import('./notifications.mjs');
    // Con la base colgada el aviso tampoco entra: tiempo máximo para no
    // dejar esperando al visitante.
    await withTimeout(notifySystem({ ...DEGRADED_NOTICE, windowHours: 24 }), NEON_TIMEOUT_MS);
  } catch (err) {
    console.error('[ratelimit] no pude avisar al panel:', err && err.message);
  }
}

// Base lenta o caída: cada consulta tiene un tiempo máximo y, tras un fallo,
// esta instancia deja de intentarlo durante un minuto (va directa a memoria).
// Sin esto, con Neon colgado cada mensaje del chat esperaría varias veces
// (por conexión, por conversación, tope del sitio) antes de responder.
const NEON_TIMEOUT_MS = 2500;
const NEON_BACKOFF_MS = 60_000;
let neonDownUntil = 0;
function withTimeout(p, ms) {
  let t;
  return Promise.race([
    p,
    new Promise((_, reject) => { t = setTimeout(() => reject(Object.assign(new Error(`ratelimit timeout (${ms}ms)`), { code: 'timeout' })), ms); }),
  ]).finally(() => clearTimeout(t));
}
// Solo pruebas: reinicia el estado de la instancia.
export function __resetForTests() { neonDownUntil = 0; alerted = false; warned = false; }

// rateLimit({ bucket, key, limits, store?, now? })
// → { ok, retryAfter (s), degraded, counts:[{limit, windowSec, count}] }
// Cada llamada cuenta un intento en TODAS las ventanas (aunque una ya esté
// llena): así un bot insistente no reinicia su cuenta.
export async function rateLimit({ bucket, key, limits, store = neonStore, now = Date.now() }) {
  if (!key) return { ok: true, retryAfter: 0, degraded: false, counts: [] };
  const keyHash = hashKey(bucket, key);
  // En pausa tras un fallo reciente: directo a memoria, sin esperar a la base.
  let degraded = store === neonStore && Date.now() < neonDownUntil;
  const counts = [];
  for (const { limit, windowSec } of limits) {
    const start = windowStart(now, windowSec);
    // La fila se identifica también por el LARGO de la ventana. Sin esto, dos
    // ventanas del mismo cubo que empiezan en el mismo instante (la de 10 min y
    // la del día, cada medianoche UTC) compartían fila y cada envío contaba
    // doble: el freno saltaba a la mitad de su tope justo después de medianoche
    // (encontrado con las pruebas de la puerta técnica, 2026-10-31).
    const rowKey = windowKeyHash(keyHash, windowSec);
    let count;
    try {
      count = degraded
        ? await fallbackStore.incr(bucket, rowKey, start)
        : await withTimeout(store.incr(bucket, rowKey, start), NEON_TIMEOUT_MS);
    } catch (err) {
      if (store === neonStore) neonDownUntil = Date.now() + NEON_BACKOFF_MS;
      if (!warned) {
        console.warn(`[ratelimit] sin Neon (${err && (err.code || err.message)}); uso el contador en memoria`);
        warned = true;
      }
      degraded = true;
      count = await fallbackStore.incr(bucket, rowKey, start);
    }
    counts.push({ limit, windowSec, count, resetAt: start.getTime() + windowSec * 1000 });
  }
  if (degraded && store === neonStore) await alertDegraded();
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
  // Confirmación al cliente: una por correo cada 24 h (B-03). El brief y el
  // contacto llevan cubos separados: si alguien manda los dos el mismo día,
  // la confirmación del brief (la importante) no se queda sin salir.
  confirmEmail:        [{ limit: 1, windowSec: 86400 }],
  confirmEmailContact: [{ limit: 1, windowSec: 86400 }],

  // ── Chat de Marcy y diagnóstico (puerta técnica, 2026-10-31) ──────────
  // Antes vivían en un Map por instancia: se borraban en cada arranque en
  // frío y cada instancia llevaba su cuenta. Los topes "global" usan una
  // sola clave para todo el sitio: acotan el GASTO de IA de un día aunque
  // el abuso venga de muchas conexiones. El freno último del gasto sigue
  // siendo el límite mensual de la consola de Anthropic.
  chat:            [{ limit: 12, windowSec: 60 }, { limit: 150, windowSec: 86400 }], // por conexión
  chatSession:     [{ limit: 40, windowSec: 86400 }],                                // por conversación
  chatGlobal:      [{ limit: 200, windowSec: 86400 }],                               // todo el sitio, mensajes que llegan a la IA
  chatSite:        [{ limit: 5, windowSec: 600 }, { limit: 20, windowSec: 86400 }],  // revisar_sitio por conexión
  chatSiteSession: [{ limit: 1, windowSec: 86400 }],                                 // revisar_sitio: 1 por conversación
  // Fuera de producción el chat corre las pruebas de comportamiento (una pasada
  // son ~60 turnos desde una sola conexión): más margen por conexión y del sitio.
  // La vista previa está protegida por Vercel (hace falta un pase), así que el
  // riesgo de abuso es bajo; el minuto y la conversación se quedan igual.
  chatNoProd:       [{ limit: 12, windowSec: 60 }, { limit: 600, windowSec: 86400 }],
  chatGlobalNoProd: [{ limit: 800, windowSec: 86400 }],
  // Fallos de la IA del chat en una hora: pasado el tope se avisa al panel.
  chatFail:        [{ limit: 2, windowSec: 3600 }],
  diagAnalyze:     [{ limit: 5, windowSec: 600 }, { limit: 30, windowSec: 86400 }],
  diagClaim:       [{ limit: 5, windowSec: 600 }, { limit: 15, windowSec: 86400 }],
  // Informes del diagnóstico redactados por IA en todo el sitio. Pasado el
  // tope, el informe sale igual con el texto determinista (sin coste de IA).
  diagReportGlobal: [{ limit: 50, windowSec: 86400 }],
  // Informe del diagnóstico enviado a una misma dirección: 3 al día. Alguien
  // real puede revisar dos o tres webs; un bot no puede usar el diagnóstico
  // para llenarle el correo a un tercero.
  diagReportEmail: [{ limit: 3, windowSec: 86400 }],
  handoff:         [{ limit: 3, windowSec: 600 }, { limit: 10, windowSec: 86400 }],
});

// Clave única para los topes de todo el sitio.
export const GLOBAL_KEY = 'all';
