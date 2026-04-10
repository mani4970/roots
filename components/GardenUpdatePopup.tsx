"use client";
// 10일마다 정원 업데이트 팝업
// 100일마다 배지 지급 팝업

const BADGES = [
  { name: "Love", fruit: "🍎", desc: "사랑", color: "#e83232" },
  { name: "Peace", fruit: "🍉", desc: "화평", color: "#3a8a3a" },
  { name: "Joy", fruit: "🍌", desc: "희락", color: "#f0c030" },
  { name: "Goodness", fruit: "🍊", desc: "양선", color: "#f07830" },
  { name: "Kindness", fruit: "🍒", desc: "자비", color: "#c02060" },
  { name: "Patience", fruit: "🍍", desc: "오래참음", color: "#d4a030" },
  { name: "Faithfulness", fruit: "🍇", desc: "충성", color: "#8040c0" },
  { name: "Gentleness", fruit: "🍋", desc: "온유", color: "#d4c030" },
  { name: "Self-Control", fruit: "🍓", desc: "절제", color: "#e84060" },
];

interface GardenUpdatePopupProps {
  show: boolean;
  type: "garden" | "badge";  // garden=10일, badge=100일
  streakDays: number;
  badgeIndex?: number;  // 0~8 (배지 인덱스)
  onClose: () => void;
}

function getGardenStageMsg(days: number) {
  const cycleDay = days === 0 ? 0 : ((days - 1) % 100) + 1;
  const stage = Math.ceil(cycleDay / 10);
  const msgs = [
    "씨앗이 뿌려졌어요! 🌱",
    "새싹이 폈어요! 🌿",
    "묘목이 자라나고 있어요! 🌲",
    "가지가 뻗어나갔어요! 🌳",
    "나무가 무럭무럭 커요! 🌴",
    "말씀에 깊이 뿌리내렸어요! 🌿",
    "열매를 맺기 시작했어요! 🍃",
    "새들이 날아와 깃들었어요! 🐦",
    "정원이 거의 완성됐어요! ✨",
    "풍성한 정원이 완성됐어요! 🌺",
  ];
  return msgs[Math.min(stage - 1, 9)] ?? "정원이 자라고 있어요!";
}

export default function GardenUpdatePopup({ show, type, streakDays, badgeIndex = 0, onClose }: GardenUpdatePopupProps) {
  if (!show) return null;
  const badge = BADGES[badgeIndex % BADGES.length];
  const isBadge = type === "badge";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 101,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "rgba(26,28,30,0.88)", backdropFilter: "blur(10px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg2)", borderRadius: 28,
          border: `1px solid ${isBadge ? "rgba(232,197,71,0.5)" : "var(--border)"}`,
          padding: "32px 28px 24px",
          margin: "0 28px", maxWidth: 340, width: "100%",
          textAlign: "center",
          boxShadow: isBadge ? "0 0 40px rgba(232,197,71,0.2)" : "none",
        }}
      >
        {isBadge ? (
          <>
            {/* 배지 획득 */}
            <div style={{ fontSize: 60, marginBottom: 8 }}>🏅</div>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(232,197,71,0.15)",
              border: "3px solid rgba(232,197,71,0.6)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", gap: 2,
            }}>
              <span style={{ fontSize: 32 }}>{badge.fruit}</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(232,197,71,0.9)", letterSpacing: 0.5 }}>
                {badge.name.toUpperCase()}
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>
              성령의 열매 획득! 🎉
            </h2>
            <div style={{
              padding: "12px 16px", background: "rgba(232,197,71,0.1)",
              borderRadius: 14, border: "1px solid rgba(232,197,71,0.3)", marginBottom: 8,
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(232,197,71,0.95)", marginBottom: 4 }}>
                {badge.name} — {badge.desc}
              </p>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
                100일 동안 말씀에 뿌리내린 당신에게<br />하나님이 주시는 열매예요!
              </p>
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 16 }}>
              프로필에서 확인할 수 있어요 ✨
            </p>
          </>
        ) : (
          <>
            {/* 10일 업데이트 */}
            <div style={{ fontSize: 52, marginBottom: 14 }}>🌱</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 8, lineHeight: 1.3 }}>
              {getGardenStageMsg(streakDays)}
            </h2>
            <div style={{
              padding: "12px 14px", background: "var(--sage-light)",
              borderRadius: 14, border: "1px solid rgba(122,157,122,0.3)", marginBottom: 8,
            }}>
              <p style={{ fontSize: 13, color: "var(--sage-dark)", lineHeight: 1.7 }}>
                정원이 업데이트됐어요.<br />지금 바로 확인해보세요!
              </p>
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 16 }}>
              {streakDays}일째 말씀과 동행 중 🔥
            </p>
          </>
        )}

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "13px",
            background: isBadge ? "rgba(232,197,71,0.9)" : "var(--sage)",
            color: isBadge ? "#1a1c1e" : "var(--bg)",
            border: "none", borderRadius: 14,
            fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}
        >
          {isBadge ? "배지 확인하기 🌟" : "정원 확인하러 가기 🌿"}
        </button>
      </div>
    </div>
  );
}
