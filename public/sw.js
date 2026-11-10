// Cache only the public offline notice. Clinical data, tokens, HTML and JS stay on the network.
const CACHE = 'agendacred-offline-v1';
const OFFLINE = '/offline.html';
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.add(new Request(new URL(OFFLINE, self.location.origin), { cache: 'reload' })),
      ),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('agendacred-offline-') && key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    request.mode !== 'navigate' ||
    url.origin !== self.location.origin
  )
    return;
  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      return (
        (await cache.match(OFFLINE)) ||
        new Response('Sin conexión. Conéctate a internet y vuelve a abrir AgendaCRED.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      );
    }),
  );
});
