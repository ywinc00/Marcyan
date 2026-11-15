// ════════════════════════════════════════════════════════════════
//  lib/finance-import-rules.mjs — Reglas PURAS para importar extractos (CSV)
//  de banco, tarjeta, Stripe, PayPal y Revolut. Las usan el panel (vista previa
//  y elección de columnas) y el servidor (que vuelve a validar todo: nunca se
//  fía de lo que manda el navegador). Sin red ni base de datos.
//
//  Fila normalizada: { date:'YYYY-MM-DD', description, amount_cents (con signo:
//  + entra, − sale), fee_cents (≥ 0), ref }.
// ════════════════════════════════════════════════════════════════
import { parseMoney, isValidDay } from './finance-rules.mjs';

export const IMPORT_MAX_ROWS = 2000;

// ── CSV (RFC 4180): comillas, comas o punto y coma o tabulador, saltos dentro de comillas ──
export function detectDelimiter(text) {
  const first = String(text || '').split(/\r?\n/).find((l) => l.trim()) || '';
  const count = (ch) => first.split(ch).length - 1;
  const best = [[',', count(',')], [';', count(';')], ['\t', count('\t')]].sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ',';
}
export function parseCsv(text, delimiter = detectDelimiter(text)) {
  const s = String(text || '').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
      continue;
    }
    if (ch === '"' && cell === '') { quoted = true; continue; }
    if (ch === delimiter) { row.push(cell); cell = ''; continue; }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

// ── Fechas: ISO, MM/DD/YYYY (EE. UU.) o DD/MM/YYYY; con hora detrás se ignora ──
export function parseDate(v, order = 'mdy') {
  const s = String(v || '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return fmt(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const [a, b] = [Number(m[1]), Number(m[2])];
    // Si un lado pasa de 12, no hay duda; si no, manda el orden del formato elegido.
    if (a > 12) return fmt(y, b, a);
    if (b > 12) return fmt(y, a, b);
    return order === 'dmy' ? fmt(y, b, a) : fmt(y, a, b);
  }
  m = /^(\d{1,2}) ([a-z]{3})[a-z]* (\d{4})/i.exec(s); // «2 Oct 2026» (Revolut)
  if (m) {
    const mi = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[2].toLowerCase());
    if (mi >= 0) return fmt(Number(m[3]), mi + 1, Number(m[1]));
  }
  return null;
}
// Stripe y Revolut exportan la hora en UTC: un cobro del 31 a las 21:00 de Houston sale
// como el día 1 en UTC. Con hora, se pasa a la fecha de Houston; sin hora, se deja.
const HOUSTON_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' });
export function utcToHouston(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(v || '').trim());
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  return Number.isNaN(t) ? null : HOUSTON_DAY.format(new Date(t));
}

function fmt(y, mo, d) {
  const out = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return isValidDay(out) ? out : null;
}

// ── Montos con signo: «-1,234.56», «(45.00)», «$12.00 CR» ──
export function parseSignedCents(v) {
  let s = String(v ?? '').trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (/^[-−–]/.test(s)) { neg = true; s = s.replace(/^[-−–]\s*/, ''); }
  if (/-\s*$/.test(s)) { neg = true; s = s.replace(/-\s*$/, ''); }
  if (/\s*DR\s*$/i.test(s)) neg = true; // «12.00 DR» = cargo
  s = s.replace(/\s*(USD|US\$|CR|DR)\s*$/i, '').replace(/^(USD|US\$)\s*/i, '');
  const p = parseMoney(s);
  if (p.cents == null) return null;
  return neg ? -p.cents : p.cents;
}

// ── Formatos conocidos: qué columna es cada cosa (por el nombre de la cabecera) ──
export const IMPORT_PRESETS = {
  bank: {
    label: 'Banco o tarjeta (genérico)',
    date: [/^(posting |transaction |trans\.? )?date$/i, /^fecha/i, /^posted/i],
    description: [/^description$/i, /^descripci[oó]n/i, /^(payee|memo|details|name)$/i],
    amount: [/^amount$/i, /^importe/i, /^monto/i],
    debit: [/^debit$/i, /^withdrawals?$/i, /^cargo/i],
    credit: [/^credit$/i, /^deposits?$/i, /^abono/i],
    ref: [/^(reference|ref|check or slip #|transaction id)$/i],
    order: 'mdy',
  },
  stripe: {
    label: 'Stripe (cobros)',
    date: [/^created( date)?( \(utc\))?$/i, /^date$/i],
    description: [/^description$/i, /^customer (email|description)$/i],
    amount: [/^amount$/i, /^gross$/i],
    fee: [/^fee$/i],
    ref: [/^id$/i],
    status: { col: [/^status$/i], ok: /^(paid|succeeded|available)$/i },
    currency: [/^currency$/i],
    order: 'mdy',
    utc: true,
  },
  paypal: {
    label: 'PayPal (actividad)',
    date: [/^date$/i],
    description: [/^name$/i, /^type$/i],
    amount: [/^gross$/i],
    fee: [/^fee$/i],
    ref: [/^transaction id$/i],
    status: { col: [/^status$/i], ok: /^completed$/i },
    currency: [/^currency$/i],
    order: 'mdy',
  },
  revolut: {
    label: 'Revolut',
    date: [/^(date completed|completed date)( \(utc\))?$/i, /^date started( \(utc\))?$/i, /^started date$/i],
    description: [/^description$/i, /^reference$/i, /^payer$/i],
    amount: [/^amount$/i, /^orig amount$/i],
    fee: [/^fee$/i],
    ref: [/^id$/i],
    status: { col: [/^(state|status)$/i], ok: /^completed$/i },
    currency: [/^(currency|orig currency)$/i],
    order: 'dmy',
    utc: true,
  },
};

const findCol = (headers, patterns = []) => {
  for (const re of patterns) {
    const i = headers.findIndex((h) => re.test(String(h).trim()));
    if (i >= 0) return i;
  }
  return -1;
};

/** Columnas propuestas para un preset: { date, description, amount, debit, credit, fee, ref, status, currency } (índices o -1). */
export function guessMapping(headers, presetId = 'bank') {
  const p = IMPORT_PRESETS[presetId] || IMPORT_PRESETS.bank;
  return {
    preset: presetId in IMPORT_PRESETS ? presetId : 'bank',
    date: findCol(headers, p.date),
    description: findCol(headers, p.description),
    description2: p.description.length > 1 && presetId === 'paypal' ? findCol(headers, [p.description[1]]) : -1,
    amount: findCol(headers, p.amount),
    debit: findCol(headers, p.debit),
    credit: findCol(headers, p.credit),
    fee: findCol(headers, p.fee),
    ref: findCol(headers, p.ref),
    status: p.status ? findCol(headers, p.status.col) : -1,
    currency: findCol(headers, p.currency),
    order: p.order,
    invert: false,
  };
}

/** Reconoce el formato por sus cabeceras (Stripe, PayPal, Revolut) o vuelve a «banco». */
export function detectPreset(headers) {
  const h = headers.map((x) => String(x).trim().toLowerCase());
  if (h.includes('gross') && h.includes('transaction id')) return 'paypal';
  if (h.some((x) => /^date (started|completed)/.test(x) || /^(started|completed) date$/.test(x))) return 'revolut';
  if (h.some((x) => /^created( date)?( \(utc\))?$/.test(x)) && h.includes('fee')) return 'stripe';
  return 'bank';
}

/**
 * Convierte las filas del CSV (sin la cabecera) a filas normalizadas.
 * Devuelve { rows, skipped: { invalid, status, currency, zero }, problems: [ { line, reason } ] }.
 */
export function normalizeRows(dataRows, mapping) {
  const m = mapping || {};
  const preset = IMPORT_PRESETS[m.preset] || IMPORT_PRESETS.bank;
  const out = [];
  const skipped = { invalid: 0, status: 0, currency: 0, zero: 0 };
  const problems = [];
  const get = (r, i) => (i >= 0 && i < r.length ? String(r[i]).trim() : '');
  dataRows.forEach((r, idx) => {
    const line = idx + 2; // la 1 es la cabecera
    if (m.status >= 0 && preset.status && get(r, m.status) && !preset.status.ok.test(get(r, m.status))) { skipped.status++; return; }
    const cur = get(r, m.currency);
    if (cur && cur.toUpperCase() !== 'USD') { skipped.currency++; return; }
    const date = (preset.utc && utcToHouston(get(r, m.date))) || parseDate(get(r, m.date), m.order || preset.order);
    let amount = null;
    if (m.amount >= 0 && get(r, m.amount) !== '') amount = parseSignedCents(get(r, m.amount));
    else if (m.debit >= 0 || m.credit >= 0) {
      const d = parseSignedCents(get(r, m.debit));
      const c = parseSignedCents(get(r, m.credit));
      if (d != null && d !== 0) amount = -Math.abs(d);
      else if (c != null) amount = Math.abs(c);
    }
    const desc = [get(r, m.description), get(r, m.description2)].filter(Boolean).join(' · ').replace(/\s+/g, ' ').slice(0, 200);
    if (!date || amount == null || !desc) {
      skipped.invalid++;
      if (problems.length < 20) problems.push({ line, reason: !date ? 'fecha' : amount == null ? 'importe' : 'concepto' });
      return;
    }
    if (amount === 0) { skipped.zero++; return; }
    if (m.invert) amount = -amount;
    const fee = m.fee >= 0 ? Math.abs(parseSignedCents(get(r, m.fee)) || 0) : 0;
    out.push({ date, description: desc, amount_cents: amount, fee_cents: amount > 0 ? Math.min(fee, amount) : 0, ref: get(r, m.ref).slice(0, 120) });
  });
  return { rows: out.slice(0, IMPORT_MAX_ROWS), truncated: out.length > IMPORT_MAX_ROWS, skipped, problems };
}

// ── Proveedor y categoría probables a partir del concepto ──
// «SQ *FIGMA.COM 4021 SAN FRANCISCO» → «Figma». Quita prefijos de pasarela, dominios y
// palabras de banco, y se queda con las primeras palabras hasta la primera con cifras.
const PROCESSOR = /^(sq|tst|sp|py|pp|paypal|ckc|in|dd|pos|sumup|iz|zettle)\s*\*\s*/i;
const NOISE = /^(pos|purchase|debit|credit|card|visa|mastercard|amex|recurring|payment|pmt|ach|online|web|www|inc|llc|ltd|corp|co|usa|us|tx|fl|the)$/i;
export function guessVendor(description) {
  const s = String(description || '').trim().replace(PROCESSOR, '')
    .replace(/\.(com|net|org|io|co|ai|app|dev)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}&' -]/gu, ' ').replace(/\s+/g, ' ').trim();
  const words = [];
  for (const w of s.split(' ')) {
    if (!w || /\d/.test(w) || NOISE.test(w)) { if (words.length) break; continue; }
    words.push(w);
    if (words.length === 2) break;
  }
  const out = words.join(' ').toLowerCase().replace(/(^|[\s&'-])\p{L}/gu, (m) => m.toUpperCase());
  return out.slice(0, 80) || null;
}

const VENDOR_HINTS = [
  [/vercel|netlify|godaddy|namecheap|cloudflare|neon\b|supabase|upstash|digitalocean|aws|amazon web|hostinger|squarespace domains|porkbun/i, 'hosting'],
  [/openai|chatgpt|anthropic|claude|midjourney|heygen|elevenlabs|runway|perplexity|gemini|replicate/i, 'ia'],
  [/figma|adobe|notion|github|slack|google \*?(workspace|gsuite)|microsoft|canva|resend|twilio|zoom|1password|calendly|loom|framer|webflow/i, 'software'],
  [/facebook|meta ads|fb\.me|google ads|adwords|linkedin|tiktok ads|yelp ads|nextdoor/i, 'marketing'],
  [/uber|lyft|delta|united|american airlines|southwest|spirit|jetblue|airbnb|marriott|hilton|hotel/i, 'viajes'],
  [/at&t|verizon|t-mobile|comcast|xfinity|spectrum|internet|phone/i, 'telefono'],
  [/udemy|coursera|domestika|skillshare|masterclass/i, 'formacion'],
  [/stripe fee|paypal fee|service fee|monthly fee|wire fee|overdraft/i, 'banco'],
  [/staples|office depot|officemax/i, 'oficina'],
  [/best buy|apple\.com|apple store|b&h|newegg/i, 'equipo'],
  [/legalzoom|cpa|accounting|notary|sunbiz|sos\.texas|comptroller/i, 'legal'],
];
/** Categoría probable por el nombre del comercio, o null (la decide el dueño al revisar). */
export function guessCategory(description) {
  const s = String(description || '');
  for (const [re, cat] of VENDOR_HINTS) if (re.test(s)) return cat;
  return null;
}

/**
 * Clave estable de cada fila para no importarla dos veces: cuenta + fecha + importe +
 * concepto + referencia, y un contador para filas idénticas en el mismo archivo
 * (dos cafés iguales el mismo día son dos gastos).
 */
export function importKeys(accountId, rows, hash) {
  const seen = new Map();
  return rows.map((r) => {
    const base = [accountId, r.date, r.amount_cents, String(r.description).toLowerCase().replace(/\s+/g, ' ').trim(), r.ref || ''].join('|');
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return `imp:${accountId}:${hash(base).slice(0, 24)}:${n}`;
  });
}
