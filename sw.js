// Menyimpan tampilan pembuka saja. Data sistem selalu diambil langsung dari Google.
var CACHE = 'moscow-v11';
var FILES = ['./', 'lama.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (new URL(e.request.url).origin !== location.origin) return;
  // Selalu ambil versi terbaru dari server (lewati cache browser 10 menit); cadangan hanya bila offline.
  var r = e.request, segar = r.method === 'GET' ? fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(r);
  if (r.mode === 'navigate' || r.method !== 'GET') segar = r.method === 'GET' ? fetch(r, { cache: 'no-cache' }) : segar;
  e.respondWith(segar.catch(function () { return caches.match(r); }));
});
