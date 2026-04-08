"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface CelebrationProps {
  show: boolean;
  message?: string;
  subMessage?: string;
  onClose: () => void;
}

export default function Celebration({ show, message, subMessage, onClose }: CelebrationProps) {
  const [animData, setAnimData] = useState<any>(null);

  useEffect(() => {
    if (show) {
      fetch("/confetti.json").then(r => r.json()).then(setAnimData).catch(() => {});
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(26,28,30,0.88)", backdropFilter: "blur(8px)" }}>
      {animData && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <Lottie animationData={animData} loop={false} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "36px 28px", background: "var(--bg2)", borderRadius: 28, border: "1px solid var(--border)", margin: "0 28px", maxWidth: 340 }}>
        <div style={{ fontSize: 56, marginBottom: 14 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 10, lineHeight: 1.3 }}>
          {message ?? "오늘 루틴 완료!"}
        </h2>
        <p style={{ fontSize: 14, color: "var(--sage-dark)", lineHeight: 1.7, marginBottom: 8, fontWeight: 600 }}>
          오늘 하루 하나님과 더 가까워진<br />당신을 축복합니다! 🙏
        </p>
        {subMessage && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--sage-light)", borderRadius: 14, border: "1px solid rgba(122,157,122,0.3)" }}>
            <p style={{ fontSize: 13, color: "var(--sage-dark)", lineHeight: 1.6 }}>🌱 {subMessage}</p>
          </div>
        )}
        <div style={{ marginTop: 18, fontSize: 11, color: "var(--text3)" }}>탭하면 닫혀요</div>
      </div>
    </div>
  );
}
