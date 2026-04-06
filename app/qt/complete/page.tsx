"use client";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function QTCompletePage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--warm)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div className="card-dark" style={{ width: "100%", maxWidth: 360, textAlign: "center", padding: 32 }}>
        <div style={{ width: 64, height: 64, background: "var(--gold)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <CheckCircle size={32} style={{ color: "var(--dark)" }} />
        </div>
        <h1 style={{ color: "white", fontSize: 24, fontWeight: 600, marginBottom: 8 }}>큐티 완료!</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 4 }}>오늘도 말씀 앞에 앉았어요.</p>
        <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>겨자씨가 조금 더 깊이 뿌리내렸어요 🌱</p>
        <Link href="/">
          <button className="btn-gold">홈으로 돌아가기</button>
        </Link>
      </div>
    </div>
  );
}
