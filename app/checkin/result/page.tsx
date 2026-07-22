"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChevronLeft, Loader2, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";
import { getLocalDateString, getShiftedLocalDateString } from "@/lib/date";
import { getDefaultTranslationId } from "@/lib/translationDefaults";
import { storageGet } from "@/lib/clientStorage";
import HeartBurst from "@/components/HeartBurst";
import BottomNav from "@/components/BottomNav";
import ConfettiBurst from "@/components/ConfettiBurst";
import { checkAndAwardDailyWordBadge, getRewardBadgePopup } from "@/lib/rewardBadges";

function ResultContent() {
  const params = useSearchParams();
  const router = useRouter();
  const lang = useLang();
  const emotions = params.get("emotions")?.split(",") ?? [];
  const selectedEmotion = emotions[0] ?? "tired";
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [badgePopup, setBadgePopup] = useState<{ img: string; title: string; msg: string } | null>(null);

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
    async function loadVerse() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = getLocalDateString();
        const translationId = Number(storageGet("roots_default_translation") ?? getDefaultTranslationId(lang));

        // 오늘 이미 같은 언어/번역본의 말씀이 있으면 API 호출 없이 기존 말씀 사용
        const { data: existing } = await supabase
          .from("daily_checkins")
          .select("verse,reference,verse_text,verse_reference,verse_lang,verse_translation_id,verse_ref_id")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle();

        const existingVerse = existing?.verse_text ?? existing?.verse;
        const existingReference = existing?.verse_reference ?? existing?.reference;
        const legacyKoreanMismatch =
          !existing?.verse_lang &&
          lang !== "ko" &&
          /[가-힣]/.test(String(existingVerse ?? ""));
        const sameLang = !legacyKoreanMismatch && (!existing?.verse_lang || existing.verse_lang === lang);
        const sameTranslation = !existing?.verse_translation_id || Number(existing.verse_translation_id) === translationId;

        if (existingVerse && sameLang && sameTranslation) {
          setResult({
            ...existing,
            verse: existingVerse,
            reference: existingReference,
          });
          try {
            const awarded = await checkAndAwardDailyWordBadge(supabase, user.id);
            if (awarded) setBadgePopup(getRewardBadgePopup(awarded, lang));
          } catch (badgeError) {
            console.warn("오늘의 말씀 보상 배지 확인 실패:", badgeError);
          }
          setLoading(false);
          return;
        }

        // 어제 말씀 참고용 (중복 방지)
        const yesterday = getShiftedLocalDateString(-1);
        const { data: prevDay } = await supabase
          .from("daily_checkins")
          .select("verse,reference,verse_reference,verse_ref_id")
          .eq("user_id", user.id)
          .eq("date", yesterday)
          .maybeSingle();

        const res = await fetch("/api/verse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emotions,
            emotionKey: selectedEmotion,
            userId: user.id,
            date: today,
            lang,
            translationId,
            prevVerseRefId: prevDay?.verse_ref_id ?? null,
            prevReference: prevDay?.verse_reference ?? prevDay?.reference ?? null,
          }),
        });

        if (!res.ok) throw new Error("Verse API failed");
        const data = await res.json();
        setResult(data);

        const reference = data.reference;
        const verse = data.verse;

        await supabase.from("daily_checkins").upsert({
          user_id: user.id,
          date: today,
          emotions,
          emotion_key: data.emotion_key ?? selectedEmotion,
          verse_ref_id: data.verse_id ?? data.verseRefId,
          verse_book: data.book,
          verse_start_chapter: data.start_chapter,
          verse_start_verse: data.start_verse,
          verse_end_chapter: data.end_chapter,
          verse_end_verse: data.end_verse,
          verse_translation_id: data.translation_id ?? translationId,
          verse_lang: data.verse_lang ?? lang,
          verse_reference: reference,
          verse_text: verse,
          // 기존 화면/쿼리 호환용
          verse,
          reference,
        }, { onConflict: "user_id,date" });

        try {
          const awarded = await checkAndAwardDailyWordBadge(supabase, user.id);
          if (awarded) setBadgePopup(getRewardBadgePopup(awarded, lang));
        } catch (badgeError) {
          console.warn("오늘의 말씀 보상 배지 확인 실패:", badgeError);
        }

      } catch {
        setResult({
          verse: t("result_fallback_verse", lang),
          reference: t("result_fallback_reference", lang),
        });
      } finally {
        setLoading(false);
      }
    }
    loadVerse();
  }, [langReady, lang, selectedEmotion]);

  if (loading) return (
    <div className="roots-daily-word-phase2e" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, paddingBottom: "calc(82px + var(--bottom-nav-bottom-padding))" }}>
      <Loader2 size={32} style={{ color: "var(--daily-word-sage-text)" }} className="spin" />
      <p style={{ color: "var(--daily-word-muted-text)", fontSize: 14 }}>{t("result_loading", lang)}</p>
      <BottomNav />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: "calc(120px + var(--bottom-nav-bottom-padding))", position: "relative" }} className="fade-in roots-daily-word-phase2e">
      <div style={{ background: "var(--bg)", padding: "var(--roots-page-top-padding) 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{t("back", lang)}</span>
        </button>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", fontFamily: "'Fraunces', serif" }}>{t('result_title', lang)}</h1>
        <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>{t('result_sub', lang)}</p>
      </div>

      <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* 축복 메시지 카드 */}
        <div style={{ background: "var(--daily-word-blessing-surface)", border: "1px solid var(--daily-word-blessing-border)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Heart size={16} style={{ color: "var(--daily-word-sage-text)", flexShrink: 0, marginTop: 2 }} fill="var(--daily-word-sage-text)" />
          <p style={{ fontSize: 13, color: "var(--daily-word-sage-text)", lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
            {t('result_blessing', lang)}
          </p>
        </div>

        {/* 말씀 카드 */}
        <div className="card-sage">
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--daily-word-sage-text)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 10 }}>
            {result?.reference}
          </p>
          <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.7, fontStyle: "italic", fontFamily: "'Fraunces', serif" }}>
            "{result?.verse}"
          </p>
        </div>

        {/* 홈으로만 */}
        <button onClick={() => router.push("/")} className="btn-primary" style={{ marginTop: 4 }}>
          {t('result_home_btn', lang)}
        </button>
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text3)" }}>
          {t('result_home_sub', lang)}
        </p>
      </div>

      {badgePopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--daily-word-reward-overlay)", backdropFilter: "blur(4px)", padding: 20 }}>
          <ConfettiBurst />
          <div style={{ width: "100%", maxWidth: 360, borderRadius: 24, background: "var(--daily-word-modal-surface)", border: "1px solid var(--daily-word-gold-border)", padding: "26px 22px", textAlign: "center", boxShadow: "var(--shadow-modal)" }}>
            <div style={{ width: 118, height: 118, margin: "0 auto 16px", borderRadius: "50%", background: "var(--daily-word-reward-gradient)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={badgePopup.img} alt="badge" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 850, color: "var(--daily-word-gold-text)", marginBottom: 10, lineHeight: 1.3 }}>{badgePopup.title}</h2>
            <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, marginBottom: 18 }}>{badgePopup.msg}</p>
            <button onClick={() => setBadgePopup(null)} className="btn-sage" style={{ width: "100%", background: "var(--daily-word-gold-action)", color: "var(--daily-word-on-gold-action)" }}>{t("badge_thanks", lang)}</button>
          </div>
        </div>
      )}

      {/* 하트 콘페티 - 오늘의 말씀 결과 진입 시 항상 한 번 재생 */}
      <HeartBurst zIndex={80} />
      <BottomNav />
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="roots-daily-word-phase2e" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: "calc(82px + var(--bottom-nav-bottom-padding))" }}>
        <Loader2 size={32} style={{ color: "var(--daily-word-sage-text)" }} className="spin" />
        <BottomNav />
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}
