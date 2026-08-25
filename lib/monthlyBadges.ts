export type MonthlyBadgeStatus = "earned" | "missed" | "mystery";

export type MonthlyBadgeDefinition = {
  year: number;
  month: number;
  image: string;
};

export type MonthlyBadgeCompletionRecord = {
  date: string;
  completed_at: string | null;
};

export const MONTHLY_BADGES_2026: readonly MonthlyBadgeDefinition[] = [
  { year: 2026, month: 5, image: "/images/badges/monthly/2026/monthly_badge_2026_05.webp" },
  { year: 2026, month: 6, image: "/images/badges/monthly/2026/monthly_badge_2026_06.webp" },
  { year: 2026, month: 7, image: "/images/badges/monthly/2026/monthly_badge_2026_07.webp" },
  { year: 2026, month: 8, image: "/images/badges/monthly/2026/monthly_badge_2026_08.webp" },
  { year: 2026, month: 9, image: "/images/badges/monthly/2026/monthly_badge_2026_09.webp" },
  { year: 2026, month: 10, image: "/images/badges/monthly/2026/monthly_badge_2026_10.webp" },
  { year: 2026, month: 11, image: "/images/badges/monthly/2026/monthly_badge_2026_11.webp" },
  { year: 2026, month: 12, image: "/images/badges/monthly/2026/monthly_badge_2026_12.webp" },
] as const;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function monthStartKey(year: number, month: number) {
  return `${year}-${pad(month)}-01`;
}

function nextMonthStartKey(year: number, month: number) {
  const next = new Date(year, month, 1);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-01`;
}

export const MONTHLY_BADGE_AWARD_POPUP_START = { year: 2026, month: 8 } as const;

function monthlyBadgeKey(year: number, month: number) {
  return `${year}-${pad(month)}`;
}

export function getPreviousMonthlyBadgeForAwardPopup(
  now: Date = new Date(),
): MonthlyBadgeDefinition | null {
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const candidate = MONTHLY_BADGES_2026.find(
    (badge) =>
      badge.year === previousMonth.getFullYear() &&
      badge.month === previousMonth.getMonth() + 1,
  ) ?? null;

  if (!candidate) return null;
  const startKey = monthlyBadgeKey(
    MONTHLY_BADGE_AWARD_POPUP_START.year,
    MONTHLY_BADGE_AWARD_POPUP_START.month,
  );
  return monthlyBadgeKey(candidate.year, candidate.month) >= startKey
    ? candidate
    : null;
}

export function getMonthlyBadgeAwardCampaignKey(
  badge: MonthlyBadgeDefinition,
) {
  return `monthly_badge_award_${badge.year}_${pad(badge.month)}`;
}

export function getMonthlyBadgeDateRange(badge: MonthlyBadgeDefinition) {
  return {
    startDate: monthStartKey(badge.year, badge.month),
    endDateExclusive: nextMonthStartKey(badge.year, badge.month),
  };
}

export function isMonthlyBadgeMonthClosed(
  badge: MonthlyBadgeDefinition,
  now: Date = new Date(),
) {
  const nextMonthStart = new Date(badge.year, badge.month, 1);
  return now.getTime() >= nextMonthStart.getTime();
}

/**
 * A monthly badge is earned when every calendar date in that month has at
 * least one completed, non-draft Bible Reflection whose immutable
 * `completed_at` timestamp falls before the next month starts in the user's
 * current local timezone. This intentionally allows catch-up reflections for
 * earlier dates as long as they are completed before the month closes.
 */
export function getMonthlyBadgeStatus(
  badge: MonthlyBadgeDefinition,
  records: readonly MonthlyBadgeCompletionRecord[],
  now: Date = new Date(),
): MonthlyBadgeStatus {
  const nextMonthStart = new Date(badge.year, badge.month, 1);
  if (now.getTime() < nextMonthStart.getTime()) return "mystery";

  const startKey = monthStartKey(badge.year, badge.month);
  const endKey = nextMonthStartKey(badge.year, badge.month);
  const cutoffMs = nextMonthStart.getTime();
  const completedDates = new Set<string>();

  for (const record of records) {
    if (record.date < startKey || record.date >= endKey) continue;
    if (!record.completed_at) continue;
    const completedAtMs = Date.parse(record.completed_at);
    if (!Number.isFinite(completedAtMs) || completedAtMs >= cutoffMs) continue;
    completedDates.add(record.date);
  }

  const daysInMonth = new Date(badge.year, badge.month, 0).getDate();
  return completedDates.size >= daysInMonth ? "earned" : "missed";
}

export function getLatestClosedMonthlyBadges(
  badges: readonly MonthlyBadgeDefinition[],
  now: Date = new Date(),
  count = 3,
) {
  return badges.filter((badge) => isMonthlyBadgeMonthClosed(badge, now)).slice(-count);
}

export function getMonthlyBadgePreviewDefinitions(
  badges: readonly MonthlyBadgeDefinition[],
  now: Date = new Date(),
  count = 4,
) {
  if (badges.length <= count) return [...badges];

  const currentKey = monthlyBadgeKey(now.getFullYear(), now.getMonth() + 1);
  let currentIndex = -1;
  for (let index = 0; index < badges.length; index += 1) {
    const badge = badges[index];
    if (monthlyBadgeKey(badge.year, badge.month) <= currentKey) {
      currentIndex = index;
    }
  }

  if (currentIndex < 0) return badges.slice(0, count);
  const startIndex = Math.min(
    Math.max(0, currentIndex - count + 1),
    badges.length - count,
  );
  return badges.slice(startIndex, startIndex + count);
}
