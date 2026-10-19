// ─────────────────────────────────────────────────────────────
// Fechas del panel. Sustituye los fmtDate copiados en cada sección.
//
// Dos tipos de dato, dos tratamientos:
//   · Columnas DATE (due_date, issued_at, paid_at, spent_at, started_at,
//     completed_at de proyectos, next_charge_at, metric_date, hitos): son un
//     DÍA, sin hora. El driver las entrega como 'YYYY-MM-DDT00:00:00.000Z'
//     (medianoche UTC) y `new Date(d)` en Houston las pintaba un día antes
//     (OP-06, FIN-03, MOCK-01). Aquí se lee solo 'YYYY-MM-DD', sin zona.
//   · Timestamps (created_at, read_at, last_synced_at…): un instante; se
//     muestran en la hora de Houston (America/Chicago).
// "Hoy" y "este mes" también se calculan en Houston (MOCK-11): a las 9 pm
// de Houston ya es mañana en UTC.
// ─────────────────────────────────────────────────────────────

export const TZ = 'America/Chicago';
export const LOCALE = 'es-US';

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Partes {y, m, d} de un valor DATE ('YYYY-MM-DD…' o Date). null si no vale. */
export function dayParts(v) {
  if (!v) return null;
  const s = v instanceof Date ? (Number.isNaN(v.getTime()) ? '' : v.toISOString()) : String(v);
  const mm = DAY_RE.exec(s);
  if (!mm) return null;
  return { y: +mm[1], m: +mm[2], d: +mm[3] };
}

/** 'YYYY-MM-DD' de un valor DATE (para inputs type=date). '' si no vale. */
export function dayISO(v) {
  const p = dayParts(v);
  return p ? `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}` : '';
}

// Date "flotante" a mediodía local: el formateo no puede cambiar de día.
function floatDay(v) {
  const p = dayParts(v);
  return p ? new Date(p.y, p.m - 1, p.d, 12) : null;
}

/** DATE → "19 oct 2026". */
export function fmtDay(v, opts) {
  const d = floatDay(v);
  return d ? d.toLocaleDateString(LOCALE, opts || { day: '2-digit', month: 'short', year: 'numeric' }) : '';
}

/** DATE → "19/10" (ejes y etiquetas compactas). */
export function fmtDayShort(v) {
  const p = dayParts(v);
  return p ? `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}` : '';
}

function toInstant(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Timestamp → fecha en Houston, "19 oct 2026". */
export function fmtDate(v) {
  const d = toInstant(v);
  return d ? d.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ }) : '';
}

/** Timestamp → fecha y hora en Houston, "19 oct 2026, 4:05 p.m.". */
export function fmtDateTime(v) {
  const d = toInstant(v);
  return d ? d.toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }) : '';
}

/** Timestamp → hora en Houston, "4:05 p.m.". */
export function fmtTime(v) {
  const d = toInstant(v);
  return d ? d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit', timeZone: TZ }) : '';
}

/** Tiempo relativo corto: "ahora", "5m", "3h", "2d" o la fecha. */
export function rel(v, now = Date.now()) {
  const d = toInstant(v);
  if (!d) return '';
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + 'd';
  return fmtDate(d);
}

/** Hoy en Houston como 'YYYY-MM-DD' (valor por defecto de los inputs de fecha). */
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Mes actual en Houston como 'YYYY-MM'. */
export function monthKey(now = new Date()) {
  return todayISO(now).slice(0, 7);
}

/** Hora (0-23) en Houston, para el saludo. */
export function hourInHouston(now = new Date()) {
  return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(now), 10);
}
