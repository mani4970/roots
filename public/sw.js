const CACHE_NAME = "roots-v3";
const STATIC_ASSETS = ["/manifest.json", "/app-icon-roots-192.png", "/app-icon-roots-512.png", "/roots-logo-transparent-160.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API 요청, Supabase, POST 등은 절대 가로채지 않음
  if (
    event.request.method !== "GET" ||
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/")
  ) {
    return; // 서비스워커 개입 없이 그냥 통과
  }

  // 정적 파일만 캐시
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request);
      })
    );
  }
  // 나머지는 그냥 네트워크
});
