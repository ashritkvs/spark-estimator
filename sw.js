/* Spark Estimator service worker — offline-first PWA shell. */
const CACHE = 'spark-estimator-v5';

/* App shell: local files that must be available offline. */
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './spark-logo.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './favicon.png',
  './prices.csv',
];

/* CDN libraries we runtime-cache so export / OCR keep working offline
   after the first online load. */
const RUNTIME_HOSTS = ['cdn.jsdelivr.net', 'cdn.sheetjs.com', 'unpkg.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
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

  // Same-origin: cache-first, fall back to network, then to cached index for navigations.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
      )
    );
    return;
  }

  // Trusted CDNs: stale-while-revalidate so libraries survive offline.
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req)
            .then((res) => { if (res && res.status === 200) c.put(req, res.clone()); return res; })
            .catch(() => hit);
          return hit || net;
        })
      )
    );
  }
});
