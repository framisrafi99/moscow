// Tampilan aplikasi Moscow. Data sistem selalu diambil langsung dari server (tidak disimpan di sini).
// Halaman (HTML): selalu versi terbaru dari server, cadangan bila offline.
// File berversi (?v=…): langsung dari simpanan HP/laptop (versi baru = alamat baru), jadi tidak perlu menunggu server.
// Gambar & ikon: tampil dari simpanan, diperbarui diam-diam di belakang.
var CACHE = 'moscow-v71';
var FILES = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

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

function simpan(req, res) {
  if (res && res.ok && res.type === 'basic') { var c = res.clone(); caches.open(CACHE).then(function (k) { k.put(req, c); }); }
  return res;
}

self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (u.origin !== location.origin || r.method !== 'GET') return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r, { cache: 'no-cache' }).then(function (res) { return simpan(r, res); }).catch(function () { return caches.match(r, { ignoreSearch: true }); }));
    return;
  }
  if (/[?&]v=/.test(u.search)) {
    e.respondWith(caches.match(r).then(function (ada) { return ada || fetch(r).then(function (res) { return simpan(r, res); }); }));
    return;
  }
  if (/\.(png|jpe?g|webp|svg|ico|woff2?)$/i.test(u.pathname)) {
    e.respondWith(caches.match(r).then(function (ada) {
      var baru = fetch(r, { cache: 'no-cache' }).then(function (res) { return simpan(r, res); }).catch(function () { return ada; });
      return ada || baru;
    }));
    return;
  }
  e.respondWith(fetch(r, { cache: 'no-cache' }).then(function (res) { return simpan(r, res); }).catch(function () { return caches.match(r); }));
});

// Pengingat absen (notifikasi HP) dari Edge Function absen-pengingat.
self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Absensi Moscow', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || 'absen',
    renotify: true, requireInteraction: true, vibrate: [300, 150, 300, 150, 300], data: { url: d.url || '/absensi.html' }
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var tujuan = new URL((e.notification.data && e.notification.data.url) || '/absensi.html', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (ws) {
    for (var i = 0; i < ws.length; i++) { if (ws[i].url.indexOf('/absensi.html') > -1 && 'focus' in ws[i]) return ws[i].focus(); }
    return self.clients.openWindow(tujuan);
  }));
});
