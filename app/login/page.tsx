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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError("이메일 또는 비밀번호가 틀렸어요"); setLoading(false); return; }
    router.push("/"); router.refresh();
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="page-dark" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 24px", minHeight:"100vh" }}>
      <div style={{ textAlign:"center", marginBottom:40 }}>
        <div style={{ fontSize:56, marginBottom:16 }}>🌱</div>
        <h1 style={{ color:"white", fontSize:28, fontWeight:600 }}>Roots</h1>
        <p style={{ color:"var(--muted)", fontSize:13, marginTop:6 }}>말씀에 뿌리내리고, 함께 자라다</p>
      </div>
      <div style={{ width:"100%", maxWidth:360 }}>
        <button onClick={handleGoogle} disabled={googleLoading} style={{ width:"100%", background:"white", color:"#1A1A1A", fontSize:15, fontWeight:500, padding:"14px 16px", borderRadius:12, border:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:16, cursor:"pointer" }}>
          {googleLoading ? <Loader2 size={18} className="spin" /> : (
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          )}
          Google로 계속하기
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <div style={{ flex:1, height:1, background:"var(--dark-border)" }} />
          <span style={{ color:"var(--muted)", fontSize:12 }}>또는 이메일로</span>
          <div style={{ flex:1, height:1, background:"var(--dark-border)" }} />
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ color:"var(--muted)", fontSize:12, display:"block", marginBottom:6 }}>이메일</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com" className="input-field" />
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ color:"var(--muted)", fontSize:12, display:"block", marginBottom:6 }}>비밀번호</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className="input-field" onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
        </div>
        {error && <p style={{ color:"var(--red)", fontSize:12, textAlign:"center", marginBottom:12 }}>{error}</p>}
        <button onClick={handleLogin} disabled={loading||!email||!password} className="btn-gold">
          {loading ? <><Loader2 size={18} className="spin" />로그인 중...</> : "이메일로 로그인"}
        </button>
        <p style={{ textAlign:"center", marginTop:20, color:"var(--muted)", fontSize:14 }}>
          계정이 없으신가요? <Link href="/signup" style={{ color:"var(--gold)", fontWeight:500 }}>회원가입</Link>
        </p>
      </div>
    </div>
  );
}