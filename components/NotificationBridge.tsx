"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { PushNotifications } from "@capacitor/push-notifications";
import { useLang } from "@/lib/useLang";
import {
  setupNotificationTapRouting,
  syncTodayBibleReflectionCompletionForNotifications,
  type NotificationTarget,
} from "@/lib/localNotifications";

function routeForTarget(target: NotificationTarget) {
  if (target === "prayer") return "/prayer";
  if (target === "reflection") return "/qt";
  return "/";
}

function safeInAppPath(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
}

function getPushDeepLink(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  return safeInAppPath(record.deepLink) || safeInAppPath(record.deep_link);
}

function isNativePushAvailable() {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("PushNotifications");
  } catch {
    return false;
  }
}

export default function NotificationBridge() {
  const router = useRouter();
  const lang = useLang();

  useEffect(() => {
    let mounted = true;
    let syncInFlight: Promise<void> | null = null;
    let appStateListener: { remove: () => Promise<void> } | undefined;

    const syncReminderState = () => {
      if (!mounted || syncInFlight) return;
      syncInFlight = syncTodayBibleReflectionCompletionForNotifications(lang)
        .finally(() => {
          syncInFlight = null;
        });
    };

    syncReminderState();

    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App")) {
      CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) syncReminderState();
      }).then(handle => {
        if (!mounted) {
          void handle.remove();
          return;
        }
        appStateListener = handle;
      }).catch(error => {
        console.warn("Roots app-state notification sync unavailable", error);
      });
    }

    return () => {
      mounted = false;
      void appStateListener?.remove();
    };
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

  useEffect(() => {
    if (!isNativePushAvailable()) return;

    let mounted = true;
    let listener: { remove: () => Promise<void> } | undefined;

    PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
      const deepLink = getPushDeepLink(event.notification?.data);
      if (!deepLink) {
        router.push("/");
        return;
      }
      router.push(deepLink);
    }).then((handle) => {
      if (!mounted) {
        void handle.remove();
        return;
      }
      listener = handle;
    }).catch((error) => {
      console.warn("Roots push notification tap listener failed", error);
    });

    return () => {
      mounted = false;
      void listener?.remove();
    };
  }, [router]);

  return null;
}
