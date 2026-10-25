// ════════════════════════════════════════════════════════════════
//  lib/dates.mjs — Fechas del servidor en hora de Houston (America/Chicago)
//
//  Por qué existe: Neon y Vercel corren en UTC. "Este mes" con
//  date_trunc('month', NOW()) cambia de mes a las 7 pm de Houston (6 pm en
//  horario de verano) del último día, y un lead de las 8 pm del 31 contaba
//  para el mes siguiente. Aquí se calculan los límites en hora de Houston.
//
//  Dos formas de usarlo:
//    1) Límites calculados en JS y pasados como PARÁMETROS (preferida: el
//       tag sql`` de @vercel/postgres solo admite valores, no SQL crudo):
//         const m = monthRange();                 // este mes
//         sql`… WHERE created_at >= ${m.startISO} AND created_at < ${m.endISO}`
//         sql`… WHERE paid_at   >= ${m.startDate} AND paid_at   < ${m.endDate}`  (columnas DATE)
//    2) Fragmentos SQL (solo para client.query con texto armado a mano):
//         SQL_TODAY_HOUSTON, SQL_MONTH_START_HOUSTON…
//
//  Contrato de monthRange()/dayRange():
//    { key, startISO, endISO, startDate, endDate }
//    · startISO/endISO: instantes UTC (ISO 8601) del inicio del periodo y del
//      inicio del siguiente → para columnas TIMESTAMPTZ, rango [start, end).
//    · startDate/endDate: 'YYYY-MM-DD' locales de Houston → columnas DATE, [start, end).
//    · key: 'YYYY-MM' (mes) o 'YYYY-MM-DD' (día).
// ════════════════════════════════════════════════════════════════

export const TZ = 'America/Chicago';

// ── Fragmentos SQL (texto; NO interpolar en sql`` porque irían como parámetro) ──
export const SQL_NOW_HOUSTON         = `(now() AT TIME ZONE '${TZ}')`;               // timestamp local (sin zona)
export const SQL_TODAY_HOUSTON       = `(now() AT TIME ZONE '${TZ}')::date`;         // fecha local de hoy
export const SQL_MONTH_START_HOUSTON = `(date_trunc('month', now() AT TIME ZONE '${TZ}') AT TIME ZONE '${TZ}')`; // timestamptz
export const SQL_PREV_MONTH_START_HOUSTON =
  `((date_trunc('month', now() AT TIME ZONE '${TZ}') - INTERVAL '1 month') AT TIME ZONE '${TZ}')`;
// Mes local ('YYYY-MM') de una columna timestamptz: sqlMonthKey('created_at')
export function sqlMonthKey(col) {
  return `to_char(date_trunc('month', ${col} AT TIME ZONE '${TZ}'), 'YYYY-MM')`;
}

// ── Núcleo: partes de fecha/hora de un instante en Houston ─────────────
const _fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

function toDate(now) {
  if (now instanceof Date) return now;
  if (now == null) return new Date();
  return new Date(now);
}

// { y, m (1-12), d, hh, mm, ss } en hora de Houston.
export function houstonParts(now) {
  const parts = {};
  for (const p of _fmt.formatToParts(toDate(now))) parts[p.type] = p.value;
  return {
    y: Number(parts.year), m: Number(parts.month), d: Number(parts.day),
    hh: Number(parts.hour) % 24, mm: Number(parts.minute), ss: Number(parts.second),
  };
}

// Desfase de Houston respecto a UTC en minutos para un instante (CST −360, CDT −300).
export function houstonOffsetMinutes(now) {
  const t = toDate(now).getTime();
  const p = houstonParts(t);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss);
  return Math.round((asUtc - Math.floor(t / 1000) * 1000) / 60000);
}

// Instante UTC de la medianoche local de Houston del día y/m/d.
// Dos pasadas: la primera estima con el desfase de esa hora UTC, la segunda
// corrige si entre medias hubo cambio de horario. (Los cambios de horario en
// EE.UU. son a las 2 am, nunca a medianoche, así que la medianoche siempre existe.)
export function houstonMidnightUtc(y, m, d) {
  const guess = Date.UTC(y, m - 1, d);
  let t = guess - houstonOffsetMinutes(guess) * 60000;
  const off2 = houstonOffsetMinutes(t);
  t = guess - off2 * 60000;
  return new Date(t);
}

const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// Normaliza (y, m) con m fuera de 1..12 (p. ej. m = 0 → diciembre del año anterior).
function normYM(y, m) {
  const z = (y * 12) + (m - 1);
  return { y: Math.floor(z / 12), m: (z % 12 + 12) % 12 + 1 };
}

// ── API pública ───────────────────────────────────────────────
// Fecha local de Houston 'YYYY-MM-DD'.
export function houstonDate(now) {
  const p = houstonParts(now);
  return ymd(p.y, p.m, p.d);
}

// Mes local de Houston 'YYYY-MM'.
export function houstonMonthKey(now) {
  const p = houstonParts(now);
  return `${p.y}-${pad(p.m)}`;
}

// Rango de un mes en hora de Houston. offset 0 = este mes, −1 = mes anterior.
export function monthRange(offset = 0, now) {
  const p = houstonParts(now);
  const a = normYM(p.y, p.m + offset);
  const b = normYM(a.y, a.m + 1);
  return {
    key: `${a.y}-${pad(a.m)}`,
    startISO: houstonMidnightUtc(a.y, a.m, 1).toISOString(),
    endISO:   houstonMidnightUtc(b.y, b.m, 1).toISOString(),
    startDate: ymd(a.y, a.m, 1),
    endDate:   ymd(b.y, b.m, 1),
  };
}

// Rango de "hoy" (offset 0) o de otro día relativo en hora de Houston.
export function dayRange(offset = 0, now) {
  const p = houstonParts(now);
  // Aritmética de calendario en UTC puro (sin horas) para no arrastrar desfases.
  const a = new Date(Date.UTC(p.y, p.m - 1, p.d + offset));
  const b = new Date(Date.UTC(p.y, p.m - 1, p.d + offset + 1));
  const ay = a.getUTCFullYear(), am = a.getUTCMonth() + 1, ad = a.getUTCDate();
  const by = b.getUTCFullYear(), bm = b.getUTCMonth() + 1, bd = b.getUTCDate();
  return {
    key: ymd(ay, am, ad),
    startISO: houstonMidnightUtc(ay, am, ad).toISOString(),
    endISO:   houstonMidnightUtc(by, bm, bd).toISOString(),
    startDate: ymd(ay, am, ad),
    endDate:   ymd(by, bm, bd),
  };
}

// Las claves 'YYYY-MM' de los últimos n meses (terminando en el actual), en Houston.
export function lastMonthKeys(n, now) {
  const p = houstonParts(now);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const a = normYM(p.y, p.m - i);
    out.push(`${a.y}-${pad(a.m)}`);
  }
  return out;
}

// Fecha y hora legibles en hora de Houston (correos al dueño, documentos).
// Ej.: "19 de octubre de 2026, 7:05 p.m."
export function formatHoustonDateTime(when, locale = 'es-US') {
  return toDate(when).toLocaleString(locale, {
    timeZone: TZ, dateStyle: 'long', timeStyle: 'short',
  });
}
