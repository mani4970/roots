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
    if (error) { setError("회원가입에 실패했어요. 다시 시도해주세요."); setLoading(false); return; }
    router.push("/"); router.refresh();
  }

  return (
    <div className="page-dark" style={{ padding: "0 24px", paddingTop: 60, paddingBottom: 40 }}>
      <Link href="/login" style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--muted)", marginBottom: 32 }}>
        <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>로그인으로</span>
      </Link>
      <h1 style={{ color: "white", fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Roots 시작하기</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 32 }}>오늘부터 말씀에 뿌리내려요 🌱</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ color: "var(--muted)", fontSize: 12, display: "block", marginBottom: 6 }}>이름</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" className="input-field" />
        </div>
        <div>
          <label style={{ color: "var(--muted)", fontSize: 12, display: "block", marginBottom: 6 }}>이메일</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" className="input-field" />
        </div>
        <div>
          <label style={{ color: "var(--muted)", fontSize: 12, display: "block", marginBottom: 6 }}>비밀번호 (6자 이상)</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input-field" />
        </div>
        {error && <p style={{ color: "var(--red)", fontSize: 12, textAlign: "center" }}>{error}</p>}
        <button onClick={handleSignup} disabled={loading || !name || !email || !password} className="btn-gold" style={{ marginTop: 8 }}>
          {loading ? <><Loader2 size={18} className="spin" />가입 중...</> : "시작하기"}
        </button>
      </div>
    </div>
  );
}
