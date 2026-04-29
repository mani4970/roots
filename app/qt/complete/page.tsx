"use client";
import { useEffect, useState } from "react";
import ConfettiBurst from "@/components/ConfettiBurst";
import { useLang } from "@/lib/useLang";

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
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 10, lineHeight: 1.3 }}>{lang === "de" ? "QT abgeschlossen!" : lang === "fr" ? "QT terminé !" : lang === "en" ? "QT complete!" : "큐티 완료!"}</h1>
        <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.7, marginBottom: 6 }}>{lang === "de" ? "Heute waren Sie vor Gottes Wort." : lang === "fr" ? "Aujourd’hui, vous vous êtes assis devant la Parole." : lang === "en" ? "Today, you sat before the Word." : "오늘도 말씀 앞에 앉았어요."}</p>
        <p style={{ color: "var(--sage-dark)", fontSize: 13, lineHeight: 1.65, marginBottom: 28 }}>
          {lang === "de" ? <>Gottes Segen für Ihren heutigen Weg ✨</> : lang === "fr" ? <>Soyez béni(e) dans votre marche avec Dieu aujourd’hui ✨</> : lang === "en" ? <>Blessings as you walk with God today ✨</> : <>오늘 하루 하나님과 동행할<br />당신을 축복합니다 ✨</>}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="btn-sage" onClick={() => { window.location.href = "/qt"; }}>{lang === "de" ? "Zum QT-Tab" : lang === "fr" ? "Aller au QT" : lang === "en" ? "Go to QT" : "큐티 탭으로"}</button>
          <button className="btn-outline" onClick={() => { window.location.href = "/"; }}>{lang === "de" ? "Zur Startseite" : lang === "fr" ? "Accueil" : lang === "en" ? "Home" : "홈으로"}</button>
        </div>
      </div>
    </div>
  );
}
