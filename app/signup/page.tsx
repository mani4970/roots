"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Loader2, ChevronLeft } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup() {
    if (!name || !email || !password) return;
    if (password.length < 6) { setError("비밀번호는 6자 이상이어야 해요"); return; }
    setLoading(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) { setError("회원가입에 실패했어요."); setLoading(false); return; }
    router.push("/"); router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "56px 24px 40px" }}>
      <Link href="/login" style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text3)", marginBottom: 32 }}>
        <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>로그인으로</span>
      </Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", fontFamily: "'Fraunces', serif", marginBottom: 6 }}>시작하기</h1>
      <p style={{ color: "var(--text3)", fontSize: 13, marginBottom: 32 }}>오늘부터 말씀에 뿌리내려요 🌱</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ color: "var(--text3)", fontSize: 12, display: "block", marginBottom: 6 }}>이름</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" className="input-field" />
        </div>
        <div>
          <label style={{ color: "var(--text3)", fontSize: 12, display: "block", marginBottom: 6 }}>이메일</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" className="input-field" />
        </div>
        <div>
          <label style={{ color: "var(--text3)", fontSize: 12, display: "block", marginBottom: 6 }}>비밀번호 (6자 이상)</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input-field" />
        </div>
        {error && <p style={{ color: "#E05050", fontSize: 12 }}>{error}</p>}
        <button onClick={handleSignup} disabled={loading || !name || !email || !password} className="btn-primary" style={{ marginTop: 8 }}>
          {loading ? <><Loader2 size={18} className="spin" />가입 중...</> : "시작하기"}
        </button>
      </div>
    </div>
  );
}
