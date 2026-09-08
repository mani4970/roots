"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { getLocalDateString } from "@/lib/date";

// Keep campaign deadlines current even if Home stays mounted overnight or the
// native app resumes from the background. This does not update reflection dates.
export function useChallengeLocalDate() {
  const [localDate, setLocalDate] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let listener: { remove: () => Promise<void> } | null = null;
    const refresh = () => {
      if (cancelled) return;
      clearTimeout(timer);
      const now = new Date();
      setLocalDate(getLocalDateString(now));
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      timer = setTimeout(refresh, Math.max(1, midnight.getTime() - now.getTime()));
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App")) {
      void App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) refresh();
      }).then((handle) => {
        if (cancelled) void handle.remove();
        else listener = handle;
      }).catch((error) => {
        console.warn("챌린지 날짜 갱신 리스너 등록 실패:", error);
      });
    }
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      if (listener) void listener.remove();
    };
  }, []);

  return localDate;
}
