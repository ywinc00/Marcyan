// ════════════════════════════════════════════════════════════════
//  api/events.mjs — Tracking first-party (Growth OS)
//  Sin cookies, sin GA/GTM, sin PII. El cliente (src/lib/track.js)
//  postea {event, props, sid, page, lang}; el sid es un UUID aleatorio
//  por navegador (localStorage). El allowlist EVENTS acota qué se
//  registra. El tracking JAMÁS rompe la UX: cualquier fallo → 200.
//  Los eventos se leen luego en el dashboard (tabla `events`, mig 009).
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';
import { clientIp } from '../lib/auth.mjs';

const EVENTS = new Set([
  'diagnostic_started', 'diagnostic_step', 'diagnostic_completed_preview', 'diagnostic_claimed',
  'calculator_started', 'calculator_completed', 'tool_cta_clicked',
  'whatsapp_clicked', 'call_clicked', 'proposal_requested', 'growth_teaser_clicked',
]);
const hits = new Map();                                   // rate-limit en memoria: 60/min por IP

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
  try {
    const ip = clientIp(req);
    const now = Date.now();
    const h = (hits.get(ip) || []).filter(t => now - t < 60_000);
    if (h.length >= 60) return res.status(429).json({ ok: false });
    h.push(now); hits.set(ip, h);

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = (typeof body === 'object' && body) ? body : {};
    const event = String(body.event || '');
    if (!EVENTS.has(event)) return res.status(400).json({ ok: false });

    const props = body.props && typeof body.props === 'object'
      ? JSON.stringify(body.props).slice(0, 2000) : null;
    await sql`
      INSERT INTO events (session_id, event_name, page, language, properties, ip_address)
      VALUES (${String(body.sid || '').slice(0, 64)}, ${event}, ${String(body.page || '').slice(0, 200)},
              ${body.lang === 'en' ? 'en' : 'es'}, ${props}, ${ip})`;
    return res.status(200).json({ ok: true });
  } catch { return res.status(200).json({ ok: true }); }   // el tracking jamás rompe UX
}
