type ContentRow = Record<string, unknown> | null | undefined;

function validTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

function firstTimestamp(...values: unknown[]): string | null {
  for (const value of values) {
    const timestamp = validTimestamp(value);
    if (timestamp) return timestamp;
  }
  return null;
}

function timestampValue(value: string | null): number {
  return value ? Date.parse(value) : 0;
}

function compareWithStableFallback(
  primaryLeft: string | null,
  primaryRight: string | null,
  left: ContentRow,
  right: ContentRow,
): number {
  const primaryDifference =
    timestampValue(primaryRight) - timestampValue(primaryLeft);
  if (primaryDifference !== 0) return primaryDifference;

  const createdDifference =
    timestampValue(firstTimestamp(right?.created_at)) -
    timestampValue(firstTimestamp(left?.created_at));
  if (createdDifference !== 0) return createdDifference;

  return String(right?.id ?? "").localeCompare(String(left?.id ?? ""));
}

/**
 * The first time a Bible Reflection was actually completed.
 *
 * `completed_at` is authoritative after migration 125. `updated_at` is the
 * safest fallback for reflections that were drafted before completion, while
 * `created_at` keeps legacy/photo records usable before the migration is live.
 */
export function getQtCompletionTime(row: ContentRow): string | null {
  return firstTimestamp(row?.completed_at, row?.updated_at, row?.created_at);
}

/**
 * The time a Bible Reflection became new to a community audience.
 *
 * Feed ordering uses `completed_at`, but unread/new indicators must still react
 * when an older reflection is newly shared with a group.
 */
export function getQtShareActivityTime(row: ContentRow): string | null {
  return firstTimestamp(
    row?.shared_at,
    row?.completed_at,
    row?.updated_at,
    row?.created_at,
  );
}

export function getAnsweredPrayerTime(row: ContentRow): string | null {
  return firstTimestamp(row?.answered_at, row?.created_at);
}

/**
 * Community activity time for prayers. An answered prayer becomes new when the
 * testimony is completed, not when the original prayer request was written.
 */
export function getPrayerShareActivityTime(row: ContentRow): string | null {
  if (row?.is_answered) {
    return firstTimestamp(row?.answered_at, row?.shared_at, row?.created_at);
  }
  return firstTimestamp(row?.shared_at, row?.created_at);
}

export function getPrayerFeedTime(row: ContentRow): string | null {
  return row?.is_answered
    ? getAnsweredPrayerTime(row)
    : firstTimestamp(row?.shared_at, row?.created_at);
}

export function sortQtRowsByCompletion<
  T extends Record<string, unknown>,
>(rows: T[]): T[] {
  return [...rows].sort((left, right) =>
    compareWithStableFallback(
      getQtCompletionTime(left),
      getQtCompletionTime(right),
      left,
      right,
    ),
  );
}

export function sortAnsweredPrayerRows<
  T extends Record<string, unknown>,
>(rows: T[]): T[] {
  return [...rows].sort((left, right) =>
    compareWithStableFallback(
      getAnsweredPrayerTime(left),
      getAnsweredPrayerTime(right),
      left,
      right,
    ),
  );
}

export function sortPrayerRequestRows<
  T extends Record<string, unknown>,
>(rows: T[]): T[] {
  return [...rows].sort((left, right) =>
    compareWithStableFallback(
      firstTimestamp(left.created_at),
      firstTimestamp(right.created_at),
      left,
      right,
    ),
  );
}

export function sortCommunityPrayerRows<
  T extends Record<string, unknown>,
>(rows: T[]): T[] {
  return [...rows].sort((left, right) =>
    compareWithStableFallback(
      getPrayerFeedTime(left),
      getPrayerFeedTime(right),
      left,
      right,
    ),
  );
}
