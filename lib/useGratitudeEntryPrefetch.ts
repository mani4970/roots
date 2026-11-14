"use client";

import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { getLocalDateString } from "@/lib/date";
import { getGratitudeEntry } from "@/lib/gratitude";
import { clearGratitudeEntryCache, forgetGratitudeCacheOwner, setGratitudeCacheOwner } from "@/lib/gratitudeEntryCache";
import { createClient } from "@/lib/supabase";

/** Home never waits for this one-day read; it starts after a paint/idle opportunity. */
export function useGratitudeEntryPrefetch(userId: string | null, localDate: string) {
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    setGratitudeCacheOwner(userId);
    refreshRef.current = () => {};
    if (!userId) return;
    let cancelled = false;
    let accountMatches = true;
    let frame: number | undefined;
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let scheduled = false;
    let lastReturn = 0;
    let listener: { remove: () => Promise<void> } | null = null;
    const cancelScheduled = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      clearTimeout(timer);
      frame = idle = undefined;
      scheduled = false;
    };
    const schedule = () => {
      if (cancelled || !accountMatches || scheduled) return;
      scheduled = true;
      const read = () => {
        frame = idle = undefined;
        scheduled = false;
        if (!cancelled && accountMatches) {
          // The regular service handles account checks, timeout and shared reads.
          void getGratitudeEntry(userId, getLocalDateString()).catch(() => {});
        }
      };
      frame = requestAnimationFrame(() => {
        frame = undefined;
        if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(read, { timeout: 1500 });
        else timer = setTimeout(read, 120);
      });
    };
    const onReturn = () => {
      if (document.visibilityState !== "visible" || !accountMatches || cancelled) return;
      // A native resume can emit focus + visibility + appStateChange together.
      const now = Date.now();
      if (now - lastReturn < 1000) return;
      lastReturn = now;
      clearGratitudeEntryCache(userId);
      schedule();
    };
    refreshRef.current = () => {
      if (cancelled || !accountMatches) return;
      clearGratitudeEntryCache(userId);
      schedule();
    };
    const { data: { subscription } } = createClient().auth.onAuthStateChange((_event, session) => {
      // No async SDK calls inside the auth callback/lock.
      if (cancelled) return;
      accountMatches = session?.user.id === userId;
      if (accountMatches) setGratitudeCacheOwner(userId);
      else forgetGratitudeCacheOwner(userId);
      if (accountMatches) schedule();
      else cancelScheduled();
    });
    schedule();
    window.addEventListener("focus", onReturn);
    window.addEventListener("online", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App")) {
      void App.addListener("appStateChange", ({ isActive }) => { if (isActive) onReturn(); })
        .then(handle => { if (cancelled) void handle.remove(); else listener = handle; })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
      refreshRef.current = () => {};
      cancelScheduled();
      subscription.unsubscribe();
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("online", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
      if (listener) void listener.remove();
      // Invalidate without aborting a read another mounted consumer may share.
      forgetGratitudeCacheOwner(userId);
    };
  }, [userId]);
  useEffect(() => {
    // A date change invalidates data, not the signed-in account epoch. An open
    // yesterday editor can finish safely while today's record is prefetched.
    refreshRef.current();
  }, [userId, localDate]);
}
