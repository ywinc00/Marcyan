// ════════════════════════════════════════════════════════════════
//  lib/finance-receipts.mjs — Recibos de los gastos (Vercel Blob PRIVADO)
//
//  El navegador sube el archivo directo al almacén con un permiso de un solo uso
//  para una ruta exacta (receipts/<gasto>/<uuid>.<ext>); después confirma y aquí se
//  comprueba el tipo REAL por sus bytes antes de enlazarlo al gasto.
//  Un recibo se puede añadir aunque el mes esté cerrado (mejora el registro sin
//  cambiar cifras); quitarlo, no.
//  BLOB_READ_WRITE_TOKEN vive solo en el servidor y nunca se registra.
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';
import { get, del } from '@vercel/blob';
import { fileTypeFromStream } from 'file-type';
import { BooksError, assertMonthOpen } from './finance-books.mjs';

export const RECEIPT_MAX_BYTES = 15 * 1024 * 1024;
export const RECEIPT_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
};
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const isId = (v) => /^\d{1,18}$/.test(String(v ?? ''));

export const receiptPrefix = (expenseId) => `receipts/${expenseId}/`;

/** ¿La ruta es receipts/<gasto>/<uuid>.<ext> y la extensión cuadra con el tipo? */
export function checkReceiptPath(pathname, expenseId, contentType) {
  const ext = RECEIPT_TYPES[String(contentType || '').toLowerCase()];
  if (!ext || !isId(expenseId)) return false;
  return new RegExp(`^receipts/${expenseId}/${UUID}\\.${ext}$`).test(String(pathname || ''));
}

/** Opciones del permiso de subida para un recibo (las valida el servidor, no el navegador). */
export async function receiptTokenOptions(pathname, clientPayload) {
  let p = null;
  try { p = JSON.parse(clientPayload || '{}'); } catch { p = null; }
  const size = Number(p?.size);
  const type = String(p?.contentType || '').toLowerCase();
  if (!p || !isId(p.expenseId)) throw new BooksError('Ese gasto no existe.', 404);
  if (!RECEIPT_TYPES[type]) throw new BooksError('El recibo tiene que ser una foto (JPG, PNG, WebP o HEIC) o un PDF.');
  if (!Number.isInteger(size) || size <= 0 || size > RECEIPT_MAX_BYTES) throw new BooksError('El recibo pesa más de 15 MB.');
  if (!checkReceiptPath(pathname, p.expenseId, type)) throw new BooksError('El nombre del archivo no es válido.');
  const e = await sql.query(`SELECT id FROM company_expenses WHERE id = $1`, [p.expenseId]);
  if (!e.rowCount) throw new BooksError('Ese gasto no existe.', 404);
  return {
    allowedContentTypes: [type],
    maximumSizeInBytes: size,
    validUntil: Date.now() + 10 * 60 * 1000,
    addRandomSuffix: false,
    allowOverwrite: false,
  };
}

async function realType(pathname) {
  const res = await get(pathname, { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return undefined;
  try {
    return await fileTypeFromStream(res.stream);
  } finally {
    res.stream.cancel().catch(() => {});
  }
}

/** Tras subir: comprueba el tipo real y enlaza el recibo (borra el anterior si lo había). */
export async function confirmReceipt(expenseId, pathname) {
  if (!isId(expenseId)) throw new BooksError('Ese gasto no existe.', 404);
  if (!String(pathname || '').startsWith(receiptPrefix(expenseId))) throw new BooksError('El nombre del archivo no es válido.');
  const cur = await sql.query(`SELECT id, receipt_path FROM company_expenses WHERE id = $1`, [expenseId]);
  if (!cur.rowCount) throw new BooksError('Ese gasto no existe.', 404);
  const ft = await realType(pathname);
  const ext = String(pathname).split('.').pop();
  const ok = ft && RECEIPT_TYPES[ft.mime] && (RECEIPT_TYPES[ft.mime] === ext || (ext === 'heic' && /heic|heif/.test(ft.mime)));
  if (!ok) {
    await del(pathname).catch(() => {});
    throw new BooksError('Ese archivo no es una foto ni un PDF de verdad. Se ha descartado.', 400);
  }
  await sql.query(
    `UPDATE company_expenses SET receipt_path = $1, receipt_status = 'attached', updated_at = NOW() WHERE id = $2`,
    [pathname, expenseId]);
  const old = cur.rows[0].receipt_path;
  if (old && old !== pathname) await del(old).catch(() => {});
  return { receipt_status: 'attached', content_type: ft.mime };
}

/** Recibo de un gasto para descargarlo (solo con sesión de admin). */
export async function openReceipt(expenseId) {
  if (!isId(expenseId)) return null;
  const r = await sql.query(`SELECT receipt_path FROM company_expenses WHERE id = $1`, [expenseId]);
  const path = r.rows[0]?.receipt_path;
  if (!path) return null;
  const blob = await get(path, { access: 'private' });
  if (!blob || blob.statusCode !== 200 || !blob.stream) return null;
  return { blob, path };
}

export async function removeReceipt(expenseId) {
  if (!isId(expenseId)) return false;
  const r = await sql.query(`SELECT spent_at, receipt_path FROM company_expenses WHERE id = $1`, [expenseId]);
  if (!r.rowCount) return false;
  await assertMonthOpen(r.rows[0].spent_at, 'ese gasto');
  if (r.rows[0].receipt_path) await del(r.rows[0].receipt_path).catch(() => {});
  await sql.query(
    `UPDATE company_expenses SET receipt_path = NULL, receipt_status = 'none', updated_at = NOW() WHERE id = $1`, [expenseId]);
  return true;
}
