"use client";

import Image from "next/image";

interface TreeGrowthProps {
  days: number;
  lastCheckin: string | null;
}

function getTreeState(days: number, lastCheckin: string | null) {
  // 마지막 체크인으로부터 며칠 지났는지 계산
  let daysSinceCheckin = 0;
  if (lastCheckin) {
    const last = new Date(lastCheckin);
    const today = new Date();
    today.setHours(0,0,0,0);
    last.setHours(0,0,0,0);
    daysSinceCheckin = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  }

  // 단절 판정
  const isWithering = daysSinceCheckin >= 7 && daysSinceCheckin < 14; // 시들어가는 중
  const isRegressed = daysSinceCheckin >= 14; // 한 단계 뒤로

  // 이미지 단계 결정
  let imageIndex = 1;
  let effectiveDays = days;

  // 14일 이상 단절이면 한 단계 뒤로
  if (isRegressed && days > 0) {
    effectiveDays = Math.max(0, days - 15);
  }

  if (effectiveDays === 0) imageIndex = 1;
  else if (effectiveDays <= 14) imageIndex = 2;
  else if (effectiveDays <= 29) imageIndex = 3;
  else if (effectiveDays <= 44) imageIndex = 4;
  else if (effectiveDays <= 59) imageIndex = 5;
  else if (effectiveDays <= 79) imageIndex = 6;
  else if (effectiveDays <= 99) imageIndex = 7;
  else if (effectiveDays <= 114) imageIndex = 8;
  else if (effectiveDays <= 129) imageIndex = 9;
  else imageIndex = 10;

  const stages = [
    { label: "씨앗", desc: "첫 발걸음을 내딛어요" },
    { label: "씨앗", desc: "겨자씨 한 알이 기다리고 있어요" },
    { label: "새싹", desc: "고개를 들고 햇빛을 찾아요" },
    { label: "묘목", desc: "뿌리를 단단히 내리고 있어요" },
    { label: "성장 중", desc: "가지가 뻗어나가고 있어요" },
    { label: "나무", desc: "든든하게 자라나고 있어요" },
    { label: "열매 맺음", desc: "새들이 날아와 깃들었어요 🎉" },
    { label: "정원 시작", desc: "새 씨앗이 뿌려졌어요" },
    { label: "정원 성장", desc: "이웃 나무가 자라고 있어요" },
    { label: "정원 완성 🏆", desc: "아름다운 정원이 완성됐어요!" },
  ];

  const stage = stages[imageIndex - 1];

  return { imageIndex, stage, isWithering, isRegressed, daysSinceCheckin };
}

export default function TreeGrowth({ days, lastCheckin }: TreeGrowthProps) {
  const { imageIndex, stage, isWithering, isRegressed, daysSinceCheckin } = getTreeState(days, lastCheckin);

  return (
    <div style={{ margin: "0 16px 14px" }}>
      {/* 단절 경고 */}
      {isWithering && !isRegressed && (
        <div style={{ background: "#FFF3CD", border: "1px solid #FFD97D", borderRadius: 12, padding: "8px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🥀</span>
          <span style={{ fontSize: 12, color: "#856404" }}>나무가 시들고 있어요. {14 - daysSinceCheckin}일 후엔 한 단계 돌아가요!</span>
        </div>
      )}
      {isRegressed && (
        <div style={{ background: "#FFE8E8", border: "1px solid #FFAAAA", borderRadius: 12, padding: "8px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>💔</span>
          <span style={{ fontSize: 12, color: "#A03030" }}>오랜만이에요. 다시 함께 자라봐요!</span>
        </div>
      )}

      {/* 나무 이미지 */}
      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "16/9" }}>
        <Image
          src={`/tree${imageIndex}.png`}
          alt={stage.label}
          fill
          style={{
            objectFit: "cover",
            filter: isWithering ? "grayscale(40%) brightness(0.85)" : "none",
            transition: "filter 0.5s ease",
          }}
          priority
        />
        {/* 단계 배지 */}
        <div style={{ position: "absolute", top: 10, left: 10, background: "var(--terra)", color: "white", fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>
          {stage.label}
        </div>
        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.88)", color: "var(--text)", fontSize: 10, fontWeight: 600, padding: "4px 12px", borderRadius: 20 }}>
          {days}일째
        </div>
        {/* 시들어가는 오버레이 */}
        {isWithering && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(100,80,50,0.15)", borderRadius: 20 }} />
        )}
      </div>

      {/* 진행 정보 */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "0 2px" }}>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>{stage.desc}</span>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>{Math.min(days, 100)} / 100일</span>
      </div>
      <div className="progress-bar" style={{ marginTop: 6 }}>
        <div className="progress-fill" style={{ width: `${Math.min((days / 100) * 100, 100)}%` }} />
      </div>
      <div style={{ marginTop: 8 }}>
        <div className="streak-chip">
          <span style={{ fontSize: 12 }}>{isWithering ? "🥀" : "🔥"}</span>
          <span>{days}일 연속 기록 중</span>
        </div>
      </div>
    </div>
  );
}
