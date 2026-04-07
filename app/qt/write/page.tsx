"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ChevronLeft, Check, Loader2 } from "lucide-react";

const STEPS = [
  { id: "opening_prayer", step: 1, title: "들어가는 기도", subtitle: "말씀 앞에 나아가기 전 기도", placeholder: "주님, 오늘 말씀 앞에 나아갑니다...", hint: "짧아도 괜찮아요. 마음을 열고 주님께 나아가는 기도예요." },
  { id: "bible_ref", step: 2, title: "본문 요약", subtitle: "오늘 읽은 성경 본문", placeholder: "예) 마태복음 11:28-30", hint: "본문을 입력하고 읽은 내용을 간단히 요약해보세요.", hasExtra: true, extraId: "summary", extraPlaceholder: "본문 내용을 간략하게 요약해보세요..." },
  { id: "key_verse", step: 3, title: "붙잡은 말씀", subtitle: "마음에 와닿은 구절", placeholder: "오늘 특별히 마음에 와닿은 구절...", hint: "왜 이 구절인지도 함께 적어보세요.", hasExtra: true, extraId: "key_verse_reason", extraPlaceholder: "이 구절이 마음에 와닿은 이유는..." },
  { id: "meditation", step: 4, title: "느낌과 묵상", subtitle: "이 말씀이 내게 주는 의미", placeholder: "이 말씀이 오늘 내 삶에 무슨 말씀인가요?", hint: "정답이 없어요. 솔직하게 느낀 것을 써보세요." },
  { id: "application", step: 5, title: "적용과 결단", subtitle: "오늘 하루 어떻게 살 건가요?", placeholder: "오늘 이 말씀을 삶에서 어떻게 적용할 건가요?", hint: "작고 구체적일수록 좋아요.", hasExtra: true, extraId: "decision", extraPlaceholder: "결단 선언: 오늘 나는..." },
  { id: "closing_prayer", step: 6, title: "올려드리는 기도", subtitle: "말씀으로 드리는 기도", placeholder: "말씀을 붙들고 기도를 올려드려요...", hint: "말씀을 붙잡고 주님께 올려드리는 기도예요.", isLast: true },
];

export default function QTWritePage() {
  const router = useRouter();
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const step = STEPS[cur] as any;
  const canNext = (answers[step.id] ?? "").trim().length > 0;

  async function save() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("qt_records").insert({
        user_id: user.id, date: today,
        opening_prayer: answers.opening_prayer ?? "",
        bible_ref: answers.bible_ref ?? "",
        summary: answers.summary ?? "",
        key_verse: answers.key_verse ?? "",
        key_verse_reason: answers.key_verse_reason ?? "",
        meditation: answers.meditation ?? "",
        application: answers.application ?? "",
        decision: answers.decision ?? "",
        closing_prayer: answers.closing_prayer ?? "",
      });
      const { data: profile } = await supabase.from("profiles").select("streak_days,total_days,last_checkin").eq("id", user.id).single();
      if (profile) {
        const last = profile.last_checkin ? new Date(profile.last_checkin) : null;
        const todayD = new Date(today);
        const yesterday = new Date(todayD);
        yesterday.setDate(yesterday.getDate() - 1);
        let newStreak = 1;
        if (last && last.toDateString() === yesterday.toDateString()) newStreak = (profile.streak_days ?? 0) + 1;
        else if (last && last.toDateString() === todayD.toDateString()) newStreak = profile.streak_days ?? 1;
        await supabase.from("profiles").update({ streak_days: newStreak, total_days: (profile.total_days ?? 0) + 1, last_checkin: today }).eq("id", user.id);
      }
      router.push("/qt/complete");
    } finally { setSaving(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "var(--bg)", padding: "56px 20px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>나가기</span>
        </button>
        <div className="step-bar">
          {STEPS.map((_, i) => (
            <div key={i} className={`step-bar-item ${i < cur ? "done" : i === cur ? "curr" : ""}`} />
          ))}
        </div>
        <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 5 }}>{step.step} / 6단계</p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", fontFamily: "'Fraunces', serif" }}>{step.title}</h1>
        <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>{step.subtitle}</p>
      </div>

      {/* 단계 점프 */}
      <div className="step-jumps">
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => i < cur && setCur(i)}
            className={`step-jump ${i < cur ? "done" : i === cur ? "curr" : ""}`}
            style={{ cursor: i < cur ? "pointer" : "default" }}>
            {i + 1}. {s.title.slice(0, 2)}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
        <textarea
          className="textarea-field"
          rows={step.hasExtra ? 4 : 8}
          placeholder={step.placeholder}
          value={answers[step.id] ?? ""}
          onChange={e => setAnswers(p => ({ ...p, [step.id]: e.target.value }))}
        />
        {step.hasExtra && (
          <textarea
            className="textarea-field"
            rows={4}
            placeholder={step.extraPlaceholder}
            value={answers[step.extraId] ?? ""}
            onChange={e => setAnswers(p => ({ ...p, [step.extraId]: e.target.value }))}
          />
        )}
        <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5, padding: "0 2px" }}>{step.hint}</p>
      </div>

      <div style={{ padding: "12px 16px 32px", display: "flex", gap: 8, flexShrink: 0 }}>
        {cur > 0 && (
          <button onClick={() => setCur(p => p - 1)} className="btn-outline" style={{ flex: 1 }}>← 이전</button>
        )}
        {step.isLast ? (
          <button onClick={save} disabled={!canNext || saving} className="btn-sage" style={{ flex: 2 }}>
            {saving ? <><Loader2 size={18} className="spin" />저장 중...</> : <><Check size={18} />큐티 완료</>}
          </button>
        ) : (
          <button onClick={() => setCur(p => p + 1)} disabled={!canNext} className="btn-primary" style={{ flex: cur > 0 ? 2 : 1 }}>
            다음 단계 →
          </button>
        )}
      </div>
    </div>
  );
}
