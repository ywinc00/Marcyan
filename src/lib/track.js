// ════════════════════════════════════════════════════════════════
//  src/lib/track.js — Tracking first-party, cliente (Growth OS)
//  Sin cookies ni PII. sid = UUID aleatorio por navegador (localStorage).
//  Postea a /api/events vía sendBeacon (o fetch keepalive). Los nombres
//  de evento válidos están en el allowlist de api/events.mjs.
// ════════════════════════════════════════════════════════════════
const KEY = 'mrc_sid';
function sid() {
  try {
    let s = localStorage.getItem(KEY);
    if (!s) { s = crypto.randomUUID(); localStorage.setItem(KEY, s); }
    return s;
  } catch { return 'anon'; }
}
export function track(event, props = {}) {
  try {
    const payload = JSON.stringify({
      event, props, sid: sid(),
      page: location.pathname,
      lang: location.pathname.startsWith('/en') ? 'en' : 'es',
    });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }));
    else fetch('/api/events', { method: 'POST', body: payload, keepalive: true }).catch(() => {});
  } catch {}
}
