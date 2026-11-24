"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import RewardMapAction from "./RewardMapAction";
import HeartShopMapFriends from "./HeartShopMapFriends";
import PeaceArkStaticItems from "./PeaceArkStaticItems";
import styles from "./TreeGrowth.module.css";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";
import { parseLocalDateString } from "@/lib/date";
import { normalizeRootsAvatarType, type RootsAvatarType } from "@/lib/avatar";
import { getNehemiahStageProgress, getNehemiahWallStage } from "@/lib/nehemiahWall";
import { getNehemiahWallCopy, getNehemiahWallStageLabel } from "@/lib/nehemiahWallText";
import type { HeartShopMapItemId } from "@/lib/heartShopItems";
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
  onActiveCycleChange?: (cycle: RewardMapCycle) => void;
  avatarType?: RootsAvatarType | null;
  heartShopItemIds?: HeartShopMapItemId[];
}

const NIGHT_START_HOUR = 19;
const NIGHT_END_HOUR = 6;
// The 430px phone layout gives the scene 398px after its two 16px margins.
const MAP_REFERENCE_WIDTH = 398;

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

export default function TreeGrowth({ days, lastCheckin, showRootsMan = false, ownerName, onActiveCycleChange, avatarType, heartShopItemIds = [] }: TreeGrowthProps) {
  const lang = useLang();
  const cycles = useMemo(() => getVisibleRewardMapCycles(days), [days]);
  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(cycles.length - 1, 0));
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const mouseDrag = useRef<{ id: number; x: number; y: number; startLeft: number; scale: number; moved: boolean } | null>(null);
  const owner = ownerName?.trim() || t("profile_default_name", lang);
  const isNight = isNightTime();
  const daysSince = getDaysSinceLastCheckin(lastCheckin);
  const isAway = daysSince >= 3;
  const normalizedAvatarType = normalizeRootsAvatarType(avatarType);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || typeof ResizeObserver === "undefined") return;

    // Every slide occupies the full scrollport. Measure it once for all maps;
    // only the wide desktop artwork uses this scale.
    const updateScale = (width: number) => {
      if (width > 0) scroller.style.setProperty("--roots-map-scene-scale", String(width / MAP_REFERENCE_WIDTH));
    };
    updateScale(scroller.clientWidth);
    const observer = new ResizeObserver(([entry]) => updateScale(entry.contentRect.width));
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const nextIndex = Math.max(cycles.length - 1, 0);
    setSelectedIndex(nextIndex);
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTo({ left: node.clientWidth * nextIndex, behavior: "instant" });
  }, [cycles.length, days]);

  function handleScroll() {
    const node = scrollerRef.current;
    if (!node || node.clientWidth <= 0) return;
    const index = Math.round(node.scrollLeft / node.clientWidth);
    setSelectedIndex(Math.max(0, Math.min(index, cycles.length - 1)));
  }

  function goToMap(index: number, smooth = false) {
    const node = scrollerRef.current;
    if (!node || !cycles[index]) return;
    const animate = smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollTo({ left: index * node.clientWidth, behavior: animate ? "smooth" : "instant" });
    setSelectedIndex(index);
  }

  function startMouseDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || cycles.length < 2) return;
    const rail = event.currentTarget;
    mouseDrag.current = {
      id: event.pointerId, x: event.clientX, y: event.clientY, startLeft: rail.scrollLeft,
      scale: rail.getBoundingClientRect().width / rail.clientWidth || 1, moved: false,
    };
    rail.setPointerCapture(event.pointerId);
  }

  function moveMouseDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = mouseDrag.current;
    if (!drag || event.pointerId !== drag.id) return;
    const rail = event.currentTarget;
    const dx = event.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(event.clientY - drag.y)) return;
      drag.moved = true;
      rail.classList.add(styles.dragging);
    }
    rail.scrollLeft = drag.startLeft - dx / drag.scale;
  }

  function finishMouseDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = mouseDrag.current;
    if (!drag || event.pointerId !== drag.id) return;
    mouseDrag.current = null;
    const rail = event.currentTarget;
    if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    if (!drag.moved) return;

    const distance = (drag.x - event.clientX) / drag.scale;
    const step = event.type === "pointerup" && Math.abs(distance) >= Math.min(40, rail.clientWidth / 6)
      ? Math.sign(distance) : 0;
    const initial = Math.round(drag.startLeft / rail.clientWidth);
    rail.classList.remove(styles.dragging);
    goToMap(Math.max(0, Math.min(initial + step, cycles.length - 1)), true);
  }

  const selectedCycle = cycles[selectedIndex] ?? cycles[cycles.length - 1] ?? cycles[0];
  const progressInTen = selectedCycle ? getRewardMapProgressInTen(selectedCycle) : 0;
  const periodProgress = selectedCycle ? getRewardMapProgressPercent(selectedCycle) : 0;
  const selectedProgressLabel = selectedCycle
    ? selectedCycle.kind === "nehemiahWall"
      ? (() => {
          const progress = getNehemiahStageProgress(selectedCycle.isComplete ? 100 : selectedCycle.progressDay);
          return `${progress.current} / ${progress.total}`;
        })()
      : t("tree_progress", lang, { n: progressInTen })
    : "";

  useEffect(() => {
    if (!selectedCycle) return;
    onActiveCycleChange?.(selectedCycle);
  }, [onActiveCycleChange, selectedCycle?.cycleIndex, selectedCycle?.kind]);

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

      {selectedCycle && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "0 2px" }}>
          <div className="progress-bar" style={{ flex: "1 1 auto", width: "auto" }}>
            <div className="progress-fill" style={{ width: `${periodProgress}%` }} />
          </div>
          <span style={{ fontSize: 11, color: "var(--text3)", flex: "0 0 auto", lineHeight: 1 }}>
            {selectedProgressLabel}
          </span>
        </div>
      )}

      <div className={styles.carousel}>
        <div
          ref={scrollerRef}
          className={styles.rail}
          data-paged={cycles.length > 1 || undefined}
          onScroll={handleScroll}
          onPointerDown={startMouseDrag}
          onPointerMove={moveMouseDrag}
          onPointerUp={finishMouseDrag}
          onPointerCancel={finishMouseDrag}
          onLostPointerCapture={finishMouseDrag}
          onDragStart={event => { if (mouseDrag.current) event.preventDefault(); }}
        >
          {cycles.map((cycle) => (
            <RewardMapCard
              key={cycle.cycleIndex}
              cycle={cycle}
              days={days}
              isNight={isNight}
              owner={owner}
              showAction={showRootsMan && cycle.isCurrent}
              avatarType={normalizedAvatarType}
              heartShopItemIds={heartShopItemIds}
            />
          ))}
        </div>
        {cycles.length > 1 && (
          <>
            <button type="button" className={`${styles.arrow} ${styles.previous}`}
              disabled={selectedIndex <= 0} aria-label={t("reward_map_previous", lang)} onClick={() => goToMap(selectedIndex - 1)}>
              <ChevronLeft aria-hidden="true" size={22} />
            </button>
            <button type="button" className={`${styles.arrow} ${styles.next}`}
              disabled={selectedIndex >= cycles.length - 1} aria-label={t("reward_map_next", lang)} onClick={() => goToMap(selectedIndex + 1)}>
              <ChevronRight aria-hidden="true" size={22} />
            </button>
          </>
        )}
      </div>

      {cycles.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8 }}>
          {cycles.map((cycle, index) => (
            <button
              key={cycle.cycleIndex}
              type="button"
              onClick={() => goToMap(index, true)}
              aria-label={`${index + 1}`}
              aria-current={index === selectedIndex || undefined}
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

    </div>
  );
}

function RewardMapCard({ cycle, days, isNight, owner, showAction, avatarType, heartShopItemIds }: { cycle: RewardMapCycle; days: number; isNight: boolean; owner: string; showAction: boolean; avatarType: RootsAvatarType; heartShopItemIds: HeartShopMapItemId[] }) {
  const lang = useLang();
  const stage = getRewardMapStage(cycle);
  const isNehemiah = cycle.kind === "nehemiahWall";
  const isFuture = cycle.kind === "futureJourney" || cycle.kind === "futureMap";
  const nehemiahCopy = isNehemiah ? getNehemiahWallCopy(lang) : null;
  const titleKey = getRewardMapTitleKey(cycle.kind);
  const fallbackTitleKey = getRewardMapFallbackTitleKey(cycle.kind);
  const title = nehemiahCopy ? nehemiahCopy.title(owner) : t(titleKey, lang, { name: owner });
  const fallbackTitle = nehemiahCopy?.fallbackTitle ?? t(fallbackTitleKey, lang);
  const defaultImgSrc = isFuture ? null : getRewardMapBackground(cycle, isNight);
  const imgSrc = cycle.kind === "garden" && stage.stageNumber === 0
    ? `/images/reward-maps/garden/avatar-variants/${avatarType}/day0_${isNight ? "evening" : "morning"}.webp`
    : defaultImgSrc;
  const stageLabel = isNehemiah
    ? getNehemiahWallStageLabel(lang, stage.stageNumber)
    : t(stage.labelKey, lang);
  const nehemiahAction = isNehemiah
    ? getNehemiahWallStage(cycle.isComplete ? 100 : cycle.progressDay).action
    : undefined;
  const rangeLabel = cycle.isCurrent
    ? t("tree_day_count", lang, { n: days })
    : t("reward_map_day_range", lang, { start: cycle.startDay, end: cycle.endDay });

  return (
    <div style={{ flex: "0 0 100%", scrollSnapAlign: "center" }}>
      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "16/9", background: "var(--bg2)" }}>
        <div className={styles.scene}>
          {imgSrc ? (
            <Image src={imgSrc} alt={title || fallbackTitle} fill style={{ objectFit: "cover" }} priority={cycle.isCurrent} />
          ) : (
            <div
              aria-label={title || fallbackTitle}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(145deg, var(--bg2), var(--sage-light))",
              }}
            >
              <img src="/roots-logo-transparent-160.png" alt="Roots" width={72} height={72} style={{ objectFit: "contain", imageRendering: "pixelated", opacity: 0.72 }} />
            </div>
          )}

          {cycle.kind === "peaceArk" && (
            <PeaceArkStaticItems stageNumber={stage.stageNumber} enabledItemIds={heartShopItemIds} />
          )}
          <HeartShopMapFriends itemIds={heartShopItemIds} mapKind={cycle.kind} stageNumber={stage.stageNumber} />
          <div style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none" }}>
            <RewardMapAction trigger={showAction} action={stage.action} avatarType={avatarType} nehemiahAction={nehemiahAction} />
          </div>
        </div>

        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5, zIndex: 6 }}>
          <div style={{ background: "rgba(26,28,30,0.68)", color: "#F8F5EA", fontSize: 9, fontWeight: 750, padding: "3px 10px", borderRadius: 20, backdropFilter: "blur(4px)" }}>
            {stageLabel}
          </div>
        </div>

        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(26,28,30,0.8)", color: "#EAEAEA", fontSize: 10, fontWeight: 650, padding: "4px 12px", borderRadius: 20, backdropFilter: "blur(4px)", zIndex: 6 }}>
          {rangeLabel}
        </div>

      </div>
    </div>
  );
}
