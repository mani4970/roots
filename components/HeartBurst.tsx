"use client";

import { useEffect, useRef } from "react";

type HeartBurstProps = {
  /** zIndex (default 5) */
  zIndex?: number;
  /** 한 폭발당 하트 개수 (default 14, 4곳 × 14 = 총 56개) */
  perBurst?: number;
};

const HEART_COLORS = ["#E8889A", "#F4A6B4", "#7A9D7A", "#9AB89A", "#E8C547", "#F4C26F", "#D4A5C4"];

/**
 * 화면 4곳(좌상→우상→좌하→우하)에서 순차적으로 하트가 폭발하는
 * 일회성 축복 애니메이션. 페이지 진입 시 한 번만 재생된다.
 *
 * - 각 폭발 간격: 220ms
 * - 각 폭발: 14개 하트가 사방으로 퍼짐
 * - 전체: ~1초 진행, ~3.5초 후 DOM 정리
 */
export default function HeartBurst({ zIndex = 5, perBurst = 14 }: HeartBurstProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    // StrictMode에서도 한 번만 실행되도록 가드
    if (playedRef.current) return;
    playedRef.current = true;

    const container = containerRef.current;
    if (!container) return;

    const heartSvg =
      '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>';

    /** 한 폭발 — origin (ox, oy)에서 perBurst개 하트가 사방으로 */
    function spawnBurst(ox: number, oy: number) {
      if (!container) return;
      for (let i = 0; i < perBurst; i++) {
        const angle = (Math.PI * 2 * i) / perBurst + (Math.random() - 0.5) * 0.4;
        const distance = 60 + Math.random() * 110;
        const ex = Math.cos(angle) * distance;
        const ey = Math.sin(angle) * distance - 20;
        const sx = (Math.random() - 0.5) * 10;
        const sy = (Math.random() - 0.5) * 10;
        const size = 9 + Math.random() * 10;
        const scale = 0.7 + Math.random() * 0.5;
        const rot = (Math.random() - 0.5) * 90;
        const op = 0.7 + Math.random() * 0.25;
        const color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
        const delay = Math.random() * 0.12;

        const heart = document.createElement("div");
        heart.className = "roots-heart-piece";
        heart.style.cssText = `
          position: absolute;
          left: ${ox - size / 2}px;
          top: ${oy - size / 2}px;
          width: ${size}px;
          height: ${size}px;
          color: ${color};
          --hx: ${sx}px;
          --hy: ${sy}px;
          --hex: ${ex}px;
          --hey: ${ey}px;
          --hscale: ${scale};
          --hrot: ${rot}deg;
          --hop: ${op};
          animation: rootsHeartFloat 1.8s cubic-bezier(0.2, 0.6, 0.3, 1) ${delay}s forwards;
          will-change: transform, opacity;
          pointer-events: none;
        `;
        heart.innerHTML = heartSvg;
        container.appendChild(heart);
      }
    }

    // 컨테이너 크기 측정 후 4곳 위치 계산 (좌상 → 우상 → 좌하 → 우하)
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const positions: [number, number][] = [
      [w * 0.25, h * 0.3],
      [w * 0.75, h * 0.35],
      [w * 0.3, h * 0.7],
      [w * 0.72, h * 0.72],
    ];

    // 각 폭발 220ms 간격으로 예약
    const timers: number[] = [];
    positions.forEach((pos, idx) => {
      const t = window.setTimeout(() => spawnBurst(pos[0], pos[1]), idx * 220);
      timers.push(t);
    });

    // 마지막 폭발 후 1.5초 뒤 DOM 정리 (애니메이션 끝남)
    const cleanupTimer = window.setTimeout(() => {
      if (container) container.innerHTML = "";
    }, positions.length * 220 + 2200);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(cleanupTimer);
      if (container) container.innerHTML = "";
    };
  }, [perBurst]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes rootsHeartFloat {
          0% {
            transform: translate(var(--hx), var(--hy)) scale(0);
            opacity: 0;
          }
          15% {
            transform: translate(var(--hx), var(--hy)) scale(var(--hscale));
            opacity: var(--hop);
          }
          100% {
            transform: translate(var(--hex), var(--hey)) scale(var(--hscale)) rotate(var(--hrot));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
