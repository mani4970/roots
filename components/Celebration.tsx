"use client";
import { useLang } from "@/lib/useLang";
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
      // 자동 닫힘 없음 - 탭하면 바로 닫힘
    }
  }, [show]);

  const lang = useLang();
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
          {message ?? "완료!"}
        </h2>
        {subMessage && (
          <div style={{ padding: "12px 14px", background: "var(--sage-light)", borderRadius: 14, border: "1px solid rgba(122,157,122,0.3)", marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: "var(--sage-dark)", lineHeight: 1.7 }}>{subMessage}</p>
          </div>
        )}
        <div style={{ marginTop: 14, fontSize: 11, color: "var(--text3)" }}>{lang === "de" ? "Antippen zum Schließen" : "탭하면 닫혀요"}</div>
      </div>
    </div>
  );
}
