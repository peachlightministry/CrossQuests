// Minimal service worker: exists only to make CrossQuests installable
// ("Add to Home Screen") and to host showNotification() for the spin-reset
// alerts, which some browsers (notably Android Chrome) require to go
// through a registered service worker rather than `new Notification()`
// directly. Deliberately does no offline caching, so the site never serves
// a stale version.
const CACHE_NAME = 'crossquests-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Deliberately no 'fetch' handler — this worker exists only for PWA
// installability and showNotification(), not caching, and a pass-through
// handler would just add a pointless extra hop in front of every request.
