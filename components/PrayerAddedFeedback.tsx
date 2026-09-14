"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, HandHeart, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { getPrayerCardText } from "@/lib/prayerCardText";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";
import styles from "./PrayerAddedFeedback.module.css";

export type PrayerAddedEntry = {
  id: string;
  content: string;
  authorName: string;
  mode: "spin" | "fly";
  sourceElement?: HTMLElement | null;
};

type Props = {
  entry: PrayerAddedEntry;
  lang: Lang | "es";
  onClose: () => void;
  onView: (id: string) => void;
};

/** Success feedback only: the caller must finish the intercession insert first. */
export default function PrayerAddedFeedback({ entry, lang, onClose, onView }: Props) {
  const text = getPrayerCardText(lang);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const flyerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const callbacks = useRef({ onClose, onView });
  callbacks.current = { onClose, onView };

  useAndroidBackHandler(() => {
    callbacks.current.onClose();
    return true;
  });
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    if (entry.mode === "spin") {
      document.body.style.overflow = "hidden";
      closeRef.current?.focus({ preventScroll: true });
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        callbacks.current.onClose();
      }
      if (entry.mode !== "spin" || event.key !== "Tab") return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]');
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("keydown", handleKey, true);
      if (entry.mode === "spin") document.body.style.overflow = previousOverflow;
      if (entry.mode === "spin" && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [mounted, entry.mode]);

  useEffect(() => {
    if (!mounted || entry.mode !== "fly") return;
    const root = rootRef.current;
    const flyer = flyerRef.current;
    const target = document.querySelector<HTMLElement>('.bottom-nav a[href="/prayer"]');
    if (!root || !flyer || !target) return;
    const rootRect = root.getBoundingClientRect();
    // Client rects include the native iPad/Mac body's CSS zoom. Convert both
    // endpoints into this overlay's coordinates without changing app scaling.
    const scale = root.offsetWidth > 0 ? rootRect.width / root.offsetWidth : 1;
    const targetRect = target.getBoundingClientRect();
    const source = entry.sourceElement?.isConnected ? entry.sourceElement.getBoundingClientRect() : targetRect;
    const x = (source.left + source.width / 2 - rootRect.left) / scale - 30;
    const y = (source.top + source.height / 2 - rootRect.top) / scale - 40;
    const endX = (targetRect.left + targetRect.width / 2 - rootRect.left) / scale - 30;
    const endY = (targetRect.top + targetRect.height / 2 - rootRect.top) / scale - 40;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animations: Animation[] = [];
    let cancelled = false;
    const highlight = () => {
      if (cancelled || !target.isConnected || reduced || !target.animate) return;
      animations.push(target.animate([
        { boxShadow: "0 0 0 0 rgba(123,159,118,0)", backgroundColor: "transparent" },
        { boxShadow: "0 0 0 8px rgba(123,159,118,.18)", backgroundColor: "rgba(123,159,118,.2)" },
        { boxShadow: "0 0 0 0 rgba(123,159,118,0)", backgroundColor: "transparent" },
      ], { duration: 700, easing: "ease-out" }));
    };
    if (!reduced && flyer.animate) {
      flyer.style.visibility = "visible";
      const animation = flyer.animate([
        { transform: `translate(${x}px, ${y}px) rotate(-7deg) scale(1)`, opacity: .95 },
        { transform: `translate(${(x + endX) / 2}px, ${Math.min(y, endY) - 45}px) rotate(5deg) scale(.8)`, opacity: .95, offset: .4 },
        { transform: `translate(${endX}px, ${endY}px) rotate(0deg) scale(.18)`, opacity: 0 },
      ], { duration: 650, easing: "cubic-bezier(.3,.1,.3,1)", fill: "forwards" });
      animations.push(animation);
      animation.onfinish = highlight;
    }
    return () => {
      cancelled = true;
      animations.forEach((animation) => animation.cancel());
    };
  }, [mounted, entry]);

  if (!mounted) return null;
  return createPortal(
    <div ref={rootRef} className={entry.mode === "spin" ? styles.overlay : styles.flyOverlay}
      onClick={entry.mode === "spin" ? () => callbacks.current.onClose() : undefined}>
      {entry.mode === "fly" && (
        <div ref={flyerRef} className={styles.flyer} aria-hidden="true"><HandHeart size={22} /><span /><span /></div>
      )}
      <div ref={dialogRef} className={entry.mode === "spin" ? styles.dialog : styles.toast}
        role={entry.mode === "spin" ? "dialog" : "region"}
        aria-modal={entry.mode === "spin" ? true : undefined} aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}>
        <p className={styles.title} id={titleId} role="status"><Check size={18} aria-hidden="true" />{text.added}</p>
        {entry.mode === "spin" && (
          <article className={styles.prayer}>
            <span className={styles.kind}><HandHeart size={16} aria-hidden="true" />{text.intercession}</span>
            <h2 className={styles.author}>{entry.authorName}</h2>
            <div className={styles.body} tabIndex={0}>{entry.content}</div>
          </article>
        )}
        <div className={styles.buttons}>
          <button ref={closeRef} type="button" className={styles.close} onClick={() => callbacks.current.onClose()}>
            {entry.mode === "fly" && <X size={15} aria-hidden="true" />}{text.close}
          </button>
          <button type="button" className={styles.view} onClick={() => callbacks.current.onView(entry.id)}>{text.viewIntercession}</button>
        </div>
      </div>
    </div>, document.body,
  );
}
