// Service worker del panel (/dashboard). Scope: /dashboard (requiere
// header Service-Worker-Allowed: /dashboard en vercel.json porque el
// sitio usa trailingSlash:false y la página vive en /dashboard sin barra).
// Estrategia: navegación (HTML) NETWORK-FIRST → el shell siempre fresco tras un
// deploy (antes era cache-first y mostraba la versión vieja una carga); estáticos
// hasheados cache-first con revalidación; /api/* SIEMPRE a la red (nunca cachear).
const CACHE = 'mrc-dash-v4';

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
            caches.open(CACHE).then((cache) => cache.put('/dashboard', clone)).catch(() => {});
          }
          return resp;
        })
        .catch(() =>
          caches.open(CACHE)
            .then((cache) => cache.match('/dashboard').then((m) => m || cache.match(req)))
            .then((m) => m || Response.error())
        )
    );
    return;
  }

  // Cache-first SOLO para estáticos con hash (/_astro/*) y fuentes; el resto
  // va siempre a la red. Antes cacheaba cualquier GET del mismo origen (SH-16).
  const cacheable = url.pathname.startsWith('/_astro/') || /\.(woff2?|ttf|otf)$/.test(url.pathname);
  if (!cacheable) return;

  // Estáticos hasheados (JS/CSS/fuentes): cache-first con revalidación en segundo plano.
  // La caché es un EXTRA: si el navegador no deja abrirla (pasó en producción el
  // 2026-10-20: "Unexpected internal error" en caches.open) o falla cualquier paso,
  // se sirve de la red como si no hubiera service worker. Nunca debe dejar el
  // panel sin su código.
  e.respondWith((async () => {
    let cache = null;
    try { cache = await caches.open(CACHE); } catch { cache = null; }
    let cached;
    if (cache) { try { cached = await cache.match(req); } catch { cached = undefined; } }
    const network = fetch(req).then((resp) => {
      if (cache && resp && resp.ok && resp.type === 'basic') cache.put(req, resp.clone()).catch(() => {});
      return resp;
    });
    if (cached) { network.catch(() => {}); return cached; }
    return network;
  })());
});
