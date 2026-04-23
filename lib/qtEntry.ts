export type QTMode = "6step" | "sunday" | "free";

export type QTSchedule = {
  book: string;
  chapter: number;
  start_verse: number;
  end_verse: number;
  end_chapter: number | null;
  title: string | null;
};

export function isSunday(date = new Date()) {
  return date.getDay() === 0;
}

export function getRecommendedQTMode(date = new Date()): QTMode {
  return isSunday(date) ? "sunday" : "6step";
}

export function buildQTWriteHref({
  mode,
  preferredTranslation,
  todaySchedule,
}: {
  mode: QTMode;
  preferredTranslation: number;
  todaySchedule?: QTSchedule | null;
}) {
  const params = new URLSearchParams({
    mode,
    translation: String(preferredTranslation),
  });

  if (mode === "6step" && todaySchedule) {
    params.set("schedBook", todaySchedule.book);
    params.set("schedChapter", String(todaySchedule.chapter));
    params.set("schedStartV", String(todaySchedule.start_verse));
    params.set("schedEndV", String(todaySchedule.end_verse));

    if (todaySchedule.end_chapter) {
      params.set("schedEndChapter", String(todaySchedule.end_chapter));
    }
  }

  return `/qt/write?${params.toString()}`;
}
