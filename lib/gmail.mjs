// ─────────────────────────────────────────────────────────────
// Acceso a Gmail SIN CLAVES para que Marcy atienda el buzón.
//
// Mismo camino que el SEO (lib/seo.mjs): token OIDC de Vercel → STS de Google
// → la cuenta de servicio firma un JWT con sub = buzón (delegación de todo el
// dominio, permiso gmail.modify) → token de Gmail para ESE buzón.
// El dueño autoriza la delegación en la consola de Workspace; aquí no hay
// ninguna clave guardada. Solo se abren los buzones de MAILBOXES.
// ─────────────────────────────────────────────────────────────
import { MAILBOXES } from './mail-triage.mjs';

export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
const API = 'https://gmail.googleapis.com/gmail/v1/users/me';

export class GmailSetupError extends Error {
  constructor(step, msg) { super(msg); this.name = 'GmailSetupError'; this.step = step; }
}

let _oidc = null;
export function setOidcToken(t) { const s = String(t || '').trim(); if (s) _oidc = s; }

async function tfetch(url, opts = {}, ms = 10000) {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctl.signal }); }
  finally { clearTimeout(id); }
}

const _cache = new Map(); // buzón → { token, exp }

async function federatedToken() {
  const oidc = _oidc || (process.env.VERCEL_OIDC_TOKEN || '').trim();
  const audience = (process.env.GOOGLE_WIF_AUDIENCE || '').trim();
  if (!oidc || !audience) throw new GmailSetupError('config', 'Falta la federación de Vercel con Google');
  const r = await tfetch('https://sts.googleapis.com/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      audience,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      subject_token: oidc,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    }).toString(),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new GmailSetupError('sts', `STS ${r.status}`);
  return j.access_token;
}

export async function gmailToken(mailbox) {
  if (!MAILBOXES.includes(mailbox)) throw new GmailSetupError('mailbox', 'Buzón no permitido');
  const now = Math.floor(Date.now() / 1000);
  const hit = _cache.get(mailbox);
  if (hit && hit.exp - 60 > now) return hit.token;

  const sa = (process.env.GOOGLE_SA_EMAIL || '').trim();
  if (!sa) throw new GmailSetupError('config', 'Falta GOOGLE_SA_EMAIL');
  const fed = await federatedToken();

  // 1) Token de la propia cuenta de servicio (el mismo permiso que usa el SEO).
  const ir = await tfetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(sa)}:generateAccessToken`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${fed}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: ['https://www.googleapis.com/auth/cloud-platform'], lifetime: '600s' }),
  });
  const ij = await ir.json().catch(() => ({}));
  if (!ir.ok || !ij.accessToken) throw new GmailSetupError('impersonate', `Impersonación ${ir.status}`);

  // 2) La cuenta de servicio firma el JWT como sí misma (rol "Creador de
  //    tokens de cuenta de servicio" de la cuenta sobre sí misma).
  const claims = { iss: sa, sub: mailbox, scope: GMAIL_SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
  const sr = await tfetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(sa)}:signJwt`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ij.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: JSON.stringify(claims) }),
  });
  const sj = await sr.json().catch(() => ({}));
  if (!sr.ok || !sj.signedJwt) throw new GmailSetupError('sign', `Firma ${sr.status}: falta el rol de crear tokens sobre la cuenta de servicio`);

  const tr = await tfetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: sj.signedJwt }).toString(),
  });
  const tj = await tr.json().catch(() => ({}));
  if (!tr.ok || !tj.access_token) {
    // unauthorized_client = la delegación de dominio no está dada (o sin el permiso de Gmail).
    throw new GmailSetupError('delegation', `Token ${tr.status} ${tj.error || ''}`.trim());
  }
  _cache.set(mailbox, { token: tj.access_token, exp: now + (tj.expires_in || 3600) });
  return tj.access_token;
}

async function call(mailbox, path, { method = 'GET', body, query } = {}) {
  const token = await gmailToken(mailbox);
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const r = await tfetch(`${API}${path}${qs}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(`Gmail ${method} ${path.split('/')[1]} ${r.status}`);
    e.status = r.status;
    if (r.status === 403 && /has not been used|disabled/i.test((j.error && j.error.message) || '')) e.setup = 'api';
    throw e;
  }
  return j;
}

export const gmail = {
  profile: (mb) => call(mb, '/profile'),
  history: (mb, startHistoryId, pageToken) => call(mb, '/history', {
    query: { startHistoryId, historyTypes: 'messageAdded', labelId: 'INBOX', maxResults: '100', ...(pageToken ? { pageToken } : {}) },
  }),
  recent: (mb, q = 'in:inbox newer_than:1d', max = 25) => call(mb, '/messages', { query: { q, maxResults: String(max) } }),
  message: (mb, id) => call(mb, `/messages/${encodeURIComponent(id)}`, { query: { format: 'full' } }),
  labels: (mb) => call(mb, '/labels'),
  createLabel: (mb, name) => call(mb, '/labels', { method: 'POST', body: { name, labelListVisibility: 'labelShow', messageListVisibility: 'show' } }),
  modify: (mb, id, addLabelIds = [], removeLabelIds = []) => call(mb, `/messages/${encodeURIComponent(id)}/modify`, { method: 'POST', body: { addLabelIds, removeLabelIds } }),
  draft: (mb, raw, threadId) => call(mb, '/drafts', { method: 'POST', body: { message: { raw, threadId } } }),
  send: (mb, raw, threadId) => call(mb, '/messages/send', { method: 'POST', body: { raw, threadId } }),
};

// Crea las etiquetas "Marcy/…" que falten y devuelve nombre → id.
export async function ensureLabels(mailbox, names) {
  const have = new Map(((await gmail.labels(mailbox)).labels || []).map((l) => [l.name, l.id]));
  for (const n of names) {
    if (have.has(n)) continue;
    try { const l = await gmail.createLabel(mailbox, n); have.set(n, l.id); }
    catch (e) { if (e.status !== 409) throw e; }
  }
  return have;
}
