"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface CelebrationProps {
  show: boolean;
  message?: string;
  onClose: () => void;
}

export default function Celebration({ show, message, onClose }: CelebrationProps) {
  const [animData, setAnimData] = useState<any>(null);

  useEffect(() => {
    if (show) {
      fetch("/confetti.json").then(r => r.json()).then(setAnimData).catch(() => {});
      const t = setTimeout(onClose, 3500);
      return () => clearTimeout(t);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(26,28,30,0.85)", backdropFilter: "blur(6px)" }}>
      {animData && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <Lottie animationData={animData} loop={false} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "32px 28px", background: "var(--bg2)", borderRadius: 28, border: "1px solid var(--border)", margin: "0 32px", maxWidth: 320 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 10, lineHeight: 1.3 }}>{message ?? "완료!"}</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65 }}>오늘 하루 하나님과 동행한<br />당신을 축복합니다 🌱</p>
        <div style={{ marginTop: 16, fontSize: 11, color: "var(--text3)" }}>탭하면 닫혀요</div>
      </div>
    </div>
  );
}
