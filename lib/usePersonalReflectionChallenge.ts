"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase";
import { getLocalDateString } from "@/lib/date";
import { withQtDraftTimeout } from "@/lib/qtDraftSync";
import {
  NOVEMBER_PERSONAL_CHALLENGE_ID,
  acknowledgePersonalChallengeAnnouncement,
  acknowledgePersonalChallengeReward,
  flushPersonalChallengeCompletions,
  getPersonalChallengeCompletionRevision,
  readPersonalChallengeAnnouncementSeen,
  readCachedPersonalChallengeStatus,
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
  hasCard: boolean;
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
    announcementPending: false, ready: false, hasCard: false,
  });
  const [retryToken, setRetryToken] = useState(0);
  const retry = useCallback(() => setRetryToken(value => value + 1), []);

  useEffect(() => {
    if (!userId || !today || !ready) return;
    let cancelled = false;
    let running = false;
    let rerun = false;
    let firstRefresh = true;
    let listener: { remove: () => Promise<void> } | null = null;
    const isCurrent = () => !cancelled && currentScope.current === scope;
    const refresh = async () => {
      if (!isCurrent() || document.visibilityState === "hidden") return;
      if (running) { rerun = true; return; }
      running = true;
      const resetReadiness = firstRefresh;
      firstRefresh = false;
      const cached = readCachedPersonalChallengeStatus(userId, today);
      setSnapshot(previous => {
        const current = previous.scope === scope ? previous : {
          scope, status: cached?.status ?? null, rewards: [], loading: !cached,
          error: false, announcementPending: false, ready: false, hasCard: !!cached,
        };
        return {
          ...current, loading: !current.hasCard, error: false,
          ...(resetReadiness ? { ready: false, rewards: [], announcementPending: false } : {}),
        };
      });
      try {
        const supabase = createClient();
        // The outbox owns original completion dates/offsets. Replaying it later
        // cannot reinterpret yesterday using a new timezone or today's date.
        // Start recovery and the first read together. Only the card can use
        // this first response; automatic popups wait for reconciliation below.
        const recovery = (async () => {
          await withQtDraftTimeout(flushPersonalChallengeCompletions(supabase, userId), 9_000, "personal challenge completion recovery");
          if (!isCurrent()) return;
          if (completedQtRecordId && getLocalDateString() === today) {
            await withQtDraftTimeout(recordPersonalChallengeReflectionCompletedBestEffort(
              supabase, userId, today, completedQtRecordId,
            ), 9_000, "personal challenge same-day recovery");
          }
        })().then(() => ({ error: null }), error => ({ error }));
        let result = await withQtDraftTimeout(syncPersonalChallenge(supabase, userId, today), 9_000, "personal challenge status");
        if (!isCurrent()) return;
        const firstStatus = result.status;
        setSnapshot(previous => previous.scope === scope
          ? {
            ...previous, status: firstStatus, hasCard: true, loading: false, error: false,
            announcementPending: !!firstStatus && previous.status?.challengeId === firstStatus.challengeId
              ? previous.announcementPending : false,
          }
          : previous);
        const recovered = await recovery;
        if (!isCurrent()) return;
        if (recovered.error) throw recovered.error;
        if (result.completionRevision !== getPersonalChallengeCompletionRevision(userId)) {
          result = await withQtDraftTimeout(syncPersonalChallenge(supabase, userId, today), 9_000, "personal challenge recovered status");
        }
        if (!isCurrent()) return;
        // Publish the card/rewards first. The optional campaign receipt read
        // has its own bounded request and cannot delay their display.
        setSnapshot(previous => ({
          scope, status: result.status, rewards: result.rewards,
          loading: false, error: false, ready: true, hasCard: true,
          announcementPending: !!result.status && previous.scope === scope && previous.status?.challengeId === result.status.challengeId
            ? previous.announcementPending : false,
        }));
        const campaign = result.status;
        // The November introduction closes when the challenge starts. The card
        // handles on-demand details throughout the challenge.
        if (campaign && today >= campaign.announcementDate && today <= campaign.endDate
          && (campaign.challengeId !== NOVEMBER_PERSONAL_CHALLENGE_ID || today < campaign.startDate)) {
          try {
            const seen = await withQtDraftTimeout(readPersonalChallengeAnnouncementSeen(
              supabase, userId, campaign.challengeId,
            ), 6_000, "personal challenge announcement");
            if (isCurrent() && seen !== null) {
              setSnapshot(previous => previous.scope === scope && previous.status?.challengeId === campaign.challengeId
                ? { ...previous, announcementPending: seen === false } : previous);
            }
          } catch (error) {
            if (isCurrent()) console.warn("개인 묵상 챌린지 공지 확인 실패:", error);
          }
        }
      } catch (error) {
        if (isCurrent()) {
          console.warn("개인 묵상 챌린지 확인 실패:", error);
          setSnapshot(previous => ({
            ...(previous.scope === scope ? previous : { scope, status: null, rewards: [], announcementPending: false, hasCard: false }),
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
  const cached = userId && today ? readCachedPersonalChallengeStatus(userId, today) : null;
  return {
    status: current?.hasCard ? current.status : cached?.status ?? null,
    rewards: current?.rewards ?? [],
    loading: !current?.hasCard && !cached && (!current || current.loading),
    error: current?.error ?? false,
    ready: current?.ready ?? false,
    announcementPending: current?.announcementPending ?? false,
    retry, acknowledgeAnnouncement, acknowledgeReward,
  };
}
