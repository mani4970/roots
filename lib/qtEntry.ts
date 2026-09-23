export type QTMode = "6step" | "sunday" | "free";
export type QTPhotoPassageSource = "scheduled" | "custom";
export type QTEntryOrigin = "home" | "qt";

const QT_RETURN_FROM_WRITER_SESSION_KEY = "roots_qt_return_from_writer_once";
const QT_RETURN_FROM_WRITER_MAX_AGE_MS = 15_000;

export function isQTEntryOrigin(value: string | null): value is QTEntryOrigin {
  return value === "home" || value === "qt";
}

export function markReturningFromQTWriter(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(QT_RETURN_FROM_WRITER_SESSION_KEY, String(Date.now()));
  } catch {
    // History navigation must keep working even when sessionStorage is unavailable.
  }
}

export function consumeReturningFromQTWriter(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(QT_RETURN_FROM_WRITER_SESSION_KEY);
    if (!raw) return false;
    window.sessionStorage.removeItem(QT_RETURN_FROM_WRITER_SESSION_KEY);
    const markedAt = Number(raw);
    return Number.isFinite(markedAt) && Date.now() - markedAt <= QT_RETURN_FROM_WRITER_MAX_AGE_MS;
  } catch {
    return false;
  }
}

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
  entry,
}: {
  mode: QTMode;
  preferredTranslation: number;
  todaySchedule?: QTSchedule | null;
  useTodaySchedule?: boolean;
  sundayContext?: boolean;
  entry?: QTEntryOrigin;
}) {
  const params = new URLSearchParams({
    mode,
    translation: String(preferredTranslation),
  });

  if (sundayContext) {
    params.set("sundayContext", "true");
  }
  if (entry) params.set("entry", entry);

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
  entry,
}: {
  preferredTranslation: number;
  todaySchedule?: QTSchedule | null;
  useTodaySchedule?: boolean;
  date?: string;
  catchup?: boolean;
  sundayContext?: boolean;
  entry?: QTEntryOrigin;
}) {
  const params = new URLSearchParams({
    translation: String(preferredTranslation),
    source: useTodaySchedule ? "scheduled" : "custom",
  });

  if (date) params.set("date", date);
  if (catchup) params.set("catchup", "true");
  if (sundayContext) params.set("sundayContext", "true");
  if (entry) params.set("entry", entry);

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
