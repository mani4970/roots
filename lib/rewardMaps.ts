import type { TKey } from "@/lib/i18n";

export type RewardMapKind = "garden" | "peaceArk" | "futureJourney" | "futureMap";

const MAP_SEQUENCE: readonly RewardMapKind[] = [
  "garden",
  "peaceArk",
  "futureJourney",
  "garden",
  "futureMap",
] as const;

export const REWARD_MAP_CYCLE_DAYS = 100;
export const REWARD_MAP_SEQUENCE_DAYS = REWARD_MAP_CYCLE_DAYS * MAP_SEQUENCE.length;

export type RewardMapActionKind = "gardenWater" | "arkCarryWood" | "arkHammer" | "arkWaveBird" | "arkPray" | "none";

export interface RewardMapCycle {
  cycleIndex: number;
  sequenceIndex: number;
  kind: RewardMapKind;
  startDay: number;
  endDay: number;
  progressDay: number;
  isCurrent: boolean;
  isComplete: boolean;
}

export interface RewardMapStageInfo {
  stageNumber: number;
  labelKey: TKey;
  descKey: TKey;
  action: RewardMapActionKind;
}

export function getRewardMapKind(cycleIndex: number): RewardMapKind {
  return MAP_SEQUENCE[((cycleIndex % MAP_SEQUENCE.length) + MAP_SEQUENCE.length) % MAP_SEQUENCE.length];
}

export function getRewardMapCycleIndexForDays(days: number): number {
  const safeDays = Math.max(0, Math.floor(days || 0));
  if (safeDays <= 0) return 0;
  return Math.floor((safeDays - 1) / REWARD_MAP_CYCLE_DAYS);
}

export function getRewardMapProgressDay(days: number): number {
  const safeDays = Math.max(0, Math.floor(days || 0));
  if (safeDays <= 0) return 0;
  return ((safeDays - 1) % REWARD_MAP_CYCLE_DAYS) + 1;
}

export function isRewardMapCompletionDay(days: number): boolean {
  const safeDays = Math.max(0, Math.floor(days || 0));
  return safeDays > 0 && safeDays % REWARD_MAP_CYCLE_DAYS === 0;
}

export function isRewardMapStartDay(days: number): boolean {
  const safeDays = Math.max(0, Math.floor(days || 0));
  return safeDays > REWARD_MAP_CYCLE_DAYS && getRewardMapProgressDay(safeDays) === 1;
}

export function getCurrentRewardMapCycle(days: number): RewardMapCycle {
  const safeDays = Math.max(0, Math.floor(days || 0));
  const cycleIndex = getRewardMapCycleIndexForDays(safeDays);
  const progressDay = getRewardMapProgressDay(safeDays);
  return buildRewardMapCycle(cycleIndex, progressDay, true);
}

export function getVisibleRewardMapCycles(days: number): RewardMapCycle[] {
  const current = getCurrentRewardMapCycle(days);
  const cycles: RewardMapCycle[] = [];

  for (let index = 0; index <= current.cycleIndex; index += 1) {
    if (index === current.cycleIndex) {
      cycles.push(current);
    } else {
      cycles.push(buildRewardMapCycle(index, REWARD_MAP_CYCLE_DAYS, false));
    }
  }

  return cycles;
}

function buildRewardMapCycle(cycleIndex: number, progressDay: number, isCurrent: boolean): RewardMapCycle {
  const sequenceIndex = ((cycleIndex % MAP_SEQUENCE.length) + MAP_SEQUENCE.length) % MAP_SEQUENCE.length;
  const startDay = cycleIndex * REWARD_MAP_CYCLE_DAYS + 1;
  const endDay = (cycleIndex + 1) * REWARD_MAP_CYCLE_DAYS;
  return {
    cycleIndex,
    sequenceIndex,
    kind: MAP_SEQUENCE[sequenceIndex],
    startDay,
    endDay,
    progressDay: Math.max(0, Math.min(progressDay, REWARD_MAP_CYCLE_DAYS)),
    isCurrent,
    isComplete: !isCurrent || progressDay >= REWARD_MAP_CYCLE_DAYS,
  };
}

export function getRewardMapTitleKey(kind: RewardMapKind): TKey {
  if (kind === "peaceArk") return "reward_map_title_peace_ark";
  if (kind === "garden") return "home_garden_my";
  return "reward_map_title_journey";
}

export function getRewardMapKeywordKey(kind: RewardMapKind): TKey {
  if (kind === "peaceArk") return "reward_map_keyword_ark";
  if (kind === "garden") return "home_garden_keyword";
  return "reward_map_keyword_journey";
}

export function getRewardMapFallbackTitleKey(kind: RewardMapKind): TKey {
  if (kind === "peaceArk") return "reward_map_fallback_peace_ark";
  if (kind === "garden") return "reward_map_fallback_garden";
  return "reward_map_fallback_journey";
}

export function getRewardMapStartSubKey(kind: RewardMapKind): TKey {
  if (kind === "peaceArk") return "reward_map_start_peace_ark_sub";
  if (kind === "garden") return "reward_map_start_garden_sub";
  return "reward_map_start_default_sub";
}

const GARDEN_STAGE_LABEL_KEYS: readonly TKey[] = [
  "tree_stage_0", "tree_stage_1", "tree_stage_2", "tree_stage_3", "tree_stage_4",
  "tree_stage_5", "tree_stage_6", "tree_stage_7", "tree_stage_8", "tree_stage_9", "tree_stage_10",
];

const GARDEN_STAGE_DESC_KEYS: readonly TKey[] = [
  "tree_desc_0", "tree_desc_1", "tree_desc_2", "tree_desc_3", "tree_desc_4",
  "tree_desc_5", "tree_desc_6", "tree_desc_7", "tree_desc_8", "tree_desc_9", "tree_desc_10",
];

const ARK_STAGE_LABEL_KEYS: readonly TKey[] = [
  "peace_ark_stage_1", "peace_ark_stage_2", "peace_ark_stage_3", "peace_ark_stage_4", "peace_ark_stage_5",
  "peace_ark_stage_6", "peace_ark_stage_7", "peace_ark_stage_8", "peace_ark_stage_9", "peace_ark_stage_10",
];

const ARK_STAGE_DESC_KEYS: readonly TKey[] = [
  "peace_ark_desc_1", "peace_ark_desc_2", "peace_ark_desc_3", "peace_ark_desc_4", "peace_ark_desc_5",
  "peace_ark_desc_6", "peace_ark_desc_7", "peace_ark_desc_8", "peace_ark_desc_9", "peace_ark_desc_10",
];

export function getGardenStageIndex(progressDay: number, isComplete = false): number {
  if (isComplete) return 10;
  if (progressDay <= 0) return 0;
  return Math.min(Math.ceil(progressDay / 10), 10);
}

export function getGardenImageIndex(progressDay: number, isComplete = false): number {
  const stageIndex = getGardenStageIndex(progressDay, isComplete);
  return stageIndex + 1;
}

export function getArkStageNumber(progressDay: number, isComplete = false): number {
  if (isComplete) return 10;
  if (progressDay <= 0) return 1;
  return Math.min(Math.ceil(progressDay / 10), 10);
}

export function getRewardMapStage(cycle: RewardMapCycle): RewardMapStageInfo {
  if (cycle.kind === "peaceArk") {
    const stageNumber = getArkStageNumber(cycle.progressDay, cycle.isComplete);
    return {
      stageNumber,
      labelKey: ARK_STAGE_LABEL_KEYS[stageNumber - 1],
      descKey: ARK_STAGE_DESC_KEYS[stageNumber - 1],
      action: getArkActionForStage(stageNumber),
    };
  }

  if (cycle.kind === "garden") {
    const stageIndex = getGardenStageIndex(cycle.progressDay, cycle.isComplete);
    return {
      stageNumber: stageIndex,
      labelKey: GARDEN_STAGE_LABEL_KEYS[stageIndex],
      descKey: GARDEN_STAGE_DESC_KEYS[stageIndex],
      action: "gardenWater",
    };
  }

  const stageIndex = getGardenStageIndex(cycle.progressDay, cycle.isComplete);
  return {
    stageNumber: stageIndex,
    labelKey: "reward_map_future_stage",
    descKey: "reward_map_future_desc",
    action: "none",
  };
}

export function getRewardMapProgressInTen(cycle: RewardMapCycle): number {
  if (cycle.isComplete) return 10;
  const dayInStage = cycle.progressDay % 10;
  if (dayInStage === 0 && cycle.progressDay > 0) return 10;
  return dayInStage;
}

export function getRewardMapProgressPercent(cycle: RewardMapCycle): number {
  if (cycle.isComplete) return 100;
  return (getRewardMapProgressInTen(cycle) / 10) * 100;
}

export function getRewardMapBackground(cycle: RewardMapCycle, isNight: boolean): string {
  if (cycle.kind === "peaceArk") {
    const stage = getArkStageNumber(cycle.progressDay, cycle.isComplete);
    const time = isNight ? "evening" : "morning";
    const padded = String(stage).padStart(2, "0");
    return `/images/reward-maps/peace-ark/backgrounds/ark_stage${padded}_${time}.webp`;
  }

  const img = getGardenImageIndex(cycle.progressDay, cycle.isComplete);
  return isNight ? `/dark${img}.webp` : `/tree${img}.webp`;
}

export function getArkActionForStage(stageNumber: number): RewardMapActionKind {
  if (stageNumber === 1) return "arkCarryWood";
  if (stageNumber <= 8) return "arkHammer";
  if (stageNumber === 9) return "arkWaveBird";
  return "arkPray";
}
