const CACHE_NAME = "roots-v1";
const STATIC_ASSETS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

// 설치
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 활성화
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 네트워크 우선 fetch
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// 푸시 알림 수신
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "Roots 🌱";
  const options = {
    body: data.body || "오늘의 큐티를 시작해보세요!",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "roots-notification",
    data: { url: data.url || "/" },
    actions: [
      { action: "open", title: "열기" },
      { action: "dismiss", title: "나중에" },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
