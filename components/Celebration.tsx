"use client";
import ConfettiBurst from "@/components/ConfettiBurst";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";
import { Sparkles } from "lucide-react";

interface CelebrationProps {
  show: boolean;
  message?: string;
  subMessage?: string;
  onClose: () => void;
}

export default function Celebration({ show, message, subMessage, onClose }: CelebrationProps) {
  const lang = useLang();
  if (!show) return null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(26,28,30,0.88)", backdropFilter: "blur(8px)", overflow: "hidden" }}>
      <style>{`
        @keyframes rootsConfettiPop {
          0% { opacity: 0; transform: translateY(12px) scale(0.94); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <ConfettiBurst variant="absolute" zIndex={1} />

      <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "36px 28px", background: "var(--bg2)", borderRadius: 28, border: "1px solid var(--border)", margin: "0 28px", maxWidth: 340, animation: "rootsConfettiPop 0.28s ease both", boxShadow: "0 18px 60px rgba(0,0,0,0.26)" }}>
        <div style={{ width: 58, height: 58, borderRadius: 22, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--sage-light)", color: "var(--sage-dark)" }}><Sparkles size={30} strokeWidth={1.8} /></div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 10, lineHeight: 1.3 }}>
          {message ?? t("celebration_default_done", lang)}
        </h2>
        {subMessage && (
          <div style={{ padding: "12px 14px", background: "var(--sage-light)", borderRadius: 14, border: "1px solid rgba(122,157,122,0.3)", marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: "var(--sage-dark)", lineHeight: 1.7 }}>{subMessage}</p>
          </div>
        )}
        <div style={{ marginTop: 14, fontSize: 11, color: "var(--text3)" }}>{t("celebration_tap_to_close", lang)}</div>
      </div>
    </div>
  );
}
