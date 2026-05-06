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
  const [gLoading, setGLoading] = useState(false);
  const [showBrowserGuide, setShowBrowserGuide] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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
    const d: Record<Lang, number> = { ko: 92, de: 97, en: 80, fr: 26 };
    storageSet("roots_default_translation", String(d[lang] ?? 92));
    try {
      await signInWithGoogleOAuth(supabase, lang, getSafeRedirectFromLocation());
    } catch (error) {
      console.error("Google signup failed", error);
      setError(t("signup_error", lang));
      setGLoading(false);
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
    const defaultTr: Record<Lang, number> = { ko: 92, de: 97, en: 80, fr: 26 };
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
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "56px 24px 40px", position: "relative" }}>

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
      <Link href={withRedirect("/welcome")} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text3)", marginBottom: 32, position: "absolute", top: 20, left: 20 }}>
        <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{t("signup_back", lang)}</span>
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

      {/* 구글 가입 */}
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
