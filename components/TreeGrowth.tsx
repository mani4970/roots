"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import RootsMan from "./RootsMan";

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

// 시간대 판별
function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 17) return "day";    // 낮
  if (h >= 17 && h < 20) return "evening"; // 저녁
  return "night";                          // 밤
}

// 해 스프라이트: sun and bird.png 위쪽 절반, 5프레임, 총 1408x384 (위쪽 384px)
const SUN_FRAMES = 5;
const SUN_SHEET_W = 1408;
const SUN_FRAME_W = SUN_SHEET_W / SUN_FRAMES; // 281.6px
const SUN_H = 384; // 위쪽 절반

// 새 스프라이트: sun and bird.png 아래쪽 절반, 6프레임
const BIRD_FRAMES = 6;
const BIRD_FRAME_W = SUN_SHEET_W / BIRD_FRAMES; // 234.67px
const BIRD_H = 384;

// 달 스프라이트: moon.png, 6프레임, 2816x1536
const MOON_FRAMES = 6;
const MOON_SHEET_W = 2816;
const MOON_FRAME_W = MOON_SHEET_W / MOON_FRAMES; // 469px
const MOON_H = 1536;

function SunSprite() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame(f => (f + 1) % SUN_FRAMES), 400);
    return () => clearInterval(t);
  }, []);
  const renderW = 48;
  const scale = renderW / SUN_FRAME_W;
  const renderH = Math.round(SUN_H * scale);
  return (
    <div style={{ position: "absolute", top: 8, left: 12, width: renderW, height: renderH, overflow: "hidden", imageRendering: "pixelated", zIndex: 3 }}>
      <img src="/sun and bird.png" alt="sun" style={{ position: "absolute", top: 0, left: -frame * SUN_FRAME_W * scale, width: SUN_SHEET_W * scale, height: SUN_H * scale * 2, imageRendering: "pixelated" }} />
    </div>
  );
}

function BirdSprite({ posX, posY }: { posX: number; posY: number }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const offset = Math.floor(Math.random() * BIRD_FRAMES);
    setFrame(offset);
    const t = setInterval(() => setFrame(f => (f + 1) % BIRD_FRAMES), 120);
    return () => clearInterval(t);
  }, []);
  const renderW = 28;
  const scale = renderW / BIRD_FRAME_W;
  const renderH = Math.round(BIRD_H * scale);
  return (
    <div style={{ position: "absolute", top: posY, left: `${posX}%`, width: renderW, height: renderH, overflow: "hidden", imageRendering: "pixelated", zIndex: 3 }}>
      <img src="/sun and bird.png" alt="bird" style={{ position: "absolute", top: -SUN_H * scale, left: -frame * BIRD_FRAME_W * scale, width: SUN_SHEET_W * scale, height: BIRD_H * scale * 2, imageRendering: "pixelated" }} />
    </div>
  );
}

function MoonSprite() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame(f => (f + 1) % MOON_FRAMES), 500);
    return () => clearInterval(t);
  }, []);
  const renderW = 52;
  const scale = renderW / MOON_FRAME_W;
  const renderH = Math.round(MOON_H * scale);
  return (
    <div style={{ position: "absolute", top: 6, right: 12, width: renderW, height: renderH, overflow: "hidden", imageRendering: "pixelated", zIndex: 3 }}>
      <img src="/moon.png" alt="moon" style={{ position: "absolute", top: 0, left: -frame * MOON_FRAME_W * scale, width: MOON_SHEET_W * scale, height: MOON_H * scale, imageRendering: "pixelated" }} />
    </div>
  );
}

export default function TreeGrowth({ days, lastCheckin, allDone = false }: TreeGrowthProps) {
  const { img, stage, isWithering, isRegressed, daysSince } = getTreeState(days, lastCheckin);
  const timeOfDay = getTimeOfDay();
  const isNight = timeOfDay === "night";
  const isEvening = timeOfDay === "evening";

  // 밤이면 dark.png (첫 번째 컷 = 1408x256 첫 행) 사용
  // dark.png는 4열x3행 스토리보드, 각 씬은 352x256
  // 가장 예쁜 첫 번째 씬(달밤+나무)을 나무 대신 보여줌

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

      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "16/9", background: isNight ? "#1a1f3a" : isEvening ? "#2d1f3a" : "var(--bg2)" }}>

        {/* 밤: dark.png 전체 배경으로 */}
        {isNight ? (
          <Image
            src="/dark.png"
            alt="밤 배경"
            fill
            style={{ objectFit: "cover", objectPosition: "50% 25%" }}
            priority
          />
        ) : (
          /* 낮/저녁: 나무 이미지 */
          <Image
            src={`/tree${img}.png`}
            alt={stage.label}
            fill
            style={{
              objectFit: "cover",
              filter: isWithering ? "grayscale(50%) brightness(0.7)" : isEvening ? "sepia(30%) brightness(0.85)" : "none",
              transition: "filter 0.5s ease",
            }}
            priority
          />
        )}

        {/* 저녁 어두운 오버레이 */}
        {isEvening && (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(80,40,20,0.35), rgba(20,10,40,0.2))", zIndex: 2 }} />
        )}

        {/* 낮: 해 + 새 스프라이트 */}
        {timeOfDay === "day" && (
          <>
            <SunSprite />
            <BirdSprite posX={55} posY={14} />
            <BirdSprite posX={70} posY={22} />
            <BirdSprite posX={40} posY={8} />
          </>
        )}

        {/* 밤: 달 스프라이트 */}
        {isNight && <MoonSprite />}

        {/* 배지 */}
        <div style={{ position: "absolute", top: 10, left: 10, background: "var(--sage)", color: "var(--bg)", fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 20, zIndex: 6 }}>
          {stage.label}
        </div>
        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(26,28,30,0.75)", color: "var(--text)", fontSize: 10, fontWeight: 600, padding: "4px 12px", borderRadius: 20, backdropFilter: "blur(4px)", zIndex: 6 }}>
          {days}일째
        </div>

        {isWithering && <div style={{ position: "absolute", inset: 0, background: "rgba(100,70,30,0.2)", zIndex: 2 }} />}

        {/* RootsMan */}
        <RootsMan animate={allDone} />
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
