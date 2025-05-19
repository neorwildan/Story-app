import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { BASE_URL } from './config';
// Precaching
precacheAndRoute(self.__WB_MANIFEST);
// Runtime caching
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || 
               url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({ cacheName: 'google-fonts' })
);
registerRoute(
  ({ url }) => url.origin === 'https://cdnjs.cloudflare.com' || 
               url.origin.includes('fontawesome'),
  new CacheFirst({ cacheName: 'fontawesome' })
);
registerRoute(
  ({ url }) => url.origin === 'https://ui-avatars.com',
  new CacheFirst({
    cacheName: 'avatars-api',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })]
  })
);
registerRoute(
  ({ request, url }) => {
    const baseUrl = new URL(BASE_URL);
    return baseUrl.origin === url.origin && request.destination !== 'image';
  },
  new NetworkFirst({ cacheName: 'apistory-api' })
);
registerRoute(
  ({ request, url }) => {
    const baseUrl = new URL(BASE_URL);
    return baseUrl.origin === url.origin && request.destination === 'image';
  },
  new StaleWhileRevalidate({ cacheName: 'apistory-images' })
);
registerRoute(
  ({ url }) => url.origin.includes('maptiler'),
  new CacheFirst({ cacheName: 'maptiler-api' })
);
// Event listeners
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {
    title: 'Story App',
    options: {
      body: event.data?.text() || 'Ada notifikasi baru',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, data.options)
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL('/', self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const client = clients.find(c => c.url === urlToOpen);
        return client ? client.focus() : clients.openWindow(urlToOpen);
      })
  );
});

const CACHE_VERSION = "v1";

const CACHE_NAMES = {
  static: `static-cache-${CACHE_VERSION}`,
  images: `images-cache-${CACHE_VERSION}`,
  pages: `pages-cache-${CACHE_VERSION}`,
  api: `api-cache-${CACHE_VERSION}`,
};

const STATIC_CACHE_URLS = [
  "/",
  "/index.html",
  "/styles/styles.css",
  "/scripts/index.js",
];

const ASSET_CACHE_URLS = [
  "/public/images/icon-192x192.png",
  "/public/images/icon-512x512.png",
  "/public/images/default-avatar.png",
];

const OFFLINE_PAGE = "/index.html";
const OFFLINE_IMAGE = "/public/images/default-avatar.png";

// INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAMES.static).then((cache) => cache.addAll(STATIC_CACHE_URLS)),
      caches.open(CACHE_NAMES.images).then((cache) => cache.addAll(ASSET_CACHE_URLS)),
    ])
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => !Object.values(CACHE_NAMES).includes(name))
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});