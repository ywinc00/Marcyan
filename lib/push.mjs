// ─────────────────────────────────────────────────────────────
// Avisos de Orbit en el móvil y el ordenador (Web Push, migración 021).
// Cada aviso del panel (createNotification) se manda también como
// notificación a los dispositivos que la activaron. Nunca lanza: un fallo
// del envío no rompe el formulario, el chat ni la tarea que creó el aviso.
// La llave pública va en el código (es pública); la privada vive SOLO en
// Vercel como VAPID_PRIVATE_KEY.
// ─────────────────────────────────────────────────────────────
export const VAPID_PUBLIC_KEY = 'BCXVZEbAA_iYGPcC3BbyDv9LIDolewisB2S1B44RetBzTp0AA1Xoif5-Y3SCwMmXTWYlsm0AaIXV_3-nuhYxLLI';
const SUBJECT = 'mailto:contact@marcyanstudio.com';
const SEND_TIMEOUT_MS = 4000;

export function pushConfigured() { return Boolean((process.env.VAPID_PRIVATE_KEY || '').trim()); }

async function getSql(sqlImpl) { return sqlImpl || (await import('@vercel/postgres')).sql; }

let _wp = null;
async function webpush() {
  if (_wp) return _wp;
  const mod = (await import('web-push')).default;
  mod.setVapidDetails(SUBJECT, VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY.trim());
  _wp = mod;
  return _wp;
}

// Texto corto y seguro para la pantalla de bloqueo: sin cuerpos largos.
export function buildPayload({ title, body, url, tag }) {
  const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const u = String(url || '/dashboard');
  return JSON.stringify({
    title: clip(title, 90) || 'Orbit',
    body: clip(body, 160),
    url: u.startsWith('/dashboard') ? u : '/dashboard',
    tag: clip(tag, 60) || undefined,
  });
}

export function validSubscription(s) {
  return !!(s && typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 1000
    && s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string'
    && s.keys.p256dh.length < 200 && s.keys.auth.length < 100);
}

export async function saveSubscription({ sub, email, device, sqlImpl }) {
  const sql = await getSql(sqlImpl);
  await sql`
    INSERT INTO push_subscriptions (admin_email, endpoint, p256dh, auth, device)
    VALUES (${email}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth}, ${String(device || '').slice(0, 120)})
    ON CONFLICT (endpoint) DO UPDATE SET admin_email = EXCLUDED.admin_email, p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth, device = EXCLUDED.device, fails = 0`;
}

export async function removeSubscription({ endpoint, sqlImpl }) {
  const sql = await getSql(sqlImpl);
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
}

export async function countSubscriptions({ sqlImpl } = {}) {
  const sql = await getSql(sqlImpl);
  const r = await sql`SELECT COUNT(*)::int AS n FROM push_subscriptions`;
  return r.rows[0].n;
}

/** Manda el aviso a todos los dispositivos. Devuelve { sent, removed }. Nunca lanza. */
export async function pushToAdmins(msg, { sqlImpl } = {}) {
  if (!pushConfigured()) return { sent: 0, removed: 0, skipped: 'sin llave' };
  try {
    const sql = await getSql(sqlImpl);
    const { rows } = await sql`SELECT id, endpoint, p256dh, auth FROM push_subscriptions`;
    if (!rows.length) return { sent: 0, removed: 0 };
    const wp = await webpush();
    const payload = buildPayload(msg);
    let sent = 0; let removed = 0;
    await Promise.all(rows.map(async (r) => {
      try {
        await wp.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload, { TTL: 86400, urgency: 'high', timeout: SEND_TIMEOUT_MS });
        sent++;
        await sql`UPDATE push_subscriptions SET last_ok_at = NOW(), fails = 0 WHERE id = ${r.id}`;
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) {
          removed++;
          await sql`DELETE FROM push_subscriptions WHERE id = ${r.id}`;
        } else {
          console.warn('[push] envío falló', e && (e.statusCode || e.message));
          await sql`UPDATE push_subscriptions SET fails = fails + 1 WHERE id = ${r.id}`.catch(() => {});
        }
      }
    }));
    return { sent, removed };
  } catch (e) {
    if (!(e && (e.code === '42P01' || /does not exist/i.test(e.message || '')))) console.warn('[push] falló', e && e.message);
    return { sent: 0, removed: 0, error: true };
  }
}
