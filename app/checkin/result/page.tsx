"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";

function ResultContent() {
  const params = useSearchParams();
  const router = useRouter();
  const lang = useLang();
  const emotions = params.get("emotions")?.split(",") ?? [];
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVerse() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split("T")[0];

        // 오늘 이미 말씀이 있으면 API 호출 없이 기존 말씀 사용
        // 단, 언어가 다르면 (한국어 말씀인데 독일어 사용자) 새로 요청
        const { data: existing } = await supabase
          .from("daily_checkins")
          .select("verse,reference,message,mission,completed_mission")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle();

        const isKoreanVerse = existing?.verse && /[가-힣]/.test(existing.verse);
        const langMismatch = lang !== "ko" && isKoreanVerse;

        if (existing?.verse && !langMismatch) {
          setResult(existing);
          setLoading(false);
          return;
        }

        // 어제 말씀 참고용 (중복 방지)
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const { data: prevDay } = await supabase
          .from("daily_checkins")
          .select("verse,reference")
          .eq("user_id", user.id)
          .eq("date", yesterday)
          .maybeSingle();

        const res = await fetch("/api/verse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emotions,
            prevVerse: prevDay?.verse ?? null,
            prevReference: prevDay?.reference ?? null,
            lang,
          }),
        });
        const data = await res.json();
        setResult(data);

        // 저장 (오늘 처음이므로 insert)
        await supabase.from("daily_checkins").upsert({
          user_id: user.id,
          date: today,
          emotions,
          verse: data.verse,
          reference: data.reference,
          message: data.message,
          mission: data.mission,
          completed_mission: false,
        }, { onConflict: "user_id,date" });

      } catch {
        setResult({
          verse: "수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라",
          reference: "마태복음 11:28",
          message: "지치고 힘든 마음을 주님께 내려놓는 하루가 되길 바랍니다. 혼자 짊어지지 않아도 됩니다.",
          mission: "오늘 5분만 조용한 곳에서 눈 감고 주님께 솔직하게 마음을 털어놓아 보세요.",
        });
      } finally {
        setLoading(false);
      }
    }
    loadVerse();
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <Loader2 size={32} style={{ color: "var(--sage)" }} className="spin" />
      <p style={{ color: "var(--text3)", fontSize: 14 }}>{t("result_loading", lang)}</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 40 }} className="fade-in">
      <div style={{ background: "var(--bg)", padding: "56px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{t("back", lang)}</span>
        </button>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", fontFamily: "'Fraunces', serif" }}>{t('result_title', lang)}</h1>
        <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>{t('result_sub', lang)}</p>
      </div>

      <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* 말씀 카드 */}
        <div className="card-sage">
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 10 }}>
            {result?.reference}
          </p>
          <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.7, fontStyle: "italic", fontFamily: "'Fraunces', serif" }}>
            "{result?.verse}"
          </p>
          <div style={{ borderTop: "1px solid rgba(122,158,118,0.25)", marginTop: 14, paddingTop: 12 }}>
            <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65 }}>{result?.message}</p>
          </div>
        </div>

        {/* 결단 카드 */}
        <div className="card-terra">
          <p style={{ fontSize: 9, fontWeight: 700, color: "var(--terra)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>
            {t('result_mission', lang)}
          </p>
          <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65 }}>{result?.mission}</p>
        </div>

        {/* 홈으로만 */}
        <button onClick={() => router.push("/")} className="btn-primary" style={{ marginTop: 4 }}>
          {t('result_home_btn', lang)}
        </button>
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text3)" }}>
          {t('result_home_sub', lang)}
        </p>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} style={{ color: "var(--sage)" }} className="spin" />
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}
