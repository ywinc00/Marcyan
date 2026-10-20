// ════════════════════════════════════════════════════════════════
//  lib/brief-kit.mjs — "Kit de arranque" (segundo momento del brief)
//
//  El panel genera un enlace único /es/kit/<token> (o /en/kit/<token>) cuando
//  el cliente contrata. En la base solo se guarda el SHA-256 del token
//  (briefs.kit_token_hash); el token completo solo lo ve el panel una vez y
//  viaja en el correo al cliente. Regenerar el enlace invalida el anterior.
//
//  Estados (briefs.kit_status): 'none' → 'sent' → 'in_progress' → 'submitted'.
// ════════════════════════════════════════════════════════════════
import crypto from 'node:crypto';
import { sql } from '@vercel/postgres';
import { LEGACY_COLUMNS, LEGACY_JSONB, FIELDS, catchupKeys, isSkipped } from './brief-schema.mjs';

export const KIT_STATUSES = ['none', 'sent', 'in_progress', 'submitted'];
const TOKEN_RE = /^[A-Za-z0-9_-]{40,64}$/;

export const newKitToken = () => crypto.randomBytes(32).toString('base64url');
export const hashKitToken = (t) => crypto.createHash('sha256').update(String(t || '')).digest('hex');
export const isKitTokenShape = (t) => typeof t === 'string' && TOKEN_RE.test(t);

export function kitUrl(token, lang) {
  // En una vista previa de Vercel el enlace del kit apunta a la propia vista previa (como en lib/email.mjs).
  const preview = process.env.VERCEL_ENV === 'preview' ? (process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL) : '';
  const base = (preview ? `https://${preview}` : (process.env.ADMIN_BASE_URL || 'https://marcyanstudio.com')).replace(/\/+$/, '');
  return `${base}/${lang === 'en' ? 'en' : 'es'}/kit/${token}`;
}

// Brief por token del kit (null si el token no tiene forma válida o no existe).
export async function findBriefByKitToken(token) {
  if (!isKitTokenShape(token)) return null;
  const r = await sql`SELECT * FROM briefs WHERE kit_token_hash = ${hashKitToken(token)} LIMIT 1`;
  return r.rowCount ? r.rows[0] : null;
}

// Emite un enlace nuevo. Devuelve { token, status } o lanza 'kit_submitted'
// si el kit ya se envió y no se pidió reabrir.
export async function issueKitLink(projectId, { reopen = false } = {}) {
  const token = newKitToken();
  const r = await sql`
    UPDATE briefs
       SET kit_token_hash = ${hashKitToken(token)},
           kit_status = CASE
             WHEN kit_status = 'submitted' AND ${Boolean(reopen)} THEN 'in_progress'
             WHEN kit_status = 'in_progress' THEN 'in_progress'
             ELSE 'sent' END,
           kit_submitted_at = CASE WHEN kit_status = 'submitted' AND ${Boolean(reopen)} THEN NULL ELSE kit_submitted_at END,
           kit_sent_at = NOW()
     WHERE project_id = ${projectId}
       AND (kit_status <> 'submitted' OR ${Boolean(reopen)})
    RETURNING id, kit_status
  `;
  if (!r.rowCount) return null;
  return { token, briefId: r.rows[0].id, status: r.rows[0].kit_status };
}

// Datos mínimos para precargar el kit (sin IP, navegador, correo, teléfono,
// presupuesto ni notas internas): lo justo para no volver a preguntar.
const PREFILL_COLUMNS = [
  'business_name', 'industry', 'city_state', 'current_website', 'business_description',
  'language', 'has_logo', 'has_photos', 'website_type',
];
export function kitPrefill(brief) {
  const out = {};
  for (const k of PREFILL_COLUMNS) if (brief[k] !== null && brief[k] !== undefined) out[k] = brief[k];
  // Columnas históricas que el kit pregunta (momento arranque): su valor actual.
  for (const [k, fd] of FIELDS) {
    if (fd.storage !== 'column' || fd.moment !== 'arranque') continue;
    const v = brief[k];
    if (v === null || v === undefined || (Array.isArray(v) && !v.length)) continue;
    out[k] = v;
  }
  return out;
}

// Todo el kit tal como quedaría al enviarlo: lo precargado del brief, lo que
// el cliente guardó por partes (briefs.kit) y lo que llega ahora (gana lo
// último). Sobre esto se comprueban los obligatorios del envío final.
export function kitForSubmit(brief, data = {}) {
  const stored = (brief && brief.kit && typeof brief.kit === 'object' && !Array.isArray(brief.kit)) ? brief.kit : {};
  return { ...kitPrefill(brief || {}), ...stored, ...((data && typeof data === 'object') ? data : {}) };
}

// ── Lo que faltaba del brief (revisión R1) ──────────────────────
// Claves del brief corto que este brief no trae: se miran las columnas y
// briefs.extra (lo que llegó con el brief), NO briefs.kit, para que el bloque
// no desaparezca cuando el cliente lo guarda en el kit.
const asObj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
export function kitCatchup(brief) {
  const b = brief || {};
  const answered = { ...asObj(b.extra), has_logo: b.has_logo, brand_colors: b.brand_colors };
  return catchupKeys(answered, Array.isArray(b.services) ? b.services : []);
}
// Solo esas claves de lo que manda el navegador (y sin lo que otra respuesta
// descarta: con "No tengo colores definidos" la lista no se guarda).
export function catchupData(brief, data) {
  const src = asObj(data);
  const out = {};
  for (const k of kitCatchup(brief)) if (k in src && !isSkipped(k, src)) out[k] = src[k];
  return out;
}

// Guarda el kit: columnas históricas del momento arranque en su columna;
// el resto en briefs.kit (fusionado con lo guardado antes).
export async function saveKit(briefId, { columns = {}, kit = {} }, { submit = false } = {}) {
  const sets = [];
  const values = [];
  for (const [k, v] of Object.entries(columns)) {
    if (!LEGACY_COLUMNS.includes(k)) continue;
    values.push(LEGACY_JSONB.includes(k) ? JSON.stringify(Array.isArray(v) ? v : []) : v);
    sets.push(`${k} = $${values.length}${LEGACY_JSONB.includes(k) ? '::jsonb' : ''}`);
  }
  values.push(JSON.stringify(kit));
  sets.push(`kit = COALESCE(kit, '{}'::jsonb) || $${values.length}::jsonb`);
  sets.push(submit
    ? `kit_status = 'submitted', kit_submitted_at = NOW()`
    : `kit_status = CASE WHEN kit_status = 'submitted' THEN kit_status ELSE 'in_progress' END`);
  values.push(briefId);
  const text = `UPDATE briefs SET ${sets.join(', ')}
                 WHERE id = $${values.length} AND kit_status <> 'submitted'
                 RETURNING project_id, kit_status`;
  const r = await sql.query(text, values);
  return r.rowCount ? r.rows[0] : null;
}
