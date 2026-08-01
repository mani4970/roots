export type ChallengeRewardKind = "companion" | "group";

export type ChallengeReward = {
  kind: ChallengeRewardKind;
  awardId: string;
  challengeId: string;
  challengeTitle: string;
  badgeName: string;
  badgeImagePath: string | null;
  groupName: string;
  companionName: string;
  rewardHearts: number;
};

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value ?? fallback);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeChallengeReward(value: unknown): ChallengeReward | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const kind = row.reward_type === "companion" ? "companion" : row.reward_type === "group" ? "group" : null;
  const awardId = String(row.award_id ?? "").trim();
  const challengeId = String(row.challenge_id ?? "").trim();

  if (!kind || !awardId || !challengeId) return null;

  return {
    kind,
    awardId,
    challengeId,
    challengeTitle: String(row.challenge_title ?? "").trim(),
    badgeName: String(row.badge_name ?? row.challenge_title ?? "").trim(),
    badgeImagePath: row.badge_image_path ? String(row.badge_image_path) : null,
    groupName: String(row.group_name ?? "").trim(),
    companionName: String(row.companion_name ?? "").trim(),
    rewardHearts: Math.max(0, toNumber(row.reward_hearts, 0)),
  };
}

export function normalizeChallengeRewards(data: unknown): ChallengeReward[] {
  const rows = Array.isArray(data) ? data : [];
  const seenAwardIds = new Set<string>();

  return rows.reduce<ChallengeReward[]>((rewards, value) => {
    const reward = normalizeChallengeReward(value);
    if (!reward || seenAwardIds.has(reward.awardId)) return rewards;
    seenAwardIds.add(reward.awardId);
    rewards.push(reward);
    return rewards;
  }, []);
}

export async function claimPendingChallengeRewards(
  supabase: any,
  today: string,
): Promise<ChallengeReward[]> {
  if (!today) return [];

  const { data, error } = await supabase.rpc("claim_pending_challenge_rewards", {
    p_today: today,
  });
  if (error) throw error;
  return normalizeChallengeRewards(data);
}
