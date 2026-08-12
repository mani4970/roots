import type { Lang } from "@/lib/i18n";

export const LANG_DEFAULT_TRANSLATION: Record<Lang, number> = {
  ko: 92, // 개역개정
  de: 97, // Hoffnung für alle
  en: 80, // NIV
  fr: 21, // La Bible du Semeur 2015
};

function hasDefaultTranslation(lang: Lang | string | undefined | null): lang is Lang {
  return typeof lang === "string" && lang in LANG_DEFAULT_TRANSLATION;
}

export function getDefaultTranslationId(lang: Lang | string | undefined | null): number {
  return hasDefaultTranslation(lang) ? LANG_DEFAULT_TRANSLATION[lang] : LANG_DEFAULT_TRANSLATION.ko;
}
