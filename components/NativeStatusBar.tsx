"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

const LIGHT_BG = "#F8F4EC";
const DARK_BG = "#1A1C1E";

export default function NativeStatusBar() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    document.documentElement.setAttribute("data-native-app", "true");
    document.documentElement.setAttribute("data-native-platform", Capacitor.getPlatform());

    function applyNativeStatusBar() {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      void StatusBar.setBackgroundColor({ color: isDark ? DARK_BG : LIGHT_BG }).catch(() => {});
      void StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
    }

    applyNativeStatusBar();
    const observer = new MutationObserver(applyNativeStatusBar);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const refreshNativeViewport = () => {
      requestAnimationFrame(() => {
        applyNativeStatusBar();
        window.dispatchEvent(new Event("resize"));
      });
    };

    window.addEventListener("roots:native-viewport-refresh", refreshNativeViewport);
    window.addEventListener("focus", refreshNativeViewport);

    return () => {
      observer.disconnect();
      window.removeEventListener("roots:native-viewport-refresh", refreshNativeViewport);
      window.removeEventListener("focus", refreshNativeViewport);
    };
  }, []);

  return null;
}
