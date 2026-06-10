// Service Worker v9 — limpia caches viejos y NO cachea nada
var CACHE_NAME = 'dupliscan-v9';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(name) { return caches.delete(name); }));
    }).then(function() { return clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  // Nunca cachear — siempre ir a la red
  e.respondWith(fetch(e.request).catch(function() {
    return caches.match(e.request);
  }));
});
