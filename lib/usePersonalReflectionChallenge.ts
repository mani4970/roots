"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase";
import { getLocalDateString } from "@/lib/date";
import { withQtDraftTimeout } from "@/lib/qtDraftSync";
import {
  acknowledgePersonalChallengeAnnouncement,
  acknowledgePersonalChallengeReward,
  flushPersonalChallengeCompletions,
  readPersonalChallengeAnnouncementSeen,
  recordPersonalChallengeReflectionCompletedBestEffort,
  syncPersonalChallenge,
  type PersonalChallengeReward,
  type PersonalChallengeStatus,
} from "@/lib/personalReflectionChallenges";

type Snapshot = {
  scope: string;
  status: PersonalChallengeStatus | null;
  rewards: PersonalChallengeReward[];
  loading: boolean;
  error: boolean;
  announcementPending: boolean;
  ready: boolean;
};

/** Optional campaign state never participates in core Home/progress readiness. */
export function usePersonalReflectionChallenge({ userId, today, ready, completedQtRecordId }: {
  userId: string | null;
  today: string;
  ready: boolean;
  completedQtRecordId: string | null;
}) {
  const scope = userId && today ? `${userId}:${today}` : "";
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [snapshot, setSnapshot] = useState<Snapshot>({
    scope: "", status: null, rewards: [], loading: true, error: false,
    announcementPending: false, ready: false,
  });
  const [retryToken, setRetryToken] = useState(0);
  const retry = useCallback(() => setRetryToken(value => value + 1), []);

  useEffect(() => {
    if (!userId || !today || !ready) return;
    let cancelled = false;
    let running = false;
    let rerun = false;
    let listener: { remove: () => Promise<void> } | null = null;
    const isCurrent = () => !cancelled && currentScope.current === scope;
    const refresh = async () => {
      if (!isCurrent() || document.visibilityState === "hidden") return;
      if (running) { rerun = true; return; }
      running = true;
      setSnapshot(previous => previous.scope === scope
        ? { ...previous, loading: !previous.ready }
        : { scope, status: null, rewards: [], loading: true, error: false, announcementPending: false, ready: false });
      try {
        const supabase = createClient();
        // The outbox owns original completion dates/offsets. Replaying it later
        // cannot reinterpret yesterday using a new timezone or today's date.
        await withQtDraftTimeout(flushPersonalChallengeCompletions(supabase, userId), 9_000, "personal challenge completion recovery");
        if (!isCurrent()) return;
        if (completedQtRecordId && getLocalDateString() === today) {
          await withQtDraftTimeout(recordPersonalChallengeReflectionCompletedBestEffort(
            supabase, userId, today, completedQtRecordId,
          ), 9_000, "personal challenge same-day recovery");
        }
        if (!isCurrent()) return;
        const result = await withQtDraftTimeout(syncPersonalChallenge(supabase, userId, today), 9_000, "personal challenge status");
        if (!isCurrent()) return;
        // Publish the card/rewards first. The optional campaign receipt read
        // has its own bounded request and cannot delay their display.
        setSnapshot(previous => ({
          scope, status: result.status, rewards: result.rewards,
          loading: false, error: false, ready: true,
          announcementPending: previous.scope === scope && previous.status?.challengeId === result.status?.challengeId
            ? previous.announcementPending : false,
        }));
        const campaign = result.status;
        if (campaign && today >= campaign.announcementDate && today <= campaign.endDate) {
          const seen = await withQtDraftTimeout(readPersonalChallengeAnnouncementSeen(
            supabase, userId, campaign.challengeId,
          ), 6_000, "personal challenge announcement");
          if (isCurrent() && seen !== null) {
            setSnapshot(previous => previous.scope === scope && previous.status?.challengeId === campaign.challengeId
              ? { ...previous, announcementPending: seen === false } : previous);
          }
        }
      } catch (error) {
        if (isCurrent()) {
          console.warn("개인 묵상 챌린지 확인 실패:", error);
          setSnapshot(previous => ({
            ...(previous.scope === scope ? previous : { scope, status: null, rewards: [], announcementPending: false }),
            loading: false, error: true, ready: true,
          }));
        }
      } finally {
        running = false;
        if (rerun && isCurrent()) { rerun = false; void refresh(); }
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App")) {
      void App.addListener("appStateChange", ({ isActive }) => { if (isActive) void refresh(); })
        .then(handle => { if (cancelled) void handle.remove(); else listener = handle; })
        .catch(error => console.warn("개인 챌린지 복귀 확인 등록 실패:", error));
    }
    return () => {
      cancelled = true;
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      if (listener) void listener.remove();
    };
  }, [userId, today, ready, completedQtRecordId, retryToken, scope]);

  const acknowledgeAnnouncement = useCallback(() => {
    if (!userId || snapshot.scope !== scope || !snapshot.status) return;
    const campaignId = snapshot.status.challengeId;
    // Helpers persist the local receipt before their first asynchronous write.
    void acknowledgePersonalChallengeAnnouncement(createClient(), userId, campaignId);
    setSnapshot(previous => previous.scope === scope ? { ...previous, announcementPending: false } : previous);
  }, [userId, scope, snapshot.scope, snapshot.status]);

  const acknowledgeReward = useCallback((reward: PersonalChallengeReward) => {
    if (!userId || snapshot.scope !== scope) return;
    void acknowledgePersonalChallengeReward(createClient(), userId, reward);
    setSnapshot(previous => previous.scope === scope
      ? { ...previous, rewards: previous.rewards.filter(row => row.awardId !== reward.awardId) }
      : previous);
  }, [userId, scope, snapshot.scope]);

  const current = snapshot.scope === scope ? snapshot : null;
  return {
    status: current?.status ?? null,
    rewards: current?.rewards ?? [],
    loading: !current || current.loading,
    error: current?.error ?? false,
    ready: current?.ready ?? false,
    announcementPending: current?.announcementPending ?? false,
    retry, acknowledgeAnnouncement, acknowledgeReward,
  };
}
