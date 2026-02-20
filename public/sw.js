self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// No-op service worker to avoid /sw.js 404 noise in development.
self.addEventListener('fetch', () => {
  // pass through
});
