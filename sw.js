const CACHE_NAME = 'bem-baiano-v3';
const urlsToCache = [
  './',
  './index.html',
  './contato.html',
  './404.html',
  './style.css',
  './app.js',
  './marca-if-baiano-horizontal.png',
  './favicon-if-baiano.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
