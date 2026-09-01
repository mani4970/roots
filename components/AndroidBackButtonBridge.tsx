"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";
import { runAndroidBackHandler } from "@/lib/androidBackNavigation";

const ANDROID_STAY_PATHS = new Set(["/", "/welcome", "/login", "/signup"]);

export default function AndroidBackButtonBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      return;
    }

    let cancelled = false;
    let listener: { remove: () => Promise<void> } | null = null;

    void App.addListener("backButton", () => {
      if (runAndroidBackHandler()) return;

      const pathname = window.location.pathname;
      if (pathname === "/") return;

      if (window.history.length > 1) {
        window.history.back();
        return;
      }

      if (ANDROID_STAY_PATHS.has(pathname)) return;
      router.replace("/");
    }).then(handle => {
      if (cancelled) {
        void handle.remove();
        return;
      }
      listener = handle;
    });

    return () => {
      cancelled = true;
      if (listener) void listener.remove();
    };
  }, [router]);

  return null;
}
