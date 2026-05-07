"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";

export default function NativeStatusBar() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    document.documentElement.setAttribute("data-native-app", "true");

    void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    void StatusBar.setBackgroundColor({ color: "#F8F4EC" }).catch(() => {});
  }, []);

  return null;
}
