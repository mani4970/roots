"use client";

import { CheckCircle2, ChevronRight } from "lucide-react";
import { t, type Lang } from "@/lib/i18n";
import styles from "./HomeRoutineActions.module.css";

type HomeRoutineActionsProps = {
  lang: Lang;
  qtDone: boolean;
  prayerDone: boolean;
  prayerReady: boolean;
  onReflection: () => void;
  onPrayer: () => void;
};

/** Presentation only; Home owns completion state and the existing entry flows. */
export default function HomeRoutineActions({
  lang, qtDone, prayerDone, prayerReady, onReflection, onPrayer,
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
      <button type="button" onClick={onPrayer}
        className={`${styles.action}${prayerDone ? ` ${styles.prayerDone}` : ""}`}>
        <span className={styles.copy}>{t(prayerDone ? "home_routine_prayer_done" : prayerReady ? "home_routine_prayer_start" : "home_routine_prayer", lang)}</span>
        {prayerDone
          ? <CheckCircle2 className={styles.indicator} size={16} aria-hidden="true" />
          : <ChevronRight className={styles.indicator} size={16} aria-hidden="true" />}
      </button>
    </div>
  );
}
