// ============================================================
// MeowLah Service Worker v2
// Handles: caching, offline fallback, background sync, push
// ============================================================

const CACHE_VERSION = 'meowlah-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const MEMORIAL_CACHE = `${CACHE_VERSION}-memorials`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/feed',
  '/explore',
  '/lost-cats',
  '/memorial-wall',
  '/auth/login',
  '/auth/register',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Max cache sizes
const MAX_DYNAMIC_CACHE = 100;
const MAX_IMAGE_CACHE = 200;
const MAX_MEMORIAL_CACHE = 50;

// ---- INSTALL ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ---- ACTIVATE ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('meowlah-') && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ---- FETCH ----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST/PUT handled by background sync)
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Strategy 1: Memorial pages — Network first, fall back to cache
  if (url.pathname.startsWith('/memorial/')) {
    event.respondWith(networkFirstWithCache(request, MEMORIAL_CACHE, MAX_MEMORIAL_CACHE));
    return;
  }

  // Strategy 2: API requests — Network first, fall back to cache
  if (url.pathname.startsWith('/v1/') || (url.hostname !== self.location.hostname && !url.pathname.match(/\.(png|jpg|jpeg|webp|avif|gif|svg)$/))) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE, MAX_DYNAMIC_CACHE));
    return;
  }

  // Strategy 3: Images — Cache first with stale-while-revalidate
  if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|webp|avif|gif|svg)$/)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, MAX_IMAGE_CACHE));
    return;
  }

  // Strategy 4: Auth pages — Cache first for instant load
  if (url.pathname.startsWith('/auth/')) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Strategy 5: Static assets — Stale while revalidate
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});

// ---- CACHING STRATEGIES ----

async function networkFirst(request, cacheName, maxEntries) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      if (maxEntries) trimCache(cacheName, maxEntries);
    }
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    return cachedResponse || caches.match('/offline');
  }
}

async function networkFirstWithCache(request, cacheName, maxEntries) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      if (maxEntries) trimCache(cacheName, maxEntries);
    }
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    return caches.match('/offline');
  }
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
        if (maxEntries) trimCache(cacheName, maxEntries);
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// Trim cache to max entries (LRU eviction)
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await cache.delete(keys[0]);
    trimCache(cacheName, maxEntries);
  }
}

// ---- BACKGROUND SYNC ----
self.addEventListener('sync', (event) => {
  if (event.tag === 'meowlah-sync') {
    event.waitUntil(replayQueuedRequests());
  }
  if (event.tag === 'meowlah-post-sync') {
    event.waitUntil(replayQueuedRequests());
  }
  if (event.tag === 'meowlah-lost-cat-sync') {
    event.waitUntil(replayQueuedRequests());
  }
});

async function replayQueuedRequests() {
  const db = await openIndexedDB();
  const tx = db.transaction('sync-queue', 'readwrite');
  const store = tx.objectStore('sync-queue');
  const requests = await getAllFromStore(store);

  for (const entry of requests) {
    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body,
      });

      if (response.ok) {
        const deleteTx = db.transaction('sync-queue', 'readwrite');
        deleteTx.objectStore('sync-queue').delete(entry.id);

        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_SUCCESS',
            requestType: entry.type,
            id: entry.id,
          });
        });
      }
    } catch {
      console.log(`[SW] Sync failed for ${entry.id}, will retry`);
    }
  }
}

// ---- PUSH NOTIFICATIONS ----
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'MeowLah', body: event.data.text() };
  }

  const options = {
    body: payload.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    tag: payload.tag || `meowlah-${payload.type || 'notification'}`,
    renotify: true,
    data: {
      url: payload.url || '/feed',
      type: payload.type,
    },
    actions: [],
  };

  // Contextual actions based on notification type
  if (payload.type === 'lost_cat_nearby') {
    options.actions = [
      { action: 'view', title: 'View Report' },
      { action: 'sighting', title: 'I Saw This Cat' },
    ];
    options.requireInteraction = true;
  } else if (payload.type === 'match_found') {
    options.actions = [
      { action: 'view', title: 'View Match' },
    ];
    options.requireInteraction = true;
  } else if (payload.type === 'condolence' || payload.type === 'tribute') {
    options.actions = [
      { action: 'view', title: 'Read Message' },
    ];
  } else if (payload.type === 'sighting') {
    options.actions = [
      { action: 'view', title: 'View Sighting' },
    ];
    options.requireInteraction = true;
  } else if (payload.type === 'like' || payload.type === 'comment') {
    options.actions = [
      { action: 'view', title: 'View Post' },
    ];
  } else if (payload.type === 'follow') {
    options.actions = [
      { action: 'view', title: 'View Profile' },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'MeowLah', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/feed';

  if (event.action === 'sighting') {
    const sightingUrl = url + '?report-sighting=true';
    event.waitUntil(self.clients.openWindow(sightingUrl));
  } else {
    // Focus existing window or open new one
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
    );
  }
});

// Handle notification close (analytics)
self.addEventListener('notificationclose', (event) => {
  // Could send analytics event here
});

// ---- MESSAGE HANDLER ----
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CACHE_MEMORIAL') {
    // Pre-cache a memorial page when user views it
    const { slug } = event.data;
    if (slug) {
      caches.open(MEMORIAL_CACHE).then((cache) => {
        cache.add(`/memorial/${slug}`);
      });
    }
  }
});

// ---- IndexedDB helpers for service worker context ----
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('meowlah-offline', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('sync-queue')) {
        const store = db.createObjectStore('sync-queue', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains('cached-memorials')) {
        db.createObjectStore('cached-memorials', { keyPath: 'slug' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
