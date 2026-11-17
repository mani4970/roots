"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { countGratitudeEntries, GratitudeError } from "@/lib/gratitude";
import { clearGratitudeCount, invalidateGratitudeCount, readCachedGratitudeCount, refreshCachedGratitudeCount } from "@/lib/gratitudeCountCache";
import { createClient } from "@/lib/supabase";

const subscribeToClient = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Counts saved dates only; it is independent of reflection progress and streaks. */
export function useGratitudeCount(userId: string | null) {
  const clientReady = useSyncExternalStore(subscribeToClient, clientSnapshot, serverSnapshot);
  const [snapshot, setSnapshot] = useState<{ userId: string; days: number | null } | null>(null);
  const refreshRef = useRef<() => void>(() => {});
  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    let cancelled = false;
    let accountMatches = true;
    let generation = 0;
    let lastReturn = 0;
    let authTimer: ReturnType<typeof setTimeout> | undefined;
    let listener: { remove: () => Promise<void> } | null = null;
    refreshRef.current = () => {};
    if (!userId) {
      setSnapshot(null);
      return;
    }
    setSnapshot({ userId, days: readCachedGratitudeCount(userId)?.days ?? null });

    const read = async (force = false) => {
      if (cancelled || !accountMatches) return;
      const request = ++generation;
      try {
        const cached = await refreshCachedGratitudeCount(userId, () => countGratitudeEntries(userId), { force });
        if (!cancelled && accountMatches && request === generation && cached) {
          setSnapshot({ userId, days: cached.days });
        }
      } catch (error) {
        if (cancelled || request !== generation) return;
        // An ordinary timeout/offline error retains the last verified count.
        // An account/session error must not retain that account's display.
        if (error instanceof GratitudeError && error.code === "auth") {
          clearGratitudeCount(userId);
          setSnapshot({ userId, days: null });
        }
      }
    };
    const onReturn = () => {
      if (cancelled || !accountMatches || document.visibilityState !== "visible") return;
      const now = Date.now();
      // Native resume can emit focus, visibility and appStateChange together.
      if (now - lastReturn < 1000) return;
      lastReturn = now;
      void read(true);
    };
    refreshRef.current = () => {
      if (cancelled || !accountMatches) return;
      // Called only after a successful save/delete. A pre-write read must not
      // publish its older result or be reused for this post-write refresh.
      invalidateGratitudeCount(userId);
      void read(true);
    };
    const { data: { subscription } } = createClient().auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const previouslyMatched = accountMatches;
      accountMatches = session?.user.id === userId;
      if (!accountMatches) {
        ++generation;
        clearTimeout(authTimer);
        clearGratitudeCount(userId);
        setSnapshot({ userId, days: null });
      } else if (!previouslyMatched) {
        // Keep SDK work outside its synchronous auth callback/lock.
        authTimer = setTimeout(() => { void read(); }, 0);
      }
    });
    void read();
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
      clearTimeout(authTimer);
      subscription.unsubscribe();
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("online", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
      if (listener) void listener.remove();
      // The count cache intentionally survives Home unmounts.
    };
  }, [userId]);

  // Home obtains its profile after mounting: restore the correct owner's count
  // during that first render, rather than waiting for the effect/network.
  const days = !clientReady || !userId ? null : snapshot?.userId === userId
    ? snapshot.days : readCachedGratitudeCount(userId)?.days ?? null;
  return { days, refresh };
}
