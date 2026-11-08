// ─────────────────────────────────────────────────────────────
// Calendario de citas de Orbit: fechas en hora de Houston (puro, se prueba
// sin navegador). Un "día" es { key:'YYYY-MM-DD', y, m, d, wd, wdLabel }.
// ─────────────────────────────────────────────────────────────

const TZ = 'America/Chicago';
const WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const CITA_STATUS = {
  pendiente: { label: 'Pendiente',    tone: 'data' },
  hecha:     { label: 'Hecha',        tone: 'success' },
  no_vino:   { label: 'No contestó',  tone: 'warning' },
  cancelada: { label: 'Cancelada',    tone: 'neutral' },
};

const pad = (n) => String(n).padStart(2, '0');

function makeDay(y, m, d) {
  const u = new Date(Date.UTC(y, m - 1, d, 12));
  const Y = u.getUTCFullYear(); const M = u.getUTCMonth() + 1; const D = u.getUTCDate();
  const wd = u.getUTCDay();
  return { key: `${Y}-${pad(M)}-${pad(D)}`, y: Y, m: M, d: D, wd, wdLabel: WD[wd] };
}

/** Fecha y minutos del día vistos en Houston. */
export function houstonParts(date) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const o = {};
  for (const p of f.formatToParts(date)) o[p.type] = p.value;
  return { ...makeDay(+o.year, +o.month, +o.day), minutes: +o.hour * 60 + +o.minute };
}

/** Lunes de la semana (en Houston) de una fecha. */
export function weekStart(date) {
  const p = houstonParts(date);
  const back = (p.wd + 6) % 7;
  return makeDay(p.y, p.m, p.d - back);
}

export function addDays(day, n) { return makeDay(day.y, day.m, day.d + n); }

export function dayLabel(day) { return `${day.wdLabel} ${day.d} ${MONTHS[day.m - 1]}`; }

export function timeLabel(minutes) {
  const h = Math.floor(minutes / 60); const m = minutes % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${h < 12 ? 'am' : 'pm'}`;
}
