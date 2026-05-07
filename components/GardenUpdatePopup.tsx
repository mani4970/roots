"use client";
import ConfettiBurst from "@/components/ConfettiBurst";
import { useLang } from "@/lib/useLang";
import { t, type TKey } from "@/lib/i18n";

/**
 * 9가지 성령의 열매 — 번역은 i18n 키에서 관리
 * 새 언어 추가 시 이 파일 수정 불필요 (fruit_* 키만 추가)
 */
const BADGES: { name: string; fruit: string; descKey: TKey }[] = [
  { name: "Love",         fruit: "🍎", descKey: "fruit_love" },
  { name: "Peace",        fruit: "🍉", descKey: "fruit_peace" },
  { name: "Joy",          fruit: "🍌", descKey: "fruit_joy" },
  { name: "Goodness",     fruit: "🍊", descKey: "fruit_goodness" },
  { name: "Kindness",     fruit: "🍒", descKey: "fruit_kindness" },
  { name: "Patience",     fruit: "🍍", descKey: "fruit_patience" },
  { name: "Faithfulness", fruit: "🍇", descKey: "fruit_faithful" },
  { name: "Gentleness",   fruit: "🍋", descKey: "fruit_gentle" },
  { name: "Self-Control", fruit: "🍓", descKey: "fruit_selfctrl" },
];

/**
 * 11단계 메시지 키 매핑
 * 1단계는 새 정원/씨앗 단계(0일), 이후 10일 단위로 11단계까지 성장합니다.
 */
const STAGE_TITLE_KEYS: readonly TKey[] = [
  "garden_stage_1_title", "garden_stage_2_title", "garden_stage_3_title", "garden_stage_4_title", "garden_stage_5_title",
  "garden_stage_6_title", "garden_stage_7_title", "garden_stage_8_title", "garden_stage_9_title", "garden_stage_10_title",
  "garden_stage_11_title",
];
const STAGE_DESC_KEYS: readonly TKey[] = [
  "garden_stage_1_desc", "garden_stage_2_desc", "garden_stage_3_desc", "garden_stage_4_desc", "garden_stage_5_desc",
  "garden_stage_6_desc", "garden_stage_7_desc", "garden_stage_8_desc", "garden_stage_9_desc", "garden_stage_10_desc",
  "garden_stage_11_desc",
];
function getStage(streakDays: number): number {
  if (streakDays <= 0) return 1;
  const cycleDay = streakDays % 100;
  if (cycleDay === 0) return 1;
  return Math.min(Math.ceil(cycleDay / 10) + 1, 11);
}

interface GardenUpdatePopupProps {
  show: boolean;
  type: "garden" | "badge";
  streakDays: number;
  badgeIndex?: number;
  onClose: () => void;
}

export default function GardenUpdatePopup({ show, type, streakDays, badgeIndex = 0, onClose }: GardenUpdatePopupProps) {
  const lang = useLang();
  if (!show) return null;
  const badge = BADGES[badgeIndex % BADGES.length];
  const isBadge = type === "badge";
  const stage = getStage(streakDays);
  const stageTitle = t(STAGE_TITLE_KEYS[stage - 1], lang);
  const stageDesc = t(STAGE_DESC_KEYS[stage - 1], lang);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 101, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(26,28,30,0.88)", backdropFilter: "blur(10px)" }}>
      {isBadge && <ConfettiBurst variant="fixed" zIndex={102} />}
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg2)", borderRadius: 28, border: `1px solid ${isBadge ? "rgba(232,197,71,0.5)" : "var(--border)"}`, padding: "32px 28px 24px", margin: "0 28px", maxWidth: 340, width: "100%", textAlign: "center", boxShadow: isBadge ? "0 0 40px rgba(232,197,71,0.2)" : "none" }}>
        {isBadge ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🏅</div>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(232,197,71,0.15)", border: "3px solid rgba(232,197,71,0.6)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", gap: 2 }}>
              <span style={{ fontSize: 32 }}>{badge.fruit}</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(232,197,71,0.9)", letterSpacing: 0.5 }}>
                {badge.name.toUpperCase()}
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
              {t("garden_badge_title", lang)}
            </h2>
            <div style={{ padding: "12px 16px", background: "rgba(232,197,71,0.1)", borderRadius: 14, border: "1px solid rgba(232,197,71,0.3)", marginBottom: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(232,197,71,0.95)", marginBottom: 4 }}>
                {badge.name} — {t(badge.descKey, lang)}
              </p>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {t("garden_badge_100days", lang, { n: streakDays, fruit: t(badge.descKey, lang) })}
              </p>
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 16 }}>
              {t("garden_badge_profile", lang)}
            </p>
          </>
        ) : (
          <>
            <div style={{ width: 86, height: 86, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/roots-logo-transparent-160.png" alt="Roots" width={78} height={78} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 8, lineHeight: 1.3 }}>
              {stageTitle}
            </h2>
            <div style={{ padding: "12px 14px", background: "var(--sage-light)", borderRadius: 14, border: "1px solid rgba(122,157,122,0.3)", marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: "var(--sage-dark)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                {stageDesc}
              </p>
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 16 }}>
              {t("garden_updated_day", lang, { n: streakDays })}
            </p>
          </>
        )}
        <button onClick={onClose} style={{ width: "100%", padding: "13px", background: isBadge ? "rgba(232,197,71,0.9)" : "var(--sage)", color: isBadge ? "#1a1c1e" : "var(--bg)", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {isBadge ? t("badge_check_btn", lang) : t("garden_check_btn", lang)}
        </button>
      </div>
    </div>
  );
}
