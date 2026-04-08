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

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 17) return "day";
  if (h >= 17 && h < 20) return "evening";
  return "night";
}

// 새 스프라이트 — bird_sprite.png (1408x384, 6프레임)
const BIRD_FRAMES = 6;
const BIRD_W = 1408;
const BIRD_FRAME_W = BIRD_W / BIRD_FRAMES; // 234.67

function BirdSprite({ posX, posY, size = 26 }: { posX: string; posY: number; size?: number }) {
  const [frame, setFrame] = useState(() => Math.floor(Math.random() * BIRD_FRAMES));
  useEffect(() => {
    const delay = Math.floor(Math.random() * 200);
    const t = setTimeout(() => {
      const interval = setInterval(() => setFrame(f => (f + 1) % BIRD_FRAMES), 130);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(t);
  }, []);

  const scale = size / BIRD_FRAME_W;
  const renderH = Math.round(384 * scale);

  return (
    <div style={{ position: "absolute", left: posX, top: posY, width: size, height: renderH, overflow: "hidden", imageRendering: "pixelated", zIndex: 3 }}>
      <img
        src="/bird_sprite.png"
        alt=""
        style={{ position: "absolute", top: 0, left: -frame * BIRD_FRAME_W * scale, width: BIRD_W * scale, height: 384 * scale, imageRendering: "pixelated" }}
      />
    </div>
  );
}

// 달 스프라이트 — moon.png (2816x1536, 6프레임, 위쪽 1/3이 달)
const MOON_FRAMES = 6;
const MOON_W = 2816;
const MOON_FRAME_W = MOON_W / MOON_FRAMES;
const MOON_H = 1536 / 3; // 달은 위쪽 512px

function MoonSprite() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame(f => (f + 1) % MOON_FRAMES), 600);
    return () => clearInterval(t);
  }, []);
  const size = 48;
  const scale = size / MOON_FRAME_W;
  const renderH = Math.round(MOON_H * scale);
  return (
    <div style={{ position: "absolute", top: 8, right: 12, width: size, height: renderH, overflow: "hidden", imageRendering: "pixelated", zIndex: 3 }}>
      <img
        src="/moon.png"
        alt=""
        style={{ position: "absolute", top: 0, left: -frame * MOON_FRAME_W * scale, width: MOON_W * scale, height: (1536 * scale), imageRendering: "pixelated" }}
      />
    </div>
  );
}

export default function TreeGrowth({ days, lastCheckin, allDone = false }: TreeGrowthProps) {
  const { img, stage, isWithering, isRegressed, daysSince } = getTreeState(days, lastCheckin);
  const timeOfDay = getTimeOfDay();
  const isNight = timeOfDay === "night";
  const isEvening = timeOfDay === "evening";

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

      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "16/9", background: isNight ? "#0f1628" : "var(--bg2)" }}>
        {/* 배경 이미지 */}
        {isNight ? (
          <Image src="/dark.png" alt="밤" fill style={{ objectFit: "cover", objectPosition: "50% 20%" }} priority />
        ) : (
          <Image
            src={`/tree${img}.png`}
            alt={stage.label}
            fill
            style={{
              objectFit: "cover",
              filter: isWithering ? "grayscale(50%) brightness(0.7)" : isEvening ? "sepia(20%) brightness(0.88)" : "none",
            }}
            priority
          />
        )}

        {/* 저녁 오버레이 */}
        {isEvening && <div style={{ position: "absolute", inset: 0, background: "rgba(60,30,10,0.25)", zIndex: 2 }} />}

        {/* 낮: 해 (정적) + 새 3마리 */}
        {timeOfDay === "day" && (
          <>
            {/* 해 — 정적 PNG, 움직이지 않음 */}
            <div style={{ position: "absolute", top: 10, left: 14, width: 36, height: 36, zIndex: 3, imageRendering: "pixelated" }}>
              <img src="/sun_static.png" alt="해" style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />
            </div>
            {/* 새 3마리 — 각각 다른 위치, 프레임 오프셋으로 자연스럽게 */}
            <BirdSprite posX="38%" posY={12} size={24} />
            <BirdSprite posX="55%" posY={20} size={22} />
            <BirdSprite posX="68%" posY={8} size={26} />
          </>
        )}

        {/* 밤: 달 스프라이트 */}
        {isNight && <MoonSprite />}

        {/* 배지 */}
        <div style={{ position: "absolute", top: 10, left: 10, background: "var(--sage)", color: "var(--bg)", fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 20, zIndex: 6 }}>
          {stage.label}
        </div>
        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(26,28,30,0.8)", color: "var(--text)", fontSize: 10, fontWeight: 600, padding: "4px 12px", borderRadius: 20, backdropFilter: "blur(4px)", zIndex: 6 }}>
          {days}일째
        </div>

        {isWithering && <div style={{ position: "absolute", inset: 0, background: "rgba(100,70,30,0.2)", zIndex: 2 }} />}

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
