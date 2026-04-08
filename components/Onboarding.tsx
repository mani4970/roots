"use client";
import { useState } from "react";

const SLIDES = [
  { emoji: "🌱", title: "Roots에 오신 걸 환영해요", desc: "말씀에 뿌리내리고, 함께 자라다.\n매일 큐티, 기도, 결단으로 나무를 키워요." },
  { emoji: "🌳", title: "나무가 자라요", desc: "매일 큐티나 기도를 하면 나무가 자라요.\n150일이 되면 풍성한 정원이 완성돼요!" },
  { emoji: "💧", title: "루틴을 완성해요", desc: "큐티 + 기도 + 결단\n세 가지를 모두 완료하면 confetti가 터져요 🎉" },
  { emoji: "✨", title: "오늘의 루틴", desc: "① 오늘의 말씀 받기\n② 큐티하기\n③ 기도 제목 적기\n④ 결단 실천하기" },
];

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const slide = SLIDES[page];
  const isLast = page === SLIDES.length - 1;

  function neverShow() {
    localStorage.setItem("onboarding_done", "true");
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ background: "var(--bg2)", borderRadius: 28, border: "1px solid var(--border)", width: "100%", maxWidth: 360, padding: "36px 28px 28px", textAlign: "center" }}>
        {/* 도트 */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{ width: i === page ? 20 : 6, height: 6, borderRadius: 3, background: i === page ? "var(--sage)" : "var(--border)", transition: "all 0.3s" }} />
          ))}
        </div>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{slide.emoji}</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 14, lineHeight: 1.3 }}>{slide.title}</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8, whiteSpace: "pre-line", marginBottom: 32 }}>{slide.desc}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => isLast ? neverShow() : setPage(p => p + 1)} className="btn-sage">
            {isLast ? "시작하기 🌱" : "다음 →"}
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} className="btn-outline" style={{ flex: 1, fontSize: 13 }}>닫기</button>
            <button onClick={neverShow} className="btn-outline" style={{ flex: 1, fontSize: 13 }}>다시 보지 않기</button>
          </div>
        </div>
      </div>
    </div>
  );
}
