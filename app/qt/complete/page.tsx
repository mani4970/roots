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
    <div className="qt-phase2-responsive" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", position: "relative", overflow: "hidden" }}>
      <ConfettiBurst variant="absolute" zIndex={0} />
      <div className="qt-complete-card" style={{ position: "relative", zIndex: 10, textAlign: "center", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 28, padding: "36px 28px", width: "100%", opacity: showMsg ? 1 : 0, transform: showMsg ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease", boxShadow: "0 18px 54px rgba(0,0,0,0.18)" }}>
        <div style={{ width: 88, height: 88, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/icon-qt.webp" alt="QT" width={76} height={76} style={{ objectFit: "contain" }} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 10, lineHeight: 1.3 }}>{t("qt_complete_title", lang)}</h1>
        <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.7, marginBottom: 6 }}>{t("qt_complete_sub", lang)}</p>
        <p style={{ color: "var(--sage-dark)", fontSize: 13, lineHeight: 1.65, marginBottom: 28 }}>
          {t("qt_complete_blessing", lang)}
        </p>
        <button
          className="btn-sage"
          onClick={() => { window.location.replace("/"); }}
          style={{ width: "100%" }}
        >
          {t("confirm", lang)}
        </button>
      </div>
    </div>
  );
}
