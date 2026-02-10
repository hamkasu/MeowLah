// ============================================================
// IndexedDB-based offline queue for background sync
// Queues failed uploads (posts, lost-cat reports, memorials)
// and replays them when the service worker detects connectivity.
// ============================================================

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface QueuedRequest {
  id: string;
  url: string;
  method: 'POST' | 'PUT';
  body: string;        // JSON-serialized body (files stored as base64)
  headers: Record<string, string>;
  timestamp: number;
  type: 'post' | 'lost-cat' | 'memorial' | 'sighting';
}

interface OfflineQueueDB extends DBSchema {
  'sync-queue': {
    key: string;
    value: QueuedRequest;
    indexes: { 'by-timestamp': number };
  };
  'cached-memorials': {
    key: string;
    value: { slug: string; data: string; timestamp: number };
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineQueueDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineQueueDB>('meowlah-offline', 1, {
      upgrade(db) {
        const syncStore = db.createObjectStore('sync-queue', { keyPath: 'id' });
        syncStore.createIndex('by-timestamp', 'timestamp');

        db.createObjectStore('cached-memorials', { keyPath: 'slug' });
      },
    });
  }
  return dbPromise;
}

// Queue a failed request for background sync
export async function queueRequest(request: Omit<QueuedRequest, 'id' | 'timestamp'>) {
  const db = await getDB();
  const entry: QueuedRequest = {
    ...request,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  };
  await db.put('sync-queue', entry);

  // Register for background sync if supported
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } })
      .sync.register('meowlah-sync');
  }

  return entry.id;
}

// Get all queued requests (used by service worker)
export async function getQueuedRequests(): Promise<QueuedRequest[]> {
  const db = await getDB();
  return db.getAllFromIndex('sync-queue', 'by-timestamp');
}

// Remove a request from the queue after successful replay
export async function removeFromQueue(id: string) {
  const db = await getDB();
  await db.delete('sync-queue', id);
}

// Cache a memorial page for offline viewing
export async function cacheMemorial(slug: string, data: object) {
  const db = await getDB();
  await db.put('cached-memorials', {
    slug,
    data: JSON.stringify(data),
    timestamp: Date.now(),
  });
}

// Retrieve a cached memorial
export async function getCachedMemorial(slug: string) {
  const db = await getDB();
  const entry = await db.get('cached-memorials', slug);
  return entry ? JSON.parse(entry.data) : null;
}
