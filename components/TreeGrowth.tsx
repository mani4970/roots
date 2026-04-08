"use client";
import Image from "next/image";

interface TreeGrowthProps {
  days: number;
  lastCheckin: string | null;
  allDone?: boolean;
}

function getTreeState(days: number, lastCheckin: string | null) {
  let daysSince = 0;
  if (lastCheckin) {
    const last = new Date(lastCheckin);
    const today = new Date();
    today.setHours(0,0,0,0); last.setHours(0,0,0,0);
    daysSince = Math.floor((today.getTime() - last.getTime()) / 86400000);
  }
  const isWithering = daysSince >= 7 && daysSince < 14;
  const isRegressed = daysSince >= 14;
  let effectiveDays = days;
  if (isRegressed && days > 0) effectiveDays = Math.max(0, days - 15);

  let img = 1;
  if (effectiveDays === 0) img = 1;
  else if (effectiveDays <= 14) img = 2;
  else if (effectiveDays <= 29) img = 3;
  else if (effectiveDays <= 44) img = 4;
  else if (effectiveDays <= 59) img = 5;
  else if (effectiveDays <= 79) img = 6;
  else if (effectiveDays <= 99) img = 7;
  else if (effectiveDays <= 114) img = 8;
  else if (effectiveDays <= 129) img = 9;
  else img = 10;

  const stages = [
    { label: "씨앗 심겨졌어요", desc: "겨자씨가 땅에 심겨졌어요" },
    { label: "씨앗", desc: "겨자씨가 땅에 심겨졌어요" },
    { label: "새싹", desc: "고개를 들고 햇빛을 찾아요" },
    { label: "묘목", desc: "뿌리를 단단히 내리고 있어요" },
    { label: "성장 중", desc: "가지가 뻗어나가고 있어요" },
    { label: "나무", desc: "든든하게 자라나고 있어요" },
    { label: "열매 맺음 🎉", desc: "새들이 날아와 깃들었어요" },
    { label: "정원 시작", desc: "새 씨앗이 뿌려졌어요" },
    { label: "정원 성장", desc: "이웃 나무가 자라고 있어요" },
    { label: "정원 완성 🏆", desc: "아름다운 정원이 완성됐어요!" },
  ];

  return { img, stage: stages[img - 1], isWithering, isRegressed, daysSince };
}

export default function TreeGrowth({ days, lastCheckin }: TreeGrowthProps) {
  const { img, stage, isWithering, isRegressed, daysSince } = getTreeState(days, lastCheckin);

  return (
    <div style={{ margin: "0 16px 14px" }}>
      {isWithering && !isRegressed && (
        <div style={{ background: "rgba(196,149,106,0.15)", border: "1px solid rgba(196,149,106,0.3)", borderRadius: 12, padding: "8px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🥀</span>
          <span style={{ fontSize: 12, color: "var(--terra-dark)" }}>나무가 시들고 있어요. {14 - daysSince}일 후엔 한 단계 돌아가요!</span>
        </div>
      )}
      {isRegressed && (
        <div style={{ background: "rgba(196,149,106,0.1)", border: "1px solid rgba(196,149,106,0.2)", borderRadius: 12, padding: "8px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>💔</span>
          <span style={{ fontSize: 12, color: "var(--terra-dark)" }}>오랜만이에요. 다시 함께 자라봐요!</span>
        </div>
      )}

      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "16/9", background: "var(--bg2)" }}>
        <Image
          src={`/tree${img}.png`}
          alt={stage.label}
          fill
          style={{ objectFit: "cover", filter: isWithering ? "grayscale(50%) brightness(0.7)" : "none" }}
          priority
        />
        <div style={{ position: "absolute", top: 10, left: 10, background: "var(--sage)", color: "var(--bg)", fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 20, zIndex: 6 }}>
          {stage.label}
        </div>
        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(26,28,30,0.8)", color: "var(--text)", fontSize: 10, fontWeight: 600, padding: "4px 12px", borderRadius: 20, backdropFilter: "blur(4px)", zIndex: 6 }}>
          {days}일째
        </div>
        {isWithering && <div style={{ position: "absolute", inset: 0, background: "rgba(100,70,30,0.2)", zIndex: 2 }} />}
      </div>

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
