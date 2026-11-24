"use client";

import { useSyncExternalStore } from "react";

const desktopWidth = "(min-width: 960px)";

export function isDesktopLayout() {
  return typeof window !== "undefined"
    && document.documentElement.hasAttribute("data-roots-desktop-client")
    && window.matchMedia(desktopWidth).matches;
}

function subscribeToWidth(update: () => void) {
  const query = window.matchMedia(desktopWidth);
  query.addEventListener("change", update);
  return () => query.removeEventListener("change", update);
}

export function useDesktopLayout() {
  return useSyncExternalStore(subscribeToWidth, isDesktopLayout, () => false);
}
