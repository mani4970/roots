"use client";
import { useLang } from "@/lib/useLang";
import { t, type TKey } from "@/lib/i18n";

interface RootsManPopupProps {
  show: boolean;
  streakDays: number;
  onGoGarden: () => void;
}

/**
 * 10단계 메시지 키 배열 — 언어와 무관하게 단계만 결정
 * 각 키의 번역은 lib/i18n.ts 에서 관리
 */
const ROOTSMAN_MSG_KEYS: readonly TKey[] = [
  "rootsman_msg_1", "rootsman_msg_2", "rootsman_msg_3", "rootsman_msg_4", "rootsman_msg_5",
  "rootsman_msg_6", "rootsman_msg_7", "rootsman_msg_8", "rootsman_msg_9", "rootsman_msg_10",
  "rootsman_msg_11",
];

function getGardenMessageKey(days: number): TKey {
  if (days <= 0) return ROOTSMAN_MSG_KEYS[0];
  const cycleDay = days % 100;
  if (cycleDay === 0) return ROOTSMAN_MSG_KEYS[0];
  const stage = Math.min(Math.ceil(cycleDay / 10) + 1, 11);
  return ROOTSMAN_MSG_KEYS[stage - 1];
}

export default function RootsManPopup({ show, streakDays, onGoGarden }: RootsManPopupProps) {
  const lang = useLang();
  if (!show) return null;
  const msg = t(getGardenMessageKey(streakDays), lang);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", background: "rgba(26,28,30,0.7)", backdropFilter: "blur(6px)", paddingBottom: 80 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg2)", borderRadius: 24, border: "1px solid var(--border)", padding: "24px 24px 20px", margin: "0 20px", maxWidth: 360, width: "100%", textAlign: "center" }}>
        <div style={{ width: 88, height: 88, borderRadius: "50%", background: "var(--sage-light)", border: "2px solid rgba(122,157,122,0.22)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", overflow: "hidden" }}>
          <img
            src="/rootsman.webp"
            alt="RootsMan"
            style={{ width: 74, height: 74, objectFit: "contain", imageRendering: "pixelated" }}
          />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 8, lineHeight: 1.3 }}>
          {t("rootsman_title", lang)}
        </h3>
        <div style={{ padding: "12px 14px", background: "var(--sage-light)", borderRadius: 14, border: "1px solid rgba(122,157,122,0.3)", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--sage-dark)", lineHeight: 1.7 }}>{msg}</p>
        </div>
        <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 16 }}>
          {t("rootsman_check", lang)}
        </p>
        <button onClick={onGoGarden} style={{ width: "100%", padding: "12px", background: "var(--sage)", color: "var(--bg)", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {t("rootsman_btn", lang)}
        </button>
      </div>
    </div>
  );
}
