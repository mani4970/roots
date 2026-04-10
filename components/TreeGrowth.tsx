"use client";
import Image from "next/image";
import RootsMan from "./RootsMan";

interface TreeGrowthProps {
  days: number;
  heartHalves?: number; // 0~10 (반칸 단위, 10=꽉 참)
  lastCheckin: string | null;
  showRootsMan?: boolean;
}

function getCycleInfo(days: number) {
  if (days === 0) return { cycleDay: 0, cycleIndex: 0 };
  const cycleIndex = Math.floor((days - 1) / 100);
  const cycleDay = ((days - 1) % 100) + 1;
  return { cycleDay, cycleIndex };
}

function getImgIndex(cycleDay: number) {
  if (cycleDay === 0) return 1;
  return Math.min(Math.ceil(cycleDay / 10) + 1, 11);
}

function getTreeState(days: number, lastCheckin: string | null) {
  let daysSince = 0;
  if (lastCheckin) {
    const last = new Date(lastCheckin);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    last.setHours(0, 0, 0, 0);
    daysSince = Math.floor((today.getTime() - last.getTime()) / 86400000);
  }
  const { cycleDay, cycleIndex } = getCycleInfo(days);
  const img = days === 0 ? 1 : getImgIndex(cycleDay);
  const stageLabels = [
    "씨앗 심겨졌어요","씨앗","새싹","묘목","성장 중",
    "나무","열매 맺음","정원 시작","정원 성장","정원 완성 🏆","풍성한 정원 🌳",
  ];
  const stageDescs = [
    "겨자씨가 땅에 심겨졌어요","겨자씨가 땅에 심겨졌어요","고개를 들고 햇빛을 찾아요",
    "뿌리를 단단히 내리고 있어요","가지가 뻗어나가고 있어요","든든하게 자라나고 있어요",
    "새들이 날아와 깃들었어요","새 씨앗이 뿌려졌어요","이웃 나무가 자라고 있어요",
    "아름다운 정원이 완성됐어요!","열매가 가득한 정원이에요!",
  ];
  return { img, cycleDay, cycleIndex, stage: { label: stageLabels[img-1], desc: stageDescs[img-1] }, daysSince };
}

function isNightTime() {
  const h = new Date().getHours();
  return h >= 20 || h < 5;
}

// heartHalves 0~10 → heart_0.png ~ heart_10.png (또는 heart_11.png)
// heart_0 = 거의 빈, heart_10/11 = 꽉 참
function getHeartImgIndex(heartHalves: number): number {
  const clamped = Math.max(0, Math.min(10, heartHalves));
  return clamped; // 0~10 → heart_0.png ~ heart_10.png
}

export default function TreeGrowth({ days, heartHalves, lastCheckin, showRootsMan = false }: TreeGrowthProps) {
  const { img, cycleDay, cycleIndex, stage, daysSince } = getTreeState(days, lastCheckin);
  const isNight = isNightTime();
  const imgSrc = isNight ? `/dark${img}.png` : `/tree${img}.png`;

  // heartHalves: DB값 우선, 없으면 cycleDay 기반 계산
  const displayHearts = typeof heartHalves === "number"
    ? heartHalves
    : (cycleDay % 10 === 0 && cycleDay > 0 ? 10 : (cycleDay % 10) * 2);

  const heartImgIdx = getHeartImgIndex(displayHearts);
  const periodProgress = (displayHearts / 10) * 100;
  const isAway = daysSince >= 3;

  return (
    <div style={{ margin: "0 16px 14px" }}>
      {isAway && (
        <div style={{ background: "rgba(196,149,106,0.12)", border: "1px solid rgba(196,149,106,0.25)", borderRadius: 12, padding: "8px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🌿</span>
          <span style={{ fontSize: 12, color: "var(--terra-dark)" }}>
            {daysSince}일 만이에요! 오늘 루틴으로 다시 뿌리내려봐요 💪
          </span>
        </div>
      )}

      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "16/9", background: "var(--bg2)" }}>
        <Image src={imgSrc} alt={stage.label} fill
          style={{ objectFit: "cover" }} priority />

        {/* 단계 뱃지 */}
        <div style={{ position: "absolute", top: 10, left: 10, background: "var(--sage)", color: "var(--bg)", fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 20, zIndex: 6 }}>
          {stage.label}
        </div>
        {/* 날짜 뱃지 */}
        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(26,28,30,0.8)", color: "var(--text)", fontSize: 10, fontWeight: 600, padding: "4px 12px", borderRadius: 20, backdropFilter: "blur(4px)", zIndex: 6 }}>
          {days}일째
        </div>
        {/* N번째 정원 */}
        {cycleIndex > 0 && (
          <div style={{ position: "absolute", top: 36, right: 10, background: "rgba(232,197,71,0.9)", color: "#1a1c1e", fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 20, zIndex: 6 }}>
            🌟 {cycleIndex+1}번째 정원
          </div>
        )}

        {/* 하트 이미지 - 왼쪽 하단 고정 */}
        <div style={{
          position: "absolute", bottom: 8, left: 8, zIndex: 8,
          background: "rgba(26,28,30,0.55)", backdropFilter: "blur(4px)",
          borderRadius: 10, padding: "4px 8px",
          width: 80, height: 28, overflow: "hidden",
        }}>
          <img
            src={`/heart_${heartImgIdx}.png`}
            alt={`하트 ${displayHearts}/10`}
            style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }}
          />
        </div>

        <RootsMan trigger={showRootsMan} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "0 2px" }}>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>{stage.desc}</span>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>
          ❤️ {Math.floor(displayHearts/2)}{displayHearts%2===1?".5":""} / 5
        </span>
      </div>
      <div className="progress-bar" style={{ marginTop: 6 }}>
        <div className="progress-fill" style={{ width: `${periodProgress}%` }} />
      </div>
      <div style={{ marginTop: 8 }}>
        <div className="streak-chip">
          <span style={{ fontSize: 12 }}>{isAway ? "🌿" : "🔥"}</span>
          <span>{days}일 연속 기록 중</span>
        </div>
      </div>
    </div>
  );
}
