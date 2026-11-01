// ════════════════════════════════════════════════════════════════
//  scripts/test-puerta-tecnica.mjs  ·  npm run test:puerta
//  Puerta técnica 2026-10-31, de punta a punta en los MANEJADORES, sin base
//  ni red ni correo reales: @vercel/postgres y lib/email.mjs se sustituyen
//  por dobles que registran cada consulta y cada correo.
//    · handoff: freno guardado, copia del lead ANTES del correo, error solo
//      si no quedó ninguna copia, aviso al panel si el correo falla.
//    · contacto: una confirmación por dirección al día, aviso si falla.
//    · el freno guardado de verdad (neonStore) cuenta en la tabla y, si la
//      tabla no existe, cae a memoria y avisa al panel UNA vez.
//  Necesita la bandera --experimental-test-module-mocks (va en el script npm).
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import { mock } from 'node:test';

// ── Base falsa ─────────────────────────────────────────────────
const db = { calls: [], counts: new Map(), failLeads: false, noRateTable: false, hangRate: false, leadSeq: 900 };
const sql = (strings, ...vals) => {
  const t = strings.reduce((acc, s, i) => acc + (i ? '$' + i : '') + s, '').replace(/\s+/g, ' ').trim();
  db.calls.push({ t, vals });
  if (/INSERT INTO rate_limit_hits/.test(t)) {
    if (db.hangRate) return new Promise(() => {}); // base colgada: nunca responde
    if (db.noRateTable) return Promise.reject(Object.assign(new Error('relation "rate_limit_hits" does not exist'), { code: '42P01' }));
    const k = vals.slice(0, 3).join('|');
    const n = (db.counts.get(k) || 0) + 1;
    db.counts.set(k, n);
    return Promise.resolve({ rows: [{ count: n }], rowCount: 1 });
  }
  if (/next_lead_id/.test(t)) {
    return db.failLeads ? Promise.reject(new Error('neon caído')) : Promise.resolve({ rows: [{ id: 'LEAD-' + (++db.leadSeq) }], rowCount: 1 });
  }
  if (/FROM leads/.test(t)) return db.failLeads ? Promise.reject(new Error('neon caído')) : Promise.resolve({ rows: [], rowCount: 0 });
  if (/INSERT INTO leads/.test(t)) return Promise.resolve({ rows: [], rowCount: 1 });
  if (/SELECT \* FROM diagnostics WHERE ref_id/.test(t)) {
    return Promise.resolve({ rows: [{ ref_id: vals[0], score_total: 60, score_web: 60, score_seo: 60, score_ai: 60, score_conv: 60, score_rep: 60, findings: [], industry: 'otro', business_name: 'Acme', city: 'Houston', lead_ref: null }], rowCount: 1 });
  }
  if (/UPDATE diagnostics SET lead_ref/.test(t)) return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
  if (/INSERT INTO chat_usage_daily/.test(t)) {
    if (db.noUsageTable) return Promise.reject(Object.assign(new Error('relation "chat_usage_daily" does not exist'), { code: '42P01' }));
    return Promise.resolve({ rows: [], rowCount: 1 });
  }
  if (/INSERT INTO notifications/.test(t)) {
    return Promise.resolve({ rows: [{ id: '1', type: vals[0], title: vals[1], body: vals[2], ref: vals[3], url: vals[4] }], rowCount: 1 });
  }
  return Promise.resolve({ rows: [], rowCount: 0 });
};
sql.query = (text, params = []) => sql([text], ...params);
mock.module('@vercel/postgres', { namedExports: { sql } });

// ── Correo falso ───────────────────────────────────────────────
const mail = { sent: [], failAdmin: false, failClient: false };
const ok = (kind) => async (args) => { mail.sent.push({ kind, args }); };
const maybe = (kind, flag) => async (args) => {
  if (mail[flag]) throw new Error('resend timeout');
  mail.sent.push({ kind, args });
};
mock.module(new URL('../lib/email.mjs', import.meta.url).href, {
  namedExports: {
    resend: {},
    emailAdminHandoff: maybe('admin-handoff', 'failAdmin'),
    emailAdminNewLead: maybe('admin-lead', 'failAdmin'),
    emailClientLeadConfirmation: maybe('client-confirm', 'failClient'),
    emailDiagnosticReport: ok('report'),
  },
});

// ── IA falsa: devuelve lo que la prueba ponga en `ai.queue`, con su usage ──
const ai = { queue: [], calls: [] };
class FakeAnthropic {
  constructor() { this.messages = { create: async (params) => { ai.calls.push(params); const r = ai.queue.shift(); if (r instanceof Error) throw r; return r; } }; }
}
mock.module('@anthropic-ai/sdk', { defaultExport: FakeAnthropic });
process.env.ANTHROPIC_API_KEY = 'prueba-sin-red';
const chat = (await import('../api/chat.mjs')).default;

const handoff = (await import('../api/handoff.mjs')).default;
const { __resetForTests } = await import('../lib/ratelimit.mjs');
const contact = (await import('../api/contact.mjs')).default;
const diagnostic = (await import('../api/diagnostic.mjs')).default;

// ── Utilidades ─────────────────────────────────────────────────
let pass = 0;
const fails = [];
function reset() {
  db.calls = []; db.counts = new Map(); db.failLeads = false; db.noRateTable = false; db.hangRate = false; db.noUsageTable = false;
  ai.queue = []; ai.calls = [];
  __resetForTests();
  mail.sent = []; mail.failAdmin = false; mail.failClient = false;
}
async function check(name, fn) {
  reset();
  try { await fn(); pass++; } catch (e) { fails.push(name + ' → ' + (e && e.message)); }
}
let ipSeq = 0;
async function call(handler, body, ip = '198.51.100.' + ((++ipSeq % 250) + 1)) {
  const res = {
    code: 200, body: null, headers: {},
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
  await handler({ method: 'POST', body, headers: { 'x-forwarded-for': ip, 'user-agent': 'prueba', origin: 'https://marcyanstudio.com' } }, res);
  return res;
}
const order = () => db.calls
  .map((c) => (/INSERT INTO leads/.test(c.t) ? 'lead' : /INSERT INTO notifications/.test(c.t) ? 'aviso' : null))
  .filter(Boolean);
const notices = () => db.calls
  .filter((c) => /INSERT INTO notifications/.test(c.t))
  .map((c) => ({ type: c.vals[0], ref: c.vals[3] }));

// ── Handoff ────────────────────────────────────────────────────
await check('handoff con email: se guarda como lead ANTES del aviso y del correo', async () => {
  const r = await call(handoff, { name: 'Ana', contact: 'ana@example.com', message: 'quiero hablar', lang: 'es' });
  assert.equal(r.code, 200);
  assert.match(r.body.refId, /^LEAD-\d+$/);
  assert.deepEqual(order().slice(0, 2), ['lead', 'aviso'], 'lead primero');
  assert.equal(mail.sent[0].kind, 'admin-handoff');
  assert.equal(mail.sent[0].args.ref, r.body.refId, 'el correo lleva la referencia del lead');
  const lead = db.calls.find((c) => /INSERT INTO leads/.test(c.t));
  assert.ok(lead.vals.includes('chat') && lead.vals.includes('ana@example.com'));
});
await check('handoff con teléfono: el contacto va como teléfono', async () => {
  await call(handoff, { contact: '+1 713 555 0101', lang: 'es' });
  const lead = db.calls.find((c) => /INSERT INTO leads/.test(c.t));
  assert.ok(lead.vals.includes('+1 713 555 0101'));
});
await check('handoff sin datos de contacto: no hay lead, sí aviso y correo', async () => {
  const r = await call(handoff, { message: 'hola', lang: 'es' });
  assert.equal(r.code, 200);
  assert.equal(r.body.refId, null);
  assert.deepEqual(order(), ['aviso']);
  assert.equal(mail.sent.length, 1);
});
await check('handoff: si el correo falla con el lead guardado → 200 y aviso de correo al panel', async () => {
  mail.failAdmin = true;
  const r = await call(handoff, { contact: 'ana@example.com', lang: 'es' });
  assert.equal(r.code, 200);
  assert.ok(notices().some((n) => n.type === 'system' && n.ref === 'email-admin:' + r.body.refId));
});
await check('handoff: si la base falla pero el correo sale → 200 (el correo es la copia)', async () => {
  db.failLeads = true;
  const r = await call(handoff, { contact: 'ana@example.com', lang: 'es' });
  assert.equal(r.code, 200);
  assert.equal(mail.sent.length, 1);
});
await check('handoff: sin NINGUNA copia (base y correo caídos) → 500 para que use WhatsApp', async () => {
  db.failLeads = true; mail.failAdmin = true;
  const r = await call(handoff, { contact: 'ana@example.com', lang: 'es' });
  assert.equal(r.code, 500);
  assert.match(r.body.error, /WhatsApp/);
});
await check('handoff: freno guardado, 3 cada 10 min por conexión, el 4.º → 429', async () => {
  const ip = '203.0.113.50';
  for (let i = 0; i < 3; i++) assert.equal((await call(handoff, { message: 'm' + i }, ip)).code, 200);
  const r = await call(handoff, { message: 'm4' }, ip);
  assert.equal(r.code, 429);
  assert.ok(Number(r.headers['Retry-After']) > 0);
  assert.ok(db.calls.some((c) => /INSERT INTO rate_limit_hits/.test(c.t) && c.vals[0] === 'handoff'), 'cuenta en la tabla, no en memoria');
});
await check('handoff: la trampa invisible no guarda nada', async () => {
  const r = await call(handoff, { contact: 'bot@example.com', website_hp: 'x' });
  assert.equal(r.code, 200);
  assert.equal(db.calls.length, 0);
});

// ── Contacto ───────────────────────────────────────────────────
await check('contacto: una confirmación por dirección al día (la 2.ª no sale, el lead sí entra)', async () => {
  const a = await call(contact, { email: 'Cliente@Example.com', name: 'Luis', message: 'uno' });
  const b = await call(contact, { email: 'cliente@example.com', name: 'Luis', message: 'dos' });
  assert.equal(a.body.emailClient, true);
  assert.equal(b.code, 200, 'el lead sigue entrando');
  assert.equal(b.body.emailClient, false, 'sin segunda confirmación el mismo día');
  assert.equal(mail.sent.filter((m) => m.kind === 'client-confirm').length, 1);
  assert.equal(mail.sent.filter((m) => m.kind === 'admin-lead').length, 2, 'el dueño recibe los dos');
});
await check('contacto: si falla la confirmación al cliente → aviso al panel', async () => {
  mail.failClient = true;
  const r = await call(contact, { email: 'otra@example.com' });
  assert.ok(notices().some((n) => n.ref === 'email-client:' + r.body.refId));
});
await check('contacto: si falla el correo al dueño → aviso al panel', async () => {
  mail.failAdmin = true;
  const r = await call(contact, { phone: '7135550199' });
  assert.ok(notices().some((n) => n.ref === 'email-admin:' + r.body.refId));
});

// ── Chat: coste y caché por turno (P2) ─────────────────────────
const usage = (o) => ({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, ...o });
const usageRow = () => db.calls.find((c) => /INSERT INTO chat_usage_daily/.test(c.t));
await check('chat: el turno suma su uso en la fila del día (entorno, modelo, conversación nueva, coste)', async () => {
  ai.queue.push({ content: [{ type: 'text', text: 'Hola, cuéntame de tu negocio.' }], usage: usage({ input_tokens: 120, output_tokens: 300, cache_read_input_tokens: 8000 }) });
  const r = await call(chat, { sessionId: 'conv-uso-1', messages: [{ role: 'user', content: 'hola' }], lang: 'es' });
  assert.equal(r.code, 200);
  assert.match(r.body.reply, /negocio/);
  const row = usageRow();
  assert.ok(row, 'guarda el uso');
  // VALUES (day, env, model, 1, conversations, calls, input, output, cacheRead, cacheWrite, cost)
  const [day, env, model, convs, calls, inp, out, cr, cw, cost] = row.vals;
  assert.match(day, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(env, 'development');
  assert.equal(model, 'claude-sonnet-5');
  assert.deepEqual([convs, calls, inp, out, cr, cw], [1, 1, 120, 300, 8000, 0]);
  // 120×2 + 300×10 + 8000×0,2 = 240 + 3000 + 1600 = 4840 micro-USD
  assert.equal(cost, 4840);
  assert.ok(!row.vals.some((v) => typeof v === 'string' && /hola|negocio|198\.51/.test(v)), 'ni contenido ni IP');
});
await check('chat: con herramienta interna suma las DOS llamadas; turno siguiente no cuenta como conversación nueva', async () => {
  ai.queue.push({ content: [{ type: 'tool_use', id: 't1', name: 'calcular_perdida', input: { modo: 'llamadas', llamadas_semana: 20, pct_sin_contestar: 30, ticket: 200, tasa_cierre: 30 } }],
    usage: usage({ input_tokens: 100, output_tokens: 200, cache_creation_input_tokens: 8000 }) });
  ai.queue.push({ content: [{ type: 'text', text: 'Con esos números pierdes clientes cada semana.' }], usage: usage({ input_tokens: 400, output_tokens: 250, cache_read_input_tokens: 8000 }) });
  const r = await call(chat, { sessionId: 'conv-uso-2', messages: [{ role: 'user', content: 'pierdo llamadas' }, { role: 'assistant', content: '¿cuántas?' }, { role: 'user', content: '20 a la semana, 30 % sin contestar, ticket 200' }], lang: 'es' });
  assert.equal(r.code, 200);
  assert.equal(ai.calls.length, 2);
  const [, , , convs, calls, inp, out, cr, cw] = usageRow().vals;
  assert.deepEqual([convs, calls, inp, out, cr, cw], [0, 2, 500, 450, 8000, 8000]);
});
await check('chat: sin la tabla de uso el visitante recibe su respuesta igual', async () => {
  db.noUsageTable = true;
  ai.queue.push({ content: [{ type: 'text', text: 'Claro, te ayudo.' }], usage: usage({ input_tokens: 10, output_tokens: 20 }) });
  const r = await call(chat, { sessionId: 'conv-uso-3', messages: [{ role: 'user', content: 'ayuda' }], lang: 'es' });
  assert.equal(r.code, 200);
  assert.match(r.body.reply, /ayudo/);
});
await check('chat: el idioma de la página va DETRÁS del bloque cacheado (la caché no cambia)', async () => {
  ai.queue.push({ content: [{ type: 'text', text: 'Hi.' }], usage: usage({}) });
  ai.queue.push({ content: [{ type: 'text', text: 'Hola.' }], usage: usage({}) });
  await call(chat, { sessionId: 'conv-idioma-en', messages: [{ role: 'user', content: 'hello' }], lang: 'en' });
  await call(chat, { sessionId: 'conv-idioma-es', messages: [{ role: 'user', content: 'hola' }], lang: 'es' });
  const [en, es] = ai.calls.map((c) => c.system);
  assert.equal(en.length, 2);
  assert.deepEqual(en[0], es[0], 'el bloque cacheado es idéntico en los dos idiomas');
  assert.ok(en[0].cache_control, 'la marca de caché sigue en el primer bloque');
  assert.ok(!en[1].cache_control, 'el idioma no lleva marca de caché');
  assert.match(en[1].text, /INGLÉS/);
  assert.match(es[1].text, /ESPAÑOL/);
});
await check('chat: fuera de producción los frenos cuentan en su propio cubo (las pruebas no gastan el tope real)', async () => {
  ai.queue.push({ content: [{ type: 'text', text: 'Hola.' }], usage: usage({}) });
  await call(chat, { sessionId: 'conv-uso-4', messages: [{ role: 'user', content: 'hola' }], lang: 'es' });
  const buckets = db.calls.filter((c) => /INSERT INTO rate_limit_hits/.test(c.t)).map((c) => c.vals[0]);
  assert.ok(buckets.length >= 3, 'cuenta por conexión, conversación y sitio');
  assert.ok(buckets.every((b) => b.endsWith('@development')), 'todos con su entorno: ' + buckets.join(','));
});

// ── Diagnóstico ────────────────────────────────────────────────
await check('diagnóstico: el informe sale 3 veces al día a una misma dirección; la 4.ª guarda el lead sin correo', async () => {
  const results = [];
  for (let i = 1; i <= 4; i++) {
    results.push(await call(diagnostic, { action: 'claim', ref: 'DGN-00' + i, email: 'victima@example.com', lang: 'es' }));
  }
  assert.deepEqual(results.map((r) => r.code), [200, 200, 200, 200]);
  assert.ok(results.every((r) => /^LEAD-\d+$/.test(r.body.leadRef)), 'los cuatro leads se guardan');
  assert.equal(mail.sent.filter((m) => m.kind === 'report').length, 3, 'solo 3 informes por correo');
  assert.equal(db.calls.filter((c) => /INSERT INTO leads/.test(c.t)).length, 4);
});

// ── Freno guardado real (neonStore) ────────────────────────────
await check('freno: sin la tabla cae a memoria, no rompe y avisa al panel una sola vez', async () => {
  db.noRateTable = true;
  const r1 = await call(contact, { email: 'x1@example.com' });
  const r2 = await call(contact, { email: 'x2@example.com' });
  assert.equal(r1.code, 200);
  assert.equal(r2.code, 200);
  const deg = notices().filter((n) => n.ref === 'ratelimit-memoria');
  assert.equal(deg.length, 1, 'un aviso, no uno por envío');
});

await check('freno: con la base colgada responde en segundos y luego deja de esperarla un minuto', async () => {
  db.hangRate = true;
  let t0 = Date.now();
  const r1 = await call(contact, { email: 'h1@example.com' });
  const first = Date.now() - t0;
  t0 = Date.now();
  const r2 = await call(contact, { email: 'h2@example.com' });
  const second = Date.now() - t0;
  assert.equal(r1.code, 200);
  assert.equal(r2.code, 200);
  assert.ok(first < 9000, 'primera petición acotada (' + first + ' ms)');
  assert.ok(second < 500, 'la segunda no espera a la base (' + second + ' ms)');
});

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) de la puerta técnica fallaron:\n - ` + fails.join('\n - '));
  process.exit(1);
}
console.log(`✓ ${pass} pruebas de la puerta técnica pasaron.`);
