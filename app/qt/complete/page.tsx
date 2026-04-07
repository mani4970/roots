"use client";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function QTCompletePage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
        <div style={{ width: 72, height: 72, background: "var(--sage-light)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <CheckCircle size={36} style={{ color: "var(--sage)" }} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", fontFamily: "'Fraunces', serif", marginBottom: 8 }}>큐티 완료!</h1>
        <p style={{ color: "var(--text3)", fontSize: 14, lineHeight: 1.6, marginBottom: 4 }}>오늘도 말씀 앞에 앉았어요.</p>
        <p style={{ color: "var(--text3)", fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>겨자씨가 조금 더 깊이 뿌리내렸어요 🌱</p>
        <Link href="/">
          <button className="btn-sage">홈으로 돌아가기</button>
        </Link>
      </div>
    </div>
  );
}
