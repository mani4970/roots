export const GROUP_CHALLENGE_REQUEST_MIN_LEAD_DAYS = 15;
export const GROUP_CHALLENGE_REQUEST_DEFAULT_DURATION_DAYS = 30;
export const GROUP_CHALLENGE_REQUEST_MAX_DURATION_DAYS = 120;

const DAY_MS = 86_400_000;

function dateInputToUtcDay(value?: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
}

export function addDaysToDateInput(value: string, days: number) {
  const utcDay = dateInputToUtcDay(value);
  if (utcDay === null) return "";
  return new Date(utcDay + days * DAY_MS).toISOString().slice(0, 10);
}

export function inclusiveDateRangeDays(startDate: string, endDate: string) {
  const start = dateInputToUtcDay(startDate);
  const end = dateInputToUtcDay(endDate);
  if (start === null || end === null || end < start) return 0;
  return Math.floor((end - start) / DAY_MS) + 1;
}

export function deriveChallengeRequestEndDate(
  startDate?: string | null,
  durationDays?: number | null,
) {
  const duration = Number(durationDays ?? 0);
  if (!startDate || !Number.isFinite(duration) || duration < 1) return "";
  return addDaysToDateInput(startDate, duration - 1);
}
