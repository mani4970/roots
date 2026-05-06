"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase";
import { storageSet } from "@/lib/clientStorage";
import type { Lang } from "@/lib/i18n";

const SUPPORTED_LANGS = new Set<Lang>(["ko", "de", "en", "fr"]);

function normalizeLang(value: string | null): Lang {
  return SUPPORTED_LANGS.has(value as Lang) ? (value as Lang) : "ko";
}

function isRootsAuthCallback(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "roots:" && url.host === "auth" && url.pathname === "/callback";
  } catch {
    return rawUrl.startsWith("roots://auth/callback");
  }
}

function getSearchParams(rawUrl: string) {
  try {
    return new URL(rawUrl).searchParams;
  } catch {
    const query = rawUrl.split("?")[1] ?? "";
    return new URLSearchParams(query);
  }
}

export default function CapacitorAuthBridge() {
  const router = useRouter();
  const handledUrls = useRef(new Set<string>());

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    let listener: { remove: () => Promise<void> } | undefined;

    async function handleOpenUrl(rawUrl: string) {
      if (!rawUrl || handledUrls.current.has(rawUrl) || !isRootsAuthCallback(rawUrl)) return;
      handledUrls.current.add(rawUrl);

      const params = getSearchParams(rawUrl);
      const lang = normalizeLang(params.get("lang"));
      const code = params.get("code");
      const error = params.get("error") || params.get("error_description");

      storageSet("roots_lang", lang);
      storageSet("roots_lang_selected", "true");

      try {
        await Browser.close();
      } catch {}

      if (error || !code) {
        router.replace(`/login?lang=${encodeURIComponent(lang)}`);
        return;
      }

      const supabase = createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error("Capacitor OAuth session exchange failed", exchangeError.message);
        router.replace(`/login?lang=${encodeURIComponent(lang)}`);
        return;
      }

      router.replace(`/?lang=${encodeURIComponent(lang)}`);
      router.refresh();
    }

    App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      void handleOpenUrl(event.url);
    }).then((handle) => {
      if (!active) {
        void handle.remove();
        return;
      }
      listener = handle;
    });

    App.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) void handleOpenUrl(launchUrl.url);
    });

    return () => {
      active = false;
      if (listener) void listener.remove();
    };
  }, [router]);

  return null;
}
