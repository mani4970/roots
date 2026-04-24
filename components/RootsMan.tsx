"use client";
import { useEffect, useState, useRef } from "react";

// rootsman_transparent.png: 1536x2776, 3x3 grid = 9 frames
// Row 1 (top)    : enter from right to left
// Row 2 (middle) : watering
// Row 3 (bottom) : exit back to the right
const SHEET_W = 1536;
const SHEET_H = 2776;
const COLS = 3;
const ROWS = 3;
const FRAME_W = SHEET_W / COLS; // 512
const FRAME_H = SHEET_H / ROWS; // ~925
const RENDER_W = 72;
const SCALE = RENDER_W / FRAME_W;
const RENDER_H = Math.round(FRAME_H * SCALE);

const ENTER_FRAMES = [0, 1, 2];
const WATER_FRAMES = [3, 4, 5];
const EXIT_FRAMES = [6, 7, 8];

// 화면 기준: 오른쪽 바깥에서 들어와서,
// 새싹/나무를 가리지 않도록 가운데보다 오른쪽에서 멈춘다.
const START_X = 110;
const STOP_X = 63;
const EXIT_X = 110;

function getFramePos(frameIdx: number) {
  const col = frameIdx % COLS;
  const row = Math.floor(frameIdx / COLS);
  return { col, row };
}

type Phase = "idle" | "enter" | "water" | "exit" | "done";

interface RootsManProps {
  trigger: boolean;
}

export default function RootsMan({ trigger }: RootsManProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [frame, setFrame] = useState(0);
  const [posX, setPosX] = useState(START_X);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (trigger && !hasRun.current) {
      hasRun.current = true;
      timeoutId = setTimeout(() => startAnimation(), 20);
    }

    if (!trigger) {
      hasRun.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPhase("idle");
      setFrame(0);
      setPosX(START_X);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [trigger]);

  function clearInv() {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function startAnimation() {
    setPhase("enter");
    setPosX(START_X);
    setFrame(ENTER_FRAMES[0]);

    let x = START_X;
    let wf = 0;
    clearInv();

    intervalRef.current = setInterval(() => {
      x = Math.max(STOP_X, x - 4.2);
      wf = (wf + 1) % ENTER_FRAMES.length;
      setPosX(x);
      setFrame(ENTER_FRAMES[wf]);

      if (x <= STOP_X) {
        clearInv();
        setFrame(ENTER_FRAMES[1]);
        setTimeout(() => startWatering(), 80);
      }
    }, 90);
  }

  function startWatering() {
    setPhase("water");
    let wf = 0;
    let count = 0;
    clearInv();

    intervalRef.current = setInterval(() => {
      setFrame(WATER_FRAMES[wf]);
      wf = (wf + 1) % WATER_FRAMES.length;
      count += 1;

      if (count >= 9) {
        clearInv();
        setTimeout(() => startExit(), 120);
      }
    }, 180);
  }

  function startExit() {
    setPhase("exit");
    let x = STOP_X;
    let wf = 0;
    clearInv();

    intervalRef.current = setInterval(() => {
      x = Math.min(EXIT_X, x + 4.2);
      setPosX(x);
      setFrame(EXIT_FRAMES[wf]);
      wf = (wf + 1) % EXIT_FRAMES.length;

      if (x >= EXIT_X) {
        clearInv();
        setPhase("done");
        hasRun.current = false;
      }
    }, 90);
  }

  if (phase === "idle" || phase === "done") return null;

  const { col, row } = getFramePos(frame);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: `${posX}%`,
        transform: "translateX(-50%)",
        width: RENDER_W,
        height: RENDER_H,
        overflow: "hidden",
        imageRendering: "pixelated",
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <img
        src="/rootsman_transparent.png"
        alt="roots-man"
        style={{
          position: "absolute",
          top: -row * FRAME_H * SCALE,
          left: -col * FRAME_W * SCALE,
          width: SHEET_W * SCALE,
          height: SHEET_H * SCALE,
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
