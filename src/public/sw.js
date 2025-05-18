// Service Worker for Story App (Enhanced Version like Kopi Slukatan)

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
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

// FETCH
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin) {
    if (request.url.includes("api")) {
      event.respondWith(handleApiRequest(request));
    }
    return;
  }

  if (request.destination === "document") {
    event.respondWith(handlePageRequest(request));
  } else if (request.destination === "image") {
    event.respondWith(handleImageRequest(request));
  } else {
    event.respondWith(handleStaticRequest(request));
  }
});

// Handle Page Requests
async function handlePageRequest(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAMES.pages);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match(OFFLINE_PAGE);
  }
}

// Handle Image Requests
async function handleImageRequest(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAMES.images);
    cache.put(request, response.clone());
    return response;
  } catch {
    return caches.match(OFFLINE_IMAGE);
  }
}

// Handle Static Requests
async function handleStaticRequest(request) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request).then(async (response) => {
      const cache = await caches.open(CACHE_NAMES.static);
      cache.put(request, response.clone());
    }).catch(() => {});
    return cached;
  }

  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAMES.static);
    cache.put(request, response.clone());
    return response;
  } catch {
    return new Response("Network error", {
      status: 408,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// Handle API Requests
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAMES.api);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: true, message: "Network Error" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// PUSH NOTIFICATIONS
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    data = {
      title: "Story App",
      options: {
        body: event.data?.text() || "Ada notifikasi baru",
        icon: "/public/images/icon-192x192.png",
        badge: "/public/images/icon-192x192.png",
      },
    };
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Story App",
      data.options || {}
    )
  );
});

// NOTIFICATION CLICK
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = new URL("/", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url === urlToOpen && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
