// ============================================================
// MeowLah Service Worker
// Handles: caching, offline fallback, background sync, push
// ============================================================

const CACHE_VERSION = 'meowlah-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const MEMORIAL_CACHE = `${CACHE_VERSION}-memorials`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/feed',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ---- INSTALL ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting();
});

// ---- ACTIVATE ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('meowlah-') && key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== MEMORIAL_CACHE && key !== IMAGE_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ---- FETCH ----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST/PUT handled by background sync)
  if (request.method !== 'GET') return;

  // Strategy 1: Memorial pages — Network first, fall back to cache
  // Memorial pages are emotionally important — pre-cache for reliability
  if (url.pathname.startsWith('/memorial/')) {
    event.respondWith(networkFirstWithCache(request, MEMORIAL_CACHE));
    return;
  }

  // Strategy 2: API requests — Network first, fall back to cache
  if (url.pathname.startsWith('/v1/') || url.hostname !== self.location.hostname) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  // Strategy 3: Images — Cache first, fall back to network (stale-while-revalidate)
  if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|webp|avif|gif|svg)$/)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // Strategy 4: Static assets — Stale while revalidate
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});

// ---- CACHING STRATEGIES ----

// Network first: try network, fall back to cache, then offline page
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    return cachedResponse || caches.match('/offline');
  }
}

// Network first with memorial-specific caching
// Also caches memorial gallery images for emotional reliability
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    // Memorial-specific offline fallback
    return caches.match('/offline');
  }
}

// Stale while revalidate: return cache immediately, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// ---- BACKGROUND SYNC ----
// Replays queued requests when connectivity returns
self.addEventListener('sync', (event) => {
  if (event.tag === 'meowlah-sync') {
    event.waitUntil(replayQueuedRequests());
  }
});

async function replayQueuedRequests() {
  // Open IndexedDB to read queued requests
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
        // Remove from queue on success
        const deleteTx = db.transaction('sync-queue', 'readwrite');
        deleteTx.objectStore('sync-queue').delete(entry.id);

        // Notify the client that sync succeeded
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
      // Will retry on next sync event
      console.log(`[SW] Sync failed for ${entry.id}, will retry`);
    }
  }
}

// ---- PUSH NOTIFICATIONS ----
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const payload = event.data.json();

  const options = {
    body: payload.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    tag: payload.tag || 'meowlah-notification',
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
    options.requireInteraction = true; // Keep visible — urgent
  } else if (payload.type === 'match_found') {
    options.actions = [
      { action: 'view', title: 'View Match' },
    ];
    options.requireInteraction = true;
  } else if (payload.type === 'condolence') {
    options.actions = [
      { action: 'view', title: 'Read Message' },
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
    // Open the sighting report form for this lost cat
    const sightingUrl = url.replace('/lost-cats/', '/lost-cats/') + '?report-sighting=true';
    event.waitUntil(self.clients.openWindow(sightingUrl));
  } else {
    event.waitUntil(self.clients.openWindow(url));
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
