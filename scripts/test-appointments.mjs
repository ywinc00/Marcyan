// Pruebas de las citas de Marcy (puras: horario de Houston, huecos, etiquetas).
import assert from 'node:assert/strict';
import { weekStart, addDays, houstonParts, timeLabel, dayLabel } from '../src/components/dashboard/lib/citas.js';
import { freeSlots, isBookable, zonedToUtc, groupByDay, slotLabel, HOURS } from '../lib/appointments.mjs';

let n = 0; const fails = [];
function check(name, fn) { try { fn(); n++; } catch (e) { fails.push(name + ': ' + e.message); } }
const fmt = (iso) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

// Sábado 7-nov-2026, 10:00 am en Houston (CST, UTC-6) = 16:00 UTC.
const SAT_10AM = Date.UTC(2026, 10, 7, 16, 0);

check('zona horaria: 2:00 pm de Houston en invierno es 20:00 UTC', () => assert.equal(zonedToUtc(2026, 11, 9, 14 * 60).toISOString(), '2026-11-09T20:00:00.000Z'));
check('zona horaria: en verano (CDT) es 19:00 UTC', () => assert.equal(zonedToUtc(2026, 7, 9, 14 * 60).toISOString(), '2026-07-09T19:00:00.000Z'));
check('sábado: primer hueco 2:00 pm y último 8:00 pm', () => {
  const sat = freeSlots({ now: SAT_10AM, days: 1 });
  assert.equal(fmt(sat[0]), 'Sat 2:00 PM'); assert.equal(fmt(sat[sat.length - 1]), 'Sat 8:00 PM'); assert.equal(sat.length, 13);
});
check('domingo: de 9:00 am a 4:30 pm', () => {
  const sun = freeSlots({ now: SAT_10AM, days: 2 }).filter((s) => fmt(s).startsWith('Sun'));
  assert.equal(fmt(sun[0]), 'Sun 9:00 AM'); assert.equal(fmt(sun[sun.length - 1]), 'Sun 4:30 PM'); assert.equal(sun.length, 16);
});
check('2 horas de antelación como mínimo', () => {
  const at1pm = Date.UTC(2026, 10, 7, 19, 0); // sábado 1:00 pm
  assert.equal(fmt(freeSlots({ now: at1pm, days: 1 })[0]), 'Sat 3:00 PM');
});
check('un hueco ocupado no se ofrece ni se puede reservar', () => {
  const all = freeSlots({ now: SAT_10AM, days: 1 });
  const taken = [all[0]];
  assert.equal(freeSlots({ now: SAT_10AM, days: 1, taken }).includes(all[0]), false);
  assert.equal(isBookable(all[0], { now: SAT_10AM, taken }), false);
  assert.equal(isBookable(all[1], { now: SAT_10AM, taken }), true);
});
check('fuera de horario o fecha rota no se reserva', () => {
  assert.equal(isBookable('2026-11-07T15:00:00.000Z', { now: SAT_10AM }), false); // 9 am sábado
  assert.equal(isBookable('no-es-fecha', { now: SAT_10AM }), false);
});
check('7 días vista', () => {
  const all = freeSlots({ now: SAT_10AM });
  const lastDay = new Date(all[all.length - 1]).getTime();
  assert.ok(lastDay < SAT_10AM + 7 * 86400000);
  assert.equal(HOURS[1][0], 14 * 60);
});
check('agrupado por día con etiquetas en español e inglés', () => {
  const g = groupByDay(freeSlots({ now: SAT_10AM, days: 2 }), 'es');
  assert.equal(g.length, 2); assert.equal(g[0].huecos.length, 13);
  assert.match(slotLabel(g[0].huecos[0].at, 'en').hora, /2:00\s?PM/i);
  assert.match(slotLabel(g[0].huecos[0].at, 'es').largo, /sábado/i);
});

check('orbit: la semana empieza en lunes en hora de Houston', () => {
  const w = weekStart(new Date(SAT_10AM));
  assert.equal(w.key, '2026-11-02'); assert.equal(addDays(w, 6).key, '2026-11-08');
  assert.equal(dayLabel(w), 'lun 2 nov');
});
check('orbit: viernes 11 pm UTC del domingo sigue siendo domingo en Houston', () => assert.equal(houstonParts(new Date(Date.UTC(2026, 10, 9, 3, 0))).key, '2026-11-08'));
check('orbit: horas legibles', () => { assert.equal(timeLabel(14 * 60), '2:00 pm'); assert.equal(timeLabel(9 * 60 + 30), '9:30 am'); assert.equal(timeLabel(12 * 60), '12:00 pm'); });

if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log(`✓ ${n} pruebas de las citas pasaron.`);
