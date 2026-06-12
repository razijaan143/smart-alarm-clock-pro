const CACHE_NAME = 'smart-alarm-pro-v2';
const urlsToCache = [
  '/smart-alarm-clock-pro/smart-alarm-clock-pro.html',
  '/smart-alarm-clock-pro/manifest.json',
  '/smart-alarm-clock-pro/icon-192.png',
  '/smart-alarm-clock-pro/icon-512.png',
  '/smart-alarm-clock-pro/sw.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
    return cache.addAll(urlsToCache).catch(function(){});
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k){return k!==CACHE_NAME;}).map(function(k){return caches.delete(k);}));
    })
  );
  self.clients.claim();
  // Start alarm checking interval
  startAlarmChecker();
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request).catch(function(){return response;});
    })
  );
});

// Background alarm checker
function startAlarmChecker() {
  setInterval(function() {
    checkAlarms();
  }, 30000); // Check every 30 seconds
}

function checkAlarms() {
  // Get alarms from clients
  self.clients.matchAll().then(function(clients) {
    if (clients.length > 0) {
      clients.forEach(function(client) {
        client.postMessage({ type: 'SW_CHECK_ALARMS' });
      });
    } else {
      // No clients open - check stored alarms
      checkStoredAlarms();
    }
  });
}

function checkStoredAlarms() {
  // This runs when app is in background
  var now = new Date();
  var h = now.getHours();
  var m = now.getMinutes();
  var h12 = h % 12 || 12;
  var ap = h >= 12 ? 'PM' : 'AM';
  var timeStr = (h12 < 10 ? '0' : '') + h12 + ':' + (m < 10 ? '0' : '') + m;

  // Show notification to wake up the app
  self.registration.showNotification('⏰ Alarm Check', {
    body: 'Tap to check your alarms',
    icon: '/smart-alarm-clock-pro/icon-192.png',
    silent: true,
    tag: 'alarm-check'
  });
}

// Message from app
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'ALARM_RING') {
    var data = event.data;
    self.registration.showNotification('⏰ ' + (data.label || 'Alarm!'), {
      body: data.time + ' ' + data.ampm + ' — Tap to dismiss',
      icon: '/smart-alarm-clock-pro/icon-192.png',
      badge: '/smart-alarm-clock-pro/icon-192.png',
      vibrate: [500, 200, 500, 200, 500, 200, 500],
      requireInteraction: true,
      tag: 'alarm-' + Date.now(),
      actions: [
        { action: 'dismiss', title: '✅ Dismiss' },
        { action: 'snooze', title: '😴 Snooze 5m' }
      ]
    });
  }
});

// Notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes('smart-alarm-clock-pro') && 'focus' in client) {
          client.postMessage({ type: event.action === 'snooze' ? 'SNOOZE' : 'DISMISS' });
          return client.focus();
        }
      }
      return clients.openWindow('/smart-alarm-clock-pro/smart-alarm-clock-pro.html');
    })
  );
});
