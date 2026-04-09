// sw.js - Service Worker

const CACHE_VERSION = '1.5.0';
const CACHE_NAME = `fuel-record-v${CACHE_VERSION}`;
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './db.js',
  './manifest.json',
  './icon.svg',
  './version.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (url.pathname.endsWith('version.json')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.action === 'skipWaiting') self.skipWaiting();
});
