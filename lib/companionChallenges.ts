export const COMPANION_CHALLENGE_BADGE_FALLBACK = "/badge_roots_together.webp";

export type CompanionChallengeStatus = {
  hasChallenge: boolean;
  challengeId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  requiredDays: number;
  totalDays: number;
  rewardHearts: number;
  badgeName: string;
  badgeDescription: string | null;
  badgeImagePath: string | null;
  status: "scheduled" | "active" | "completed";
  userCompletedDays: number;
  partnerCompletedDays: number;
  pairCompletedDays: number;
  todayUserCompleted: boolean;
  todayPartnerCompleted: boolean;
  todayPairCompleted: boolean;
  isComplete: boolean;
  awarded: boolean;
  canClaim: boolean;
};

export type CompanionChallengeAwardResult = {
  awarded: boolean;
  alreadyAwarded: boolean;
  challengeId: string;
  challengeTitle: string;
  partnerId: string;
  badgeName: string;
  badgeImagePath: string | null;
  rewardHearts: number;
  pairCompletedDays: number;
  requiredDays: number;
  reason?: string;
};

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value ?? fallback);
  return Number.isFinite(next) ? next : fallback;
}

function toBoolean(value: unknown) {
  return value === true || value === "true";
}

function toObject(data: unknown): Record<string, unknown> | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  return row as Record<string, unknown>;
}

export function normalizeCompanionChallengeStatus(data: unknown): CompanionChallengeStatus | null {
  const row = toObject(data);
  if (!row || row.has_challenge !== true) return null;
  const status = String(row.status ?? "active");

  return {
    hasChallenge: true,
    challengeId: String(row.challenge_id ?? ""),
    title: String(row.title ?? ""),
    description: row.description ? String(row.description) : null,
    startDate: String(row.start_date ?? ""),
    endDate: String(row.end_date ?? ""),
    requiredDays: toNumber(row.required_days, 10),
    totalDays: toNumber(row.total_days, 10),
    rewardHearts: toNumber(row.reward_hearts, 0),
    badgeName: String(row.badge_name ?? row.title ?? ""),
    badgeDescription: row.badge_description ? String(row.badge_description) : null,
    badgeImagePath: row.badge_image_path ? String(row.badge_image_path) : null,
    status: status === "scheduled" || status === "completed" ? status : "active",
    userCompletedDays: toNumber(row.user_completed_days, 0),
    partnerCompletedDays: toNumber(row.partner_completed_days, 0),
    pairCompletedDays: toNumber(row.pair_completed_days, 0),
    todayUserCompleted: toBoolean(row.today_user_completed),
    todayPartnerCompleted: toBoolean(row.today_partner_completed),
    todayPairCompleted: toBoolean(row.today_pair_completed),
    isComplete: toBoolean(row.is_complete),
    awarded: toBoolean(row.awarded),
    canClaim: toBoolean(row.can_claim),
  };
}

export function normalizeCompanionChallengeAwardResult(data: unknown): CompanionChallengeAwardResult | null {
  const row = toObject(data);
  if (!row) return null;

  return {
    awarded: toBoolean(row.awarded),
    alreadyAwarded: toBoolean(row.already_awarded),
    challengeId: String(row.challenge_id ?? ""),
    challengeTitle: String(row.challenge_title ?? ""),
    partnerId: String(row.partner_id ?? ""),
    badgeName: String(row.badge_name ?? row.challenge_title ?? ""),
    badgeImagePath: row.badge_image_path ? String(row.badge_image_path) : null,
    rewardHearts: toNumber(row.reward_hearts, 0),
    pairCompletedDays: toNumber(row.pair_completed_days, 0),
    requiredDays: toNumber(row.required_days, 0),
    reason: row.reason ? String(row.reason) : undefined,
  };
}

export async function recordCompanionChallengeReflectionCompletedBestEffort(
  supabase: any,
  completionDate: string,
  qtRecordId?: string | null,
) {
  if (!completionDate) return null;
  try {
    const { data, error } = await supabase.rpc("record_companion_challenge_completion", {
      p_completion_date: completionDate,
      p_qt_record_id: qtRecordId ?? null,
    });
    if (error) throw error;
    return data ?? null;
  } catch (error) {
    // Companion challenge progress is a reward-layer ledger. It must never block
    // the core Bible Reflection completion/progress/streak flow.
    console.warn("동역자 챌린지 완료일 기록 실패:", error);
    return null;
  }
}

export async function loadCompanionChallengeStatus(
  supabase: any,
  partnerId: string,
  today: string,
) {
  if (!partnerId || !today) return null;
  const { data, error } = await supabase.rpc("get_companion_challenge_status", {
    p_partner_id: partnerId,
    p_today: today,
  });
  if (error) throw error;
  return normalizeCompanionChallengeStatus(data);
}

export async function claimCompanionChallengeReward(
  supabase: any,
  challengeId: string,
  partnerId: string,
) {
  if (!challengeId || !partnerId) return null;
  const { data, error } = await supabase.rpc("claim_companion_challenge_reward", {
    p_challenge_id: challengeId,
    p_partner_id: partnerId,
  });
  if (error) throw error;
  return normalizeCompanionChallengeAwardResult(data);
}

export function companionChallengeProgressPercent(status?: Pick<CompanionChallengeStatus, "pairCompletedDays" | "requiredDays"> | null) {
  if (!status?.requiredDays) return 0;
  return Math.max(0, Math.min(100, Math.round((status.pairCompletedDays / status.requiredDays) * 100)));
}

export function getCompanionChallengeBadgeImageSrc(path?: string | null, fallback = COMPANION_CHALLENGE_BADGE_FALLBACK) {
  const value = String(path ?? "").trim();
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  if (value.startsWith("public/")) return `/${value.slice("public/".length)}`;
  return `/${value.replace(/^\/+/, "")}`;
}
