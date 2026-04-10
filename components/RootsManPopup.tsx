"use client";
// 농부가 나타났을 때 보여주는 팝업
// Celebration 닫힌 후 → 이 팝업 → 닫으면 정원(홈 상단)으로 스크롤

interface RootsManPopupProps {
  show: boolean;
  streakDays: number;
  onClose: () => void;
}

function getGardenMessage(days: number) {
  const cycleDay = days === 0 ? 0 : ((days - 1) % 100) + 1;
  if (cycleDay <= 10) return "씨앗이 땅속에서 뿌리를 내리기 시작했어요.";
  if (cycleDay <= 20) return "새싹이 조금씩 고개를 내밀고 있어요.";
  if (cycleDay <= 30) return "묘목이 햇빛을 향해 자라고 있어요.";
  if (cycleDay <= 40) return "가지가 뻗어나가고 뿌리가 깊어지고 있어요.";
  if (cycleDay <= 50) return "나무가 든든하게 자라나고 있어요.";
  if (cycleDay <= 60) return "말씀에 점점 더 깊이 뿌리를 내리고 있어요.";
  if (cycleDay <= 70) return "열매를 맺어가고 있어요. 계속 나아가요!";
  if (cycleDay <= 80) return "새들이 날아와 쉬어갈 만큼 자랐어요.";
  if (cycleDay <= 90) return "아름다운 정원이 거의 완성되어 가요!";
  return "풍성한 정원이 완성되어 가고 있어요! 🌳";
}

export default function RootsManPopup({ show, streakDays, onClose }: RootsManPopupProps) {
  if (!show) return null;
  const msg = getGardenMessage(streakDays);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 99,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-end",
        background: "rgba(26,28,30,0.7)", backdropFilter: "blur(6px)",
        paddingBottom: 80,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg2)", borderRadius: 24,
          border: "1px solid var(--border)",
          padding: "24px 24px 20px",
          margin: "0 20px", maxWidth: 360, width: "100%",
          textAlign: "center",
        }}
      >
        {/* 농부 아이콘 영역 */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "var(--sage-light)",
          border: "2px solid rgba(122,157,122,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 14px", fontSize: 36,
        }}>
          🧑‍🌾
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 8, lineHeight: 1.3 }}>
          농부가 물을 주고 있어요
        </h3>

        <div style={{
          padding: "12px 14px",
          background: "var(--sage-light)",
          borderRadius: 14,
          border: "1px solid rgba(122,157,122,0.3)",
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, color: "var(--sage-dark)", lineHeight: 1.7 }}>
            {msg}
          </p>
        </div>

        <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 16 }}>
          정원을 확인해보세요 🌱
        </p>

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "12px",
            background: "var(--sage)", color: "var(--bg)",
            border: "none", borderRadius: 14,
            fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}
        >
          정원 보러 가기
        </button>
      </div>
    </div>
  );
}
