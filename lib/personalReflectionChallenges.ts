import { storageGet, storageRemove, storageSet } from "@/lib/clientStorage";
import { getLocalDateString } from "@/lib/date";
import { loadUserCampaignSeen, markUserCampaignSeen } from "@/lib/userCampaignImpressions";

export const NOVEMBER_PERSONAL_CHALLENGE_ID = "november-2026-gratitude";
export const PERSONAL_CHALLENGE_BADGE = "/images/personal-challenges/november-2026-gratitude.webp";
export const PERSONAL_CHALLENGE_ANNOUNCEMENT_DATE = "2026-11-05";
export const PERSONAL_CHALLENGE_START_DATE = "2026-11-09";
export const PERSONAL_CHALLENGE_END_DATE = "2026-11-19";

export type PersonalChallengeStatus = {
  challengeId: string;
  title: string;
  announcementDate: string;
  startDate: string;
  endDate: string;
  requiredDays: number;
  rewardHearts: number;
  badgeName: string;
  badgeImagePath: string | null;
  status: "scheduled" | "active" | "completed";
  completedDates: string[];
  completedDays: number;
  consecutiveDays: number;
  hasMissedDay: boolean;
  todayCompleted: boolean;
  isComplete: boolean;
  awarded: boolean;
  canClaim: boolean;
};

export type PersonalChallengeReward = {
  awardId: string;
  challengeId: string;
  challengeTitle: string;
  badgeName: string;
  badgeImagePath: string | null;
  rewardHearts: number;
  awardedAt: string;
};

type CompletionProof = {
  userId: string;
  completionDate: string;
  qtRecordId: string;
  utcOffsetMinutes: number;
};
export type PersonalChallengeCompletionContext = {
  userId: string;
  completionDate: string;
  utcOffsetMinutes: number;
  capturedAt: string;
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RPC_TIMEOUT_MS = 7_000;
// Keep the account UUID first in every new storage key. Existing account
// deletion already understands this prefix and preserves other accounts.
function localKey(userId: string, kind: string, id = "") {
  return `roots_campaign_seen_${userId}_personal_${kind}${id ? `_${id}` : ""}`;
}
function announcementCampaignKey(challengeId: string) {
  return `personal_reflection_announcement_${challengeId}`;
}

/** Capture before the existing final save can wait on the network. */
export function capturePersonalChallengeCompletion(userId: string, completionDate: string): PersonalChallengeCompletionContext | null {
  if (!userId || !DATE.test(completionDate) || completionDate < PERSONAL_CHALLENGE_START_DATE
    || completionDate > PERSONAL_CHALLENGE_END_DATE || completionDate !== getLocalDateString()) return null;
  const now = new Date();
  return { userId, completionDate, utcOffsetMinutes: now.getTimezoneOffset(), capturedAt: now.toISOString() };
}
function validCapturedContext(context: PersonalChallengeCompletionContext | null | undefined, userId: string, completionDate: string): context is PersonalChallengeCompletionContext {
  if (!context || context.userId !== userId || context.completionDate !== completionDate
    || !Number.isInteger(context.utcOffsetMinutes) || Math.abs(context.utcOffsetMinutes) > 840) return false;
  const capturedAt = Date.parse(context.capturedAt);
  if (!Number.isFinite(capturedAt)) return false;
  // Reconstruct using the captured offset rather than the device's timezone
  // after a slow request, midnight, daylight-saving change, or app resume.
  return new Date(capturedAt - context.utcOffsetMinutes * 60_000).toISOString().slice(0, 10) === completionDate;
}
const completionMemory = new Map<string, CompletionProof[]>();
const confirmedCompletionMemory = new Set<string>();
const acknowledgementMemory = new Set<string>();
const rewardAckMemory = new Map<string, string[]>();
const completionFlushes = new Map<string, Promise<void>>();
const rewardAckRequests = new Map<string, Promise<boolean>>();
const announcementAckRequests = new Map<string, Promise<boolean>>();

function toObject(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value;
  return row && typeof row === "object" ? row as Record<string, unknown> : null;
}
function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function toBoolean(value: unknown) { return value === true || value === "true"; }

export function normalizePersonalChallengeStatus(value: unknown): PersonalChallengeStatus | null {
  const row = toObject(value);
  if (!row || row.has_challenge !== true || !row.challenge_id) return null;
  const requiredDays = Math.max(1, toNumber(row.required_days, 11));
  const dates = Array.isArray(row.completed_dates)
    ? Array.from(new Set(row.completed_dates.filter((date): date is string => typeof date === "string" && DATE.test(date)))).sort()
    : [];
  return {
    challengeId: String(row.challenge_id), title: String(row.title ?? ""),
    announcementDate: String(row.announcement_date ?? ""), startDate: String(row.start_date ?? ""), endDate: String(row.end_date ?? ""),
    requiredDays, rewardHearts: Math.max(0, toNumber(row.reward_hearts)),
    badgeName: String(row.badge_name ?? row.title ?? ""),
    badgeImagePath: row.badge_image_path ? String(row.badge_image_path) : null,
    status: row.status === "scheduled" ? "scheduled" : row.status === "completed" ? "completed" : "active",
    completedDates: dates, completedDays: Math.max(0, Math.min(requiredDays, toNumber(row.completed_days, dates.length))),
    consecutiveDays: Math.max(0, Math.min(requiredDays, toNumber(row.consecutive_days, row.completed_days === undefined ? dates.length : toNumber(row.completed_days)))),
    hasMissedDay: toBoolean(row.has_missed_day), todayCompleted: toBoolean(row.today_completed),
    isComplete: toBoolean(row.is_complete), awarded: toBoolean(row.awarded), canClaim: toBoolean(row.can_claim),
  };
}

export function normalizePersonalChallengeRewards(value: unknown): PersonalChallengeReward[] {
  const rows = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  return rows.flatMap(value => {
    const row = toObject(value);
    const awardId = String(row?.award_id ?? row?.id ?? "");
    const challengeId = String(row?.challenge_id ?? "");
    if (!row || !UUID.test(awardId) || !challengeId || seen.has(awardId)) return [];
    seen.add(awardId);
    return [{
      awardId, challengeId, challengeTitle: String(row.challenge_title ?? row.title ?? ""),
      badgeName: String(row.badge_name ?? row.challenge_title ?? ""),
      badgeImagePath: row.badge_image_path ? String(row.badge_image_path) : null,
      rewardHearts: Math.max(0, toNumber(row.reward_hearts ?? row.hearts_awarded)),
      awardedAt: String(row.awarded_at ?? ""),
    }];
  });
}

async function bounded<T>(promise: PromiseLike<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out`)), RPC_TIMEOUT_MS); }),
    ]);
  } finally { if (timer !== undefined) clearTimeout(timer); }
}

async function rpc(supabase: any, name: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const controller = new AbortController();
  try {
    const query = supabase.rpc(name, params);
    const request = typeof query?.abortSignal === "function" ? query.abortSignal(controller.signal) : query;
    const result: any = await bounded(request, name);
    if (result?.error) throw result.error;
    return result?.data ?? null;
  } finally { controller.abort(); }
}

function readArray(key: string): unknown[] {
  const raw = storageGet(key);
  if (!raw || raw.length > 200_000) return [];
  try { const value = JSON.parse(raw); return Array.isArray(value) ? value.slice(0, 128) : []; }
  catch { return []; }
}
function proofId(proof: CompletionProof) { return `${proof.completionDate}_${proof.qtRecordId}`; }
function proofKey(proof: CompletionProof) { return localKey(proof.userId, "completion_recorded", proofId(proof)); }
function completionConfirmed(proof: CompletionProof) {
  const key = proofKey(proof);
  return confirmedCompletionMemory.has(key) || storageGet(key) === "true";
}
function readCompletionProofs(userId: string): CompletionProof[] {
  const values = [...readArray(localKey(userId, "completion_outbox")), ...(completionMemory.get(userId) ?? [])];
  const seen = new Set<string>();
  const result: CompletionProof[] = [];
  for (const value of values) {
    if (!value || typeof value !== "object") continue;
    const proof = value as CompletionProof;
    if (proof.userId !== userId || !DATE.test(String(proof.completionDate)) || !UUID.test(String(proof.qtRecordId))
      || !Number.isInteger(proof.utcOffsetMinutes) || Math.abs(proof.utcOffsetMinutes) > 840) continue;
    const id = proofId(proof);
    if (!seen.has(id) && !completionConfirmed(proof)) { result.push(proof); seen.add(id); }
  }
  return result.slice(0, 128);
}
function saveCompletionProofs(userId: string, proofs: CompletionProof[]) {
  completionMemory.set(userId, proofs);
  const key = localKey(userId, "completion_outbox");
  if (proofs.length) storageSet(key, JSON.stringify(proofs)); else storageRemove(key);
}
const PERMANENT_COMPLETION_REJECTIONS = new Set([
  "missing_completion_date", "missing_qt_record_id", "invalid_utc_offset", "outside_challenge",
  "reflection_not_found", "not_completed", "not_same_local_day", "completion_in_future",
]);

/** Replay the original date and UTC offset, even after midnight or a restart. */
export function flushPersonalChallengeCompletions(supabase: any, userId: string): Promise<void> {
  if (!userId) return Promise.resolve();
  const existing = completionFlushes.get(userId);
  if (existing) return existing;
  const operation = (async () => {
    const attempted = new Set<string>();
    while (true) {
      const proof = readCompletionProofs(userId).find(candidate => !attempted.has(proofId(candidate)));
      if (!proof) return;
      const identity = proofId(proof);
      attempted.add(identity);
      try {
        const result = toObject(await rpc(supabase, "record_personal_challenge_completion", {
          p_completion_date: proof.completionDate, p_qt_record_id: proof.qtRecordId,
          p_utc_offset_minutes: proof.utcOffsetMinutes, p_expected_user_id: userId,
        }));
        if (result?.recorded === true) {
          const key = proofKey(proof);
          confirmedCompletionMemory.add(key);
          storageSet(key, "true");
        } else if (!PERMANENT_COMPLETION_REJECTIONS.has(String(result?.reason ?? ""))) {
          // An unavailable session or an unknown reply is retryable. Do not
          // consume the source proof or delay Home with many failing calls.
          return;
        }
        saveCompletionProofs(userId, readCompletionProofs(userId).filter(candidate => proofId(candidate) !== identity));
      } catch (error) {
        console.warn("개인 묵상 챌린지 완료일 기록 재시도 대기:", error);
        return;
      }
    }
  })();
  completionFlushes.set(userId, operation);
  const settled = operation.finally(() => { if (completionFlushes.get(userId) === operation) completionFlushes.delete(userId); });
  return settled;
}

/** Call after a successful completion; no asynchronous work precedes its local receipt. */
export async function recordPersonalChallengeReflectionCompletedBestEffort(
  supabase: any, userId: string, completionDate: string, qtRecordId?: string | null,
  capturedContext?: PersonalChallengeCompletionContext | null,
): Promise<boolean> {
  if (!userId || !qtRecordId || !UUID.test(qtRecordId) || completionDate < PERSONAL_CHALLENGE_START_DATE
    || completionDate > PERSONAL_CHALLENGE_END_DATE || !DATE.test(completionDate)) return false;
  const pending = readCompletionProofs(userId).find(proof => proof.completionDate === completionDate && proof.qtRecordId === qtRecordId);
  const captured = validCapturedContext(capturedContext, userId, completionDate) ? capturedContext : null;
  const proof: CompletionProof = pending ?? { userId, completionDate, qtRecordId, utcOffsetMinutes: captured?.utcOffsetMinutes ?? new Date().getTimezoneOffset() };
  if (completionConfirmed(proof)) return true;
  if (!pending) {
    if (!captured && completionDate !== getLocalDateString()) return false;
    // Store before the first await, and never replace a previous attempt's
    // offset with the timezone used later by Home or another app session.
    saveCompletionProofs(userId, [...readCompletionProofs(userId), proof]);
  }
  await flushPersonalChallengeCompletions(supabase, userId);
  return completionConfirmed(proof);
}

function rewardSeen(userId: string, awardId: string) {
  const key = localKey(userId, "reward_seen", awardId);
  return acknowledgementMemory.has(key) || storageGet(key) === "true";
}
function readRewardAcknowledgements(userId: string) {
  return Array.from(new Set([
    ...readArray(localKey(userId, "reward_ack_outbox")), ...(rewardAckMemory.get(userId) ?? []),
  ].filter((id): id is string => typeof id === "string" && UUID.test(id))));
}
function saveRewardAcknowledgements(userId: string, ids: string[]) {
  rewardAckMemory.set(userId, ids);
  const key = localKey(userId, "reward_ack_outbox");
  if (ids.length) storageSet(key, JSON.stringify(ids)); else storageRemove(key);
}
function retryRewardAcknowledgement(supabase: any, userId: string, awardId: string): Promise<boolean> {
  const identity = `${userId}:${awardId}`;
  const existing = rewardAckRequests.get(identity);
  if (existing) return existing;
  const operation = (async () => {
    try {
      await rpc(supabase, "mark_personal_challenge_reward_seen", { p_award_id: awardId, p_expected_user_id: userId });
      saveRewardAcknowledgements(userId, readRewardAcknowledgements(userId).filter(id => id !== awardId));
      return true;
    } catch { return false; }
  })();
  rewardAckRequests.set(identity, operation);
  void operation.finally(() => { if (rewardAckRequests.get(identity) === operation) rewardAckRequests.delete(identity); });
  return operation;
}
function retryRewardAcknowledgements(supabase: any, userId: string) {
  readRewardAcknowledgements(userId).forEach(id => { void retryRewardAcknowledgement(supabase, userId, id); });
}
function visibleRewards(supabase: any, userId: string, value: unknown) {
  retryRewardAcknowledgements(supabase, userId);
  return normalizePersonalChallengeRewards(value).filter(reward => !rewardSeen(userId, reward.awardId));
}

export async function acknowledgePersonalChallengeReward(supabase: any, userId: string, reward: Pick<PersonalChallengeReward, "awardId">): Promise<boolean> {
  if (!userId || !UUID.test(reward.awardId)) return false;
  const key = localKey(userId, "reward_seen", reward.awardId);
  acknowledgementMemory.add(key);
  storageSet(key, "true");
  saveRewardAcknowledgements(userId, Array.from(new Set([...readRewardAcknowledgements(userId), reward.awardId])));
  return retryRewardAcknowledgement(supabase, userId, reward.awardId);
}

export async function loadPersonalChallengeStatus(supabase: any, today: string): Promise<PersonalChallengeStatus | null> {
  if (!DATE.test(today)) return null;
  return normalizePersonalChallengeStatus(await rpc(supabase, "get_personal_challenge_status", { p_today: today }));
}
export async function claimPersonalChallengeRewards(supabase: any, today: string): Promise<PersonalChallengeReward[]> {
  if (!DATE.test(today)) return [];
  return normalizePersonalChallengeRewards(await rpc(supabase, "claim_personal_challenge_rewards", { p_today: today }));
}
export async function loadUnseenPersonalChallengeRewards(supabase: any, userId: string): Promise<PersonalChallengeReward[]> {
  if (!userId) return [];
  return visibleRewards(supabase, userId, await rpc(supabase, "get_unseen_personal_challenge_rewards", { p_expected_user_id: userId }));
}
export async function loadPersonalChallengeBadges(supabase: any, userId?: string): Promise<PersonalChallengeReward[]> {
  if (!userId) return [];
  return normalizePersonalChallengeRewards(await rpc(supabase, "get_personal_challenge_badges", { p_expected_user_id: userId }));
}
export async function syncPersonalChallenge(supabase: any, userId: string, today: string): Promise<{ status: PersonalChallengeStatus | null; rewards: PersonalChallengeReward[] }> {
  if (!userId || !DATE.test(today)) return { status: null, rewards: [] };
  const data = toObject(await rpc(supabase, "sync_personal_challenge", { p_today: today, p_expected_user_id: userId }));
  return { status: normalizePersonalChallengeStatus(data?.status), rewards: visibleRewards(supabase, userId, data?.rewards) };
}

function announcementKeys(userId: string, challengeId: string) {
  const seen = localKey(userId, "announcement_seen", challengeId);
  return { seen, pending: `${seen}_pending` };
}
function retryAnnouncementAcknowledgement(supabase: any, userId: string, challengeId: string): Promise<boolean> {
  const key = announcementKeys(userId, challengeId);
  if (!storageGet(key.pending) && !acknowledgementMemory.has(key.pending)) return Promise.resolve(true);
  const identity = `${userId}:${challengeId}`;
  const existing = announcementAckRequests.get(identity);
  if (existing) return existing;
  const operation = (async () => {
    try {
      await bounded(markUserCampaignSeen(supabase, userId, announcementCampaignKey(challengeId)), "personal announcement confirmation");
      acknowledgementMemory.delete(key.pending);
      storageRemove(key.pending);
      return true;
    } catch { return false; }
  })();
  announcementAckRequests.set(identity, operation);
  void operation.finally(() => { if (announcementAckRequests.get(identity) === operation) announcementAckRequests.delete(identity); });
  return operation;
}

/** Merely displaying either popup never confirms an announcement or a reward. */
export async function readPersonalChallengeAnnouncementSeen(supabase: any, userId: string, challengeId: string): Promise<boolean | null> {
  if (!userId || !challengeId) return null;
  const key = announcementKeys(userId, challengeId);
  if (acknowledgementMemory.has(key.seen) || storageGet(key.seen)) {
    void retryAnnouncementAcknowledgement(supabase, userId, challengeId);
    return true;
  }
  const seen = await bounded(loadUserCampaignSeen(supabase, userId, announcementCampaignKey(challengeId)), "personal announcement state");
  if (acknowledgementMemory.has(key.seen) || storageGet(key.seen)) return true;
  if (seen === true) {
    acknowledgementMemory.add(key.seen);
    storageSet(key.seen, "true");
    acknowledgementMemory.delete(key.pending);
    storageRemove(key.pending);
  }
  return seen;
}
export async function acknowledgePersonalChallengeAnnouncement(supabase: any, userId: string, challengeId: string): Promise<boolean> {
  if (!userId || !challengeId) return false;
  const key = announcementKeys(userId, challengeId);
  acknowledgementMemory.add(key.seen);
  acknowledgementMemory.add(key.pending);
  storageSet(key.seen, "true");
  storageSet(key.pending, "true");
  return retryAnnouncementAcknowledgement(supabase, userId, challengeId);
}
