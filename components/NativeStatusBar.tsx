"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Capacitor,
  registerPlugin,
  SystemBars,
  SystemBarsStyle,
  SystemBarType,
} from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

const LIGHT_BG = "#F8F4EC";
const DARK_BG = "#1A1C1E";
const AUTH_PATHS = new Set(["/welcome", "/login", "/signup", "/reset-password", "/auth/callback"]);

// Only a new native page uses this reset. Same-path card/modal history and
// explicit anchor destinations keep their existing scroll behavior.
function restoreRoutePosition(watchKeyboard: boolean) {
  if (window.location.hash) return;

  const viewport = watchKeyboard ? window.visualViewport : null;
  let active = true;
  let frame = 0;
  let cleanupTimer = 0;
  const hasKeyboardOffset = () => Boolean(viewport && (
    viewport.offsetTop > 1 || viewport.height < window.innerHeight - 1
  ));
  const stop = () => {
    active = false;
    cancelAnimationFrame(frame);
    window.clearTimeout(cleanupTimer);
    window.removeEventListener("pointerdown", stop, true);
    window.removeEventListener("touchstart", stop, true);
    window.removeEventListener("wheel", stop, true);
    window.removeEventListener("keydown", stop, true);
    viewport?.removeEventListener("resize", schedule);
    viewport?.removeEventListener("scroll", schedule);
  };
  const restore = () => {
    frame = 0;
    if (!active) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (!hasKeyboardOffset()) stop();
  };
  const schedule = () => {
    if (active && !frame) frame = requestAnimationFrame(restore);
  };

  window.addEventListener("pointerdown", stop, { capture: true, passive: true });
  window.addEventListener("touchstart", stop, { capture: true, passive: true });
  window.addEventListener("wheel", stop, { capture: true, passive: true });
  window.addEventListener("keydown", stop, true);
  if (hasKeyboardOffset()) {
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    // Cleanup only: viewport events drive the correction, never timer retries.
    cleanupTimer = window.setTimeout(stop, 1500);
  }
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  schedule();
  return stop;
}

interface RootsStatusBarPlugin {
  setBackgroundColor(options: { color: string }): Promise<void>;
}

const RootsStatusBar = registerPlugin<RootsStatusBarPlugin>("RootsStatusBar");

export default function NativeStatusBar() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const nativePlatform = Capacitor.getPlatform();
    document.documentElement.setAttribute("data-native-app", "true");
    document.documentElement.setAttribute("data-native-platform", nativePlatform);
    const shortestScreenSide = Math.min(
      window.screen?.width || window.innerWidth,
      window.screen?.height || window.innerHeight,
    );
    const nativeFormFactor = shortestScreenSide >= 768 ? "tablet" : "phone";
    document.documentElement.setAttribute("data-native-form-factor", nativeFormFactor);

    if (nativePlatform === "ios" && nativeFormFactor === "tablet") {
      // iPadOS keeps multi-touch capability; an iOS app running on a Mac does not.
      document.documentElement.setAttribute(
        "data-native-ios-device",
        window.navigator.maxTouchPoints > 1 ? "ipad" : "mac",
      );
    } else {
      document.documentElement.removeAttribute("data-native-ios-device");
    }

    function applyNativeStatusBar() {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";

      if (Capacitor.getPlatform() === "android") {
        const backgroundColor = isDark ? DARK_BG : LIGHT_BG;
        document.documentElement.style.backgroundColor = backgroundColor;

        const applyLegacyAndroidStatusBar = () => {
          void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
          void StatusBar.setBackgroundColor({ color: backgroundColor }).catch(() => {});
          void StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
        };

        if (!Capacitor.isPluginAvailable("SystemBars")) {
          applyLegacyAndroidStatusBar();
          if (Capacitor.isPluginAvailable("RootsStatusBar")) {
            void RootsStatusBar.setBackgroundColor({ color: backgroundColor }).catch(() => {});
          }
          return;
        }

        void SystemBars.setStyle({
          style: isDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
          bar: SystemBarType.StatusBar,
        })
          .then(() => {
            if (Capacitor.isPluginAvailable("RootsStatusBar")) {
              return RootsStatusBar.setBackgroundColor({ color: backgroundColor });
            }
          })
          .catch(() => {
            applyLegacyAndroidStatusBar();
            if (Capacitor.isPluginAvailable("RootsStatusBar")) {
              void RootsStatusBar.setBackgroundColor({ color: backgroundColor }).catch(() => {});
            }
          });
        return;
      }

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

  useEffect(() => {
    const from = previousPath.current;
    previousPath.current = pathname;
    if (!Capacitor.isNativePlatform() || from === pathname) return;

    if (Capacitor.getPlatform() === "android") {
      return restoreRoutePosition(false);
    }

    if (
      Capacitor.getPlatform() === "ios" &&
      document.documentElement.dataset.nativeFormFactor === "phone" &&
      from && AUTH_PATHS.has(from) && !AUTH_PATHS.has(pathname)
    ) {
      window.dispatchEvent(new Event("roots:native-viewport-refresh"));
      return restoreRoutePosition(true);
    }
  }, [pathname]);

  return null;
}
