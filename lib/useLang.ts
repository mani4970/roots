"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { isLang, FALLBACK_LANG, type Lang } from "@/lib/i18n";
import { getDefaultTranslationId } from "@/lib/translationDefaults";
import { storageGet, storageSet } from "@/lib/clientStorage";

const STORAGE_KEY = "roots_lang";
const SELECTED_FLAG = "roots_lang_selected";
const TRANSLATION_STORAGE_KEY = "roots_default_translation";

export function saveLangLocally(lang: Lang): number {
  const translationId = getDefaultTranslationId(lang);
  storageSet(STORAGE_KEY, lang);
  storageSet(SELECTED_FLAG, "true");
  storageSet(TRANSLATION_STORAGE_KEY, String(translationId));
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
 * isLang() 으로 검증하므로 DB나 client storage에 예전 값/지원 안 하는 언어가 있어도 안전.
 */
export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>(FALLBACK_LANG);

  useEffect(() => {
    let storedLang: Lang | null = null;

    // 1. client storage 우선 — 로그인 전 선택한 언어를 절대 DB 기본값으로 덮어쓰지 않음
    if (typeof window !== "undefined") {
      const stored = storageGet(STORAGE_KEY);
      if (isLang(stored)) {
        storedLang = stored;
        setLang(stored);
      }
    }

    // 2. 로그인 상태일 때 DB와 동기화
    // - client storage에 선택 언어가 있으면: 그 언어를 DB에 저장
    // - client storage가 없으면: DB 언어를 읽어와 localStorage에 저장
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      if (storedLang) {
        const translationId = getDefaultTranslationId(storedLang);
        if (!storageGet(TRANSLATION_STORAGE_KEY)) {
          storageSet(TRANSLATION_STORAGE_KEY, String(translationId));
        }
        supabase.from("profiles")
          .update({ preferred_language: storedLang, preferred_translation: translationId })
          .eq("id", user.id)
          .then(() => {});
        return;
      }

      supabase.from("profiles")
        .select("preferred_language")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (isLang(data?.preferred_language)) {
            setLang(data.preferred_language);
            storageSet(STORAGE_KEY, data.preferred_language);
            storageSet(SELECTED_FLAG, "true");
            if (!storageGet(TRANSLATION_STORAGE_KEY)) {
              storageSet(TRANSLATION_STORAGE_KEY, String(getDefaultTranslationId(data.preferred_language)));
            }
          }
        });
    });
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
    await supabase.from("profiles")
      .update({ preferred_language: lang, preferred_translation: translationId })
      .eq("id", user.id);
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
