"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/useLang";
import { refreshNotificationSchedule, setupNotificationTapRouting, type NotificationTarget } from "@/lib/localNotifications";

function routeForTarget(target: NotificationTarget) {
  if (target === "prayer") return "/prayer";
  if (target === "reflection") return "/qt/write";
  return "/";
}

export default function NotificationBridge() {
  const router = useRouter();
  const lang = useLang();

  useEffect(() => {
    void refreshNotificationSchedule(lang);
  }, [lang]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let mounted = true;

    setupNotificationTapRouting((target) => {
      router.push(routeForTarget(target));
    }).then((remove) => {
      if (!mounted) {
        remove();
        return;
      }
      cleanup = remove;
    });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [router]);

  return null;
}
