"use client";

import { useEffect, type RefObject } from "react";

function preserveStyles(element: HTMLElement, properties: string[]) {
  const saved = properties.map(property => [property, element.style.getPropertyValue(property), element.style.getPropertyPriority(property)]);
  return () => saved.forEach(([property, value, priority]) => {
    if (value) element.style.setProperty(property, value, priority);
    else element.style.removeProperty(property);
  });
}

// Keep the scene behind a prayer form still. Only the front form uses the
// keyboard's available height; viewport panning is compensated without transforms
// (which would change the containing block of its fixed-position children).
export function usePrayerModalViewport(rootRef: RefObject<HTMLElement>, open: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!open || !root) return;

    const body = document.body;
    const html = document.documentElement;
    const viewport = window.visualViewport;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const initialTop = viewport?.offsetTop ?? 0;
    const initialLeft = viewport?.offsetLeft ?? 0;
    const bodyRect = body.getBoundingClientRect();
    const bodyScreenTop = bodyRect.top - initialTop;
    let bodyScreenLeft = bodyRect.left - initialLeft;
    let bodyWidth = bodyRect.width;
    let zoom = Number.parseFloat(getComputedStyle(body).zoom) || 1;
    let layoutWidth = window.innerWidth;
    let sceneHeight = viewport?.height ?? window.innerHeight;
    let keyboardReduced = false;
    let frame = 0;

    const restoreBody = preserveStyles(body, ["position", "top", "left", "width", "height", "margin", "overflow"]);
    const restoreHtml = preserveStyles(html, ["overflow", "scroll-behavior"]);
    const restoreRoot = preserveStyles(root, ["--prayer-visible-height", "--prayer-visible-top", "--prayer-scene-height", "--prayer-scene-top"]);
    const originalPosition = body.style.position;
    const originalWidth = body.style.width;
    const originalLeft = body.style.left;
    const originalMargin = body.style.margin;
    // The bottom nav is fixed to the window, so body locking alone would let
    // Android's resized window lift it behind the translucent prayer cards.
    const navs = Array.from(document.querySelectorAll<HTMLElement>(".bottom-nav"))
      .filter(nav => nav.getClientRects().length > 0)
      .map(nav => ({
        nav,
        gap: sceneHeight - (nav.getBoundingClientRect().bottom - initialTop),
        restore: preserveStyles(nav, ["top", "bottom"]),
      }));

    html.style.overflow = "hidden";
    html.style.scrollBehavior = "auto";
    body.style.overflow = "hidden";
    body.style.height = `${bodyRect.height / zoom}px`;

    function updateViewport() {
      frame = 0;
      const visibleHeight = viewport?.height ?? window.innerHeight;
      const top = viewport?.offsetTop ?? 0;
      const left = viewport?.offsetLeft ?? 0;
      const nextZoom = Number.parseFloat(getComputedStyle(body).zoom) || 1;
      const resized = Math.abs(window.innerWidth - layoutWidth) > 1 || nextZoom !== zoom;
      const focused = document.activeElement;
      const typing = focused instanceof HTMLElement && root!.contains(focused)
        && focused.matches("textarea, input, [contenteditable='true']");

      if (resized) {
        // A real width/orientation change may relayout the scene. Measure its
        // natural centered width, rather than stretching the tablet's zoomed body.
        body.style.position = originalPosition;
        body.style.width = originalWidth;
        body.style.left = originalLeft;
        body.style.margin = originalMargin;
        const bounds = body.getBoundingClientRect();
        bodyWidth = bounds.width;
        bodyScreenLeft = bounds.left - left;
        layoutWidth = window.innerWidth;
        zoom = nextZoom;
        sceneHeight = Math.max(visibleHeight, window.innerHeight);
        keyboardReduced = false;
      } else if ((typing || keyboardReduced) && visibleHeight < sceneHeight - 1) {
        // Keep the full height through blur/cancel and the keyboard-hide animation.
        keyboardReduced = true;
      } else {
        sceneHeight = visibleHeight;
        keyboardReduced = false;
      }

      body.style.position = "fixed";
      body.style.margin = "0";
      body.style.width = `${bodyWidth / zoom}px`;
      body.style.left = `${(bodyScreenLeft + left) / zoom}px`;
      body.style.top = `${(bodyScreenTop + top) / zoom}px`;
      root!.style.setProperty("--prayer-visible-height", `${visibleHeight / zoom}px`);
      root!.style.setProperty("--prayer-visible-top", `${top / zoom}px`);
      root!.style.setProperty("--prayer-scene-height", `${sceneHeight / zoom}px`);
      root!.style.setProperty("--prayer-scene-top", `${top / zoom}px`);
      for (const { nav, gap } of navs) {
        nav.style.top = `${(sceneHeight - gap - nav.getBoundingClientRect().height + top) / zoom}px`;
        nav.style.bottom = "auto";
      }
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(updateViewport);
    };
    updateViewport();
    window.addEventListener("resize", schedule);
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      navs.forEach(({ restore }) => restore());
      restoreRoot();
      restoreBody();
      // Restore the user's original page position without a smooth-scroll jump.
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
      restoreHtml();
    };
  }, [rootRef, open]);
}
