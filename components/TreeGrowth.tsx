"use client";
import Image from "next/image";
import RootsMan from "./RootsMan";
import { useLang } from "@/lib/useLang";
import { t, type Lang, type TKey } from "@/lib/i18n";

interface TreeGrowthProps {
  days: number;
  lastCheckin: string | null;
  showRootsMan?: boolean;
}

function getCycleInfo(days: number) {
  if (days === 0) return { cycleDay: 0, cycleIndex: 0 };
  const cycleIndex = Math.floor((days - 1) / 100);
  const cycleDay = ((days - 1) % 100) + 1;
  return { cycleDay, cycleIndex };
}

function getImgIndex(cycleDay: number) {
  if (cycleDay === 0) return 1;
  return Math.min(Math.ceil(cycleDay / 10) + 1, 11);
}

const STAGE_LABEL_KEYS: readonly TKey[] = [
  "tree_stage_0", "tree_stage_1", "tree_stage_2", "tree_stage_3", "tree_stage_4",
  "tree_stage_5", "tree_stage_6", "tree_stage_7", "tree_stage_8", "tree_stage_9", "tree_stage_10",
];
const STAGE_DESC_KEYS: readonly TKey[] = [
  "tree_desc_0", "tree_desc_1", "tree_desc_2", "tree_desc_3", "tree_desc_4",
  "tree_desc_5", "tree_desc_6", "tree_desc_7", "tree_desc_8", "tree_desc_9", "tree_desc_10",
];

function getTreeState(days: number, lastCheckin: string | null, lang: Lang) {
  let daysSince = 0;
  if (lastCheckin) {
    const last = new Date(lastCheckin);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    last.setHours(0, 0, 0, 0);
    daysSince = Math.floor((today.getTime() - last.getTime()) / 86400000);
  }
  const { cycleDay, cycleIndex } = getCycleInfo(days);
  const img = days === 0 ? 1 : getImgIndex(cycleDay);
  return {
    img, cycleDay, cycleIndex,
    stage: {
      label: t(STAGE_LABEL_KEYS[img - 1], lang),
      desc:  t(STAGE_DESC_KEYS[img - 1], lang),
    },
    daysSince,
  };
}

function isNightTime() {
  const h = new Date().getHours();
  return h >= 20 || h < 5;
}

export default function TreeGrowth({ days, lastCheckin, showRootsMan = false }: TreeGrowthProps) {
  const lang = useLang();
  const { img, cycleDay, cycleIndex, stage, daysSince } = getTreeState(days, lastCheckin, lang);
  const isNight = isNightTime();
  const imgSrc = isNight ? `/dark${img}.png` : `/tree${img}.png`;
  const isAway = daysSince >= 3;

  const dayInCycle = cycleDay % 10 === 0 && cycleDay > 0 ? 10 : cycleDay % 10;
  const periodProgress = (dayInCycle / 10) * 100;

  return (
    <div style={{ margin: "0 16px 14px" }}>
      {isAway && (
        <div style={{ background: "rgba(196,149,106,0.12)", border: "1px solid rgba(196,149,106,0.25)", borderRadius: 12, padding: "8px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🌿</span>
          <span style={{ fontSize: 12, color: "var(--terra-dark)" }}>
            {t("tree_away_msg", lang, { n: daysSince })}
          </span>
        </div>
      )}

      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "16/9", background: "var(--bg2)" }}>
        <Image src={imgSrc} alt={stage.label} fill style={{ objectFit: "cover" }} priority />

        <div style={{ position: "absolute", top: 10, left: 10, background: "var(--sage)", color: "var(--bg)", fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 20, zIndex: 6 }}>
          {stage.label}
        </div>
        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(26,28,30,0.8)", color: "#EAEAEA", fontSize: 10, fontWeight: 600, padding: "4px 12px", borderRadius: 20, backdropFilter: "blur(4px)", zIndex: 6 }}>
          {t("tree_day_count", lang, { n: days })}
        </div>
        {cycleIndex > 0 && (
          <div style={{ position: "absolute", top: 36, right: 10, background: "rgba(232,197,71,0.9)", color: "#1a1c1e", fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 20, zIndex: 6 }}>
            🌟 {t("tree_garden_n", lang, { n: cycleIndex + 1 })}
          </div>
        )}

        <RootsMan trigger={showRootsMan} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "0 2px" }}>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>{stage.desc}</span>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>{t("tree_progress", lang, { n: dayInCycle })}</span>
      </div>

      <div className="progress-bar" style={{ marginTop: 6 }}>
        <div className="progress-fill" style={{ width: `${periodProgress}%` }} />
      </div>

      <div style={{ marginTop: 8 }}>
        <div className="streak-chip">
          <span style={{ fontSize: 12 }}>{isAway ? "🌿" : "🔥"}</span>
          <span>{t("tree_streak", lang, { n: days })}</span>
        </div>
      </div>
    </div>
  );
}
