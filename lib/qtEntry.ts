export type QTMode = "6step" | "sunday" | "free";
export type QTPhotoPassageSource = "scheduled" | "custom";

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
  useTodaySchedule = true,
  sundayContext = false,
}: {
  mode: QTMode;
  preferredTranslation: number;
  todaySchedule?: QTSchedule | null;
  useTodaySchedule?: boolean;
  sundayContext?: boolean;
}) {
  const params = new URLSearchParams({
    mode,
    translation: String(preferredTranslation),
  });

  if (sundayContext) {
    params.set("sundayContext", "true");
  }

  if (mode === "6step" && useTodaySchedule && todaySchedule) {
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


export function buildQTPhotoHref({
  preferredTranslation,
  todaySchedule,
  useTodaySchedule = true,
  date,
  catchup = false,
  sundayContext = false,
}: {
  preferredTranslation: number;
  todaySchedule?: QTSchedule | null;
  useTodaySchedule?: boolean;
  date?: string;
  catchup?: boolean;
  sundayContext?: boolean;
}) {
  const params = new URLSearchParams({
    translation: String(preferredTranslation),
    source: useTodaySchedule ? "scheduled" : "custom",
  });

  if (date) params.set("date", date);
  if (catchup) params.set("catchup", "true");
  if (sundayContext) params.set("sundayContext", "true");

  if (useTodaySchedule && todaySchedule) {
    params.set("schedBook", todaySchedule.book);
    params.set("schedChapter", String(todaySchedule.chapter));
    params.set("schedStartV", String(todaySchedule.start_verse));
    params.set("schedEndV", String(todaySchedule.end_verse));

    if (todaySchedule.end_chapter) {
      params.set("schedEndChapter", String(todaySchedule.end_chapter));
    }
  }

  return `/qt/photo?${params.toString()}`;
}
