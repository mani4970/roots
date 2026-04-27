import type { Lang } from "@/lib/i18n";

export const LANG_DEFAULT_TRANSLATION: Record<Lang, number> = {
  ko: 92, // 개역개정
  de: 97, // Hoffnung für Alle
  en: 80, // NIV
  fr: 26, // Louis Segond
};

export function getDefaultTranslationId(lang: Lang | string | undefined | null): number {
  if (lang === "ko" || lang === "de" || lang === "en" || lang === "fr") {
    return LANG_DEFAULT_TRANSLATION[lang];
  }
  return LANG_DEFAULT_TRANSLATION.ko;
}
