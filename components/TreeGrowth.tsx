"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import RewardMapAction from "./RewardMapAction";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";
import { parseLocalDateString } from "@/lib/date";
import {
  getRewardMapBackground,
  getRewardMapFallbackTitleKey,
  getRewardMapProgressInTen,
  getRewardMapProgressPercent,
  getRewardMapStage,
  getRewardMapTitleKey,
  getVisibleRewardMapCycles,
  type RewardMapCycle,
} from "@/lib/rewardMaps";

interface TreeGrowthProps {
  days: number;
  lastCheckin: string | null;
  showRootsMan?: boolean;
  ownerName?: string;
}

const NIGHT_START_HOUR = 19;
const NIGHT_END_HOUR = 6;

function isNightTime() {
  const h = new Date().getHours();
  return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR;
}

function getDaysSinceLastCheckin(lastCheckin: string | null) {
  if (!lastCheckin) return 0;
  const last = parseLocalDateString(lastCheckin);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - last.getTime()) / 86400000);
}

export default function TreeGrowth({ days, lastCheckin, showRootsMan = false, ownerName }: TreeGrowthProps) {
  const lang = useLang();
  const cycles = useMemo(() => getVisibleRewardMapCycles(days), [days]);
  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(cycles.length - 1, 0));
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const owner = ownerName?.trim() || t("profile_default_name", lang);
  const isNight = isNightTime();
  const daysSince = getDaysSinceLastCheckin(lastCheckin);
  const isAway = daysSince >= 3;

  useEffect(() => {
    const nextIndex = Math.max(cycles.length - 1, 0);
    setSelectedIndex(nextIndex);
    const node = scrollerRef.current;
    if (!node) return;
    requestAnimationFrame(() => {
      node.scrollTo({ left: node.clientWidth * nextIndex, behavior: "auto" });
    });
  }, [cycles.length, days]);

  function handleScroll() {
    const node = scrollerRef.current;
    if (!node || node.clientWidth <= 0) return;
    const index = Math.round(node.scrollLeft / node.clientWidth);
    setSelectedIndex(Math.max(0, Math.min(index, cycles.length - 1)));
  }

  const selectedCycle = cycles[selectedIndex] ?? cycles[cycles.length - 1] ?? cycles[0];
  const selectedStage = selectedCycle ? getRewardMapStage(selectedCycle) : null;
  const progressInTen = selectedCycle ? getRewardMapProgressInTen(selectedCycle) : 0;
  const periodProgress = selectedCycle ? getRewardMapProgressPercent(selectedCycle) : 0;

  return (
    <div style={{ margin: "0 16px 14px" }}>
      {isAway && (
        <div style={{ background: "rgba(196,149,106,0.12)", border: "1px solid rgba(196,149,106,0.25)", borderRadius: 12, padding: "8px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/roots-logo-transparent-96.png" alt="Roots" width={18} height={18} style={{ objectFit: "contain", imageRendering: "pixelated", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--terra-dark)" }}>
            {t("tree_away_msg", lang, { n: daysSince })}
          </span>
        </div>
      )}

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        style={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
          borderRadius: 20,
        }}
      >
        {cycles.map((cycle) => (
          <RewardMapCard
            key={cycle.cycleIndex}
            cycle={cycle}
            days={days}
            isNight={isNight}
            owner={owner}
            showAction={showRootsMan && cycle.isCurrent}
          />
        ))}
      </div>

      {cycles.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8 }}>
          {cycles.map((cycle, index) => (
            <button
              key={cycle.cycleIndex}
              onClick={() => {
                setSelectedIndex(index);
                scrollerRef.current?.scrollTo({ left: (scrollerRef.current?.clientWidth ?? 0) * index, behavior: "smooth" });
              }}
              aria-label={`${index + 1}`}
              style={{
                width: index === selectedIndex ? 18 : 7,
                height: 7,
                borderRadius: 999,
                border: "none",
                padding: 0,
                background: index === selectedIndex ? "var(--sage)" : "rgba(122,157,122,0.24)",
                cursor: "pointer",
                transition: "width 160ms ease",
              }}
            />
          ))}
        </div>
      )}

      {selectedStage && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 8, padding: "0 2px" }}>
          <span style={{ fontSize: 11, color: "var(--text3)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t(selectedStage.descKey, lang)}
          </span>
          <span style={{ fontSize: 11, color: "var(--text3)", flexShrink: 0 }}>{t("tree_progress", lang, { n: progressInTen })}</span>
        </div>
      )}

      <div className="progress-bar" style={{ marginTop: 6 }}>
        <div className="progress-fill" style={{ width: `${periodProgress}%` }} />
      </div>
    </div>
  );
}

function RewardMapCard({ cycle, days, isNight, owner, showAction }: { cycle: RewardMapCycle; days: number; isNight: boolean; owner: string; showAction: boolean }) {
  const lang = useLang();
  const stage = getRewardMapStage(cycle);
  const titleKey = getRewardMapTitleKey(cycle.kind);
  const fallbackTitleKey = getRewardMapFallbackTitleKey(cycle.kind);
  const title = t(titleKey, lang, { name: owner });
  const imgSrc = getRewardMapBackground(cycle, isNight);
  const rangeLabel = cycle.isCurrent
    ? t("tree_day_count", lang, { n: days })
    : t("reward_map_day_range", lang, { start: cycle.startDay, end: cycle.endDay });

  return (
    <div style={{ flex: "0 0 100%", scrollSnapAlign: "center" }}>
      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "16/9", background: "var(--bg2)" }}>
        <Image src={imgSrc} alt={title || t(fallbackTitleKey, lang)} fill style={{ objectFit: "cover" }} priority={cycle.isCurrent} />

        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5, zIndex: 6 }}>
          <div style={{ background: "var(--sage)", color: "var(--bg)", fontSize: 10, fontWeight: 800, padding: "4px 12px", borderRadius: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
            {title}
          </div>
          <div style={{ background: "rgba(26,28,30,0.68)", color: "#F8F5EA", fontSize: 9, fontWeight: 750, padding: "3px 10px", borderRadius: 20, backdropFilter: "blur(4px)" }}>
            {t(stage.labelKey, lang)}
          </div>
        </div>

        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(26,28,30,0.8)", color: "#EAEAEA", fontSize: 10, fontWeight: 650, padding: "4px 12px", borderRadius: 20, backdropFilter: "blur(4px)", zIndex: 6 }}>
          {rangeLabel}
        </div>

        <RewardMapAction trigger={showAction} action={stage.action} />
      </div>
    </div>
  );
}
