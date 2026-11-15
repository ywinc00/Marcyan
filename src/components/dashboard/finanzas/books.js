// ─────────────────────────────────────────────────────────────
// Ayudas de los libros de Finanzas en el panel (fase 1): cuentas compartidas
// entre formularios y subida de recibos al almacén privado.
//   Recibo: el servidor da un permiso de un solo uso para una ruta exacta
//   (receipts/<gasto>/<uuid>.<ext>), el navegador sube el archivo directo y
//   después se confirma; el servidor comprueba el tipo real por sus bytes.
// ─────────────────────────────────────────────────────────────
import { api } from '../lib/api.js';

let accountsPromise = null;
/** Cuentas (banco, Stripe, PayPal…), una sola petición por visita. */
export function loadAccounts({ fresh = false } = {}) {
  if (!accountsPromise || fresh) {
    accountsPromise = api('/api/admin/finance/records?kind=accounts').then((j) => j.rows || []).catch((e) => { accountsPromise = null; throw e; });
  }
  return accountsPromise;
}

export const RECEIPT_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf' };
export const RECEIPT_MAX = 15 * 1024 * 1024;

/** Motivo en llano si el archivo no sirve como recibo; '' si sirve. */
export function receiptProblem(file) {
  if (!file) return '';
  const type = (file.type || '').toLowerCase() || (/\.heic$/i.test(file.name) ? 'image/heic' : '');
  if (!RECEIPT_TYPES[type]) return 'El recibo tiene que ser una foto (JPG, PNG, WebP o HEIC) o un PDF.';
  if (file.size > RECEIPT_MAX) return 'El recibo pesa más de 15 MB.';
  if (!file.size) return 'El archivo está vacío.';
  return '';
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Sube el recibo de un gasto y lo enlaza. Lanza con un mensaje legible si falla. */
export async function uploadReceipt(expenseId, file) {
  const problem = receiptProblem(file);
  if (problem) throw new Error(problem);
  const type = (file.type || '').toLowerCase() || 'image/heic';
  const pathname = `receipts/${expenseId}/${uuid()}.${RECEIPT_TYPES[type]}`;
  const clientPayload = JSON.stringify({ expenseId: String(expenseId), contentType: type, size: file.size });
  const tok = await api('/api/admin/finance/receipt', {
    method: 'POST', body: { type: 'blob.generate-client-token', payload: { pathname, clientPayload, multipart: false } },
  });
  if (!tok || !tok.clientToken) throw new Error('No se pudo preparar la subida del recibo.');
  const { put } = await import('@vercel/blob/client');
  await put(pathname, file, { access: 'private', token: tok.clientToken, contentType: type });
  return api('/api/admin/finance/receipt', { method: 'POST', body: { action: 'confirm', expense_id: String(expenseId), pathname } });
}

export const receiptUrl = (expenseId) => `/api/admin/finance/receipt?expense=${encodeURIComponent(expenseId)}`;
