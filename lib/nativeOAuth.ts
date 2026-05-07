import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { getOAuthRedirectTo, isCapacitorApp } from "@/lib/authRedirect";
import { storageRemove, storageSet } from "@/lib/clientStorage";
import type { Lang } from "@/lib/i18n";

type SupabaseOAuthClient = {
  auth: {
    signInWithOAuth: (credentials: {
      provider: "google";
      options?: {
        redirectTo?: string;
        skipBrowserRedirect?: boolean;
      };
    }) => Promise<{ data: { url?: string | null } | null; error: { message?: string } | null }>;
  };
};

function isNativeRuntime() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return isCapacitorApp();
  }
}

export async function signInWithGoogleOAuth(supabase: SupabaseOAuthClient, lang: Lang, nextPath?: string | null) {
  const nativeApp = isNativeRuntime();
  if (nativeApp) {
    if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
      storageSet("roots_native_oauth_next", nextPath);
    } else {
      storageRemove("roots_native_oauth_next");
    }
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Keep the native redirect URL simple so it matches the Supabase allow list.
      // The desired in-app destination is stored locally and restored in CapacitorAuthBridge.
      redirectTo: getOAuthRedirectTo(lang, nativeApp ? null : nextPath, nativeApp),
      skipBrowserRedirect: nativeApp,
    },
  });

  if (error) throw error;

  if (nativeApp && data?.url) {
    await Browser.open({ url: data.url });
  }
}
