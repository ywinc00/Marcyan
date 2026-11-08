// ════════════════════════════════════════════════════════════════
//  lib/appointments.mjs — Citas que agenda Marcy (migración 019)
//  ────────────────────────────────────────────────────────────────
//  Horario de atención del dueño (hora de Houston, decisión 2026-11-07):
//    lunes a sábado 2:00 pm a 8:30 pm · domingo 9:00 am a 5:00 pm
//  Citas de 30 min, con al menos 2 h de antelación y hasta 7 días vista.
//  Lo puro (huecos, zona horaria, textos) se prueba sin base en
//  scripts/test-appointments.mjs.
// ════════════════════════════════════════════════════════════════

export const TZ = 'America/Chicago';
export const SLOT_MIN = 30;
export const MIN_NOTICE_MIN = 120;
export const HORIZON_DAYS = 7;
// getDay(): 0 = domingo. [inicio, fin] en minutos desde medianoche (el fin es la hora de cierre).
export const HOURS = { 0: [9 * 60, 17 * 60], 1: [14 * 60, 20 * 60 + 30], 2: [14 * 60, 20 * 60 + 30], 3: [14 * 60, 20 * 60 + 30], 4: [14 * 60, 20 * 60 + 30], 5: [14 * 60, 20 * 60 + 30], 6: [14 * 60, 20 * 60 + 30] };
export const STATUSES = ['pendiente', 'hecha', 'cancelada', 'no_vino'];

// Partes de una fecha vista en Houston.
function parts(date, tz = TZ) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' });
  const o = {};
  for (const p of f.formatToParts(date)) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday) };
}

/** Instante UTC de una hora local de Houston (resuelve el cambio de horario). */
export function zonedToUtc(y, m, d, minutes, tz = TZ) {
  const h = Math.floor(minutes / 60);
  const mi = minutes % 60;
  let guess = Date.UTC(y, m - 1, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const p = parts(new Date(guess), tz);
    const shown = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
    guess += Date.UTC(y, m - 1, d, h, mi) - shown;
  }
  return new Date(guess);
}

/** Huecos libres de los próximos días (puro). `taken` = instantes ISO ocupados. */
export function freeSlots({ now = Date.now(), taken = [], days = HORIZON_DAYS } = {}) {
  const busy = new Set(taken.map((t) => new Date(t).getTime()));
  const earliest = now + MIN_NOTICE_MIN * 60000;
  const out = [];
  const today = parts(new Date(now));
  for (let i = 0; i < days; i++) {
    const base = new Date(Date.UTC(today.y, today.m - 1, today.d + i, 12));
    const y = base.getUTCFullYear(); const m = base.getUTCMonth() + 1; const d = base.getUTCDate();
    const wd = base.getUTCDay();
    const [open, close] = HOURS[wd];
    for (let t = open; t + SLOT_MIN <= close; t += SLOT_MIN) {
      const at = zonedToUtc(y, m, d, t);
      const ms = at.getTime();
      if (ms < earliest || busy.has(ms)) continue;
      out.push(at.toISOString());
    }
  }
  return out;
}

/** ¿Es un hueco válido del horario (no ocupado ni pasado)? (puro) */
export function isBookable(iso, { now = Date.now(), taken = [] } = {}) {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return false;
  return freeSlots({ now, taken }).some((s) => new Date(s).getTime() === ms);
}

/** Etiquetas en el idioma del visitante, en hora de Houston (puro). */
export function slotLabel(iso, lang = 'es') {
  const loc = lang === 'en' ? 'en-US' : 'es-US';
  const d = new Date(iso);
  return {
    dia: new Intl.DateTimeFormat(loc, { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(d),
    hora: new Intl.DateTimeFormat(loc, { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(d),
    largo: new Intl.DateTimeFormat(loc, { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(d),
  };
}

/** Huecos agrupados por día para el widget (puro). */
export function groupByDay(slots, lang = 'es') {
  const days = [];
  for (const s of slots) {
    const l = slotLabel(s, lang);
    let g = days[days.length - 1];
    if (!g || g.dia !== l.dia) { g = { dia: l.dia, huecos: [] }; days.push(g); }
    g.huecos.push({ at: s, hora: l.hora });
  }
  return days;
}

// ── Base de datos ──
const ENV = () => (process.env.VERCEL_ENV || 'development');
async function getSql(sqlImpl) { return sqlImpl || (await import('@vercel/postgres')).sql; }

export async function takenSlots({ env = ENV(), sqlImpl, now = Date.now() } = {}) {
  const sql = await getSql(sqlImpl);
  const { rows } = await sql`
    SELECT starts_at FROM appointments
    WHERE env = ${env} AND status <> 'cancelada'
      AND starts_at >= ${new Date(now).toISOString()} AND starts_at < ${new Date(now + (HORIZON_DAYS + 1) * 86400000).toISOString()}
  `;
  return rows.map((r) => new Date(r.starts_at).toISOString());
}

/** Crea la cita. Devuelve { ok, id } o { ok:false, code:'slot_taken' }. */
export async function createAppointment(a, { env = ENV(), sqlImpl } = {}) {
  const sql = await getSql(sqlImpl);
  try {
    const { rows } = await sql`
      INSERT INTO appointments (starts_at, duration_min, status, source, env, name, email, phone, topic, lang, lead_ref, chat_sid)
      VALUES (${a.starts_at}, ${SLOT_MIN}, 'pendiente', ${a.source || 'marcy'}, ${env}, ${a.name || null}, ${a.email || null},
        ${a.phone || null}, ${a.topic || null}, ${a.lang === 'en' ? 'en' : 'es'}, ${a.lead_ref || null}, ${a.chat_sid || null})
      RETURNING id
    `;
    return { ok: true, id: Number(rows[0].id) };
  } catch (err) {
    if (err && err.code === '23505') return { ok: false, code: 'slot_taken' };
    throw err;
  }
}

/** Citas de un rango (Orbit). */
export async function listAppointments({ from, to, env = ENV(), sqlImpl } = {}) {
  const sql = await getSql(sqlImpl);
  const { rows } = await sql`
    SELECT id, created_at, starts_at, duration_min, status, source, name, email, phone, topic, lang, lead_ref, chat_sid, notes
    FROM appointments WHERE env = ${env} AND starts_at >= ${from} AND starts_at < ${to}
    ORDER BY starts_at
  `;
  return rows;
}

/** Borra una cita a mano desde Orbit (pruebas o spam). */
export async function deleteAppointment(id, { env = ENV(), sqlImpl } = {}) {
  const sql = await getSql(sqlImpl);
  const r = await sql`DELETE FROM appointments WHERE id = ${id} AND env = ${env}`;
  return (r.rowCount || 0) > 0;
}

export async function setAppointmentStatus(id, status, { env = ENV(), sqlImpl } = {}) {
  if (!STATUSES.includes(status)) return false;
  const sql = await getSql(sqlImpl);
  const r = await sql`UPDATE appointments SET status = ${status} WHERE id = ${id} AND env = ${env}`;
  return (r.rowCount || 0) > 0;
}
