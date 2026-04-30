import type { Lang } from "@/lib/i18n";

export function getLocalDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addLocalDays(date = new Date(), days = 0): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getShiftedLocalDateString(days = 0, baseDate = new Date()): string {
  return getLocalDateString(addLocalDays(baseDate, days));
}

const DATE_LOCALE_BY_LANG: Record<Lang, string> = {
  ko: "ko-KR",
  de: "de-DE",
  en: "en-US",
  fr: "fr-FR",
};

export function getDateLocale(lang: Lang): string {
  return DATE_LOCALE_BY_LANG[lang] ?? DATE_LOCALE_BY_LANG.ko;
}

export function parseLocalDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}
