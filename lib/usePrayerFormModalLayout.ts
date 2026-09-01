"use client";

import { useEffect, useState } from "react";

export type PrayerFormViewport = {
  height: number;
  offsetTop: number;
};

type PrayerFormModalLayoutOptions = {
  showForm: boolean;
  hasShareModal: boolean;
};

type ScrollLockMode = "none" | "modal" | "prayer-form";

function findVerticalScrollContainer(target: EventTarget | null) {
  let element = target instanceof Element ? target : null;
  const html = document.documentElement;
  const body = document.body;

  while (element && element !== body && element !== html) {
    if (element instanceof HTMLElement) {
      const overflowY = window.getComputedStyle(element).overflowY;
      if (
        /(auto|scroll|overlay)/.test(overflowY) &&
        element.scrollHeight > element.clientHeight + 1
      ) {
        return element;
      }
    }
    element = element.parentElement;
  }

  return null;
}

export function usePrayerFormModalLayout({
  showForm,
  hasShareModal,
}: PrayerFormModalLayoutOptions) {
  const [viewport, setViewport] = useState<PrayerFormViewport | null>(null);
  const scrollLockMode: ScrollLockMode = showForm
    ? "prayer-form"
    : hasShareModal
      ? "modal"
      : "none";

  useEffect(() => {
    if (!showForm) {
      setViewport(null);
      return;
    }

    const visualViewport = window.visualViewport;
    const updateViewport = () => {
      const height = Math.max(
        1,
        Math.round(visualViewport?.height ?? window.innerHeight),
      );
      const offsetTop = Math.max(
        0,
        Math.round(visualViewport?.offsetTop ?? 0),
      );
      setViewport(current =>
        current?.height === height && current.offsetTop === offsetTop
          ? current
          : { height, offsetTop },
      );
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("scroll", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("scroll", updateViewport);
    };
  }, [showForm]);

  useEffect(() => {
    if (scrollLockMode === "none") return;

    const html = document.documentElement;
    const body = document.body;
    const isNativeIPhonePrayerForm =
      scrollLockMode === "prayer-form" &&
      html.dataset.nativePlatform === "ios" &&
      html.dataset.nativeFormFactor === "phone";
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const previousBodyStyles = {
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    const previousHtmlStyles = {
      overflow: html.style.overflow,
      overscrollBehavior: html.style.overscrollBehavior,
    };

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    let activeScrollable: HTMLElement | null = null;
    let lastTouchX = 0;
    let lastTouchY = 0;

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
      activeScrollable = findVerticalScrollContainer(event.target);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - lastTouchX;
      const deltaY = touch.clientY - lastTouchY;
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;

      if (Math.abs(deltaY) <= Math.abs(deltaX)) return;
      if (!activeScrollable) {
        event.preventDefault();
        return;
      }

      const atTop = activeScrollable.scrollTop <= 0;
      const atBottom =
        activeScrollable.scrollTop + activeScrollable.clientHeight >=
        activeScrollable.scrollHeight - 1;
      if ((deltaY > 0 && atTop) || (deltaY < 0 && atBottom)) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      activeScrollable = null;
    };

    if (isNativeIPhonePrayerForm) {
      // iOS WebKit may pan the visual viewport while the keyboard is open even
      // with overflow hidden. Freeze the page and allow only real inner scrolls.
      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      body.style.overscrollBehavior = "none";
      html.style.overscrollBehavior = "none";
      document.addEventListener("touchstart", handleTouchStart, {
        passive: true,
        capture: true,
      });
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
        capture: true,
      });
      document.addEventListener("touchend", handleTouchEnd, true);
      document.addEventListener("touchcancel", handleTouchEnd, true);
    }

    return () => {
      if (isNativeIPhonePrayerForm) {
        document.removeEventListener("touchstart", handleTouchStart, true);
        document.removeEventListener("touchmove", handleTouchMove, true);
        document.removeEventListener("touchend", handleTouchEnd, true);
        document.removeEventListener("touchcancel", handleTouchEnd, true);
      }
      body.style.overflow = previousBodyStyles.overflow;
      body.style.overscrollBehavior = previousBodyStyles.overscrollBehavior;
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.left = previousBodyStyles.left;
      body.style.right = previousBodyStyles.right;
      body.style.width = previousBodyStyles.width;
      html.style.overflow = previousHtmlStyles.overflow;
      html.style.overscrollBehavior = previousHtmlStyles.overscrollBehavior;
      if (isNativeIPhonePrayerForm) {
        window.scrollTo(scrollX, scrollY);
      }
    };
  }, [scrollLockMode]);

  return viewport;
}
