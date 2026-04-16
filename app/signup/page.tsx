"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";
import { Loader2, ChevronLeft } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const lang = useLang();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup() {
    if (!nickname || !email || !password) return;
    if (password.length < 6) { setError(t("signup_pw_error", lang)); return; }
    setLoading(true); setError("");
    const supabase = createClient();
    // 언어 설정도 함께 저장
    const preferredLang = typeof window !== "undefined" ? localStorage.getItem("roots_lang") : null;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: nickname, preferred_language: preferredLang ?? "ko" } },
    });
    if (error) { setError(t("signup_error", lang)); setLoading(false); return; }
    router.push("/"); router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "56px 24px 40px" }}>
      <Link href="/login" style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text3)", marginBottom: 32 }}>
        <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{t("signup_back", lang)}</span>
      </Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{t("signup_title", lang)}</h1>
      <p style={{ color: "var(--text3)", fontSize: 13, marginBottom: 32 }}>{t("signup_sub", lang)}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ color: "var(--text3)", fontSize: 12, display: "block", marginBottom: 6 }}>{t("signup_nickname", lang)}</label>
          <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder={t("signup_nickname_ph", lang)} className="input-field" />
        </div>
        <div>
          <label style={{ color: "var(--text3)", fontSize: 12, display: "block", marginBottom: 6 }}>{t("login_email_label", lang)}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" className="input-field" />
        </div>
        <div>
          <label style={{ color: "var(--text3)", fontSize: 12, display: "block", marginBottom: 6 }}>{t("signup_password", lang)}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input-field" />
        </div>
        {error && <p style={{ color: "#E05050", fontSize: 12 }}>{error}</p>}
        <button onClick={handleSignup} disabled={loading || !nickname || !email || !password} className="btn-primary" style={{ marginTop: 8 }}>
          {loading ? <><Loader2 size={18} className="spin" />{t("signup_loading", lang)}</> : t("signup_btn", lang)}
        </button>
      </div>
    </div>
  );
}
