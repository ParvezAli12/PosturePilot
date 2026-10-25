/* Tiny service worker used only so that reminder notifications work on phones
   (Android Chrome only allows notifications through a service worker).
   It stores nothing and does not change how the site loads. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) { if (c.navigate) c.navigate(url); return c.focus(); } }
      return self.clients.openWindow(url);
    })
  );
});