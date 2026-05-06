import { Browser } from "@capacitor/browser";
import { getOAuthRedirectTo, isCapacitorApp } from "@/lib/authRedirect";
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

export async function signInWithGoogleOAuth(supabase: SupabaseOAuthClient, lang: Lang, nextPath?: string | null) {
  const nativeApp = isCapacitorApp();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getOAuthRedirectTo(lang, nextPath),
      skipBrowserRedirect: nativeApp,
    },
  });

  if (error) throw error;

  if (nativeApp && data?.url) {
    await Browser.open({ url: data.url });
  }
}
