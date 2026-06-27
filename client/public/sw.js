self.addEventListener('push', (event) => {
  let data = { title: 'Messenger', body: 'Новое сообщение' };
  try {
    data = event.data.json();
  } catch (e) {
    data.body = event.data ? event.data.text() : 'Новое сообщение';
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Messenger', {
      body: data.body || '',
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'messenger-message',
      renotify: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'Открыть' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
