"use client";

import { getLoveHeartIntroPopupText } from "@/lib/loveHeartIntroText";
import { useLang } from "@/lib/useLang";

export default function LoveHeartIntroPopup({ onClose }: { onClose: () => void }) {
  const lang = useLang();
  const copy = getLoveHeartIntroPopupText(lang);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 208, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(26,28,30,0.82)", backdropFilter: "blur(8px)", padding: "calc(18px + env(safe-area-inset-top)) 22px calc(18px + env(safe-area-inset-bottom))" }}>
      <div style={{ width: "100%", maxWidth: 350, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 28, padding: "30px 22px 22px", textAlign: "center", boxShadow: "0 18px 60px rgba(0,0,0,0.28)" }}>
        <div style={{ width: 78, height: 78, borderRadius: 26, background: "linear-gradient(180deg, rgba(255,246,213,0.96), rgba(255,246,213,0.58))", border: "1px solid rgba(232,197,71,0.36)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px", fontSize: 42, boxShadow: "0 12px 32px rgba(232,197,71,0.18)" }}>
          💛
        </div>
        <h2 style={{ fontSize: 21, fontWeight: 900, color: "var(--text)", lineHeight: 1.35, marginBottom: 14 }}>
          {copy.title}
        </h2>
        <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.75, whiteSpace: "pre-line", marginBottom: 14 }}>
          {copy.body}
        </p>
        <div style={{ padding: "12px 14px", borderRadius: 16, background: "rgba(232,197,71,0.11)", border: "1px solid rgba(232,197,71,0.28)", marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: "rgba(131,96,24,0.96)", fontWeight: 800, lineHeight: 1.65, margin: 0 }}>
            {copy.futureHint}
          </p>
        </div>
        <button onClick={onClose} className="btn-sage" style={{ width: "100%", minHeight: 48, justifyContent: "center" }}>
          {copy.button}
        </button>
      </div>
    </div>
  );
}
