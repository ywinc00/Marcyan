// ════════════════════════════════════════════════════════════════
//  lib/auth.mjs — Magic-link auth + sesiones de admin
//
//  Modelo (auditado 2026-10-19, ver docs/orbit/backend-contratos.md):
//   · Enlace mágico de UN SOLO USO y 15 min (UPDATE … used_at IS NULL
//     AND expires_at > NOW() … RETURNING: atómico, no se puede usar dos veces).
//   · Sesión deslizante de 90 días en cookie HttpOnly + Secure + SameSite=Lax.
//   · Logout revoca en servidor (revoked_at), no solo borra la cookie.
//   · En BD se guarda el SHA-256 del token y del id de sesión, nunca el valor:
//     una copia filtrada de la base no sirve para entrar. Las sesiones viejas
//     (guardadas en claro antes de este cambio) siguen valiendo y se pasan a
//     hash en su primer uso, sin cerrar la sesión del dueño.
//   · Comparación: la búsqueda es por hash en un índice (el atacante no
//     controla los bytes que se comparan); los secretos que sí se comparan
//     en memoria (CRON_SECRET) usan safeEqual() en tiempo constante.
//   · Cada petición re-verifica que el email siga en ADMIN_ALLOWED_EMAILS.
// ════════════════════════════════════════════════════════════════
import crypto from 'node:crypto';
import { sql } from '@vercel/postgres';

const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 días (sliding)
const TOKEN_TTL_MS   = 15 * 60 * 1000;            // 15 min
const COOKIE_NAME    = 'mrc_admin';
// El deslizamiento escribe en BD como mucho una vez cada 5 min por sesión:
// el contador de avisos consulta cada minuto y no hace falta un UPDATE por llamada.
const SLIDE_EVERY_MS = 5 * 60 * 1000;

// Formato de los tokens que emitimos: randomBytes(32) en base64url = 43 chars.
const TOKEN_RE  = /^[A-Za-z0-9_-]{20,128}$/;
const LEGACY_LEN = 43;

// ── Allowlist ─────────────────────────────────────────────────
export function getAllowedEmails() {
  return (process.env.ADMIN_ALLOWED_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowed(email) {
  if (!email) return false;
  return getAllowedEmails().includes(String(email).trim().toLowerCase());
}

// ── Tokens y sesiones ─────────────────────────────────────────
export function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

// SHA-256 en hex (64 chars). Es lo que se guarda en BD.
export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

// ¿Tiene forma de token nuestro? Corta basura antes de tocar la BD.
export function isWellFormedToken(t) {
  return typeof t === 'string' && TOKEN_RE.test(t);
}

// Valor en claro aceptado SOLO para filas anteriores al hash (43 chars).
// Un hash de 64 chars nunca pasa por aquí: quien lea la BD no puede
// presentar el hash guardado como si fuera el token.
function legacyValue(t) {
  return t.length === LEGACY_LEN ? t : null;
}

// Comparación en tiempo constante de dos secretos (strings). Se comparan sus
// SHA-256 (misma longitud siempre), así tampoco se filtra la longitud.
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a ?? '')).digest();
  const hb = crypto.createHash('sha256').update(String(b ?? '')).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export async function createMagicToken(email, ipAddress) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await sql`
    INSERT INTO admin_magic_tokens (email, token, expires_at, ip_address)
    VALUES (${email.toLowerCase()}, ${hashToken(token)}, ${expiresAt.toISOString()}, ${ipAddress})
  `;
  return { token, expiresAt };
}

export async function consumeMagicToken(token) {
  if (!isWellFormedToken(token)) return null;
  const result = await sql`
    UPDATE admin_magic_tokens
       SET used_at = NOW()
     WHERE token IN (${hashToken(token)}, ${legacyValue(token)})
       AND used_at IS NULL
       AND expires_at > NOW()
    RETURNING email
  `;
  if (result.rowCount === 0) return null;
  return { email: result.rows[0].email };
}

export async function createSession(email, ipAddress, userAgent) {
  const sessionId = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sql`
    INSERT INTO admin_sessions (email, session_id, expires_at, ip_address, user_agent)
    VALUES (${email.toLowerCase()}, ${hashToken(sessionId)}, ${expiresAt.toISOString()}, ${ipAddress}, ${userAgent})
  `;
  return { sessionId, expiresAt };
}

// Sliding window: si la sesión es válida (no caducada, no revocada y con el
// email aún autorizado), extiende `expires_at` y `last_used_at` (como mucho
// una vez cada SLIDE_EVERY_MS). Devuelve el expiresAt vigente para que el
// caller renueve la cookie del navegador. Si la fila estaba guardada en claro
// (sesión anterior al hash), la pasa a hash en ese mismo UPDATE.
export async function getSession(sessionId) {
  if (!isWellFormedToken(sessionId)) return null;
  const h = hashToken(sessionId);
  const r = await sql`
    SELECT id, email, session_id, expires_at, last_used_at
      FROM admin_sessions
     WHERE session_id IN (${h}, ${legacyValue(sessionId)})
       AND expires_at > NOW()
       AND revoked_at IS NULL
     LIMIT 1
  `;
  if (r.rowCount === 0) return null;
  const row = r.rows[0];

  // Re-verificar allowlist: quitar un email de ADMIN_ALLOWED_EMAILS corta
  // también sus sesiones abiertas, no solo los logins nuevos.
  if (!isAllowed(row.email)) return null;

  const lastUsed = row.last_used_at ? new Date(row.last_used_at).getTime() : 0;
  const needsSlide = Date.now() - lastUsed > SLIDE_EVERY_MS;
  const needsHash  = row.session_id !== h;
  let expiresAt = new Date(row.expires_at);

  if (needsSlide || needsHash) {
    const newExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const u = await sql`
      UPDATE admin_sessions
         SET last_used_at = NOW(),
             expires_at   = ${newExpiresAt.toISOString()},
             session_id   = ${h}
       WHERE id = ${row.id}
         AND revoked_at IS NULL
      RETURNING id
    `;
    if (u.rowCount === 0) return null; // revocada entre medias
    expiresAt = newExpiresAt;
  }
  return { email: row.email, sessionId, expiresAt };
}

export async function revokeSession(sessionId) {
  if (!isWellFormedToken(sessionId)) return;
  await sql`
    UPDATE admin_sessions SET revoked_at = NOW()
     WHERE session_id IN (${hashToken(sessionId)}, ${legacyValue(sessionId)})
       AND revoked_at IS NULL`;
}

// ── Cookies ───────────────────────────────────────────────────
export function buildCookie(sessionId, expiresAt) {
  return [
    `${COOKIE_NAME}=${sessionId}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Expires=${expiresAt.toUTCString()}`,
  ].join('; ');
}

export function clearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readCookie(req) {
  const header = req.headers.cookie || '';
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    if (k === COOKIE_NAME) return part.slice(eq + 1);
  }
  return null;
}

// ── Middleware ────────────────────────────────────────────────
// Verifica sesión y, si es válida, RENUEVA la cookie del navegador con
// el nuevo expires (sliding window). Resultado: mientras el admin use
// el panel al menos cada SESSION_TTL_MS, nunca caduca.
// Toda respuesta de admin (también el 401) sale con Cache-Control: no-store.
export async function requireAdmin(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const sid = readCookie(req);
  const session = sid ? await getSession(sid) : null;
  if (!session) {
    res.status(401).json({ ok: false, error: 'No autorizado' });
    return null;
  }
  // Renovar cookie con nuevo Expires
  res.setHeader('Set-Cookie', buildCookie(session.sessionId, session.expiresAt));
  return session; // { email, sessionId, expiresAt }
}

// ── Util ──────────────────────────────────────────────────────
export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || null;
}

export const __config = { COOKIE_NAME, SESSION_TTL_MS, TOKEN_TTL_MS, SLIDE_EVERY_MS };
