"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./WordCards.module.css";

const COLORS = ["#E8889A", "#F4A6B4", "#7A9D7A", "#9AB89A", "#E8C547", "#F4C26F", "#D4A5C4"];
const ORIGINS = [[.25, .3], [.75, .35], [.3, .7], [.72, .72]] as const;
const HEART_PATH = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

/** Card-only first-receipt celebration. Other app/award effects are unchanged. */
export default function WordCardBurst() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let timer: number | undefined;
    const frame = requestAnimationFrame(() => {
      const host = hostRef.current;
      if (!host || !host.clientWidth || !host.clientHeight) return;
      // Local CSS pixels work even when the centered app body has CSS zoom.
      setBounds({ width: host.clientWidth, height: host.clientHeight });
      timer = window.setTimeout(() => setBounds(null), 3_500);
    });
    // StrictMode cleanup cancels the first setup instead of consuming a played flag.
    return () => { cancelAnimationFrame(frame); if (timer !== undefined) window.clearTimeout(timer); };
  }, []);

  return <div ref={hostRef} className={styles.cardBurst} data-word-card-burst aria-hidden="true">
    {bounds && ORIGINS.flatMap(([x, y], group) => Array.from({ length: 14 }, (_, i) => {
      const index = group * 14 + i;
      const angle = Math.PI * 2 * i / 14 + group * .14;
      const distance = Math.min(bounds.width, bounds.height, 430) * (.17 + ((i * 7) % 11) / 100);
      const size = 9 + ((index * 3) % 10);
      const style = {
        left: `${x * 100}%`, top: `${y * 100}%`, width: size, height: size,
        color: COLORS[index % COLORS.length],
        "--heart-x": `${Math.cos(angle) * distance}px`,
        "--heart-y": `${Math.sin(angle) * distance - 16}px`,
        "--heart-turn": `${((index * 17) % 90) - 45}deg`,
        "--heart-delay": `${.12 + group * .22 + (i % 4) * .025}s`,
      } as CSSProperties;
      return <svg key={index} className={styles.cardHeart} style={style} viewBox="0 0 24 24" focusable="false">
        <path d={HEART_PATH} fill="currentColor" />
      </svg>;
    }))}
  </div>;
}
