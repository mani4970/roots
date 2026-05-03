"use client";

import { useEffect, useRef } from "react";

type HeartBurstProps = {
  /** 발사 시작 ref - 이 요소의 중심에서 하트가 터집니다 */
  originRef?: React.RefObject<HTMLElement | null>;
  /** zIndex (default 5) */
  zIndex?: number;
  /** 하트 개수 (default 50) */
  count?: number;
};

const HEART_COLORS = ["#E8889A", "#F4A6B4", "#7A9D7A", "#9AB89A", "#E8C547", "#F4C26F", "#D4A5C4"];

/**
 * 축복 카드 위에서 하트가 사방으로 퍼지는 일회성 애니메이션.
 * 페이지 진입 시 한 번만 재생되고 사라진다.
 */
export default function HeartBurst({ originRef, zIndex = 5, count = 50 }: HeartBurstProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    // StrictMode에서도 한 번만 실행되도록 가드
    if (playedRef.current) return;
    playedRef.current = true;

    const container = containerRef.current;
    if (!container) return;

    // origin 좌표 계산
    let originX = 0;
    let originY = 0;
    if (originRef?.current) {
      const containerRect = container.getBoundingClientRect();
      const originRect = originRef.current.getBoundingClientRect();
      originX = originRect.left + originRect.width / 2 - containerRect.left;
      originY = originRect.top + originRect.height / 2 - containerRect.top;
    } else {
      // origin 지정 안 됐으면 컨테이너 중앙 위쪽
      const containerRect = container.getBoundingClientRect();
      originX = containerRect.width / 2;
      originY = containerRect.height / 3;
    }

    const heartSvg = '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>';

    for (let i = 0; i < count; i++) {
      // 사방으로 균등 분포 + 약간의 랜덤
      const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.4;
      const distance = 90 + Math.random() * 160;
      const ex = Math.cos(angle) * distance;
      const ey = Math.sin(angle) * distance - 20; // 살짝 위쪽으로 편향
      const sx = (Math.random() - 0.5) * 12;
      const sy = (Math.random() - 0.5) * 12;
      const size = 9 + Math.random() * 11;
      const scale = 0.7 + Math.random() * 0.5;
      const rot = (Math.random() - 0.5) * 90;
      const op = 0.65 + Math.random() * 0.3;
      const color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
      const delay = Math.random() * 0.18;

      const heart = document.createElement("div");
      heart.className = "roots-heart-piece";
      heart.style.cssText = `
        position: absolute;
        left: ${originX - size / 2}px;
        top: ${originY - size / 2}px;
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
        animation: rootsHeartFloat 2.4s cubic-bezier(0.2, 0.6, 0.3, 1) ${delay}s forwards;
        will-change: transform, opacity;
        pointer-events: none;
      `;
      heart.innerHTML = heartSvg;
      container.appendChild(heart);
    }

    // 애니메이션 끝나면 DOM 정리
    const cleanup = window.setTimeout(() => {
      if (container) container.innerHTML = "";
    }, 2800);

    return () => {
      window.clearTimeout(cleanup);
      if (container) container.innerHTML = "";
    };
  }, [originRef, count]);

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
