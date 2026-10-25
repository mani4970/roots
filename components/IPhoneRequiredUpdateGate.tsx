"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { usePathname } from "next/navigation";
import RequiredUpdatePopup from "@/components/RequiredUpdatePopup";
import {
  detectIPhone222RequiredUpdatePopup,
  openRequiredUpdateStore,
  shouldCheckIPhone222RequiredUpdate,
  type NativeUpdatePrompt,
} from "@/lib/requiredUpdate";

const keepUpdateOpen = () => {};
const openAppStore = () => openRequiredUpdateStore("ios");

/** Home owns its existing popup queue. Other routes enforce only this campaign. */
export default function IPhoneRequiredUpdateGate() {
  const pathname = usePathname();
  const [prompt, setPrompt] = useState<NativeUpdatePrompt | null>(null);

  useEffect(() => {
    if (pathname === "/") {
      setPrompt(null);
      return;
    }

    let cancelled = false;
    let listener: { remove: () => Promise<void> } | null = null;
    const checkVersion = async () => {
      const next = await detectIPhone222RequiredUpdatePopup();
      if (!cancelled) setPrompt(next);
    };
    void checkVersion();

    if (shouldCheckIPhone222RequiredUpdate()) {
      void App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void checkVersion();
      }).then(handle => {
        if (cancelled) void handle.remove();
        else listener = handle;
      }).catch(() => {});
    }

    return () => {
      cancelled = true;
      if (listener) void listener.remove();
    };
  }, [pathname]);

  if (pathname === "/" || !prompt) return null;

  return (
    <RequiredUpdatePopup
      platform={prompt.platform}
      mandatory={true}
      campaignId={prompt.campaignId}
      onUpdate={openAppStore}
      onClose={keepUpdateOpen}
    />
  );
}
