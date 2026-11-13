"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { usePrayerModalViewport } from "@/lib/usePrayerModalViewport";
import { usePrayerPopupBackdrop } from "@/lib/usePrayerPopupBackdrop";
import ObservationPopup from "./ObservationPopup";
import {
  getPersonalChallengeText,
  PERSONAL_REFLECTION_CHALLENGE_BADGE,
  PERSONAL_REFLECTION_CHALLENGE_MYSTERY_BADGE,
} from "@/lib/personalReflectionChallengeText";

type PersonalReflectionChallengePopupProps = {
  show: boolean;
  mode: "details" | "announcement" | "reward";
  lang: Lang;
  earned?: boolean;
  busy?: boolean;
  title?: string;
  period?: string;
  requiredDays?: number;
  completedDays?: number;
  failed?: boolean;
  rewardHearts?: number;
  badgeImagePath?: string | null;
  rewardObservation?: {
    userId: string | null | undefined;
    queued: boolean;
    instanceKey?: string | object | null;
  };
  onClose: () => void;
  onViewBadge?: () => void;
};

export default function PersonalReflectionChallengePopup({
  show, mode, lang, earned = false, busy = false, title, period,
  requiredDays = 11, completedDays, failed = false, rewardHearts = 30, badgeImagePath, rewardObservation, onClose, onViewBadge,
}: PersonalReflectionChallengePopupProps) {
  const text = getPersonalChallengeText(lang);
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const callbacks = useRef({ onClose, busy });
  callbacks.current = { onClose, busy };
  const id = useId();
  const titleId = `personal-challenge-title-${id}`;
  const bodyId = `personal-challenge-body-${id}`;
  const backdrop = usePrayerPopupBackdrop(() => { if (!callbacks.current.busy) callbacks.current.onClose(); });
  usePrayerModalViewport(rootRef, show);

  useEffect(() => {
    if (!show) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => confirmRef.current?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!callbacks.current.busy) callbacks.current.onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)"))
        .filter(element => element.getClientRects().length > 0);
      if (!controls.length) { event.preventDefault(); return; }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) {
        event.preventDefault(); last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement as HTMLElement))) {
        event.preventDefault(); first.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [show, mode]);

  if (typeof document === "undefined" || (!show && !rewardObservation?.queued)) return null;

  const actualBadge = badgeImagePath || PERSONAL_REFLECTION_CHALLENGE_BADGE;
  const reveal = mode !== "details" || earned;
  const badge = reveal ? actualBadge : PERSONAL_REFLECTION_CHALLENGE_MYSTERY_BADGE;
  const showTopBadge = mode === "announcement" || mode === "reward";
  const popupTitle = mode === "reward" ? text.rewardTitle : title || text.title;
  const progressTarget = Number.isFinite(requiredDays) ? Math.max(1, Math.trunc(requiredDays)) : 1;
  const progressDays = typeof completedDays === "number" && Number.isFinite(completedDays)
    ? Math.min(progressTarget, Math.max(0, Math.trunc(completedDays))) : 0;
  const progressStatus = earned ? text.complete : failed ? text.missed : text.active;

  return createPortal(
    // Keep queued rewards observable before they become visible, and measure
    // their actual portal content rather than an empty marker on the home page.
    <ObservationPopup userId={rewardObservation?.userId} kind="challenge_reward"
      queued={rewardObservation?.queued === true} instanceKey={rewardObservation?.instanceKey}>
    {show && <div
      ref={rootRef} lang={lang}
      style={{ position: "fixed", insetInline: 0, top: "var(--prayer-visible-top, 0px)", height: "var(--prayer-visible-height, 100vh)", zIndex: 270,
        display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", isolation: "isolate",
        padding: "max(14px, env(safe-area-inset-top)) 18px max(14px, env(safe-area-inset-bottom))" }}
    >
      <button type="button" tabIndex={-1} aria-hidden="true" {...backdrop}
        style={{ position: "absolute", inset: 0, zIndex: -1, border: 0, padding: 0, background: "#162015B8", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />
      <div
        ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} aria-busy={busy}
        style={{ position: "relative", width: "100%", maxWidth: 340, maxHeight: "100%", overflowY: "auto", boxSizing: "border-box",
          borderRadius: 25, border: "1px solid #E6E2D9", padding: "26px 23px 22px", background: "#FFFDF8", color: "#30372F", colorScheme: "light",
          boxShadow: "0 10px 28px #00000020", textAlign: "center", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
      >
        <button type="button" aria-label={text.close} onClick={() => { if (!busy) onClose(); }} disabled={busy}
          style={{ position: "absolute", top: 5, right: 7, width: 44, height: 44, border: 0, padding: 0, background: "transparent", color: "#757A70", display: "flex", alignItems: "center", justifyContent: "center", cursor: busy ? "default" : "pointer" }}>
          <X size={21} strokeWidth={1.6} aria-hidden="true" />
        </button>
        {showTopBadge && <img src={actualBadge} alt={text.badgeName} width={132} height={132} style={{ display: "block", width: 132, height: 132, margin: "0 auto 16px", objectFit: "contain" }} />}
        <h2 id={titleId} style={{ margin: "8px 16px 25px", fontSize: 19, fontWeight: 650, lineHeight: 1.45, color: "#30372F", overflowWrap: "anywhere", wordBreak: lang === "ko" ? "keep-all" : "normal" }}>{popupTitle}</h2>
        {mode !== "reward" && <p style={{ margin: "-13px 0 21px", fontSize: 12, lineHeight: 1.5, color: "#6E7468" }}>{period || text.period}</p>}
        <p id={bodyId} style={{ margin: "0 0 25px", fontSize: 13, lineHeight: 1.8, color: "#30372F", wordBreak: lang === "ko" ? "keep-all" : "normal", overflowWrap: "anywhere" }}>
          {mode === "reward" ? text.awarded(rewardHearts) : <>{text.ruleFor(requiredDays)}<br />{text.rewardFor(rewardHearts)}</>}
        </p>
        {mode === "details" && completedDays !== undefined && (
          <div style={{ marginBottom: 23, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <span style={{ minWidth: 0, fontSize: 13, fontWeight: 650, lineHeight: 1.5, overflowWrap: "anywhere" }}>{text.completed(progressDays)}</span>
              <span style={{ flexShrink: 0, fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{progressDays} / {progressTarget}</span>
            </div>
            <div role="progressbar" aria-label={text.genericTitle}
              aria-valuemin={0} aria-valuemax={progressTarget} aria-valuenow={progressDays}
              aria-valuetext={`${text.completed(progressDays)} / ${text.goal(progressTarget)}. ${progressStatus}`}
              style={{ height: 10, overflow: "hidden", borderRadius: 5, background: "#E8E3D8" }}>
              <div style={{ height: "100%", width: `${progressDays / progressTarget * 100}%`, borderRadius: "inherit", background: "#B4934D" }} />
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.5, color: "#6E7468" }}>{progressStatus}</p>
          </div>
        )}
        {mode === "details" && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 23 }}>
          <div style={{ width: 78, height: 78, flex: "0 0 78px" }}><img src={badge} alt={reveal ? text.badgeName : text.mystery} width={78} height={78} style={{ display: "block", width: 78, height: 78, objectFit: "contain" }} /></div>
          <span aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 78, height: 78, flex: "0 0 78px", fontSize: 34 }}>💛</span>
        </div>}
        <div style={{ display: "flex", gap: 8 }}>
          {mode === "reward" && onViewBadge && <button type="button" className="btn-sage" disabled={busy} onClick={onViewBadge} style={{ flex: 1, minWidth: 0, minHeight: 44, padding: "10px 9px", fontSize: 13, background: "#DEE5D4", color: "#34402F", borderColor: "#CBD3C2" }}>{text.viewBadge}</button>}
          <button ref={confirmRef} type="button" className={mode === "reward" && onViewBadge ? "btn-outline" : "btn-sage"} disabled={busy} onClick={onClose}
            style={{ flex: 1, minWidth: 0, minHeight: 44, padding: "10px 9px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              background: mode === "reward" && onViewBadge ? "#FFFDF8" : "#DEE5D4", color: "#34402F", borderColor: "#CBD3C2" }}>
            {busy && <Loader2 size={15} className="spin" aria-hidden="true" />}{text.confirm}
          </button>
        </div>
      </div>
    </div>}
    </ObservationPopup>, document.body,
  );
}
