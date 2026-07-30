"use client";

import {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Check } from "lucide-react";

const SCROLL_GESTURE_THRESHOLD_PX = 8;

type PointerGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

type HomeDecisionItemProps = {
  done: boolean;
  index: number;
  isLast: boolean;
  text: string;
  onToggle: () => void;
};

export default function HomeDecisionItem({
  done,
  index,
  isLast,
  text,
  onToggle,
}: HomeDecisionItemProps) {
  const pointerGestureRef = useRef<PointerGesture | null>(null);

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    pointerGestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const gesture = pointerGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.moved) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const movementSquared = (deltaX * deltaX) + (deltaY * deltaY);

    if (movementSquared >= SCROLL_GESTURE_THRESHOLD_PX * SCROLL_GESTURE_THRESHOLD_PX) {
      gesture.moved = true;
    }
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    const gesture = pointerGestureRef.current;
    if (gesture?.pointerId === event.pointerId) {
      gesture.moved = true;
    }
  }

  function handleClick(event: ReactMouseEvent<HTMLButtonElement>) {
    const gesture = pointerGestureRef.current;
    pointerGestureRef.current = null;

    // A touch-generated click has detail > 0. Keyboard and assistive-technology
    // activation use detail === 0 and must remain available.
    if (event.detail > 0 && gesture?.moved) {
      event.preventDefault();
      return;
    }

    onToggle();
  }

  return (
    <button
      type="button"
      aria-pressed={done}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerCancel={handlePointerCancel}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        background: "none",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        padding: isLast ? "0" : "0 0 10px",
        width: "100%",
        touchAction: "pan-y",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          border: `2px solid ${done ? "var(--sage)" : "var(--border)"}`,
          background: done ? "var(--sage)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {done && <Check size={13} style={{ color: "var(--bg)" }} />}
      </div>
      <span
        style={{
          fontSize: 14,
          color: done ? "var(--text3)" : "var(--text)",
          lineHeight: 1.65,
          textDecoration: done ? "line-through" : "none",
        }}
      >
        {index + 1}. {text}
      </span>
    </button>
  );
}
