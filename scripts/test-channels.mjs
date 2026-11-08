// Pruebas de Marcy en WhatsApp, Instagram y teléfono (sin red ni base real).
//   node scripts/test-channels.mjs
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  sidFor, e164, detectLang, historyFromTurns, buildMessages, renderAction, joinReply, pageUrl,
  slotsToolResult, channelContext, processInbound, textBooking, CH_MSG, houstonDate, dateContext,
} from '../lib/channels.mjs';
import { validMetaSignature, verifyChallenge, parseWhatsApp, parseInstagram, chunkText } from '../lib/meta.mjs';
import { twilioSignature, validTwilio, speakable, greetTwiml, replyTwiml, dialTwiml, recordTwiml, waitTwiml, inTransferHours, wantsEnglish, callCostMicro } from '../lib/voice.mjs';
import { speedContext } from '../lib/site-speed.mjs';
import { APP_TAKERS } from '../lib/takeover.mjs';

let n = 0;
const ok = (name, fn) => { fn(); n++; };
const aok = async (name, fn) => { await fn(); n++; };

// ── Puras ──
ok('sid', () => {
  assert.equal(sidFor('whatsapp', '17138239144'), 'wa-17138239144');
  assert.equal(sidFor('instagram', '1789'), 'ig-1789');
  assert.equal(sidFor('telefono', 'CA12ab'), 'tel-CA12ab');
  assert.equal(sidFor('whatsapp', ''), null);
  assert.match(sidFor('whatsapp', '1<script>'), /^[\w-]+$/);
  assert.equal(e164('17138239144'), '+17138239144');
});
ok('idioma', () => {
  assert.equal(detectLang('Hola, cuánto cuesta una página?'), 'es');
  assert.equal(detectLang('Hi, how much is a website?'), 'en');
  assert.equal(detectLang('ok', 'en'), 'en');
  assert.equal(detectLang('ok'), 'es');
});
ok('historial alterna y empieza en el cliente', () => {
  const now = Date.now();
  const rows = [
    { created_at: new Date(now - 9 * 86400000), user_text: 'viejo', reply: 'viejo' },
    { created_at: new Date(now - 60000), user_text: '', reply: 'Hola, soy Yan' },           // dueño
    { created_at: new Date(now - 50000), user_text: 'precio?', reply: 'Desde $X' },
    { created_at: new Date(now - 40000), user_text: 'y si', reply: '' },                    // espera
  ];
  const h = historyFromTurns(rows, { now });
  assert.equal(h[0].role, 'user');
  assert.ok(!h.some((m) => m.content.includes('viejo')));
  for (let i = 1; i < h.length; i++) assert.notEqual(h[i].role, h[i - 1].role);
  const m = buildMessages(h, 'hola de nuevo');
  assert.equal(m[m.length - 1].role, 'user');
  assert.ok(m[m.length - 1].content.endsWith('hola de nuevo'));
});
ok('acciones en texto', () => {
  assert.equal(renderAction({ type: 'link', page: 'precios' }, 'whatsapp', 'es'), 'https://marcyanstudio.com/es/precios');
  assert.equal(renderAction({ type: 'link', page: 'precios' }, 'whatsapp', 'en'), 'https://marcyanstudio.com/en/pricing');
  assert.equal(renderAction({ type: 'link', page: 'evil' }, 'whatsapp', 'es'), '');
  assert.equal(renderAction({ type: 'link', page: 'precios' }, 'telefono', 'es'), '');
  assert.match(renderAction({ type: 'channels' }, 'instagram', 'es'), /713-823-9144/);
  assert.equal(joinReply('', 'x'), 'x');
  assert.equal(joinReply('Mira', 'https://x'), 'Mira\n\nhttps://x');
  assert.equal(joinReply('Mira https://x', 'https://x'), 'Mira https://x');
  assert.equal(pageUrl('formulario', 'en'), 'https://marcyanstudio.com/en/project-brief');
});
ok('huecos para agendar por texto', () => {
  const now = Date.UTC(2026, 10, 9, 15, 0);   // lunes 9-nov, 9:00 Houston
  const r = JSON.parse(slotsToolResult({ now, lang: 'es' }).content);
  assert.equal(r.ok, true);
  assert.ok(r.horas.length >= 3 && r.horas.length <= 8);
  assert.ok(r.horas.every((h) => h.at && h.texto));
});
ok('contexto por canal', () => {
  assert.match(channelContext('whatsapp', 'es'), /ya tienes su número/);
  assert.match(channelContext('instagram', 'es'), /pídele en texto/);
  assert.match(channelContext('telefono', 'es'), /voz alta/);
  assert.ok(!channelContext('whatsapp', 'es', { contactName: 'A"\nB' }).includes('"\n'));
});

// ── Meta ──
ok('firma de Meta', () => {
  const raw = Buffer.from('{"a":1}');
  const sig = 'sha256=' + crypto.createHmac('sha256', 's3').update(raw).digest('hex');
  assert.equal(validMetaSignature(raw, sig, 's3'), true);
  assert.equal(validMetaSignature(raw, sig, 'otro'), false);
  assert.equal(validMetaSignature(raw, undefined, 's3'), false);
  assert.equal(validMetaSignature(raw, sig, ''), false);
  assert.equal(verifyChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': 't', 'hub.challenge': '42' }, 't'), '42');
  assert.equal(verifyChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': 'x', 'hub.challenge': '42' }, 't'), null);
  assert.equal(verifyChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': '', 'hub.challenge': '42' }, ''), null);
});
const WA = {
  entry: [{ changes: [
    { field: 'messages', value: { contacts: [{ wa_id: '17135550000', profile: { name: 'Ana' } }], messages: [
      { id: 'wamid.1', from: '17135550000', timestamp: '1762530000', type: 'text', text: { body: 'Hola' } },
      { id: 'wamid.2', from: '17135550000', timestamp: '1762530001', type: 'audio', audio: {} },
    ] } },
    { field: 'messages', value: { statuses: [{ id: 'wamid.x', status: 'read' }] } },
    { field: 'smb_message_echoes', value: { message_echoes: [{ id: 'wamid.e', to: '17135550000', type: 'text', text: { body: 'Soy Yan' } }] } },
  ] }],
};
ok('aviso de WhatsApp', () => {
  const { entrantes, ecos } = parseWhatsApp(WA);
  assert.equal(entrantes.length, 2);
  assert.deepEqual([entrantes[0].name, entrantes[0].text, entrantes[0].kind], ['Ana', 'Hola', 'text']);
  assert.equal(entrantes[1].kind, 'audio');
  assert.equal(ecos.length, 1);
  assert.equal(ecos[0].to, '17135550000');
  assert.deepEqual(parseWhatsApp({}), { entrantes: [], ecos: [] });
});
ok('aviso de Instagram', () => {
  const { entrantes, ecos } = parseInstagram({ entry: [{ id: '999', messaging: [
    { sender: { id: '123' }, recipient: { id: '999' }, timestamp: 1, message: { mid: 'm1', text: 'hi' } },
    { sender: { id: '999' }, recipient: { id: '123' }, timestamp: 2, message: { mid: 'm2', text: 'eco', is_echo: true } },
    { sender: { id: '123' }, read: { mid: 'm1' } },
  ] }] });
  assert.equal(entrantes.length, 1);
  assert.equal(entrantes[0].from, '123');
  assert.equal(ecos.length, 1);
  assert.equal(ecos[0].to, '123');
});
ok('trozos', () => {
  const t = 'a. '.repeat(800);
  const parts = chunkText(t, 950);
  assert.ok(parts.every((p) => p.length <= 950));
  assert.equal(parts.join(' ').replace(/\s+/g, ''), t.replace(/\s+/g, ''));
});
ok('eco de la app = el dueño toma', () => { assert.ok(APP_TAKERS.has('app-whatsapp') && APP_TAKERS.has('app-instagram')); });

// ── Voz ──
ok('firma de Twilio (ejemplo oficial)', () => {
  // Ejemplo de la documentación de Twilio.
  const url = 'https://example.com/myapp.php?foo=1&bar=2';
  const params = { CallSid: 'CA1234567890ABCDE', Caller: '+14158675310', Digits: '1234', From: '+14158675310', To: '+18005551212' };
  assert.equal(twilioSignature('12345', url, params), 'L/OH5YylLD5NRKLltdqwSvS0BnU=');
  assert.equal(validTwilio('12345', url, params, 'L/OH5YylLD5NRKLltdqwSvS0BnU='), true);
  assert.equal(validTwilio('12345', url, params, 'x'), false);
  assert.equal(validTwilio('', url, params, 'L/OH5YylLD5NRKLltdqwSvS0BnU='), false);
});
ok('TwiML', () => {
  assert.equal(speakable('Mira **esto** https://x.com 🚀 ya'), 'Mira esto ya');
  const g = greetTwiml('es');
  assert.match(g, /<Gather input="speech" language="es-US"/);
  assert.match(g, /Polly\.Lupe-Neural/);
  assert.match(replyTwiml('A < B & "c"', 'en'), /A &lt; B &amp; &quot;c&quot;/);
  assert.match(dialTwiml('+17135550000', 'Te paso', 'es'), /<Number>\+17135550000<\/Number>/);
  assert.match(recordTwiml('es'), /<Record maxLength="120"/);
  assert.match(waitTwiml('CA1:2', 'es', 3), /n=4/);
  assert.ok(!waitTwiml('CA1:2', 'es', 3).includes('Un momento'));
});
ok('horario para pasar llamadas (Houston)', () => {
  assert.equal(inTransferHours(Date.UTC(2026, 10, 9, 21, 0)), true);   // lunes 15:00
  assert.equal(inTransferHours(Date.UTC(2026, 10, 9, 16, 0)), false);  // lunes 10:00
  assert.equal(inTransferHours(Date.UTC(2026, 10, 8, 16, 0)), true);   // domingo 10:00
  assert.equal(inTransferHours(Date.UTC(2026, 10, 8, 23, 30)), false); // domingo 17:30
  assert.equal(wantsEnglish('English please'), true);
  assert.equal(callCostMicro(120), 200000);
});
ok('velocidad para Marcy', () => {
  const t = speedContext({ ok: true, puntuacion: { rendimiento: 41, seo: 92 }, laboratorio: { lcp_s: 6.2 }, usuarios_reales: { veredicto: 'SLOW' } }, 'https://x.com');
  assert.match(t, /41\/100/); assert.match(t, /6,2 s/); assert.match(t, /lenta/);
  assert.match(speedContext({ ok: false, motivo: 'web-no-abre' }, 'u'), /NO pudo abrir/);
  assert.equal(speedContext({ ok: false, motivo: 'cupo' }, 'u'), null);
});

// ── processInbound con dobles ──
function fakeSql(state) {
  return async (strings, ...vals) => {
    const q = strings.join('?');
    state.queries.push(q);
    if (/SELECT created_at, user_text, reply FROM chat_turns/.test(q)) return { rows: state.turns.slice() };
    if (/SELECT lang FROM chat_conversations/.test(q)) return { rows: state.lang ? [{ lang: state.lang }] : [] };
    if (/UPDATE channel_inbox/.test(q)) { state.inbox.push(vals[0]); return { rows: [] }; }
    return { rows: [] };
  };
}
function deps(state, over = {}) {
  return {
    sqlImpl: fakeSql(state),
    takeover: { isTakenOver: async () => !!state.taken, recordVisitorWaiting: async (a) => state.waiting.push(a.text), ownerTexts: async () => [], tagOwnerTurns: (m) => ({ messages: m, tagged: 0 }), OWNER_CONTEXT: '' },
    chatLog: { recordTurn: async (t) => { state.recorded.push(t); return true; }, linkLead: async () => true },
    notifications: { createNotification: async (x) => { state.notes.push(x); } },
    leads: { createLead: async (l) => { state.leads.push(l); return 'LEAD-1'; } },
    appointments: { takenSlots: async () => [], createAppointment: async (a) => { state.appts.push(a); return { ok: true, id: 1 }; } },
    send: async (t) => { state.sent.push(t); },
    marcyTurn: async (a) => { state.calls.push(a); return state.turn || { reply: 'Hola, ¿qué negocio tienes?', action: null, tool: null, cortadas: [], fallback: false, costMicro: 10 }; },
    limits: async () => state.limit !== false,
    ...over,
  };
}
const fresh = () => ({ queries: [], turns: [], inbox: [], waiting: [], recorded: [], notes: [], leads: [], appts: [], sent: [], calls: [], lang: null });
const ROW = { channel: 'whatsapp', sid: 'wa-17135550000', contact: '+17135550000', contactName: 'Ana', text: 'Hola, quiero una web', kind: 'text', inboxId: 7, attempts: 0 };

await aok('contesta y registra con su canal', async () => {
  const s = fresh();
  assert.equal(await processInbound(ROW, deps(s)), 'hecho');
  assert.deepEqual(s.sent, ['Hola, ¿qué negocio tienes?']);
  assert.equal(s.recorded[0].channel, 'whatsapp');
  assert.match(s.calls[0].extraContext, /WHATSAPP/);
  assert.equal(s.calls[0].messages.at(-1).content, 'Hola, quiero una web');
  assert.ok(s.calls[0].extraInternal.names.has('huecos_libres'));
  assert.deepEqual(s.inbox, ['hecho']);
});
await aok('si lo lleva el dueño, Marcy calla y avisa', async () => {
  const s = fresh(); s.taken = true;
  assert.equal(await processInbound(ROW, deps(s)), 'hecho');
  assert.equal(s.sent.length, 0); assert.equal(s.calls.length, 0);
  assert.deepEqual(s.waiting, ['Hola, quiero una web']);
  assert.equal(s.notes.length, 1);
});
await aok('audio: pide texto', async () => {
  const s = fresh();
  await processInbound({ ...ROW, kind: 'audio', text: '' }, deps(s));
  assert.deepEqual(s.sent, [CH_MSG.es.noText]);
  assert.equal(s.calls.length, 0);
});
await aok('tope: mensaje fijo, sin IA', async () => {
  const s = fresh(); s.limit = false;
  assert.equal(await processInbound(ROW, deps(s)), 'omitido');
  assert.deepEqual(s.sent, [CH_MSG.es.limit]); assert.equal(s.calls.length, 0);
});
await aok('captura: lead con el número de WhatsApp, sin pedir formulario', async () => {
  const s = fresh();
  s.turn = { reply: '', action: { type: 'capture', destino: 'proyecto', nombre: 'Ana', negocio: 'Salón Ana' }, tool: null, cortadas: [], fallback: false, costMicro: 0 };
  await processInbound(ROW, deps(s));
  assert.equal(s.leads[0].phone, '+17135550000');
  assert.equal(s.leads[0].business_name, 'Salón Ana');
  assert.deepEqual(s.sent, [CH_MSG.es.saved]);
  assert.equal(s.notes[0].type, 'new_lead');
});
await aok('Instagram: el lead no inventa teléfono', async () => {
  const s = fresh();
  s.turn = { reply: 'Listo', action: { type: 'capture', destino: 'contacto' }, tool: null, cortadas: [], fallback: false, costMicro: 0 };
  await processInbound({ ...ROW, channel: 'instagram', sid: 'ig-123', contact: '123' }, deps(s));
  assert.equal(s.leads[0].phone, null);
  assert.match(s.leads[0].message, /Instagram: id 123/);
});
await aok('fallo de la IA: reintenta y al tercero avisa', async () => {
  const s = fresh();
  const d = deps(s, { marcyTurn: async () => { throw new Error('caída'); } });
  assert.equal(await processInbound(ROW, d), 'pendiente');
  assert.equal(s.sent.length, 0);
  assert.equal(await processInbound({ ...ROW, attempts: 2 }, d), 'error');
  assert.deepEqual(s.sent, [CH_MSG.es.fallback]);
  assert.ok(s.notes.some((x) => /no pudo contestar/.test(x.title)));
});
await aok('enlace como texto', async () => {
  const s = fresh();
  s.turn = { reply: 'Aquí tienes los precios', action: { type: 'link', page: 'precios' }, tool: null, cortadas: [], fallback: false, costMicro: 0 };
  await processInbound(ROW, deps(s));
  assert.equal(s.sent[0], 'Aquí tienes los precios\n\nhttps://marcyanstudio.com/es/precios');
});
await aok('texto de tarjeta no sale por el canal', async () => {
  const s = fresh();
  s.turn = { reply: 'Perfecto. Confírmame tu contacto aquí abajo y te armamos la propuesta a la medida. 🚀', toolOnly: true, action: { type: 'capture', destino: 'proyecto' }, tool: null, cortadas: [], fallback: false, costMicro: 0 };
  await processInbound(ROW, deps(s));
  assert.deepEqual(s.sent, [CH_MSG.es.saved]);
  const s2 = fresh();
  s2.turn = { reply: 'Aquí tienes las formas de escribirnos directo. 👇', toolOnly: true, action: { type: 'channels' }, tool: null, cortadas: [], fallback: false, costMicro: 0 };
  await processInbound(ROW, deps(s2));
  assert.ok(!s2.sent[0].includes('👇')); assert.match(s2.sent[0], /713-823-9144/);
});
await aok('reservar llamada: lead antes que la cita y contacto del servidor', async () => {
  const s = fresh();
  const b = textBooking({ channel: 'whatsapp', contact: '+17135550000', contactName: 'Ana', sid: 'wa-1', lang: 'es' }, deps(s));
  const now = Date.now();
  const list = JSON.parse((await b.run({ name: 'huecos_libres', input: {} })).content);
  assert.ok(list.ok);
  const r = JSON.parse((await b.run({ name: 'reservar_llamada', input: { at: list.horas[0].at, nombre: 'Ana', tema: 'web' } })).content);
  assert.equal(r.ok, true);
  assert.equal(s.leads.length, 1);
  assert.equal(s.appts[0].phone, '+17135550000');
  assert.equal(s.appts[0].starts_at, list.horas[0].at);
  const bad = JSON.parse((await b.run({ name: 'reservar_llamada', input: { at: '2020-01-01T00:00:00Z' } })).content);
  assert.equal(bad.ok, false);
  assert.ok(Date.now() - now < 5000);
});


// ── Manejadores: firma obligatoria ──
const { metaWebhook } = await import('../lib/channel-runtime.mjs');
const voz = (await import('../api/voz.mjs')).default;
function fakeRes() {
  const r = { code: 0, body: null, headers: {} };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.send = (b) => { r.body = b; return r; };
  r.end = () => r;
  r.setHeader = (k, v) => { r.headers[k] = v; };
  return r;
}
function fakeReq({ method = 'POST', body = '', headers = {}, query = {}, url = '/x' } = {}) {
  const buf = Buffer.from(body);
  return { method, headers, query, url, readable: true, readableEnded: false, async *[Symbol.asyncIterator]() { yield buf; } };
}
await aok('Meta: verificación y firma', async () => {
  const wa = metaWebhook('whatsapp');
  process.env.META_VERIFY_TOKEN = 'frase';
  let r = fakeRes(); await wa(fakeReq({ method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'frase', 'hub.challenge': 'abc' } }), r);
  assert.deepEqual([r.code, r.body], [200, 'abc']);
  r = fakeRes(); await wa(fakeReq({ method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'mala', 'hub.challenge': 'abc' } }), r);
  assert.equal(r.code, 403);
  delete process.env.META_APP_SECRET;
  r = fakeRes(); await wa(fakeReq({ body: '{}' }), r);
  assert.equal(r.code, 503);                                   // sin configurar: nunca procesa
  Object.assign(process.env, { META_APP_SECRET: 'sec', WHATSAPP_TOKEN: 't', WHATSAPP_PHONE_ID: '1' });
  r = fakeRes(); await wa(fakeReq({ body: '{"entry":[]}', headers: { 'x-hub-signature-256': 'sha256=00' } }), r);
  assert.equal(r.code, 401);
  const body = '{"entry":[]}';
  const sig = 'sha256=' + crypto.createHmac('sha256', 'sec').update(body).digest('hex');
  r = fakeRes(); await wa(fakeReq({ body, headers: { 'x-hub-signature-256': sig } }), r);
  assert.equal(r.code, 200);
  delete process.env.META_APP_SECRET; delete process.env.WHATSAPP_TOKEN; delete process.env.WHATSAPP_PHONE_ID; delete process.env.META_VERIFY_TOKEN;
});
await aok('Twilio: sin firma válida no hay llamada', async () => {
  delete process.env.TWILIO_AUTH_TOKEN;
  let r = fakeRes(); await voz({ method: 'POST', headers: { host: 'marcyanstudio.com' }, url: '/api/voz?paso=entrada', query: { paso: 'entrada' }, body: {} }, r);
  assert.equal(r.code, 503);
  process.env.TWILIO_AUTH_TOKEN = 'tok';
  r = fakeRes(); await voz({ method: 'POST', headers: { host: 'marcyanstudio.com', 'x-twilio-signature': 'x' }, url: '/api/voz?paso=entrada', query: { paso: 'entrada' }, body: { From: '+1' } }, r);
  assert.equal(r.code, 403);
  const params = { CallSid: 'CA1', From: '+17135550000', CallStatus: 'ringing' };
  const url = '/api/voz?paso=dial&lang=es';
  const sig = twilioSignature('tok', 'https://marcyanstudio.com' + url, { ...params, DialCallStatus: 'no-answer' });
  r = fakeRes(); await voz({ method: 'POST', headers: { host: 'marcyanstudio.com', 'x-twilio-signature': sig }, url, query: { paso: 'dial', lang: 'es' }, body: { ...params, DialCallStatus: 'no-answer' } }, r);
  assert.equal(r.code, 200);
  assert.match(r.body, /<Record/);                              // no contestó el equipo → recado
  delete process.env.TWILIO_AUTH_TOKEN;
});

// ── Agendar con el día que dijo el cliente ──
ok('huecos: fecha de hoy y todas las horas del día pedido', () => {
  const now = Date.UTC(2026, 10, 8, 21, 0, 0); // dom 8-nov, 3 p.m. Houston
  assert.equal(houstonDate(now), '2026-11-08');
  const r = JSON.parse(slotsToolResult({ now, fecha: '2026-11-09' }).content);
  assert.equal(r.hoy, '2026-11-08');
  assert.ok(r.horas.length > 3, 'todas las del lunes, no solo 3');
  assert.ok(r.horas.every((h) => houstonDate(h.at) === '2026-11-09'));
  assert.ok(r.horas.some((h) => /3:00 p\.m\./.test(h.texto)));
  const sin = JSON.parse(slotsToolResult({ now, fecha: 'mañana' }).content);
  assert.ok(sin.horas.length > 0 && sin.horas.length <= 8);
  assert.match(dateContext('es', now), /2026-11-08/);
  assert.match(channelContext('whatsapp', 'es'), /Fecha de hoy en Houston/);
});

console.log(`✓ ${n} pruebas de canales (WhatsApp, Instagram, teléfono) pasaron.`);
