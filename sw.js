var CACHE_NAME = 'chess-clock-v3';
var ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install – cache all assets
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate – clean up old caches, notify clients
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    }).then(function () {
      return self.clients.matchAll();
    }).then(function (clients) {
      clients.forEach(function (client) {
        client.postMessage({ type: 'SW_UPDATED' });
      });
    })
  );
});

// Fetch – stale-while-revalidate: serve from cache immediately, update cache in background
self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(event.request).then(function (cached) {
        var networkFetch = fetch(event.request).then(function (response) {
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(function () {
          return cached;
        });
        return cached || networkFetch;
      });
    })
  );
});
