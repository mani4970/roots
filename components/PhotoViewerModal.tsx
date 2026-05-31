"use client";

import { useRef, useState } from "react";
import { RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";

type PhotoViewerModalProps = {
  src: string;
  alt?: string;
  onClose: () => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.35;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function touchDistance(touches: { length: number; [index: number]: { clientX: number; clientY: number } }) {
  if (touches.length < 2) return 0;
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export default function PhotoViewerModal({ src, alt = "photo", onClose }: PhotoViewerModalProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  const setClampedScale = (nextScale: number) => {
    const clamped = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    setScale(clamped);
    if (clamped <= 1) setOffset({ x: 0, y: 0 });
  };

  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    pinchRef.current = null;
    dragRef.current = null;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12, touchAction: "none" }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        onWheel={(event) => {
          event.preventDefault();
          setClampedScale(scale + (event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP));
        }}
        onTouchStart={(event) => {
          if (event.touches.length === 2) {
            pinchRef.current = { distance: touchDistance(event.touches), scale };
            dragRef.current = null;
          } else if (event.touches.length === 1 && scale > 1) {
            dragRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY, offsetX: offset.x, offsetY: offset.y };
          }
        }}
        onTouchMove={(event) => {
          if (event.touches.length === 2 && pinchRef.current) {
            event.preventDefault();
            const distance = touchDistance(event.touches);
            if (pinchRef.current.distance > 0) {
              setClampedScale(pinchRef.current.scale * (distance / pinchRef.current.distance));
            }
          } else if (event.touches.length === 1 && dragRef.current && scale > 1) {
            event.preventDefault();
            setOffset({
              x: dragRef.current.offsetX + event.touches[0].clientX - dragRef.current.x,
              y: dragRef.current.offsetY + event.touches[0].clientY - dragRef.current.y,
            });
          }
        }}
        onTouchEnd={() => {
          if (scale <= 1) setOffset({ x: 0, y: 0 });
          pinchRef.current = null;
          dragRef.current = null;
        }}
        style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          onDoubleClick={() => setClampedScale(scale > 1 ? 1 : 2.2)}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 14, transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transition: dragRef.current || pinchRef.current ? "none" : "transform 0.16s ease", userSelect: "none", touchAction: "none" }}
        />

        <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 14, right: 14, width: 38, height: 38, borderRadius: 999, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.45)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={21} />
        </button>

        <div style={{ position: "absolute", left: "50%", bottom: "calc(18px + env(safe-area-inset-bottom))", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 999, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.18)", color: "white" }}>
          <button onClick={() => setClampedScale(scale - SCALE_STEP)} aria-label="Zoom out" style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.12)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ZoomOut size={18} />
          </button>
          <button onClick={reset} aria-label="Reset" style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.12)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RotateCcw size={17} />
          </button>
          <button onClick={() => setClampedScale(scale + SCALE_STEP)} aria-label="Zoom in" style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.12)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ZoomIn size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
