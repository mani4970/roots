"use client";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";

interface WelcomeBackPopupProps {
  show: boolean;
  daysSince: number;
  onClose: () => void;
}

export default function WelcomeBackPopup({ show, onClose }: WelcomeBackPopupProps) {
  const lang = useLang();
  if (!show) return null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 102, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(26,28,30,0.65)", backdropFilter: "blur(6px)", paddingBottom: 90 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg2)", borderRadius: 24, border: "1px solid var(--border)", padding: "24px 24px 20px", margin: "0 20px", maxWidth: 360, width: "100%", textAlign: "center" }}>
        <div style={{ width: 78, height: 78, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/roots-logo-transparent-160.png" alt="Roots" width={72} height={72} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>{t("welcome_back_fixed_title", lang)}</h3>
        <div style={{ padding: "12px 14px", background: "var(--sage-light)", borderRadius: 14, border: "1px solid rgba(122,157,122,0.3)", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--sage-dark)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{t("welcome_back_fixed_sub", lang)}</p>
        </div>
        <button onClick={onClose} style={{ width: "100%", padding: "13px", background: "var(--sage)", color: "var(--bg)", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {t("welcome_back_btn", lang)}
        </button>
      </div>
    </div>
  );
}
