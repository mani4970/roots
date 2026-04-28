"use client";
import { useLang } from "@/lib/useLang";
import { Sparkles } from "lucide-react";

interface CelebrationProps {
  show: boolean;
  message?: string;
  subMessage?: string;
  onClose: () => void;
}

const CONFETTI_COLORS = ["#7A9D7A", "#C4956A", "#E8C547", "#D4E6D9", "#F4EFE0", "#9AB89A"];

// Deterministic spread so the confetti covers the whole viewport, not only the center.
const CONFETTI_PIECES = Array.from({ length: 86 }, (_, i) => ({
  id: i,
  left: (i * 37) % 100,
  delay: ((i * 11) % 38) / 10,
  duration: 3.3 + ((i * 7) % 18) / 10,
  size: 5 + ((i * 5) % 9),
  drift: ((i * 19) % 31) - 15,
  rotateStart: (i * 43) % 360,
  rotateEnd: 360 + ((i * 89) % 540),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  radius: i % 3 === 0 ? 999 : i % 3 === 1 ? 3 : 1,
  opacity: 0.72 + ((i * 13) % 28) / 100,
}));

export default function Celebration({ show, message, subMessage, onClose }: CelebrationProps) {
  const lang = useLang();
  if (!show) return null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(26,28,30,0.88)", backdropFilter: "blur(8px)", overflow: "hidden" }}>
      <style>{`
        @keyframes rootsConfettiFall {
          0% {
            transform: translate3d(0, -14vh, 0) rotate(var(--rotate-start));
            opacity: 0;
          }
          8% {
            opacity: var(--piece-opacity);
          }
          82% {
            opacity: var(--piece-opacity);
          }
          100% {
            transform: translate3d(var(--drift), 116vh, 0) rotate(var(--rotate-end));
            opacity: 0;
          }
        }

        @keyframes rootsConfettiPop {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .roots-confetti-piece {
            animation: none !important;
            opacity: 0.18;
          }
        }
      `}</style>

      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {CONFETTI_PIECES.map(piece => (
          <span
            key={piece.id}
            className="roots-confetti-piece"
            style={{
              position: "absolute",
              left: `${piece.left}%`,
              top: "-10vh",
              width: piece.size,
              height: piece.id % 4 === 0 ? piece.size * 1.8 : piece.size,
              borderRadius: piece.radius,
              background: piece.color,
              opacity: 0,
              boxShadow: "0 0 8px rgba(255,255,255,0.14)",
              animation: `rootsConfettiFall ${piece.duration}s cubic-bezier(0.18, 0.72, 0.28, 1) ${piece.delay}s forwards`,
              ["--drift" as any]: `${piece.drift}vw`,
              ["--rotate-start" as any]: `${piece.rotateStart}deg`,
              ["--rotate-end" as any]: `${piece.rotateEnd}deg`,
              ["--piece-opacity" as any]: piece.opacity,
            }}
          />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "36px 28px", background: "var(--bg2)", borderRadius: 28, border: "1px solid var(--border)", margin: "0 28px", maxWidth: 340, animation: "rootsConfettiPop 0.28s ease both" }}>
        <div style={{ width: 58, height: 58, borderRadius: 22, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--sage-light)", color: "var(--sage-dark)" }}><Sparkles size={30} strokeWidth={1.8} /></div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 10, lineHeight: 1.3 }}>
          {message ?? "완료!"}
        </h2>
        {subMessage && (
          <div style={{ padding: "12px 14px", background: "var(--sage-light)", borderRadius: 14, border: "1px solid rgba(122,157,122,0.3)", marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: "var(--sage-dark)", lineHeight: 1.7 }}>{subMessage}</p>
          </div>
        )}
        <div style={{ marginTop: 14, fontSize: 11, color: "var(--text3)" }}>{lang === "de" ? "Antippen zum Schließen" : lang === "en" ? "Tap to close" : lang === "fr" ? "Appuyez pour fermer" : "탭하면 닫혀요"}</div>
      </div>
    </div>
  );
}
