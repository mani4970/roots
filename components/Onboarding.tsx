"use client";
import { useState } from "react";

const SLIDES = [
  {
    emoji: "🌱",
    title: "Roots에 오신 걸 환영해요",
    desc: "말씀에 뿌리내리고, 함께 자라다.\n매일 3가지 루틴으로 하나님과 깊어지는 시간을 만들어요.",
    sub: null,
  },
  {
    emoji: "💭",
    title: "오늘 마음으로 말씀을 받아요",
    desc: "오늘 내 감정을 선택하면\nRoots가 딱 맞는 말씀과 오늘의 결단을 건네줘요.",
    sub: "\"기도하세요\"가 아니라\n\"오늘 점심 5분, 핸드폰 내려놓고 주님께 말 걸어보세요\"처럼\n손발로 할 수 있는 것들이에요.",
  },
  {
    emoji: "📖",
    title: "큐티 6단계로 말씀을 심어요",
    desc: "① 들어가는 기도\n② 본문 요약\n③ 붙잡은 말씀\n④ 느낌과 묵상\n⑤ 적용과 결단\n⑥ 올려드리는 기도",
    sub: "처음이어도 괜찮아요.\n각 단계마다 안내가 있어서 혼자서도 충분히 할 수 있어요.",
  },
  {
    emoji: "🙏",
    title: "기도 제목을 기록하고 응답을 확인해요",
    desc: "기도 제목을 적고, 응답됐을 때 간증을 남겨요.\n중보기도 요청으로 함께 기도할 수도 있어요.",
    sub: "기도 중 → 기도 응답으로\n하나님의 일하심을 기록해가요.",
  },
  {
    emoji: "🌳",
    title: "매일 하면 정원이 자라요",
    desc: "큐티 + 기도 + 결단, 3가지를 모두 완료하면\n나무가 자라 100일마다 성령의 열매 배지를 받아요.",
    sub: "꾸준히 하는 게 핵심이에요.\n오늘부터 시작해봐요! 🌱",
  },
];

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const slide = SLIDES[page];
  const isLast = page === SLIDES.length - 1;

  function neverShow() {
    localStorage.setItem("onboarding_done", "true");
    onClose();
  }

  function next() {
    if (!isLast) setPage(p => p + 1);
    else neverShow();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ background: "var(--bg2)", borderRadius: 28, border: "1px solid var(--border)", width: "100%", maxWidth: 360, padding: "36px 28px 28px", textAlign: "center" }}>

        {/* 진행 도트 */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{ width: i === page ? 20 : 6, height: 6, borderRadius: 3, background: i === page ? "var(--sage)" : "var(--border)", transition: "all 0.3s" }} />
          ))}
        </div>

        <div style={{ fontSize: 56, marginBottom: 16 }}>{slide.emoji}</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 14, lineHeight: 1.3 }}>
          {slide.title}
        </h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.85, whiteSpace: "pre-line", marginBottom: slide.sub ? 14 : 32 }}>
          {slide.desc}
        </p>
        {slide.sub && (
          <div style={{ background: "var(--bg3)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--border)", marginBottom: 28 }}>
            <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7, whiteSpace: "pre-line" }}>{slide.sub}</p>
          </div>
        )}

        {/* 버튼 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={next} className="btn-sage">
            {isLast ? "시작하기 🌱" : "다음 →"}
          </button>
          {!isLast ? (
            <button onClick={neverShow} className="btn-outline" style={{ fontSize: 12 }}>
              건너뛰기
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
