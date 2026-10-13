/* Demleme yönetim paneli: yalnızca anlık bildirim (push). Önbellek / çevrimdışı mantığı yok. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch (e) {
    d = { title: 'Demleme', body: event.data ? event.data.text() : '' };
  }
  const title = d.title || 'Demleme';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: d.body || '',
      icon: '/admin-icon-192.png',
      badge: '/admin-icon-192.png',
      tag: d.tag || undefined,
      renotify: !!d.tag,
      data: { url: d.url || '/admin/siparisler' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/admin/siparisler', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.indexOf('/admin') !== -1 && 'focus' in c) {
          return c.focus().then((f) => (f && 'navigate' in f ? f.navigate(url) : f)).catch(() => self.clients.openWindow(url));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
