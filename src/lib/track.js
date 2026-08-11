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
  // Espejo a Google Analytics 4: el mismo evento first-party se envía a GA4
  // vía el gtag global del Layout. Un solo punto → todo lo ya instrumentado
  // ([data-track] + los track() directos de calc/diagnóstico) llega a GA4 sin
  // duplicar marcado. Guard: en páginas noindex GA4 no se carga (gtag no
  // existe) → no-op silencioso; nunca rompe el tracking first-party.
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', event, props);
    }
  } catch {}
}
