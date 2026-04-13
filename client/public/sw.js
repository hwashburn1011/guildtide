// ---------------------------------------------------------------------------
// Service Worker — Guildtide PWA (T-1943, T-1944, T-1945, T-1947)
// ---------------------------------------------------------------------------
const CACHE_NAME = 'guildtide-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ---- Install: cache static shell ------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ---- Activate: clean old caches -------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ---- Fetch: network-first for API, cache-first for assets -----------------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API requests: network-first with offline queue
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache GET responses for offline fallback
          if (event.request.method === 'GET' && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          // T-1945: Queue non-GET actions for later sync
          if (event.request.method !== 'GET') {
            const body = await event.request.clone().text();
            await queueOfflineAction(url.pathname, event.request.method, body);
            return new Response(
              JSON.stringify({ queued: true, message: 'Action queued for sync' }),
              { status: 202, headers: { 'Content-Type': 'application/json' } }
            );
          }
          // Return cached GET response if available
          const cached = await caches.match(event.request);
          return cached || new Response(
            JSON.stringify({ error: 'Offline', offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// ---- Offline action queue -------------------------------------------------
const QUEUE_STORE = 'guildtide-offline-queue';

async function queueOfflineAction(path, method, body) {
  // Use IndexedDB via simple key-value in cache
  const queue = await getOfflineQueue();
  queue.push({ path, method, body, timestamp: Date.now() });
  const cache = await caches.open(QUEUE_STORE);
  await cache.put(
    new Request('/_offline-queue'),
    new Response(JSON.stringify(queue))
  );
}

async function getOfflineQueue() {
  try {
    const cache = await caches.open(QUEUE_STORE);
    const response = await cache.match('/_offline-queue');
    if (response) return await response.json();
  } catch { /* empty */ }
  return [];
}

// ---- Background Sync: replay queued actions on reconnect ------------------
self.addEventListener('sync', (event) => {
  if (event.tag === 'guildtide-sync') {
    event.waitUntil(replayOfflineQueue());
  }
});

async function replayOfflineQueue() {
  const queue = await getOfflineQueue();
  const remaining = [];

  for (const action of queue) {
    try {
      await fetch(action.path, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: action.body,
      });
    } catch {
      remaining.push(action);
    }
  }

  const cache = await caches.open(QUEUE_STORE);
  if (remaining.length > 0) {
    await cache.put(
      new Request('/_offline-queue'),
      new Response(JSON.stringify(remaining))
    );
  } else {
    await cache.delete('/_offline-queue');
  }
}

// ---- Push Notifications (T-1947) ------------------------------------------
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Guildtide', body: 'Something happened!' };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      tag: data.tag || 'guildtide-notification',
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
