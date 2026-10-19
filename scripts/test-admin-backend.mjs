// ════════════════════════════════════════════════════════════════
//  scripts/test-admin-backend.mjs  ·  npm run test:admin
//  Pruebas del backend de Orbit SIN base de datos y SIN red:
//    · lib/csv.mjs     BOM UTF-8, fórmulas neutralizadas, comillas y saltos.
//    · lib/dates.mjs   límites de día y mes en hora de Houston, incluidos
//                      los cambios de horario (noviembre y marzo) y el año.
//    · lib/auth.mjs    hash de tokens, formato, comparación constante y
//                      requireAdmin sin cookie (401 sin tocar la BD).
//    · Recorrido estático de api/admin/**: cada handler pasa por
//      requireAdmin antes de cualquier otra espera (salvo login, verify
//      y logout, que son la puerta de entrada y salida).
//    · Enlaces profundos de avisos y correos, y filtro de leads.
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { escapeCell, rowsToCsv, CSV_BOM } from '../lib/csv.mjs';
import {
  TZ, monthRange, dayRange, lastMonthKeys, houstonDate, houstonMonthKey,
  houstonMidnightUtc, houstonOffsetMinutes, formatHoustonDateTime,
  SQL_TODAY_HOUSTON, SQL_MONTH_START_HOUSTON, sqlMonthKey,
} from '../lib/dates.mjs';
import {
  hashToken, isWellFormedToken, safeEqual, randomToken, requireAdmin, buildCookie,
} from '../lib/auth.mjs';
import { notificationLink } from '../lib/notifications.mjs';
import { orbitLink } from '../lib/email.mjs';
import { buildLeadFilter, LEAD_EXPORT_COLUMNS } from '../lib/leads.mjs';

let pass = 0;
const fails = [];
async function check(name, fn) {
  try { await fn(); pass++; } catch (e) { fails.push(name + ' → ' + e.message); }
}

// ── CSV ──────────────────────────────────────────────────────────
await check('csv: empieza con BOM UTF-8 y termina en CRLF', () => {
  const out = rowsToCsv([{ a: 'Diseño' }], ['a']);
  assert.equal(out.charCodeAt(0), 0xFEFF);
  assert.ok(out.startsWith(CSV_BOM + 'a\r\nDiseño'));
  assert.ok(out.endsWith('\r\n'));
});
await check('csv: bom:false lo omite (para concatenar)', () => {
  assert.ok(!rowsToCsv([{ a: 1 }], ['a'], { bom: false }).startsWith(CSV_BOM));
});
await check('csv: fórmulas = + - @ neutralizadas con comilla simple', () => {
  assert.equal(escapeCell('=HYPERLINK("http://x","clic")'), `"'=HYPERLINK(""http://x"",""clic"")"`);
  assert.equal(escapeCell('+1 713 555 0142'), "'+1 713 555 0142");
  assert.equal(escapeCell('-2+3'), "'-2+3");
  assert.equal(escapeCell('@SUM(A1)'), "'@SUM(A1)");
});
await check('csv: tabulador y CR al inicio también se neutralizan', () => {
  assert.equal(escapeCell('\t=1'), "'\t=1");
  assert.equal(escapeCell('\r=1'), `"'\r=1"`); // además se cita por llevar CR
});
await check('csv: números de verdad no se tocan (montos negativos)', () => {
  assert.equal(escapeCell(-1500), '-1500');
  assert.equal(escapeCell(0), '0');
});
await check('csv: texto normal intacto; fórmula en medio no se toca', () => {
  assert.equal(escapeCell('Taquería Los Compadres'), 'Taquería Los Compadres');
  assert.equal(escapeCell('a=b'), 'a=b');
});
await check('csv: comillas, comas y saltos de línea se citan (RFC 4180)', () => {
  assert.equal(escapeCell('Dijo "hola"'), '"Dijo ""hola"""');
  assert.equal(escapeCell('a, b'), '"a, b"');
  assert.equal(escapeCell('línea 1\nlínea 2'), '"línea 1\nlínea 2"');
  assert.equal(escapeCell('a\rb'), '"a\rb"');
});
await check('csv: null, arrays, fechas y objetos', () => {
  assert.equal(escapeCell(null), '');
  assert.equal(escapeCell(undefined), '');
  assert.equal(escapeCell(['web', 'seo']), 'web; seo');
  assert.equal(escapeCell(new Date('2026-10-19T12:00:00Z')), '2026-10-19T12:00:00.000Z');
  assert.equal(escapeCell({ a: 1 }), '"{""a"":1}"');
});
await check('csv: cabeceras legibles opcionales', () => {
  const out = rowsToCsv([{ ref_id: 'LEAD-001' }], ['ref_id'], { headers: { ref_id: 'Referencia' } });
  assert.ok(out.startsWith(CSV_BOM + 'Referencia\r\nLEAD-001'));
});
await check('csv: exporte de leads sin IP ni navegador', () => {
  assert.ok(!LEAD_EXPORT_COLUMNS.includes('ip_address'));
  assert.ok(!LEAD_EXPORT_COLUMNS.includes('user_agent'));
  for (const c of ['ref_id', 'name', 'email', 'phone', 'city', 'interest', 'message', 'source', 'status']) {
    assert.ok(LEAD_EXPORT_COLUMNS.includes(c), 'falta ' + c);
  }
});

// ── Fechas en Houston ────────────────────────────────────────────
await check('dates: zona America/Chicago', () => assert.equal(TZ, 'America/Chicago'));
await check('dates: desfase CDT −300 y CST −360', () => {
  assert.equal(houstonOffsetMinutes('2026-07-01T12:00:00Z'), -300);
  assert.equal(houstonOffsetMinutes('2026-12-01T12:00:00Z'), -360);
});
await check('dates: 8 pm del 31 de octubre en Houston sigue siendo octubre', () => {
  const now = new Date('2026-11-01T01:00:00Z'); // 31-oct 20:00 CDT
  assert.equal(houstonMonthKey(now), '2026-10');
  assert.equal(houstonDate(now), '2026-10-31');
  const m = monthRange(0, now);
  assert.equal(m.key, '2026-10');
  assert.equal(m.startISO, '2026-10-01T05:00:00.000Z');
  assert.equal(m.endISO, '2026-11-01T05:00:00.000Z');
  assert.equal(m.startDate, '2026-10-01');
  assert.equal(m.endDate, '2026-11-01');
});
await check('dates: último segundo de octubre y primer segundo de noviembre', () => {
  assert.equal(monthRange(0, '2026-11-01T04:59:59Z').key, '2026-10');
  assert.equal(monthRange(0, '2026-11-01T05:00:00Z').key, '2026-11');
});
await check('dates: noviembre 2026 (cambio de horario el día 1) dura hasta el 1-dic CST', () => {
  const m = monthRange(0, '2026-11-15T12:00:00Z');
  assert.equal(m.startISO, '2026-11-01T05:00:00.000Z'); // medianoche aún en CDT
  assert.equal(m.endISO, '2026-12-01T06:00:00.000Z');   // medianoche ya en CST
});
await check('dates: marzo 2027 (empieza el horario de verano el 14)', () => {
  const m = monthRange(0, '2027-03-20T12:00:00Z');
  assert.equal(m.startISO, '2027-03-01T06:00:00.000Z');
  assert.equal(m.endISO, '2027-04-01T05:00:00.000Z');
});
await check('dates: el día del cambio de noviembre dura 25 h y el de marzo 23 h', () => {
  const nov = dayRange(0, '2026-11-01T18:00:00Z');
  assert.equal(nov.key, '2026-11-01');
  assert.equal((Date.parse(nov.endISO) - Date.parse(nov.startISO)) / 3600000, 25);
  const mar = dayRange(0, '2027-03-14T18:00:00Z');
  assert.equal((Date.parse(mar.endISO) - Date.parse(mar.startISO)) / 3600000, 23);
});
await check('dates: hoy en Houston a las 10 pm (ya es mañana en UTC)', () => {
  const d = dayRange(0, '2026-10-20T03:00:00Z'); // 19-oct 22:00 CDT
  assert.equal(d.key, '2026-10-19');
  assert.equal(d.startISO, '2026-10-19T05:00:00.000Z');
  assert.equal(d.endISO, '2026-10-20T05:00:00.000Z');
  assert.equal(dayRange(-1, '2026-10-20T03:00:00Z').key, '2026-10-18');
});
await check('dates: mes anterior cruzando el año', () => {
  const now = '2027-01-01T05:59:59Z'; // 31-dic 23:59:59 CST
  assert.equal(monthRange(0, now).key, '2026-12');
  assert.equal(monthRange(-1, now).key, '2026-11');
  const ene = '2027-01-15T12:00:00Z';
  const p = monthRange(-1, ene);
  assert.equal(p.key, '2026-12');
  assert.equal(p.startISO, '2026-12-01T06:00:00.000Z');
  assert.equal(p.endISO, '2027-01-01T06:00:00.000Z');
  assert.equal(monthRange(-12, ene).key, '2026-01');
});
await check('dates: últimos 6 meses terminando en el actual (Houston)', () => {
  assert.deepEqual(lastMonthKeys(6, '2027-02-10T12:00:00Z'),
    ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']);
  // 31-oct 8 pm Houston: la serie aún termina en octubre aunque UTC ya sea noviembre
  assert.equal(lastMonthKeys(1, '2026-11-01T01:00:00Z')[0], '2026-10');
});
await check('dates: medianoche local a UTC', () => {
  assert.equal(houstonMidnightUtc(2026, 1, 1).toISOString(), '2026-01-01T06:00:00.000Z');
  assert.equal(houstonMidnightUtc(2026, 7, 4).toISOString(), '2026-07-04T05:00:00.000Z');
});
await check('dates: fecha legible en hora de Houston (correos)', () => {
  const s = formatHoustonDateTime('2026-10-20T00:30:00Z'); // 19-oct 7:30 pm CDT
  assert.match(s, /19 de octubre de 2026/);
  assert.match(s, /7:30/);
});
await check('dates: fragmentos SQL usan la zona de Houston', () => {
  assert.match(SQL_TODAY_HOUSTON, /AT TIME ZONE 'America\/Chicago'\)::date/);
  assert.match(SQL_MONTH_START_HOUSTON, /date_trunc\('month'/);
  assert.equal(sqlMonthKey('created_at'),
    "to_char(date_trunc('month', created_at AT TIME ZONE 'America/Chicago'), 'YYYY-MM')");
});

// ── Filtro de leads (lista y CSV) ────────────────────────────────
await check('leads: filtro vacío no añade WHERE', () => {
  const f = buildLeadFilter({});
  assert.equal(f.text, '');
  assert.deepEqual(f.params, []);
});
await check('leads: estado y origen por lista blanca, el resto se ignora', () => {
  const f = buildLeadFilter({ status: 'new', source: 'diagnostic' });
  assert.match(f.text, /status = \$1 AND source = \$2/);
  assert.deepEqual(f.params, ['new', 'diagnostic']);
  const g = buildLeadFilter({ status: "new'; DROP TABLE leads;--", source: 'x' });
  assert.equal(g.text, '');
});
await check('leads: búsqueda parametrizada (nunca en el texto SQL)', () => {
  const f = buildLeadFilter({ search: "o'brien" });
  assert.ok(!f.text.includes("o'brien"));
  assert.deepEqual(f.params, ["%o'brien%"]);
});
await check('leads: from/to son días de Houston inclusivos', () => {
  const f = buildLeadFilter({ from: '2026-10-01', to: '2026-10-31' });
  assert.match(f.text, /created_at >= \$1 AND created_at < \$2/);
  assert.deepEqual(f.params, ['2026-10-01T05:00:00.000Z', '2026-11-01T05:00:00.000Z']);
});
await check('leads: fechas inválidas se descartan', () => {
  assert.equal(buildLeadFilter({ from: 'ayer', to: 'nunca' }).text, '');
});

// ── Enlaces profundos ────────────────────────────────────────────
await check('avisos: enlace al lead, al brief y a la bandeja', () => {
  assert.equal(notificationLink('new_lead', 'LEAD-012'), '/dashboard#/leads/LEAD-012');
  assert.equal(notificationLink('new_brief', 'MRC-017'), '/dashboard#/briefs/MRC-017');
  assert.equal(notificationLink('chat_handoff', null), '/dashboard#/avisos');
  assert.equal(notificationLink('system', null), null);
  assert.equal(notificationLink('system', 'LEAD-3'), '/dashboard#/leads/LEAD-3');
});
await check('correos: enlazan a Orbit, nunca al panel viejo /admin', () => {
  assert.match(orbitLink('brief', 'MRC-017'), /\/dashboard#\/briefs\/MRC-017$/);
  assert.match(orbitLink('lead', 'LEAD-012'), /\/dashboard#\/leads\/LEAD-012$/);
  assert.match(orbitLink('avisos'), /\/dashboard#\/avisos$/);
  const src = fs.readFileSync(new URL('../lib/email.mjs', import.meta.url), 'utf8');
  assert.ok(!/\/admin\/briefs/.test(src), 'lib/email.mjs aún enlaza a /admin/briefs');
});

// ── Auth (sin BD) ────────────────────────────────────────────────
await check('auth: hash SHA-256 hex de 64, distinto del token', () => {
  const t = randomToken();
  assert.equal(t.length, 43);
  const h = hashToken(t);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.notEqual(h, t);
  assert.equal(hashToken(t), h);
});
await check('auth: formato de token', () => {
  assert.ok(isWellFormedToken(randomToken()));
  assert.ok(!isWellFormedToken(''));
  assert.ok(!isWellFormedToken('abc'));
  assert.ok(!isWellFormedToken("x' OR 1=1 --xxxxxxxxxxxxxxxx"));
  assert.ok(!isWellFormedToken(null));
});
await check('auth: comparación constante', () => {
  assert.ok(safeEqual('secreto-123', 'secreto-123'));
  assert.ok(!safeEqual('secreto-123', 'secreto-124'));
  assert.ok(!safeEqual('a', 'aa'));
  assert.ok(!safeEqual('', 'x'));
});
await check('auth: cookie HttpOnly + Secure + SameSite=Lax', () => {
  const c = buildCookie('x', new Date('2027-01-01T00:00:00Z'));
  for (const part of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) assert.ok(c.includes(part), 'falta ' + part);
});
await check('auth: requireAdmin sin cookie → 401 y no-store, sin tocar la BD', async () => {
  const headers = {};
  let status = 0, body = null;
  const res = {
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    status(s) { status = s; return this; },
    json(b) { body = b; return this; },
  };
  const s1 = await requireAdmin({ headers: {} }, res);
  assert.equal(s1, null);
  assert.equal(status, 401);
  assert.equal(body.ok, false);
  assert.equal(headers['cache-control'], 'no-store');
  // Cookie con basura: tampoco llega a la BD (formato inválido).
  const s2 = await requireAdmin({ headers: { cookie: 'mrc_admin=%27%20OR%201%3D1' } }, res);
  assert.equal(s2, null);
});

// ── Recorrido estático de api/admin/** ───────────────────────────
// Todo handler debe llamar a requireAdmin ANTES de cualquier otra espera
// (consulta, correo, fetch). Excepciones con motivo:
const EXEMPT = {
  'login.mjs':  'puerta de entrada: pide el enlace mágico',
  'verify.mjs': 'consume el enlace mágico y crea la sesión',
  'logout.mjs': 'solo revoca la sesión de la cookie presentada (sin cookie no hace nada)',
};
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'api', 'admin');
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(mjs|js|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}
const files = walk(ROOT);
await check('admin: hay endpoints que revisar', () => assert.ok(files.length >= 30, `solo ${files.length}`));
for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  await check(`admin: ${rel} exige sesión`, () => {
    const src = fs.readFileSync(file, 'utf8');
    if (EXEMPT[rel]) {
      assert.ok(!/requireAdmin\s*\(/.test(src) || rel === 'logout.mjs', 'exento inesperado');
      return;
    }
    const start = src.search(/export\s+default\s+async\s+function/);
    assert.ok(start >= 0, 'sin export default async function');
    const body = src.slice(start);
    const firstAwait = body.search(/\bawait\b/);
    assert.ok(firstAwait >= 0, 'el handler no espera nada (¿no valida sesión?)');
    assert.match(body.slice(firstAwait, firstAwait + 40), /^await\s+requireAdmin\s*\(\s*req\s*,\s*res\s*\)/,
      'la primera espera del handler no es requireAdmin(req, res)');
    const after = body.slice(firstAwait, firstAwait + 200);
    assert.match(after, /if\s*\(\s*!\s*session\s*\)\s*return/, 'falta "if (!session) return" tras requireAdmin');
  });
}

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) del backend de admin fallaron:\n - ` + fails.join('\n - '));
  process.exit(1);
}
console.log(`✓ ${pass} pruebas del backend de admin pasaron.`);
