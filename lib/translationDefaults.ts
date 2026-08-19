import type { Lang } from "@/lib/i18n";
import { isSelectableBibleTranslationId } from "@/lib/bibleData";

type DefaultTranslationLang = Lang | "es";

export const LANG_DEFAULT_TRANSLATION: Record<DefaultTranslationLang, number> = {
  ko: 92, // 개역개정
  de: 97, // Hoffnung für alle
  en: 80, // NIV
  fr: 21, // La Bible du Semeur 2015
  es: 101, // NVI
};

function hasDefaultTranslation(lang: Lang | string | undefined | null): lang is DefaultTranslationLang {
  return typeof lang === "string" && lang in LANG_DEFAULT_TRANSLATION;
}

export function getDefaultTranslationId(lang: Lang | string | undefined | null): number {
  return hasDefaultTranslation(lang) ? LANG_DEFAULT_TRANSLATION[lang] : LANG_DEFAULT_TRANSLATION.ko;
}

export function normalizeSelectableTranslationId(
  value: unknown,
  lang: Lang | string | undefined | null,
): number {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return isSelectableBibleTranslationId(parsed) ? parsed : getDefaultTranslationId(lang);
}
