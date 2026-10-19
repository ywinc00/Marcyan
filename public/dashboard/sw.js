// Service worker del panel (/dashboard). Scope: /dashboard (requiere
// header Service-Worker-Allowed: /dashboard en vercel.json porque el
// sitio usa trailingSlash:false y la página vive en /dashboard sin barra).
// Estrategia: navegación (HTML) NETWORK-FIRST → el shell siempre fresco tras un
// deploy (antes era cache-first y mostraba la versión vieja una carga); estáticos
// hasheados cache-first con revalidación; /api/* SIEMPRE a la red (nunca cachear).
const CACHE = 'mrc-dash-v3';

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

  // Navegación (documento HTML): NETWORK-FIRST. Tras un deploy el shell se ve
  // fresco de inmediato; si no hay red, cae al último shell cacheado.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp && resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then((cache) => cache.put('/dashboard', clone));
          }
          return resp;
        })
        .catch(() =>
          caches.open(CACHE).then((cache) => cache.match('/dashboard').then((m) => m || cache.match(req)))
        )
    );
    return;
  }

  // Cache-first SOLO para estáticos con hash (/_astro/*) y fuentes; el resto
  // va siempre a la red. Antes cacheaba cualquier GET del mismo origen (SH-16).
  const cacheable = url.pathname.startsWith('/_astro/') || /\.(woff2?|ttf|otf)$/.test(url.pathname);
  if (!cacheable) return;

  // Estáticos hasheados (JS/CSS/fuentes): cache-first con revalidación en segundo plano.
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
