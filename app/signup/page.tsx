"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { setPreferredLang, useLang } from "@/lib/useLang";
import { t, type Lang } from "@/lib/i18n";
import { Loader2, ChevronLeft } from "lucide-react";
import AuthLanguageSwitcher from "@/components/AuthLanguageSwitcher";
import { storageSet } from "@/lib/clientStorage";
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

export default function SignupPage() {
  const router = useRouter();
  const detectedLang = useLang();
  const [selectedLang, setSelectedLang] = useState<Lang | null>(null);
  const lang = selectedLang ?? detectedLang;
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [oauthLoading, setOauthLoading] = useState<AuthOAuthProvider | null>(null);
  const [showBrowserGuide, setShowBrowserGuide] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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
    const d: Record<Lang, number> = { ko: 92, de: 29, en: 80, fr: 26 };
    storageSet("roots_default_translation", String(d[lang] ?? 92));
    try {
      await signInWithOAuthProvider(supabase, provider, lang, getSafeRedirectFromLocation());
    } catch (error) {
      console.error(`${provider} signup failed`, error);
      setError(t("signup_error", lang));
      setOauthLoading(null);
    }
  }


  const browserGuide = inAppBrowserText(lang);

  async function handleCopyLink() {
    const copied = await copyCurrentPageUrl();
    if (copied) setLinkCopied(true);
  }

  async function handleSignup() {
    if (!nickname || !email || !password) return;
    if (password.length < 6) { setError(t("signup_pw_error", lang)); return; }
    setLoading(true); setError("");
    const supabase = createClient();
    // 언어 설정도 함께 저장
    storageSet("roots_lang", lang);
    storageSet("roots_lang_selected", "true");
    const defaultTr: Record<Lang, number> = { ko: 92, de: 29, en: 80, fr: 26 };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: nickname, preferred_language: lang, preferred_translation: defaultTr[lang] ?? 92 } },
    });
    if (error) { setError(t("signup_error", lang)); setLoading(false); return; }
    if (data.user) {
      await setPreferredLang(lang);
      // profiles 테이블에 직접 preferred_translation 저장
      await supabase.from("profiles").update({
        preferred_translation: defaultTr[lang] ?? 92,
        preferred_language: lang,
      }).eq("id", data.user.id);
    }
    router.push(getSafeRedirectFromLocation()); router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "72px 24px 40px", position: "relative" }}>

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
      <Link href={withRedirect("/welcome")} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text3)", marginBottom: 32, position: "absolute", top: 22, left: 22 }}>
        <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{t("back", lang)}</span>
      </Link>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <img
          src="/roots-logo-transparent-160.png"
          alt={t("auth_logo_alt", lang)}
          width={76}
          height={76}
          style={{ objectFit: "contain", marginBottom: 10 }}
        />
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{t("signup_title", lang)}</h1>
        <p style={{ color: "var(--text3)", fontSize: 13 }}>{t("signup_sub", lang)}</p>
      </div>

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

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ color: "var(--text3)", fontSize: 12, display: "block", marginBottom: 6 }}>{t("signup_nickname", lang)}</label>
          <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder={t("signup_nickname_ph", lang)} className="input-field" />
        </div>
        <div>
          <label style={{ color: "var(--text3)", fontSize: 12, display: "block", marginBottom: 6 }}>{t("login_email_label", lang)}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t("auth_email_placeholder", lang)} className="input-field" />
        </div>
        <div>
          <label style={{ color: "var(--text3)", fontSize: 12, display: "block", marginBottom: 6 }}>{t("signup_password", lang)}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t("auth_password_placeholder", lang)} className="input-field" />
        </div>
        {error && <p style={{ color: "#E05050", fontSize: 12 }}>{error}</p>}
        <button onClick={handleSignup} disabled={loading || !nickname || !email || !password} className="btn-primary" style={{ marginTop: 8 }}>
          {loading ? <><Loader2 size={18} className="spin" />{t("signup_loading", lang)}</> : t("signup_btn", lang)}
        </button>
        <nav aria-label={t("profile_legal_links_aria", lang)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 2 }}>
          <Link href="/terms" style={{ color: "var(--text3)", fontSize: 10.5, fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 2 }}>
            {t("profile_terms", lang)}
          </Link>
          <span aria-hidden="true" style={{ color: "var(--border)", fontSize: 10 }}>·</span>
          <Link href="/privacy" style={{ color: "var(--text3)", fontSize: 10.5, fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 2 }}>
            {t("profile_privacy", lang)}
          </Link>
        </nav>
        <div style={{ marginTop: 14, textAlign: "center" }}>
          <p style={{ color: "var(--text3)", fontSize: 12, marginBottom: 8 }}>{t("signup_login_prompt", lang)}</p>
          <button onClick={() => router.push(withRedirect("/login"))} style={{ width: "100%", padding: "12px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 14, fontWeight: 700 }}>
            {t("signup_login_btn", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
