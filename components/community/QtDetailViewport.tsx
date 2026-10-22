"use client";

import { useEffect, type RefObject } from "react";

function preserveStyles(element: HTMLElement, properties: string[]) {
  const saved = properties.map(property => [
    property, element.style.getPropertyValue(property), element.style.getPropertyPriority(property),
  ]);
  return () => saved.forEach(([property, value, priority]) => {
    if (value) element.style.setProperty(property, value, priority);
    else element.style.removeProperty(property);
  });
}

function isIosPhone() {
  const { nativePlatform, nativeFormFactor } = document.documentElement.dataset;
  if (nativePlatform) return nativePlatform === "ios" && nativeFormFactor === "phone";
  return /iPhone|iPod/i.test(navigator.userAgent);
}

/** Mounted with the actual dialog so every close and history change restores the page. */
export default function QtDetailViewport({ rootRef }: { rootRef: RefObject<HTMLDivElement> }) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !isIosPhone()) return;

    const body = document.body;
    const html = document.documentElement;
    const viewport = window.visualViewport;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const restoreBody = preserveStyles(body, ["position", "top", "left", "right", "width", "overflow"]);
    const restoreHtml = preserveStyles(html, ["overflow", "scroll-behavior"]);
    const restoreRoot = preserveStyles(root, [
      "--qt-modal-viewport-top", "--qt-modal-viewport-height", "--qt-modal-viewport-bottom",
    ]);
    let frame = 0;
    let revealFocusedComposer = false;
    let previousHeight = viewport?.height ?? window.innerHeight;

    // iOS can pan the document when focusing a textarea inside a fixed dialog.
    // Freeze only the page beneath this dialog; its own scrolling stays available.
    html.style.overflow = "hidden";
    html.style.scrollBehavior = "auto";
    body.style.position = "fixed";
    body.style.top = `${-scrollY}px`;
    body.style.left = `${-scrollX}px`;
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    function updateViewport() {
      frame = 0;
      const height = viewport?.height ?? window.innerHeight;
      const top = viewport?.offsetTop ?? 0;
      if (!Number.isFinite(height) || height <= 0) return;

      root!.style.setProperty("--qt-modal-viewport-top", `${top}px`);
      root!.style.setProperty("--qt-modal-viewport-height", `${height}px`);
      root!.style.setProperty("--qt-modal-viewport-bottom", "auto");

      const focused = document.activeElement;
      const reveal = revealFocusedComposer || Math.abs(height - previousHeight) > 1;
      revealFocusedComposer = false;
      previousHeight = height;
      if (!reveal || !(focused instanceof HTMLTextAreaElement) || !root!.contains(focused)) return;
      const composer = focused.closest<HTMLElement>("[data-qt-comment-composer]");
      if (!composer) return;

      const bounds = root!.getBoundingClientRect();
      const whole = composer.getBoundingClientRect();
      // A manually enlarged editor can exceed the visible area. Keep its input
      // usable then, rather than oscillating between its top and bottom edges.
      const target = whole.height <= bounds.height - 24 ? whole : focused.getBoundingClientRect();
      if (target.bottom > bounds.bottom - 12) root!.scrollTop += target.bottom - bounds.bottom + 12;
      else if (target.top < bounds.top + 12) root!.scrollTop -= bounds.top + 12 - target.top;
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(updateViewport);
    }
    function onFocus(event: FocusEvent) {
      if (event.target instanceof HTMLTextAreaElement) {
        revealFocusedComposer = true;
        schedule();
      }
    }

    updateViewport();
    root.addEventListener("focusin", onFocus);
    window.addEventListener("resize", schedule);
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("focusin", onFocus);
      window.removeEventListener("resize", schedule);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      restoreRoot();
      restoreBody();
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
      restoreHtml();
    };
  }, [rootRef]);

  return null;
}
