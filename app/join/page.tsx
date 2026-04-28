"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";
import { Loader2 } from "lucide-react";

function JoinContent() {
  const router = useRouter();
  const lang = useLang();
  const params = useSearchParams();
  const groupId = params.get("group");
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      if (!groupId) { setNotFound(true); setLoading(false); return; }
      const supabase = createClient();

      async function loadWithExistingPolicies() {
        // 공개 그룹이면 로그인 없이 조회 가능
        const { data: pub } = await supabase.from("groups")
          .select("*").eq("id", groupId).eq("is_public", true).maybeSingle();
        if (pub) {
          setGroupName(pub.name);
          setGroupDesc(pub.description ?? "");
          setIsPublic(true);
          const { count } = await supabase.from("group_members")
            .select("*", { count: "exact", head: true }).eq("group_id", groupId);
          setMemberCount(count ?? 0);
          return;
        }

        // 비공개 그룹: 로그인 여부 확인
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // 비로그인 → 그룹 이름 없이 로그인 유도
          setGroupName(lang === "de" ? "Private Gruppe" : lang === "fr" ? "Private group" : lang === "en" ? "Private group" : "비공개 그룹");
          setIsPublic(false);
          return;
        }

        // 로그인됨 → 비공개 그룹 조회 시도
        const { data: priv } = await supabase.from("groups")
          .select("*").eq("id", groupId).maybeSingle();
        if (priv) {
          setGroupName(priv.name);
          setGroupDesc(priv.description ?? "");
          setIsPublic(false);
          const { count } = await supabase.from("group_members")
            .select("*", { count: "exact", head: true }).eq("group_id", groupId);
          setMemberCount(count ?? 0);
        } else {
          setNotFound(true);
        }
      }

      const { data: invite, error: inviteError } = await supabase
        .rpc("get_group_invite", { p_group_id: groupId })
        .maybeSingle();

      if (!inviteError && invite) {
        setGroupName(invite.name);
        setGroupDesc(invite.description ?? "");
        setIsPublic(invite.is_public);
        setMemberCount(invite.member_count ?? 0);
        setLoading(false);
        return;
      }

      if (!inviteError) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setGroupName(lang === "de" ? "Private Gruppe" : lang === "fr" ? "Private group" : lang === "en" ? "Private group" : "비공개 그룹");
          setIsPublic(false);
        } else {
          setNotFound(true);
        }
        setLoading(false);
        return;
      }

      // SQL 패치 적용 전 배포되어도 기존 초대 링크 흐름이 깨지지 않도록 fallback 유지
      await loadWithExistingPolicies();
      setLoading(false);
    }
    load();
  }, [groupId, lang]);

  async function join() {
    setJoining(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?redirect=/join?group=${groupId}`);
      return;
    }
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
        <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 28 }}>{lang === "de" ? "Im Wort verwurzelt, gemeinsam wachsen" : lang === "fr" ? "Rooted in the Word, growing together" : lang === "en" ? "Rooted in the Word, growing together" : "말씀에 뿌리내리고, 함께 자라다"}</p>

        {notFound ? (
          <div style={{ background: "var(--bg2)", borderRadius: 20, padding: "24px", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 16, color: "var(--text3)" }}>{lang === "de" ? "😢 Gruppe nicht gefunden" : lang === "fr" ? "😢 Group not found" : lang === "en" ? "😢 Group not found" : "😢 그룹을 찾을 수 없어요"}</p>
            <button className="btn-sage" style={{ marginTop: 16 }} onClick={() => router.push("/")}>{lang === "de" ? "Zur Startseite" : lang === "fr" ? "Go home" : lang === "en" ? "Go home" : "홈으로"}</button>
          </div>
        ) : joined ? (
          <div style={{ background: "var(--bg2)", borderRadius: 20, padding: "28px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--sage-dark)" }}>{lang === "de" ? "Sie sind der Gruppe beigetreten!" : lang === "fr" ? "You joined the group!" : lang === "en" ? "You joined the group!" : "그룹에 참여했어요!"}</p>
            <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 8 }}>{lang === "de" ? "Weiter zur Community..." : lang === "fr" ? "Moving to Community..." : lang === "en" ? "Moving to Community..." : "커뮤니티로 이동 중..."}</p>
          </div>
        ) : (
          <div style={{ background: "var(--bg2)", borderRadius: 20, padding: "28px", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
              {isPublic ? (lang === "de" ? "Gruppeneinladung" : lang === "fr" ? "Group invitation" : lang === "en" ? "Group invitation" : "그룹 초대") : (lang === "de" ? "🔒 Private Gruppeneinladung" : lang === "fr" ? "🔒 Private group invitation" : lang === "en" ? "🔒 Private group invitation" : "🔒 비공개 그룹 초대")}
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{groupName}</h2>
            {groupDesc && <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: 16 }}>{groupDesc}</p>}
            {memberCount > 0 && (
              <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 20 }}>👥 {lang === "de" ? `${memberCount} Mitglieder dabei` : lang === "fr" ? `${memberCount} members joined` : lang === "en" ? `${memberCount} members joined` : `${memberCount}명 참여 중`}</p>
            )}
            {!isPublic && (
              <div style={{ background: "var(--terra-light)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, border: "1px solid rgba(196,149,106,0.2)" }}>
                <p style={{ fontSize: 12, color: "var(--terra-dark)", lineHeight: 1.6 }}>
                  {lang === "de" ? <>Dies ist eine private Gruppe.<br />Nach dem Login können Sie beitreten.</> : lang === "fr" ? <>This is a private group.<br />You can join after logging in.</> : lang === "en" ? <>This is a private group.<br />You can join after logging in.</> : <>비공개 그룹이에요.<br />로그인 후 참여할 수 있어요.</>}
                </p>
              </div>
            )}
            <button className="btn-sage" onClick={join} disabled={joining} style={{ width: "100%" }}>
              {joining ? <Loader2 size={16} className="spin" /> : (lang === "de" ? "Gruppe beitreten" : lang === "fr" ? "Join group" : lang === "en" ? "Join group" : "그룹 참여하기")}
            </button>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 12 }}>
              {lang === "de" ? "Sie haben noch kein Roots-Konto? Nach dem Beitritt können Sie sich registrieren." : lang === "fr" ? "No Roots account yet? You can sign up after joining." : lang === "en" ? "No Roots account yet? You can sign up after joining." : "Roots 계정이 없으신가요? 참여 후 가입할 수 있어요"}
            </p>
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
