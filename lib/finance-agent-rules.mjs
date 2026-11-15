// ════════════════════════════════════════════════════════════════
//  Agente contable de Finanzas — reglas puras (sin red ni base).
//  Plan: _cerebro/marcyan-web/encargos/2026-11-14-plan-panel-finanzas.md (fase 2)
//
//  · Qué puede proponer el agente y cómo se valida cada propuesta (ids reales,
//    montos y fechas posibles, categorías de la lista). Nada se aplica aquí.
//  · La memoria del agente: rutas, límites y las órdenes de la herramienta de
//    memoria de Anthropic (view, create, str_replace, insert, delete, rename).
//  · Quitar datos personales del texto de un correo antes de enseñárselo al modelo.
//  · El coste de cada respuesta para el tope mensual.
// ════════════════════════════════════════════════════════════════
import { TAX_CATEGORIES } from './finance-tax.mjs';
import { PRICES_USD_PER_MTOK } from './chat-usage.mjs';
import { dayOf, formatUsd, isValidDay } from './finance-rules.mjs';

export const AGENT_MODEL = 'claude-opus-5-5';
export const AGENT_MAX_ITERATIONS = 12;
export const AGENT_MANUAL_RUNS_PER_DAY = 4;
export const PROPOSAL_KINDS = Object.freeze(['registrar_gasto', 'categorizar', 'descartar_movimiento',
  'vincular_suscripcion', 'vincular_cobro', 'aviso']);
export const PROPOSAL_LINKS = Object.freeze(['ano', 'facturas', 'movimientos', 'impuestos', 'registros']);
export const REJECT_COOLDOWN_DAYS = 60;

// Precios por millón de tokens (USD). Opus 5.5 y sus posibles respaldos leídos de la
// documentación de Anthropic el 2026-11-14; caché de 5 minutos = 1,25 × la entrada.
const AGENT_PRICES = Object.freeze({
  ...PRICES_USD_PER_MTOK,
  'claude-opus-5-5': { input: 4, cacheWrite: 5, cacheRead: 0.2, output: 20 },
  'claude-opus-5':   { input: 5, cacheWrite: 6.25, cacheRead: 0.5, output: 25 },
  'claude-opus-4-8': { input: 5, cacheWrite: 6.25, cacheRead: 0.5, output: 25 },
});
// Un modelo sin precio conocido se cobra al más caro de la tabla: el tope nunca se
// salta por un 0 (mejor pasarse de prudente).
const PRICE_CEILING = Object.values(AGENT_PRICES).reduce((a, p) => (p.output > a.output ? p : a));

const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v)) : 0);

const costOf = (u, model) => {
  const p = AGENT_PRICES[model] || PRICE_CEILING;
  return num(u.input_tokens) * p.input + num(u.output_tokens) * p.output
    + num(u.cache_read_input_tokens) * p.cacheRead + num(u.cache_creation_input_tokens) * p.cacheWrite;
};

/**
 * Coste de UNA respuesta en micro-dólares. Con modelo de respaldo, el uso de arriba
 * solo cuenta el intento que contestó: la verdad está en usage.iterations, un
 * intento por entrada, cada uno a su precio (documentación de Anthropic, rechazos).
 */
export function messageCostMicroUsd(message) {
  const u = (message && message.usage) || {};
  if (Array.isArray(u.iterations) && u.iterations.length) {
    return Math.round(u.iterations.reduce((a, it) => a + costOf(it || {}, (it && it.model) || message.model), 0));
  }
  return Math.round(costOf(u, message && message.model));
}

// ── Datos personales fuera del texto que ve el modelo ───────────
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Números fiscales: SSN 123-45-6789 · EIN 12-3456789 o 12 3456789.
const TAX_ID_RE = /(?<!\d)(?:\d{3}-\d{2}-\d{4}|\d{2}[- ]\d{7})(?!\d)/g;
// Teléfonos de EE. UU. ((713)555-1234, 713 5551234, 713-555-0199) e internacionales por
// grupos (+52 55 1234 5678). Las fechas (2026-11-14, 11/14/2026) y los montos no casan.
const PHONE_US_RE = /(?<![\d/-])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?![\d/-])/g;
const PHONE_INTL_RE = /\+\d{1,3}(?:[\s.-]?\d{1,4}){2,5}(?!\d)/g;
// Cuentas: los dígitos que siguen a «cuenta», «account», «routing», «CLABE», «IBAN»…
// Solo con un separador corto («Cuenta: », «Account #», «routing no. »): no cruza frases ni fechas.
const ACCOUNT_RE = /\b(cuenta|account|acct|routing|clabe|iban|aba)\b((?:\s*(?:no\.?|n[ºo°]|number|número|#|:))*\s*)([\dXx*][\dXx* -]{4,}\d)/gi;
const LONG_DIGITS_RE = /(?<!\d)\d{9,}(?!\d)/g;
// Tarjetas: grupos de 4 cifras (13 a 19 dígitos) que pasan la comprobación de Luhn.
const CARD_RE = /(?<!\d)\d{4}(?:[ -]?\d{4}){2}[ -]?\d{1,7}(?!\d)/g;
function luhn(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Quita correos, números fiscales, teléfonos, cuentas y tarjetas de un texto. */
export function redactText(text, max = 6000) {
  return String(text || '')
    .replace(EMAIL_RE, '[correo]')
    .replace(TAX_ID_RE, '[número fiscal]')
    .replace(CARD_RE, (m) => { const d = m.replace(/\D/g, ''); return d.length >= 13 && d.length <= 19 && luhn(d) ? '[tarjeta]' : m; })
    .replace(ACCOUNT_RE, (_, k, sep) => `${k}${sep}[número]`)
    .replace(PHONE_INTL_RE, (m) => (m.replace(/\D/g, '').length >= 8 ? '[teléfono]' : m))
    .replace(PHONE_US_RE, '[teléfono]')
    .replace(LONG_DIGITS_RE, '[número]')
    .replace(/\s{3,}/g, '\n\n')
    .slice(0, max);
}

/** Dominio del remitente (lo único del remitente que ve el modelo). */
export function senderDomain(email) {
  const m = String(email || '').toLowerCase().match(/@([a-z0-9.-]+\.[a-z]{2,})$/);
  return m ? m[1] : '';
}

// ── Memoria (/memories) ─────────────────────────────────────────
export const MEMORY_ROOT = '/memories';
export const MEMORY_MAX_FILES = 20;
export const MEMORY_MAX_CHARS = 8000;
const MEMORY_PATH_RE = /^\/memories\/[a-z0-9][a-z0-9_-]{0,40}(?:\/[a-z0-9][a-z0-9_-]{0,40})?\.(?:md|txt)$/;

export class MemoryError extends Error {}

export function checkMemoryPath(path) {
  const p = String(path || '').trim();
  if (!MEMORY_PATH_RE.test(p) || p.includes('..')) {
    throw new MemoryError(`Ruta no válida: ${p || '(vacía)'}. Usa /memories/nombre.md (minúsculas, sin espacios).`);
  }
  return p;
}

/** La memoria nunca guarda correos, teléfonos ni números de cuenta o fiscales. */
export function checkMemoryText(text) {
  const s = String(text ?? '');
  if (s.length > MEMORY_MAX_CHARS) throw new MemoryError(`El archivo pasa de ${MEMORY_MAX_CHARS} caracteres: resúmelo.`);
  // Si redactar el texto lo cambiaría, es que lleva algo personal: no se guarda.
  if (redactText(s, MEMORY_MAX_CHARS + 1) !== s.replace(/\s{3,}/g, '\n\n')) {
    throw new MemoryError('No guardes datos personales, correos ni números de cuenta o fiscales en la memoria.');
  }
  return s;
}

function numbered(content, range) {
  const lines = String(content).split('\n');
  let from = 1; let to = lines.length;
  if (Array.isArray(range) && range.length === 2) {
    from = Math.max(1, Number(range[0]) || 1);
    to = Number(range[1]) === -1 ? lines.length : Math.min(lines.length, Number(range[1]) || lines.length);
  }
  return lines.slice(from - 1, to).map((l, i) => `${String(from + i).padStart(6)}\t${l}`).join('\n');
}

/**
 * Ejecuta una orden de la herramienta de memoria sobre `files` (Map ruta → texto).
 * Devuelve { text, writes: [{path, content|null}] }: lo que se contesta al modelo y lo
 * que hay que guardar o borrar (null) en la base. Errores → MemoryError.
 */
export function memoryCommand(files, cmd) {
  const c = cmd && typeof cmd === 'object' ? cmd : {};
  const isRoot = (p) => p === MEMORY_ROOT || p === `${MEMORY_ROOT}/`;
  switch (c.command) {
    case 'view': {
      const p = String(c.path || MEMORY_ROOT).trim();
      if (isRoot(p)) {
        const list = [...files.entries()].sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${String(v).length}\t${k}`);
        return { text: `Archivos en ${MEMORY_ROOT}:\n${list.length ? list.join('\n') : '(vacío)'}`, writes: [] };
      }
      const path = checkMemoryPath(p);
      if (!files.has(path)) throw new MemoryError(`No existe ${path}.`);
      return { text: numbered(files.get(path), c.view_range), writes: [] };
    }
    case 'create': {
      const path = checkMemoryPath(c.path);
      const text = checkMemoryText(c.file_text);
      if (!files.has(path) && files.size >= MEMORY_MAX_FILES) {
        throw new MemoryError(`La memoria ya tiene ${MEMORY_MAX_FILES} archivos: junta o borra alguno.`);
      }
      files.set(path, text);
      return { text: `Archivo guardado: ${path}`, writes: [{ path, content: text }] };
    }
    case 'str_replace': {
      const path = checkMemoryPath(c.path);
      if (!files.has(path)) throw new MemoryError(`No existe ${path}.`);
      const cur = files.get(path);
      const oldStr = String(c.old_str ?? '');
      if (!oldStr) throw new MemoryError('Falta el texto a cambiar.');
      const count = cur.split(oldStr).length - 1;
      if (count === 0) throw new MemoryError(`El texto no aparece tal cual en ${path}.`);
      if (count > 1) throw new MemoryError(`El texto aparece ${count} veces en ${path}: da más contexto.`);
      const next = checkMemoryText(cur.replace(oldStr, () => String(c.new_str ?? '')));
      files.set(path, next);
      return { text: `Archivo editado: ${path}`, writes: [{ path, content: next }] };
    }
    case 'insert': {
      const path = checkMemoryPath(c.path);
      if (!files.has(path)) throw new MemoryError(`No existe ${path}.`);
      const lines = files.get(path).split('\n');
      const at = Number(c.insert_line);
      if (!Number.isInteger(at) || at < 0 || at > lines.length) throw new MemoryError(`Línea fuera de rango (0 a ${lines.length}).`);
      lines.splice(at, 0, String(c.insert_text ?? ''));
      const next = checkMemoryText(lines.join('\n'));
      files.set(path, next);
      return { text: `Texto insertado en ${path}`, writes: [{ path, content: next }] };
    }
    case 'delete': {
      const path = checkMemoryPath(c.path);
      if (!files.has(path)) throw new MemoryError(`No existe ${path}.`);
      files.delete(path);
      return { text: `Borrado: ${path}`, writes: [{ path, content: null }] };
    }
    case 'rename': {
      const from = checkMemoryPath(c.old_path);
      const to = checkMemoryPath(c.new_path);
      if (!files.has(from)) throw new MemoryError(`No existe ${from}.`);
      if (files.has(to)) throw new MemoryError(`Ya existe ${to}.`);
      const content = files.get(from);
      files.delete(from); files.set(to, content);
      return { text: `Renombrado: ${from} → ${to}`, writes: [{ path: from, content: null }, { path: to, content }] };
    }
    default:
      throw new MemoryError(`Orden de memoria desconocida: ${c.command || '(ninguna)'}.`);
  }
}

// ── Propuestas ──────────────────────────────────────────────────
export class ProposalError extends Error {}

const CATEGORY_IDS = new Set(TAX_CATEGORIES.map((c) => c.id));
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const idOf = (v) => (v === null || v === undefined || v === '' ? null : String(v).trim());
const text = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * Valida lo que el agente quiere proponer contra lo que de verdad hay (ctx) y lo
 * convierte en una fila { kind, target_ref, title, detail, payload }. Un id que no
 * venga en la situación del día se rechaza: el agente no puede inventar movimientos.
 *
 * ctx: { today, refs:Set, mails:Map, expenses:Map, income:Map, subscriptions:Map,
 *        paymentMatches:Map(incomeId → Set(paymentId)), accounts:Set }
 */
function validateProposalCore(input, ctx) {
  const i = input && typeof input === 'object' ? input : {};
  const kind = String(i.tipo || '');
  if (!PROPOSAL_KINDS.includes(kind)) throw new ProposalError(`Tipo de propuesta desconocido: ${kind || '(ninguno)'}.`);
  const title = text(i.titulo, 120);
  if (title.length < 6) throw new ProposalError('Escribe un título claro (qué propones).');
  const detail = text(i.explicacion, 500) || null;
  const link = PROPOSAL_LINKS.includes(i.enlace) ? i.enlace : null;

  const needExpense = () => {
    const id = idOf(i.gasto_id);
    if (!id || !ctx.expenses.has(id)) throw new ProposalError('Ese gasto no está entre los movimientos por revisar de hoy.');
    return id;
  };
  const needIncome = () => {
    const id = idOf(i.ingreso_id);
    if (!id || !ctx.income.has(id)) throw new ProposalError('Ese ingreso no está entre los movimientos por revisar de hoy.');
    return id;
  };
  const category = () => {
    const c = String(i.categoria || '');
    if (!CATEGORY_IDS.has(c)) throw new ProposalError(`Categoría desconocida: ${c || '(ninguna)'}. Usa una de la lista.`);
    return c;
  };
  const pct = () => {
    if (i.uso_negocio_pct === undefined || i.uso_negocio_pct === null || i.uso_negocio_pct === '') return 100;
    const n = Number(i.uso_negocio_pct);
    if (!Number.isInteger(n) || n < 1 || n > 100) throw new ProposalError('El uso de negocio va de 1 a 100 %.');
    return n;
  };

  if (kind === 'registrar_gasto') {
    const mailId = idOf(i.correo_id);
    if (!mailId || !ctx.mails.has(mailId)) throw new ProposalError('Ese correo no está entre las facturas nuevas de hoy.');
    const usd = Number(i.monto_usd);
    if (!Number.isFinite(usd) || usd <= 0 || usd >= 100000) throw new ProposalError('El monto tiene que estar entre 0 y 100 000 USD.');
    const cents = Math.round(usd * 100);
    const day = String(i.fecha || '');
    if (!DAY_RE.test(day) || !isValidDay(day)) throw new ProposalError('La fecha va como AAAA-MM-DD y tiene que existir.');
    if (day > ctx.today) throw new ProposalError('La fecha del gasto no puede ser futura.');
    if (Date.parse(ctx.today) - Date.parse(day) > 400 * 864e5) throw new ProposalError('Ese gasto es de hace más de un año: que lo revise el dueño a mano.');
    const label = text(i.concepto, 200);
    if (!label) throw new ProposalError('Falta el concepto del gasto.');
    const account = idOf(i.cuenta_id);
    if (account && !ctx.accounts.has(account)) throw new ProposalError('Esa cuenta no existe.');
    return {
      kind, target_ref: `mail:${mailId}`, title, detail, link: link || 'movimientos',
      payload: { mail_id: mailId, label, vendor: text(i.proveedor, 200) || null, amount_cents: cents, spent_at: day,
        category: category(), business_pct: pct(), account_id: account },
    };
  }
  if (kind === 'categorizar') {
    const id = needExpense();
    return { kind, target_ref: `exp:${id}`, title, detail, link: link || 'impuestos',
      payload: { expense_id: id, category: category(), business_pct: pct() } };
  }
  if (kind === 'descartar_movimiento') {
    const hasExp = idOf(i.gasto_id); const hasInc = idOf(i.ingreso_id);
    if (Boolean(hasExp) === Boolean(hasInc)) throw new ProposalError('Indica un gasto o un ingreso (uno solo).');
    const motivo = text(i.motivo, 60);
    if (!motivo) throw new ProposalError('Di por qué no cuenta (traspaso entre cuentas, duplicado, pago de la tarjeta…).');
    if (hasExp) {
      const id = needExpense();
      return { kind, target_ref: `exp:${id}`, title, detail, link: link || 'impuestos', payload: { expense_id: id, motivo } };
    }
    const id = needIncome();
    return { kind, target_ref: `inc:${id}`, title, detail, link: link || 'impuestos', payload: { income_id: id, motivo } };
  }
  if (kind === 'vincular_suscripcion') {
    const id = needExpense();
    const sub = idOf(i.suscripcion_id);
    const matches = new Set(((ctx.expenses.get(id) || {}).subscription_matches || []).map((m) => String(m.subscription_id)));
    if (!sub || !ctx.subscriptions.has(sub) || !matches.has(sub)) {
      throw new ProposalError('Esa suscripción no coincide con el gasto (monto y fechas): usa una de las que coinciden.');
    }
    return { kind, target_ref: `exp:${id}`, title, detail, link: link || 'impuestos', payload: { expense_id: id, subscription_id: sub } };
  }
  if (kind === 'vincular_cobro') {
    const id = needIncome();
    const pay = idOf(i.cobro_id);
    if (!pay || !(ctx.paymentMatches.get(id) || new Set()).has(pay)) {
      throw new ProposalError('Ese cobro no coincide con el ingreso (monto y fechas).');
    }
    return { kind, target_ref: `inc:${id}`, title, detail, link: link || 'impuestos', payload: { income_id: id, payment_id: pay } };
  }
  // aviso: solo informa; se ancla a algo de la situación del día para no repetirse.
  const about = String(i.sobre || '');
  if (!ctx.refs.has(about)) throw new ProposalError('Un aviso va sobre algo de la situación de hoy (usa su referencia, p. ej. close:2026-10).');
  return { kind, target_ref: `aviso:${about}`, title, detail, link, payload: { about } };
}

const CATEGORY_LABEL = new Map(TAX_CATEGORIES.map((c) => [c.id, c.label]));
const cat = (id) => (CATEGORY_LABEL.get(id) || id || '').toLowerCase();
const shortDay = (v) => { const d = dayOf(v); return d ? `${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))}` : ''; };
const quote = (s) => `«${String(s || '').replace(/\s+/g, ' ').trim().slice(0, 60)}»`;

/**
 * Qué hará «Aplicar», escrito por el SERVIDOR a partir del tipo y de los datos reales
 * (nunca con el texto del modelo): es lo que el dueño lee primero antes de pulsar.
 */
export function describeAction(p, ctx) {
  const d = p.payload;
  const exp = d.expense_id ? ctx.expenses.get(d.expense_id) : null;
  const inc = d.income_id ? ctx.income.get(d.income_id) : null;
  const mov = (r, date) => (r ? `${quote(r.label)} del ${shortDay(date)} (${formatUsd(r.amount_cents)})` : 'ese movimiento');
  switch (p.kind) {
    case 'registrar_gasto':
      return `Apuntar un gasto de ${formatUsd(d.amount_cents)} del ${shortDay(d.spent_at)}: ${quote(d.label)}, en ${cat(d.category)}${d.business_pct < 100 ? ` al ${d.business_pct} % de uso de negocio` : ''}.`;
    case 'categorizar':
      return `Aceptar ${mov(exp, exp && exp.spent_at)} como ${cat(d.category)}${d.business_pct < 100 ? ` al ${d.business_pct} %` : ''}.`;
    case 'descartar_movimiento':
      return d.expense_id
        ? `Quitar de los libros el gasto ${mov(exp, exp && exp.spent_at)}: ${d.motivo}. Se borra de lo importado.`
        : `Quitar de los libros el ingreso ${mov(inc, inc && inc.received_at)}: ${d.motivo}. Se borra de lo importado.`;
    case 'vincular_suscripcion': {
      const s = ctx.subscriptions.get(d.subscription_id);
      return `Marcar ${mov(exp, exp && exp.spent_at)} como el cargo de ${s ? s.name : 'esa suscripción'} (sustituye al cargo automático de esas fechas).`;
    }
    case 'vincular_cobro': {
      const pm = ((inc && inc.payment_matches) || []).find((x) => String(x.id) === d.payment_id);
      return `Marcar el ingreso ${mov(inc, inc && inc.received_at)} como el cobro de la factura ${(pm && pm.invoice_number) || 'apuntada'} (no se cuenta dos veces).`;
    }
    default:
      return 'Solo un aviso: «Entendido» no cambia nada en los libros.';
  }
}

/** Valida y añade la descripción de la acción hecha por el servidor. */
export function validateProposal(input, ctx) {
  const p = validateProposalCore(input, ctx);
  p.payload = { ...p.payload, action: describeAction(p, ctx) };
  return p;
}

// ── La herramienta «proponer» (esquema JSON que ve el modelo) ───
export const PROPOSE_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['tipo', 'titulo', 'explicacion'],
  properties: {
    tipo: { type: 'string', enum: [...PROPOSAL_KINDS] },
    titulo: { type: 'string', description: 'Qué propones, en una frase corta en español llano (máx. 120).' },
    explicacion: { type: 'string', description: 'Por qué, con el dato que lo apoya (máx. 500). Sin jerga contable.' },
    correo_id: { type: 'string', description: 'registrar_gasto: id del correo de factura.' },
    gasto_id: { type: 'string', description: 'categorizar, descartar_movimiento, vincular_suscripcion: id del gasto por revisar.' },
    ingreso_id: { type: 'string', description: 'descartar_movimiento, vincular_cobro: id del ingreso por revisar.' },
    suscripcion_id: { type: 'string' },
    cobro_id: { type: 'string', description: 'vincular_cobro: id de un cobro de los que coinciden.' },
    concepto: { type: 'string' },
    proveedor: { type: 'string' },
    monto_usd: { type: 'number' },
    fecha: { type: 'string', description: 'AAAA-MM-DD' },
    categoria: { type: 'string', enum: [...CATEGORY_IDS] },
    uso_negocio_pct: { type: 'integer', minimum: 1, maximum: 100 },
    cuenta_id: { type: 'string' },
    motivo: { type: 'string', description: 'descartar_movimiento: traspaso, duplicado, pago de la tarjeta, aporte del dueño…' },
    sobre: { type: 'string', description: 'aviso: referencia de la situación de hoy (close:AAAA-MM, noreceipt:ID, dup:A-B, mail:ID, exp:ID…).' },
    enlace: { type: 'string', enum: [...PROPOSAL_LINKS] },
  },
});

export const SEARCH_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['desde', 'hasta'],
  properties: {
    desde: { type: 'string', description: 'AAAA-MM-DD' },
    hasta: { type: 'string', description: 'AAAA-MM-DD (máx. 120 días después de desde)' },
    texto: { type: 'string', description: 'Parte del concepto o del proveedor.' },
    monto_usd: { type: 'number', description: 'Monto exacto (±1 USD).' },
  },
});

/** Valida la búsqueda de gastos ya apuntados (solo lectura). */
export function validateSearch(input) {
  const i = input && typeof input === 'object' ? input : {};
  const from = String(i.desde || ''); const to = String(i.hasta || '');
  if (!DAY_RE.test(from) || !DAY_RE.test(to) || !isValidDay(from) || !isValidDay(to)) {
    throw new ProposalError('Las fechas van como AAAA-MM-DD.');
  }
  if (to < from) throw new ProposalError('«hasta» va después de «desde».');
  if (Date.parse(to) - Date.parse(from) > 120 * 864e5) throw new ProposalError('Busca como mucho 120 días seguidos.');
  const usd = i.monto_usd === undefined || i.monto_usd === null ? null : Number(i.monto_usd);
  if (usd !== null && (!Number.isFinite(usd) || usd <= 0)) throw new ProposalError('El monto tiene que ser mayor que 0.');
  return { from, to, text: text(i.texto, 60) || null, cents: usd === null ? null : Math.round(usd * 100) };
}

/** Plazo del tope: el mes de Houston en curso ('YYYY-MM'). */
export function monthOf(today) { return String(today).slice(0, 7); }
