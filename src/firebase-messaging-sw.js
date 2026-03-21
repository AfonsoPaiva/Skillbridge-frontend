self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json() || {};
  } catch {
    payload = { notification: { title: 'Nova mensagem', body: 'Recebeu uma nova mensagem no SkillBridge.' } };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || 'Nova mensagem';
  const options = {
    body: notification.body || 'Recebeu uma nova mensagem no SkillBridge.',
    icon: notification.icon || '/assets/favicon-192.png',
    badge: notification.badge || '/assets/favicon-192.png',
    data: {
      url: data.url || '/messages',
      conversationId: data.conversation_id || ''
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/messages';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
