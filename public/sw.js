const CACHE_NAME = 'aya-cache-v2';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Don't cache API calls or Supabase — only static assets
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  // Skip API calls — always fetch fresh
  if (url.includes('/api/') || url.includes('supabase.co')) {
    return;
  }
  // Only cache GET requests for static assets
  if (event.request.method !== 'GET') {
    return;
  }
  // Cache everything else
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request)
    })
  );
});

// Push Notification Support
self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'AYA Notification', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'Your daily challenge is ready!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: '🔥 Start Challenge' },
      { action: 'close', title: 'Later' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'AYA', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(clients.openWindow(event.data.url || '/'));
  }
});

