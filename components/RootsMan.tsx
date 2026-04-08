"use client";
import { useEffect, useRef, useState } from "react";

// spread1: 걷기 4프레임(0~3) + 물주기준비 2프레임(4~5) — 위쪽 절반만 사용
// spread2: 물주기 6프레임(0~5)
// 전체 시트: 2816x1536, 6프레임, 각 프레임 469x768(위쪽캐릭터)
const FRAME_W = 2816 / 6;   // 약 469px
const FRAME_H = 1536 / 2;   // 768px (위쪽 절반 = 캐릭터만)
const FRAME_H2 = 1536;      // spread2는 전체 높이

type Phase = "idle" | "walking" | "watering" | "done";

interface RootsManProps {
  animate: boolean; // true가 되면 애니메이션 시작
  onDone?: () => void;
}

export default function RootsMan({ animate, onDone }: RootsManProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [frame, setFrame] = useState(0);
  const [posX, setPosX] = useState(110); // 오른쪽 밖에서 시작 (%)
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!animate) return;
    setPhase("walking");
    setFrame(0);
    setPosX(110);
  }, [animate]);

  useEffect(() => {
    if (phase === "idle" || phase === "done") return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    if (phase === "walking") {
      // 걷기: 4프레임 반복하며 왼쪽으로 이동
      let f = 0;
      let x = 110;
      intervalRef.current = setInterval(() => {
        f = (f + 1) % 4;
        x = Math.max(18, x - 4); // 왼쪽으로 이동 (18%에서 멈춤)
        setFrame(f);
        setPosX(x);
        if (x <= 18) {
          clearInterval(intervalRef.current!);
          setPhase("watering");
          setFrame(4); // spread1의 물주기 준비 프레임
        }
      }, 100);
    }

    if (phase === "watering") {
      // 물주기: spread2의 6프레임 반복
      let f = 0;
      let count = 0;
      intervalRef.current = setInterval(() => {
        f = (f + 1) % 6;
        count++;
        setFrame(10 + f); // 10+ = spread2 프레임
        if (count >= 18) { // 3번 반복 후 종료
          clearInterval(intervalRef.current!);
          setPhase("done");
          onDone?.();
        }
      }, 120);
    }

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase]);

  if (phase === "idle" || phase === "done") return null;

  // 어떤 시트/프레임 쓸지 결정
  const isSpread2 = frame >= 10;
  const actualFrame = isSpread2 ? frame - 10 : frame;
  const sheetSrc = isSpread2 ? "/roots-man-spread2.png" : "/roots-man-spread1.png";
  const frameH = isSpread2 ? FRAME_H2 : FRAME_H;
  // 렌더 크기 (표시 너비 80px 기준)
  const renderW = 80;
  const renderH = isSpread2 ? Math.round(renderW * frameH / FRAME_W) : Math.round(renderW * FRAME_H / FRAME_W);
  const scaleX = renderW / FRAME_W;
  const scaleY = renderH / frameH;

  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: `${posX}%`,
      transform: "translateX(-50%)",
      width: renderW,
      height: renderH,
      overflow: "hidden",
      imageRendering: "pixelated",
      zIndex: 5,
      transition: phase === "walking" ? "left 0.1s linear" : "none",
    }}>
      <img
        src={sheetSrc}
        alt="roots-man"
        style={{
          position: "absolute",
          top: 0,
          left: -actualFrame * FRAME_W * scaleX,
          width: 2816 * scaleX,
          height: frameH * scaleY,
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
