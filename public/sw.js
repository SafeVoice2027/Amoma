const STATIC_CACHE = "amoma-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Only ever cache same-origin, content-hashed build assets (JS/CSS chunks
// under /_next/static/) — never HTML pages, API routes, or Supabase
// requests. This app handles confidential student bullying reports, and
// caching a report/status page could show stale data (e.g. a case that's
// since closed) or leak a previous user's session on a shared device.
function isCacheableStaticAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !isCacheableStaticAsset(url)) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    }),
  );
});
