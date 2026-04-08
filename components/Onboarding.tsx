"use client";
import { useState } from "react";

const SLIDES = [
  {
    emoji: "🌱",
    title: "Roots에 오신 걸 환영해요",
    desc: "말씀에 뿌리내리고, 함께 자라다.\n매일 5분, 하나님과 깊어지는 시간을 만들어요.",
    sub: null,
  },
  {
    emoji: "💭",
    title: "감정 체크인으로 시작해요",
    desc: "오늘 내 마음 상태를 선택하면 AI가\n오늘의 말씀과 구체적 결단을 건네줘요.",
    sub: "\"기도하세요\"가 아니라\n\"오늘 점심 5분, 핸드폰 내려놓고 주님께 말 걸어보세요\"처럼요.",
  },
  {
    emoji: "📖",
    title: "큐티 6단계로 말씀을 심어요",
    desc: "① 들어가는 기도\n② 본문 요약\n③ 붙잡은 말씀\n④ 느낌과 묵상\n⑤ 적용과 결단\n⑥ 올려드리는 기도",
    sub: "각 단계마다 예시가 있어서\n처음이어도 혼자서 할 수 있어요!",
  },
  {
    emoji: "🌳",
    title: "매일 하면 나무가 자라요",
    desc: "큐티, 기도, 결단을 완료할수록\n나무가 자라 150일이면 정원이 완성돼요!",
    sub: "7일 쉬면 나무가 시들어요 🥺\n매일 조금씩, 꾸준히가 핵심이에요.",
  },
  {
    emoji: "👥",
    title: "함께하면 더 오래 해요",
    desc: "그룹을 만들어 큐티를 나누고\n서로의 기도제목을 위해 함께 기도해요.",
    sub: "혼자 하는 신앙에서\n함께 자라는 신앙으로.",
  },
];

async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const [showNotifStep, setShowNotifStep] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const slide = SLIDES[page];
  const isLast = page === SLIDES.length - 1;

  function neverShow() {
    localStorage.setItem("onboarding_done", "true");
    onClose();
  }

  function next() {
    if (!isLast) setPage(p => p + 1);
    else setShowNotifStep(true);
  }

  async function handleNotifRequest() {
    setRequesting(true);
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
    setRequesting(false);
    if (granted) setTimeout(() => neverShow(), 1200);
  }

  if (showNotifStep) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ background: "var(--bg2)", borderRadius: 28, border: "1px solid var(--border)", width: "100%", maxWidth: 360, padding: "36px 28px 28px", textAlign: "center" }}>
          {notifGranted ? (
            <>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--sage-dark)", marginBottom: 12 }}>준비됐어요!</h2>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>매일 아침 말씀 알림이 올 거예요.<br />Roots와 함께 자라가요 🌱</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🔔</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 12, lineHeight: 1.3 }}>알림을 허용해주세요</h2>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.75, marginBottom: 8 }}>
                매일 아침 큐티 알림으로<br />말씀 루틴을 놓치지 않아요.
              </p>
              <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 28 }}>알림이 없으면 루틴을 잊기 쉬워요 😢</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={handleNotifRequest} disabled={requesting} className="btn-sage" style={{ fontSize: 14 }}>
                  {requesting ? "요청 중..." : "🔔 알림 허용하기"}
                </button>
                <button onClick={neverShow} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 12, cursor: "pointer", padding: "8px" }}>
                  나중에 설정할게요
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ background: "var(--bg2)", borderRadius: 28, border: "1px solid var(--border)", width: "100%", maxWidth: 360, padding: "36px 28px 28px", textAlign: "center" }}>
        {/* 도트 */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{ width: i === page ? 20 : 6, height: 6, borderRadius: 3, background: i === page ? "var(--sage)" : "var(--border)", transition: "all 0.3s" }} />
          ))}
        </div>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{slide.emoji}</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 14, lineHeight: 1.3 }}>{slide.title}</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.85, whiteSpace: "pre-line", marginBottom: slide.sub ? 14 : 32 }}>{slide.desc}</p>
        {slide.sub && (
          <div style={{ background: "var(--bg3)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--border)", marginBottom: 24 }}>
            <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7, whiteSpace: "pre-line" }}>{slide.sub}</p>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={next} className="btn-sage">{isLast ? "시작하기 🌱" : "다음 →"}</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} className="btn-outline" style={{ flex: 1, fontSize: 12 }}>닫기</button>
            <button onClick={neverShow} className="btn-outline" style={{ flex: 1, fontSize: 12 }}>다시 보지 않기</button>
          </div>
        </div>
      </div>
    </div>
  );
}
