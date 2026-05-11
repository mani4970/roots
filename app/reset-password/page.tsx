"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";

export default function ResetPasswordPage() {
  const router = useRouter();
  const lang = useLang();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function prepareSession() {
      const supabase = createClient();
      try {
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          window.history.replaceState(null, "", "/reset-password");
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        setHasSession(Boolean(session));
        if (!session) setError(t("reset_password_session_error", lang));
      } catch (e) {
        if (!active) return;
        setHasSession(false);
        setError(t("reset_password_session_error", lang));
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    void prepareSession();
    return () => { active = false; };
  }, [lang]);

  async function updatePassword() {
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError(t("reset_password_short", lang));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("reset_password_mismatch", lang));
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      setPassword("");
      setConfirmPassword("");
      setHasSession(false);
      setMessage(t("reset_password_success", lang));
      window.setTimeout(() => router.replace(`/login?lang=${encodeURIComponent(lang)}`), 1400);
    } catch (e) {
      setError(t("reset_password_fail", lang));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "72px 24px 40px", position: "relative" }}>
      <Link href="/login" style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text3)", marginBottom: 24, position: "absolute", top: 22, left: 22 }}>
        <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{t("reset_password_back_login", lang)}</span>
      </Link>

      <div style={{ textAlign: "center", marginBottom: 34 }}>
        <img src="/roots-logo-transparent-160.png" alt={t("auth_logo_alt", lang)} width={72} height={72} style={{ objectFit: "contain", marginBottom: 14 }} />
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px", marginBottom: 6 }}>{t("reset_password_title", lang)}</h1>
        <p style={{ color: "var(--text3)", fontSize: 13 }}>{t("reset_password_sub", lang)}</p>
      </div>

      <div style={{ width: "100%", maxWidth: 360 }}>
        {checkingSession ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32, color: "var(--text3)" }}>
            <Loader2 size={22} className="spin" />
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 10 }}>
              <label style={{ color: "var(--text3)", fontSize: 12, display: "block", marginBottom: 6 }}>{t("reset_password_new_label", lang)}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t("auth_password_placeholder", lang)} className="input-field" style={{ fontSize: 16 }} disabled={!hasSession || saving} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "var(--text3)", fontSize: 12, display: "block", marginBottom: 6 }}>{t("reset_password_confirm_label", lang)}</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t("auth_password_placeholder", lang)} className="input-field" style={{ fontSize: 16 }} disabled={!hasSession || saving} onKeyDown={e => e.key === "Enter" && hasSession && updatePassword()} />
            </div>

            {error && <p style={{ color: "#E05050", fontSize: 12, textAlign: "center", lineHeight: 1.55, marginBottom: 12 }}>{error}</p>}
            {message && <p style={{ color: "var(--green)", fontSize: 12, textAlign: "center", lineHeight: 1.55, marginBottom: 12 }}>{message}</p>}

            <button onClick={updatePassword} disabled={saving || !hasSession || !password || !confirmPassword} className="btn-primary">
              {saving ? <><Loader2 size={18} className="spin" />{t("reset_password_btn", lang)}</> : t("reset_password_btn", lang)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
