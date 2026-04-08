"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function QTCompletePage() {
  const [animData, setAnimData] = useState<any>(null);
  const [showMsg, setShowMsg] = useState(false);

  useEffect(() => {
    fetch("/confetti.json").then(r => r.json()).then(d => {
      setAnimData(d);
      setTimeout(() => setShowMsg(true), 300);
    }).catch(() => setShowMsg(true));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", position: "relative", overflow: "hidden" }}>
      {animData && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <Lottie animationData={animData} loop={false} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 28, padding: "36px 28px", width: "100%", maxWidth: 340, opacity: showMsg ? 1 : 0, transform: showMsg ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🌱</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 10, lineHeight: 1.3 }}>큐티 완료!</h1>
        <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.7, marginBottom: 6 }}>오늘도 말씀 앞에 앉았어요.</p>
        <p style={{ color: "var(--sage-dark)", fontSize: 13, lineHeight: 1.65, marginBottom: 28 }}>
          오늘 하루 하나님과 동행할<br />당신을 축복합니다 ✨
        </p>
        <Link href="/"><button className="btn-sage">홈으로 돌아가기</button></Link>
      </div>
    </div>
  );
}
