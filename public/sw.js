const CACHE_NAME = "roots-v2";
const STATIC_ASSETS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

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
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// 로컬 알림 예약 (앱 열릴 때 등록)
self.addEventListener("message", (event) => {
  if (event.data?.type === "SCHEDULE_NOTIFICATIONS") {
    scheduleLocalNotifications();
  }
});

function scheduleLocalNotifications() {
  // 다음 아침 6시까지 남은 시간 계산
  const now = new Date();
  const tomorrow6am = new Date(now);
  tomorrow6am.setDate(tomorrow6am.getDate() + (now.getHours() >= 6 ? 1 : 0));
  tomorrow6am.setHours(6, 0, 0, 0);
  const msUntil6am = tomorrow6am - now;

  // 아침 알림
  setTimeout(() => {
    self.registration.showNotification("Roots 🌱", {
      body: "말씀으로 하루를 시작해요. 오늘의 큐티를 해볼까요?",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "morning-qt",
      data: { url: "/qt" },
    });
  }, msUntil6am);

  // 저녁 9시 알림
  const tonight9pm = new Date(now);
  tonight9pm.setHours(21, 0, 0, 0);
  if (tonight9pm <= now) tonight9pm.setDate(tonight9pm.getDate() + 1);
  const msUntil9pm = tonight9pm - now;

  setTimeout(() => {
    self.registration.showNotification("Roots 🌱", {
      body: "오늘 결단, 실천하셨나요? 하루를 말씀으로 마무리해요 🙏",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "evening-checkin",
      data: { url: "/" },
    });
  }, msUntil9pm);
}
