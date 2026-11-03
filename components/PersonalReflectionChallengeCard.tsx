"use client";

import { BookOpen, Info, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { getShiftedLocalDateString, parseLocalDateString } from "@/lib/date";
import type { Lang } from "@/lib/i18n";
import type { PersonalChallengeStatus } from "@/lib/personalReflectionChallenges";
import { getPersonalChallengeText } from "@/lib/personalReflectionChallengeText";
import styles from "./PersonalReflectionChallengeCard.module.css";

type PersonalReflectionChallengeCardProps = {
  lang: Lang;
  status: PersonalChallengeStatus | null;
  loading?: boolean;
  error?: boolean;
  onOpen: () => void;
  onRetry?: () => void;
};

const cardStyle: CSSProperties = {
  display: "block", width: "100%", minHeight: 126, padding: "19px 20px 22px", borderRadius: 22,
  border: "1px solid var(--personal-challenge-border)", background: "var(--personal-challenge-surface)", color: "var(--personal-challenge-text)",
  boxShadow: "0 3px 14px #18221608", textAlign: "left", font: "inherit", WebkitTapHighlightColor: "transparent",
};

export default function PersonalReflectionChallengeCard({
  lang, status, loading = false, error = false, onOpen, onRetry,
}: PersonalReflectionChallengeCardProps) {
  const text = getPersonalChallengeText(lang);

  if (loading && !status) {
    return <div className={styles.card} lang={lang} aria-label={text.loading} aria-busy="true" style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 16, fontWeight: 650, lineHeight: 1.45 }}>
        <BookOpen size={22} strokeWidth={1.6} aria-hidden="true" style={{ flexShrink: 0 }} />
        <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{text.genericTitle}</span>
      </div>
      <div aria-hidden="true" style={{ width: "68%", height: 15, marginTop: 17, borderRadius: 5, background: "var(--personal-challenge-track)" }} />
      <div aria-hidden="true" style={{ height: 10, marginTop: 18, borderRadius: 4, background: "var(--personal-challenge-track)" }} />
    </div>;
  }

  if (error) {
    return <button className={styles.card} lang={lang} type="button" onClick={onRetry ?? onOpen} aria-label={`${text.loadError} ${text.retry}`} style={{ ...cardStyle, cursor: "pointer" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 16, fontWeight: 650, lineHeight: 1.45 }}>
        <BookOpen size={22} strokeWidth={1.6} aria-hidden="true" style={{ flexShrink: 0 }} />
        <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{status ? text.title : text.genericTitle}</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 15, fontSize: 12, color: "var(--personal-challenge-muted)", lineHeight: 1.5 }}>
        <RefreshCw size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
        <span>{text.loadError} {text.retry}</span>
      </span>
    </button>;
  }

  if (!status) {
    return <section className={styles.card} lang={lang} aria-label={text.genericTitle} style={{ ...cardStyle, minHeight: 98 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 16, fontWeight: 650, lineHeight: 1.45 }}>
        <BookOpen size={22} strokeWidth={1.6} aria-hidden="true" style={{ flexShrink: 0 }} />
        <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{text.genericTitle}</span>
      </div>
      <p style={{ margin: "17px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--personal-challenge-muted)" }}>{text.empty}</p>
    </section>;
  }

  const requiredDays = Math.max(1, status.requiredDays);
  const completedDays = Math.min(requiredDays, Math.max(0, status.completedDays));
  const complete = status.awarded || status.isComplete;
  const upcoming = status.status === "scheduled";
  const ended = status.status === "completed" && !complete;
  const progressText = upcoming ? text.goal(requiredDays)
    : !status.hasMissedDay && completedDays > 0 ? text.consecutive(completedDays)
    : text.completed(completedDays);
  const label = complete ? text.complete : upcoming ? text.upcoming : ended ? text.ended : status.hasMissedDay ? text.missed : text.active;
  const completedDates = new Set(status.completedDates);
  const start = parseLocalDateString(status.startDate);

  return <button
    className={styles.card} lang={lang} type="button" onClick={onOpen} aria-haspopup="dialog"
    aria-label={`${text.details}. ${progressText}. ${label}`}
    style={{ ...cardStyle, cursor: "pointer" }}
  >
    <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <BookOpen size={22} strokeWidth={1.6} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span style={{ minWidth: 0, fontSize: 16, lineHeight: 1.45, fontWeight: 650, overflowWrap: "anywhere", wordBreak: lang === "ko" ? "keep-all" : "normal" }}>{text.title}</span>
      <Info size={17} strokeWidth={1.6} aria-hidden="true" style={{ flexShrink: 0, color: "var(--personal-challenge-muted)" }} />
    </span>
    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9, margin: "14px 0 16px" }}>
      <span style={{ minWidth: 0, fontSize: 16, fontWeight: 600, lineHeight: 1.45, overflowWrap: "anywhere", fontVariantNumeric: "tabular-nums" }}>{progressText}</span>
      <span style={{ flexShrink: 0, maxWidth: "42%", fontSize: 11, color: "var(--personal-challenge-muted)", lineHeight: 1.45, textAlign: "right" }}>{label}</span>
    </span>
    <span
      role="progressbar" aria-label={text.genericTitle} aria-valuemin={0} aria-valuemax={requiredDays} aria-valuenow={completedDays}
      aria-valuetext={`${completedDays} / ${requiredDays}`}
      style={{ display: "grid", gridTemplateColumns: `repeat(${requiredDays}, minmax(0, 1fr))`, gap: 5 }}
    >
      {Array.from({ length: requiredDays }, (_, index) => {
        const date = getShiftedLocalDateString(index, start);
        const filled = !upcoming && completedDates.has(date);
        return <span key={date} aria-hidden="true" style={{ height: 10, borderRadius: 4, background: filled ? "var(--personal-challenge-filled)" : "var(--personal-challenge-track)", opacity: 1 }} />;
      })}
    </span>
  </button>;
}
