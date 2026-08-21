export type NehemiahWallActionKind =
  | "pray"
  | "sealedLetter"
  | "walkThrough"
  | "lanternWalkThrough"
  | "carryStone"
  | "hammer"
  | "wave"
  | "listenNod"
  | "tambourine"
  | "tambourineLong";

export type NehemiahWallStage = {
  stageNumber: number;
  startDay: number;
  endDay: number;
  label: string;
  action: NehemiahWallActionKind;
};

export const NEHEMIAH_WALL_STAGES: readonly NehemiahWallStage[] = [
  { stageNumber: 1, startDay: 1, endDay: 7, label: "기도", action: "pray" },
  { stageNumber: 2, startDay: 8, endDay: 10, label: "왕의 명령 편지", action: "sealedLetter" },
  { stageNumber: 3, startDay: 11, endDay: 15, label: "예루살렘으로 이동", action: "walkThrough" },
  { stageNumber: 4, startDay: 16, endDay: 18, label: "등불을 들고 성벽을 점검", action: "lanternWalkThrough" },
  { stageNumber: 5, startDay: 19, endDay: 30, label: "돌 운반", action: "carryStone" },
  { stageNumber: 6, startDay: 31, endDay: 40, label: "돌 운반", action: "carryStone" },
  { stageNumber: 7, startDay: 41, endDay: 50, label: "돌 운반", action: "carryStone" },
  { stageNumber: 8, startDay: 51, endDay: 60, label: "성문·들보 망치질", action: "hammer" },
  { stageNumber: 9, startDay: 61, endDay: 69, label: "성문 주변 돌 운반", action: "carryStone" },
  { stageNumber: 10, startDay: 70, endDay: 70, label: "52일 만에 성벽 중수 완료", action: "wave" },
  { stageNumber: 11, startDay: 71, endDay: 80, label: "돌아오는 사람들을 환영", action: "wave" },
  { stageNumber: 12, startDay: 81, endDay: 90, label: "에스라의 말씀을 경청", action: "listenNod" },
  { stageNumber: 13, startDay: 91, endDay: 99, label: "소고·탬버린으로 찬양", action: "tambourine" },
  { stageNumber: 14, startDay: 100, endDay: 100, label: "성벽 봉헌 찬양", action: "tambourineLong" },
] as const;

export function normalizeNehemiahDay(day: number) {
  const safeDay = Number.isFinite(day) ? Math.floor(day) : 1;
  return Math.max(1, Math.min(100, safeDay));
}

export function getNehemiahWallStage(day: number): NehemiahWallStage {
  const normalized = normalizeNehemiahDay(day);
  return NEHEMIAH_WALL_STAGES.find(stage => normalized >= stage.startDay && normalized <= stage.endDay) ?? NEHEMIAH_WALL_STAGES[0];
}

export function getNehemiahWallBackground(day: number, isNight: boolean) {
  const stage = getNehemiahWallStage(day);
  const time = isNight ? "evening" : "morning";
  return `/images/reward-maps/nehemiah-wall/backgrounds/nehemiah_stage${String(stage.stageNumber).padStart(2, "0")}_${time}.webp`;
}

export function getNehemiahStageProgress(day: number) {
  const normalized = normalizeNehemiahDay(day);
  const stage = getNehemiahWallStage(normalized);
  const total = stage.endDay - stage.startDay + 1;
  const current = normalized - stage.startDay + 1;
  return {
    current,
    total,
    percent: (current / total) * 100,
  };
}
