"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { setPreferredLang, useLang } from "@/lib/useLang";
import { t, type Lang } from "@/lib/i18n";
import LanguagePicker from "@/components/LanguagePicker";
import AuthLanguageSwitcher from "@/components/AuthLanguageSwitcher";
import { Loader2, ChevronLeft } from "lucide-react";
import { storageGet, storageSet } from "@/lib/clientStorage";
import { signInWithOAuthProvider } from "@/lib/nativeOAuth";
import AuthOAuthButtons, { type AuthOAuthProvider } from "@/components/AuthOAuthButtons";
import { isCapacitorApp } from "@/lib/authRedirect";
import { copyCurrentPageUrl, inAppBrowserText, isInAppBrowser, openCurrentPageInNewWindow } from "@/lib/inAppBrowser";

function getSafeRedirectFromLocation() {
  if (typeof window === "undefined") return "/";
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) return "/";
  return redirect;
}

function withRedirect(path: string) {
  const redirect = getSafeRedirectFromLocation();
  if (redirect === "/") return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}redirect=${encodeURIComponent(redirect)}`;
}

export default function LoginPage() {
  const router = useRouter();
  const detectedLang = useLang();
  const [selectedLang, setSelectedLang] = useState<Lang | null>(null);
  const lang = selectedLang ?? detectedLang;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<AuthOAuthProvider | null>(null);
  const [error, setError] = useState("");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showBrowserGuide, setShowBrowserGuide] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!storageGet("roots_lang_selected")) {
      setShowLangPicker(true);
    }
  }, []);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(t("login_error", lang)); setLoading(false); return; }
    await setPreferredLang(lang);
    // preferred_translation도 갱신
    const defaultTr: Record<Lang, number> = { ko: 92, de: 29, en: 80, fr: 26 };
    const trId = defaultTr[lang] ?? 92;
    storageSet("roots_default_translation", String(trId));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ preferred_translation: trId, preferred_language: lang }).eq("id", user.id);
    }
    router.push(getSafeRedirectFromLocation()); router.refresh();
  }

  async function handleOAuth(provider: AuthOAuthProvider) {
    if (!isCapacitorApp() && isInAppBrowser()) {
      setShowBrowserGuide(true);
      setLinkCopied(false);
      return;
    }
    setOauthLoading(provider);
    setError("");
    const supabase = createClient();
    storageSet("roots_lang", lang);
    storageSet("roots_lang_selected", "true");
    const defaultTr: Record<Lang, number> = { ko: 92, de: 29, en: 80, fr: 26 };
    storageSet("roots_default_translation", String(defaultTr[lang] ?? 92));
    try {
      await signInWithOAuthProvider(supabase, provider, lang, getSafeRedirectFromLocation());
    } catch (error) {
      console.error(`${provider} login failed`, error);
      setError(t("login_error", lang));
      setOauthLoading(null);
    }
  }


  const browserGuide = inAppBrowserText(lang);

  async function handleCopyLink() {
    const copied = await copyCurrentPageUrl();
    if (copied) setLinkCopied(true);
  }

  if (showLangPicker) {
    return <LanguagePicker initialLang={lang} onSelect={(nextLang) => { setSelectedLang(nextLang); setShowLangPicker(false); }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "72px 24px 40px", position: "relative" }}>

      {showBrowserGuide && (
        <div onClick={() => setShowBrowserGuide(false)} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(26,28,30,0.66)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 24, padding: "22px 20px 18px", boxShadow: "0 18px 48px rgba(0,0,0,0.28)", textAlign: "center" }}>
            <div style={{ width: 46, height: 46, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/roots-logo-transparent-96.png" alt="Roots" width={42} height={42} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>{browserGuide.title}</h3>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text2)", marginBottom: 10 }}>{browserGuide.body}</p>
            <p style={{ fontSize: 12, lineHeight: 1.55, color: "var(--text3)", marginBottom: 16 }}>{browserGuide.hint}</p>
            <button onClick={async () => { openCurrentPageInNewWindow(); await handleCopyLink(); }} className="btn-primary" style={{ marginBottom: 10 }}>{browserGuide.open}</button>
            <button onClick={handleCopyLink} style={{ width: "100%", padding: "12px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text)", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
              {linkCopied ? browserGuide.copied : browserGuide.copy}
            </button>
            <button onClick={() => setShowBrowserGuide(false)} style={{ border: "none", background: "transparent", color: "var(--text3)", fontSize: 13, fontWeight: 700, padding: 8 }}>
              {browserGuide.close}
            </button>
          </div>
        </div>
      )}
      <AuthLanguageSwitcher value={lang} onChange={setSelectedLang} ariaLabel={t("auth_language_aria", lang)} />
      <Link href={withRedirect("/welcome")} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text3)", marginBottom: 24, position: "absolute", top: 22, left: 22 }}>
        <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{t("back", lang)}</span>
      </Link>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
<img
          src="/roots-logo-transparent-160.png"
          alt={t("auth_logo_alt", lang)}
          width={72}
          height={72}
          style={{ objectFit: "contain", marginBottom: 14 }}
        />
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px", marginBottom: 6 }}>{t("login_title", lang)}</h1>
        <p style={{ color: "var(--text3)", fontSize: 13 }}>{t("login_sub", lang)}</p>
      </div>

      <div style={{ width: "100%", maxWidth: 360 }}>
        <AuthOAuthButtons
          googleLabel={t("login_google_btn", lang)}
          appleLabel={t("login_apple_btn", lang)}
          loadingProvider={oauthLoading}
          onProviderClick={handleOAuth}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ color: "var(--text3)", fontSize: 12 }}>{t("login_or_email", lang)}</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ color: "var(--text3)", fontSize: 12, display: "block", marginBottom: 6 }}>{t("login_email_label", lang)}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t("auth_email_placeholder", lang)} className="input-field" style={{ fontSize: 16 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "var(--text3)", fontSize: 12, display: "block", marginBottom: 6 }}>{t("login_password_label", lang)}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t("auth_password_placeholder", lang)} className="input-field" style={{ fontSize: 16 }} onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>

        {error && <p style={{ color: "#E05050", fontSize: 12, textAlign: "center", marginBottom: 12 }}>{error}</p>}

        <button onClick={handleLogin} disabled={loading || !email || !password} className="btn-primary">
          {loading ? <><Loader2 size={18} className="spin" />{t("login_loading", lang)}</> : t("login_btn", lang)}
        </button>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <p style={{ color: "var(--text3)", fontSize: 12, marginBottom: 8 }}>{t("login_signup_prompt", lang)}</p>
          <button onClick={() => router.push(withRedirect("/signup"))} style={{ width: "100%", padding: "12px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 14, fontWeight: 700 }}>
            {t("login_signup_btn", lang)}
          </button>
        </div>

      </div>
    </div>
  );
}
