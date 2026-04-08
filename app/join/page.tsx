"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

function JoinContent() {
  const router = useRouter();
  const params = useSearchParams();
  const groupId = params.get("group");
  const [group, setGroup] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!groupId) { setError("잘못된 초대 링크예요"); setLoading(false); return; }
      const supabase = createClient();
      // Supabase에서 그룹 정보 가져오기
      const { data, error } = await supabase.from("groups").select("*").eq("id", groupId).single();
      if (error || !data) {
        setError("그룹을 찾을 수 없어요");
        setLoading(false);
        return;
      }
      setGroup(data);
      // 멤버 수
      const { count } = await supabase.from("group_members")
        .select("*", { count: "exact", head: true }).eq("group_id", groupId);
      setMemberCount(count ?? 0);
      setLoading(false);
    }
    load();
  }, [groupId]);

  async function join() {
    setJoining(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?redirect=/join?group=${groupId}`);
      return;
    }
    // 이미 멤버인지 확인
    const { data: existing } = await supabase.from("group_members")
      .select("id").eq("group_id", groupId).eq("user_id", user.id).maybeSingle();
    if (!existing) {
      await supabase.from("group_members").insert({ group_id: groupId, user_id: user.id });
    }
    setJoined(true);
    setJoining(false);
    setTimeout(() => router.push("/community"), 2000);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🌱</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Roots</h1>
        <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 28 }}>말씀에 뿌리내리고, 함께 자라다</p>

        {error ? (
          <div style={{ background: "var(--bg2)", borderRadius: 20, padding: "24px", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 16, color: "var(--text3)" }}>😢 {error}</p>
            <button className="btn-sage" style={{ marginTop: 16 }} onClick={() => router.push("/")}>홈으로</button>
          </div>
        ) : joined ? (
          <div style={{ background: "var(--bg2)", borderRadius: 20, padding: "28px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--sage-dark)" }}>그룹에 참여했어요!</p>
            <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 8 }}>커뮤니티로 이동 중...</p>
          </div>
        ) : (
          <div style={{ background: "var(--bg2)", borderRadius: 20, padding: "28px", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>그룹 초대</p>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{group?.name}</h2>
            {group?.description && <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: 16 }}>{group.description}</p>}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>👥 {memberCount}명 참여 중</span>
            </div>
            <button className="btn-sage" onClick={join} disabled={joining} style={{ width: "100%" }}>
              {joining ? <Loader2 size={16} className="spin" /> : "그룹 참여하기"}
            </button>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 12 }}>Roots 앱이 없으신가요? 참여 후 가입할 수 있어요</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>}>
      <JoinContent />
    </Suspense>
  );
}
