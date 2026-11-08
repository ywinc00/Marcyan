// Pruebas de los avisos de Orbit (puras, sin red ni base).
import assert from 'node:assert/strict';
import { buildPayload, validSubscription, pushConfigured, pushToAdmins } from '../lib/push.mjs';

let n = 0; const fails = [];
async function check(name, fn) { try { await fn(); n++; } catch (e) { fails.push(name + ': ' + e.message); } }

await check('texto corto para la pantalla de bloqueo', () => {
  const p = JSON.parse(buildPayload({ title: 'x'.repeat(200), body: 'y  \n z'.repeat(100), url: '/dashboard#/leads/LEAD-1', tag: 'LEAD-1' }));
  assert.equal(p.title.length, 90); assert.ok(p.body.length <= 160); assert.doesNotMatch(p.body, /\n/);
  assert.equal(p.url, '/dashboard#/leads/LEAD-1');
});
await check('nunca abre una dirección de fuera', () => {
  assert.equal(JSON.parse(buildPayload({ title: 'a', url: 'https://malo.com' })).url, '/dashboard');
  assert.equal(JSON.parse(buildPayload({ title: 'a', url: '//malo.com' })).url, '/dashboard');
});
await check('suscripción válida e inválida', () => {
  assert.equal(validSubscription({ endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'a', auth: 'b' } }), true);
  assert.equal(validSubscription({ endpoint: 'http://x', keys: { p256dh: 'a', auth: 'b' } }), false);
  assert.equal(validSubscription({ endpoint: 'https://x' }), false);
  assert.equal(validSubscription(null), false);
});
await check('sin llave no intenta enviar ni lanza', async () => {
  delete process.env.VAPID_PRIVATE_KEY;
  assert.equal(pushConfigured(), false);
  const r = await pushToAdmins({ title: 'a' });
  assert.equal(r.sent, 0);
});

if (fails.length) { console.error(`✗ ${fails.length} fallos:\n - ` + fails.join('\n - ')); process.exit(1); }
console.log(`✓ avisos de Orbit: ${n} pruebas`);
