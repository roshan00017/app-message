// Service Worker for Push Notifications
// Handles push events, notification clicks, and background sync

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {
    title: 'New Message',
    body: 'You have a new message',
    data: {},
  };

  const conversationId = data.data?.conversationId;
  const url = conversationId
    ? `/customer/chat/${conversationId}`
    : '/customer/chat';

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: {
      conversationId,
      url,
    },
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
    tag: conversationId || 'default',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action, data } = event.notification;

  if (action === 'dismiss') {
    return;
  }

  // Default action or 'open': focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Try to find existing window with this conversation
      for (const client of windowClients) {
        if (data.url && client.url.includes(data.url)) {
          return client.focus();
        }
      }

      // Try to find any app window
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(data.url || '/');
          return client.focus();
        }
      }

      // Open new window
      return clients.openWindow(data.url || '/');
    })
  );
});

// Listen for messages from the main thread (e.g. from usePushEvents hook)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { type } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'NAVIGATE': {
      const { conversationId } = event.data;
      if (conversationId) {
        // Notify all clients to navigate
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
          for (const client of windowClients) {
            client.postMessage({
              type: 'NAVIGATE',
              conversationId,
            });
          }
        });
      }
      break;
    }

    case 'MARK_READ': {
      const { conversationId } = event.data;
      if (conversationId) {
        // Notify all clients to mark messages as read
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
          for (const client of windowClients) {
            client.postMessage({
              type: 'MARK_READ',
              conversationId,
            });
          }
        });
      }
      break;
    }
  }
});
