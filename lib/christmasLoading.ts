// Device-local YYYY-MM-DD from useChallengeLocalDate. This is the 2026 event,
// not an annually recurring skin. Jan 1 is the exclusive end boundary.
export const CHRISTMAS_LOADING_START_DATE = "2026-11-29";
export const CHRISTMAS_LOADING_END_EXCLUSIVE = "2027-01-01";

export function isChristmasLoadingDate(localDate: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(localDate)
    && localDate >= CHRISTMAS_LOADING_START_DATE
    && localDate < CHRISTMAS_LOADING_END_EXCLUSIVE;
}
