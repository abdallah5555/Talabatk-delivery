const CACHE = 'talabatk-shell-v1';
const SHELL = ['/', '/manifest.json'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('.supabase.co')) return;
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(req).then((res) => {
    const copy = res.clone();
    if (res.ok && (req.destination === 'script' || req.destination === 'style' || req.destination === 'image' || req.mode === 'navigate')) caches.open(CACHE).then((cache) => cache.put(req, copy));
    return res;
  }).catch(() => caches.match(req).then((cached) => cached || caches.match('/'))));
});
