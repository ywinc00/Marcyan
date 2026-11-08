// Pruebas del registro de conversaciones de Marcy para Orbit (sin base: sql simulado).
import assert from 'node:assert/strict';
import { recordTurn, linkLead, deleteConversation, deriveOutcome, failurePoint, summarize, funnel, LIVE_MS, IDLE_MS } from '../lib/chat-log.mjs';
import { applyFilter, funnelSteps, motivosOrdenados, recorrido, leadHref, usd } from '../src/components/dashboard/lib/marcy.js';
import { lastUserText } from '../api/chat.mjs';

let n = 0;
const fails = [];
async function check(name, fn) { try { await fn(); n++; } catch (e) { fails.push(name + ': ' + e.message); } }

// sql simulado: guarda cada consulta (texto + valores)
function fakeSql({ fail = false } = {}) {
  const calls = [];
  const sql = async (strings, ...values) => {
    if (fail) { const e = new Error('relation "chat_conversations" does not exist'); e.code = '42P01'; throw e; }
    calls.push({ text: strings.join('?'), values });
    return { rows: [], rowCount: 1 };
  };
  return { sql, calls };
}
const NOW = Date.UTC(2026, 10, 7, 20, 0, 0);
const ago = (ms) => new Date(NOW - ms).toISOString();

await check('turno: crea o suma la conversación y guarda el turno', async () => {
  const { sql, calls } = fakeSql();
  const ok = await recordTurn({ sid: 'abc-123', env: 'preview', userText: 'hola', reply: 'Hola, ¿en qué te ayudo?', action: { type: 'capture', destino: 'contacto' }, tool: 'cotizar', cortadas: ['1700'], fallback: true, costMicro: 4210.6, sqlImpl: sql });
  assert.equal(ok, true); assert.equal(calls.length, 2);
  assert.match(calls[0].text, /INSERT INTO chat_conversations/); assert.match(calls[0].text, /ON CONFLICT \(sid\)/);
  assert.ok(calls[1].values.includes('capture') && calls[1].values.includes('contacto') && calls[1].values.includes('cotizar') && calls[1].values.includes('1700'));
  assert.ok(calls[1].values.includes(4211));
});
await check('turno: sin id válido o sin respuesta no guarda', async () => {
  const { sql, calls } = fakeSql();
  assert.equal(await recordTurn({ sid: 'x y;--', reply: 'a', sqlImpl: sql }), false);
  assert.equal(await recordTurn({ sid: 'abc', reply: '', sqlImpl: sql }), false);
  assert.equal(calls.length, 0);
});
await check('turno: textos largos se recortan', async () => {
  const { sql, calls } = fakeSql();
  await recordTurn({ sid: 'abc', env: 'p', userText: 'x'.repeat(9000), reply: 'ok', sqlImpl: sql });
  assert.equal(calls[1].values[1].length, 4000);
});
await check('turno: sin tablas el chat sigue (no lanza)', async () => {
  const { sql } = fakeSql({ fail: true });
  assert.equal(await recordTurn({ sid: 'abc', env: 'p', userText: 'h', reply: 'r', sqlImpl: sql }), false);
});
await check('lead: tipos válidos y un paso a persona no pisa un lead', async () => {
  const { sql, calls } = fakeSql();
  assert.equal(await linkLead({ sid: 'abc', ref: 'LEAD-001', kind: 'lead', sqlImpl: sql }), true);
  assert.equal(await linkLead({ sid: 'abc', ref: null, kind: 'otro', sqlImpl: sql }), false);
  assert.equal(await linkLead({ sid: undefined, ref: 'LEAD-1', kind: 'lead', sqlImpl: sql }), false);
  assert.match(calls[0].text, /lead_kind IS NULL/);
});

await check('resultado: lead o brief = cerrada; handoff = transferida', () => {
  assert.equal(deriveOutcome({ lead_kind: 'lead', last_at: ago(0), turns: 1 }, NOW), 'cerrada');
  assert.equal(deriveOutcome({ lead_kind: 'brief', last_at: ago(0), turns: 1 }, NOW), 'cerrada');
  assert.equal(deriveOutcome({ lead_kind: 'handoff', last_at: ago(0), turns: 1 }, NOW), 'transferida');
});
await check('resultado: en vivo, abierta, abandonada y no cerrada por tiempo y turnos', () => {
  assert.equal(deriveOutcome({ last_at: ago(LIVE_MS - 1000), turns: 3 }, NOW), 'en_vivo');
  assert.equal(deriveOutcome({ last_at: ago(LIVE_MS + 1000), turns: 3 }, NOW), 'abierta');
  assert.equal(deriveOutcome({ last_at: ago(IDLE_MS + 1000), turns: 2 }, NOW), 'abandonada');
  assert.equal(deriveOutcome({ last_at: ago(IDLE_MS + 1000), turns: 3 }, NOW), 'no_cerrada');
});
await check('dónde falló: un fallo nuestro manda sobre el último paso', () => {
  const t = [{ reply: 'a' }, { reply: 'b', cortadas: '1700' }, { reply: 'c', action_type: 'capture' }];
  assert.deepEqual(failurePoint('no_cerrada', t), { turno: 2, motivo: 'cifra_cortada' });
  assert.deepEqual(failurePoint('no_cerrada', [{ reply: 'x', fallback: true }]), { turno: 1, motivo: 'error_de_marcy' });
});
await check('dónde falló: último paso antes de irse', () => {
  assert.equal(failurePoint('no_cerrada', [{ reply: 'a' }, { reply: 'b' }, { reply: 'c', action_type: 'capture' }]).motivo, 'no_dejo_contacto');
  assert.equal(failurePoint('no_cerrada', [{ reply: 'a' }, { reply: 'Sale en $1,950' }]).motivo, 'se_fue_tras_precio');
  assert.equal(failurePoint('no_cerrada', [{ reply: 'a' }, { reply: 'b', tool: 'revisar_sitio' }]).motivo, 'se_fue_tras_revisar_web');
  assert.equal(failurePoint('abandonada', [{ reply: 'Hola' }]).motivo, 'se_fue_tras_saludo');
});
await check('dónde falló: no aplica si cerró o sigue abierta', () => {
  assert.equal(failurePoint('cerrada', [{ reply: 'a' }]), null);
  assert.equal(failurePoint('en_vivo', [{ reply: 'a' }]), null);
});
await check('último mensaje del visitante', () => {
  assert.equal(lastUserText([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }, { role: 'user', content: 'c' }]), 'c');
  assert.equal(lastUserText(null), '');
});

// ── Resumen, embudo y textos de Orbit ──
const ROW = (o) => ({ sid: 's', channel: 'web', lang: 'es', started_at: ago(60), last_at: ago(IDLE_MS + 60000), turns: 4, cost_micro_usd: '5000', lead_ref: null, lead_kind: null, precio: true, revision: false, pidio_contacto: false, primer_fallo: null, primer_fallo_id: null, primer_id: 10, last_action: null, last_tool: null, last_reply: 'Sale en $1,500', first_user: 'hola', ...o });
await check('resumen: no cerrada tras el precio, con su mensaje', () => {
  const r = summarize(ROW(), NOW);
  assert.equal(r.outcome, 'no_cerrada'); assert.deepEqual(r.fallo, { turno: 4, motivo: 'se_fue_tras_precio' }); assert.equal(r.cost_micro_usd, 5000);
});
await check('resumen: el primer fallo nuestro manda y se cuenta desde el primer mensaje', () => {
  const r = summarize(ROW({ primer_fallo: 'cifra', primer_fallo_id: 12 }), NOW);
  assert.deepEqual(r.fallo, { turno: 3, motivo: 'cifra_cortada' });
});
await check('resumen: cerrada no tiene fallo', () => assert.equal(summarize(ROW({ lead_kind: 'lead', lead_ref: 'LEAD-1' }), NOW).fallo, null));
await check('embudo: cuenta pasos, cierres, pases y motivos', () => {
  const items = [summarize(ROW(), NOW), summarize(ROW({ lead_kind: 'lead', pidio_contacto: true }), NOW), summarize(ROW({ lead_kind: 'handoff', precio: false }), NOW)];
  const f = funnel(items);
  assert.deepEqual([f.conversaciones, f.precio, f.pidio_contacto, f.dejaron_contacto, f.pasadas], [3, 2, 1, 1, 1]);
  assert.deepEqual(f.motivos, { se_fue_tras_precio: 1 });
});
await check('orbit: pasos del embudo con lo que se pierde en cada salto', () => {
  const s = funnelSteps({ conversaciones: 48, precio: 30, pidio_contacto: 18, dejaron_contacto: 9 });
  assert.deepEqual(s.map((x) => x.drop), [0, 18, 12, 9]); assert.equal(s[3].pct, 19);
});
await check('orbit: motivos de más a menos', () => assert.deepEqual(motivosOrdenados({ motivos: { a: 1, b: 5 } }).map((m) => m.id), ['b', 'a']));
await check('orbit: filtros por pastilla, paso y motivo', () => {
  const rows = [{ outcome: 'en_vivo', pasos: { precio: true }, fallo: null }, { outcome: 'no_cerrada', pasos: { precio: false }, fallo: { motivo: 'x' } }];
  assert.equal(applyFilter(rows, { f: 'en_vivo' }).length, 1);
  assert.equal(applyFilter(rows, { f: 'fallo' }).length, 1);
  assert.equal(applyFilter(rows, { paso: 'precio' }).length, 1);
  assert.equal(applyFilter(rows, { motivo: 'x' })[0].outcome, 'no_cerrada');
});
await check('orbit: recorrido de venta desde los turnos', () => {
  const r = recorrido({ lead_kind: 'lead', turnos: [{ reply: 'Sale en $900', tool: 'cotizar' }, { reply: 'x', action_type: 'capture' }] });
  assert.deepEqual(r.map((p) => p.done), [true, true, false, true, true]);
});
await check('orbit: enlaces al lead o al brief y dinero', () => {
  assert.equal(leadHref('LEAD-12'), '#/leads/LEAD-12'); assert.equal(leadHref('MRC-3'), '#/briefs/MRC-3'); assert.equal(leadHref(null), '');
  assert.equal(usd(31000, 3), '$0.031');
});

// Borrar a mano desde Orbit: qué tablas toca según la casilla del lead.
function convSql(leadRef) {
  const calls = [];
  const sql = async (strings, ...values) => {
    const text = strings.join('?'); calls.push(text);
    if (/^SELECT sid, lead_ref/.test(text.trim())) return { rows: leadRef === undefined ? [] : [{ sid: 's', lead_ref: leadRef }], rowCount: 1 };
    if (/FROM site_speed/.test(text)) { const e = new Error('no table'); e.code = '42P01'; throw e; }
    return { rows: [], rowCount: 1 };
  };
  return { sql, calls };
}
await check('borrar: sin la casilla deja el lead y las citas', async () => {
  const { sql, calls } = convSql('LEAD-9');
  const out = await deleteConversation('wa-1', { sqlImpl: sql });
  assert.deepEqual(out, { sid: 'wa-1', lead: null, citas: 0 });
  assert.ok(!calls.some((t) => /FROM leads|FROM appointments/.test(t)));
  assert.ok(calls.some((t) => /DELETE FROM channel_inbox/.test(t)) && calls.some((t) => /DELETE FROM chat_conversations/.test(t)));
});
await check('borrar: con la casilla se van el lead y sus citas; un brief nunca', async () => {
  const a = convSql('LEAD-9');
  assert.deepEqual(await deleteConversation('wa-1', { withLead: true, sqlImpl: a.sql }), { sid: 'wa-1', lead: 'LEAD-9', citas: 1 });
  const b = convSql('MRC-4');
  const out = await deleteConversation('wa-1', { withLead: true, sqlImpl: b.sql });
  assert.equal(out.lead, null);
  assert.ok(!b.calls.some((t) => /FROM leads/.test(t)));
});
await check('borrar: conversación que no existe', async () => {
  assert.equal(await deleteConversation('nada', { sqlImpl: convSql(undefined).sql }), null);
});

if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log(`✓ ${n} pruebas del registro de conversaciones pasaron.`);
