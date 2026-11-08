// ════════════════════════════════════════════════════════════════
//  lib/voice.mjs — Marcy contesta el teléfono (Twilio), fase 6
//  ────────────────────────────────────────────────────────────────
//  Vercel no mantiene una llamada abierta: Twilio la sostiene y nos pregunta
//  en cada turno (habla → texto con <Gather input="speech">, texto → voz con
//  <Say>). Cada turno es un turno normal de Marcy (mismo cerebro y reglas).
//  Si la respuesta tarda, Twilio dice "un momento" y vuelve a preguntar
//  (<Redirect>) hasta que esté lista, así no se corta por los 15 s de Twilio.
//
//  Decisiones del dueño (2026-11-07): solo el número de Houston; si el cliente
//  quiere una persona se pasa a VOICE_TRANSFER_TO de lunes a sábado 14:00-20:30
//  y domingo 09:00-17:00 (hora de Houston); fuera de horario, Marcy toma el
//  recado. Tope 50 USD/mes (VOICE_MONTHLY_CAP_USD): pasado, recado grabado.
//
//  Variables (Vercel, las pega el dueño): TWILIO_AUTH_TOKEN (firma),
//  VOICE_TRANSFER_TO (celular al que se pasa), VOICE_MONTHLY_CAP_USD (50),
//  VOICE_USD_PER_MIN (coste estimado de Twilio por minuto, 0.10).
//  Lo puro se prueba en scripts/test-channels.mjs.
// ════════════════════════════════════════════════════════════════
import crypto from 'node:crypto';
import { HOURS, TZ } from './appointments.mjs';

export const VOICES = { es: { voice: 'Polly.Lupe-Neural', lang: 'es-US' }, en: { voice: 'Polly.Joanna-Neural', lang: 'en-US' } };
export const BASE = '/api/voz';

export const voiceCapUsd = () => { const n = Number(process.env.VOICE_MONTHLY_CAP_USD); return Number.isFinite(n) && n > 0 ? n : 50; };
export const usdPerMin = () => { const n = Number(process.env.VOICE_USD_PER_MIN); return Number.isFinite(n) && n >= 0 ? n : 0.10; };

/** Firma de Twilio: base64(HMAC-SHA1(token, url + claves ordenadas con su valor)). */
export function twilioSignature(token, url, params = {}) {
  const data = Object.keys(params).sort().reduce((acc, k) => acc + k + (params[k] == null ? '' : String(params[k])), url);
  return crypto.createHmac('sha1', token).update(Buffer.from(data, 'utf8')).digest('base64');
}
export function validTwilio(token, url, params, header) {
  if (!token || typeof header !== 'string' || !header) return false;
  const exp = Buffer.from(twilioSignature(token, url, params));
  const got = Buffer.from(header);
  return exp.length === got.length && crypto.timingSafeEqual(exp, got);
}

/** URL pública que llamó Twilio (la de la firma). */
export function publicUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `https://${host}${req.url}`;
}

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Lo que se lee en voz alta: sin enlaces, sin markdown, sin emojis.
export function speakable(text) {
  return String(text || '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_#`>|~]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 900);
}

const say = (text, lang) => `<Say voice="${VOICES[lang].voice}" language="${VOICES[lang].lang}">${esc(speakable(text))}</Say>`;
const gather = (lang, sayText, q = '') =>
  `<Gather input="speech" language="${VOICES[lang].lang}" speechTimeout="auto"${lang === 'en' ? ' speechModel="phone_call" enhanced="true"' : ''} action="${BASE}?paso=turno&amp;lang=${lang}${q}" method="POST" actionOnEmptyResult="true">${sayText ? say(sayText, lang) : ''}</Gather>`;
export const twiml = (inner) => `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;

export const V_MSG = {
  es: {
    hola: 'Hola, gracias por llamar a Marcyan. Soy Marcy, la asistente. ¿En qué te puedo ayudar? If you prefer English, just say English.',
    repite: 'Perdona, no te escuché bien. ¿Me lo repites?',
    sigues: '¿Sigues ahí? Si quieres, dime en qué te ayudo.',
    adios: 'Gracias por llamar a Marcyan. Que tengas un buen día.',
    momento: 'Un momento, por favor.',
    paso: 'Te paso con el equipo, un momento.',
    noContesta: 'No pude localizar al equipo ahora. Deja tu nombre y el motivo de tu llamada después del tono, y te llaman en cuanto puedan.',
    recado: 'Ahora mismo no podemos atenderte. Deja tu nombre y el motivo de tu llamada después del tono, y te llamamos en cuanto podamos.',
    gracias: 'Recibido, gracias. Te llamamos pronto.',
    fallo: 'Perdona, tuve un problema. Deja tu nombre y el motivo después del tono y te llamamos.',
  },
  en: {
    hola: 'Hi, thanks for calling Marcyan. I am Marcy, the assistant. How can I help you?',
    repite: 'Sorry, I did not catch that. Could you say it again?',
    sigues: 'Are you still there? Tell me how I can help.',
    adios: 'Thanks for calling Marcyan. Have a great day.',
    momento: 'One moment, please.',
    paso: 'Let me connect you with the team, one moment.',
    noContesta: 'I could not reach the team right now. Please leave your name and the reason for your call after the tone, and they will call you back.',
    recado: 'We cannot take your call right now. Please leave your name and the reason for your call after the tone, and we will call you back.',
    gracias: 'Got it, thank you. We will call you soon.',
    fallo: 'Sorry, I had a problem. Please leave your name and reason after the tone and we will call you back.',
  },
};

// Respuestas TwiML (puras).
export const greetTwiml = (lang = 'es') => twiml(gather(lang, V_MSG[lang].hola) + say(V_MSG[lang].sigues, lang) + gather(lang, '') + say(V_MSG[lang].adios, lang) + '<Hangup/>');
export const replyTwiml = (text, lang = 'es') => twiml(gather(lang, text) + gather(lang, V_MSG[lang].sigues) + say(V_MSG[lang].adios, lang) + '<Hangup/>');
export const repeatTwiml = (lang = 'es') => twiml(gather(lang, V_MSG[lang].repite) + say(V_MSG[lang].adios, lang) + '<Hangup/>');
export const waitTwiml = (key, lang = 'es', n = 0) => twiml((n === 0 ? say(V_MSG[lang].momento, lang) : '') + `<Pause length="1"/><Redirect method="POST">${BASE}?paso=espera&amp;lang=${lang}&amp;k=${encodeURIComponent(key)}&amp;n=${n + 1}</Redirect>`);
export const recordTwiml = (lang = 'es', which = 'recado') => twiml(say(V_MSG[lang][which], lang) + `<Record maxLength="120" playBeep="true" timeout="5" action="${BASE}?paso=recado&amp;lang=${lang}" method="POST"/>` + say(V_MSG[lang].adios, lang));
export const dialTwiml = (to, text, lang = 'es') => twiml(say(text || V_MSG[lang].paso, lang) + `<Dial timeout="20" answerOnBridge="true" action="${BASE}?paso=dial&amp;lang=${lang}" method="POST"><Number>${esc(to)}</Number></Dial>`);
export const byeTwiml = (lang = 'es', text = null) => twiml(say(text || V_MSG[lang].gracias, lang) + '<Hangup/>');

/** ¿Está el equipo en horario para pasarle la llamada? (hora de Houston) */
export function inTransferHours(now = Date.now()) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const o = {};
  for (const p of f.formatToParts(new Date(now))) o[p.type] = p.value;
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday);
  const min = Number(o.hour) * 60 + Number(o.minute);
  const h = HOURS[wd];
  return !!h && min >= h[0] && min < h[1];
}

/** ¿Pide inglés? (la primera escucha va en español) */
export const wantsEnglish = (text) => /\b(english|ingl[eé]s)\b/i.test(String(text || ''));

/** Coste estimado de los minutos de Twilio, en micro dólares (puro). */
export const callCostMicro = (seconds) => Math.round((Math.max(0, Number(seconds) || 0) / 60) * usdPerMin() * 1e6);
