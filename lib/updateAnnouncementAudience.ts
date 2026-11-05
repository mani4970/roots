/**
 * Product rule: one-time feature/update announcements are for accounts created
 * before that announcement's fixed release cutoff. Accounts created afterwards
 * stay excluded, even on a later visit or another device. New update notices
 * must use this rule; onboarding, challenge notices and earned rewards do not.
 */
export function isExistingUserForUpdateAnnouncement(
  accountCreatedAt: string | null | undefined,
  announcedAt: string,
): boolean {
  if (!accountCreatedAt || !announcedAt) return false;
  const createdAtMs = Date.parse(accountCreatedAt);
  const announcedAtMs = Date.parse(announcedAt);
  return Number.isFinite(createdAtMs) && Number.isFinite(announcedAtMs)
    && createdAtMs < announcedAtMs;
}
