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
    return (
      url.protocol === "roots:" &&
      url.host === "auth" &&
      url.pathname === "/callback"
    );
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

function debugOAuth(message: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    console.info(`[Roots OAuth] ${message}`, details ?? "");
    return;
  }
  console.info(`[Roots OAuth] ${message}`, details ?? "");
}

function maskCallbackUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const params = url.searchParams;
    const code = params.get("code");
    if (code) params.set("code", `${code.slice(0, 6)}…(${code.length})`);
    return `${url.protocol}//${url.host}${url.pathname}?${params.toString()}`;
  } catch {
    return rawUrl.includes("code=")
      ? rawUrl.replace(
          /code=([^&]+)/,
          (_match, code: string) => `code=${code.slice(0, 6)}…(${code.length})`,
        )
      : rawUrl;
  }
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

      debugOAuth("callback received", {
        platform: Capacitor.getPlatform(),
        url: maskCallbackUrl(rawUrl),
      });

      const params = getSearchParams(rawUrl);
      const lang = normalizeLang(
        params.get("lang") || storageGet("roots_lang"),
      );
      const code = params.get("code");
      const next = getSafeNext(
        params.get("next") || storageGet("roots_native_oauth_next"),
      );
      const error = params.get("error") || params.get("error_description");
      const handledCodeKey = code ? `roots_native_oauth_code_${code}` : "";

      debugOAuth("callback params", {
        hasCode: Boolean(code),
        codeLength: code?.length ?? 0,
        hasError: Boolean(error),
        error,
        next,
        lang,
        duplicateUrl: handledUrls.current.has(rawUrl),
        isHandling: handlingRef.current,
        handledCodeStored: Boolean(
          handledCodeKey && storageGet(handledCodeKey),
        ),
      });

      storageSet("roots_lang", lang);
      storageSet("roots_lang_selected", "true");

      try {
        await Browser.close();
        debugOAuth("browser close requested");
      } catch (closeError) {
        debugOAuth("browser close failed", {
          message:
            closeError instanceof Error
              ? closeError.message
              : String(closeError),
        });
      }

      const supabase = createClient();

      if (error || !code) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        debugOAuth("callback missing code or has provider error", {
          hasSession: Boolean(session),
          error,
        });
        if (session) {
          router.replace(next);
          router.refresh();
        } else {
          router.replace(`/login?lang=${encodeURIComponent(lang)}`);
        }
        return;
      }

      if (
        handledUrls.current.has(rawUrl) ||
        handlingRef.current ||
        (handledCodeKey && storageGet(handledCodeKey))
      ) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        debugOAuth("duplicate callback skipped", {
          hasSession: Boolean(session),
          next,
        });
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
        const { data: beforeExchange } = await supabase.auth.getSession();
        debugOAuth("before exchange", {
          hasSession: Boolean(beforeExchange.session),
        });

        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        debugOAuth("exchange completed", {
          hasError: Boolean(exchangeError),
          errorMessage: exchangeError?.message,
          errorName: exchangeError?.name,
          errorStatus:
            "status" in (exchangeError ?? {})
              ? (exchangeError as { status?: number }).status
              : undefined,
        });
        if (exchangeError) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          debugOAuth("after failed exchange session check", {
            hasSession: Boolean(session),
          });
          if (session) {
            console.warn(
              "Capacitor OAuth callback was already handled; keeping existing session.",
            );
          } else {
            console.error(
              "Capacitor OAuth session exchange failed",
              exchangeError.message,
            );
            router.replace(`/login?lang=${encodeURIComponent(lang)}`);
            return;
          }
        }

        if (handledCodeKey) storageSet(handledCodeKey, String(Date.now()));
        storageRemove("roots_native_oauth_next");

        const { data: afterExchange } = await supabase.auth.getSession();
        debugOAuth("after exchange", {
          hasSession: Boolean(afterExchange.session),
          next,
        });

        const separator = next.includes("?") ? "&" : "?";
        debugOAuth("routing after callback", {
          href: `${next}${separator}lang=${encodeURIComponent(lang)}`,
        });
        router.replace(`${next}${separator}lang=${encodeURIComponent(lang)}`);
        router.refresh();
      } finally {
        handlingRef.current = false;
      }
    }

    App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      debugOAuth("appUrlOpen event", { url: maskCallbackUrl(event.url) });
      void handleOpenUrl(event.url);
    }).then((handle) => {
      if (!active) {
        void handle.remove();
        return;
      }
      listener = handle;
    });

    App.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) {
        debugOAuth("launch url found", { url: maskCallbackUrl(launchUrl.url) });
        void handleOpenUrl(launchUrl.url);
      } else {
        debugOAuth("launch url empty");
      }
    });

    return () => {
      active = false;
      if (listener) void listener.remove();
    };
  }, [router]);

  return null;
}
