"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { isLang, FALLBACK_LANG, type Lang } from "@/lib/i18n";
import {
  getDefaultTranslationId,
  normalizeSelectableTranslationId,
  resolveFreshBibleTranslationId,
} from "@/lib/translationDefaults";
import { storageGet, storageSet } from "@/lib/clientStorage";
import { saveProfilePreferences } from "@/lib/profilePreferences";

const STORAGE_KEY = "roots_lang";
const SELECTED_FLAG = "roots_lang_selected";
const TRANSLATION_STORAGE_KEY = "roots_default_translation";
const TRANSLATION_LANGUAGE_STORAGE_KEY = "roots_default_translation_lang";

function applyDocumentLanguage(lang: Lang): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
}

export function getStoredLang(): Lang | null {
  const stored = storageGet(STORAGE_KEY);
  return isLang(stored) ? stored : null;
}

export function getPreferredTranslationForLang(
  lang: Lang,
  profileValue?: unknown,
  profileLanguage?: unknown,
): number {
  return resolveFreshBibleTranslationId({
    lang,
    localValue: storageGet(TRANSLATION_STORAGE_KEY),
    localLanguage: storageGet(TRANSLATION_LANGUAGE_STORAGE_KEY),
    profileValue,
    profileLanguage,
  });
}

/**
 * Persist an explicit/default Bible choice together with the app language under
 * which it was chosen. The owner-language marker lets Roots distinguish an old
 * English NIV preference from a deliberate NIV choice made while using Spanish.
 */
export function savePreferredTranslationLocally(lang: Lang, value: unknown): number {
  const translationId = normalizeSelectableTranslationId(value, lang);
  storageSet(TRANSLATION_STORAGE_KEY, String(translationId));
  storageSet(TRANSLATION_LANGUAGE_STORAGE_KEY, lang);
  return translationId;
}

export function saveLangLocally(lang: Lang): number {
  const previousLang = getStoredLang();
  const translationId = previousLang === lang
    ? getPreferredTranslationForLang(lang)
    : getDefaultTranslationId(lang);

  storageSet(STORAGE_KEY, lang);
  storageSet(SELECTED_FLAG, "true");
  savePreferredTranslationLocally(lang, translationId);
  applyDocumentLanguage(lang);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("roots_lang_changed", {
      detail: { lang, translationId },
    }));
  }

  return translationId;
}

/**
 * 현재 사용자의 언어 설정을 불러오는 훅
 *
 * 우선순위:
 * 1. client storage("roots_lang") — 즉시 반영 (로그인 전에도 작동)
 * 2. profiles.preferred_language — 로그인 시 DB에서 읽어와 동기화
 * 3. FALLBACK_LANG ("ko") — 둘 다 없으면 기본값
 *
 * 언어와 번역본은 함께 정규화한다. 언어가 바뀌었는데 과거 언어의
 * 번역본 ID만 남아 있으면 현재 언어의 기본 번역본으로 복구한다.
 */
export function useLang(): Lang {
  // Keep the first server render and first client hydration render identical.
  // The saved/client language is applied right after hydration in the effect below.
  const [lang, setLang] = useState<Lang>(FALLBACK_LANG);

  useEffect(() => {
    function handleLangChanged(event: Event) {
      const next = (event as CustomEvent<{ lang?: string }>).detail?.lang;
      if (isLang(next)) {
        setLang(next);
        applyDocumentLanguage(next);
      }
    }

    window.addEventListener("roots_lang_changed", handleLangChanged as EventListener);

    const storedLang = getStoredLang();

    // 1. client storage 우선 — 로그인 전 선택한 언어를 절대 DB 기본값으로 덮어쓰지 않음
    if (storedLang) {
      setLang(storedLang);
      applyDocumentLanguage(storedLang);
      const translationId = getPreferredTranslationForLang(storedLang);
      savePreferredTranslationLocally(storedLang, translationId);
    }

    // 2. 로그인 상태일 때 DB와 동기화
    // - client storage에 선택 언어가 있으면: local 언어/번역본을 DB에 저장
    // - client storage가 없으면: DB 언어/번역본을 읽어와 localStorage에 저장
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      if (storedLang) {
        const translationId = getPreferredTranslationForLang(storedLang);
        savePreferredTranslationLocally(storedLang, translationId);
        saveProfilePreferences(supabase, {
          preferredLanguage: storedLang,
          preferredTranslation: translationId,
        }).catch(error => {
          console.error("profile language preference sync failed", error);
        });
        return;
      }

      supabase.from("profiles")
        .select("preferred_language,preferred_translation")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (isLang(data?.preferred_language)) {
            const profileLang = data.preferred_language;
            const translationId = getPreferredTranslationForLang(
              profileLang,
              data.preferred_translation,
              profileLang,
            );
            setLang(profileLang);
            applyDocumentLanguage(profileLang);
            storageSet(STORAGE_KEY, profileLang);
            storageSet(SELECTED_FLAG, "true");
            savePreferredTranslationLocally(profileLang, translationId);
          }
        });
    });
    return () => window.removeEventListener("roots_lang_changed", handleLangChanged as EventListener);
  }, []);

  return lang;
}

/**
 * 언어 변경 — client storage + DB 동시 업데이트
 * 로그인 안 된 상태에서도 client storage는 반영됨
 */
export async function setPreferredLang(lang: Lang): Promise<void> {
  const translationId = saveLangLocally(lang);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    try {
      await saveProfilePreferences(supabase, {
        preferredLanguage: lang,
        preferredTranslation: translationId,
      });
    } catch (error) {
      console.error("profile language preference save failed", error);
    }
  }
}

/** 첫 실행인지 확인 (LanguagePicker 표시 여부) */
export function isFirstLaunch(): boolean {
  if (typeof window === "undefined") return false;
  return !storageGet(SELECTED_FLAG);
}

/** 언어 선택 완료 플래그 저장 (LanguagePicker 닫을 때) */
export function markLangSelected(): void {
  storageSet(SELECTED_FLAG, "true");
}
