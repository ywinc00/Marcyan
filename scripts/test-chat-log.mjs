// Pruebas del registro de conversaciones de Marcy para Orbit (sin base: sql simulado).
import assert from 'node:assert/strict';
import { recordTurn, linkLead, deriveOutcome, failurePoint, LIVE_MS, IDLE_MS } from '../lib/chat-log.mjs';
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

if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log(`✓ ${n} pruebas del registro de conversaciones pasaron.`);
