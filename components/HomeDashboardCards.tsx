"use client";

import type { ReactNode, Ref } from "react";
import { BookMarked, ClipboardCheck, Trophy } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import type { PersonalChallengeStatus } from "@/lib/personalReflectionChallenges";
import { getHomeDashboardText } from "@/lib/homeDashboardText";
import styles from "./HomeDashboardCards.module.css";

export type HomeDashboardCardsProps = {
  lang: Lang;
  character: ReactNode;
  routineCompleted: number;
  challenge: PersonalChallengeStatus | null;
  challengeLoading: boolean;
  challengeError: boolean;
  decisionsCompleted: number;
  decisionsTotal: number;
  routineButtonRef?: Ref<HTMLButtonElement>;
  routineOpen?: boolean;
  onOpenRoutine: () => void;
  onOpenChallenge: () => void;
  onOpenDecisions: () => void;
};

/** Home entry points only: completion, rewards and record writes remain in Home. */
export default function HomeDashboardCards({
  lang, character, routineCompleted, challenge, challengeLoading, challengeError,
  decisionsCompleted, decisionsTotal, routineButtonRef, routineOpen = false,
  onOpenRoutine, onOpenChallenge, onOpenDecisions,
}: HomeDashboardCardsProps) {
  const text = getHomeDashboardText(lang);
  const routineDone = Math.max(0, Math.min(2, routineCompleted));
  const decisionTotal = Math.max(0, decisionsTotal);
  const decisionDone = Math.max(0, Math.min(decisionTotal, decisionsCompleted));
  const target = Math.max(1, challenge?.requiredDays ?? 1);
  const completed = Math.max(0, Math.min(target, challenge?.completedDays ?? 0));
  const ratio = challenge && !challengeError ? completed / target : 0;
  const challengeSummary = challengeError ? text.retry
    : challengeLoading && !challenge ? text.loading
    : challenge ? text.challengeProgress(completed, target)
    : text.noChallengeShort;
  const challengeState = challenge?.isComplete || challenge?.awarded ? text.challengeComplete
    : challenge?.hasMissedDay ? text.challengeMissed : "";
  const challengeLabel = [text.challengeTitle, challengeError ? text.challengeLoadError : challengeSummary, challengeState]
    .filter(Boolean).join(". ");

  return (
    <div className={styles.dashboard} lang={lang} data-home-dashboard>
      <button ref={routineButtonRef} type="button" className={`${styles.tile} ${styles.routine}`} onClick={onOpenRoutine}
        aria-haspopup="dialog" aria-expanded={routineOpen} aria-label={`${text.routineTitle}. ${text.routineProgress(routineDone)}`}>
        <BookMarked className={styles.icon} size={30} strokeWidth={2} aria-hidden="true" />
        <span className={styles.copy}>
          <span className={styles.title}>{text.routineCardTitle.map(line => <span key={line} className={styles.titleLine}>{line}</span>)}</span>
        </span>
      </button>

      <button type="button" className={`${styles.tile} ${styles.challenge}`} onClick={onOpenChallenge}
        aria-haspopup="dialog" aria-label={challengeLabel} aria-busy={challengeLoading && !challenge}>
        <Trophy className={styles.icon} size={30} strokeWidth={2} aria-hidden="true" />
        {challenge && !challengeError && (
          <span className={styles.ring} aria-hidden="true">
            <svg viewBox="0 0 44 44" fill="none">
              <circle className={styles.ringTrack} cx="22" cy="22" r="19" />
              <circle className={styles.ringValue} cx="22" cy="22" r="19" pathLength="100"
                strokeDasharray={`${ratio * 100} 100`} opacity={ratio > 0 ? 1 : 0} />
            </svg>
            <span className={styles.ringCount}>{completed}/{target}</span>
          </span>
        )}
        <span className={styles.copy}>
          <span className={styles.title}>{text.challengeTitle}</span>
          {(!challenge || challengeError) && <span className={styles.summary}>{challengeSummary}</span>}
        </span>
      </button>

      <div className={styles.character}>{character}</div>

      <button type="button" className={`${styles.tile} ${styles.decisions}`} onClick={onOpenDecisions}
        aria-haspopup="dialog" aria-label={`${text.decisionsTitle}. ${decisionTotal ? text.decisionProgress(decisionDone, decisionTotal) : text.decisionsEmpty}`}>
        <span className={styles.decisionHeader}>
          <ClipboardCheck className={styles.icon} size={30} strokeWidth={2} aria-hidden="true" />
          <span className={styles.decisionStatus} aria-hidden="true">
            {decisionTotal ? <>
              <span className={styles.decisionCount}>{decisionDone}/{decisionTotal}</span>
              <span>{text.decisionProgressLabel}</span>
            </> : <span>{text.decisionsEmptyShort}</span>}
          </span>
        </span>
        <span className={styles.copy}>
          <span className={styles.title}>{text.decisionsCardTitle.map(line => <span key={line} className={styles.titleLine}>{line}</span>)}</span>
        </span>
      </button>
    </div>
  );
}
