const CACHE_NAME = 'smart-alarm-pro-v1';
const urlsToCache = [
  '/smart-alarm-clock-pro/smart-alarm-clock-pro.html',
  '/smart-alarm-clock-pro/manifest.json',
  '/smart-alarm-clock-pro/icon-192.png',
  '/smart-alarm-clock-pro/icon-512.png'
];

// Install
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

// Push notifications
self.addEventListener('push', function(event) {
  var data = event.data ? event.data.json() : {};
  var title = data.title || '⏰ Smart Alarm Clock Pro';
  var options = {
    body: data.body || 'Alarm!',
    icon: '/smart-alarm-clock-pro/icon-192.png',
    badge: '/smart-alarm-clock-pro/icon-192.png',
    vibrate: [500, 200, 500, 200, 500],
    requireInteraction: true,
    actions: [
      { action: 'dismiss', title: '✅ Dismiss' },
      { action: 'snooze', title: '😴 Snooze 5m' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'snooze') {
    // Snooze 5 minutes
    setTimeout(function() {
      self.registration.showNotification('⏰ Alarm!', {
        body: 'Snoozed alarm - Time to wake up!',
        icon: '/smart-alarm-clock-pro/icon-192.png',
        requireInteraction: true
      });
    }, 5 * 60 * 1000);
  } else {
    // Open app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          if (clientList[i].url.includes('smart-alarm-clock-pro') && 'focus' in clientList[i]) {
            return clientList[i].focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/smart-alarm-clock-pro/smart-alarm-clock-pro.html');
        }
      })
    );
  }
});

// Background sync for alarms
self.addEventListener('sync', function(event) {
  if (event.tag === 'alarm-check') {
    event.waitUntil(checkStoredAlarms());
  }
});

function checkStoredAlarms() {
  return self.clients.matchAll().then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({ type: 'CHECK_ALARMS' });
    });
  });
}
