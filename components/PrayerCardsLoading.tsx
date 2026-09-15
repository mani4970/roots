"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Loader2, X } from "lucide-react";
import { type Lang } from "@/lib/i18n";
import { getPrayerCardText } from "@/lib/prayerCardText";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";
import styles from "./PrayerExperience.module.css";

// This small shell is available before the prayer feature's chunk finishes loading.
export default function PrayerCardsLoading({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const text = getPrayerCardText(lang);
  const closeButton = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [viewportStyle, setViewportStyle] = useState<CSSProperties>({});

  useAndroidBackHandler(() => { closeRef.current(); return true; });

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const updateViewport = () => {
      const zoom = Number.parseFloat(getComputedStyle(document.body).zoom) || 1;
      const viewport = window.visualViewport;
      setViewportStyle({
        "--prayer-visible-height": `${(viewport?.height ?? window.innerHeight) / zoom}px`,
        "--prayer-visible-top": `${(viewport?.offsetTop ?? 0) / zoom}px`,
      } as CSSProperties);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      } else if (event.key === "Tab") {
        event.preventDefault();
        closeButton.current?.focus({ preventScroll: true });
      }
    };
    updateViewport();
    closeButton.current?.focus({ preventScroll: true });
    document.addEventListener("keydown", keydown);
    window.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      document.removeEventListener("keydown", keydown);
      window.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div className={`roots-prayer-phase2c ${styles.popup}`} style={viewportStyle} role="dialog" aria-modal="true" aria-label={text.heading} data-prayer-loading-shell>
      <div className={styles.popupShell}>
        <header className={styles.header}>
          <div className={styles.headingRow}>
            <h1>{text.heading}</h1>
            <button ref={closeButton} type="button" className={styles.iconButton} onClick={onClose} aria-label={text.close}><X size={22} /></button>
          </div>
          <div className={styles.categoryTabs} role="group" aria-label={text.categoryLabel}>
            <button type="button" disabled aria-pressed="true">{text.mine}</button>
            <button type="button" disabled aria-pressed="false">{text.intercession}</button>
          </div>
        </header>
        <div className={styles.content}>
          <div className={styles.loading} role="status" aria-label={text.loading}>
            <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" aria-hidden="true" />
          </div>
        </div>
        <div className={styles.popupFooter} />
      </div>
    </div>
  );
}
