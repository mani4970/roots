"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { isLang, FALLBACK_LANG, type Lang } from "@/lib/i18n";

const STORAGE_KEY = "roots_lang";
const SELECTED_FLAG = "roots_lang_selected";

/**
 * 현재 사용자의 언어 설정을 불러오는 훅
 *
 * 우선순위:
 * 1. localStorage("roots_lang") — 즉시 반영 (로그인 전에도 작동)
 * 2. profiles.preferred_language — 로그인 시 DB에서 읽어와 동기화
 * 3. FALLBACK_LANG ("ko") — 둘 다 없으면 기본값
 *
 * isLang() 으로 검증하므로 DB나 localStorage에 예전 값/지원 안 하는 언어가 있어도 안전.
 */
export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>(FALLBACK_LANG);

  useEffect(() => {
    // 1. localStorage 우선
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isLang(stored)) setLang(stored);
    }

    // 2. DB와 동기화 (로그인 상태일 때만)
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles")
        .select("preferred_language")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (isLang(data?.preferred_language)) {
            setLang(data.preferred_language);
            if (typeof window !== "undefined") {
              localStorage.setItem(STORAGE_KEY, data.preferred_language);
            }
          }
        });
    });
  }, []);

  return lang;
}

/**
 * 언어 변경 — localStorage + DB 동시 업데이트
 * 로그인 안 된 상태에서도 localStorage는 반영됨
 */
export async function setPreferredLang(lang: Lang): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, lang);
    localStorage.setItem(SELECTED_FLAG, "true");
  }
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("profiles").update({ preferred_language: lang }).eq("id", user.id);
  }
}

/** 첫 실행인지 확인 (LanguagePicker 표시 여부) */
export function isFirstLaunch(): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(SELECTED_FLAG);
}

/** 언어 선택 완료 플래그 저장 (LanguagePicker 닫을 때) */
export function markLangSelected(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SELECTED_FLAG, "true");
  }
}
