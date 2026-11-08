// /api/citas — huecos libres y reserva de una llamada con el dueño (Marcy agenda).
//   GET  ?lang=es|en  → { ok, dias: [{ dia, huecos: [{ at, hora }] }] }  (hora de Houston)
//   POST { at, name, email, phone, topic, lang, chat_sid, website_hp }
//        → { ok, cuando } | 409 { ok:false, code:'slot_taken', dias } (con los huecos al día)
// Puerta técnica: trampa invisible, tope por conexión, el lead se guarda ANTES
// que la cita (si la cita falla, el contacto no se pierde) y el aviso al dueño
// va después. Los datos de contacto vienen del formulario, nunca del modelo.
import { createLead } from '../lib/leads.mjs';
import { linkLead } from '../lib/chat-log.mjs';
import { createNotification } from '../lib/notifications.mjs';
import { emailAdminNewLead } from '../lib/email.mjs';
import { clientIp } from '../lib/auth.mjs';
import { rateLimit, LIMITS } from '../lib/ratelimit.mjs';
import { freeSlots, groupByDay, isBookable, slotLabel, takenSlots, createAppointment } from '../lib/appointments.mjs';

const clean = (v, max) => { const s = v == null ? '' : String(v).trim(); return s ? s.slice(0, max) : null; };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (p) => (String(p).match(/\d/g) || []).length;
const MSG = {
  es: { rate: 'Recibimos varios intentos seguidos. Espera unos minutos.', contact: 'Déjanos un email o un teléfono para confirmarte la cita.', email: 'El email no parece válido.', phone: 'El teléfono no parece válido.', slot: 'Esa hora ya no está libre. Elige otra.', bad: 'Elige una hora de la lista.', error: 'No pudimos guardar la cita. Inténtalo de nuevo.' },
  en: { rate: 'We got several tries in a row. Please wait a few minutes.', contact: 'Leave an email or a phone so we can confirm.', email: 'That email does not look right.', phone: 'That phone does not look right.', slot: 'That time was just taken. Please pick another.', bad: 'Please pick a time from the list.', error: 'We could not save the appointment. Please try again.' },
};

async function slotsFor(lang) {
  let taken = [];
  try { taken = await takenSlots(); } catch (err) { console.warn('[citas] sin tabla de citas:', err && (err.code || err.message)); }
  return groupByDay(freeSlots({ taken }), lang);
}

export default async function handler(req, res) {
  const body = req.method === 'POST' && typeof req.body === 'object' && req.body ? req.body : {};
  const lang = (body.lang || (req.query && req.query.lang)) === 'en' ? 'en' : 'es';
  const M = MSG[lang];
  const ip = clientIp(req);

  if (req.method === 'GET') {
    const rl = await rateLimit({ bucket: 'citasGet', key: ip, limits: LIMITS.citasGet });
    if (!rl.ok) return res.status(429).json({ ok: false, error: M.rate });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, dias: await slotsFor(lang) });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    if (body.website_hp) return res.status(200).json({ ok: true, cuando: '' });
    const rl = await rateLimit({ bucket: 'citasPost', key: ip, limits: LIMITS.citasPost });
    if (!rl.ok) { res.setHeader('Retry-After', String(rl.retryAfter)); return res.status(429).json({ ok: false, error: M.rate }); }

    const email = clean(body.email, 200);
    const phone = clean(body.phone, 50);
    if (!email && !phone) return res.status(400).json({ ok: false, error: M.contact });
    if (email && !EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: M.email });
    if (phone && digits(phone) < 7) return res.status(400).json({ ok: false, error: M.phone });
    const at = clean(body.at, 40);
    let taken = [];
    try { taken = await takenSlots(); } catch { taken = []; }
    if (!at || !isBookable(at, { taken })) return res.status(409).json({ ok: false, code: 'slot_taken', error: M.slot, dias: groupByDay(freeSlots({ taken }), lang) });

    const when = slotLabel(at, 'es').largo;
    const name = clean(body.name, 200);
    const topic = clean(body.topic, 1000);

    // 1) Lead primero: el contacto queda guardado pase lo que pase con la cita.
    const refId = await createLead({
      name, email, phone,
      interest: `Cita agendada por Marcy: ${when} (hora de Houston)`,
      message: topic || null,
      source: 'chat', ipAddress: ip, userAgent: clean(req.headers['user-agent'], 500),
    });

    // 2) La cita. Si otro la tomó en el mismo instante, el lead ya está y se avisa.
    const iso = new Date(at).toISOString();
    const r = await createAppointment({ starts_at: iso, name, email, phone, topic, lang, lead_ref: refId, chat_sid: clean(body.chat_sid, 64) });
    if (!r.ok) {
      await createNotification({ type: 'new_lead', title: `Quería cita y la hora se ocupó: ${name || refId}`, body: `Pidió ${when}. Llámalo para cuadrar otra.`, ref: refId });
      return res.status(409).json({ ok: false, code: 'slot_taken', error: M.slot, dias: await slotsFor(lang) });
    }

    // 3) Orbit y aviso al dueño (la cita ya está guardada).
    await linkLead({ sid: body.chat_sid, ref: refId, kind: 'lead' });
    await createNotification({ type: 'new_lead', title: `Cita agendada: ${name || refId} · ${when}`, body: topic || 'Sin detalle.', ref: refId });
    try {
      await Promise.race([
        emailAdminNewLead({ refId, data: { name, email, phone, interest: `Cita: ${when} (hora de Houston)`, message: topic, source: 'chat' } }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
      ]);
    } catch (err) { console.error('[citas] correo al dueño falló:', err && err.message); }

    console.log(`[citas] ${refId} cita ${iso}`);
    return res.status(200).json({ ok: true, cuando: slotLabel(at, lang).largo });
  } catch (err) {
    console.error('[citas] error:', err && err.message);
    return res.status(500).json({ ok: false, error: M.error });
  }
}
