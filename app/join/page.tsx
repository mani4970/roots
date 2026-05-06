"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";
import { Loader2 } from "lucide-react";

type GroupInvite = {
  name: string;
  description: string | null;
  is_public: boolean;
  member_count: number | null;
};

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!groupId) { setNotFound(true); setLoading(false); return; }
      const supabase = createClient();
      const loadWithExistingPolicies = async () => {
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
          setGroupName(t("join_private", lang));
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
      };

      try {
        const { data: inviteRow, error: inviteError } = await supabase
        .rpc("get_group_invite", { p_group_id: groupId })
        .maybeSingle();
      const invite = inviteRow as unknown as GroupInvite | null;

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
          setGroupName(t("join_private", lang));
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
      } catch (error) {
        console.error("join invite load failed", error);
        setErrorMessage(t("join_error_load", lang));
        setLoading(false);
      }
    }
    load();
  }, [groupId, lang]);

  async function join() {
    setJoining(true);
    setErrorMessage(null);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/login?redirect=/join?group=${groupId}`);
        return;
      }
      const { data: existing } = await supabase.from("group_members")
        .select("id").eq("group_id", groupId).eq("user_id", user.id).maybeSingle();
      if (!existing) {
        const { error } = await supabase.from("group_members").insert({ group_id: groupId, user_id: user.id });
        if (error) throw error;
      }
      setJoined(true);
      setTimeout(() => router.push("/community"), 2000);
    } catch (error) {
      console.error("join group failed", error);
      setErrorMessage(t("join_error_submit", lang));
    } finally {
      setJoining(false);
    }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
        <img
          src="/roots-logo-transparent-160.png"
          alt="Roots logo"
          width={72}
          height={72}
          style={{ objectFit: "contain", marginBottom: 16 }}
        />
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Roots</h1>
        <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 28 }}>{t("home_loading_sub", lang)}</p>

        {errorMessage && (
          <div style={{ background: "var(--terra-light)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(196,149,106,0.22)", marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: "var(--terra-dark)", lineHeight: 1.6 }}>{errorMessage}</p>
          </div>
        )}
        {notFound ? (
          <div style={{ background: "var(--bg2)", borderRadius: 20, padding: "24px", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 16, color: "var(--text3)" }}>{t("join_not_found", lang)}</p>
            <button className="btn-sage" style={{ marginTop: 16 }} onClick={() => router.push("/")}>{t("join_home", lang)}</button>
          </div>
        ) : joined ? (
          <div style={{ background: "var(--bg2)", borderRadius: 20, padding: "28px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--sage-dark)" }}>{t("join_success", lang)}</p>
            <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 8 }}>{t("join_moving_community", lang)}</p>
          </div>
        ) : (
          <div style={{ background: "var(--bg2)", borderRadius: 20, padding: "28px", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
              {isPublic ? t("join_invite", lang) : t("join_private_invite", lang)}
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{groupName}</h2>
            {groupDesc && <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: 16 }}>{groupDesc}</p>}
            {memberCount > 0 && (
              <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 20 }}>👥 {t("join_members_joined", lang, { count: memberCount })}</p>
            )}
            {!isPublic && (
              <div style={{ background: "var(--terra-light)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, border: "1px solid rgba(196,149,106,0.2)" }}>
                <p style={{ fontSize: 12, color: "var(--terra-dark)", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                  {t("join_private_notice", lang)}
                </p>
              </div>
            )}
            <button className="btn-sage" onClick={join} disabled={joining} style={{ width: "100%" }}>
              {joining ? <Loader2 size={16} className="spin" /> : t("join_btn", lang)}
            </button>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 12 }}>
              {t("join_no_account_hint", lang)}
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
