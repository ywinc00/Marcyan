// Service worker del panel (/dashboard). Scope: /dashboard (requiere
// header Service-Worker-Allowed: /dashboard en vercel.json porque el
// sitio usa trailingSlash:false y la página vive en /dashboard sin barra).
// Estrategia: app-shell cache-first (stale-while-revalidate) para estáticos;
// /api/* SIEMPRE a la red (datos vivos + cookie de sesión, nunca cachear).
const CACHE = 'mrc-dash-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.add('/dashboard')).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // network-only (no cachear datos/sesión)

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((resp) => {
          if (resp && resp.ok && resp.type === 'basic') cache.put(req, resp.clone());
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
