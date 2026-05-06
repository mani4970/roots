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
import { signInWithGoogleOAuth } from "@/lib/nativeOAuth";
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
  const [gLoading, setGLoading] = useState(false);
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
    const defaultTr: Record<Lang, number> = { ko: 92, de: 97, en: 80, fr: 26 };
    const trId = defaultTr[lang] ?? 92;
    storageSet("roots_default_translation", String(trId));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ preferred_translation: trId, preferred_language: lang }).eq("id", user.id);
    }
    router.push(getSafeRedirectFromLocation()); router.refresh();
  }

  async function handleGoogle() {
    if (isInAppBrowser()) {
      setShowBrowserGuide(true);
      setLinkCopied(false);
      return;
    }
    setGLoading(true);
    const supabase = createClient();
    storageSet("roots_lang", lang);
    storageSet("roots_lang_selected", "true");
    const defaultTr: Record<Lang, number> = { ko: 92, de: 97, en: 80, fr: 26 };
    storageSet("roots_default_translation", String(defaultTr[lang] ?? 92));
    try {
      await signInWithGoogleOAuth(supabase, lang, getSafeRedirectFromLocation());
    } catch (error) {
      console.error("Google login failed", error);
      setError(t("login_error", lang));
      setGLoading(false);
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
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", position: "relative" }}>

      {showBrowserGuide && (
        <div onClick={() => setShowBrowserGuide(false)} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(26,28,30,0.66)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 24, padding: "22px 20px 18px", boxShadow: "0 18px 48px rgba(0,0,0,0.28)", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🌿</div>
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
      <Link href={withRedirect("/welcome")} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text3)", marginBottom: 24, position: "absolute", top: 20, left: 20 }}>
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
        <button onClick={handleGoogle} disabled={gLoading} style={{ width: "100%", background: "var(--bg2)", color: "var(--text)", fontSize: 14, fontWeight: 500, padding: "14px 16px", borderRadius: 16, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16, cursor: "pointer" }}>
          {gLoading ? <Loader2 size={18} className="spin" /> : (
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          )}
          {t("login_google_btn", lang)}
        </button>

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
