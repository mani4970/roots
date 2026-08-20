import type { Lang } from "@/lib/i18n";
import { isSelectableBibleTranslationId, TRANSLATION_LANG } from "@/lib/bibleData";

export const LANG_DEFAULT_TRANSLATION: Record<Lang, number> = {
  ko: 92, // 개역개정
  de: 97, // Hoffnung für alle
  en: 80, // NIV
  fr: 21, // La Bible du Semeur 2015
  es: 101, // NVI
};

const BIBLE_LANGUAGE_BY_APP_LANG: Record<Lang, string> = {
  ko: "KO",
  de: "DE",
  en: "EN",
  fr: "FR",
  es: "ES",
};

function hasDefaultTranslation(lang: unknown): lang is Lang {
  return typeof lang === "string" && lang in LANG_DEFAULT_TRANSLATION;
}

function parseSelectableTranslationId(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return isSelectableBibleTranslationId(parsed) ? parsed : null;
}

export function getDefaultTranslationId(lang: Lang | string | undefined | null): number {
  return hasDefaultTranslation(lang) ? LANG_DEFAULT_TRANSLATION[lang] : LANG_DEFAULT_TRANSLATION.ko;
}

/**
 * Generic selectable-ID guard. This intentionally does not require the Bible
 * language to match the app language because users may explicitly read a Bible
 * translation from another language.
 */
export function normalizeSelectableTranslationId(
  value: unknown,
  lang: Lang | string | undefined | null,
): number {
  return parseSelectableTranslationId(value) ?? getDefaultTranslationId(lang);
}

export function isTranslationNativeToLanguage(
  value: unknown,
  lang: Lang | string | undefined | null,
): boolean {
  const parsed = parseSelectableTranslationId(value);
  const safeLang = hasDefaultTranslation(lang) ? lang : "ko";
  return parsed != null && TRANSLATION_LANG[parsed] === BIBLE_LANGUAGE_BY_APP_LANG[safeLang];
}

/**
 * Resolve the translation for a fresh Bible Reflection.
 *
 * Priority:
 * 1. A valid local preference explicitly saved while the current app language
 *    was active. This preserves an intentional cross-language Bible choice.
 * 2. A legacy local preference with no owner-language marker, but only when the
 *    Bible translation itself belongs to the current app language.
 * 3. A profile preference saved under the current profile language.
 * 4. The current language's default Bible translation.
 *
 * Existing drafts and historical records do not use this resolver; their own
 * stored bible_version remains authoritative.
 */
export function resolveFreshBibleTranslationId({
  lang,
  localValue,
  localLanguage,
  profileValue,
  profileLanguage,
}: {
  lang: Lang | string | undefined | null;
  localValue?: unknown;
  localLanguage?: unknown;
  profileValue?: unknown;
  profileLanguage?: unknown;
}): number {
  const safeLang: Lang = hasDefaultTranslation(lang) ? lang : "ko";
  const localId = parseSelectableTranslationId(localValue);

  if (localId != null) {
    if (localLanguage === safeLang) return localId;
    if (!hasDefaultTranslation(localLanguage) && isTranslationNativeToLanguage(localId, safeLang)) {
      return localId;
    }

    // A valid local ID that belongs to another language is the stale-device
    // case this resolver exists to repair. Do not let an old profile value
    // immediately reintroduce it; a language change starts from the current
    // language default unless the user explicitly selects another Bible again.
    return getDefaultTranslationId(safeLang);
  }

  const profileId = parseSelectableTranslationId(profileValue);
  if (profileId != null) {
    if (profileLanguage === safeLang) return profileId;
    if (!hasDefaultTranslation(profileLanguage) && isTranslationNativeToLanguage(profileId, safeLang)) {
      return profileId;
    }
  }

  return getDefaultTranslationId(safeLang);
}
