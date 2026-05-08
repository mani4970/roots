"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase";
import { storageGet, storageRemove, storageSet } from "@/lib/clientStorage";
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

function getSafeNext(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default function CapacitorAuthBridge() {
  const router = useRouter();
  const handledUrls = useRef(new Set<string>());
  const handlingRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    let listener: { remove: () => Promise<void> } | undefined;

    async function handleOpenUrl(rawUrl: string) {
      if (!rawUrl || !isRootsAuthCallback(rawUrl)) return;

      const params = getSearchParams(rawUrl);
      const lang = normalizeLang(params.get("lang") || storageGet("roots_lang"));
      const code = params.get("code");
      const next = getSafeNext(params.get("next") || storageGet("roots_native_oauth_next"));
      const error = params.get("error") || params.get("error_description");
      const handledCodeKey = code ? `roots_native_oauth_code_${code}` : "";

      storageSet("roots_lang", lang);
      storageSet("roots_lang_selected", "true");

      try {
        await Browser.close();
      } catch {}

      const supabase = createClient();

      if (error || !code) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace(next);
          router.refresh();
        } else {
          router.replace(`/login?lang=${encodeURIComponent(lang)}`);
        }
        return;
      }

      if (handledUrls.current.has(rawUrl) || handlingRef.current || (handledCodeKey && storageGet(handledCodeKey))) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          storageRemove("roots_native_oauth_next");
          const separator = next.includes("?") ? "&" : "?";
          router.replace(`${next}${separator}lang=${encodeURIComponent(lang)}`);
          router.refresh();
        }
        return;
      }

      handledUrls.current.add(rawUrl);
      handlingRef.current = true;

      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.warn("Capacitor OAuth callback was already handled; keeping existing session.");
          } else {
            console.error("Capacitor OAuth session exchange failed", exchangeError.message);
            router.replace(`/login?lang=${encodeURIComponent(lang)}`);
            return;
          }
        }

        if (handledCodeKey) storageSet(handledCodeKey, String(Date.now()));
        storageRemove("roots_native_oauth_next");

        const separator = next.includes("?") ? "&" : "?";
        router.replace(`${next}${separator}lang=${encodeURIComponent(lang)}`);
        router.refresh();
      } finally {
        handlingRef.current = false;
      }
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
