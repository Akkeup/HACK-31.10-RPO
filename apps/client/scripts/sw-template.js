const NAME = "discovery-shell-__VERSION__";
const ASSETS = __ASSETS__;
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("discovery-shell-") && k !== NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== location.origin ||
    !ASSETS.includes(url.pathname)
  )
    return;
  event.respondWith(
    caches
      .open(NAME)
      .then((cache) => cache.match(event.request))
      .then((hit) => hit || fetch(event.request)),
  );
});
