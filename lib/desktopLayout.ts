"use client";

import { useSyncExternalStore } from "react";

const desktopWidth = "(min-width: 960px)";

export function isDesktopLayout() {
  return typeof window !== "undefined"
    && document.documentElement.hasAttribute("data-roots-desktop-client")
    && window.matchMedia(desktopWidth).matches;
}

export function subscribeToDesktopLayout(update: () => void) {
  const query = window.matchMedia(desktopWidth);
  query.addEventListener("change", update);
  window.addEventListener("roots-tablet-layout-change", update);
  return () => {
    query.removeEventListener("change", update);
    window.removeEventListener("roots-tablet-layout-change", update);
  };
}

export function useDesktopLayout() {
  return useSyncExternalStore(subscribeToDesktopLayout, isDesktopLayout, () => false);
}
