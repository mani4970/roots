"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Lang } from "@/lib/i18n";

/**
 * 현재 사용자의 preferred_language를 불러오는 훅
 * 기본값: "ko"
 */
export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>("ko");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles")
        .select("preferred_language")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.preferred_language === "de") setLang("de");
          else setLang("ko");
        });
    });
  }, []);

  return lang;
}
