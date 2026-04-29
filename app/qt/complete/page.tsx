"use client";
import { useEffect, useState } from "react";
import ConfettiBurst from "@/components/ConfettiBurst";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";

export default function QTCompletePage() {
  const [showMsg, setShowMsg] = useState(false);
  const lang = useLang();

  useEffect(() => {
    const timer = window.setTimeout(() => setShowMsg(true), 240);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", position: "relative", overflow: "hidden" }}>
      <ConfettiBurst variant="absolute" zIndex={0} />
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 28, padding: "36px 28px", width: "100%", maxWidth: 340, opacity: showMsg ? 1 : 0, transform: showMsg ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease", boxShadow: "0 18px 54px rgba(0,0,0,0.18)" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🌱</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 10, lineHeight: 1.3 }}>{t("qt_complete_title", lang)}</h1>
        <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.7, marginBottom: 6 }}>{t("qt_complete_sub", lang)}</p>
        <p style={{ color: "var(--sage-dark)", fontSize: 13, lineHeight: 1.65, marginBottom: 28 }}>
          {t("qt_complete_blessing", lang)}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="btn-sage" onClick={() => { window.location.href = "/qt"; }}>{t("qt_complete_go_qt", lang)}</button>
          <button className="btn-outline" onClick={() => { window.location.href = "/"; }}>{t("qt_complete_go_home", lang)}</button>
        </div>
      </div>
    </div>
  );
}
