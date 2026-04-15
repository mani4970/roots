"use client";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";

interface WelcomeBackPopupProps {
  show: boolean;
  daysSince: number;
  onClose: () => void;
}

export default function WelcomeBackPopup({ show, daysSince, onClose }: WelcomeBackPopupProps) {
  const lang = useLang();
  if (!show) return null;

  function getMessage(days: number) {
    if (lang === "de") {
      if (days >= 30) return { emoji: "🌱", title: "Lang nicht gesehen!", sub: "Das Wort hat auf Sie gewartet.\nKommen Sie zurück und wachsen Sie wieder." };
      if (days >= 14) return { emoji: "🌿", title: `${days} Tage später!`, sub: "Kein Problem, Sie können immer zurückkommen.\nFangen wir heute wieder an!" };
      if (days >= 7)  return { emoji: "☀️", title: `${days} Tage später!`, sub: "Ihr Baum hat auf Sie gewartet.\nWeiter geht\'s mit der Routine 💪" };
      return { emoji: "🌤️", title: `${days} Tage später!`, sub: "Kein Problem! Fangen wir heute neu an.\nKleine Schritte zählen 🌱" };
    }
    if (days >= 30) return { emoji: "🌱", title: "오랜만이에요!", sub: "말씀이 기다리고 있었어요.\n오늘 다시 뿌리를 내려봐요." };
    if (days >= 14) return { emoji: "🌿", title: `${days}일 만이에요!`, sub: "괜찮아요, 언제든 돌아오면 돼요.\n오늘부터 다시 함께 자라요!" };
    if (days >= 7)  return { emoji: "☀️", title: `${days}일 만이에요!`, sub: "나무가 당신을 기다리고 있었어요.\n오늘 루틴으로 힘내봐요 💪" };
    return { emoji: "🌤️", title: `${days}일 만이에요!`, sub: "괜찮아요! 오늘 다시 시작해봐요.\n조금씩 꾸준히가 중요해요 🌱" };
  }

  const msg = getMessage(daysSince);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 102, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(26,28,30,0.65)", backdropFilter: "blur(6px)", paddingBottom: 90 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg2)", borderRadius: 24, border: "1px solid var(--border)", padding: "24px 24px 20px", margin: "0 20px", maxWidth: 360, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{msg.emoji}</div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>{msg.title}</h3>
        <div style={{ padding: "12px 14px", background: "var(--sage-light)", borderRadius: 14, border: "1px solid rgba(122,157,122,0.3)", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--sage-dark)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{msg.sub}</p>
        </div>
        <button onClick={onClose} style={{ width: "100%", padding: "13px", background: "var(--sage)", color: "var(--bg)", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {t("welcome_back_btn", lang)}
        </button>
      </div>
    </div>
  );
}
