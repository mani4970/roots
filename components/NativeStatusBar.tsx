"use client";

import { useEffect } from "react";
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

interface RootsStatusBarPlugin {
  setBackgroundColor(options: { color: string }): Promise<void>;
}

const RootsStatusBar = registerPlugin<RootsStatusBarPlugin>("RootsStatusBar");

export default function NativeStatusBar() {
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

  return null;
}
