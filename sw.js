const CACHE = 'dupliscan-v3';
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(['.', 'index.html', 'manifest.json']); }));
});
self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
  }).then(function() { return clients.claim(); }));
});
self.addEventListener('fetch', function(e) {
  // Only handle our own origin — don't intercept Google Script calls
  if (!e.request.url.startsWith(location.origin)) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(function(res) {
      return caches.open(CACHE).then(function(c) { c.put(e.request, res.clone()); return res; });
    }).catch(function() { return caches.match(e.request); }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function(r) { return r || fetch(e.request); }));
});
