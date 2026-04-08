"use client";
import { useEffect, useState, useRef } from "react";

// rootsman_transparent.png: 2000x1091, 6프레임
// 프레임 순서 (왼쪽부터):
// 0: 물주기1(물 나옴)  1: 물주기2(물 접음)
// 2: 서있기  3: 걷기1  4: 서있기2  5: 걷기2
const TOTAL_W = 2000;
const FRAME_H = 1091;
const FRAME_W = TOTAL_W / 6; // 333.33px
const RENDER_W = 72; // 화면에 표시할 크기
const SCALE = RENDER_W / FRAME_W;
const RENDER_H = Math.round(FRAME_H * SCALE);

// 걷기 프레임: 오른쪽→왼쪽 방향(뒤집기), 프레임 3,4,5,2 반복
const WALK_FRAMES = [3, 4, 5, 2];
// 물주기 프레임: 0, 1 반복
const WATER_FRAMES = [0, 1];

type Phase = "idle" | "enter" | "water" | "exit" | "done";

interface RootsManProps {
  trigger: boolean; // true가 되면 애니메이션 시작
}

export default function RootsMan({ trigger }: RootsManProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [frame, setFrame] = useState(3);
  const [posX, setPosX] = useState(110); // vw 단위 (110 = 화면 밖 오른쪽)
  const [flipX, setFlipX] = useState(false); // true = 반전(왼쪽 방향)
  const [opacity, setOpacity] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (trigger && !hasRun.current) {
      hasRun.current = true;
      // confetti 끝나고 1초 후 등장
      setTimeout(() => startAnimation(), 1000);
    }
    if (!trigger) {
      hasRun.current = false;
      setPhase("idle");
    }
  }, [trigger]);

  function clearInv() {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function startAnimation() {
    // 1. 오른쪽에서 걸어 들어오기 (왼쪽 방향으로 걷기 = flipX true)
    setPhase("enter");
    setFlipX(true);
    setOpacity(1);
    setPosX(110);
    setFrame(3);

    let x = 110;
    let wf = 0;
    clearInv();
    intervalRef.current = setInterval(() => {
      x = Math.max(38, x - 3.5);
      wf = (wf + 1) % WALK_FRAMES.length;
      setPosX(x);
      setFrame(WALK_FRAMES[wf]);
      if (x <= 38) {
        clearInv();
        // 2. 물주기 시작
        setTimeout(() => startWatering(), 200);
      }
    }, 80);
  }

  function startWatering() {
    setPhase("water");
    setFlipX(false); // 오른쪽 방향으로 물주기
    let wf = 0;
    let count = 0;
    clearInv();
    intervalRef.current = setInterval(() => {
      wf = (wf + 1) % WATER_FRAMES.length;
      count++;
      setFrame(WATER_FRAMES[wf]);
      if (count >= 10) { // 5번 반복
        clearInv();
        setTimeout(() => startExit(), 300);
      }
    }, 200);
  }

  function startExit() {
    // 3. 오른쪽으로 걸어서 퇴장 (오른쪽 방향 = flipX false)
    setPhase("exit");
    setFlipX(false);
    let x = 38;
    let wf = 0;
    clearInv();
    intervalRef.current = setInterval(() => {
      x = Math.min(115, x + 3.5);
      wf = (wf + 1) % WALK_FRAMES.length;
      setPosX(x);
      setFrame(WALK_FRAMES[wf]);
      if (x >= 112) {
        clearInv();
        setPhase("done");
        hasRun.current = false; // 다음에 다시 쓸 수 있도록
      }
    }, 80);
  }

  if (phase === "idle" || phase === "done") return null;

  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: `${posX}%`,
      transform: "translateX(-50%)",
      width: RENDER_W,
      height: RENDER_H,
      overflow: "hidden",
      imageRendering: "pixelated",
      zIndex: 10,
      opacity,
    }}>
      <img
        src="/rootsman_transparent.png"
        alt="roots-man"
        style={{
          position: "absolute",
          top: 0,
          left: -frame * FRAME_W * SCALE,
          width: TOTAL_W * SCALE,
          height: FRAME_H * SCALE,
          imageRendering: "pixelated",
          transform: flipX ? "scaleX(-1)" : "none",
          transformOrigin: `${RENDER_W / 2}px center`,
        }}
      />
    </div>
  );
}
