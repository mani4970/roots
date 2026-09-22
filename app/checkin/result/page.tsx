"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";
import { getLocalDateString, getShiftedLocalDateString } from "@/lib/date";
import { readDailyWordRecord, resolveDailyWordContent } from "@/lib/dailyWordCardRecord";
import { withQtDraftTimeout } from "@/lib/qtDraftSync";
import { getDefaultTranslationId } from "@/lib/translationDefaults";
import DailyWordCard from "@/components/DailyWordCard";
import wordCardStyles from "@/components/WordCards.module.css";
import { ESV_TRANSLATION_ID } from "@/lib/esvBible";
import { storageGet } from "@/lib/clientStorage";
import BottomNav from "@/components/BottomNav";
import ConfettiBurst from "@/components/ConfettiBurst";
import { checkAndAwardDailyWordBadge, getRewardBadgePopup } from "@/lib/rewardBadges";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";

const CHECKIN_RESULT_TEXT = {
  ko: { retry: "다시 시도" },
  de: { retry: "Erneut versuchen" },
  en: { retry: "Try again" },
  fr: { retry: "Réessayer" },
  es: { retry: "Intentar de nuevo" },
} as const;

function ResultContent() {
  const params = useSearchParams();
  const router = useRouter();
  const lang = useLang();
  const emotionsKey = params.get("emotions") ?? "";
  const emotions = emotionsKey.split(",").filter(Boolean);
  const selectedEmotion = emotions[0] ?? "tired";
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [celebrateNewWord, setCelebrateNewWord] = useState(false);
  const [badgePopup, setBadgePopup] = useState<{ img: string; title: string; msg: string } | null>(null);

  useAndroidBackHandler(() => {
    if (!badgePopup) return false;
    setBadgePopup(null);
    return true;
  });

  // lang이 localStorage에서 확정될 때까지 대기
  const [langReady, setLangReady] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = storageGet("roots_lang");
      if (stored && stored !== "ko") {
        // useLang이 아직 "ko"인데 stored는 "de" → 기다림
        if (lang !== stored) return;
      }
    }
    setLangReady(true);
  }, [lang]);

  useEffect(() => {
    if (!langReady) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    async function loadVerse() {
      setLoading(true); setLoadError(false); setResult(null); setCelebrateNewWord(false); setBadgePopup(null);
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await withQtDraftTimeout(supabase.auth.getUser(), 6_000, "daily Word user");
        if (cancelled) return;
        if (authError) throw authError;
        if (!user) { router.replace("/welcome"); return; }
        const today = getLocalDateString();
        const translationId = getDefaultTranslationId(lang);
        const existing = await readDailyWordRecord(supabase, user.id, today, controller.signal);
        if (cancelled) return;
        if (existing) {
          // Includes metadata-only ESV records. Reopening never reselects a verse,
          // even if the UI language or the query-string emotion has changed.
          const saved = await resolveDailyWordContent(existing, controller.signal);
          if (cancelled) return;
          setResult({ ...existing, verse: saved.verse, reference: saved.reference, translation_id: saved.translationId });
        } else {
          const yesterday = getShiftedLocalDateString(-1);
          const { data: prevDay } = await supabase.from("daily_checkins")
            .select("verse,reference,verse_reference,verse_ref_id").eq("user_id", user.id).eq("date", yesterday)
            .abortSignal(controller.signal).maybeSingle();
          if (cancelled) return;
          if (controller.signal.aborted) throw new Error("Daily Word request timed out");
          const res = await fetch("/api/verse", {
            method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emotions, emotionKey: selectedEmotion, userId: user.id, date: today, lang,
              prevVerseRefId: prevDay?.verse_ref_id ?? null, prevReference: prevDay?.verse_reference ?? prevDay?.reference ?? null }),
          });
          if (!res.ok) throw new Error("Verse API failed");
          const data = await res.json();
          if (cancelled) return;
          if (typeof data.verse !== "string" || !data.verse.trim() || typeof data.reference !== "string" || !data.reference.trim()) {
            throw new Error("Empty daily Word");
          }
          if (getLocalDateString() !== today) throw new Error("Daily Word date changed; retry for today");
          const resolvedTranslationId = Number(data.translation_id ?? translationId);
          const persistVerseText = resolvedTranslationId !== ESV_TRANSLATION_ID;
          // Preserve the existing upsert and all unrelated decisions/progress.
          // A write failure is not a successfully received card.
          const { error: saveError } = await supabase.from("daily_checkins").upsert({
            user_id: user.id, date: today, emotions, emotion_key: data.emotion_key ?? selectedEmotion,
            verse_ref_id: data.verse_id ?? data.verseRefId, verse_book: data.book,
            verse_start_chapter: data.start_chapter, verse_start_verse: data.start_verse,
            verse_end_chapter: data.end_chapter, verse_end_verse: data.end_verse,
            verse_translation_id: resolvedTranslationId, verse_lang: data.verse_lang ?? lang,
            verse_reference: data.reference, reference: data.reference,
            verse_text: persistVerseText ? data.verse : null, verse: persistVerseText ? data.verse : null,
          }, { onConflict: "user_id,date" }).abortSignal(controller.signal);
          if (cancelled) return;
          if (saveError) throw saveError;
          setResult(data); setCelebrateNewWord(true);
        }
        try {
          const awarded = await withQtDraftTimeout(checkAndAwardDailyWordBadge(supabase, user.id), 8_000, "daily Word badge");
          if (!cancelled && awarded) setBadgePopup(getRewardBadgePopup(awarded, lang));
        } catch (badgeError) {
          console.warn("오늘의 말씀 보상 배지 확인 실패:", badgeError);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("오늘의 말씀 로드 실패:", error);
          setResult(null); setLoadError(true); setCelebrateNewWord(false);
        }
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    }
    void loadVerse();
    // StrictMode's cancelled first setup must never run a second write or update
    // the next account/language's UI when its asynchronous work finishes.
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [langReady, lang, emotionsKey, selectedEmotion, retryNonce, router]);

  if (loading) return (
    <div className="roots-daily-word-phase2e roots-native-tablet-viewport" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, paddingBottom: "calc(82px + var(--bottom-nav-bottom-padding))" }}>
      <Loader2 size={32} style={{ color: "var(--daily-word-sage-text)" }} className="spin" />
      <p style={{ color: "var(--daily-word-muted-text)", fontSize: 14 }}>{t("result_loading", lang)}</p>
      <BottomNav />
    </div>
  );

  if (loadError || !result) return (
    <div className="roots-daily-word-phase2e" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "24px 24px calc(82px + var(--bottom-nav-bottom-padding))", textAlign: "center" }}>
      <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{t("network_error_retry", lang)}</p>
      <button
        type="button"
        onClick={() => setRetryNonce((value) => value + 1)}
        className="btn-primary"
        style={{ width: "auto", minWidth: 120, padding: "11px 18px" }}
      >
        {CHECKIN_RESULT_TEXT[lang].retry}
      </button>
      <button type="button" onClick={() => router.push("/")} style={{ border: "none", background: "transparent", color: "var(--text3)", fontSize: 13, cursor: "pointer" }}>
        {t("result_home_btn", lang)}
      </button>
      <BottomNav />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: "calc(120px + var(--bottom-nav-bottom-padding))", position: "relative" }} className="fade-in roots-daily-word-phase2e">
      <div style={{ background: "var(--bg)", padding: "var(--roots-page-top-padding) 20px 6px" }}>
        <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{t("back", lang)}</span>
        </button>
      </div>

      <DailyWordCard
        celebrate={celebrateNewWord && !badgePopup}
        lang={lang}
        verse={String(result.verse ?? "")}
        reference={String(result.reference ?? "")}
        translationId={Number(result.translation_id ?? result.verse_translation_id) || null}
      />
      <button type="button" onClick={() => router.push("/")} className={wordCardStyles.homeLink}>
        {t("result_home_btn", lang)}
      </button>

      {badgePopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--daily-word-reward-overlay)", backdropFilter: "blur(4px)", padding: 20 }}>
          <ConfettiBurst />
          <div style={{ width: "100%", maxWidth: 360, borderRadius: 24, background: "var(--daily-word-modal-surface)", border: "1px solid var(--daily-word-gold-border)", padding: "26px 22px", textAlign: "center", boxShadow: "var(--shadow-modal)" }}>
            <div style={{ width: 118, height: 118, margin: "0 auto 16px", borderRadius: "50%", background: "var(--daily-word-reward-gradient)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={badgePopup.img} alt={badgePopup.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 850, color: "var(--daily-word-gold-text)", marginBottom: 10, lineHeight: 1.3 }}>{badgePopup.title}</h2>
            <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, marginBottom: 18 }}>{badgePopup.msg}</p>
            <button onClick={() => setBadgePopup(null)} className="btn-sage" style={{ width: "100%", background: "var(--daily-word-gold-action)", color: "var(--daily-word-on-gold-action)" }}>{t("badge_thanks", lang)}</button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="roots-daily-word-phase2e roots-native-tablet-viewport" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: "calc(82px + var(--bottom-nav-bottom-padding))" }}>
        <Loader2 size={32} style={{ color: "var(--daily-word-sage-text)" }} className="spin" />
        <BottomNav />
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}
