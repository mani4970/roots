"use client";

import { useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase";
import {
  claimAdventGift, getAdventDay, getAdventSeason, loadAdventCalendar, recordAdventCompletion,
  type AdventCalendarData, type AdventReward,
} from "@/lib/adventCalendar";

type Panel = { scope: string; kind: "calendar" } | {
  scope: string; kind: "gift"; day: number; reward: AdventReward;
};
type DayRequest = { scope: string; day: number };

const EMPTY_DAYS: ReadonlySet<number> = new Set();
const EMPTY_REWARDS: ReadonlyMap<number, AdventReward> = new Map();

export function useAdventCalendar(
  userId: string | null,
  date: string,
  completedQtRecordId: string | null,
) {
  const season = getAdventSeason(date);
  const day = getAdventDay(date) ?? 0;
  const scope = userId && season !== "inactive" ? `${userId}:${date}` : "";
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [data, setData] = useState<{ scope: string; calendar: AdventCalendarData } | null>(null);
  const [readError, setReadError] = useState("");
  const [readVersion, setReadVersion] = useState(0);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [claimError, setClaimError] = useState<DayRequest | null>(null);
  const [pendingClaim, setPendingClaim] = useState<DayRequest | null>(null);
  const claimRequest = useRef<DayRequest | null>(null);
  const calendar = data?.scope === scope ? data.calendar : null;
  const activePanel = panel?.scope === scope ? panel : null;
  const studied = calendar?.studiedDays ?? EMPTY_DAYS;
  const claimed = calendar?.claimedRewards ?? EMPTY_REWARDS;

  useEffect(() => {
    if (!scope || season !== "open" || !userId) return;
    let cancelled = false;
    let reading = false;
    let requestedAgain = false;
    let nativeListener: { remove: () => Promise<void> } | null = null;
    const isCurrent = () => !cancelled && currentScope.current === scope;

    const refresh = async () => {
      if (!isCurrent() || document.visibilityState === "hidden") return;
      if (reading) { requestedAgain = true; return; }
      reading = true;
      setReadError("");
      try {
        const supabase = createClient();
        const result = await loadAdventCalendar(supabase, userId);
        if (!isCurrent()) return;
        if (result.localDate !== date) { setReadError(scope); return; }
        setData(previous => ({
          scope,
          calendar: previous?.scope === scope ? {
            ...result,
            studiedDays: new Set([...result.studiedDays, ...previous.calendar.studiedDays]),
            claimedRewards: new Map([...result.claimedRewards, ...previous.calendar.claimedRewards]),
          } : result,
        }));
        // Recover a same-day saved reflection if the app closed before the
        // optional completion hook reached the Advent ledger.
        if (completedQtRecordId && !result.studiedDays.has(day)
          && await recordAdventCompletion(supabase, userId, date, completedQtRecordId) && isCurrent()) {
          setData(previous => previous?.scope === scope ? {
            scope,
            calendar: { ...previous.calendar, studiedDays: new Set(previous.calendar.studiedDays).add(day) },
          } : previous);
        }
      } catch {
        if (isCurrent()) setReadError(scope);
      } finally {
        reading = false;
        if (requestedAgain && isCurrent()) { requestedAgain = false; void refresh(); }
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App")) {
      void App.addListener("appStateChange", ({ isActive }) => { if (isActive) void refresh(); })
        .then(listener => { if (cancelled) void listener.remove(); else nativeListener = listener; })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      if (nativeListener) void nativeListener.remove();
    };
  }, [scope, date, day, season, userId, completedQtRecordId, readVersion]);

  function open() {
    if (!scope) return;
    setClaimError(null);
    setPanel({ scope, kind: "calendar" });
    if (season === "open") setReadVersion(value => value + 1);
  }

  function close() { setPanel(null); }

  function closeGift() {
    if (activePanel?.kind !== "gift") return;
    if (activePanel.reward.type === "hearts" || activePanel.reward.type === "verse") {
      close();
      return;
    }
    setPanel({ scope, kind: "calendar" });
  }

  async function claim(dayToClaim: number) {
    if (!scope || !userId || season !== "open" || dayToClaim > day || claimRequest.current?.scope === scope) return;
    const existing = claimed.get(dayToClaim);
    if (existing) {
      setPanel({ scope, kind: "gift", day: dayToClaim, reward: existing });
      return;
    }
    if (!studied.has(dayToClaim)) return;
    const request = { scope, day: dayToClaim };
    claimRequest.current = request;
    setPendingClaim(request);
    setClaimError(null);
    try {
      const { reward } = await claimAdventGift(createClient(), userId, dayToClaim);
      if (currentScope.current !== scope) return;
      setData(previous => previous?.scope === scope ? {
        scope,
        calendar: {
          ...previous.calendar,
          claimedRewards: new Map(previous.calendar.claimedRewards).set(dayToClaim, reward),
        },
      } : previous);
      setPanel({ scope, kind: "gift", day: dayToClaim, reward });
    } catch {
      if (currentScope.current === scope) setClaimError(request);
    } finally {
      if (claimRequest.current === request) claimRequest.current = null;
      setPendingClaim(previous => previous === request ? null : previous);
    }
  }

  const failedClaimDay = claimError?.scope === scope ? claimError.day : null;
  const error = failedClaimDay !== null ? "claim" : !calendar && scope && readError === scope ? "load" : null;
  const retry = () => {
    if (failedClaimDay !== null) void claim(failedClaimDay);
    else setReadVersion(value => value + 1);
  };
  return {
    visible: !!scope, teaser: season === "teaser", day, studied, claimed,
    panel: activePanel, open, close, closeGift, claim, retry, error,
    loading: season === "open" && !calendar && error !== "load",
    pendingClaimDay: pendingClaim?.scope === scope ? pendingClaim.day : null,
    hasUnopened: season === "open" && [...studied].some(value => value <= day && !claimed.has(value)),
  } as const;
}
