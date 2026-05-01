// ════════════════════════════════════════════════════════════════
//  lib/auth.mjs — Magic-link auth + sesiones de admin
// ════════════════════════════════════════════════════════════════
import crypto from 'node:crypto';
import { sql } from '@vercel/postgres';

const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 días (sliding)
const TOKEN_TTL_MS   = 15 * 60 * 1000;            // 15 min
const COOKIE_NAME    = 'mrc_admin';

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

export async function createMagicToken(email, ipAddress) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await sql`
    INSERT INTO admin_magic_tokens (email, token, expires_at, ip_address)
    VALUES (${email.toLowerCase()}, ${token}, ${expiresAt.toISOString()}, ${ipAddress})
  `;
  return { token, expiresAt };
}

export async function consumeMagicToken(token) {
  if (!token) return null;
  const result = await sql`
    UPDATE admin_magic_tokens
       SET used_at = NOW()
     WHERE token = ${token}
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
    VALUES (${email.toLowerCase()}, ${sessionId}, ${expiresAt.toISOString()}, ${ipAddress}, ${userAgent})
  `;
  return { sessionId, expiresAt };
}

// Sliding window: si la sesión es válida, extiende `expires_at` y
// `last_used_at` en una sola query atómica. Devuelve el nuevo expiresAt
// para que el caller pueda renovar la cookie del navegador.
export async function getSession(sessionId) {
  if (!sessionId) return null;
  const newExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const result = await sql`
    UPDATE admin_sessions
       SET last_used_at = NOW(),
           expires_at   = ${newExpiresAt.toISOString()}
     WHERE session_id = ${sessionId}
       AND expires_at > NOW()
       AND revoked_at IS NULL
    RETURNING email
  `;
  if (result.rowCount === 0) return null;
  return { email: result.rows[0].email, sessionId, expiresAt: newExpiresAt };
}

export async function revokeSession(sessionId) {
  if (!sessionId) return;
  await sql`UPDATE admin_sessions SET revoked_at = NOW() WHERE session_id = ${sessionId}`;
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
export async function requireAdmin(req, res) {
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

export const __config = { COOKIE_NAME, SESSION_TTL_MS, TOKEN_TTL_MS };
