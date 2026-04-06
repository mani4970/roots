"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError("이메일 또는 비밀번호가 틀렸어요"); setLoading(false); return; }
    router.push("/"); router.refresh();
  }

  return (
    <div className="page-dark" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🌱</div>
        <h1 style={{ color: "white", fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>Roots</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>말씀에 뿌리내리고, 함께 자라다</p>
      </div>

      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: "var(--muted)", fontSize: 12, display: "block", marginBottom: 6 }}>이메일</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="example@email.com" className="input-field" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "var(--muted)", fontSize: 12, display: "block", marginBottom: 6 }}>비밀번호</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" className="input-field"
            onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        {error && <p style={{ color: "var(--red)", fontSize: 12, textAlign: "center", marginBottom: 12 }}>{error}</p>}
        <button onClick={handleLogin} disabled={loading || !email || !password} className="btn-gold">
          {loading ? <Loader2 size={18} className="spin" /> : "로그인"}
        </button>
        <p style={{ textAlign: "center", marginTop: 20, color: "var(--muted)", fontSize: 14 }}>
          계정이 없으신가요?{" "}
          <Link href="/signup" style={{ color: "var(--gold)", fontWeight: 500 }}>회원가입</Link>
        </p>
      </div>
    </div>
  );
}
