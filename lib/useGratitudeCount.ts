"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { countGratitudeEntries } from "@/lib/gratitude";

/** Counts saved dates only; it is independent of reflection progress and streaks. */
export function useGratitudeCount(userId: string | null) {
  const [snapshot, setSnapshot] = useState<{ userId: string; days: number } | null>(null);
  const refreshRef = useRef<() => void>(() => {});
  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    let listener: { remove: () => Promise<void> } | null = null;
    setSnapshot(null);
    if (!userId) {
      refreshRef.current = () => {};
      return;
    }

    const read = async () => {
      const request = ++generation;
      try {
        const days = await countGratitudeEntries(userId);
        // A save/delete can trigger another read while this one is pending.
        if (!cancelled && request === generation) setSnapshot({ userId, days });
      } catch {
        // Missing/offline data must not be presented as a real zero or stale total.
        if (!cancelled && request === generation) setSnapshot(null);
      }
    };
    const refreshNow = () => { if (!cancelled) void read(); };
    const onVisible = () => { if (document.visibilityState === "visible") refreshNow(); };
    refreshRef.current = refreshNow;
    refreshNow();
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App")) {
      void App.addListener("appStateChange", ({ isActive }) => { if (isActive) refreshNow(); })
        .then(handle => { if (cancelled) void handle.remove(); else listener = handle; })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
      refreshRef.current = () => {};
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      if (listener) void listener.remove();
    };
  }, [userId]);

  return { days: snapshot?.userId === userId ? snapshot.days : null, refresh };
}
