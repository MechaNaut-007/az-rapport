const CACHE = 'rapports-v4p';
const BASE = '/az-rapport';
const ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/logo.png',
  BASE + '/icon-192.png',
  BASE + '/icon-512.png'
];

// Install : mise en cache initiale
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate : supprime les anciens caches et prend le contrôle immédiatement
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch : stratégie "network first" pour index.html et sw.js
// => vérifie toujours le réseau en premier pour ces fichiers clés
// => cache uniquement en fallback hors-ligne
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isKey = url.pathname === BASE + '/' ||
                url.pathname === BASE + '/index.html' ||
                url.pathname === BASE + '/sw.js' ||
                url.pathname === BASE + '/manifest.json';

  if (isKey) {
    // Network first : essaie le réseau, met à jour le cache, fallback sur cache
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache first pour les assets (logo, icônes)
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (e.request.method === 'GET' && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        });
      }).catch(() => caches.match(BASE + '/index.html'))
    );
  }
});
