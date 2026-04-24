"use client";
import { useEffect, useState, useRef } from "react";

// rootsman_transparent.png: 1536x2776, 3x3 grid = 9 frames
// Row 0 (top):    walk-left1, walk-front, walk-right1
// Row 1 (middle): water-hold, water-tilt, water-pour
// Row 2 (bottom): walk-left2, walk-front2, walk-right2
const SHEET_W = 1536;
const SHEET_H = 2776;
const COLS = 3;
const ROWS = 3;
const FRAME_W = SHEET_W / COLS; // 512
const FRAME_H = SHEET_H / ROWS; // ~925
const RENDER_W = 60;
const SCALE = RENDER_W / FRAME_W;
const RENDER_H = Math.round(FRAME_H * SCALE);

// Movement positions are percentages inside the garden container.
// The tree/sprout is centered, so RootsMan stops slightly right of center.
const ENTER_START_X = 112;
const WATER_X = 62;
const EXIT_END_X = 116;
const WALK_STEP = 3.2;
const WALK_INTERVAL = 120;

// Frame indices: row * 3 + col
const WALK_FRAMES = [0, 1, 2, 6, 7, 8];
const WATER_FRAMES = [3, 4, 5];

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
  const [frame, setFrame] = useState(1);
  const [posX, setPosX] = useState(ENTER_START_X);
  const [flipX, setFlipX] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    if (trigger && !hasRun.current) {
      hasRun.current = true;
      timeoutId = setTimeout(() => startAnimation(), 1200);
    }
    if (!trigger) {
      hasRun.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPhase("idle");
    }
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [trigger]);

  function clearInv() {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function startAnimation() {
    setPhase("enter");
    setFlipX(true);
    setOpacity(1);
    setPosX(ENTER_START_X);
    setFrame(1);

    let x = ENTER_START_X;
    let wf = 0;
    clearInv();
    intervalRef.current = setInterval(() => {
      x = Math.max(WATER_X, x - WALK_STEP);
      wf = (wf + 1) % WALK_FRAMES.length;
      setPosX(x);
      setFrame(WALK_FRAMES[wf]);
      if (x <= WATER_X) {
        clearInv();
        setTimeout(() => startWatering(), 200);
      }
    }, WALK_INTERVAL);
  }

  function startWatering() {
    setPhase("water");
    setFlipX(false);
    let wf = 0;
    let count = 0;
    clearInv();
    intervalRef.current = setInterval(() => {
      wf = (wf + 1) % WATER_FRAMES.length;
      count++;
      setFrame(WATER_FRAMES[wf]);
      if (count >= 18) {
        clearInv();
        setTimeout(() => startExit(), 800);
      }
    }, 280);
  }

  function startExit() {
    setPhase("exit");
    setFlipX(false);
    let x = WATER_X;
    let wf = 0;
    clearInv();
    intervalRef.current = setInterval(() => {
      x = Math.min(EXIT_END_X, x + WALK_STEP);
      wf = (wf + 1) % WALK_FRAMES.length;
      setPosX(x);
      setFrame(WALK_FRAMES[wf]);
      if (x >= EXIT_END_X) {
        clearInv();
        setPhase("done");
        hasRun.current = false;
      }
    }, WALK_INTERVAL);
  }

  if (phase === "idle" || phase === "done") return null;

  const { col, row } = getFramePos(frame);

  return (
    <div style={{
      position: "absolute",
      bottom: 18,
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
          top: -row * FRAME_H * SCALE,
          left: -col * FRAME_W * SCALE,
          width: SHEET_W * SCALE,
          height: SHEET_H * SCALE,
          imageRendering: "pixelated",
          transform: flipX ? "scaleX(-1)" : "none",
          transformOrigin: `${RENDER_W / 2}px center`,
        }}
      />
    </div>
  );
}
