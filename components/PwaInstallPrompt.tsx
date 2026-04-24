"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaInstallPromptProps = {
  show?: boolean;
  onClose?: () => void;
  variant?: "modal" | "inline";
  source?: "onboarding" | "routine" | "profile";
  forceShow?: boolean;
};

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isIOSDevice() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() ?? "";
  const isIPadOS = platform === "macintel" && (window.navigator as any).maxTouchPoints > 1;
  return /iphone|ipad|ipod/.test(ua) || isIPadOS;
}

export default function PwaInstallPrompt({
  show = true,
  onClose,
  variant = "modal",
  source = "profile",
  forceShow = false,
}: PwaInstallPromptProps) {
  const lang = useLang();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (show) setDismissed(false);
  }, [show]);

  useEffect(() => {
    setInstalled(isStandaloneMode());
    setIsIOS(isIOSDevice());

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem("pwa_installed", "true");
      } catch {}
      onClose?.();
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [onClose]);

  if (!show || (!forceShow && installed) || dismissed) return null;

  const isModal = variant === "modal";
  const shouldShowManualSteps = source === "profile" || showSteps || !deferredPrompt;
  const shouldShowActionButtons = source !== "profile";
  const titleKey =
    source === "routine"
      ? "pwa_after_routine_title"
      : source === "onboarding"
      ? "pwa_onboarding_title"
      : "pwa_title";
  const descKey =
    source === "routine"
      ? "pwa_after_routine_desc"
      : source === "onboarding"
      ? "pwa_onboarding_desc"
      : "pwa_desc";
  const manualTitle = isIOS ? t("pwa_ios_title", lang) : t("pwa_android_title", lang);
  const steps = isIOS
    ? [t("pwa_ios_step1", lang), t("pwa_ios_step2", lang), t("pwa_ios_step3", lang)]
    : [t("pwa_android_step1", lang), t("pwa_android_step2", lang), t("pwa_android_step3", lang)];

  function closePrompt() {
    try {
      localStorage.setItem("pwa_install_prompt_dismissed_at", String(Date.now()));
    } catch {}
    setDismissed(true);
    onClose?.();
  }

  async function handleInstallClick() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        if (choice.outcome === "accepted") {
          try {
            localStorage.setItem("pwa_installed", "true");
          } catch {}
          onClose?.();
          return;
        }
      } catch {
        // Fall through to manual steps.
      }
    }
    setShowSteps(true);
  }

  const card = (
    <div
      style={{
        width: "100%",
        maxWidth: isModal ? 420 : "100%",
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: isModal ? 24 : 18,
        padding: isModal ? 18 : 14,
        boxShadow: isModal ? "0 18px 48px rgba(0,0,0,0.28)" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: isModal ? 26 : 22, marginBottom: 6 }}>📲</div>
          <h2 style={{ fontSize: isModal ? 18 : 15, fontWeight: 800, color: "var(--text)", marginBottom: 6, lineHeight: 1.35 }}>
            {t(titleKey as any, lang)}
          </h2>
          <p style={{ fontSize: isModal ? 13 : 12, color: "var(--text3)", lineHeight: 1.6 }}>
            {t(descKey as any, lang)}
          </p>
        </div>
        {isModal && (
          <button
            onClick={closePrompt}
            aria-label={t("pwa_later", lang)}
            style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text3)", fontSize: 18, cursor: "pointer", flexShrink: 0 }}
          >
            ×
          </button>
        )}
      </div>

      {shouldShowManualSteps && (
        <div style={{ marginTop: 14, border: "1px solid var(--border)", background: "var(--bg)", borderRadius: 16, padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{manualTitle}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {steps.map((step, index) => (
              <div key={step} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--sage-light)", color: "var(--sage-dark)", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {index + 1}
                </span>
                <span style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {shouldShowActionButtons && (
        <div style={{ display: "flex", flexDirection: isModal ? "column" : "row", gap: 8, marginTop: 14 }}>
          <button
            onClick={handleInstallClick}
            className="btn-sage"
            style={{ flex: 1, minHeight: 44, fontSize: 13 }}
          >
            {deferredPrompt ? t("pwa_install_button", lang) : t("pwa_steps_button", lang)}
          </button>
          <button
            onClick={closePrompt}
            className="btn-outline"
            style={{ flex: isModal ? "unset" : 0.75, minHeight: 44, fontSize: 13 }}
          >
            {t("pwa_later", lang)}
          </button>
        </div>
      )}
    </div>
  );

  if (!isModal) return card;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 220,
        background: "rgba(26,28,30,0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {card}
    </div>
  );
}
