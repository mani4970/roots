"use client";

import { CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import styles from "./HomeRoutineActions.module.css";

type HomeRoutineActionsProps = {
  lang: Lang;
  qtDone: boolean;
  prayerDone: boolean;
  prayerStatus: "idle" | "saving" | "error";
  onReflection: () => void;
  onPrayer: () => void;
  onPastReflection: () => void;
};

/** Presentation only; Home owns completion state and the existing entry flows. */
export default function HomeRoutineActions({
  lang, qtDone, prayerDone, prayerStatus, onReflection, onPrayer, onPastReflection,
}: HomeRoutineActionsProps) {
  return (
    <div className={styles.actions} lang={lang}>
      <button type="button" onClick={onReflection}
        className={`${styles.action}${qtDone ? ` ${styles.reflectionDone}` : ""}`}>
        <span className={styles.copy}>
          <span>{t(qtDone ? "home_routine_qt_done" : "home_routine_qt_start", lang)}</span>
          {qtDone && <span className={styles.record}>{t("home_routine_view_record", lang)} <span aria-hidden="true">→</span></span>}
        </span>
        {qtDone
          ? <CheckCircle2 className={styles.indicator} size={16} aria-hidden="true" />
          : <ChevronRight className={styles.indicator} size={16} aria-hidden="true" />}
      </button>
      <button type="button" onClick={onPrayer} disabled={prayerStatus === "saving"} aria-busy={prayerStatus === "saving"}
        className={`${styles.action}${prayerDone ? ` ${styles.prayerDone}` : ""}`}>
        <span className={styles.copy}>{t(prayerDone ? "home_routine_prayer_done" : "home_routine_prayer_start", lang)}</span>
        {prayerStatus === "saving"
          ? <Loader2 className={`${styles.indicator} spin`} size={16} aria-hidden="true" />
          : prayerDone ? <CheckCircle2 className={styles.indicator} size={16} aria-hidden="true" />
          : <ChevronRight className={styles.indicator} size={16} aria-hidden="true" />}
      </button>
      {prayerStatus === "error" && <p role="alert">{t("home_prayer_save_error", lang)}</p>}
      <Link href="/qt?open=catch-up" onNavigate={onPastReflection} className={styles.pastReflection}>
        {t("qt_catchup_start", lang)}
      </Link>
    </div>
  );
}
