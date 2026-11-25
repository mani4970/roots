import { recordActivityBadgeAwards } from "@/lib/activityBadgePresentations";
import { beginObservation, observe, observationError, type ObservationFlow } from "@/lib/appObservation";
import { createAnsweredPrayerNotificationsBestEffort } from "@/lib/notifications/create";
import { checkAndAwardAnsweredPrayerBadge } from "@/lib/rewardBadges";
import { createClient } from "@/lib/supabase";

export type PrayerTestimonyTarget = {
  id: string;
  user_id: string;
  is_answered?: boolean | null;
  visibility?: string | null;
};

export type PrayerTestimonyAttempt = {
  mode: "answer";
  recordId: string;
  flow: ObservationFlow | null;
  attempt: number;
  failed: boolean;
};

type SaveOptions = {
  prayer: PrayerTestimonyTarget;
  testimony: string;
  userId: string | null | undefined;
  source: "prayer_popup" | "prayer_page";
  previousAttempt?: PrayerTestimonyAttempt | null;
  onRefresh?: (attempt: PrayerTestimonyAttempt) => Promise<void>;
};

export async function savePrayerTestimony({ prayer, testimony, userId, source, previousAttempt, onRefresh }: SaveOptions) {
  const retry = previousAttempt?.failed && previousAttempt.recordId === prayer.id && previousAttempt.flow?.userId === userId;
  const attempt: PrayerTestimonyAttempt = {
    mode: "answer",
    recordId: prayer.id,
    flow: retry ? previousAttempt.flow : beginObservation("prayer", userId, { mode: "answer", source }),
    attempt: retry ? previousAttempt.attempt + 1 : 1,
    failed: false,
  };
  const details = { mode: attempt.mode, source, attempt: attempt.attempt };
  const awardedBadges: string[] = [];

  function event(name: string, phase: string, extra: Record<string, string | boolean | number | null> = {}) {
    observe(attempt.flow, name, { ...details, phase, ...extra }, prayer.id);
  }
  function failure(phase: string, error: unknown, reason?: string) {
    attempt.failed = true;
    event("action_failed", phase, { ...observationError(error), persisted: false, ...(reason ? { reason } : {}) });
    return { ok: false, attempt, awardedBadges };
  }
  if (retry) event("retry_clicked", "auth");
  event("action_started", "auth");

  const text = testimony.trim();
  if (!text || !userId || !prayer.id || userId !== prayer.user_id || prayer.is_answered) {
    return failure("auth", null, "validation_failed");
  }
  let supabase: ReturnType<typeof createClient>;
  let phase = "auth";
  let visibility: string | null;
  try {
    supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || user?.id !== userId) return failure(phase, authError, "validation_failed");
    phase = "body";
    event("stage_started", phase);
    const { data, error } = await supabase.from("prayer_items").update({
      is_answered: true, testimony: text, answered_at: new Date().toISOString(),
    }).eq("id", prayer.id).eq("user_id", userId).or("is_answered.eq.false,is_answered.is.null")
      .select("id,visibility").single();
    if (error || !data) return failure(phase, error, error ? undefined : "missing_saved_row");
    visibility = data.visibility ?? null;
  } catch (error) {
    return failure(phase, error);
  }
  event("stage_succeeded", "body", { persisted: true });

  // The answer is committed. Failures in these independent follow-ups must never
  // ask the author to submit the same testimony again.
  try {
    const { data: recipientRows, error: recipientError } = await supabase.from("prayer_item_recipients")
      .select("recipient_id").eq("prayer_item_id", prayer.id).eq("owner_id", userId);
    if (recipientError) event("stage_failed", "notifications", observationError(recipientError));
    await createAnsweredPrayerNotificationsBestEffort({
      prayerItemId: prayer.id, visibility,
      partnerRecipientIds: (recipientRows ?? []).map(row => String(row.recipient_id)).filter(Boolean),
    });
  } catch (error) {
    event("stage_failed", "notifications", observationError(error));
    console.warn("기도 응답 알림 생성 실패:", error);
  }

  try {
    const { data, error } = await supabase.rpc("award_own_noah_badge", {
      p_user_id: userId, p_prayer_item_id: prayer.id,
    });
    if (error) throw error;
    if (data?.awarded === true) {
      recordActivityBadgeAwards(supabase, userId, ["badge_noah"]);
      awardedBadges.push("badge_noah");
    }
  } catch (error) {
    event("stage_failed", "badge", observationError(error));
    console.warn("노아 배지를 저장하지 못했어요:", error);
  }
  try {
    const awarded = await checkAndAwardAnsweredPrayerBadge(supabase, userId);
    if (awarded) awardedBadges.push(awarded);
  } catch (error) {
    event("stage_failed", "badge", observationError(error));
    console.warn("기도 응답 보상 배지 확인 실패:", error);
  }
  if (onRefresh) {
    try {
      await onRefresh(attempt);
    } catch (error) {
      event("stage_failed", "refresh", observationError(error));
      console.warn("기도 목록 갱신 실패:", error);
    }
  }
  event("action_completed", "body", { persisted: true });
  return { ok: true, attempt, awardedBadges };
}
