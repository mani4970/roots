"use client";

import { useLayoutEffect, useRef, type HTMLAttributes } from "react";
import styles from "./QTSixStepReadingFrame.module.css";

/** Viewport sizing is local to the summary/key-verse screen. Never remount editors on resize. */
export default function QTSixStepReadingFrame({ active, children, className, ...props }: HTMLAttributes<HTMLDivElement> & { active: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!active || !root) return;
    const viewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      frame = 0;
      // Native iPad/Mac uses body zoom; viewport pixels must become local CSS pixels.
      const scale = root.offsetWidth ? root.getBoundingClientRect().width / root.offsetWidth : 1;
      const height = (viewport?.height ?? window.innerHeight) / (scale || 1);
      root.style.setProperty("--qt-reading-height", `${height}px`);
      root.dataset.compact = String(height < 600);
      root.dataset.short = String(height < 420);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    window.addEventListener("resize", schedule);
    viewport?.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      viewport?.removeEventListener("resize", schedule);
      root.style.removeProperty("--qt-reading-height");
      delete root.dataset.compact;
      delete root.dataset.short;
    };
  }, [active]);
  return <div {...props} ref={rootRef} className={`${className ?? ""} ${active ? styles.frame : ""}`}>{children}</div>;
}
